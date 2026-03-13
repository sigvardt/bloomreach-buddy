import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

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

export interface FunnelActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = CREATE_FUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateFunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = CLONE_FUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneFunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveFunnelExecutor implements FunnelActionExecutor {
  readonly actionType = ARCHIVE_FUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveFunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createFunnelActionExecutors(): Record<string, FunnelActionExecutor> {
  return {
    [CREATE_FUNNEL_ACTION_TYPE]: new CreateFunnelExecutor(),
    [CLONE_FUNNEL_ACTION_TYPE]: new CloneFunnelExecutor(),
    [ARCHIVE_FUNNEL_ACTION_TYPE]: new ArchiveFunnelExecutor(),
  };
}

export class BloomreachFunnelsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildFunnelsUrl(validateProject(project));
  }

  get funnelsUrl(): string {
    return this.baseUrl;
  }

  async listFunnelAnalyses(input?: ListFunnelAnalysesInput): Promise<BloomreachFunnelAnalysis[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listFunnelAnalyses: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewFunnelResults(input: ViewFunnelResultsInput): Promise<FunnelResults> {
    validateProject(input.project);
    validateFunnelAnalysisId(input.analysisId);

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    throw new Error(
      'viewFunnelResults: not yet implemented. Requires browser automation infrastructure.',
    );
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
