import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireArray, requireString } from './errors.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildDataPath } from './bloomreachApiClient.js';

export const CREATE_SEGMENTATION_ACTION_TYPE = 'segmentations.create_segmentation';
export const CLONE_SEGMENTATION_ACTION_TYPE = 'segmentations.clone_segmentation';
export const ARCHIVE_SEGMENTATION_ACTION_TYPE = 'segmentations.archive_segmentation';

export const SEGMENTATION_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const SEGMENTATION_CREATE_RATE_LIMIT = 10;
export const SEGMENTATION_MODIFY_RATE_LIMIT = 20;

export const SEGMENT_CONDITION_TYPES = ['customer_attribute', 'event', 'behavior'] as const;

export type SegmentConditionType = (typeof SEGMENT_CONDITION_TYPES)[number];

export const SEGMENT_CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'is_set',
  'is_not_set',
  'in',
  'not_in',
] as const;

export type SegmentConditionOperator = (typeof SEGMENT_CONDITION_OPERATORS)[number];

export const SEGMENT_LOGICAL_OPERATORS = ['and', 'or'] as const;

export type SegmentLogicalOperator = (typeof SEGMENT_LOGICAL_OPERATORS)[number];

export interface SegmentCondition {
  type: SegmentConditionType;
  attribute: string;
  operator: SegmentConditionOperator;
  value?: string;
}

export interface SegmentConditionGroup {
  logicalOperator: SegmentLogicalOperator;
  conditions: SegmentCondition[];
}

export interface BloomreachSegmentation {
  id: string;
  name: string;
  conditionGroup: SegmentConditionGroup;
  dateRange?: DateRangeFilter;
  customerCount?: number;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface SegmentSize {
  segmentationId: string;
  customerCount: number;
  computedAt: string;
}

export interface SegmentCustomer {
  customerId: string;
  attributes?: Record<string, unknown>;
}

export interface SegmentCustomerList {
  segmentationId: string;
  customers: SegmentCustomer[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListSegmentationsInput {
  project: string;
}

export interface CreateSegmentationInput {
  project: string;
  name: string;
  conditions: SegmentCondition[];
  logicalOperator?: SegmentLogicalOperator;
  dateRange?: DateRangeFilter;
  operatorNote?: string;
}

export interface ViewSegmentSizeInput {
  project: string;
  segmentationId: string;
}

export interface ViewSegmentCustomersInput {
  project: string;
  segmentationId: string;
  limit?: number;
  offset?: number;
}

export interface CloneSegmentationInput {
  project: string;
  segmentationId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveSegmentationInput {
  project: string;
  segmentationId: string;
  operatorNote?: string;
}

export interface PreparedSegmentationAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_SEGMENTATION_NAME_LENGTH = 200;
const MIN_SEGMENTATION_NAME_LENGTH = 1;

export function validateSegmentationName(name: string): string {
  requireString(name, 'Segmentation name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_SEGMENTATION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Segmentation name must not be empty.');
  }
  if (trimmed.length > MAX_SEGMENTATION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Segmentation name must not exceed ${MAX_SEGMENTATION_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateSegmentationId(id: string): string {
  requireString(id, 'Segmentation ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Segmentation ID must not be empty.');
  }
  return trimmed;
}

export function validateSegmentConditionType(type: string): SegmentConditionType {
  requireString(type, 'condition type');
  if (!(SEGMENT_CONDITION_TYPES as readonly string[]).includes(type)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid condition type "${type}". Must be one of: ${SEGMENT_CONDITION_TYPES.join(', ')}.`);
  }
  return type as SegmentConditionType;
}

export function validateSegmentConditionOperator(operator: string): SegmentConditionOperator {
  requireString(operator, 'condition operator');
  if (!(SEGMENT_CONDITION_OPERATORS as readonly string[]).includes(operator)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid condition operator "${operator}". Must be one of: ${SEGMENT_CONDITION_OPERATORS.join(', ')}.`);
  }
  return operator as SegmentConditionOperator;
}

export function validateLogicalOperator(operator: string): SegmentLogicalOperator {
  requireString(operator, 'logical operator');
  if (!(SEGMENT_LOGICAL_OPERATORS as readonly string[]).includes(operator)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid logical operator "${operator}". Must be one of: ${SEGMENT_LOGICAL_OPERATORS.join(', ')}.`);
  }
  return operator as SegmentLogicalOperator;
}

export function validateSegmentConditions(conditions: SegmentCondition[]): SegmentCondition[] {
  requireArray(conditions, 'conditions');
  if (conditions.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'conditions must contain at least one segment condition.');
  }

  return conditions.map((condition, index) => {
    validateSegmentConditionType(condition.type);
    validateSegmentConditionOperator(condition.operator);

    const attribute = condition.attribute.trim();
    if (attribute.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `conditions[${index}].attribute must not be empty.`);
    }

    return {
      type: condition.type,
      attribute,
      operator: condition.operator,
      value: condition.value,
    };
  });
}

export function validateCustomerListLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) {
    return undefined;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `limit must be a positive integer when provided (got ${limit}).`);
  }

  return limit;
}

export function validateCustomerListOffset(offset: number | undefined): number | undefined {
  if (offset === undefined) {
    return undefined;
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `offset must be a non-negative integer when provided (got ${offset}).`);
  }

  return offset;
}

export function buildSegmentationsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/segmentations`;
}

export interface SegmentationActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
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

class CreateSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = CREATE_SEGMENTATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateSegmentationExecutor: not yet implemented. ' +
      'Segmentation creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CloneSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = CLONE_SEGMENTATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CloneSegmentationExecutor: not yet implemented. ' +
      'Segmentation cloning is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ArchiveSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = ARCHIVE_SEGMENTATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveSegmentationExecutor: not yet implemented. ' +
      'Segmentation archiving is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createSegmentationActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, SegmentationActionExecutor> {
  return {
    [CREATE_SEGMENTATION_ACTION_TYPE]: new CreateSegmentationExecutor(apiConfig),
    [CLONE_SEGMENTATION_ACTION_TYPE]: new CloneSegmentationExecutor(apiConfig),
    [ARCHIVE_SEGMENTATION_ACTION_TYPE]: new ArchiveSegmentationExecutor(apiConfig),
  };
}

export class BloomreachSegmentationsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildSegmentationsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get segmentationsUrl(): string {
    return this.baseUrl;
  }

  async listSegmentations(input?: ListSegmentationsInput): Promise<BloomreachSegmentation[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listSegmentations: the Bloomreach API does not provide a list endpoint for segmentations. ' +
      'Segmentation IDs must be obtained from the Bloomreach Engagement UI ' +
      '(found in the URL when editing a segmentation, e.g. "606488856f8cf6f848b20af8").');
  }

  async viewSegmentSize(input: ViewSegmentSizeInput): Promise<SegmentSize> {
    validateProject(input.project);
    const segmentationId = validateSegmentationId(input.segmentationId);

    const config = requireApiConfig(this.apiConfig, 'viewSegmentSize');
    const path = buildDataPath(config, '/analyses/segmentation');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        analysis_id: segmentationId,
        format: 'table_json',
      },
    });

