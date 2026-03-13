import { validateProject } from './bloomreachDashboards.js';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE =
  'evaluation_settings.configure_revenue_attribution';
export const SET_CURRENCY_ACTION_TYPE = 'evaluation_settings.set_currency';
export const CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE =
  'evaluation_settings.configure_evaluation_dashboards';
export const CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE =
  'evaluation_settings.configure_voucher_mapping';

// ---------------------------------------------------------------------------
// Rate limit constants
// ---------------------------------------------------------------------------

export const EVALUATION_SETTINGS_RATE_LIMIT_WINDOW_MS = 3_600_000;
export const EVALUATION_SETTINGS_CONFIGURE_RATE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface BloomreachRevenueAttributionSettings {
  model: string;
  attributionWindow?: number;
  channels?: string[];
  url: string;
}

export interface BloomreachCurrencySettings {
  currencyCode: string;
  currencySymbol?: string;
  url: string;
}

export interface BloomreachEvaluationDashboardSettings {
  dashboards: EvaluationDashboard[];
  url: string;
}

export interface EvaluationDashboard {
  id: string;
  name: string;
  metrics?: string[];
  enabled?: boolean;
}

export interface BloomreachVoucherMappingSettings {
  mappingField?: string;
  mappingType?: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Input interfaces
// ---------------------------------------------------------------------------

export interface ViewRevenueAttributionInput {
  project: string;
}

export interface ConfigureRevenueAttributionInput {
  project: string;
  model: string;
  attributionWindow?: number;
  channels?: string[];
  operatorNote?: string;
}

export interface ViewCurrencyInput {
  project: string;
}

export interface SetCurrencyInput {
  project: string;
  currencyCode: string;
  currencySymbol?: string;
  operatorNote?: string;
}

export interface ViewEvaluationDashboardsInput {
  project: string;
}

export interface ConfigureEvaluationDashboardsInput {
  project: string;
  dashboards: { id: string; enabled: boolean }[];
  operatorNote?: string;
}

export interface ViewVoucherMappingInput {
  project: string;
}

export interface ConfigureVoucherMappingInput {
  project: string;
  mappingField: string;
  mappingType?: string;
  operatorNote?: string;
}

// ---------------------------------------------------------------------------
// Prepared action result
// ---------------------------------------------------------------------------

export interface PreparedEvaluationSettingsAction {
  preparedActionId: string;
  confirmToken: string;
  expiresAtMs: number;
  preview: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const MAX_ATTRIBUTION_MODEL_LENGTH = 100;
const MAX_ATTRIBUTION_WINDOW_DAYS = 365;
const MAX_MAPPING_FIELD_LENGTH = 200;

export function validateAttributionModel(model: string): string {
  const trimmed = model.trim();
  if (trimmed.length === 0) {
    throw new Error('Attribution model must not be empty.');
  }
  if (trimmed.length > MAX_ATTRIBUTION_MODEL_LENGTH) {
    throw new Error(
      `Attribution model must not exceed ${MAX_ATTRIBUTION_MODEL_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

export function validateAttributionWindow(window: number): number {
  if (!Number.isInteger(window) || window <= 0) {
    throw new Error('Attribution window must be a positive integer.');
  }
  if (window > MAX_ATTRIBUTION_WINDOW_DAYS) {
    throw new Error(
      `Attribution window must not exceed ${MAX_ATTRIBUTION_WINDOW_DAYS} days (got ${window}).`,
    );
  }
  return window;
}

export function validateCurrencyCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length === 0) {
    throw new Error('Currency code must not be empty.');
  }
  if (trimmed.length !== 3) {
    throw new Error(`Currency code must be exactly 3 characters (got ${trimmed.length}).`);
  }
  if (!/^[A-Z]{3}$/.test(trimmed)) {
    throw new Error('Currency code must contain uppercase letters only (ISO 4217).');
  }
  return trimmed;
}

export function validateDashboardId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error('Dashboard ID must not be empty.');
  }
  return trimmed;
}

export function validateMappingField(field: string): string {
  const trimmed = field.trim();
  if (trimmed.length === 0) {
    throw new Error('Mapping field must not be empty.');
  }
  if (trimmed.length > MAX_MAPPING_FIELD_LENGTH) {
    throw new Error(
      `Mapping field must not exceed ${MAX_MAPPING_FIELD_LENGTH} characters (got ${trimmed.length}).`,
    );
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

export function buildRevenueAttributionUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/project-revenue-attribution`;
}

export function buildCurrencyUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/currency`;
}

export function buildEvaluationDashboardsUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/evaluation-dashboards`;
}

export function buildVoucherMappingUrl(project: string): string {
  return `/p/${encodeURIComponent(project)}/project-settings/vouchers`;
}

// ---------------------------------------------------------------------------
// Action executor interface + implementations
// ---------------------------------------------------------------------------

export interface EvaluationSettingsActionExecutor {
  readonly actionType: string;
  execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

class ConfigureRevenueAttributionExecutor implements EvaluationSettingsActionExecutor {
  readonly actionType = CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureRevenueAttributionExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class SetCurrencyExecutor implements EvaluationSettingsActionExecutor {
  readonly actionType = SET_CURRENCY_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'SetCurrencyExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureEvaluationDashboardsExecutor implements EvaluationSettingsActionExecutor {
  readonly actionType = CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureEvaluationDashboardsExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

class ConfigureVoucherMappingExecutor implements EvaluationSettingsActionExecutor {
  readonly actionType = CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE;

  async execute(_payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error(
      'ConfigureVoucherMappingExecutor: not yet implemented. Requires browser automation infrastructure.',
    );
  }
}

export function createEvaluationSettingsActionExecutors(): Record<
  string,
  EvaluationSettingsActionExecutor
> {
  return {
    [CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE]: new ConfigureRevenueAttributionExecutor(),
    [SET_CURRENCY_ACTION_TYPE]: new SetCurrencyExecutor(),
    [CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE]: new ConfigureEvaluationDashboardsExecutor(),
    [CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE]: new ConfigureVoucherMappingExecutor(),
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class BloomreachEvaluationSettingsService {
  private readonly revenueAttributionSettingsUrl: string;
  private readonly currencySettingsUrl: string;
  private readonly evaluationDashboardsSettingsUrl: string;
  private readonly voucherMappingSettingsUrl: string;

  constructor(project: string) {
    const validated = validateProject(project);
    this.revenueAttributionSettingsUrl = buildRevenueAttributionUrl(validated);
    this.currencySettingsUrl = buildCurrencyUrl(validated);
    this.evaluationDashboardsSettingsUrl = buildEvaluationDashboardsUrl(validated);
    this.voucherMappingSettingsUrl = buildVoucherMappingUrl(validated);
  }

  get revenueAttributionUrl(): string {
    return this.revenueAttributionSettingsUrl;
  }

  get currencyUrl(): string {
    return this.currencySettingsUrl;
  }

  get evaluationDashboardsUrl(): string {
    return this.evaluationDashboardsSettingsUrl;
  }

  get voucherMappingUrl(): string {
    return this.voucherMappingSettingsUrl;
  }

  async viewRevenueAttribution(
    _input?: ViewRevenueAttributionInput,
  ): Promise<BloomreachRevenueAttributionSettings> {
    throw new Error(
      'viewRevenueAttribution: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewCurrency(_input?: ViewCurrencyInput): Promise<BloomreachCurrencySettings> {
    throw new Error(
      'viewCurrency: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewEvaluationDashboards(
    _input?: ViewEvaluationDashboardsInput,
  ): Promise<BloomreachEvaluationDashboardSettings> {
    throw new Error(
      'viewEvaluationDashboards: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  async viewVoucherMapping(
    _input?: ViewVoucherMappingInput,
  ): Promise<BloomreachVoucherMappingSettings> {
    throw new Error(
      'viewVoucherMapping: not yet implemented. Requires browser automation infrastructure.',
    );
  }

  prepareConfigureRevenueAttribution(
    input: ConfigureRevenueAttributionInput,
  ): PreparedEvaluationSettingsAction {
    const project = validateProject(input.project);
    const model = validateAttributionModel(input.model);
    const attributionWindow =
      input.attributionWindow !== undefined
        ? validateAttributionWindow(input.attributionWindow)
        : undefined;
    const channels = input.channels?.map((channel) => channel.trim());

    const preview = {
      action: CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE,
      project,
      model,
      attributionWindow,
      channels,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareSetCurrency(input: SetCurrencyInput): PreparedEvaluationSettingsAction {
    const project = validateProject(input.project);
    const currencyCode = validateCurrencyCode(input.currencyCode);
    const currencySymbol =
      input.currencySymbol !== undefined ? input.currencySymbol.trim() : undefined;

    const preview = {
      action: SET_CURRENCY_ACTION_TYPE,
      project,
      currencyCode,
      currencySymbol,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureEvaluationDashboards(
    input: ConfigureEvaluationDashboardsInput,
  ): PreparedEvaluationSettingsAction {
    const project = validateProject(input.project);
    if (input.dashboards.length === 0) {
      throw new Error('At least one dashboard configuration must be provided.');
    }
    const dashboards = input.dashboards.map((dashboard) => ({
      id: validateDashboardId(dashboard.id),
      enabled: dashboard.enabled,
    }));

    const preview = {
      action: CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE,
      project,
      dashboards,
      operatorNote: input.operatorNote,
    };

    return {
      preparedActionId: `pa_${Date.now()}`,
      confirmToken: `ct_stub_${Date.now()}`,
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      preview,
    };
  }

  prepareConfigureVoucherMapping(
    input: ConfigureVoucherMappingInput,
  ): PreparedEvaluationSettingsAction {
    const project = validateProject(input.project);
    const mappingField = validateMappingField(input.mappingField);
    const mappingType = input.mappingType !== undefined ? input.mappingType.trim() : undefined;

    const preview = {
      action: CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE,
      project,
      mappingField,
      mappingType,
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
