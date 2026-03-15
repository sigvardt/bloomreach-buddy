import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const CREATE_INTEGRATION_ACTION_TYPE = 'integrations.create_integration';
export const CONFIGURE_INTEGRATION_ACTION_TYPE = 'integrations.configure_integration';
export const ENABLE_INTEGRATION_ACTION_TYPE = 'integrations.enable_integration';
export const DISABLE_INTEGRATION_ACTION_TYPE = 'integrations.disable_integration';
export const DELETE_INTEGRATION_ACTION_TYPE = 'integrations.delete_integration';
export const TEST_INTEGRATION_ACTION_TYPE = 'integrations.test_integration';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

/** Rate limit window for integration operations (1 hour in ms). */
export const INTEGRATION_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const INTEGRATION_CREATE_RATE_LIMIT = 10;
export const INTEGRATION_MODIFY_RATE_LIMIT = 20;
export const INTEGRATION_DELETE_RATE_LIMIT = 10;
export const INTEGRATION_TEST_RATE_LIMIT = 30;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export const INTEGRATION_TYPES = [
  'esp',
  'sms',
  'push',
  'ad_platform',
  'webhook',
  'analytics',
  'crm',
  'custom',
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const INTEGRATION_STATUSES = ['active', 'inactive', 'error', 'pending'] as const;

export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export interface BloomreachIntegration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  /** ISO-8601 creation timestamp (if available). */
  createdAt?: string;
  /** ISO-8601 last-updated timestamp (if available). */
  updatedAt?: string;
  /** Full URL path to the integration configuration. */
  url: string;
}

export interface IntegrationDetail extends BloomreachIntegration {
  /** Integration-specific configuration settings (non-sensitive). */
  settings: Record<string, unknown>;
  /** ISO-8601 timestamp of last connectivity test (if available). */
  lastTestedAt?: string;
  /** Result of last connectivity test (if available). */
  lastTestResult?: 'success' | 'failure';
}

export interface IntegrationCredentials {
  [key: string]: unknown;
}

