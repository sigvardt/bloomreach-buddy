import { describe, it, expect } from 'vitest';
import {
  CREATE_TREND_ACTION_TYPE,
  CLONE_TREND_ACTION_TYPE,
  ARCHIVE_TREND_ACTION_TYPE,
  TREND_RATE_LIMIT_WINDOW_MS,
  TREND_CREATE_RATE_LIMIT,
  TREND_MODIFY_RATE_LIMIT,
  TREND_GRANULARITIES,
  validateTrendName,
  validateTrendGranularity,
  validateTrendAnalysisId,
  buildTrendsUrl,
  createTrendActionExecutors,
  BloomreachTrendsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_TREND_ACTION_TYPE', () => {
    expect(CREATE_TREND_ACTION_TYPE).toBe('trends.create_trend');
  });

  it('exports CLONE_TREND_ACTION_TYPE', () => {
    expect(CLONE_TREND_ACTION_TYPE).toBe('trends.clone_trend');
  });

  it('exports ARCHIVE_TREND_ACTION_TYPE', () => {
    expect(ARCHIVE_TREND_ACTION_TYPE).toBe('trends.archive_trend');
  });
});

describe('rate limit constants', () => {
  it('exports TREND_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(TREND_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports TREND_CREATE_RATE_LIMIT', () => {
    expect(TREND_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports TREND_MODIFY_RATE_LIMIT', () => {
    expect(TREND_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('TREND_GRANULARITIES', () => {
  it('contains 4 granularities', () => {
    expect(TREND_GRANULARITIES).toHaveLength(4);
  });

  it('contains expected granularity values in order', () => {
    expect(TREND_GRANULARITIES).toEqual(['hourly', 'daily', 'weekly', 'monthly']);
  });
});

describe('validateTrendName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateTrendName('  Revenue Trend  ')).toBe('Revenue Trend');
  });

  it('accepts single-character name', () => {
    expect(validateTrendName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateTrendName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateTrendName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTrendName('    ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const tooLong = 'x'.repeat(201);
    expect(() => validateTrendName(tooLong)).toThrow('must not exceed 200 characters');
  });
});

describe('validateTrendGranularity', () => {
  it('accepts hourly', () => {
    expect(validateTrendGranularity('hourly')).toBe('hourly');
  });

  it('accepts daily', () => {
    expect(validateTrendGranularity('daily')).toBe('daily');
  });

  it('accepts weekly', () => {
    expect(validateTrendGranularity('weekly')).toBe('weekly');
  });

  it('accepts monthly', () => {
    expect(validateTrendGranularity('monthly')).toBe('monthly');
  });

  it('throws for unknown granularity', () => {
    expect(() => validateTrendGranularity('quarterly')).toThrow('granularity must be one of');
  });

  it('throws for empty granularity', () => {
    expect(() => validateTrendGranularity('')).toThrow('granularity must be one of');
  });
});

describe('validateTrendAnalysisId', () => {
  it('returns trimmed trend analysis ID for valid input', () => {
    expect(validateTrendAnalysisId('  trend-123  ')).toBe('trend-123');
  });

  it('throws for empty string', () => {
    expect(() => validateTrendAnalysisId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTrendAnalysisId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateTrendAnalysisId('trend-456')).toBe('trend-456');
  });
});

describe('buildTrendsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildTrendsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/analytics/trends');
  });

  it('encodes spaces in project name', () => {
    expect(buildTrendsUrl('my project')).toBe('/p/my%20project/analytics/trends');
  });

  it('encodes slashes in project name', () => {
    expect(buildTrendsUrl('org/project')).toBe('/p/org%2Fproject/analytics/trends');
  });
});

describe('createTrendActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createTrendActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_TREND_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_TREND_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_TREND_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createTrendActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createTrendActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachTrendsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachTrendsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachTrendsService);
    });

    it('exposes the trends URL', () => {
      const service = new BloomreachTrendsService('kingdom-of-joakim');
      expect(service.trendsUrl).toBe('/p/kingdom-of-joakim/analytics/trends');
    });

    it('trims project name', () => {
      const service = new BloomreachTrendsService('  my-project  ');
      expect(service.trendsUrl).toBe('/p/my-project/analytics/trends');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachTrendsService('')).toThrow('must not be empty');
    });
  });

  describe('listTrendAnalyses', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('viewTrendResults', () => {
    it('throws not-yet-implemented error with valid minimal input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('throws not-yet-implemented error with full valid input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          granularity: 'daily',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: '', analysisId: 'trend-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates analysisId input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: '   ' }),
      ).rejects.toThrow('Trend analysis ID must not be empty');
    });

    it('validates granularity when provided', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          granularity: 'quarterly',
        }),
      ).rejects.toThrow('granularity must be one of');
    });

    it('validates date range: malformed startDate', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          startDate: 'bad-date',
        }),
      ).rejects.toThrow('startDate must be a valid ISO-8601 date');
    });

    it('validates date range: malformed endDate', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          endDate: '31-01-2025',
        }),
      ).rejects.toThrow('endDate must be a valid ISO-8601 date');
    });

    it('validates date range: startDate must not be after endDate', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          startDate: '2025-02-01',
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow('must not be after');
    });

    it('accepts only startDate and still reaches not-yet-implemented', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          startDate: '2025-01-01',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('accepts only endDate and still reaches not-yet-implemented', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareCreateTrendAnalysis', () => {
    it('returns a prepared action with valid minimal input', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Revenue Trend',
        events: ['purchase'],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'trends.create_trend',
          project: 'test',
          name: 'Revenue Trend',
          events: ['purchase'],
        }),
      );
    });

    it('includes granularity in preview when provided', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Revenue Trend Daily',
        events: ['purchase', 'refund'],
        granularity: 'daily',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          granularity: 'daily',
          events: ['purchase', 'refund'],
        }),
      );
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'VIP Trend',
        events: ['purchase'],
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
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Trend',
        events: ['purchase'],
        operatorNote: 'Create trend before Q2 report',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create trend before Q2 report',
        }),
      );
    });

    it('trims event names in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Trim Events',
        events: ['  purchase  ', 'refund  ', '  open'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          events: ['purchase', 'refund', 'open'],
        }),
      );
    });

    it('drops blank event values and keeps non-blank values', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Filtered Events',
        events: ['purchase', '  ', '\t', 'refund'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          events: ['purchase', 'refund'],
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: 'test',
          name: '',
          events: ['purchase'],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: '',
          name: 'Trend',
          events: ['purchase'],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: 'test',
          name: 'x'.repeat(201),
          events: ['purchase'],
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for invalid granularity', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: 'test',
          name: 'Trend',
          events: ['purchase'],
          granularity: 'quarterly',
        }),
      ).toThrow('granularity must be one of');
    });

    it('throws for empty events array', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: 'test',
          name: 'Trend',
          events: [],
        }),
      ).toThrow('events must contain at least one event name');
    });

    it('throws when events become empty after trimming', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({
          project: 'test',
          name: 'Trend',
          events: ['   ', '\t'],
        }),
      ).toThrow('events must contain at least one event name');
    });
  });

  describe('prepareCloneTrendAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: 'trend-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'trends.clone_trend',
          project: 'test',
          analysisId: 'trend-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: 'trend-789',
        newName: '  Cloned Trend  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Trend',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: 'trend-789',
        operatorNote: 'Clone for experiment baseline',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for experiment baseline',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCloneTrendAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCloneTrendAnalysis({
          project: '',
          analysisId: 'trend-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCloneTrendAnalysis({
          project: 'test',
          analysisId: 'trend-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveTrendAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: 'trend-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'trends.archive_trend',
          project: 'test',
          analysisId: 'trend-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: 'trend-900',
        operatorNote: 'Archive superseded trend analysis',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive superseded trend analysis',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareArchiveTrendAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareArchiveTrendAnalysis({
          project: '',
          analysisId: 'trend-900',
        }),
      ).toThrow('must not be empty');
    });
  });
});
