import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import * as core from '../index.js';

interface ServiceTriggerConditions {
  pageUrl?: string;
  events?: string[];
  customerAttributes?: Record<string, string>;
}

interface ServicePreparedAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: unknown;
}

interface TagManagerServiceInstance {
  managedTagsUrl: string;
  listTags(input?: { project?: string; status?: string }): Promise<unknown>;
  viewTag(input: { project: string; tagId: string }): Promise<unknown>;
  prepareCreateTag(input: {
    project: string;
    name: string;
    jsCode: string;
    status?: string;
    triggerConditions?: ServiceTriggerConditions;
    priority?: number;
    operatorNote?: string;
  }): ServicePreparedAction;
  prepareEnableTag(input: { project: string; tagId: string; operatorNote?: string }): ServicePreparedAction;
  prepareDisableTag(input: {
    project: string;
    tagId: string;
    operatorNote?: string;
  }): ServicePreparedAction;
  prepareEditTag(input: {
    project: string;
    tagId: string;
    name?: string;
    jsCode?: string;
    triggerConditions?: ServiceTriggerConditions;
    priority?: number;
    operatorNote?: string;
  }): ServicePreparedAction;
  prepareDeleteTag(input: { project: string; tagId: string; operatorNote?: string }): ServicePreparedAction;
}

type TagManagerServiceConstructor = new (
  project: string,
  apiConfig?: BloomreachApiConfig,
) => TagManagerServiceInstance;
type TagActionExecutor = { actionType: string; execute(input: Record<string, unknown>): Promise<unknown> };
const exported = core as unknown as Record<string, unknown>;

const CREATE_TAG_ACTION_TYPE = exported['CREATE_TAG_ACTION_TYPE'] as string;
const ENABLE_TAG_ACTION_TYPE = exported['ENABLE_TAG_ACTION_TYPE'] as string;
const DISABLE_TAG_ACTION_TYPE = exported['DISABLE_TAG_ACTION_TYPE'] as string;
const EDIT_TAG_ACTION_TYPE = exported['EDIT_TAG_ACTION_TYPE'] as string;
const DELETE_TAG_ACTION_TYPE = exported['DELETE_TAG_ACTION_TYPE'] as string;
const TAG_MANAGER_RATE_LIMIT_WINDOW_MS = exported['TAG_MANAGER_RATE_LIMIT_WINDOW_MS'] as number;
const TAG_CREATE_RATE_LIMIT = exported['TAG_CREATE_RATE_LIMIT'] as number;
const TAG_MODIFY_RATE_LIMIT = exported['TAG_MODIFY_RATE_LIMIT'] as number;
const TAG_DELETE_RATE_LIMIT = exported['TAG_DELETE_RATE_LIMIT'] as number;
const validateTagName = exported['validateTagName'] as (name: string) => string;
const validateTagId = exported['validateTagId'] as (tagId: string) => string;
const validateJsCode = exported['validateJsCode'] as (code: string) => string;
const validateTagStatus = exported['validateTagStatus'] as (status: string) => string;
const validatePageUrl = exported['validatePageUrl'] as (url: string) => string;
const validateEvents = exported['validateEvents'] as (events: string[]) => string[];
const validateCustomerAttributes = exported['validateCustomerAttributes'] as (
  attrs: Record<string, string>,
) => Record<string, string>;
const validateTriggerConditions = exported['validateTriggerConditions'] as (
  conditions: ServiceTriggerConditions,
) => ServiceTriggerConditions;
const validatePriority = exported['validatePriority'] as (priority: number) => number;
const buildManagedTagsUrl = exported['buildManagedTagsUrl'] as (project: string) => string;
const createTagManagerActionExecutors = exported['createTagManagerActionExecutors'] as (
  apiConfig?: BloomreachApiConfig,
) => Record<string, TagActionExecutor>;
const BloomreachTagManagerService = exported[
  'BloomreachTagManagerService'
] as TagManagerServiceConstructor;

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
  it('exports CREATE_TAG_ACTION_TYPE', () => {
    expect(CREATE_TAG_ACTION_TYPE).toBe('tag_manager.create_tag');
  });

  it('exports ENABLE_TAG_ACTION_TYPE', () => {
    expect(ENABLE_TAG_ACTION_TYPE).toBe('tag_manager.enable_tag');
  });

  it('exports DISABLE_TAG_ACTION_TYPE', () => {
    expect(DISABLE_TAG_ACTION_TYPE).toBe('tag_manager.disable_tag');
  });

  it('exports EDIT_TAG_ACTION_TYPE', () => {
    expect(EDIT_TAG_ACTION_TYPE).toBe('tag_manager.edit_tag');
  });

  it('exports DELETE_TAG_ACTION_TYPE', () => {
    expect(DELETE_TAG_ACTION_TYPE).toBe('tag_manager.delete_tag');
  });
});

