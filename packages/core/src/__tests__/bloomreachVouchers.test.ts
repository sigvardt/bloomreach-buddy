import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CREATE_VOUCHER_POOL_ACTION_TYPE,
  ADD_VOUCHERS_ACTION_TYPE,
  DELETE_VOUCHER_POOL_ACTION_TYPE,
  VOUCHER_RATE_LIMIT_WINDOW_MS,
  VOUCHER_POOL_CREATE_RATE_LIMIT,
  VOUCHER_ADD_RATE_LIMIT,
  VOUCHER_POOL_DELETE_RATE_LIMIT,
  validatePoolName,
  validatePoolId,
  validateVoucherCodes,
  validateAutoGenerateCount,
  validateRedemptionRules,
  validateVoucherSource,
  buildVouchersUrl,
  createVoucherActionExecutors,
  BloomreachVouchersService,
} from '../index.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

const TEST_API_CONFIG: BloomreachApiConfig = {
  projectToken: 'test-token-123',
  apiKeyId: 'key-id',
  apiSecret: 'key-secret',
  baseUrl: 'https://api.test.com',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action type constants', () => {
  it('exports CREATE_VOUCHER_POOL_ACTION_TYPE', () => {
    expect(CREATE_VOUCHER_POOL_ACTION_TYPE).toBe('vouchers.create_pool');
  });

  it('exports ADD_VOUCHERS_ACTION_TYPE', () => {
    expect(ADD_VOUCHERS_ACTION_TYPE).toBe('vouchers.add_vouchers');
  });

  it('exports DELETE_VOUCHER_POOL_ACTION_TYPE', () => {
    expect(DELETE_VOUCHER_POOL_ACTION_TYPE).toBe('vouchers.delete_pool');
  });
});

describe('rate limit constants', () => {
  it('exports VOUCHER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(VOUCHER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports VOUCHER_POOL_CREATE_RATE_LIMIT', () => {
    expect(VOUCHER_POOL_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports VOUCHER_ADD_RATE_LIMIT', () => {
    expect(VOUCHER_ADD_RATE_LIMIT).toBe(50);
  });

  it('exports VOUCHER_POOL_DELETE_RATE_LIMIT', () => {
    expect(VOUCHER_POOL_DELETE_RATE_LIMIT).toBe(10);
  });
});

describe('validatePoolName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validatePoolName('  Summer Sale  ')).toBe('Summer Sale');
  });

  it('throws for empty string', () => {
    expect(() => validatePoolName('')).toThrow('Pool name must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePoolName('   ')).toThrow('Pool name must not be empty');
  });

  it('throws for name exceeding 200 characters', () => {
    expect(() => validatePoolName('x'.repeat(201))).toThrow('must not exceed 200 characters');
  });

  it('accepts name at exactly 200 characters', () => {
    expect(validatePoolName('x'.repeat(200))).toBe('x'.repeat(200));
  });

  it('returns name at exactly 1 character', () => {
    expect(validatePoolName('x')).toBe('x');
  });

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validatePoolName('\t Pool \t')).toBe('Pool');
  });

  it('handles newline-only input', () => {
    expect(() => validatePoolName('\n\n')).toThrow('Pool name must not be empty');
  });

  it('handles tab-only input', () => {
    expect(() => validatePoolName('\t\t')).toThrow('Pool name must not be empty');
  });
});

