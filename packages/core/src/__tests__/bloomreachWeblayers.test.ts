import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CREATE_WEBLAYER_ACTION_TYPE,
  START_WEBLAYER_ACTION_TYPE,
  STOP_WEBLAYER_ACTION_TYPE,
  CLONE_WEBLAYER_ACTION_TYPE,
  ARCHIVE_WEBLAYER_ACTION_TYPE,
  WEBLAYER_RATE_LIMIT_WINDOW_MS,
  WEBLAYER_CREATE_RATE_LIMIT,
  WEBLAYER_MODIFY_RATE_LIMIT,
  WEBLAYER_STATUSES,
  WEBLAYER_DISPLAY_TYPES,
  validateWeblayerName,
  validateWeblayerStatus,
  validateWeblayerId,
  validateWeblayerDisplayType,
  validateWeblayerABTestConfig,
  validateDisplayConditions,
  validateBanditId,
  validateVariants,
  validateVariantId,
  buildWeblayersUrl,
  createWeblayerActionExecutors,
  BloomreachWeblayersService,
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
  it('exports CREATE_WEBLAYER_ACTION_TYPE', () => {
    expect(CREATE_WEBLAYER_ACTION_TYPE).toBe('weblayers.create_weblayer');
  });

  it('exports START_WEBLAYER_ACTION_TYPE', () => {
    expect(START_WEBLAYER_ACTION_TYPE).toBe('weblayers.start_weblayer');
  });

  it('exports STOP_WEBLAYER_ACTION_TYPE', () => {
    expect(STOP_WEBLAYER_ACTION_TYPE).toBe('weblayers.stop_weblayer');
  });

  it('exports CLONE_WEBLAYER_ACTION_TYPE', () => {
    expect(CLONE_WEBLAYER_ACTION_TYPE).toBe('weblayers.clone_weblayer');
  });

  it('exports ARCHIVE_WEBLAYER_ACTION_TYPE', () => {
    expect(ARCHIVE_WEBLAYER_ACTION_TYPE).toBe('weblayers.archive_weblayer');
  });
});

describe('rate limit constants', () => {
  it('exports WEBLAYER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(WEBLAYER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports WEBLAYER_CREATE_RATE_LIMIT', () => {
    expect(WEBLAYER_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports WEBLAYER_MODIFY_RATE_LIMIT', () => {
    expect(WEBLAYER_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('WEBLAYER_STATUSES', () => {
  it('contains 4 statuses', () => {
    expect(WEBLAYER_STATUSES).toHaveLength(4);
  });

  it('contains expected statuses in order', () => {
    expect(WEBLAYER_STATUSES).toEqual(['active', 'inactive', 'draft', 'archived']);
  });
});

describe('WEBLAYER_DISPLAY_TYPES', () => {
  it('contains 4 display types', () => {
    expect(WEBLAYER_DISPLAY_TYPES).toHaveLength(4);
  });

  it('contains expected display types in order', () => {
    expect(WEBLAYER_DISPLAY_TYPES).toEqual(['overlay', 'banner', 'popup', 'slide_in']);
  });
});

describe('validateWeblayerName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateWeblayerName('  My Weblayer  ')).toBe('My Weblayer');
  });

  it('accepts single-character name', () => {
    expect(validateWeblayerName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateWeblayerName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateWeblayerName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateWeblayerName('   ')).toThrow('must not be empty');
  });

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validateWeblayerName('\t Weblayer \t')).toBe('Weblayer');
  });

  it('handles newline-only input', () => {
    expect(() => validateWeblayerName('\n\n')).toThrow('must not be empty');
  });

  it('handles tab-only input', () => {
    expect(() => validateWeblayerName('\t\t')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateWeblayerName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateWeblayerStatus', () => {
  it('accepts active', () => {
    expect(validateWeblayerStatus('active')).toBe('active');
  });

  it('accepts inactive', () => {
    expect(validateWeblayerStatus('inactive')).toBe('inactive');
  });

  it('accepts draft', () => {
    expect(validateWeblayerStatus('draft')).toBe('draft');
  });

  it('accepts archived', () => {
    expect(validateWeblayerStatus('archived')).toBe('archived');
  });

  it('throws for unknown status', () => {
    expect(() => validateWeblayerStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateWeblayerStatus('')).toThrow('status must be one of');
  });
});

describe('validateWeblayerId', () => {
  it('returns trimmed weblayer ID for valid input', () => {
    expect(validateWeblayerId('  weblayer-123  ')).toBe('weblayer-123');
  });

  it('throws for empty string', () => {
    expect(() => validateWeblayerId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateWeblayerId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateWeblayerId('weblayer-456')).toBe('weblayer-456');
  });

  it('accepts weblayer ID with dots and dashes', () => {
    expect(validateWeblayerId('wl-123.abc')).toBe('wl-123.abc');
  });

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validateWeblayerId('\t wl-123 \t')).toBe('wl-123');
  });

  it('handles newline-only input', () => {
    expect(() => validateWeblayerId('\n\n')).toThrow('must not be empty');
  });

  it('handles tab-only input', () => {
    expect(() => validateWeblayerId('\t\t')).toThrow('must not be empty');
  });
});

