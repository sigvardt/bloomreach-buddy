export * from './bloomreachCampaignCalendar.js';
export * from './bloomreachDashboards.js';
export * from './bloomreachEmailCampaigns.js';
export * from './bloomreachFlows.js';
export * from './bloomreachFunnels.js';
export * from './bloomreachPerformance.js';
export * from './bloomreachRecommendations.js';
export * from './bloomreachScenarios.js';
export * from './bloomreachSurveys.js';
export * from './bloomreachRetentions.js';
export * from './bloomreachTrends.js';
export * from './bloomreachCustomers.js';
export * from './bloomreachGeoAnalyses.js';
export * from './bloomreachVouchers.js';
export * from './bloomreachAssetManager.js';
export * from './bloomreachTagManager.js';

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