describe('rate limit constants', () => {
  it('exports TAG_MANAGER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(TAG_MANAGER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports TAG_CREATE_RATE_LIMIT', () => {
    expect(TAG_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports TAG_MODIFY_RATE_LIMIT', () => {
    expect(TAG_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports TAG_DELETE_RATE_LIMIT', () => {
    expect(TAG_DELETE_RATE_LIMIT).toBe(10);
  });
});

describe('validateTagName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateTagName('  Product Viewed  ')).toBe('Product Viewed');
  });

  it('throws for empty string', () => {
    expect(() => validateTagName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTagName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding 200 characters', () => {
    expect(() => validateTagName('x'.repeat(201))).toThrow('must not exceed 200 characters');
  });

  it('accepts name at exactly 200 characters', () => {
    expect(validateTagName('x'.repeat(200))).toBe('x'.repeat(200));
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateTagName(' \t  Product Viewed \n ')).toBe('Product Viewed');
  });

  it('preserves internal spacing in valid name', () => {
    expect(validateTagName('Product   Viewed')).toBe('Product   Viewed');
  });

  it('accepts punctuation-heavy name after trim', () => {
    expect(validateTagName('  [GA4] Checkout Tag (v2)  ')).toBe('[GA4] Checkout Tag (v2)');
  });

  it('throws for too-long name even with surrounding whitespace', () => {
    expect(() => validateTagName(`  ${'x'.repeat(201)}  `)).toThrow('must not exceed 200 characters');
  });
});

