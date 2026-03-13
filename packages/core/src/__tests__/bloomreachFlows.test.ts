import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_FLOW_ACTION_TYPE,
  CLONE_FLOW_ACTION_TYPE,
  ARCHIVE_FLOW_ACTION_TYPE,
  FLOW_RATE_LIMIT_WINDOW_MS,
  FLOW_CREATE_RATE_LIMIT,
  FLOW_MODIFY_RATE_LIMIT,
  validateFlowName,
  validateFlowAnalysisId,
  validateStartingEvent,
  validateFlowEvents,
  validateMaxJourneyDepth,
  buildFlowsUrl,
  createFlowActionExecutors,
  BloomreachFlowsService,
} from '../index.js';

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
  it('exports CREATE_FLOW_ACTION_TYPE', () => {
    expect(CREATE_FLOW_ACTION_TYPE).toBe('flows.create_flow');
  });

  it('exports CLONE_FLOW_ACTION_TYPE', () => {
    expect(CLONE_FLOW_ACTION_TYPE).toBe('flows.clone_flow');
  });

  it('exports ARCHIVE_FLOW_ACTION_TYPE', () => {
    expect(ARCHIVE_FLOW_ACTION_TYPE).toBe('flows.archive_flow');
  });
});

describe('rate limit constants', () => {
  it('exports FLOW_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(FLOW_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports FLOW_CREATE_RATE_LIMIT', () => {
    expect(FLOW_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports FLOW_MODIFY_RATE_LIMIT', () => {
    expect(FLOW_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('validateFlowName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateFlowName('  My Flow  ')).toBe('My Flow');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateFlowName('\n\tRevenue Flow\t\n')).toBe('Revenue Flow');
  });

  it('accepts single-character name', () => {
    expect(validateFlowName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateFlowName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateFlowName('Flow: Checkout v2')).toBe('Flow: Checkout v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateFlowName(name)).toBe(name);
  });

  it('accepts name with emoji', () => {
    expect(validateFlowName('Flow 🚀')).toBe('Flow 🚀');
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateFlowName(' \t  Checkout Flow \n ')).toBe('Checkout Flow');
  });

  it('preserves internal spacing in valid name', () => {
    expect(validateFlowName('Checkout   Flow')).toBe('Checkout   Flow');
  });

  it('accepts punctuation-heavy name after trim', () => {
    expect(validateFlowName('  [Q1] Checkout Flow (v2)  ')).toBe('[Q1] Checkout Flow (v2)');
  });

  it('throws for too-long name even with surrounding whitespace', () => {
    expect(() => validateFlowName(`  ${'x'.repeat(201)}  `)).toThrow('must not exceed 200 characters');
  });

  it('throws for empty string', () => {
    expect(() => validateFlowName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFlowName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateFlowName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateFlowName('\n\n')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateFlowName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateFlowAnalysisId', () => {
  it('returns trimmed flow analysis ID for valid input', () => {
    expect(validateFlowAnalysisId('  flow-123  ')).toBe('flow-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateFlowAnalysisId('flow-456')).toBe('flow-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateFlowAnalysisId('analysis/segment/a')).toBe('analysis/segment/a');
  });

  it('returns ID containing hash', () => {
    expect(validateFlowAnalysisId('analysis#1')).toBe('analysis#1');
  });

  it('returns ID containing spaces after trim', () => {
    expect(validateFlowAnalysisId('  flow segment 1  ')).toBe('flow segment 1');
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateFlowAnalysisId('flow.v2-alpha')).toBe('flow.v2-alpha');
  });

  it('returns ID containing colons', () => {
    expect(validateFlowAnalysisId('flow:checkout:1')).toBe('flow:checkout:1');
  });

  it('returns trimmed ID with mixed whitespace', () => {
    expect(validateFlowAnalysisId(' \n\tflow-789\t ')).toBe('flow-789');
  });

  it('returns unicode ID', () => {
    expect(validateFlowAnalysisId('analyse-åäö')).toBe('analyse-åäö');
  });

  it('throws for empty string', () => {
    expect(() => validateFlowAnalysisId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFlowAnalysisId('   ')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateFlowAnalysisId('\n')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateFlowAnalysisId('\t')).toThrow('must not be empty');
  });

  it('throws for mixed-whitespace-only string', () => {
    expect(() => validateFlowAnalysisId(' \n\t ')).toThrow('must not be empty');
  });
});

describe('validateStartingEvent', () => {
  it('returns trimmed starting event for valid input', () => {
    expect(validateStartingEvent('  session_start  ')).toBe('session_start');
  });

  it('returns same value when already trimmed', () => {
    expect(validateStartingEvent('purchase')).toBe('purchase');
  });

  it('accepts event name with spaces', () => {
    expect(validateStartingEvent('view product')).toBe('view product');
  });

  it('accepts event name with punctuation', () => {
    expect(validateStartingEvent('checkout:started')).toBe('checkout:started');
  });

  it('accepts event name with tabs and newlines around content', () => {
    expect(validateStartingEvent('\n\tentry_event\t\n')).toBe('entry_event');
  });

  it('throws for empty string', () => {
    expect(() => validateStartingEvent('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateStartingEvent('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateStartingEvent('\t\t')).toThrow('must not be empty');
  });
});

describe('validateFlowEvents', () => {
  it('accepts one event with sequential order', () => {
    const events = [{ order: 1, eventName: 'session_start' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'session_start', label: undefined },
    ]);
  });

  it('accepts valid two-event flow', () => {
    const events = [
      { order: 1, eventName: 'view product' },
      { order: 2, eventName: 'purchase' },
    ];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'view product', label: undefined },
      { order: 2, eventName: 'purchase', label: undefined },
    ]);
  });

  it('accepts valid three-event flow', () => {
    const events = [
      { order: 1, eventName: 'open app' },
      { order: 2, eventName: 'view category' },
      { order: 3, eventName: 'purchase' },
    ];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'open app', label: undefined },
      { order: 2, eventName: 'view category', label: undefined },
      { order: 3, eventName: 'purchase', label: undefined },
    ]);
  });

  it('returns a new array', () => {
    const events = [{ order: 1, eventName: 'entry' }];
    const result = validateFlowEvents(events);
    expect(result).not.toBe(events);
  });

  it('trims eventName values', () => {
    const events = [{ order: 1, eventName: '  entry_event  ' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry_event', label: undefined },
    ]);
  });

  it('trims label values when provided', () => {
    const events = [{ order: 1, eventName: 'entry', label: '  Entry Label  ' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry', label: 'Entry Label' },
    ]);
  });

  it('converts whitespace-only label to undefined', () => {
    const events = [{ order: 1, eventName: 'entry', label: '   ' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry', label: undefined },
    ]);
  });

  it('normalizes tab/newline-only label to undefined', () => {
    const events = [{ order: 1, eventName: 'entry', label: '\n\t' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry', label: undefined },
    ]);
  });

  it('preserves undefined label', () => {
    const events = [{ order: 1, eventName: 'entry' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry', label: undefined },
    ]);
  });

  it('accepts empty-string label by normalizing to undefined', () => {
    const events = [{ order: 1, eventName: 'entry', label: '' }];
    expect(validateFlowEvents(events)).toEqual([
      { order: 1, eventName: 'entry', label: undefined },
    ]);
  });

  it('throws for empty array', () => {
    expect(() => validateFlowEvents([])).toThrow('at least one event');
  });

  it('throws when order does not start at 1', () => {
    expect(() => validateFlowEvents([{ order: 2, eventName: 'entry' }])).toThrow(
      'events[0].order must be 1',
    );
  });

  it('throws for non-sequential order with gap in two events', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 3, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for non-sequential order with gap in three events', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 2, eventName: 'view product' },
        { order: 4, eventName: 'purchase' },
      ]),
    ).toThrow('must be 3');
  });

  it('throws for duplicate order values', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 1, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for descending order values', () => {
    expect(() =>
      validateFlowEvents([
        { order: 2, eventName: 'purchase' },
        { order: 1, eventName: 'entry' },
      ]),
    ).toThrow('events[0].order must be 1');
  });

  it('throws for zero order as first event', () => {
    expect(() => validateFlowEvents([{ order: 0, eventName: 'entry' }])).toThrow(
      'events[0].order must be 1',
    );
  });

  it('throws for negative order as first event', () => {
    expect(() => validateFlowEvents([{ order: -1, eventName: 'entry' }])).toThrow(
      'events[0].order must be 1',
    );
  });

  it('throws for zero order in second event', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 0, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for negative order in second event', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: -2, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for empty eventName in single event', () => {
    expect(() => validateFlowEvents([{ order: 1, eventName: '' }])).toThrow('must not be empty');
  });

  it('throws for whitespace-only eventName in single event', () => {
    expect(() => validateFlowEvents([{ order: 1, eventName: '   ' }])).toThrow('must not be empty');
  });

  it('throws for tab-only eventName in single event', () => {
    expect(() => validateFlowEvents([{ order: 1, eventName: '\t' }])).toThrow('must not be empty');
  });

  it('throws for newline-only eventName in single event', () => {
    expect(() => validateFlowEvents([{ order: 1, eventName: '\n' }])).toThrow('must not be empty');
  });

  it('throws for empty eventName in second event', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 2, eventName: '' },
      ]),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only eventName in second event with tabs/newlines', () => {
    expect(() =>
      validateFlowEvents([
        { order: 1, eventName: 'entry' },
        { order: 2, eventName: '\n\t' },
      ]),
    ).toThrow('must not be empty');
  });
});

