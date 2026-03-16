import { validateProject } from './bloomreachDashboards.js';
import { BloomreachBuddyError, requireString } from './errors.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const PERFORMANCE_DASHBOARD_TYPES = [
  'project_performance',
  'channel_performance',
  'bloomreach_usage',
  'project_overview',
  'project_health',
] as const;

export type PerformanceDashboardType = (typeof PERFORMANCE_DASHBOARD_TYPES)[number];

export interface DateRangeFilter {
  /** ISO-8601 date string, e.g. `"2025-01-01"`. */
  startDate?: string;
  /** ISO-8601 date string, e.g. `"2025-03-31"`. */
  endDate?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidCalendarDate(label: string, value: string): void {
  if (!ISO_DATE_RE.test(value)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${label} must be a valid ISO-8601 date (YYYY-MM-DD), got "${value}".`);
  }
  const parsed = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime())) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${label} is not a valid calendar date: "${value}".`);
  }
  const roundtrip = parsed.toISOString().slice(0, 10);
  if (roundtrip !== value) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `${label} is not a valid calendar date: "${value}".`);
  }
}

/** @throws {Error} If dates are malformed or `startDate` is after `endDate`. */
export function validateDateRange(dateRange?: DateRangeFilter): DateRangeFilter | undefined {
  if (dateRange === undefined) {
    return undefined;
  }

  if (dateRange.startDate !== undefined) {
    assertValidCalendarDate('startDate', dateRange.startDate);
  }

  if (dateRange.endDate !== undefined) {
    assertValidCalendarDate('endDate', dateRange.endDate);
  }

  if (
    dateRange.startDate !== undefined &&
    dateRange.endDate !== undefined &&
    dateRange.startDate > dateRange.endDate
  ) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `startDate "${dateRange.startDate}" must not be after endDate "${dateRange.endDate}".`);
  }

  return dateRange;
}

export const CHANNEL_TYPES = [
  'email',
  'sms',
  'push',
  'whatsapp',
  'weblayer',
  'in_app_message',
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

/** @throws {Error} If `channel` is not a recognised channel type. */
export function validateChannel(channel: string): ChannelType {
  requireString(channel, 'channel');
  if (!CHANNEL_TYPES.includes(channel as ChannelType)) {
    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', `channel must be one of: ${CHANNEL_TYPES.join(', ')} (got "${channel}").`);
  }
  return channel as ChannelType;
}

export interface ViewProjectPerformanceInput {
  project: string;
  dateRange?: DateRangeFilter;
}

export interface ViewChannelPerformanceInput {
  project: string;
  dateRange?: DateRangeFilter;
  channel?: string;
}

export interface ViewBloomreachUsageInput {
  project: string;
}

export interface ViewProjectOverviewInput {
  project: string;
}

export interface ViewProjectHealthInput {
  project: string;
}

export interface ProjectPerformanceMetrics {
  revenue: number;
  influenced_revenue: number;
  non_influenced_revenue: number;
  average_order_value: number;
  buyers: number;
  purchases: number;
  conversion_rate: number;
  revenue_per_visitor: number;
  email_revenue_share: number;
}

export interface ChannelPerformanceMetrics {
  channel: string;
  emails_sent: number;
  emails_delivered: number;
  delivery_rate: number;
  open_rate: number;
  click_through_rate: number;
  hard_bounce_rate: number;
  soft_bounce_rate: number;
  spam_complaint_rate: number;
  revenue: number;
  average_order_value: number;
  buyers: number;
  purchases: number;
}

export interface BloomreachUsageMetrics {
  monthly_processed_events: number;
  cumulative_events: number;
  data_storage_bytes: number;
  emails_enqueued_per_month: number;
  sms_sent_per_month: number;
  push_notifications_per_month: number;
  whatsapp_messages_per_month: number;
  webhooks_sent_per_month: number;
  weblayers_shown_per_month: number;
  recommendations_served_per_month: number;
}

export interface ProjectOverviewMetrics {
  total_customers: number;
  total_events: number;
  active_campaigns: number;
  scenarios_count: number;
  integrations_count: number;
}

export interface ProjectHealthMetrics {
  data_quality_score: number;
  tracking_status: string;
  events_tracked_last_24h: number;
  last_event_at: string;
  active_subscribers: number;
  invalidated_contacts: number;
  suppressed_contacts: number;
  integrations: Array<{
    name: string;
    type: string;
    status: string;
  }>;
}

export interface PerformanceDashboardResult<T> {
  dashboard_type: PerformanceDashboardType;
  project: string;
  source_url: string;
  observed_at: string;
  metrics: T;
}

export function buildProjectPerformanceUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/overview/performance-dashboards/project`;
}

export function buildChannelPerformanceUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/overview/performance-dashboards/channel`;
}

