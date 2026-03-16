import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireString } from './errors.js';

export const CREATE_EMAIL_TEMPLATE_ACTION_TYPE =
  'asset_manager.create_email_template';
export const CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE =
  'asset_manager.create_weblayer_template';
export const CREATE_BLOCK_ACTION_TYPE = 'asset_manager.create_block';
export const CREATE_CUSTOM_ROW_ACTION_TYPE = 'asset_manager.create_custom_row';
export const CREATE_SNIPPET_ACTION_TYPE = 'asset_manager.create_snippet';
export const EDIT_SNIPPET_ACTION_TYPE = 'asset_manager.edit_snippet';
export const UPLOAD_FILE_ACTION_TYPE = 'asset_manager.upload_file';
export const DELETE_FILE_ACTION_TYPE = 'asset_manager.delete_file';
export const CLONE_TEMPLATE_ACTION_TYPE = 'asset_manager.clone_template';
export const ARCHIVE_TEMPLATE_ACTION_TYPE = 'asset_manager.archive_template';

/** Rate limit window for asset manager operations (1 hour in ms). */
export const ASSET_MANAGER_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const ASSET_MANAGER_CREATE_RATE_LIMIT = 10;
export const ASSET_MANAGER_MODIFY_RATE_LIMIT = 20;

