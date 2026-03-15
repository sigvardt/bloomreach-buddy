import { describe, it, expect, vi, afterEach } from 'vitest';
import { BloomreachClient } from '../index.js';

vi.mock('../bloomreachSetup.js', () => ({
  validateCredentials: vi.fn(),
}));

import { validateCredentials } from '../bloomreachSetup.js';

const mockedValidateCredentials = vi.mocked(validateCredentials);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BloomreachClient', () => {
  it('should instantiate with config', () => {
    const client = new BloomreachClient({
      environment: 'test-env',
      apiToken: 'test-token',
    });

    expect(client).toBeInstanceOf(BloomreachClient);
    expect(client.config.environment).toBe('test-env');
    expect(client.config.apiToken).toBe('test-token');
  });

  describe('status()', () => {
    it('returns apiConfigured:false and error when no apiConfig provided', async () => {
      const client = new BloomreachClient({
        environment: 'test-env',
        apiToken: 'test-token',
      });

      const result = await client.status();

      expect(result.connected).toBe(false);
      expect(result.environment).toBe('test-env');
      expect(result.apiConfigured).toBe(false);
      expect(result.error).toContain('API credentials not configured');
      expect(result.project).toBeUndefined();
      expect(result.apiBaseUrl).toBeUndefined();
    });

    it('returns connected:true when validateCredentials succeeds', async () => {
      mockedValidateCredentials.mockResolvedValue({
        valid: true,
        serverTime: 1234567890,
      });

      const client = new BloomreachClient({
        environment: 'production',
        apiToken: 'test-token',
        apiConfig: {
          projectToken: 'my-project-token',
          apiKeyId: 'key-id',
          apiSecret: 'secret',
          baseUrl: 'https://api.exponea.com',
        },
      });

      const result = await client.status();

      expect(result.connected).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.apiConfigured).toBe(true);
      expect(result.project).toBe('my-project-token');
      expect(result.apiBaseUrl).toBe('https://api.exponea.com');
      expect(result.error).toBeUndefined();

      expect(mockedValidateCredentials).toHaveBeenCalledWith({
        projectToken: 'my-project-token',
        apiKeyId: 'key-id',
        apiSecret: 'secret',
        baseUrl: 'https://api.exponea.com',
      });
    });

    it('returns connected:false with error when validateCredentials reports invalid', async () => {
      mockedValidateCredentials.mockResolvedValue({
        valid: false,
        error: 'invalid_credentials',
        message: 'API key ID or secret is incorrect.',
      });

      const client = new BloomreachClient({
        environment: 'test-env',
        apiToken: 'test-token',
        apiConfig: {
          projectToken: 'bad-token',
          apiKeyId: 'wrong-key',
          apiSecret: 'wrong-secret',
          baseUrl: 'https://api.exponea.com',
        },
      });

      const result = await client.status();

      expect(result.connected).toBe(false);
      expect(result.apiConfigured).toBe(true);
      expect(result.error).toBe('API key ID or secret is incorrect.');
      expect(result.apiBaseUrl).toBe('https://api.exponea.com');
    });

    it('returns connected:false with error when validateCredentials throws', async () => {
      mockedValidateCredentials.mockRejectedValue(new Error('Network failure'));

      const client = new BloomreachClient({
        environment: 'test-env',
        apiToken: 'test-token',
        apiConfig: {
          projectToken: 'token',
          apiKeyId: 'key',
          apiSecret: 'secret',
          baseUrl: 'https://api.exponea.com',
        },
      });

      const result = await client.status();

      expect(result.connected).toBe(false);
      expect(result.apiConfigured).toBe(true);
      expect(result.error).toBe('Network failure');
    });

    it('returns connected:false with fallback message when validateCredentials returns invalid with no message', async () => {
      mockedValidateCredentials.mockResolvedValue({
        valid: false,
      });

      const client = new BloomreachClient({
        environment: 'test-env',
        apiToken: 'test-token',
        apiConfig: {
          projectToken: 'token',
          apiKeyId: 'key',
          apiSecret: 'secret',
          baseUrl: 'https://api.exponea.com',
        },
      });

      const result = await client.status();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection verification failed');
    });
  });
});
