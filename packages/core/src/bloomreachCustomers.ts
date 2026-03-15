import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import {
  bloomreachApiFetch,
  buildDataPath,
  buildTrackingPath,
} from './bloomreachApiClient.js';

export const CREATE_CUSTOMER_ACTION_TYPE = 'customers.create_customer';
export const UPDATE_CUSTOMER_ACTION_TYPE = 'customers.update_customer';
export const DELETE_CUSTOMER_ACTION_TYPE = 'customers.delete_customer';
export const CUSTOMER_TRACK_EVENT_ACTION_TYPE = 'customers.track_event';
export const BATCH_COMMANDS_ACTION_TYPE = 'customers.batch_commands';

export const CUSTOMER_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const CUSTOMER_CREATE_RATE_LIMIT = 50;
export const CUSTOMER_UPDATE_RATE_LIMIT = 100;
export const CUSTOMER_DELETE_RATE_LIMIT = 10;

export interface CustomerIds {
  registered?: string;
  cookie?: string;
  email?: string;
  [key: string]: string | undefined;
}

export interface BloomreachCustomer {
  customerIds: CustomerIds;
  properties: Record<string, unknown>;
  url: string;
}

export interface CustomerEvent {
  eventType: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

export interface CustomerSegment {
  id: string;
  name: string;
}

export interface CustomerProfile extends BloomreachCustomer {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  events: CustomerEvent[];
  segments: CustomerSegment[];
}

export interface ListCustomersInput {
  project: string;
  limit?: number;
  offset?: number;
}

export interface SearchCustomersInput {
  project: string;
  query: string;
  limit?: number;
  offset?: number;
}

export interface ViewCustomerInput {
  project: string;
  customerId: string;
  idType?: string;
}

export interface CreateCustomerInput {
  project: string;
  customerIds: CustomerIds;
  properties: Record<string, unknown>;
  operatorNote?: string;
}

export interface UpdateCustomerInput {
  project: string;
  customerId: string;
  idType?: string;
  properties: Record<string, unknown>;
  operatorNote?: string;
}

export interface DeleteCustomerInput {
  project: string;
  customerId: string;
  idType?: string;
  operatorNote?: string;
}

export interface CustomerTrackEventInput {
  project: string;
  customerIds: CustomerIds;
  eventType: string;
  timestamp?: number;
  properties?: Record<string, unknown>;
}

export interface TrackEventResult {
  success: boolean;
  response: unknown;
}

export interface BatchCommandInput {
  project: string;
  commands: CustomerBatchCommand[];
}

export interface CustomerBatchCommand {
  name: string;
  data: Record<string, unknown>;
}

export interface CustomerBatchCommandResult {
  success: boolean;
  response: unknown;
}

export interface ExportCustomerEventsInput {
  project: string;
  customerIds: CustomerIds;
  eventTypes?: string[];
}

export interface ExportCustomerEventsResult {
  success: boolean;
  events: unknown[];
}

export interface ExportSingleCustomerInput {
  project: string;
  customerIds: CustomerIds;
  attributes?: Array<{ type: string; [key: string]: unknown }>;
}

export interface ExportSingleCustomerResult {
  success: boolean;
  customer: unknown;
}

export interface PreparedCustomerAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_CUSTOMER_ID_LENGTH = 500;
const MAX_SEARCH_QUERY_LENGTH = 500;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 1000;

export function validateCustomerId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Customer ID must not be empty.');
  }
  if (trimmed.length > MAX_CUSTOMER_ID_LENGTH) {
    throw new Error(
      `Customer ID must not exceed ${MAX_CUSTOMER_ID_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateCustomerIds(ids: CustomerIds): CustomerIds {
  const hasAtLeastOne = Object.values(ids).some(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );
  if (!hasAtLeastOne) {
    throw new Error('At least one customer identifier must be provided.');
  }
  const validated: CustomerIds = {};
  for (const [key, value] of Object.entries(ids)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      validated[key] = value.trim();
    }
  }
  return validated;
}

export function validateCustomerEventType(eventType: string): string {
  const trimmed = eventType.trim();
  if (trimmed.length === 0) {
    throw new Error('Event type must not be empty.');
  }
  if (trimmed.length > 256) {
    throw new Error(
      `Event type must not exceed 256 characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateCustomerBatchCommands(commands: CustomerBatchCommand[]): CustomerBatchCommand[] {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error('At least one batch command must be provided.');
  }
  if (commands.length > 50) {
    throw new Error(
      `Batch commands must not exceed 50 (got ${commands.length}).`,
    );
  }
  for (const cmd of commands) {
    if (typeof cmd.name !== 'string' || cmd.name.trim().length === 0) {
      throw new Error('Each batch command must have a non-empty name.');
    }
    if (
      typeof cmd.data !== 'object' ||
      cmd.data === null ||
      Array.isArray(cmd.data)
    ) {
      throw new Error('Each batch command must have a non-null data object.');
    }
  }
  return commands;
}

export function validateSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new Error('Search query must not be empty.');
  }
  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new Error(
      `Search query must not exceed ${MAX_SEARCH_QUERY_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateListLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Limit must be a positive integer.');
  }
  if (limit > MAX_LIST_LIMIT) {
    throw new Error(`Limit must not exceed ${MAX_LIST_LIMIT} (got ${limit}).`);
  }
  return limit;
}

export function validateListOffset(offset?: number): number {
  if (offset === undefined) {
    return 0;
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Offset must be a non-negative integer.');
  }
  return offset;
}

export function validateIdType(idType?: string): string {
  const trimmed = (idType ?? 'registered').trim();
  if (trimmed.length === 0) {
    throw new Error('ID type must not be empty.');
  }
  return trimmed;
}

export function validateProperties(
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

export function buildCustomersUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/crm/customers`;
}

