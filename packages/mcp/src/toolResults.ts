import { BloomreachBuddyError } from '@bloomreach-buddy/core';
import type { ToolArgs } from './toolArgs.js';

export type ToolResult = { content: Array<{ type: 'text'; text: string }> };

export type ToolErrorResult = {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
};

export type ToolHandler = (args: ToolArgs) => Promise<ToolResult>;

function isBloomreachError(error: unknown): error is BloomreachBuddyError {
  return error instanceof BloomreachBuddyError;
}

export function toToolResult(payload: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function buildRecoveryHint(error: unknown): string {
  if (!isBloomreachError(error)) {
    return 'An unexpected error occurred. Verify Bloomreach credentials and retry.';
  }

  switch (error.code) {
    case 'CONFIG_MISSING':
      return 'Missing API credentials. Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET, then retry.';
    case 'TIMEOUT':
      return 'The request timed out. Retry shortly and reduce query scope if possible.';
    case 'RATE_LIMITED':
      return 'Bloomreach rate limit reached. Wait for the rate-limit window to reset before retrying.';
    case 'API_ERROR':
      return 'Bloomreach API returned an error response. Check input parameters and project permissions, then retry.';
    case 'ACTION_PRECONDITION_FAILED':
      return 'Action precondition not met. The confirm token may be expired, already used, or invalid. Prepare a new action and retry.';
    case 'TARGET_NOT_FOUND':
      return 'The requested resource was not found. Verify the identifier and retry.';
    case 'NETWORK_ERROR':
      return 'A network error occurred. Verify connectivity to Bloomreach API endpoints and retry.';
    case 'AUTH_REQUIRED':
      return 'Browser session is not authenticated. Run "bloomreach login" to open a browser and log in manually.';
    case 'CAPTCHA_OR_CHALLENGE':
      return 'A CAPTCHA or security challenge was detected. Run "bloomreach login" in headed mode to solve it manually.';
    case 'SESSION_EXPIRED':
      return 'The stored browser session has expired. Run "bloomreach login" to re-authenticate.';
    case 'PROFILE_LOCKED':
      return 'The browser profile is locked by another process. Close other instances and retry.';
    default:
      return 'The operation failed. Check the error details and retry with corrected input.';
  }
}

export function toErrorResult(error: unknown): ToolErrorResult {
  const code = isBloomreachError(error) ? error.code : 'UNKNOWN';
  const message = error instanceof Error ? error.message : 'Unknown error occurred.';

  const errorPayload = {
    code,
    message,
    recovery_hint: buildRecoveryHint(error),
  };

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorPayload, null, 2),
      },
    ],
  };
}
