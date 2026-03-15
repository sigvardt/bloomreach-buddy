import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';

export const CREATE_RECOMMENDATION_MODEL_ACTION_TYPE = 'recommendations.create_model';
export const CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE = 'recommendations.configure_model';
export const DELETE_RECOMMENDATION_MODEL_ACTION_TYPE = 'recommendations.delete_model';

export const RECOMMENDATION_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const RECOMMENDATION_CREATE_RATE_LIMIT = 10;
export const RECOMMENDATION_MODIFY_RATE_LIMIT = 20;

export const RECOMMENDATION_MODEL_STATUSES = ['active', 'inactive', 'training', 'draft'] as const;
export type RecommendationModelStatus = (typeof RECOMMENDATION_MODEL_STATUSES)[number];

export const RECOMMENDATION_ALGORITHM_TYPES = [
  'collaborative_filtering',
  'content_based',
  'hybrid',
  'trending',
  'personalized',
] as const;
export type RecommendationAlgorithmType = (typeof RECOMMENDATION_ALGORITHM_TYPES)[number];

export interface RecommendationFilterRule {
  field: string;
  operator: string;
  value: string;
}

export interface RecommendationBoostRule {
  field: string;
  weight: number;
}

export interface RecommendationModelConfig {
  algorithm: RecommendationAlgorithmType;
  catalogId?: string;
  filters?: RecommendationFilterRule[];
  boostRules?: RecommendationBoostRule[];
  /** Maximum number of items to recommend. */
  maxItems?: number;
}

export interface BloomreachRecommendationModel {
  id: string;
  name: string;
  status: RecommendationModelStatus;
  modelType: string;
  algorithm?: RecommendationAlgorithmType;
  catalogId?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface RecommendationModelPerformance {
  modelId: string;
  impressions: number;
  clicks: number;
  clickThroughRate: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  averageOrderValue: number;
}

export interface ListRecommendationModelsInput {
  project: string;
  status?: string;
}

export interface ViewRecommendationModelPerformanceInput {
  project: string;
  modelId: string;
}

export interface CreateRecommendationModelInput {
  project: string;
  name: string;
  modelType: string;
  algorithm?: string;
  catalogId?: string;
  operatorNote?: string;
}

export interface ConfigureRecommendationModelInput {
  project: string;
  modelId: string;
  algorithm?: string;
  catalogId?: string;
  filters?: RecommendationFilterRule[];
  boostRules?: RecommendationBoostRule[];
  maxItems?: number;
  operatorNote?: string;
}

export interface DeleteRecommendationModelInput {
  project: string;
  modelId: string;
  operatorNote?: string;
}

export interface PreparedRecommendationAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_MODEL_NAME_LENGTH = 200;
const MIN_MODEL_NAME_LENGTH = 1;
const MAX_FILTER_RULES = 50;
const MAX_BOOST_RULES = 50;
const MIN_BOOST_WEIGHT = 0;
const MAX_BOOST_WEIGHT = 100;
const MIN_MAX_ITEMS = 1;
const MAX_MAX_ITEMS = 100;

export function validateModelName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_MODEL_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Model name must not be empty.');
  }
  if (trimmed.length > MAX_MODEL_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Model name must not exceed ${MAX_MODEL_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateModelId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Model ID must not be empty.');
  }
  return trimmed;
}

export function validateRecommendationModelStatus(status: string): RecommendationModelStatus {
  if (!RECOMMENDATION_MODEL_STATUSES.includes(status as RecommendationModelStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `status must be one of: ${RECOMMENDATION_MODEL_STATUSES.join(', ')} (got "${status}").`);
  }
  return status as RecommendationModelStatus;
}

export function validateAlgorithmType(algorithm: string): RecommendationAlgorithmType {
  if (!RECOMMENDATION_ALGORITHM_TYPES.includes(algorithm as RecommendationAlgorithmType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `algorithm must be one of: ${RECOMMENDATION_ALGORITHM_TYPES.join(', ')} (got "${algorithm}").`);
  }
  return algorithm as RecommendationAlgorithmType;
}

export function validateFilterRules(
  filters: RecommendationFilterRule[],
): RecommendationFilterRule[] {
  if (filters.length > MAX_FILTER_RULES) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `filters must contain at most ${MAX_FILTER_RULES} rules (got ${filters.length}).`);
  }

  return filters.map((filter, index) => {
    const field = filter.field.trim();
    const operator = filter.operator.trim();
    const value = filter.value.trim();

    if (field.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `filters[${index}].field must not be empty.`);
    }
    if (operator.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `filters[${index}].operator must not be empty.`);
    }
    if (value.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `filters[${index}].value must not be empty.`);
    }

    return {
      field,
      operator,
      value,
    };
  });
}

