import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BloomreachAuthManager,
  createAuthManager,
} from '../../auth/authManager.js';
import { BloomreachApiAuth } from '../../auth/apiAuth.js';
import { BloomreachAuthService } from '../../bloomreachAuth.js';
import { BloomreachWebappApiClient } from '../../auth/webappApiClient.js';
import { BloomreachProfileManager } from '../../bloomreachProfileManager.js';

vi.mock('../../auth/apiAuth.js', () => ({
  BloomreachApiAuth: vi.fn(),
}));

vi.mock('../../bloomreachAuth.js', () => ({
  BloomreachAuthService: vi.fn(),
}));

vi.mock('../../auth/webappApiClient.js', () => ({
  BloomreachWebappApiClient: vi.fn(),
}));

vi.mock('../../bloomreachProfileManager.js', () => ({
  BloomreachProfileManager: vi.fn(),
}));

const mockApiAuth = {
  status: vi.fn().mockReturnValue({
    configured: true,
    verified: false,
    checkedAt: '2026-01-01T00:00:00.000Z',
  }),
  verify: vi.fn().mockResolvedValue({
    configured: true,
    verified: true,
    checkedAt: '2026-01-01T00:00:00.000Z',
  }),
  isConfigured: vi.fn().mockReturnValue(true),
  getConfig: vi.fn(),
};

const mockAuthService = {
  status: vi.fn().mockResolvedValue({
    authenticated: true,
    profileName: 'default',
    checkedAt: '2026-01-01T00:00:00.000Z',
    reason: 'Valid',
    sessionCookiePresent: true,
    sessionExpired: false,
  }),
  openLogin: vi.fn().mockResolvedValue({
    authenticated: true,
    timedOut: false,
  }),
  logout: vi.fn().mockResolvedValue({ cleared: true, profileName: 'default' }),
  ensureAuthenticated: vi.fn(),
  getSessionCookies: vi.fn(),
};

const mockWebappClient = {
  isReady: vi.fn().mockResolvedValue(true),
  fetch: vi.fn(),
  getSessionCookies: vi.fn(),
  getCookieHeader: vi.fn(),
};

const ORIGINAL_ENV = process.env;

describe('BloomreachAuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00.000Z'));
    process.env = { ...ORIGINAL_ENV };

    vi.mocked(BloomreachApiAuth).mockImplementation(function MockBloomreachApiAuth() {
      return mockApiAuth as unknown as BloomreachApiAuth;
    });
    vi.mocked(BloomreachAuthService).mockImplementation(function MockBloomreachAuthService() {
      return mockAuthService as unknown as BloomreachAuthService;
    });
    vi.mocked(BloomreachWebappApiClient).mockImplementation(function MockBloomreachWebappApiClient() {
      return mockWebappClient as unknown as BloomreachWebappApiClient;
    });
    vi.mocked(BloomreachProfileManager).mockImplementation(function MockBloomreachProfileManager() {
      return { profilesDir: '/profiles' } as unknown as BloomreachProfileManager;
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
  });

  it('constructor wires all 3 sub-services', () => {
    const manager = new BloomreachAuthManager({
      profilesDir: '/profiles',
      profileName: 'team-a',
      apiConfig: { projectToken: 'token' },
    });

    expect(BloomreachApiAuth).toHaveBeenCalledWith({ projectToken: 'token' });
    expect(BloomreachProfileManager).toHaveBeenCalledWith({ profilesDir: '/profiles' });
    expect(BloomreachAuthService).toHaveBeenCalledWith({ profilesDir: '/profiles' }, { profilesDir: '/profiles' });
    expect(BloomreachWebappApiClient).toHaveBeenCalledWith({
      profilesDir: '/profiles',
      profileName: 'team-a',
    });
    expect(manager.apiAuth).toBe(mockApiAuth);
    expect(manager.authService).toBe(mockAuthService);
    expect(manager.webappClient).toBe(mockWebappClient);
  });

  it('status aggregates API + browser + webapp readiness', async () => {
    const manager = new BloomreachAuthManager({
      profilesDir: '/profiles',
      profileName: 'default',
    });

    const result = await manager.status();

    expect(mockApiAuth.status).toHaveBeenCalledTimes(1);
    expect(mockAuthService.status).toHaveBeenCalledWith({ profileName: 'default' });
    expect(mockWebappClient.isReady).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      api: {
        configured: true,
        verified: false,
        checkedAt: '2026-01-01T00:00:00.000Z',
      },
      browser: {
        authenticated: true,
        profileName: 'default',
        checkedAt: '2026-01-01T00:00:00.000Z',
        reason: 'Valid',
        sessionCookiePresent: true,
        sessionExpired: false,
      },
      webappApiReady: true,
      checkedAt: '2026-02-01T12:00:00.000Z',
    });
  });

  it('status handles partial failures (API unconfigured but browser OK)', async () => {
    mockApiAuth.status.mockReturnValueOnce({
      configured: false,
      verified: false,
      checkedAt: '2026-01-01T00:00:00.000Z',
    });

    const manager = new BloomreachAuthManager({ profilesDir: '/profiles' });
    const result = await manager.status();

    expect(result.api.configured).toBe(false);
    expect(result.browser.authenticated).toBe(true);
    expect(result.webappApiReady).toBe(true);
  });

  it('login delegates to authService.openLogin', async () => {
    const manager = new BloomreachAuthManager({
      profilesDir: '/profiles',
      profileName: 'default',
    });

    const result = await manager.login({ profileName: 'team-a', timeoutMs: 1000 });

    expect(mockAuthService.openLogin).toHaveBeenCalledWith({
      profileName: 'team-a',
      timeoutMs: 1000,
    });
    expect(result).toEqual({ authenticated: true, timedOut: false });
  });

  it('logout delegates to authService.logout', async () => {
    const manager = new BloomreachAuthManager({ profilesDir: '/profiles' });

    const result = await manager.logout({ profileName: 'team-a' });

    expect(mockAuthService.logout).toHaveBeenCalledWith({ profileName: 'team-a' });
    expect(result).toEqual({ cleared: true, profileName: 'default' });
  });

  it('verifyApi delegates to apiAuth.verify', async () => {
    const manager = new BloomreachAuthManager({ profilesDir: '/profiles' });

    const result = await manager.verifyApi();

    expect(mockApiAuth.verify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      configured: true,
      verified: true,
      checkedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('createAuthManager factory creates valid instance', () => {
    const manager = createAuthManager({
      profilesDir: '/profiles',
      profileName: 'default',
    });

    expect(manager).toBeInstanceOf(BloomreachAuthManager);
    expect(BloomreachApiAuth).toHaveBeenCalledTimes(1);
    expect(BloomreachAuthService).toHaveBeenCalledTimes(1);
    expect(BloomreachWebappApiClient).toHaveBeenCalledTimes(1);
  });

  it('constructor uses BLOOMREACH_PROFILE_DIR env var fallback', () => {
    process.env.BLOOMREACH_PROFILE_DIR = '/env-profiles';

    new BloomreachAuthManager();

    expect(BloomreachProfileManager).toHaveBeenCalledWith({
      profilesDir: '/env-profiles',
    });
    expect(BloomreachWebappApiClient).toHaveBeenCalledWith({
      profilesDir: '/env-profiles',
      profileName: 'default',
    });
  });

  it('status respects profileName option', async () => {
    const manager = new BloomreachAuthManager({
      profilesDir: '/profiles',
      profileName: 'default',
    });

    await manager.status({ profileName: 'team-b' });

    expect(mockAuthService.status).toHaveBeenCalledWith({ profileName: 'team-b' });
  });
});
