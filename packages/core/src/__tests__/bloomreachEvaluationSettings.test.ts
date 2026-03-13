import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE,
  SET_CURRENCY_ACTION_TYPE,
  CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE,
  CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE,
  EVALUATION_SETTINGS_RATE_LIMIT_WINDOW_MS,
  EVALUATION_SETTINGS_CONFIGURE_RATE_LIMIT,
  validateAttributionModel,
  validateAttributionWindow,
  validateCurrencyCode,
  validateDashboardId,
  validateMappingField,
  buildRevenueAttributionUrl,
  buildCurrencyUrl,
  buildEvaluationDashboardsUrl,
  buildVoucherMappingUrl,
  createEvaluationSettingsActionExecutors,
  BloomreachEvaluationSettingsService,
} from '../index.js';

const TEST_API_CONFIG: BloomreachApiConfig = {
  projectToken: 'test-token-123',
  apiKeyId: 'key-id',
  apiSecret: 'key-secret',
  baseUrl: 'https://api.test.com',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action type constants', () => {
  it('exports CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE', () => {
    expect(CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE).toBe(
      'evaluation_settings.configure_revenue_attribution',
    );
  });

  it('exports SET_CURRENCY_ACTION_TYPE', () => {
    expect(SET_CURRENCY_ACTION_TYPE).toBe('evaluation_settings.set_currency');
  });

  it('exports CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE', () => {
    expect(CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE).toBe(
      'evaluation_settings.configure_evaluation_dashboards',
    );
  });

  it('exports CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE', () => {
    expect(CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE).toBe(
      'evaluation_settings.configure_voucher_mapping',
    );
  });
});

describe('rate limit constants', () => {
  it('exports EVALUATION_SETTINGS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(EVALUATION_SETTINGS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports EVALUATION_SETTINGS_CONFIGURE_RATE_LIMIT', () => {
    expect(EVALUATION_SETTINGS_CONFIGURE_RATE_LIMIT).toBe(20);
  });
});

