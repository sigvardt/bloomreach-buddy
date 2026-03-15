import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_CATALOG_ACTION_TYPE = 'catalogs.create_catalog';
export const ADD_CATALOG_ITEMS_ACTION_TYPE = 'catalogs.add_catalog_items';
export const UPDATE_CATALOG_ITEMS_ACTION_TYPE = 'catalogs.update_catalog_items';
export const DELETE_CATALOG_ACTION_TYPE = 'catalogs.delete_catalog';

export const CATALOG_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const CATALOG_CREATE_RATE_LIMIT = 10;
export const CATALOG_MODIFY_RATE_LIMIT = 20;

export interface BloomreachCatalog {
  id: string;
  name: string;
  itemCount: number;
  schema: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface CatalogItem {
  id: string;
  catalogId: string;
  properties: Record<string, unknown>;
}

export interface CatalogItemsPage {
  items: CatalogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ListCatalogsInput {
  project: string;
}

export interface ViewCatalogItemsInput {
  project: string;
  catalogId: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCatalogInput {
  project: string;
  name: string;
  schema: Record<string, string>;
  operatorNote?: string;
}

export interface AddCatalogItemsInput {
  project: string;
  catalogId: string;
  items: Record<string, unknown>[];
  operatorNote?: string;
}

export interface UpdateCatalogItemsInput {
  project: string;
  catalogId: string;
  items: { id: string; properties: Record<string, unknown> }[];
  operatorNote?: string;
}

export interface DeleteCatalogInput {
  project: string;
  catalogId: string;
  operatorNote?: string;
}

export interface PreparedCatalogAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export const VALID_CATALOG_FIELD_TYPES = new Set([
  'string',
  'long text',
  'number',
  'boolean',
  'date',
  'datetime',
  'duration',
  'list',
  'url',
  'json',
]);

const MAX_CATALOG_NAME_LENGTH = 200;
const MIN_CATALOG_NAME_LENGTH = 1;

export function validateCatalogName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_CATALOG_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog name must not be empty.');
  }
  if (trimmed.length > MAX_CATALOG_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Catalog name must not exceed ${MAX_CATALOG_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateCatalogId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog ID must not be empty.');
  }
  return trimmed;
}

export function validateCatalogSchema(schema: Record<string, string>): Record<string, string> {
  const entries = Object.entries(schema);
  if (entries.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog schema must include at least one field.');
  }

  const normalizedSchema: Record<string, string> = {};
  for (const [fieldName, fieldType] of entries) {
    const normalizedFieldName = fieldName.trim();
    if (normalizedFieldName.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog schema field names must not be empty.');
    }
    if (!VALID_CATALOG_FIELD_TYPES.has(fieldType)) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid catalog field type "${fieldType}" for field "${normalizedFieldName}". ` +
        `Valid types: ${[...VALID_CATALOG_FIELD_TYPES].join(', ')}.`);
    }
    normalizedSchema[normalizedFieldName] = fieldType;
  }

  return normalizedSchema;
}

export function validateCatalogItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  if (items.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog items must include at least one item.');
  }
  return items;
}

export function validateCatalogItemUpdates(
  items: { id: string; properties: Record<string, unknown> }[],
): { id: string; properties: Record<string, unknown> }[] {
  if (items.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog item updates must include at least one item.');
  }

  return items.map((item) => {
    const id = item.id.trim();
    if (id.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Catalog item ID must not be empty.');
    }
    return {
      id,
      properties: item.properties,
    };
  });
}

export function buildCatalogsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/crm/catalogs`;
}

export interface CatalogActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new BloomreachBuddyError('CONFIG_MISSING', `${operation} requires API credentials. ` +
      'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
      { missing: ['BLOOMREACH_PROJECT_TOKEN', 'BLOOMREACH_API_KEY_ID', 'BLOOMREACH_API_SECRET'] },
    );
  }
  return config;
}

class CreateCatalogExecutor implements CatalogActionExecutor {
  readonly actionType = CREATE_CATALOG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'CreateCatalogExecutor');
    const name = payload.name as string;
    const schema = payload.schema as Record<string, string>;

    const fields = Object.entries(schema).map(([fieldName, fieldType]) => ({
      name: fieldName,
      type: fieldType,
      searchable: true,
    }));

    const path = buildDataPath(config, '/catalogs');
    const response = await bloomreachApiFetch(config, path, {
      body: { name, fields, is_product_catalog: false },
    });
    return { success: true, response };
  }
}

class AddCatalogItemsExecutor implements CatalogActionExecutor {
  readonly actionType = ADD_CATALOG_ITEMS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'AddCatalogItemsExecutor');
    const catalogId = payload.catalogId as string;
    const items = payload.items as Record<string, unknown>[];

    const path = buildDataPath(config, `/catalogs/${encodeURIComponent(catalogId)}/items`);
    const response = await bloomreachApiFetch(config, path, {
      method: 'PUT',
      body: items,
    });
    return { success: true, response };
  }
}

