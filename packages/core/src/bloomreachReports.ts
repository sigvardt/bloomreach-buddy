import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_REPORT_ACTION_TYPE = 'reports.create_report';
export const CLONE_REPORT_ACTION_TYPE = 'reports.clone_report';
export const ARCHIVE_REPORT_ACTION_TYPE = 'reports.archive_report';
export const EXPORT_REPORT_ACTION_TYPE = 'reports.export_report';

/** Rate limit window for report operations (1 hour in ms). */
export const REPORT_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const REPORT_CREATE_RATE_LIMIT = 10;
export const REPORT_MODIFY_RATE_LIMIT = 20;
export const REPORT_EXPORT_RATE_LIMIT = 30;

export const REPORT_EXPORT_FORMATS = ['csv', 'xlsx'] as const;
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export const REPORT_SORT_ORDERS = ['asc', 'desc'] as const;
export type ReportSortOrder = (typeof REPORT_SORT_ORDERS)[number];

export interface BloomreachReport {
  id: string;
  name: string;
  /** Metrics included in the report (e.g. "count", "sum", "average"). */
  metrics: string[];
  /** Dimensions (grouping columns) in the report (e.g. event attributes, customer properties). */
  dimensions: string[];
  /** ISO-8601 creation timestamp (if available). */
  createdAt?: string;
  /** ISO-8601 last-updated timestamp (if available). */
  updatedAt?: string;
  /** Full URL path to the report. */
  url: string;
}

export interface ReportDateRange {
  startDate?: string;
  endDate?: string;
}

export interface ReportFilter {
  /** Attribute name to filter on. */
  attribute: string;
  /** Comparison operator (e.g. "equals", "contains", "greater_than"). */
  operator: string;
  /** Value(s) to compare against. */
  value: string | string[];
}

export interface ReportSortConfig {
  /** Column name to sort by. */
  column: string;
  /** Sort order (asc or desc). */
  order: ReportSortOrder;
}

export interface ReportGrouping {
  /** Attribute to group rows by. */
  attribute: string;
}

export interface ReportResults {
  reportId: string;
  reportName: string;
  /** Column headers in order. */
  columns: string[];
  /** Row data — each row is an array of string values aligned with columns. */
  rows: string[][];
  /** Total number of rows (may exceed what is returned). */
  totalRows: number;
  /** Date range the results cover. */
  dateRange?: ReportDateRange;
}

export interface ListReportsInput {
  project: string;
}

export interface ViewReportResultsInput {
  project: string;
  reportId: string;
  dateRange?: ReportDateRange;
  filters?: ReportFilter[];
  sort?: ReportSortConfig;
  grouping?: ReportGrouping[];
  /** Maximum rows to return. */
  limit?: number;
}

export interface CreateReportInput {
  project: string;
  name: string;
  metrics: string[];
  dimensions?: string[];
  dateRange?: ReportDateRange;
  filters?: ReportFilter[];
  sort?: ReportSortConfig;
  grouping?: ReportGrouping[];
  operatorNote?: string;
}

export interface ExportReportInput {
  project: string;
  reportId: string;
  format: string;
  dateRange?: ReportDateRange;
  filters?: ReportFilter[];
  operatorNote?: string;
}

