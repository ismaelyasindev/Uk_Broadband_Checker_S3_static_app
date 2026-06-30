/**
 * Local dev API — no AWS. Mirrors GET /api/check and GET /api/health for Vite proxy.
 *
 * Usage:
 *   cd lambda
 *   npm run dev:local
 *
 * Set OFCOM_API_KEY in lambda/.env.local (copy from .env.example) or export it in your shell.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import {
  POSTCODE_RE,
  normalise,
  mapOfcom,
  fetchFromOfcom,
} from '../src/ofcom.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = join(__dirname, '..', '.env.local');

function loadEnvLocal() {
  if (!existsSync(envLocalPath)) return;
  const raw = readFileSync(envLocalPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const PORT = Number(process.env.LOCAL_API_PORT ?? 3001);
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/** @type {Map<string, { data: object, expiresAt: number }>} */
const cache = new Map();

function json(status, body, cacheControl = 'max-age=300', extraHeaders = {}) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function send(res, { status, headers, body }) {
  res.writeHead(status, headers);
  res.end(body);
}

async function handleCheck(searchParams) {
  const rawPc = (searchParams.get('pc') ?? '').toString();
  if (!rawPc) {
    return json(
      400,
      { error: 'INVALID_POSTCODE', message: 'Missing required "pc" query parameter' },
      'no-store',
    );
  }

  const pc = normalise(rawPc);
  if (!POSTCODE_RE.test(pc)) {
    return json(
      400,
      {
        error: 'INVALID_POSTCODE',
        message: 'Provide a valid UK postcode e.g. SW1A1AA',
      },
      'no-store',
    );
  }

  const apiKey = process.env.OFCOM_API_KEY;
  if (!apiKey) {
    return json(
      500,
      {
        error: 'CONFIG_ERROR',
        message:
          'OFCOM_API_KEY is not set. Create lambda/.env.local or export the variable.',
      },
      'no-store',
    );
  }

  const t0 = Date.now();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cached = cache.get(pc);

  if (cached && cached.expiresAt > nowSeconds) {
    return json(
      200,
      {
        ...cached.data,
        source: 'cache',
        responseTime: Date.now() - t0,
      },
      'max-age=300',
      { 'X-Cache': 'HIT' },
    );
  }

  let ofcomRes;
  try {
    ofcomRes = await fetchFromOfcom(pc, apiKey);
  } catch (err) {
    return json(
      502,
      { error: 'UPSTREAM_ERROR', message: 'Ofcom API unreachable' },
      'no-store',
    );
  }

  if (ofcomRes.status === 429) {
    return json(
      502,
      { error: 'UPSTREAM_RATE_LIMITED', message: 'Ofcom rate limit reached' },
      'no-store',
    );
  }

  if (!ofcomRes.ok) {
    return json(
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

  cache.set(pc, {
    data: payload,
    expiresAt: nowSeconds + CACHE_TTL_SECONDS,
  });

  return json(
    200,
    { ...payload, source: 'live', responseTime: Date.now() - t0 },
    'max-age=300',
    { 'X-Cache': 'MISS' },
  );
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const path = url.pathname;

    if (req.method !== 'GET') {
      send(res, json(404, { error: 'NOT_FOUND', message: 'Route not found' }, 'no-store'));
      return;
    }

    if (path === '/api/health' || path === '/health') {
      send(
        res,
        json(200, { status: 'ok', ts: new Date().toISOString() }, 'no-store'),
      );
      return;
    }

    if (path === '/api/check' || path === '/check') {
      send(res, await handleCheck(url.searchParams));
      return;
    }

    send(res, json(404, { error: 'NOT_FOUND', message: 'Route not found' }, 'no-store'));
  } catch (err) {
    send(
      res,
      json(
        502,
        {
          error: 'UPSTREAM_ERROR',
          message: 'Service is temporarily unavailable, please try again later.',
        },
        'no-store',
      ),
    );
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`Port ${PORT} is already in use.`);
    console.error('Another local API is probably still running. Fix:');
    console.error(`  lsof -i :${PORT}`);
    console.error(`  kill <PID>   # or close the other terminal running npm run dev:local`);
    console.error('');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`);
  console.log('  GET /api/health');
  console.log('  GET /api/check?pc=SW1A1AA');
  console.log('Proxy Vite /api → this server (see frontend/vite.config.ts)');
  if (!process.env.OFCOM_API_KEY) {
    console.warn('');
    console.warn('Warning: OFCOM_API_KEY is not set.');
    console.warn('  1. Open lambda/.env.local and paste your Ofcom key');
    console.warn('  2. Save the file (Cmd+S)');
    console.warn('  3. Restart this server: npm run dev:local');
  } else if (process.env.OFCOM_API_KEY.length < 8) {
    console.warn('');
    console.warn('Warning: OFCOM_API_KEY looks too short.');
    console.warn('  Check lambda/.env.local is saved with your full Ofcom key, then restart.');
  } else {
    console.log('OFCOM_API_KEY loaded from .env.local');
  }
});
