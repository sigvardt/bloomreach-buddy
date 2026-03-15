import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveApiConfig,
  buildAuthHeader,
  bloomreachApiFetch,
  buildTrackingPath,
  buildDataPath,
  buildEmailPath,
  buildSmsPath,
  buildWebxpPath,
  BloomreachApiError,
  BloomreachBuddyError,
  _internal,
  parseRetryAfter,
  computeRetryDelay,
  createApiCache,
  clearApiCache,
} from '../bloomreachApiClient.js';
import type {
  BloomreachApiConfig,
  RetryOptions,
  ApiLogEvent,
} from '../bloomreachApiClient.js';

const ORIGINAL_ENV = process.env;

const TEST_CONFIG: BloomreachApiConfig = {
  projectToken: 'project-1',
  apiKeyId: 'my-key',
  apiSecret: 'my-secret',
  baseUrl: 'https://api.test.com',
};

/**
 * Create a mock fetch implementation that returns a new Response on each call.
 * Avoids the "Body has already been read" error when the same mock is called
 * multiple times (e.g. during retries or caching tests).
 */
function mockFetchImpl(
  body: string,
  init: ResponseInit & { headers?: Record<string, string> } = {},
): () => Promise<Response> {
  return () =>
    Promise.resolve(
      new Response(body, {
        status: 200,
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      }),
    );
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ===========================================================================
// resolveApiConfig
// ===========================================================================

describe('resolveApiConfig', () => {
  it('returns config when all values are provided explicitly', () => {
    const result = resolveApiConfig({
      projectToken: 'project-1',
      apiKeyId: 'key-1',
      apiSecret: 'secret-1',
      baseUrl: 'https://api.test.com',
    });

    expect(result).toEqual({
      projectToken: 'project-1',
      apiKeyId: 'key-1',
      apiSecret: 'secret-1',
      baseUrl: 'https://api.test.com',
    });
  });

  it('falls back to environment variables', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = 'env-project';
    process.env.BLOOMREACH_API_KEY_ID = 'env-key';
    process.env.BLOOMREACH_API_SECRET = 'env-secret';
    process.env.BLOOMREACH_API_BASE_URL = 'https://env.test.com';

    const result = resolveApiConfig();

    expect(result).toEqual({
      projectToken: 'env-project',
      apiKeyId: 'env-key',
      apiSecret: 'env-secret',
      baseUrl: 'https://env.test.com',
    });
  });

  it('throws BloomreachBuddyError with CONFIG_MISSING when projectToken is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = '';
    process.env.BLOOMREACH_API_KEY_ID = 'env-key';
    process.env.BLOOMREACH_API_SECRET = 'env-secret';

    expect(() => resolveApiConfig()).toThrow('Bloomreach project token is required');

    try {
      resolveApiConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('CONFIG_MISSING');
    }
  });

  it('throws BloomreachBuddyError with CONFIG_MISSING when apiKeyId is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = 'env-project';
    process.env.BLOOMREACH_API_KEY_ID = '';
    process.env.BLOOMREACH_API_SECRET = 'env-secret';

    expect(() => resolveApiConfig()).toThrow('Bloomreach API key ID is required');

    try {
      resolveApiConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('CONFIG_MISSING');
    }
  });

  it('throws BloomreachBuddyError with CONFIG_MISSING when apiSecret is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = 'env-project';
    process.env.BLOOMREACH_API_KEY_ID = 'env-key';
    process.env.BLOOMREACH_API_SECRET = '';

    expect(() => resolveApiConfig()).toThrow('Bloomreach API secret is required');

    try {
      resolveApiConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('CONFIG_MISSING');
    }
  });

  it('trims whitespace from values', () => {
    const result = resolveApiConfig({
      projectToken: '  project-1  ',
      apiKeyId: '  key-1  ',
      apiSecret: '  secret-1  ',
      baseUrl: 'https://api.test.com',
    });

    expect(result.projectToken).toBe('project-1');
    expect(result.apiKeyId).toBe('key-1');
    expect(result.apiSecret).toBe('secret-1');
  });

  it('strips trailing slash from baseUrl', () => {
    const result = resolveApiConfig({
      projectToken: 'project-1',
      apiKeyId: 'key-1',
      apiSecret: 'secret-1',
      baseUrl: 'https://api.test.com///',
    });

    expect(result.baseUrl).toBe('https://api.test.com');
  });

  it('uses default baseUrl when not provided', () => {
    const result = resolveApiConfig({
      projectToken: 'project-1',
      apiKeyId: 'key-1',
      apiSecret: 'secret-1',
    });

    expect(result.baseUrl).toBe('https://api.exponea.com');
  });
});

