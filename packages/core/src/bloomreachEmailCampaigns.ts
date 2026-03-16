import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireObject, requireString } from './errors.js';
import { bloomreachApiFetch, buildEmailPath } from './bloomreachApiClient.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.create_campaign';
export const SEND_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.send_campaign';
export const CLONE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.clone_campaign';
export const ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.archive_campaign';
export const SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE = 'email_campaigns.send_transactional';

/** Rate limit window for email campaign operations (1 hour in ms). */
export const EMAIL_CAMPAIGN_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const EMAIL_CAMPAIGN_CREATE_RATE_LIMIT = 10;
export const EMAIL_CAMPAIGN_MODIFY_RATE_LIMIT = 20;

export const EMAIL_CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused',
  'archived',
] as const;
export type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUSES)[number];

export const SEND_SCHEDULE_TYPES = ['immediate', 'scheduled', 'recurring'] as const;
export type SendScheduleType = (typeof SEND_SCHEDULE_TYPES)[number];

export const EMAIL_TEMPLATE_TYPES = ['visual', 'html'] as const;
export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export interface EmailCampaignSchedule {
  type: SendScheduleType;
  /** ISO-8601 datetime for `"scheduled"` type. */
  scheduledAt?: string;
  /** Cron expression for `"recurring"` type. */
  cronExpression?: string;
}

export interface EmailCampaignABTestConfig {
  enabled: boolean;
  /** Number of variants (including control). */
  variants: number;
  /** Percentage of audience used for the test split (0-100). */
  splitPercentage?: number;
  /** Criteria to determine the winner (e.g. `"open_rate"`, `"click_rate"`). */
  winnerCriteria?: string;
}

export interface BloomreachEmailCampaign {
  id: string;
  name: string;
  subjectLine: string;
  status: EmailCampaignStatus;
  templateType?: EmailTemplateType;
  audience?: string;
  schedule?: EmailCampaignSchedule;
  abTest?: EmailCampaignABTestConfig;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  url: string;
}

export interface EmailCampaignResults {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  spamComplaints: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  revenue: number;
}

export interface ListEmailCampaignsInput {
  project: string;
  status?: string;
}

export interface ViewEmailCampaignResultsInput {
  project: string;
  campaignId: string;
}

export interface CreateEmailCampaignInput {
  project: string;
  name: string;
  subjectLine: string;
  templateType?: string;
  templateContent?: string;
  audience?: string;
  schedule?: EmailCampaignSchedule;
  abTest?: EmailCampaignABTestConfig;
  operatorNote?: string;
}

export interface SendEmailCampaignInput {
  project: string;
  campaignId: string;
  operatorNote?: string;
}

