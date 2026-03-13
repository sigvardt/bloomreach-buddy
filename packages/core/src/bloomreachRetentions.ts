import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

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
  const trimmed = name.trim();
  if (trimmed.length < MIN_RETENTION_NAME_LENGTH) {
    throw new Error('Retention name must not be empty.');
  }
  if (trimmed.length > MAX_RETENTION_NAME_LENGTH) {
    throw new Error(
      `Retention name must not exceed ${MAX_RETENTION_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateRetentionGranularity(
  granularity: string,
): RetentionGranularity {
  if (
    !RETENTION_GRANULARITIES.includes(granularity as RetentionGranularity)
  ) {
    throw new Error(
      `granularity must be one of: ${RETENTION_GRANULARITIES.join(', ')} (got "${granularity}").`,
    );
  }
  return granularity as RetentionGranularity;
}

export function validateRetentionAnalysisId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Retention analysis ID must not be empty.');
  }
  return trimmed;
}

export function validateEventName(label: string, eventName: string): string {
  const trimmed = eventName.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmed;
}

export function buildRetentionsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/retentions`;
}

export interface RetentionActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = CREATE_RETENTION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateRetentionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = CLONE_RETENTION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneRetentionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveRetentionExecutor implements RetentionActionExecutor {
  readonly actionType = ARCHIVE_RETENTION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveRetentionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createRetentionActionExecutors(): Record<
  string,
  RetentionActionExecutor
> {
  return {
    [CREATE_RETENTION_ACTION_TYPE]: new CreateRetentionExecutor(),
    [CLONE_RETENTION_ACTION_TYPE]: new CloneRetentionExecutor(),
    [ARCHIVE_RETENTION_ACTION_TYPE]: new ArchiveRetentionExecutor(),
  };
}

export class BloomreachRetentionsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildRetentionsUrl(validateProject(project));
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

    throw new Error(
      'listRetentionAnalyses: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewRetentionResults(
    input: ViewRetentionResultsInput,
  ): Promise<RetentionResults> {
    validateProject(input.project);
    validateRetentionAnalysisId(input.analysisId);

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

    throw new Error(
      'viewRetentionResults: not yet implemented. Requires browser automation infrastructure.',
    );
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