// ===========================================================================
// buildAuthHeader
// ===========================================================================

describe('buildAuthHeader', () => {
  it('returns correct Basic auth format', () => {
    const header = buildAuthHeader(TEST_CONFIG);
    expect(header.startsWith('Basic ')).toBe(true);
  });

  it('base64 encodes apiKeyId:apiSecret correctly', () => {
    const header = buildAuthHeader(TEST_CONFIG);
    expect(header).toBe(
      `Basic ${Buffer.from('my-key:my-secret').toString('base64')}`,
    );
  });
});

// ===========================================================================
// BloomreachBuddyError
// ===========================================================================

describe('BloomreachBuddyError', () => {
  it('stores code property', () => {
    const error = new BloomreachBuddyError('CONFIG_MISSING', 'test');
    expect(error.code).toBe('CONFIG_MISSING');
  });

  it('has name BloomreachBuddyError', () => {
    const error = new BloomreachBuddyError('TIMEOUT', 'test');
    expect(error.name).toBe('BloomreachBuddyError');
  });

  it('is instanceof Error', () => {
    const error = new BloomreachBuddyError('NETWORK_ERROR', 'test');
    expect(error).toBeInstanceOf(Error);
  });

  it('stores message correctly', () => {
    const error = new BloomreachBuddyError('API_ERROR', 'something went wrong');
    expect(error.message).toBe('something went wrong');
  });
});

// ===========================================================================
// BloomreachApiError
// ===========================================================================

describe('BloomreachApiError', () => {
  it('stores statusCode and responseBody', () => {
    const error = new BloomreachApiError('failed', 500, { error: 'internal' });
    expect(error.statusCode).toBe(500);
    expect(error.responseBody).toEqual({ error: 'internal' });
  });

  it('has correct name property', () => {
    const error = new BloomreachApiError('failed', 500, { error: 'internal' });
    expect(error.name).toBe('BloomreachApiError');
  });

  it('is instanceof BloomreachBuddyError', () => {
    const error = new BloomreachApiError('failed', 500, {});
    expect(error).toBeInstanceOf(BloomreachBuddyError);
  });

  it('is instanceof Error', () => {
    const error = new BloomreachApiError('failed', 500, {});
    expect(error).toBeInstanceOf(Error);
  });

  it('has code API_ERROR', () => {
    const error = new BloomreachApiError('failed', 500, {});
    expect(error.code).toBe('API_ERROR');
  });
});

// ===========================================================================
// bloomreachApiFetch — core behavior
// ===========================================================================

