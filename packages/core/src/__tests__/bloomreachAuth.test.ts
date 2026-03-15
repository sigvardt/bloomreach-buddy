import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BloomreachProfileManager } from '../bloomreachProfileManager.js';
import type { BloomreachStorageState, StoredSession } from '../bloomreachSessionStore.js';
import { BloomreachAuthService, isAuthenticatedPage, isLoginPage } from '../bloomreachAuth.js';

vi.mock('../bloomreachSessionStore.js', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  isSessionExpired: vi.fn(),
  summarizeSessionCookies: vi.fn(),
}));

import {
  loadSession,
  saveSession,
  isSessionExpired,
  summarizeSessionCookies,
} from '../bloomreachSessionStore.js';

const mockPage = {
  goto: vi.fn(),
  waitForTimeout: vi.fn(async () => undefined),
  url: vi.fn(),
};

const mockContext = {
  pages: () => [mockPage],
  newPage: vi.fn(),
  storageState: vi.fn().mockResolvedValue({ cookies: [], origins: [] }),
  close: vi.fn(),
};

const mockProfileManager = {
  runWithPersistentContext: vi.fn().mockImplementation(
    async (
      _profile: string,
      _opts: unknown,
      callback: (ctx: unknown) => Promise<unknown>,
    ) => callback(mockContext),
  ),
};

const profileManagerForAuth = mockProfileManager as unknown as BloomreachProfileManager;

const validSession: StoredSession = {
  schemaVersion: 1,
  metadata: {
    capturedAt: '2026-01-01T00:00:00.000Z',
    profileName: 'default',
    loginUrl: 'https://eu.login.bloomreach.com/',
    cookieCount: 1,
    earliestCookieExpiry: '2030-01-01T00:00:00.000Z',
  },
  storageState: {
    cookies: [
      {
        name: 'sid',
        value: 'secret',
        domain: '.bloomreach.com',
        path: '/',
        expires: 1_893_456_000,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  },
};

const cookieSummary = [
  {
    name: 'sid',
    domain: '.bloomreach.com',
    expiresAt: '2030-01-01T00:00:00.000Z',
  },
];

describe('bloomreachAuth helpers', () => {
  it('isLoginPage returns expected values', () => {
    expect(isLoginPage('https://eu.login.bloomreach.com/')).toBe(true);
    expect(isLoginPage('https://app.bloomreach.com/')).toBe(false);
    expect(isLoginPage('https://example.com/login')).toBe(true);
    expect(isLoginPage('not-a-valid-url')).toBe(false);
  });

  it('isAuthenticatedPage returns expected values', () => {
    expect(isAuthenticatedPage('https://app.bloomreach.com/project/123')).toBe(true);
    expect(isAuthenticatedPage('https://eu.login.bloomreach.com/')).toBe(false);
    expect(isAuthenticatedPage('https://app.bloomreach.com/login')).toBe(false);
  });
});

describe('BloomreachAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(null);
    mockPage.waitForTimeout.mockResolvedValue(undefined);
    mockPage.url.mockReset();
    mockContext.newPage.mockResolvedValue(mockPage);
    mockContext.storageState.mockResolvedValue({ cookies: [], origins: [] });
    vi.mocked(summarizeSessionCookies).mockReturnValue(cookieSummary);
  });

  it('status returns unauthenticated when no session exists', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.status({ profileName: 'p1' });

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain('No stored session found');
    expect(result.profileName).toBe('p1');
    expect(result.sessionCookiePresent).toBe(false);
    expect(result.sessionExpired).toBe(false);
  });

  it('status returns unauthenticated for expired session', async () => {
    vi.mocked(loadSession).mockResolvedValue(validSession);
    vi.mocked(isSessionExpired).mockReturnValue(true);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.status({ profileName: 'p1' });

    expect(result.authenticated).toBe(false);
    expect(result.sessionCookiePresent).toBe(true);
    expect(result.sessionExpired).toBe(true);
    expect(result.cookieSummary).toEqual(cookieSummary);
  });

  it('status returns authenticated for valid session', async () => {
    vi.mocked(loadSession).mockResolvedValue(validSession);
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.status({ profileName: 'p1' });

    expect(result.authenticated).toBe(true);
    expect(result.reason).toBe('Session is valid.');
    expect(result.profileName).toBe('p1');
    expect(result.sessionCookiePresent).toBe(true);
    expect(result.sessionExpired).toBe(false);
    expect(result.cookieSummary).toEqual(cookieSummary);
  });

  it('status uses default profile name when omitted', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.status();

    expect(result.profileName).toBe('default');
    expect(loadSession).toHaveBeenCalledWith('/profiles', 'default');
  });

  it('openLogin handles successful login and persists session', async () => {
    const storageState: BloomreachStorageState = {
      cookies: validSession.storageState.cookies,
      origins: [],
    };

    mockPage.url.mockReturnValueOnce('https://app.bloomreach.com/project/123');
    mockContext.storageState.mockResolvedValue(storageState);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.openLogin({
      profileName: 'p1',
      timeoutMs: 60_000,
      pollIntervalMs: 1,
    });

    expect(mockProfileManager.runWithPersistentContext).toHaveBeenCalledWith(
      'p1',
      { headless: false },
      expect.any(Function),
    );
    expect(mockPage.goto).toHaveBeenCalledWith('https://eu.login.bloomreach.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    expect(saveSession).toHaveBeenCalledWith(
      '/profiles',
      'p1',
      storageState,
      'https://eu.login.bloomreach.com/',
    );
    expect(result.authenticated).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.sessionCookiePresent).toBe(true);
    expect(result.cookieSummary).toEqual(cookieSummary);
  });

  it('openLogin returns timedOut true when login does not complete', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy
      .mockImplementationOnce(() => 0)
      .mockImplementationOnce(() => 0)
      .mockImplementation(() => 10);
    mockPage.url.mockReturnValue('https://eu.login.bloomreach.com/');

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.openLogin({
      profileName: 'p1',
      timeoutMs: 5,
      pollIntervalMs: 0,
    });

    expect(result.authenticated).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(saveSession).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('ensureAuthenticated returns status when already authenticated', async () => {
    vi.mocked(loadSession).mockResolvedValue(validSession);
    vi.mocked(isSessionExpired).mockReturnValue(false);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    const result = await auth.ensureAuthenticated({ profileName: 'p1' });

    expect(result.authenticated).toBe(true);
    expect(result.profileName).toBe('p1');
  });

  it('ensureAuthenticated throws AUTH_REQUIRED when unauthenticated', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const auth = new BloomreachAuthService(profileManagerForAuth, {
      profilesDir: '/profiles',
    });

    await expect(auth.ensureAuthenticated({ profileName: 'p1' })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      name: 'BloomreachBuddyError',
    });
  });
});
