import { describe, it, expect } from 'vitest';
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
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
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
  });

  describe('listVoucherPools', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(service.listVoucherPools()).rejects.toThrow('not yet implemented');
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
  });

  describe('viewVoucherStatus', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachVouchersService('test');
      await expect(
        service.viewVoucherStatus({ project: 'test', poolId: 'pool-1' }),
      ).rejects.toThrow('not yet implemented');
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
  });
});
