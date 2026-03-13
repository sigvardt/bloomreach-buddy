import { validateProject } from './bloomreachDashboards.js';

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
    throw new Error(`${fieldName} must not be empty.`);
  }
  return trimmed;
}

function validatePropertyName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Property name');
  if (trimmed.length > MAX_PROPERTY_NAME_LENGTH) {
    throw new Error(
      `Property name must not exceed ${MAX_PROPERTY_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateEventName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Event name');
  if (trimmed.length > MAX_EVENT_NAME_LENGTH) {
    throw new Error(
      `Event name must not exceed ${MAX_EVENT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateDefinitionName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Definition name');
  if (trimmed.length > MAX_DEFINITION_NAME_LENGTH) {
    throw new Error(
      `Definition name must not exceed ${MAX_DEFINITION_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateDescription(description: string): string {
  const trimmed = validateRequiredTrimmed(description, 'Description');
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validatePropertyType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Property type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new Error(
      `Property type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateEventType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Event type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new Error(
      `Event type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateFieldType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Field type').toLowerCase();
  if (!PROPERTY_TYPES.has(normalized)) {
    throw new Error(
      `Field type must be one of: ${Array.from(PROPERTY_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateSourceType(sourceType: string): string {
  const normalized = validateRequiredTrimmed(sourceType, 'Source type').toLowerCase();
  if (!SOURCE_TYPES.has(normalized)) {
    throw new Error(
      `Source type must be one of: ${Array.from(SOURCE_TYPES).join(', ')} (got ${normalized}).`,
    );
  }
  return normalized;
}

function validateSourceUrl(url: string): string {
  const trimmed = validateRequiredTrimmed(url, 'Source URL');
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error(`Source URL must not exceed ${MAX_URL_LENGTH} characters (got ${trimmed.length}).`);
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/.+/.test(trimmed)) {
    throw new Error('Source URL must be a valid absolute URL.');
  }

  return trimmed;
}

function validateSourceName(name: string): string {
  const trimmed = validateRequiredTrimmed(name, 'Source name');
  if (trimmed.length > MAX_SOURCE_NAME_LENGTH) {
    throw new Error(
      `Source name must not exceed ${MAX_SOURCE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateDefinitionId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Definition ID');
  if (trimmed.length > MAX_FIELD_NAME_LENGTH) {
    throw new Error(
      `Definition ID must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateSourceId(id: string): string {
  const trimmed = validateRequiredTrimmed(id, 'Source ID');
  if (trimmed.length > MAX_FIELD_NAME_LENGTH) {
    throw new Error(
      `Source ID must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

function validateMappingFields(
  sourceField: string,
  targetField: string,
): { sourceField: string; targetField: string } {
  const validatedSourceField = validateRequiredTrimmed(sourceField, 'Source field');
  if (validatedSourceField.length > MAX_FIELD_NAME_LENGTH) {
    throw new Error(
      `Source field must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${validatedSourceField.length}).`,
    );
  }

  const validatedTargetField = validateRequiredTrimmed(targetField, 'Target field');
  if (validatedTargetField.length > MAX_FIELD_NAME_LENGTH) {
    throw new Error(
      `Target field must not exceed ${MAX_FIELD_NAME_LENGTH} characters (got ${validatedTargetField.length}).`,
    );
  }

  return {
    sourceField: validatedSourceField,
    targetField: validatedTargetField,
  };
}

function validateTransformationType(type: string): string {
  const normalized = validateRequiredTrimmed(type, 'Transformation type').toLowerCase();
  if (!TRANSFORMATION_TYPES.has(normalized)) {
    throw new Error(
      `Transformation type must be one of: ${Array.from(TRANSFORMATION_TYPES).join(', ')} (got ${normalized}).`,
    );
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
    throw new Error(`${fieldName} must not exceed ${maxLength} characters (got ${trimmed.length}).`);
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
    throw new Error('Configuration must be a non-null object.');
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
      throw new Error(`Event property #${index + 1} isRequired must be a boolean.`);
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

export interface DataManagerActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class AddCustomerPropertyExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_CUSTOMER_PROPERTY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'AddCustomerPropertyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class EditCustomerPropertyExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_CUSTOMER_PROPERTY_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'EditCustomerPropertyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class AddEventDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_EVENT_DEFINITION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'AddEventDefinitionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class AddFieldDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_FIELD_DEFINITION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'AddFieldDefinitionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class EditFieldDefinitionExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_FIELD_DEFINITION_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'EditFieldDefinitionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureMappingExecutor implements DataManagerActionExecutor {
  readonly actionType = CONFIGURE_MAPPING_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureMappingExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class AddContentSourceExecutor implements DataManagerActionExecutor {
  readonly actionType = ADD_CONTENT_SOURCE_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'AddContentSourceExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class EditContentSourceExecutor implements DataManagerActionExecutor {
  readonly actionType = EDIT_CONTENT_SOURCE_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'EditContentSourceExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class SaveChangesExecutor implements DataManagerActionExecutor {
  readonly actionType = SAVE_CHANGES_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'SaveChangesExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createDataManagerActionExecutors(): Record<
  string,
  DataManagerActionExecutor
> {
  return {
    [ADD_CUSTOMER_PROPERTY_ACTION_TYPE]: new AddCustomerPropertyExecutor(),
    [EDIT_CUSTOMER_PROPERTY_ACTION_TYPE]: new EditCustomerPropertyExecutor(),
    [ADD_EVENT_DEFINITION_ACTION_TYPE]: new AddEventDefinitionExecutor(),
    [ADD_FIELD_DEFINITION_ACTION_TYPE]: new AddFieldDefinitionExecutor(),
    [EDIT_FIELD_DEFINITION_ACTION_TYPE]: new EditFieldDefinitionExecutor(),
    [CONFIGURE_MAPPING_ACTION_TYPE]: new ConfigureMappingExecutor(),
    [ADD_CONTENT_SOURCE_ACTION_TYPE]: new AddContentSourceExecutor(),
    [EDIT_CONTENT_SOURCE_ACTION_TYPE]: new EditContentSourceExecutor(),
    [SAVE_CHANGES_ACTION_TYPE]: new SaveChangesExecutor(),
  };
}

export class BloomreachDataManagerService {
  private readonly customerPropertiesBaseUrl: string;
  private readonly eventsBaseUrl: string;
  private readonly definitionsBaseUrl: string;
  private readonly mappingBaseUrl: string;
  private readonly contentSourcesBaseUrl: string;

  constructor(project: string) {
    const validatedProject = validateProject(project);
    this.customerPropertiesBaseUrl = buildCustomerPropertiesUrl(validatedProject);
    this.eventsBaseUrl = buildEventsUrl(validatedProject);
    this.definitionsBaseUrl = buildDefinitionsUrl(validatedProject);
    this.mappingBaseUrl = buildMappingUrl(validatedProject);
    this.contentSourcesBaseUrl = buildContentSourcesUrl(validatedProject);
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

  async listCustomerProperties(
    input?: ListCustomerPropertiesInput,
  ): Promise<CustomerProperty[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listCustomerProperties: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listEvents(input?: ListEventsInput): Promise<EventDefinition[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listEvents: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listFieldDefinitions(
    input?: ListFieldDefinitionsInput,
  ): Promise<FieldDefinition[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listFieldDefinitions: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listMappings(input?: ListMappingsInput): Promise<DataMapping[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listMappings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listContentSources(
    input?: ListContentSourcesInput,
  ): Promise<ContentSource[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listContentSources: not yet implemented. Requires browser automation infrastructure.',
    );
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