describe('validatePoolId', () => {
  it('returns trimmed ID for valid input', () => {
    expect(validatePoolId('  pool-123  ')).toBe('pool-123');
  });

  it('throws for empty string', () => {
    expect(() => validatePoolId('')).toThrow('Pool ID must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validatePoolId('   ')).toThrow('Pool ID must not be empty');
  });

  it('throws for ID exceeding 500 characters', () => {
    expect(() => validatePoolId('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });

  it('returns same value when already trimmed', () => {
    expect(validatePoolId('pool-456')).toBe('pool-456');
  });

  it('accepts pool ID with dots and dashes', () => {
    expect(validatePoolId('pool-123.abc')).toBe('pool-123.abc');
  });

  it('accepts ID at exactly 500 characters', () => {
    expect(validatePoolId('x'.repeat(500))).toBe('x'.repeat(500));
  });

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validatePoolId('\t pool-1 \t')).toBe('pool-1');
  });

  it('handles newline-only input', () => {
    expect(() => validatePoolId('\n\n')).toThrow('Pool ID must not be empty');
  });

  it('handles tab-only input', () => {
    expect(() => validatePoolId('\t\t')).toThrow('Pool ID must not be empty');
  });
});

describe('validateVoucherCodes', () => {
  it('returns trimmed codes for valid input', () => {
    expect(validateVoucherCodes(['  ABC  ', '  DEF  '])).toEqual(['ABC', 'DEF']);
  });

  it('throws for empty array', () => {
    expect(() => validateVoucherCodes([])).toThrow('At least one voucher code must be provided');
  });

  it('throws for empty code string', () => {
    expect(() => validateVoucherCodes(['ABC', ''])).toThrow('Voucher code must not be empty');
  });

  it('throws for whitespace-only code', () => {
    expect(() => validateVoucherCodes(['ABC', '   '])).toThrow('Voucher code must not be empty');
  });

  it('throws for code exceeding 200 characters', () => {
    expect(() => validateVoucherCodes(['x'.repeat(201)])).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('throws for duplicate codes', () => {
    expect(() => validateVoucherCodes(['ABC', 'DEF', 'ABC'])).toThrow(
      'Voucher codes must be unique within a batch',
    );
  });

  it('throws for duplicate codes after trimming', () => {
    expect(() => validateVoucherCodes(['ABC', '  ABC  '])).toThrow(
      'Voucher codes must be unique within a batch',
    );
  });

  it('throws for batch exceeding 10,000 codes', () => {
    const codes = Array.from({ length: 10_001 }, (_, i) => `CODE-${i}`);
    expect(() => validateVoucherCodes(codes)).toThrow('must not exceed 10000 codes');
  });

  it('accepts batch at exactly 10,000 codes', () => {
    const codes = Array.from({ length: 10_000 }, (_, i) => `CODE-${i}`);
    expect(validateVoucherCodes(codes)).toHaveLength(10_000);
  });

  it('handles codes with mixed whitespace', () => {
    expect(validateVoucherCodes(['\t ABC \t', '\n DEF \n'])).toEqual(['ABC', 'DEF']);
  });

  it('throws for tab-only code', () => {
    expect(() => validateVoucherCodes(['ABC', '\t\t'])).toThrow('Voucher code must not be empty');
  });

  it('throws for newline-only code', () => {
    expect(() => validateVoucherCodes(['ABC', '\n'])).toThrow('Voucher code must not be empty');
  });
});

describe('validateAutoGenerateCount', () => {
  it('returns the count for valid input', () => {
    expect(validateAutoGenerateCount(100)).toBe(100);
  });

  it('throws for 0', () => {
    expect(() => validateAutoGenerateCount(0)).toThrow('positive integer');
  });

  it('throws for negative', () => {
    expect(() => validateAutoGenerateCount(-1)).toThrow('positive integer');
  });

  it('throws for non-integer', () => {
    expect(() => validateAutoGenerateCount(1.5)).toThrow('positive integer');
  });

  it('throws for exceeding 100,000', () => {
    expect(() => validateAutoGenerateCount(100_001)).toThrow('must not exceed 100000');
  });

  it('accepts exactly 100,000', () => {
    expect(validateAutoGenerateCount(100_000)).toBe(100_000);
  });

  it('accepts exactly 1', () => {
    expect(validateAutoGenerateCount(1)).toBe(1);
  });

  it('throws for NaN', () => {
    expect(() => validateAutoGenerateCount(NaN)).toThrow('positive integer');
  });

  it('throws for Infinity', () => {
    expect(() => validateAutoGenerateCount(Infinity)).toThrow('positive integer');
  });
});

describe('validateRedemptionRules', () => {
  it('returns rules when valid', () => {
    const rules = { maxRedemptions: 5, singleUse: true };
    expect(validateRedemptionRules(rules)).toEqual(rules);
  });

  it('returns empty rules object', () => {
    expect(validateRedemptionRules({})).toEqual({});
  });

  it('throws for maxRedemptions of 0', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: 0 })).toThrow('positive integer');
  });

  it('throws for negative maxRedemptions', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: -1 })).toThrow('positive integer');
  });

  it('throws for non-integer maxRedemptions', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: 1.5 })).toThrow('positive integer');
  });

  it('throws for maxRedemptions exceeding 1,000,000', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: 1_000_001 })).toThrow(
      'must not exceed 1000000',
    );
  });

  it('throws for empty expiresAt string', () => {
    expect(() => validateRedemptionRules({ expiresAt: '   ' })).toThrow(
      'Expiration date must not be empty',
    );
  });

  it('throws for invalid expiresAt date', () => {
    expect(() => validateRedemptionRules({ expiresAt: 'not-a-date' })).toThrow(
      'valid ISO-8601 date string',
    );
  });

  it('accepts valid ISO-8601 expiresAt', () => {
    const rules = { expiresAt: '2026-12-31T23:59:59Z' };
    expect(validateRedemptionRules(rules)).toEqual(rules);
  });

  it('accepts maxRedemptions at exactly 1,000,000', () => {
    expect(validateRedemptionRules({ maxRedemptions: 1_000_000 })).toEqual({
      maxRedemptions: 1_000_000,
    });
  });

  it('accepts maxRedemptions at exactly 1', () => {
    expect(validateRedemptionRules({ maxRedemptions: 1 })).toEqual({ maxRedemptions: 1 });
  });

  it('throws for NaN maxRedemptions', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: NaN })).toThrow('positive integer');
  });

  it('throws for fractional maxRedemptions', () => {
    expect(() => validateRedemptionRules({ maxRedemptions: 2.5 })).toThrow('positive integer');
  });

  it('accepts singleUse without other fields', () => {
    expect(validateRedemptionRules({ singleUse: true })).toEqual({ singleUse: true });
  });

  it('accepts singleUse false', () => {
    expect(validateRedemptionRules({ singleUse: false })).toEqual({ singleUse: false });
  });
});

