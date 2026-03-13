import { describe, it, expect } from 'vitest';
import {
  CREATE_FUNNEL_ACTION_TYPE,
  CLONE_FUNNEL_ACTION_TYPE,
  ARCHIVE_FUNNEL_ACTION_TYPE,
  FUNNEL_RATE_LIMIT_WINDOW_MS,
  FUNNEL_CREATE_RATE_LIMIT,
  FUNNEL_MODIFY_RATE_LIMIT,
  validateFunnelName,
  validateFunnelAnalysisId,
  validateFunnelSteps,
  validateTimeLimitMs,
  buildFunnelsUrl,
  createFunnelActionExecutors,
  BloomreachFunnelsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_FUNNEL_ACTION_TYPE', () => {
    expect(CREATE_FUNNEL_ACTION_TYPE).toBe('funnels.create_funnel');
  });

  it('exports CLONE_FUNNEL_ACTION_TYPE', () => {
    expect(CLONE_FUNNEL_ACTION_TYPE).toBe('funnels.clone_funnel');
  });

  it('exports ARCHIVE_FUNNEL_ACTION_TYPE', () => {
    expect(ARCHIVE_FUNNEL_ACTION_TYPE).toBe('funnels.archive_funnel');
  });
});

describe('rate limit constants', () => {
  it('exports FUNNEL_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(FUNNEL_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports FUNNEL_CREATE_RATE_LIMIT', () => {
    expect(FUNNEL_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports FUNNEL_MODIFY_RATE_LIMIT', () => {
    expect(FUNNEL_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('validateFunnelName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateFunnelName('  My Funnel  ')).toBe('My Funnel');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateFunnelName('\n\tRevenue Funnel\t\n')).toBe('Revenue Funnel');
  });

  it('accepts single-character name', () => {
    expect(validateFunnelName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateFunnelName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateFunnelName('Funnel: Checkout v2')).toBe('Funnel: Checkout v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateFunnelName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateFunnelName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFunnelName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateFunnelName('\t\t')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateFunnelName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateFunnelAnalysisId', () => {
  it('returns trimmed funnel analysis ID for valid input', () => {
    expect(validateFunnelAnalysisId('  funnel-123  ')).toBe('funnel-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateFunnelAnalysisId('funnel-456')).toBe('funnel-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateFunnelAnalysisId('analysis/segment/a')).toBe('analysis/segment/a');
  });

  it('throws for empty string', () => {
    expect(() => validateFunnelAnalysisId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateFunnelAnalysisId('   ')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateFunnelAnalysisId('\n')).toThrow('must not be empty');
  });
});

describe('validateFunnelSteps', () => {
  it('accepts valid two-step funnel with sequential order', () => {
    const steps = [
      { order: 1, eventName: 'view product' },
      { order: 2, eventName: 'purchase' },
    ];
    expect(validateFunnelSteps(steps)).toEqual(steps);
  });

  it('accepts valid three-step funnel', () => {
    const steps = [
      { order: 1, eventName: 'open email' },
      { order: 2, eventName: 'click link' },
      { order: 3, eventName: 'purchase' },
    ];
    expect(validateFunnelSteps(steps)).toEqual(steps);
  });

  it('accepts five-step funnel', () => {
    const steps = [
      { order: 1, eventName: 'session start' },
      { order: 2, eventName: 'view category' },
      { order: 3, eventName: 'view product' },
      { order: 4, eventName: 'add to cart' },
      { order: 5, eventName: 'purchase' },
    ];
    expect(validateFunnelSteps(steps)).toEqual(steps);
  });

  it('returns validated steps', () => {
    const steps = [
      { order: 1, eventName: 'entry' },
      { order: 2, eventName: 'exit' },
    ];
    const result = validateFunnelSteps(steps);
    expect(result).toEqual(steps);
  });

  it('throws for empty array', () => {
    expect(() => validateFunnelSteps([])).toThrow('at least two funnel steps');
  });

  it('throws for single step', () => {
    expect(() => validateFunnelSteps([{ order: 1, eventName: 'only-step' }])).toThrow(
      'at least two funnel steps',
    );
  });

  it('throws when order does not start at 1', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 2, eventName: 'view product' },
        { order: 3, eventName: 'purchase' },
      ]),
    ).toThrow('steps[0].order must be 1');
  });

  it('throws for non-sequential order with gap', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 1, eventName: 'view product' },
        { order: 3, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for duplicate order values', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 1, eventName: 'view product' },
        { order: 1, eventName: 'purchase' },
      ]),
    ).toThrow('must be 2');
  });

  it('throws for descending order values', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 2, eventName: 'purchase' },
        { order: 1, eventName: 'view product' },
      ]),
    ).toThrow('steps[0].order must be 1');
  });

  it('throws for zero order', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 0, eventName: 'view product' },
        { order: 1, eventName: 'purchase' },
      ]),
    ).toThrow('steps[0].order must be 1');
  });

  it('throws for negative order', () => {
    expect(() =>
      validateFunnelSteps([
        { order: -1, eventName: 'view product' },
        { order: 0, eventName: 'purchase' },
      ]),
    ).toThrow('steps[0].order must be 1');
  });

  it('throws for empty eventName', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 1, eventName: '' },
        { order: 2, eventName: 'purchase' },
      ]),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only eventName', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 1, eventName: '   ' },
        { order: 2, eventName: 'purchase' },
      ]),
    ).toThrow('must not be empty');
  });

  it('throws for tab-only eventName', () => {
    expect(() =>
      validateFunnelSteps([
        { order: 1, eventName: '\t' },
        { order: 2, eventName: 'purchase' },
      ]),
    ).toThrow('must not be empty');
  });

  it('keeps event names as provided when valid', () => {
    const steps = [
      { order: 1, eventName: 'A' },
      { order: 2, eventName: 'B' },
    ];
    expect(validateFunnelSteps(steps)).toEqual([
      { order: 1, eventName: 'A' },
      { order: 2, eventName: 'B' },
    ]);
  });
});

