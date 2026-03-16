import { resolveApiConfig } from '../bloomreachApiClient.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import { validateCredentials } from '../bloomreachSetup.js';
import type { ValidateCredentialsResult } from '../bloomreachSetup.js';
import { BloomreachBuddyError } from '../errors.js';

/** Status information for configured Bloomreach API credentials. */
export interface ApiAuthStatus {
  configured: boolean;
  verified: boolean;
  projectToken?: string;
  apiKeyId?: string;
  baseUrl?: string;
  serverTime?: number;
  error?: string;
  errorCategory?: string;
  checkedAt: string;
}

/**
 * Mask a secret string for display while preserving a short prefix.
 *
 * @param value Secret value to mask.
 * @param showChars Number of visible prefix characters.
 * @returns The masked or original value.
 */
export function maskSecret(value: string, showChars: number = 8): string {
  return value.length > showChars ? `${value.slice(0, showChars)}...` : value;
}

/** Bloomreach API credential manager for status and verification. */
export class BloomreachApiAuth {
  private config: BloomreachApiConfig | null;

  /**
   * Create a credential manager from explicit values and/or environment.
   *
   * Missing credentials are treated as unconfigured state.
   */
  constructor(explicit?: Partial<BloomreachApiConfig>) {
    try {
      this.config = resolveApiConfig(explicit);
    } catch {
      this.config = null;
    }
  }

  /** Check if API credentials are configured (no network call). */
  status(): ApiAuthStatus {
    return {
      configured: this.config !== null,
      verified: false,
      projectToken: this.config ? maskSecret(this.config.projectToken) : undefined,
      apiKeyId: this.config ? maskSecret(this.config.apiKeyId) : undefined,
      baseUrl: this.config?.baseUrl,
      checkedAt: new Date().toISOString(),
    };
  }

  /** Verify credentials against the Bloomreach API endpoint. */
  async verify(): Promise<ApiAuthStatus> {
    if (this.config === null) {
      return this.status();
    }

    const result: ValidateCredentialsResult = await validateCredentials(this.config);

    return {
      configured: true,
      verified: result.valid,
      projectToken: maskSecret(this.config.projectToken),
      apiKeyId: maskSecret(this.config.apiKeyId),
      baseUrl: this.config.baseUrl,
      serverTime: result.serverTime,
      error: result.message,
      errorCategory: result.error,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the resolved API configuration.
   *
   * @throws {BloomreachBuddyError} When credentials are not configured.
   */
  getConfig(): BloomreachApiConfig {
    if (this.config === null) {
      throw new BloomreachBuddyError(
        'CONFIG_MISSING',
        'Bloomreach API credentials are not configured.',
      );
    }

    return this.config;
  }

  /** Returns true when API credentials are present. */
  isConfigured(): boolean {
    return this.config !== null;
  }
}
