import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError } from './errors.js';
import {
  bloomreachApiFetch,
  buildDataPath,
} from './bloomreachApiClient.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const ADD_CUSTOMER_PROPERTY_ACTION_TYPE = 'dataManager.add_customer_property';
export const EDIT_CUSTOMER_PROPERTY_ACTION_TYPE = 'dataManager.edit_customer_property';
export const ADD_EVENT_DEFINITION_ACTION_TYPE = 'dataManager.add_event_definition';
export const ADD_FIELD_DEFINITION_ACTION_TYPE = 'dataManager.add_field_definition';
export const EDIT_FIELD_DEFINITION_ACTION_TYPE = 'dataManager.edit_field_definition';
export const CONFIGURE_MAPPING_ACTION_TYPE = 'dataManager.configure_mapping';
export const ADD_CONTENT_SOURCE_ACTION_TYPE = 'dataManager.add_content_source';
export const EDIT_CONTENT_SOURCE_ACTION_TYPE = 'dataManager.edit_content_source';
export const SAVE_CHANGES_ACTION_TYPE = 'dataManager.save_changes';

export const DATA_MANAGER_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const DATA_MANAGER_ADD_PROPERTY_RATE_LIMIT = 50;
export const DATA_MANAGER_EDIT_PROPERTY_RATE_LIMIT = 100;
export const DATA_MANAGER_ADD_EVENT_RATE_LIMIT = 50;
export const DATA_MANAGER_ADD_DEFINITION_RATE_LIMIT = 50;
export const DATA_MANAGER_CONFIGURE_MAPPING_RATE_LIMIT = 20;
export const DATA_MANAGER_CONTENT_SOURCE_RATE_LIMIT = 20;
export const DATA_MANAGER_SAVE_RATE_LIMIT = 30;

export interface CustomerProperty {
  name: string;
  type: string;
  description?: string;
  group?: string;
  isRequired?: boolean;
  url: string;
}

export interface EventPropertyDefinition {
  name: string;
  type: string;
  description?: string;
  isRequired?: boolean;
}

export interface EventDefinition {
  name: string;
  type: string;
  description?: string;
  properties: EventPropertyDefinition[];
  url: string;
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  url: string;
}

export interface DataMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformationType?: string;
  isActive: boolean;
  url: string;
}

export interface ContentSource {
  id: string;
  name: string;
  sourceType: string;
  url: string;
  status: string;
  configuration: Record<string, unknown>;
  lastSyncedAt?: string;
  contentSourceUrl: string;
}

export interface ListCustomerPropertiesInput {
  project: string;
}

export interface AddCustomerPropertyInput {
  project: string;
  name: string;
  type: string;
  description?: string;
  group?: string;
  isRequired?: boolean;
  operatorNote?: string;
}

export interface EditCustomerPropertyInput {
  project: string;
  propertyName: string;
  description?: string;
  type?: string;
  group?: string;
  operatorNote?: string;
}

export interface ListEventsInput {
  project: string;
}

export interface AddEventDefinitionInput {
  project: string;
  name: string;
  type: string;
  description?: string;
  properties?: EventPropertyDefinition[];
  operatorNote?: string;
}

export interface ListFieldDefinitionsInput {
  project: string;
}

export interface AddFieldDefinitionInput {
  project: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  operatorNote?: string;
}

export interface EditFieldDefinitionInput {
  project: string;
  definitionId: string;
  name?: string;
  type?: string;
  description?: string;
  category?: string;
  operatorNote?: string;
}

export interface ListMappingsInput {
  project: string;
}

export interface ConfigureMappingInput {
  project: string;
  sourceField: string;
  targetField: string;
  transformationType?: string;
  isActive?: boolean;
  operatorNote?: string;
}

export interface ListContentSourcesInput {
  project: string;
}

export interface AddContentSourceInput {
  project: string;
  name: string;
  sourceType: string;
  url: string;
  configuration?: Record<string, unknown>;
  operatorNote?: string;
}

