import { validateProject } from './bloomreachDashboards.js';

export const EXPORT_CALENDAR_ACTION_TYPE = 'campaign_calendar.export';

/** Rate limit window for campaign calendar operations (1 hour in ms). */
export const CAMPAIGN_CALENDAR_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const CAMPAIGN_CALENDAR_EXPORT_RATE_LIMIT = 10;

export const CAMPAIGN_CALENDAR_CAMPAIGN_TYPES = [
  'email',
  'sms',
  'push',
  'in_app',
  'weblayer',
  'webhook',
] as const;
export type CampaignCalendarCampaignType =
  (typeof CAMPAIGN_CALENDAR_CAMPAIGN_TYPES)[number];

export const CAMPAIGN_CALENDAR_STATUSES = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'stopped',
  'finished',
] as const;
export type CampaignCalendarStatus =
  (typeof CAMPAIGN_CALENDAR_STATUSES)[number];

export const CAMPAIGN_CALENDAR_CHANNELS = [
  'email',
  'sms',
  'push',
  'in_app',
  'weblayer',
  'webhook',
] as const;
export type CampaignCalendarChannel =
  (typeof CAMPAIGN_CALENDAR_CHANNELS)[number];

export const CAMPAIGN_CALENDAR_EXPORT_FORMATS = ['json', 'csv'] as const;
export type CampaignCalendarExportFormat =
  (typeof CAMPAIGN_CALENDAR_EXPORT_FORMATS)[number];

export interface CampaignCalendarEntry {
  id: string;
  name: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate: string;
  status: CampaignCalendarStatus;
  channel: CampaignCalendarChannel;
  type: CampaignCalendarCampaignType;
  /** Full URL path to the campaign. */
  url: string;
}

export interface CalendarDateRange {
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate: string;
}

export interface ViewCampaignCalendarInput {
  project: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate?: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate?: string;
}

export interface FilterCampaignCalendarInput {
  project: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate?: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate?: string;
  type?: string;
  status?: string;
  channel?: string;
}

export interface ExportCalendarInput {
  project: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate?: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate?: string;
  type?: string;
  status?: string;
  channel?: string;
  format?: string;
  operatorNote?: string;
}

