import { describe, it, expect } from 'vitest';
import {
  CREATE_EXPORT_ACTION_TYPE,
  RUN_EXPORT_ACTION_TYPE,
  SCHEDULE_EXPORT_ACTION_TYPE,
  DELETE_EXPORT_ACTION_TYPE,
  EXPORT_RATE_LIMIT_WINDOW_MS,
  EXPORT_CREATE_RATE_LIMIT,
  EXPORT_RUN_RATE_LIMIT,
  EXPORT_SCHEDULE_RATE_LIMIT,
  EXPORT_DELETE_RATE_LIMIT,
  buildExportsUrl,
  buildExportDetailUrl,
  createExportActionExecutors,
  BloomreachExportsService,
  type CreateExportInput,
} from '../index.js';

function createValidCreateExportInput(overrides: Partial<CreateExportInput> = {}): CreateExportInput {
  return {
    project: 'test-project',
    name: 'Customer Export',
    exportType: 'customers',
    dataSelection: {
      attributes: ['email'],
    },
    destination: {
      type: 'sftp',
      host: 'sftp.example.com',
      path: '/exports/customers.csv',
    },
    ...overrides,
  };
}

describe('action type constants', () => {
  it('exports CREATE_EXPORT_ACTION_TYPE', () => {
    expect(CREATE_EXPORT_ACTION_TYPE).toBe('exports.create_export');
  });

  it('exports RUN_EXPORT_ACTION_TYPE', () => {
    expect(RUN_EXPORT_ACTION_TYPE).toBe('exports.run_export');
  });

  it('exports SCHEDULE_EXPORT_ACTION_TYPE', () => {
    expect(SCHEDULE_EXPORT_ACTION_TYPE).toBe('exports.schedule_export');
  });

  it('exports DELETE_EXPORT_ACTION_TYPE', () => {
    expect(DELETE_EXPORT_ACTION_TYPE).toBe('exports.delete_export');
  });
});

describe('rate limit constants', () => {
  it('exports EXPORT_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(EXPORT_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports EXPORT_CREATE_RATE_LIMIT', () => {
    expect(EXPORT_CREATE_RATE_LIMIT).toBe(20);
  });

  it('exports EXPORT_RUN_RATE_LIMIT', () => {
    expect(EXPORT_RUN_RATE_LIMIT).toBe(60);
  });

  it('exports EXPORT_SCHEDULE_RATE_LIMIT', () => {
    expect(EXPORT_SCHEDULE_RATE_LIMIT).toBe(20);
  });

  it('exports EXPORT_DELETE_RATE_LIMIT', () => {
    expect(EXPORT_DELETE_RATE_LIMIT).toBe(20);
  });
});

describe('validateExportName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ name: '  Customer Export  ' }));
    expect(result.preview).toEqual(expect.objectContaining({ name: 'Customer Export' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ name: '' }))).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ name: '   ' }))).toThrow('must not be empty');
  });

  it('throws for too-long input', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ name: 'x'.repeat(201) }))).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachExportsService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareCreateExport(createValidCreateExportInput({ name: value }));
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateExportType', () => {
  it('accepts customers', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ exportType: 'customers' }));
    expect(result.preview).toEqual(expect.objectContaining({ exportType: 'customers' }));
  });

  it('accepts events', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ exportType: 'events' }));
    expect(result.preview).toEqual(expect.objectContaining({ exportType: 'events' }));
  });

  it('normalizes value to lowercase', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ exportType: 'CUSTOMERS' }));
    expect(result.preview).toEqual(expect.objectContaining({ exportType: 'customers' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ exportType: 'profiles' }))).toThrow(
      'must be one of',
    );
  });
});

