import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CREATE_RETENTION_ACTION_TYPE,
  CLONE_RETENTION_ACTION_TYPE,
  ARCHIVE_RETENTION_ACTION_TYPE,
  RETENTION_RATE_LIMIT_WINDOW_MS,
  RETENTION_CREATE_RATE_LIMIT,
  RETENTION_MODIFY_RATE_LIMIT,
  RETENTION_GRANULARITIES,
  validateRetentionName,
  validateRetentionGranularity,
  validateRetentionAnalysisId,
  validateEventName,
  buildRetentionsUrl,
  createRetentionActionExecutors,
  BloomreachRetentionsService,
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
  it('exports CREATE_RETENTION_ACTION_TYPE', () => {
    expect(CREATE_RETENTION_ACTION_TYPE).toBe('retentions.create_retention');
  });

  it('exports CLONE_RETENTION_ACTION_TYPE', () => {
    expect(CLONE_RETENTION_ACTION_TYPE).toBe('retentions.clone_retention');
  });

  it('exports ARCHIVE_RETENTION_ACTION_TYPE', () => {
    expect(ARCHIVE_RETENTION_ACTION_TYPE).toBe('retentions.archive_retention');
  });
});

describe('rate limit constants', () => {
  it('exports RETENTION_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(RETENTION_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports RETENTION_CREATE_RATE_LIMIT', () => {
    expect(RETENTION_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports RETENTION_MODIFY_RATE_LIMIT', () => {
    expect(RETENTION_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('RETENTION_GRANULARITIES', () => {
  it('contains exactly four values', () => {
    expect(RETENTION_GRANULARITIES).toHaveLength(4);
  });

  it('contains hourly at index 0', () => {
    expect(RETENTION_GRANULARITIES[0]).toBe('hourly');
  });

  it('contains daily at index 1', () => {
    expect(RETENTION_GRANULARITIES[1]).toBe('daily');
  });

  it('contains weekly at index 2', () => {
    expect(RETENTION_GRANULARITIES[2]).toBe('weekly');
  });

  it('contains monthly at index 3', () => {
    expect(RETENTION_GRANULARITIES[3]).toBe('monthly');
  });

  it('matches the expected set exactly', () => {
    expect(RETENTION_GRANULARITIES).toEqual([
      'hourly',
      'daily',
      'weekly',
      'monthly',
    ]);
  });
});

describe('validateRetentionName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateRetentionName('  My Retention  ')).toBe('My Retention');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateRetentionName('\n\tRetention Name\t\n')).toBe(
      'Retention Name',
    );
  });

  it('accepts single-character name', () => {
    expect(validateRetentionName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateRetentionName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateRetentionName('Retention: Weekly v2')).toBe(
      'Retention: Weekly v2',
    );
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateRetentionName(name)).toBe(name);
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateRetentionName(' \t  Cohort 7 Days \n ')).toBe(
      'Cohort 7 Days',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateRetentionName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateRetentionName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateRetentionName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateRetentionName('\n\n')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateRetentionName(name)).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateRetentionGranularity', () => {
  it('accepts hourly granularity', () => {
    expect(validateRetentionGranularity('hourly')).toBe('hourly');
  });

  it('accepts daily granularity', () => {
    expect(validateRetentionGranularity('daily')).toBe('daily');
  });

  it('accepts weekly granularity', () => {
    expect(validateRetentionGranularity('weekly')).toBe('weekly');
  });

  it('accepts monthly granularity', () => {
    expect(validateRetentionGranularity('monthly')).toBe('monthly');
  });

  it('throws for empty string', () => {
    expect(() => validateRetentionGranularity('')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateRetentionGranularity('   ')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for invalid value', () => {
    expect(() => validateRetentionGranularity('yearly')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for incorrect casing', () => {
    expect(() => validateRetentionGranularity('Daily')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for value with trailing space', () => {
    expect(() => validateRetentionGranularity('daily ')).toThrow(
      'granularity must be one of',
    );
  });
});

describe('validateRetentionAnalysisId', () => {
  it('returns trimmed retention analysis ID for valid input', () => {
    expect(validateRetentionAnalysisId('  retention-123  ')).toBe(
      'retention-123',
    );
  });

  it('returns same value when already trimmed', () => {
    expect(validateRetentionAnalysisId('retention-456')).toBe('retention-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateRetentionAnalysisId('analysis/segment/a')).toBe(
      'analysis/segment/a',
    );
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateRetentionAnalysisId('retention.v2-alpha')).toBe(
      'retention.v2-alpha',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateRetentionAnalysisId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateRetentionAnalysisId('   ')).toThrow(
      'must not be empty',
    );
  });

  it('throws for newline-only string', () => {
    expect(() => validateRetentionAnalysisId('\n')).toThrow(
      'must not be empty',
    );
  });

  it('throws for tab-only string', () => {
    expect(() => validateRetentionAnalysisId('\t')).toThrow(
      'must not be empty',
    );
  });
});

describe('validateEventName', () => {
  it('validates cohortEvent with trimmed input', () => {
    expect(validateEventName('cohortEvent', '  first_open  ')).toBe(
      'first_open',
    );
  });

  it('validates returnEvent with trimmed input', () => {
    expect(validateEventName('returnEvent', '  session_start  ')).toBe(
      'session_start',
    );
  });

  it('accepts punctuation in event name', () => {
    expect(validateEventName('cohortEvent', 'checkout:started.v2')).toBe(
      'checkout:started.v2',
    );
  });

  it('accepts mixed alphanumeric event name', () => {
    expect(validateEventName('returnEvent', 'return_event_v2')).toBe(
      'return_event_v2',
    );
  });

  it('throws for empty cohortEvent', () => {
    expect(() => validateEventName('cohortEvent', '')).toThrow(
      'cohortEvent must not be empty',
    );
  });

  it('throws for whitespace-only cohortEvent', () => {
    expect(() => validateEventName('cohortEvent', '   ')).toThrow(
      'cohortEvent must not be empty',
    );
  });

  it('throws for tab-only cohortEvent', () => {
    expect(() => validateEventName('cohortEvent', '\t')).toThrow(
      'cohortEvent must not be empty',
    );
  });

  it('throws for empty returnEvent', () => {
    expect(() => validateEventName('returnEvent', '')).toThrow(
      'returnEvent must not be empty',
    );
  });

  it('throws for whitespace-only returnEvent', () => {
    expect(() => validateEventName('returnEvent', '   ')).toThrow(
      'returnEvent must not be empty',
    );
  });

  it('throws for newline-only returnEvent', () => {
    expect(() => validateEventName('returnEvent', '\n')).toThrow(
      'returnEvent must not be empty',
    );
  });
});

describe('buildRetentionsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildRetentionsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/analytics/retentions',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildRetentionsUrl('my project')).toBe(
      '/p/my%20project/analytics/retentions',
    );
  });

  it('encodes slashes in project name', () => {
    expect(buildRetentionsUrl('org/project')).toBe(
      '/p/org%2Fproject/analytics/retentions',
    );
  });

  it('encodes unicode characters in project name', () => {
    expect(buildRetentionsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/retentions',
    );
  });

  it('encodes hash character in project name', () => {
    expect(buildRetentionsUrl('my#project')).toBe(
      '/p/my%23project/analytics/retentions',
    );
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildRetentionsUrl('team-alpha')).toBe(
      '/p/team-alpha/analytics/retentions',
    );
  });
});