export function buildBloomreachUsageUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/overview/pricing-dashboard-v2`;
}

export function buildProjectOverviewUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/overview/project`;
}

export function buildProjectHealthUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/overview/health-dashboard`;
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

/**
 * Read-only service for Bloomreach Engagement's built-in performance dashboards.
 * All methods currently throw — browser automation infrastructure is not yet available.
 */
export class BloomreachPerformanceService {
  private readonly project: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.project = validateProject(project);
    this.apiConfig = apiConfig;
  }

  get projectPerformanceUrl(): string {
    return buildProjectPerformanceUrl(this.project);
  }

  get channelPerformanceUrl(): string {
    return buildChannelPerformanceUrl(this.project);
  }

  get usageUrl(): string {
    return buildBloomreachUsageUrl(this.project);
  }

  get overviewUrl(): string {
    return buildProjectOverviewUrl(this.project);
  }

  get healthUrl(): string {
    return buildProjectHealthUrl(this.project);
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewProjectPerformance(
    input: ViewProjectPerformanceInput,
  ): Promise<PerformanceDashboardResult<ProjectPerformanceMetrics>> {
    validateProject(input.project);
    validateDateRange(input.dateRange);
    void this.apiConfig;

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewProjectPerformance: the Bloomreach API does not provide an endpoint for project performance dashboards. ' +
      'Performance data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Overview > Performance Dashboards > Project in your project).');
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewChannelPerformance(
    input: ViewChannelPerformanceInput,
  ): Promise<PerformanceDashboardResult<ChannelPerformanceMetrics>> {
    validateProject(input.project);
    validateDateRange(input.dateRange);
    void this.apiConfig;
    if (input.channel !== undefined) {
      validateChannel(input.channel);
    }

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewChannelPerformance: the Bloomreach API does not provide an endpoint for channel performance dashboards. ' +
      'Channel performance data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Overview > Performance Dashboards > Channel in your project).');
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewBloomreachUsage(
    input: ViewBloomreachUsageInput,
  ): Promise<PerformanceDashboardResult<BloomreachUsageMetrics>> {
    validateProject(input.project);
    void this.apiConfig;

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewBloomreachUsage: the Bloomreach API does not provide an endpoint for usage dashboards. ' +
      'Usage data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Overview > Pricing Dashboard in your project).');
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewProjectOverview(
    input: ViewProjectOverviewInput,
  ): Promise<PerformanceDashboardResult<ProjectOverviewMetrics>> {
    validateProject(input.project);
    void this.apiConfig;

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewProjectOverview: the Bloomreach API does not provide an endpoint for project overview dashboards. ' +
      'Overview data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Overview > Project in your project).');
  }

  /** @throws {Error} Browser automation not yet available. */
  async viewProjectHealth(
    input: ViewProjectHealthInput,
  ): Promise<PerformanceDashboardResult<ProjectHealthMetrics>> {
    validateProject(input.project);
    void this.apiConfig;

    throw new BloomreachBuddyError('ACTION_PRECONDITION_FAILED', 'viewProjectHealth: the Bloomreach API does not provide an endpoint for health dashboards. ' +
      'Health data must be obtained from the Bloomreach Engagement UI ' +
      '(navigate to Overview > Health Dashboard in your project).');
  }
}
