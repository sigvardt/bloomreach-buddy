import { validateProject } from './bloomreachDashboards.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE = 'channel_settings.configure_email_domain';
export const CONFIGURE_PUSH_PROVIDER_ACTION_TYPE = 'channel_settings.configure_push_provider';
export const CONFIGURE_SMS_PROVIDER_ACTION_TYPE = 'channel_settings.configure_sms_provider';
export const CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE =
  'channel_settings.configure_mobile_messaging';
export const CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE =
  'channel_settings.configure_payment_tracking';
export const CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE =
  'channel_settings.configure_facebook_messaging';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

export const CHANNEL_SETTINGS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const CHANNEL_SETTINGS_CONFIGURE_RATE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface BloomreachEmailSettings {
  senderDomains?: string[];
  dkimConfigured?: boolean;
  spfConfigured?: boolean;
  defaultFromAddress?: string;
  url: string;
}

export interface BloomreachPushNotificationSettings {
  provider?: string;
  firebaseConfigured?: boolean;
  apnsConfigured?: boolean;
  url: string;
}

export interface BloomreachSmsSettings {
  provider?: string;
  senderNumber?: string;
  url: string;
}

export interface BloomreachMobileMessagingSettings {
  whatsappConfigured?: boolean;
  rcsConfigured?: boolean;
  url: string;
}

export interface BloomreachPaymentTrackingSettings {
  provider?: string;
  enabled?: boolean;
  url: string;
}