export interface CustomerActionExecutor {
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

class CreateCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = CREATE_CUSTOMER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'CreateCustomerExecutor');
    const customerIds = payload.customerIds as CustomerIds;
    const properties = payload.properties as Record<string, unknown>;

    const path = buildTrackingPath(config, '/customers');
    const response = await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: customerIds,
        properties,
      },
    });

    return { success: true, response };
  }
}

class UpdateCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = UPDATE_CUSTOMER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'UpdateCustomerExecutor');
    const customerId = payload.customerId as string;
    const idType = (payload.idType as string | undefined) ?? 'registered';
    const properties = payload.properties as Record<string, unknown>;

    const path = buildTrackingPath(config, '/customers');
    const response = await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: { [idType]: customerId },
        properties,
      },
    });

    return { success: true, response };
  }
}

class DeleteCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = DELETE_CUSTOMER_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'DeleteCustomerExecutor');
    const customerId = payload.customerId as string;
    const idType = (payload.idType as string | undefined) ?? 'registered';

    const path = buildDataPath(config, '/customers/anonymize');
    const response = await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: { [idType]: customerId },
      },
    });

    return { success: true, response };
  }
}

class TrackEventExecutor implements CustomerActionExecutor {
  readonly actionType = CUSTOMER_TRACK_EVENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'TrackEventExecutor');
    const customerIds = payload.customerIds as CustomerIds;
    const eventType = payload.eventType as string;
    const timestamp = payload.timestamp as number | undefined;
    const properties = payload.properties as Record<string, unknown> | undefined;

    const path = buildTrackingPath(config, '/customers/events');
    const body: Record<string, unknown> = {
      customer_ids: customerIds,
      event_type: eventType,
    };
    if (timestamp !== undefined) body.timestamp = timestamp;
    if (properties !== undefined) body.properties = properties;

    const response = await bloomreachApiFetch(config, path, { body });
    return { success: true, response };
  }
}

class BatchCommandsExecutor implements CustomerActionExecutor {
  readonly actionType = BATCH_COMMANDS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'BatchCommandsExecutor');
    const commands = payload.commands as CustomerBatchCommand[];

    const path = buildTrackingPath(config, '/batch');
    const response = await bloomreachApiFetch(config, path, {
      body: { commands },
    });
    return { success: true, response };
  }
}

