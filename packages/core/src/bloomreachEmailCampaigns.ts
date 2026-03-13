import { validateProject } from './bloomreachDashboards.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.create_campaign';
export const SEND_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.send_campaign';
export const CLONE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.clone_campaign';
export const ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE = 'email_campaigns.archive_campaign';

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

const MAX_CAMPAIGN_NAME_LENGTH = 200;
const MIN_CAMPAIGN_NAME_LENGTH = 1;
const MAX_SUBJECT_LINE_LENGTH = 998;
const MIN_SUBJECT_LINE_LENGTH = 1;
const MIN_AB_TEST_VARIANTS = 2;
const MAX_AB_TEST_VARIANTS = 10;

/** @throws {Error} If name is empty or exceeds 200 characters. */
export function validateCampaignName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_CAMPAIGN_NAME_LENGTH) {
    throw new Error('Campaign name must not be empty.');
  }
  if (trimmed.length > MAX_CAMPAIGN_NAME_LENGTH) {
    throw new Error(
      `Campaign name must not exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If subject line is empty or exceeds 998 characters (RFC 2822 limit). */
export function validateSubjectLine(subjectLine: string): string {
  const trimmed = subjectLine.trim();
  if (trimmed.length < MIN_SUBJECT_LINE_LENGTH) {
    throw new Error('Subject line must not be empty.');
  }
  if (trimmed.length > MAX_SUBJECT_LINE_LENGTH) {
    throw new Error(
      `Subject line must not exceed ${MAX_SUBJECT_LINE_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

/** @throws {Error} If `status` is not a recognised email campaign status. */
export function validateEmailCampaignStatus(status: string): EmailCampaignStatus {
  if (!EMAIL_CAMPAIGN_STATUSES.includes(status as EmailCampaignStatus)) {
    throw new Error(
      `status must be one of: ${EMAIL_CAMPAIGN_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as EmailCampaignStatus;
}

/** @throws {Error} If `templateType` is not a recognised template type. */
export function validateTemplateType(templateType: string): EmailTemplateType {
  if (!EMAIL_TEMPLATE_TYPES.includes(templateType as EmailTemplateType)) {
    throw new Error(
      `templateType must be one of: ${EMAIL_TEMPLATE_TYPES.join(', ')} (got "${templateType}").`,
    );
  }
  return templateType as EmailTemplateType;
}

/** @throws {Error} If `scheduleType` is not a recognised schedule type. */
export function validateScheduleType(scheduleType: string): SendScheduleType {
  if (!SEND_SCHEDULE_TYPES.includes(scheduleType as SendScheduleType)) {
    throw new Error(
      `schedule type must be one of: ${SEND_SCHEDULE_TYPES.join(', ')} (got "${scheduleType}").`,
    );
  }
  return scheduleType as SendScheduleType;
}

/** @throws {Error} If A/B test config is invalid. */
export function validateABTestConfig(config: EmailCampaignABTestConfig): EmailCampaignABTestConfig {
  if (
    !Number.isInteger(config.variants) ||
    config.variants < MIN_AB_TEST_VARIANTS ||
    config.variants > MAX_AB_TEST_VARIANTS
  ) {
    throw new Error(
      `A/B test variants must be an integer between ${MIN_AB_TEST_VARIANTS} and ${MAX_AB_TEST_VARIANTS} (got ${config.variants}).`,
    );
  }
  if (config.splitPercentage !== undefined) {
    if (config.splitPercentage < 0 || config.splitPercentage > 100) {
      throw new Error(
        `A/B test split percentage must be between 0 and 100 (got ${config.splitPercentage}).`,
      );
    }
  }
  return config;
}

/** @throws {Error} If campaign ID is empty. */
export function validateCampaignId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Campaign ID must not be empty.');
  }
  return trimmed;
}

/** @throws {Error} If schedule config is invalid. */
export function validateSchedule(schedule: EmailCampaignSchedule): EmailCampaignSchedule {
  validateScheduleType(schedule.type);
  if (schedule.type === 'scheduled' && schedule.scheduledAt === undefined) {
    throw new Error('scheduledAt is required when schedule type is "scheduled".');
  }
  if (schedule.type === 'recurring' && schedule.cronExpression === undefined) {
    throw new Error('cronExpression is required when schedule type is "recurring".');
  }
  return schedule;
}

export function buildEmailCampaignsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/email-campaigns`;
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
    throw new Error(
      'CreateEmailCampaignExecutor: not yet implemented. ' +
        'Email campaign creation is only available through the Bloomreach Engagement UI.',
    );
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
    throw new Error(
      'SendEmailCampaignExecutor: not yet implemented. ' +
        'Email campaign sending is only available through the Bloomreach Engagement UI.',
    );
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
    throw new Error(
      'CloneEmailCampaignExecutor: not yet implemented. ' +
        'Email campaign cloning is only available through the Bloomreach Engagement UI.',
    );
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
    throw new Error(
      'ArchiveEmailCampaignExecutor: not yet implemented. ' +
        'Email campaign archiving is only available through the Bloomreach Engagement UI.',
    );
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
    throw new Error(
      'listEmailCampaigns: the Bloomreach API does not provide a list endpoint for email campaigns. ' +
        'Email campaign management is only available through the Bloomreach Engagement UI.',
    );
  }

  /**
   * View delivery and engagement metrics for an email campaign.
   * @throws {Error} The Bloomreach API does not provide a campaign results endpoint.
   */
  async viewCampaignResults(input: ViewEmailCampaignResultsInput): Promise<EmailCampaignResults> {
    validateProject(input.project);
    validateCampaignId(input.campaignId);

    void this.apiConfig;
    throw new Error(
      'viewCampaignResults: the Bloomreach API does not provide a campaign results endpoint for email campaigns. ' +
        'Email campaign analytics are only available through the Bloomreach Engagement UI.',
    );
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
}
