// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = [
  'CONFIG_MISSING', // Missing API credentials or configuration
  'AUTH_REQUIRED', // Dashboard session expired or missing
  'CAPTCHA_OR_CHALLENGE', // Bot detection challenge encountered
  'RATE_LIMITED', // Rate limit exceeded
  'SESSION_EXPIRED', // Stored browser session expired
  'PROFILE_LOCKED', // Browser profile locked by another process
  'UI_CHANGED_SELECTOR_FAILED', // Dashboard UI changed, selectors broken
  'NETWORK_ERROR', // Network connectivity issue
  'TIMEOUT', // Operation timed out
  'API_ERROR', // Non-2xx API response
  'TARGET_NOT_FOUND', // Requested resource not found
  'ACTION_PRECONDITION_FAILED', // Invalid input or state
  'UNKNOWN', // Unclassified error
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Backward-compatible alias for {@link ErrorCode}.
 * Prefer `ErrorCode` in new code.
 */
export type BloomreachErrorCode = ErrorCode;

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/**
 * Base error class for all Bloomreach Buddy errors.
 * Every error carries a machine-readable `code` and an optional `details`
 * bag for structured context (missing fields, UI URLs, etc.).
 */
export class BloomreachBuddyError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'BloomreachBuddyError';
    this.code = code;
    this.details = details;
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
    super('API_ERROR', message, { statusCode, responseBody });
    this.name = 'BloomreachApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ---------------------------------------------------------------------------
// Error serialization
// ---------------------------------------------------------------------------

export interface ErrorPayload {
  code: ErrorCode | 'UNKNOWN';
  message: string;
  details: Record<string, unknown>;
}

/**
 * Convert any caught value into a structured, serializable error payload.
 * Preserves full fidelity for {@link BloomreachBuddyError} instances and
 * falls back gracefully for plain `Error` or unknown values.
 */
export function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof BloomreachBuddyError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: error.message,
      details: { cause_name: error.name },
    };
  }
  return { code: 'UNKNOWN', message: String(error), details: {} };
}

// ---------------------------------------------------------------------------
// Runtime input guards
// ---------------------------------------------------------------------------

/**
 * Runtime guard — asserts that `value` is a non-null string.
 * Throws `ACTION_PRECONDITION_FAILED` when called with null, undefined, or a
 * non-string value.  Use at the top of validation helpers to protect against
 * untyped MCP tool inputs (`Record<string, unknown>`).
 */
export function requireString(value: unknown, fieldName: string): asserts value is string {
  if (value == null || typeof value !== 'string') {
    throw new BloomreachBuddyError(
      'ACTION_PRECONDITION_FAILED',
      `${fieldName} is required and must be a string.`,
    );
  }
}

/**
 * Runtime guard — asserts that `value` is a non-null array.
 * Throws `ACTION_PRECONDITION_FAILED` when called with null, undefined, or a
 * non-array value.
 */
export function requireArray(value: unknown, fieldName: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new BloomreachBuddyError(
      'ACTION_PRECONDITION_FAILED',
      `${fieldName} is required and must be an array.`,
    );
  }
}

/**
 * Runtime guard — asserts that `value` is a non-null, non-array object.
 * Throws `ACTION_PRECONDITION_FAILED` when called with null, undefined, or a
 * non-object value.
 */
export function requireObject(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BloomreachBuddyError(
      'ACTION_PRECONDITION_FAILED',
      `${fieldName} is required and must be an object.`,
    );
  }
}
