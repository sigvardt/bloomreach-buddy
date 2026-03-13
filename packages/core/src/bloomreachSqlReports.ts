import { validateProject } from './bloomreachDashboards.js';

export const CREATE_SQL_REPORT_ACTION_TYPE = 'sql_reports.create_report';
export const EXECUTE_SQL_REPORT_ACTION_TYPE = 'sql_reports.execute_report';
export const EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE = 'sql_reports.export_results';
export const CLONE_SQL_REPORT_ACTION_TYPE = 'sql_reports.clone_report';
export const ARCHIVE_SQL_REPORT_ACTION_TYPE = 'sql_reports.archive_report';

export const SQL_REPORT_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const SQL_REPORT_CREATE_RATE_LIMIT = 10;
export const SQL_REPORT_EXECUTE_RATE_LIMIT = 30;
export const SQL_REPORT_MODIFY_RATE_LIMIT = 20;

export const SQL_REPORT_STATUSES = [
  'saved',
  'running',
  'completed',
  'failed',
  'archived',
] as const;
export type SqlReportStatus = (typeof SQL_REPORT_STATUSES)[number];

export const SQL_REPORT_EXPORT_FORMATS = ['json', 'csv'] as const;
export type SqlReportExportFormat = (typeof SQL_REPORT_EXPORT_FORMATS)[number];

export interface BloomreachSqlReport {
  id: string;
  name: string;
  query: string;
  parameters?: Record<string, string>;
  status: SqlReportStatus;
  createdAt?: string;
  updatedAt?: string;
  lastExecutedAt?: string;
  url: string;
}

export interface SqlReportColumn {
  name: string;
  type: string;
}

export interface SqlReportExecutionResult {
  reportId: string;
  status: 'completed' | 'failed';
  columns: SqlReportColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  executedAt: string;
}

export interface ListSqlReportsInput {
  project: string;
  status?: string;
}

export interface ViewSqlReportInput {
  project: string;
  reportId: string;
}

export interface CreateSqlReportInput {
  project: string;
  name: string;
  query: string;
  parameters?: Record<string, string>;
  operatorNote?: string;
}

export interface ExecuteSqlReportInput {
  project: string;
  reportId: string;
  parameters?: Record<string, string>;
  operatorNote?: string;
}

export interface ExportSqlReportResultsInput {
  project: string;
  reportId: string;
  format?: string;
  operatorNote?: string;
}

export interface CloneSqlReportInput {
  project: string;
  reportId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveSqlReportInput {
  project: string;
  reportId: string;
  operatorNote?: string;
}

export interface PreparedSqlReportAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export function validateSqlReportName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new Error('Report name must not be empty.');
  }
  if (trimmed.length > 200) {
    throw new Error(
      `Report name must not exceed 200 characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateSqlReportId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Report ID must not be empty.');
  }
  return trimmed;
}

export function validateSqlQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length < 1) {
    throw new Error('SQL query must not be empty.');
  }
  if (trimmed.length > 10000) {
    throw new Error(
      `SQL query must not exceed 10000 characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateSqlReportExportFormat(format: string): SqlReportExportFormat {
  if (!SQL_REPORT_EXPORT_FORMATS.includes(format as SqlReportExportFormat)) {
    throw new Error(
      `format must be one of: ${SQL_REPORT_EXPORT_FORMATS.join(', ')} (got "${format}").`,
    );
  }
  return format as SqlReportExportFormat;
}

export function validateSqlReportStatus(status: string): SqlReportStatus {
  if (!SQL_REPORT_STATUSES.includes(status as SqlReportStatus)) {
    throw new Error(
      `status must be one of: ${SQL_REPORT_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as SqlReportStatus;
}

export function buildSqlReportsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/sqlreports`;
}

export interface SqlReportActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateSqlReportExecutor implements SqlReportActionExecutor {
  readonly actionType = CREATE_SQL_REPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateSqlReportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ExecuteSqlReportExecutor implements SqlReportActionExecutor {
  readonly actionType = EXECUTE_SQL_REPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ExecuteSqlReportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ExportSqlReportResultsExecutor implements SqlReportActionExecutor {
  readonly actionType = EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ExportSqlReportResultsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneSqlReportExecutor implements SqlReportActionExecutor {
  readonly actionType = CLONE_SQL_REPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneSqlReportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveSqlReportExecutor implements SqlReportActionExecutor {
  readonly actionType = ARCHIVE_SQL_REPORT_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveSqlReportExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createSqlReportActionExecutors(): Record<
  string,
  SqlReportActionExecutor
> {
  return {
    [CREATE_SQL_REPORT_ACTION_TYPE]: new CreateSqlReportExecutor(),
    [EXECUTE_SQL_REPORT_ACTION_TYPE]: new ExecuteSqlReportExecutor(),
    [EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE]: new ExportSqlReportResultsExecutor(),
    [CLONE_SQL_REPORT_ACTION_TYPE]: new CloneSqlReportExecutor(),
    [ARCHIVE_SQL_REPORT_ACTION_TYPE]: new ArchiveSqlReportExecutor(),
  };
}

export class BloomreachSqlReportsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildSqlReportsUrl(validateProject(project));
  }

  get sqlReportsUrl(): string {
    return this.baseUrl;
  }

  async listSqlReports(input?: ListSqlReportsInput): Promise<BloomreachSqlReport[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateSqlReportStatus(input.status);
      }
    }

    throw new Error(
      'listSqlReports: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSqlReport(input: ViewSqlReportInput): Promise<BloomreachSqlReport> {
    validateProject(input.project);
    validateSqlReportId(input.reportId);

    throw new Error(
      'viewSqlReport: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateSqlReport(input: CreateSqlReportInput): PreparedSqlReportAction {
    const project = validateProject(input.project);
    const name = validateSqlReportName(input.name);
    const query = validateSqlQuery(input.query);

    const preview = {
      action: CREATE_SQL_REPORT_ACTION_TYPE,
      project,
      name,
      query,
      parameters: input.parameters,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareExecuteSqlReport(input: ExecuteSqlReportInput): PreparedSqlReportAction {
    const project = validateProject(input.project);
    const reportId = validateSqlReportId(input.reportId);

    const preview = {
      action: EXECUTE_SQL_REPORT_ACTION_TYPE,
      project,
      reportId,
      parameters: input.parameters,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareExportSqlReportResults(
    input: ExportSqlReportResultsInput,
  ): PreparedSqlReportAction {
    const project = validateProject(input.project);
    const reportId = validateSqlReportId(input.reportId);
    const format =
      input.format !== undefined ? validateSqlReportExportFormat(input.format) : undefined;

    const preview = {
      action: EXPORT_SQL_REPORT_RESULTS_ACTION_TYPE,
      project,
      reportId,
      format,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCloneSqlReport(input: CloneSqlReportInput): PreparedSqlReportAction {
    const project = validateProject(input.project);
    const reportId = validateSqlReportId(input.reportId);
    const newName =
      input.newName !== undefined ? validateSqlReportName(input.newName) : undefined;

    const preview = {
      action: CLONE_SQL_REPORT_ACTION_TYPE,
      project,
      reportId,
      newName,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareArchiveSqlReport(input: ArchiveSqlReportInput): PreparedSqlReportAction {
    const project = validateProject(input.project);
    const reportId = validateSqlReportId(input.reportId);

    const preview = {
      action: ARCHIVE_SQL_REPORT_ACTION_TYPE,
      project,
      reportId,
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
