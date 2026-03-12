import { validateProject } from './bloomreachDashboards.js';

export const CREATE_WEBLAYER_ACTION_TYPE = 'weblayers.create_weblayer';
export const START_WEBLAYER_ACTION_TYPE = 'weblayers.start_weblayer';
export const STOP_WEBLAYER_ACTION_TYPE = 'weblayers.stop_weblayer';
export const CLONE_WEBLAYER_ACTION_TYPE = 'weblayers.clone_weblayer';
export const ARCHIVE_WEBLAYER_ACTION_TYPE = 'weblayers.archive_weblayer';

export const WEBLAYER_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const WEBLAYER_CREATE_RATE_LIMIT = 10;
export const WEBLAYER_MODIFY_RATE_LIMIT = 20;

export const WEBLAYER_STATUSES = ['active', 'inactive', 'draft', 'archived'] as const;
export type WeblayerStatus = (typeof WEBLAYER_STATUSES)[number];

export const WEBLAYER_DISPLAY_TYPES = ['overlay', 'banner', 'popup', 'slide_in'] as const;
export type WeblayerDisplayType = (typeof WEBLAYER_DISPLAY_TYPES)[number];

export interface WeblayerDisplayConditions {
  audience?: string;
  pageUrlFilter?: string;
  /** Delay in milliseconds before showing the weblayer. */
  delayMs?: number;
  /** Show after scrolling this percentage of the page (0-100). */
  scrollPercentage?: number;
  /** Maximum number of times to show per visitor. */
  frequencyCap?: number;
}

export interface WeblayerABTestConfig {
  enabled: boolean;
  variants: number;
  splitPercentage?: number;
  winnerCriteria?: string;
}