describe('validateMaxJourneyDepth', () => {
  it('returns undefined when depth is undefined', () => {
    expect(validateMaxJourneyDepth(undefined)).toBeUndefined();
  });

  it('accepts integer 1', () => {
    expect(validateMaxJourneyDepth(1)).toBe(1);
  });

  it('accepts integer 2', () => {
    expect(validateMaxJourneyDepth(2)).toBe(2);
  });

  it('accepts integer 5', () => {
    expect(validateMaxJourneyDepth(5)).toBe(5);
  });

  it('accepts integer 10', () => {
    expect(validateMaxJourneyDepth(10)).toBe(10);
  });

  it('accepts integer 19', () => {
    expect(validateMaxJourneyDepth(19)).toBe(19);
  });

  it('accepts integer 20', () => {
    expect(validateMaxJourneyDepth(20)).toBe(20);
  });

  it('throws for 0', () => {
    expect(() => validateMaxJourneyDepth(0)).toThrow('between 1 and 20');
  });

  it('throws for negative integer', () => {
    expect(() => validateMaxJourneyDepth(-1)).toThrow('between 1 and 20');
  });

  it('throws for large negative integer', () => {
    expect(() => validateMaxJourneyDepth(-100)).toThrow('between 1 and 20');
  });

  it('throws for decimal 1.5', () => {
    expect(() => validateMaxJourneyDepth(1.5)).toThrow('integer between 1 and 20');
  });

  it('throws for decimal 10.01', () => {
    expect(() => validateMaxJourneyDepth(10.01)).toThrow('integer between 1 and 20');
  });

  it('throws for Number.MIN_VALUE', () => {
    expect(() => validateMaxJourneyDepth(Number.MIN_VALUE)).toThrow('integer between 1 and 20');
  });

  it('throws for NaN', () => {
    expect(() => validateMaxJourneyDepth(Number.NaN)).toThrow('between 1 and 20');
  });

  it('throws for Infinity', () => {
    expect(() => validateMaxJourneyDepth(Number.POSITIVE_INFINITY)).toThrow('between 1 and 20');
  });

  it('throws for negative Infinity', () => {
    expect(() => validateMaxJourneyDepth(Number.NEGATIVE_INFINITY)).toThrow('between 1 and 20');
  });

  it('throws for 21', () => {
    expect(() => validateMaxJourneyDepth(21)).toThrow('between 1 and 20');
  });

  it('throws for 100', () => {
    expect(() => validateMaxJourneyDepth(100)).toThrow('between 1 and 20');
  });
});

