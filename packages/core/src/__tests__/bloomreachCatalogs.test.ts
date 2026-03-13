import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_CATALOG_ACTION_TYPE,
  ADD_CATALOG_ITEMS_ACTION_TYPE,
  UPDATE_CATALOG_ITEMS_ACTION_TYPE,
  DELETE_CATALOG_ACTION_TYPE,
  CATALOG_RATE_LIMIT_WINDOW_MS,
  CATALOG_CREATE_RATE_LIMIT,
  CATALOG_MODIFY_RATE_LIMIT,
  VALID_CATALOG_FIELD_TYPES,
  validateCatalogName,
  validateCatalogId,
  validateCatalogSchema,
  validateCatalogItems,
  validateCatalogItemUpdates,
  buildCatalogsUrl,
  createCatalogActionExecutors,
  BloomreachCatalogsService,
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
  it('exports CREATE_CATALOG_ACTION_TYPE', () => {
    expect(CREATE_CATALOG_ACTION_TYPE).toBe('catalogs.create_catalog');
  });

  it('exports ADD_CATALOG_ITEMS_ACTION_TYPE', () => {
    expect(ADD_CATALOG_ITEMS_ACTION_TYPE).toBe('catalogs.add_catalog_items');
  });

  it('exports UPDATE_CATALOG_ITEMS_ACTION_TYPE', () => {
    expect(UPDATE_CATALOG_ITEMS_ACTION_TYPE).toBe('catalogs.update_catalog_items');
  });

  it('exports DELETE_CATALOG_ACTION_TYPE', () => {
    expect(DELETE_CATALOG_ACTION_TYPE).toBe('catalogs.delete_catalog');
  });
});

