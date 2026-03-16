import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserContext, Page } from 'playwright-core';
import { BloomreachAuthService } from '../bloomreachAuth.js';
import type { BloomreachProfileManager } from '../bloomreachProfileManager.js';

vi.mock('../bloomreachSessionStore.js', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
  isSessionExpired: vi.fn(),
  summarizeSessionCookies: vi.fn().mockReturnValue([]),
}));

vi.mock('../auth/loginSelectors.js', () => ({
  tryAutoFill: vi.fn().mockResolvedValue(false),
  resolveAutoFillConfig: vi.fn().mockReturnValue({}),
}));

interface MockHarness {
  auth: BloomreachAuthService;
  mockPage: Page;
  mockContext: BrowserContext;
}

function createHarness(overrides?: {
  url?: () => string;
  evaluateResult?: unknown;
  waitForTimeout?: () => Promise<void>;
}): MockHarness {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi
      .fn()
      .mockImplementation(overrides?.url ?? (() => 'https://eu.login.bloomreach.com/login')),
    waitForTimeout: vi
      .fn()
      .mockImplementation(overrides?.waitForTimeout ?? (async () => undefined)),
    waitForSelector: vi.fn().mockResolvedValue({}),
    evaluate: vi.fn().mockResolvedValue(overrides?.evaluateResult ?? null),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
  } as unknown as Page;

  const mockContext = {
    pages: vi.fn().mockReturnValue([mockPage]),
    newPage: vi.fn().mockResolvedValue(mockPage),
    storageState: vi.fn().mockResolvedValue({ cookies: [], origins: [] }),
  } as unknown as BrowserContext;

  const profileManager = {
    runWithPersistentContext: vi
      .fn()
      .mockImplementation(
        async (
          _name: string,
          _opts: unknown,
          callback: (ctx: BrowserContext) => Promise<unknown>,
        ) => {
          return callback(mockContext);
        },
      ),
  } as unknown as BloomreachProfileManager;

  return {
    auth: new BloomreachAuthService(profileManager, { profilesDir: '/profiles' }),
    mockPage,
    mockContext,
  };
}

describe('BloomreachAuthService openLogin CAPTCHA integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('openLogin sets captchaDetected false when no CAPTCHA appears', async () => {
    let pollCount = 0;
    const { auth } = createHarness({
      url: () => {
        if (pollCount < 3) {
          return 'https://eu.login.bloomreach.com/login';
        }
        return 'https://eu.login.bloomreach.com/my-account';
      },
      waitForTimeout: async () => {
        pollCount += 1;
      },
      evaluateResult: null,
    });

    const result = await auth.openLogin({
      timeoutMs: 10_000,
      pollIntervalMs: 0,
      autoFill: false,
    });

    expect(result.captchaDetected).toBe(false);
    expect(result.authenticated).toBe(true);
    expect(result.timedOut).toBe(false);
  });

  it('openLogin detects CAPTCHA and sets captchaDetected true', async () => {
    let now = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    const { auth } = createHarness({
      url: () => 'https://eu.login.bloomreach.com/login',
      waitForTimeout: async () => {
        now += 10;
      },
      evaluateResult: {
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: 'iframe[title="recaptcha challenge expires in two minutes"]',
      },
    });

    const result = await auth.openLogin({
      timeoutMs: 5,
      captchaTimeoutMs: 1,
      pollIntervalMs: 0,
      autoFill: false,
    });

    expect(result.authenticated).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.captchaDetected).toBe(true);
    nowSpy.mockRestore();
  });

  it('openLogin calls onCaptchaDetected callback when CAPTCHA detected', async () => {
    let now = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const onCaptchaDetected = vi.fn();

    const { auth } = createHarness({
      url: () => 'https://eu.login.bloomreach.com/login',
      waitForTimeout: async () => {
        now += 25;
      },
      evaluateResult: {
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: 'iframe[title="recaptcha challenge expires in two minutes"]',
      },
    });

    const result = await auth.openLogin({
      timeoutMs: 50,
      captchaTimeoutMs: 40,
      pollIntervalMs: 0,
      autoFill: false,
      onCaptchaDetected,
    });

    expect(result.captchaDetected).toBe(true);
    expect(onCaptchaDetected).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });

  it('openLogin extends deadline when CAPTCHA detected and captchaTimeoutMs set', async () => {
    let now = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);

    const { auth, mockContext } = createHarness({
      url: () => {
        if (now < 300) {
          return 'https://eu.login.bloomreach.com/login';
        }
        return 'https://eu.login.bloomreach.com/my-account';
      },
      waitForTimeout: async () => {
        now += 100;
      },
      evaluateResult: {
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: 'iframe[title="recaptcha challenge expires in two minutes"]',
      },
    });

    vi.mocked(mockContext.storageState).mockResolvedValue({ cookies: [], origins: [] });

    const result = await auth.openLogin({
      timeoutMs: 100,
      captchaTimeoutMs: 500,
      pollIntervalMs: 0,
      autoFill: false,
    });

    expect(result.authenticated).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.captchaDetected).toBe(true);
    nowSpy.mockRestore();
  });

  it('openLogin succeeds when user solves CAPTCHA within timeout', async () => {
    let pollCount = 0;

    const { auth } = createHarness({
      url: () => {
        if (pollCount < 3) {
          return 'https://eu.login.bloomreach.com/login';
        }
        return 'https://eu.login.bloomreach.com/my-account';
      },
      waitForTimeout: async () => {
        pollCount += 1;
      },
      evaluateResult: {
        detected: true,
        type: 'recaptcha-v2-invisible',
        iframeSelector: 'iframe[title="recaptcha challenge expires in two minutes"]',
      },
    });

    const result = await auth.openLogin({
      timeoutMs: 10_000,
      pollIntervalMs: 0,
      autoFill: false,
    });

    expect(result.authenticated).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.captchaDetected).toBe(true);
  });
});
