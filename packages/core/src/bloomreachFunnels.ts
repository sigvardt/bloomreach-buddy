import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_FUNNEL_ACTION_TYPE = 'funnels.create_funnel';
export const CLONE_FUNNEL_ACTION_TYPE = 'funnels.clone_funnel';
export const ARCHIVE_FUNNEL_ACTION_TYPE = 'funnels.archive_funnel';

export const FUNNEL_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const FUNNEL_CREATE_RATE_LIMIT = 10;
export const FUNNEL_MODIFY_RATE_LIMIT = 20;

export interface FunnelStep {
  order: number;
  eventName: string;
  label?: string;
}

export interface BloomreachFunnelAnalysis {
  id: string;
  name: string;
  steps: FunnelStep[];
  timeLimitMs?: number;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface FunnelFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface FunnelStepResult {
  step: number;
  eventName: string;
  label?: string;
  entered: number;
  completed: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface FunnelResults {
  analysisId: string;
  analysisName: string;
  startDate: string;
  endDate: string;
  timeLimitMs?: number;
  steps: FunnelStepResult[];
  overallConversionRate: number;
  filters?: FunnelFilter;
}

export interface ListFunnelAnalysesInput {
  project: string;
}

export interface CreateFunnelAnalysisInput {
  project: string;
  name: string;
  steps: FunnelStep[];
  timeLimitMs?: number;
  filters?: FunnelFilter;
  operatorNote?: string;
}

export interface ViewFunnelResultsInput {
  project: string;
  analysisId: string;
  startDate?: string;
  endDate?: string;
}

export interface CloneFunnelAnalysisInput {
  project: string;
  analysisId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveFunnelAnalysisInput {
  project: string;
  analysisId: string;
  operatorNote?: string;
}

export interface PreparedFunnelAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_FUNNEL_NAME_LENGTH = 200;
const MIN_FUNNEL_NAME_LENGTH = 1;

export function validateFunnelName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_FUNNEL_NAME_LENGTH) {
    throw new Error('Funnel name must not be empty.');
  }
  if (trimmed.length > MAX_FUNNEL_NAME_LENGTH) {
    throw new Error(
      `Funnel name must not exceed ${MAX_FUNNEL_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateFunnelAnalysisId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Funnel analysis ID must not be empty.');
  }
  return trimmed;
}

export function validateFunnelSteps(steps: FunnelStep[]): FunnelStep[] {
  if (steps.length < 2) {
    throw new Error('steps must contain at least two funnel steps.');
  }

  return steps.map((step, index) => {
    const expectedOrder = index + 1;
    if (step.order !== expectedOrder) {
      throw new Error(`steps[${index}].order must be ${expectedOrder} (got ${step.order}).`);
    }

    const eventName = step.eventName.trim();
    if (eventName.length === 0) {
      throw new Error(`steps[${index}].eventName must not be empty.`);
    }

    const label = step.label?.trim();

    return {
      order: step.order,
      eventName,
      label: label === undefined || label.length > 0 ? label : undefined,
    };
  });
}

export function validateTimeLimitMs(ms: number | undefined): number | undefined {
  if (ms === undefined) {
    return undefined;
  }

  if (!Number.isInteger(ms) || ms <= 0) {
    throw new Error(`timeLimitMs must be a positive integer when provided (got ${ms}).`);
  }

  return ms;
}

export function buildFunnelsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/funnels`;
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

export interface FunnelActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = CREATE_FUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateFunnelExecutor: not yet implemented. ' +
        'Funnel creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class CloneFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = CLONE_FUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CloneFunnelExecutor: not yet implemented. ' +
        'Funnel cloning is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ArchiveFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = ARCHIVE_FUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ArchiveFunnelExecutor: not yet implemented. ' +
        'Funnel archiving is only available through the Bloomreach Engagement UI.',
    );
  }
}

export function createFunnelActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, FunnelActionExecutor> {
  return {
    [CREATE_FUNNEL_ACTION_TYPE]: new CreateFunnelExecutor(apiConfig),
    [CLONE_FUNNEL_ACTION_TYPE]: new CloneFunnelExecutor(apiConfig),
    [ARCHIVE_FUNNEL_ACTION_TYPE]: new ArchiveFunnelExecutor(apiConfig),
  };
}

export class BloomreachFunnelsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildFunnelsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get funnelsUrl(): string {
    return this.baseUrl;
  }

  async listFunnelAnalyses(input?: ListFunnelAnalysesInput): Promise<BloomreachFunnelAnalysis[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listFunnelAnalyses: the Bloomreach API does not provide a list endpoint for funnels. ' +
        'Funnel analysis IDs must be obtained from the Bloomreach Engagement UI ' +
        '(found in the URL when viewing a funnel, e.g. "606488856f8cf6f848b20af8").',
    );
  }

  async viewFunnelResults(input: ViewFunnelResultsInput): Promise<FunnelResults> {
    validateProject(input.project);
    const analysisId = validateFunnelAnalysisId(input.analysisId);

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    const config = requireApiConfig(this.apiConfig, 'viewFunnelResults');
    const path = buildDataPath(config, '/analyses/funnels');

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
      throw new Error('viewFunnelResults: unexpected API response format.');
    }

    const header = Array.isArray(data.header) ? data.header : [];
    const stepIdx = header.indexOf('step');
    const eventIdx = header.indexOf('event_name');
    const enteredIdx = header.indexOf('entered');
    const completedIdx = header.indexOf('completed');
    const conversionIdx = header.indexOf('conversion_rate');
    const dropOffIdx = header.indexOf('drop_off_rate');

    const steps: FunnelStepResult[] = data.rows.map((row, index) => {
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
        step: stepIdx >= 0 ? toNum(stepIdx) : index + 1,
        eventName: toStr(eventIdx),
        entered: toNum(enteredIdx),
        completed: toNum(completedIdx),
        conversionRate: toNum(conversionIdx),
        dropOffRate: toNum(dropOffIdx),
      };
    });

    const overallConversionRate =
      steps.length > 0 && steps[0].entered > 0
        ? steps[steps.length - 1].completed / steps[0].entered
        : 0;

    return {
      analysisId,
      analysisName: data.name ?? analysisId,
      startDate: input.startDate ?? '',
      endDate: input.endDate ?? '',
      steps,
      overallConversionRate,
    };
  }

  prepareCreateFunnelAnalysis(input: CreateFunnelAnalysisInput): PreparedFunnelAction {
    const project = validateProject(input.project);
    const name = validateFunnelName(input.name);
    const steps = validateFunnelSteps(input.steps);
    const timeLimitMs = validateTimeLimitMs(input.timeLimitMs);

    const preview = {
      action: CREATE_FUNNEL_ACTION_TYPE,
      project,
      name,
      steps,
      timeLimitMs,
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

  prepareCloneFunnelAnalysis(input: CloneFunnelAnalysisInput): PreparedFunnelAction {
    const project = validateProject(input.project);
    const analysisId = validateFunnelAnalysisId(input.analysisId);
    const newName = input.newName !== undefined ? validateFunnelName(input.newName) : undefined;

    const preview = {
      action: CLONE_FUNNEL_ACTION_TYPE,
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

  prepareArchiveFunnelAnalysis(input: ArchiveFunnelAnalysisInput): PreparedFunnelAction {
    const project = validateProject(input.project);
    const analysisId = validateFunnelAnalysisId(input.analysisId);

    const preview = {
      action: ARCHIVE_FUNNEL_ACTION_TYPE,
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
