import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const INVITE_TEAM_MEMBER_ACTION_TYPE = 'access.invite_team_member';
export const UPDATE_MEMBER_ROLE_ACTION_TYPE = 'access.update_member_role';
export const REMOVE_TEAM_MEMBER_ACTION_TYPE = 'access.remove_team_member';
export const CREATE_API_KEY_ACTION_TYPE = 'access.create_api_key';
export const DELETE_API_KEY_ACTION_TYPE = 'access.delete_api_key';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

export const ACCESS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const ACCESS_INVITE_RATE_LIMIT = 20;
export const ACCESS_MODIFY_RATE_LIMIT = 30;
export const ACCESS_API_KEY_RATE_LIMIT = 10;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export const TEAM_MEMBER_ROLES = ['admin', 'manager', 'analyst', 'editor', 'viewer'] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export interface BloomreachTeamMember {
  id: string;
  email: string;
  name?: string;
  role: TeamMemberRole;
  status: string;
  joinedAt?: string;
  lastActiveAt?: string;
  url: string;
}

export interface BloomreachApiKey {
  id: string;
  name: string;
  publicKey: string;
  createdAt?: string;
  createdBy?: string;
  lastUsedAt?: string;
  status: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ListTeamMembersInput {
  project: string;
}

export interface InviteTeamMemberInput {
  project: string;
  email: string;
  role: string;
  operatorNote?: string;
}

export interface UpdateMemberRoleInput {
  project: string;
  memberId: string;
  role: string;
  operatorNote?: string;
}

export interface RemoveTeamMemberInput {
  project: string;
  memberId: string;
  operatorNote?: string;
}

export interface ListApiKeysInput {
  project: string;
}

export interface CreateApiKeyInput {
  project: string;
  name: string;
  operatorNote?: string;
}

export interface DeleteApiKeyInput {
  project: string;
  apiKeyId: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

export interface PreparedAccessAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_API_KEY_NAME_LENGTH = 200;

export function validateEmail(email: string): string {
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    throw new Error('Email must not be empty.');
  }

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    throw new Error('Email must contain "@" with text on both sides.');
  }

  return trimmed;
}

export function validateMemberRole(role: string): TeamMemberRole {
  if (!TEAM_MEMBER_ROLES.includes(role as TeamMemberRole)) {
    throw new Error(
      `role must be one of: ${TEAM_MEMBER_ROLES.join(', ')} (got "${role}").`,
    );
  }
  return role as TeamMemberRole;
}

export function validateMemberId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Member ID must not be empty.');
  }
  return trimmed;
}

export function validateApiKeyName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('API key name must not be empty.');
  }
  if (trimmed.length > MAX_API_KEY_NAME_LENGTH) {
    throw new Error(
      `API key name must not exceed ${MAX_API_KEY_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateApiKeyId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('API key ID must not be empty.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildProjectTeamUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/project-team-v2`;
}

export function buildApiKeysUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/api`;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new Error(
      `${operation} requires API credentials. ` +
        'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
    );
  }
  return config;
}

void requireApiConfig;

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface AccessActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class InviteTeamMemberExecutor implements AccessActionExecutor {
  readonly actionType = INVITE_TEAM_MEMBER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'InviteTeamMemberExecutor: not yet implemented. ' +
        'Team member invitation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class UpdateMemberRoleExecutor implements AccessActionExecutor {
  readonly actionType = UPDATE_MEMBER_ROLE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'UpdateMemberRoleExecutor: not yet implemented. ' +
        'Member role updates are only available through the Bloomreach Engagement UI.',
    );
  }
}

class RemoveTeamMemberExecutor implements AccessActionExecutor {
  readonly actionType = REMOVE_TEAM_MEMBER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'RemoveTeamMemberExecutor: not yet implemented. ' +
        'Team member removal is only available through the Bloomreach Engagement UI.',
    );
  }
}

class CreateApiKeyExecutor implements AccessActionExecutor {
  readonly actionType = CREATE_API_KEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateApiKeyExecutor: not yet implemented. ' +
        'API key creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class DeleteApiKeyExecutor implements AccessActionExecutor {
  readonly actionType = DELETE_API_KEY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'DeleteApiKeyExecutor: not yet implemented. ' +
        'API key deletion is only available through the Bloomreach Engagement UI.',
    );
  }
}

export function createAccessActionExecutors(apiConfig?: BloomreachApiConfig): Record<string, AccessActionExecutor> {
  return {
    [INVITE_TEAM_MEMBER_ACTION_TYPE]: new InviteTeamMemberExecutor(apiConfig),
    [UPDATE_MEMBER_ROLE_ACTION_TYPE]: new UpdateMemberRoleExecutor(apiConfig),
    [REMOVE_TEAM_MEMBER_ACTION_TYPE]: new RemoveTeamMemberExecutor(apiConfig),
    [CREATE_API_KEY_ACTION_TYPE]: new CreateApiKeyExecutor(apiConfig),
    [DELETE_API_KEY_ACTION_TYPE]: new DeleteApiKeyExecutor(apiConfig),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachAccessManagementService {
  private readonly apiConfig?: BloomreachApiConfig;
  private readonly teamUrl: string;
  private readonly keysUrl: string;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validatedProject = validateProject(project);
    this.apiConfig = apiConfig;
    this.teamUrl = buildProjectTeamUrl(validatedProject);
    this.keysUrl = buildApiKeysUrl(validatedProject);
  }

  get projectTeamUrl(): string {
    return this.teamUrl;
  }

  get apiKeysUrl(): string {
    return this.keysUrl;
  }

  async listTeamMembers(input?: ListTeamMembersInput): Promise<BloomreachTeamMember[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new Error(
      'listTeamMembers: not yet implemented. the Bloomreach API does not provide an endpoint for team members. ' +
        'Team members must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Project Team).',
    );
  }

  async listApiKeys(input?: ListApiKeysInput): Promise<BloomreachApiKey[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new Error(
      'listApiKeys: not yet implemented. the Bloomreach API does not provide an endpoint for API keys. ' +
        'API keys must be managed through the Bloomreach Engagement UI (navigate to Project Settings > API).',
    );
  }

  prepareInviteTeamMember(input: InviteTeamMemberInput): PreparedAccessAction {
    const project = validateProject(input.project);
    const email = validateEmail(input.email);
    const role = validateMemberRole(input.role);

    const preview = {
      action: INVITE_TEAM_MEMBER_ACTION_TYPE,
      project,
      email,
      role,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateMemberRole(input: UpdateMemberRoleInput): PreparedAccessAction {
    const project = validateProject(input.project);
    const memberId = validateMemberId(input.memberId);
    const role = validateMemberRole(input.role);

    const preview = {
      action: UPDATE_MEMBER_ROLE_ACTION_TYPE,
      project,
      memberId,
      role,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareRemoveTeamMember(input: RemoveTeamMemberInput): PreparedAccessAction {
    const project = validateProject(input.project);
    const memberId = validateMemberId(input.memberId);

    const preview = {
      action: REMOVE_TEAM_MEMBER_ACTION_TYPE,
      project,
      memberId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateApiKey(input: CreateApiKeyInput): PreparedAccessAction {
    const project = validateProject(input.project);
    const name = validateApiKeyName(input.name);

    const preview = {
      action: CREATE_API_KEY_ACTION_TYPE,
      project,
      name,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteApiKey(input: DeleteApiKeyInput): PreparedAccessAction {
    const project = validateProject(input.project);
    const apiKeyId = validateApiKeyId(input.apiKeyId);

    const preview = {
      action: DELETE_API_KEY_ACTION_TYPE,
      project,
      apiKeyId,
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
