import { validateProject } from './bloomreachDashboards.js';
import { validateDateRange } from './bloomreachPerformance.js';
import type { DateRangeFilter } from './bloomreachPerformance.js';
import type { BloomreachApiConfig } from './bloomreachApiClient.js';

export const CREATE_GEO_ANALYSIS_ACTION_TYPE = 'geoanalyses.create_geo_analysis';
export const CLONE_GEO_ANALYSIS_ACTION_TYPE = 'geoanalyses.clone_geo_analysis';
export const ARCHIVE_GEO_ANALYSIS_ACTION_TYPE = 'geoanalyses.archive_geo_analysis';

export const GEO_ANALYSIS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const GEO_ANALYSIS_CREATE_RATE_LIMIT = 10;
export const GEO_ANALYSIS_MODIFY_RATE_LIMIT = 20;

export const GEO_GRANULARITIES = ['country', 'region', 'city'] as const;
export type GeoGranularity = (typeof GEO_GRANULARITIES)[number];

export interface BloomreachGeoAnalysis {
  id: string;
  name: string;
  attribute: string;
  granularity: GeoGranularity;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface GeoFilter {
  customerAttributes?: Record<string, string>;
  eventProperties?: Record<string, string>;
}

export interface GeoDataPoint {
  location: string;
  count: number;
  percentage: number;
}

export interface GeoResults {
  analysisId: string;
  analysisName: string;
  attribute: string;
  granularity: GeoGranularity;
  startDate: string;
  endDate: string;
  dataPoints: GeoDataPoint[];
  filters?: GeoFilter;
}

export interface ListGeoAnalysesInput {
  project: string;
}

export interface CreateGeoAnalysisInput {
  project: string;
  name: string;
  attribute: string;
  granularity?: string;
  filters?: GeoFilter;
  operatorNote?: string;
}

export interface ViewGeoResultsInput {
  project: string;
  analysisId: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}

export interface CloneGeoAnalysisInput {
  project: string;
  analysisId: string;
  newName?: string;
  operatorNote?: string;
}

export interface ArchiveGeoAnalysisInput {
  project: string;
  analysisId: string;
  operatorNote?: string;
}

export interface PreparedGeoAnalysisAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

const MAX_GEO_ANALYSIS_NAME_LENGTH = 200;
const MIN_GEO_ANALYSIS_NAME_LENGTH = 1;

export function validateGeoAnalysisName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < MIN_GEO_ANALYSIS_NAME_LENGTH) {
    throw new Error('Geo analysis name must not be empty.');
  }
  if (trimmed.length > MAX_GEO_ANALYSIS_NAME_LENGTH) {
    throw new Error(
      `Geo analysis name must not exceed ${MAX_GEO_ANALYSIS_NAME_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateGeoGranularity(granularity: string): GeoGranularity {
  if (!GEO_GRANULARITIES.includes(granularity as GeoGranularity)) {
    throw new Error(
      `granularity must be one of: ${GEO_GRANULARITIES.join(', ')} (got "${granularity}").`,
    );
  }
  return granularity as GeoGranularity;
}

export function validateGeoAnalysisId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Geo analysis ID must not be empty.');
  }
  return trimmed;
}

export function validateAttribute(attribute: string): string {
  const trimmed = attribute.trim();
  if (trimmed.length === 0) {
    throw new Error('attribute must not be empty.');
  }
  return trimmed;
}

export function buildGeoAnalysesUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/analytics/geoanalyses`;
}

function requireApiConfig(
  config: BloomreachApiConfig | undefined,
  operation: string,
): BloomreachApiConfig {
  if (!config) {
    throw new Error(
      `${operation} requires API credentials. ` +
        'Set BLOOMREACH_PROJECT_TOKEN, BLOOMREACH_API_KEY_ID, and BLOOMREACH_API_SECRET environment variables.',
    );
  }
  return config;
}

void requireApiConfig;

export interface GeoAnalysisActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class CreateGeoAnalysisExecutor implements GeoAnalysisActionExecutor {
  readonly actionType = CREATE_GEO_ANALYSIS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CreateGeoAnalysisExecutor: not yet implemented. ' +
        'Geo analysis creation is only available through the Bloomreach Engagement UI.',
    );
  }
}

