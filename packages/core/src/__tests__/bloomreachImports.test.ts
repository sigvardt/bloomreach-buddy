import { describe, it, expect } from 'vitest';
import {
  CREATE_IMPORT_ACTION_TYPE,
  SCHEDULE_IMPORT_ACTION_TYPE,
  CANCEL_IMPORT_ACTION_TYPE,
  IMPORTS_RATE_LIMIT_WINDOW_MS,
  IMPORTS_CREATE_RATE_LIMIT,
  IMPORTS_SCHEDULE_RATE_LIMIT,
  IMPORTS_CANCEL_RATE_LIMIT,
  buildImportsUrl,
  createImportsActionExecutors,
  BloomreachImportsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_IMPORT_ACTION_TYPE as imports.create_import', () => {
    expect(CREATE_IMPORT_ACTION_TYPE).toBe('imports.create_import');
  });

  it('exports SCHEDULE_IMPORT_ACTION_TYPE as imports.schedule_import', () => {
    expect(SCHEDULE_IMPORT_ACTION_TYPE).toBe('imports.schedule_import');
  });

  it('exports CANCEL_IMPORT_ACTION_TYPE as imports.cancel_import', () => {
    expect(CANCEL_IMPORT_ACTION_TYPE).toBe('imports.cancel_import');
  });
});

describe('rate limit constants', () => {
  it('IMPORTS_RATE_LIMIT_WINDOW_MS is 3_600_000', () => {
    expect(IMPORTS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('IMPORTS_CREATE_RATE_LIMIT is 20', () => {
    expect(IMPORTS_CREATE_RATE_LIMIT).toBe(20);
  });

  it('IMPORTS_SCHEDULE_RATE_LIMIT is 10', () => {
    expect(IMPORTS_SCHEDULE_RATE_LIMIT).toBe(10);
  });

  it('IMPORTS_CANCEL_RATE_LIMIT is 20', () => {
    expect(IMPORTS_CANCEL_RATE_LIMIT).toBe(20);
  });
});

describe('validateImportName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: '  my-import  ',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(expect.objectContaining({ name: 'my-import' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: '',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: '   ',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for too-long input (201 chars)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'x'.repeat(201),
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not exceed 200 characters');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachImportsService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareCreateImport({
      project: 'test',
      name: value,
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateImportType', () => {
  it('accepts csv', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'csv' }));
  });

  it('accepts api', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/customers',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'api' }));
  });

  it('throws for invalid enum value (xml)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'xml',
        source: 'https://example.com/import.xml',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must be one of');
  });

  it('normalizes to lowercase', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'CSV',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'csv' }));
  });
});

describe('validateImportSource', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: '  https://storage.example.com/customers.csv  ',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({ source: 'https://storage.example.com/customers.csv' }),
    );
  });

  it('throws for empty string', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: '',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: '   ',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for too-long input (>2000 chars)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: `https://example.com/${'x'.repeat(1989)}`,
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not exceed 2000 characters');
  });

  it('throws for invalid URL (relative path)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: '/relative/path',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must be a valid absolute URL');
  });
});

describe('validateImportId', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCancelImport({ project: 'test', importId: '  import-123  ' });
    expect(result.preview).toEqual(expect.objectContaining({ importId: 'import-123' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachImportsService('test');
    expect(() => service.prepareCancelImport({ project: 'test', importId: '' })).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachImportsService('test');
    expect(() => service.prepareCancelImport({ project: 'test', importId: '   ' })).toThrow('must not be empty');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachImportsService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareCancelImport({ project: 'test', importId: value });
    expect(result.preview).toEqual(expect.objectContaining({ importId: value }));
  });

  it('throws for too-long input (201 chars)', () => {
    const service = new BloomreachImportsService('test');
    expect(() => service.prepareCancelImport({ project: 'test', importId: 'x'.repeat(201) })).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateMapping', () => {
  it('valid mapping trims column and property names', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [
        { sourceColumn: '  email  ', targetProperty: '  customer_email  ' },
        { sourceColumn: '  name  ', targetProperty: '  first_name  ' },
      ],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [
          expect.objectContaining({ sourceColumn: 'email', targetProperty: 'customer_email' }),
          expect.objectContaining({ sourceColumn: 'name', targetProperty: 'first_name' }),
        ],
      }),
    );
  });

  it('throws for empty sourceColumn', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: '   ', targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for empty targetProperty', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: '   ' }],
      }),
    ).toThrow('must not be empty');
  });

  it('throws for too-long sourceColumn (>200 chars)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'x'.repeat(201), targetProperty: 'customer_email' }],
      }),
    ).toThrow('must not exceed 200 characters');
  });

  it('throws for too-long targetProperty (>200 chars)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: 'x'.repeat(201) }],
      }),
    ).toThrow('must not exceed 200 characters');
  });
});

