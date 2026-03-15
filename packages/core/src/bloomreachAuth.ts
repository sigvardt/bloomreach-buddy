import type { BrowserContext, Page } from 'playwright-core';
import { BloomreachBuddyError } from './bloomreachApiClient.js';
import type {
  BloomreachProfileManager,
  PersistentContextOptions,
} from './bloomreachProfileManager.js';
import {
  loadSession,
  saveSession,
  isSessionExpired,
  summarizeSessionCookies,
} from './bloomreachSessionStore.js';
import type { BloomreachStorageState, StoredSession } from './bloomreachSessionStore.js';

export const BLOOMREACH_LOGIN_URL = 'https://eu.login.bloomreach.com/';
export const BLOOMREACH_APP_URL = 'https://app.bloomreach.com/';

export const DEFAULT_LOGIN_TIMEOUT_MS = 300_000;
export const DEFAULT_LOGIN_POLL_INTERVAL_MS = 2_000;

export interface BloomreachSessionStatus {
  authenticated: boolean;
  checkedAt: string;
  reason: string;
  profileName: string;
  sessionCookiePresent: boolean;
  sessionExpired: boolean;
  cookieSummary?: Array<{ name: string; domain: string; expiresAt: string | null }>;
}

export interface BloomreachSessionOptions {
  profileName?: string;
}

export interface BloomreachOpenLoginOptions extends BloomreachSessionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  loginUrl?: string;
}

export interface BloomreachOpenLoginResult extends BloomreachSessionStatus {
  timedOut: boolean;
}

export interface BloomreachAuthConfig {
  profilesDir: string;
  loginUrl?: string;
}

export function isLoginPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('login.bloomreach.com') || parsed.pathname === '/login';
  } catch {
    return false;
  }
}

export function isAuthenticatedPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('app.bloomreach.com') && parsed.pathname !== '/login';
  } catch {
    return false;
  }
}

export class BloomreachAuthService {
  private readonly profileManager: BloomreachProfileManager;
  private readonly profilesDir: string;
  private readonly loginUrl: string;

  constructor(profileManager: BloomreachProfileManager, config: BloomreachAuthConfig) {
    this.profileManager = profileManager;
    this.profilesDir = config.profilesDir;
    this.loginUrl = config.loginUrl ?? process.env.BLOOMREACH_LOGIN_URL ?? BLOOMREACH_LOGIN_URL;
  }

  async status(options?: BloomreachSessionOptions): Promise<BloomreachSessionStatus> {
    const profileName = options?.profileName ?? 'default';
    const checkedAt = new Date().toISOString();

    const session: StoredSession | null = await loadSession(this.profilesDir, profileName);

    if (!session) {
      return {
        authenticated: false,
        checkedAt,
        reason: 'No stored session found. Run "bloomreach login" to authenticate.',
        profileName,
        sessionCookiePresent: false,
        sessionExpired: false,
      };
    }

    if (isSessionExpired(session)) {
      return {
        authenticated: false,
        checkedAt,
        reason: 'Stored session has expired. Run "bloomreach login" to re-authenticate.',
        profileName,
        sessionCookiePresent: true,
        sessionExpired: true,
        cookieSummary: summarizeSessionCookies(session.storageState.cookies),
      };
    }

    return {
      authenticated: true,
      checkedAt,
      reason: 'Session is valid.',
      profileName,
      sessionCookiePresent: true,
      sessionExpired: false,
      cookieSummary: summarizeSessionCookies(session.storageState.cookies),
    };
  }

  async openLogin(options?: BloomreachOpenLoginOptions): Promise<BloomreachOpenLoginResult> {
    const profileName = options?.profileName ?? 'default';
    const timeoutMs = options?.timeoutMs ?? DEFAULT_LOGIN_TIMEOUT_MS;
    const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_LOGIN_POLL_INTERVAL_MS;
    const loginUrl = options?.loginUrl ?? this.loginUrl;
    const persistentOptions: PersistentContextOptions = { headless: false };

    return this.profileManager.runWithPersistentContext(
      profileName,
      persistentOptions,
      async (context: BrowserContext) => {
        const page: Page = context.pages()[0] ?? (await context.newPage());

        await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

        const deadline = Date.now() + timeoutMs;
        let authenticated = false;

        while (Date.now() < deadline) {
          await page.waitForTimeout(pollIntervalMs);
          const currentUrl = page.url();

          if (isAuthenticatedPage(currentUrl)) {
            authenticated = true;
            break;
          }
        }

        const checkedAt = new Date().toISOString();

        if (!authenticated) {
          return {
            authenticated: false,
            checkedAt,
            reason: 'Login timed out. The browser was closed or login was not completed in time.',
            profileName,
            sessionCookiePresent: false,
            sessionExpired: false,
            timedOut: true,
          };
        }

        const storageState = (await context.storageState()) as unknown as BloomreachStorageState;

        await saveSession(this.profilesDir, profileName, storageState, loginUrl);

        return {
          authenticated: true,
          checkedAt,
          reason: 'Login successful. Session captured and encrypted.',
          profileName,
          sessionCookiePresent: true,
          sessionExpired: false,
          timedOut: false,
          cookieSummary: summarizeSessionCookies(storageState.cookies),
        };
      },
    );
  }

  async ensureAuthenticated(options?: BloomreachSessionOptions): Promise<BloomreachSessionStatus> {
    const sessionStatus = await this.status(options);
    if (sessionStatus.authenticated) {
      return sessionStatus;
    }

    throw new BloomreachBuddyError(
      'AUTH_REQUIRED',
      `Browser session is not authenticated: ${sessionStatus.reason}`,
    );
  }
}
