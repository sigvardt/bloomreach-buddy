import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

/** Action type for creating a managed tag. */
export const CREATE_TAG_ACTION_TYPE = 'tag_manager.create_tag';
/** Action type for enabling a managed tag. */
export const ENABLE_TAG_ACTION_TYPE = 'tag_manager.enable_tag';
/** Action type for disabling a managed tag. */
export const DISABLE_TAG_ACTION_TYPE = 'tag_manager.disable_tag';
/** Action type for editing a managed tag. */
export const EDIT_TAG_ACTION_TYPE = 'tag_manager.edit_tag';
/** Action type for deleting a managed tag. */
export const DELETE_TAG_ACTION_TYPE = 'tag_manager.delete_tag';

/** Rate limit window for tag manager operations (1 hour in ms). */
export const TAG_MANAGER_RATE_LIMIT_WINDOW_MS = 3_600_000;
/** Maximum tag creations per rate limit window. */
export const TAG_CREATE_RATE_LIMIT = 10;
/** Maximum tag modifications per rate limit window. */
export const TAG_MODIFY_RATE_LIMIT = 20;
/** Maximum tag deletions per rate limit window. */
export const TAG_DELETE_RATE_LIMIT = 10;

/** Allowed managed tag statuses. */
export const TAG_STATUSES = ['enabled', 'disabled'] as const;
/** Union type of allowed managed tag statuses. */
export type TagStatus = (typeof TAG_STATUSES)[number];

/** Trigger conditions used to determine when a managed tag should run. */
export interface TagTriggerConditions {
  /** URL pattern for page matching (glob or regex). */
  pageUrl?: string;
  /** Event names that trigger the tag. */
  events?: string[];
  /** Customer attribute conditions (key-value pairs). */
  customerAttributes?: Record<string, string>;
}

/** Managed tag metadata as represented in Bloomreach. */
export interface BloomreachManagedTag {
  id: string;
  name: string;
  status: TagStatus;
  jsCode: string;
  triggerConditions?: TagTriggerConditions;
  /** Priority/order for tag execution (lower = higher priority). */
  priority?: number;
  /** ISO-8601 creation timestamp (if available). */
  createdAt?: string;
  /** ISO-8601 last-modified timestamp (if available). */
  updatedAt?: string;
  /** Full URL path to the tag configuration. */
  url: string;
}

/** Input for listing managed tags. */
export interface ListTagsInput {
  project: string;
  status?: string;
}

/** Input for viewing a single managed tag. */
export interface ViewTagInput {
  project: string;
  tagId: string;
}

/** Input for staging managed tag creation. */
export interface CreateTagInput {
  project: string;
  name: string;
  jsCode: string;
  triggerConditions?: TagTriggerConditions;
  priority?: number;
  operatorNote?: string;
}

/** Input for staging managed tag enabling. */
export interface EnableTagInput {
  project: string;
  tagId: string;
  operatorNote?: string;
}

/** Input for staging managed tag disabling. */
export interface DisableTagInput {
  project: string;
  tagId: string;
  operatorNote?: string;
}

/** Input for staging managed tag edits. */
export interface EditTagInput {
  project: string;
  tagId: string;
  name?: string;
  jsCode?: string;
  triggerConditions?: TagTriggerConditions;
  priority?: number;
  operatorNote?: string;
}

