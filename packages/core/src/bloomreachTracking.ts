import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { bloomreachApiFetch, buildTrackingPath } from './bloomreachApiClient.js';

export const TRACK_EVENT_ACTION_TYPE = 'tracking.track_event';
export const TRACK_BATCH_ACTION_TYPE = 'tracking.track_batch';
export const TRACK_CUSTOMER_ACTION_TYPE = 'tracking.track_customer';
export const TRACK_CONSENT_ACTION_TYPE = 'tracking.track_consent';
export const TRACK_CAMPAIGN_ACTION_TYPE = 'tracking.track_campaign';

export const TRACKING_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const TRACKING_EVENT_RATE_LIMIT = 100;
export const TRACKING_BATCH_RATE_LIMIT = 50;
export const TRACKING_CUSTOMER_RATE_LIMIT = 100;
export const TRACKING_CONSENT_RATE_LIMIT = 100;
export const TRACKING_CAMPAIGN_RATE_LIMIT = 100;

export interface TrackingCustomerIds {
  registered?: string;
  cookie?: string;
  [key: string]: string | undefined;
}

export interface TrackEventInput {
  project: string;
  customerIds: TrackingCustomerIds;
  eventType: string;
  timestamp?: number;
  properties?: Record<string, unknown>;
}

export interface BatchCommand {
  name: 'customers' | 'customers/events';
  commandId?: string;
  data: Record<string, unknown>;
}

export interface TrackBatchInput {
  project: string;
  commands: BatchCommand[];
}

export interface TrackCustomerInput {
  project: string;
  customerIds: TrackingCustomerIds;
  properties: Record<string, unknown>;
  updateTimestamp?: number;
}

export interface TrackConsentInput {
  project: string;
  customerIds: TrackingCustomerIds;
  category: string;
  action: 'accept' | 'reject';
  timestamp?: number;
  properties?: Record<string, unknown>;
}

export interface TrackCampaignInput {
  project: string;
  customerIds: TrackingCustomerIds;
  campaignType: string;
  action: string;
  timestamp?: number;
  properties?: Record<string, unknown>;
}

export interface PreparedTrackingAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export interface TrackingResponse {
  success: boolean;
  errors?: string | string[];
}

export interface BatchCommandResult {
  success: boolean;
  errors?: string[];
  command_id?: string;
}

export interface BatchResponse {
  success: boolean;
  results: BatchCommandResult[];
  start_time: number;
  end_time: number;
}

const MAX_FIELD_LENGTH = 500;

export function validateTrackingCustomerIds(ids: TrackingCustomerIds): TrackingCustomerIds {
  const hasAtLeastOne = Object.values(ids).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  if (!hasAtLeastOne) {
    throw new Error('At least one customer identifier must be provided.');
  }

  const validated: TrackingCustomerIds = {};
  for (const [key, value] of Object.entries(ids)) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed.length > MAX_FIELD_LENGTH) {
      throw new Error(
        `Customer identifier '${key}' must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmed.length}).`,
      );
    }
    validated[key] = trimmed;
  }

  return validated;
}

