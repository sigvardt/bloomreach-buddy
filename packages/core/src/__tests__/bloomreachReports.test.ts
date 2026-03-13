import { describe, it, expect } from 'vitest';
import {
  CREATE_REPORT_ACTION_TYPE,
  CLONE_REPORT_ACTION_TYPE,
  ARCHIVE_REPORT_ACTION_TYPE,
  EXPORT_REPORT_ACTION_TYPE,
  REPORT_RATE_LIMIT_WINDOW_MS,
  REPORT_CREATE_RATE_LIMIT,
  REPORT_MODIFY_RATE_LIMIT,
  REPORT_EXPORT_RATE_LIMIT,
  REPORT_EXPORT_FORMATS,
  REPORT_SORT_ORDERS,
  validateReportName,
  validateReportId,
  validateMetrics,
  validateReportExportFormat,
  validateSortOrder,
  validateLimit,
  buildReportsUrl,
  createReportActionExecutors,
  BloomreachReportsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_REPORT_ACTION_TYPE', () => {
    expect(CREATE_REPORT_ACTION_TYPE).toBe('reports.create_report');
  });

  it('exports CLONE_REPORT_ACTION_TYPE', () => {
    expect(CLONE_REPORT_ACTION_TYPE).toBe('reports.clone_report');
  });

  it('exports ARCHIVE_REPORT_ACTION_TYPE', () => {
    expect(ARCHIVE_REPORT_ACTION_TYPE).toBe('reports.archive_report');
  });

  it('exports EXPORT_REPORT_ACTION_TYPE', () => {
    expect(EXPORT_REPORT_ACTION_TYPE).toBe('reports.export_report');
  });
});

describe('rate limit constants', () => {
  it('exports REPORT_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(REPORT_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports REPORT_CREATE_RATE_LIMIT', () => {
    expect(REPORT_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports REPORT_MODIFY_RATE_LIMIT', () => {
    expect(REPORT_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports REPORT_EXPORT_RATE_LIMIT', () => {
    expect(REPORT_EXPORT_RATE_LIMIT).toBe(30);
  });
});

describe('REPORT_EXPORT_FORMATS', () => {
  it('contains csv and xlsx', () => {
    expect(REPORT_EXPORT_FORMATS).toEqual(['csv', 'xlsx']);
  });
});

describe('REPORT_SORT_ORDERS', () => {
  it('contains asc and desc', () => {
    expect(REPORT_SORT_ORDERS).toEqual(['asc', 'desc']);
  });
});

describe('validateReportName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateReportName('  My Report  ')).toBe('My Report');
  });

  it('accepts single-character name', () => {
    expect(validateReportName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateReportName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateReportName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateReportName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateReportName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateReportId', () => {
  it('returns trimmed report ID for valid input', () => {
    expect(validateReportId('  report-123  ')).toBe('report-123');
  });

  it('throws for empty string', () => {
    expect(() => validateReportId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateReportId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateReportId('report-456')).toBe('report-456');
  });
});

describe('validateMetrics', () => {
  it('returns trimmed metrics for valid input', () => {
    expect(validateMetrics(['  count  ', 'sum'])).toEqual(['count', 'sum']);
  });

  it('accepts single metric', () => {
    expect(validateMetrics(['count'])).toEqual(['count']);
  });

  it('throws for empty array', () => {
    expect(() => validateMetrics([])).toThrow('At least one metric is required');
  });

  it('throws for array with empty string', () => {
    expect(() => validateMetrics(['count', ''])).toThrow('Metric names must not be empty');
  });

  it('throws for array with whitespace-only string', () => {
    expect(() => validateMetrics(['count', '   '])).toThrow('Metric names must not be empty');
  });
});

describe('validateReportExportFormat', () => {
  it('accepts csv', () => {
    expect(validateReportExportFormat('csv')).toBe('csv');
  });

  it('accepts xlsx', () => {
    expect(validateReportExportFormat('xlsx')).toBe('xlsx');
  });

  it('throws for invalid format', () => {
    expect(() => validateReportExportFormat('json')).toThrow('Export format must be one of');
  });
});

describe('validateSortOrder', () => {
  it('accepts asc', () => {
    expect(validateSortOrder('asc')).toBe('asc');
  });

  it('accepts desc', () => {
    expect(validateSortOrder('desc')).toBe('desc');
  });

  it('throws for invalid order', () => {
    expect(() => validateSortOrder('ascending')).toThrow('Sort order must be one of');
  });
});

describe('validateLimit', () => {
  it('accepts valid limit', () => {
    expect(validateLimit(100)).toBe(100);
  });

  it('accepts minimum limit of 1', () => {
    expect(validateLimit(1)).toBe(1);
  });

  it('accepts maximum limit of 10000', () => {
    expect(validateLimit(10_000)).toBe(10_000);
  });

  it('throws for limit below minimum', () => {
    expect(() => validateLimit(0)).toThrow('Limit must be an integer between 1 and 10000');
  });

  it('throws for limit above maximum', () => {
    expect(() => validateLimit(10_001)).toThrow('Limit must be an integer between 1 and 10000');
  });

  it('throws for non-integer limit', () => {
    expect(() => validateLimit(1.5)).toThrow('Limit must be an integer between 1 and 10000');
  });
});

describe('buildReportsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildReportsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/analytics/reports',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildReportsUrl('my project')).toBe('/p/my%20project/analytics/reports');
  });

  it('encodes slashes in project name', () => {
    expect(buildReportsUrl('org/project')).toBe('/p/org%2Fproject/analytics/reports');
  });
});

