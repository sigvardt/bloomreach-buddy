import type { BloomreachCookie } from '../bloomreachSessionStore.js';
import { loadSession, isSessionExpired } from '../bloomreachSessionStore.js';
import { BloomreachBuddyError } from '../errors.js';

const DEFAULT_WEBAPP_BASE_URL = 'https://app.bloomreach.com';

export interface WebappApiClientConfig {
  profilesDir: string;
  profileName?: string;
  baseUrl?: string;
}

export interface WebappFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface WebappFetchResult {
  status: number;
  ok: boolean;
  data: unknown;
  headers: Record<string, string>;
}

export class BloomreachWebappApiClient {
  private readonly profilesDir: string;
  private readonly profileName: string;
  private readonly baseUrl: string;

  constructor(config: WebappApiClientConfig) {
    this.profilesDir = config.profilesDir;
    this.profileName = config.profileName ?? 'default';
    this.baseUrl = (config.baseUrl ?? process.env.BLOOMREACH_URL ?? DEFAULT_WEBAPP_BASE_URL).replace(/\/+$/, '');
  }

  /** Get session cookies from stored session. Returns empty array if no session. */
  async getSessionCookies(): Promise<BloomreachCookie[]> {
    const session = await loadSession(this.profilesDir, this.profileName);
    if (!session) return [];
    if (isSessionExpired(session)) return [];
    return session.storageState.cookies;
  }

  /** Build Cookie header string from stored session. Returns null if no session. */
  async getCookieHeader(): Promise<string | null> {
    const cookies = await this.getSessionCookies();
    if (cookies.length === 0) return null;
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  /** Make authenticated request to Bloomreach webapp using session cookies. */
  async fetch(path: string, options: WebappFetchOptions = {}): Promise<WebappFetchResult> {
    const cookieHeader = await this.getCookieHeader();
    if (!cookieHeader) {
      throw new BloomreachBuddyError(
        'AUTH_REQUIRED',
        'No valid browser session cookies available. Run "bloomreach login" to authenticate.',
      );
    }

    const { method = 'GET', body, headers = {}, timeoutMs = 30_000 } = options;
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Cookie: cookieHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        ok: response.ok,
        data,
        headers: responseHeaders,
      };
    } catch (error: unknown) {
      clearTimeout(timer);
      if (error instanceof BloomreachBuddyError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new BloomreachBuddyError('TIMEOUT', `Webapp API request timed out after ${timeoutMs}ms: ${method} ${path}`);
      }
      throw new BloomreachBuddyError('NETWORK_ERROR', error instanceof Error ? error.message : String(error));
    }
  }

  /** Check if stored session has valid cookies. */
  async isReady(): Promise<boolean> {
    const cookies = await this.getSessionCookies();
    return cookies.length > 0;
  }
}