export interface EditContentSourceInput {
  project: string;
  sourceId: string;
  name?: string;
  url?: string;
  configuration?: Record<string, unknown>;
  operatorNote?: string;
}

export interface SaveChangesInput {
  project: string;
  operatorNote?: string;
}

export interface PreparedDataManagerAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export interface ConsentCategory {
  id: string;
  name: string;
  description?: string;
  legitimateInterest?: boolean;
}

export interface ListConsentCategoriesInput {
  project: string;
}

export interface ListConsentCategoriesResult {
  success: boolean;
  categories: ConsentCategory[];
}

const MAX_PROPERTY_NAME_LENGTH = 200;
const MAX_EVENT_NAME_LENGTH = 200;
const MAX_DEFINITION_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_FIELD_NAME_LENGTH = 200;
const MAX_URL_LENGTH = 2000;
const MAX_SOURCE_NAME_LENGTH = 200;

const PROPERTY_TYPES = new Set(['string', 'number', 'boolean', 'date', 'list', 'json']);
const SOURCE_TYPES = new Set(['api', 'csv', 'webhook', 'database', 'sftp']);
const TRANSFORMATION_TYPES = new Set([
  'direct',
  'concatenate',
  'split',
  'format',
  'lookup',
]);

function validateRequiredTrimmed(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${fieldName} must not be empty.`);
  }
  return trimmed;
}

function validatePropertyName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Property name');
  if (trimmed.length > MAX_PROPERTY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Property name must not exceed ${MAX_PROPERTY_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateEventName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Event name');
  if (trimmed.length > MAX_EVENT_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Event name must not exceed ${MAX_EVENT_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateDefinitionName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Definition name');
  if (trimmed.length > MAX_DEFINITION_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Definition name must not exceed ${MAX_DEFINITION_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateDescription(description: string): string {
  const trimmed = validateRequiredTrimmed(description, 'Description');
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validatePropertyType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Property type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Property type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateEventType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Event type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Event type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateFieldType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Field type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Field type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateSourceType(sourceType: string): string {
  const normalized = validateRequiredTrimmed(sourceType, 'Source type').toLowerCase();
  if (!SOURCE_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source type must be one of: ${Array.from(SOURCE_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateSourceUrl(url: string): string {
  const trimmed = validateRequiredTrimmed(url, 'Source URL');
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source URL must not exceed ${MAX_URL_LENGTH} characters (got ${trimmed.length}).`);
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/.+/.test(trimmed)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Source URL must be a valid absolute URL.');
  }

  return trimmed;
}

function validateSourceName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Source name');
  if (trimmed.length > MAX_SOURCE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source name must not exceed ${MAX_SOURCE_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateDefinitionId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Definition ID');
  if (trimmed.length > MAX_FIELD_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Definition ID must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateSourceId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Source ID');
  if (trimmed.length > MAX_FIELD_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source ID must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

function validateMappingFields(
  sourceField: string,
  targetField: string,
): { sourceField: string; targetField: string } {
  const validatedSourceField = validateRequiredTrimmed(sourceField, 'Source field');
  if (validatedSourceField.length > MAX_FIELD_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Source field must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${validatedSourceField.length}).`);
  }

  const validatedTargetField = validateRequiredTrimmed(targetField, 'Target field');
  if (validatedTargetField.length > MAX_FIELD_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Target field must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${validatedTargetField.length}).`);
  }

  return {
    sourceField: validatedSourceField,
    targetField: validatedTargetField,
  };
}

function validateTransformationType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Transformation type').toLowerCase();
  if (!TRANSFORMATION_TYPES.has(normalized)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Transformation type must be one of: ${Array.from(TRANSFORMATION_TYPES).join(', ')} (got ${normalized}).`);
  }
  return normalized;
}

function validateOptionalString(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = validateRequiredTrimmed(value, fieldName);
  if (trimmed.length > maxLength) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${fieldName} must not exceed ${maxLength} characters (got ${trimmed.length}).`);
  }

  return trimmed;
}

