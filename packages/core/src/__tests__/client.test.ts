import { describe, it, expect } from 'vitest';
import { BloomreachClient } from '../index.js';

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

  it('should return status', async () => {
    const client = new BloomreachClient({
      environment: 'test-env',
      apiToken: 'test-token',
    });

    const result = await client.status();

    expect(result).toEqual({
      connected: false,
      environment: 'test-env',
    });
  });
});