/** Staged action awaiting confirmation via two-phase commit. */
export interface PreparedCalendarAction {
  preparedActionId: string;
  /** Cryptographic token required to confirm the action. */
  confirmToken: string;
  /** Timestamp (ms since epoch) when the token expires. */
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** @throws {Error} If date is not a valid ISO-8601 YYYY-MM-DD string. */
export function validateDateFormat(date: string): string {
  const trimmed = date.trim();
  if (!ISO_DATE_REGEX.test(trimmed)) {
    throw new Error(
      `Date must be in YYYY-MM-DD format (got "${trimmed}").`,
    );
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Date is not a valid calendar date (got "${trimmed}").`);
  }
  return trimmed;
}

/**
 * @throws {Error} If dates are not valid ISO-8601 YYYY-MM-DD strings,
 *   or if startDate is after endDate.
 */
export function validateCalendarDateRange(
  startDate: string,
  endDate: string,
): CalendarDateRange {
  const validStart = validateDateFormat(startDate);
  const validEnd = validateDateFormat(endDate);
  if (new Date(validStart) > new Date(validEnd)) {
    throw new Error(
      `Start date must not be after end date (start: "${validStart}", end: "${validEnd}").`,
    );
  }
  return { startDate: validStart, endDate: validEnd };
}

/** @throws {Error} If `type` is not a recognised campaign type. */
export function validateCalendarCampaignType(
  type: string,
): CampaignCalendarCampaignType {
  if (
    !CAMPAIGN_CALENDAR_CAMPAIGN_TYPES.includes(
      type as CampaignCalendarCampaignType,
    )
  ) {
    throw new Error(
      `Campaign type must be one of: ${CAMPAIGN_CALENDAR_CAMPAIGN_TYPES.join(', ')} (got "${type}").`,
    );
  }
  return type as CampaignCalendarCampaignType;
}

/** @throws {Error} If `status` is not a recognised campaign calendar status. */
export function validateCalendarCampaignStatus(
  status: string,
): CampaignCalendarStatus {
  if (
    !CAMPAIGN_CALENDAR_STATUSES.includes(status as CampaignCalendarStatus)
  ) {
    throw new Error(
      `Campaign status must be one of: ${CAMPAIGN_CALENDAR_STATUSES.join(', ')} (got "${status}").`,
    );
  }
  return status as CampaignCalendarStatus;
}

/** @throws {Error} If `channel` is not a recognised campaign channel. */
export function validateCalendarChannel(
  channel: string,
): CampaignCalendarChannel {
  if (
    !CAMPAIGN_CALENDAR_CHANNELS.includes(channel as CampaignCalendarChannel)
  ) {
    throw new Error(
      `Channel must be one of: ${CAMPAIGN_CALENDAR_CHANNELS.join(', ')} (got "${channel}").`,
    );
  }
  return channel as CampaignCalendarChannel;
}

/** @throws {Error} If `format` is not a recognised export format. */
export function validateExportFormat(
  format: string,
): CampaignCalendarExportFormat {
  if (
    !CAMPAIGN_CALENDAR_EXPORT_FORMATS.includes(
      format as CampaignCalendarExportFormat,
    )
  ) {
    throw new Error(
      `Export format must be one of: ${CAMPAIGN_CALENDAR_EXPORT_FORMATS.join(', ')} (got "${format}").`,
    );
  }
  return format as CampaignCalendarExportFormat;
}

export function buildCampaignCalendarUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/campaigns/calendar`;
}

/**
 * Executor for a confirmed campaign calendar mutation.
 * Execute methods require browser automation infrastructure (not yet built).
 */
export interface CampaignCalendarActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class ExportCalendarExecutor implements CampaignCalendarActionExecutor {
  readonly actionType = EXPORT_CALENDAR_ACTION_TYPE;

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error(
      'ExportCalendarExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createCampaignCalendarActionExecutors(): Record<
  string,
  CampaignCalendarActionExecutor
> {
  return {
    [EXPORT_CALENDAR_ACTION_TYPE]: new ExportCalendarExecutor(),
  };
}

/**
 * Manages the Bloomreach Engagement campaign calendar. Read methods return data
 * directly. Mutation methods follow the two-phase commit pattern (prepare + confirm).
 * Browser-dependent methods throw until Playwright infrastructure is available.
 */
export class BloomreachCampaignCalendarService {
  private readonly baseUrl: string;

  constructor(project: string) {
    this.baseUrl = buildCampaignCalendarUrl(validateProject(project));
  }

  get calendarUrl(): string {
    return this.baseUrl;
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewCampaignCalendar(
    input: ViewCampaignCalendarInput,
  ): Promise<CampaignCalendarEntry[]> {
    validateProject(input.project);
    if (input.startDate !== undefined && input.endDate !== undefined) {
      validateCalendarDateRange(input.startDate, input.endDate);
    } else {
      if (input.startDate !== undefined) {
        validateDateFormat(input.startDate);
      }
      if (input.endDate !== undefined) {
        validateDateFormat(input.endDate);
      }
    }

    throw new Error(
      'viewCampaignCalendar: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} Browser automation not yet available. */
  async filterCampaignCalendar(
    input: FilterCampaignCalendarInput,
  ): Promise<CampaignCalendarEntry[]> {
    validateProject(input.project);
    if (input.startDate !== undefined && input.endDate !== undefined) {
      validateCalendarDateRange(input.startDate, input.endDate);
    } else {
      if (input.startDate !== undefined) {
        validateDateFormat(input.startDate);
      }
      if (input.endDate !== undefined) {
        validateDateFormat(input.endDate);
      }
    }
    if (input.type !== undefined) {
      validateCalendarCampaignType(input.type);
    }
    if (input.status !== undefined) {
      validateCalendarCampaignStatus(input.status);
    }
    if (input.channel !== undefined) {
      validateCalendarChannel(input.channel);
    }

    throw new Error(
      'filterCampaignCalendar: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  /** @throws {Error} If input validation fails. */
  prepareExportCalendar(input: ExportCalendarInput): PreparedCalendarAction {
    const project = validateProject(input.project);
    if (input.startDate !== undefined && input.endDate !== undefined) {
      validateCalendarDateRange(input.startDate, input.endDate);
    } else {
      if (input.startDate !== undefined) {
        validateDateFormat(input.startDate);
      }
      if (input.endDate !== undefined) {
        validateDateFormat(input.endDate);
      }
    }
    if (input.type !== undefined) {
      validateCalendarCampaignType(input.type);
    }
    if (input.status !== undefined) {
      validateCalendarCampaignStatus(input.status);
    }
    if (input.channel !== undefined) {
      validateCalendarChannel(input.channel);
    }
    if (input.format !== undefined) {
      validateExportFormat(input.format);
    }

    const preview = {
      action: EXPORT_CALENDAR_ACTION_TYPE,
      project,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type,
      status: input.status,
      channel: input.channel,
      format: input.format ?? 'json',
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
