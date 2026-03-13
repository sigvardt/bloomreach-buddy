import { describe, it, expect } from 'vitest';
import {
  CREATE_SEGMENTATION_ACTION_TYPE,
  CLONE_SEGMENTATION_ACTION_TYPE,
  ARCHIVE_SEGMENTATION_ACTION_TYPE,
  SEGMENTATION_RATE_LIMIT_WINDOW_MS,
  SEGMENTATION_CREATE_RATE_LIMIT,
  SEGMENTATION_MODIFY_RATE_LIMIT,
  SEGMENT_CONDITION_TYPES,
  SEGMENT_CONDITION_OPERATORS,
  SEGMENT_LOGICAL_OPERATORS,
  validateSegmentationName,
  validateSegmentationId,
  validateSegmentConditionType,
  validateSegmentConditionOperator,
  validateLogicalOperator,
  validateSegmentConditions,
  validateCustomerListLimit,
  validateCustomerListOffset,
  buildSegmentationsUrl,
  createSegmentationActionExecutors,
  BloomreachSegmentationsService,
} from '../index.js';
import type { SegmentCondition } from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_SEGMENTATION_ACTION_TYPE', () => {
    expect(CREATE_SEGMENTATION_ACTION_TYPE).toBe('segmentations.create_segmentation');
  });

  it('exports CLONE_SEGMENTATION_ACTION_TYPE', () => {
    expect(CLONE_SEGMENTATION_ACTION_TYPE).toBe('segmentations.clone_segmentation');
  });

  it('exports ARCHIVE_SEGMENTATION_ACTION_TYPE', () => {
    expect(ARCHIVE_SEGMENTATION_ACTION_TYPE).toBe('segmentations.archive_segmentation');
  });
});

