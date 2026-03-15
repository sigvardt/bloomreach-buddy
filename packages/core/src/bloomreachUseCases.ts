import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const DEPLOY_USE_CASE_ACTION_TYPE = 'use_cases.deploy';
export const FAVORITE_USE_CASE_ACTION_TYPE = 'use_cases.favorite';
export const UNFAVORITE_USE_CASE_ACTION_TYPE = 'use_cases.unfavorite';

export const USE_CASE_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const USE_CASE_DEPLOY_RATE_LIMIT = 5;
export const USE_CASE_FAVORITE_RATE_LIMIT = 20;

export const USE_CASE_GOAL_CATEGORIES = [
  'awareness',
  'acquisition',
  'retention',
  'optimization',
] as const;
export type UseCaseGoalCategory = (typeof USE_CASE_GOAL_CATEGORIES)[number];

export const USE_CASE_TAGS = ['new', 'essentials', 'popular'] as const;
export type UseCaseTag = (typeof USE_CASE_TAGS)[number];

export interface BloomreachUseCase {
  id: string;
  name: string;
  description: string;
  goalCategory: UseCaseGoalCategory;
  tags: UseCaseTag[];
  readinessStatus?: string;
  url: string;
}

export interface UseCaseDetails extends BloomreachUseCase {
  requiredIntegrations: string[];
  channelsUsed: string[];
  longDescription?: string;
  previewImageUrl?: string;
}

export interface ProjectUseCase extends BloomreachUseCase {
  deployedAt?: string;
  status?: string;
}

export interface ListUseCasesInput {
  project: string;
  category?: string;
  tag?: string;
}

export interface SearchUseCasesInput {
  project: string;
  query: string;
  category?: string;
  tag?: string;
}

export interface ViewUseCaseInput {
  project: string;
  useCaseId: string;
}

export interface ListProjectUseCasesInput {
  project: string;
}

export interface DeployUseCaseInput {
  project: string;
  useCaseId: string;
  operatorNote?: string;
}

export interface FavoriteUseCaseInput {
  project: string;
  useCaseId: string;
  operatorNote?: string;
}

export interface UnfavoriteUseCaseInput {
  project: string;
  useCaseId: string;
  operatorNote?: string;
}

export interface PreparedUseCaseAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export function validateUseCaseId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Use case ID must not be empty.');
  }
  return trimmed;
}

export function validateUseCaseSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Search query must not be empty.');
  }
  return trimmed;
}

export function validateGoalCategory(category: string): UseCaseGoalCategory {
  if (!USE_CASE_GOAL_CATEGORIES.includes(category as UseCaseGoalCategory)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `category must be one of: ${USE_CASE_GOAL_CATEGORIES.join(', ')} (got "${category}").`);
  }
  return category as UseCaseGoalCategory;
}

export function validateUseCaseTag(tag: string): UseCaseTag {
  if (!USE_CASE_TAGS.includes(tag as UseCaseTag)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `tag must be one of: ${USE_CASE_TAGS.join(', ')} (got "${tag}").`);
  }
  return tag as UseCaseTag;
}

export function buildUseCasesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/use-case-center/use-case-center`;
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

void requireApiConfig;

export interface UseCaseActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class DeployUseCaseExecutor implements UseCaseActionExecutor {
  readonly actionType = DEPLOY_USE_CASE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeployUseCaseExecutor: not yet implemented. ' +
      'Use case deployment is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class FavoriteUseCaseExecutor implements UseCaseActionExecutor {
  readonly actionType = FAVORITE_USE_CASE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'FavoriteUseCaseExecutor: not yet implemented. ' +
      'Use case favoriting is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UnfavoriteUseCaseExecutor implements UseCaseActionExecutor {
  readonly actionType = UNFAVORITE_USE_CASE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UnfavoriteUseCaseExecutor: not yet implemented. ' +
      'Use case unfavoriting is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createUseCaseActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, UseCaseActionExecutor> {
  return {
    [DEPLOY_USE_CASE_ACTION_TYPE]: new DeployUseCaseExecutor(apiConfig),
    [FAVORITE_USE_CASE_ACTION_TYPE]: new FavoriteUseCaseExecutor(apiConfig),
    [UNFAVORITE_USE_CASE_ACTION_TYPE]: new UnfavoriteUseCaseExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement use cases - the template system for pre-built
 * marketing automation strategies.
 *
 * Read methods return data directly. Mutation methods follow the two-phase
 * commit pattern (prepare + confirm). Browser-dependent methods throw until
 * Playwright infrastructure is available.
 */
export class BloomreachUseCasesService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildUseCasesUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get useCasesUrl(): string {
    return this.baseUrl;
  }

  async listUseCases(input?: ListUseCasesInput): Promise<BloomreachUseCase[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.category !== undefined) {
        validateGoalCategory(input.category);
      }
      if (input.tag !== undefined) {
        validateUseCaseTag(input.tag);
      }
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listUseCases: the Bloomreach API does not provide a use case listing endpoint. ' +
      'Use case data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Use Case Center in your project).');
  }

  async searchUseCases(input: SearchUseCasesInput): Promise<BloomreachUseCase[]> {
    validateProject(input.project);
    validateUseCaseSearchQuery(input.query);
    if (input.category !== undefined) {
      validateGoalCategory(input.category);
    }
    if (input.tag !== undefined) {
      validateUseCaseTag(input.tag);
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'searchUseCases: the Bloomreach API does not provide a use case search endpoint. ' +
      'Use case search is only available through the Bloomreach Engagement UI.');
  }

  async viewUseCase(input: ViewUseCaseInput): Promise<UseCaseDetails> {
    validateProject(input.project);
    validateUseCaseId(input.useCaseId);

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewUseCase: the Bloomreach API does not provide a use case detail endpoint. ' +
      'Use case details are only available through the Bloomreach Engagement UI.');
  }

  async listProjectUseCases(
    input?: ListProjectUseCasesInput,
  ): Promise<ProjectUseCase[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listProjectUseCases: the Bloomreach API does not provide a project use case listing endpoint. ' +
      'Project use case data is only available through the Bloomreach Engagement UI.');
  }

  prepareDeployUseCase(input: DeployUseCaseInput): PreparedUseCaseAction {
    const project = validateProject(input.project);
    const useCaseId = validateUseCaseId(input.useCaseId);

    const preview = {
      action: DEPLOY_USE_CASE_ACTION_TYPE,
      project,
      useCaseId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareFavoriteUseCase(input: FavoriteUseCaseInput): PreparedUseCaseAction {
    const project = validateProject(input.project);
    const useCaseId = validateUseCaseId(input.useCaseId);

    const preview = {
      action: FAVORITE_USE_CASE_ACTION_TYPE,
      project,
      useCaseId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUnfavoriteUseCase(input: UnfavoriteUseCaseInput): PreparedUseCaseAction {
    const project = validateProject(input.project);
    const useCaseId = validateUseCaseId(input.useCaseId);

    const preview = {
      action: UNFAVORITE_USE_CASE_ACTION_TYPE,
      project,
      useCaseId,
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
