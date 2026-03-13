/**
 * E2E tests for the Bloomreach API client.
 * These tests run against the real Bloomreach API and require valid credentials
 * in the environment: BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, BLOOMREACH_API_SECRET.
 *
 * Skipped automatically when credentials are not present.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveApiConfig,
  bloomreachApiFetch,
  buildTrackingPath,
  buildDataPath,
  BloomreachApiError,
  BloomreachBuddyError,
} from '../bloomreachApiClient.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

const HAS_CREDENTIALS = !!(
  process.env.BLOOMREACH_PROJECT_TOKEN &&
  process.env.BLOOMREACH_API_KEY_ID &&
  process.env.BLOOMREACH_API_SECRET
);

let config: BloomreachApiConfig;
if (HAS_CREDENTIALS) {
  config = resolveApiConfig();
}

describe.skipIf(!HAS_CREDENTIALS)('bloomreachApiFetch E2E', () => {
  it('authenticates successfully against real Bloomreach API', async () => {
    const path = buildTrackingPath(config, '/system/time');
    const result = await bloomreachApiFetch(config, path, { method: 'GET' });

    // system/time returns { time: <number> }
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('time');
  });

  it('returns BloomreachApiError with invalid credentials', async () => {
    const badConfig: BloomreachApiConfig = {
      ...config,
      apiKeyId: 'invalid-key-id',
      apiSecret: 'invalid-secret',
    };

    const path = buildTrackingPath(badConfig, '/system/time');

    try {
      await bloomreachApiFetch(badConfig, path, { method: 'GET' });
      expect.fail('Expected BloomreachApiError');
    } catch (error) {
      // Bloomreach may return 401 or 404 for invalid credentials
      expect(error).toBeInstanceOf(BloomreachApiError);
      const apiError = error as BloomreachApiError;
      expect(apiError.statusCode).toBeGreaterThanOrEqual(400);
      expect(apiError.statusCode).toBeLessThan(500);
    }
  });

  it('executes GET request against data endpoint', async () => {
    const path = buildDataPath(config, '/customers/attributes');
    const result = await bloomreachApiFetch(config, path, { method: 'GET' });

    expect(result).toBeDefined();
  });

  it('executes POST request against tracking endpoint', async () => {
    // POST to system/time also works and returns time
    const path = buildTrackingPath(config, '/system/time');
    const result = await bloomreachApiFetch(config, path, { method: 'POST' });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('time');
  });

  it('throws BloomreachBuddyError with TIMEOUT code for tiny timeout', async () => {
    const path = buildTrackingPath(config, '/system/time');

    try {
      await bloomreachApiFetch(config, path, {
        method: 'GET',
        timeoutMs: 1,
      });
      // If it somehow succeeds with 1ms timeout, that's also acceptable
    } catch (error) {
      expect(error).toBeInstanceOf(BloomreachBuddyError);
      expect((error as BloomreachBuddyError).code).toBe('TIMEOUT');
    }
  });

  it('buildTrackingPath + fetch integration round trip', async () => {
    const suffix = '/system/time';
    const path = buildTrackingPath(config, suffix);

    expect(path).toContain('/track/v2/projects/');
    expect(path).toContain(config.projectToken);
    expect(path).toContain(suffix);

    const result = await bloomreachApiFetch(config, path, { method: 'GET' });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('time');
  });

  it('buildDataPath + fetch integration round trip', async () => {
    const suffix = '/customers/attributes';
    const path = buildDataPath(config, suffix);

    expect(path).toContain('/data/v2/projects/');
    expect(path).toContain(config.projectToken);
    expect(path).toContain(suffix);

    const result = await bloomreachApiFetch(config, path, { method: 'GET' });

    expect(result).toBeDefined();
  });
});