describe('bloomreachApiFetch', () => {
  it('makes request with correct URL, method, headers, and body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/track/v2/projects/project-1/customers', {
      method: 'PUT',
      body: { customer_ids: { registered: 'cust-1' } },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.test.com/track/v2/projects/project-1/customers',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('my-key:my-secret').toString('base64')}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify({ customer_ids: { registered: 'cust-1' } }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns parsed JSON on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true, id: 1 })),
    );

    const result = await bloomreachApiFetch(
      TEST_CONFIG,
      '/data/v2/projects/project-1/customers/export',
    );

    expect(result).toEqual({ ok: true, id: 1 });
  });

  it('throws BloomreachApiError on non-2xx responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'bad request' }), {
        status: 400,
        statusText: 'Bad Request',
      }),
    );

    await expect(
      bloomreachApiFetch(TEST_CONFIG, '/track/v2/projects/project-1/customers'),
    ).rejects.toBeInstanceOf(BloomreachApiError);
  });

  it('handles timeout and throws BloomreachBuddyError with TIMEOUT code', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const promise = bloomreachApiFetch(
      TEST_CONFIG,
      '/track/v2/projects/project-1/customers',
      { timeoutMs: 10 },
    );

    // Register the rejection handler BEFORE advancing timers to prevent
    // the rejection from firing as "unhandled".
    const assertion = promise
      .then(() => {
        expect.fail('Expected BloomreachBuddyError');
      })
      .catch((error: unknown) => {
        expect(error).toBeInstanceOf(BloomreachBuddyError);
        expect((error as BloomreachBuddyError).code).toBe('TIMEOUT');
        expect((error as BloomreachBuddyError).message).toContain(
          'timed out after 10ms',
        );
      });

    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('wraps network errors in BloomreachBuddyError with NETWORK_ERROR code', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed'),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test');
      expect.fail('Expected BloomreachBuddyError');
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('NETWORK_ERROR');
      expect((error as BloomreachBuddyError).message).toBe('fetch failed');
    }
  });
});

// ===========================================================================
// HTTP method handling
// ===========================================================================

describe('HTTP method handling', () => {
  it('defaults to POST when method not specified', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('passes GET correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ data: [] })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', { method: 'GET' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('passes PUT correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'PUT',
      body: { key: 'value' },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('passes DELETE correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', { method: 'DELETE' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('omits body field when body is undefined', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', { method: 'GET' });

    const callArgs = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(callArgs.body).toBeUndefined();
  });
});

// ===========================================================================
// Content-Type and Accept headers
// ===========================================================================

describe('Content-Type and Accept headers', () => {
  it('sends Content-Type application/json on POST with body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'POST',
      body: { key: 'value' },
    });

    const headers = (fetchSpy.mock.calls[0]?.[1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends Content-Type application/json on PUT with body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'PUT',
      body: { key: 'value' },
    });

    const headers = (fetchSpy.mock.calls[0]?.[1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends Accept application/json on all requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', { method: 'GET' });

    const headers = (fetchSpy.mock.calls[0]?.[1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('sends Content-Type application/json on GET requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ data: [] })),
    );

    await bloomreachApiFetch(TEST_CONFIG, '/test', { method: 'GET' });

    const headers = (fetchSpy.mock.calls[0]?.[1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});

// ===========================================================================
// Empty response handling
// ===========================================================================

describe('empty response handling', () => {
  it('returns undefined for empty response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(new Response('', { status: 200 })),
    );

    const result = await bloomreachApiFetch(TEST_CONFIG, '/test');

    expect(result).toBeUndefined();
  });

  it('returns undefined for 204 No Content with null body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' })),
    );

    const result = await bloomreachApiFetch(TEST_CONFIG, '/test');

    expect(result).toBeUndefined();
  });

  it('returns raw text for non-JSON response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve(
          new Response('404 page not found', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
    );

    const result = await bloomreachApiFetch(TEST_CONFIG, '/test');

    expect(result).toBe('404 page not found');
  });
});

// ===========================================================================
// Error message structure
// ===========================================================================

describe('error message structure', () => {
  it('BloomreachApiError message includes status code and statusText', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'not found' }), {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test');
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachApiError);
      const apiError = error as BloomreachApiError;
      expect(apiError.message).toContain('404');
      expect(apiError.message).toContain('Not Found');
    }
  });

  it('responseBody contains parsed JSON from server', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ errors: [{ message: 'invalid' }] }), {
        status: 422,
        statusText: 'Unprocessable Entity',
      }),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test');
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      const apiError = error as BloomreachApiError;
      expect(apiError.responseBody).toEqual({
        errors: [{ message: 'invalid' }],
      });
    }
  });

  it('responseBody contains raw text when server returns non-JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        Promise.resolve(
          new Response('404 page not found', {
            status: 404,
            statusText: 'Not Found',
          }),
        ),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test');
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      const apiError = error as BloomreachApiError;
      expect(apiError.responseBody).toBe('404 page not found');
    }
  });

  it('API error is instanceof BloomreachBuddyError with code API_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'fail' }), {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test');
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('API_ERROR');
    }
  });
});