describe('validateVoucherSource', () => {
  it('does not throw when voucher codes are provided', () => {
    expect(() => validateVoucherSource(['ABC', 'DEF'], undefined)).not.toThrow();
  });

  it('does not throw when auto-generate count is provided', () => {
    expect(() => validateVoucherSource(undefined, 100)).not.toThrow();
  });

  it('throws when neither is provided', () => {
    expect(() => validateVoucherSource(undefined, undefined)).toThrow(
      'Either voucher codes or auto-generate count must be provided',
    );
  });

  it('throws when empty codes array and no auto-generate', () => {
    expect(() => validateVoucherSource([], undefined)).toThrow(
      'Either voucher codes or auto-generate count must be provided',
    );
  });

  it('throws when both codes and auto-generate are provided', () => {
    expect(() => validateVoucherSource(['ABC'], 100)).toThrow(
      'Provide either voucher codes or auto-generate count, not both',
    );
  });
});

describe('buildVouchersUrl', () => {
  it('builds URL for simple project name', () => {
    expect(buildVouchersUrl('my-project')).toBe('/p/my-project/crm/vouchers');
  });

  it('encodes spaces in project name', () => {
    expect(buildVouchersUrl('my project')).toBe('/p/my%20project/crm/vouchers');
  });

  it('encodes slashes in project name', () => {
    expect(buildVouchersUrl('org/project')).toBe('/p/org%2Fproject/crm/vouchers');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildVouchersUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/crm/vouchers');
  });

  it('encodes hash character in project name', () => {
    expect(buildVouchersUrl('my#project')).toBe('/p/my%23project/crm/vouchers');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildVouchersUrl('team-alpha')).toBe('/p/team-alpha/crm/vouchers');
  });
});

