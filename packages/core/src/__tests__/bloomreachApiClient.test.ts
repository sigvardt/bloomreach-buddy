import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveApiConfig,
  buildAuthHeader,
  bloomreachApiFetch,
  buildTrackingPath,
  buildDataPath,
  BloomreachApiError,
} from '../bloomreachApiClient.js';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  it('throws when projectToken is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = '';
    process.env.BLOOMREACH_API_KEY_ID = 'env-key';
    process.env.BLOOMREACH_API_SECRET = 'env-secret';

    expect(() => resolveApiConfig()).toThrow('Bloomreach project token is required');
  });

  it('throws when apiKeyId is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = 'env-project';
    process.env.BLOOMREACH_API_KEY_ID = '';
    process.env.BLOOMREACH_API_SECRET = 'env-secret';

    expect(() => resolveApiConfig()).toThrow('Bloomreach API key ID is required');
  });

  it('throws when apiSecret is missing', () => {
    process.env.BLOOMREACH_PROJECT_TOKEN = 'env-project';
    process.env.BLOOMREACH_API_KEY_ID = 'env-key';
    process.env.BLOOMREACH_API_SECRET = '';

    expect(() => resolveApiConfig()).toThrow('Bloomreach API secret is required');
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

describe('buildAuthHeader', () => {
  it('returns correct Basic auth format', () => {
    const header = buildAuthHeader({
      projectToken: 'project-1',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
      baseUrl: 'https://api.test.com',
    });

    expect(header.startsWith('Basic ')).toBe(true);
  });

  it('base64 encodes apiKeyId:apiSecret correctly', () => {
    const header = buildAuthHeader({
      projectToken: 'project-1',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
      baseUrl: 'https://api.test.com',
    });

    expect(header).toBe(`Basic ${Buffer.from('my-key:my-secret').toString('base64')}`);
  });
});

describe('bloomreachApiFetch', () => {
  it('makes request with correct URL, method, headers, and body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const config = {
      projectToken: 'project-1',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
      baseUrl: 'https://api.test.com',
    };

    await bloomreachApiFetch(config, '/track/v2/projects/project-1/customers', {
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await bloomreachApiFetch(
      {
        projectToken: 'project-1',
        apiKeyId: 'my-key',
        apiSecret: 'my-secret',
        baseUrl: 'https://api.test.com',
      },
      '/data/v2/projects/project-1/customers/export',
    );

    expect(result).toEqual({ ok: true, id: 1 });
  });

  it('throws BloomreachApiError on non-2xx responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad request' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      bloomreachApiFetch(
        {
          projectToken: 'project-1',
          apiKeyId: 'my-key',
          apiSecret: 'my-secret',
          baseUrl: 'https://api.test.com',
        },
        '/track/v2/projects/project-1/customers',
      ),
    ).rejects.toBeInstanceOf(BloomreachApiError);
  });

  it('handles timeout and aborts the request', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const request = bloomreachApiFetch(
      {
        projectToken: 'project-1',
        apiKeyId: 'my-key',
        apiSecret: 'my-secret',
        baseUrl: 'https://api.test.com',
      },
      '/track/v2/projects/project-1/customers',
      { timeoutMs: 10 },
    );

    const assertion = expect(request).rejects.toThrow('timed out after 10ms');

    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });
});

describe('buildTrackingPath and buildDataPath', () => {
  it('returns correctly formatted tracking path', () => {
    const result = buildTrackingPath(
      {
        projectToken: 'project-1',
        apiKeyId: 'my-key',
        apiSecret: 'my-secret',
        baseUrl: 'https://api.test.com',
      },
      '/customers',
    );

    expect(result).toBe('/track/v2/projects/project-1/customers');
  });

  it('returns correctly formatted data path', () => {
    const result = buildDataPath(
      {
        projectToken: 'project-1',
        apiKeyId: 'my-key',
        apiSecret: 'my-secret',
        baseUrl: 'https://api.test.com',
      },
      '/customers/export',
    );

    expect(result).toBe('/data/v2/projects/project-1/customers/export');
  });

  it('encodes special characters in project token', () => {
    const config = {
      projectToken: 'proj/with space',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
      baseUrl: 'https://api.test.com',
    };

    expect(buildTrackingPath(config, '/customers')).toBe(
      '/track/v2/projects/proj%2Fwith%20space/customers',
    );
    expect(buildDataPath(config, '/customers/export')).toBe(
      '/data/v2/projects/proj%2Fwith%20space/customers/export',
    );
  });
});

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
});
