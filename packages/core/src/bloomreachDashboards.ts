export const CREATE_DASHBOARD_ACTION_TYPE = 'dashboards.create_dashboard';
export const SET_HOME_DASHBOARD_ACTION_TYPE = 'dashboards.set_home_dashboard';
export const DELETE_DASHBOARD_ACTION_TYPE = 'dashboards.delete_dashboard';

/** Rate limit window for dashboard operations (1 hour in ms). */
export const DASHBOARD_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const DASHBOARD_CREATE_RATE_LIMIT = 10;
export const DASHBOARD_MODIFY_RATE_LIMIT = 20;

export interface BloomreachDashboard {
  id: string;
  name: string;
  isHome: boolean;
  analysisCount: number;
  /** ISO-8601 creation timestamp (if available). */
  createdAt?: string;
  /** Full URL path to the dashboard. */
  url: string;
}

export interface DashboardAnalysis {
  id: string;
  name: string;
}

export interface DashboardLayoutConfig {
  /** Number of columns in the dashboard grid (default: 2). */
  columns?: number;
}

export interface ListDashboardsInput {
  project: string;
}

export interface CreateDashboardInput {
  project: string;
  name: string;
  analyses?: DashboardAnalysis[];
  layout?: DashboardLayoutConfig;
  operatorNote?: string;
}

export interface SetHomeDashboardInput {
  project: string;
  dashboardId: string;
  operatorNote?: string;
}

export interface DeleteDashboardInput {
  project: string;
  dashboardId: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedDashboardAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_DASHBOARD_NAME_LENGTH = 200;
const MIN_DASHBOARD_NAME_LENGTH = 1;
const MAX_LAYOUT_COLUMNS = 6;
const MIN_LAYOUT_COLUMNS = 1;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateDashboardName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_DASHBOARD_NAME_LENGTH) {
    throw new Error('Dashboard name must not be empty.');
  }
  if (trimmed.length > MAX_DASHBOARD_NAME_LENGTH) {
    throw new Error(
      `Dashboard name must not exceed ${MAX_DASHBOARD_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If project is empty. */
export function validateProject(project: string): string {
  const trimmed = project.trim();
  if (trimmed.length === 0) {
    throw new Error('Project identifier must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If column count is not an integer between 1 and 6. */
export function validateLayoutConfig(layout: DashboardLayoutConfig): DashboardLayoutConfig {
  if (layout.columns !== undefined) {
    if (
      !Number.isInteger(layout.columns) ||
      layout.columns < MIN_LAYOUT_COLUMNS ||
      layout.columns > MAX_LAYOUT_COLUMNS
    ) {
      throw new Error(
        `Layout columns must be an integer between ${MIN_LAYOUT_COLUMNS} and ${MAX_LAYOUT_COLUMNS} (got ${layout.columns}).`,
      );
    }
  }
  return layout;
}

export function buildDashboardsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/dashboards`;
}

/**
 * Executor for a confirmed dashboard mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface DashboardActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateDashboardExecutor implements DashboardActionExecutor {
  readonly actionType = CREATE_DASHBOARD_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateDashboardExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class SetHomeDashboardExecutor implements DashboardActionExecutor {
  readonly actionType = SET_HOME_DASHBOARD_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'SetHomeDashboardExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteDashboardExecutor implements DashboardActionExecutor {
  readonly actionType = DELETE_DASHBOARD_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteDashboardExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createDashboardActionExecutors(): Record<string, DashboardActionExecutor> {
  return {
    [CREATE_DASHBOARD_ACTION_TYPE]: new CreateDashboardExecutor(),
    [SET_HOME_DASHBOARD_ACTION_TYPE]: new SetHomeDashboardExecutor(),
    [DELETE_DASHBOARD_ACTION_TYPE]: new DeleteDashboardExecutor(),
  };
}

/**
 * Manages Bloomreach Engagement dashboards. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachDashboardsService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildDashboardsUrl(validateProject(project));
  }

  get dashboardsUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listDashboards(_input?: ListDashboardsInput): Promise<BloomreachDashboard[]> {
    throw new Error(
      'listDashboards: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateDashboard(input: CreateDashboardInput): PreparedDashboardAction {
    const project = validateProject(input.project);
    const name = validateDashboardName(input.name);
    if (input.layout) {
      validateLayoutConfig(input.layout);
    }

    // TODO: Wire into TwoPhaseCommitService when available
    const preview = {
      action: CREATE_DASHBOARD_ACTION_TYPE,
      project,
      name,
      analysisCount: input.analyses?.length ?? 0,
      layout: input.layout ?? { columns: 2 },
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareSetHomeDashboard(input: SetHomeDashboardInput): PreparedDashboardAction {
    const project = validateProject(input.project);
    const dashboardId = input.dashboardId.trim();
    if (dashboardId.length === 0) {
      throw new Error('Dashboard ID must not be empty.');
    }

    const preview = {
      action: SET_HOME_DASHBOARD_ACTION_TYPE,
      project,
      dashboardId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  /** @throws {Error} If input validation fails. */
  prepareDeleteDashboard(input: DeleteDashboardInput): PreparedDashboardAction {
    const project = validateProject(input.project);
    const dashboardId = input.dashboardId.trim();
    if (dashboardId.length === 0) {
      throw new Error('Dashboard ID must not be empty.');
    }

    const preview = {
      action: DELETE_DASHBOARD_ACTION_TYPE,
      project,
      dashboardId,
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
