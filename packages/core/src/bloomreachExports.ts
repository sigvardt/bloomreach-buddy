import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_EXPORT_ACTION_TYPE = 'exports.create_export';
export const RUN_EXPORT_ACTION_TYPE = 'exports.run_export';
export const SCHEDULE_EXPORT_ACTION_TYPE = 'exports.schedule_export';
export const DELETE_EXPORT_ACTION_TYPE = 'exports.delete_export';

export const EXPORT_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const EXPORT_CREATE_RATE_LIMIT = 20;
export const EXPORT_RUN_RATE_LIMIT = 60;
export const EXPORT_SCHEDULE_RATE_LIMIT = 20;
export const EXPORT_DELETE_RATE_LIMIT = 20;

export interface DataSelection {
  attributes?: string[];
  events?: string[];
  segments?: string[];
}

export interface ExportDestination {
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  path?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  email?: string;
  webhookUrl?: string;
  fileNameTemplate?: string;
}

export interface ExportSchedule {
  frequency: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time: string;
  timezone: string;
}

export interface BloomreachExport {
  id: string;
  name: string;
  exportType: string;
  dataSelection: DataSelection;
  destination: ExportDestination;
  schedule?: ExportSchedule;
  status: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ExportStatus {
  exportId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  fileLocation?: string;
  recordCount?: number;
  errorMessage?: string;
}

export interface ExportHistoryEntry {
  id: string;
  exportId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  fileLocation?: string;
  recordCount?: number;
}

export interface ListExportsInput {
  project: string;
}

export interface ViewExportStatusInput {
  project: string;
  exportId: string;
}

export interface ViewExportHistoryInput {
  project: string;
  exportId: string;
}

export interface CreateExportInput {
  project: string;
  name: string;
  exportType: string;
  dataSelection: DataSelection;
  destination: ExportDestination;
  schedule?: ExportSchedule;
  operatorNote?: string;
}

export interface RunExportInput {
  project: string;
  exportId: string;
  operatorNote?: string;
}

export interface ScheduleExportInput {
  project: string;
  exportId: string;
  schedule: ExportSchedule;
  operatorNote?: string;
}

export interface DeleteExportInput {
  project: string;
  exportId: string;
  operatorNote?: string;
}

export interface PreparedExportAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_EXPORT_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_EXPORT_ID_LENGTH = 200;

const EXPORT_TYPES = new Set(['customers', 'events']);
const DESTINATION_TYPES = new Set(['sftp', 's3', 'email', 'webhook']);
const SCHEDULE_FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);
function validateRequiredTrimmed(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} must not be empty.`);
  }
  return trimmed;
}

function validateExportName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Export name');
  if (trimmed.length > MAX_EXPORT_NAME_LENGTH) {
    throw new Error(
      `Export name must not exceed ${MAX_EXPORT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateExportType(exportType: string): string {
  const normalized = validateRequiredTrimmed(exportType, 'Export type').toLowerCase();
  if (!EXPORT_TYPES.has(normalized)) {
    throw new Error(
      `Export type must be one of: ${Array.from(EXPORT_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateDestinationType(destinationType: string): string {
  const normalized = validateRequiredTrimmed(destinationType, 'Destination type').toLowerCase();
  if (!DESTINATION_TYPES.has(normalized)) {
    throw new Error(
      `Destination type must be one of: ${Array.from(DESTINATION_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateExportId(exportId: string): string {
  const trimmed = validateRequiredTrimmed(exportId, 'Export ID');
  if (trimmed.length > MAX_EXPORT_ID_LENGTH) {
    throw new Error(
      `Export ID must not exceed ${MAX_EXPORT_ID_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
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

function validateStringArray(values: string[] | undefined, fieldName: string): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  const normalized = values.map((value, index) => {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName}[${index}] must be a string.`);
    }
    return validateRequiredTrimmed(value, `${fieldName}[${index}]`);
  });

  return normalized;
}

function validateDataSelection(dataSelection: DataSelection): DataSelection {
  const attributes = validateStringArray(dataSelection.attributes, 'dataSelection.attributes');
  const events = validateStringArray(dataSelection.events, 'dataSelection.events');
  const segments = validateStringArray(dataSelection.segments, 'dataSelection.segments');

  const hasSelections =
    (attributes !== undefined && attributes.length > 0) ||
    (events !== undefined && events.length > 0) ||
    (segments !== undefined && segments.length > 0);

  if (!hasSelections) {
    throw new Error(
      'Data selection must include at least one non-empty list: attributes, events, or segments.',
    );
  }

  return {
    attributes,
    events,
    segments,
  };
}

function validateDestination(destination: ExportDestination): ExportDestination {
  const type = validateDestinationType(destination.type);
  const host = validateOptionalString(destination.host, 'Destination host', MAX_EXPORT_NAME_LENGTH);
  const username = validateOptionalString(
    destination.username,
    'Destination username',
    MAX_EXPORT_NAME_LENGTH,
  );
  const password = validateOptionalString(
    destination.password,
    'Destination password',
    MAX_DESCRIPTION_LENGTH,
  );
  const path = validateOptionalString(destination.path, 'Destination path', MAX_DESCRIPTION_LENGTH);
  const bucket = validateOptionalString(
    destination.bucket,
    'Destination bucket',
    MAX_EXPORT_NAME_LENGTH,
  );
  const region = validateOptionalString(
    destination.region,
    'Destination region',
    MAX_EXPORT_NAME_LENGTH,
  );
  const accessKeyId = validateOptionalString(
    destination.accessKeyId,
    'Destination accessKeyId',
    MAX_DESCRIPTION_LENGTH,
  );
  const secretAccessKey = validateOptionalString(
    destination.secretAccessKey,
    'Destination secretAccessKey',
    MAX_DESCRIPTION_LENGTH,
  );
  const email = validateOptionalString(destination.email, 'Destination email', MAX_DESCRIPTION_LENGTH);
  const webhookUrl = validateOptionalString(
    destination.webhookUrl,
    'Destination webhookUrl',
    MAX_DESCRIPTION_LENGTH,
  );
  const fileNameTemplate = validateOptionalString(
    destination.fileNameTemplate,
    'Destination fileNameTemplate',
    MAX_EXPORT_NAME_LENGTH,
  );

  if (destination.port !== undefined) {
    if (!Number.isInteger(destination.port) || destination.port < 1 || destination.port > 65535) {
      throw new Error('Destination port must be an integer between 1 and 65535.');
    }
  }

  if (type === 'sftp' && (host === undefined || path === undefined)) {
    throw new Error('SFTP destination requires host and path.');
  }

  if (type === 's3' && (bucket === undefined || path === undefined)) {
    throw new Error('S3 destination requires bucket and path.');
  }

  if (type === 'email' && email === undefined) {
    throw new Error('Email destination requires email.');
  }

  if (type === 'webhook' && webhookUrl === undefined) {
    throw new Error('Webhook destination requires webhookUrl.');
  }

  return {
    type,
    host,
    port: destination.port,
    username,
    password,
    path,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    email,
    webhookUrl,
    fileNameTemplate,
  };
}

function validateTimeFormat(time: string): string {
  const trimmed = validateRequiredTrimmed(time, 'Schedule time');
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (match === null) {
    throw new Error('Schedule time must use HH:MM format.');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Schedule time must use 24-hour HH:MM values (00-23 and 00-59).');
  }

  return trimmed;
}

function validateSchedule(schedule: ExportSchedule): ExportSchedule {
  const frequency = validateScheduleFrequency(schedule.frequency);
  const time = validateTimeFormat(schedule.time);
  const timezone = validateRequiredTrimmed(schedule.timezone, 'Schedule timezone');

  const daysOfWeek = schedule.daysOfWeek;
  if (daysOfWeek !== undefined) {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      throw new Error('Schedule daysOfWeek must be a non-empty array when provided.');
    }

    daysOfWeek.forEach((day, index) => {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new Error(`Schedule daysOfWeek[${index}] must be an integer from 0 to 6.`);
      }
    });
  }

  const dayOfMonth = schedule.dayOfMonth;
  if (dayOfMonth !== undefined) {
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error('Schedule dayOfMonth must be an integer from 1 to 31.');
    }
  }

  if (frequency === 'weekly' && daysOfWeek === undefined) {
    throw new Error('Weekly schedules require daysOfWeek.');
  }

  if (frequency === 'monthly' && dayOfMonth === undefined) {
    throw new Error('Monthly schedules require dayOfMonth.');
  }

  return {
    frequency,
    daysOfWeek,
    dayOfMonth,
    time,
    timezone,
  };
}

function createPreparedAction(preview: Record<string, unknown>): PreparedExportAction {
  return {
    preparedActionId: `pa_${Date.now()}`,
    confirmToken: `ct_stub_${Date.now()}`,
    expiresAtMs: Date.now() + 30 * 60 * 1000,
    preview,
  };
}

export function buildExportsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/exports`;
}

export function buildExportDetailUrl(project: string, exportId: string): string {
  return `/p/${encodeURIComponent(project)}/data/exports/${encodeURIComponent(exportId)}`;
}

export interface ExportActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
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

class CreateExportExecutor implements ExportActionExecutor {
  readonly actionType = CREATE_EXPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'CreateExportExecutor');
    const path = buildDataPath(config, '/exports');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        name: payload.name,
        export_type: payload.exportType,
        data_selection: payload.dataSelection,
        destination: payload.destination,
        schedule: payload.schedule,
      },
    });

    return { success: true, response };
  }
}

class RunExportExecutor implements ExportActionExecutor {
  readonly actionType = RUN_EXPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'RunExportExecutor');
    const exportId = String(payload.exportId ?? '');
    const path = buildDataPath(config, `/exports/${encodeURIComponent(exportId)}/start`);

    const response = await bloomreachApiFetch(config, path, {});

    return { success: true, response };
  }
}

class ScheduleExportExecutor implements ExportActionExecutor {
  readonly actionType = SCHEDULE_EXPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'ScheduleExportExecutor');
    const exportId = String(payload.exportId ?? '');
    const path = buildDataPath(config, `/exports/${encodeURIComponent(exportId)}/schedule`);

    const response = await bloomreachApiFetch(config, path, {
      body: { schedule: payload.schedule },
    });

    return { success: true, response };
  }
}

class DeleteExportExecutor implements ExportActionExecutor {
  readonly actionType = DELETE_EXPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'DeleteExportExecutor');
    const exportId = String(payload.exportId ?? '');
    const path = buildDataPath(config, `/exports/${encodeURIComponent(exportId)}`);

    const response = await bloomreachApiFetch(config, path, {
      method: 'POST',
      body: { command: 'delete' },
    });

    return { success: true, response };
  }
}

export function createExportActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, ExportActionExecutor> {
  return {
    [CREATE_EXPORT_ACTION_TYPE]: new CreateExportExecutor(apiConfig),
    [RUN_EXPORT_ACTION_TYPE]: new RunExportExecutor(apiConfig),
    [SCHEDULE_EXPORT_ACTION_TYPE]: new ScheduleExportExecutor(apiConfig),
    [DELETE_EXPORT_ACTION_TYPE]: new DeleteExportExecutor(apiConfig),
  };
}

export class BloomreachExportsService {
  private readonly exportsBaseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validatedProject = validateProject(project);
    this.exportsBaseUrl = buildExportsUrl(validatedProject);
    this.apiConfig = apiConfig;
  }

  get exportsUrl(): string {
    return this.exportsBaseUrl;
  }

  async listExports(input?: ListExportsInput): Promise<BloomreachExport[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    const config = requireApiConfig(this.apiConfig, 'listExports');
    const path = buildDataPath(config, '/exports');

    const response = await bloomreachApiFetch(config, path, {
      body: { command: 'list' },
    });

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
        exportType: String(item.export_type ?? item.exportType ?? ''),
        dataSelection: (item.data_selection ?? item.dataSelection ?? { attributes: [] }) as DataSelection,
        destination: (item.destination ?? { type: 'unknown' }) as ExportDestination,
        schedule: item.schedule as ExportSchedule | undefined,
        status: String(item.status ?? 'unknown'),
        createdAt: String(item.created_at ?? item.createdAt ?? ''),
        updatedAt: String(item.updated_at ?? item.updatedAt ?? ''),
        url: buildExportDetailUrl(input?.project ?? '', String(item.id ?? '')),
      };
    });
  }

  async viewExportStatus(input: ViewExportStatusInput): Promise<ExportStatus> {
    validateProject(input.project);
    validateExportId(input.exportId);

    const config = requireApiConfig(this.apiConfig, 'viewExportStatus');
    const path = buildDataPath(config, `/exports/${encodeURIComponent(input.exportId)}/status`);

    const response = await bloomreachApiFetch(config, path, {
      body: { export_id: input.exportId },
    });

    const data = response as Record<string, unknown>;

    return {
      exportId: String(data.export_id ?? data.exportId ?? input.exportId),
      status: String(data.status ?? 'unknown'),
      startedAt:
        data.started_at !== undefined
          ? String(data.started_at)
          : data.startedAt !== undefined
            ? String(data.startedAt)
            : undefined,
      completedAt:
        data.completed_at !== undefined
          ? String(data.completed_at)
          : data.completedAt !== undefined
            ? String(data.completedAt)
            : undefined,
      fileLocation:
        data.file_location !== undefined
          ? String(data.file_location)
          : data.fileLocation !== undefined
            ? String(data.fileLocation)
            : undefined,
      recordCount:
        typeof data.record_count === 'number'
          ? data.record_count
          : typeof data.recordCount === 'number'
            ? data.recordCount
            : undefined,
      errorMessage:
        data.error_message !== undefined
          ? String(data.error_message)
          : data.errorMessage !== undefined
            ? String(data.errorMessage)
            : undefined,
    };
  }

  async viewExportHistory(input: ViewExportHistoryInput): Promise<ExportHistoryEntry[]> {
    validateProject(input.project);
    validateExportId(input.exportId);

    const config = requireApiConfig(this.apiConfig, 'viewExportHistory');
    const path = buildDataPath(config, `/exports/${encodeURIComponent(input.exportId)}/history`);

    const response = await bloomreachApiFetch(config, path, {
      body: { export_id: input.exportId },
    });

    const data = response as Record<string, unknown>;
    const items = Array.isArray(data.results) ? data.results : Array.isArray(response) ? response : [];

    return items.map((rawItem: unknown) => {
      const item =
        typeof rawItem === 'object' && rawItem !== null
          ? (rawItem as Record<string, unknown>)
          : {};

      return {
        id: String(item.id ?? ''),
        exportId: String(item.export_id ?? item.exportId ?? input.exportId),
        status: String(item.status ?? 'unknown'),
        startedAt:
          item.started_at !== undefined
            ? String(item.started_at)
            : item.startedAt !== undefined
              ? String(item.startedAt)
              : undefined,
        completedAt:
          item.completed_at !== undefined
            ? String(item.completed_at)
            : item.completedAt !== undefined
              ? String(item.completedAt)
              : undefined,
        fileLocation:
          item.file_location !== undefined
            ? String(item.file_location)
            : item.fileLocation !== undefined
              ? String(item.fileLocation)
              : undefined,
        recordCount:
          typeof item.record_count === 'number'
            ? item.record_count
            : typeof item.recordCount === 'number'
              ? item.recordCount
              : undefined,
      };
    });
  }

  prepareCreateExport(input: CreateExportInput): PreparedExportAction {
    const project = validateProject(input.project);
    const name = validateExportName(input.name);
    const exportType = validateExportType(input.exportType);
    const dataSelection = validateDataSelection(input.dataSelection);
    const destination = validateDestination(input.destination);
    const schedule =
      input.schedule === undefined ? undefined : validateSchedule(input.schedule);
    const operatorNote = validateOptionalString(
      input.operatorNote,
      'Operator note',
      MAX_DESCRIPTION_LENGTH,
    );

    const preview = {
      action: CREATE_EXPORT_ACTION_TYPE,
      project,
      name,
      exportType,
      dataSelection,
      destination,
      schedule,
      operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareRunExport(input: RunExportInput): PreparedExportAction {
    const project = validateProject(input.project);
    const exportId = validateExportId(input.exportId);
    const operatorNote = validateOptionalString(
      input.operatorNote,
      'Operator note',
      MAX_DESCRIPTION_LENGTH,
    );

    const preview = {
      action: RUN_EXPORT_ACTION_TYPE,
      project,
      exportId,
      operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareScheduleExport(input: ScheduleExportInput): PreparedExportAction {
    const project = validateProject(input.project);
    const exportId = validateExportId(input.exportId);
    const schedule = validateSchedule(input.schedule);
    const operatorNote = validateOptionalString(
      input.operatorNote,
      'Operator note',
      MAX_DESCRIPTION_LENGTH,
    );

    const preview = {
      action: SCHEDULE_EXPORT_ACTION_TYPE,
      project,
      exportId,
      schedule,
      operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareDeleteExport(input: DeleteExportInput): PreparedExportAction {
    const project = validateProject(input.project);
    const exportId = validateExportId(input.exportId);
    const operatorNote = validateOptionalString(
      input.operatorNote,
      'Operator note',
      MAX_DESCRIPTION_LENGTH,
    );

    const preview = {
      action: DELETE_EXPORT_ACTION_TYPE,
      project,
      exportId,
      operatorNote,
    };

    return createPreparedAction(preview);
  }
}