describe('validateScheduleFrequency', () => {
  it('accepts daily', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareScheduleImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/events',
      mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
      schedule: { frequency: 'daily', isActive: true },
    });
    expect(result.preview).toEqual(expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'daily' }) }));
  });

  it('accepts weekly', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareScheduleImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/events',
      mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
      schedule: { frequency: 'weekly', isActive: true },
    });
    expect(result.preview).toEqual(expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'weekly' }) }));
  });

  it('accepts monthly', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareScheduleImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/events',
      mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
      schedule: { frequency: 'monthly', isActive: true },
    });
    expect(result.preview).toEqual(expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'monthly' }) }));
  });

  it('accepts custom', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareScheduleImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/events',
      mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
      schedule: { frequency: 'custom', cronExpression: '0 2 * * *', isActive: true },
    });
    expect(result.preview).toEqual(expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'custom' }) }));
  });

  it('throws for invalid enum value (hourly)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareScheduleImport({
        project: 'test',
        name: 'import',
        type: 'api',
        source: 'https://api.example.com/events',
        mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
        schedule: { frequency: 'hourly', isActive: true },
      }),
    ).toThrow('must be one of');
  });

  it('normalizes to lowercase', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareScheduleImport({
      project: 'test',
      name: 'import',
      type: 'api',
      source: 'https://api.example.com/events',
      mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
      schedule: { frequency: 'DAILY', isActive: true },
    });
    expect(result.preview).toEqual(expect.objectContaining({ schedule: expect.objectContaining({ frequency: 'daily' }) }));
  });
});

describe('validateMappingTransformationType', () => {
  it('accepts direct', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email', transformationType: 'direct' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'direct' })],
      }),
    );
  });

  it('accepts concatenate', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'name', targetProperty: 'full_name', transformationType: 'concatenate' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'concatenate' })],
      }),
    );
  });

  it('accepts split', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'name', targetProperty: 'first_name', transformationType: 'split' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'split' })],
      }),
    );
  });

  it('accepts format', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'created_at', targetProperty: 'createdAt', transformationType: 'format' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'format' })],
      }),
    );
  });

  it('accepts lookup', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'country_code', targetProperty: 'country', transformationType: 'lookup' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'lookup' })],
      }),
    );
  });

  it('normalizes to lowercase', () => {
    const service = new BloomreachImportsService('test');
    const result = service.prepareCreateImport({
      project: 'test',
      name: 'import',
      type: 'csv',
      source: 'https://example.com/import.csv',
      mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email', transformationType: 'DIRECT' }],
    });
    expect(result.preview).toEqual(
      expect.objectContaining({
        mapping: [expect.objectContaining({ transformationType: 'direct' })],
      }),
    );
  });

  it('throws for invalid enum value (merge)', () => {
    const service = new BloomreachImportsService('test');
    expect(() =>
      service.prepareCreateImport({
        project: 'test',
        name: 'import',
        type: 'csv',
        source: 'https://example.com/import.csv',
        mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email', transformationType: 'merge' }],
      }),
    ).toThrow('must be one of');
  });
});

describe('buildImportsUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildImportsUrl('my-project')).toBe('/p/my-project/data/imports');
  });

  it('encodes spaces', () => {
    expect(buildImportsUrl('my project')).toBe('/p/my%20project/data/imports');
  });

  it('encodes slashes', () => {
    expect(buildImportsUrl('org/project')).toBe('/p/org%2Fproject/data/imports');
  });
});