describe('validateWeblayerDisplayType', () => {
  it('accepts overlay', () => {
    expect(validateWeblayerDisplayType('overlay')).toBe('overlay');
  });

  it('accepts banner', () => {
    expect(validateWeblayerDisplayType('banner')).toBe('banner');
  });

  it('accepts popup', () => {
    expect(validateWeblayerDisplayType('popup')).toBe('popup');
  });

  it('accepts slide_in', () => {
    expect(validateWeblayerDisplayType('slide_in')).toBe('slide_in');
  });

  it('throws for unknown display type', () => {
    expect(() => validateWeblayerDisplayType('modal')).toThrow('displayType must be one of');
  });

  it('throws for empty display type', () => {
    expect(() => validateWeblayerDisplayType('')).toThrow('displayType must be one of');
  });
});

describe('validateWeblayerABTestConfig', () => {
  it('accepts valid config', () => {
    const config = {
      enabled: true,
      variants: 2,
      splitPercentage: 50,
      winnerCriteria: 'click_rate',
    };
    expect(validateWeblayerABTestConfig(config)).toEqual(config);
  });

  it('throws for too few variants', () => {
    expect(() =>
      validateWeblayerABTestConfig({
        enabled: true,
        variants: 1,
      }),
    ).toThrow('A/B test variants must be an integer between 2 and 10');
  });

  it('throws for too many variants', () => {
    expect(() =>
      validateWeblayerABTestConfig({
        enabled: true,
        variants: 11,
      }),
    ).toThrow('A/B test variants must be an integer between 2 and 10');
  });

  it('throws for non-integer variants', () => {
    expect(() =>
      validateWeblayerABTestConfig({
        enabled: true,
        variants: 2.5,
      }),
    ).toThrow('A/B test variants must be an integer between 2 and 10');
  });

  it('accepts exactly 2 variants', () => {
    const config = { enabled: true, variants: 2 };
    expect(validateWeblayerABTestConfig(config)).toEqual(config);
  });

  it('accepts exactly 10 variants', () => {
    const config = { enabled: true, variants: 10 };
    expect(validateWeblayerABTestConfig(config)).toEqual(config);
  });

  it('throws for split percentage below 0', () => {
    expect(() =>
      validateWeblayerABTestConfig({
        enabled: true,
        variants: 2,
        splitPercentage: -1,
      }),
    ).toThrow('A/B test split percentage must be between 0 and 100');
  });

  it('throws for split percentage above 100', () => {
    expect(() =>
      validateWeblayerABTestConfig({
        enabled: true,
        variants: 2,
        splitPercentage: 101,
      }),
    ).toThrow('A/B test split percentage must be between 0 and 100');
  });

  it('accepts split percentage at exactly 0', () => {
    const config = { enabled: true, variants: 2, splitPercentage: 0 };
    expect(validateWeblayerABTestConfig(config)).toEqual(config);
  });

  it('accepts split percentage at exactly 100', () => {
    const config = { enabled: true, variants: 2, splitPercentage: 100 };
    expect(validateWeblayerABTestConfig(config)).toEqual(config);
  });
});

