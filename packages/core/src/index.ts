import type { BloomreachApiConfig } from './bloomreachApiClient.js';
import { validateCredentials } from './bloomreachSetup.js';

export * from "./db/database.js";
export * from "./twoPhaseCommit.js";
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
export * from './bloomreachApiClient.js';
export * from './bloomreachSetup.js';
export * from './bloomreachTracking.js';
export * from './bloomreachProfileManager.js';
export * from './bloomreachSessionStore.js';
export * from './bloomreachAuth.js';

export interface BloomreachClientConfig {
  /** Bloomreach environment ID */
  environment: string;
  /** API token for authentication */
  apiToken: string;
  apiConfig?: BloomreachApiConfig;
}

export interface BloomreachStatusResult {
  connected: boolean;
  environment: string;
  project?: string;
  apiConfigured: boolean;
  apiBaseUrl?: string;
  error?: string;
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
  async status(): Promise<BloomreachStatusResult> {
    const apiConfig = this.config.apiConfig;
    const apiConfigured = apiConfig != null;
    const base: BloomreachStatusResult = {
      connected: false,
      environment: this.config.environment,
      apiConfigured,
      apiBaseUrl: apiConfig?.baseUrl,
    };

    if (!apiConfigured || !apiConfig) {
      return {
        ...base,
        error:
          'API credentials not configured. Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
      };
    }

    try {
      const result = await validateCredentials({
        projectToken: apiConfig.projectToken,
        apiKeyId: apiConfig.apiKeyId,
        apiSecret: apiConfig.apiSecret,
        baseUrl: apiConfig.baseUrl,
      });

      if (result.valid) {
        return {
          ...base,
          connected: true,
          project: apiConfig.projectToken,
        };
      }

      return {
        ...base,
        error: result.message ?? 'Connection verification failed',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ...base, error: message };
    }
  }
}
