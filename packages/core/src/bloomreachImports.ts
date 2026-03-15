import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_IMPORT_ACTION_TYPE = 'imports.create_import';
export const SCHEDULE_IMPORT_ACTION_TYPE = 'imports.schedule_import';
export const CANCEL_IMPORT_ACTION_TYPE = 'imports.cancel_import';

export const IMPORTS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const IMPORTS_CREATE_RATE_LIMIT = 20;
export const IMPORTS_SCHEDULE_RATE_LIMIT = 10;
export const IMPORTS_CANCEL_RATE_LIMIT = 20;

export interface ImportRecord {
  id: string;
  name: string;
  status: string;
  type: string;
  source: string;
  rowsProcessed: number;
  rowsTotal: number;
  errors: number;
  warnings: number;
  createdAt: string;
  completedAt?: string;
  url: string;
}

export interface ImportMapping {
  sourceColumn: string;
  targetProperty: string;
  transformationType?: string;
}

export interface ImportScheduleConfig {
  frequency: string;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface ImportStatusDetail {
  importId: string;
  name: string;
  status: string;
  type: string;
  source: string;
  rowsProcessed: number;
  rowsTotal: number;
  errors: number;
  warnings: number;
  errorDetails: ImportErrorDetail[];
  warningDetails: ImportWarningDetail[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  schedule?: ImportScheduleConfig;
  mapping: ImportMapping[];
  url: string;
}

export interface ImportErrorDetail {
  row: number;
  column: string;
  message: string;
}

export interface ImportWarningDetail {
  row: number;
  column: string;
  message: string;
}

export interface ListImportsInput {
  project: string;
  status?: string;
  type?: string;
}

export interface ViewImportStatusInput {
  project: string;
  importId: string;
}

export interface CreateImportInput {
  project: string;
  name: string;
  type: string;
  source: string;
  mapping: ImportMapping[];
  operatorNote?: string;
}

export interface ScheduleImportInput {
  project: string;
  name: string;
  type: string;
  source: string;
  mapping: ImportMapping[];
  schedule: ImportScheduleConfig;
  operatorNote?: string;
}

export interface CancelImportInput {
  project: string;
  importId: string;
  operatorNote?: string;
}

export interface PreparedImportsAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_IMPORT_NAME_LENGTH = 200;
const MAX_SOURCE_LENGTH = 2000;
const MAX_COLUMN_NAME_LENGTH = 200;
const MAX_PROPERTY_NAME_LENGTH = 200;
const MAX_IMPORT_ID_LENGTH = 200;
const MAX_CRON_LENGTH = 200;

const IMPORT_TYPES = new Set(['csv', 'api']);
const IMPORT_STATUSES = new Set([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'scheduled',
]);
const SCHEDULE_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'custom']);
const MAPPING_TRANSFORMATION_TYPES = new Set([
  'direct',
  'concatenate',
  'split',
  'format',
  'lookup',
]);

function validateRequiredTrimmed(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${fieldName} must not be empty.`);
  }
  return trimmed;
}

function validateImportName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Import name');
  if (trimmed.length > MAX_IMPORT_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Import name must not exceed ${MAX_IMPORT_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateImportType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Import type').toLowerCase();
  if (!IMPORT_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Import type must be one of: ${Array.from(IMPORT_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateImportStatus(status: string): string {
  const normalized = validateRequiredTrimmed(status, 'Import status').toLowerCase();
  if (!IMPORT_STATUSES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Import status must be one of: ${Array.from(IMPORT_STATUSES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateImportSource(source: string): string {
  const trimmed = validateRequiredTrimmed(source, 'Import source');
  if (trimmed.length > MAX_SOURCE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Import source must not exceed ${MAX_SOURCE_LENGTH} characters (got ${trimmed.length}).`);
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/.+/.test(trimmed)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Import source must be a valid absolute URL.');
  }

  return trimmed;
}

