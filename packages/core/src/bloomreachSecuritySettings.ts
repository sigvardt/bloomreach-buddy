import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

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
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Tunnel name must not be empty.');
  }
  if (trimmed.length > MAX_TUNNEL_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Tunnel name must not exceed ${MAX_TUNNEL_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateHost(host: string): string {
  const trimmed = host.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Host must not be empty.');
  }
  if (trimmed.length > MAX_HOST_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Host must not exceed ${MAX_HOST_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validatePort(port: number): number {
  if (!Number.isInteger(port) || port <= 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Port must be a positive integer.');
  }
  if (port < 1 || port > 65535) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Port must be between 1 and 65535 (got ${port}).`);
  }
  return port;
}

export function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Username must not be empty.');
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Username must not exceed ${MAX_USERNAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateTunnelId(tunnelId: string): string {
  const trimmed = tunnelId.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Tunnel ID must not be empty.');
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

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface SecuritySettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = CREATE_SSH_TUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateSshTunnelExecutor: not yet implemented. ' +
      'SSH tunnel creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = UPDATE_SSH_TUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateSshTunnelExecutor: not yet implemented. ' +
      'SSH tunnel updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteSshTunnelExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = DELETE_SSH_TUNNEL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteSshTunnelExecutor: not yet implemented. ' +
      'SSH tunnel deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class EnableTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = ENABLE_TWO_STEP_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EnableTwoStepExecutor: not yet implemented. ' +
      'Two-step verification enabling is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DisableTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = DISABLE_TWO_STEP_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DisableTwoStepExecutor: not yet implemented. ' +
      'Two-step verification disabling is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateTwoStepExecutor implements SecuritySettingsActionExecutor {
  readonly actionType = UPDATE_TWO_STEP_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateTwoStepExecutor: not yet implemented. ' +
      'Two-step verification updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createSecuritySettingsActionExecutors(apiConfig?: BloomreachApiConfig): Record<
  string,
  SecuritySettingsActionExecutor
> {
  return {
    [CREATE_SSH_TUNNEL_ACTION_TYPE]: new CreateSshTunnelExecutor(apiConfig),
    [UPDATE_SSH_TUNNEL_ACTION_TYPE]: new UpdateSshTunnelExecutor(apiConfig),
    [DELETE_SSH_TUNNEL_ACTION_TYPE]: new DeleteSshTunnelExecutor(apiConfig),
    [ENABLE_TWO_STEP_ACTION_TYPE]: new EnableTwoStepExecutor(apiConfig),
    [DISABLE_TWO_STEP_ACTION_TYPE]: new DisableTwoStepExecutor(apiConfig),
    [UPDATE_TWO_STEP_ACTION_TYPE]: new UpdateTwoStepExecutor(apiConfig),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachSecuritySettingsService {
  private readonly apiConfig?: BloomreachApiConfig;
  private readonly sshTunnelsSettingsUrl: string;
  private readonly twoStepVerificationSettingsUrl: string;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validated = validateProject(project);
    this.apiConfig = apiConfig;
    this.sshTunnelsSettingsUrl = buildSshTunnelsUrl(validated);
    this.twoStepVerificationSettingsUrl = buildTwoStepVerificationUrl(validated);
  }

  get sshTunnelsUrl(): string {
    return this.sshTunnelsSettingsUrl;
  }

  get twoStepVerificationUrl(): string {
    return this.twoStepVerificationSettingsUrl;
  }

  async listSshTunnels(input?: ListSshTunnelsInput): Promise<BloomreachSshTunnel[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listSshTunnels: not yet implemented. the Bloomreach API does not provide an endpoint for SSH tunnels. ' +
      'SSH tunnels must be managed through the Bloomreach Engagement UI (navigate to Project Settings > SSH Tunnels).', { not_implemented: true });
  }

  async viewSshTunnel(input?: ViewSshTunnelInput): Promise<BloomreachSshTunnel> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewSshTunnel: not yet implemented. the Bloomreach API does not provide an endpoint for SSH tunnels. ' +
      'SSH tunnels must be managed through the Bloomreach Engagement UI (navigate to Project Settings > SSH Tunnels).', { not_implemented: true });
  }

  async viewTwoStepVerification(
    input?: ViewTwoStepVerificationInput,
  ): Promise<BloomreachTwoStepVerificationSettings> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewTwoStepVerification: not yet implemented. the Bloomreach API does not provide an endpoint for two-step verification. ' +
      'Two-step verification must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Two-Step Verification).', { not_implemented: true });
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of name, host, port, username, password, or hostKey must be provided for tunnel update.');
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