export function validateBoostRules(
  boostRules: RecommendationBoostRule[],
): RecommendationBoostRule[] {
  if (boostRules.length > MAX_BOOST_RULES) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `boostRules must contain at most ${MAX_BOOST_RULES} rules (got ${boostRules.length}).`);
  }

  return boostRules.map((boostRule, index) => {
    const field = boostRule.field.trim();
    if (field.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `boostRules[${index}].field must not be empty.`);
    }

    if (boostRule.weight < MIN_BOOST_WEIGHT || boostRule.weight > MAX_BOOST_WEIGHT) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `boostRules[${index}].weight must be between ${MIN_BOOST_WEIGHT} and ${MAX_BOOST_WEIGHT} (got ${boostRule.weight}).`);
    }

    return {
      field,
      weight: boostRule.weight,
    };
  });
}

export function validateMaxItems(maxItems: number): number {
  if (!Number.isInteger(maxItems) || maxItems < MIN_MAX_ITEMS || maxItems > MAX_MAX_ITEMS) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `maxItems must be an integer between ${MIN_MAX_ITEMS} and ${MAX_MAX_ITEMS} (got ${maxItems}).`);
  }

  return maxItems;
}

export function buildRecommendationsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/recommendations`;
}

export interface RecommendationActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateRecommendationModelExecutor implements RecommendationActionExecutor {
  readonly actionType = CREATE_RECOMMENDATION_MODEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateRecommendationModelExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class ConfigureRecommendationModelExecutor implements RecommendationActionExecutor {
  readonly actionType = CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ConfigureRecommendationModelExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class DeleteRecommendationModelExecutor implements RecommendationActionExecutor {
  readonly actionType = DELETE_RECOMMENDATION_MODEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteRecommendationModelExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

export function createRecommendationActionExecutors(): Record<
  string,
  RecommendationActionExecutor
> {
  return {
    [CREATE_RECOMMENDATION_MODEL_ACTION_TYPE]: new CreateRecommendationModelExecutor(),
    [CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE]: new ConfigureRecommendationModelExecutor(),
    [DELETE_RECOMMENDATION_MODEL_ACTION_TYPE]: new DeleteRecommendationModelExecutor(),
  };
}

export class BloomreachRecommendationsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildRecommendationsUrl(validateProject(project));
  }

  get recommendationsUrl(): string {
    return this.baseUrl;
  }

  async listRecommendationModels(
    input?: ListRecommendationModelsInput,
  ): Promise<BloomreachRecommendationModel[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateRecommendationModelStatus(input.status);
      }
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listRecommendationModels: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  async viewModelPerformance(
    input: ViewRecommendationModelPerformanceInput,
  ): Promise<RecommendationModelPerformance> {
    validateProject(input.project);
    validateModelId(input.modelId);

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewModelPerformance: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  prepareCreateRecommendationModel(
    input: CreateRecommendationModelInput,
  ): PreparedRecommendationAction {
    const project = validateProject(input.project);
    const name = validateModelName(input.name);
    const modelType = input.modelType.trim();
    if (modelType.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Model type must not be empty.');
    }
    const algorithm =
      input.algorithm !== undefined ? validateAlgorithmType(input.algorithm) : undefined;

    const preview = {
      action: CREATE_RECOMMENDATION_MODEL_ACTION_TYPE,
      project,
      name,
      modelType,
      algorithm,
      catalogId: input.catalogId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureRecommendationModel(
    input: ConfigureRecommendationModelInput,
  ): PreparedRecommendationAction {
    const project = validateProject(input.project);
    const modelId = validateModelId(input.modelId);
    const algorithm =
      input.algorithm !== undefined ? validateAlgorithmType(input.algorithm) : undefined;
    const filters = input.filters !== undefined ? validateFilterRules(input.filters) : undefined;
    const boostRules =
      input.boostRules !== undefined ? validateBoostRules(input.boostRules) : undefined;
    const maxItems = input.maxItems !== undefined ? validateMaxItems(input.maxItems) : undefined;

    const preview = {
      action: CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE,
      project,
      modelId,
      algorithm,
      catalogId: input.catalogId,
      filters,
      boostRules,
      maxItems,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteRecommendationModel(
    input: DeleteRecommendationModelInput,
  ): PreparedRecommendationAction {
    const project = validateProject(input.project);
    const modelId = validateModelId(input.modelId);

    const preview = {
      action: DELETE_RECOMMENDATION_MODEL_ACTION_TYPE,
      project,
      modelId,
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