describe('rate limit constants', () => {
  it('exports SEGMENTATION_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(SEGMENTATION_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports SEGMENTATION_CREATE_RATE_LIMIT', () => {
    expect(SEGMENTATION_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports SEGMENTATION_MODIFY_RATE_LIMIT', () => {
    expect(SEGMENTATION_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('segment condition constants', () => {
  it('exports SEGMENT_CONDITION_TYPES in expected order', () => {
    expect(SEGMENT_CONDITION_TYPES).toEqual(['customer_attribute', 'event', 'behavior']);
  });

  it('exports SEGMENT_CONDITION_OPERATORS in expected order', () => {
    expect(SEGMENT_CONDITION_OPERATORS).toEqual([
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'greater_than',
      'less_than',
      'greater_or_equal',
      'less_or_equal',
      'is_set',
      'is_not_set',
      'in',
      'not_in',
    ]);
  });

  it('exports SEGMENT_LOGICAL_OPERATORS', () => {
    expect(SEGMENT_LOGICAL_OPERATORS).toEqual(['and', 'or']);
  });

  it('includes customer_attribute in SEGMENT_CONDITION_TYPES', () => {
    expect(SEGMENT_CONDITION_TYPES).toContain('customer_attribute');
  });

  it('includes event in SEGMENT_CONDITION_TYPES', () => {
    expect(SEGMENT_CONDITION_TYPES).toContain('event');
  });

  it('includes behavior in SEGMENT_CONDITION_TYPES', () => {
    expect(SEGMENT_CONDITION_TYPES).toContain('behavior');
  });

  it('includes is_set in SEGMENT_CONDITION_OPERATORS', () => {
    expect(SEGMENT_CONDITION_OPERATORS).toContain('is_set');
  });

  it('includes not_in in SEGMENT_CONDITION_OPERATORS', () => {
    expect(SEGMENT_CONDITION_OPERATORS).toContain('not_in');
  });

  it('contains exactly two logical operators', () => {
    expect(SEGMENT_LOGICAL_OPERATORS).toHaveLength(2);
  });
});

describe('validateSegmentationName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateSegmentationName('  VIP Customers  ')).toBe('VIP Customers');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateSegmentationName('\n\tHigh LTV\t\n')).toBe('High LTV');
  });

  it('accepts single-character name', () => {
    expect(validateSegmentationName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateSegmentationName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateSegmentationName('Segment: Engaged Users v2')).toBe('Segment: Engaged Users v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateSegmentationName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateSegmentationName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSegmentationName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateSegmentationName('\t\t')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateSegmentationName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateSegmentationId', () => {
  it('returns trimmed segmentation ID for valid input', () => {
    expect(validateSegmentationId('  seg-123  ')).toBe('seg-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateSegmentationId('seg-456')).toBe('seg-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateSegmentationId('seg/team/a')).toBe('seg/team/a');
  });

  it('throws for empty string', () => {
    expect(() => validateSegmentationId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSegmentationId('   ')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateSegmentationId('\n')).toThrow('must not be empty');
  });
});

describe('validateSegmentConditionType', () => {
  it('accepts customer_attribute condition type', () => {
    expect(validateSegmentConditionType('customer_attribute')).toBe('customer_attribute');
  });

  it('accepts event condition type', () => {
    expect(validateSegmentConditionType('event')).toBe('event');
  });

  it('accepts behavior condition type', () => {
    expect(validateSegmentConditionType('behavior')).toBe('behavior');
  });

  it('throws for uppercase condition type', () => {
    expect(() => validateSegmentConditionType('EVENT')).toThrow('Invalid condition type');
  });

  it('throws for empty condition type', () => {
    expect(() => validateSegmentConditionType('')).toThrow('Invalid condition type');
  });

  it('throws for unknown condition type', () => {
    expect(() => validateSegmentConditionType('profile')).toThrow('Invalid condition type');
  });
});

describe('validateSegmentConditionOperator', () => {
  it('accepts equals operator', () => {
    expect(validateSegmentConditionOperator('equals')).toBe('equals');
  });

  it('accepts not_equals operator', () => {
    expect(validateSegmentConditionOperator('not_equals')).toBe('not_equals');
  });

  it('accepts contains operator', () => {
    expect(validateSegmentConditionOperator('contains')).toBe('contains');
  });

  it('accepts not_contains operator', () => {
    expect(validateSegmentConditionOperator('not_contains')).toBe('not_contains');
  });

  it('accepts greater_than operator', () => {
    expect(validateSegmentConditionOperator('greater_than')).toBe('greater_than');
  });

  it('accepts less_than operator', () => {
    expect(validateSegmentConditionOperator('less_than')).toBe('less_than');
  });

  it('accepts greater_or_equal operator', () => {
    expect(validateSegmentConditionOperator('greater_or_equal')).toBe('greater_or_equal');
  });

  it('accepts less_or_equal operator', () => {
    expect(validateSegmentConditionOperator('less_or_equal')).toBe('less_or_equal');
  });

  it('accepts is_set operator', () => {
    expect(validateSegmentConditionOperator('is_set')).toBe('is_set');
  });

  it('accepts is_not_set operator', () => {
    expect(validateSegmentConditionOperator('is_not_set')).toBe('is_not_set');
  });

  it('accepts in operator', () => {
    expect(validateSegmentConditionOperator('in')).toBe('in');
  });

  it('accepts not_in operator', () => {
    expect(validateSegmentConditionOperator('not_in')).toBe('not_in');
  });

  it('throws for empty operator', () => {
    expect(() => validateSegmentConditionOperator('')).toThrow('Invalid condition operator');
  });

  it('throws for unknown operator', () => {
    expect(() => validateSegmentConditionOperator('between')).toThrow('Invalid condition operator');
  });
});

describe('validateLogicalOperator', () => {
  it('accepts and', () => {
    expect(validateLogicalOperator('and')).toBe('and');
  });

  it('accepts or', () => {
    expect(validateLogicalOperator('or')).toBe('or');
  });

  it('throws for uppercase logical operator', () => {
    expect(() => validateLogicalOperator('AND')).toThrow('Invalid logical operator');
  });

  it('throws for empty logical operator', () => {
    expect(() => validateLogicalOperator('')).toThrow('Invalid logical operator');
  });

  it('throws for unknown logical operator', () => {
    expect(() => validateLogicalOperator('xor')).toThrow('Invalid logical operator');
  });
});

describe('validateSegmentConditions', () => {
  it('accepts one valid condition', () => {
    const conditions: SegmentCondition[] = [
      { type: 'customer_attribute', attribute: 'email', operator: 'is_set' },
    ];
    expect(validateSegmentConditions(conditions)).toEqual(conditions);
  });

  it('accepts two valid conditions', () => {
    const conditions: SegmentCondition[] = [
      { type: 'customer_attribute', attribute: 'email', operator: 'is_set' },
      { type: 'event', attribute: 'purchase', operator: 'equals', value: 'true' },
    ];
    expect(validateSegmentConditions(conditions)).toEqual(conditions);
  });

  it('returns validated conditions array', () => {
    const conditions: SegmentCondition[] = [
      { type: 'customer_attribute', attribute: 'email', operator: 'is_set' },
      { type: 'behavior', attribute: 'last_seen_days', operator: 'less_than', value: '30' },
    ];
    const result = validateSegmentConditions(conditions);
    expect(result).toEqual(conditions);
  });

  it('trims condition attribute values', () => {
    const conditions: SegmentCondition[] = [
      {
        type: 'customer_attribute',
        attribute: '  email  ',
        operator: 'is_set',
      },
    ];
    expect(validateSegmentConditions(conditions)).toEqual([
      { type: 'customer_attribute', attribute: 'email', operator: 'is_set', value: undefined },
    ]);
  });

  it('keeps value when provided', () => {
    const conditions: SegmentCondition[] = [
      { type: 'event', attribute: 'purchase', operator: 'equals', value: 'true' },
    ];
    expect(validateSegmentConditions(conditions)).toEqual(conditions);
  });

  it('keeps undefined value when omitted', () => {
    const conditions: SegmentCondition[] = [
      {
        type: 'customer_attribute',
        attribute: 'email',
        operator: 'is_not_set',
      },
    ];
    expect(validateSegmentConditions(conditions)).toEqual([
      {
        type: 'customer_attribute',
        attribute: 'email',
        operator: 'is_not_set',
        value: undefined,
      },
    ]);
  });

  it('throws for empty conditions array', () => {
    expect(() => validateSegmentConditions([])).toThrow('at least one segment condition');
  });

  it('throws for whitespace-only attribute', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: '   ',
          operator: 'is_set',
        },
      ]),
    ).toThrow('conditions[0].attribute must not be empty');
  });

  it('throws for tab-only attribute', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: '\t',
          operator: 'is_set',
        },
      ]),
    ).toThrow('conditions[0].attribute must not be empty');
  });

  it('throws for invalid condition type', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'unknown',
          attribute: 'email',
          operator: 'is_set',
        } as unknown as SegmentCondition,
      ]),
    ).toThrow('Invalid condition type');
  });

  it('throws for invalid condition operator', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: 'email',
          operator: 'between',
        } as unknown as SegmentCondition,
      ]),
    ).toThrow('Invalid condition operator');
  });

  it('throws for invalid type in second condition', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: 'email',
          operator: 'is_set',
        },
        {
          type: 'invalid',
          attribute: 'purchase',
          operator: 'equals',
          value: 'true',
        } as unknown as SegmentCondition,
      ]),
    ).toThrow('Invalid condition type');
  });

  it('throws for invalid operator in second condition', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: 'email',
          operator: 'is_set',
        },
        {
          type: 'event',
          attribute: 'purchase',
          operator: 'random_operator',
          value: 'true',
        } as unknown as SegmentCondition,
      ]),
    ).toThrow('Invalid condition operator');
  });

  it('throws for empty attribute in second condition', () => {
    expect(() =>
      validateSegmentConditions([
        {
          type: 'customer_attribute',
          attribute: 'email',
          operator: 'is_set',
        },
        {
          type: 'event',
          attribute: '   ',
          operator: 'equals',
          value: 'true',
        },
      ]),
    ).toThrow('conditions[1].attribute must not be empty');
  });
});