export interface BloomreachWeblayer {
  id: string;
  name: string;
  status: WeblayerStatus;
  displayType?: WeblayerDisplayType;
  displayConditions?: WeblayerDisplayConditions;
  abTest?: WeblayerABTestConfig;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface WeblayerPerformance {
  weblayerId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  revenue: number;
}

export interface ListWeblayersInput {
  project: string;
  status?: string;
}

export interface ViewWeblayerPerformanceInput {
  project: string;
  weblayerId: string;
}

export interface CreateWeblayerInput {
  project: string;
  name: string;
  displayType?: string;
  templateId?: string;
  displayConditions?: WeblayerDisplayConditions;
  abTest?: WeblayerABTestConfig;
  operatorNote?: string;
}

export interface StartWeblayerInput {
  project: string;
  weblayerId: string;
  operatorNote?: string;
}

export interface StopWeblayerInput {
  project: string;
  weblayerId: string;
  operatorNote?: string;
}

export interface CloneWeblayerInput {
  project: string;
  weblayerId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveWeblayerInput {
  project: string;
  weblayerId: string;
  operatorNote?: string;
}

export interface PreparedWeblayerAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_WEBLAYER_NAME_LENGTH = 200;
const MIN_WEBLAYER_NAME_LENGTH = 1;
const MIN_AB_TEST_VARIANTS = 2;
const MAX_AB_TEST_VARIANTS = 10;

export function validateWeblayerName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_WEBLAYER_NAME_LENGTH) {
    throw new Error('Weblayer name must not be empty.');
  }
  if (trimmed.length > MAX_WEBLAYER_NAME_LENGTH) {
    throw new Error(
      `Weblayer name must not exceed ${MAX_WEBLAYER_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateWeblayerStatus(status: string): WeblayerStatus {
  if (!WEBLAYER_STATUSES.includes(status as WeblayerStatus)) {
    throw new Error(
      `status must be one of: ${WEBLAYER_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as WeblayerStatus;
}

export function validateWeblayerId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Weblayer ID must not be empty.');
  }
  return trimmed;
}

export function validateWeblayerDisplayType(displayType: string): WeblayerDisplayType {
  if (!WEBLAYER_DISPLAY_TYPES.includes(displayType as WeblayerDisplayType)) {
    throw new Error(
      `displayType must be one of: ${WEBLAYER_DISPLAY_TYPES.join(', ')} (got "${displayType}").`,
    );
  }
  return displayType as WeblayerDisplayType;
}

export function validateWeblayerABTestConfig(config: WeblayerABTestConfig): WeblayerABTestConfig {
  if (
    !Number.isInteger(config.variants) ||
    config.variants < MIN_AB_TEST_VARIANTS ||
    config.variants > MAX_AB_TEST_VARIANTS
  ) {
    throw new Error(
      `A/B test variants must be an integer between ${MIN_AB_TEST_VARIANTS} and ${MAX_AB_TEST_VARIANTS} (got ${config.variants}).`,
    );
  }
  if (config.splitPercentage !== undefined) {
    if (config.splitPercentage < 0 || config.splitPercentage > 100) {
      throw new Error(
        `A/B test split percentage must be between 0 and 100 (got ${config.splitPercentage}).`,
      );
    }
  }
  return config;
}

export function validateDisplayConditions(
  conditions: WeblayerDisplayConditions,
): WeblayerDisplayConditions {
  if (conditions.delayMs !== undefined && conditions.delayMs < 0) {
    throw new Error(`delayMs must be greater than or equal to 0 (got ${conditions.delayMs}).`);
  }
  if (conditions.scrollPercentage !== undefined) {
    if (conditions.scrollPercentage < 0 || conditions.scrollPercentage > 100) {
      throw new Error(
        `scrollPercentage must be between 0 and 100 (got ${conditions.scrollPercentage}).`,
      );
    }
  }
  if (conditions.frequencyCap !== undefined && conditions.frequencyCap < 1) {
    throw new Error(
      `frequencyCap must be greater than or equal to 1 (got ${conditions.frequencyCap}).`,
    );
  }
  return conditions;
}

export function buildWeblayersUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/banners`;
}

export interface WeblayerActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateWeblayerExecutor implements WeblayerActionExecutor {
  readonly actionType = CREATE_WEBLAYER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateWeblayerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StartWeblayerExecutor implements WeblayerActionExecutor {
  readonly actionType = START_WEBLAYER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StartWeblayerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StopWeblayerExecutor implements WeblayerActionExecutor {
  readonly actionType = STOP_WEBLAYER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StopWeblayerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneWeblayerExecutor implements WeblayerActionExecutor {
  readonly actionType = CLONE_WEBLAYER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneWeblayerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveWeblayerExecutor implements WeblayerActionExecutor {
  readonly actionType = ARCHIVE_WEBLAYER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveWeblayerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createWeblayerActionExecutors(): Record<string, WeblayerActionExecutor> {
  return {
    [CREATE_WEBLAYER_ACTION_TYPE]: new CreateWeblayerExecutor(),
    [START_WEBLAYER_ACTION_TYPE]: new StartWeblayerExecutor(),
    [STOP_WEBLAYER_ACTION_TYPE]: new StopWeblayerExecutor(),
    [CLONE_WEBLAYER_ACTION_TYPE]: new CloneWeblayerExecutor(),
    [ARCHIVE_WEBLAYER_ACTION_TYPE]: new ArchiveWeblayerExecutor(),
  };
}

export class BloomreachWeblayersService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildWeblayersUrl(validateProject(project));
  }

  get weblayersUrl(): string {
    return this.baseUrl;
  }

  async listWeblayers(input?: ListWeblayersInput): Promise<BloomreachWeblayer[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateWeblayerStatus(input.status);
      }
    }

    throw new Error(
      'listWeblayers: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewWeblayerPerformance(
    input: ViewWeblayerPerformanceInput,
  ): Promise<WeblayerPerformance> {
    validateProject(input.project);
    validateWeblayerId(input.weblayerId);

    throw new Error(
      'viewWeblayerPerformance: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateWeblayer(input: CreateWeblayerInput): PreparedWeblayerAction {
    const project = validateProject(input.project);
    const name = validateWeblayerName(input.name);
    const displayType =
      input.displayType !== undefined
        ? validateWeblayerDisplayType(input.displayType)
        : undefined;
    const displayConditions =
      input.displayConditions !== undefined
        ? validateDisplayConditions(input.displayConditions)
        : undefined;
    const abTest =
      input.abTest !== undefined ? validateWeblayerABTestConfig(input.abTest) : undefined;

    const preview = {
      action: CREATE_WEBLAYER_ACTION_TYPE,
      project,
      name,
      displayType,
      templateId: input.templateId,
      displayConditions,
      abTest,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStartWeblayer(input: StartWeblayerInput): PreparedWeblayerAction {
    const project = validateProject(input.project);
    const weblayerId = validateWeblayerId(input.weblayerId);

    const preview = {
      action: START_WEBLAYER_ACTION_TYPE,
      project,
      weblayerId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStopWeblayer(input: StopWeblayerInput): PreparedWeblayerAction {
    const project = validateProject(input.project);
    const weblayerId = validateWeblayerId(input.weblayerId);

    const preview = {
      action: STOP_WEBLAYER_ACTION_TYPE,
      project,
      weblayerId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCloneWeblayer(input: CloneWeblayerInput): PreparedWeblayerAction {
    const project = validateProject(input.project);
    const weblayerId = validateWeblayerId(input.weblayerId);
    const newName =
      input.newName !== undefined ? validateWeblayerName(input.newName) : undefined;

    const preview = {
      action: CLONE_WEBLAYER_ACTION_TYPE,
      project,
      weblayerId,
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

  prepareArchiveWeblayer(input: ArchiveWeblayerInput): PreparedWeblayerAction {
    const project = validateProject(input.project);
    const weblayerId = validateWeblayerId(input.weblayerId);

    const preview = {
      action: ARCHIVE_WEBLAYER_ACTION_TYPE,
      project,
      weblayerId,
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