export function validateEventType(eventType: string): string {
  const trimmed = eventType.trim();
  if (trimmed.length === 0) {
    throw new Error('Event type must not be empty.');
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new Error(
      `Event type must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateBatchCommands(commands: BatchCommand[]): BatchCommand[] {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error('At least one batch command must be provided.');
  }

  return commands.map((command, index) => {
    if (command.name !== 'customers' && command.name !== 'customers/events') {
      throw new Error(
        `Batch command at index ${index} has invalid name '${String(command.name)}'. Expected 'customers' or 'customers/events'.`,
      );
    }

    if (
      typeof command.data !== 'object' ||
      command.data === null ||
      Array.isArray(command.data)
    ) {
      throw new Error(`Batch command at index ${index} must include a non-null data object.`);
    }

    let commandId: string | undefined;
    if (command.commandId !== undefined) {
      const trimmedCommandId = command.commandId.trim();
      if (trimmedCommandId.length === 0) {
        throw new Error(`Batch command at index ${index} has an empty commandId.`);
      }
      if (trimmedCommandId.length > MAX_FIELD_LENGTH) {
        throw new Error(
          `Batch command commandId at index ${index} must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmedCommandId.length}).`,
        );
      }
      commandId = trimmedCommandId;
    }

    return {
      name: command.name,
      commandId,
      data: command.data,
    };
  });
}

export function validateTrackingConsentCategory(category: string): string {
  const trimmed = category.trim();
  if (trimmed.length === 0) {
    throw new Error('Consent category must not be empty.');
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new Error(
      `Consent category must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateConsentAction(action: string): 'accept' | 'reject' {
  const normalized = action.trim().toLowerCase();
  if (normalized !== 'accept' && normalized !== 'reject') {
    throw new Error(`Consent action must be 'accept' or 'reject' (got '${action}').`);
  }
  return normalized;
}

export function validateCampaignType(campaignType: string): string {
  const trimmed = campaignType.trim();
  if (trimmed.length === 0) {
    throw new Error('Campaign type must not be empty.');
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new Error(
      `Campaign type must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateCampaignAction(action: string): string {
  const trimmed = action.trim();
  if (trimmed.length === 0) {
    throw new Error('Campaign action must not be empty.');
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new Error(
      `Campaign action must not exceed ${MAX_FIELD_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateTimestamp(timestamp?: number): number | undefined {
  if (timestamp === undefined) {
    return undefined;
  }
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error('Timestamp must be a positive number when provided.');
  }
  return timestamp;
}

function validateProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (properties === undefined) {
    return undefined;
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new Error('Properties must be a non-null object.');
  }
  return properties;
}

function validateRequiredProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new Error('Properties must be a non-null object.');
  }
  if (Object.keys(properties).length === 0) {
    throw new Error('At least one property must be provided.');
  }
  return properties;
}

export class BloomreachTrackingService {
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    validateProject(project);
    this.apiConfig = apiConfig;
  }

  get hasApiConfig(): boolean {
    return this.apiConfig !== undefined;
  }

  prepareTrackEvent(input: TrackEventInput): PreparedTrackingAction {
    const project = validateProject(input.project);
    const customerIds = validateTrackingCustomerIds(input.customerIds);
    const eventType = validateEventType(input.eventType);
    const timestamp = validateTimestamp(input.timestamp);
    const properties = validateProperties(input.properties);

    const preview = {
      action: TRACK_EVENT_ACTION_TYPE,
      project,
      customerIds,
      eventType,
      timestamp,
      properties,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareTrackBatch(input: TrackBatchInput): PreparedTrackingAction {
    const project = validateProject(input.project);
    const commands = validateBatchCommands(input.commands);

    const preview = {
      action: TRACK_BATCH_ACTION_TYPE,
      project,
      commands,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareTrackCustomer(input: TrackCustomerInput): PreparedTrackingAction {
    const project = validateProject(input.project);
    const customerIds = validateTrackingCustomerIds(input.customerIds);
    const properties = validateRequiredProperties(input.properties);
    const updateTimestamp = validateTimestamp(input.updateTimestamp);

    const preview = {
      action: TRACK_CUSTOMER_ACTION_TYPE,
      project,
      customerIds,
      properties,
      updateTimestamp,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareTrackConsent(input: TrackConsentInput): PreparedTrackingAction {
    const project = validateProject(input.project);
    const customerIds = validateTrackingCustomerIds(input.customerIds);
    const category = validateTrackingConsentCategory(input.category);
    const action = validateConsentAction(input.action);
    const timestamp = validateTimestamp(input.timestamp);
    const properties = validateProperties(input.properties);

    const preview = {
      action: TRACK_CONSENT_ACTION_TYPE,
      project,
      customerIds,
      category,
      consentAction: action,
      timestamp,
      properties,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareTrackCampaign(input: TrackCampaignInput): PreparedTrackingAction {
    const project = validateProject(input.project);
    const customerIds = validateTrackingCustomerIds(input.customerIds);
    const campaignType = validateCampaignType(input.campaignType);
    const action = validateCampaignAction(input.action);
    const timestamp = validateTimestamp(input.timestamp);
    const properties = validateProperties(input.properties);

    const preview = {
      action: TRACK_CAMPAIGN_ACTION_TYPE,
      project,
      customerIds,
      campaignType,
      campaignAction: action,
      timestamp,
      properties,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }
}

export interface TrackingActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
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

class TrackEventExecutor implements TrackingActionExecutor {
  readonly actionType = TRACK_EVENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackEventExecutor');
    const customerIds = payload.customerIds as TrackingCustomerIds;
    const eventType = payload.eventType as string;
    const timestamp = payload.timestamp as number | undefined;
    const properties = payload.properties as Record<string, unknown> | undefined;

    const path = buildTrackingPath(config, '/customers/events');
    const response = (await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: customerIds,
        event_type: eventType,
        timestamp,
        properties,
      },
    })) as TrackingResponse;

    return { success: true, response };
  }
}

class TrackBatchExecutor implements TrackingActionExecutor {
  readonly actionType = TRACK_BATCH_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackBatchExecutor');
    const commands = payload.commands as BatchCommand[];

    const path = buildTrackingPath(config, '/batch');
    const response = (await bloomreachApiFetch(config, path, {
      body: {
        commands: commands.map((command) => ({
          name: command.name,
          command_id: command.commandId,
          data: command.data,
        })),
      },
    })) as BatchResponse;

    return { success: true, response };
  }
}

class TrackCustomerExecutor implements TrackingActionExecutor {
  readonly actionType = TRACK_CUSTOMER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackCustomerExecutor');
    const customerIds = payload.customerIds as TrackingCustomerIds;
    const properties = payload.properties as Record<string, unknown>;
    const updateTimestamp = payload.updateTimestamp as number | undefined;

    const path = buildTrackingPath(config, '/customers');
    const response = (await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: customerIds,
        properties,
        update_timestamp: updateTimestamp,
      },
    })) as TrackingResponse;

    return { success: true, response };
  }
}