function validateConfiguration(
  configuration: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (configuration === undefined) {
    return undefined;
  }

  if (
    typeof configuration !== 'object' ||
    configuration === null ||
    Array.isArray(configuration)
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Configuration must be a non-null object.');
  }

  return configuration;
}

function validateEventProperties(
  properties: EventPropertyDefinition[] | undefined,
): EventPropertyDefinition[] {
  if (properties === undefined) {
    return [];
  }

  return properties.map((property, index) => {
    const name = validatePropertyName(property.name);
    const type = validatePropertyType(property.type);
    const description =
      property.description === undefined
        ? undefined
        : validateDescription(property.description);

    if (
      property.isRequired !== undefined &&
      typeof property.isRequired !== 'boolean'
    ) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Event property #${index + 1} isRequired must be a boolean.`);
    }

    return {
      name,
      type,
      description,
      isRequired: property.isRequired,
    };
  });
}

function createPreparedAction(preview: Record<string, unknown>): PreparedDataManagerAction {
  return {
    preparedActionId: `pa_${Date.now()}`,
    confirmToken: `ct_stub_${Date.now()}`,
    expiresAtMs: Date.now() + 30 * 60 * 1000,
    preview,
  };
}

export function buildCustomerPropertiesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/management/customer-properties`;
}

export function buildEventsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/management/events`;
}

export function buildDefinitionsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/management/definitions`;
}

export function buildMappingUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/management/mapping`;
}

