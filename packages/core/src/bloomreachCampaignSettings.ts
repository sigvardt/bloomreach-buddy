import { validateProject } from './bloomreachDashboards.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE = 'campaign_settings.update_campaign_defaults';

export const CREATE_TIMEZONE_ACTION_TYPE = 'campaign_settings.create_timezone';
export const UPDATE_TIMEZONE_ACTION_TYPE = 'campaign_settings.update_timezone';
export const DELETE_TIMEZONE_ACTION_TYPE = 'campaign_settings.delete_timezone';

export const CREATE_LANGUAGE_ACTION_TYPE = 'campaign_settings.create_language';
export const UPDATE_LANGUAGE_ACTION_TYPE = 'campaign_settings.update_language';
export const DELETE_LANGUAGE_ACTION_TYPE = 'campaign_settings.delete_language';

export const CREATE_FONT_ACTION_TYPE = 'campaign_settings.create_font';
export const UPDATE_FONT_ACTION_TYPE = 'campaign_settings.update_font';
export const DELETE_FONT_ACTION_TYPE = 'campaign_settings.delete_font';

export const CREATE_THROUGHPUT_POLICY_ACTION_TYPE = 'campaign_settings.create_throughput_policy';
export const UPDATE_THROUGHPUT_POLICY_ACTION_TYPE = 'campaign_settings.update_throughput_policy';
export const DELETE_THROUGHPUT_POLICY_ACTION_TYPE = 'campaign_settings.delete_throughput_policy';

export const CREATE_FREQUENCY_POLICY_ACTION_TYPE = 'campaign_settings.create_frequency_policy';
export const UPDATE_FREQUENCY_POLICY_ACTION_TYPE = 'campaign_settings.update_frequency_policy';
export const DELETE_FREQUENCY_POLICY_ACTION_TYPE = 'campaign_settings.delete_frequency_policy';

export const CREATE_CONSENT_ACTION_TYPE = 'campaign_settings.create_consent';
export const UPDATE_CONSENT_ACTION_TYPE = 'campaign_settings.update_consent';
export const DELETE_CONSENT_ACTION_TYPE = 'campaign_settings.delete_consent';

export const CREATE_URL_LIST_ACTION_TYPE = 'campaign_settings.create_url_list';
export const UPDATE_URL_LIST_ACTION_TYPE = 'campaign_settings.update_url_list';
export const DELETE_URL_LIST_ACTION_TYPE = 'campaign_settings.delete_url_list';

export const CREATE_PAGE_VARIABLE_ACTION_TYPE = 'campaign_settings.create_page_variable';
export const UPDATE_PAGE_VARIABLE_ACTION_TYPE = 'campaign_settings.update_page_variable';
export const DELETE_PAGE_VARIABLE_ACTION_TYPE = 'campaign_settings.delete_page_variable';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

export const CAMPAIGN_SETTINGS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const CAMPAIGN_SETTINGS_MODIFY_RATE_LIMIT = 20;
export const CAMPAIGN_SETTINGS_TIMEZONE_RATE_LIMIT = 30;
export const CAMPAIGN_SETTINGS_LANGUAGE_RATE_LIMIT = 30;
export const CAMPAIGN_SETTINGS_FONT_RATE_LIMIT = 20;
export const CAMPAIGN_SETTINGS_POLICY_RATE_LIMIT = 20;
export const CAMPAIGN_SETTINGS_CONSENT_RATE_LIMIT = 20;
export const CAMPAIGN_SETTINGS_URL_LIST_RATE_LIMIT = 20;
export const CAMPAIGN_SETTINGS_PAGE_VARIABLE_RATE_LIMIT = 30;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

/** General campaign defaults from /project-settings/campaigns. */
export interface BloomreachCampaignDefaults {
  /** Default sender name for campaigns. */
  defaultSenderName?: string;
  /** Default sender email address. */
  defaultSenderEmail?: string;
  /** Default reply-to email address. */
  defaultReplyToEmail?: string;
  /** Default UTM source parameter. */
  defaultUtmSource?: string;
  /** Default UTM medium parameter. */
  defaultUtmMedium?: string;
  /** Default UTM campaign parameter. */
  defaultUtmCampaign?: string;
  /** Full URL path to the campaign settings page. */
  url: string;
}

