import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BloomreachCookie, StoredSession } from '../../bloomreachSessionStore.js';
import { BloomreachBuddyError } from '../../errors.js';
import {
  BloomreachWebappApiClient,
} from '../../auth/webappApiClient.js';

vi.mock('../../bloomreachSessionStore.js', () => ({
  loadSession: vi.fn(),
  isSessionExpired: vi.fn(),
}));

import {
  loadSession,
  isSessionExpired,
} from '../../bloomreachSessionStore.js';

const ORIGINAL_ENV = process.env;

const SESSION_COOKIE: BloomreachCookie = {
  name: 'sid',
  value: 'cookie-value',
  domain: '.bloomreach.com',
  path: '/',
  expires: 1_893_456_000,
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
};

const VALID_SESSION: StoredSession = {
  schemaVersion: 1,
  metadata: {
    capturedAt: '2026-01-01T00:00:00.000Z',
    profileName: 'default',
    loginUrl: 'https://eu.login.bloomreach.com/',
    cookieCount: 1,
    earliestCookieExpiry: '2030-01-01T00:00:00.000Z',
  },
  storageState: {
    cookies: [SESSION_COOKIE],
    origins: [],
  },
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  });
}

describe('BloomreachWebappApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BLOOMREACH_URL;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  it('getSessionCookies returns cookies from valid session', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const client = new BloomreachWebappApiClient({
      profilesDir: '/profiles',
      profileName: 'team-a',
    });

    const cookies = await client.getSessionCookies();

    expect(loadSession).toHaveBeenCalledWith('/profiles', 'team-a');
    expect(isSessionExpired).toHaveBeenCalledWith(VALID_SESSION);
    expect(cookies).toEqual([SESSION_COOKIE]);
  });

  it('getSessionCookies returns [] when no session', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.getSessionCookies()).resolves.toEqual([]);
    expect(isSessionExpired).not.toHaveBeenCalled();
  });

  it('getSessionCookies returns [] when session expired', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(true);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.getSessionCookies()).resolves.toEqual([]);
  });

  it('getCookieHeader builds correct cookie string', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      ...VALID_SESSION,
      storageState: {
        cookies: [
          SESSION_COOKIE,
          {
            ...SESSION_COOKIE,
            name: 'csrftoken',
            value: 'csrf-value',
          },
        ],
        origins: [],
      },
    });
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.getCookieHeader()).resolves.toBe('sid=cookie-value; csrftoken=csrf-value');
  });

  it('getCookieHeader returns null when no cookies', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      ...VALID_SESSION,
      storageState: {
        cookies: [],
        origins: [],
      },
    });
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.getCookieHeader()).resolves.toBeNull();
  });

  it('fetch sends request with cookie header', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse({ ok: true }, {
        headers: { 'x-request-id': 'req-123' },
      }),
    );

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    const result = await client.fetch('/api/v1/projects', {
      method: 'POST',
      body: { name: 'Project Alpha' },
      headers: { 'X-Custom': 'value' },
    });

    expect(fetch).toHaveBeenCalledWith('https://app.exponea.com/api/v1/projects', {
      method: 'POST',
      headers: {
        Cookie: 'sid=cookie-value',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Custom': 'value',
      },
      body: JSON.stringify({ name: 'Project Alpha' }),
      signal: expect.any(AbortSignal),
    });

    expect(result).toEqual({
      status: 200,
      ok: true,
      data: { ok: true },
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        'x-request-id': 'req-123',
      },
    });
  });

  it('fetch throws AUTH_REQUIRED when no cookies', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.fetch('/api/v1/projects')).rejects.toMatchObject({
      name: 'BloomreachBuddyError',
      code: 'AUTH_REQUIRED',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetch handles timeout', async () => {
    vi.useFakeTimers();
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);
    vi.mocked(fetch).mockImplementation(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            if (signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            signal.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }
        }),
    );

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });
    const pending = client.fetch('/api/v1/slow', { timeoutMs: 25 });
    const timeoutAssertion = expect(pending).rejects.toMatchObject({
      name: 'BloomreachBuddyError',
      code: 'TIMEOUT',
      message: 'Webapp API request timed out after 25ms: GET /api/v1/slow',
    });

    await vi.advanceTimersByTimeAsync(25);
    await timeoutAssertion;
  });

  it('fetch handles network error', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);
    vi.mocked(fetch).mockRejectedValue(new Error('connection reset'));

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.fetch('/api/v1/projects')).rejects.toEqual(
      new BloomreachBuddyError('NETWORK_ERROR', 'connection reset'),
    );
  });

  it('isReady returns true when valid cookies exist', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.isReady()).resolves.toBe(true);
  });

  it('isReady returns false when cookies are unavailable', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const client = new BloomreachWebappApiClient({ profilesDir: '/profiles' });

    await expect(client.isReady()).resolves.toBe(false);
  });

  it('constructor uses defaults and env vars correctly', async () => {
    vi.mocked(loadSession).mockResolvedValue(VALID_SESSION);
    vi.mocked(isSessionExpired).mockReturnValue(false);
    vi.mocked(fetch).mockImplementation(async () => jsonResponse({ ok: true }));

    const defaultClient = new BloomreachWebappApiClient({ profilesDir: '/profiles' });
    await defaultClient.fetch('/health');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://app.exponea.com/health',
      expect.objectContaining({ method: 'GET' }),
    );

    process.env.BLOOMREACH_URL = 'https://env.example.com///';
    const envClient = new BloomreachWebappApiClient({ profilesDir: '/profiles' });
    await envClient.fetch('/health');
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://env.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );

    const explicitClient = new BloomreachWebappApiClient({
      profilesDir: '/profiles',
      baseUrl: 'https://explicit.example.com///',
    });
    await explicitClient.fetch('/health');
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'https://explicit.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