describe('createRetentionActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createRetentionActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_RETENTION_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_RETENTION_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_RETENTION_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createRetentionActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createRetentionActionExecutors();
    await expect(executors[CREATE_RETENTION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('clone executor throws "not yet implemented" on execute', async () => {
    const executors = createRetentionActionExecutors();
    await expect(executors[CLONE_RETENTION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('archive executor throws "not yet implemented" on execute', async () => {
    const executors = createRetentionActionExecutors();
    await expect(executors[ARCHIVE_RETENTION_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createRetentionActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createRetentionActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachRetentionsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachRetentionsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachRetentionsService);
    });

    it('exposes the retentions URL', () => {
      const service = new BloomreachRetentionsService('kingdom-of-joakim');
      expect(service.retentionsUrl).toBe('/p/kingdom-of-joakim/analytics/retentions');
    });

    it('trims project name', () => {
      const service = new BloomreachRetentionsService('  my-project  ');
      expect(service.retentionsUrl).toBe('/p/my-project/analytics/retentions');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachRetentionsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachRetentionsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachRetentionsService('org/project');
      expect(service.retentionsUrl).toBe('/p/org%2Fproject/analytics/retentions');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachRetentionsService);
    });

    it('exposes retentions URL when constructed with apiConfig', () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      expect(service.retentionsUrl).toBe('/p/test/analytics/retentions');
    });
  });

  describe('listRetentionAnalyses', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(service.listRetentionAnalyses()).rejects.toThrow(
        'does not provide a list endpoint',
      );
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(service.listRetentionAnalyses({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(service.listRetentionAnalyses({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(
        service.listRetentionAnalyses({ project: 'kingdom-of-joakim' }),
      ).rejects.toThrow('does not provide a list endpoint');
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(
        service.listRetentionAnalyses({ project: '  kingdom-of-joakim  ' }),
      ).rejects.toThrow('does not provide a list endpoint');
    });
  });

  describe('viewRetentionResults', () => {
    it('throws API credential error when apiConfig is not provided', async () => {
      const service = new BloomreachRetentionsService('test');
      await expect(
        service.viewRetentionResults({ project: 'test', analysisId: 'retention-1' }),
      ).rejects.toThrow('requires API credentials');
    });

    it('validates project input', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({ project: '', analysisId: 'retention-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({ project: '   ', analysisId: 'retention-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates analysisId input', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({ project: 'test', analysisId: '   ' }),
      ).rejects.toThrow('Retention analysis ID must not be empty');
    });

    it('validates empty analysisId input', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({ project: 'test', analysisId: '' }),
      ).rejects.toThrow('Retention analysis ID must not be empty');
    });

    it('returns retention results from API response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            header: ['cohort_date', 'cohort_size', 'period_0', 'period_1', 'period_2'],
            rows: [
              ['2024-01-01', 500, 1.0, 0.75, 0.6],
              ['2024-01-08', 300, 1.0, 0.8, 0.65],
            ],
            success: true,
            name: 'Weekly Retention',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      const result = await service.viewRetentionResults({
        project: 'test',
        analysisId: 'retention-1',
      });

      expect(result).toEqual({
        analysisId: 'retention-1',
        analysisName: 'Weekly Retention',
        cohortEvent: '',
        returnEvent: '',
        granularity: 'daily',
        startDate: '',
        endDate: '',
        cohorts: [
          {
            cohortDate: '2024-01-01',
            cohortSize: 500,
            retentionByPeriod: [1.0, 0.75, 0.6],
          },
          {
            cohortDate: '2024-01-08',
            cohortSize: 300,
            retentionByPeriod: [1.0, 0.8, 0.65],
          },
        ],
      });
    });

    it('handles empty rows in API response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            header: ['cohort_date', 'cohort_size', 'period_0', 'period_1'],
            rows: [],
            success: true,
            name: 'Empty Retention',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      const result = await service.viewRetentionResults({
        project: 'test',
        analysisId: 'retention-1',
      });

      expect(result.cohorts).toEqual([]);
    });

    it('throws on unsuccessful API response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({ project: 'test', analysisId: 'retention-1' }),
      ).rejects.toThrow('unexpected API response format');
    });

    it('handles null cell values in rows', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            header: ['cohort_date', 'cohort_size', 'period_0', 'period_1'],
            rows: [
              [null, null, null, null],
              ['2024-01-08', 300, 1.0, 0.8],
            ],
            success: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      const result = await service.viewRetentionResults({
        project: 'test',
        analysisId: 'retention-1',
      });

      expect(result.cohorts[0]).toEqual({
        cohortDate: '',
        cohortSize: 0,
        retentionByPeriod: [0, 0],
      });
      expect(result.cohorts[1]).toEqual({
        cohortDate: '2024-01-08',
        cohortSize: 300,
        retentionByPeriod: [1.0, 0.8],
      });
    });

    it('uses analysisId as analysisName when name is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            header: ['cohort_date', 'cohort_size', 'period_0'],
            rows: [['2024-01-01', 100, 1.0]],
            success: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      const result = await service.viewRetentionResults({
        project: 'test',
        analysisId: 'retention-xyz',
      });

      expect(result.analysisName).toBe('retention-xyz');
    });

    it('includes date range from input in results', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            header: ['cohort_date', 'cohort_size', 'period_0'],
            rows: [['2024-01-01', 100, 1.0]],
            success: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      const result = await service.viewRetentionResults({
        project: 'test',
        analysisId: 'retention-1',
        granularity: 'weekly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.granularity).toBe('weekly');
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
    });

    it('validates granularity when provided', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({
          project: 'test',
          analysisId: 'retention-1',
          granularity: 'yearly',
        }),
      ).rejects.toThrow('granularity must be one of');
    });

    it('validates startDate format when date range is provided', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({
          project: 'test',
          analysisId: 'retention-1',
          startDate: '01-01-2025',
        }),
      ).rejects.toThrow('startDate must be a valid ISO-8601 date');
    });

    it('validates endDate format when date range is provided', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({
          project: 'test',
          analysisId: 'retention-1',
          endDate: '2025/01/31',
        }),
      ).rejects.toThrow('endDate must be a valid ISO-8601 date');
    });

    it('validates date ordering when both dates are provided', async () => {
      const service = new BloomreachRetentionsService('test', TEST_API_CONFIG);
      await expect(
        service.viewRetentionResults({
          project: 'test',
          analysisId: 'retention-1',
          startDate: '2025-02-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('must not be after endDate');
    });
  });

  describe('prepareCreateRetentionAnalysis', () => {
    it('returns a prepared action with valid minimal input', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Weekly Retention',
        cohortEvent: 'signup',
        returnEvent: 'purchase',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'retentions.create_retention',
          project: 'test',
          name: 'Weekly Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      );
    });

    it('includes granularity in preview when provided', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Daily Retention',
        cohortEvent: 'signup',
        returnEvent: 'session_start',
        granularity: 'daily',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          granularity: 'daily',
        }),
      );
    });

    it('includes dateRange in preview when provided', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Range Retention',
        cohortEvent: 'signup',
        returnEvent: 'purchase',
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
        }),
      );
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Filtered Retention',
        cohortEvent: 'signup',
        returnEvent: 'purchase',
        filters: {
          customerAttributes: { segment: 'vip', locale: 'en_US' },
          eventProperties: { channel: 'email' },
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: {
            customerAttributes: { segment: 'vip', locale: 'en_US' },
            eventProperties: { channel: 'email' },
          },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Retention',
        cohortEvent: 'signup',
        returnEvent: 'purchase',
        operatorNote: 'Create before weekly analytics review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create before weekly analytics review',
        }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: '  my-project  ',
        name: '  My Retention  ',
        cohortEvent: 'signup',
        returnEvent: 'purchase',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'My Retention',
        }),
      );
    });

    it('trims cohortEvent and returnEvent in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: 'Retention',
        cohortEvent: '  signup  ',
        returnEvent: '  purchase  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: '',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: '   ',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: '',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: '   ',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'x'.repeat(201),
          cohortEvent: 'signup',
          returnEvent: 'purchase',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for invalid granularity', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
          granularity: 'yearly',
        }),
      ).toThrow('granularity must be one of');
    });

    it('throws for invalid start date in dateRange', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
          dateRange: { startDate: '2025/01/01', endDate: '2025-01-31' },
        }),
      ).toThrow('startDate must be a valid ISO-8601 date');
    });

    it('throws for invalid end date in dateRange', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
          dateRange: { startDate: '2025-01-01', endDate: '31-01-2025' },
        }),
      ).toThrow('endDate must be a valid ISO-8601 date');
    });

    it('throws for startDate after endDate in dateRange', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: 'purchase',
          dateRange: { startDate: '2025-02-01', endDate: '2025-01-31' },
        }),
      ).toThrow('must not be after endDate');
    });

    it('throws for empty cohortEvent', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: '',
          returnEvent: 'purchase',
        }),
      ).toThrow('cohortEvent must not be empty');
    });

    it('throws for whitespace-only returnEvent', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCreateRetentionAnalysis({
          project: 'test',
          name: 'Retention',
          cohortEvent: 'signup',
          returnEvent: '   ',
        }),
      ).toThrow('returnEvent must not be empty');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachRetentionsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateRetentionAnalysis({
        project: 'test',
        name: maxName,
        cohortEvent: 'signup',
        returnEvent: 'purchase',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareCloneRetentionAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCloneRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'retentions.clone_retention',
          project: 'test',
          analysisId: 'retention-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCloneRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-789',
        newName: '  Cloned Retention  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Retention',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCloneRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-789',
        operatorNote: 'Clone for campaign variant',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for campaign variant',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: '',
          analysisId: 'retention-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: '   ',
          analysisId: 'retention-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: 'test',
          analysisId: 'retention-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareCloneRetentionAnalysis({
          project: 'test',
          analysisId: 'retention-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachRetentionsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-789',
        newName,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName,
        }),
      );
    });

    it('trims analysisId and reaches prepared state', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCloneRetentionAnalysis({
        project: 'test',
        analysisId: '  retention-789  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'retention-789',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareCloneRetentionAnalysis({
        project: '  my-project  ',
        analysisId: 'retention-789',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });
  });

  describe('prepareArchiveRetentionAnalysis', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'retentions.archive_retention',
          project: 'test',
          analysisId: 'retention-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-900',
        operatorNote: 'Archive legacy retention analysis',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive legacy retention analysis',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareArchiveRetentionAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareArchiveRetentionAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareArchiveRetentionAnalysis({
          project: '',
          analysisId: 'retention-900',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachRetentionsService('test');
      expect(() =>
        service.prepareArchiveRetentionAnalysis({
          project: '   ',
          analysisId: 'retention-900',
        }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed analysisId and reaches prepared state', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: 'test',
        analysisId: '  retention-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'retention-900',
        }),
      );
    });

    it('trims project and reaches prepared state', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: '  my-project  ',
        analysisId: 'retention-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('keeps slash-containing analysisId after trim', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: 'test',
        analysisId: '  retention/group/a  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          analysisId: 'retention/group/a',
        }),
      );
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachRetentionsService('test');
      const result = service.prepareArchiveRetentionAnalysis({
        project: 'test',
        analysisId: 'retention-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
