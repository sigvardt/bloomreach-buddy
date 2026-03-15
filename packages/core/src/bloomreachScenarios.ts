import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_SCENARIO_ACTION_TYPE = 'scenarios.create_scenario';
export const START_SCENARIO_ACTION_TYPE = 'scenarios.start_scenario';
export const STOP_SCENARIO_ACTION_TYPE = 'scenarios.stop_scenario';
export const CLONE_SCENARIO_ACTION_TYPE = 'scenarios.clone_scenario';
export const ARCHIVE_SCENARIO_ACTION_TYPE = 'scenarios.archive_scenario';

export const SCENARIO_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const SCENARIO_CREATE_RATE_LIMIT = 10;
export const SCENARIO_MODIFY_RATE_LIMIT = 20;

export const SCENARIO_STATUSES = ['active', 'inactive', 'finishing', 'draft'] as const;
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

export interface BloomreachScenario {
  id: string;
  name: string;
  status: ScenarioStatus;
  tags: string[];
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface ScenarioNode {
  id: string;
  type: string;
  name: string;
}

export interface ScenarioPerformance {
  entries: number;
  conversions: number;
  revenue: number;
}

export interface ScenarioDetails extends BloomreachScenario {
  nodes: ScenarioNode[];
  performance?: ScenarioPerformance;
  triggerDescription?: string;
}

export interface ListScenariosInput {
  project: string;
  status?: string;
  tags?: string[];
  owner?: string;
}

export interface ViewScenarioInput {
  project: string;
  scenarioId: string;
}

export interface CreateScenarioInput {
  project: string;
  name: string;
  templateId?: string;
  tags?: string[];
  operatorNote?: string;
}

export interface StartScenarioInput {
  project: string;
  scenarioId: string;
  operatorNote?: string;
}

export interface StopScenarioInput {
  project: string;
  scenarioId: string;
  operatorNote?: string;
}

export interface CloneScenarioInput {
  project: string;
  scenarioId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveScenarioInput {
  project: string;
  scenarioId: string;
  operatorNote?: string;
}

export interface PreparedScenarioAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_SCENARIO_NAME_LENGTH = 200;
const MIN_SCENARIO_NAME_LENGTH = 1;

export function validateScenarioName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_SCENARIO_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Scenario name must not be empty.');
  }
  if (trimmed.length > MAX_SCENARIO_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Scenario name must not exceed ${MAX_SCENARIO_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateScenarioStatus(status: string): ScenarioStatus {
  if (!SCENARIO_STATUSES.includes(status as ScenarioStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `status must be one of: ${SCENARIO_STATUSES.join(', ')} (got "${status}").`);
  }
  return status as ScenarioStatus;
}

export function validateScenarioId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Scenario ID must not be empty.');
  }
  return trimmed;
}

export function buildScenariosUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/campaign-designs`;
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

export interface ScenarioActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = CREATE_SCENARIO_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateScenarioExecutor: not yet implemented. ' +
      'Scenario creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class StartScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = START_SCENARIO_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'StartScenarioExecutor: not yet implemented. ' +
      'Starting scenarios is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class StopScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = STOP_SCENARIO_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'StopScenarioExecutor: not yet implemented. ' +
      'Stopping scenarios is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CloneScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = CLONE_SCENARIO_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CloneScenarioExecutor: not yet implemented. ' +
      'Scenario cloning is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ArchiveScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = ARCHIVE_SCENARIO_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveScenarioExecutor: not yet implemented. ' +
      'Scenario archiving is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createScenarioActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, ScenarioActionExecutor> {
  return {
    [CREATE_SCENARIO_ACTION_TYPE]: new CreateScenarioExecutor(apiConfig),
    [START_SCENARIO_ACTION_TYPE]: new StartScenarioExecutor(apiConfig),
    [STOP_SCENARIO_ACTION_TYPE]: new StopScenarioExecutor(apiConfig),
    [CLONE_SCENARIO_ACTION_TYPE]: new CloneScenarioExecutor(apiConfig),
    [ARCHIVE_SCENARIO_ACTION_TYPE]: new ArchiveScenarioExecutor(apiConfig),
  };
}

export class BloomreachScenariosService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildScenariosUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get scenariosUrl(): string {
    return this.baseUrl;
  }

  async listScenarios(input?: ListScenariosInput): Promise<BloomreachScenario[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateScenarioStatus(input.status);
      }
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listScenarios: the Bloomreach API does not provide an endpoint for scenarios. ' +
      'Scenario data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Campaigns > Scenarios in your project).');
  }

  async viewScenario(input: ViewScenarioInput): Promise<ScenarioDetails> {
    void this.apiConfig;
    validateProject(input.project);
    validateScenarioId(input.scenarioId);

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewScenario: the Bloomreach API does not provide an endpoint for scenario details. ' +
      'Scenario details must be viewed in the Bloomreach Engagement UI ' +
      '(navigate to Campaigns > Scenarios and open the scenario).');
  }

  prepareCreateScenario(input: CreateScenarioInput): PreparedScenarioAction {
    const project = validateProject(input.project);
    const name = validateScenarioName(input.name);

    const preview = {
      action: CREATE_SCENARIO_ACTION_TYPE,
      project,
      name,
      templateId: input.templateId,
      tags: input.tags,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStartScenario(input: StartScenarioInput): PreparedScenarioAction {
    const project = validateProject(input.project);
    const scenarioId = validateScenarioId(input.scenarioId);

    const preview = {
      action: START_SCENARIO_ACTION_TYPE,
      project,
      scenarioId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareStopScenario(input: StopScenarioInput): PreparedScenarioAction {
    const project = validateProject(input.project);
    const scenarioId = validateScenarioId(input.scenarioId);

    const preview = {
      action: STOP_SCENARIO_ACTION_TYPE,
      project,
      scenarioId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCloneScenario(input: CloneScenarioInput): PreparedScenarioAction {
    const project = validateProject(input.project);
    const scenarioId = validateScenarioId(input.scenarioId);
    const newName = input.newName !== undefined ? validateScenarioName(input.newName) : undefined;

    const preview = {
      action: CLONE_SCENARIO_ACTION_TYPE,
      project,
      scenarioId,
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

  prepareArchiveScenario(input: ArchiveScenarioInput): PreparedScenarioAction {
    const project = validateProject(input.project);
    const scenarioId = validateScenarioId(input.scenarioId);

    const preview = {
      action: ARCHIVE_SCENARIO_ACTION_TYPE,
      project,
      scenarioId,
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
