import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_SQL_REPORT_ACTION_TYPE,
  EXECUTE_SQL_REPORT_ACTION_TYPE,
  EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE,
  CLONE_SQL_REPORT_ACTION_TYPE,
  ARCHIVE_SQL_REPORT_ACTION_TYPE,
  SQL_REPORT_RATE_LIMIT_WINDOW_MS,
  SQL_REPORT_CREATE_RATE_LIMIT,
  SQL_REPORT_EXECUTE_RATE_LIMIT,
  SQL_REPORT_MODIFY_RATE_LIMIT,
  SQL_REPORT_STATUSES,
  SQL_REPORT_EXPORT_FORMATS,
  validateSqlReportName,
  validateSqlReportId,
  validateSqlQuery,
  validateSqlReportExportFormat,
  validateSqlReportStatus,
  buildSqlReportsUrl,
  createSqlReportActionExecutors,
  BloomreachSqlReportsService,
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
  it('exports CREATE_SQL_REPORT_ACTION_TYPE', () => {
    expect(CREATE_SQL_REPORT_ACTION_TYPE).toBe('sql_reports.create_report');
  });

  it('exports EXECUTE_SQL_REPORT_ACTION_TYPE', () => {
    expect(EXECUTE_SQL_REPORT_ACTION_TYPE).toBe('sql_reports.execute_report');
  });

  it('exports EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE', () => {
    expect(EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE).toBe('sql_reports.export_results');
  });

  it('exports CLONE_SQL_REPORT_ACTION_TYPE', () => {
    expect(CLONE_SQL_REPORT_ACTION_TYPE).toBe('sql_reports.clone_report');
  });

  it('exports ARCHIVE_SQL_REPORT_ACTION_TYPE', () => {
    expect(ARCHIVE_SQL_REPORT_ACTION_TYPE).toBe('sql_reports.archive_report');
  });
});