class UpdateCatalogItemsExecutor implements CatalogActionExecutor {
  readonly actionType = UPDATE_CATALOG_ITEMS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'UpdateCatalogItemsExecutor');
    const catalogId = payload.catalogId as string;
    const items = payload.items as { id: string; properties: Record<string, unknown> }[];

    const path = buildDataPath(
      config,
      `/catalogs/${encodeURIComponent(catalogId)}/items/partial-update`,
    );
    const response = await bloomreachApiFetch(config, path, {
      body: items.map((item) => ({
        item_id: item.id,
        properties: item.properties,
        upsert: false,
      })),
    });
    return { success: true, response };
  }
}

class DeleteCatalogExecutor implements CatalogActionExecutor {
  readonly actionType = DELETE_CATALOG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'DeleteCatalogExecutor');
    const catalogId = payload.catalogId as string;

    const path = buildDataPath(config, `/catalogs/${encodeURIComponent(catalogId)}`);
    const response = await bloomreachApiFetch(config, path, {
      method: 'DELETE',
    });
    return { success: true, response };
  }
}

export function createCatalogActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, CatalogActionExecutor> {
  return {
    [CREATE_CATALOG_ACTION_TYPE]: new CreateCatalogExecutor(apiConfig),
    [ADD_CATALOG_ITEMS_ACTION_TYPE]: new AddCatalogItemsExecutor(apiConfig),
    [UPDATE_CATALOG_ITEMS_ACTION_TYPE]: new UpdateCatalogItemsExecutor(apiConfig),
    [DELETE_CATALOG_ACTION_TYPE]: new DeleteCatalogExecutor(apiConfig),
  };
}

export class BloomreachCatalogsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildCatalogsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get catalogsUrl(): string {
    return this.baseUrl;
  }

  async listCatalogs(input?: ListCatalogsInput): Promise<BloomreachCatalog[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    const config = requireApiConfig(this.apiConfig, 'listCatalogs');
    const path = buildDataPath(config, '/catalogs');
    const response = (await bloomreachApiFetch(config, path, {
      method: 'GET',
    })) as { data?: Array<{ id: string; name: string }> };

    const catalogs = Array.isArray(response.data) ? response.data : [];
    return catalogs.map((catalog) => ({
      id: catalog.id,
      name: catalog.name,
      itemCount: 0,
      schema: {},
      url: '',
    }));
  }

  async viewCatalogItems(input: ViewCatalogItemsInput): Promise<CatalogItemsPage> {
    validateProject(input.project);
    validateCatalogId(input.catalogId);
    if (input.page !== undefined) {
      if (!Number.isInteger(input.page) || input.page <= 0) {
        throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `page must be a positive integer (got ${input.page}).`);
      }
    }
    if (input.pageSize !== undefined) {
      if (!Number.isInteger(input.pageSize) || input.pageSize <= 0) {
        throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `pageSize must be a positive integer (got ${input.pageSize}).`);
      }
    }

    const config = requireApiConfig(this.apiConfig, 'viewCatalogItems');
    const pageSize = input.pageSize ?? 20;
    const page = input.page ?? 1;
    const skip = (page - 1) * pageSize;

    const itemsPath = `/catalogs/${encodeURIComponent(input.catalogId)}/items?count=${pageSize}&skip=${skip}`;
    const path = buildDataPath(config, itemsPath);
    const response = (await bloomreachApiFetch(config, path, {
      method: 'GET',
    })) as {
      data?: Array<{ catalog_id: string; item_id: string; properties?: Record<string, unknown> }>;
      total?: number;
      matched?: number;
    };

    const itemsData = Array.isArray(response.data) ? response.data : [];
    const items: CatalogItem[] = itemsData.map((item) => ({
      id: item.item_id,
      catalogId: item.catalog_id,
      properties: item.properties ?? {},
    }));

    return {
      items,
      totalCount:
        typeof response.total === 'number'
          ? response.total
          : typeof response.matched === 'number'
            ? response.matched
            : items.length,
      page,
      pageSize,
    };
  }

  prepareCreateCatalog(input: CreateCatalogInput): PreparedCatalogAction {
    const project = validateProject(input.project);
    const name = validateCatalogName(input.name);
    const schema = validateCatalogSchema(input.schema);

    const preview = {
      action: CREATE_CATALOG_ACTION_TYPE,
      project,
      name,
      schema,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareAddCatalogItems(input: AddCatalogItemsInput): PreparedCatalogAction {
    const project = validateProject(input.project);
    const catalogId = validateCatalogId(input.catalogId);
    const items = validateCatalogItems(input.items);

    const preview = {
      action: ADD_CATALOG_ITEMS_ACTION_TYPE,
      project,
      catalogId,
      itemCount: items.length,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateCatalogItems(input: UpdateCatalogItemsInput): PreparedCatalogAction {
    const project = validateProject(input.project);
    const catalogId = validateCatalogId(input.catalogId);
    const items = validateCatalogItemUpdates(input.items);

    const preview = {
      action: UPDATE_CATALOG_ITEMS_ACTION_TYPE,
      project,
      catalogId,
      itemCount: items.length,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteCatalog(input: DeleteCatalogInput): PreparedCatalogAction {
    const project = validateProject(input.project);
    const catalogId = validateCatalogId(input.catalogId);

    const preview = {
      action: DELETE_CATALOG_ACTION_TYPE,
      project,
      catalogId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }
}