export function createCustomerActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, CustomerActionExecutor> {
  return {
    [CREATE_CUSTOMER_ACTION_TYPE]: new CreateCustomerExecutor(apiConfig),
    [UPDATE_CUSTOMER_ACTION_TYPE]: new UpdateCustomerExecutor(apiConfig),
    [DELETE_CUSTOMER_ACTION_TYPE]: new DeleteCustomerExecutor(apiConfig),
    [CUSTOMER_TRACK_EVENT_ACTION_TYPE]: new TrackEventExecutor(apiConfig),
    [BATCH_COMMANDS_ACTION_TYPE]: new BatchCommandsExecutor(apiConfig),
  };
}

interface ExportResponseRow {
  [key: string]: unknown;
}

function parseExportedCustomer(row: ExportResponseRow): BloomreachCustomer {
  const customerIds: CustomerIds = {};
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (key === 'registered' || key === 'cookie' || key === 'email_id') {
      const idKey = key === 'email_id' ? 'email' : key;
      customerIds[idKey] = typeof value === 'string' ? value : String(value ?? '');
    } else {
      properties[key] = value;
    }
  }

  return {
    customerIds,
    properties,
    url: '',
  };
}

export class BloomreachCustomersService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildCustomersUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get customersUrl(): string {
    return this.baseUrl;
  }

  async listCustomers(input?: ListCustomersInput): Promise<BloomreachCustomer[]> {
    if (input !== undefined) {
      validateProject(input.project);
      validateListLimit(input.limit);
      validateListOffset(input.offset);
    }

    const config = requireApiConfig(this.apiConfig, 'listCustomers');
    const path = buildDataPath(config, '/customers/export');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        format: 'table_json',
        attributes: { type: 'properties_and_ids' },
      },
    });

    const rows = Array.isArray(response) ? response : [];
    const limit = input?.limit ?? DEFAULT_LIST_LIMIT;
    const offset = input?.offset ?? 0;

    return rows
      .slice(offset, offset + limit)
      .map((row: ExportResponseRow) => parseExportedCustomer(row));
  }

  async searchCustomers(input: SearchCustomersInput): Promise<BloomreachCustomer[]> {
    validateProject(input.project);
    validateSearchQuery(input.query);
    validateListLimit(input.limit);
    validateListOffset(input.offset);

    const config = requireApiConfig(this.apiConfig, 'searchCustomers');
    const path = buildDataPath(config, '/customers/attributes');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: { registered: input.query },
        attributes: [
          { type: 'property', property: 'first_name' },
          { type: 'property', property: 'last_name' },
          { type: 'property', property: 'email' },
          { type: 'id', id: 'registered' },
          { type: 'id', id: 'cookie' },
        ],
      },
    });

    const data = response as Record<string, unknown>;
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    const results = data.results as Array<{ success: boolean; value: unknown }>;
    const properties: Record<string, unknown> = {};
    const customerIds: CustomerIds = {};
    const attrNames = ['first_name', 'last_name', 'email', 'registered', 'cookie'];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.success && result.value !== undefined && result.value !== null) {
        const name = attrNames[i];
        if (name === 'registered' || name === 'cookie') {
          customerIds[name] = String(result.value);
        } else {
          properties[name] = result.value;
        }
      }
    }

    if (Object.keys(customerIds).length === 0 && Object.keys(properties).length === 0) {
      return [];
    }

    return [
      {
        customerIds,
        properties,
        url: '',
      },
    ];
  }

  async viewCustomer(input: ViewCustomerInput): Promise<CustomerProfile> {
    validateProject(input.project);
    validateCustomerId(input.customerId);
    const idType = validateIdType(input.idType);

    const config = requireApiConfig(this.apiConfig, 'viewCustomer');
    const path = buildDataPath(config, '/customers/attributes');

    const response = await bloomreachApiFetch(config, path, {
      body: {
        customer_ids: { [idType]: input.customerId },
        attributes: [
          { type: 'property', property: 'first_name' },
          { type: 'property', property: 'last_name' },
          { type: 'property', property: 'email' },
          { type: 'property', property: 'phone' },
          { type: 'id', id: 'registered' },
          { type: 'id', id: 'cookie' },
        ],
      },
    });

    const data = response as Record<string, unknown>;
    const results = (data.results ?? []) as Array<{ success: boolean; value: unknown }>;

    const getValue = (index: number): string | undefined => {
      const r = results[index];
      if (r?.success && r.value !== undefined && r.value !== null) {
        return String(r.value);
      }
      return undefined;
    };

    const customerIds: CustomerIds = { [idType]: input.customerId };
    const registeredVal = getValue(4);
    if (registeredVal) customerIds.registered = registeredVal;
    const cookieVal = getValue(5);
    if (cookieVal) customerIds.cookie = cookieVal;

    return {
      customerIds,
      properties: {
        first_name: getValue(0),
        last_name: getValue(1),
        email: getValue(2),
        phone: getValue(3),
      },
      url: '',
      firstName: getValue(0),
      lastName: getValue(1),
      email: getValue(2),
      phone: getValue(3),
      events: [],
      segments: [],
    };
  }

  prepareCreateCustomer(input: CreateCustomerInput): PreparedCustomerAction {
    const project = validateProject(input.project);
    const customerIds = validateCustomerIds(input.customerIds);
    const properties = validateProperties(input.properties);

    const preview = {
      action: CREATE_CUSTOMER_ACTION_TYPE,
      project,
      customerIds,
      properties,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateCustomer(input: UpdateCustomerInput): PreparedCustomerAction {
    const project = validateProject(input.project);
    const customerId = validateCustomerId(input.customerId);
    const idType = validateIdType(input.idType);
    const properties = validateProperties(input.properties);

    const preview = {
      action: UPDATE_CUSTOMER_ACTION_TYPE,
      project,
      customerId,
      idType,
      properties,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteCustomer(input: DeleteCustomerInput): PreparedCustomerAction {
    const project = validateProject(input.project);
    const customerId = validateCustomerId(input.customerId);
    const idType = validateIdType(input.idType);

    const preview = {
      action: DELETE_CUSTOMER_ACTION_TYPE,
      project,
      customerId,
      idType,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  async trackEvent(input: CustomerTrackEventInput): Promise<TrackEventResult> {
    validateProject(input.project);
    validateCustomerIds(input.customerIds);
    validateCustomerEventType(input.eventType);

    const config = requireApiConfig(this.apiConfig, 'trackEvent');
    const path = buildTrackingPath(config, '/customers/events');
    const body: Record<string, unknown> = {
      customer_ids: input.customerIds,
      event_type: input.eventType,
    };
    if (input.timestamp !== undefined) {
      body.timestamp = input.timestamp;
    }
    if (input.properties !== undefined) {
      body.properties = input.properties;
    }
    const response = await bloomreachApiFetch(config, path, { body });
    return { success: true, response };
  }

  async trackBatchCommands(input: BatchCommandInput): Promise<CustomerBatchCommandResult> {
    validateProject(input.project);
    validateCustomerBatchCommands(input.commands);

    const config = requireApiConfig(this.apiConfig, 'trackBatchCommands');
    const path = buildTrackingPath(config, '/batch');
    const response = await bloomreachApiFetch(config, path, {
      body: { commands: input.commands },
    });
    return { success: true, response };
  }

  async exportCustomerEvents(
    input: ExportCustomerEventsInput,
  ): Promise<ExportCustomerEventsResult> {
    validateProject(input.project);
    validateCustomerIds(input.customerIds);

    const config = requireApiConfig(this.apiConfig, 'exportCustomerEvents');
    const path = buildDataPath(config, '/customers/events');
    const body: Record<string, unknown> = {
      customer_ids: input.customerIds,
    };
    if (input.eventTypes !== undefined && input.eventTypes.length > 0) {
      body.event_types = input.eventTypes;
    }
    const response = await bloomreachApiFetch(config, path, { body });
    const events = Array.isArray(response) ? response : [];
    return { success: true, events };
  }

  async exportSingleCustomer(
    input: ExportSingleCustomerInput,
  ): Promise<ExportSingleCustomerResult> {
    validateProject(input.project);
    validateCustomerIds(input.customerIds);

    const config = requireApiConfig(this.apiConfig, 'exportSingleCustomer');
    const path = buildDataPath(config, '/customers/export-one');
    const body: Record<string, unknown> = {
      customer_ids: input.customerIds,
    };
    if (input.attributes !== undefined && input.attributes.length > 0) {
      body.attributes = input.attributes;
    }
    const response = await bloomreachApiFetch(config, path, { body });
    return { success: true, customer: response };
  }
}