export const ASSET_TYPES = [
  'email_template',
  'weblayer_template',
  'block',
  'custom_row',
  'snippet',
  'file',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const TEMPLATE_STATUSES = ['active', 'archived', 'draft'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const FILE_CATEGORIES = ['image', 'document', 'font', 'other'] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const SNIPPET_LANGUAGES = ['jinja', 'html'] as const;
export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number];

export const TEMPLATE_BUILDER_TYPES = ['visual', 'html'] as const;
export type TemplateBuilderType = (typeof TEMPLATE_BUILDER_TYPES)[number];

export interface BloomreachEmailTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  builderType?: TemplateBuilderType;
  thumbnailUrl?: string;
  htmlContent?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface BloomreachWeblayerTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  thumbnailUrl?: string;
  htmlContent?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface BloomreachContentBlock {
  id: string;
  name: string;
  status: TemplateStatus;
  htmlContent?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface BloomreachCustomRow {
  id: string;
  name: string;
  status: TemplateStatus;
  htmlContent?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface BloomreachSnippet {
  id: string;
  name: string;
  language: SnippetLanguage;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface BloomreachFile {
  id: string;
  name: string;
  mimeType: string;
  fileSize?: number;
  category: FileCategory;
  fileUrl: string;
  uploadedAt?: string;
  url: string;
}

export interface ListEmailTemplatesInput {
  project: string;
}

export interface ListWeblayerTemplatesInput {
  project: string;
}

export interface ListBlocksInput {
  project: string;
}

export interface ListCustomRowsInput {
  project: string;
}

export interface ListSnippetsInput {
  project: string;
}

export interface ListFilesInput {
  project: string;
  category?: string;
}

export interface CreateEmailTemplateInput {
  project: string;
  name: string;
  builderType?: string;
  htmlContent?: string;
  operatorNote?: string;
}

export interface CreateWeblayerTemplateInput {
  project: string;
  name: string;
  htmlContent?: string;
  operatorNote?: string;
}

export interface CreateBlockInput {
  project: string;
  name: string;
  htmlContent?: string;
  operatorNote?: string;
}

export interface CreateCustomRowInput {
  project: string;
  name: string;
  htmlContent?: string;
  operatorNote?: string;
}

export interface CreateSnippetInput {
  project: string;
  name: string;
  language: string;
  content: string;
  operatorNote?: string;
}

export interface EditSnippetInput {
  project: string;
  snippetId: string;
  name?: string;
  language?: string;
  content?: string;
  operatorNote?: string;
}

export interface UploadFileInput {
  project: string;
  name: string;
  mimeType: string;
  fileSize?: number;
  category?: string;
  operatorNote?: string;
}

export interface DeleteFileInput {
  project: string;
  fileId: string;
  operatorNote?: string;
}

export interface CloneTemplateInput {
  project: string;
  templateId: string;
  assetType: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveTemplateInput {
  project: string;
  templateId: string;
  assetType: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedAssetManagerAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MIN_ASSET_NAME_LENGTH = 1;
const MAX_ASSET_NAME_LENGTH = 200;
const MAX_SNIPPET_CONTENT_LENGTH = 100_000;
const CLONEABLE_ASSET_TYPES = [
  'email_template',
  'weblayer_template',
  'block',
  'custom_row',
] as const;
type CloneableAssetType = (typeof CLONEABLE_ASSET_TYPES)[number];

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateAssetName(name: string): string {
  requireString(name, 'name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_ASSET_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Asset name must not be empty.');
  }
  if (trimmed.length > MAX_ASSET_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Asset name must not exceed ${MAX_ASSET_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If `type` is not a recognised asset type. */
export function validateAssetType(type: string): AssetType {
  requireString(type, 'type');
  if (!ASSET_TYPES.includes(type as AssetType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `assetType must be one of: ${ASSET_TYPES.join(', ')} (got "${type}").`);
  }
  return type as AssetType;
}

/** @throws {Error} If `status` is not a recognised template status. */
export function validateTemplateStatus(status: string): TemplateStatus {
  requireString(status, 'status');
  if (!TEMPLATE_STATUSES.includes(status as TemplateStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `status must be one of: ${TEMPLATE_STATUSES.join(', ')} (got "${status}").`);
  }
  return status as TemplateStatus;
}

/** @throws {Error} If `category` is not a recognised file category. */
export function validateFileCategory(category: string): FileCategory {
  requireString(category, 'category');
  if (!FILE_CATEGORIES.includes(category as FileCategory)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `category must be one of: ${FILE_CATEGORIES.join(', ')} (got "${category}").`);
  }
  return category as FileCategory;
}

/** @throws {Error} If `language` is not a recognised snippet language. */
export function validateSnippetLanguage(language: string): SnippetLanguage {
  requireString(language, 'language');
  if (!SNIPPET_LANGUAGES.includes(language as SnippetLanguage)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `language must be one of: ${SNIPPET_LANGUAGES.join(', ')} (got "${language}").`);
  }
  return language as SnippetLanguage;
}

/** @throws {Error} If `type` is not a recognised builder type. */
export function validateBuilderType(type: string): TemplateBuilderType {
  requireString(type, 'type');
  if (!TEMPLATE_BUILDER_TYPES.includes(type as TemplateBuilderType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `builderType must be one of: ${TEMPLATE_BUILDER_TYPES.join(', ')} (got "${type}").`);
  }
  return type as TemplateBuilderType;
}

/** @throws {Error} If snippet content is empty or exceeds 100000 characters. */
export function validateSnippetContent(content: string): string {
  requireString(content, 'content');
  if (content.trim().length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Snippet content must not be empty.');
  }
  if (content.length > MAX_SNIPPET_CONTENT_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Snippet content must not exceed ${MAX_SNIPPET_CONTENT_LENGTH} characters (got ${content.length}).`);
  }
  return content;
}

/** @throws {Error} If mime type is empty or malformed. */
export function validateMimeType(mimeType: string): string {
  requireString(mimeType, 'MIME type');
  const trimmed = mimeType.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'MIME type must not be empty.');
  }
  if (!trimmed.includes('/')) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'MIME type must include a "/" separator.');
  }
  return trimmed;
}

/** @throws {Error} If asset ID is empty. */
export function validateAssetId(id: string): string {
  requireString(id, 'id');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Asset ID must not be empty.');
  }
  return trimmed;
}

function validateCloneableAssetType(type: string): CloneableAssetType {
  requireString(type, 'type');
  const assetType = validateAssetType(type);
  if (!CLONEABLE_ASSET_TYPES.includes(assetType as CloneableAssetType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `assetType must be one of cloneable types: ${CLONEABLE_ASSET_TYPES.join(', ')} (got "${type}").`);
  }
  return assetType as CloneableAssetType;
}

export function buildEmailTemplatesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/email-templates`;
}

export function buildWeblayerTemplatesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/weblayer-templates`;
}

export function buildBlocksUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/blocks`;
}

export function buildCustomRowsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/custom-rows`;
}

export function buildSnippetsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/snippets`;
}

export function buildFilesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/data/assets/files`;
}

/**
 * Executor for a confirmed asset manager mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface AssetManagerActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateEmailTemplateExecutor implements AssetManagerActionExecutor {
  readonly actionType = CREATE_EMAIL_TEMPLATE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateEmailTemplateExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class CreateWeblayerTemplateExecutor implements AssetManagerActionExecutor {
  readonly actionType = CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateWeblayerTemplateExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class CreateBlockExecutor implements AssetManagerActionExecutor {
  readonly actionType = CREATE_BLOCK_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateBlockExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class CreateCustomRowExecutor implements AssetManagerActionExecutor {
  readonly actionType = CREATE_CUSTOM_ROW_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateCustomRowExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class CreateSnippetExecutor implements AssetManagerActionExecutor {
  readonly actionType = CREATE_SNIPPET_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateSnippetExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class EditSnippetExecutor implements AssetManagerActionExecutor {
  readonly actionType = EDIT_SNIPPET_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'EditSnippetExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class UploadFileExecutor implements AssetManagerActionExecutor {
  readonly actionType = UPLOAD_FILE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UploadFileExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class DeleteFileExecutor implements AssetManagerActionExecutor {
  readonly actionType = DELETE_FILE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteFileExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class CloneTemplateExecutor implements AssetManagerActionExecutor {
  readonly actionType = CLONE_TEMPLATE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CloneTemplateExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

class ArchiveTemplateExecutor implements AssetManagerActionExecutor {
  readonly actionType = ARCHIVE_TEMPLATE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveTemplateExecutor: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }
}

export function createAssetManagerActionExecutors(): Record<
  string,
  AssetManagerActionExecutor
> {
  return {
    [CREATE_EMAIL_TEMPLATE_ACTION_TYPE]: new CreateEmailTemplateExecutor(),
    [CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE]: new CreateWeblayerTemplateExecutor(),
    [CREATE_BLOCK_ACTION_TYPE]: new CreateBlockExecutor(),
    [CREATE_CUSTOM_ROW_ACTION_TYPE]: new CreateCustomRowExecutor(),
    [CREATE_SNIPPET_ACTION_TYPE]: new CreateSnippetExecutor(),
    [EDIT_SNIPPET_ACTION_TYPE]: new EditSnippetExecutor(),
    [UPLOAD_FILE_ACTION_TYPE]: new UploadFileExecutor(),
    [DELETE_FILE_ACTION_TYPE]: new DeleteFileExecutor(),
    [CLONE_TEMPLATE_ACTION_TYPE]: new CloneTemplateExecutor(),
    [ARCHIVE_TEMPLATE_ACTION_TYPE]: new ArchiveTemplateExecutor(),
  };
}

/**
 * Manages Bloomreach Engagement asset manager content. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachAssetManagerService {
  private readonly emailTemplatesBaseUrl: string;
  private readonly weblayerTemplatesBaseUrl: string;
  private readonly blocksBaseUrl: string;
  private readonly customRowsBaseUrl: string;
  private readonly snippetsBaseUrl: string;
  private readonly filesBaseUrl: string;

  constructor(project: string) {
    const validatedProject = validateProject(project);
    this.emailTemplatesBaseUrl = buildEmailTemplatesUrl(validatedProject);
    this.weblayerTemplatesBaseUrl = buildWeblayerTemplatesUrl(validatedProject);
    this.blocksBaseUrl = buildBlocksUrl(validatedProject);
    this.customRowsBaseUrl = buildCustomRowsUrl(validatedProject);
    this.snippetsBaseUrl = buildSnippetsUrl(validatedProject);
    this.filesBaseUrl = buildFilesUrl(validatedProject);
  }

  get emailTemplatesUrl(): string {
    return this.emailTemplatesBaseUrl;
  }

  get weblayerTemplatesUrl(): string {
    return this.weblayerTemplatesBaseUrl;
  }

  get blocksUrl(): string {
    return this.blocksBaseUrl;
  }

  get customRowsUrl(): string {
    return this.customRowsBaseUrl;
  }

  get snippetsUrl(): string {
    return this.snippetsBaseUrl;
  }

  get filesUrl(): string {
    return this.filesBaseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async listEmailTemplates(
    input?: ListEmailTemplatesInput,
  ): Promise<BloomreachEmailTemplate[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listEmailTemplates: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async listWeblayerTemplates(
    input?: ListWeblayerTemplatesInput,
  ): Promise<BloomreachWeblayerTemplate[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listWeblayerTemplates: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async listBlocks(input?: ListBlocksInput): Promise<BloomreachContentBlock[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listBlocks: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async listCustomRows(input?: ListCustomRowsInput): Promise<BloomreachCustomRow[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listCustomRows: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async listSnippets(input?: ListSnippetsInput): Promise<BloomreachSnippet[]> {
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listSnippets: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} Browser automation not yet available. */
  async listFiles(input?: ListFilesInput): Promise<BloomreachFile[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.category !== undefined) {
        validateFileCategory(input.category);
      }
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listFiles: not yet implemented. Requires browser automation infrastructure.', { not_implemented: true });
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateEmailTemplate(
    input: CreateEmailTemplateInput,
  ): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);
    const builderType =
      input.builderType !== undefined
        ? validateBuilderType(input.builderType)
        : undefined;

    const preview = {
      action: CREATE_EMAIL_TEMPLATE_ACTION_TYPE,
      project,
      name,
      builderType,
      htmlContent: input.htmlContent,
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
  prepareCreateWeblayerTemplate(
    input: CreateWeblayerTemplateInput,
  ): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);

    const preview = {
      action: CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE,
      project,
      name,
      htmlContent: input.htmlContent,
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
  prepareCreateBlock(input: CreateBlockInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);

    const preview = {
      action: CREATE_BLOCK_ACTION_TYPE,
      project,
      name,
      htmlContent: input.htmlContent,
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
  prepareCreateCustomRow(input: CreateCustomRowInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);

    const preview = {
      action: CREATE_CUSTOM_ROW_ACTION_TYPE,
      project,
      name,
      htmlContent: input.htmlContent,
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
  prepareCreateSnippet(input: CreateSnippetInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);
    const language = validateSnippetLanguage(input.language);
    const content = validateSnippetContent(input.content);

    const preview = {
      action: CREATE_SNIPPET_ACTION_TYPE,
      project,
      name,
      language,
      content,
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
  prepareEditSnippet(input: EditSnippetInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const snippetId = validateAssetId(input.snippetId);
    const name = input.name !== undefined ? validateAssetName(input.name) : undefined;
    const language =
      input.language !== undefined ? validateSnippetLanguage(input.language) : undefined;
    const content =
      input.content !== undefined ? validateSnippetContent(input.content) : undefined;

    const preview = {
      action: EDIT_SNIPPET_ACTION_TYPE,
      project,
      snippetId,
      name,
      language,
      content,
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
  prepareUploadFile(input: UploadFileInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const name = validateAssetName(input.name);
    const mimeType = validateMimeType(input.mimeType);
    const category =
      input.category !== undefined ? validateFileCategory(input.category) : undefined;

    const preview = {
      action: UPLOAD_FILE_ACTION_TYPE,
      project,
      name,
      mimeType,
      fileSize: input.fileSize,
      category,
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
  prepareDeleteFile(input: DeleteFileInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const fileId = validateAssetId(input.fileId);

    const preview = {
      action: DELETE_FILE_ACTION_TYPE,
      project,
      fileId,
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
  prepareCloneTemplate(input: CloneTemplateInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const templateId = validateAssetId(input.templateId);
    const assetType = validateCloneableAssetType(input.assetType);
    const newName =
      input.newName !== undefined ? validateAssetName(input.newName) : undefined;

    const preview = {
      action: CLONE_TEMPLATE_ACTION_TYPE,
      project,
      templateId,
      assetType,
      newName,
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
  prepareArchiveTemplate(input: ArchiveTemplateInput): PreparedAssetManagerAction {
    const project = validateProject(input.project);
    const templateId = validateAssetId(input.templateId);
    const assetType = validateCloneableAssetType(input.assetType);

    const preview = {
      action: ARCHIVE_TEMPLATE_ACTION_TYPE,
      project,
      templateId,
      assetType,
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
