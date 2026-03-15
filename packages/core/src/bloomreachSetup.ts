import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BloomreachBuddyError } from './errors.js';
import { exec } from 'node:child_process';
import { join } from 'node:path';

import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import {
  bloomreachApiFetch,
  buildTrackingPath,
  BloomreachApiError,
} from './bloomreachApiClient.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input for credential validation. */
export interface ValidateCredentialsInput {
  projectToken: string;
  apiKeyId: string;
  apiSecret: string;
  baseUrl?: string;
}

/** Possible error categories from credential validation. */
export type ValidateCredentialsError =
  | 'invalid_credentials'
  | 'invalid_project'
  | 'network_error'
  | 'timeout'
  | 'unknown';

/** Result of a credential validation attempt. */
export interface ValidateCredentialsResult {
  valid: boolean;
  /** Server time (epoch seconds) returned by Bloomreach on success. */
  serverTime?: number;
  /** Machine-readable error category on failure. */
  error?: ValidateCredentialsError;
  /** Human-readable error message on failure. */
  message?: string;
}

/** Options for writing a `.env` file. */
export interface WriteEnvFileOptions {
  /** Directory to write `.env` to. Defaults to `process.cwd()`. */
  directory?: string;
  /**
   * When `true` (default), only `BLOOMREACH_*` keys are updated in an
   * existing `.env` file — all other lines are preserved.  When `false`,
   * the file is overwritten entirely.
   */
  merge?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.exponea.com';

/** URL to the Bloomreach API settings page. */
export const BLOOMREACH_API_SETTINGS_URL = 'https://app.bloomreach.com/';

/** Keys written to the `.env` file. */
const ENV_KEYS = [
  'BLOOMREACH_PROJECT_TOKEN',
  'BLOOMREACH_API_KEY_ID',
  'BLOOMREACH_API_SECRET',
  'BLOOMREACH_API_BASE_URL',
] as const;

// ---------------------------------------------------------------------------
// Credential validation
// ---------------------------------------------------------------------------

/**
 * Validate Bloomreach API credentials by calling the lightweight
 * `/system/time` tracking endpoint.
 *
 * - **2xx with `success: true`** — credentials valid
 * - **401 / 403** — invalid API key or secret
 * - **404** — invalid project token
 * - Network / timeout errors are mapped to their respective categories.
 */
export async function validateCredentials(
  input: ValidateCredentialsInput,
): Promise<ValidateCredentialsResult> {
  const config: BloomreachApiConfig = {
    projectToken: input.projectToken.trim(),
    apiKeyId: input.apiKeyId.trim(),
    apiSecret: input.apiSecret.trim(),
    baseUrl: (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
  };

  try {
    const path = buildTrackingPath(config, '/system/time');
    const response = await bloomreachApiFetch(config, path, { method: 'GET' });

    const body = response as Record<string, unknown> | undefined;
    if (body && body['success'] === true) {
      return {
        valid: true,
        serverTime: typeof body['time'] === 'number' ? body['time'] : undefined,
      };
    }

    // Non-success body from a 2xx response — treat as invalid credentials.
    const errorMsg =
      typeof body?.['error'] === 'string'
        ? body['error']
        : 'Unexpected response from Bloomreach API';
    return { valid: false, error: 'invalid_credentials', message: errorMsg };
  } catch (err: unknown) {
    if (err instanceof BloomreachApiError) {
      if (err.statusCode === 401 || err.statusCode === 403) {
        return {
          valid: false,
          error: 'invalid_credentials',
          message: 'API key ID or secret is incorrect.',
        };
      }
      if (err.statusCode === 400) {
        return {
          valid: false,
          error: 'invalid_project',
          message: 'Bad request. The project token may be malformed or invalid.',
        };
      }
      if (err.statusCode === 404) {
        return {
          valid: false,
          error: 'invalid_project',
          message: 'Project token not found. Verify the token in Bloomreach settings.',
        };
      }
      return {
        valid: false,
        error: 'unknown',
        message: `API error ${err.statusCode}: ${err.message}`,
      };
    }

    if (err instanceof BloomreachBuddyError) {
      if (err.code === 'TIMEOUT') {
        return {
          valid: false,
          error: 'timeout',
          message: 'Request timed out. Check your network and base URL.',
        };
      }
      if (err.code === 'NETWORK_ERROR') {
        return {
          valid: false,
          error: 'network_error',
          message: `Network error: ${err.message}`,
        };
      }
    }

    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: 'unknown', message };
  }
}

// ---------------------------------------------------------------------------
// .env file writing
// ---------------------------------------------------------------------------

/**
 * Build the key=value lines for a `.env` file.
 * Only includes `BLOOMREACH_API_BASE_URL` when it differs from the default.
 */
function buildEnvLines(credentials: ValidateCredentialsInput): string[] {
  const lines: string[] = [
    '# Bloomreach Buddy — API credentials',
    `BLOOMREACH_PROJECT_TOKEN=${credentials.projectToken.trim()}`,
    `BLOOMREACH_API_KEY_ID=${credentials.apiKeyId.trim()}`,
    `BLOOMREACH_API_SECRET=${credentials.apiSecret.trim()}`,
  ];

  const baseUrl = credentials.baseUrl?.trim();
  if (baseUrl && baseUrl !== DEFAULT_BASE_URL) {
    lines.push(`BLOOMREACH_API_BASE_URL=${baseUrl}`);
  }

  return lines;
}

/**
 * Write Bloomreach credentials to a `.env` file.
 *
 * When `merge` is `true` (default), only `BLOOMREACH_*` keys are
 * inserted or updated — all other lines in an existing `.env` are
 * preserved.  When `false`, the file is overwritten entirely.
 *
 * @returns The absolute path of the written `.env` file.
 */
export function writeEnvFile(
  credentials: ValidateCredentialsInput,
  options?: WriteEnvFileOptions,
): string {
  const directory = options?.directory ?? process.cwd();
  const merge = options?.merge ?? true;
  const envPath = join(directory, '.env');
  const newLines = buildEnvLines(credentials);

  if (merge && existsSync(envPath)) {
    const existing = readFileSync(envPath, 'utf-8');
    const envKeySet = new Set<string>(ENV_KEYS as unknown as string[]);
    const preserved = existing
      .split('\n')
      .filter((line) => {
        const key = line.split('=')[0]?.trim();
        return !envKeySet.has(key);
      });

    // Remove trailing blank lines before appending.
    while (preserved.length > 0 && preserved[preserved.length - 1]?.trim() === '') {
      preserved.pop();
    }

    const merged = preserved.length > 0
      ? [...preserved, '', ...newLines, '']
      : [...newLines, ''];

    writeFileSync(envPath, merged.join('\n'), 'utf-8');
  } else {
    writeFileSync(envPath, [...newLines, ''].join('\n'), 'utf-8');
  }

  return envPath;
}

// ---------------------------------------------------------------------------
// Browser opening
// ---------------------------------------------------------------------------

/**
 * Attempt to open a URL in the user's default browser.
 * Best-effort — errors are silently ignored.
 */
export function openBrowserUrl(url: string): void {
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, () => {
    // Silently ignore errors — browser opening is best-effort.
  });
}