describe('validateDestinationType', () => {
  it('accepts sftp', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput());
    expect(result.preview).toEqual(expect.objectContaining({ destination: expect.objectContaining({ type: 'sftp' }) }));
  });

  it('accepts s3', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({
        destination: { type: 's3', bucket: 'my-bucket', path: '/exports/customers.csv' },
      }),
    );
    expect(result.preview).toEqual(expect.objectContaining({ destination: expect.objectContaining({ type: 's3' }) }));
  });

  it('accepts email', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({ destination: { type: 'email', email: 'ops@example.com' } }),
    );
    expect(result.preview).toEqual(expect.objectContaining({ destination: expect.objectContaining({ type: 'email' }) }));
  });

  it('accepts webhook', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({ destination: { type: 'webhook', webhookUrl: 'https://api.example.com/export-hook' } }),
    );
    expect(result.preview).toEqual(
      expect.objectContaining({ destination: expect.objectContaining({ type: 'webhook' }) }),
    );
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(
        createValidCreateExportInput({
          destination: { type: 'ftp', host: 'ftp.example.com', path: '/exports/customers.csv' },
        }),
      ),
    ).toThrow('must be one of');
  });
});

describe('validateExportId', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareRunExport({ project: 'test', exportId: '  exp-123  ' });
    expect(result.preview).toEqual(expect.objectContaining({ exportId: 'exp-123' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareRunExport({ project: 'test', exportId: '' })).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareRunExport({ project: 'test', exportId: '   ' })).toThrow('must not be empty');
  });

  it('throws for too-long input', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareRunExport({ project: 'test', exportId: 'x'.repeat(201) })).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachExportsService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareRunExport({ project: 'test', exportId: value });
    expect(result.preview).toEqual(expect.objectContaining({ exportId: value }));
  });
});

describe('validateDataSelection', () => {
  it('accepts attributes only', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({ dataSelection: { attributes: ['email', 'first_name'] } }),
    );
    expect(result.preview).toEqual(
      expect.objectContaining({ dataSelection: expect.objectContaining({ attributes: ['email', 'first_name'] }) }),
    );
  });

  it('accepts events only', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ dataSelection: { events: ['purchase'] } }));
    expect(result.preview).toEqual(
      expect.objectContaining({ dataSelection: expect.objectContaining({ events: ['purchase'] }) }),
    );
  });

  it('accepts segments only', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(createValidCreateExportInput({ dataSelection: { segments: ['vip'] } }));
    expect(result.preview).toEqual(
      expect.objectContaining({ dataSelection: expect.objectContaining({ segments: ['vip'] }) }),
    );
  });

  it('accepts all three lists', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({
        dataSelection: {
          attributes: ['email'],
          events: ['purchase'],
          segments: ['vip'],
        },
      }),
    );
    expect(result.preview).toEqual(
      expect.objectContaining({
        dataSelection: {
          attributes: ['email'],
          events: ['purchase'],
          segments: ['vip'],
        },
      }),
    );
  });

  it('throws when all arrays are empty', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(
        createValidCreateExportInput({ dataSelection: { attributes: [], events: [], segments: [] } }),
      ),
    ).toThrow('must include at least one non-empty list');
  });

  it('throws when all lists are undefined', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ dataSelection: {} }))).toThrow(
      'must include at least one non-empty list',
    );
  });
});

describe('validateDestination', () => {
  it('validates sftp requires host and path', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(createValidCreateExportInput({ destination: { type: 'sftp', host: 'sftp.example.com' } })),
    ).toThrow('requires host and path');
  });

  it('validates s3 requires bucket and path', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(createValidCreateExportInput({ destination: { type: 's3', bucket: 'my-bucket' } })),
    ).toThrow('requires bucket and path');
  });

  it('validates email requires email', () => {
    const service = new BloomreachExportsService('test');
    expect(() => service.prepareCreateExport(createValidCreateExportInput({ destination: { type: 'email' } }))).toThrow(
      'requires email',
    );
  });

  it('validates webhook requires webhookUrl', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(createValidCreateExportInput({ destination: { type: 'webhook' } })),
    ).toThrow('requires webhookUrl');
  });

  it('validates port range 1-65535', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareCreateExport(
      createValidCreateExportInput({
        destination: {
          type: 'sftp',
          host: 'sftp.example.com',
          port: 22,
          path: '/exports/customers.csv',
          username: 'integration-user',
        },
      }),
    );
    expect(result.preview).toEqual(
      expect.objectContaining({ destination: expect.objectContaining({ type: 'sftp', port: 22 }) }),
    );
  });

  it('throws for invalid port', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareCreateExport(
        createValidCreateExportInput({
          destination: {
            type: 'sftp',
            host: 'sftp.example.com',
            port: 70000,
            path: '/exports/customers.csv',
          },
        }),
      ),
    ).toThrow('must be an integer between 1 and 65535');
  });
});