describe('createImportsActionExecutors', () => {
  it('returns executors for all 3 action types', () => {
    const executors = createImportsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_IMPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[SCHEDULE_IMPORT_ACTION_TYPE]).toBeDefined();
    expect(executors[CANCEL_IMPORT_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createImportsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('each executor throws not yet implemented on execute', async () => {
    const executors = createImportsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachImportsService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachImportsService('my-project');
      expect(service).toBeInstanceOf(BloomreachImportsService);
    });

    it('exposes importsUrl getter with correct path', () => {
      const service = new BloomreachImportsService('my-project');
      expect(service.importsUrl).toBe('/p/my-project/data/imports');
    });

    it('trims project name', () => {
      const service = new BloomreachImportsService('  my-project  ');
      expect(service.importsUrl).toBe('/p/my-project/data/imports');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachImportsService('')).toThrow('must not be empty');
    });
  });

  describe('listImports', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachImportsService('test');
      await expect(service.listImports()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachImportsService('test');
      await expect(service.listImports({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('viewImportStatus', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachImportsService('test');
      await expect(service.viewImportStatus({ project: 'test', importId: 'import-123' })).rejects.toThrow(
        'not yet implemented',
      );
    });

    it('validates project', async () => {
      const service = new BloomreachImportsService('test');
      await expect(service.viewImportStatus({ project: '', importId: 'import-123' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates importId (throws for empty)', async () => {
      const service = new BloomreachImportsService('test');
      await expect(service.viewImportStatus({ project: 'test', importId: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateImport', () => {
    it('returns prepared action with valid input, preview includes all fields', () => {
      const service = new BloomreachImportsService('test');
      const result = service.prepareCreateImport({
        project: 'test',
        name: '  Customer Import Q1  ',
        type: 'csv',
        source: '  https://storage.example.com/customers.csv  ',
        mapping: [
          { sourceColumn: '  email  ', targetProperty: '  customer_email  ' },
          {
            sourceColumn: '  name  ',
            targetProperty: '  first_name  ',
            transformationType: 'direct',
          },
        ],
        operatorNote: 'Quarterly customer import',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'imports.create_import',
          project: 'test',
          name: 'Customer Import Q1',
          type: 'csv',
          source: 'https://storage.example.com/customers.csv',
          mapping: [
            { sourceColumn: 'email', targetProperty: 'customer_email' },
            {
              sourceColumn: 'name',
              targetProperty: 'first_name',
              transformationType: 'direct',
            },
          ],
          operatorNote: 'Quarterly customer import',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareCreateImport({
          project: 'test',
          name: '',
          type: 'csv',
          source: 'https://storage.example.com/customers.csv',
          mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid type', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareCreateImport({
          project: 'test',
          name: 'Customer Import Q1',
          type: 'xml',
          source: 'https://storage.example.com/customers.csv',
          mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
        }),
      ).toThrow('must be one of');
    });

    it('throws for empty source', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareCreateImport({
          project: 'test',
          name: 'Customer Import Q1',
          type: 'csv',
          source: '',
          mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid source URL', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareCreateImport({
          project: 'test',
          name: 'Customer Import Q1',
          type: 'csv',
          source: '/relative/path',
          mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
        }),
      ).toThrow('must be a valid absolute URL');
    });

    it('throws for empty project', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareCreateImport({
          project: '',
          name: 'Customer Import Q1',
          type: 'csv',
          source: 'https://storage.example.com/customers.csv',
          mapping: [{ sourceColumn: 'email', targetProperty: 'customer_email' }],
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareScheduleImport', () => {
    it('returns prepared action with valid input including schedule config', () => {
      const service = new BloomreachImportsService('test');
      const result = service.prepareScheduleImport({
        project: 'test',
        name: '  Daily Event Import  ',
        type: 'api',
        source: '  https://api.example.com/events  ',
        mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
        schedule: {
          frequency: 'daily',
          cronExpression: '0 2 * * *',
          isActive: true,
        },
        operatorNote: 'Nightly event sync',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'imports.schedule_import',
          project: 'test',
          name: 'Daily Event Import',
          type: 'api',
          source: 'https://api.example.com/events',
          mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
          schedule: {
            frequency: 'daily',
            cronExpression: '0 2 * * *',
            isActive: true,
          },
          operatorNote: 'Nightly event sync',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareScheduleImport({
          project: 'test',
          name: '',
          type: 'api',
          source: 'https://api.example.com/events',
          mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
          schedule: { frequency: 'daily', isActive: true },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid type', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareScheduleImport({
          project: 'test',
          name: 'Daily Event Import',
          type: 'xml',
          source: 'https://api.example.com/events',
          mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
          schedule: { frequency: 'daily', isActive: true },
        }),
      ).toThrow('must be one of');
    });

    it('throws for invalid frequency', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareScheduleImport({
          project: 'test',
          name: 'Daily Event Import',
          type: 'api',
          source: 'https://api.example.com/events',
          mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
          schedule: { frequency: 'hourly', isActive: true },
        }),
      ).toThrow('must be one of');
    });

    it('throws for empty project', () => {
      const service = new BloomreachImportsService('test');
      expect(() =>
        service.prepareScheduleImport({
          project: '',
          name: 'Daily Event Import',
          type: 'api',
          source: 'https://api.example.com/events',
          mapping: [{ sourceColumn: 'event_id', targetProperty: 'id' }],
          schedule: { frequency: 'daily', isActive: true },
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCancelImport', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachImportsService('test');
      const result = service.prepareCancelImport({
        project: 'test',
        importId: '  import-123  ',
        operatorNote: 'Cancel stale import',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'imports.cancel_import',
          project: 'test',
          importId: 'import-123',
          operatorNote: 'Cancel stale import',
        }),
      );
    });

    it('throws for empty importId', () => {
      const service = new BloomreachImportsService('test');
      expect(() => service.prepareCancelImport({ project: 'test', importId: '' })).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachImportsService('test');
      expect(() => service.prepareCancelImport({ project: '', importId: 'import-123' })).toThrow('must not be empty');
    });
  });
});