describe('validateCustomerListLimit', () => {
  it('returns undefined when limit is undefined', () => {
    expect(validateCustomerListLimit(undefined)).toBeUndefined();
  });

  it('accepts positive integer limit', () => {
    expect(validateCustomerListLimit(1)).toBe(1);
  });

  it('accepts typical positive integer limit', () => {
    expect(validateCustomerListLimit(100)).toBe(100);
  });

  it('accepts large positive integer limit', () => {
    expect(validateCustomerListLimit(10_000)).toBe(10_000);
  });

  it('throws for zero limit', () => {
    expect(() => validateCustomerListLimit(0)).toThrow('positive integer');
  });

  it('throws for negative limit', () => {
    expect(() => validateCustomerListLimit(-1)).toThrow('positive integer');
  });

  it('throws for decimal limit', () => {
    expect(() => validateCustomerListLimit(1.5)).toThrow('positive integer');
  });

  it('throws for NaN limit', () => {
    expect(() => validateCustomerListLimit(Number.NaN)).toThrow('positive integer');
  });

  it('throws for positive infinity limit', () => {
    expect(() => validateCustomerListLimit(Number.POSITIVE_INFINITY)).toThrow('positive integer');
  });
});

describe('validateCustomerListOffset', () => {
  it('returns undefined when offset is undefined', () => {
    expect(validateCustomerListOffset(undefined)).toBeUndefined();
  });

  it('accepts zero offset', () => {
    expect(validateCustomerListOffset(0)).toBe(0);
  });

  it('accepts positive integer offset', () => {
    expect(validateCustomerListOffset(1)).toBe(1);
  });

  it('accepts large positive integer offset', () => {
    expect(validateCustomerListOffset(50_000)).toBe(50_000);
  });

  it('throws for negative offset', () => {
    expect(() => validateCustomerListOffset(-1)).toThrow('non-negative integer');
  });

  it('throws for decimal offset', () => {
    expect(() => validateCustomerListOffset(0.5)).toThrow('non-negative integer');
  });

  it('throws for NaN offset', () => {
    expect(() => validateCustomerListOffset(Number.NaN)).toThrow('non-negative integer');
  });

  it('throws for positive infinity offset', () => {
    expect(() => validateCustomerListOffset(Number.POSITIVE_INFINITY)).toThrow(
      'non-negative integer',
    );
  });
});