describe('validateSchedule', () => {
  it('validates daily schedule', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareScheduleExport({
      project: 'test',
      exportId: 'exp-1',
      schedule: { frequency: 'daily', time: '09:30', timezone: 'UTC' },
    });
    expect(result.preview).toEqual(
      expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'daily', time: '09:30', timezone: 'UTC' }) }),
    );
  });

  it('validates weekly schedule requires daysOfWeek', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'weekly', time: '09:30', timezone: 'UTC' },
      }),
    ).toThrow('Weekly schedules require daysOfWeek');
  });

  it('validates monthly schedule requires dayOfMonth', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'monthly', time: '09:30', timezone: 'UTC' },
      }),
    ).toThrow('Monthly schedules require dayOfMonth');
  });

  it('validates time format HH:MM', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareScheduleExport({
      project: 'test',
      exportId: 'exp-1',
      schedule: { frequency: 'weekly', daysOfWeek: [1, 3], time: '23:59', timezone: 'UTC' },
    });
    expect(result.preview).toEqual(
      expect.objectContaining({ schedule: expect.objectContaining({ time: '23:59' }) }),
    );
  });

  it('throws for invalid time format', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'daily', time: '9:30', timezone: 'UTC' },
      }),
    ).toThrow('must use HH:MM format');
  });

  it('validates daysOfWeek values from 0 to 6', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareScheduleExport({
      project: 'test',
      exportId: 'exp-1',
      schedule: { frequency: 'weekly', daysOfWeek: [0, 6], time: '10:00', timezone: 'UTC' },
    });
    expect(result.preview).toEqual(
      expect.objectContaining({ schedule: expect.objectContaining({ daysOfWeek: [0, 6] }) }),
    );
  });

  it('throws for invalid day of week', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'weekly', daysOfWeek: [7], time: '10:00', timezone: 'UTC' },
      }),
    ).toThrow('must be an integer from 0 to 6');
  });

  it('validates dayOfMonth range 1 to 31', () => {
    const service = new BloomreachExportsService('test');
    const result = service.prepareScheduleExport({
      project: 'test',
      exportId: 'exp-1',
      schedule: { frequency: 'monthly', dayOfMonth: 31, time: '10:00', timezone: 'UTC' },
    });
    expect(result.preview).toEqual(
      expect.objectContaining({ schedule: expect.objectContaining({ dayOfMonth: 31 }) }),
    );
  });

  it('throws for invalid day of month', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'monthly', dayOfMonth: 0, time: '10:00', timezone: 'UTC' },
      }),
    ).toThrow('must be an integer from 1 to 31');
  });

  it('validates timezone is required', () => {
    const service = new BloomreachExportsService('test');
    expect(() =>
      service.prepareScheduleExport({
        project: 'test',
        exportId: 'exp-1',
        schedule: { frequency: 'daily', time: '10:00', timezone: '   ' },
      }),
    ).toThrow('must not be empty');
  });
});

