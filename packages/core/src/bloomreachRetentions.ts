import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireString } from './errors.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_RETENTION_ACTION_TYPE = 'retentions.create_retention';
export const CLONE_RETENTION_ACTION_TYPE = 'retentions.clone_retention';
export const ARCHIVE_RETENTION_ACTION_TYPE = 'retentions.archive_retention';

export const RETENTION_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const RETENTION_CREATE_RATE_LIMIT = 10;
export const RETENTION_MODIFY_RATE_LIMIT = 20;

export const RETENTION_GRANULARITIES = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
] as const;
export type RetentionGranularity = (typeof RETENTION_GRANULARITIES)[number];

export interface BloomreachRetentionAnalysis {
  id: string;
  name: string;
  cohortEvent: string;
  returnEvent: string;
  granularity: RetentionGranularity;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface RetentionFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface RetentionCohortRow {
  cohortDate: string;
  cohortSize: number;
  retentionByPeriod: number[];
}

export interface RetentionResults {
  analysisId: string;
  analysisName: string;
  cohortEvent: string;
  returnEvent: string;
  granularity: RetentionGranularity;
  startDate: string;
  endDate: string;
  cohorts: RetentionCohortRow[];
  filters?: RetentionFilter;
}

export interface ListRetentionAnalysesInput {
  project: string;
}

export interface CreateRetentionAnalysisInput {
  project: string;
  name: string;
  cohortEvent: string;
  returnEvent: string;
  granularity?: string;
  dateRange?: DateRangeFilter;
  filters?: RetentionFilter;
  operatorNote?: string;
}

export interface ViewRetentionResultsInput {
  project: string;
  analysisId: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}

export interface CloneRetentionAnalysisInput {
  project: string;
  analysisId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveRetentionAnalysisInput {
  project: string;
  analysisId: string;
  operatorNote?: string;
}

export interface PreparedRetentionAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_RETENTION_NAME_LENGTH = 200;
const MIN_RETENTION_NAME_LENGTH = 1;

export function validateRetentionName(name: string): string {
  requireString(name, 'Retention name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_RETENTION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Retention name must not be empty.');
  }
  if (trimmed.length > MAX_RETENTION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Retention name must not exceed ${MAX_RETENTION_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateRetentionGranularity(
  granularity: string,
): RetentionGranularity {
  requireString(granularity, 'granularity');
  if (
    !RETENTION_GRANULARITIES.includes(granularity as RetentionGranularity)
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `granularity must be one of: ${RETENTION_GRANULARITIES.join(', ')} (got "${granularity}").`);
  }
  return granularity as RetentionGranularity;
}

export function validateRetentionAnalysisId(id: string): string {
  requireString(id, 'Retention analysis ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Retention analysis ID must not be empty.');
  }
  return trimmed;
}

export function validateEventName(label: string, eventName: string): string {
  requireString(eventName, label);
  const trimmed = eventName.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${label} must not be empty.`);
  }
  return trimmed;
}

export function buildRetentionsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/retentions`;
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

export interface RetentionActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = CREATE_RETENTION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateRetentionExecutor: not yet implemented. ' +
      'Retention creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CloneRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = CLONE_RETENTION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CloneRetentionExecutor: not yet implemented. ' +
      'Retention cloning is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ArchiveRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = ARCHIVE_RETENTION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveRetentionExecutor: not yet implemented. ' +
      'Retention archiving is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createRetentionActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, RetentionActionExecutor> {
  return {
    [CREATE_RETENTION_ACTION_TYPE]: new CreateRetentionExecutor(apiConfig),
    [CLONE_RETENTION_ACTION_TYPE]: new CloneRetentionExecutor(apiConfig),
    [ARCHIVE_RETENTION_ACTION_TYPE]: new ArchiveRetentionExecutor(apiConfig),
  };
}

export class BloomreachRetentionsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildRetentionsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get retentionsUrl(): string {
    return this.baseUrl;
  }

