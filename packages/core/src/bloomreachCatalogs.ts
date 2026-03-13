import { validateProject } from './bloomreachDashboards.js';

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

const MAX_CATALOG_NAME_LENGTH = 200;
const MIN_CATALOG_NAME_LENGTH = 1;

export function validateCatalogName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_CATALOG_NAME_LENGTH) {
    throw new Error('Catalog name must not be empty.');
  }
  if (trimmed.length > MAX_CATALOG_NAME_LENGTH) {
    throw new Error(
      `Catalog name must not exceed ${MAX_CATALOG_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateCatalogId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Catalog ID must not be empty.');
  }
  return trimmed;
}

export function validateCatalogSchema(schema: Record<string, string>): Record<string, string> {
  const entries = Object.entries(schema);
  if (entries.length === 0) {
    throw new Error('Catalog schema must include at least one field.');
  }

  const normalizedSchema: Record<string, string> = {};
  for (const [fieldName, fieldType] of entries) {
    const normalizedFieldName = fieldName.trim();
    if (normalizedFieldName.length === 0) {
      throw new Error('Catalog schema field names must not be empty.');
    }
    normalizedSchema[normalizedFieldName] = fieldType;
  }

  return normalizedSchema;
}

export function validateCatalogItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  if (items.length === 0) {
    throw new Error('Catalog items must include at least one item.');
  }
  return items;
}

export function validateCatalogItemUpdates(
  items: { id: string; properties: Record<string, unknown> }[],
): { id: string; properties: Record<string, unknown> }[] {
  if (items.length === 0) {
    throw new Error('Catalog item updates must include at least one item.');
  }

  return items.map((item) => {
    const id = item.id.trim();
    if (id.length === 0) {
      throw new Error('Catalog item ID must not be empty.');
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

class CreateCatalogExecutor implements CatalogActionExecutor {
  readonly actionType = CREATE_CATALOG_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateCatalogExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class AddCatalogItemsExecutor implements CatalogActionExecutor {
  readonly actionType = ADD_CATALOG_ITEMS_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'AddCatalogItemsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateCatalogItemsExecutor implements CatalogActionExecutor {
  readonly actionType = UPDATE_CATALOG_ITEMS_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateCatalogItemsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteCatalogExecutor implements CatalogActionExecutor {
  readonly actionType = DELETE_CATALOG_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteCatalogExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createCatalogActionExecutors(): Record<string, CatalogActionExecutor> {
  return {
    [CREATE_CATALOG_ACTION_TYPE]: new CreateCatalogExecutor(),
    [ADD_CATALOG_ITEMS_ACTION_TYPE]: new AddCatalogItemsExecutor(),
    [UPDATE_CATALOG_ITEMS_ACTION_TYPE]: new UpdateCatalogItemsExecutor(),
    [DELETE_CATALOG_ACTION_TYPE]: new DeleteCatalogExecutor(),
  };
}

export class BloomreachCatalogsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildCatalogsUrl(validateProject(project));
  }

  get catalogsUrl(): string {
    return this.baseUrl;
  }

  async listCatalogs(input?: ListCatalogsInput): Promise<BloomreachCatalog[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listCatalogs: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewCatalogItems(input: ViewCatalogItemsInput): Promise<CatalogItemsPage> {
    validateProject(input.project);
    validateCatalogId(input.catalogId);
    if (input.page !== undefined) {
      if (!Number.isInteger(input.page) || input.page <= 0) {
        throw new Error(`page must be a positive integer (got ${input.page}).`);
      }
    }
    if (input.pageSize !== undefined) {
      if (!Number.isInteger(input.pageSize) || input.pageSize <= 0) {
        throw new Error(`pageSize must be a positive integer (got ${input.pageSize}).`);
      }
    }

    throw new Error(
      'viewCatalogItems: not yet implemented. Requires browser automation infrastructure.',
    );
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
