import { describe, it, expect } from 'vitest';
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
    priority?: number;
    operatorNote?: string;
  }): ServicePreparedAction;
  prepareDeleteTag(input: { project: string; tagId: string; operatorNote?: string }): ServicePreparedAction;
}

type TagManagerServiceConstructor = new (project: string) => TagManagerServiceInstance;
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
const createTagManagerActionExecutors = exported['createTagManagerActionExecutors'] as () => Record<
  string,
  TagActionExecutor
>;
const BloomreachTagManagerService = exported[
  'BloomreachTagManagerService'
] as TagManagerServiceConstructor;

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
  });

  describe('listTags', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.listTags()).rejects.toThrow('not yet implemented');
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
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachTagManagerService('test');
      await expect(service.viewTag({ project: 'test', tagId: 'tag-1' })).rejects.toThrow(
        'not yet implemented',
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
  });
});