export interface CloneEmailCampaignInput {
  project: string;
  campaignId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveEmailCampaignInput {
  project: string;
  campaignId: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedEmailCampaignAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

export interface TransactionalEmailRecipient {
  customerIds: Record<string, string>;
  email: string;
}

export interface TransactionalEmailContent {
  templateId?: string;
  html?: string;
  subject?: string;
  senderAddress?: string;
  senderName?: string;
  params?: Record<string, unknown>;
}

export interface SendTransactionalEmailInput {
  project: string;
  integrationId: string;
  campaignName?: string;
  recipient: TransactionalEmailRecipient;
  emailContent: TransactionalEmailContent;
  operatorNote?: string;
}

export interface SendTransactionalEmailResult {
  success: boolean;
  response: unknown;
}

const MAX_CAMPAIGN_NAME_LENGTH = 200;
const MIN_CAMPAIGN_NAME_LENGTH = 1;
const MAX_SUBJECT_LINE_LENGTH = 998;
const MIN_SUBJECT_LINE_LENGTH = 1;
const MIN_AB_TEST_VARIANTS = 2;
const MAX_AB_TEST_VARIANTS = 10;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateCampaignName(name: string): string {
  requireString(name, 'Campaign name');
  const trimmed = name.trim();
  if (trimmed.length < MIN_CAMPAIGN_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Campaign name must not be empty.');
  }
  if (trimmed.length > MAX_CAMPAIGN_NAME_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Campaign name must not exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If subject line is empty or exceeds 998 characters (RFC 2822 limit). */
export function validateSubjectLine(subjectLine: string): string {
  requireString(subjectLine, 'Subject line');
  const trimmed = subjectLine.trim();
  if (trimmed.length < MIN_SUBJECT_LINE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Subject line must not be empty.');
  }
  if (trimmed.length > MAX_SUBJECT_LINE_LENGTH) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `Subject line must not exceed ${MAX_SUBJECT_LINE_LENGTH} characters (got ${trimmed.length}).`);
  }
  return trimmed;
}

/** @throws {Error} If `status` is not a recognised email campaign status. */
export function validateEmailCampaignStatus(status: string): EmailCampaignStatus {
  requireString(status, 'status');
  if (!EMAIL_CAMPAIGN_STATUSES.includes(status as EmailCampaignStatus)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `status must be one of: ${EMAIL_CAMPAIGN_STATUSES.join(', ')} (got "${status}").`);
  }
  return status as EmailCampaignStatus;
}

/** @throws {Error} If `templateType` is not a recognised template type. */
export function validateTemplateType(templateType: string): EmailTemplateType {
  requireString(templateType, 'templateType');
  if (!EMAIL_TEMPLATE_TYPES.includes(templateType as EmailTemplateType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `templateType must be one of: ${EMAIL_TEMPLATE_TYPES.join(', ')} (got "${templateType}").`);
  }
  return templateType as EmailTemplateType;
}

/** @throws {Error} If `scheduleType` is not a recognised schedule type. */
export function validateScheduleType(scheduleType: string): SendScheduleType {
  requireString(scheduleType, 'schedule type');
  if (!SEND_SCHEDULE_TYPES.includes(scheduleType as SendScheduleType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `schedule type must be one of: ${SEND_SCHEDULE_TYPES.join(', ')} (got "${scheduleType}").`);
  }
  return scheduleType as SendScheduleType;
}

/** @throws {Error} If A/B test config is invalid. */
export function validateABTestConfig(config: EmailCampaignABTestConfig): EmailCampaignABTestConfig {
  requireObject(config, 'AB test config');
  if (
    !Number.isInteger(config.variants) ||
    config.variants < MIN_AB_TEST_VARIANTS ||
    config.variants > MAX_AB_TEST_VARIANTS
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `A/B test variants must be an integer between ${MIN_AB_TEST_VARIANTS} and ${MAX_AB_TEST_VARIANTS} (got ${config.variants}).`);
  }
  if (config.splitPercentage !== undefined) {
    if (config.splitPercentage < 0 || config.splitPercentage > 100) {
      throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `A/B test split percentage must be between 0 and 100 (got ${config.splitPercentage}).`);
    }
  }
  return config;
}

/** @throws {Error} If campaign ID is empty. */
export function validateCampaignId(id: string): string {
  requireString(id, 'Campaign ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Campaign ID must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If schedule config is invalid. */
export function validateSchedule(schedule: EmailCampaignSchedule): EmailCampaignSchedule {
  requireObject(schedule, 'schedule');
  validateScheduleType(schedule.type);
  if (schedule.type === 'scheduled' && schedule.scheduledAt === undefined) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'scheduledAt is required when schedule type is "scheduled".');
  }
  if (schedule.type === 'recurring' && schedule.cronExpression === undefined) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'cronExpression is required when schedule type is "recurring".');
  }
  return schedule;
}

export function validateEmailIntegrationId(id: string): string {
  requireString(id, 'Integration ID');
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Integration ID must not be empty.');
  }
  return trimmed;
}

export function validateEmailAddress(email: string): string {
  requireString(email, 'Email address');
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Email address must not be empty.');
  }
  if (!trimmed.includes('@')) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Email address must contain an @ symbol.');
  }
  return trimmed;
}

export function validateTransactionalEmailContent(
  content: TransactionalEmailContent,
): TransactionalEmailContent {
  requireObject(content, 'content');
  if (!content.templateId && !content.html) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'Email content must include either a templateId or raw html.');
  }
  return content;
}