export interface BloomreachFacebookMessagingSettings {
  pageConnected?: boolean;
  pageName?: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ViewEmailSettingsInput {
  project: string;
}

export interface ViewPushNotificationSettingsInput {
  project: string;
}

export interface ViewSmsSettingsInput {
  project: string;
}

export interface ViewMobileMessagingSettingsInput {
  project: string;
}

export interface ViewPaymentTrackingSettingsInput {
  project: string;
}

export interface ViewFacebookMessagingSettingsInput {
  project: string;
}

export interface ConfigureEmailDomainInput {
  project: string;
  domain: string;
  operatorNote?: string;
}

export interface ConfigurePushProviderInput {
  project: string;
  provider: string;
  firebaseCredentials?: string;
  apnsCertificate?: string;
  operatorNote?: string;
}

export interface ConfigureSmsProviderInput {
  project: string;
  provider: string;
  senderNumber?: string;
  operatorNote?: string;
}

export interface ConfigureMobileMessagingInput {
  project: string;
  provider: string;
  whatsappEnabled?: boolean;
  rcsEnabled?: boolean;
  operatorNote?: string;
}

export interface ConfigurePaymentTrackingInput {
  project: string;
  provider: string;
  enabled?: boolean;
  operatorNote?: string;
}

export interface ConfigureFacebookMessagingInput {
  project: string;
  pageId: string;
  accessToken?: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

export interface PreparedChannelSettingsAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_DOMAIN_LENGTH = 253;
const MAX_PROVIDER_NAME_LENGTH = 100;
const MAX_SENDER_NUMBER_LENGTH = 30;

export function validateDomain(domain: string): string {
  const trimmed = domain.trim();
  if (trimmed.length === 0) {
    throw new Error('Domain must not be empty.');
  }
  if (trimmed.length > MAX_DOMAIN_LENGTH) {
    throw new Error(
      `Domain must not exceed ${MAX_DOMAIN_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateProviderName(provider: string): string {
  const trimmed = provider.trim();
  if (trimmed.length === 0) {
    throw new Error('Provider name must not be empty.');
  }
  if (trimmed.length > MAX_PROVIDER_NAME_LENGTH) {
    throw new Error(
      `Provider name must not exceed ${MAX_PROVIDER_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateSenderNumber(number: string): string {
  const trimmed = number.trim();
  if (trimmed.length === 0) {
    throw new Error('Sender number must not be empty.');
  }
  if (trimmed.length > MAX_SENDER_NUMBER_LENGTH) {
    throw new Error(
      `Sender number must not exceed ${MAX_SENDER_NUMBER_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validatePageId(pageId: string): string {
  const trimmed = pageId.trim();
  if (trimmed.length === 0) {
    throw new Error('Page ID must not be empty.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildEmailSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/emails`;
}

export function buildPushNotificationSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/push-notifications`;
}

export function buildSmsSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/sms`;
}

export function buildMobileMessagingSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/mobile-messaging`;
}

export function buildPaymentTrackingSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/payment-tracking`;
}

export function buildFacebookMessagingSettingsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/facebook-messaging`;
}

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface ChannelSettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class ConfigureEmailDomainExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureEmailDomainExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigurePushProviderExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_PUSH_PROVIDER_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigurePushProviderExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureSmsProviderExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_SMS_PROVIDER_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureSmsProviderExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureMobileMessagingExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureMobileMessagingExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigurePaymentTrackingExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigurePaymentTrackingExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureFacebookMessagingExecutor implements ChannelSettingsActionExecutor {
  readonly actionType = CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureFacebookMessagingExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createChannelSettingsActionExecutors(): Record<string, ChannelSettingsActionExecutor> {
  return {
    [CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE]: new ConfigureEmailDomainExecutor(),
    [CONFIGURE_PUSH_PROVIDER_ACTION_TYPE]: new ConfigurePushProviderExecutor(),
    [CONFIGURE_SMS_PROVIDER_ACTION_TYPE]: new ConfigureSmsProviderExecutor(),
    [CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE]: new ConfigureMobileMessagingExecutor(),
    [CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE]: new ConfigurePaymentTrackingExecutor(),
    [CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE]: new ConfigureFacebookMessagingExecutor(),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachChannelSettingsService {
  private readonly emailsUrl: string;
  private readonly pushNotificationsUrl: string;
  private readonly smsUrl: string;
  private readonly mobileMessagingUrl: string;
  private readonly paymentTrackingUrl: string;
  private readonly facebookMessagingUrl: string;

  constructor(project: string) {
    const validated = validateProject(project);
    this.emailsUrl = buildEmailSettingsUrl(validated);
    this.pushNotificationsUrl = buildPushNotificationSettingsUrl(validated);
    this.smsUrl = buildSmsSettingsUrl(validated);
    this.mobileMessagingUrl = buildMobileMessagingSettingsUrl(validated);
    this.paymentTrackingUrl = buildPaymentTrackingSettingsUrl(validated);
    this.facebookMessagingUrl = buildFacebookMessagingSettingsUrl(validated);
  }

  get emailSettingsUrl(): string {
    return this.emailsUrl;
  }

  get pushNotificationSettingsUrl(): string {
    return this.pushNotificationsUrl;
  }

  get smsSettingsUrl(): string {
    return this.smsUrl;
  }

  get mobileMessagingSettingsUrl(): string {
    return this.mobileMessagingUrl;
  }

  get paymentTrackingSettingsUrl(): string {
    return this.paymentTrackingUrl;
  }

  get facebookMessagingSettingsUrl(): string {
    return this.facebookMessagingUrl;
  }

  async viewEmailSettings(_input?: ViewEmailSettingsInput): Promise<BloomreachEmailSettings> {
    throw new Error(
      'viewEmailSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewPushNotificationSettings(
    _input?: ViewPushNotificationSettingsInput,
  ): Promise<BloomreachPushNotificationSettings> {
    throw new Error(
      'viewPushNotificationSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewSmsSettings(_input?: ViewSmsSettingsInput): Promise<BloomreachSmsSettings> {
    throw new Error(
      'viewSmsSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewMobileMessagingSettings(
    _input?: ViewMobileMessagingSettingsInput,
  ): Promise<BloomreachMobileMessagingSettings> {
    throw new Error(
      'viewMobileMessagingSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewPaymentTrackingSettings(
    _input?: ViewPaymentTrackingSettingsInput,
  ): Promise<BloomreachPaymentTrackingSettings> {
    throw new Error(
      'viewPaymentTrackingSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewFacebookMessagingSettings(
    _input?: ViewFacebookMessagingSettingsInput,
  ): Promise<BloomreachFacebookMessagingSettings> {
    throw new Error(
      'viewFacebookMessagingSettings: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareConfigureEmailDomain(input: ConfigureEmailDomainInput): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const domain = validateDomain(input.domain);

    const preview = {
      action: CONFIGURE_EMAIL_DOMAIN_ACTION_TYPE,
      project,
      domain,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigurePushProvider(
    input: ConfigurePushProviderInput,
  ): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const provider = validateProviderName(input.provider);
    const firebaseCredentials =
      input.firebaseCredentials !== undefined ? input.firebaseCredentials.trim() : undefined;
    const apnsCertificate =
      input.apnsCertificate !== undefined ? input.apnsCertificate.trim() : undefined;

    const preview = {
      action: CONFIGURE_PUSH_PROVIDER_ACTION_TYPE,
      project,
      provider,
      firebaseCredentials,
      apnsCertificate,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureSmsProvider(input: ConfigureSmsProviderInput): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const provider = validateProviderName(input.provider);
    const senderNumber =
      input.senderNumber !== undefined ? validateSenderNumber(input.senderNumber) : undefined;

    const preview = {
      action: CONFIGURE_SMS_PROVIDER_ACTION_TYPE,
      project,
      provider,
      senderNumber,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureMobileMessaging(
    input: ConfigureMobileMessagingInput,
  ): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const provider = validateProviderName(input.provider);

    const preview = {
      action: CONFIGURE_MOBILE_MESSAGING_ACTION_TYPE,
      project,
      provider,
      whatsappEnabled: input.whatsappEnabled,
      rcsEnabled: input.rcsEnabled,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigurePaymentTracking(
    input: ConfigurePaymentTrackingInput,
  ): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const provider = validateProviderName(input.provider);

    const preview = {
      action: CONFIGURE_PAYMENT_TRACKING_ACTION_TYPE,
      project,
      provider,
      enabled: input.enabled,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureFacebookMessaging(
    input: ConfigureFacebookMessagingInput,
  ): PreparedChannelSettingsAction {
    const project = validateProject(input.project);
    const pageId = validatePageId(input.pageId);
    const accessToken = input.accessToken !== undefined ? input.accessToken.trim() : undefined;

    const preview = {
      action: CONFIGURE_FACEBOOK_MESSAGING_ACTION_TYPE,
      project,
      pageId,
      accessToken,
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
