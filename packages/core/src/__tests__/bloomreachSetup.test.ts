import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import {
  validateCredentials,
  writeEnvFile,
  openBrowserUrl,
  BLOOMREACH_API_SETTINGS_URL,
} from '../bloomreachSetup.js';
import type { ValidateCredentialsInput } from '../bloomreachSetup.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

const VALID_INPUT: ValidateCredentialsInput = {
  projectToken: 'test-token',
  apiKeyId: 'test-key-id',
  apiSecret: 'test-secret',
};

const ORIGINAL_PLATFORM = process.platform;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM });
});

// ===========================================================================
// validateCredentials
// ===========================================================================

describe('validateCredentials', () => {
  it('returns valid result on successful 2xx with success: true', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, time: 1700000000.5 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(true);
    expect(result.serverTime).toBe(1700000000.5);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid_credentials on 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'access key not found' }), {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_credentials');
    expect(result.message).toContain('incorrect');
  });

  it('returns invalid_credentials on 403 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_credentials');
  });

  it('returns invalid_project on 404 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'project not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_project');
    expect(result.message).toContain('Project token not found');
  });

  it('returns network_error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('network_error');
    expect(result.message).toContain('fetch failed');
  });

  it('returns timeout on abort error', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    );

    const promise = validateCredentials({
      ...VALID_INPUT,
      baseUrl: 'https://api.test.com',
    });

    // Advance past the 30s default timeout in bloomreachApiFetch
    await vi.advanceTimersByTimeAsync(31_000);

    const result = await promise;

    expect(result.valid).toBe(false);
    expect(result.error).toBe('timeout');

    vi.useRealTimers();
  });

  it('sends correct auth header and path', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, time: 1700000000 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await validateCredentials({
      projectToken: 'my-project',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
      baseUrl: 'https://api.test.com',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.test.com/track/v2/projects/my-project/system/time',
    );
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(
      `Basic ${Buffer.from('my-key:my-secret').toString('base64')}`,
    );
  });

  it('trims whitespace from credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, time: 1700000000 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await validateCredentials({
      projectToken: '  my-project  ',
      apiKeyId: '  my-key  ',
      apiSecret: '  my-secret  ',
    });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/my-project/');
  });

  it('returns invalid_credentials when success is false in 2xx body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: false, error: 'access key not found' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_credentials');
    expect(result.message).toBe('access key not found');
  });

  it('returns unknown error for unexpected API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'internal' }), {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await validateCredentials(VALID_INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('unknown');
    expect(result.message).toContain('500');
  });

  it('uses default base URL when not provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, time: 1700000000 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await validateCredentials({
      projectToken: 'my-project',
      apiKeyId: 'my-key',
      apiSecret: 'my-secret',
    });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api.exponea.com/');
  });
});

// ===========================================================================
// writeEnvFile
// ===========================================================================

describe('writeEnvFile', () => {
  it('writes .env file with all required vars', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    writeEnvFile(VALID_INPUT, { directory: '/test/dir' });

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [path, content] = vi.mocked(writeFileSync).mock.calls[0] as [string, string, string];
    expect(path).toBe('/test/dir/.env');
    expect(content).toContain('BLOOMREACH_PROJECT_TOKEN=test-token');
    expect(content).toContain('BLOOMREACH_API_KEY_ID=test-key-id');
    expect(content).toContain('BLOOMREACH_API_SECRET=test-secret');
  });

  it('includes BLOOMREACH_API_BASE_URL only when non-default', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    writeEnvFile(
      { ...VALID_INPUT, baseUrl: 'https://custom.api.com' },
      { directory: '/test', merge: false },
    );

    const content = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string;
    expect(content).toContain('BLOOMREACH_API_BASE_URL=https://custom.api.com');
  });

  it('omits BLOOMREACH_API_BASE_URL when using default', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    writeEnvFile(
      { ...VALID_INPUT, baseUrl: 'https://api.exponea.com' },
      { directory: '/test', merge: false },
    );

    const content = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string;
    expect(content).not.toContain('BLOOMREACH_API_BASE_URL');
  });

  it('preserves existing non-Bloomreach lines when merge is true', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      'OTHER_VAR=keep-me\nANOTHER=also-keep\nBLOOMREACH_PROJECT_TOKEN=old-token\n' as never,
    );

    writeEnvFile(VALID_INPUT, { directory: '/test', merge: true });

    const content = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string;
    expect(content).toContain('OTHER_VAR=keep-me');
    expect(content).toContain('ANOTHER=also-keep');
    expect(content).toContain('BLOOMREACH_PROJECT_TOKEN=test-token');
    expect(content).not.toContain('old-token');
  });

  it('overwrites entirely when merge is false', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('OTHER_VAR=keep-me\n' as never);

    writeEnvFile(VALID_INPUT, { directory: '/test', merge: false });

    const content = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string;
    expect(content).not.toContain('OTHER_VAR');
    expect(content).toContain('BLOOMREACH_PROJECT_TOKEN=test-token');
  });

  it('returns the path of the written file', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = writeEnvFile(VALID_INPUT, { directory: '/test/dir' });

    expect(result).toBe('/test/dir/.env');
  });

  it('trims whitespace from credential values', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    writeEnvFile(
      { projectToken: '  spaced  ', apiKeyId: '  key  ', apiSecret: '  secret  ' },
      { directory: '/test', merge: false },
    );

    const content = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string;
    expect(content).toContain('BLOOMREACH_PROJECT_TOKEN=spaced');
    expect(content).toContain('BLOOMREACH_API_KEY_ID=key');
    expect(content).toContain('BLOOMREACH_API_SECRET=secret');
  });
});

// ===========================================================================
// openBrowserUrl
// ===========================================================================

describe('openBrowserUrl', () => {
  it('calls exec with "open" on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    openBrowserUrl('https://example.com');

    expect(exec).toHaveBeenCalledWith(
      'open "https://example.com"',
      expect.any(Function),
    );
  });

  it('calls exec with "xdg-open" on linux', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    openBrowserUrl('https://example.com');

    expect(exec).toHaveBeenCalledWith(
      'xdg-open "https://example.com"',
      expect.any(Function),
    );
  });

  it('calls exec with "start" on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    openBrowserUrl('https://example.com');

    expect(exec).toHaveBeenCalledWith(
      'start "" "https://example.com"',
      expect.any(Function),
    );
  });

  it('does not throw when exec fails', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    vi.mocked(exec).mockImplementation((_cmd, callback) => {
      if (typeof callback === 'function') {
        (callback as (err: Error | null) => void)(new Error('spawn failed'));
      }
      return undefined as never;
    });

    expect(() => openBrowserUrl('https://example.com')).not.toThrow();
  });
});

// ===========================================================================
// BLOOMREACH_API_SETTINGS_URL
// ===========================================================================

describe('BLOOMREACH_API_SETTINGS_URL', () => {
  it('is a valid URL', () => {
    expect(() => new URL(BLOOMREACH_API_SETTINGS_URL)).not.toThrow();
  });
});