describe('rate limit constants', () => {
  it('exports CATALOG_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(CATALOG_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports CATALOG_CREATE_RATE_LIMIT', () => {
    expect(CATALOG_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports CATALOG_MODIFY_RATE_LIMIT', () => {
    expect(CATALOG_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('validateCatalogName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateCatalogName('  Product Catalog  ')).toBe('Product Catalog');
  });

  it('accepts single-character name', () => {
    expect(validateCatalogName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateCatalogName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateCatalogName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCatalogName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateCatalogName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateCatalogId', () => {
  it('returns trimmed catalog ID for valid input', () => {
    expect(validateCatalogId('  catalog-123  ')).toBe('catalog-123');
  });

  it('throws for empty string', () => {
    expect(() => validateCatalogId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCatalogId('   ')).toThrow('must not be empty');
  });
});

describe('validateCatalogSchema', () => {
  it('returns valid schema', () => {
    const schema = { sku: 'string', price: 'number' };
    expect(validateCatalogSchema(schema)).toEqual(schema);
  });

  it('throws for empty schema', () => {
    expect(() => validateCatalogSchema({})).toThrow('at least one field');
  });

  it('throws for empty field name', () => {
    expect(() => validateCatalogSchema({ '   ': 'string' })).toThrow('field names must not be empty');
  });

  it('throws for invalid field type', () => {
    expect(() => validateCatalogSchema({ sku: 'invalid_type' })).toThrow(
      'Invalid catalog field type "invalid_type"',
    );
  });

  it('accepts all valid field types', () => {
    const schema: Record<string, string> = {};
    let i = 0;
    for (const fieldType of VALID_CATALOG_FIELD_TYPES) {
      schema[`field_${i++}`] = fieldType;
    }
    expect(Object.keys(validateCatalogSchema(schema)).length).toBe(VALID_CATALOG_FIELD_TYPES.size);
  });
});

describe('validateCatalogItems', () => {
  it('returns valid items', () => {
    const items = [{ sku: 'ABC-123' }, { sku: 'XYZ-999' }];
    expect(validateCatalogItems(items)).toEqual(items);
  });

  it('throws for empty array', () => {
    expect(() => validateCatalogItems([])).toThrow('at least one item');
  });
});

describe('validateCatalogItemUpdates', () => {
  it('returns valid updates with trimmed IDs', () => {
    const updates = [
      { id: '  item-1  ', properties: { price: 100 } },
      { id: 'item-2', properties: { price: 200 } },
    ];
    expect(validateCatalogItemUpdates(updates)).toEqual([
      { id: 'item-1', properties: { price: 100 } },
      { id: 'item-2', properties: { price: 200 } },
    ]);
  });

  it('throws for empty array', () => {
    expect(() => validateCatalogItemUpdates([])).toThrow('at least one item');
  });

  it('throws for empty item ID', () => {
    expect(() => validateCatalogItemUpdates([{ id: '   ', properties: { price: 100 } }])).toThrow(
      'Catalog item ID must not be empty',
    );
  });
});

describe('buildCatalogsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildCatalogsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/crm/catalogs');
  });

  it('encodes spaces in project name', () => {
    expect(buildCatalogsUrl('my project')).toBe('/p/my%20project/crm/catalogs');
  });

  it('encodes slashes in project name', () => {
    expect(buildCatalogsUrl('org/project')).toBe('/p/org%2Fproject/crm/catalogs');
  });
});

describe('createCatalogActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createCatalogActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CREATE_CATALOG_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_CATALOG_ITEMS_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_CATALOG_ITEMS_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_CATALOG_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createCatalogActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors require API credentials when apiConfig is not provided', async () => {
    const executors = createCatalogActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('requires API credentials');
    }
  });

  it('executors attempt API calls when apiConfig is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const executors = createCatalogActionExecutors(TEST_API_CONFIG);
    await executors[CREATE_CATALOG_ACTION_TYPE].execute({
      name: 'Products',
      schema: { sku: 'string', price: 'number' },
    });
    await executors[ADD_CATALOG_ITEMS_ACTION_TYPE].execute({
      catalogId: 'catalog-1',
      items: [{ item_id: 'item-1', properties: { sku: 'ABC-1' } }],
    });
    await executors[UPDATE_CATALOG_ITEMS_ACTION_TYPE].execute({
      catalogId: 'catalog-1',
      items: [{ id: 'item-1', properties: { price: 100 } }],
    });
    await executors[DELETE_CATALOG_ACTION_TYPE].execute({
      catalogId: 'catalog-1',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});

describe('BloomreachCatalogsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachCatalogsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachCatalogsService);
    });

    it('exposes the catalogs URL', () => {
      const service = new BloomreachCatalogsService('kingdom-of-joakim');
      expect(service.catalogsUrl).toBe('/p/kingdom-of-joakim/crm/catalogs');
    });

    it('trims project name', () => {
      const service = new BloomreachCatalogsService('  my-project  ');
      expect(service.catalogsUrl).toBe('/p/my-project/crm/catalogs');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachCatalogsService('')).toThrow('must not be empty');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachCatalogsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachCatalogsService);
    });
  });

  describe('listCatalogs', () => {
    it('throws API credential error when apiConfig is not provided', async () => {
      const service = new BloomreachCatalogsService('test');
      await expect(service.listCatalogs()).rejects.toThrow('requires API credentials');
    });

    it('returns mapped catalogs when apiConfig is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: 'catalog-1', name: 'Products' },
              { id: 'catalog-2', name: 'Accessories' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const service = new BloomreachCatalogsService('test', TEST_API_CONFIG);
      const result = await service.listCatalogs({ project: 'test' });

      expect(result).toEqual([
        {
          id: 'catalog-1',
          name: 'Products',
          itemCount: 0,
          schema: {},
          url: '',
        },
        {
          id: 'catalog-2',
          name: 'Accessories',
          itemCount: 0,
          schema: {},
          url: '',
        },
      ]);
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachCatalogsService('test');
      await expect(service.listCatalogs({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('viewCatalogItems', () => {
    it('throws API credential error with valid input when apiConfig is not provided', async () => {
      const service = new BloomreachCatalogsService('test');
      await expect(
        service.viewCatalogItems({ project: 'test', catalogId: 'catalog-1' }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns mapped catalog items page when apiConfig is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                catalog_id: 'catalog-1',
                item_id: 'item-1',
                properties: { sku: 'ABC-1', price: 100 },
              },
            ],
            limit: 20,
            skip: 0,
            matched: 1,
            total: 5,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const service = new BloomreachCatalogsService('test', TEST_API_CONFIG);
      const result = await service.viewCatalogItems({
        project: 'test',
        catalogId: 'catalog-1',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({
        items: [
          {
            id: 'item-1',
            catalogId: 'catalog-1',
            properties: { sku: 'ABC-1', price: 100 },
          },
        ],
        totalCount: 5,
        page: 1,
        pageSize: 20,
      });
    });

    it('validates project input', async () => {
      const service = new BloomreachCatalogsService('test');
      await expect(
        service.viewCatalogItems({ project: '', catalogId: 'catalog-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates catalogId input', async () => {
      const service = new BloomreachCatalogsService('test');
      await expect(
        service.viewCatalogItems({ project: 'test', catalogId: '   ' }),
      ).rejects.toThrow('Catalog ID must not be empty');
    });
  });

  describe('prepareCreateCatalog', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCatalogsService('test');
      const result = service.prepareCreateCatalog({
        project: 'test',
        name: 'Products',
        schema: { sku: 'string' },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'catalogs.create_catalog',
          project: 'test',
          name: 'Products',
          schema: { sku: 'string' },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachCatalogsService('test');
      const result = service.prepareCreateCatalog({
        project: 'test',
        name: 'Products',
        schema: { sku: 'string' },
        operatorNote: 'Create catalog for spring launch',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Create catalog for spring launch' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareCreateCatalog({
          project: 'test',
          name: '',
          schema: { sku: 'string' },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareCreateCatalog({
          project: '',
          name: 'Products',
          schema: { sku: 'string' },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty schema', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareCreateCatalog({
          project: 'test',
          name: 'Products',
          schema: {},
        }),
      ).toThrow('at least one field');
    });
  });

  describe('prepareAddCatalogItems', () => {
    it('returns a prepared action with itemCount in preview', () => {
      const service = new BloomreachCatalogsService('test');
      const result = service.prepareAddCatalogItems({
        project: 'test',
        catalogId: 'catalog-123',
        items: [{ sku: 'A' }, { sku: 'B' }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'catalogs.add_catalog_items',
          project: 'test',
          catalogId: 'catalog-123',
          itemCount: 2,
        }),
      );
    });

    it('throws for empty catalogId', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareAddCatalogItems({
          project: 'test',
          catalogId: '',
          items: [{ sku: 'A' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareAddCatalogItems({
          project: '',
          catalogId: 'catalog-123',
          items: [{ sku: 'A' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty items', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareAddCatalogItems({
          project: 'test',
          catalogId: 'catalog-123',
          items: [],
        }),
      ).toThrow('at least one item');
    });
  });

  describe('prepareUpdateCatalogItems', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCatalogsService('test');
      const result = service.prepareUpdateCatalogItems({
        project: 'test',
        catalogId: 'catalog-123',
        items: [{ id: 'item-1', properties: { price: 300 } }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'catalogs.update_catalog_items',
          project: 'test',
          catalogId: 'catalog-123',
          itemCount: 1,
        }),
      );
    });

    it('throws for empty catalogId', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareUpdateCatalogItems({
          project: 'test',
          catalogId: '',
          items: [{ id: 'item-1', properties: { price: 300 } }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareUpdateCatalogItems({
          project: '',
          catalogId: 'catalog-123',
          items: [{ id: 'item-1', properties: { price: 300 } }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty items', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() =>
        service.prepareUpdateCatalogItems({
          project: 'test',
          catalogId: 'catalog-123',
          items: [],
        }),
      ).toThrow('at least one item');
    });
  });

  describe('prepareDeleteCatalog', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachCatalogsService('test');
      const result = service.prepareDeleteCatalog({
        project: 'test',
        catalogId: 'catalog-999',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'catalogs.delete_catalog',
          project: 'test',
          catalogId: 'catalog-999',
        }),
      );
    });

    it('throws for empty catalogId', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() => service.prepareDeleteCatalog({ project: 'test', catalogId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCatalogsService('test');
      expect(() => service.prepareDeleteCatalog({ project: '', catalogId: 'catalog-999' })).toThrow(
        'must not be empty',
      );
    });
  });
});
