import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

export const CREATE_METRIC_ACTION_TYPE = 'metrics.create_metric';
export const EDIT_METRIC_ACTION_TYPE = 'metrics.edit_metric';
export const DELETE_METRIC_ACTION_TYPE = 'metrics.delete_metric';

export const METRIC_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const METRIC_CREATE_RATE_LIMIT = 10;
export const METRIC_MODIFY_RATE_LIMIT = 20;
export const METRIC_DELETE_RATE_LIMIT = 10;

export interface MetricAggregation {
  eventName: string;
  aggregationType: string;
  propertyName?: string;
}

export interface MetricFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface BloomreachMetric {
  id: string;
  name: string;
  description?: string;
  aggregation: MetricAggregation;
  filters?: MetricFilter;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface MetricResults {
  metricId: string;
  metricName: string;
  startDate: string;
  endDate: string;
  value: number;
  aggregationType: string;
  filters?: MetricFilter;
}

export interface ListMetricsInput {
  project: string;
}

export interface CreateMetricInput {
  project: string;
  name: string;
  description?: string;
  aggregation: MetricAggregation;
  filters?: MetricFilter;
  operatorNote?: string;
}

export interface EditMetricInput {
  project: string;
  metricId: string;
  name?: string;
  description?: string;
  aggregation?: MetricAggregation;
  filters?: MetricFilter;
  operatorNote?: string;
}

export interface DeleteMetricInput {
  project: string;
  metricId: string;
  operatorNote?: string;
}

export interface ViewMetricResultsInput {
  project: string;
  metricId: string;
  startDate?: string;
  endDate?: string;
}

export interface PreparedMetricAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_METRIC_NAME_LENGTH = 200;
const MIN_METRIC_NAME_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 1000;
const AGGREGATION_TYPES = new Set([
  'sum',
  'count',
  'average',
  'min',
  'max',
  'unique',
]);
const PROPERTY_REQUIRED_AGGREGATION_TYPES = new Set([
  'sum',
  'average',
  'min',
  'max',
]);

export function validateMetricName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_METRIC_NAME_LENGTH) {
    throw new Error('Metric name must not be empty.');
  }
  if (trimmed.length > MAX_METRIC_NAME_LENGTH) {
    throw new Error(
      `Metric name must not exceed ${MAX_METRIC_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateMetricId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Metric ID must not be empty.');
  }
  return trimmed;
}

export function validateDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    throw new Error('Description must not be empty.');
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateAggregationType(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (normalized.length === 0) {
    throw new Error('Aggregation type must not be empty.');
  }
  if (!AGGREGATION_TYPES.has(normalized)) {
    throw new Error(
      `Aggregation type must be one of: ${Array.from(AGGREGATION_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

export function validateAggregation(
  aggregation: MetricAggregation,
): MetricAggregation {
  const eventName = aggregation.eventName.trim();
  if (eventName.length === 0) {
    throw new Error('Aggregation eventName must not be empty.');
  }

  const aggregationType = validateAggregationType(aggregation.aggregationType);
  const propertyName = aggregation.propertyName?.trim();

  if (
    PROPERTY_REQUIRED_AGGREGATION_TYPES.has(aggregationType) &&
    (propertyName === undefined || propertyName.length === 0)
  ) {
    throw new Error(
      `aggregation.propertyName is required for aggregationType ${aggregationType}.`,
    );
  }

  if (propertyName !== undefined && propertyName.length === 0) {
    throw new Error('Aggregation propertyName must not be empty when provided.');
  }

  return {
    eventName,
    aggregationType,
    propertyName,
  };
}

export function buildMetricsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/metrics`;
}

export interface MetricActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateMetricExecutor implements MetricActionExecutor {
  readonly actionType = CREATE_METRIC_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateMetricExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class EditMetricExecutor implements MetricActionExecutor {
  readonly actionType = EDIT_METRIC_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'EditMetricExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteMetricExecutor implements MetricActionExecutor {
  readonly actionType = DELETE_METRIC_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteMetricExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createMetricActionExecutors(): Record<string, MetricActionExecutor> {
  return {
    [CREATE_METRIC_ACTION_TYPE]: new CreateMetricExecutor(),
    [EDIT_METRIC_ACTION_TYPE]: new EditMetricExecutor(),
    [DELETE_METRIC_ACTION_TYPE]: new DeleteMetricExecutor(),
  };
}

export class BloomreachMetricsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildMetricsUrl(validateProject(project));
  }

  get metricsUrl(): string {
    return this.baseUrl;
  }

  async listMetrics(input?: ListMetricsInput): Promise<BloomreachMetric[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listMetrics: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewMetricResults(input: ViewMetricResultsInput): Promise<MetricResults> {
    validateProject(input.project);
    validateMetricId(input.metricId);

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    throw new Error(
      'viewMetricResults: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateMetric(input: CreateMetricInput): PreparedMetricAction {
    const project = validateProject(input.project);
    const name = validateMetricName(input.name);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const aggregation = validateAggregation(input.aggregation);

    const preview = {
      action: CREATE_METRIC_ACTION_TYPE,
      project,
      name,
      description,
      aggregation,
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

  prepareEditMetric(input: EditMetricInput): PreparedMetricAction {
    const project = validateProject(input.project);
    const metricId = validateMetricId(input.metricId);
    const name =
      input.name === undefined ? undefined : validateMetricName(input.name);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const aggregation =
      input.aggregation === undefined
        ? undefined
        : validateAggregation(input.aggregation);

    const preview = {
      action: EDIT_METRIC_ACTION_TYPE,
      project,
      metricId,
      name,
      description,
      aggregation,
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

  prepareDeleteMetric(input: DeleteMetricInput): PreparedMetricAction {
    const project = validateProject(input.project);
    const metricId = validateMetricId(input.metricId);

    const preview = {
      action: DELETE_METRIC_ACTION_TYPE,
      project,
      metricId,
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
