import { validateProject } from './bloomreachDashboards.js';

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
    throw new Error('Scenario name must not be empty.');
  }
  if (trimmed.length > MAX_SCENARIO_NAME_LENGTH) {
    throw new Error(
      `Scenario name must not exceed ${MAX_SCENARIO_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateScenarioStatus(status: string): ScenarioStatus {
  if (!SCENARIO_STATUSES.includes(status as ScenarioStatus)) {
    throw new Error(
      `status must be one of: ${SCENARIO_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as ScenarioStatus;
}

export function validateScenarioId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Scenario ID must not be empty.');
  }
  return trimmed;
}

export function buildScenariosUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/campaign-designs`;
}

export interface ScenarioActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = CREATE_SCENARIO_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateScenarioExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StartScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = START_SCENARIO_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StartScenarioExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class StopScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = STOP_SCENARIO_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'StopScenarioExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CloneScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = CLONE_SCENARIO_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CloneScenarioExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ArchiveScenarioExecutor implements ScenarioActionExecutor {
  readonly actionType = ARCHIVE_SCENARIO_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ArchiveScenarioExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createScenarioActionExecutors(): Record<
  string,
  ScenarioActionExecutor
> {
  return {
    [CREATE_SCENARIO_ACTION_TYPE]: new CreateScenarioExecutor(),
    [START_SCENARIO_ACTION_TYPE]: new StartScenarioExecutor(),
    [STOP_SCENARIO_ACTION_TYPE]: new StopScenarioExecutor(),
    [CLONE_SCENARIO_ACTION_TYPE]: new CloneScenarioExecutor(),
    [ARCHIVE_SCENARIO_ACTION_TYPE]: new ArchiveScenarioExecutor(),
  };
}

export class BloomreachScenariosService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildScenariosUrl(validateProject(project));
  }

  get scenariosUrl(): string {
    return this.baseUrl;
  }

  async listScenarios(input?: ListScenariosInput): Promise<BloomreachScenario[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateScenarioStatus(input.status);
      }
    }

    throw new Error(
      'listScenarios: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewScenario(input: ViewScenarioInput): Promise<ScenarioDetails> {
    validateProject(input.project);
    validateScenarioId(input.scenarioId);

    throw new Error(
      'viewScenario: not yet implemented. Requires browser automation infrastructure.',
    );
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
    const newName =
      input.newName !== undefined ? validateScenarioName(input.newName) : undefined;

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
