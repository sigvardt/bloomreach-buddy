import { validateProject } from './bloomreachDashboards.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const UPDATE_PROJECT_NAME_ACTION_TYPE = 'project_settings.update_project_name';
export const UPDATE_CUSTOM_URL_ACTION_TYPE = 'project_settings.update_custom_url';
export const UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE =
  'project_settings.update_terms_and_conditions';
export const CREATE_CUSTOM_TAG_ACTION_TYPE = 'project_settings.create_custom_tag';
export const UPDATE_CUSTOM_TAG_ACTION_TYPE = 'project_settings.update_custom_tag';
export const DELETE_CUSTOM_TAG_ACTION_TYPE = 'project_settings.delete_custom_tag';
export const CREATE_PROJECT_VARIABLE_ACTION_TYPE = 'project_settings.create_project_variable';
export const UPDATE_PROJECT_VARIABLE_ACTION_TYPE = 'project_settings.update_project_variable';
export const DELETE_PROJECT_VARIABLE_ACTION_TYPE = 'project_settings.delete_project_variable';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

/** Rate limit window for project settings operations (1 hour in ms). */
export const PROJECT_SETTINGS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const PROJECT_SETTINGS_MODIFY_RATE_LIMIT = 20;
export const PROJECT_SETTINGS_TAG_RATE_LIMIT = 30;
export const PROJECT_SETTINGS_VARIABLE_RATE_LIMIT = 30;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export const PROJECT_TYPES = ['Production', 'Sandbox', 'Development'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** General project settings from /project-settings/general. */
export interface BloomreachProjectGeneralSettings {
  /** Human-readable project name. */
  name: string;
  /** Project type — affects available features. */
  projectType: ProjectType;
  /** UUID identifying the project — required in all API calls. */
  projectToken: string;
  /** URL slug used in /p/{slug}/... routes. */
  slug: string;
  /** Base API URL for this instance, e.g. "https://api.exponea.com". */
  baseUrl?: string;
  /** Custom URL configured for the project (if any). */
  customUrl?: string;
  /** Calendar type configured for the project. */
  calendarType?: string;
  /** Full URL path to the general settings page. */
  url: string;
}

/** Terms and conditions settings from /project-settings/terms-and-conditions. */
export interface BloomreachTermsAndConditions {
  /** Whether the project has accepted T&Cs. */
  accepted: boolean;
  /** ISO-8601 timestamp of acceptance (if available). */
  acceptedAt?: string;
  /** Version of T&Cs accepted. */
  version?: string;
  /** DPA (Data Processing Agreement) acceptance status. */
  dpaAccepted?: boolean;
  /** Full URL path to the terms and conditions page. */
  url: string;
}

/** A custom tag used to organise campaigns, scenarios, and other objects. */
export interface BloomreachCustomTag {
  /** Unique identifier for the tag. */
  id: string;
  /** Display name of the tag. */
  name: string;
  /** Hex colour code for UI display, e.g. "#FF5733". */
  color?: string;
}

/** A project variable — a key-value pair used in Jinja templates across campaigns. */
export interface BloomreachProjectVariable {
  /** Variable key — used in Jinja as {{ variable_name }}. */
  name: string;
  /** The value substituted in templates. */
  value: string;
  /** Optional human-readable description. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ViewProjectSettingsInput {
  project: string;
}

export interface ViewProjectTokenInput {
  project: string;
}

export interface ViewTermsAndConditionsInput {
  project: string;
}

export interface ListCustomTagsInput {
  project: string;
}

export interface ListProjectVariablesInput {
  project: string;
}

export interface UpdateProjectNameInput {
  project: string;
  name: string;
  operatorNote?: string;
}

export interface UpdateCustomUrlInput {
  project: string;
  customUrl: string;
  operatorNote?: string;
}

export interface UpdateTermsAndConditionsInput {
  project: string;
  accepted: boolean;
  operatorNote?: string;
}

export interface CreateCustomTagInput {
  project: string;
  name: string;
  color?: string;
  operatorNote?: string;
}

export interface UpdateCustomTagInput {
  project: string;
  tagId: string;
  name?: string;
  color?: string;
  operatorNote?: string;
}

export interface DeleteCustomTagInput {
  project: string;
  tagId: string;
  operatorNote?: string;
}

export interface CreateProjectVariableInput {
  project: string;
  name: string;
  value: string;
  description?: string;
  operatorNote?: string;
}

export interface UpdateProjectVariableInput {
  project: string;
  variableName: string;
  value?: string;
  description?: string;
  operatorNote?: string;
}

export interface DeleteProjectVariableInput {
  project: string;
  variableName: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedProjectSettingsAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_PROJECT_NAME_LENGTH = 200;
const MIN_PROJECT_NAME_LENGTH = 1;

const MAX_TAG_NAME_LENGTH = 100;
const MIN_TAG_NAME_LENGTH = 1;

const MAX_VARIABLE_NAME_LENGTH = 200;
const MIN_VARIABLE_NAME_LENGTH = 1;

const MAX_VARIABLE_VALUE_LENGTH = 5000;

const MAX_CUSTOM_URL_LENGTH = 500;
const MIN_CUSTOM_URL_LENGTH = 1;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateProjectName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_PROJECT_NAME_LENGTH) {
    throw new Error('Project name must not be empty.');
  }
  if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
    throw new Error(
      `Project name must not exceed ${MAX_PROJECT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If tag name is empty or exceeds 100 characters. */
export function validateCustomTagName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_TAG_NAME_LENGTH) {
    throw new Error('Tag name must not be empty.');
  }
  if (trimmed.length > MAX_TAG_NAME_LENGTH) {
    throw new Error(
      `Tag name must not exceed ${MAX_TAG_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If tag ID is empty. */
export function validateCustomTagId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Tag ID must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If colour is not a valid hex colour code. */
export function validateTagColor(color: string): string {
  const trimmed = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new Error(
      `Tag color must be a valid hex color code (e.g. "#FF5733"), got "${trimmed}".`,
    );
  }
  return trimmed;
}

/** @throws {Error} If variable name is empty or exceeds 200 characters. */
export function validateVariableName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_VARIABLE_NAME_LENGTH) {
    throw new Error('Variable name must not be empty.');
  }
  if (trimmed.length > MAX_VARIABLE_NAME_LENGTH) {
    throw new Error(
      `Variable name must not exceed ${MAX_VARIABLE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If variable value exceeds 5000 characters. */
export function validateVariableValue(value: string): string {
  if (value.length > MAX_VARIABLE_VALUE_LENGTH) {
    throw new Error(
      `Variable value must not exceed ${MAX_VARIABLE_VALUE_LENGTH} characters (got ${value.length}).`,
    );
  }
  return value;
}

/** @throws {Error} If custom URL is empty or exceeds 500 characters. */
export function validateCustomUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length < MIN_CUSTOM_URL_LENGTH) {
    throw new Error('Custom URL must not be empty.');
  }
  if (trimmed.length > MAX_CUSTOM_URL_LENGTH) {
    throw new Error(
      `Custom URL must not exceed ${MAX_CUSTOM_URL_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildProjectSettingsGeneralUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/general`;
}

export function buildProjectSettingsTermsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/terms-and-conditions`;
}

export function buildProjectSettingsCustomTagsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/custom-tags`;
}

export function buildProjectSettingsVariablesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/project-variables-project`;
}

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

/**
 * Executor for a confirmed project settings mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface ProjectSettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class UpdateProjectNameExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = UPDATE_PROJECT_NAME_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateProjectNameExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateCustomUrlExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = UPDATE_CUSTOM_URL_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateCustomUrlExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateTermsAndConditionsExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateTermsAndConditionsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateCustomTagExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = CREATE_CUSTOM_TAG_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateCustomTagExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateCustomTagExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = UPDATE_CUSTOM_TAG_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateCustomTagExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteCustomTagExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = DELETE_CUSTOM_TAG_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteCustomTagExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateProjectVariableExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = CREATE_PROJECT_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateProjectVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateProjectVariableExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = UPDATE_PROJECT_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateProjectVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteProjectVariableExecutor implements ProjectSettingsActionExecutor {
  readonly actionType = DELETE_PROJECT_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteProjectVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createProjectSettingsActionExecutors(): Record<
  string,
  ProjectSettingsActionExecutor
> {
  return {
    [UPDATE_PROJECT_NAME_ACTION_TYPE]: new UpdateProjectNameExecutor(),
    [UPDATE_CUSTOM_URL_ACTION_TYPE]: new UpdateCustomUrlExecutor(),
    [UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE]: new UpdateTermsAndConditionsExecutor(),
    [CREATE_CUSTOM_TAG_ACTION_TYPE]: new CreateCustomTagExecutor(),
    [UPDATE_CUSTOM_TAG_ACTION_TYPE]: new UpdateCustomTagExecutor(),
    [DELETE_CUSTOM_TAG_ACTION_TYPE]: new DeleteCustomTagExecutor(),
    [CREATE_PROJECT_VARIABLE_ACTION_TYPE]: new CreateProjectVariableExecutor(),
    [UPDATE_PROJECT_VARIABLE_ACTION_TYPE]: new UpdateProjectVariableExecutor(),
    [DELETE_PROJECT_VARIABLE_ACTION_TYPE]: new DeleteProjectVariableExecutor(),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

/**
 * Manages Bloomreach Engagement project settings. Read methods return data
 * directly. Mutation methods follow the two-phase commit pattern (prepare +
 * confirm). Browser-dependent methods throw until Playwright infrastructure
 * is available.
 */
export class BloomreachProjectSettingsService {
  private readonly generalUrl: string;
  private readonly termsUrl: string;
  private readonly customTagsUrl: string;
  private readonly variablesUrl: string;

  constructor(project: string) {
    const validated = validateProject(project);
    this.generalUrl = buildProjectSettingsGeneralUrl(validated);
    this.termsUrl = buildProjectSettingsTermsUrl(validated);
    this.customTagsUrl = buildProjectSettingsCustomTagsUrl(validated);
    this.variablesUrl = buildProjectSettingsVariablesUrl(validated);
  }

  get projectSettingsGeneralUrl(): string {
    return this.generalUrl;
  }

  get projectSettingsTermsUrl(): string {
    return this.termsUrl;
  }

  get projectSettingsCustomTagsUrl(): string {
    return this.customTagsUrl;
  }

  get projectSettingsVariablesUrl(): string {
    return this.variablesUrl;
  }

  // -------------------------------------------------------------------------
  // Read-only methods
  // -------------------------------------------------------------------------

  /** @throws {Error} Browser automation not yet available. */
  async viewProjectSettings(
    _input?: ViewProjectSettingsInput,
  ): Promise<BloomreachProjectGeneralSettings> {
    throw new Error(
      'viewProjectSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewProjectToken(_input?: ViewProjectTokenInput): Promise<{ projectToken: string }> {
    throw new Error(
      'viewProjectToken: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewTermsAndConditions(
    _input?: ViewTermsAndConditionsInput,
  ): Promise<BloomreachTermsAndConditions> {
    throw new Error(
      'viewTermsAndConditions: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async listCustomTags(_input?: ListCustomTagsInput): Promise<BloomreachCustomTag[]> {
    throw new Error(
      'listCustomTags: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async listProjectVariables(
    _input?: ListProjectVariablesInput,
  ): Promise<BloomreachProjectVariable[]> {
    throw new Error(
      'listProjectVariables: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  // -------------------------------------------------------------------------
  // Prepare methods (two-phase commit)
  // -------------------------------------------------------------------------

  /** @throws {Error} If input validation fails. */
  prepareUpdateProjectName(input: UpdateProjectNameInput): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const name = validateProjectName(input.name);

    const preview = {
      action: UPDATE_PROJECT_NAME_ACTION_TYPE,
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

  /** @throws {Error} If input validation fails. */
  prepareUpdateCustomUrl(input: UpdateCustomUrlInput): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const customUrl = validateCustomUrl(input.customUrl);

    const preview = {
      action: UPDATE_CUSTOM_URL_ACTION_TYPE,
      project,
      customUrl,
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
  prepareUpdateTermsAndConditions(
    input: UpdateTermsAndConditionsInput,
  ): PreparedProjectSettingsAction {
    const project = validateProject(input.project);

    const preview = {
      action: UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE,
      project,
      accepted: input.accepted,
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
  prepareCreateCustomTag(input: CreateCustomTagInput): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const name = validateCustomTagName(input.name);
    const color = input.color !== undefined ? validateTagColor(input.color) : undefined;

    const preview = {
      action: CREATE_CUSTOM_TAG_ACTION_TYPE,
      project,
      name,
      color,
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
  prepareUpdateCustomTag(input: UpdateCustomTagInput): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const tagId = validateCustomTagId(input.tagId);
    const name = input.name !== undefined ? validateCustomTagName(input.name) : undefined;
    const color = input.color !== undefined ? validateTagColor(input.color) : undefined;

    if (name === undefined && color === undefined) {
      throw new Error('At least one of name or color must be provided for tag update.');
    }

    const preview = {
      action: UPDATE_CUSTOM_TAG_ACTION_TYPE,
      project,
      tagId,
      name,
      color,
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
  prepareDeleteCustomTag(input: DeleteCustomTagInput): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const tagId = validateCustomTagId(input.tagId);

    const preview = {
      action: DELETE_CUSTOM_TAG_ACTION_TYPE,
      project,
      tagId,
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
  prepareCreateProjectVariable(
    input: CreateProjectVariableInput,
  ): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const name = validateVariableName(input.name);
    const value = validateVariableValue(input.value);

    const preview = {
      action: CREATE_PROJECT_VARIABLE_ACTION_TYPE,
      project,
      name,
      value,
      description: input.description,
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
  prepareUpdateProjectVariable(
    input: UpdateProjectVariableInput,
  ): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const variableName = validateVariableName(input.variableName);
    const value =
      input.value !== undefined ? validateVariableValue(input.value) : undefined;

    if (value === undefined && input.description === undefined) {
      throw new Error(
        'At least one of value or description must be provided for variable update.',
      );
    }

    const preview = {
      action: UPDATE_PROJECT_VARIABLE_ACTION_TYPE,
      project,
      variableName,
      value,
      description: input.description,
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
  prepareDeleteProjectVariable(
    input: DeleteProjectVariableInput,
  ): PreparedProjectSettingsAction {
    const project = validateProject(input.project);
    const variableName = validateVariableName(input.variableName);

    const preview = {
      action: DELETE_PROJECT_VARIABLE_ACTION_TYPE,
      project,
      variableName,
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