export interface IntegrationSettings {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ListIntegrationsInput {
  project: string;
  type?: string;
  status?: string;
}

export interface ViewIntegrationInput {
  project: string;
  integrationId: string;
}

export interface CreateIntegrationInput {
  project: string;
  name: string;
  type: IntegrationType;
  provider: string;
  credentials?: IntegrationCredentials;
  settings?: IntegrationSettings;
  operatorNote?: string;
}

export interface ConfigureIntegrationInput {
  project: string;
  integrationId: string;
  credentials?: IntegrationCredentials;
  settings?: IntegrationSettings;
  operatorNote?: string;
}

export interface EnableIntegrationInput {
  project: string;
  integrationId: string;
  operatorNote?: string;
}

export interface DisableIntegrationInput {
  project: string;
  integrationId: string;
  operatorNote?: string;
}

export interface DeleteIntegrationInput {
  project: string;
  integrationId: string;
  operatorNote?: string;
}

export interface TestIntegrationInput {
  project: string;
  integrationId: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedIntegrationAction {
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

const MAX_INTEGRATION_NAME_LENGTH = 200;
const MIN_INTEGRATION_NAME_LENGTH = 1;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateIntegrationName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_INTEGRATION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Integration name must not be empty.');
  }
  if (trimmed.length > MAX_INTEGRATION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Integration name must not exceed ${MAX_INTEGRATION_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If project is empty. */
export function validateIntegrationProject(project: string): string {
  const trimmed = project.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Project identifier must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If integrationId is empty. */
export function validateIntegrationId(integrationId: string): string {
  const trimmed = integrationId.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Integration ID must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If type is not a valid integration type. */
export function validateIntegrationType(type: string): IntegrationType {
  if (!INTEGRATION_TYPES.includes(type as IntegrationType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid integration type '${type}'. Must be one of: ${INTEGRATION_TYPES.join(', ')}.`);
  }
  return type as IntegrationType;
}

/** @throws {Error} If status is not a valid integration status. */
export function validateIntegrationStatus(status: string): IntegrationStatus {
  if (!INTEGRATION_STATUSES.includes(status as IntegrationStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Invalid integration status '${status}'. Must be one of: ${INTEGRATION_STATUSES.join(', ')}.`);
  }
  return status as IntegrationStatus;
}

/** @throws {Error} If provider is empty. */
export function validateProvider(provider: string): string {
  const trimmed = provider.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Provider must not be empty.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildIntegrationsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/integrations`;
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

/**
 * Executor for a confirmed integration mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface IntegrationActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = CREATE_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateIntegrationExecutor: not yet implemented. Integration creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ConfigureIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = CONFIGURE_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ConfigureIntegrationExecutor: not yet implemented. Integration configuration is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class EnableIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = ENABLE_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EnableIntegrationExecutor: not yet implemented. Integration management is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DisableIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = DISABLE_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DisableIntegrationExecutor: not yet implemented. Integration management is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = DELETE_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteIntegrationExecutor: not yet implemented. Integration deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class TestIntegrationExecutor implements IntegrationActionExecutor {
  readonly actionType = TEST_INTEGRATION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'TestIntegrationExecutor: not yet implemented. Integration testing is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createIntegrationActionExecutors(apiConfig?: BloomreachApiConfig): Record<string, IntegrationActionExecutor> {
  return {
    [CREATE_INTEGRATION_ACTION_TYPE]: new CreateIntegrationExecutor(apiConfig),
    [CONFIGURE_INTEGRATION_ACTION_TYPE]: new ConfigureIntegrationExecutor(apiConfig),
    [ENABLE_INTEGRATION_ACTION_TYPE]: new EnableIntegrationExecutor(apiConfig),
    [DISABLE_INTEGRATION_ACTION_TYPE]: new DisableIntegrationExecutor(apiConfig),
    [DELETE_INTEGRATION_ACTION_TYPE]: new DeleteIntegrationExecutor(apiConfig),
    [TEST_INTEGRATION_ACTION_TYPE]: new TestIntegrationExecutor(apiConfig),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

/**
 * Manages Bloomreach Engagement integrations. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachIntegrationsService {
  private readonly apiConfig?: BloomreachApiConfig;
  private readonly baseUrl: string;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
    this.baseUrl = buildIntegrationsUrl(validateIntegrationProject(project));
  }

  get integrationsUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listIntegrations(input?: ListIntegrationsInput): Promise<BloomreachIntegration[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
      if (input.type !== undefined) {
        validateIntegrationType(input.type);
      }
      if (input.status !== undefined) {
        validateIntegrationStatus(input.status);
      }
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listIntegrations: not yet implemented. The Bloomreach API does not provide an endpoint for integrations. Integrations must be managed through the Bloomreach Engagement UI (navigate to Data & Assets > Integrations).', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewIntegration(input: ViewIntegrationInput): Promise<IntegrationDetail> {
    void this.apiConfig;
    validateProject(input.project);
    validateIntegrationId(input.integrationId);
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewIntegration: not yet implemented. The Bloomreach API does not provide an endpoint for integration details. Integrations must be managed through the Bloomreach Engagement UI (navigate to Data & Assets > Integrations).', { not_implemented: true });
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateIntegration(input: CreateIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const name = validateIntegrationName(input.name);
    const type = validateIntegrationType(input.type);
    const provider = validateProvider(input.provider);

    const preview = {
      action: CREATE_INTEGRATION_ACTION_TYPE,
      project,
      name,
      type,
      provider,
      hasCredentials: input.credentials !== undefined && Object.keys(input.credentials).length > 0,
      hasSettings: input.settings !== undefined && Object.keys(input.settings).length > 0,
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
  prepareConfigureIntegration(input: ConfigureIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const integrationId = validateIntegrationId(input.integrationId);

    const preview = {
      action: CONFIGURE_INTEGRATION_ACTION_TYPE,
      project,
      integrationId,
      updatesCredentials:
        input.credentials !== undefined && Object.keys(input.credentials).length > 0,
      updatesSettings: input.settings !== undefined && Object.keys(input.settings).length > 0,
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
  prepareEnableIntegration(input: EnableIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const integrationId = validateIntegrationId(input.integrationId);

    const preview = {
      action: ENABLE_INTEGRATION_ACTION_TYPE,
      project,
      integrationId,
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
  prepareDisableIntegration(input: DisableIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const integrationId = validateIntegrationId(input.integrationId);

    const preview = {
      action: DISABLE_INTEGRATION_ACTION_TYPE,
      project,
      integrationId,
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
  prepareDeleteIntegration(input: DeleteIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const integrationId = validateIntegrationId(input.integrationId);

    const preview = {
      action: DELETE_INTEGRATION_ACTION_TYPE,
      project,
      integrationId,
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
  prepareTestIntegration(input: TestIntegrationInput): PreparedIntegrationAction {
    const project = validateIntegrationProject(input.project);
    const integrationId = validateIntegrationId(input.integrationId);

    const preview = {
      action: TEST_INTEGRATION_ACTION_TYPE,
      project,
      integrationId,
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
