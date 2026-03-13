export interface BloomreachApiConfig {
  projectToken: string;
  apiKeyId: string;
  apiSecret: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.exponea.com';

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
    throw new Error(
      'Bloomreach project token is required. Set BLOOMREACH_PROJECT_TOKEN or pass --project-token.',
    );
  }
  if (apiKeyId.trim().length === 0) {
    throw new Error(
      'Bloomreach API key ID is required. Set BLOOMREACH_API_KEY_ID or pass --api-key-id.',
    );
  }
  if (apiSecret.trim().length === 0) {
    throw new Error(
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

export function buildAuthHeader(config: BloomreachApiConfig): string {
  const credentials = `${config.apiKeyId}:${config.apiSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export class BloomreachApiError extends Error {
  readonly statusCode: number;
  readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody: unknown) {
    super(message);
    this.name = 'BloomreachApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export interface BloomreachFetchOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Make an authenticated request to the Bloomreach REST API.
 * @throws {BloomreachApiError} On non-2xx responses.
 */
export async function bloomreachApiFetch(
  config: BloomreachApiConfig,
  path: string,
  options: BloomreachFetchOptions = {},
): Promise<unknown> {
  const { method = 'POST', body, timeoutMs = 30_000 } = options;
  const url = `${config.baseUrl}${path}`;

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

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      throw new BloomreachApiError(
        `Bloomreach API error ${response.status}: ${response.statusText}`,
        response.status,
        parsed,
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof BloomreachApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `Bloomreach API request timed out after ${timeoutMs}ms: ${method} ${path}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

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