class CloneGeoAnalysisExecutor implements GeoAnalysisActionExecutor {
  readonly actionType = CLONE_GEO_ANALYSIS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'CloneGeoAnalysisExecutor: not yet implemented. ' +
        'Geo analysis cloning is only available through the Bloomreach Engagement UI.',
    );
  }
}

class ArchiveGeoAnalysisExecutor implements GeoAnalysisActionExecutor {
  readonly actionType = ARCHIVE_GEO_ANALYSIS_ACTION_TYPE;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(apiConfig?: BloomreachApiConfig) {
    this.apiConfig = apiConfig;
  }

  async execute(
    _payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    void this.apiConfig;
    throw new Error(
      'ArchiveGeoAnalysisExecutor: not yet implemented. ' +
        'Geo analysis archiving is only available through the Bloomreach Engagement UI.',
    );
  }
}

export function createGeoAnalysisActionExecutors(
  apiConfig?: BloomreachApiConfig,
): Record<string, GeoAnalysisActionExecutor> {
  return {
    [CREATE_GEO_ANALYSIS_ACTION_TYPE]: new CreateGeoAnalysisExecutor(apiConfig),
    [CLONE_GEO_ANALYSIS_ACTION_TYPE]: new CloneGeoAnalysisExecutor(apiConfig),
    [ARCHIVE_GEO_ANALYSIS_ACTION_TYPE]: new ArchiveGeoAnalysisExecutor(apiConfig),
  };
}

export class BloomreachGeoAnalysesService {
  private readonly baseUrl: string;
  private readonly apiConfig?: BloomreachApiConfig;

  constructor(project: string, apiConfig?: BloomreachApiConfig) {
    this.baseUrl = buildGeoAnalysesUrl(validateProject(project));
    this.apiConfig = apiConfig;
  }

  get geoAnalysesUrl(): string {
    return this.baseUrl;
  }

  async listGeoAnalyses(
    input?: ListGeoAnalysesInput,
  ): Promise<BloomreachGeoAnalysis[]> {
    void this.apiConfig;
    if (input !== undefined) {
      validateProject(input.project);
    }

    throw new Error(
      'listGeoAnalyses: the Bloomreach API does not provide an endpoint for geo analyses. ' +
        'Geo analysis data must be obtained from the Bloomreach Engagement UI ' +
        '(navigate to Analytics > Geo Analyses in your project).',
    );
  }

  async viewGeoResults(input: ViewGeoResultsInput): Promise<GeoResults> {
    void this.apiConfig;
    validateProject(input.project);
    validateGeoAnalysisId(input.analysisId);

    if (input.granularity !== undefined) {
      validateGeoGranularity(input.granularity);
    }

    if (input.startDate !== undefined || input.endDate !== undefined) {
      const dateRange: DateRangeFilter = {
        startDate: input.startDate,
        endDate: input.endDate,
      };
      validateDateRange(dateRange);
    }

    throw new Error(
      'viewGeoResults: the Bloomreach API does not provide an endpoint for geo analysis results. ' +
        'Geo results must be viewed in the Bloomreach Engagement UI ' +
        '(navigate to Analytics > Geo Analyses and open the analysis).',
    );
  }

  prepareCreateGeoAnalysis(
    input: CreateGeoAnalysisInput,
  ): PreparedGeoAnalysisAction {
    const project = validateProject(input.project);
    const name = validateGeoAnalysisName(input.name);
    const attribute = validateAttribute(input.attribute);
    const granularity =
      input.granularity !== undefined
        ? validateGeoGranularity(input.granularity)
        : undefined;

    const preview = {
      action: CREATE_GEO_ANALYSIS_ACTION_TYPE,
      project,
      name,
      attribute,
      granularity,
      filters: input.filters,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareCloneGeoAnalysis(
    input: CloneGeoAnalysisInput,
  ): PreparedGeoAnalysisAction {
    const project = validateProject(input.project);
    const analysisId = validateGeoAnalysisId(input.analysisId);
    const newName =
      input.newName !== undefined
        ? validateGeoAnalysisName(input.newName)
        : undefined;

    const preview = {
      action: CLONE_GEO_ANALYSIS_ACTION_TYPE,
      project,
      analysisId,
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

  prepareArchiveGeoAnalysis(
    input: ArchiveGeoAnalysisInput,
  ): PreparedGeoAnalysisAction {
    const project = validateProject(input.project);
    const analysisId = validateGeoAnalysisId(input.analysisId);

    const preview = {
      action: ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
      project,
      analysisId,
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
