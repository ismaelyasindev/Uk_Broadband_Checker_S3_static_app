import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createHash } from 'node:crypto';

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
const SSM_NAME = '/broadband/ofcom-key';
const API_KEY = 'ofcom-live-key-123';

const OFCOM_RAW = {
  standard: { maxDown: 17.2, maxUp: 2.1, availability: 98 },
  superfast: { maxDown: 80, maxUp: 20, availability: 50 },
  ultrafast: { maxDown: 330, maxUp: 50, availability: 100 },
};

const MAPPED_PAYLOAD = {
  postcode: 'SW1A1AA',
  standard: { maxDown: 17.2, maxUp: 2.1, availability: 'full' },
  superfast: { maxDown: 80, maxUp: 20, availability: 'partial' },
  ultrafast: { maxDown: 330, maxUp: 50, availability: 'full' },
};

function makeEvent({
  headers,
  postcode = 'sw1a 1aa',
  path = '/api/check',
  method = 'GET',
  query,
} = {}) {
  let queryStringParameters = query;
  if (queryStringParameters === undefined && path.includes('check')) {
    queryStringParameters =
      postcode === null ? {} : { pc: postcode ?? 'sw1a 1aa' };
  }

  return {
    requestContext: { http: { path, method } },
    headers:
      headers === undefined ? { 'x-origin-verify': SECRET } : headers,
    queryStringParameters,
  };
}

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
    expect(JSON.parse(res.body)).toEqual({
      error: 'FORBIDDEN',
      message: 'Direct access is not permitted',
    });
  });

  it('returns 403 when the header value does not match the secret', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ headers: { 'x-origin-verify': 'wrong' } }));
    expect(res.statusCode).toBe(403);
  });

  it('allows requests when ORIGIN_VERIFY_SECRET is not configured', async () => {
    delete process.env.ORIGIN_VERIFY_SECRET;
    docSend.mockResolvedValueOnce({
      Item: {
        postcode: 'SW1A1AA',
        data: MAPPED_PAYLOAD,
        ttl: Math.floor(Date.now() / 1000) + 9999,
      },
    });
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ headers: {} }));
    expect(res.statusCode).toBe(200);
  });
});

