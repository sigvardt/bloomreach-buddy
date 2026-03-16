import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireString } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

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
  requireString(name, 'Timezone name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_TIMEZONE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Timezone name must not be empty.');
  }
  if (trimmed.length > MAX_TIMEZONE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Timezone name must not exceed ${MAX_TIMEZONE_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateTimezoneId(id: string): string {
  requireString(id, 'Timezone ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Timezone ID must not be empty.');
  }
  return trimmed;
}

export function validateLanguageCode(code: string): string {
  requireString(code, 'Language code');
  const trimmed = code.trim();
  if (trimmed.length < MIN_LANGUAGE_CODE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Language code must not be empty.');
  }
  if (trimmed.length > MAX_LANGUAGE_CODE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Language code must not exceed ${MAX_LANGUAGE_CODE_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateLanguageName(name: string): string {
  requireString(name, 'Language name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_LANGUAGE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Language name must not be empty.');
  }
  if (trimmed.length > MAX_LANGUAGE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Language name must not exceed ${MAX_LANGUAGE_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateFontName(name: string): string {
  requireString(name, 'Font name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_FONT_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Font name must not be empty.');
  }
  if (trimmed.length > MAX_FONT_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Font name must not exceed ${MAX_FONT_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateFontId(id: string): string {
  requireString(id, 'Font ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Font ID must not be empty.');
  }
  return trimmed;
}

export function validatePolicyName(name: string): string {
  requireString(name, 'Policy name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_POLICY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Policy name must not be empty.');
  }
  if (trimmed.length > MAX_POLICY_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Policy name must not exceed ${MAX_POLICY_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validatePolicyId(id: string): string {
  requireString(id, 'Policy ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Policy ID must not be empty.');
  }
  return trimmed;
}

export function validateConsentCategory(category: string): string {
  requireString(category, 'Consent category');
  const trimmed = category.trim();
  if (trimmed.length < MIN_CONSENT_CATEGORY_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Consent category must not be empty.');
  }
  if (trimmed.length > MAX_CONSENT_CATEGORY_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Consent category must not exceed ${MAX_CONSENT_CATEGORY_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateConsentId(id: string): string {
  requireString(id, 'Consent ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Consent ID must not be empty.');
  }
  return trimmed;
}

export function validateUrlListName(name: string): string {
  requireString(name, 'URL list name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_URL_LIST_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'URL list name must not be empty.');
  }
  if (trimmed.length > MAX_URL_LIST_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `URL list name must not exceed ${MAX_URL_LIST_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validateUrlListId(id: string): string {
  requireString(id, 'URL list ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'URL list ID must not be empty.');
  }
  return trimmed;
}

export function validatePageVariableName(name: string): string {
  requireString(name, 'Page variable name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_PAGE_VARIABLE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Page variable name must not be empty.');
  }
  if (trimmed.length > MAX_PAGE_VARIABLE_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Page variable name must not exceed ${MAX_PAGE_VARIABLE_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

export function validatePageVariableId(id: string): string {
  requireString(id, 'Page variable ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Page variable ID must not be empty.');
  }
  return trimmed;
}

export function validatePageVariableValue(value: string): string {
  requireString(value, 'Page variable value');
  const trimmed = value.trim();
  if (trimmed.length > MAX_PAGE_VARIABLE_VALUE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Page variable value must not exceed ${MAX_PAGE_VARIABLE_VALUE_LENGTH} characters (got ${trimmed.length}).`);
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

export interface CampaignSettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class UpdateCampaignDefaultsExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateCampaignDefaultsExecutor: not yet implemented. ' +
      'Campaign defaults updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_TIMEZONE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateTimezoneExecutor: not yet implemented. ' +
      'Timezone creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_TIMEZONE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateTimezoneExecutor: not yet implemented. ' +
      'Timezone updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteTimezoneExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_TIMEZONE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteTimezoneExecutor: not yet implemented. ' +
      'Timezone deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_LANGUAGE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateLanguageExecutor: not yet implemented. ' +
      'Language creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_LANGUAGE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateLanguageExecutor: not yet implemented. ' +
      'Language updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteLanguageExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_LANGUAGE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteLanguageExecutor: not yet implemented. ' +
      'Language deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_FONT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateFontExecutor: not yet implemented. ' +
      'Font creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_FONT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateFontExecutor: not yet implemented. ' +
      'Font updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteFontExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_FONT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteFontExecutor: not yet implemented. ' +
      'Font deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_THROUGHPUT_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateThroughputPolicyExecutor: not yet implemented. ' +
      'Throughput policy creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_THROUGHPUT_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateThroughputPolicyExecutor: not yet implemented. ' +
      'Throughput policy updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteThroughputPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_THROUGHPUT_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteThroughputPolicyExecutor: not yet implemented. ' +
      'Throughput policy deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_FREQUENCY_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateFrequencyPolicyExecutor: not yet implemented. ' +
      'Frequency policy creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_FREQUENCY_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateFrequencyPolicyExecutor: not yet implemented. ' +
      'Frequency policy updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteFrequencyPolicyExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_FREQUENCY_POLICY_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteFrequencyPolicyExecutor: not yet implemented. ' +
      'Frequency policy deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_CONSENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateConsentExecutor: not yet implemented. ' +
      'Consent creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_CONSENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateConsentExecutor: not yet implemented. ' +
      'Consent updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteConsentExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_CONSENT_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteConsentExecutor: not yet implemented. ' +
      'Consent deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreateUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_URL_LIST_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateUrlListExecutor: not yet implemented. ' +
      'URL list creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdateUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_URL_LIST_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdateUrlListExecutor: not yet implemented. ' +
      'URL list updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeleteUrlListExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_URL_LIST_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeleteUrlListExecutor: not yet implemented. ' +
      'URL list deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class CreatePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = CREATE_PAGE_VARIABLE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreatePageVariableExecutor: not yet implemented. ' +
      'Page variable creation is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class UpdatePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = UPDATE_PAGE_VARIABLE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'UpdatePageVariableExecutor: not yet implemented. ' +
      'Page variable updates are only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

class DeletePageVariableExecutor implements CampaignSettingsActionExecutor {
  readonly actionType = DELETE_PAGE_VARIABLE_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'DeletePageVariableExecutor: not yet implemented. ' +
      'Page variable deletion is only available through the Bloomreach Engagement UI.', { not_implemented: true });
  }
}

export function createCampaignSettingsActionExecutors(apiConfig?: BloomreachApiConfig): Record<
  string,
  CampaignSettingsActionExecutor
> {
  return {
    [UPDATE_CAMPAIGN_DEFAULTS_ACTION_TYPE]: new UpdateCampaignDefaultsExecutor(apiConfig),
    [CREATE_TIMEZONE_ACTION_TYPE]: new CreateTimezoneExecutor(apiConfig),
    [UPDATE_TIMEZONE_ACTION_TYPE]: new UpdateTimezoneExecutor(apiConfig),
    [DELETE_TIMEZONE_ACTION_TYPE]: new DeleteTimezoneExecutor(apiConfig),
    [CREATE_LANGUAGE_ACTION_TYPE]: new CreateLanguageExecutor(apiConfig),
    [UPDATE_LANGUAGE_ACTION_TYPE]: new UpdateLanguageExecutor(apiConfig),
    [DELETE_LANGUAGE_ACTION_TYPE]: new DeleteLanguageExecutor(apiConfig),
    [CREATE_FONT_ACTION_TYPE]: new CreateFontExecutor(apiConfig),
    [UPDATE_FONT_ACTION_TYPE]: new UpdateFontExecutor(apiConfig),
    [DELETE_FONT_ACTION_TYPE]: new DeleteFontExecutor(apiConfig),
    [CREATE_THROUGHPUT_POLICY_ACTION_TYPE]: new CreateThroughputPolicyExecutor(apiConfig),
    [UPDATE_THROUGHPUT_POLICY_ACTION_TYPE]: new UpdateThroughputPolicyExecutor(apiConfig),
    [DELETE_THROUGHPUT_POLICY_ACTION_TYPE]: new DeleteThroughputPolicyExecutor(apiConfig),
    [CREATE_FREQUENCY_POLICY_ACTION_TYPE]: new CreateFrequencyPolicyExecutor(apiConfig),
    [UPDATE_FREQUENCY_POLICY_ACTION_TYPE]: new UpdateFrequencyPolicyExecutor(apiConfig),
    [DELETE_FREQUENCY_POLICY_ACTION_TYPE]: new DeleteFrequencyPolicyExecutor(apiConfig),
    [CREATE_CONSENT_ACTION_TYPE]: new CreateConsentExecutor(apiConfig),
    [UPDATE_CONSENT_ACTION_TYPE]: new UpdateConsentExecutor(apiConfig),
    [DELETE_CONSENT_ACTION_TYPE]: new DeleteConsentExecutor(apiConfig),
    [CREATE_URL_LIST_ACTION_TYPE]: new CreateUrlListExecutor(apiConfig),
    [UPDATE_URL_LIST_ACTION_TYPE]: new UpdateUrlListExecutor(apiConfig),
    [DELETE_URL_LIST_ACTION_TYPE]: new DeleteUrlListExecutor(apiConfig),
    [CREATE_PAGE_VARIABLE_ACTION_TYPE]: new CreatePageVariableExecutor(apiConfig),
    [UPDATE_PAGE_VARIABLE_ACTION_TYPE]: new UpdatePageVariableExecutor(apiConfig),
    [DELETE_PAGE_VARIABLE_ACTION_TYPE]: new DeletePageVariableExecutor(apiConfig),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachCampaignSettingsService {
  private readonly apiConfig?: BloomreachApiConfig;
  private readonly campaignsUrl: string;
  private readonly timezonesUrl: string;
  private readonly languagesUrl: string;
  private readonly fontsUrl: string;
  private readonly throughputUrl: string;
  private readonly frequencyUrl: string;
  private readonly consentsUrl: string;
  private readonly urlListsUrl: string;
  private readonly pageVariablesUrl: string;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    const validated = validateProject(project);
    this.apiConfig = apiConfig;
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
    input?: ViewCampaignDefaultsInput,
  ): Promise<BloomreachCampaignDefaults> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewCampaignDefaults: not yet implemented. the Bloomreach API does not provide an endpoint for campaign defaults. ' +
      'Campaign defaults must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Campaigns).', { not_implemented: true });
  }

  async listTimezones(input?: ListTimezonesInput): Promise<BloomreachTimezone[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listTimezones: not yet implemented. the Bloomreach API does not provide an endpoint for timezones. ' +
      'Timezones must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Timezones).', { not_implemented: true });
  }

  async listLanguages(input?: ListLanguagesInput): Promise<BloomreachLanguage[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listLanguages: not yet implemented. the Bloomreach API does not provide an endpoint for languages. ' +
      'Languages must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Languages).', { not_implemented: true });
  }

  async listFonts(input?: ListFontsInput): Promise<BloomreachFont[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listFonts: not yet implemented. the Bloomreach API does not provide an endpoint for fonts. ' +
      'Fonts must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Fonts).', { not_implemented: true });
  }

  async listThroughputPolicies(
    input?: ListThroughputPoliciesInput,
  ): Promise<BloomreachThroughputPolicy[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listThroughputPolicies: not yet implemented. the Bloomreach API does not provide an endpoint for throughput policies. ' +
      'Throughput policies must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Throughput Policy).', { not_implemented: true });
  }

  async listFrequencyPolicies(
    input?: ListFrequencyPoliciesInput,
  ): Promise<BloomreachFrequencyPolicy[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listFrequencyPolicies: not yet implemented. the Bloomreach API does not provide an endpoint for frequency policies. ' +
      'Frequency policies must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Campaign Frequency Policies).', { not_implemented: true });
  }

  async listConsents(input?: ListConsentsInput): Promise<BloomreachConsent[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listConsents: not yet implemented. the Bloomreach API does not provide an endpoint for consents. ' +
      'Consents must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Consents).', { not_implemented: true });
  }

  async listUrlLists(input?: ListUrlListsInput): Promise<BloomreachUrlList[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listUrlLists: not yet implemented. the Bloomreach API does not provide an endpoint for URL lists. ' +
      'URL lists must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Global URL Lists).', { not_implemented: true });
  }

  async listPageVariables(input?: ListPageVariablesInput): Promise<BloomreachPageVariable[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listPageVariables: not yet implemented. the Bloomreach API does not provide an endpoint for page variables. ' +
      'Page variables must be managed through the Bloomreach Engagement UI (navigate to Project Settings > Page Variables).', { not_implemented: true });
  }

  prepareUpdateCampaignDefaults(
    input: UpdateCampaignDefaultsInput,
  ): PreparedCampaignSettingsAction {
    const project = validateProject(input.project);
    const defaultSenderName =
      input.defaultSenderName !== undefined
        ? validatePolicyName(input.defaultSenderName)
        : undefined;
    if (input.defaultSenderEmail !== undefined) {
      requireString(input.defaultSenderEmail, 'Default sender email');
    }
    const defaultSenderEmail =
      input.defaultSenderEmail !== undefined ? input.defaultSenderEmail.trim() : undefined;
    if (input.defaultReplyToEmail !== undefined) {
      requireString(input.defaultReplyToEmail, 'Default reply-to email');
    }
    const defaultReplyToEmail =
      input.defaultReplyToEmail !== undefined ? input.defaultReplyToEmail.trim() : undefined;
    if (input.defaultUtmSource !== undefined) {
      requireString(input.defaultUtmSource, 'Default UTM source');
    }
    const defaultUtmSource =
      input.defaultUtmSource !== undefined ? input.defaultUtmSource.trim() : undefined;
    if (input.defaultUtmMedium !== undefined) {
      requireString(input.defaultUtmMedium, 'Default UTM medium');
    }
    const defaultUtmMedium =
      input.defaultUtmMedium !== undefined ? input.defaultUtmMedium.trim() : undefined;
    if (input.defaultUtmCampaign !== undefined) {
      requireString(input.defaultUtmCampaign, 'Default UTM campaign');
    }
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one campaign default field must be provided for defaults update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of name, utcOffset, or isDefault must be provided for timezone update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of code, name, or isDefault must be provided for language update.');
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
    requireString(input.type, 'Font type');
    const type = input.type.trim();
    if (type.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Font type must not be empty.');
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
    if (input.type !== undefined) {
      requireString(input.type, 'Font type');
    }
    const type = input.type !== undefined ? input.type.trim() : undefined;

    if (type !== undefined && type.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Font type must not be empty.');
    }

    if (name === undefined && type === undefined && input.fileUrl === undefined) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of name, type, or fileUrl must be provided for font update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one modifiable field must be provided for throughput policy update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one modifiable field must be provided for frequency policy update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of category, description, consentType, or legitimateInterest must be provided for consent update.');
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
    requireString(input.listType, 'URL list type');
    const listType = input.listType.trim();
    if (listType.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'URL list type must not be empty.');
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
    if (input.listType !== undefined) {
      requireString(input.listType, 'URL list type');
    }
    const listType = input.listType !== undefined ? input.listType.trim() : undefined;

    if (listType !== undefined && listType.length === 0) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'URL list type must not be empty.');
    }

    if (
      name === undefined &&
      listType === undefined &&
      input.urls === undefined &&
      input.description === undefined
    ) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of name, listType, urls, or description must be provided for URL list update.');
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
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'At least one of name, value, or description must be provided for page variable update.');
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