describe('buildSegmentationsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildSegmentationsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/analytics/segmentations',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildSegmentationsUrl('my project')).toBe('/p/my%20project/analytics/segmentations');
  });

  it('encodes slashes in project name', () => {
    expect(buildSegmentationsUrl('org/project')).toBe('/p/org%2Fproject/analytics/segmentations');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildSegmentationsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/segmentations',
    );
  });

  it('encodes hash character in project name', () => {
    expect(buildSegmentationsUrl('my#project')).toBe('/p/my%23project/analytics/segmentations');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildSegmentationsUrl('team-alpha')).toBe('/p/team-alpha/analytics/segmentations');
  });
});

describe('createSegmentationActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createSegmentationActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_SEGMENTATION_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_SEGMENTATION_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_SEGMENTATION_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createSegmentationActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createSegmentationActionExecutors();
    await expect(executors[CREATE_SEGMENTATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('clone executor throws "not yet implemented" on execute', async () => {
    const executors = createSegmentationActionExecutors();
    await expect(executors[CLONE_SEGMENTATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createSegmentationActionExecutors();
    await expect(executors[ARCHIVE_SEGMENTATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });
});

describe('BloomreachSegmentationsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachSegmentationsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachSegmentationsService);
    });

    it('exposes the segmentations URL', () => {
      const service = new BloomreachSegmentationsService('kingdom-of-joakim');
      expect(service.segmentationsUrl).toBe('/p/kingdom-of-joakim/analytics/segmentations');
    });

    it('trims project name', () => {
      const service = new BloomreachSegmentationsService('  my-project  ');
      expect(service.segmentationsUrl).toBe('/p/my-project/analytics/segmentations');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachSegmentationsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachSegmentationsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachSegmentationsService('org/project');
      expect(service.segmentationsUrl).toBe('/p/org%2Fproject/analytics/segmentations');
    });
  });

  describe('listSegmentations', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(service.listSegmentations()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(service.listSegmentations({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(service.listSegmentations({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws not-yet-implemented error for valid project override', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(service.listSegmentations({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'not yet implemented',
      );
    });

    it('throws not-yet-implemented error for trimmed project override', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(service.listSegmentations({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'not yet implemented',
      );
    });
  });

  describe('viewSegmentSize', () => {
    it('throws not-yet-implemented error with valid minimal input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: 'test', segmentationId: 'seg-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('throws not-yet-implemented error with valid full input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({
          project: '  test  ',
          segmentationId: '  seg-1  ',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: '', segmentationId: 'seg-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: '   ', segmentationId: 'seg-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates segmentationId input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: 'test', segmentationId: '   ' }),
      ).rejects.toThrow('Segmentation ID must not be empty');
    });

    it('validates empty segmentationId input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: 'test', segmentationId: '' }),
      ).rejects.toThrow('Segmentation ID must not be empty');
    });

    it('validates newline-only segmentationId input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: 'test', segmentationId: '\n' }),
      ).rejects.toThrow('Segmentation ID must not be empty');
    });

    it('accepts trimmed segmentationId and reaches not-yet-implemented', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentSize({ project: 'test', segmentationId: '  seg-99  ' }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('viewSegmentCustomers', () => {
    it('throws not-yet-implemented error with valid minimal input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('throws not-yet-implemented error with valid full input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({
          project: 'test',
          segmentationId: 'seg-1',
          limit: 50,
          offset: 10,
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: '', segmentationId: 'seg-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: '   ', segmentationId: 'seg-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates empty segmentationId input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: '' }),
      ).rejects.toThrow('Segmentation ID must not be empty');
    });

    it('validates whitespace-only segmentationId input', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: '   ' }),
      ).rejects.toThrow('Segmentation ID must not be empty');
    });

    it('validates limit when zero', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1', limit: 0 }),
      ).rejects.toThrow('positive integer');
    });

    it('validates limit when negative', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1', limit: -10 }),
      ).rejects.toThrow('positive integer');
    });

    it('validates limit when decimal', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1', limit: 5.5 }),
      ).rejects.toThrow('positive integer');
    });

    it('validates offset when negative', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1', offset: -1 }),
      ).rejects.toThrow('non-negative integer');
    });

    it('validates offset when decimal', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({ project: 'test', segmentationId: 'seg-1', offset: 1.1 }),
      ).rejects.toThrow('non-negative integer');
    });

    it('accepts undefined limit and offset and reaches not-yet-implemented', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({
          project: 'test',
          segmentationId: 'seg-1',
          limit: undefined,
          offset: undefined,
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('accepts valid limit and offset and reaches not-yet-implemented', async () => {
      const service = new BloomreachSegmentationsService('test');
      await expect(
        service.viewSegmentCustomers({
          project: 'test',
          segmentationId: 'seg-1',
          limit: 1,
          offset: 0,
        }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareCreateSegmentation', () => {
    it('returns a prepared action with valid minimal input', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'High Intent Buyers',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'segmentations.create_segmentation',
          project: 'test',
          name: 'High Intent Buyers',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
              value: undefined,
            },
          ],
          logicalOperator: 'and',
        }),
      );
    });

    it('returns a prepared action with two valid conditions', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'Purchasers with Email',
        conditions: [
          { type: 'customer_attribute', attribute: 'email', operator: 'is_set' },
          { type: 'event', attribute: 'purchase', operator: 'equals', value: 'true' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Purchasers with Email',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
              value: undefined,
            },
            {
              type: 'event',
              attribute: 'purchase',
              operator: 'equals',
              value: 'true',
            },
          ],
        }),
      );
    });

    it('includes dateRange in preview when provided', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'Date Filtered Segment',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'Segment With Note',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        operatorNote: 'Create before campaign launch',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create before campaign launch',
        }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: '  my-project  ',
        name: '  My Segment  ',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'My Segment',
        }),
      );
    });

    it('trims attributes in conditions in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'Trimmed Attribute Segment',
        conditions: [
          {
            type: 'customer_attribute',
            attribute: '  email  ',
            operator: 'is_set',
          },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
              value: undefined,
            },
          ],
        }),
      );
    });

    it('defaults logicalOperator to and when omitted', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'Default Logic Segment',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          logicalOperator: 'and',
        }),
      );
    });

    it('uses provided logicalOperator or', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'OR Segment',
        conditions: [
          { type: 'customer_attribute', attribute: 'email', operator: 'is_set' },
          { type: 'event', attribute: 'purchase', operator: 'equals', value: 'true' },
        ],
        logicalOperator: 'or',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          logicalOperator: 'or',
        }),
      );
    });

    it('includes undefined dateRange in preview when omitted', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: 'No Date Range Segment',
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          dateRange: undefined,
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: '',
          conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: '   ',
          conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'x'.repeat(201),
          conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachSegmentationsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateSegmentation({
        project: 'test',
        name: maxName,
        conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: '',
          name: 'Segment',
          conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: '   ',
          name: 'Segment',
          conditions: [{ type: 'customer_attribute', attribute: 'email', operator: 'is_set' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws when conditions is empty', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [],
        }),
      ).toThrow('at least one segment condition');
    });

    it('throws when conditions include invalid type', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'wrong',
              attribute: 'email',
              operator: 'is_set',
            } as unknown as SegmentCondition,
          ],
        }),
      ).toThrow('Invalid condition type');
    });

    it('throws when conditions include invalid operator', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'not_real_operator',
            } as unknown as SegmentCondition,
          ],
        }),
      ).toThrow('Invalid condition operator');
    });

    it('throws when conditions include empty attribute', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: '   ',
              operator: 'is_set',
            },
          ],
        }),
      ).toThrow('attribute must not be empty');
    });

    it('throws when logicalOperator is invalid', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
            },
          ],
          logicalOperator: 'xor' as 'and',
        }),
      ).toThrow('Invalid logical operator');
    });

    it('throws when dateRange startDate has invalid format', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
            },
          ],
          dateRange: { startDate: '2025/01/01' },
        }),
      ).toThrow('must be a valid ISO-8601 date');
    });

    it('throws when dateRange endDate has invalid format', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
            },
          ],
          dateRange: { endDate: '2025-13-01' },
        }),
      ).toThrow('not a valid calendar date');
    });

    it('throws when dateRange startDate is after endDate', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCreateSegmentation({
          project: 'test',
          name: 'Segment',
          conditions: [
            {
              type: 'customer_attribute',
              attribute: 'email',
              operator: 'is_set',
            },
          ],
          dateRange: { startDate: '2025-02-01', endDate: '2025-01-31' },
        }),
      ).toThrow('must not be after');
    });
  });

  describe('prepareCloneSegmentation', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: 'seg-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'segmentations.clone_segmentation',
          project: 'test',
          segmentationId: 'seg-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: 'seg-789',
        newName: '  Cloned Segment  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Segment',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: 'seg-789',
        operatorNote: 'Clone for lifecycle campaign',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for lifecycle campaign',
        }),
      );
    });

    it('trims segmentationId in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: '  seg-789  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          segmentationId: 'seg-789',
        }),
      );
    });

    it('throws for empty segmentationId', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: 'test',
          segmentationId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only segmentationId', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: 'test',
          segmentationId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: '',
          segmentationId: 'seg-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: '   ',
          segmentationId: 'seg-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: 'test',
          segmentationId: 'seg-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareCloneSegmentation({
          project: 'test',
          segmentationId: 'seg-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachSegmentationsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: 'seg-789',
        newName,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName,
        }),
      );
    });

    it('keeps newName undefined when omitted', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareCloneSegmentation({
        project: 'test',
        segmentationId: 'seg-789',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: undefined,
        }),
      );
    });
  });

  describe('prepareArchiveSegmentation', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareArchiveSegmentation({
        project: 'test',
        segmentationId: 'seg-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'segmentations.archive_segmentation',
          project: 'test',
          segmentationId: 'seg-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareArchiveSegmentation({
        project: 'test',
        segmentationId: 'seg-900',
        operatorNote: 'Archive obsolete segment',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive obsolete segment',
        }),
      );
    });

    it('throws for empty segmentationId', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareArchiveSegmentation({
          project: 'test',
          segmentationId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only segmentationId', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareArchiveSegmentation({
          project: 'test',
          segmentationId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareArchiveSegmentation({
          project: '',
          segmentationId: 'seg-900',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachSegmentationsService('test');
      expect(() =>
        service.prepareArchiveSegmentation({
          project: '   ',
          segmentationId: 'seg-900',
        }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed segmentationId and reaches prepared state', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareArchiveSegmentation({
        project: 'test',
        segmentationId: '  seg-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          segmentationId: 'seg-900',
        }),
      );
    });

    it('keeps operatorNote undefined when omitted', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareArchiveSegmentation({
        project: 'test',
        segmentationId: 'seg-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: undefined,
        }),
      );
    });

    it('returns expiry in the future', () => {
      const service = new BloomreachSegmentationsService('test');
      const result = service.prepareArchiveSegmentation({
        project: 'test',
        segmentationId: 'seg-900',
      });

      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
