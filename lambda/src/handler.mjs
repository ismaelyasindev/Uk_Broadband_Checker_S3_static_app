// =============================================================================
// UK Broadband Checker — AWS Lambda handler (Node.js 20+, ES Modules)
// =============================================================================

import { createHash } from 'node:crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  POSTCODE_RE,
  normalise,
  mapOfcom,
  fetchFromOfcom,
} from './ofcom.mjs';

const ssmClient = new SSMClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE = process.env.DYNAMODB_TABLE ?? 'broadband-cache';
const PARAM = process.env.SSM_PARAM_PATH ?? '/broadband/ofcom-key';
const ORIGIN_SECRET = process.env.ORIGIN_VERIFY_SECRET;
const CACHE_TTL_SECONDS = 24 * 60 * 60;

let cachedApiKey = null;

function respond(status, body, cacheControl = 'max-age=300', extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function log(level, data) {
  console.log(JSON.stringify({ level, ...data, ts: new Date().toISOString() }));
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) return headers[key];
  }
  return undefined;
}

function hashPostcode(clean) {
  return createHash('sha256').update(clean).digest('hex').slice(0, 8);
}

export async function getApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: PARAM,
      WithDecryption: true,
    }),
  );
  cachedApiKey = result.Parameter?.Value;
  if (!cachedApiKey) {
    throw new Error('Ofcom API key not present in SSM parameter');
  }
  return cachedApiKey;
}

function verifyOrigin(headers) {
  if (!ORIGIN_SECRET) return null;
  const provided = getHeader(headers, 'x-origin-verify');
  if (provided !== ORIGIN_SECRET) {
    return respond(
      403,
      { error: 'FORBIDDEN', message: 'Direct access is not permitted' },
      'no-store',
    );
  }
  return null;
}

export const handler = async (event) => {
  const path = event.requestContext?.http?.path ?? '';
  const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase();

  const forbidden = verifyOrigin(event.headers);
  if (forbidden) return forbidden;

  if (path === '/api/health' || path === '/health') {
    return respond(
      200,
      { status: 'ok', ts: new Date().toISOString() },
      'no-store',
    );
  }

  if (method !== 'GET' || !(path === '/api/check' || path === '/check')) {
    return respond(
      404,
      { error: 'NOT_FOUND', message: 'Route not found' },
      'no-store',
    );
  }

  const rawPc = (event.queryStringParameters?.pc ?? '').toString();
  if (!rawPc) {
    return respond(
      400,
      { error: 'INVALID_POSTCODE', message: 'Missing required "pc" query parameter' },
      'no-store',
    );
  }

  const pc = normalise(rawPc);
  if (!POSTCODE_RE.test(pc)) {
    return respond(
      400,
      {
        error: 'INVALID_POSTCODE',
        message: 'Provide a valid UK postcode e.g. SW1A1AA',
      },
      'no-store',
    );
  }

  const pcHash = hashPostcode(pc);
  const t0 = Date.now();

  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const cached = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { postcode: pc },
      }),
    );

    if (cached.Item?.data && cached.Item.ttl > nowSeconds) {
      log('INFO', { pc_hash: pcHash, source: 'cache', durationMs: Date.now() - t0 });
      return respond(
        200,
        {
          ...cached.Item.data,
          source: 'cache',
          responseTime: Date.now() - t0,
        },
        'max-age=300',
        { 'X-Cache': 'HIT' },
      );
    }

    const apiKey = await getApiKey();

    let ofcomRes;
    try {
      ofcomRes = await fetchFromOfcom(pc, apiKey);
    } catch (err) {
      log('ERROR', { pc_hash: pcHash, msg: 'Ofcom fetch failed', err: err.message });
      return respond(
        502,
        { error: 'UPSTREAM_ERROR', message: 'Ofcom API unreachable' },
        'no-store',
      );
    }

    if (ofcomRes.status === 429) {
      log('WARN', { pc_hash: pcHash, msg: 'Ofcom 429' });
      return respond(
        502,
        { error: 'UPSTREAM_RATE_LIMITED', message: 'Ofcom rate limit reached' },
        'no-store',
      );
    }

    if (!ofcomRes.ok) {
      log('ERROR', { pc_hash: pcHash, msg: `Ofcom ${ofcomRes.status}` });
      return respond(
        502,
        {
          error: 'UPSTREAM_ERROR',
          message: `Ofcom returned HTTP ${ofcomRes.status}`,
        },
        'no-store',
      );
    }

    const raw = await ofcomRes.json();
    const payload = mapOfcom(pc, raw);
    const ttl = nowSeconds + CACHE_TTL_SECONDS;

    docClient
      .send(
        new PutCommand({
          TableName: TABLE,
          Item: { postcode: pc, data: payload, ttl },
        }),
      )
      .catch((err) =>
        log('ERROR', { msg: 'DynamoDB PutItem failed', err: err.message }),
      );

    log('INFO', { pc_hash: pcHash, source: 'live', durationMs: Date.now() - t0 });
    return respond(
      200,
      { ...payload, source: 'live', responseTime: Date.now() - t0 },
      'max-age=300',
      { 'X-Cache': 'MISS' },
    );
  } catch (err) {
    log('ERROR', { pc_hash: pcHash, msg: err.message });
    return respond(
      502,
      { error: 'UPSTREAM_ERROR', message: 'Service is temporarily unavailable, please try again later.' },
      'no-store',
    );
  }
};