// ===========================================================================
// parseRetryAfter
// ===========================================================================

describe('parseRetryAfter', () => {
  it('returns null when Retry-After header is absent', () => {
    const headers = new Headers();
    expect(parseRetryAfter(headers)).toBeNull();
  });

  it('parses integer seconds', () => {
    const headers = new Headers({ 'Retry-After': '120' });
    expect(parseRetryAfter(headers)).toBe(120_000);
  });

  it('parses zero seconds', () => {
    const headers = new Headers({ 'Retry-After': '0' });
    expect(parseRetryAfter(headers)).toBe(0);
  });

  it('parses HTTP-date format', () => {
    const futureDate = new Date(Date.now() + 60_000).toUTCString();
    const headers = new Headers({ 'Retry-After': futureDate });
    const result = parseRetryAfter(headers);
    expect(result).toBeGreaterThan(50_000);
    expect(result).toBeLessThanOrEqual(60_000);
  });

  it('returns 0 for past HTTP-date', () => {
    const pastDate = new Date(Date.now() - 60_000).toUTCString();
    const headers = new Headers({ 'Retry-After': pastDate });
    expect(parseRetryAfter(headers)).toBe(0);
  });

  it('returns null for unparseable value', () => {
    const headers = new Headers({ 'Retry-After': 'garbage' });
    expect(parseRetryAfter(headers)).toBeNull();
  });
});

// ===========================================================================
// computeRetryDelay
// ===========================================================================

describe('computeRetryDelay', () => {
  const defaultOpts: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    retryableStatuses: [429, 500, 502, 503, 504],
  };

  it('uses Retry-After when available', () => {
    const delay = computeRetryDelay(0, defaultOpts, 5_000);
    expect(delay).toBe(5_000);
  });

  it('caps Retry-After at maxDelayMs', () => {
    const delay = computeRetryDelay(0, defaultOpts, 60_000);
    expect(delay).toBe(30_000);
  });

  it('computes exponential backoff when Retry-After is null', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // jitter factor = 1.0
    const delay = computeRetryDelay(0, defaultOpts, null);
    expect(delay).toBe(500); // 500 * 2^0 * 1.0
  });

  it('doubles delay on each attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // jitter factor = 1.0
    const d0 = computeRetryDelay(0, defaultOpts, null);
    const d1 = computeRetryDelay(1, defaultOpts, null);
    const d2 = computeRetryDelay(2, defaultOpts, null);
    expect(d1).toBe(d0 * 2);
    expect(d2).toBe(d0 * 4);
  });

  it('caps computed delay at maxDelayMs', () => {
    const opts = { ...defaultOpts, maxDelayMs: 1_000 };
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const delay = computeRetryDelay(10, opts, null); // huge exponential
    expect(delay).toBe(1_000);
  });

  it('applies jitter in ±20% range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // min jitter = 0.8
    const low = computeRetryDelay(0, defaultOpts, null);
    expect(low).toBe(400); // 500 * 0.8

    vi.spyOn(Math, 'random').mockReturnValue(1); // max jitter = 1.2
    const high = computeRetryDelay(0, defaultOpts, null);
    expect(high).toBeCloseTo(600, 5); // 500 * 1.2 (floating point safe)
  });
});

