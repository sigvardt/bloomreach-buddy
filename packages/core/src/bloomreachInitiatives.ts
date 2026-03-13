import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_INITIATIVE_ACTION_TYPE = 'initiatives.create_initiative';
export const IMPORT_INITIATIVE_ACTION_TYPE = 'initiatives.import_initiative';
export const ADD_ITEMS_ACTION_TYPE = 'initiatives.add_items';
export const ARCHIVE_INITIATIVE_ACTION_TYPE = 'initiatives.archive_initiative';

export const INITIATIVE_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const INITIATIVE_CREATE_RATE_LIMIT = 10;
export const INITIATIVE_MODIFY_RATE_LIMIT = 20;

export const INITIATIVE_STATUSES = ['active', 'archived', 'draft'] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];

export const INITIATIVE_ITEM_TYPES = ['campaign', 'analysis', 'asset'] as const;
export type InitiativeItemType = (typeof INITIATIVE_ITEM_TYPES)[number];

export interface InitiativeItemReference {
  id: string;
  type: InitiativeItemType;
}

export interface InitiativeItem extends InitiativeItemReference {
  name: string;
}

export interface BloomreachInitiative {
  id: string;
  name: string;
  description?: string;
  status: InitiativeStatus;
  tags: string[];
  owner?: string;
  itemCount: number;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface InitiativeDetails extends BloomreachInitiative {
  items: InitiativeItem[];
}

export interface ListInitiativesInput {
  project: string;
}

export interface FilterInitiativesInput {
  project: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  owner?: string;
  status?: string;
}

export interface ViewInitiativeInput {
  project: string;
  initiativeId: string;
}

export interface CreateInitiativeInput {
  project: string;
  name: string;
  description?: string;
  tags?: string[];
  operatorNote?: string;
}

export interface ImportInitiativeInput {
  project: string;
  configuration: Record<string, unknown>;
  operatorNote?: string;
}

export interface AddItemsToInitiativeInput {
  project: string;
  initiativeId: string;
  items: InitiativeItemReference[];
  operatorNote?: string;
}

export interface ArchiveInitiativeInput {
  project: string;
  initiativeId: string;
  operatorNote?: string;
}

export interface PreparedInitiativeAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_INITIATIVE_NAME_LENGTH = 200;
const MIN_INITIATIVE_NAME_LENGTH = 1;
const MAX_INITIATIVE_DESCRIPTION_LENGTH = 2000;
const MAX_ITEMS_PER_ADD = 100;

export function validateInitiativeName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_INITIATIVE_NAME_LENGTH) {
    throw new Error('Initiative name must not be empty.');
  }
  if (trimmed.length > MAX_INITIATIVE_NAME_LENGTH) {
    throw new Error(
      `Initiative name must not exceed ${MAX_INITIATIVE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateInitiativeDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length > MAX_INITIATIVE_DESCRIPTION_LENGTH) {
    throw new Error(
      `Initiative description must not exceed ${MAX_INITIATIVE_DESCRIPTION_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateInitiativeStatus(status: string): InitiativeStatus {
  if (!INITIATIVE_STATUSES.includes(status as InitiativeStatus)) {
    throw new Error(
      `status must be one of: ${INITIATIVE_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as InitiativeStatus;
}

export function validateInitiativeId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Initiative ID must not be empty.');
  }
  return trimmed;
}

export function validateInitiativeItemType(type: string): InitiativeItemType {
  if (!INITIATIVE_ITEM_TYPES.includes(type as InitiativeItemType)) {
    throw new Error(
      `Item type must be one of: ${INITIATIVE_ITEM_TYPES.join(', ')} (got "${type}").`,
    );
  }
  return type as InitiativeItemType;
}

export function validateInitiativeItems(
  items: InitiativeItemReference[],
): InitiativeItemReference[] {
  if (items.length === 0) {
    throw new Error('Items array must not be empty.');
  }
  if (items.length > MAX_ITEMS_PER_ADD) {
    throw new Error(
      `Cannot add more than ${MAX_ITEMS_PER_ADD} items at once (got ${items.length}).`,
    );
  }
  for (const item of items) {
    if (!item.id || item.id.trim().length === 0) {
      throw new Error('Each item must have a non-empty ID.');
    }
    validateInitiativeItemType(item.type);
  }
  return items;
}

export function validateImportConfiguration(
  configuration: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(configuration).length === 0) {
    throw new Error('Import configuration must not be empty.');
  }
  return configuration;
}

export function buildInitiativesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/initiatives`;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new Error(
      `${operation} requires API credentials. ` +
        'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
    );
  }
  return config;
}

void requireApiConfig;

export interface InitiativeActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateInitiativeExecutor implements InitiativeActionExecutor {
  readonly actionType = CREATE_INITIATIVE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateInitiativeExecutor: not yet implemented. Initiative creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ImportInitiativeExecutor implements InitiativeActionExecutor {
  readonly actionType = IMPORT_INITIATIVE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ImportInitiativeExecutor: not yet implemented. Initiative import is only available through the Bloomreach Engagement UI.',
    );
  }
}

class AddItemsExecutor implements InitiativeActionExecutor {
  readonly actionType = ADD_ITEMS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'AddItemsExecutor: not yet implemented. Adding items to initiatives is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ArchiveInitiativeExecutor implements InitiativeActionExecutor {
  readonly actionType = ARCHIVE_INITIATIVE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ArchiveInitiativeExecutor: not yet implemented. Initiative archiving is only available through the Bloomreach Engagement UI.',
    );
  }
}

export function createInitiativeActionExecutors(apiConfig?: BloomreachApiConfig): Record<
  string,
  InitiativeActionExecutor
> {
  return {
    [CREATE_INITIATIVE_ACTION_TYPE]: new CreateInitiativeExecutor(apiConfig),
    [IMPORT_INITIATIVE_ACTION_TYPE]: new ImportInitiativeExecutor(apiConfig),
    [ADD_ITEMS_ACTION_TYPE]: new AddItemsExecutor(apiConfig),
    [ARCHIVE_INITIATIVE_ACTION_TYPE]: new ArchiveInitiativeExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement initiatives — the folder/project management
 * system for organizing campaigns, analyses, and assets into logical groups.
 *
 * Read methods return data directly. Mutation methods follow the two-phase
 * commit pattern (prepare + confirm). Browser-dependent methods throw until
 * Playwright infrastructure is available.
 */
export class BloomreachInitiativesService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildInitiativesUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get initiativesUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listInitiatives(
    input?: ListInitiativesInput,
  ): Promise<BloomreachInitiative[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    void this.apiConfig;
    throw new Error(
      'listInitiatives: the Bloomreach API does not provide an initiative listing endpoint. Initiative management is only available through the Bloomreach Engagement UI.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async filterInitiatives(
    input: FilterInitiativesInput,
  ): Promise<BloomreachInitiative[]> {
    validateProject(input.project);
    if (input.status !== undefined) {
      validateInitiativeStatus(input.status);
    }

    void this.apiConfig;
    throw new Error(
      'filterInitiatives: the Bloomreach API does not provide an initiative filtering endpoint. Initiative management is only available through the Bloomreach Engagement UI.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewInitiative(
    input: ViewInitiativeInput,
  ): Promise<InitiativeDetails> {
    validateProject(input.project);
    validateInitiativeId(input.initiativeId);

    void this.apiConfig;
    throw new Error(
      'viewInitiative: the Bloomreach API does not provide an initiative detail endpoint. Initiative management is only available through the Bloomreach Engagement UI.',
    );
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateInitiative(
    input: CreateInitiativeInput,
  ): PreparedInitiativeAction {
    const project = validateProject(input.project);
    const name = validateInitiativeName(input.name);
    const description =
      input.description !== undefined
        ? validateInitiativeDescription(input.description)
        : undefined;

    const preview = {
      action: CREATE_INITIATIVE_ACTION_TYPE,
      project,
      name,
      description,
      tags: input.tags,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareImportInitiative(
    input: ImportInitiativeInput,
  ): PreparedInitiativeAction {
    const project = validateProject(input.project);
    const configuration = validateImportConfiguration(input.configuration);

    const preview = {
      action: IMPORT_INITIATIVE_ACTION_TYPE,
      project,
      configurationKeys: Object.keys(configuration),
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareAddItems(
    input: AddItemsToInitiativeInput,
  ): PreparedInitiativeAction {
    const project = validateProject(input.project);
    const initiativeId = validateInitiativeId(input.initiativeId);
    const items = validateInitiativeItems(input.items);

    const preview = {
      action: ADD_ITEMS_ACTION_TYPE,
      project,
      initiativeId,
      itemCount: items.length,
      items: items.map((item) => ({ id: item.id, type: item.type })),
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareArchiveInitiative(
    input: ArchiveInitiativeInput,
  ): PreparedInitiativeAction {
    const project = validateProject(input.project);
    const initiativeId = validateInitiativeId(input.initiativeId);

    const preview = {
      action: ARCHIVE_INITIATIVE_ACTION_TYPE,
      project,
      initiativeId,
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
