export * from './bloomreachCampaignCalendar.js';
export * from './bloomreachCampaignSettings.js';
export * from './bloomreachCatalogs.js';
export * from './bloomreachDashboards.js';
export * from './bloomreachEmailCampaigns.js';
export * from './bloomreachFlows.js';
export * from './bloomreachFunnels.js';
export * from './bloomreachPerformance.js';
export * from './bloomreachSegmentations.js';
export * from './bloomreachRecommendations.js';
export * from './bloomreachReports.js';
export * from './bloomreachScenarios.js';
export * from './bloomreachSurveys.js';
export * from './bloomreachRetentions.js';
export * from './bloomreachSqlReports.js';
export * from './bloomreachTrends.js';
export * from './bloomreachCustomers.js';
export * from './bloomreachGeoAnalyses.js';
export * from './bloomreachVouchers.js';
export * from './bloomreachAssetManager.js';
export * from './bloomreachTagManager.js';
export * from './bloomreachDataManager.js';
export * from './bloomreachMetrics.js';
export * from './bloomreachExports.js';
export * from './bloomreachImports.js';
export * from './bloomreachInitiatives.js';
export * from './bloomreachIntegrations.js';
export * from './bloomreachProjectSettings.js';
export * from './bloomreachChannelSettings.js';
export * from './bloomreachSecuritySettings.js';
export * from './bloomreachEvaluationSettings.js';
export * from './bloomreachWeblayers.js';
export * from './bloomreachUseCases.js';
export * from './bloomreachAccessManagement.js';

export interface BloomreachClientConfig {
  /** Bloomreach environment ID */
  environment: string;
  /** API token for authentication */
  apiToken: string;
}

/**
 * Client for interacting with Bloomreach APIs.
 *
 * @example
 * ```ts
 * const client = new BloomreachClient({
 *   environment: 'my-env',
 *   apiToken: 'token-123',
 * });
 * ```
 */
export class BloomreachClient {
  readonly config: BloomreachClientConfig;

  constructor(config: BloomreachClientConfig) {
    this.config = config;
  }

  /**
   * Check connectivity to the Bloomreach API.
   * @returns status object with connection information
   */
  async status(): Promise<{ connected: boolean; environment: string }> {
    return {
      connected: false,
      environment: this.config.environment,
    };
  }
}