    const data = response as { header?: string[]; rows?: unknown[][]; success?: boolean };
    if (!data.success || !Array.isArray(data.rows)) {
      throw new BloomreachBuddyError('API_ERROR', 'viewSegmentSize: unexpected API response format.');
    }

    const hashIndex = Array.isArray(data.header) ? data.header.indexOf('#') : -1;
    const countIndex = hashIndex >= 0 ? hashIndex : (data.header?.length ?? 1) - 1;

    let totalCustomers = 0;
    for (const row of data.rows) {
      const val = row[countIndex];
      if (typeof val === 'number') {
        totalCustomers += val;
      }
    }

    return {
      segmentationId,
      customerCount: totalCustomers,
      computedAt: new Date().toISOString(),
    };
  }

  async viewSegmentCustomers(input: ViewSegmentCustomersInput): Promise<SegmentCustomerList> {
    validateProject(input.project);
    const segmentationId = validateSegmentationId(input.segmentationId);
    const limit = validateCustomerListLimit(input.limit);
    const offset = validateCustomerListOffset(input.offset);

    const config = requireApiConfig(this.apiConfig, 'viewSegmentCustomers');
    const path = buildDataPath(config, '/customers/export');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        filter: {
          type: 'segment',
          segmentation_id: segmentationId,
          segment_index: 0,
        },
        attributes: { type: 'properties_and_ids' },
        format: 'table_json',
      },
    });

    const rows = Array.isArray(response)
      ? response
      : response && typeof response === 'object' && Array.isArray((response as { data?: unknown[] }).data)
        ? ((response as { data: unknown[] }).data as Array<Record<string, unknown>>)
        : [];
    const effectiveOffset = offset ?? 0;
    const effectiveLimit = limit ?? 20;
    const sliced = rows.slice(effectiveOffset, effectiveOffset + effectiveLimit);

    const customers: SegmentCustomer[] = sliced.map((row: Record<string, unknown>) => {
      const customerId = String(row.registered ?? row.cookie ?? row.email_id ?? 'unknown');
      const attributes: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'registered' && key !== 'cookie' && key !== 'email_id') {
          attributes[key] = value;
        }
      }
      return { customerId, attributes };
    });

    return {
      segmentationId,
      customers,
      total: rows.length,
      limit: effectiveLimit,
      offset: effectiveOffset,
    };
  }

  prepareCreateSegmentation(input: CreateSegmentationInput): PreparedSegmentationAction {
    const project = validateProject(input.project);
    const name = validateSegmentationName(input.name);
    const conditions = validateSegmentConditions(input.conditions);
    const logicalOperator =
      input.logicalOperator !== undefined ? validateLogicalOperator(input.logicalOperator) : 'and';
    const dateRange = validateDateRange(input.dateRange);

    const preview = {
      action: CREATE_SEGMENTATION_ACTION_TYPE,
      project,
      name,
      conditions,
      logicalOperator,
      dateRange,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCloneSegmentation(input: CloneSegmentationInput): PreparedSegmentationAction {
    const project = validateProject(input.project);
    const segmentationId = validateSegmentationId(input.segmentationId);
    const newName =
      input.newName !== undefined ? validateSegmentationName(input.newName) : undefined;

    const preview = {
      action: CLONE_SEGMENTATION_ACTION_TYPE,
      project,
      segmentationId,
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

  prepareArchiveSegmentation(input: ArchiveSegmentationInput): PreparedSegmentationAction {
    const project = validateProject(input.project);
    const segmentationId = validateSegmentationId(input.segmentationId);

    const preview = {
      action: ARCHIVE_SEGMENTATION_ACTION_TYPE,
      project,
      segmentationId,
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