describe('buildFlowsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildFlowsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/analytics/flows');
  });

  it('encodes spaces in project name', () => {
    expect(buildFlowsUrl('my project')).toBe('/p/my%20project/analytics/flows');
  });

  it('encodes slashes in project name', () => {
    expect(buildFlowsUrl('org/project')).toBe('/p/org%2Fproject/analytics/flows');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildFlowsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/flows');
  });

  it('encodes hash character in project name', () => {
    expect(buildFlowsUrl('my#project')).toBe('/p/my%23project/analytics/flows');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildFlowsUrl('team-alpha')).toBe('/p/team-alpha/analytics/flows');
  });
});

describe('createFlowActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createFlowActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_FLOW_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_FLOW_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_FLOW_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createFlowActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[CREATE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('clone executor throws "not yet implemented" on execute', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[CLONE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[ARCHIVE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('create executor mentions UI-only in error', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[CREATE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('clone executor mentions UI-only in error', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[CLONE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('archive executor mentions UI-only in error', async () => {
    const executors = createFlowActionExecutors();
    await expect(executors[ARCHIVE_FLOW_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createFlowActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createFlowActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createFlowActionExecutors()).sort();
    const withConfig = Object.keys(createFlowActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createFlowActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('returns expected action keys', () => {
    const keys = Object.keys(createFlowActionExecutors()).sort();
    expect(keys).toEqual(
      [ARCHIVE_FLOW_ACTION_TYPE, CLONE_FLOW_ACTION_TYPE, CREATE_FLOW_ACTION_TYPE].sort(),
    );
  });

  it('returns new executor instances on each call', () => {
    const first = createFlowActionExecutors(TEST_API_CONFIG);
    const second = createFlowActionExecutors(TEST_API_CONFIG);
    expect(first[CREATE_FLOW_ACTION_TYPE]).not.toBe(second[CREATE_FLOW_ACTION_TYPE]);
    expect(first[CLONE_FLOW_ACTION_TYPE]).not.toBe(second[CLONE_FLOW_ACTION_TYPE]);
    expect(first[ARCHIVE_FLOW_ACTION_TYPE]).not.toBe(second[ARCHIVE_FLOW_ACTION_TYPE]);
  });

  it('all executors mention UI-only guidance with apiConfig', async () => {
    const executors = createFlowActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('uses independent executor maps for configured and unconfigured calls', () => {
    const withoutConfig = createFlowActionExecutors();
    const withConfig = createFlowActionExecutors(TEST_API_CONFIG);
    expect(withoutConfig).not.toBe(withConfig);
  });

  it('supports custom apiConfig values without changing key set', () => {
    const executors = createFlowActionExecutors({
      ...TEST_API_CONFIG,
      baseUrl: 'https://api-alt.test.com',
      projectToken: 'another-token',
    });
    expect(Object.keys(executors).sort()).toEqual(
      [CREATE_FLOW_ACTION_TYPE, CLONE_FLOW_ACTION_TYPE, ARCHIVE_FLOW_ACTION_TYPE].sort(),
    );
  });
});

describe('BloomreachFlowsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachFlowsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachFlowsService);
    });

    it('exposes the flows URL', () => {
      const service = new BloomreachFlowsService('kingdom-of-joakim');
      expect(service.flowsUrl).toBe('/p/kingdom-of-joakim/analytics/flows');
    });

    it('trims project name', () => {
      const service = new BloomreachFlowsService('  my-project  ');
      expect(service.flowsUrl).toBe('/p/my-project/analytics/flows');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachFlowsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachFlowsService('   ')).toThrow('must not be empty');
    });

    it('throws for tab-only project', () => {
      expect(() => new BloomreachFlowsService('\t\t')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachFlowsService('org/project');
      expect(service.flowsUrl).toBe('/p/org%2Fproject/analytics/flows');
    });

    it('encodes spaces in constructor project URL', () => {
      const service = new BloomreachFlowsService('my project');
      expect(service.flowsUrl).toBe('/p/my%20project/analytics/flows');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachFlowsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachFlowsService);
    });

    it('exposes flows URL when constructed with apiConfig', () => {
      const service = new BloomreachFlowsService('test', TEST_API_CONFIG);
      expect(service.flowsUrl).toBe('/p/test/analytics/flows');
    });

    it('encodes unicode project name in constructor URL', () => {
      const service = new BloomreachFlowsService('projekt åäö');
      expect(service.flowsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/flows');
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachFlowsService('my#project');
      expect(service.flowsUrl).toBe('/p/my%23project/analytics/flows');
    });

    it('trims and encodes unicode project in constructor URL', () => {
      const service = new BloomreachFlowsService('  projekt åäö  ');
      expect(service.flowsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/flows');
    });

    it('encodes plus sign in constructor URL', () => {
      const service = new BloomreachFlowsService('project+beta');
      expect(service.flowsUrl).toBe('/p/project%2Bbeta/analytics/flows');
    });

    it('returns stable flowsUrl with apiConfig across reads', () => {
      const service = new BloomreachFlowsService('alpha', TEST_API_CONFIG);
      expect(service.flowsUrl).toBe('/p/alpha/analytics/flows');
      expect(service.flowsUrl).toBe('/p/alpha/analytics/flows');
    });
  });

  describe('flowsUrl getter', () => {
    it('returns stable value across multiple reads', () => {
      const service = new BloomreachFlowsService('alpha');
      expect(service.flowsUrl).toBe('/p/alpha/analytics/flows');
      expect(service.flowsUrl).toBe('/p/alpha/analytics/flows');
    });
  });

  describe('listFlowAnalyses', () => {
    it('throws no-API-endpoint error without input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses()).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates tab-only project when input is provided', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: '\t' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachFlowsService('test', TEST_API_CONFIG);
      await expect(service.listFlowAnalyses()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for unicode project override', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: 'projekt åäö' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for slash project override', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: 'org/project' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override with tabs/newlines', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.listFlowAnalyses({ project: '\n\tkingdom\t\n' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });
  });

  describe('viewFlowResults', () => {
    it('throws no-API-endpoint error with valid minimal input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: 'flow-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with valid full input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: '  test  ',
          analysisId: '  flow-1  ',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.viewFlowResults({ project: '', analysisId: 'flow-1' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: '   ', analysisId: 'flow-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates analysisId input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.viewFlowResults({ project: 'test', analysisId: '   ' })).rejects.toThrow(
        'Flow analysis ID must not be empty',
      );
    });

    it('validates empty analysisId input', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(service.viewFlowResults({ project: 'test', analysisId: '' })).rejects.toThrow(
        'Flow analysis ID must not be empty',
      );
    });

    it('accepts trimmed analysisId and reaches no-API-endpoint error', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: '  flow-99  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts only startDate and still reaches no-API-endpoint error', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: 'flow-1', startDate: '2025-01-01' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts only endDate and still reaches no-API-endpoint error', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: 'flow-1', endDate: '2025-01-31' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with trimmed project and analysisId', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: '  test  ', analysisId: '  flow-1  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachFlowsService('test', TEST_API_CONFIG);
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: 'flow-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for same-day date range', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          startDate: '2025-01-01',
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for encoded-looking analysisId', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({ project: 'test', analysisId: 'flow%2Fencoded' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with apiConfig and full valid input', async () => {
      const service = new BloomreachFlowsService('test', TEST_API_CONFIG);
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('validates malformed startDate when provided', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          startDate: '2025/01/01',
        }),
      ).rejects.toThrow('valid ISO-8601 date');
    });

    it('validates malformed endDate when provided', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          endDate: '01-31-2025',
        }),
      ).rejects.toThrow('valid ISO-8601 date');
    });

    it('validates invalid calendar date for startDate', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          startDate: '2025-02-30',
        }),
      ).rejects.toThrow('not a valid calendar date');
    });

    it('validates invalid calendar date for endDate', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          endDate: '2025-11-31',
        }),
      ).rejects.toThrow('not a valid calendar date');
    });

    it('validates startDate before endDate ordering', async () => {
      const service = new BloomreachFlowsService('test');
      await expect(
        service.viewFlowResults({
          project: 'test',
          analysisId: 'flow-1',
          startDate: '2025-03-31',
          endDate: '2025-03-01',
        }),
      ).rejects.toThrow('must not be after endDate');
    });
  });

  describe('prepareCreateFlowAnalysis', () => {
    it('returns a prepared action with valid minimal input', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Checkout Flow',
        startingEvent: 'session_start',
        events: [{ order: 1, eventName: 'purchase' }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'flows.create_flow',
          project: 'test',
          name: 'Checkout Flow',
          startingEvent: 'session_start',
          events: [{ order: 1, eventName: 'purchase', label: undefined }],
          maxJourneyDepth: undefined,
        }),
      );
    });

    it('returns a prepared action with valid multi-event input', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Three Event Flow',
        startingEvent: 'open_app',
        events: [
          { order: 1, eventName: 'view_category' },
          { order: 2, eventName: 'view_product' },
          { order: 3, eventName: 'purchase' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Three Event Flow',
          startingEvent: 'open_app',
          events: [
            { order: 1, eventName: 'view_category', label: undefined },
            { order: 2, eventName: 'view_product', label: undefined },
            { order: 3, eventName: 'purchase', label: undefined },
          ],
        }),
      );
    });

    it('includes maxJourneyDepth in preview when provided', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Deep Flow',
        startingEvent: 'session_start',
        events: [{ order: 1, eventName: 'purchase' }],
        maxJourneyDepth: 12,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          maxJourneyDepth: 12,
        }),
      );
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Filtered Flow',
        startingEvent: 'session_start',
        events: [{ order: 1, eventName: 'purchase' }],
        filters: {
          customerAttributes: { segment: 'vip', locale: 'en_US' },
          eventProperties: { currency: 'USD' },
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: {
            customerAttributes: { segment: 'vip', locale: 'en_US' },
            eventProperties: { currency: 'USD' },
          },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Flow',
        startingEvent: 'entry',
        events: [{ order: 1, eventName: 'purchase' }],
        operatorNote: 'Create before product launch review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create before product launch review',
        }),
      );
    });

    it('includes startingEvent in preview as trimmed value', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Flow',
        startingEvent: '  session_start  ',
        events: [{ order: 1, eventName: 'purchase' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          startingEvent: 'session_start',
        }),
      );
    });

    it('includes normalized events in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: 'Flow',
        startingEvent: 'entry',
        events: [
          { order: 1, eventName: '  step_1  ', label: '  Step 1  ' },
          { order: 2, eventName: '  step_2  ', label: '   ' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          events: [
            { order: 1, eventName: 'step_1', label: 'Step 1' },
            { order: 2, eventName: 'step_2', label: undefined },
          ],
        }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCreateFlowAnalysis({
        project: '  my-project  ',
        name: '  My Flow  ',
        startingEvent: 'entry',
        events: [{ order: 1, eventName: 'purchase' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'My Flow',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: '',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: '   ',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: '',
          name: 'Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: '   ',
          name: 'Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'x'.repeat(201),
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws when events is empty', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: 'entry',
          events: [],
        }),
      ).toThrow('at least one event');
    });

    it('throws when events have empty eventName', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: '' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws when events have whitespace-only eventName', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: '   ' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws when events order is non-sequential', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: 'entry',
          events: [
            { order: 1, eventName: 'visit' },
            { order: 3, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must be 2');
    });

    it('throws when events order does not start at 1', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: 'entry',
          events: [
            { order: 2, eventName: 'visit' },
            { order: 3, eventName: 'purchase' },
          ],
        }),
      ).toThrow('events[0].order must be 1');
    });

    it('throws when startingEvent is empty', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: '',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('Starting event must not be empty');
    });

    it('throws when startingEvent is whitespace only', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Flow',
          startingEvent: '   ',
          events: [{ order: 1, eventName: 'purchase' }],
        }),
      ).toThrow('Starting event must not be empty');
    });

    it('throws when maxJourneyDepth is zero', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Deep Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
          maxJourneyDepth: 0,
        }),
      ).toThrow('between 1 and 20');
    });

    it('throws when maxJourneyDepth is greater than 20', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Deep Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
          maxJourneyDepth: 21,
        }),
      ).toThrow('between 1 and 20');
    });

    it('throws when maxJourneyDepth is non-integer', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCreateFlowAnalysis({
          project: 'test',
          name: 'Deep Flow',
          startingEvent: 'entry',
          events: [{ order: 1, eventName: 'purchase' }],
          maxJourneyDepth: 12.5,
        }),
      ).toThrow('integer between 1 and 20');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachFlowsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateFlowAnalysis({
        project: 'test',
        name: maxName,
        startingEvent: 'entry',
        events: [{ order: 1, eventName: 'purchase' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareCloneFlowAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: 'flow-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'flows.clone_flow',
          project: 'test',
          analysisId: 'flow-789',
          newName: undefined,
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: 'flow-789',
        newName: '  Cloned Flow  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Flow',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: 'flow-789',
        operatorNote: 'Clone for region-specific experiment',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for region-specific experiment',
        }),
      );
    });

    it('trims analysisId in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: '  flow-789  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'flow-789',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: '',
          analysisId: 'flow-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: '   ',
          analysisId: 'flow-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: 'test',
          analysisId: 'flow-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareCloneFlowAnalysis({
          project: 'test',
          analysisId: 'flow-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachFlowsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: 'flow-789',
        newName,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName,
        }),
      );
    });

    it('keeps undefined newName when omitted', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareCloneFlowAnalysis({
        project: 'test',
        analysisId: 'flow-789',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: undefined,
        }),
      );
    });
  });

  describe('prepareArchiveFlowAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareArchiveFlowAnalysis({
        project: 'test',
        analysisId: 'flow-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'flows.archive_flow',
          project: 'test',
          analysisId: 'flow-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareArchiveFlowAnalysis({
        project: 'test',
        analysisId: 'flow-900',
        operatorNote: 'Archive obsolete checkout flow analysis',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive obsolete checkout flow analysis',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareArchiveFlowAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareArchiveFlowAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for tab-only analysisId', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareArchiveFlowAnalysis({
          project: 'test',
          analysisId: '\t',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareArchiveFlowAnalysis({
          project: '',
          analysisId: 'flow-900',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachFlowsService('test');
      expect(() =>
        service.prepareArchiveFlowAnalysis({
          project: '   ',
          analysisId: 'flow-900',
        }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed analysisId and reaches prepared state', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareArchiveFlowAnalysis({
        project: 'test',
        analysisId: '  flow-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'flow-900',
        }),
      );
    });

    it('returns preview with action type', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareArchiveFlowAnalysis({
        project: 'test',
        analysisId: 'flow-901',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: ARCHIVE_FLOW_ACTION_TYPE,
        }),
      );
    });

    it('sets expiry in the future', () => {
      const service = new BloomreachFlowsService('test');
      const result = service.prepareArchiveFlowAnalysis({
        project: 'test',
        analysisId: 'flow-902',
      });

      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
