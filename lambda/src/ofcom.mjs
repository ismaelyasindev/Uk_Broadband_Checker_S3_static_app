// Ofcom Connected Nations broadband coverage — fetch + response mapping.
// Real portal auth: Ocp-Apim-Subscription-Key (Azure API Management).

/** Full UK postcode regex (post-normalisation — no spaces, uppercase). */
export const POSTCODE_RE =
  /^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-BD-HJLNP-UW-Z]{2}$/;

/** Strip spaces, uppercase, trim. e.g. "sw1a 1aa" → "SW1A1AA". */
export function normalise(raw) {
  return raw.replace(/\s+/g, '').toUpperCase().trim();
}

function availabilityLabel(value) {
  if (value === 'full' || value === 'partial' || value === 'none') {
    return value;
  }
  const pct = Number(value);
  if (Number.isNaN(pct)) return 'none';
  if (pct > 95) return 'full';
  if (pct > 5) return 'partial';
  return 'none';
}

function tierFrom(rawTier) {
  if (!rawTier || typeof rawTier !== 'object') {
    return { maxDown: 0, maxUp: 0, availability: 'none' };
  }
  return {
    maxDown: Number(rawTier.maxDown ?? rawTier.maxDownload ?? rawTier.download ?? 0),
    maxUp: Number(rawTier.maxUp ?? rawTier.maxUpload ?? rawTier.upload ?? 0),
    availability: availabilityLabel(
      rawTier.availability ?? rawTier.availabilityPercent ?? 0,
    ),
  };
}

function positiveSpeed(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function aggregateAddressTier(addresses, downKey, upKey) {
  if (!addresses.length) {
    return { maxDown: 0, maxUp: 0, availability: 'none' };
  }

  let availableCount = 0;
  let maxDown = 0;
  let maxUp = 0;

  for (const row of addresses) {
    const down = positiveSpeed(row[downKey]);
    const up = positiveSpeed(row[upKey]);
    if (down > 0) {
      availableCount += 1;
      maxDown = Math.max(maxDown, down);
      maxUp = Math.max(maxUp, up);
    }
  }

  const pct = (availableCount / addresses.length) * 100;
  return {
    maxDown,
    maxUp,
    availability: availabilityLabel(pct),
  };
}

/** Map live Ofcom Connected Nations broadband API (per-address Availability[]). */
function mapOfcomAddresses(pc, raw) {
  const addresses = raw.Availability;
  return {
    postcode: pc,
    standard: aggregateAddressTier(addresses, 'MaxBbPredictedDown', 'MaxBbPredictedUp'),
    superfast: aggregateAddressTier(
      addresses,
      'MaxSfbbPredictedDown',
      'MaxSfbbPredictedUp',
    ),
    ultrafast: aggregateAddressTier(
      addresses,
      'MaxUfbbPredictedDown',
      'MaxUfbbPredictedUp',
    ),
  };
}

/** Map representative contract tiers (used in tests and demo fixtures). */
function mapOfcomContract(pc, raw) {
  return {
    postcode: pc,
    standard: tierFrom(raw.standard ?? raw.Standard),
    superfast: tierFrom(raw.superfast ?? raw.Superfast),
    ultrafast: tierFrom(raw.ultrafast ?? raw.Ultrafast),
  };
}

/** Map raw Ofcom JSON to the API contract tier shape (without source/responseTime). */
export function mapOfcom(pc, raw) {
  if (Array.isArray(raw?.Availability)) {
    return mapOfcomAddresses(pc, raw);
  }
  return mapOfcomContract(pc, raw);
}

/**
 * Call the Ofcom developer API for a normalised postcode.
 * Default path: GET {OFCOM_API_BASE}/coverage/{PostCode}
 */
export async function fetchFromOfcom(cleanPc, apiKey) {
  const base = (
    process.env.OFCOM_API_BASE ?? 'https://api-proxy.ofcom.org.uk/broadband'
  ).replace(/\/$/, '');
  const url = `${base}/coverage/${encodeURIComponent(cleanPc)}`;

  return fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });
}