describe('validateTimeLimitMs', () => {
  it('accepts a positive integer', () => {
    expect(validateTimeLimitMs(1)).toBe(1);
  });

  it('accepts a typical positive integer', () => {
    expect(validateTimeLimitMs(30_000)).toBe(30_000);
  });

  it('accepts a large positive integer', () => {
    expect(validateTimeLimitMs(86_400_000)).toBe(86_400_000);
  });

  it('throws for zero', () => {
    expect(() => validateTimeLimitMs(0)).toThrow('positive integer');
  });

  it('throws for negative number', () => {
    expect(() => validateTimeLimitMs(-1)).toThrow('positive integer');
  });

  it('throws for decimal value', () => {
    expect(() => validateTimeLimitMs(1.5)).toThrow('integer');
  });

  it('throws for decimal value with many places', () => {
    expect(() => validateTimeLimitMs(1000.0001)).toThrow('integer');
  });

  it('throws for NaN', () => {
    expect(() => validateTimeLimitMs(Number.NaN)).toThrow('positive integer');
  });

  it('throws for positive infinity', () => {
    expect(() => validateTimeLimitMs(Number.POSITIVE_INFINITY)).toThrow('positive integer');
  });

  it('throws for negative infinity', () => {
    expect(() => validateTimeLimitMs(Number.NEGATIVE_INFINITY)).toThrow('positive integer');
  });

  it('throws for Number.MIN_VALUE', () => {
    expect(() => validateTimeLimitMs(Number.MIN_VALUE)).toThrow('integer');
  });

  it('accepts Number.MAX_SAFE_INTEGER', () => {
    expect(validateTimeLimitMs(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('buildFunnelsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildFunnelsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/analytics/funnels');
  });

  it('encodes spaces in project name', () => {
    expect(buildFunnelsUrl('my project')).toBe('/p/my%20project/analytics/funnels');
  });

  it('encodes slashes in project name', () => {
    expect(buildFunnelsUrl('org/project')).toBe('/p/org%2Fproject/analytics/funnels');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildFunnelsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/funnels',
    );
  });

  it('encodes hash character in project name', () => {
    expect(buildFunnelsUrl('my#project')).toBe('/p/my%23project/analytics/funnels');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildFunnelsUrl('team-alpha')).toBe('/p/team-alpha/analytics/funnels');
  });
});

