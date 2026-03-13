import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';

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
  const trimmed = name.trim();
  if (trimmed.length < MIN_SEGMENTATION_NAME_LENGTH) {
    throw new Error('Segmentation name must not be empty.');
  }
  if (trimmed.length > MAX_SEGMENTATION_NAME_LENGTH) {
    throw new Error(
      `Segmentation name must not exceed ${MAX_SEGMENTATION_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateSegmentationId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Segmentation ID must not be empty.');
  }
  return trimmed;
}

export function validateSegmentConditionType(type: string): SegmentConditionType {
  if (!(SEGMENT_CONDITION_TYPES as readonly string[]).includes(type)) {
    throw new Error(
      `Invalid condition type "${type}". Must be one of: ${SEGMENT_CONDITION_TYPES.join(', ')}.`,
    );
  }
  return type as SegmentConditionType;
}

export function validateSegmentConditionOperator(operator: string): SegmentConditionOperator {
  if (!(SEGMENT_CONDITION_OPERATORS as readonly string[]).includes(operator)) {
    throw new Error(
      `Invalid condition operator "${operator}". Must be one of: ${SEGMENT_CONDITION_OPERATORS.join(', ')}.`,
    );
  }
  return operator as SegmentConditionOperator;
}

export function validateLogicalOperator(operator: string): SegmentLogicalOperator {
  if (!(SEGMENT_LOGICAL_OPERATORS as readonly string[]).includes(operator)) {
    throw new Error(
      `Invalid logical operator "${operator}". Must be one of: ${SEGMENT_LOGICAL_OPERATORS.join(', ')}.`,
    );
  }
  return operator as SegmentLogicalOperator;
}

export function validateSegmentConditions(conditions: SegmentCondition[]): SegmentCondition[] {
  if (conditions.length === 0) {
    throw new Error('conditions must contain at least one segment condition.');
  }

  return conditions.map((condition, index) => {
    validateSegmentConditionType(condition.type);
    validateSegmentConditionOperator(condition.operator);

    const attribute = condition.attribute.trim();
    if (attribute.length === 0) {
      throw new Error(`conditions[${index}].attribute must not be empty.`);
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
    throw new Error(`limit must be a positive integer when provided (got ${limit}).`);
  }

  return limit;
}

export function validateCustomerListOffset(offset: number | undefined): number | undefined {
  if (offset === undefined) {
    return undefined;
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`offset must be a non-negative integer when provided (got ${offset}).`);
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

class CreateSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = CREATE_SEGMENTATION_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateSegmentationExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = CLONE_SEGMENTATION_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneSegmentationExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveSegmentationExecutor implements SegmentationActionExecutor {
  readonly actionType = ARCHIVE_SEGMENTATION_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveSegmentationExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createSegmentationActionExecutors(): Record<string, SegmentationActionExecutor> {
  return {
    [CREATE_SEGMENTATION_ACTION_TYPE]: new CreateSegmentationExecutor(),
    [CLONE_SEGMENTATION_ACTION_TYPE]: new CloneSegmentationExecutor(),
    [ARCHIVE_SEGMENTATION_ACTION_TYPE]: new ArchiveSegmentationExecutor(),
  };
}

export class BloomreachSegmentationsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildSegmentationsUrl(validateProject(project));
  }

  get segmentationsUrl(): string {
    return this.baseUrl;
  }

  async listSegmentations(input?: ListSegmentationsInput): Promise<BloomreachSegmentation[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listSegmentations: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSegmentSize(input: ViewSegmentSizeInput): Promise<SegmentSize> {
    validateProject(input.project);
    validateSegmentationId(input.segmentationId);

    throw new Error(
      'viewSegmentSize: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSegmentCustomers(input: ViewSegmentCustomersInput): Promise<SegmentCustomerList> {
    validateProject(input.project);
    validateSegmentationId(input.segmentationId);
    validateCustomerListLimit(input.limit);
    validateCustomerListOffset(input.offset);

    throw new Error(
      'viewSegmentCustomers: not yet implemented. Requires browser automation infrastructure.',
    );
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
