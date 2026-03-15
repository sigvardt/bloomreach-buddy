import { BloomreachBuddyError } from "@bloomreach-buddy/core";

export type ToolArgs = Record<string, unknown>;

export function readString(args: ToolArgs, key: string, fallback: string): string {
  const value = args[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export function trimOrUndefined(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function readRequiredString(args: ToolArgs, key: string): string {
  const value = args[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} is required.`);
}

export function readBoundedString(
  args: ToolArgs,
  key: string,
  maxLength = 5000,
  fallback?: string,
): string {
  const value =
    typeof fallback === 'string' ? readString(args, key, fallback) : readRequiredString(args, key);

  if (value.length > maxLength) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be ${maxLength} characters or fewer.`);
  }

  return value;
}

export function readValidatedUrl(args: ToolArgs, key: string): string {
  const value = readRequiredString(args, key);

  try {
    return new URL(value).toString();
  } catch (error) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED',
      `${key} must be a valid URL. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function readPositiveNumber(args: ToolArgs, key: string, fallback: number): number {
  const value = args[key];
  if (typeof value !== 'number') {
    return fallback;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be a positive number.`);
  }

  return value;
}

export function readNonNegativeNumber(args: ToolArgs, key: string, fallback: number): number {
  const value = args[key];
  if (typeof value !== 'number') {
    return fallback;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be zero or a positive number.`);
  }

  return value;
}

export function readBoolean(args: ToolArgs, key: string, fallback: boolean): boolean {
  const value = args[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function readRequiredBoolean(args: ToolArgs, key: string): boolean {
  const value = args[key];
  if (typeof value === 'boolean') {
    return value;
  }

  throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} is required.`);
}

export function readOptionalPositiveNumber(args: ToolArgs, key: string): number | undefined {
  if (!(key in args) || args[key] === undefined) {
    return undefined;
  }

  return readPositiveNumber(args, key, 1);
}

export function readOptionalNonNegativeNumber(args: ToolArgs, key: string): number | undefined {
  if (!(key in args) || args[key] === undefined) {
    return undefined;
  }

  const value = args[key];
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be a non-negative integer.`);
  }

  return value;
}

export function readStringArray(args: ToolArgs, key: string): string[] | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : undefined;
  }

  throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be a string or array of strings.`);
}

export function readRequiredStringArray(args: ToolArgs, key: string): string[] {
  const values = readStringArray(args, key);
  if (values && values.length > 0) {
    return values;
  }

  throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} is required.`);
}

export function readObject(args: ToolArgs, key: string): Record<string, unknown> | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${key} must be an object.`);
}