describe('validateDisplayConditions', () => {
  it('accepts valid conditions', () => {
    const conditions = {
      audience: 'new-visitors',
      pageUrlFilter: '/pricing',
      delayMs: 500,
      scrollPercentage: 25,
      frequencyCap: 3,
    };
    expect(validateDisplayConditions(conditions)).toEqual(conditions);
  });

  it('throws for negative delayMs', () => {
    expect(() => validateDisplayConditions({ delayMs: -1 })).toThrow(
      'delayMs must be greater than or equal to 0',
    );
  });

  it('throws for scrollPercentage below 0', () => {
    expect(() => validateDisplayConditions({ scrollPercentage: -1 })).toThrow(
      'scrollPercentage must be between 0 and 100',
    );
  });

  it('throws for scrollPercentage above 100', () => {
    expect(() => validateDisplayConditions({ scrollPercentage: 101 })).toThrow(
      'scrollPercentage must be between 0 and 100',
    );
  });

  it('throws for zero frequencyCap', () => {
    expect(() => validateDisplayConditions({ frequencyCap: 0 })).toThrow(
      'frequencyCap must be greater than or equal to 1',
    );
  });

  it('accepts delayMs at exactly 0', () => {
    expect(validateDisplayConditions({ delayMs: 0 })).toEqual({ delayMs: 0 });
  });

  it('accepts scrollPercentage at exactly 0', () => {
    expect(validateDisplayConditions({ scrollPercentage: 0 })).toEqual({ scrollPercentage: 0 });
  });

  it('accepts scrollPercentage at exactly 100', () => {
    expect(validateDisplayConditions({ scrollPercentage: 100 })).toEqual({
      scrollPercentage: 100,
    });
  });

  it('accepts frequencyCap at exactly 1', () => {
    expect(validateDisplayConditions({ frequencyCap: 1 })).toEqual({ frequencyCap: 1 });
  });

  it('accepts empty conditions object', () => {
    expect(validateDisplayConditions({})).toEqual({});
  });
});

describe('buildWeblayersUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildWeblayersUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/campaigns/banners');
  });

  it('encodes spaces in project name', () => {
    expect(buildWeblayersUrl('my project')).toBe('/p/my%20project/campaigns/banners');
  });

  it('encodes slashes in project name', () => {
    expect(buildWeblayersUrl('org/project')).toBe('/p/org%2Fproject/campaigns/banners');
  });

  it('encodes unicode characters', () => {
    expect(buildWeblayersUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/banners');
  });

  it('encodes hash character', () => {
    expect(buildWeblayersUrl('my#project')).toBe('/p/my%23project/campaigns/banners');
  });

  it('keeps dashes unencoded', () => {
    expect(buildWeblayersUrl('team-alpha')).toBe('/p/team-alpha/campaigns/banners');
  });
});