// ===========================================================================
// Retry behavior in bloomreachApiFetch
// ===========================================================================

describe('retry behavior', () => {
  let sleepSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sleepSpy = vi.spyOn(_internal, 'sleep').mockResolvedValue(undefined);
  });

  it('does not retry by default — single fetch on 500 throws immediately', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'internal' }), {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(
      bloomreachApiFetch(TEST_CONFIG, '/test'),
    ).rejects.toBeInstanceOf(BloomreachApiError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxRetries on 429', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'too many' }), {
        status: 429,
        statusText: 'Too Many Requests',
      }),
    );

    await expect(
      bloomreachApiFetch(TEST_CONFIG, '/test', {
        retry: { maxRetries: 2, baseDelayMs: 10 },
      }),
    ).rejects.toBeInstanceOf(BloomreachApiError);

    // 1 initial + 2 retries = 3 total
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  it('retries on 500, 502, 503, 504', async () => {
    for (const status of [500, 502, 503, 504]) {
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        mockFetchImpl(JSON.stringify({ error: 'fail' }), {
          status,
          statusText: 'Server Error',
        }),
      );

      const result = bloomreachApiFetch(TEST_CONFIG, '/test', {
        retry: { maxRetries: 1, baseDelayMs: 1 },
      });

      await expect(result).rejects.toBeInstanceOf(BloomreachApiError);

      vi.mocked(globalThis.fetch).mockRestore();
      sleepSpy.mockClear();
    }
  });

  it('does NOT retry on 400, 401, 403, 404', async () => {
    for (const status of [400, 401, 403, 404]) {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        mockFetchImpl(JSON.stringify({ error: 'client error' }), {
          status,
          statusText: 'Client Error',
        }),
      );

      await expect(
        bloomreachApiFetch(TEST_CONFIG, '/test', {
          retry: { maxRetries: 3, baseDelayMs: 1 },
        }),
      ).rejects.toBeInstanceOf(BloomreachApiError);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    }
  });

  it('succeeds on retry — first call 500, second call 200', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'fail' }), {
            status: 500,
            statusText: 'Server Error',
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const result = await bloomreachApiFetch(TEST_CONFIG, '/test', {
      retry: { maxRetries: 2, baseDelayMs: 1 },
    });

    expect(result).toEqual({ success: true });
    expect(callCount).toBe(2);
  });

  it('throws last BloomreachApiError after exhausting all retries', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'overloaded' }), {
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );

    try {
      await bloomreachApiFetch(TEST_CONFIG, '/test', {
        retry: { maxRetries: 2, baseDelayMs: 1 },
      });
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachApiError);
      expect((error as BloomreachApiError).statusCode).toBe(503);
    }
  });

  it('respects Retry-After header (integer seconds)', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'rate limited' }), {
            status: 429,
            statusText: 'Too Many Requests',
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '5',
            },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      retry: { maxRetries: 1, baseDelayMs: 100 },
    });

    // Should use Retry-After (5000ms) instead of computed delay
    expect(sleepSpy).toHaveBeenCalledWith(5_000);
  });

  it('uses custom retryableStatuses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ error: 'conflict' }), {
        status: 409,
        statusText: 'Conflict',
      }),
    );

    await expect(
      bloomreachApiFetch(TEST_CONFIG, '/test', {
        retry: { maxRetries: 1, baseDelayMs: 1, retryableStatuses: [409] },
      }),
    ).rejects.toBeInstanceOf(BloomreachApiError);

    // 409 is retryable with custom config: 1 initial + 1 retry = 2
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// Request/response logging
// ===========================================================================