describe('buildExportsUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildExportsUrl('my-project')).toBe('/p/my-project/data/exports');
  });

  it('encodes spaces', () => {
    expect(buildExportsUrl('my project')).toBe('/p/my%20project/data/exports');
  });

  it('encodes slashes', () => {
    expect(buildExportsUrl('org/project')).toBe('/p/org%2Fproject/data/exports');
  });
});

describe('buildExportDetailUrl', () => {
  it('builds URL with project and export ID', () => {
    expect(buildExportDetailUrl('my-project', 'exp-123')).toBe('/p/my-project/data/exports/exp-123');
  });

  it('encodes spaces in project and export ID', () => {
    expect(buildExportDetailUrl('my project', 'exp 123')).toBe('/p/my%20project/data/exports/exp%20123');
  });
});

describe('createExportActionExecutors', () => {
  it('returns executors for all 4 action types', () => {
    const executors = createExportActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CREATE_EXPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[RUN_EXPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[SCHEDULE_EXPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_EXPORT_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createExportActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('each executor throws not yet implemented on execute', async () => {
    const executors = createExportActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachExportsService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachExportsService('my-project');
      expect(service).toBeInstanceOf(BloomreachExportsService);
    });

    it('exposes exportsUrl getter with correct path', () => {
      const service = new BloomreachExportsService('my-project');
      expect(service.exportsUrl).toBe('/p/my-project/data/exports');
    });

    it('trims project name', () => {
      const service = new BloomreachExportsService('  my-project  ');
      expect(service.exportsUrl).toBe('/p/my-project/data/exports');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachExportsService('')).toThrow('must not be empty');
    });
  });

  describe('listExports', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.listExports()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.listExports({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('viewExportStatus', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportStatus({ project: 'test', exportId: 'exp-1' })).rejects.toThrow('not yet implemented');
    });

    it('validates project', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportStatus({ project: '', exportId: 'exp-1' })).rejects.toThrow('must not be empty');
    });

    it('validates exportId', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportStatus({ project: 'test', exportId: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('viewExportHistory', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportHistory({ project: 'test', exportId: 'exp-1' })).rejects.toThrow('not yet implemented');
    });

    it('validates project', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportHistory({ project: '', exportId: 'exp-1' })).rejects.toThrow('must not be empty');
    });

    it('validates exportId', async () => {
      const service = new BloomreachExportsService('test');
      await expect(service.viewExportHistory({ project: 'test', exportId: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareCreateExport', () => {
    it('returns prepared action with valid input, preview includes all fields', () => {
      const service = new BloomreachExportsService('test');
      const result = service.prepareCreateExport({
        project: 'test',
        name: '  Customer Segment Export  ',
        exportType: 'EVENTS',
        dataSelection: {
          attributes: [' email ', ' first_name '],
          events: [' purchase '],
          segments: [' vip '],
        },
        destination: {
          type: 's3',
          bucket: '  my-bucket  ',
          path: '  /exports/daily.csv  ',
          region: '  us-east-1  ',
          accessKeyId: '  key-123  ',
          secretAccessKey: '  secret-123  ',
          fileNameTemplate: '  customers-{{date}}.csv  ',
        },
        schedule: {
          frequency: 'weekly',
          daysOfWeek: [1, 3, 5],
          time: '08:15',
          timezone: '  UTC  ',
        },
        operatorNote: '  Run every business day  ',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'exports.create_export',
          project: 'test',
          name: 'Customer Segment Export',
          exportType: 'events',
          dataSelection: {
            attributes: ['email', 'first_name'],
            events: ['purchase'],
            segments: ['vip'],
          },
          destination: {
            type: 's3',
            host: undefined,
            port: undefined,
            username: undefined,
            password: undefined,
            path: '/exports/daily.csv',
            bucket: 'my-bucket',
            region: 'us-east-1',
            accessKeyId: 'key-123',
            secretAccessKey: 'secret-123',
            email: undefined,
            webhookUrl: undefined,
            fileNameTemplate: 'customers-{{date}}.csv',
          },
          schedule: {
            frequency: 'weekly',
            daysOfWeek: [1, 3, 5],
            dayOfMonth: undefined,
            time: '08:15',
            timezone: 'UTC',
          },
          operatorNote: 'Run every business day',
        }),
      );
    });

    it('throws for empty export name', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareCreateExport(createValidCreateExportInput({ name: '' }))).toThrow('must not be empty');
    });

    it('throws for invalid export type', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareCreateExport(createValidCreateExportInput({ exportType: 'profiles' }))).toThrow(
        'must be one of',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareCreateExport(createValidCreateExportInput({ project: '' }))).toThrow('must not be empty');
    });

    it('validates dataSelection', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareCreateExport(createValidCreateExportInput({ dataSelection: { events: [] } }))).toThrow(
        'must include at least one non-empty list',
      );
    });

    it('validates destination', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareCreateExport(
          createValidCreateExportInput({ destination: { type: 'webhook', webhookUrl: '   ' } }),
        ),
      ).toThrow('must not be empty');
    });

    it('validates optional schedule', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareCreateExport(
          createValidCreateExportInput({
            schedule: { frequency: 'weekly', time: '10:00', timezone: 'UTC' },
          }),
        ),
      ).toThrow('Weekly schedules require daysOfWeek');
    });
  });

  describe('prepareRunExport', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachExportsService('test');
      const result = service.prepareRunExport({
        project: 'test',
        exportId: '  exp-123  ',
        operatorNote: '  Run now  ',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'exports.run_export',
          project: 'test',
          exportId: 'exp-123',
          operatorNote: 'Run now',
        }),
      );
    });

    it('throws for empty export ID', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareRunExport({ project: 'test', exportId: '' })).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareRunExport({ project: '', exportId: 'exp-123' })).toThrow('must not be empty');
    });
  });

  describe('prepareScheduleExport', () => {
    it('returns prepared action with valid input including schedule', () => {
      const service = new BloomreachExportsService('test');
      const result = service.prepareScheduleExport({
        project: 'test',
        exportId: '  exp-456  ',
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 15,
          time: '11:45',
          timezone: '  Europe/Prague  ',
        },
        operatorNote: '  Monthly refresh  ',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'exports.schedule_export',
          project: 'test',
          exportId: 'exp-456',
          schedule: {
            frequency: 'monthly',
            daysOfWeek: undefined,
            dayOfMonth: 15,
            time: '11:45',
            timezone: 'Europe/Prague',
          },
          operatorNote: 'Monthly refresh',
        }),
      );
    });

    it('throws for empty export ID', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareScheduleExport({
          project: 'test',
          exportId: '',
          schedule: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareScheduleExport({
          project: '',
          exportId: 'exp-1',
          schedule: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid schedule frequency', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareScheduleExport({
          project: 'test',
          exportId: 'exp-1',
          schedule: { frequency: 'hourly', time: '09:00', timezone: 'UTC' },
        }),
      ).toThrow('must be one of');
    });

    it('validates time format', () => {
      const service = new BloomreachExportsService('test');
      expect(() =>
        service.prepareScheduleExport({
          project: 'test',
          exportId: 'exp-1',
          schedule: { frequency: 'daily', time: '24:61', timezone: 'UTC' },
        }),
      ).toThrow('must use 24-hour HH:MM values');
    });
  });

  describe('prepareDeleteExport', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachExportsService('test');
      const result = service.prepareDeleteExport({
        project: 'test',
        exportId: '  exp-789  ',
        operatorNote: '  Remove stale export  ',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'exports.delete_export',
          project: 'test',
          exportId: 'exp-789',
          operatorNote: 'Remove stale export',
        }),
      );
    });

    it('throws for empty export ID', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareDeleteExport({ project: 'test', exportId: '' })).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachExportsService('test');
      expect(() => service.prepareDeleteExport({ project: '', exportId: 'exp-789' })).toThrow('must not be empty');
    });
  });
});