export interface BloomreachTimezone {
  id: string;
  /** IANA timezone name (e.g. "Europe/Prague"). */
  name: string;
  /** UTC offset string (e.g. "+01:00"). */
  utcOffset?: string;
  /** Whether this is the default timezone for the project. */
  isDefault?: boolean;
}

export interface BloomreachLanguage {
  /** ISO 639-1 code (e.g. "en", "cs"). */
  code: string;
  /** Human-readable name (e.g. "English", "Czech"). */
  name: string;
  /** Whether this is the default language. */
  isDefault?: boolean;
}

export interface BloomreachFont {
  id: string;
  /** Font family name. */
  name: string;
  /** Font type (system or custom). */
  type: string;
  /** URL to the font file (for custom fonts). */
  fileUrl?: string;
}

export interface BloomreachThroughputPolicy {
  id: string;
  name: string;
  /** Channel this policy applies to (email, sms, push, etc.). */
  channel?: string;
  /** Maximum send rate per period. */
  maxRate?: number;
  /** Period in seconds for the rate limit. */
  periodSeconds?: number;
  /** Human-readable description. */
  description?: string;
}

export interface BloomreachFrequencyPolicy {
  id: string;
  name: string;
  /** Policy type (global or per-campaign). */
  policyType?: string;
  /** Maximum number of sends allowed. */
  maxSends?: number;
  /** Time window in hours for the frequency cap. */
  windowHours?: number;
  /** Channels this policy applies to. */
  channels?: string[];
  /** Human-readable description. */
  description?: string;
}

export interface BloomreachConsent {
  id: string;
  /** Consent category name (e.g. "Marketing", "Transactional"). */
  category: string;
  /** Human-readable description. */
  description?: string;
  /** Consent type (opt-in or opt-out). */
  consentType?: string;
  /** Whether legitimate interest applies. */
  legitimateInterest?: boolean;
}

export interface BloomreachUrlList {
  id: string;
  name: string;
  /** List type (allowlist or blocklist). */
  listType: string;
  /** URLs in the list. */
  urls?: string[];
  /** Human-readable description. */
  description?: string;
}