describe('defaults and edge cases', () => {
  it('uses default table and SSM param when env vars are unset', async () => {
    delete process.env.DYNAMODB_TABLE;
    delete process.env.SSM_PARAM_PATH;
    docSend.mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => OFCOM_RAW }),
    );

    const { handler } = await loadHandler();
    await handler(makeEvent());

    const { GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    expect(GetCommand.mock.calls.at(-1)[0].TableName).toBe('broadband-cache');
    expect(PutCommand.mock.calls.at(-1)[0].TableName).toBe('broadband-cache');

    const { GetParameterCommand } = await import('@aws-sdk/client-ssm');
    expect(GetParameterCommand.mock.calls.at(-1)[0].Name).toBe('/broadband/ofcom-key');
  });

  it('handles events without requestContext or headers', async () => {
    delete process.env.ORIGIN_VERIFY_SECRET;

    const { handler } = await loadHandler();

    const missingContext = await handler({});
    expect(missingContext.statusCode).toBe(404);

    const healthRes = await handler({
      requestContext: { http: { path: '/api/health' } },
    });
    expect(healthRes.statusCode).toBe(200);
  });

  it('returns 403 when headers are missing but origin verification is enabled', async () => {
    const { handler } = await loadHandler();
    const res = await handler({
      requestContext: { http: { path: '/api/health' } },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('routing', () => {
  it('returns health ok on /api/health', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ path: '/api/health', query: null }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.ts).toBeTruthy();
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('returns 404 for unknown routes', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ path: '/api/unknown' }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND');
  });
});

describe('input validation', () => {
  it('returns 400 when the pc query parameter is absent', async () => {
    const { handler } = await loadHandler();
    const res = await handler({
      requestContext: { http: { path: '/api/check', method: 'GET' } },
      headers: { 'x-origin-verify': SECRET },
      queryStringParameters: {},
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_POSTCODE');
  });

  it('returns 400 for an invalid postcode', async () => {
    const { handler } = await loadHandler();
    const res = await handler(makeEvent({ postcode: 'NOT-A-PC' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_POSTCODE');
  });
});

describe('cache-aside (DynamoDB)', () => {
  it('returns a fresh cached item with X-Cache: HIT and never calls SSM/fetch', async () => {
    docSend.mockResolvedValueOnce({
      Item: {
        postcode: 'SW1A1AA',
        data: MAPPED_PAYLOAD,
        ttl: Math.floor(Date.now() / 1000) + 9999,
      },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('HIT');
    expect(res.headers['Cache-Control']).toBe('max-age=300');
    const body = JSON.parse(res.body);
    expect(body.source).toBe('cache');
    expect(body.responseTime).toBeTypeOf('number');
    expect(body.ultrafast.maxDown).toBe(330);
    expect(ssmSend).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats an expired cached item as a MISS and refreshes it', async () => {
    docSend
      .mockResolvedValueOnce({
        Item: {
          postcode: 'SW1A1AA',
          data: MAPPED_PAYLOAD,
          ttl: Math.floor(Date.now() / 1000) - 10,
        },
      })
      .mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => OFCOM_RAW }),
    );

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('MISS');
    expect(JSON.parse(res.body).source).toBe('live');
  });
});

describe('cache miss → SSM → Ofcom → write-back', () => {
  it('fetches, maps tiers, caches with a 24h TTL and returns X-Cache: MISS', async () => {
    docSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OFCOM_RAW,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const before = Math.floor(Date.now() / 1000);
    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    const after = Math.floor(Date.now() / 1000);

    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Cache']).toBe('MISS');
    const body = JSON.parse(res.body);
    expect(body.source).toBe('live');
    expect(body.ultrafast).toEqual({ maxDown: 330, maxUp: 50, availability: 'full' });

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('/coverage/SW1A1AA');
    expect(opts.headers['Ocp-Apim-Subscription-Key']).toBe(API_KEY);

    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const putArg = PutCommand.mock.calls.at(-1)[0];
    expect(putArg.Item.postcode).toBe('SW1A1AA');
    expect(putArg.Item.data).toEqual(MAPPED_PAYLOAD);
    expect(putArg.Item.ttl).toBeGreaterThanOrEqual(before + 24 * 60 * 60);
    expect(putArg.Item.ttl).toBeLessThanOrEqual(after + 24 * 60 * 60);
  });

  it('returns 502 UPSTREAM_RATE_LIMITED on Ofcom 429', async () => {
    docSend.mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('returns 502 UPSTREAM_ERROR on other Ofcom failures', async () => {
    docSend.mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('UPSTREAM_ERROR');
  });

  it('returns 502 when the DynamoDB read fails', async () => {
    docSend.mockRejectedValueOnce(new Error('DDB unavailable'));
    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
  });

  it('returns 502 UPSTREAM_ERROR when Ofcom fetch throws', async () => {
    docSend.mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({ Parameter: { Value: API_KEY } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).message).toBe('Ofcom API unreachable');
  });

  it('returns 502 when the SSM parameter has no value', async () => {
    docSend.mockResolvedValueOnce({});
    ssmSend.mockResolvedValueOnce({});
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(502);
  });
});

describe('SSM memoization', () => {
  it('only calls SSM once across multiple warm invocations', async () => {
    docSend.mockResolvedValue({});
    ssmSend.mockResolvedValue({ Parameter: { Value: API_KEY } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => OFCOM_RAW }),
    );

    const { handler } = await loadHandler();
    await handler(makeEvent());
    await handler(makeEvent({ postcode: 'EH1 1YZ' }));

    expect(ssmSend).toHaveBeenCalledTimes(1);
  });
});

describe('PII protection (GDPR)', () => {
  it('logs only the 8-char pc_hash, never the raw or cleaned postcode', async () => {
    docSend.mockResolvedValueOnce({
      Item: {
        postcode: 'SW1A1AA',
        data: MAPPED_PAYLOAD,
        ttl: Math.floor(Date.now() / 1000) + 9999,
      },
    });
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    await handler(makeEvent({ postcode: 'sw1a 1aa' }));

    const logged = console.log.mock.calls.flat().join(' ');
    expect(logged).toContain(expectedHash);
    expect(logged).not.toContain('sw1a 1aa');
    expect(logged).not.toContain('SW1A1AA');
  });

  it('uses the normalised postcode as the DynamoDB cache key', async () => {
    docSend.mockResolvedValue({
      Item: {
        postcode: 'SW1A1AA',
        data: MAPPED_PAYLOAD,
        ttl: Math.floor(Date.now() / 1000) + 9999,
      },
    });
    vi.stubGlobal('fetch', vi.fn());

    const { handler } = await loadHandler();
    await handler(makeEvent({ postcode: '  Sw1a1Aa ' }));

    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const getArg = GetCommand.mock.calls.at(-1)[0];
    expect(getArg.Key.postcode).toBe('SW1A1AA');
  });
});