describe('createWeblayerActionExecutors', () => {
  it('returns executors for all five action types', () => {
    const executors = createWeblayerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_WEBLAYER_ACTION_TYPE]).toBeDefined();
    expect(executors[START_WEBLAYER_ACTION_TYPE]).toBeDefined();
    expect(executors[STOP_WEBLAYER_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_WEBLAYER_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_WEBLAYER_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createWeblayerActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createWeblayerActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createWeblayerActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('executors still throw with apiConfig', async () => {
    const executors = createWeblayerActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('Bloomreach Engagement UI');
    }
  });

  it('executor actionType stays stable with apiConfig', () => {
    const executors = createWeblayerActionExecutors(TEST_API_CONFIG);
    expect(executors[CREATE_WEBLAYER_ACTION_TYPE].actionType).toBe(CREATE_WEBLAYER_ACTION_TYPE);
    expect(executors[START_WEBLAYER_ACTION_TYPE].actionType).toBe(START_WEBLAYER_ACTION_TYPE);
    expect(executors[STOP_WEBLAYER_ACTION_TYPE].actionType).toBe(STOP_WEBLAYER_ACTION_TYPE);
    expect(executors[CLONE_WEBLAYER_ACTION_TYPE].actionType).toBe(CLONE_WEBLAYER_ACTION_TYPE);
    expect(executors[ARCHIVE_WEBLAYER_ACTION_TYPE].actionType).toBe(
      ARCHIVE_WEBLAYER_ACTION_TYPE,
    );
  });

  it('executor map keys are exactly the 5 action types', () => {
    const executors = createWeblayerActionExecutors();
    expect(Object.keys(executors)).toEqual([
      CREATE_WEBLAYER_ACTION_TYPE,
      START_WEBLAYER_ACTION_TYPE,
      STOP_WEBLAYER_ACTION_TYPE,
      CLONE_WEBLAYER_ACTION_TYPE,
      ARCHIVE_WEBLAYER_ACTION_TYPE,
    ]);
  });
});

describe('BloomreachWeblayersService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachWeblayersService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachWeblayersService);
    });

    it('exposes the weblayers URL', () => {
      const service = new BloomreachWeblayersService('kingdom-of-joakim');
      expect(service.weblayersUrl).toBe('/p/kingdom-of-joakim/campaigns/banners');
    });

    it('trims project name', () => {
      const service = new BloomreachWeblayersService('  my-project  ');
      expect(service.weblayersUrl).toBe('/p/my-project/campaigns/banners');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachWeblayersService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachWeblayersService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachWeblayersService('org/project');
      expect(service.weblayersUrl).toBe('/p/org%2Fproject/campaigns/banners');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachWeblayersService);
    });

    it('exposes weblayers URL when constructed with apiConfig', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      expect(service.weblayersUrl).toBe('/p/test/campaigns/banners');
    });

    it('encodes unicode in constructor project URL', () => {
      const service = new BloomreachWeblayersService('projekt åäö');
      expect(service.weblayersUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/banners');
    });

    it('encodes hash in constructor project URL', () => {
      const service = new BloomreachWeblayersService('my#project');
      expect(service.weblayersUrl).toBe('/p/my%23project/campaigns/banners');
    });
  });

  describe('listWeblayers', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(service.listWeblayers()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      await expect(service.listWeblayers()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error for trimmed project', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(service.listWeblayers({ project: '  test  ' })).rejects.toThrow('does not provide');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.listWeblayers({ project: 'test', status: 'paused' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.listWeblayers({ project: '', status: 'active' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.listWeblayers({ project: '   ', status: 'active' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewWeblayerPerformance', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.viewWeblayerPerformance({ project: 'test', weblayerId: 'weblayer-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      await expect(
        service.viewWeblayerPerformance({ project: 'test', weblayerId: 'weblayer-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('validates project input', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.viewWeblayerPerformance({ project: '', weblayerId: 'weblayer-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates weblayerId input', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.viewWeblayerPerformance({ project: 'test', weblayerId: '   ' }),
      ).rejects.toThrow('Weblayer ID must not be empty');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.viewWeblayerPerformance({ project: '   ', weblayerId: 'weblayer-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates weblayer ID with dots and dashes', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.viewWeblayerPerformance({ project: 'test', weblayerId: 'wl-1.abc' }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('prepareCreateWeblayer', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCreateWeblayer({
        project: 'test',
        name: 'My Weblayer',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.create_weblayer',
          project: 'test',
          name: 'My Weblayer',
        }),
      );
    });

    it('includes displayType, displayConditions, abTest, and operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCreateWeblayer({
        project: 'test',
        name: 'AB Tested Weblayer',
        displayType: 'overlay',
        displayConditions: {
          delayMs: 1000,
          scrollPercentage: 50,
          frequencyCap: 2,
        },
        abTest: {
          enabled: true,
          variants: 2,
          splitPercentage: 50,
          winnerCriteria: 'conversion_rate',
        },
        operatorNote: 'Prepare for homepage test',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          displayType: 'overlay',
          displayConditions: {
            delayMs: 1000,
            scrollPercentage: 50,
            frequencyCap: 2,
          },
          abTest: {
            enabled: true,
            variants: 2,
            splitPercentage: 50,
            winnerCriteria: 'conversion_rate',
          },
          operatorNote: 'Prepare for homepage test',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() => service.prepareCreateWeblayer({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCreateWeblayer({ project: '', name: 'Weblayer' }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCreateWeblayer({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for invalid displayType', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCreateWeblayer({
          project: 'test',
          name: 'Weblayer',
          displayType: 'modal',
        }),
      ).toThrow('displayType must be one of');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_000);
      nowSpy.mockReturnValueOnce(1_700_000_000_001);
      nowSpy.mockReturnValueOnce(1_700_000_000_002);
      nowSpy.mockReturnValueOnce(1_700_000_000_003);
      nowSpy.mockReturnValueOnce(1_700_000_000_004);
      nowSpy.mockReturnValueOnce(1_700_000_000_005);

      const first = service.prepareCreateWeblayer({ project: 'test', name: 'A' });
      const second = service.prepareCreateWeblayer({ project: 'test', name: 'B' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_100);
      nowSpy.mockReturnValueOnce(1_700_000_000_101);
      nowSpy.mockReturnValueOnce(1_700_000_000_102);
      nowSpy.mockReturnValueOnce(1_700_000_000_103);
      nowSpy.mockReturnValueOnce(1_700_000_000_104);
      nowSpy.mockReturnValueOnce(1_700_000_000_105);

      const first = service.prepareCreateWeblayer({ project: 'test', name: 'A' });
      const second = service.prepareCreateWeblayer({ project: 'test', name: 'B' });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('trims project in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCreateWeblayer({ project: '  my-project  ', name: 'My Weblayer' });
      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() => service.prepareCreateWeblayer({ project: '   ', name: 'Weblayer' })).toThrow(
        'must not be empty',
      );
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = service.prepareCreateWeblayer({ project: 'test', name: 'API Weblayer' });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.create_weblayer',
          project: 'test',
          name: 'API Weblayer',
        }),
      );
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCreateWeblayer({
        project: 'test',
        name: 'My Weblayer',
        operatorNote: '',
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareCreateWeblayer({
        project: 'test',
        name: 'My Weblayer',
        operatorNote: note,
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });
  });

  describe('prepareStartWeblayer', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareStartWeblayer({
        project: 'test',
        weblayerId: 'weblayer-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.start_weblayer',
          project: 'test',
          weblayerId: 'weblayer-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareStartWeblayer({
        project: 'test',
        weblayerId: 'weblayer-123',
        operatorNote: 'Start after QA signoff',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Start after QA signoff' }),
      );
    });

    it('throws for empty weblayerId', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStartWeblayer({ project: 'test', weblayerId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStartWeblayer({ project: '', weblayerId: 'weblayer-123' }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_001_000);
      nowSpy.mockReturnValueOnce(1_700_000_001_001);
      nowSpy.mockReturnValueOnce(1_700_000_001_002);
      nowSpy.mockReturnValueOnce(1_700_000_001_003);
      nowSpy.mockReturnValueOnce(1_700_000_001_004);
      nowSpy.mockReturnValueOnce(1_700_000_001_005);

      const first = service.prepareStartWeblayer({ project: 'test', weblayerId: 'wl-1' });
      const second = service.prepareStartWeblayer({ project: 'test', weblayerId: 'wl-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = service.prepareStartWeblayer({ project: 'test', weblayerId: 'wl-1' });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.start_weblayer',
          project: 'test',
          weblayerId: 'wl-1',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStartWeblayer({ project: '   ', weblayerId: 'weblayer-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareStopWeblayer', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareStopWeblayer({
        project: 'test',
        weblayerId: 'weblayer-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.stop_weblayer',
          project: 'test',
          weblayerId: 'weblayer-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareStopWeblayer({
        project: 'test',
        weblayerId: 'weblayer-456',
        operatorNote: 'Pause for promotion update',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Pause for promotion update' }),
      );
    });

    it('throws for empty weblayerId', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStopWeblayer({ project: 'test', weblayerId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStopWeblayer({ project: '', weblayerId: 'weblayer-456' }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_002_000);
      nowSpy.mockReturnValueOnce(1_700_000_002_001);
      nowSpy.mockReturnValueOnce(1_700_000_002_002);
      nowSpy.mockReturnValueOnce(1_700_000_002_003);
      nowSpy.mockReturnValueOnce(1_700_000_002_004);
      nowSpy.mockReturnValueOnce(1_700_000_002_005);

      const first = service.prepareStopWeblayer({ project: 'test', weblayerId: 'wl-1' });
      const second = service.prepareStopWeblayer({ project: 'test', weblayerId: 'wl-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = service.prepareStopWeblayer({ project: 'test', weblayerId: 'wl-1' });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.stop_weblayer',
          project: 'test',
          weblayerId: 'wl-1',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareStopWeblayer({ project: '   ', weblayerId: 'weblayer-456' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCloneWeblayer', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCloneWeblayer({
        project: 'test',
        weblayerId: 'weblayer-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.clone_weblayer',
          project: 'test',
          weblayerId: 'weblayer-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareCloneWeblayer({
        project: 'test',
        weblayerId: 'weblayer-789',
        newName: '  Cloned Weblayer  ',
      });

      expect(result.preview).toEqual(expect.objectContaining({ newName: 'Cloned Weblayer' }));
    });

    it('throws for empty weblayerId', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCloneWeblayer({ project: 'test', weblayerId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCloneWeblayer({ project: '', weblayerId: 'weblayer-789' }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCloneWeblayer({
          project: 'test',
          weblayerId: 'weblayer-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_003_000);
      nowSpy.mockReturnValueOnce(1_700_000_003_001);
      nowSpy.mockReturnValueOnce(1_700_000_003_002);
      nowSpy.mockReturnValueOnce(1_700_000_003_003);
      nowSpy.mockReturnValueOnce(1_700_000_003_004);
      nowSpy.mockReturnValueOnce(1_700_000_003_005);

      const first = service.prepareCloneWeblayer({ project: 'test', weblayerId: 'wl-1' });
      const second = service.prepareCloneWeblayer({ project: 'test', weblayerId: 'wl-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = service.prepareCloneWeblayer({ project: 'test', weblayerId: 'wl-1' });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.clone_weblayer',
          project: 'test',
          weblayerId: 'wl-1',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareCloneWeblayer({ project: '   ', weblayerId: 'weblayer-789' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveWeblayer', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareArchiveWeblayer({
        project: 'test',
        weblayerId: 'weblayer-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.archive_weblayer',
          project: 'test',
          weblayerId: 'weblayer-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachWeblayersService('test');
      const result = service.prepareArchiveWeblayer({
        project: 'test',
        weblayerId: 'weblayer-900',
        operatorNote: 'Archive completed spring campaign',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive completed spring campaign' }),
      );
    });

    it('throws for empty weblayerId', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareArchiveWeblayer({ project: 'test', weblayerId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareArchiveWeblayer({ project: '', weblayerId: 'weblayer-900' }),
      ).toThrow('must not be empty');
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachWeblayersService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_004_000);
      nowSpy.mockReturnValueOnce(1_700_000_004_001);
      nowSpy.mockReturnValueOnce(1_700_000_004_002);
      nowSpy.mockReturnValueOnce(1_700_000_004_003);
      nowSpy.mockReturnValueOnce(1_700_000_004_004);
      nowSpy.mockReturnValueOnce(1_700_000_004_005);

      const first = service.prepareArchiveWeblayer({ project: 'test', weblayerId: 'wl-1' });
      const second = service.prepareArchiveWeblayer({ project: 'test', weblayerId: 'wl-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = service.prepareArchiveWeblayer({ project: 'test', weblayerId: 'wl-1' });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'weblayers.archive_weblayer',
          project: 'test',
          weblayerId: 'wl-1',
        }),
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachWeblayersService('test');
      expect(() =>
        service.prepareArchiveWeblayer({ project: '   ', weblayerId: 'weblayer-900' }),
      ).toThrow('must not be empty');
    });
  });
});

describe('validateBanditId', () => {
  it('returns trimmed ID', () => {
    expect(validateBanditId('  bandit-1  ')).toBe('bandit-1');
  });

  it('throws for empty string', () => {
    expect(() => validateBanditId('')).toThrow('Bandit ID must not be empty');
  });
});

describe('validateVariants', () => {
  it('returns valid variants', () => {
    const variants = [{ id: 'a' }, { id: 'b' }];
    expect(validateVariants(variants)).toEqual(variants);
  });

  it('throws for empty array', () => {
    expect(() => validateVariants([])).toThrow('At least one variant');
  });

  it('throws for variant with empty id', () => {
    expect(() => validateVariants([{ id: '' }])).toThrow('non-empty id');
  });
});

describe('validateVariantId', () => {
  it('returns trimmed ID', () => {
    expect(validateVariantId('  var-1  ')).toBe('var-1');
  });

  it('throws for empty string', () => {
    expect(() => validateVariantId('')).toThrow('Variant ID must not be empty');
  });
});

describe('BloomreachWeblayersService - personalization methods', () => {
  describe('getBestVariant', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.getBestVariant({
          project: 'test',
          banditId: 'b-1',
          customerIds: { cookie: 'abc' },
          variants: [{ id: 'a' }],
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns best variant from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ best_variant: 'a' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = await service.getBestVariant({
        project: 'test',
        banditId: 'b-1',
        customerIds: { cookie: 'abc' },
        variants: [{ id: 'a' }, { id: 'b' }],
      });
      expect(result.success).toBe(true);
      expect(result.bestVariant).toBe('a');
    });

    it('validates banditId', async () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      await expect(
        service.getBestVariant({
          project: 'test',
          banditId: '',
          customerIds: { cookie: 'abc' },
          variants: [{ id: 'a' }],
        }),
      ).rejects.toThrow('Bandit ID must not be empty');
    });

    it('validates variants', async () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      await expect(
        service.getBestVariant({
          project: 'test',
          banditId: 'b-1',
          customerIds: { cookie: 'abc' },
          variants: [],
        }),
      ).rejects.toThrow('At least one variant');
    });
  });

  describe('reportReward', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachWeblayersService('test');
      await expect(
        service.reportReward({
          project: 'test',
          banditId: 'b-1',
          customerIds: { cookie: 'abc' },
          variantId: 'a',
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('reports reward via API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      const result = await service.reportReward({
        project: 'test',
        banditId: 'b-1',
        customerIds: { cookie: 'abc' },
        variantId: 'a',
        reward: 1.5,
      });
      expect(result.success).toBe(true);
    });

    it('validates variantId', async () => {
      const service = new BloomreachWeblayersService('test', TEST_API_CONFIG);
      await expect(
        service.reportReward({
          project: 'test',
          banditId: 'b-1',
          customerIds: { cookie: 'abc' },
          variantId: '',
        }),
      ).rejects.toThrow('Variant ID must not be empty');
    });
  });
});
