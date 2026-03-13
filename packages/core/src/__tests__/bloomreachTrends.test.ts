import { describe, it, expect, vi, afterEach } from 'vitest';
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

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateTrendName('\n\tRevenue Trend\t\n')).toBe('Revenue Trend');
  });

  it('accepts single-character name', () => {
    expect(validateTrendName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateTrendName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateTrendName('Trend: Revenue v2')).toBe('Trend: Revenue v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateTrendName(name)).toBe(name);
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateTrendName(' \t  Revenue Trend \n ')).toBe('Revenue Trend');
  });

  it('throws for empty string', () => {
    expect(() => validateTrendName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTrendName('    ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTrendName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTrendName('\n\n')).toThrow('must not be empty');
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

  it('throws for incorrect casing', () => {
    expect(() => validateTrendGranularity('Hourly')).toThrow('granularity must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateTrendGranularity('daily ')).toThrow('granularity must be one of');
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

  it('returns ID containing slashes', () => {
    expect(validateTrendAnalysisId('trend/group/a')).toBe('trend/group/a');
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateTrendAnalysisId('trend.v2-alpha')).toBe('trend.v2-alpha');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTrendAnalysisId('\n')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTrendAnalysisId('\t')).toThrow('must not be empty');
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

  it('encodes unicode characters in project name', () => {
    expect(buildTrendsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/trends');
  });

  it('encodes hash character in project name', () => {
    expect(buildTrendsUrl('my#project')).toBe('/p/my%23project/analytics/trends');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildTrendsUrl('team-alpha')).toBe('/p/team-alpha/analytics/trends');
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

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createTrendActionExecutors();
    await expect(executors[CREATE_TREND_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('clone executor throws "not yet implemented" on execute', async () => {
    const executors = createTrendActionExecutors();
    await expect(executors[CLONE_TREND_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createTrendActionExecutors();
    await expect(executors[ARCHIVE_TREND_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createTrendActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createTrendActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createTrendActionExecutors()).sort();
    const withConfig = Object.keys(createTrendActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createTrendActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
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

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachTrendsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachTrendsService('org/project');
      expect(service.trendsUrl).toBe('/p/org%2Fproject/analytics/trends');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachTrendsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachTrendsService);
    });

    it('exposes trends URL when constructed with apiConfig', () => {
      const service = new BloomreachTrendsService('test', TEST_API_CONFIG);
      expect(service.trendsUrl).toBe('/p/test/analytics/trends');
    });

    it('encodes unicode project name in constructor URL', () => {
      const service = new BloomreachTrendsService('projekt åäö');
      expect(service.trendsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/trends');
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachTrendsService('my#project');
      expect(service.trendsUrl).toBe('/p/my%23project/analytics/trends');
    });
  });

  describe('listTrendAnalyses', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses()).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('validates whitespace-only project override', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.listTrendAnalyses({ project: '   ' })).rejects.toThrow('must not be empty');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachTrendsService('test', TEST_API_CONFIG);
      await expect(service.listTrendAnalyses()).rejects.toThrow('does not provide an endpoint');
    });
  });

  describe('viewTrendResults', () => {
    it('throws no-API-endpoint error with valid minimal input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with full valid input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({
          project: 'test',
          analysisId: 'trend-1',
          granularity: 'daily',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.viewTrendResults({ project: '', analysisId: 'trend-1' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates analysisId input', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(service.viewTrendResults({ project: 'test', analysisId: '   ' })).rejects.toThrow(
        'Trend analysis ID must not be empty',
      );
    });

    it('validates granularity when provided', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1', granularity: 'quarterly' }),
      ).rejects.toThrow('granularity must be one of');
    });

    it('validates date range: malformed startDate', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1', startDate: 'bad-date' }),
      ).rejects.toThrow('startDate must be a valid ISO-8601 date');
    });

    it('validates date range: malformed endDate', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1', endDate: '31-01-2025' }),
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

    it('accepts only startDate and still reaches no-API-endpoint error', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1', startDate: '2025-01-01' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts only endDate and still reaches no-API-endpoint error', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1', endDate: '2025-01-31' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with trimmed project and analysisId', async () => {
      const service = new BloomreachTrendsService('test');
      await expect(
        service.viewTrendResults({ project: '  test  ', analysisId: '  trend-1  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachTrendsService('test', TEST_API_CONFIG);
      await expect(
        service.viewTrendResults({ project: 'test', analysisId: 'trend-1' }),
      ).rejects.toThrow('does not provide an endpoint');
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
        service.prepareCreateTrendAnalysis({ project: 'test', name: '', events: ['purchase'] }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({ project: 'test', name: '   ', events: ['purchase'] }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({ project: '', name: 'Trend', events: ['purchase'] }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCreateTrendAnalysis({ project: '   ', name: 'Trend', events: ['purchase'] }),
      ).toThrow('must not be empty');
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: '  my-project  ',
        name: '  Revenue Trend  ',
        events: ['purchase'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'Revenue Trend',
        }),
      );
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

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachTrendsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: maxName,
        events: ['purchase'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
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

    it('keeps duplicate event names after trimming', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Duplicate Events',
        events: ['purchase', ' purchase '],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          events: ['purchase', 'purchase'],
        }),
      );
    });

    it('accepts slash-containing project after trim', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: '  org/project  ',
        name: 'Trend',
        events: ['purchase'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'org/project',
        }),
      );
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCreateTrendAnalysis({
        project: 'test',
        name: 'Trend',
        events: ['purchase'],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
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

      expect(result.preview).toEqual(expect.objectContaining({ newName: 'Cloned Trend' }));
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
      expect(() => service.prepareCloneTrendAnalysis({ project: 'test', analysisId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachTrendsService('test');
      expect(() => service.prepareCloneTrendAnalysis({ project: 'test', analysisId: '   ' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() => service.prepareCloneTrendAnalysis({ project: '', analysisId: 'trend-789' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCloneTrendAnalysis({ project: '   ', analysisId: 'trend-789' }),
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

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareCloneTrendAnalysis({
          project: 'test',
          analysisId: 'trend-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachTrendsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: 'trend-789',
        newName,
      });

      expect(result.preview).toEqual(expect.objectContaining({ newName }));
    });

    it('trims analysisId in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: '  trend-789  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend-789',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: '  my-project  ',
        analysisId: 'trend-789',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('accepts slash-containing analysisId after trim', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: '  trend/group/a  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend/group/a',
        }),
      );
    });

    it('accepts dots and dashes in analysisId after trim', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: '  trend.v2-alpha  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend.v2-alpha',
        }),
      );
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareCloneTrendAnalysis({
        project: 'test',
        analysisId: 'trend-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
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
      expect(() => service.prepareArchiveTrendAnalysis({ project: 'test', analysisId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareArchiveTrendAnalysis({ project: 'test', analysisId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareArchiveTrendAnalysis({ project: '', analysisId: 'trend-900' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachTrendsService('test');
      expect(() =>
        service.prepareArchiveTrendAnalysis({ project: '   ', analysisId: 'trend-900' }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed analysisId and reaches prepared state', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: '  trend-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend-900',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: '  my-project  ',
        analysisId: 'trend-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('keeps slash-containing analysisId after trim', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: '  trend/group/a  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend/group/a',
        }),
      );
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: 'trend-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('accepts dotted analysisId in archive preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: ' trend.v2-alpha ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'trend.v2-alpha',
        }),
      );
    });

    it('keeps operatorNote as-is in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: 'test',
        analysisId: 'trend-900',
        operatorNote: '  archive after migration  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: '  archive after migration  ',
        }),
      );
    });

    it('accepts slash-containing project in preview', () => {
      const service = new BloomreachTrendsService('test');
      const result = service.prepareArchiveTrendAnalysis({
        project: ' org/project ',
        analysisId: 'trend-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'org/project',
        }),
      );
    });
  });
});