export function buildEmailCampaignsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/email-campaigns`;
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

export interface EmailCampaignActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateEmailCampaignExecutor implements EmailCampaignActionExecutor {
  readonly actionType = CREATE_EMAIL_CAMPAIGN_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CreateEmailCampaignExecutor: not yet implemented. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns. ' +
      'For sending individual transactional emails via API, use the sendTransactionalEmail method.', { not_implemented: true });
  }
}

class SendEmailCampaignExecutor implements EmailCampaignActionExecutor {
  readonly actionType = SEND_EMAIL_CAMPAIGN_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'SendEmailCampaignExecutor: not yet implemented. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns. ' +
      'For sending individual transactional emails via API, use the sendTransactionalEmail method.', { not_implemented: true });
  }
}

class CloneEmailCampaignExecutor implements EmailCampaignActionExecutor {
  readonly actionType = CLONE_EMAIL_CAMPAIGN_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'CloneEmailCampaignExecutor: not yet implemented. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns. ' +
      'For sending individual transactional emails via API, use the sendTransactionalEmail method.', { not_implemented: true });
  }
}

class ArchiveEmailCampaignExecutor implements EmailCampaignActionExecutor {
  readonly actionType = ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'ArchiveEmailCampaignExecutor: not yet implemented. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns. ' +
      'For sending individual transactional emails via API, use the sendTransactionalEmail method.', { not_implemented: true });
  }
}

class SendTransactionalEmailExecutor implements EmailCampaignActionExecutor {
  readonly actionType = SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = requireApiConfig(this.apiConfig, 'SendTransactionalEmailExecutor');
    const integrationId = payload.integrationId as string;
    const campaignName = payload.campaignName as string | undefined;
    const recipient = payload.recipient as TransactionalEmailRecipient;
    const emailContent = payload.emailContent as TransactionalEmailContent;

    const path = buildEmailPath(config, '/sync');
    const body: Record<string, unknown> = {
      integration_id: integrationId,
      recipient: {
        customer_ids: recipient.customerIds,
        email: recipient.email,
      },
      email_content: {},
    };
    if (campaignName) {
      body.campaign_name = campaignName;
    }
    const content = body.email_content as Record<string, unknown>;
    if (emailContent.templateId) content.template_id = emailContent.templateId;
    if (emailContent.html) content.html = emailContent.html;
    if (emailContent.subject) content.subject = emailContent.subject;
    if (emailContent.senderAddress) content.sender_address = emailContent.senderAddress;
    if (emailContent.senderName) content.sender_name = emailContent.senderName;
    if (emailContent.params) content.params = emailContent.params;

    const response = await bloomreachApiFetch(config, path, { body });
    return { success: true, response };
  }
}

export function createEmailCampaignActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, EmailCampaignActionExecutor> {
  return {
    [CREATE_EMAIL_CAMPAIGN_ACTION_TYPE]: new CreateEmailCampaignExecutor(apiConfig),
    [SEND_EMAIL_CAMPAIGN_ACTION_TYPE]: new SendEmailCampaignExecutor(apiConfig),
    [CLONE_EMAIL_CAMPAIGN_ACTION_TYPE]: new CloneEmailCampaignExecutor(apiConfig),
    [ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE]: new ArchiveEmailCampaignExecutor(apiConfig),
    [SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE]: new SendTransactionalEmailExecutor(apiConfig),
  };
}

/**
 * Manages Bloomreach Engagement email campaigns. Read methods return data directly.
 * Mutation methods follow the two-phase commit pattern (prepare + confirm).
 *
 * **API support:** The Bloomreach Engagement API does not expose email campaign
 * management endpoints — campaign creation, editing, sending, and analytics are
 * only available through the Bloomreach Engagement UI. This service validates
 * inputs and manages two-phase commit flows; browser automation is required for
 * actual execution.
 */
export class BloomreachEmailCampaignsService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildEmailCampaignsUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get emailCampaignsUrl(): string {
    return this.baseUrl;
  }

  /**
   * List email campaigns in the project.
   * @throws {Error} The Bloomreach API does not provide a list endpoint for email campaigns.
   */
  async listEmailCampaigns(input?: ListEmailCampaignsInput): Promise<BloomreachEmailCampaign[]> {
    if (input !== undefined) {
      validateProject(input.project);
      if (input.status !== undefined) {
        validateEmailCampaignStatus(input.status);
      }
    }

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'listEmailCampaigns: the Bloomreach API does not provide a list endpoint for email campaigns. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns. ' +
      'For sending individual emails via API, use the sendTransactionalEmail method instead.');
  }

  /**
   * View delivery and engagement metrics for an email campaign.
   * @throws {Error} The Bloomreach API does not provide a campaign results endpoint.
   */
  async viewCampaignResults(input: ViewEmailCampaignResultsInput): Promise<EmailCampaignResults> {
    validateProject(input.project);
    validateCampaignId(input.campaignId);

    void this.apiConfig;
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewCampaignResults: the Bloomreach API does not provide a campaign results endpoint for email campaigns. ' +
      'Use the Bloomreach Engagement UI: Campaigns > Email campaigns > [campaign] > Results.');
  }

  /** @throws {Error} If input validation fails. */
  prepareCreateEmailCampaign(input: CreateEmailCampaignInput): PreparedEmailCampaignAction {
    const project = validateProject(input.project);
    const name = validateCampaignName(input.name);
    const subjectLine = validateSubjectLine(input.subjectLine);
    if (input.templateType !== undefined) {
      validateTemplateType(input.templateType);
    }
    if (input.schedule !== undefined) {
      validateSchedule(input.schedule);
    }
    if (input.abTest !== undefined) {
      validateABTestConfig(input.abTest);
    }

    const preview = {
      action: CREATE_EMAIL_CAMPAIGN_ACTION_TYPE,
      project,
      name,
      subjectLine,
      templateType: input.templateType,
      audience: input.audience,
      schedule: input.schedule,
      abTest: input.abTest,
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
  prepareSendEmailCampaign(input: SendEmailCampaignInput): PreparedEmailCampaignAction {
    const project = validateProject(input.project);
    const campaignId = validateCampaignId(input.campaignId);

    const preview = {
      action: SEND_EMAIL_CAMPAIGN_ACTION_TYPE,
      project,
      campaignId,
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
  prepareCloneEmailCampaign(input: CloneEmailCampaignInput): PreparedEmailCampaignAction {
    const project = validateProject(input.project);
    const campaignId = validateCampaignId(input.campaignId);
    const newName = input.newName !== undefined ? validateCampaignName(input.newName) : undefined;

    const preview = {
      action: CLONE_EMAIL_CAMPAIGN_ACTION_TYPE,
      project,
      campaignId,
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
  prepareArchiveEmailCampaign(input: ArchiveEmailCampaignInput): PreparedEmailCampaignAction {
    const project = validateProject(input.project);
    const campaignId = validateCampaignId(input.campaignId);

    const preview = {
      action: ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE,
      project,
      campaignId,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  async sendTransactionalEmail(
    input: SendTransactionalEmailInput,
  ): Promise<SendTransactionalEmailResult> {
    validateProject(input.project);
    validateEmailIntegrationId(input.integrationId);
    validateEmailAddress(input.recipient.email);
    validateTransactionalEmailContent(input.emailContent);

    const config = requireApiConfig(this.apiConfig, 'sendTransactionalEmail');
    const path = buildEmailPath(config, '/sync');
    const body: Record<string, unknown> = {
      integration_id: input.integrationId,
      recipient: {
        customer_ids: input.recipient.customerIds,
        email: input.recipient.email,
      },
      email_content: {},
    };
    if (input.campaignName) {
      body.campaign_name = input.campaignName;
    }
    const content = body.email_content as Record<string, unknown>;
    if (input.emailContent.templateId) content.template_id = input.emailContent.templateId;
    if (input.emailContent.html) content.html = input.emailContent.html;
    if (input.emailContent.subject) content.subject = input.emailContent.subject;
    if (input.emailContent.senderAddress) content.sender_address = input.emailContent.senderAddress;
    if (input.emailContent.senderName) content.sender_name = input.emailContent.senderName;
    if (input.emailContent.params) content.params = input.emailContent.params;

    const response = await bloomreachApiFetch(config, path, { body });
    return { success: true, response };
  }

  prepareSendTransactionalEmail(
    input: SendTransactionalEmailInput,
  ): PreparedEmailCampaignAction {
    const project = validateProject(input.project);
    validateEmailIntegrationId(input.integrationId);
    validateEmailAddress(input.recipient.email);
    validateTransactionalEmailContent(input.emailContent);

    const preview = {
      action: SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE,
      project,
      integrationId: input.integrationId,
      recipient: input.recipient,
      emailContent: input.emailContent,
      campaignName: input.campaignName,
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
