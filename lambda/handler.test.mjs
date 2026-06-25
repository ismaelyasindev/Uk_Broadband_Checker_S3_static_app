import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createHash } from 'node:crypto';

// -----------------------------------------------------------------------------
// Shared mock send functions. These are referenced from the hoisted vi.mock
// factories below and re-used across every (re)import of handler.mjs.
// -----------------------------------------------------------------------------
const ssmSend = vi.fn();
const docSend = vi.fn();

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn(() => ({ send: ssmSend })),
  GetParameterCommand: vi.fn((input) => ({ __cmd: 'GetParameter', input })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({ __ddb: true })),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: docSend })) },
  GetCommand: vi.fn((input) => ({ __cmd: 'Get', input })),
  PutCommand: vi.fn((input) => ({ __cmd: 'Put', input })),
}));

const SECRET = 'super-secret-origin-token';
const TABLE = 'broadband-cache';
const SSM_NAME = '/broadband/ofcom-api-key';
const API_KEY = 'ofcom-live-key-123';

/** Build a valid API Gateway HTTP API event. */
function makeEvent({ headers, postcode } = {}) {
  return {
    headers:
      headers === undefined ? { 'x-origin-verify': SECRET } : headers,
    queryStringParameters: postcode === undefined ? { pc: 'sw1a 1aa' } : { pc: postcode },
  };
}

/** Fresh import so module-level `cachedApiKey` resets (cold start) per test. */
async function loadHandler() {
  vi.resetModules();
  return import('./src/handler.mjs');
}

const expectedHash = createHash('sha256')
  .update('SW1A1AA')
  .digest('hex')
  .slice(0, 8);

beforeEach(() => {
  ssmSend.mockReset();
  docSend.mockReset();
  process.env.ORIGIN_VERIFY_SECRET = SECRET;
  process.env.DYNAMODB_TABLE = TABLE;
  process.env.SSM_PARAM_PATH = SSM_NAME;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Zero-Trust ingress verification', () => {
  it('returns 403 when the X-Origin-Verify header is missing', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ headers: {} }));

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden' });
    expect(ssmSend).not.toHaveBeenCalled();
    expect(docSend).not.toHaveBeenCalled();
  });

  it('returns 403 when there are no headers at all', async () => {
    const { handler } = await loadHandler();
    const res = await handler({ queryStringParameters: { pc: 'SW1A1AA' } });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when the header value does not match the secret', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ headers: { 'x-origin-verify': 'wrong' } }));
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when ORIGIN_VERIFY_SECRET is not configured', async () => {
    delete process.env.ORIGIN_VERIFY_SECRET;
    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(403);
  });

  it('never logs the raw origin-verify token', async () => {
    const { handler } = await loadHandler();
    await handler(makeEvent({ headers: { 'x-origin-verify': 'leak-me' } }));
    const logged = console.log.mock.calls.flat().join(' ');
    expect(logged).not.toContain('leak-me');
  });
});

describe('input validation', () => {
  it('returns 400 when the pc query parameter is absent', async () => {
    const { handler } = await loadHandler();
    const res = await handler({ headers: { 'x-origin-verify': SECRET } });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toMatch(/pc/i);
  });
});

describe('cache-aside (DynamoDB)', () => {
  it('returns a fresh cached item with X-Cache: HIT and never calls SSM/fetch', async () => {
    const payload = { maxDownloadMbps: 1000, technology: 'FTTP' };
    docSend.mockResolvedValueOnce({
      Item: { postcode: expectedHash, data: payload, ttl: Math.floor(Date.now() / 1000) + 9999 },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('HIT');
    expect(JSON.parse(res.body)).toEqual(payload);
    expect(ssmSend).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats an expired cached item as a MISS and refreshes it', async () => {
    docSend
      .mockResolvedValueOnce({
        Item: { postcode: expectedHash, data: { stale: true }, ttl: Math.floor(Date.now() / 1000) - 10 },
      })
      .mockResolvedValueOnce({}); // PutCommand write-back
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ fresh: true }) }),
    );

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('MISS');
    expect(JSON.parse(res.body)).toEqual({ fresh: true });
  });

  it('returns 502 when the DynamoDB read fails', async () => {
    docSend.mockRejectedValueOnce(new Error('DDB unavailable'));
    const { handler } = await loadHandler();
    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).message).toMatch(/temporarily unavailable/i);
  });
});