  async listRetentionAnalyses(
    input?: ListRetentionAnalysesInput,
  ): Promise<BloomreachRetentionAnalysis[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listRetentionAnalyses: the Bloomreach API does not provide a list endpoint for retentions. ' +
      'Retention analysis IDs must be obtained from the Bloomreach Engagement UI ' +
      '(found in the URL when viewing a retention analysis, e.g. "606488856f8cf6f848b20af8").');
  }

  async viewRetentionResults(
    input: ViewRetentionResultsInput,
  ): Promise<RetentionResults> {
    validateProject(input.project);
    const analysisId = validateRetentionAnalysisId(input.analysisId);

    if (input.granularity !== undefined) {
      validateRetentionGranularity(input.granularity);
    }

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    const config = requireApiConfig(this.apiConfig, 'viewRetentionResults');
    const path = buildDataPath(config, '/analyses/retentions');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        analysis_id: analysisId,
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
      throw new BloomreachBuddyError('API_ERROR', 'viewRetentionResults: unexpected API response format.');
    }

    const header = Array.isArray(data.header) ? data.header : [];
    const cohortDateIdx = header.indexOf('cohort_date');
    const cohortSizeIdx = header.indexOf('cohort_size');

    const periodIndices: number[] = [];
    for (let i = 0; i < header.length; i++) {
      if (i !== cohortDateIdx && i !== cohortSizeIdx) {
        periodIndices.push(i);
      }
    }

    const cohorts: RetentionCohortRow[] = data.rows.map((row) => {
      const toNum = (idx: number): number => {
        if (idx < 0 || idx >= row.length) return 0;
        const val = row[idx];
        return typeof val === 'number' ? val : 0;
      };
      const toStr = (idx: number): string => {
        if (idx < 0 || idx >= row.length) return '';
        const val = row[idx];
        return val === null || val === undefined ? '' : String(val);
      };

      return {
        cohortDate: toStr(cohortDateIdx),
        cohortSize: toNum(cohortSizeIdx),
        retentionByPeriod: periodIndices.map((idx) => toNum(idx)),
      };
    });

    return {
      analysisId,
      analysisName: data.name ?? analysisId,
      cohortEvent: '',
      returnEvent: '',
      granularity: (input.granularity as RetentionGranularity) ?? 'daily',
      startDate: input.startDate ?? '',
      endDate: input.endDate ?? '',
      cohorts,
    };
  }

  prepareCreateRetentionAnalysis(
    input: CreateRetentionAnalysisInput,
  ): PreparedRetentionAction {
    const project = validateProject(input.project);
    const name = validateRetentionName(input.name);
    const cohortEvent = validateEventName('cohortEvent', input.cohortEvent);
    const returnEvent = validateEventName('returnEvent', input.returnEvent);
    const granularity =
      input.granularity !== undefined
        ? validateRetentionGranularity(input.granularity)
        : undefined;

    if (input.dateRange !== undefined) {
      validateDateRange(input.dateRange);
    }

    const preview = {
      action: CREATE_RETENTION_ACTION_TYPE,
      project,
      name,
      cohortEvent,
      returnEvent,
      granularity,
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

  prepareCloneRetentionAnalysis(
    input: CloneRetentionAnalysisInput,
  ): PreparedRetentionAction {
    const project = validateProject(input.project);
    const analysisId = validateRetentionAnalysisId(input.analysisId);
    const newName =
      input.newName !== undefined
        ? validateRetentionName(input.newName)
        : undefined;

    const preview = {
      action: CLONE_RETENTION_ACTION_TYPE,
      project,
      analysisId,
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

  prepareArchiveRetentionAnalysis(
    input: ArchiveRetentionAnalysisInput,
  ): PreparedRetentionAction {
    const project = validateProject(input.project);
    const analysisId = validateRetentionAnalysisId(input.analysisId);

    const preview = {
      action: ARCHIVE_RETENTION_ACTION_TYPE,
      project,
      analysisId,
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