function validateImportId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Import ID');
  if (trimmed.length > MAX_IMPORT_ID_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Import ID must not exceed ${MAX_IMPORT_ID_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateColumnName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Source column');
  if (trimmed.length > MAX_COLUMN_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source column must not exceed ${MAX_COLUMN_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validatePropertyName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Target property');
  if (trimmed.length > MAX_PROPERTY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Target property must not exceed ${MAX_PROPERTY_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateMappingTransformationType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Transformation type').toLowerCase();
  if (!MAPPING_TRANSFORMATION_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Transformation type must be one of: ${Array.from(MAPPING_TRANSFORMATION_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateMapping(mapping: ImportMapping[]): ImportMapping[] {
  if (!Array.isArray(mapping)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Mapping must be an array.');
  }

  return mapping.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Mapping entry #${index + 1} must be an object.`);
    }

    const sourceColumn = validateColumnName(entry.sourceColumn);
    const targetProperty = validatePropertyName(entry.targetProperty);
    const transformationType =
      entry.transformationType === undefined
        ? undefined
        : validateMappingTransformationType(entry.transformationType);

    return {
      sourceColumn,
      targetProperty,
      transformationType,
    };
  });
}

function validateScheduleFrequency(frequency: string): string {
  const normalized = validateRequiredTrimmed(frequency, 'Schedule frequency').toLowerCase();
  if (!SCHEDULE_FREQUENCIES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Schedule frequency must be one of: ${Array.from(SCHEDULE_FREQUENCIES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateCronExpression(cron: string): string {
  const trimmed = validateRequiredTrimmed(cron, 'Cron expression');
  if (trimmed.length > MAX_CRON_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Cron expression must not exceed ${MAX_CRON_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateScheduleConfig(schedule: ImportScheduleConfig): ImportScheduleConfig {
  if (
    typeof schedule !== 'object' ||
    schedule === null ||
    Array.isArray(schedule)
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Schedule must be a non-null object.');
  }

  const frequency = validateScheduleFrequency(schedule.frequency);
  const cronExpression =
    schedule.cronExpression === undefined
      ? undefined
      : validateCronExpression(schedule.cronExpression);

  const startDate =
    schedule.startDate === undefined
      ? undefined
      : validateRequiredTrimmed(schedule.startDate, 'Schedule start date');
  if (startDate !== undefined && Number.isNaN(Date.parse(startDate))) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Schedule start date must be a valid date string.');
  }

  const endDate =
    schedule.endDate === undefined
      ? undefined
      : validateRequiredTrimmed(schedule.endDate, 'Schedule end date');
  if (endDate !== undefined && Number.isNaN(Date.parse(endDate))) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Schedule end date must be a valid date string.');
  }

  if (typeof schedule.isActive !== 'boolean') {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Schedule isActive must be a boolean.');
  }

  return {
    frequency,
    cronExpression,
    startDate,
    endDate,
    isActive: schedule.isActive,
  };
}

function validateOptionalString(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = validateRequiredTrimmed(value, fieldName);
  if (trimmed.length > maxLength) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${fieldName} must not exceed ${maxLength} characters (got ${trimmed.length}).`);
  }

  return trimmed;
}

function createPreparedAction(preview: Record<string, unknown>): PreparedImportsAction {
  return {
    preparedActionId: `pa_${Date.now()}`,
    confirmToken: `ct_stub_${Date.now()}`,
    expiresAtMs: Date.now() + 30 * 60 * 1000,
    preview,
  };
}

export function buildImportsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/imports`;
}

export function buildImportDetailUrl(project: string, importId: string): string {
  return `/p/${encodeURIComponent(project)}/data/imports/${encodeURIComponent(importId)}`;
}

export interface ImportsActionExecutor {
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

class CreateImportExecutor implements ImportsActionExecutor {
  readonly actionType = CREATE_IMPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'CreateImportExecutor');
    const path = buildDataPath(config, '/imports');
    const response = await bloomreachApiFetch(config, path, {
      body: {
        name: payload.name,
        type: payload.type,
        source: payload.source,
        mapping: payload.mapping,
      },
    });
    return { success: true, response };
  }
}

class ScheduleImportExecutor implements ImportsActionExecutor {
  readonly actionType = SCHEDULE_IMPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'ScheduleImportExecutor');
    const importId = String(payload.importId ?? '');
    const path = buildDataPath(config, `/imports/${encodeURIComponent(importId)}/schedule`);
    const response = await bloomreachApiFetch(config, path, {
      body: {
        name: payload.name,
        type: payload.type,
        source: payload.source,
        mapping: payload.mapping,
        schedule: payload.schedule,
      },
    });
    return { success: true, response };
  }
}

class CancelImportExecutor implements ImportsActionExecutor {
  readonly actionType = CANCEL_IMPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'CancelImportExecutor');
    const importId = String(payload.importId ?? '');
    const path = buildDataPath(config, `/imports/${encodeURIComponent(importId)}`);
    const response = await bloomreachApiFetch(config, path, {
      method: 'POST',
      body: { command: 'cancel' },
    });
    return { success: true, response };
  }
}

export function createImportsActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, ImportsActionExecutor> {
  return {
    [CREATE_IMPORT_ACTION_TYPE]: new CreateImportExecutor(apiConfig),
    [SCHEDULE_IMPORT_ACTION_TYPE]: new ScheduleImportExecutor(apiConfig),
    [CANCEL_IMPORT_ACTION_TYPE]: new CancelImportExecutor(apiConfig),
  };
}

export class BloomreachImportsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validatedProject = validateProject(project);
    this.baseUrl = buildImportsUrl(validatedProject);
    this.apiConfig = apiConfig;
  }

  get importsUrl(): string {
    return this.baseUrl;
  }

  async listImports(input?: ListImportsInput): Promise<ImportRecord[]> {
    if (input !== undefined) {
      validateProject(input.project);

      if (input.status !== undefined) {
        validateImportStatus(input.status);
      }

      if (input.type !== undefined) {
        validateImportType(input.type);
      }
    }

    const config = requireApiConfig(this.apiConfig, 'listImports');
    const path = buildDataPath(config, '/imports');

    const body: Record<string, unknown> = { command: 'list' };
    if (input?.status !== undefined) body.status = input.status;
    if (input?.type !== undefined) body.type = input.type;

    const response = await bloomreachApiFetch(config, path, { body });

    const data = response as Record<string, unknown>;
    const items = Array.isArray(data.results) ? data.results : Array.isArray(response) ? response : [];

    return items.map((rawItem: unknown) => {
      const item =
        typeof rawItem === 'object' && rawItem !== null
          ? (rawItem as Record<string, unknown>)
          : {};

      return {
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        status: String(item.status ?? 'unknown'),
        type: String(item.type ?? ''),
        source: String(item.source ?? ''),
        rowsProcessed: typeof item.rows_processed === 'number' ? item.rows_processed : typeof item.rowsProcessed === 'number' ? item.rowsProcessed : 0,
        rowsTotal: typeof item.rows_total === 'number' ? item.rows_total : typeof item.rowsTotal === 'number' ? item.rowsTotal : 0,
        errors: typeof item.errors === 'number' ? item.errors : 0,
        warnings: typeof item.warnings === 'number' ? item.warnings : 0,
        createdAt: String(item.created_at ?? item.createdAt ?? ''),
        completedAt: item.completed_at !== undefined ? String(item.completed_at) : item.completedAt !== undefined ? String(item.completedAt) : undefined,
        url: buildImportDetailUrl(input?.project ?? '', String(item.id ?? '')),
      };
    });
  }

  async viewImportStatus(input: ViewImportStatusInput): Promise<ImportStatusDetail> {
    validateProject(input.project);
    validateImportId(input.importId);

    const config = requireApiConfig(this.apiConfig, 'viewImportStatus');
    const path = buildDataPath(config, `/imports/${encodeURIComponent(input.importId)}/status`);

    const response = await bloomreachApiFetch(config, path, {
      body: { import_id: input.importId },
    });

    const data = response as Record<string, unknown>;

    return {
      importId: String(data.import_id ?? data.importId ?? input.importId),
      name: String(data.name ?? ''),
      status: String(data.status ?? 'unknown'),
      type: String(data.type ?? ''),
      source: String(data.source ?? ''),
      rowsProcessed: typeof data.rows_processed === 'number' ? data.rows_processed : typeof data.rowsProcessed === 'number' ? data.rowsProcessed : 0,
      rowsTotal: typeof data.rows_total === 'number' ? data.rows_total : typeof data.rowsTotal === 'number' ? data.rowsTotal : 0,
      errors: typeof data.errors === 'number' ? data.errors : 0,
      warnings: typeof data.warnings === 'number' ? data.warnings : 0,
      errorDetails: Array.isArray(data.error_details ?? data.errorDetails)
        ? ((data.error_details ?? data.errorDetails) as unknown[]).map((e: unknown) => {
            const entry = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
            return {
              row: typeof entry.row === 'number' ? entry.row : 0,
              column: String(entry.column ?? ''),
              message: String(entry.message ?? ''),
            };
          })
        : [],
      warningDetails: Array.isArray(data.warning_details ?? data.warningDetails)
        ? ((data.warning_details ?? data.warningDetails) as unknown[]).map((e: unknown) => {
            const entry = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
            return {
              row: typeof entry.row === 'number' ? entry.row : 0,
              column: String(entry.column ?? ''),
              message: String(entry.message ?? ''),
            };
          })
        : [],
      createdAt: String(data.created_at ?? data.createdAt ?? ''),
      startedAt: data.started_at !== undefined ? String(data.started_at) : data.startedAt !== undefined ? String(data.startedAt) : undefined,
      completedAt: data.completed_at !== undefined ? String(data.completed_at) : data.completedAt !== undefined ? String(data.completedAt) : undefined,
      schedule: data.schedule as ImportScheduleConfig | undefined,
      mapping: Array.isArray(data.mapping) ? data.mapping as ImportMapping[] : [],
      url: buildImportDetailUrl(input.project, input.importId),
    };
  }

  prepareCreateImport(input: CreateImportInput): PreparedImportsAction {
    const project = validateProject(input.project);
    const name = validateImportName(input.name);
    const type = validateImportType(input.type);
    const source = validateImportSource(input.source);
    const mapping = validateMapping(input.mapping);
    const operatorNote = validateOptionalString(input.operatorNote, 'Operator note', MAX_SOURCE_LENGTH);

    const preview = {
      action: CREATE_IMPORT_ACTION_TYPE,
      project,
      name,
      type,
      source,
      mapping,
      operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareScheduleImport(input: ScheduleImportInput): PreparedImportsAction {
    const project = validateProject(input.project);
    const name = validateImportName(input.name);
    const type = validateImportType(input.type);
    const source = validateImportSource(input.source);
    const mapping = validateMapping(input.mapping);
    const schedule = validateScheduleConfig(input.schedule);
    const operatorNote = validateOptionalString(input.operatorNote, 'Operator note', MAX_SOURCE_LENGTH);

    const preview = {
      action: SCHEDULE_IMPORT_ACTION_TYPE,
      project,
      name,
      type,
      source,
      mapping,
      schedule,
      operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareCancelImport(input: CancelImportInput): PreparedImportsAction {
    const project = validateProject(input.project);
    const importId = validateImportId(input.importId);
    const operatorNote = validateOptionalString(input.operatorNote, 'Operator note', MAX_SOURCE_LENGTH);

    const preview = {
      action: CANCEL_IMPORT_ACTION_TYPE,
      project,
      importId,
      operatorNote,
    };

    return createPreparedAction(preview);
  }
}
