import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BloomreachBuddyError } from '../../errors.js';
import { BloomreachApiAuth, maskSecret } from '../../auth/apiAuth.js';
import type { BloomreachApiConfig } from '../../bloomreachApiClient.js';
import type { ValidateCredentialsResult } from '../../bloomreachSetup.js';

vi.mock('../../bloomreachApiClient.js', () => ({
  resolveApiConfig: vi.fn(),
}));

vi.mock('../../bloomreachSetup.js', () => ({
  validateCredentials: vi.fn(),
}));

import { resolveApiConfig } from '../../bloomreachApiClient.js';
import { validateCredentials } from '../../bloomreachSetup.js';

const CONFIG: BloomreachApiConfig = {
  projectToken: 'projecttoken-12345',
  apiKeyId: 'apikeyid-67890',
  apiSecret: 'secret-00000',
  baseUrl: 'https://api.exponea.com',
};

describe('maskSecret', () => {
  it('masks long values with default visible length', () => {
    expect(maskSecret('abcdefghijklmnop')).toBe('abcdefgh...');
  });

  it('returns short values unchanged', () => {
    expect(maskSecret('short')).toBe('short');
  });

  it('supports custom visible length', () => {
    expect(maskSecret('abcdef', 3)).toBe('abc...');
  });
});

describe('BloomreachApiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('constructor stores resolved config when credentials are present', () => {
    vi.mocked(resolveApiConfig).mockReturnValue(CONFIG);

    const auth = new BloomreachApiAuth();

    expect(resolveApiConfig).toHaveBeenCalledWith(undefined);
    expect(auth.isConfigured()).toBe(true);
    expect(auth.getConfig()).toEqual(CONFIG);
  });

  it('constructor treats resolver errors as unconfigured state', () => {
    vi.mocked(resolveApiConfig).mockImplementation(() => {
      throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing credentials');
    });

    const auth = new BloomreachApiAuth();

    expect(auth.isConfigured()).toBe(false);
    expect(() => auth.getConfig()).toThrow(BloomreachBuddyError);
  });

  it('status returns configured details with masked secrets', () => {
    vi.mocked(resolveApiConfig).mockReturnValue(CONFIG);

    const auth = new BloomreachApiAuth();
    const result = auth.status();

    expect(result).toEqual({
      configured: true,
      verified: false,
      projectToken: 'projectt...',
      apiKeyId: 'apikeyid...',
      baseUrl: 'https://api.exponea.com',
      checkedAt: '2026-02-01T12:00:00.000Z',
    });
  });

  it('status returns unconfigured details when config is missing', () => {
    vi.mocked(resolveApiConfig).mockImplementation(() => {
      throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing credentials');
    });

    const auth = new BloomreachApiAuth();
    const result = auth.status();

    expect(result).toEqual({
      configured: false,
      verified: false,
      projectToken: undefined,
      apiKeyId: undefined,
      baseUrl: undefined,
      checkedAt: '2026-02-01T12:00:00.000Z',
    });
  });

  it('verify returns mapped success result when credentials are valid', async () => {
    const validationResult: ValidateCredentialsResult = {
      valid: true,
      serverTime: 1_700_000_000,
    };
    vi.mocked(resolveApiConfig).mockReturnValue(CONFIG);
    vi.mocked(validateCredentials).mockResolvedValue(validationResult);

    const auth = new BloomreachApiAuth();
    const result = await auth.verify();

    expect(validateCredentials).toHaveBeenCalledWith(CONFIG);
    expect(result).toEqual({
      configured: true,
      verified: true,
      projectToken: 'projectt...',
      apiKeyId: 'apikeyid...',
      baseUrl: 'https://api.exponea.com',
      serverTime: 1_700_000_000,
      error: undefined,
      errorCategory: undefined,
      checkedAt: '2026-02-01T12:00:00.000Z',
    });
  });

  it('verify returns mapped failure result when credentials are invalid', async () => {
    const validationResult: ValidateCredentialsResult = {
      valid: false,
      error: 'invalid_credentials',
      message: 'API key ID or secret is incorrect.',
    };
    vi.mocked(resolveApiConfig).mockReturnValue(CONFIG);
    vi.mocked(validateCredentials).mockResolvedValue(validationResult);

    const auth = new BloomreachApiAuth();
    const result = await auth.verify();

    expect(result.verified).toBe(false);
    expect(result.error).toBe('API key ID or secret is incorrect.');
    expect(result.errorCategory).toBe('invalid_credentials');
    expect(result.checkedAt).toBe('2026-02-01T12:00:00.000Z');
  });

  it('verify returns unconfigured status without calling validateCredentials', async () => {
    vi.mocked(resolveApiConfig).mockImplementation(() => {
      throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing credentials');
    });

    const auth = new BloomreachApiAuth();
    const result = await auth.verify();

    expect(validateCredentials).not.toHaveBeenCalled();
    expect(result.configured).toBe(false);
    expect(result.verified).toBe(false);
  });

  it('getConfig throws CONFIG_MISSING when unconfigured', () => {
    vi.mocked(resolveApiConfig).mockImplementation(() => {
      throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing credentials');
    });

    const auth = new BloomreachApiAuth();

    expect(() => auth.getConfig()).toThrow(
      expect.objectContaining({ code: 'CONFIG_MISSING' }),
    );
  });

  it('isConfigured returns false when constructor failed to resolve config', () => {
    vi.mocked(resolveApiConfig).mockImplementation(() => {
      throw new BloomreachBuddyError('CONFIG_MISSING', 'Missing credentials');
    });

    const auth = new BloomreachApiAuth();

    expect(auth.isConfigured()).toBe(false);
  });
});