/** Input for staging managed tag deletion. */
export interface DeleteTagInput {
  project: string;
  tagId: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedTagManagerAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MIN_TAG_NAME_LENGTH = 1;
const MAX_TAG_NAME_LENGTH = 200;
const MAX_TAG_ID_LENGTH = 500;
const MAX_JS_CODE_LENGTH = 100_000;
const MAX_PAGE_URL_LENGTH = 2000;
const MAX_EVENTS_COUNT = 50;
const MAX_EVENT_NAME_LENGTH = 200;
const MAX_CUSTOMER_ATTRIBUTES_COUNT = 20;
const MAX_ATTRIBUTE_KEY_LENGTH = 200;
const MAX_ATTRIBUTE_VALUE_LENGTH = 500;
const MAX_PRIORITY = 1000;

/** @throws {Error} If tag name is empty or exceeds 200 characters. */
export function validateTagName(name: string): string {
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

/** @throws {Error} If tag ID is empty or exceeds 500 characters. */
export function validateTagId(tagId: string): string {
  const trimmed = tagId.trim();
  if (trimmed.length === 0) {
    throw new Error('Tag ID must not be empty.');
  }
  if (trimmed.length > MAX_TAG_ID_LENGTH) {
    throw new Error(
      `Tag ID must not exceed ${MAX_TAG_ID_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If JS code is empty or exceeds 100000 characters. */
export function validateJsCode(code: string): string {
  if (code.trim().length === 0) {
    throw new Error('JS code must not be empty.');
  }
  if (code.length > MAX_JS_CODE_LENGTH) {
    throw new Error(
      `JS code must not exceed ${MAX_JS_CODE_LENGTH} characters (got ${code.length}).`,
    );
  }
  return code;
}

/** @throws {Error} If status is not a recognised tag status. */
export function validateTagStatus(status: string): TagStatus {
  const trimmed = status.trim();
  if (!TAG_STATUSES.includes(trimmed as TagStatus)) {
    throw new Error(`status must be one of: ${TAG_STATUSES.join(', ')} (got "${status}").`);
  }
  return trimmed as TagStatus;
}

/** @throws {Error} If URL is empty or exceeds 2000 characters. */
export function validatePageUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw new Error('Page URL must not be empty.');
  }
  if (trimmed.length > MAX_PAGE_URL_LENGTH) {
    throw new Error(
      `Page URL must not exceed ${MAX_PAGE_URL_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If events are empty, too many, invalid, or not unique. */
export function validateEvents(events: string[]): string[] {
  if (events.length === 0) {
    throw new Error('Events must not be empty.');
  }
  if (events.length > MAX_EVENTS_COUNT) {
    throw new Error(`Events must not exceed ${MAX_EVENTS_COUNT} items (got ${events.length}).`);
  }

  const validated: string[] = [];
  for (const eventName of events) {
    const trimmed = eventName.trim();
    if (trimmed.length === 0) {
      throw new Error('Event name must not be empty.');
    }
    if (trimmed.length > MAX_EVENT_NAME_LENGTH) {
      throw new Error(
        `Event name must not exceed ${MAX_EVENT_NAME_LENGTH} characters (got ${trimmed.length}).`,
      );
    }
    validated.push(trimmed);
  }

  const unique = new Set(validated);
  if (unique.size !== validated.length) {
    throw new Error('Event names must be unique.');
  }

  return validated;
}

/** @throws {Error} If attributes are empty, too many, or contain invalid key/value pairs. */
export function validateCustomerAttributes(
  attrs: Record<string, string>,
): Record<string, string> {
  const entries = Object.entries(attrs);
  if (entries.length === 0) {
    throw new Error('Customer attributes must not be empty.');
  }
  if (entries.length > MAX_CUSTOMER_ATTRIBUTES_COUNT) {
    throw new Error(
      `Customer attributes must not exceed ${MAX_CUSTOMER_ATTRIBUTES_COUNT} entries (got ${entries.length}).`,
    );
  }

  const validated: Record<string, string> = {};
  for (const [key, value] of entries) {
    const trimmedKey = key.trim();
    if (trimmedKey.length === 0) {
      throw new Error('Customer attribute key must not be empty.');
    }
    if (trimmedKey.length > MAX_ATTRIBUTE_KEY_LENGTH) {
      throw new Error(
        `Customer attribute key must not exceed ${MAX_ATTRIBUTE_KEY_LENGTH} characters (got ${trimmedKey.length}).`,
      );
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      throw new Error('Customer attribute value must not be empty.');
    }
    if (trimmedValue.length > MAX_ATTRIBUTE_VALUE_LENGTH) {
      throw new Error(
        `Customer attribute value must not exceed ${MAX_ATTRIBUTE_VALUE_LENGTH} characters (got ${trimmedValue.length}).`,
      );
    }

    validated[trimmedKey] = trimmedValue;
  }

  return validated;
}

/** @throws {Error} If trigger conditions contain invalid values. */
export function validateTriggerConditions(
  conditions: TagTriggerConditions,
): TagTriggerConditions {
  const validated: TagTriggerConditions = {};

  if (conditions.pageUrl !== undefined) {
    validated.pageUrl = validatePageUrl(conditions.pageUrl);
  }

  if (conditions.events !== undefined) {
    validated.events = validateEvents(conditions.events);
  }

  if (conditions.customerAttributes !== undefined) {
    validated.customerAttributes = validateCustomerAttributes(
      conditions.customerAttributes,
    );
  }

  return validated;
}

/** @throws {Error} If priority is not a positive integer or exceeds 1000. */
export function validatePriority(priority: number): number {
  if (!Number.isInteger(priority) || priority < 1) {
    throw new Error('Priority must be a positive integer.');
  }
  if (priority > MAX_PRIORITY) {
    throw new Error(`Priority must not exceed ${MAX_PRIORITY} (got ${priority}).`);
  }
  return priority;
}

/** Builds the managed tags page URL for a project. */
export function buildManagedTagsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/managed-tags`;
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

/**
 * Executor for a confirmed tag manager mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface TagManagerActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateTagExecutor implements TagManagerActionExecutor {
  readonly actionType = CREATE_TAG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateTagExecutor: not yet implemented. ' +
        'Tag creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class EnableTagExecutor implements TagManagerActionExecutor {
  readonly actionType = ENABLE_TAG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'EnableTagExecutor: not yet implemented. ' +
        'Tag enabling is only available through the Bloomreach Engagement UI.',
    );
  }
}

class DisableTagExecutor implements TagManagerActionExecutor {
  readonly actionType = DISABLE_TAG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'DisableTagExecutor: not yet implemented. ' +
        'Tag disabling is only available through the Bloomreach Engagement UI.',
    );
  }
}

class EditTagExecutor implements TagManagerActionExecutor {
  readonly actionType = EDIT_TAG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'EditTagExecutor: not yet implemented. ' +
        'Tag editing is only available through the Bloomreach Engagement UI.',
    );
  }
}

class DeleteTagExecutor implements TagManagerActionExecutor {
  readonly actionType = DELETE_TAG_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'DeleteTagExecutor: not yet implemented. ' +
        'Tag deletion is only available through the Bloomreach Engagement UI.',
    );
  }
}

/** Creates all tag manager action executors keyed by action type. */
export function createTagManagerActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, TagManagerActionExecutor> {
  return {
    [CREATE_TAG_ACTION_TYPE]: new CreateTagExecutor(apiConfig),
    [ENABLE_TAG_ACTION_TYPE]: new EnableTagExecutor(apiConfig),
    [DISABLE_TAG_ACTION_TYPE]: new DisableTagExecutor(apiConfig),
    [EDIT_TAG_ACTION_TYPE]: new EditTagExecutor(apiConfig),
    [DELETE_TAG_ACTION_TYPE]: new DeleteTagExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement managed tags. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachTagManagerService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildManagedTagsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  /** URL to the managed tags page for this service project. */
  get managedTagsUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Bloomreach API does not expose managed tags. */
  async listTags(input?: ListTagsInput): Promise<BloomreachManagedTag[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateTagStatus(input.status);
      }
    }

    throw new Error(
      'listTags: the Bloomreach API does not provide an endpoint for managed tags. ' +
        'Managed tag data must be obtained from the Bloomreach Engagement UI ' +
        '(navigate to Data & Assets > Managed Tags in your project).',
    );
  }

  /** @throws {Error} Bloomreach API does not expose managed tag details. */
  async viewTag(input: ViewTagInput): Promise<BloomreachManagedTag> {
    void this.apiConfig;
    validateProject(input.project);
    validateTagId(input.tagId);

    throw new Error(
      'viewTag: the Bloomreach API does not provide an endpoint for managed tag details. ' +
        'Managed tag details must be viewed in the Bloomreach Engagement UI ' +
        '(navigate to Data & Assets > Managed Tags and open the tag).',
    );
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateTag(input: CreateTagInput): PreparedTagManagerAction {
    const project = validateProject(input.project);
    const name = validateTagName(input.name);
    const jsCode = validateJsCode(input.jsCode);
    const triggerConditions =
      input.triggerConditions !== undefined
        ? validateTriggerConditions(input.triggerConditions)
        : undefined;
    const priority = input.priority !== undefined ? validatePriority(input.priority) : undefined;

    const preview = {
      action: CREATE_TAG_ACTION_TYPE,
      project,
      name,
      jsCode,
      triggerConditions,
      priority,
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
  prepareEnableTag(input: EnableTagInput): PreparedTagManagerAction {
    const project = validateProject(input.project);
    const tagId = validateTagId(input.tagId);

    const preview = {
      action: ENABLE_TAG_ACTION_TYPE,
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
  prepareDisableTag(input: DisableTagInput): PreparedTagManagerAction {
    const project = validateProject(input.project);
    const tagId = validateTagId(input.tagId);

    const preview = {
      action: DISABLE_TAG_ACTION_TYPE,
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
  prepareEditTag(input: EditTagInput): PreparedTagManagerAction {
    const project = validateProject(input.project);
    const tagId = validateTagId(input.tagId);
    const name = input.name !== undefined ? validateTagName(input.name) : undefined;
    const jsCode = input.jsCode !== undefined ? validateJsCode(input.jsCode) : undefined;
    const triggerConditions =
      input.triggerConditions !== undefined
        ? validateTriggerConditions(input.triggerConditions)
        : undefined;
    const priority = input.priority !== undefined ? validatePriority(input.priority) : undefined;

    const preview = {
      action: EDIT_TAG_ACTION_TYPE,
      project,
      tagId,
      name,
      jsCode,
      triggerConditions,
      priority,
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
  prepareDeleteTag(input: DeleteTagInput): PreparedTagManagerAction {
    const project = validateProject(input.project);
    const tagId = validateTagId(input.tagId);

    const preview = {
      action: DELETE_TAG_ACTION_TYPE,
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
}
