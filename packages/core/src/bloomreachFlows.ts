import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

export const CREATE_FLOW_ACTION_TYPE = 'flows.create_flow';
export const CLONE_FLOW_ACTION_TYPE = 'flows.clone_flow';
export const ARCHIVE_FLOW_ACTION_TYPE = 'flows.archive_flow';

export const FLOW_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const FLOW_CREATE_RATE_LIMIT = 10;
export const FLOW_MODIFY_RATE_LIMIT = 20;

export interface FlowEvent {
  order: number;
  eventName: string;
  label?: string;
}

export interface BloomreachFlowAnalysis {
  id: string;
  name: string;
  startingEvent: string;
  events: FlowEvent[];
  maxJourneyDepth?: number;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface FlowFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface FlowPath {
  events: string[];
  volume: number;
  conversionRate: number;
}

export interface FlowDropOff {
  afterEvent: string;
  volume: number;
  dropOffRate: number;
}

export interface FlowResults {
  analysisId: string;
  analysisName: string;
  startDate: string;
  endDate: string;
  startingEvent: string;
  maxJourneyDepth?: number;
  totalJourneys: number;
  paths: FlowPath[];
  dropOffs: FlowDropOff[];
  filters?: FlowFilter;
}

export interface ListFlowAnalysesInput {
  project: string;
}

export interface CreateFlowAnalysisInput {
  project: string;
  name: string;
  startingEvent: string;
  events: FlowEvent[];
  maxJourneyDepth?: number;
  filters?: FlowFilter;
  operatorNote?: string;
}

export interface ViewFlowResultsInput {
  project: string;
  analysisId: string;
  startDate?: string;
  endDate?: string;
}

export interface CloneFlowAnalysisInput {
  project: string;
  analysisId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveFlowAnalysisInput {
  project: string;
  analysisId: string;
  operatorNote?: string;
}

export interface PreparedFlowAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_FLOW_NAME_LENGTH = 200;
const MIN_FLOW_NAME_LENGTH = 1;
const MIN_JOURNEY_DEPTH = 1;
const MAX_JOURNEY_DEPTH = 20;

export function validateFlowName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_FLOW_NAME_LENGTH) {
    throw new Error('Flow name must not be empty.');
  }
  if (trimmed.length > MAX_FLOW_NAME_LENGTH) {
    throw new Error(
      `Flow name must not exceed ${MAX_FLOW_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateFlowAnalysisId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Flow analysis ID must not be empty.');
  }
  return trimmed;
}

export function validateStartingEvent(eventName: string): string {
  const trimmed = eventName.trim();
  if (trimmed.length === 0) {
    throw new Error('Starting event must not be empty.');
  }
  return trimmed;
}

export function validateFlowEvents(events: FlowEvent[]): FlowEvent[] {
  if (events.length < 1) {
    throw new Error('events must contain at least one event to track.');
  }

  return events.map((event, index) => {
    const expectedOrder = index + 1;
    if (event.order !== expectedOrder) {
      throw new Error(`events[${index}].order must be ${expectedOrder} (got ${event.order}).`);
    }

    const eventName = event.eventName.trim();
    if (eventName.length === 0) {
      throw new Error(`events[${index}].eventName must not be empty.`);
    }

    const label = event.label?.trim();

    return {
      order: event.order,
      eventName,
      label: label === undefined || label.length > 0 ? label : undefined,
    };
  });
}

export function validateMaxJourneyDepth(depth: number | undefined): number | undefined {
  if (depth === undefined) {
    return undefined;
  }

  if (!Number.isInteger(depth) || depth < MIN_JOURNEY_DEPTH || depth > MAX_JOURNEY_DEPTH) {
    throw new Error(
      `maxJourneyDepth must be an integer between ${MIN_JOURNEY_DEPTH} and ${MAX_JOURNEY_DEPTH} (got ${depth}).`,
    );
  }

  return depth;
}

export function buildFlowsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/flows`;
}

export interface FlowActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateFlowExecutor implements FlowActionExecutor {
  readonly actionType = CREATE_FLOW_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateFlowExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneFlowExecutor implements FlowActionExecutor {
  readonly actionType = CLONE_FLOW_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneFlowExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveFlowExecutor implements FlowActionExecutor {
  readonly actionType = ARCHIVE_FLOW_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveFlowExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createFlowActionExecutors(): Record<string, FlowActionExecutor> {
  return {
    [CREATE_FLOW_ACTION_TYPE]: new CreateFlowExecutor(),
    [CLONE_FLOW_ACTION_TYPE]: new CloneFlowExecutor(),
    [ARCHIVE_FLOW_ACTION_TYPE]: new ArchiveFlowExecutor(),
  };
}

export class BloomreachFlowsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildFlowsUrl(validateProject(project));
  }

  get flowsUrl(): string {
    return this.baseUrl;
  }

  async listFlowAnalyses(input?: ListFlowAnalysesInput): Promise<BloomreachFlowAnalysis[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listFlowAnalyses: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewFlowResults(input: ViewFlowResultsInput): Promise<FlowResults> {
    validateProject(input.project);
    validateFlowAnalysisId(input.analysisId);

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    throw new Error(
      'viewFlowResults: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateFlowAnalysis(input: CreateFlowAnalysisInput): PreparedFlowAction {
    const project = validateProject(input.project);
    const name = validateFlowName(input.name);
    const startingEvent = validateStartingEvent(input.startingEvent);
    const events = validateFlowEvents(input.events);
    const maxJourneyDepth = validateMaxJourneyDepth(input.maxJourneyDepth);

    const preview = {
      action: CREATE_FLOW_ACTION_TYPE,
      project,
      name,
      startingEvent,
      events,
      maxJourneyDepth,
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

  prepareCloneFlowAnalysis(input: CloneFlowAnalysisInput): PreparedFlowAction {
    const project = validateProject(input.project);
    const analysisId = validateFlowAnalysisId(input.analysisId);
    const newName = input.newName !== undefined ? validateFlowName(input.newName) : undefined;

    const preview = {
      action: CLONE_FLOW_ACTION_TYPE,
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

  prepareArchiveFlowAnalysis(input: ArchiveFlowAnalysisInput): PreparedFlowAction {
    const project = validateProject(input.project);
    const analysisId = validateFlowAnalysisId(input.analysisId);

    const preview = {
      action: ARCHIVE_FLOW_ACTION_TYPE,
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
