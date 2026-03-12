import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

export const CREATE_TREND_ACTION_TYPE = 'trends.create_trend';
export const CLONE_TREND_ACTION_TYPE = 'trends.clone_trend';
export const ARCHIVE_TREND_ACTION_TYPE = 'trends.archive_trend';

export const TREND_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const TREND_CREATE_RATE_LIMIT = 10;
export const TREND_MODIFY_RATE_LIMIT = 20;

export const TREND_GRANULARITIES = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
] as const;
export type TrendGranularity = (typeof TREND_GRANULARITIES)[number];

export interface BloomreachTrendAnalysis {
  id: string;
  name: string;
  events: string[];
  granularity: TrendGranularity;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface TrendFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface TrendDataPoint {
  timestamp: string;
  values: Record<string, number>;
}

export interface TrendResults {
  analysisId: string;
  analysisName: string;
  granularity: TrendGranularity;
  startDate: string;
  endDate: string;
  dataPoints: TrendDataPoint[];
  filters?: TrendFilter;
}

export interface ListTrendAnalysesInput {
  project: string;
}

export interface CreateTrendAnalysisInput {
  project: string;
  name: string;
  events: string[];
  granularity?: string;
  filters?: TrendFilter;
  operatorNote?: string;
}

export interface ViewTrendResultsInput {
  project: string;
  analysisId: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}

export interface CloneTrendAnalysisInput {
  project: string;
  analysisId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveTrendAnalysisInput {
  project: string;
  analysisId: string;
  operatorNote?: string;
}

export interface PreparedTrendAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_TREND_NAME_LENGTH = 200;
const MIN_TREND_NAME_LENGTH = 1;

export function validateTrendName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_TREND_NAME_LENGTH) {
    throw new Error('Trend name must not be empty.');
  }
  if (trimmed.length > MAX_TREND_NAME_LENGTH) {
    throw new Error(
      `Trend name must not exceed ${MAX_TREND_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateTrendGranularity(granularity: string): TrendGranularity {
  if (!TREND_GRANULARITIES.includes(granularity as TrendGranularity)) {
    throw new Error(
      `granularity must be one of: ${TREND_GRANULARITIES.join(', ')} (got "${granularity}").`,
    );
  }
  return granularity as TrendGranularity;
}

export function validateTrendAnalysisId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Trend analysis ID must not be empty.');
  }
  return trimmed;
}

export function buildTrendsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/trends`;
}

export interface TrendActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateTrendExecutor implements TrendActionExecutor {
  readonly actionType = CREATE_TREND_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateTrendExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneTrendExecutor implements TrendActionExecutor {
  readonly actionType = CLONE_TREND_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneTrendExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveTrendExecutor implements TrendActionExecutor {
  readonly actionType = ARCHIVE_TREND_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveTrendExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createTrendActionExecutors(): Record<string, TrendActionExecutor> {
  return {
    [CREATE_TREND_ACTION_TYPE]: new CreateTrendExecutor(),
    [CLONE_TREND_ACTION_TYPE]: new CloneTrendExecutor(),
    [ARCHIVE_TREND_ACTION_TYPE]: new ArchiveTrendExecutor(),
  };
}

export class BloomreachTrendsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildTrendsUrl(validateProject(project));
  }

  get trendsUrl(): string {
    return this.baseUrl;
  }

  async listTrendAnalyses(
    input?: ListTrendAnalysesInput,
  ): Promise<BloomreachTrendAnalysis[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listTrendAnalyses: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewTrendResults(input: ViewTrendResultsInput): Promise<TrendResults> {
    validateProject(input.project);
    validateTrendAnalysisId(input.analysisId);

    if (input.granularity !== undefined) {
      validateTrendGranularity(input.granularity);
    }

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    throw new Error(
      'viewTrendResults: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateTrendAnalysis(input: CreateTrendAnalysisInput): PreparedTrendAction {
    const project = validateProject(input.project);
    const name = validateTrendName(input.name);
    const granularity =
      input.granularity !== undefined
        ? validateTrendGranularity(input.granularity)
        : undefined;

    const events = input.events.map((event) => event.trim()).filter(Boolean);
    if (events.length === 0) {
      throw new Error('events must contain at least one event name.');
    }

    const preview = {
      action: CREATE_TREND_ACTION_TYPE,
      project,
      name,
      events,
      granularity,
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

  prepareCloneTrendAnalysis(input: CloneTrendAnalysisInput): PreparedTrendAction {
    const project = validateProject(input.project);
    const analysisId = validateTrendAnalysisId(input.analysisId);
    const newName =
      input.newName !== undefined ? validateTrendName(input.newName) : undefined;

    const preview = {
      action: CLONE_TREND_ACTION_TYPE,
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

  prepareArchiveTrendAnalysis(
    input: ArchiveTrendAnalysisInput,
  ): PreparedTrendAction {
    const project = validateProject(input.project);
    const analysisId = validateTrendAnalysisId(input.analysisId);

    const preview = {
      action: ARCHIVE_TREND_ACTION_TYPE,
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