describe('validateTagId', () => {
  it('returns trimmed ID for valid input', () => {
    expect(validateTagId('  tag-123  ')).toBe('tag-123');
  });

  it('throws for empty string', () => {
    expect(() => validateTagId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTagId('   ')).toThrow('must not be empty');
  });

  it('throws for ID exceeding 500 characters', () => {
    expect(() => validateTagId('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateTagId('tag.v2-alpha')).toBe('tag.v2-alpha');
  });

  it('returns ID containing colons', () => {
    expect(validateTagId('tag:daily:1')).toBe('tag:daily:1');
  });

  it('returns trimmed ID with mixed whitespace', () => {
    expect(validateTagId(' \n\ttag-789\t ')).toBe('tag-789');
  });

  it('returns unicode ID', () => {
    expect(validateTagId('tag-åäö')).toBe('tag-åäö');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTagId('\t')).toThrow('must not be empty');
  });

  it('throws for mixed-whitespace-only string', () => {
    expect(() => validateTagId(' \n\t ')).toThrow('must not be empty');
  });
});

describe('validateJsCode', () => {
  it('returns untrimmed code for valid input', () => {
    const code = '  function run() { return true; }  ';
    expect(validateJsCode(code)).toBe(code);
  });

  it('throws for empty code string', () => {
    expect(() => validateJsCode('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only code string', () => {
    expect(() => validateJsCode('   ')).toThrow('must not be empty');
  });

  it('throws for code exceeding 100000 characters', () => {
    expect(() => validateJsCode('x'.repeat(100_001))).toThrow('must not exceed 100000 characters');
  });

  it('returns mixed-whitespace wrapped valid code as-is', () => {
    const code = ' \t  console.log("hi") \n ';
    expect(validateJsCode(code)).toBe(code);
  });

  it('preserves internal whitespace and newlines in code', () => {
    const code = 'function run() {\n  const value = 1;\n\n  return value;\n}';
    expect(validateJsCode(code)).toBe(code);
  });

  it('throws for too-long code even with surrounding whitespace', () => {
    expect(() => validateJsCode(`  ${'x'.repeat(100_001)}  `)).toThrow(
      'must not exceed 100000 characters',
    );
  });
});

describe('validateTagStatus', () => {
  it('accepts enabled status', () => {
    expect(validateTagStatus('enabled')).toBe('enabled');
  });

  it('accepts disabled status', () => {
    expect(validateTagStatus('disabled')).toBe('disabled');
  });

  it('throws for invalid status', () => {
    expect(() => validateTagStatus('paused')).toThrow('must be one of');
  });
});

describe('validatePageUrl', () => {
  it('returns trimmed URL for valid input', () => {
    expect(validatePageUrl('  /checkout  ')).toBe('/checkout');
  });

  it('throws for empty string', () => {
    expect(() => validatePageUrl('')).toThrow('must not be empty');
  });

  it('throws for URL exceeding 2000 characters', () => {
    expect(() => validatePageUrl('x'.repeat(2001))).toThrow('must not exceed 2000 characters');
  });

  it('accepts URL with query params', () => {
    expect(validatePageUrl('/checkout?step=1')).toBe('/checkout?step=1');
  });

  it('accepts URL with hash', () => {
    expect(validatePageUrl('/page#section')).toBe('/page#section');
  });

  it('returns trimmed URL for mixed-whitespace input', () => {
    expect(validatePageUrl(' \t /checkout \n ')).toBe('/checkout');
  });
});

describe('validateEvents', () => {
  it('returns trimmed events for valid input', () => {
    expect(validateEvents(['  page_view  ', '  checkout_started  '])).toEqual([
      'page_view',
      'checkout_started',
    ]);
  });

  it('throws for empty array', () => {
    expect(() => validateEvents([])).toThrow('Events must not be empty');
  });

  it('throws for empty event string', () => {
    expect(() => validateEvents(['viewed', ''])).toThrow('must not be empty');
  });

  it('throws for event list exceeding 50 entries', () => {
    const events = Array.from({ length: 51 }, (_, i) => `event-${i}`);
    expect(() => validateEvents(events)).toThrow('must not exceed 50');
  });

  it('throws for event exceeding 200 characters', () => {
    expect(() => validateEvents(['x'.repeat(201)])).toThrow('must not exceed 200 characters');
  });

  it('throws for duplicate events', () => {
    expect(() => validateEvents(['purchase', 'purchase'])).toThrow('must be unique');
  });

  it('returns single event', () => {
    expect(validateEvents(['page_view'])).toEqual(['page_view']);
  });

  it('returns trimmed event with mixed whitespace', () => {
    expect(validateEvents([' \t page_view \n '])).toEqual(['page_view']);
  });

  it('throws for whitespace-only event', () => {
    expect(() => validateEvents([' \n\t '])).toThrow('must not be empty');
  });
});

describe('validateCustomerAttributes', () => {
  it('returns trimmed customer attributes for valid input', () => {
    expect(
      validateCustomerAttributes({
        '  tier  ': '  premium  ',
        ' region ': ' eu ',
      }),
    ).toEqual({ tier: 'premium', region: 'eu' });
  });

  it('throws for empty object', () => {
    expect(() => validateCustomerAttributes({})).toThrow('Customer attributes must not be empty');
  });

  it('throws for attributes exceeding 20 entries', () => {
    const attrs = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`key-${i}`, `value-${i}`]));
    expect(() => validateCustomerAttributes(attrs)).toThrow('must not exceed 20');
  });

  it('throws for empty key', () => {
    expect(() => validateCustomerAttributes({ '   ': 'value' })).toThrow('must not be empty');
  });

  it('throws for empty value', () => {
    expect(() => validateCustomerAttributes({ key: '   ' })).toThrow('must not be empty');
  });

  it('throws for key exceeding 200 characters', () => {
    expect(() => validateCustomerAttributes({ ['x'.repeat(201)]: 'value' })).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('throws for value exceeding 500 characters', () => {
    expect(() => validateCustomerAttributes({ key: 'x'.repeat(501) })).toThrow(
      'must not exceed 500 characters',
    );
  });

  it('returns single attribute pair', () => {
    expect(validateCustomerAttributes({ tier: 'premium' })).toEqual({ tier: 'premium' });
  });

  it('returns trimmed mixed-whitespace key/value pair', () => {
    expect(validateCustomerAttributes({ ' \t tier \n ': ' \t premium \n ' })).toEqual({
      tier: 'premium',
    });
  });
});

describe('validateTriggerConditions', () => {
  it('returns empty object when provided', () => {
    expect(validateTriggerConditions({})).toEqual({});
  });

  it('validates pageUrl when present', () => {
    expect(() => validateTriggerConditions({ pageUrl: '' })).toThrow('must not be empty');
  });

  it('validates events when present', () => {
    expect(() => validateTriggerConditions({ events: [] })).toThrow('Events must not be empty');
  });

  it('validates customerAttributes when present', () => {
    expect(() => validateTriggerConditions({ customerAttributes: {} })).toThrow(
      'Customer attributes must not be empty',
    );
  });
});

describe('validatePriority', () => {
  it('returns priority for valid input', () => {
    expect(validatePriority(100)).toBe(100);
  });

  it('throws for 0', () => {
    expect(() => validatePriority(0)).toThrow('positive integer');
  });

  it('throws for negative number', () => {
    expect(() => validatePriority(-1)).toThrow('positive integer');
  });

  it('throws for non-integer', () => {
    expect(() => validatePriority(1.5)).toThrow('positive integer');
  });

  it('throws for value exceeding 1000', () => {
    expect(() => validatePriority(1001)).toThrow('must not exceed 1000');
  });

  it('accepts value at exactly 1000', () => {
    expect(validatePriority(1000)).toBe(1000);
  });

  it('accepts priority of exactly 1', () => {
    expect(validatePriority(1)).toBe(1);
  });

  it('throws for NaN', () => {
    expect(() => validatePriority(Number.NaN)).toThrow('positive integer');
  });

  it('throws for Infinity', () => {
    expect(() => validatePriority(Number.POSITIVE_INFINITY)).toThrow('positive integer');
  });
});

describe('buildManagedTagsUrl', () => {
  it('builds URL for simple project name', () => {
    expect(buildManagedTagsUrl('my-project')).toBe('/p/my-project/data/managed-tags');
  });

  it('encodes spaces in project name', () => {
    expect(buildManagedTagsUrl('my project')).toBe('/p/my%20project/data/managed-tags');
  });

  it('encodes slashes in project name', () => {
    expect(buildManagedTagsUrl('org/project')).toBe('/p/org%2Fproject/data/managed-tags');
  });

  it('encodes unicode project name', () => {
    expect(buildManagedTagsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/data/managed-tags');
  });

  it('encodes hash in project name', () => {
    expect(buildManagedTagsUrl('my#project')).toBe('/p/my%23project/data/managed-tags');
  });

  it('encodes plus sign in project name', () => {
    expect(buildManagedTagsUrl('project+beta')).toBe('/p/project%2Bbeta/data/managed-tags');
  });
});

describe('createTagManagerActionExecutors', () => {
  it('returns executors for all 5 action types', () => {
    const executors = createTagManagerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[ENABLE_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[DISABLE_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_TAG_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createTagManagerActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw not yet implemented on execute', async () => {
    const executors = createTagManagerActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('create executor mentions UI-only in error', async () => {
    const executors = createTagManagerActionExecutors();
    await expect(executors[CREATE_TAG_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('enable executor mentions UI-only in error', async () => {
    const executors = createTagManagerActionExecutors();
    await expect(executors[ENABLE_TAG_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('disable executor mentions UI-only in error', async () => {
    const executors = createTagManagerActionExecutors();
    await expect(executors[DISABLE_TAG_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('edit executor mentions UI-only in error', async () => {
    const executors = createTagManagerActionExecutors();
    await expect(executors[EDIT_TAG_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('delete executor mentions UI-only in error', async () => {
    const executors = createTagManagerActionExecutors();
    await expect(executors[DELETE_TAG_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createTagManagerActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createTagManagerActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createTagManagerActionExecutors()).sort();
    const withConfig = Object.keys(createTagManagerActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createTagManagerActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('returns expected action keys', () => {
    const keys = Object.keys(createTagManagerActionExecutors()).sort();
    expect(keys).toEqual(
      [
        CREATE_TAG_ACTION_TYPE,
        ENABLE_TAG_ACTION_TYPE,
        DISABLE_TAG_ACTION_TYPE,
        EDIT_TAG_ACTION_TYPE,
        DELETE_TAG_ACTION_TYPE,
      ].sort(),
    );
  });

  it('returns new executor instances on each call', () => {
    const first = createTagManagerActionExecutors(TEST_API_CONFIG);
    const second = createTagManagerActionExecutors(TEST_API_CONFIG);
    expect(first[CREATE_TAG_ACTION_TYPE]).not.toBe(second[CREATE_TAG_ACTION_TYPE]);
    expect(first[ENABLE_TAG_ACTION_TYPE]).not.toBe(second[ENABLE_TAG_ACTION_TYPE]);
    expect(first[DISABLE_TAG_ACTION_TYPE]).not.toBe(second[DISABLE_TAG_ACTION_TYPE]);
    expect(first[EDIT_TAG_ACTION_TYPE]).not.toBe(second[EDIT_TAG_ACTION_TYPE]);
    expect(first[DELETE_TAG_ACTION_TYPE]).not.toBe(second[DELETE_TAG_ACTION_TYPE]);
  });

  it('all executors mention UI-only guidance with apiConfig', async () => {
    const executors = createTagManagerActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('uses independent executor maps for configured and unconfigured calls', () => {
    const withoutConfig = createTagManagerActionExecutors();
    const withConfig = createTagManagerActionExecutors(TEST_API_CONFIG);
    expect(withoutConfig).not.toBe(withConfig);
  });

  it('supports custom apiConfig values without changing key set', () => {
    const executors = createTagManagerActionExecutors({
      ...TEST_API_CONFIG,
      baseUrl: 'https://api-alt.test.com',
      projectToken: 'another-token',
    });

    expect(Object.keys(executors).sort()).toEqual(
      [
        CREATE_TAG_ACTION_TYPE,
        ENABLE_TAG_ACTION_TYPE,
        DISABLE_TAG_ACTION_TYPE,
        EDIT_TAG_ACTION_TYPE,
        DELETE_TAG_ACTION_TYPE,
      ].sort(),
    );
  });
});

describe('BloomreachTagManagerService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachTagManagerService('my-project');
      expect(service).toBeInstanceOf(BloomreachTagManagerService);
    });

    it('exposes managedTagsUrl', () => {
      const service = new BloomreachTagManagerService('my-project');
      expect(service.managedTagsUrl).toBe('/p/my-project/data/managed-tags');
    });

    it('trims project name', () => {
      const service = new BloomreachTagManagerService('  my-project  ');
      expect(service.managedTagsUrl).toBe('/p/my-project/data/managed-tags');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachTagManagerService('')).toThrow('must not be empty');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachTagManagerService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachTagManagerService);
    });

    it('exposes managedTagsUrl when constructed with apiConfig', () => {
      const service = new BloomreachTagManagerService('test', TEST_API_CONFIG);
      expect(service.managedTagsUrl).toBe('/p/test/data/managed-tags');
    });

    it('encodes unicode project name in constructor URL', () => {
      const service = new BloomreachTagManagerService('projekt åäö');
      expect(service.managedTagsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/data/managed-tags');
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachTagManagerService('my#project');
      expect(service.managedTagsUrl).toBe('/p/my%23project/data/managed-tags');
    });

    it('trims and encodes unicode project in constructor URL', () => {
      const service = new BloomreachTagManagerService('  projekt åäö  ');
      expect(service.managedTagsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/data/managed-tags');
    });

    it('encodes plus sign in constructor URL', () => {
      const service = new BloomreachTagManagerService('project+beta');
      expect(service.managedTagsUrl).toBe('/p/project%2Bbeta/data/managed-tags');
    });

    it('returns stable managedTagsUrl with apiConfig across reads', () => {
      const service = new BloomreachTagManagerService('alpha', TEST_API_CONFIG);
      expect(service.managedTagsUrl).toBe('/p/alpha/data/managed-tags');
      expect(service.managedTagsUrl).toBe('/p/alpha/data/managed-tags');
    });
  });

  describe('listTags', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachTagManagerService('test', TEST_API_CONFIG);
      await expect(service.listTags()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for unicode project override', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags({ project: 'projekt åäö' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('validates status when input is provided', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags({ project: 'test', status: 'paused' })).rejects.toThrow(
        'must be one of',
      );
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags({ project: '', status: 'enabled' })).rejects.toThrow(
        'must not be empty',
      );
    });
  });

  describe('viewTag', () => {
    it('throws no-API-endpoint error with valid input', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: 'test', tagId: 'tag-1' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachTagManagerService('test', TEST_API_CONFIG);
      await expect(service.viewTag({ project: 'test', tagId: 'tag-1' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error with trimmed project and tagId', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: '  test  ', tagId: '  tag-1  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for encoded-looking tagId', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: 'test', tagId: 'tag%2Fencoded' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('accepts trimmed tagId and reaches no-API-endpoint error', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: 'test', tagId: '  tag-99  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('validates tagId', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: 'test', tagId: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates project', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: '', tagId: 'tag-1' })).rejects.toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateTag', () => {
    it('returns prepared action with all fields', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareCreateTag({
        project: 'test',
        name: '  Checkout Tag  ',
        jsCode: '  window.__track = true;  ',
        triggerConditions: {
          pageUrl: '  /checkout  ',
          events: ['  checkout_started  '],
          customerAttributes: { '  tier  ': '  premium  ' },
        },
        priority: 10,
        operatorNote: 'Create checkout tracking tag',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.create_tag',
          project: 'test',
          name: 'Checkout Tag',
          jsCode: '  window.__track = true;  ',
          triggerConditions: {
            pageUrl: '/checkout',
            events: ['checkout_started'],
            customerAttributes: { tier: 'premium' },
          },
          priority: 10,
          operatorNote: 'Create checkout tracking tag',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareCreateTag({
          project: 'test',
          name: '',
          jsCode: 'window.__track = true;',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty jsCode', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareCreateTag({
          project: 'test',
          name: 'Checkout Tag',
          jsCode: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid priority', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareCreateTag({
          project: 'test',
          name: 'Checkout Tag',
          jsCode: 'window.__track = true;',
          priority: 0,
        }),
      ).toThrow('positive integer');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareCreateTag({
          project: '',
          name: 'Checkout Tag',
          jsCode: 'window.__track = true;',
        }),
      ).toThrow('must not be empty');
    });

    it('validates trigger conditions', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareCreateTag({
          project: 'test',
          name: 'Checkout Tag',
          jsCode: 'window.__track = true;',
          triggerConditions: { events: [] },
        }),
      ).toThrow('Events must not be empty');
    });

    it('returns prepared action without optional fields', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareCreateTag({
        project: 'test',
        name: 'Checkout Tag',
        jsCode: 'window.__track = true;',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.create_tag',
          project: 'test',
          name: 'Checkout Tag',
          jsCode: 'window.__track = true;',
          triggerConditions: undefined,
          priority: undefined,
          operatorNote: undefined,
        }),
      );
    });

    it('handles minimal valid input', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareCreateTag({
        project: 'test',
        name: 'A',
        jsCode: 'x',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.create_tag',
          project: 'test',
          name: 'A',
          jsCode: 'x',
        }),
      );
    });
  });

  describe('prepareEnableTag', () => {
    it('returns prepared action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareEnableTag({
        project: 'test',
        tagId: '  tag-100  ',
        operatorNote: 'Enable for rollout',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.enable_tag',
          project: 'test',
          tagId: 'tag-100',
          operatorNote: 'Enable for rollout',
        }),
      );
    });

    it('throws for empty tagId', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEnableTag({
          project: 'test',
          tagId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEnableTag({
          project: '',
          tagId: 'tag-100',
        }),
      ).toThrow('must not be empty');
    });

    it('returns prepared action without operatorNote', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareEnableTag({
        project: 'test',
        tagId: 'tag-100',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.enable_tag',
          project: 'test',
          tagId: 'tag-100',
          operatorNote: undefined,
        }),
      );
    });

    it('includes expected preview fields for enable action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareEnableTag({
        project: 'test',
        tagId: 'tag-101',
      });

      expect(Object.keys(result.preview as Record<string, unknown>).sort()).toEqual(
        ['action', 'operatorNote', 'project', 'tagId'].sort(),
      );
    });
  });

  describe('prepareDisableTag', () => {
    it('returns prepared action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDisableTag({
        project: 'test',
        tagId: '  tag-200  ',
        operatorNote: 'Disable for maintenance',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.disable_tag',
          project: 'test',
          tagId: 'tag-200',
          operatorNote: 'Disable for maintenance',
        }),
      );
    });

    it('throws for empty tagId', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareDisableTag({
          project: 'test',
          tagId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareDisableTag({
          project: '',
          tagId: 'tag-200',
        }),
      ).toThrow('must not be empty');
    });

    it('returns prepared action without operatorNote', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDisableTag({
        project: 'test',
        tagId: 'tag-200',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.disable_tag',
          project: 'test',
          tagId: 'tag-200',
          operatorNote: undefined,
        }),
      );
    });

    it('includes expected preview fields for disable action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDisableTag({
        project: 'test',
        tagId: 'tag-201',
      });

      expect(Object.keys(result.preview as Record<string, unknown>).sort()).toEqual(
        ['action', 'operatorNote', 'project', 'tagId'].sort(),
      );
    });
  });

  describe('prepareEditTag', () => {
    it('returns prepared action and validates optional fields', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareEditTag({
        project: 'test',
        tagId: '  tag-300  ',
        name: '  Updated Tag  ',
        jsCode: '  console.log("updated");  ',
        priority: 20,
        operatorNote: 'Update tag details',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.edit_tag',
          project: 'test',
          tagId: 'tag-300',
          name: 'Updated Tag',
          jsCode: '  console.log("updated");  ',
          priority: 20,
          operatorNote: 'Update tag details',
        }),
      );
    });

    it('throws for empty tagId', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: 'test',
          tagId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: '',
          tagId: 'tag-300',
        }),
      ).toThrow('must not be empty');
    });

    it('validates optional name', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: 'test',
          tagId: 'tag-300',
          name: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('validates optional jsCode', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: 'test',
          tagId: 'tag-300',
          jsCode: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('validates optional priority', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: 'test',
          tagId: 'tag-300',
          priority: 1001,
        }),
      ).toThrow('must not exceed 1000');
    });

    it('returns prepared action with only tagId', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareEditTag({
        project: 'test',
        tagId: 'tag-300',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.edit_tag',
          project: 'test',
          tagId: 'tag-300',
          name: undefined,
          jsCode: undefined,
          triggerConditions: undefined,
          priority: undefined,
          operatorNote: undefined,
        }),
      );
    });

    it('validates triggerConditions in edit', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareEditTag({
          project: 'test',
          tagId: 'tag-300',
          triggerConditions: { events: [] },
        }),
      ).toThrow('Events must not be empty');
    });
  });

  describe('prepareDeleteTag', () => {
    it('returns prepared action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDeleteTag({
        project: 'test',
        tagId: '  tag-400  ',
        operatorNote: 'Remove stale tag',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.delete_tag',
          project: 'test',
          tagId: 'tag-400',
          operatorNote: 'Remove stale tag',
        }),
      );
    });

    it('throws for empty tagId', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareDeleteTag({
          project: 'test',
          tagId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTagManagerService('test');
      expect(() =>
        service.prepareDeleteTag({
          project: '',
          tagId: 'tag-400',
        }),
      ).toThrow('must not be empty');
    });

    it('returns prepared action without operatorNote', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDeleteTag({
        project: 'test',
        tagId: 'tag-400',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tag_manager.delete_tag',
          project: 'test',
          tagId: 'tag-400',
          operatorNote: undefined,
        }),
      );
    });

    it('includes expected preview fields for delete action', () => {
      const service = new BloomreachTagManagerService('test');
      const result = service.prepareDeleteTag({
        project: 'test',
        tagId: 'tag-401',
      });

      expect(Object.keys(result.preview as Record<string, unknown>).sort()).toEqual(
        ['action', 'operatorNote', 'project', 'tagId'].sort(),
      );
    });
  });
});