export interface BloomreachPageVariable {
  id: string;
  /** Variable name used in templates. */
  name: string;
  /** Default value. */
  value: string;
  /** Human-readable description. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ViewCampaignDefaultsInput {
  project: string;
}

export interface UpdateCampaignDefaultsInput {
  project: string;
  defaultSenderName?: string;
  defaultSenderEmail?: string;
  defaultReplyToEmail?: string;
  defaultUtmSource?: string;
  defaultUtmMedium?: string;
  defaultUtmCampaign?: string;
  operatorNote?: string;
}

export interface ListTimezonesInput {
  project: string;
}

export interface CreateTimezoneInput {
  project: string;
  name: string;
  utcOffset?: string;
  isDefault?: boolean;
  operatorNote?: string;
}

export interface UpdateTimezoneInput {
  project: string;
  timezoneId: string;
  name?: string;
  utcOffset?: string;
  isDefault?: boolean;
  operatorNote?: string;
}

export interface DeleteTimezoneInput {
  project: string;
  timezoneId: string;
  operatorNote?: string;
}

export interface ListLanguagesInput {
  project: string;
}

export interface CreateLanguageInput {
  project: string;
  code: string;
  name: string;
  isDefault?: boolean;
  operatorNote?: string;
}

export interface UpdateLanguageInput {
  project: string;
  languageCode: string;
  code?: string;
  name?: string;
  isDefault?: boolean;
  operatorNote?: string;
}

export interface DeleteLanguageInput {
  project: string;
  languageCode: string;
  operatorNote?: string;
}

export interface ListFontsInput {
  project: string;
}

export interface CreateFontInput {
  project: string;
  name: string;
  type: string;
  fileUrl?: string;
  operatorNote?: string;
}

export interface UpdateFontInput {
  project: string;
  fontId: string;
  name?: string;
  type?: string;
  fileUrl?: string;
  operatorNote?: string;
}

export interface DeleteFontInput {
  project: string;
  fontId: string;
  operatorNote?: string;
}

export interface ListThroughputPoliciesInput {
  project: string;
}

export interface CreateThroughputPolicyInput {
  project: string;
  name: string;
  channel?: string;
  maxRate?: number;
  periodSeconds?: number;
  description?: string;
  operatorNote?: string;
}

export interface UpdateThroughputPolicyInput {
  project: string;
  policyId: string;
  name?: string;
  channel?: string;
  maxRate?: number;
  periodSeconds?: number;
  description?: string;
  operatorNote?: string;
}

export interface DeleteThroughputPolicyInput {
  project: string;
  policyId: string;
  operatorNote?: string;
}

export interface ListFrequencyPoliciesInput {
  project: string;
}

export interface CreateFrequencyPolicyInput {
  project: string;
  name: string;
  policyType?: string;
  maxSends?: number;
  windowHours?: number;
  channels?: string[];
  description?: string;
  operatorNote?: string;
}

export interface UpdateFrequencyPolicyInput {
  project: string;
  policyId: string;
  name?: string;
  policyType?: string;
  maxSends?: number;
  windowHours?: number;
  channels?: string[];
  description?: string;
  operatorNote?: string;
}

export interface DeleteFrequencyPolicyInput {
  project: string;
  policyId: string;
  operatorNote?: string;
}

export interface ListConsentsInput {
  project: string;
}

export interface CreateConsentInput {
  project: string;
  category: string;
  description?: string;
  consentType?: string;
  legitimateInterest?: boolean;
  operatorNote?: string;
}

export interface UpdateConsentInput {
  project: string;
  consentId: string;
  category?: string;
  description?: string;
  consentType?: string;
  legitimateInterest?: boolean;
  operatorNote?: string;
}

export interface DeleteConsentInput {
  project: string;
  consentId: string;
  operatorNote?: string;
}

export interface ListUrlListsInput {
  project: string;
}

export interface CreateUrlListInput {
  project: string;
  name: string;
  listType: string;
  urls?: string[];
  description?: string;
  operatorNote?: string;
}

export interface UpdateUrlListInput {
  project: string;
  urlListId: string;
  name?: string;
  listType?: string;
  urls?: string[];
  description?: string;
  operatorNote?: string;
}

export interface DeleteUrlListInput {
  project: string;
  urlListId: string;
  operatorNote?: string;
}

export interface ListPageVariablesInput {
  project: string;
}

export interface CreatePageVariableInput {
  project: string;
  name: string;
  value: string;
  description?: string;
  operatorNote?: string;
}

export interface UpdatePageVariableInput {
  project: string;
  pageVariableId: string;
  name?: string;
  value?: string;
  description?: string;
  operatorNote?: string;
}

export interface DeletePageVariableInput {
  project: string;
  pageVariableId: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

export interface PreparedCampaignSettingsAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_TIMEZONE_NAME_LENGTH = 100;
const MIN_TIMEZONE_NAME_LENGTH = 1;
const MAX_LANGUAGE_CODE_LENGTH = 10;
const MIN_LANGUAGE_CODE_LENGTH = 1;
const MAX_LANGUAGE_NAME_LENGTH = 100;
const MIN_LANGUAGE_NAME_LENGTH = 1;
const MAX_FONT_NAME_LENGTH = 100;
const MIN_FONT_NAME_LENGTH = 1;
const MAX_POLICY_NAME_LENGTH = 120;
const MIN_POLICY_NAME_LENGTH = 1;
const MAX_CONSENT_CATEGORY_LENGTH = 120;
const MIN_CONSENT_CATEGORY_LENGTH = 1;
const MAX_URL_LIST_NAME_LENGTH = 120;
const MIN_URL_LIST_NAME_LENGTH = 1;
const MAX_PAGE_VARIABLE_NAME_LENGTH = 200;
const MIN_PAGE_VARIABLE_NAME_LENGTH = 1;
const MAX_PAGE_VARIABLE_VALUE_LENGTH = 5000;

export function validateTimezoneName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_TIMEZONE_NAME_LENGTH) {
    throw new Error('Timezone name must not be empty.');
  }
  if (trimmed.length > MAX_TIMEZONE_NAME_LENGTH) {
    throw new Error(
      `Timezone name must not exceed ${MAX_TIMEZONE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateTimezoneId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Timezone ID must not be empty.');
  }
  return trimmed;
}

export function validateLanguageCode(code: string): string {
  const trimmed = code.trim();
  if (trimmed.length < MIN_LANGUAGE_CODE_LENGTH) {
    throw new Error('Language code must not be empty.');
  }
  if (trimmed.length > MAX_LANGUAGE_CODE_LENGTH) {
    throw new Error(
      `Language code must not exceed ${MAX_LANGUAGE_CODE_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateLanguageName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_LANGUAGE_NAME_LENGTH) {
    throw new Error('Language name must not be empty.');
  }
  if (trimmed.length > MAX_LANGUAGE_NAME_LENGTH) {
    throw new Error(
      `Language name must not exceed ${MAX_LANGUAGE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateFontName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_FONT_NAME_LENGTH) {
    throw new Error('Font name must not be empty.');
  }
  if (trimmed.length > MAX_FONT_NAME_LENGTH) {
    throw new Error(
      `Font name must not exceed ${MAX_FONT_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateFontId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Font ID must not be empty.');
  }
  return trimmed;
}

export function validatePolicyName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_POLICY_NAME_LENGTH) {
    throw new Error('Policy name must not be empty.');
  }
  if (trimmed.length > MAX_POLICY_NAME_LENGTH) {
    throw new Error(
      `Policy name must not exceed ${MAX_POLICY_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validatePolicyId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Policy ID must not be empty.');
  }
  return trimmed;
}

export function validateConsentCategory(category: string): string {
  const trimmed = category.trim();
  if (trimmed.length < MIN_CONSENT_CATEGORY_LENGTH) {
    throw new Error('Consent category must not be empty.');
  }
  if (trimmed.length > MAX_CONSENT_CATEGORY_LENGTH) {
    throw new Error(
      `Consent category must not exceed ${MAX_CONSENT_CATEGORY_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateConsentId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Consent ID must not be empty.');
  }
  return trimmed;
}

export function validateUrlListName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_URL_LIST_NAME_LENGTH) {
    throw new Error('URL list name must not be empty.');
  }
  if (trimmed.length > MAX_URL_LIST_NAME_LENGTH) {
    throw new Error(
      `URL list name must not exceed ${MAX_URL_LIST_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateUrlListId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('URL list ID must not be empty.');
  }
  return trimmed;
}

export function validatePageVariableName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_PAGE_VARIABLE_NAME_LENGTH) {
    throw new Error('Page variable name must not be empty.');
  }
  if (trimmed.length > MAX_PAGE_VARIABLE_NAME_LENGTH) {
    throw new Error(
      `Page variable name must not exceed ${MAX_PAGE_VARIABLE_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validatePageVariableId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Page variable ID must not be empty.');
  }
  return trimmed;
}

export function validatePageVariableValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length > MAX_PAGE_VARIABLE_VALUE_LENGTH) {
    throw new Error(
      `Page variable value must not exceed ${MAX_PAGE_VARIABLE_VALUE_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildCampaignSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/campaigns`;
}

export function buildTimezonesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/timezones`;
}

export function buildLanguagesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/languages`;
}

export function buildFontsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/fonts`;
}

export function buildThroughputPolicyUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/throughput-policy`;
}

export function buildFrequencyPoliciesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/campaign-frequency-policies`;
}

export function buildConsentsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/consents`;
}

export function buildGlobalUrlListsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/global-url-lists`;
}

export function buildPageVariablesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/page-variables`;
}

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface CampaignSettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class UpdateCampaignDefaultsExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateCampaignDefaultsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_TIMEZONE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateTimezoneExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_TIMEZONE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateTimezoneExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_TIMEZONE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteTimezoneExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_LANGUAGE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateLanguageExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_LANGUAGE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateLanguageExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_LANGUAGE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteLanguageExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_FONT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateFontExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_FONT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateFontExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_FONT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteFontExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_THROUGHPUT_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateThroughputPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_THROUGHPUT_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateThroughputPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_THROUGHPUT_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteThroughputPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_FREQUENCY_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateFrequencyPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_FREQUENCY_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateFrequencyPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_FREQUENCY_POLICY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteFrequencyPolicyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_CONSENT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateConsentExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_CONSENT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateConsentExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_CONSENT_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteConsentExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreateUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_URL_LIST_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreateUrlListExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdateUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_URL_LIST_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdateUrlListExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeleteUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_URL_LIST_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeleteUrlListExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class CreatePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_PAGE_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'CreatePageVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class UpdatePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_PAGE_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'UpdatePageVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class DeletePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_PAGE_VARIABLE_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'DeletePageVariableExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createCampaignSettingsActionExecutors(): Record<
  string,
  CampaignSettingsActionExecutor
> {
  return {
    [UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE]: new UpdateCampaignDefaultsExecutor(),
    [CREATE_TIMEZONE_ACTION_TYPE]: new CreateTimezoneExecutor(),
    [UPDATE_TIMEZONE_ACTION_TYPE]: new UpdateTimezoneExecutor(),
    [DELETE_TIMEZONE_ACTION_TYPE]: new DeleteTimezoneExecutor(),
    [CREATE_LANGUAGE_ACTION_TYPE]: new CreateLanguageExecutor(),
    [UPDATE_LANGUAGE_ACTION_TYPE]: new UpdateLanguageExecutor(),
    [DELETE_LANGUAGE_ACTION_TYPE]: new DeleteLanguageExecutor(),
    [CREATE_FONT_ACTION_TYPE]: new CreateFontExecutor(),
    [UPDATE_FONT_ACTION_TYPE]: new UpdateFontExecutor(),
    [DELETE_FONT_ACTION_TYPE]: new DeleteFontExecutor(),
    [CREATE_THROUGHPUT_POLICY_ACTION_TYPE]: new CreateThroughputPolicyExecutor(),
    [UPDATE_THROUGHPUT_POLICY_ACTION_TYPE]: new UpdateThroughputPolicyExecutor(),
    [DELETE_THROUGHPUT_POLICY_ACTION_TYPE]: new DeleteThroughputPolicyExecutor(),
    [CREATE_FREQUENCY_POLICY_ACTION_TYPE]: new CreateFrequencyPolicyExecutor(),
    [UPDATE_FREQUENCY_POLICY_ACTION_TYPE]: new UpdateFrequencyPolicyExecutor(),
    [DELETE_FREQUENCY_POLICY_ACTION_TYPE]: new DeleteFrequencyPolicyExecutor(),
    [CREATE_CONSENT_ACTION_TYPE]: new CreateConsentExecutor(),
    [UPDATE_CONSENT_ACTION_TYPE]: new UpdateConsentExecutor(),
    [DELETE_CONSENT_ACTION_TYPE]: new DeleteConsentExecutor(),
    [CREATE_URL_LIST_ACTION_TYPE]: new CreateUrlListExecutor(),
    [UPDATE_URL_LIST_ACTION_TYPE]: new UpdateUrlListExecutor(),
    [DELETE_URL_LIST_ACTION_TYPE]: new DeleteUrlListExecutor(),
    [CREATE_PAGE_VARIABLE_ACTION_TYPE]: new CreatePageVariableExecutor(),
    [UPDATE_PAGE_VARIABLE_ACTION_TYPE]: new UpdatePageVariableExecutor(),
    [DELETE_PAGE_VARIABLE_ACTION_TYPE]: new DeletePageVariableExecutor(),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachCampaignSettingsService {
  private readonly campaignsUrl: string;
  private readonly timezonesUrl: string;
  private readonly languagesUrl: string;
  private readonly fontsUrl: string;
  private readonly throughputUrl: string;
  private readonly frequencyUrl: string;
  private readonly consentsUrl: string;
  private readonly urlListsUrl: string;
  private readonly pageVariablesUrl: string;

  constructor(project: string) {
    const validated = validateProject(project);
    this.campaignsUrl = buildCampaignSettingsUrl(validated);
    this.timezonesUrl = buildTimezonesUrl(validated);
    this.languagesUrl = buildLanguagesUrl(validated);
    this.fontsUrl = buildFontsUrl(validated);
    this.throughputUrl = buildThroughputPolicyUrl(validated);
    this.frequencyUrl = buildFrequencyPoliciesUrl(validated);
    this.consentsUrl = buildConsentsUrl(validated);
    this.urlListsUrl = buildGlobalUrlListsUrl(validated);
    this.pageVariablesUrl = buildPageVariablesUrl(validated);
  }

  get campaignSettingsUrl(): string {
    return this.campaignsUrl;
  }

  get timezonesSettingsUrl(): string {
    return this.timezonesUrl;
  }

  get languagesSettingsUrl(): string {
    return this.languagesUrl;
  }

  get fontsSettingsUrl(): string {
    return this.fontsUrl;
  }

  get throughputPolicySettingsUrl(): string {
    return this.throughputUrl;
  }

  get frequencyPoliciesSettingsUrl(): string {
    return this.frequencyUrl;
  }

  get consentsSettingsUrl(): string {
    return this.consentsUrl;
  }

  get globalUrlListsSettingsUrl(): string {
    return this.urlListsUrl;
  }

  get pageVariablesSettingsUrl(): string {
    return this.pageVariablesUrl;
  }

  async viewCampaignDefaults(
    _input?: ViewCampaignDefaultsInput,
  ): Promise<BloomreachCampaignDefaults> {
    throw new Error(
      'viewCampaignDefaults: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listTimezones(_input?: ListTimezonesInput): Promise<BloomreachTimezone[]> {
    throw new Error(
      'listTimezones: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listLanguages(_input?: ListLanguagesInput): Promise<BloomreachLanguage[]> {
    throw new Error(
      'listLanguages: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listFonts(_input?: ListFontsInput): Promise<BloomreachFont[]> {
    throw new Error('listFonts: not yet implemented. Requires browser automation infrastructure.');
  }

  async listThroughputPolicies(
    _input?: ListThroughputPoliciesInput,
  ): Promise<BloomreachThroughputPolicy[]> {
    throw new Error(
      'listThroughputPolicies: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listFrequencyPolicies(
    _input?: ListFrequencyPoliciesInput,
  ): Promise<BloomreachFrequencyPolicy[]> {
    throw new Error(
      'listFrequencyPolicies: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listConsents(_input?: ListConsentsInput): Promise<BloomreachConsent[]> {
    throw new Error(
      'listConsents: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listUrlLists(_input?: ListUrlListsInput): Promise<BloomreachUrlList[]> {
    throw new Error(
      'listUrlLists: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async listPageVariables(_input?: ListPageVariablesInput): Promise<BloomreachPageVariable[]> {
    throw new Error(
      'listPageVariables: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareUpdateCampaignDefaults(
    input: UpdateCampaignDefaultsInput,
  ): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const defaultSenderName =
      input.defaultSenderName !== undefined
        ? validatePolicyName(input.defaultSenderName)
        : undefined;
    const defaultSenderEmail =
      input.defaultSenderEmail !== undefined ? input.defaultSenderEmail.trim() : undefined;
    const defaultReplyToEmail =
      input.defaultReplyToEmail !== undefined ? input.defaultReplyToEmail.trim() : undefined;
    const defaultUtmSource =
      input.defaultUtmSource !== undefined ? input.defaultUtmSource.trim() : undefined;
    const defaultUtmMedium =
      input.defaultUtmMedium !== undefined ? input.defaultUtmMedium.trim() : undefined;
    const defaultUtmCampaign =
      input.defaultUtmCampaign !== undefined ? input.defaultUtmCampaign.trim() : undefined;

    if (
      defaultSenderName === undefined &&
      defaultSenderEmail === undefined &&
      defaultReplyToEmail === undefined &&
      defaultUtmSource === undefined &&
      defaultUtmMedium === undefined &&
      defaultUtmCampaign === undefined
    ) {
      throw new Error('At least one campaign default field must be provided for defaults update.');
    }

    const preview = {
      action: UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE,
      project,
      defaultSenderName,
      defaultSenderEmail,
      defaultReplyToEmail,
      defaultUtmSource,
      defaultUtmMedium,
      defaultUtmCampaign,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateTimezone(input: CreateTimezoneInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validateTimezoneName(input.name);

    const preview = {
      action: CREATE_TIMEZONE_ACTION_TYPE,
      project,
      name,
      utcOffset: input.utcOffset,
      isDefault: input.isDefault,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateTimezone(input: UpdateTimezoneInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const timezoneId = validateTimezoneId(input.timezoneId);
    const name = input.name !== undefined ? validateTimezoneName(input.name) : undefined;

    if (name === undefined && input.utcOffset === undefined && input.isDefault === undefined) {
      throw new Error(
        'At least one of name, utcOffset, or isDefault must be provided for timezone update.',
      );
    }

    const preview = {
      action: UPDATE_TIMEZONE_ACTION_TYPE,
      project,
      timezoneId,
      name,
      utcOffset: input.utcOffset,
      isDefault: input.isDefault,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteTimezone(input: DeleteTimezoneInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const timezoneId = validateTimezoneId(input.timezoneId);

    const preview = {
      action: DELETE_TIMEZONE_ACTION_TYPE,
      project,
      timezoneId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateLanguage(input: CreateLanguageInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const code = validateLanguageCode(input.code);
    const name = validateLanguageName(input.name);

    const preview = {
      action: CREATE_LANGUAGE_ACTION_TYPE,
      project,
      code,
      name,
      isDefault: input.isDefault,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateLanguage(input: UpdateLanguageInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const languageCode = validateLanguageCode(input.languageCode);
    const code = input.code !== undefined ? validateLanguageCode(input.code) : undefined;
    const name = input.name !== undefined ? validateLanguageName(input.name) : undefined;

    if (code === undefined && name === undefined && input.isDefault === undefined) {
      throw new Error(
        'At least one of code, name, or isDefault must be provided for language update.',
      );
    }

    const preview = {
      action: UPDATE_LANGUAGE_ACTION_TYPE,
      project,
      languageCode,
      code,
      name,
      isDefault: input.isDefault,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteLanguage(input: DeleteLanguageInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const languageCode = validateLanguageCode(input.languageCode);

    const preview = {
      action: DELETE_LANGUAGE_ACTION_TYPE,
      project,
      languageCode,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateFont(input: CreateFontInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validateFontName(input.name);
    const type = input.type.trim();
    if (type.length === 0) {
      throw new Error('Font type must not be empty.');
    }

    const preview = {
      action: CREATE_FONT_ACTION_TYPE,
      project,
      name,
      type,
      fileUrl: input.fileUrl,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateFont(input: UpdateFontInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const fontId = validateFontId(input.fontId);
    const name = input.name !== undefined ? validateFontName(input.name) : undefined;
    const type = input.type !== undefined ? input.type.trim() : undefined;

    if (type !== undefined && type.length === 0) {
      throw new Error('Font type must not be empty.');
    }

    if (name === undefined && type === undefined && input.fileUrl === undefined) {
      throw new Error('At least one of name, type, or fileUrl must be provided for font update.');
    }

    const preview = {
      action: UPDATE_FONT_ACTION_TYPE,
      project,
      fontId,
      name,
      type,
      fileUrl: input.fileUrl,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteFont(input: DeleteFontInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const fontId = validateFontId(input.fontId);

    const preview = {
      action: DELETE_FONT_ACTION_TYPE,
      project,
      fontId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateThroughputPolicy(
    input: CreateThroughputPolicyInput,
  ): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validatePolicyName(input.name);

    const preview = {
      action: CREATE_THROUGHPUT_POLICY_ACTION_TYPE,
      project,
      name,
      channel: input.channel,
      maxRate: input.maxRate,
      periodSeconds: input.periodSeconds,
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

  prepareUpdateThroughputPolicy(
    input: UpdateThroughputPolicyInput,
  ): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const policyId = validatePolicyId(input.policyId);
    const name = input.name !== undefined ? validatePolicyName(input.name) : undefined;

    if (
      name === undefined &&
      input.channel === undefined &&
      input.maxRate === undefined &&
      input.periodSeconds === undefined &&
      input.description === undefined
    ) {
      throw new Error(
        'At least one modifiable field must be provided for throughput policy update.',
      );
    }

    const preview = {
      action: UPDATE_THROUGHPUT_POLICY_ACTION_TYPE,
      project,
      policyId,
      name,
      channel: input.channel,
      maxRate: input.maxRate,
      periodSeconds: input.periodSeconds,
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

  prepareDeleteThroughputPolicy(
    input: DeleteThroughputPolicyInput,
  ): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const policyId = validatePolicyId(input.policyId);

    const preview = {
      action: DELETE_THROUGHPUT_POLICY_ACTION_TYPE,
      project,
      policyId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateFrequencyPolicy(input: CreateFrequencyPolicyInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validatePolicyName(input.name);

    const preview = {
      action: CREATE_FREQUENCY_POLICY_ACTION_TYPE,
      project,
      name,
      policyType: input.policyType,
      maxSends: input.maxSends,
      windowHours: input.windowHours,
      channels: input.channels,
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

  prepareUpdateFrequencyPolicy(input: UpdateFrequencyPolicyInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const policyId = validatePolicyId(input.policyId);
    const name = input.name !== undefined ? validatePolicyName(input.name) : undefined;

    if (
      name === undefined &&
      input.policyType === undefined &&
      input.maxSends === undefined &&
      input.windowHours === undefined &&
      input.channels === undefined &&
      input.description === undefined
    ) {
      throw new Error(
        'At least one modifiable field must be provided for frequency policy update.',
      );
    }

    const preview = {
      action: UPDATE_FREQUENCY_POLICY_ACTION_TYPE,
      project,
      policyId,
      name,
      policyType: input.policyType,
      maxSends: input.maxSends,
      windowHours: input.windowHours,
      channels: input.channels,
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

  prepareDeleteFrequencyPolicy(input: DeleteFrequencyPolicyInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const policyId = validatePolicyId(input.policyId);

    const preview = {
      action: DELETE_FREQUENCY_POLICY_ACTION_TYPE,
      project,
      policyId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateConsent(input: CreateConsentInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const category = validateConsentCategory(input.category);

    const preview = {
      action: CREATE_CONSENT_ACTION_TYPE,
      project,
      category,
      description: input.description,
      consentType: input.consentType,
      legitimateInterest: input.legitimateInterest,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareUpdateConsent(input: UpdateConsentInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const consentId = validateConsentId(input.consentId);
    const category =
      input.category !== undefined ? validateConsentCategory(input.category) : undefined;

    if (
      category === undefined &&
      input.description === undefined &&
      input.consentType === undefined &&
      input.legitimateInterest === undefined
    ) {
      throw new Error(
        'At least one of category, description, consentType, or legitimateInterest must be provided for consent update.',
      );
    }

    const preview = {
      action: UPDATE_CONSENT_ACTION_TYPE,
      project,
      consentId,
      category,
      description: input.description,
      consentType: input.consentType,
      legitimateInterest: input.legitimateInterest,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareDeleteConsent(input: DeleteConsentInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const consentId = validateConsentId(input.consentId);

    const preview = {
      action: DELETE_CONSENT_ACTION_TYPE,
      project,
      consentId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreateUrlList(input: CreateUrlListInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validateUrlListName(input.name);
    const listType = input.listType.trim();
    if (listType.length === 0) {
      throw new Error('URL list type must not be empty.');
    }

    const preview = {
      action: CREATE_URL_LIST_ACTION_TYPE,
      project,
      name,
      listType,
      urls: input.urls,
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

  prepareUpdateUrlList(input: UpdateUrlListInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const urlListId = validateUrlListId(input.urlListId);
    const name = input.name !== undefined ? validateUrlListName(input.name) : undefined;
    const listType = input.listType !== undefined ? input.listType.trim() : undefined;

    if (listType !== undefined && listType.length === 0) {
      throw new Error('URL list type must not be empty.');
    }

    if (
      name === undefined &&
      listType === undefined &&
      input.urls === undefined &&
      input.description === undefined
    ) {
      throw new Error(
        'At least one of name, listType, urls, or description must be provided for URL list update.',
      );
    }

    const preview = {
      action: UPDATE_URL_LIST_ACTION_TYPE,
      project,
      urlListId,
      name,
      listType,
      urls: input.urls,
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

  prepareDeleteUrlList(input: DeleteUrlListInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const urlListId = validateUrlListId(input.urlListId);

    const preview = {
      action: DELETE_URL_LIST_ACTION_TYPE,
      project,
      urlListId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCreatePageVariable(input: CreatePageVariableInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const name = validatePageVariableName(input.name);
    const value = validatePageVariableValue(input.value);

    const preview = {
      action: CREATE_PAGE_VARIABLE_ACTION_TYPE,
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

  prepareUpdatePageVariable(input: UpdatePageVariableInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const pageVariableId = validatePageVariableId(input.pageVariableId);
    const name = input.name !== undefined ? validatePageVariableName(input.name) : undefined;
    const value = input.value !== undefined ? validatePageVariableValue(input.value) : undefined;

    if (name === undefined && value === undefined && input.description === undefined) {
      throw new Error(
        'At least one of name, value, or description must be provided for page variable update.',
      );
    }

    const preview = {
      action: UPDATE_PAGE_VARIABLE_ACTION_TYPE,
      project,
      pageVariableId,
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

  prepareDeletePageVariable(input: DeletePageVariableInput): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const pageVariableId = validatePageVariableId(input.pageVariableId);

    const preview = {
      action: DELETE_PAGE_VARIABLE_ACTION_TYPE,
      project,
      pageVariableId,
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