describe('validateAttributionModel', () => {
  it('throws for empty string', () => {
    expect(() => validateAttributionModel('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateAttributionModel('   ')).toThrow('must not be empty');
  });

  it('returns trimmed model for valid input', () => {
    expect(validateAttributionModel('  first-touch  ')).toBe('first-touch');
  });

  it('accepts model at maximum length', () => {
    const model = 'x'.repeat(100);
    expect(validateAttributionModel(model)).toBe(model);
  });

  it('throws for model exceeding maximum length', () => {
    const model = 'x'.repeat(101);
    expect(() => validateAttributionModel(model)).toThrow('must not exceed 100 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateAttributionModel('\n\tfirst-touch\t\n')).toBe('first-touch');
  });

  it('accepts single-character model', () => {
    expect(validateAttributionModel('x')).toBe('x');
  });

  it('accepts unicode model', () => {
    expect(validateAttributionModel('příjmový model')).toBe('příjmový model');
  });

  it('throws for tab-only string', () => {
    expect(() => validateAttributionModel('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateAttributionModel('\n\n')).toThrow('must not be empty');
  });
});

describe('validateAttributionWindow', () => {
  it('throws for zero', () => {
    expect(() => validateAttributionWindow(0)).toThrow();
  });

  it('throws for negative value', () => {
    expect(() => validateAttributionWindow(-1)).toThrow();
  });

  it('throws for non-integer value', () => {
    expect(() => validateAttributionWindow(1.5)).toThrow();
  });

  it('throws for values greater than 365', () => {
    expect(() => validateAttributionWindow(366)).toThrow();
  });

  it('accepts 1 as minimum valid value', () => {
    expect(validateAttributionWindow(1)).toBe(1);
  });

  it('accepts 365 as maximum valid value', () => {
    expect(validateAttributionWindow(365)).toBe(365);
  });

  it('accepts a typical value', () => {
    expect(validateAttributionWindow(30)).toBe(30);
  });

  it('throws for NaN', () => {
    expect(() => validateAttributionWindow(NaN)).toThrow();
  });
});

describe('validateCurrencyCode', () => {
  it('throws for empty string', () => {
    expect(() => validateCurrencyCode('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCurrencyCode('   ')).toThrow('must not be empty');
  });

  it('throws for 2-character code', () => {
    expect(() => validateCurrencyCode('EU')).toThrow();
  });

  it('throws for 4-character code', () => {
    expect(() => validateCurrencyCode('EURO')).toThrow();
  });

  it('accepts and uppercases lowercase code', () => {
    expect(validateCurrencyCode('eur')).toBe('EUR');
  });

  it('throws for non-alpha code', () => {
    expect(() => validateCurrencyCode('12E')).toThrow();
  });

  it('returns trimmed uppercased 3-letter code', () => {
    expect(validateCurrencyCode(' usd ')).toBe('USD');
  });

  it('accepts EUR', () => {
    expect(validateCurrencyCode('EUR')).toBe('EUR');
  });

  it('accepts USD', () => {
    expect(validateCurrencyCode('USD')).toBe('USD');
  });

  it('accepts lower-case input with trimming and uppercasing', () => {
    expect(validateCurrencyCode(' eur ')).toBe('EUR');
  });

  it('throws for tab-only string', () => {
    expect(() => validateCurrencyCode('\t\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateCurrencyCode('\n\n\n')).toThrow('must not be empty');
  });

  it('throws for numeric currency code', () => {
    expect(() => validateCurrencyCode('123')).toThrow('uppercase letters only');
  });

  it('throws for mixed alphanumeric code', () => {
    expect(() => validateCurrencyCode('U2D')).toThrow('uppercase letters only');
  });
});

describe('validateDashboardId', () => {
  it('throws for empty string', () => {
    expect(() => validateDashboardId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateDashboardId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed dashboard ID for valid input', () => {
    expect(validateDashboardId('  dashboard-123  ')).toBe('dashboard-123');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateDashboardId('\n\tdashboard-abc\t\n')).toBe('dashboard-abc');
  });

  it('accepts single-character ID', () => {
    expect(validateDashboardId('d')).toBe('d');
  });

  it('accepts unicode dashboard ID', () => {
    expect(validateDashboardId('přehled-č123')).toBe('přehled-č123');
  });

  it('throws for tab-only string', () => {
    expect(() => validateDashboardId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateDashboardId('\n\n')).toThrow('must not be empty');
  });
});

describe('validateMappingField', () => {
  it('throws for empty string', () => {
    expect(() => validateMappingField('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateMappingField('   ')).toThrow('must not be empty');
  });

  it('returns trimmed mapping field for valid input', () => {
    expect(validateMappingField('  voucher_code  ')).toBe('voucher_code');
  });

  it('accepts mapping field at maximum length', () => {
    const mappingField = 'x'.repeat(200);
    expect(validateMappingField(mappingField)).toBe(mappingField);
  });

  it('throws for mapping field exceeding maximum length', () => {
    const mappingField = 'x'.repeat(201);
    expect(() => validateMappingField(mappingField)).toThrow('must not exceed 200 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateMappingField('\n\tvoucher_code\t\n')).toBe('voucher_code');
  });

  it('accepts single-character field', () => {
    expect(validateMappingField('v')).toBe('v');
  });

  it('accepts unicode mapping field', () => {
    expect(validateMappingField('kód_poukazu')).toBe('kód_poukazu');
  });

  it('throws for tab-only string', () => {
    expect(() => validateMappingField('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateMappingField('\n\n')).toThrow('must not be empty');
  });
});

describe('URL builders', () => {
  it('builds all URLs for a simple project name', () => {
    expect(buildRevenueAttributionUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/project-revenue-attribution',
    );
    expect(buildCurrencyUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/project-settings/currency');
    expect(buildEvaluationDashboardsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/evaluation-dashboards',
    );
    expect(buildVoucherMappingUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/vouchers',
    );
  });

  it('encodes spaces in all URLs', () => {
    expect(buildRevenueAttributionUrl('my project')).toBe(
      '/p/my%20project/project-settings/project-revenue-attribution',
    );
    expect(buildCurrencyUrl('my project')).toBe('/p/my%20project/project-settings/currency');
    expect(buildEvaluationDashboardsUrl('my project')).toBe(
      '/p/my%20project/project-settings/evaluation-dashboards',
    );
    expect(buildVoucherMappingUrl('my project')).toBe('/p/my%20project/project-settings/vouchers');
  });

  it('handles project names with slashes in all URLs', () => {
    expect(buildRevenueAttributionUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/project-revenue-attribution',
    );
    expect(buildCurrencyUrl('org/project')).toBe('/p/org%2Fproject/project-settings/currency');
    expect(buildEvaluationDashboardsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/evaluation-dashboards',
    );
    expect(buildVoucherMappingUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/vouchers',
    );
  });

  it('encodes unicode project names in URLs', () => {
    expect(buildRevenueAttributionUrl('projekt åäö')).toContain('%C3%A5');
    expect(buildCurrencyUrl('projekt åäö')).toContain('%C3%A5');
    expect(buildEvaluationDashboardsUrl('projekt åäö')).toContain('%C3%A5');
    expect(buildVoucherMappingUrl('projekt åäö')).toContain('%C3%A5');
  });

  it('encodes hash in URLs', () => {
    expect(buildRevenueAttributionUrl('my#project')).toBe(
      '/p/my%23project/project-settings/project-revenue-attribution',
    );
    expect(buildCurrencyUrl('my#project')).toBe('/p/my%23project/project-settings/currency');
    expect(buildEvaluationDashboardsUrl('my#project')).toBe(
      '/p/my%23project/project-settings/evaluation-dashboards',
    );
    expect(buildVoucherMappingUrl('my#project')).toBe(
      '/p/my%23project/project-settings/vouchers',
    );
  });
});

describe('createEvaluationSettingsActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createEvaluationSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE]).toBeDefined();
    expect(executors[SET_CURRENCY_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching key', () => {
    const executors = createEvaluationSettingsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('executors throw UI-only availability message on execute', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('ConfigureRevenueAttributionExecutor mentions UI-only availability', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    await expect(executors[CONFIGURE_REVENUE_ATTRIBUTION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('SetCurrencyExecutor mentions UI-only availability', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    await expect(executors[SET_CURRENCY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('ConfigureEvaluationDashboardsExecutor mentions UI-only availability', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    await expect(executors[CONFIGURE_EVALUATION_DASHBOARDS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('ConfigureVoucherMappingExecutor mentions UI-only availability', async () => {
    const executors = createEvaluationSettingsActionExecutors();
    await expect(executors[CONFIGURE_VOUCHER_MAPPING_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });
});

describe('apiConfig acceptance', () => {
  it('createEvaluationSettingsActionExecutors accepts apiConfig', () => {
    const executors = createEvaluationSettingsActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(4);
  });

  it('createEvaluationSettingsActionExecutors works without apiConfig', () => {
    const executors = createEvaluationSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
  });

  it('BloomreachEvaluationSettingsService accepts apiConfig', () => {
    const service = new BloomreachEvaluationSettingsService('test', TEST_API_CONFIG);
    expect(service.revenueAttributionUrl).toBe(
      '/p/test/project-settings/project-revenue-attribution',
    );
  });

  it('BloomreachEvaluationSettingsService works without apiConfig', () => {
    const service = new BloomreachEvaluationSettingsService('test');
    expect(service.revenueAttributionUrl).toBe(
      '/p/test/project-settings/project-revenue-attribution',
    );
  });
});

describe('BloomreachEvaluationSettingsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachEvaluationSettingsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachEvaluationSettingsService);
    });

    it('trims project name', () => {
      const service = new BloomreachEvaluationSettingsService('  my-project  ');
      expect(service.revenueAttributionUrl).toBe(
        '/p/my-project/project-settings/project-revenue-attribution',
      );
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachEvaluationSettingsService('')).toThrow('must not be empty');
    });

    it('encodes spaces in URL', () => {
      const service = new BloomreachEvaluationSettingsService('my project');
      expect(service.revenueAttributionUrl).toBe(
        '/p/my%20project/project-settings/project-revenue-attribution',
      );
    });

    it('encodes unicode in URL', () => {
      const service = new BloomreachEvaluationSettingsService('projekt åäö');
      expect(service.revenueAttributionUrl).toContain('%C3%A5');
    });

    it('encodes hash in URL', () => {
      const service = new BloomreachEvaluationSettingsService('my#project');
      expect(service.revenueAttributionUrl).toBe(
        '/p/my%23project/project-settings/project-revenue-attribution',
      );
    });
  });

  describe('URL getters', () => {
    it('returns all evaluation settings URLs', () => {
      const service = new BloomreachEvaluationSettingsService('kingdom-of-joakim');
      expect(service.revenueAttributionUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/project-revenue-attribution',
      );
      expect(service.currencyUrl).toBe('/p/kingdom-of-joakim/project-settings/currency');
      expect(service.evaluationDashboardsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/evaluation-dashboards',
      );
      expect(service.voucherMappingUrl).toBe('/p/kingdom-of-joakim/project-settings/vouchers');
    });
  });

  describe('read methods', () => {
    it('viewRevenueAttribution throws not-yet-implemented error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewRevenueAttribution()).rejects.toThrow('not yet implemented');
    });

    it('viewCurrency throws not-yet-implemented error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewCurrency()).rejects.toThrow('not yet implemented');
    });

    it('viewEvaluationDashboards throws not-yet-implemented error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewEvaluationDashboards()).rejects.toThrow('not yet implemented');
    });

    it('viewVoucherMapping throws not-yet-implemented error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewVoucherMapping()).rejects.toThrow('not yet implemented');
    });

    it('viewRevenueAttribution throws descriptive UI-only error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewRevenueAttribution()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewCurrency throws descriptive UI-only error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewCurrency()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewEvaluationDashboards throws descriptive UI-only error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewEvaluationDashboards()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewVoucherMapping throws descriptive UI-only error', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewVoucherMapping()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewRevenueAttribution validates project when input provided', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewRevenueAttribution({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('viewCurrency validates project when input provided', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewCurrency({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('viewEvaluationDashboards validates project when input provided', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewEvaluationDashboards({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('viewVoucherMapping validates project when input provided', async () => {
      const service = new BloomreachEvaluationSettingsService('test');
      await expect(service.viewVoucherMapping({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareConfigureRevenueAttribution', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        model: 'first-touch',
        attributionWindow: 30,
        operatorNote: 'align attribution model',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureRevenueAttribution']>[0];
      const result = service.prepareConfigureRevenueAttribution(input);

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'evaluation_settings.configure_revenue_attribution',
          project: 'test',
          model: 'first-touch',
          attributionWindow: 30,
          operatorNote: 'align attribution model',
        }),
      );
    });

    it('trims the model value', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        model: '  first-touch  ',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureRevenueAttribution']>[0];
      const result = service.prepareConfigureRevenueAttribution(input);
      expect(result.preview).toEqual(expect.objectContaining({ model: 'first-touch' }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: '',
        model: 'first-touch',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureRevenueAttribution']>[0];
      expect(() => service.prepareConfigureRevenueAttribution(input)).toThrow('must not be empty');
    });

    it('throws for empty model', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        model: '',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureRevenueAttribution']>[0];
      expect(() => service.prepareConfigureRevenueAttribution(input)).toThrow('must not be empty');
    });

    it('validates attribution window when provided', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        model: 'first-touch',
        attributionWindow: 0,
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureRevenueAttribution']>[0];
      expect(() => service.prepareConfigureRevenueAttribution(input)).toThrow();
    });
  });

  describe('prepareSetCurrency', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        currencyCode: 'USD',
        operatorNote: 'set billing currency',
      } as Parameters<BloomreachEvaluationSettingsService['prepareSetCurrency']>[0];
      const result = service.prepareSetCurrency(input);

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'evaluation_settings.set_currency',
          project: 'test',
          currencyCode: 'USD',
          operatorNote: 'set billing currency',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: '',
        currencyCode: 'USD',
      } as Parameters<BloomreachEvaluationSettingsService['prepareSetCurrency']>[0];
      expect(() => service.prepareSetCurrency(input)).toThrow('must not be empty');
    });

    it('throws for invalid currency code', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        currencyCode: 'US',
      } as Parameters<BloomreachEvaluationSettingsService['prepareSetCurrency']>[0];
      expect(() => service.prepareSetCurrency(input)).toThrow();
    });

    it('trims and uppercases currency code', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        currencyCode: ' eur ',
      } as Parameters<BloomreachEvaluationSettingsService['prepareSetCurrency']>[0];
      const result = service.prepareSetCurrency(input);
      expect(result.preview).toEqual(expect.objectContaining({ currencyCode: 'EUR' }));
    });
  });

  describe('prepareConfigureEvaluationDashboards', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        dashboards: [
          { id: 'dashboard-1', enabled: true },
          { id: ' dashboard-2 ', enabled: false },
        ],
        operatorNote: 'set dashboard mappings',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureEvaluationDashboards']>[0];
      const result = service.prepareConfigureEvaluationDashboards(input);

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'evaluation_settings.configure_evaluation_dashboards',
          project: 'test',
          dashboards: [
            { id: 'dashboard-1', enabled: true },
            { id: 'dashboard-2', enabled: false },
          ],
          operatorNote: 'set dashboard mappings',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: '',
        dashboards: [{ id: 'dashboard-1', enabled: true }],
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureEvaluationDashboards']>[0];
      expect(() => service.prepareConfigureEvaluationDashboards(input)).toThrow('must not be empty');
    });

    it('throws for empty dashboards array', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        dashboards: [],
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureEvaluationDashboards']>[0];
      expect(() => service.prepareConfigureEvaluationDashboards(input)).toThrow();
    });

    it('validates dashboard IDs', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        dashboards: [
          { id: 'dashboard-1', enabled: true },
          { id: '   ', enabled: false },
        ],
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureEvaluationDashboards']>[0];
      expect(() => service.prepareConfigureEvaluationDashboards(input)).toThrow('must not be empty');
    });
  });

  describe('prepareConfigureVoucherMapping', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        mappingField: 'externalVoucherCode',
        operatorNote: 'map voucher field',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureVoucherMapping']>[0];
      const result = service.prepareConfigureVoucherMapping(input);

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'evaluation_settings.configure_voucher_mapping',
          project: 'test',
          mappingField: 'externalVoucherCode',
          operatorNote: 'map voucher field',
        }),
      );
    });

    it('trims mapping field', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        mappingField: '  voucherCode  ',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureVoucherMapping']>[0];
      const result = service.prepareConfigureVoucherMapping(input);
      expect(result.preview).toEqual(expect.objectContaining({ mappingField: 'voucherCode' }));
    });

    it('throws for empty project', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: '',
        mappingField: 'voucherCode',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureVoucherMapping']>[0];
      expect(() => service.prepareConfigureVoucherMapping(input)).toThrow('must not be empty');
    });

    it('throws for empty mapping field', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const input = {
        project: 'test',
        mappingField: '',
      } as Parameters<BloomreachEvaluationSettingsService['prepareConfigureVoucherMapping']>[0];
      expect(() => service.prepareConfigureVoucherMapping(input)).toThrow('must not be empty');
    });
  });

  describe('token expiry consistency', () => {
    it('all prepare methods set expiry ~30 minutes in the future', () => {
      const service = new BloomreachEvaluationSettingsService('test');
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;

      const results = [
        service.prepareConfigureRevenueAttribution({
          project: 'test',
          model: 'first-touch',
        }),
        service.prepareSetCurrency({
          project: 'test',
          currencyCode: 'USD',
        }),
        service.prepareConfigureEvaluationDashboards({
          project: 'test',
          dashboards: [{ id: 'dashboard-1', enabled: true }],
        }),
        service.prepareConfigureVoucherMapping({
          project: 'test',
          mappingField: 'voucherCode',
        }),
      ];

      for (const result of results) {
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + thirtyMinMs - 1000);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + thirtyMinMs + 5000);
      }
    });
  });
});