describe('request/response logging', () => {
  it('does not call logger when option not provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    // No logger option — should not throw
    await bloomreachApiFetch(TEST_CONFIG, '/test');
  });

  it('calls logger with request event before fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const events: ApiLogEvent[] = [];
    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'GET',
      logger: (event) => events.push(event),
    });

    const requestEvent = events.find((e) => e.type === 'request');
    expect(requestEvent).toBeDefined();
    if (requestEvent) {
      expect(requestEvent.method).toBe('GET');
      expect(requestEvent.url).toBe('https://api.test.com/test');
      expect(requestEvent.timestamp).toBeGreaterThan(0);
    }
  });

  it('calls logger with response event after fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const events: ApiLogEvent[] = [];
    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'GET',
      logger: (event) => events.push(event),
    });

    const responseEvent = events.find((e) => e.type === 'response');
    expect(responseEvent).toBeDefined();
    if (responseEvent && responseEvent.type === 'response') {
      expect(responseEvent.statusCode).toBe(200);
      expect(responseEvent.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('durationMs is a non-negative number', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const events: ApiLogEvent[] = [];
    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      logger: (event) => events.push(event),
    });

    const responseEvent = events.find((e) => e.type === 'response');
    expect(responseEvent).toBeDefined();
    if (responseEvent && responseEvent.type === 'response') {
      expect(typeof responseEvent.durationMs).toBe('number');
      expect(responseEvent.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('logs retry attempts with incrementing attempt field', async () => {
    vi.spyOn(_internal, 'sleep').mockResolvedValue(undefined);

    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'fail' }), {
            status: 500,
            statusText: 'Server Error',
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const events: ApiLogEvent[] = [];
    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      retry: { maxRetries: 2, baseDelayMs: 1 },
      logger: (event) => events.push(event),
    });

    const responseEvents = events.filter((e) => e.type === 'response');
    expect(responseEvents).toHaveLength(3);

    const [first, second, third] = responseEvents;

    // First response (attempt 0) has no attempt field
    expect(first).toBeDefined();
    if (first && first.type === 'response') {
      expect('attempt' in first).toBe(false);
    }
    // Second response has attempt=1
    expect(second).toBeDefined();
    if (second && second.type === 'response') {
      expect(second.attempt).toBe(1);
    }
    // Third response has attempt=2
    expect(third).toBeDefined();
    if (third && third.type === 'response') {
      expect(third.attempt).toBe(2);
    }
  });

  it('does not include auth headers or body in any log event', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const events: ApiLogEvent[] = [];
    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      body: { secret: 'data' },
      logger: (event) => events.push(event),
    });

    for (const event of events) {
      const eventStr = JSON.stringify(event);
      expect(eventStr).not.toContain('Authorization');
      expect(eventStr).not.toContain('my-key');
      expect(eventStr).not.toContain('my-secret');
      expect(eventStr).not.toContain('"secret"');
    }
  });
});

// ===========================================================================
// Response caching
// ===========================================================================

describe('response caching', () => {
  it('returns cached response on hit (fetch called once for two calls)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ data: 'cached' })),
    );

    const store = createApiCache();
    const opts = { method: 'GET' as const, cache: { ttlMs: 60_000, store } };

    const r1 = await bloomreachApiFetch(TEST_CONFIG, '/test', opts);
    const r2 = await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    expect(r1).toEqual({ data: 'cached' });
    expect(r2).toEqual({ data: 'cached' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches again after TTL expires', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ data: 'fresh' })),
    );

    const store = createApiCache();
    const opts = { method: 'GET' as const, cache: { ttlMs: 100, store } };

    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    // Manually expire the cache entry
    for (const [key, entry] of store) {
      store.set(key, { ...entry, expiresAt: Date.now() - 1 });
    }

    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache POST requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    const store = createApiCache();
    const opts = {
      method: 'POST' as const,
      body: { key: 'value' },
      cache: { ttlMs: 60_000, store },
    };

    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);
    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(0);
  });

  it('does NOT cache PUT requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ success: true })),
    );

    const store = createApiCache();
    const opts = {
      method: 'PUT' as const,
      body: { key: 'value' },
      cache: { ttlMs: 60_000, store },
    };

    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);
    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(store.size).toBe(0);
  });

  it('different URLs get separate cache entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const store = createApiCache();
    const cache = { ttlMs: 60_000, store };

    await bloomreachApiFetch(TEST_CONFIG, '/test-a', {
      method: 'GET',
      cache,
    });
    await bloomreachApiFetch(TEST_CONFIG, '/test-b', {
      method: 'GET',
      cache,
    });

    expect(store.size).toBe(2);
  });

  it('clearApiCache forces re-fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ data: 'refetched' })),
    );

    const store = createApiCache();
    const opts = { method: 'GET' as const, cache: { ttlMs: 60_000, store } };

    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);
    clearApiCache(store);
    await bloomreachApiFetch(TEST_CONFIG, '/test', opts);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('custom store option works (isolated cache)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchImpl(JSON.stringify({ ok: true })),
    );

    const storeA = createApiCache();
    const storeB = createApiCache();

    await bloomreachApiFetch(TEST_CONFIG, '/test', {
      method: 'GET',
      cache: { ttlMs: 60_000, store: storeA },
    });

    expect(storeA.size).toBe(1);
    expect(storeB.size).toBe(0);
  });
});

