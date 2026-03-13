import { validateProject } from './bloomreachDashboards.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const CREATE_SSH_TUNNEL_ACTION_TYPE = 'security_settings.create_ssh_tunnel';
export const UPDATE_SSH_TUNNEL_ACTION_TYPE = 'security_settings.update_ssh_tunnel';
export const DELETE_SSH_TUNNEL_ACTION_TYPE = 'security_settings.delete_ssh_tunnel';
export const ENABLE_TWO_STEP_ACTION_TYPE = 'security_settings.enable_two_step';
export const DISABLE_TWO_STEP_ACTION_TYPE = 'security_settings.disable_two_step';
export const UPDATE_TWO_STEP_ACTION_TYPE = 'security_settings.update_two_step';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

export const SECURITY_SETTINGS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const SECURITY_SETTINGS_SSH_TUNNEL_RATE_LIMIT = 10;
export const SECURITY_SETTINGS_TWO_STEP_RATE_LIMIT = 10;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface BloomreachSshTunnel {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status: string;
  databaseType?: string;
  createdAt?: string;
  url: string;
}

export interface BloomreachTwoStepVerificationSettings {
  enabled: boolean;
  enforced?: boolean;
  enforcedAt?: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ListSshTunnelsInput {
  project: string;
}

export interface ViewSshTunnelInput {
  project: string;
  tunnelId: string;
}

export interface CreateSshTunnelInput {
  project: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  hostKey?: string;
  databaseType?: string;
  operatorNote?: string;
}

export interface UpdateSshTunnelInput {
  project: string;
  tunnelId: string;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  hostKey?: string;
  operatorNote?: string;
}

export interface DeleteSshTunnelInput {
  project: string;
  tunnelId: string;
  operatorNote?: string;
}

export interface ViewTwoStepVerificationInput {
  project: string;
}

export interface EnableTwoStepVerificationInput {
  project: string;
  operatorNote?: string;
}

export interface DisableTwoStepVerificationInput {
  project: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

export interface PreparedSecuritySettingsAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_TUNNEL_NAME_LENGTH = 200;
const MAX_HOST_LENGTH = 253;
const MAX_USERNAME_LENGTH = 200;

export function validateTunnelName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Tunnel name must not be empty.');
  }
  if (trimmed.length > MAX_TUNNEL_NAME_LENGTH) {
    throw new Error(
      `Tunnel name must not exceed ${MAX_TUNNEL_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.length === 0) {
    throw new Error('Host must not be empty.');
  }
  if (trimmed.length > MAX_HOST_LENGTH) {
    throw new Error(`Host must not exceed ${MAX_HOST_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validatePort(port: number): number {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Port must be a positive integer.');
  }
  if (port < 1 || port > 65535) {
    throw new Error(`Port must be between 1 and 65535 (got ${port}).`);
  }
  return port;
}

export function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length === 0) {
    throw new Error('Username must not be empty.');
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    throw new Error(
      `Username must not exceed ${MAX_USERNAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateTunnelId(tunnelId: string): string {
  const trimmed = tunnelId.trim();
  if (trimmed.length === 0) {
    throw new Error('Tunnel ID must not be empty.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildSshTunnelsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/ssh-tunnels`;
}

export function buildTwoStepVerificationUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/project-two-step`;
}

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface SecuritySettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = CREATE_SSH_TUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateSshTunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = UPDATE_SSH_TUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateSshTunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = DELETE_SSH_TUNNEL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteSshTunnelExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class EnableTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = ENABLE_TWO_STEP_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'EnableTwoStepExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DisableTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = DISABLE_TWO_STEP_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DisableTwoStepExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = UPDATE_TWO_STEP_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateTwoStepExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createSecuritySettingsActionExecutors(): Record<
  string,
  SecuritySettingsActionExecutor
> {
  return {
    [CREATE_SSH_TUNNEL_ACTION_TYPE]: new CreateSshTunnelExecutor(),
    [UPDATE_SSH_TUNNEL_ACTION_TYPE]: new UpdateSshTunnelExecutor(),
    [DELETE_SSH_TUNNEL_ACTION_TYPE]: new DeleteSshTunnelExecutor(),
    [ENABLE_TWO_STEP_ACTION_TYPE]: new EnableTwoStepExecutor(),
    [DISABLE_TWO_STEP_ACTION_TYPE]: new DisableTwoStepExecutor(),
    [UPDATE_TWO_STEP_ACTION_TYPE]: new UpdateTwoStepExecutor(),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachSecuritySettingsService {
  private readonly sshTunnelsSettingsUrl: string;
  private readonly twoStepVerificationSettingsUrl: string;

  constructor(project: string) {
    const validated = validateProject(project);
    this.sshTunnelsSettingsUrl = buildSshTunnelsUrl(validated);
    this.twoStepVerificationSettingsUrl = buildTwoStepVerificationUrl(validated);
  }

  get sshTunnelsUrl(): string {
    return this.sshTunnelsSettingsUrl;
  }

  get twoStepVerificationUrl(): string {
    return this.twoStepVerificationSettingsUrl;
  }

  async listSshTunnels(_input?: ListSshTunnelsInput): Promise<BloomreachSshTunnel[]> {
    throw new Error(
      'listSshTunnels: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSshTunnel(_input?: ViewSshTunnelInput): Promise<BloomreachSshTunnel> {
    throw new Error(
      'viewSshTunnel: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewTwoStepVerification(
    _input?: ViewTwoStepVerificationInput,
  ): Promise<BloomreachTwoStepVerificationSettings> {
    throw new Error(
      'viewTwoStepVerification: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareCreateSshTunnel(input: CreateSshTunnelInput): PreparedSecuritySettingsAction {
    const project = validateProject(input.project);
    const name = validateTunnelName(input.name);
    const host = validateHost(input.host);
    const port = validatePort(input.port);
    const username = validateUsername(input.username);
    const password = input.password !== undefined ? input.password.trim() : undefined;
    const hostKey = input.hostKey !== undefined ? input.hostKey.trim() : undefined;
    const databaseType = input.databaseType !== undefined ? input.databaseType.trim() : undefined;

    const preview = {
      action: CREATE_SSH_TUNNEL_ACTION_TYPE,
      project,
      name,
      host,
      port,
      username,
      password,
      hostKey,
      databaseType,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateSshTunnel(input: UpdateSshTunnelInput): PreparedSecuritySettingsAction {
    const project = validateProject(input.project);
    const tunnelId = validateTunnelId(input.tunnelId);
    const name = input.name !== undefined ? validateTunnelName(input.name) : undefined;
    const host = input.host !== undefined ? validateHost(input.host) : undefined;
    const port = input.port !== undefined ? validatePort(input.port) : undefined;
    const username = input.username !== undefined ? validateUsername(input.username) : undefined;
    const password = input.password !== undefined ? input.password.trim() : undefined;
    const hostKey = input.hostKey !== undefined ? input.hostKey.trim() : undefined;

    if (
      name === undefined &&
      host === undefined &&
      port === undefined &&
      username === undefined &&
      password === undefined &&
      hostKey === undefined
    ) {
      throw new Error(
        'At least one of name, host, port, username, password, or hostKey must be provided for tunnel update.',
      );
    }

    const preview = {
      action: UPDATE_SSH_TUNNEL_ACTION_TYPE,
      project,
      tunnelId,
      name,
      host,
      port,
      username,
      password,
      hostKey,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteSshTunnel(input: DeleteSshTunnelInput): PreparedSecuritySettingsAction {
    const project = validateProject(input.project);
    const tunnelId = validateTunnelId(input.tunnelId);

    const preview = {
      action: DELETE_SSH_TUNNEL_ACTION_TYPE,
      project,
      tunnelId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareEnableTwoStep(
    input: EnableTwoStepVerificationInput,
  ): PreparedSecuritySettingsAction {
    const project = validateProject(input.project);

    const preview = {
      action: ENABLE_TWO_STEP_ACTION_TYPE,
      project,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDisableTwoStep(
    input: DisableTwoStepVerificationInput,
  ): PreparedSecuritySettingsAction {
    const project = validateProject(input.project);

    const preview = {
      action: DISABLE_TWO_STEP_ACTION_TYPE,
      project,
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
