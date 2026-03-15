// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

export interface BloomreachApiConfig {
  projectToken: string;
  apiKeyId: string;
  apiSecret: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.exponea.com';

// ---------------------------------------------------------------------------
// Error hierarchy
// ---------------------------------------------------------------------------

export type BloomreachErrorCode =
  | 'CONFIG_MISSING'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'NETWORK_ERROR';

/**
 * Base error class for all Bloomreach Buddy errors.
 * Every error carries a machine-readable `code` for programmatic handling.
 */
export class BloomreachBuddyError extends Error {
  readonly code: BloomreachErrorCode;

  constructor(code: BloomreachErrorCode, message: string) {
    super(message);
    this.name = 'BloomreachBuddyError';
    this.code = code;
  }
}

/**
 * Thrown on non-2xx API responses. Carries the HTTP status code and the
 * parsed (or raw) response body for inspection.
 */
export class BloomreachApiError extends BloomreachBuddyError {
  readonly statusCode: number;
  readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody: unknown) {
    super('API_ERROR', message);
    this.name = 'BloomreachApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

/**
 * Resolve API config from explicit values merged with environment variables.
 * Explicit values take precedence. Required: projectToken, apiKeyId, apiSecret.
 */
export function resolveApiConfig(
  explicit?: Partial<BloomreachApiConfig>,
): BloomreachApiConfig {
  const projectToken =
    explicit?.projectToken ?? process.env.BLOOMREACH_PROJECT_TOKEN ?? '';
  const apiKeyId =
    explicit?.apiKeyId ?? process.env.BLOOMREACH_API_KEY_ID ?? '';
  const apiSecret =
    explicit?.apiSecret ?? process.env.BLOOMREACH_API_SECRET ?? '';
  const baseUrl =
    explicit?.baseUrl ??
    process.env.BLOOMREACH_API_BASE_URL ??
    DEFAULT_BASE_URL;

  if (projectToken.trim().length === 0) {
    throw new BloomreachBuddyError(
      'CONFIG_MISSING',
      'Bloomreach project token is required. Set BLOOMREACH_PROJECT_TOKEN or pass --project-token.',
    );
  }
  if (apiKeyId.trim().length === 0) {
    throw new BloomreachBuddyError(
      'CONFIG_MISSING',
      'Bloomreach API key ID is required. Set BLOOMREACH_API_KEY_ID or pass --api-key-id.',
    );
  }
  if (apiSecret.trim().length === 0) {
    throw new BloomreachBuddyError(
      'CONFIG_MISSING',
      'Bloomreach API secret is required. Set BLOOMREACH_API_SECRET or pass --api-secret.',
    );
  }

  return {
    projectToken: projectToken.trim(),
    apiKeyId: apiKeyId.trim(),
    apiSecret: apiSecret.trim(),
    baseUrl: baseUrl.replace(/\/+$/, ''),
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function buildAuthHeader(config: BloomreachApiConfig): string {
  const credentials = `${config.apiKeyId}:${config.apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// ---------------------------------------------------------------------------
// Retry & rate-limit helpers
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Maximum number of retry attempts (default 3). */
  maxRetries?: number;
  /** Initial delay in ms before the first retry (default 500). */
  baseDelayMs?: number;
  /** Upper bound for computed delay in ms (default 30 000). */
  maxDelayMs?: number;
  /** HTTP status codes eligible for retry (default [429, 500, 502, 503, 504]). */
  retryableStatuses?: number[];
}

export interface RateLimitInfo {
  /** Parsed delay from Retry-After header, in milliseconds.  `null` when absent. */
  retryAfterMs: number | null;
}

const DEFAULT_RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

/**
 * Internal utilities exposed via an object so tests can spy on them.
 * Object-property access is interceptable by `vi.spyOn` in ESM.
 * @internal
 */
export const _internal = {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

/**
 * Parse the `Retry-After` response header.
 * Supports both delta-seconds ("120") and HTTP-date ("Wed, 21 Oct 2025 07:28:00 GMT").
 * Returns milliseconds to wait, or `null` if the header is absent/unparseable.
 * @internal
 */
export function parseRetryAfter(headers: Headers): number | null {
  const value = headers.get('retry-after');
  if (value === null) return null;

  // Try as integer seconds first
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  // Try as HTTP-date
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const delta = date - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

/**
 * Compute the delay for the next retry attempt using exponential backoff
 * with ±20 % jitter, capped at `maxDelayMs`. If a `Retry-After` value is
 * available it takes precedence.
 * @internal
 */
export function computeRetryDelay(
  attempt: number,
  options: Required<RetryOptions>,
  retryAfterMs: number | null,
): number {
  if (retryAfterMs !== null && retryAfterMs > 0) {
    return Math.min(retryAfterMs, options.maxDelayMs);
  }

  const exponential = options.baseDelayMs * 2 ** attempt;
  const jitter = 0.8 + Math.random() * 0.4; // ±20 %
  return Math.min(exponential * jitter, options.maxDelayMs);
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export interface ApiRequestLog {
  type: 'request';
  method: string;
  url: string;
  timestamp: number;
}

export interface ApiResponseLog {
  type: 'response';
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
  /** Present when the request is a retry attempt (1-indexed). */
  attempt?: number;
}

export type ApiLogEvent = ApiRequestLog | ApiResponseLog;

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

export interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds. */
  ttlMs: number;
  /** Optional external store. Falls back to module-level default. */
  store?: Map<string, CacheEntry>;
}

const defaultCacheStore = new Map<string, CacheEntry>();

/** Create a fresh, isolated cache store. */
export function createApiCache(): Map<string, CacheEntry> {
  return new Map();
}

/** Remove all entries from the given cache (or the module-level default). */
export function clearApiCache(
  cache: Map<string, CacheEntry> = defaultCacheStore,
): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Fetch options (extended)
// ---------------------------------------------------------------------------

export interface BloomreachFetchOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  /** Opt-in retry with exponential backoff.  Omit to disable retries. */
  retry?: RetryOptions;
  /** Opt-in structured request/response logging.  Omit to disable. */
  logger?: (event: ApiLogEvent) => void;
  /** Opt-in TTL-based caching for GET requests.  Omit to disable. */
  cache?: CacheOptions;
}

// ---------------------------------------------------------------------------
// Core fetch implementation
// ---------------------------------------------------------------------------

/**
 * Make an authenticated request to the Bloomreach REST API.
 *
 * Features (all opt-in via {@link BloomreachFetchOptions}):
 * - Retry with exponential back-off and `Retry-After` awareness
 * - Structured request/response logging
 * - TTL-based response caching (GET only)
 *
 * @throws {BloomreachApiError} On non-2xx responses (after retries are exhausted).
 * @throws {BloomreachBuddyError} On timeout (`code: 'TIMEOUT'`) or network failure (`code: 'NETWORK_ERROR'`).
 */
export async function bloomreachApiFetch(
  config: BloomreachApiConfig,
  path: string,
  options: BloomreachFetchOptions = {},
): Promise<unknown> {
  const {
    method = 'POST',
    body,
    timeoutMs = 30_000,
    retry,
    logger,
    cache,
  } = options;
  const url = `${config.baseUrl}${path}`;

  // ---- Cache check (GET only) ----
  if (cache && method === 'GET') {
    const store = cache.store ?? defaultCacheStore;
    const cacheKey = `GET::${url}`;
    const cached = store.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // ---- Retry setup ----
  const maxRetries = retry?.maxRetries ?? 0;
  const retryOpts: Required<RetryOptions> = {
    maxRetries,
    baseDelayMs: retry?.baseDelayMs ?? 500,
    maxDelayMs: retry?.maxDelayMs ?? 30_000,
    retryableStatuses: retry?.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES,
  };

  let lastError: BloomreachApiError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // ---- Log request ----
    if (logger && attempt === 0) {
      logger({ type: 'request', method, url, timestamp: Date.now() });
    }

    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: buildAuthHeader(config),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const durationMs = performance.now() - start;

      // ---- Log response ----
      if (logger) {
        const logEntry: ApiResponseLog = {
          type: 'response',
          method,
          url,
          statusCode: response.status,
          durationMs,
          timestamp: Date.now(),
        };
        if (attempt > 0) logEntry.attempt = attempt;
        logger(logEntry);
      }

      // ---- Parse body ----
      const text = await response.text();
      let parsed: unknown;
      if (text.length === 0) {
        parsed = undefined;
      } else {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      // ---- Handle errors ----
      if (!response.ok) {
        const apiError = new BloomreachApiError(
          `Bloomreach API error ${response.status}: ${response.statusText}`,
          response.status,
          parsed,
        );

        // Should we retry?
        if (
          attempt < maxRetries &&
          retryOpts.retryableStatuses.includes(response.status)
        ) {
          lastError = apiError;
          const retryAfterMs = parseRetryAfter(response.headers);
          const delay = computeRetryDelay(attempt, retryOpts, retryAfterMs);
          await _internal.sleep(delay);
          continue;
        }

        throw apiError;
      }

      // ---- Cache store (GET only) ----
      if (cache && method === 'GET') {
        const store = cache.store ?? defaultCacheStore;
        const cacheKey = `GET::${url}`;
        store.set(cacheKey, {
          data: parsed,
          expiresAt: Date.now() + cache.ttlMs,
        });
      }

      return parsed;
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof BloomreachApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new BloomreachBuddyError(
          'TIMEOUT',
          `Bloomreach API request timed out after ${timeoutMs}ms: ${method} ${path}`,
        );
      }

      throw new BloomreachBuddyError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /* istanbul ignore next — should be unreachable when maxRetries >= 0 */
  if (lastError) throw lastError;
  throw new BloomreachBuddyError('NETWORK_ERROR', 'Unexpected retry loop exit');
}

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

export function buildTrackingPath(
  config: BloomreachApiConfig,
  suffix: string,
): string {
  return `/track/v2/projects/${encodeURIComponent(config.projectToken)}${suffix}`;
}

export function buildDataPath(
  config: BloomreachApiConfig,
  suffix: string,
): string {
  return `/data/v2/projects/${encodeURIComponent(config.projectToken)}${suffix}`;
}

export function buildEmailPath(
  config: BloomreachApiConfig,
  suffix: string,
): string {
  return `/email/v2/projects/${encodeURIComponent(config.projectToken)}${suffix}`;
}

export function buildSmsPath(
  config: BloomreachApiConfig,
  suffix: string,
): string {
  return `/sms/v1/projects/${encodeURIComponent(config.projectToken)}${suffix}`;
}

export function buildWebxpPath(suffix: string): string {
  return `/webxp${suffix}`;
}