describe('createReportActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createReportActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CREATE_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_REPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[EXPORT_REPORT_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createReportActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createReportActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachReportsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachReportsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachReportsService);
    });

    it('exposes the reports URL', () => {
      const service = new BloomreachReportsService('kingdom-of-joakim');
      expect(service.reportsUrl).toBe('/p/kingdom-of-joakim/analytics/reports');
    });

    it('trims project name', () => {
      const service = new BloomreachReportsService('  my-project  ');
      expect(service.reportsUrl).toBe('/p/my-project/analytics/reports');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachReportsService('')).toThrow('must not be empty');
    });
  });

  describe('listReports', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachReportsService('test');
      await expect(service.listReports()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.listReports({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewReportResults', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.viewReportResults({ project: 'test', reportId: 'report-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.viewReportResults({ project: '', reportId: 'report-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates reportId input', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.viewReportResults({ project: 'test', reportId: '   ' }),
      ).rejects.toThrow('Report ID must not be empty');
    });

    it('validates limit when provided', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.viewReportResults({ project: 'test', reportId: 'report-1', limit: 0 }),
      ).rejects.toThrow('Limit must be an integer between 1 and 10000');
    });

    it('validates sort order when provided', async () => {
      const service = new BloomreachReportsService('test');
      await expect(
        service.viewReportResults({
          project: 'test',
          reportId: 'report-1',
          sort: { column: 'count', order: 'invalid' as unknown as 'asc' },
        }),
      ).rejects.toThrow('Sort order must be one of');
    });
  });

  describe('prepareCreateReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'My Report',
        metrics: ['count'],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'reports.create_report',
          project: 'test',
          name: 'My Report',
          metrics: ['count'],
        }),
      );
    });

    it('includes metrics in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count', 'sum', 'average'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ metrics: ['count', 'sum', 'average'] }),
      );
    });

    it('includes dimensions in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        dimensions: ['event_type', 'customer_id'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ dimensions: ['event_type', 'customer_id'] }),
      );
    });

    it('defaults dimensions to empty array when not provided', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ dimensions: [] }),
      );
    });

    it('includes dateRange in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        }),
      );
    });

    it('includes filters in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        filters: [{ attribute: 'event_type', operator: 'equals', value: 'purchase' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: [{ attribute: 'event_type', operator: 'equals', value: 'purchase' }],
        }),
      );
    });

    it('includes sort in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        sort: { column: 'count', order: 'desc' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          sort: { column: 'count', order: 'desc' },
        }),
      );
    });

    it('includes grouping in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        grouping: [{ attribute: 'event_type' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          grouping: [{ attribute: 'event_type' }],
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCreateReport({
        project: 'test',
        name: 'Report',
        metrics: ['count'],
        operatorNote: 'Created for Q1 analysis',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for Q1 analysis' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCreateReport({ project: 'test', name: '', metrics: ['count'] }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCreateReport({ project: '', name: 'Report', metrics: ['count'] }),
      ).toThrow('must not be empty');
    });

    it('throws for empty metrics', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCreateReport({ project: 'test', name: 'Report', metrics: [] }),
      ).toThrow('At least one metric is required');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCreateReport({
          project: 'test',
          name: 'x'.repeat(201),
          metrics: ['count'],
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('validates sort order when provided', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCreateReport({
          project: 'test',
          name: 'Report',
          metrics: ['count'],
          sort: { column: 'count', order: 'invalid' as unknown as 'asc' },
        }),
      ).toThrow('Sort order must be one of');
    });
  });

  describe('prepareExportReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareExportReport({
        project: 'test',
        reportId: 'report-123',
        format: 'csv',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'reports.export_report',
          project: 'test',
          reportId: 'report-123',
          format: 'csv',
        }),
      );
    });

    it('accepts xlsx format', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareExportReport({
        project: 'test',
        reportId: 'report-123',
        format: 'xlsx',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ format: 'xlsx' }),
      );
    });

    it('includes dateRange in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareExportReport({
        project: 'test',
        reportId: 'report-123',
        format: 'csv',
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        }),
      );
    });

    it('includes filters in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareExportReport({
        project: 'test',
        reportId: 'report-123',
        format: 'csv',
        filters: [{ attribute: 'event_type', operator: 'equals', value: 'purchase' }],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: [{ attribute: 'event_type', operator: 'equals', value: 'purchase' }],
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareExportReport({
        project: 'test',
        reportId: 'report-123',
        format: 'csv',
        operatorNote: 'Export for stakeholder review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Export for stakeholder review' }),
      );
    });

    it('throws for invalid format', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareExportReport({
          project: 'test',
          reportId: 'report-123',
          format: 'json',
        }),
      ).toThrow('Export format must be one of');
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareExportReport({
          project: 'test',
          reportId: '',
          format: 'csv',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareExportReport({
          project: '',
          reportId: 'report-123',
          format: 'csv',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCloneReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCloneReport({
        project: 'test',
        reportId: 'report-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'reports.clone_report',
          project: 'test',
          reportId: 'report-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCloneReport({
        project: 'test',
        reportId: 'report-789',
        newName: '  Cloned Report  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ newName: 'Cloned Report' }),
      );
    });

    it('omits newName from preview when not provided', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCloneReport({
        project: 'test',
        reportId: 'report-789',
      });

      expect(result.preview.newName).toBeUndefined();
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareCloneReport({
        project: 'test',
        reportId: 'report-789',
        operatorNote: 'Clone for testing',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Clone for testing' }),
      );
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCloneReport({ project: 'test', reportId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCloneReport({ project: '', reportId: 'report-789' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only newName', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareCloneReport({
          project: 'test',
          reportId: 'report-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveReport', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareArchiveReport({
        project: 'test',
        reportId: 'report-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'reports.archive_report',
          project: 'test',
          reportId: 'report-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachReportsService('test');
      const result = service.prepareArchiveReport({
        project: 'test',
        reportId: 'report-456',
        operatorNote: 'Archive after migration',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive after migration' }),
      );
    });

    it('throws for empty reportId', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareArchiveReport({ project: 'test', reportId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachReportsService('test');
      expect(() =>
        service.prepareArchiveReport({ project: '', reportId: 'report-456' }),
      ).toThrow('must not be empty');
    });
  });
});