describe('rate limit constants', () => {
  it('exports SQL_REPORT_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(SQL_REPORT_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports SQL_REPORT_CREATE_RATE_LIMIT', () => {
    expect(SQL_REPORT_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports SQL_REPORT_EXECUTE_RATE_LIMIT', () => {
    expect(SQL_REPORT_EXECUTE_RATE_LIMIT).toBe(30);
  });

  it('exports SQL_REPORT_MODIFY_RATE_LIMIT', () => {
    expect(SQL_REPORT_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('SQL_REPORT_STATUSES', () => {
  it('contains 5 statuses', () => {
    expect(SQL_REPORT_STATUSES).toHaveLength(5);
  });

  it('contains expected statuses in order', () => {
    expect(SQL_REPORT_STATUSES).toEqual(['saved', 'running', 'completed', 'failed', 'archived']);
  });
});

describe('SQL_REPORT_EXPORT_FORMATS', () => {
  it('contains 2 formats', () => {
    expect(SQL_REPORT_EXPORT_FORMATS).toHaveLength(2);
  });

  it('contains expected formats in order', () => {
    expect(SQL_REPORT_EXPORT_FORMATS).toEqual(['json', 'csv']);
  });
});

describe('validateSqlReportName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateSqlReportName('  My Report  ')).toBe('My Report');
  });

  it('accepts single-character name', () => {
    expect(validateSqlReportName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateSqlReportName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateSqlReportName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSqlReportName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateSqlReportName(name)).toThrow('must not exceed 200 characters');
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateSqlReportName(' \t  Monthly Report \n ')).toBe('Monthly Report');
  });

  it('preserves internal spacing in valid name', () => {
    expect(validateSqlReportName('Monthly   Report')).toBe('Monthly   Report');
  });

  it('accepts punctuation-heavy name after trim', () => {
    expect(validateSqlReportName('  [Q1] Revenue Report (v2)  ')).toBe('[Q1] Revenue Report (v2)');
  });

  it('throws for too-long name even with surrounding whitespace', () => {
    expect(() => validateSqlReportName(`  ${'x'.repeat(201)}  `)).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateSqlReportId', () => {
  it('returns trimmed report ID for valid input', () => {
    expect(validateSqlReportId('  report-123  ')).toBe('report-123');
  });

  it('throws for empty string', () => {
    expect(() => validateSqlReportId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSqlReportId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateSqlReportId('report-456')).toBe('report-456');
  });

  it('returns ID containing dots and dashes', () => {
    expect(validateSqlReportId('report.v2-alpha')).toBe('report.v2-alpha');
  });

  it('returns ID containing colons', () => {
    expect(validateSqlReportId('report:daily:1')).toBe('report:daily:1');
  });

  it('returns trimmed ID with mixed whitespace', () => {
    expect(validateSqlReportId(' \n\treport-789\t ')).toBe('report-789');
  });

  it('returns unicode ID', () => {
    expect(validateSqlReportId('rapport-åäö')).toBe('rapport-åäö');
  });

  it('throws for tab-only string', () => {
    expect(() => validateSqlReportId('\t')).toThrow('must not be empty');
  });

  it('throws for mixed-whitespace-only string', () => {
    expect(() => validateSqlReportId(' \n\t ')).toThrow('must not be empty');
  });
});

describe('validateSqlQuery', () => {
  it('returns trimmed query for valid input', () => {
    expect(validateSqlQuery('  SELECT 1  ')).toBe('SELECT 1');
  });

  it('accepts single-character query', () => {
    expect(validateSqlQuery('x')).toBe('x');
  });

  it('accepts query at maximum length', () => {
    const query = 'x'.repeat(10000);
    expect(validateSqlQuery(query)).toBe(query);
  });

  it('throws for empty string', () => {
    expect(() => validateSqlQuery('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSqlQuery('   ')).toThrow('must not be empty');
  });

  it('throws for query exceeding maximum length', () => {
    const query = 'x'.repeat(10001);
    expect(() => validateSqlQuery(query)).toThrow('must not exceed 10000 characters');
  });

  it('accepts mixed whitespace around valid query', () => {
    expect(validateSqlQuery(' \t  SELECT * FROM users \n ')).toBe('SELECT * FROM users');
  });

  it('preserves internal whitespace in query', () => {
    expect(validateSqlQuery('SELECT *\n  FROM users\n  WHERE id = 1')).toBe(
      'SELECT *\n  FROM users\n  WHERE id = 1',
    );
  });

  it('throws for too-long query even with surrounding whitespace', () => {
    expect(() => validateSqlQuery(`  ${'x'.repeat(10001)}  `)).toThrow(
      'must not exceed 10000 characters',
    );
  });
});

describe('validateSqlReportExportFormat', () => {
  it('accepts json', () => {
    expect(validateSqlReportExportFormat('json')).toBe('json');
  });

  it('accepts csv', () => {
    expect(validateSqlReportExportFormat('csv')).toBe('csv');
  });

  it('throws for unknown format', () => {
    expect(() => validateSqlReportExportFormat('xml')).toThrow('format must be one of');
  });

  it('throws for empty format', () => {
    expect(() => validateSqlReportExportFormat('')).toThrow('format must be one of');
  });
});

describe('validateSqlReportStatus', () => {
  it('accepts saved', () => {
    expect(validateSqlReportStatus('saved')).toBe('saved');
  });

  it('accepts running', () => {
    expect(validateSqlReportStatus('running')).toBe('running');
  });

  it('accepts completed', () => {
    expect(validateSqlReportStatus('completed')).toBe('completed');
  });

  it('accepts failed', () => {
    expect(validateSqlReportStatus('failed')).toBe('failed');
  });

  it('accepts archived', () => {
    expect(validateSqlReportStatus('archived')).toBe('archived');
  });

  it('throws for unknown status', () => {
    expect(() => validateSqlReportStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateSqlReportStatus('')).toThrow('status must be one of');
  });
});

describe('buildSqlReportsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildSqlReportsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/analytics/sqlreports');
  });

  it('encodes spaces in project name', () => {
    expect(buildSqlReportsUrl('my project')).toBe('/p/my%20project/analytics/sqlreports');
  });

  it('encodes slashes in project name', () => {
    expect(buildSqlReportsUrl('org/project')).toBe('/p/org%2Fproject/analytics/sqlreports');
  });
});

describe('createSqlReportActionExecutors', () => {
  it('returns executors for all five action types', () => {
    const executors = createSqlReportActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_SQL_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[EXECUTE_SQL_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_SQL_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_SQL_REPORT_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createSqlReportActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createSqlReportActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('create executor mentions UI-only in error', async () => {
    const executors = createSqlReportActionExecutors();
    await expect(executors[CREATE_SQL_REPORT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('execute executor mentions UI-only in error', async () => {
    const executors = createSqlReportActionExecutors();
    await expect(executors[EXECUTE_SQL_REPORT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('export executor mentions UI-only in error', async () => {
    const executors = createSqlReportActionExecutors();
    await expect(executors[EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('clone executor mentions UI-only in error', async () => {
    const executors = createSqlReportActionExecutors();
    await expect(executors[CLONE_SQL_REPORT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('archive executor mentions UI-only in error', async () => {
    const executors = createSqlReportActionExecutors();
    await expect(executors[ARCHIVE_SQL_REPORT_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createSqlReportActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createSqlReportActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createSqlReportActionExecutors()).sort();
    const withConfig = Object.keys(createSqlReportActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createSqlReportActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('returns expected action keys', () => {
    const keys = Object.keys(createSqlReportActionExecutors()).sort();
    expect(keys).toEqual(
      [
        ARCHIVE_SQL_REPORT_ACTION_TYPE,
        CLONE_SQL_REPORT_ACTION_TYPE,
        CREATE_SQL_REPORT_ACTION_TYPE,
        EXECUTE_SQL_REPORT_ACTION_TYPE,
        EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE,
      ].sort(),
    );
  });

  it('returns new executor instances on each call', () => {
    const first = createSqlReportActionExecutors(TEST_API_CONFIG);
    const second = createSqlReportActionExecutors(TEST_API_CONFIG);
    expect(first[CREATE_SQL_REPORT_ACTION_TYPE]).not.toBe(second[CREATE_SQL_REPORT_ACTION_TYPE]);
    expect(first[EXECUTE_SQL_REPORT_ACTION_TYPE]).not.toBe(second[EXECUTE_SQL_REPORT_ACTION_TYPE]);
    expect(first[EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE]).not.toBe(
      second[EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE],
    );
    expect(first[CLONE_SQL_REPORT_ACTION_TYPE]).not.toBe(second[CLONE_SQL_REPORT_ACTION_TYPE]);
    expect(first[ARCHIVE_SQL_REPORT_ACTION_TYPE]).not.toBe(second[ARCHIVE_SQL_REPORT_ACTION_TYPE]);
  });

  it('all executors mention UI-only guidance with apiConfig', async () => {
    const executors = createSqlReportActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('uses independent executor maps for configured and unconfigured calls', () => {
    const withoutConfig = createSqlReportActionExecutors();
    const withConfig = createSqlReportActionExecutors(TEST_API_CONFIG);
    expect(withoutConfig).not.toBe(withConfig);
  });

  it('supports custom apiConfig values without changing key set', () => {
    const executors = createSqlReportActionExecutors({
      ...TEST_API_CONFIG,
      baseUrl: 'https://api-alt.test.com',
      projectToken: 'another-token',
    });
    expect(Object.keys(executors).sort()).toEqual(
      [
        CREATE_SQL_REPORT_ACTION_TYPE,
        EXECUTE_SQL_REPORT_ACTION_TYPE,
        EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE,
        CLONE_SQL_REPORT_ACTION_TYPE,
        ARCHIVE_SQL_REPORT_ACTION_TYPE,
      ].sort(),
    );
  });
});

describe('BloomreachSqlReportsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachSqlReportsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachSqlReportsService);
    });

    it('exposes the sql reports URL', () => {
      const service = new BloomreachSqlReportsService('kingdom-of-joakim');
      expect(service.sqlReportsUrl).toBe('/p/kingdom-of-joakim/analytics/sqlreports');
    });

    it('trims project name', () => {
      const service = new BloomreachSqlReportsService('  my-project  ');
      expect(service.sqlReportsUrl).toBe('/p/my-project/analytics/sqlreports');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachSqlReportsService('')).toThrow('must not be empty');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachSqlReportsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachSqlReportsService);
    });

    it('exposes sql reports URL when constructed with apiConfig', () => {
      const service = new BloomreachSqlReportsService('test', TEST_API_CONFIG);
      expect(service.sqlReportsUrl).toBe('/p/test/analytics/sqlreports');
    });

    it('encodes unicode project name in constructor URL', () => {
      const service = new BloomreachSqlReportsService('projekt åäö');
      expect(service.sqlReportsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/sqlreports');
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachSqlReportsService('my#project');
      expect(service.sqlReportsUrl).toBe('/p/my%23project/analytics/sqlreports');
    });

    it('trims and encodes unicode project in constructor URL', () => {
      const service = new BloomreachSqlReportsService('  projekt åäö  ');
      expect(service.sqlReportsUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/sqlreports');
    });

    it('encodes plus sign in constructor URL', () => {
      const service = new BloomreachSqlReportsService('project+beta');
      expect(service.sqlReportsUrl).toBe('/p/project%2Bbeta/analytics/sqlreports');
    });

    it('returns stable sqlReportsUrl with apiConfig across reads', () => {
      const service = new BloomreachSqlReportsService('alpha', TEST_API_CONFIG);
      expect(service.sqlReportsUrl).toBe('/p/alpha/analytics/sqlreports');
      expect(service.sqlReportsUrl).toBe('/p/alpha/analytics/sqlreports');
    });
  });

  describe('listSqlReports', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.listSqlReports()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachSqlReportsService('test', TEST_API_CONFIG);
      await expect(service.listSqlReports()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for unicode project override', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.listSqlReports({ project: 'projekt åäö' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.listSqlReports({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.listSqlReports({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('validates status when provided', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.listSqlReports({ project: 'test', status: 'paused' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.listSqlReports({ project: '', status: 'saved' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewSqlReport', () => {
    it('throws no-API-endpoint error with valid input', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.viewSqlReport({ project: 'test', reportId: 'report-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachSqlReportsService('test', TEST_API_CONFIG);
      await expect(
        service.viewSqlReport({ project: 'test', reportId: 'report-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with trimmed project and reportId', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.viewSqlReport({ project: '  test  ', reportId: '  report-1  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for encoded-looking reportId', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.viewSqlReport({ project: 'test', reportId: 'report%2Fencoded' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts trimmed reportId and reaches no-API-endpoint error', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(
        service.viewSqlReport({ project: 'test', reportId: '  report-99  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project input', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.viewSqlReport({ project: '', reportId: 'report-1' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates reportId input', async () => {
      const service = new BloomreachSqlReportsService('test');
      await expect(service.viewSqlReport({ project: 'test', reportId: '   ' })).rejects.toThrow(
        'Report ID must not be empty',
      );
    });
  });

  describe('prepareCreateSqlReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareCreateSqlReport({
        project: 'test',
        name: 'My SQL Report',
        query: 'SELECT 1',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'sql_reports.create_report',
          project: 'test',
          name: 'My SQL Report',
          query: 'SELECT 1',
        }),
      );
    });

    it('includes parameters in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareCreateSqlReport({
        project: 'test',
        name: 'Parameterized Report',
        query: 'SELECT * FROM events WHERE event_name = :event',
        parameters: { event: 'purchase' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ parameters: { event: 'purchase' } }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareCreateSqlReport({
        project: 'test',
        name: 'Noted Report',
        query: 'SELECT * FROM users',
        operatorNote: 'Created for weekly dashboard sync',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for weekly dashboard sync' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCreateSqlReport({ project: 'test', name: '', query: 'SELECT 1' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCreateSqlReport({ project: '', name: 'Report', query: 'SELECT 1' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty query', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCreateSqlReport({ project: 'test', name: 'Report', query: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCreateSqlReport({
          project: 'test',
          name: 'x'.repeat(201),
          query: 'SELECT 1',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for too-long query', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCreateSqlReport({
          project: 'test',
          name: 'Report',
          query: 'x'.repeat(10001),
        }),
      ).toThrow('must not exceed 10000 characters');
    });
  });

  describe('prepareExecuteSqlReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExecuteSqlReport({
        project: 'test',
        reportId: 'report-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'sql_reports.execute_report',
          project: 'test',
          reportId: 'report-123',
        }),
      );
    });

    it('includes parameters in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExecuteSqlReport({
        project: 'test',
        reportId: 'report-123',
        parameters: { startDate: '2026-01-01', endDate: '2026-01-31' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          parameters: { startDate: '2026-01-01', endDate: '2026-01-31' },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExecuteSqlReport({
        project: 'test',
        reportId: 'report-123',
        operatorNote: 'Run before stakeholder review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Run before stakeholder review' }),
      );
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareExecuteSqlReport({ project: 'test', reportId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareExecuteSqlReport({ project: '', reportId: 'report-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareExportSqlReportResults', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExportSqlReportResults({
        project: 'test',
        reportId: 'report-456',
        format: 'json',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'sql_reports.export_results',
          project: 'test',
          reportId: 'report-456',
          format: 'json',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExportSqlReportResults({
        project: 'test',
        reportId: 'report-456',
        format: 'csv',
        operatorNote: 'Export for finance archive',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Export for finance archive' }),
      );
    });

    it('accepts input without format', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareExportSqlReportResults({
        project: 'test',
        reportId: 'report-456',
      });

      expect(result.preview).toEqual(expect.objectContaining({ format: undefined }));
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareExportSqlReportResults({ project: 'test', reportId: '', format: 'json' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareExportSqlReportResults({
          project: '',
          reportId: 'report-456',
          format: 'json',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid format', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareExportSqlReportResults({
          project: 'test',
          reportId: 'report-456',
          format: 'xml',
        }),
      ).toThrow('format must be one of');
    });
  });

  describe('prepareCloneSqlReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareCloneSqlReport({
        project: 'test',
        reportId: 'report-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'sql_reports.clone_report',
          project: 'test',
          reportId: 'report-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareCloneSqlReport({
        project: 'test',
        reportId: 'report-789',
        newName: '  Cloned SQL Report  ',
      });

      expect(result.preview).toEqual(expect.objectContaining({ newName: 'Cloned SQL Report' }));
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() => service.prepareCloneSqlReport({ project: 'test', reportId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCloneSqlReport({ project: '', reportId: 'report-789' }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareCloneSqlReport({
          project: 'test',
          reportId: 'report-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveSqlReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareArchiveSqlReport({
        project: 'test',
        reportId: 'report-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'sql_reports.archive_report',
          project: 'test',
          reportId: 'report-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachSqlReportsService('test');
      const result = service.prepareArchiveSqlReport({
        project: 'test',
        reportId: 'report-900',
        operatorNote: 'Archive deprecated report',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive deprecated report' }),
      );
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() => service.prepareArchiveSqlReport({ project: 'test', reportId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSqlReportsService('test');
      expect(() =>
        service.prepareArchiveSqlReport({ project: '', reportId: 'report-900' }),
      ).toThrow('must not be empty');
    });
  });
});