describe('cache miss → SSM → fetch → write-back', () => {
  it('fetches, caches with a 24h TTL and returns X-Cache: MISS', async () => {
    docSend
      .mockResolvedValueOnce({}) // GetCommand: no item
      .mockResolvedValueOnce({}); // PutCommand
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ maxDownloadMbps: 80 }) });
    vi.stubGlobal('fetch', fetchSpy);

    const before = Math.floor(Date.now() / 1000);
    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    const after = Math.floor(Date.now() / 1000);

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('MISS');
    expect(JSON.parse(res.body)).toEqual({ maxDownloadMbps: 80 });

    // SSM called once with decryption enabled.
    const { GetParameterCommand } = await import('@aws-sdk/client-ssm');
    expect(GetParameterCommand).toHaveBeenCalledWith({
      Name: SSM_NAME,
      WithDecryption: true,
    });

    // Ofcom fetch used a Bearer token + the cleaned postcode.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('postcode=SW1A1AA');
    expect(opts.headers.Authorization).toBe(`Bearer ${API_KEY}`);

    // Write-back uses pc_hash as the `postcode` key, stores payload and a ~24h-ahead ttl.
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const putArg = PutCommand.mock.calls.at(-1)[0];
    expect(putArg.TableName).toBe(TABLE);
    expect(putArg.Item.postcode).toBe(expectedHash);
    expect(putArg.Item.data).toEqual({ maxDownloadMbps: 80 });
    expect(putArg.Item.ttl).toBeGreaterThanOrEqual(before + 24 * 60 * 60);
    expect(putArg.Item.ttl).toBeLessThanOrEqual(after + 24 * 60 * 60);
  });

  it('returns 502 when the upstream Ofcom API responds with a non-OK status', async () => {
    docSend.mockResolvedValueOnce({}); // miss
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
  });

  it('returns 502 when the SSM parameter has no value', async () => {
    docSend.mockResolvedValueOnce({}); // miss
    ssmSend.mockResolvedValueOnce({}); // no Parameter returned at all
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
  });
});

describe('SSM memoization', () => {
  it('only calls SSM once across multiple warm invocations', async () => {
    docSend.mockResolvedValue({}); // every Get = miss, every Put = ok
    ssmSend.mockResolvedValue({ Parameter: { Value: API_KEY } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: 1 }) }),
    );

    const { handler } = await loadHandler();
    await handler(makeEvent());
    await handler(makeEvent({ postcode: 'EH1 1YZ' }));
    await handler(makeEvent({ postcode: 'LL57 4TH' }));

    expect(ssmSend).toHaveBeenCalledTimes(1);
  });
});

describe('PII protection (GDPR)', () => {
  it('logs only the 8-char pc_hash, never the raw or cleaned postcode', async () => {
    docSend.mockResolvedValueOnce({
      Item: { postcode: expectedHash, data: { ok: true }, ttl: Math.floor(Date.now() / 1000) + 9999 },
    });
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    await handler(makeEvent({ postcode: 'sw1a 1aa' }));

    const logged = console.log.mock.calls.flat().join(' ');
    expect(logged).toContain(expectedHash);
    expect(logged).not.toContain('sw1a 1aa');
    expect(logged).not.toContain('SW1A1AA');
    expect(logged).not.toContain('SW1A 1AA');
  });

  it('normalises postcode case/whitespace to the same pc_hash key', async () => {
    docSend.mockResolvedValue({
      Item: { postcode: expectedHash, data: { ok: true }, ttl: Math.floor(Date.now() / 1000) + 9999 },
    });
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    await handler(makeEvent({ postcode: '  Sw1a1Aa ' }));

    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const getArg = GetCommand.mock.calls.at(-1)[0];
    expect(getArg.Key.postcode).toBe(expectedHash);
  });
});