describe('createFunnelActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createFunnelActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_FUNNEL_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_FUNNEL_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_FUNNEL_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createFunnelActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createFunnelActionExecutors();
    await expect(executors[CREATE_FUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('clone executor throws "not yet implemented" on execute', async () => {
    const executors = createFunnelActionExecutors();
    await expect(executors[CLONE_FUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createFunnelActionExecutors();
    await expect(executors[ARCHIVE_FUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });
});

describe('BloomreachFunnelsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachFunnelsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachFunnelsService);
    });

    it('exposes the funnels URL', () => {
      const service = new BloomreachFunnelsService('kingdom-of-joakim');
      expect(service.funnelsUrl).toBe('/p/kingdom-of-joakim/analytics/funnels');
    });

    it('trims project name', () => {
      const service = new BloomreachFunnelsService('  my-project  ');
      expect(service.funnelsUrl).toBe('/p/my-project/analytics/funnels');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachFunnelsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachFunnelsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachFunnelsService('org/project');
      expect(service.funnelsUrl).toBe('/p/org%2Fproject/analytics/funnels');
    });
  });

  describe('listFunnelAnalyses', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(service.listFunnelAnalyses()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(service.listFunnelAnalyses({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(service.listFunnelAnalyses({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws not-yet-implemented error for valid project override', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(service.listFunnelAnalyses({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'not yet implemented',
      );
    });

    it('throws not-yet-implemented error for trimmed project override', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.listFunnelAnalyses({ project: '  kingdom-of-joakim  ' }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('viewFunnelResults', () => {
    it('throws not-yet-implemented error with valid minimal input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({ project: 'test', analysisId: 'funnel-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('throws not-yet-implemented error with valid full input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({
          project: '  test  ',
          analysisId: '  funnel-1  ',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({ project: '', analysisId: 'funnel-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({ project: '   ', analysisId: 'funnel-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates analysisId input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({ project: 'test', analysisId: '   ' }),
      ).rejects.toThrow('Funnel analysis ID must not be empty');
    });

    it('validates empty analysisId input', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(service.viewFunnelResults({ project: 'test', analysisId: '' })).rejects.toThrow(
        'Funnel analysis ID must not be empty',
      );
    });

    it('accepts trimmed analysisId and reaches not-yet-implemented', async () => {
      const service = new BloomreachFunnelsService('test');
      await expect(
        service.viewFunnelResults({ project: 'test', analysisId: '  funnel-99  ' }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareCreateFunnelAnalysis', () => {
    it('returns a prepared action with valid minimal input', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: 'Checkout Funnel',
        steps: [
          { order: 1, eventName: 'view product' },
          { order: 2, eventName: 'purchase' },
        ],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'funnels.create_funnel',
          project: 'test',
          name: 'Checkout Funnel',
          steps: [
            { order: 1, eventName: 'view product' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      );
    });

    it('returns a prepared action with valid three-step input', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: 'Three Step Funnel',
        steps: [
          { order: 1, eventName: 'open app' },
          { order: 2, eventName: 'add to cart' },
          { order: 3, eventName: 'purchase' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Three Step Funnel',
          steps: [
            { order: 1, eventName: 'open app' },
            { order: 2, eventName: 'add to cart' },
            { order: 3, eventName: 'purchase' },
          ],
        }),
      );
    });

    it('includes timeLimitMs in preview when provided', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: 'Timed Funnel',
        steps: [
          { order: 1, eventName: 'visit' },
          { order: 2, eventName: 'purchase' },
        ],
        timeLimitMs: 90_000,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          timeLimitMs: 90_000,
        }),
      );
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: 'Filtered Funnel',
        steps: [
          { order: 1, eventName: 'visit' },
          { order: 2, eventName: 'purchase' },
        ],
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
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: 'Funnel',
        steps: [
          { order: 1, eventName: 'visit' },
          { order: 2, eventName: 'purchase' },
        ],
        operatorNote: 'Create before product launch review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create before product launch review',
        }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCreateFunnelAnalysis({
        project: '  my-project  ',
        name: '  My Funnel  ',
        steps: [
          { order: 1, eventName: 'visit' },
          { order: 2, eventName: 'purchase' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'My Funnel',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: '',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: '   ',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: '',
          name: 'Funnel',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'x'.repeat(201),
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws when steps has fewer than 2 items', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [{ order: 1, eventName: 'visit' }],
        }),
      ).toThrow('at least two funnel steps');
    });

    it('throws when steps is empty', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [],
        }),
      ).toThrow('at least two funnel steps');
    });

    it('throws when steps have empty eventName', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [
            { order: 1, eventName: '' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not be empty');
    });

    it('throws when steps have whitespace-only eventName', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [
            { order: 1, eventName: '   ' },
            { order: 2, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must not be empty');
    });

    it('throws when steps order is non-sequential', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 3, eventName: 'purchase' },
          ],
        }),
      ).toThrow('must be 2');
    });

    it('throws when steps order does not start at 1', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Funnel',
          steps: [
            { order: 2, eventName: 'visit' },
            { order: 3, eventName: 'purchase' },
          ],
        }),
      ).toThrow('steps[0].order must be 1');
    });

    it('throws when timeLimitMs is zero', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Timed Funnel',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
          timeLimitMs: 0,
        }),
      ).toThrow('positive integer');
    });

    it('throws when timeLimitMs is negative', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Timed Funnel',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
          timeLimitMs: -100,
        }),
      ).toThrow('positive integer');
    });

    it('throws when timeLimitMs is non-integer', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCreateFunnelAnalysis({
          project: 'test',
          name: 'Timed Funnel',
          steps: [
            { order: 1, eventName: 'visit' },
            { order: 2, eventName: 'purchase' },
          ],
          timeLimitMs: 12.5,
        }),
      ).toThrow('integer');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachFunnelsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateFunnelAnalysis({
        project: 'test',
        name: maxName,
        steps: [
          { order: 1, eventName: 'visit' },
          { order: 2, eventName: 'purchase' },
        ],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareCloneFunnelAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCloneFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'funnels.clone_funnel',
          project: 'test',
          analysisId: 'funnel-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCloneFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-789',
        newName: '  Cloned Funnel  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Funnel',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareCloneFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-789',
        operatorNote: 'Clone for region-specific experiment',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for region-specific experiment',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: '',
          analysisId: 'funnel-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: '   ',
          analysisId: 'funnel-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: 'test',
          analysisId: 'funnel-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareCloneFunnelAnalysis({
          project: 'test',
          analysisId: 'funnel-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachFunnelsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-789',
        newName,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName,
        }),
      );
    });
  });

  describe('prepareArchiveFunnelAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareArchiveFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'funnels.archive_funnel',
          project: 'test',
          analysisId: 'funnel-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareArchiveFunnelAnalysis({
        project: 'test',
        analysisId: 'funnel-900',
        operatorNote: 'Archive obsolete checkout flow funnel',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive obsolete checkout flow funnel',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareArchiveFunnelAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareArchiveFunnelAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareArchiveFunnelAnalysis({
          project: '',
          analysisId: 'funnel-900',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachFunnelsService('test');
      expect(() =>
        service.prepareArchiveFunnelAnalysis({
          project: '   ',
          analysisId: 'funnel-900',
        }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed analysisId and reaches prepared state', () => {
      const service = new BloomreachFunnelsService('test');
      const result = service.prepareArchiveFunnelAnalysis({
        project: 'test',
        analysisId: '  funnel-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'funnel-900',
        }),
      );
    });
  });
});
