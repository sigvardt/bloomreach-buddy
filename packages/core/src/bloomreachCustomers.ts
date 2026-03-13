import { validateProject } from './bloomreachDashboards.js';

export const CREATE_CUSTOMER_ACTION_TYPE = 'customers.create_customer';
export const UPDATE_CUSTOMER_ACTION_TYPE = 'customers.update_customer';
export const DELETE_CUSTOMER_ACTION_TYPE = 'customers.delete_customer';

/** Rate limit window for customer operations (1 hour in ms). */
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

class CreateCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = CREATE_CUSTOMER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateCustomerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = UPDATE_CUSTOMER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateCustomerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteCustomerExecutor implements CustomerActionExecutor {
  readonly actionType = DELETE_CUSTOMER_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteCustomerExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createCustomerActionExecutors(): Record<
  string,
  CustomerActionExecutor
> {
  return {
    [CREATE_CUSTOMER_ACTION_TYPE]: new CreateCustomerExecutor(),
    [UPDATE_CUSTOMER_ACTION_TYPE]: new UpdateCustomerExecutor(),
    [DELETE_CUSTOMER_ACTION_TYPE]: new DeleteCustomerExecutor(),
  };
}

export class BloomreachCustomersService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildCustomersUrl(validateProject(project));
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

    throw new Error(
      'listCustomers: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async searchCustomers(input: SearchCustomersInput): Promise<BloomreachCustomer[]> {
    validateProject(input.project);
    validateSearchQuery(input.query);
    validateListLimit(input.limit);
    validateListOffset(input.offset);

    throw new Error(
      'searchCustomers: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewCustomer(input: ViewCustomerInput): Promise<CustomerProfile> {
    validateProject(input.project);
    validateCustomerId(input.customerId);
    validateIdType(input.idType);

    throw new Error(
      'viewCustomer: not yet implemented. Requires browser automation infrastructure.',
    );
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
}