// ===========================================================================
// buildTrackingPath and buildDataPath
// ===========================================================================

describe('buildTrackingPath and buildDataPath', () => {
  it('returns correctly formatted tracking path', () => {
    const result = buildTrackingPath(TEST_CONFIG, '/customers');
    expect(result).toBe('/track/v2/projects/project-1/customers');
  });

  it('returns correctly formatted data path', () => {
    const result = buildDataPath(TEST_CONFIG, '/customers/export');
    expect(result).toBe('/data/v2/projects/project-1/customers/export');
  });

  it('encodes special characters in project token', () => {
    const config = { ...TEST_CONFIG, projectToken: 'proj/with space' };

    expect(buildTrackingPath(config, '/customers')).toBe(
      '/track/v2/projects/proj%2Fwith%20space/customers',
    );
    expect(buildDataPath(config, '/customers/export')).toBe(
      '/data/v2/projects/proj%2Fwith%20space/customers/export',
    );
  });
});

describe('buildEmailPath', () => {
  it('builds correct email API path', () => {
    expect(buildEmailPath(TEST_CONFIG, '/sync')).toBe(
      '/email/v2/projects/project-1/sync',
    );
  });

  it('encodes special characters in project token', () => {
    const config = { ...TEST_CONFIG, projectToken: 'my project/token' };
    expect(buildEmailPath(config, '/sync')).toBe(
      '/email/v2/projects/my%20project%2Ftoken/sync',
    );
  });
});

describe('buildSmsPath', () => {
  it('builds correct SMS API path', () => {
    expect(buildSmsPath(TEST_CONFIG, '/sync')).toBe(
      '/sms/v1/projects/project-1/sync',
    );
  });
});

describe('buildWebxpPath', () => {
  it('builds correct webxp API path', () => {
    expect(buildWebxpPath('/bandits/best-variant')).toBe(
      '/webxp/bandits/best-variant',
    );
  });

  it('builds reward path', () => {
    expect(buildWebxpPath('/bandits/reward')).toBe(
      '/webxp/bandits/reward',
    );
  });
});

// ===========================================================================
// Browser auth error codes
// ===========================================================================

describe('Browser auth error codes', () => {
  it.each([
    'AUTH_REQUIRED',
    'CAPTCHA_OR_CHALLENGE',
    'SESSION_EXPIRED',
    'PROFILE_LOCKED',
  ] as const)('BloomreachBuddyError can be constructed with code %s', (code) => {
    const error = new BloomreachBuddyError(code, `Test ${code} message`);
    expect(error).toBeInstanceOf(BloomreachBuddyError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.message).toBe(`Test ${code} message`);
    expect(error.name).toBe('BloomreachBuddyError');
  });
});