export interface CloneReportInput {
  project: string;
  reportId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveReportInput {
  project: string;
  reportId: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedReportAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_REPORT_NAME_LENGTH = 200;
const MIN_REPORT_NAME_LENGTH = 1;
const MAX_REPORT_LIMIT = 10_000;
const MIN_REPORT_LIMIT = 1;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateReportName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_REPORT_NAME_LENGTH) {
    throw new Error('Report name must not be empty.');
  }
  if (trimmed.length > MAX_REPORT_NAME_LENGTH) {
    throw new Error(
      `Report name must not exceed ${MAX_REPORT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If report ID is empty. */
export function validateReportId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Report ID must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If metrics array is empty. */
export function validateMetrics(metrics: string[]): string[] {
  if (metrics.length === 0) {
    throw new Error('At least one metric is required.');
  }
  const trimmed = metrics.map((m) => m.trim());
  for (const metric of trimmed) {
    if (metric.length === 0) {
      throw new Error('Metric names must not be empty.');
    }
  }
  return trimmed;
}

export function validateReportExportFormat(format: string): ReportExportFormat {
  if (!REPORT_EXPORT_FORMATS.includes(format as ReportExportFormat)) {
    throw new Error(
      `Export format must be one of: ${REPORT_EXPORT_FORMATS.join(', ')} (got "${format}").`,
    );
  }
  return format as ReportExportFormat;
}

/** @throws {Error} If sort order is not asc or desc. */
export function validateSortOrder(order: string): ReportSortOrder {
  if (!REPORT_SORT_ORDERS.includes(order as ReportSortOrder)) {
    throw new Error(
      `Sort order must be one of: ${REPORT_SORT_ORDERS.join(', ')} (got "${order}").`,
    );
  }
  return order as ReportSortOrder;
}

/** @throws {Error} If limit is not a positive integer within bounds. */
export function validateLimit(limit: number): number {
  if (
    !Number.isInteger(limit) ||
    limit < MIN_REPORT_LIMIT ||
    limit > MAX_REPORT_LIMIT
  ) {
    throw new Error(
      `Limit must be an integer between ${MIN_REPORT_LIMIT} and ${MAX_REPORT_LIMIT} (got ${limit}).`,
    );
  }
  return limit;
}

export function buildReportsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/reports`;
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

/**
 * Executor for a confirmed report mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface ReportActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateReportExecutor implements ReportActionExecutor {
  readonly actionType = CREATE_REPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateReportExecutor: not yet implemented. ' +
        'Report creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class CloneReportExecutor implements ReportActionExecutor {
  readonly actionType = CLONE_REPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CloneReportExecutor: not yet implemented. ' +
        'Report cloning is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ArchiveReportExecutor implements ReportActionExecutor {
  readonly actionType = ARCHIVE_REPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ArchiveReportExecutor: not yet implemented. ' +
        'Report archiving is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ExportReportExecutor implements ReportActionExecutor {
  readonly actionType = EXPORT_REPORT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ExportReportExecutor: not yet implemented. ' +
        'Report export is only available through the Bloomreach Engagement UI.',
    );
  }
}

export function createReportActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<
  string,
  ReportActionExecutor
> {
  return {
    [CREATE_REPORT_ACTION_TYPE]: new CreateReportExecutor(apiConfig),
    [CLONE_REPORT_ACTION_TYPE]: new CloneReportExecutor(apiConfig),
    [ARCHIVE_REPORT_ACTION_TYPE]: new ArchiveReportExecutor(apiConfig),
    [EXPORT_REPORT_ACTION_TYPE]: new ExportReportExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement reports — tabular data views combining events
 * and customer attributes. Read methods return data directly. Mutation methods
 * follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachReportsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildReportsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get reportsUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listReports(_input?: ListReportsInput): Promise<BloomreachReport[]> {
    if (_input !== undefined) {
      validateProject(_input.project);
    }

    throw new Error(
      'listReports: the Bloomreach API does not provide a list endpoint for reports. ' +
        'Report IDs must be obtained from the Bloomreach Engagement UI ' +
        '(found in the URL when viewing a report, e.g. "606488856f8cf6f848b20af8").',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewReportResults(
    input: ViewReportResultsInput,
  ): Promise<ReportResults> {
    validateProject(input.project);
    const reportId = validateReportId(input.reportId);
    if (input.limit !== undefined) {
      validateLimit(input.limit);
    }
    if (input.sort?.order !== undefined) {
      validateSortOrder(input.sort.order);
    }

    const config = requireApiConfig(this.apiConfig, 'viewReportResults');
    const path = buildDataPath(config, '/analyses/reports');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        analysis_id: reportId,
        format: 'table_json',
      },
    });

    const data = response as {
      header?: string[];
      rows?: unknown[][];
      success?: boolean;
      name?: string;
    };
    if (!data.success || !Array.isArray(data.rows)) {
      throw new Error('viewReportResults: unexpected API response format.');
    }

    const columns = Array.isArray(data.header) ? data.header : [];
    const rows = data.rows.map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
    );

    return {
      reportId,
      reportName: data.name ?? reportId,
      columns,
      rows,
      totalRows: rows.length,
      dateRange: input.dateRange,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateReport(input: CreateReportInput): PreparedReportAction {
    const project = validateProject(input.project);
    const name = validateReportName(input.name);
    const metrics = validateMetrics(input.metrics);
    if (input.sort?.order !== undefined) {
      validateSortOrder(input.sort.order);
    }

    const preview = {
      action: CREATE_REPORT_ACTION_TYPE,
      project,
      name,
      metrics,
      dimensions: input.dimensions ?? [],
      dateRange: input.dateRange,
      filters: input.filters,
      sort: input.sort,
      grouping: input.grouping,
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
  prepareExportReport(input: ExportReportInput): PreparedReportAction {
    const project = validateProject(input.project);
    const reportId = validateReportId(input.reportId);
    const format = validateReportExportFormat(input.format);

    const preview = {
      action: EXPORT_REPORT_ACTION_TYPE,
      project,
      reportId,
      format,
      dateRange: input.dateRange,
      filters: input.filters,
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
  prepareCloneReport(input: CloneReportInput): PreparedReportAction {
    const project = validateProject(input.project);
    const reportId = validateReportId(input.reportId);
    const newName =
      input.newName !== undefined
        ? validateReportName(input.newName)
        : undefined;

    const preview = {
      action: CLONE_REPORT_ACTION_TYPE,
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

  /** @throws {Error} If input validation fails. */
  prepareArchiveReport(input: ArchiveReportInput): PreparedReportAction {
    const project = validateProject(input.project);
    const reportId = validateReportId(input.reportId);

    const preview = {
      action: ARCHIVE_REPORT_ACTION_TYPE,
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