export function buildContentSourcesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/management/content-sources`;
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

export interface DataManagerActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class AddCustomerPropertyExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_CUSTOMER_PROPERTY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'AddCustomerPropertyExecutor: not yet implemented. ' +
      'Customer property addition is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class EditCustomerPropertyExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_CUSTOMER_PROPERTY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EditCustomerPropertyExecutor: not yet implemented. ' +
      'Customer property editing is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class AddEventDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_EVENT_DEFINITION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'AddEventDefinitionExecutor: not yet implemented. ' +
      'Event definition creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class AddFieldDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_FIELD_DEFINITION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'AddFieldDefinitionExecutor: not yet implemented. ' +
      'Field definition creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class EditFieldDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_FIELD_DEFINITION_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EditFieldDefinitionExecutor: not yet implemented. ' +
      'Field definition editing is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class ConfigureMappingExecutor implements DataManagerActionExecutor {
  readonly actionType = CONFIGURE_MAPPING_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ConfigureMappingExecutor: not yet implemented. ' +
      'Mapping configuration is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class AddContentSourceExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_CONTENT_SOURCE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'AddContentSourceExecutor: not yet implemented. ' +
      'Content source addition is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class EditContentSourceExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_CONTENT_SOURCE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EditContentSourceExecutor: not yet implemented. ' +
      'Content source editing is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class SaveChangesExecutor implements DataManagerActionExecutor {
  readonly actionType = SAVE_CHANGES_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'SaveChangesExecutor: not yet implemented. ' +
      'Saving data manager changes is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createDataManagerActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<
  string,
  DataManagerActionExecutor
> {
  return {
    [ADD_CUSTOMER_PROPERTY_ACTION_TYPE]: new AddCustomerPropertyExecutor(apiConfig),
    [EDIT_CUSTOMER_PROPERTY_ACTION_TYPE]: new EditCustomerPropertyExecutor(apiConfig),
    [ADD_EVENT_DEFINITION_ACTION_TYPE]: new AddEventDefinitionExecutor(apiConfig),
    [ADD_FIELD_DEFINITION_ACTION_TYPE]: new AddFieldDefinitionExecutor(apiConfig),
    [EDIT_FIELD_DEFINITION_ACTION_TYPE]: new EditFieldDefinitionExecutor(apiConfig),
    [CONFIGURE_MAPPING_ACTION_TYPE]: new ConfigureMappingExecutor(apiConfig),
    [ADD_CONTENT_SOURCE_ACTION_TYPE]: new AddContentSourceExecutor(apiConfig),
    [EDIT_CONTENT_SOURCE_ACTION_TYPE]: new EditContentSourceExecutor(apiConfig),
    [SAVE_CHANGES_ACTION_TYPE]: new SaveChangesExecutor(apiConfig),
  };
}

export class BloomreachDataManagerService {
  private readonly customerPropertiesBaseUrl: string;
  private readonly eventsBaseUrl: string;
  private readonly definitionsBaseUrl: string;
  private readonly mappingBaseUrl: string;
  private readonly contentSourcesBaseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validatedProject = validateProject(project);
    this.customerPropertiesBaseUrl = buildCustomerPropertiesUrl(validatedProject);
    this.eventsBaseUrl = buildEventsUrl(validatedProject);
    this.definitionsBaseUrl = buildDefinitionsUrl(validatedProject);
    this.mappingBaseUrl = buildMappingUrl(validatedProject);
    this.contentSourcesBaseUrl = buildContentSourcesUrl(validatedProject);
    this.apiConfig = apiConfig;
  }

  get customerPropertiesUrl(): string {
    return this.customerPropertiesBaseUrl;
  }

  get eventsUrl(): string {
    return this.eventsBaseUrl;
  }

  get definitionsUrl(): string {
    return this.definitionsBaseUrl;
  }

  get mappingUrl(): string {
    return this.mappingBaseUrl;
  }

  get contentSourcesUrl(): string {
    return this.contentSourcesBaseUrl;
  }

  /**
   * List consent categories via the Bloomreach Data API.
   * This is a real REST API endpoint.
   */
  async listConsentCategories(
    input: ListConsentCategoriesInput,
  ): Promise<ListConsentCategoriesResult> {
    validateProject(input.project);

    const config = requireApiConfig(this.apiConfig, 'listConsentCategories');
    const path = buildDataPath(config, '/consent/categories');
    const response = await bloomreachApiFetch(config, path, {
      method: 'GET',
    });
    const items = Array.isArray(response) ? response : [];
    const categories: ConsentCategory[] = items.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      description: typeof item.description === 'string' ? item.description : undefined,
      legitimateInterest: typeof item.legitimate_interest === 'boolean' ? item.legitimate_interest : undefined,
    }));
    return { success: true, categories };
  }

  async listCustomerProperties(
    input?: ListCustomerPropertiesInput,
  ): Promise<CustomerProperty[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listCustomerProperties: the Bloomreach API does not provide an endpoint for customer properties. ' +
      'Customer property data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Data & Assets > Data Manager in your project).');
  }

  async listEvents(input?: ListEventsInput): Promise<EventDefinition[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listEvents: the Bloomreach API does not provide an endpoint for event definitions. ' +
      'Event definition data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Data & Assets > Data Manager > Events in your project).');
  }

  async listFieldDefinitions(
    input?: ListFieldDefinitionsInput,
  ): Promise<FieldDefinition[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listFieldDefinitions: the Bloomreach API does not provide an endpoint for field definitions. ' +
      'Field definition data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Data & Assets > Data Manager > Definitions in your project).');
  }

  async listMappings(input?: ListMappingsInput): Promise<DataMapping[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listMappings: the Bloomreach API does not provide an endpoint for data mappings. ' +
      'Data mapping information must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Data & Assets > Data Manager > Mapping in your project).');
  }

  async listContentSources(
    input?: ListContentSourcesInput,
  ): Promise<ContentSource[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listContentSources: the Bloomreach API does not provide an endpoint for content sources. ' +
      'Content source data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Data & Assets > Data Manager > Content Sources in your project).');
  }

  prepareAddCustomerProperty(
    input: AddCustomerPropertyInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const name = validatePropertyName(input.name);
    const type = validatePropertyType(input.type);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const group = validateOptionalString(input.group, 'Group', MAX_PROPERTY_NAME_LENGTH);
    const isRequired = input.isRequired ?? false;

    const preview = {
      action: ADD_CUSTOMER_PROPERTY_ACTION_TYPE,
      project,
      name,
      type,
      description,
      group,
      isRequired,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareEditCustomerProperty(
    input: EditCustomerPropertyInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const propertyName = validatePropertyName(input.propertyName);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const type =
      input.type === undefined
        ? undefined
        : validatePropertyType(input.type);
    const group = validateOptionalString(input.group, 'Group', MAX_PROPERTY_NAME_LENGTH);

    const preview = {
      action: EDIT_CUSTOMER_PROPERTY_ACTION_TYPE,
      project,
      propertyName,
      description,
      type,
      group,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareAddEventDefinition(
    input: AddEventDefinitionInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const name = validateEventName(input.name);
    const type = validateEventType(input.type);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const properties = validateEventProperties(input.properties);

    const preview = {
      action: ADD_EVENT_DEFINITION_ACTION_TYPE,
      project,
      name,
      type,
      description,
      properties,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareAddFieldDefinition(
    input: AddFieldDefinitionInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const name = validateDefinitionName(input.name);
    const type = validateFieldType(input.type);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const category = validateOptionalString(input.category, 'Category', MAX_DEFINITION_NAME_LENGTH);

    const preview = {
      action: ADD_FIELD_DEFINITION_ACTION_TYPE,
      project,
      name,
      type,
      description,
      category,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareEditFieldDefinition(
    input: EditFieldDefinitionInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const definitionId = validateDefinitionId(input.definitionId);
    const name =
      input.name === undefined
        ? undefined
        : validateDefinitionName(input.name);
    const type =
      input.type === undefined
        ? undefined
        : validateFieldType(input.type);
    const description =
      input.description === undefined
        ? undefined
        : validateDescription(input.description);
    const category = validateOptionalString(input.category, 'Category', MAX_DEFINITION_NAME_LENGTH);

    const preview = {
      action: EDIT_FIELD_DEFINITION_ACTION_TYPE,
      project,
      definitionId,
      name,
      type,
      description,
      category,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareConfigureMapping(input: ConfigureMappingInput): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const mappingFields = validateMappingFields(input.sourceField, input.targetField);
    const transformationType =
      input.transformationType === undefined
        ? undefined
        : validateTransformationType(input.transformationType);
    const isActive = input.isActive ?? true;

    const preview = {
      action: CONFIGURE_MAPPING_ACTION_TYPE,
      project,
      ...mappingFields,
      transformationType,
      isActive,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareAddContentSource(
    input: AddContentSourceInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const name = validateSourceName(input.name);
    const sourceType = validateSourceType(input.sourceType);
    const url = validateSourceUrl(input.url);
    const configuration = validateConfiguration(input.configuration) ?? {};

    const preview = {
      action: ADD_CONTENT_SOURCE_ACTION_TYPE,
      project,
      name,
      sourceType,
      url,
      configuration,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareEditContentSource(
    input: EditContentSourceInput,
  ): PreparedDataManagerAction {
    const project = validateProject(input.project);
    const sourceId = validateSourceId(input.sourceId);
    const name =
      input.name === undefined
        ? undefined
        : validateSourceName(input.name);
    const url =
      input.url === undefined
        ? undefined
        : validateSourceUrl(input.url);
    const configuration = validateConfiguration(input.configuration);

    const preview = {
      action: EDIT_CONTENT_SOURCE_ACTION_TYPE,
      project,
      sourceId,
      name,
      url,
      configuration,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }

  prepareSaveChanges(input: SaveChangesInput): PreparedDataManagerAction {
    const project = validateProject(input.project);

    const preview = {
      action: SAVE_CHANGES_ACTION_TYPE,
      project,
      operatorNote: input.operatorNote,
    };

    return createPreparedAction(preview);
  }
}
