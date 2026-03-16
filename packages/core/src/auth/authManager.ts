import { join } from 'node:path';
import { homedir } from 'node:os';
import { BloomreachApiAuth } from './apiAuth.js';
import type { ApiAuthStatus } from './apiAuth.js';
import { BloomreachAuthService } from '../bloomreachAuth.js';
import type {
  BloomreachSessionStatus,
  BloomreachSessionOptions,
  BloomreachOpenLoginOptions,
  BloomreachOpenLoginResult,
  BloomreachAuthConfig,
} from '../bloomreachAuth.js';
import { BloomreachWebappApiClient } from './webappApiClient.js';
import { BloomreachProfileManager } from '../bloomreachProfileManager.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

export interface AuthManagerConfig {
  /** Directory for browser profiles (default: ~/.bloomreach-buddy/profiles) */
  profilesDir?: string;
  /** Default browser profile name (default: 'default') */
  profileName?: string;
  /** Explicit API credentials (overrides env vars) */
  apiConfig?: Partial<BloomreachApiConfig>;
}

export interface UnifiedAuthStatus {
  api: ApiAuthStatus;
  browser: BloomreachSessionStatus;
  webappApiReady: boolean;
  checkedAt: string;
}

/**
 * Unified auth coordinator for API credentials, browser sessions, and webapp API cookies.
 */
export class BloomreachAuthManager {
  /** Tier 1: Official API credentials */
  readonly apiAuth: BloomreachApiAuth;

  /** Tier 2/3: Browser session auth */
  readonly authService: BloomreachAuthService;

  /** Tier 2: Webapp internal API client (uses session cookies) */
  readonly webappClient: BloomreachWebappApiClient;

  private readonly defaultProfileName: string;

  constructor(config: AuthManagerConfig = {}) {
    const profilesDir = config.profilesDir
      ?? process.env.BLOOMREACH_PROFILE_DIR
      ?? join(homedir(), '.bloomreach-buddy', 'profiles');
    const profileName = config.profileName ?? 'default';

    this.defaultProfileName = profileName;

    this.apiAuth = new BloomreachApiAuth(config.apiConfig);

    const profileManager = new BloomreachProfileManager({ profilesDir });
    const authConfig: BloomreachAuthConfig = { profilesDir };
    this.authService = new BloomreachAuthService(profileManager, authConfig);

    this.webappClient = new BloomreachWebappApiClient({ profilesDir, profileName });
  }

  /** Unified status across all 3 auth tiers. */
  async status(options?: BloomreachSessionOptions): Promise<UnifiedAuthStatus> {
    const profileOpts = { profileName: options?.profileName ?? this.defaultProfileName };

    const [apiStatus, browserStatus, webappReady] = await Promise.all([
      Promise.resolve(this.apiAuth.status()),
      this.authService.status(profileOpts),
      this.webappClient.isReady(),
    ]);

    return {
      api: apiStatus,
      browser: browserStatus,
      webappApiReady: webappReady,
      checkedAt: new Date().toISOString(),
    };
  }

  /** Open browser for interactive login. */
  async login(options?: BloomreachOpenLoginOptions): Promise<BloomreachOpenLoginResult> {
    return this.authService.openLogin({
      profileName: options?.profileName ?? this.defaultProfileName,
      ...options,
    });
  }

  /** Clear browser session. */
  async logout(options?: BloomreachSessionOptions): Promise<{ cleared: boolean; profileName: string }> {
    return this.authService.logout({
      profileName: options?.profileName ?? this.defaultProfileName,
    });
  }

  /** Verify API credentials against live endpoint. */
  async verifyApi(): Promise<ApiAuthStatus> {
    return this.apiAuth.verify();
  }
}

/** Factory: creates an AuthManager with default wiring. */
export function createAuthManager(config?: Partial<AuthManagerConfig>): BloomreachAuthManager {
  return new BloomreachAuthManager(config);
}