describe('createVoucherActionExecutors', () => {
  it('returns executors for all 3 action types', () => {
    const executors = createVoucherActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_VOUCHER_POOL_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_VOUCHERS_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_VOUCHER_POOL_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createVoucherActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw not yet implemented on execute', async () => {
    const executors = createVoucherActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createVoucherActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw with apiConfig', async () => {
    const executors = createVoucherActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('executor actionType stays stable with apiConfig', () => {
    const executors = createVoucherActionExecutors(TEST_API_CONFIG);
    expect(executors[CREATE_VOUCHER_POOL_ACTION_TYPE].actionType).toBe(
      CREATE_VOUCHER_POOL_ACTION_TYPE,
    );
    expect(executors[ADD_VOUCHERS_ACTION_TYPE].actionType).toBe(ADD_VOUCHERS_ACTION_TYPE);
    expect(executors[DELETE_VOUCHER_POOL_ACTION_TYPE].actionType).toBe(
      DELETE_VOUCHER_POOL_ACTION_TYPE,
    );
  });

  it('executor map keys are exactly the 3 action types', () => {
    const executors = createVoucherActionExecutors();
    expect(Object.keys(executors)).toEqual([
      CREATE_VOUCHER_POOL_ACTION_TYPE,
      ADD_VOUCHERS_ACTION_TYPE,
      DELETE_VOUCHER_POOL_ACTION_TYPE,
    ]);
  });
});

describe('BloomreachVouchersService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachVouchersService('my-project');
      expect(service).toBeInstanceOf(BloomreachVouchersService);
    });

    it('exposes vouchersUrl', () => {
      const service = new BloomreachVouchersService('my-project');
      expect(service.vouchersUrl).toBe('/p/my-project/crm/vouchers');
    });

    it('trims project name', () => {
      const service = new BloomreachVouchersService('  my-project  ');
      expect(service.vouchersUrl).toBe('/p/my-project/crm/vouchers');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachVouchersService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachVouchersService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachVouchersService('org/project');
      expect(service.vouchersUrl).toBe('/p/org%2Fproject/crm/vouchers');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachVouchersService);
    });

    it('exposes vouchers URL when constructed with apiConfig', () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      expect(service.vouchersUrl).toBe('/p/test/crm/vouchers');
    });

    it('encodes unicode in constructor project URL', () => {
      const service = new BloomreachVouchersService('projekt åäö');
      expect(service.vouchersUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/crm/vouchers');
    });

    it('encodes hash in constructor project URL', () => {
      const service = new BloomreachVouchersService('my#project');
      expect(service.vouchersUrl).toBe('/p/my%23project/crm/vouchers');
    });
  });

  describe('listVoucherPools', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(service.listVoucherPools()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      await expect(service.listVoucherPools()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error for trimmed project', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(service.listVoucherPools({ project: '  test  ' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('validates limit when input is provided', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(service.listVoucherPools({ project: 'test', limit: 0 })).rejects.toThrow(
        'positive integer',
      );
    });

    it('validates offset when input is provided', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(service.listVoucherPools({ project: 'test', offset: -1 })).rejects.toThrow(
        'non-negative integer',
      );
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.listVoucherPools({ project: '', limit: 10, offset: 0 }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.listVoucherPools({ project: '   ', limit: 10, offset: 0 }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewVoucherStatus', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: 'test', poolId: 'pool-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      await expect(
        service.viewVoucherStatus({ project: 'test', poolId: 'pool-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('validates poolId', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: 'test', poolId: '   ' }),
      ).rejects.toThrow('Pool ID must not be empty');
    });

    it('validates project', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: '', poolId: 'pool-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: '   ', poolId: 'pool-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates pool ID with dots and dashes', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: 'test', poolId: 'pool-1.abc' }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('prepareCreateVoucherPool', () => {
    it('returns prepared action with manual voucher codes', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: '  Summer Sale  ',
        voucherCodes: ['  CODE-1  ', '  CODE-2  '],
        operatorNote: 'Create summer pool',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.create_pool',
          project: 'test',
          name: 'Summer Sale',
          voucherCount: 2,
          voucherSource: 'manual',
          operatorNote: 'Create summer pool',
        }),
      );
    });

    it('returns prepared action with auto-generated vouchers', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Winter Sale',
        autoGenerateCount: 500,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          voucherCount: 500,
          voucherSource: 'auto-generated',
        }),
      );
    });

    it('returns prepared action with redemption rules', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Limited Sale',
        autoGenerateCount: 100,
        redemptionRules: { maxRedemptions: 1, singleUse: true },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          redemptionRules: { maxRedemptions: 1, singleUse: true },
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: 'test',
          name: '',
          autoGenerateCount: 100,
        }),
      ).toThrow('Pool name must not be empty');
    });

    it('throws when neither codes nor auto-generate provided', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: 'test',
          name: 'Empty Pool',
        }),
      ).toThrow('Either voucher codes or auto-generate count must be provided');
    });

    it('throws when both codes and auto-generate provided', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: 'test',
          name: 'Conflict Pool',
          voucherCodes: ['ABC'],
          autoGenerateCount: 100,
        }),
      ).toThrow('Provide either voucher codes or auto-generate count, not both');
    });

    it('throws for empty project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: '',
          name: 'Test Pool',
          autoGenerateCount: 100,
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid auto-generate count', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: 'test',
          name: 'Test Pool',
          autoGenerateCount: 0,
        }),
      ).toThrow('positive integer');
    });

    it('throws for invalid redemption rules', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: 'test',
          name: 'Test Pool',
          autoGenerateCount: 100,
          redemptionRules: { maxRedemptions: -1 },
        }),
      ).toThrow('positive integer');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachVouchersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_000);
      nowSpy.mockReturnValueOnce(1_700_000_000_001);
      nowSpy.mockReturnValueOnce(1_700_000_000_002);
      nowSpy.mockReturnValueOnce(1_700_000_000_003);
      nowSpy.mockReturnValueOnce(1_700_000_000_004);
      nowSpy.mockReturnValueOnce(1_700_000_000_005);

      const first = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Pool A',
        autoGenerateCount: 10,
      });
      const second = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Pool B',
        autoGenerateCount: 20,
      });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachVouchersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_100);
      nowSpy.mockReturnValueOnce(1_700_000_000_101);
      nowSpy.mockReturnValueOnce(1_700_000_000_102);
      nowSpy.mockReturnValueOnce(1_700_000_000_103);
      nowSpy.mockReturnValueOnce(1_700_000_000_104);
      nowSpy.mockReturnValueOnce(1_700_000_000_105);

      const first = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Pool A',
        autoGenerateCount: 10,
      });
      const second = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Pool B',
        autoGenerateCount: 20,
      });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('trims project in preview', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareCreateVoucherPool({
        project: '  my-project  ',
        name: 'Test Pool',
        autoGenerateCount: 10,
      });

      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareCreateVoucherPool({
          project: '   ',
          name: 'Test Pool',
          autoGenerateCount: 100,
        }),
      ).toThrow('must not be empty');
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'API Test Pool',
        autoGenerateCount: 50,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.create_pool',
          project: 'test',
          name: 'API Test Pool',
        }),
      );
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Test Pool',
        autoGenerateCount: 10,
        operatorNote: '',
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachVouchersService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareCreateVoucherPool({
        project: 'test',
        name: 'Test Pool',
        autoGenerateCount: 10,
        operatorNote: note,
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });
  });

  describe('prepareAddVouchers', () => {
    it('returns prepared action with manual voucher codes', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareAddVouchers({
        project: 'test',
        poolId: '  pool-1  ',
        voucherCodes: ['NEW-1', 'NEW-2'],
        operatorNote: 'Adding codes to pool',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.add_vouchers',
          project: 'test',
          poolId: 'pool-1',
          voucherCount: 2,
          voucherSource: 'manual',
          operatorNote: 'Adding codes to pool',
        }),
      );
    });

    it('returns prepared action with auto-generated vouchers', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareAddVouchers({
        project: 'test',
        poolId: 'pool-1',
        autoGenerateCount: 200,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          voucherCount: 200,
          voucherSource: 'auto-generated',
        }),
      );
    });

    it('throws for empty poolId', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareAddVouchers({
          project: 'test',
          poolId: '   ',
          autoGenerateCount: 100,
        }),
      ).toThrow('Pool ID must not be empty');
    });

    it('throws when neither codes nor auto-generate provided', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareAddVouchers({
          project: 'test',
          poolId: 'pool-1',
        }),
      ).toThrow('Either voucher codes or auto-generate count must be provided');
    });

    it('throws for empty project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareAddVouchers({
          project: '',
          poolId: 'pool-1',
          autoGenerateCount: 100,
        }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachVouchersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_000);
      nowSpy.mockReturnValueOnce(1_700_000_000_001);
      nowSpy.mockReturnValueOnce(1_700_000_000_002);
      nowSpy.mockReturnValueOnce(1_700_000_000_003);
      nowSpy.mockReturnValueOnce(1_700_000_000_004);
      nowSpy.mockReturnValueOnce(1_700_000_000_005);

      const first = service.prepareAddVouchers({
        project: 'test',
        poolId: 'pool-1',
        autoGenerateCount: 10,
      });
      const second = service.prepareAddVouchers({
        project: 'test',
        poolId: 'pool-1',
        autoGenerateCount: 20,
      });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      const result = service.prepareAddVouchers({
        project: 'test',
        poolId: 'pool-1',
        autoGenerateCount: 50,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.add_vouchers',
          project: 'test',
          poolId: 'pool-1',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareAddVouchers({
          project: '   ',
          poolId: 'pool-1',
          autoGenerateCount: 100,
        }),
      ).toThrow('must not be empty');
    });

    it('trims pool ID in preview', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareAddVouchers({
        project: 'test',
        poolId: '  pool-1  ',
        autoGenerateCount: 10,
      });

      expect(result.preview).toEqual(expect.objectContaining({ poolId: 'pool-1' }));
    });
  });

  describe('prepareDeleteVoucherPool', () => {
    it('returns prepared action with preview fields and operatorNote', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: '  pool-3  ',
        operatorNote: 'Removing expired pool',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.delete_pool',
          project: 'test',
          poolId: 'pool-3',
          operatorNote: 'Removing expired pool',
        }),
      );
    });

    it('throws for empty poolId', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareDeleteVoucherPool({
          project: 'test',
          poolId: '   ',
        }),
      ).toThrow('Pool ID must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareDeleteVoucherPool({
          project: '',
          poolId: 'pool-3',
        }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachVouchersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_000);
      nowSpy.mockReturnValueOnce(1_700_000_000_001);
      nowSpy.mockReturnValueOnce(1_700_000_000_002);
      nowSpy.mockReturnValueOnce(1_700_000_000_003);
      nowSpy.mockReturnValueOnce(1_700_000_000_004);
      nowSpy.mockReturnValueOnce(1_700_000_000_005);

      const first = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: 'pool-1',
      });
      const second = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: 'pool-2',
      });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachVouchersService('test', TEST_API_CONFIG);
      const result = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: 'pool-3',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'vouchers.delete_pool',
          project: 'test',
          poolId: 'pool-3',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachVouchersService('test');
      expect(() =>
        service.prepareDeleteVoucherPool({
          project: '   ',
          poolId: 'pool-3',
        }),
      ).toThrow('must not be empty');
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: 'pool-3',
        operatorNote: '',
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachVouchersService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareDeleteVoucherPool({
        project: 'test',
        poolId: 'pool-3',
        operatorNote: note,
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });

    it('trims project in preview', () => {
      const service = new BloomreachVouchersService('test');
      const result = service.prepareDeleteVoucherPool({
        project: '  my-project  ',
        poolId: 'pool-3',
      });

      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });
  });
});