class TrackConsentExecutor implements TrackingActionExecutor {
  readonly actionType = TRACK_CONSENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackConsentExecutor');
    const customerIds = payload.customerIds as TrackingCustomerIds;
    const category = payload.category as string;
    const action = payload.action as 'accept' | 'reject';
    const timestamp = payload.timestamp as number | undefined;
    const properties = payload.properties as Record<string, unknown> | undefined;

    const path = buildTrackingPath(config, '/customers/events');
    const response = (await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: customerIds,
        event_type: 'consent',
        timestamp,
        properties: {
          category,
          action,
          ...(properties ?? {}),
        },
      },
    })) as TrackingResponse;

    return { success: true, response };
  }
}

class TrackCampaignExecutor implements TrackingActionExecutor {
  readonly actionType = TRACK_CAMPAIGN_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackCampaignExecutor');
    const customerIds = payload.customerIds as TrackingCustomerIds;
    const campaignType = payload.campaignType as string;
    const action = payload.action as string;
    const timestamp = payload.timestamp as number | undefined;
    const properties = payload.properties as Record<string, unknown> | undefined;

    const path = buildTrackingPath(config, '/customers/events');
    const response = (await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: customerIds,
        event_type: campaignType,
        timestamp,
        properties: {
          action,
          ...(properties ?? {}),
        },
      },
    })) as TrackingResponse;

    return { success: true, response };
  }
}

export function createTrackingActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, TrackingActionExecutor> {
  return {
    [TRACK_EVENT_ACTION_TYPE]: new TrackEventExecutor(apiConfig),
    [TRACK_BATCH_ACTION_TYPE]: new TrackBatchExecutor(apiConfig),
    [TRACK_CUSTOMER_ACTION_TYPE]: new TrackCustomerExecutor(apiConfig),
    [TRACK_CONSENT_ACTION_TYPE]: new TrackConsentExecutor(apiConfig),
    [TRACK_CAMPAIGN_ACTION_TYPE]: new TrackCampaignExecutor(apiConfig),
  };
}
