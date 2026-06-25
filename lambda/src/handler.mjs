// =============================================================================
// UK Broadband Checker — AWS Lambda handler (Node.js 20+, ES Modules)
//
// Security posture: Zero-Trust ingress + UK GDPR-safe logging (postcodes are
// PII and are NEVER logged in raw form — only an 8-char SHA-256 prefix).
//
// Execution lifecycle:
//   1. Zero-Trust ingress verification (X-Origin-Verify header)
//   2. PII protection (clean postcode -> SHA-256 -> 8-char pc_hash for logs)
//   3. Cache-aside read from DynamoDB (X-Cache: HIT on fresh item)
//   4. Secrets via SSM Parameter Store, memoized across warm invocations
//   5. External fetch + write-back to DynamoDB with 24h TTL (X-Cache: MISS)
// =============================================================================

import { createHash } from 'node:crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

// --- Long-lived clients (created once per container) -------------------------
const ssmClient = new SSMClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// --- Memoized secret (persists across warm invocations, reset on cold start) --
let cachedApiKey = null;

// --- Constants ---------------------------------------------------------------
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const OFCOM_API_BASE = 'https://api.ofcom.org.uk/broadband/v1/coverage';

// --- Small helpers -----------------------------------------------------------
function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  };
}

/** Case-insensitive header lookup (API Gateway may lower-case header keys). */
function getHeader(headers, name) {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) return headers[key];
  }
  return undefined;
}

/** Remove all whitespace and upper-case. e.g. "sw1a 1aa" -> "SW1A1AA". */
function cleanPostcode(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** First 8 chars of the SHA-256 of the cleaned postcode (safe to log). */
function hashPostcode(clean) {
  return createHash('sha256').update(clean).digest('hex').slice(0, 8);
}

// --- SSM (memoized) ----------------------------------------------------------
export async function getApiKey() {
  if (cachedApiKey) {
    return cachedApiKey; // warm invocation — reuse without calling SSM
  }
  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: process.env.SSM_PARAM_PATH,
      WithDecryption: true,
    }),
  );
  cachedApiKey = result.Parameter?.Value;
  if (!cachedApiKey) {
    throw new Error('Ofcom API key not present in SSM parameter');
  }
  return cachedApiKey;
}

// --- External provider -------------------------------------------------------
export async function fetchFromOfcom(cleanPc, apiKey) {
  const url = `${OFCOM_API_BASE}?postcode=${encodeURIComponent(cleanPc)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Ofcom API responded with status ${response.status}`);
  }
  return response.json();
}

// --- Handler -----------------------------------------------------------------
export const handler = async (event) => {
  // 1. ZERO-TRUST INGRESS VERIFICATION ---------------------------------------
  const provided = getHeader(event.headers, 'X-Origin-Verify');
  const secret = process.env.ORIGIN_VERIFY_SECRET;
  if (!secret || !provided || provided !== secret) {
    // Never log the token or continue processing.
    return jsonResponse(403, { message: 'Forbidden' });
  }

  // Extract and validate input presence.
  const rawPostcode = event.queryStringParameters?.pc;
  if (!rawPostcode) {
    return jsonResponse(400, { message: 'Missing required "pc" query parameter' });
  }

  // 2. PII PROTECTION --------------------------------------------------------
  const clean = cleanPostcode(rawPostcode);
  const pcHash = hashPostcode(clean);
  console.log(`Processing request for pc_hash: ${pcHash}`);

  try {
    // 3. CACHE-ASIDE READ ----------------------------------------------------
    const nowSeconds = Math.floor(Date.now() / 1000);
    const cached = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: { postcode: pcHash },
      }),
    );

    if (cached.Item && cached.Item.ttl > nowSeconds) {
      console.log(`Cache HIT for pc_hash: ${pcHash}`);
      return jsonResponse(200, cached.Item.data, { 'X-Cache': 'HIT' });
    }

    console.log(`Cache MISS for pc_hash: ${pcHash}`);

    // 4. SECRETS (memoized) --------------------------------------------------
    const apiKey = await getApiKey();

    // 5. EXTERNAL FETCH + WRITE-BACK ----------------------------------------
    const data = await fetchFromOfcom(clean, apiKey);

    const ttl = nowSeconds + CACHE_TTL_SECONDS; // epoch seconds, 24h ahead
    await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: { postcode: pcHash, data, ttl },
      }),
    );

    return jsonResponse(200, data, { 'X-Cache': 'MISS' });
  } catch (err) {
    // Log only the non-PII hash and the error message — never the postcode.
    console.error(`Lookup failed for pc_hash: ${pcHash} — ${err.message}`);
    return jsonResponse(502, {
      message: 'Service is temporarily unavailable, please try again later.',
    });
  }
};
