import { validateProject } from './bloomreachDashboards.js';

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
    throw new Error(`${fieldName} must not be empty.`);
  }
  return trimmed;
}

function validateImportName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Import name');
  if (trimmed.length > MAX_IMPORT_NAME_LENGTH) {
    throw new Error(
      `Import name must not exceed ${MAX_IMPORT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateImportType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Import type').toLowerCase();
  if (!IMPORT_TYPES.has(normalized)) {
    throw new Error(
      `Import type must be one of: ${Array.from(IMPORT_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateImportStatus(status: string): string {
  const normalized = validateRequiredTrimmed(status, 'Import status').toLowerCase();
  if (!IMPORT_STATUSES.has(normalized)) {
    throw new Error(
      `Import status must be one of: ${Array.from(IMPORT_STATUSES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateImportSource(source: string): string {
  const trimmed = validateRequiredTrimmed(source, 'Import source');
  if (trimmed.length > MAX_SOURCE_LENGTH) {
    throw new Error(`Import source must not exceed ${MAX_SOURCE_LENGTH} characters (got ${trimmed.length}).`);
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/.+/.test(trimmed)) {
    throw new Error('Import source must be a valid absolute URL.');
  }

  return trimmed;
}

function validateImportId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Import ID');
  if (trimmed.length > MAX_IMPORT_ID_LENGTH) {
    throw new Error(
      `Import ID must not exceed ${MAX_IMPORT_ID_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateColumnName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Source column');
  if (trimmed.length > MAX_COLUMN_NAME_LENGTH) {
    throw new Error(
      `Source column must not exceed ${MAX_COLUMN_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validatePropertyName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Target property');
  if (trimmed.length > MAX_PROPERTY_NAME_LENGTH) {
    throw new Error(
      `Target property must not exceed ${MAX_PROPERTY_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateMappingTransformationType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Transformation type').toLowerCase();
  if (!MAPPING_TRANSFORMATION_TYPES.has(normalized)) {
    throw new Error(
      `Transformation type must be one of: ${Array.from(MAPPING_TRANSFORMATION_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateMapping(mapping: ImportMapping[]): ImportMapping[] {
  if (!Array.isArray(mapping)) {
    throw new Error('Mapping must be an array.');
  }

  return mapping.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`Mapping entry #${index + 1} must be an object.`);
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
    throw new Error(
      `Schedule frequency must be one of: ${Array.from(SCHEDULE_FREQUENCIES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateCronExpression(cron: string): string {
  const trimmed = validateRequiredTrimmed(cron, 'Cron expression');
  if (trimmed.length > MAX_CRON_LENGTH) {
    throw new Error(
      `Cron expression must not exceed ${MAX_CRON_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateScheduleConfig(schedule: ImportScheduleConfig): ImportScheduleConfig {
  if (
    typeof schedule !== 'object' ||
    schedule === null ||
    Array.isArray(schedule)
  ) {
    throw new Error('Schedule must be a non-null object.');
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
    throw new Error('Schedule start date must be a valid date string.');
  }

  const endDate =
    schedule.endDate === undefined
      ? undefined
      : validateRequiredTrimmed(schedule.endDate, 'Schedule end date');
  if (endDate !== undefined && Number.isNaN(Date.parse(endDate))) {
    throw new Error('Schedule end date must be a valid date string.');
  }

  if (typeof schedule.isActive !== 'boolean') {
    throw new Error('Schedule isActive must be a boolean.');
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
    throw new Error(`${fieldName} must not exceed ${maxLength} characters (got ${trimmed.length}).`);
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

export interface ImportsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateImportExecutor implements ImportsActionExecutor {
  readonly actionType = CREATE_IMPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateImportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ScheduleImportExecutor implements ImportsActionExecutor {
  readonly actionType = SCHEDULE_IMPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ScheduleImportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CancelImportExecutor implements ImportsActionExecutor {
  readonly actionType = CANCEL_IMPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CancelImportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createImportsActionExecutors(): Record<string, ImportsActionExecutor> {
  return {
    [CREATE_IMPORT_ACTION_TYPE]: new CreateImportExecutor(),
    [SCHEDULE_IMPORT_ACTION_TYPE]: new ScheduleImportExecutor(),
    [CANCEL_IMPORT_ACTION_TYPE]: new CancelImportExecutor(),
  };
}

export class BloomreachImportsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    const validatedProject = validateProject(project);
    this.baseUrl = buildImportsUrl(validatedProject);
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

    throw new Error(
      'listImports: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewImportStatus(input: ViewImportStatusInput): Promise<ImportStatusDetail> {
    validateProject(input.project);
    validateImportId(input.importId);

    throw new Error(
      'viewImportStatus: not yet implemented. Requires browser automation infrastructure.',
    );
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
