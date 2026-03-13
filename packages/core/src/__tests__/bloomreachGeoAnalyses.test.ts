import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_GEO_ANALYSIS_ACTION_TYPE,
  CLONE_GEO_ANALYSIS_ACTION_TYPE,
  ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
  GEO_ANALYSIS_RATE_LIMIT_WINDOW_MS,
  GEO_ANALYSIS_CREATE_RATE_LIMIT,
  GEO_ANALYSIS_MODIFY_RATE_LIMIT,
  GEO_GRANULARITIES,
  validateGeoAnalysisName,
  validateGeoGranularity,
  validateGeoAnalysisId,
  validateAttribute,
  buildGeoAnalysesUrl,
  createGeoAnalysisActionExecutors,
  BloomreachGeoAnalysesService,
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
  it('exports CREATE_GEO_ANALYSIS_ACTION_TYPE', () => {
    expect(CREATE_GEO_ANALYSIS_ACTION_TYPE).toBe('geoanalyses.create_geo_analysis');
  });

  it('exports CLONE_GEO_ANALYSIS_ACTION_TYPE', () => {
    expect(CLONE_GEO_ANALYSIS_ACTION_TYPE).toBe('geoanalyses.clone_geo_analysis');
  });

  it('exports ARCHIVE_GEO_ANALYSIS_ACTION_TYPE', () => {
    expect(ARCHIVE_GEO_ANALYSIS_ACTION_TYPE).toBe('geoanalyses.archive_geo_analysis');
  });

  it('uses unique action type values', () => {
    const values = [
      CREATE_GEO_ANALYSIS_ACTION_TYPE,
      CLONE_GEO_ANALYSIS_ACTION_TYPE,
      ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
    ];
    expect(new Set(values).size).toBe(3);
  });

  it('uses geoanalyses namespace for all action types', () => {
    expect(CREATE_GEO_ANALYSIS_ACTION_TYPE.startsWith('geoanalyses.')).toBe(true);
    expect(CLONE_GEO_ANALYSIS_ACTION_TYPE.startsWith('geoanalyses.')).toBe(true);
    expect(ARCHIVE_GEO_ANALYSIS_ACTION_TYPE.startsWith('geoanalyses.')).toBe(true);
  });
});

describe('rate limit constants', () => {
  it('exports GEO_ANALYSIS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(GEO_ANALYSIS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports GEO_ANALYSIS_CREATE_RATE_LIMIT', () => {
    expect(GEO_ANALYSIS_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports GEO_ANALYSIS_MODIFY_RATE_LIMIT', () => {
    expect(GEO_ANALYSIS_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('uses create limit lower than modify limit', () => {
    expect(GEO_ANALYSIS_CREATE_RATE_LIMIT).toBeLessThan(GEO_ANALYSIS_MODIFY_RATE_LIMIT);
  });

  it('uses positive numeric limits', () => {
    expect(GEO_ANALYSIS_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    expect(GEO_ANALYSIS_CREATE_RATE_LIMIT).toBeGreaterThan(0);
    expect(GEO_ANALYSIS_MODIFY_RATE_LIMIT).toBeGreaterThan(0);
  });
});

describe('GEO_GRANULARITIES', () => {
  it('contains 3 granularities', () => {
    expect(GEO_GRANULARITIES).toHaveLength(3);
  });

  it('contains expected granularity values in order', () => {
    expect(GEO_GRANULARITIES).toEqual(['country', 'region', 'city']);
  });

  it('contains only unique values', () => {
    expect(new Set(GEO_GRANULARITIES).size).toBe(3);
  });

  it('all granularity values are lowercase', () => {
    for (const granularity of GEO_GRANULARITIES) {
      expect(granularity).toBe(granularity.toLowerCase());
    }
  });

  it('all granularity values are non-empty strings', () => {
    for (const granularity of GEO_GRANULARITIES) {
      expect(typeof granularity).toBe('string');
      expect(granularity.length).toBeGreaterThan(0);
    }
  });
});

describe('validateGeoAnalysisName', () => {
  it('returns trimmed name for valid input with whitespace', () => {
    expect(validateGeoAnalysisName('  Revenue by Geography  ')).toBe(
      'Revenue by Geography',
    );
  });

  it('accepts single-character name', () => {
    expect(validateGeoAnalysisName('A')).toBe('A');
  });

  it('accepts name at maximum length (200)', () => {
    const name = 'x'.repeat(200);
    expect(validateGeoAnalysisName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateGeoAnalysisName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateGeoAnalysisName('    ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const tooLong = 'x'.repeat(201);
    expect(() => validateGeoAnalysisName(tooLong)).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('trims tabs and newlines around valid name', () => {
    expect(validateGeoAnalysisName('\n\tRegional Reach\t\n')).toBe('Regional Reach');
  });

  it('accepts alphanumeric name with punctuation', () => {
    expect(validateGeoAnalysisName('Geo Analysis: Q1-2025 v2')).toBe(
      'Geo Analysis: Q1-2025 v2',
    );
  });

  it('accepts name containing inner multiple spaces', () => {
    expect(validateGeoAnalysisName('Geo   Distribution   Report')).toBe(
      'Geo   Distribution   Report',
    );
  });

  it('accepts numeric name', () => {
    expect(validateGeoAnalysisName('12345')).toBe('12345');
  });

  it('throws for tab-only name', () => {
    expect(() => validateGeoAnalysisName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only name', () => {
    expect(() => validateGeoAnalysisName('\n')).toThrow('must not be empty');
  });

  it('throws for mixed whitespace-only name', () => {
    expect(() => validateGeoAnalysisName(' \n\t ')).toThrow('must not be empty');
  });

  it('reports actual length when exceeding max by one', () => {
    expect(() => validateGeoAnalysisName('x'.repeat(201))).toThrow('(got 201)');
  });

  it('reports actual length when exceeding max by many', () => {
    expect(() => validateGeoAnalysisName('x'.repeat(250))).toThrow('(got 250)');
  });

  it('accepts emoji in name', () => {
    expect(validateGeoAnalysisName('Analysis 🌍')).toBe('Analysis 🌍');
  });

  it('accepts mixed whitespace around valid name', () => {
    expect(validateGeoAnalysisName(' \t  Revenue by Region \n ')).toBe('Revenue by Region');
  });

  it('preserves internal spacing in valid name', () => {
    expect(validateGeoAnalysisName('Revenue   by   Region')).toBe('Revenue   by   Region');
  });

  it('throws for too-long name even with surrounding whitespace', () => {
    expect(() => validateGeoAnalysisName(`  ${'x'.repeat(201)}  `)).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateGeoGranularity', () => {
  it('accepts country', () => {
    expect(validateGeoGranularity('country')).toBe('country');
  });

  it('accepts region', () => {
    expect(validateGeoGranularity('region')).toBe('region');
  });

  it('accepts city', () => {
    expect(validateGeoGranularity('city')).toBe('city');
  });

  it('throws for unknown granularity', () => {
    expect(() => validateGeoGranularity('continent')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for empty granularity', () => {
    expect(() => validateGeoGranularity('')).toThrow('granularity must be one of');
  });

  it('throws for uppercase granularity', () => {
    expect(() => validateGeoGranularity('COUNTRY')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for title-case granularity', () => {
    expect(() => validateGeoGranularity('Country')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for granularity with trailing whitespace', () => {
    expect(() => validateGeoGranularity('country ')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for granularity with leading whitespace', () => {
    expect(() => validateGeoGranularity(' region')).toThrow(
      'granularity must be one of',
    );
  });

  it('throws for granularity with slash', () => {
    expect(() => validateGeoGranularity('country/region')).toThrow(
      'granularity must be one of',
    );
  });

  it('error includes received invalid value', () => {
    expect(() => validateGeoGranularity('district')).toThrow('got "district"');
  });
});

describe('validateGeoAnalysisId', () => {
  it('returns trimmed geo analysis ID for valid input', () => {
    expect(validateGeoAnalysisId('  geo-123  ')).toBe('geo-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateGeoAnalysisId('geo-456')).toBe('geo-456');
  });

  it('throws for empty string', () => {
    expect(() => validateGeoAnalysisId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateGeoAnalysisId('   ')).toThrow('must not be empty');
  });

  it('trims tab-wrapped ID', () => {
    expect(validateGeoAnalysisId('\tgeo-tabbed\t')).toBe('geo-tabbed');
  });

  it('trims newline-wrapped ID', () => {
    expect(validateGeoAnalysisId('\ngeo-newline\n')).toBe('geo-newline');
  });

  it('accepts IDs containing slashes', () => {
    expect(validateGeoAnalysisId('analysis/geo/1')).toBe('analysis/geo/1');
  });

  it('accepts IDs containing colons', () => {
    expect(validateGeoAnalysisId('geo:analysis:1')).toBe('geo:analysis:1');
  });

  it('accepts IDs containing dots', () => {
    expect(validateGeoAnalysisId('geo.analysis.1')).toBe('geo.analysis.1');
  });

  it('throws for tab-only value', () => {
    expect(() => validateGeoAnalysisId('\t')).toThrow('must not be empty');
  });

  it('throws for newline-only value', () => {
    expect(() => validateGeoAnalysisId('\n')).toThrow('must not be empty');
  });

  it('accepts unicode ID', () => {
    expect(validateGeoAnalysisId('analyse-åäö')).toBe('analyse-åäö');
  });

  it('returns trimmed ID with mixed whitespace', () => {
    expect(validateGeoAnalysisId(' \n\tgeo-789\t ')).toBe('geo-789');
  });

  it('throws for mixed-whitespace-only string', () => {
    expect(() => validateGeoAnalysisId(' \n\t ')).toThrow('must not be empty');
  });
});

describe('validateAttribute', () => {
  it('returns trimmed attribute for valid input', () => {
    expect(validateAttribute('  customer.country  ')).toBe('customer.country');
  });

  it('throws for empty string', () => {
    expect(() => validateAttribute('')).toThrow('attribute must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateAttribute('   ')).toThrow('attribute must not be empty');
  });

  it('trims tabs and newlines around valid attribute', () => {
    expect(validateAttribute('\n\tcustomer.region\t\n')).toBe('customer.region');
  });

  it('accepts simple attribute name', () => {
    expect(validateAttribute('city')).toBe('city');
  });

  it('accepts dotted attribute path', () => {
    expect(validateAttribute('customer.address.city')).toBe('customer.address.city');
  });

  it('accepts underscored attribute name', () => {
    expect(validateAttribute('shipping_country_code')).toBe('shipping_country_code');
  });

  it('accepts hyphenated attribute name', () => {
    expect(validateAttribute('geo-country-code')).toBe('geo-country-code');
  });

  it('throws for tab-only attribute', () => {
    expect(() => validateAttribute('\t\t')).toThrow('attribute must not be empty');
  });

  it('throws for newline-only attribute', () => {
    expect(() => validateAttribute('\n')).toThrow('attribute must not be empty');
  });

  it('accepts unicode attribute', () => {
    expect(validateAttribute('client.région')).toBe('client.région');
  });

  it('accepts emoji attribute', () => {
    expect(validateAttribute('customer.🌍')).toBe('customer.🌍');
  });
});

describe('buildGeoAnalysesUrl', () => {
  it('builds URL for simple project name', () => {
    expect(buildGeoAnalysesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/analytics/geoanalyses',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildGeoAnalysesUrl('my project')).toBe(
      '/p/my%20project/analytics/geoanalyses',
    );
  });

  it('encodes slashes in project name', () => {
    expect(buildGeoAnalysesUrl('org/project')).toBe(
      '/p/org%2Fproject/analytics/geoanalyses',
    );
  });

  it('encodes plus signs in project name', () => {
    expect(buildGeoAnalysesUrl('project+test')).toBe(
      '/p/project%2Btest/analytics/geoanalyses',
    );
  });

  it('encodes question marks in project name', () => {
    expect(buildGeoAnalysesUrl('project?name')).toBe(
      '/p/project%3Fname/analytics/geoanalyses',
    );
  });

  it('encodes hash in project name', () => {
    expect(buildGeoAnalysesUrl('project#1')).toBe(
      '/p/project%231/analytics/geoanalyses',
    );
  });

  it('encodes leading and trailing spaces when passed directly', () => {
    expect(buildGeoAnalysesUrl('  my project  ')).toBe(
      '/p/%20%20my%20project%20%20/analytics/geoanalyses',
    );
  });

  it('encodes unicode project name', () => {
    expect(buildGeoAnalysesUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/geoanalyses',
    );
  });
});

describe('createGeoAnalysisActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createGeoAnalysisActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_GEO_ANALYSIS_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_GEO_ANALYSIS_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createGeoAnalysisActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw not yet implemented on execute', async () => {
    const executors = createGeoAnalysisActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns stable set of keys', () => {
    const executors = createGeoAnalysisActionExecutors();
    expect(Object.keys(executors).sort()).toEqual(
      [
        CREATE_GEO_ANALYSIS_ACTION_TYPE,
        CLONE_GEO_ANALYSIS_ACTION_TYPE,
        ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
      ].sort(),
    );
  });

  it('returns new executor instances each call', () => {
    const a = createGeoAnalysisActionExecutors();
    const b = createGeoAnalysisActionExecutors();
    expect(a[CREATE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(
      b[CREATE_GEO_ANALYSIS_ACTION_TYPE],
    );
    expect(a[CLONE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(
      b[CLONE_GEO_ANALYSIS_ACTION_TYPE],
    );
    expect(a[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(
      b[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE],
    );
  });

  it('create executor reports correct action type', () => {
    const executors = createGeoAnalysisActionExecutors();
    expect(executors[CREATE_GEO_ANALYSIS_ACTION_TYPE].actionType).toBe(
      CREATE_GEO_ANALYSIS_ACTION_TYPE,
    );
  });

  it('clone executor reports correct action type', () => {
    const executors = createGeoAnalysisActionExecutors();
    expect(executors[CLONE_GEO_ANALYSIS_ACTION_TYPE].actionType).toBe(
      CLONE_GEO_ANALYSIS_ACTION_TYPE,
    );
  });

  it('archive executor reports correct action type', () => {
    const executors = createGeoAnalysisActionExecutors();
    expect(executors[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE].actionType).toBe(
      ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
    );
  });

  it('create executor mentions UI-only in error', async () => {
    const executors = createGeoAnalysisActionExecutors();
    await expect(executors[CREATE_GEO_ANALYSIS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('clone executor mentions UI-only in error', async () => {
    const executors = createGeoAnalysisActionExecutors();
    await expect(executors[CLONE_GEO_ANALYSIS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('archive executor mentions UI-only in error', async () => {
    const executors = createGeoAnalysisActionExecutors();
    await expect(executors[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createGeoAnalysisActionExecutors()).sort();
    const withConfig = Object.keys(createGeoAnalysisActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('returns expected action keys', () => {
    const keys = Object.keys(createGeoAnalysisActionExecutors()).sort();
    expect(keys).toEqual(
      [
        ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
        CLONE_GEO_ANALYSIS_ACTION_TYPE,
        CREATE_GEO_ANALYSIS_ACTION_TYPE,
      ].sort(),
    );
  });

  it('returns new executor instances on each call', () => {
    const first = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    const second = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    expect(first[CREATE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(second[CREATE_GEO_ANALYSIS_ACTION_TYPE]);
    expect(first[CLONE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(second[CLONE_GEO_ANALYSIS_ACTION_TYPE]);
    expect(first[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE]).not.toBe(second[ARCHIVE_GEO_ANALYSIS_ACTION_TYPE]);
  });

  it('all executors mention UI-only guidance with apiConfig', async () => {
    const executors = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('uses independent executor maps for configured and unconfigured calls', () => {
    const withoutConfig = createGeoAnalysisActionExecutors();
    const withConfig = createGeoAnalysisActionExecutors(TEST_API_CONFIG);
    expect(withoutConfig).not.toBe(withConfig);
  });

  it('supports custom apiConfig values without changing key set', () => {
    const executors = createGeoAnalysisActionExecutors({
      ...TEST_API_CONFIG,
      baseUrl: 'https://api-alt.test.com',
      projectToken: 'another-token',
    });
    expect(Object.keys(executors).sort()).toEqual(
      [
        CREATE_GEO_ANALYSIS_ACTION_TYPE,
        CLONE_GEO_ANALYSIS_ACTION_TYPE,
        ARCHIVE_GEO_ANALYSIS_ACTION_TYPE,
      ].sort(),
    );
  });
});

describe('BloomreachGeoAnalysesService', () => {
  describe('constructor', () => {
    it('creates service instance with valid project', () => {
      const service = new BloomreachGeoAnalysesService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachGeoAnalysesService);
    });

    it('exposes the geoAnalysesUrl', () => {
      const service = new BloomreachGeoAnalysesService('kingdom-of-joakim');
      expect(service.geoAnalysesUrl).toBe('/p/kingdom-of-joakim/analytics/geoanalyses');
    });

    it('trims project name', () => {
      const service = new BloomreachGeoAnalysesService('  my-project  ');
      expect(service.geoAnalysesUrl).toBe('/p/my-project/analytics/geoanalyses');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachGeoAnalysesService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachGeoAnalysesService('   ')).toThrow(
        'must not be empty',
      );
    });

    it('throws for tab-only project', () => {
      expect(() => new BloomreachGeoAnalysesService('\t\t')).toThrow(
        'must not be empty',
      );
    });

    it('encodes slash in project URL', () => {
      const service = new BloomreachGeoAnalysesService('org/project');
      expect(service.geoAnalysesUrl).toBe('/p/org%2Fproject/analytics/geoanalyses');
    });

    it('encodes space in project URL', () => {
      const service = new BloomreachGeoAnalysesService('my project');
      expect(service.geoAnalysesUrl).toBe('/p/my%20project/analytics/geoanalyses');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachGeoAnalysesService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachGeoAnalysesService);
    });

    it('exposes geoAnalysesUrl when constructed with apiConfig', () => {
      const service = new BloomreachGeoAnalysesService('test', TEST_API_CONFIG);
      expect(service.geoAnalysesUrl).toBe('/p/test/analytics/geoanalyses');
    });

    it('encodes unicode project name in constructor URL', () => {
      const service = new BloomreachGeoAnalysesService('projekt åäö');
      expect(service.geoAnalysesUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/analytics/geoanalyses');
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachGeoAnalysesService('my#project');
      expect(service.geoAnalysesUrl).toBe('/p/my%23project/analytics/geoanalyses');
    });

    it('returns stable geoAnalysesUrl with apiConfig across reads', () => {
      const service = new BloomreachGeoAnalysesService('alpha', TEST_API_CONFIG);
      expect(service.geoAnalysesUrl).toBe('/p/alpha/analytics/geoanalyses');
      expect(service.geoAnalysesUrl).toBe('/p/alpha/analytics/geoanalyses');
    });
  });

  describe('listGeoAnalyses', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses()).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project when input is provided (empty string)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates project when input is provided (whitespace-only)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('accepts trimmed project and still reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: '  test  ' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('accepts encoded-looking project and still reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.listGeoAnalyses({ project: 'org/project' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachGeoAnalysesService('test', TEST_API_CONFIG);
      await expect(service.listGeoAnalyses()).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for unicode project override', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: 'projekt åäö' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for slash project override', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: 'org/project' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });

    it('throws no-API-endpoint error for tab/newline project override', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(service.listGeoAnalyses({ project: '\n\tkingdom\t\n' })).rejects.toThrow(
        'does not provide an endpoint',
      );
    });
  });

  describe('viewGeoResults', () => {
    it('throws not-yet-implemented with valid minimal input', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: 'test', analysisId: 'geo-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws not-yet-implemented with full valid input (including granularity, dates)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          granularity: 'region',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('validates project input (empty)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: '', analysisId: 'geo-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates project input (whitespace-only)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: '   ', analysisId: 'geo-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates analysisId input (whitespace-only)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: 'test', analysisId: '   ' }),
      ).rejects.toThrow('Geo analysis ID must not be empty');
    });

    it('validates analysisId input (empty)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: 'test', analysisId: '' }),
      ).rejects.toThrow('Geo analysis ID must not be empty');
    });

    it('validates granularity when provided (invalid value)', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          granularity: 'district',
        }),
      ).rejects.toThrow('granularity must be one of');
    });

    it('validates date range: malformed startDate', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: 'bad-date',
        }),
      ).rejects.toThrow('startDate must be a valid ISO-8601 date');
    });

    it('validates date range: malformed endDate', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          endDate: '31-01-2025',
        }),
      ).rejects.toThrow('endDate must be a valid ISO-8601 date');
    });

    it('validates date range: startDate after endDate', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: '2025-02-01',
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow('must not be after');
    });

    it('accepts only startDate and reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: '2025-01-01',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts only endDate and reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts country granularity and reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          granularity: 'country',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('accepts city granularity and reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          granularity: 'city',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('rejects invalid calendar startDate', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: '2025-02-30',
        }),
      ).rejects.toThrow('startDate is not a valid calendar date');
    });

    it('rejects invalid calendar endDate', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          endDate: '2025-02-30',
        }),
      ).rejects.toThrow('endDate is not a valid calendar date');
    });

    it('rejects granularity with whitespace', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          granularity: ' region ',
        }),
      ).rejects.toThrow('granularity must be one of');
    });

    it('accepts trimmed project and analysisId and reaches not-yet-implemented', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: '  test  ', analysisId: '  geo-1  ' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachGeoAnalysesService('test', TEST_API_CONFIG);
      await expect(
        service.viewGeoResults({ project: 'test', analysisId: 'geo-1' }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error with apiConfig and full valid input', async () => {
      const service = new BloomreachGeoAnalysesService('test', TEST_API_CONFIG);
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for same-day date range', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({
          project: 'test',
          analysisId: 'geo-1',
          startDate: '2025-01-01',
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow('does not provide an endpoint');
    });

    it('throws no-API-endpoint error for encoded-looking analysisId', async () => {
      const service = new BloomreachGeoAnalysesService('test');
      await expect(
        service.viewGeoResults({ project: 'test', analysisId: 'geo%2Fencoded' }),
      ).rejects.toThrow('does not provide an endpoint');
    });
  });

  describe('prepareCreateGeoAnalysis', () => {
    it('returns prepared action with valid minimal input (project, name, attribute)', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Revenue by Country',
        attribute: 'customer.country',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'geoanalyses.create_geo_analysis',
          project: 'test',
          name: 'Revenue by Country',
          attribute: 'customer.country',
        }),
      );
    });

    it('preparedActionId matches /^pa_/', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Name',
        attribute: 'attr',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
    });

    it('confirmToken matches /^ct_stub_/', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Name',
        attribute: 'attr',
      });
      expect(result.confirmToken).toMatch(/^ct_stub_/);
    });

    it('expiresAtMs is greater than Date.now()', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Name',
        attribute: 'attr',
      });
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('includes granularity in preview when provided', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Regional Analysis',
        attribute: 'customer.region',
        granularity: 'region',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          granularity: 'region',
        }),
      );
    });

    it('includes filters in preview when provided (customerAttributes)', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'VIP Geo',
        attribute: 'customer.country',
        filters: {
          customerAttributes: { segment: 'vip', tier: 'gold' },
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: {
            customerAttributes: { segment: 'vip', tier: 'gold' },
          },
        }),
      );
    });

    it('includes filters in preview when provided (eventProperties)', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Geo by Currency',
        attribute: 'customer.country',
        filters: {
          eventProperties: { currency: 'USD', channel: 'email' },
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: {
            eventProperties: { currency: 'USD', channel: 'email' },
          },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Geo Analysis',
        attribute: 'customer.country',
        operatorNote: 'Create ahead of monthly KPI review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create ahead of monthly KPI review',
        }),
      );
    });

    it('trims project, name, and attribute in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: '  test  ',
        name: '  Geo Name  ',
        attribute: '  customer.city  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'test',
          name: 'Geo Name',
          attribute: 'customer.city',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: '',
          attribute: 'customer.country',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: '   ',
          attribute: 'customer.country',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: '',
          name: 'Geo Name',
          attribute: 'customer.country',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name (201 chars)', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: 'x'.repeat(201),
          attribute: 'customer.country',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for invalid granularity', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: 'Geo Name',
          attribute: 'customer.country',
          granularity: 'district',
        }),
      ).toThrow('granularity must be one of');
    });

    it('throws for empty attribute', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: 'Geo Name',
          attribute: '',
        }),
      ).toThrow('attribute must not be empty');
    });

    it('throws for whitespace-only attribute', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCreateGeoAnalysis({
          project: 'test',
          name: 'Geo Name',
          attribute: '   ',
        }),
      ).toThrow('attribute must not be empty');
    });

    it('accepts max-length name', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: maxName,
        attribute: 'customer.country',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });

    it('accepts country granularity', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'Country Analysis',
        attribute: 'customer.country',
        granularity: 'country',
      });
      expect(result.preview).toEqual(expect.objectContaining({ granularity: 'country' }));
    });

    it('accepts city granularity', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'City Analysis',
        attribute: 'customer.city',
        granularity: 'city',
      });
      expect(result.preview).toEqual(expect.objectContaining({ granularity: 'city' }));
    });

    it('allows undefined granularity', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCreateGeoAnalysis({
        project: 'test',
        name: 'No Granularity',
        attribute: 'customer.country',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: CREATE_GEO_ANALYSIS_ACTION_TYPE,
          project: 'test',
          name: 'No Granularity',
          attribute: 'customer.country',
        }),
      );
    });
  });

  describe('prepareCloneGeoAnalysis', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCloneGeoAnalysis({
        project: 'test',
        analysisId: 'geo-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'geoanalyses.clone_geo_analysis',
          project: 'test',
          analysisId: 'geo-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCloneGeoAnalysis({
        project: 'test',
        analysisId: 'geo-789',
        newName: '  Cloned Geo Analysis  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName: 'Cloned Geo Analysis',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCloneGeoAnalysis({
        project: 'test',
        analysisId: 'geo-789',
        operatorNote: 'Clone for regional team reporting',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Clone for regional team reporting',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCloneGeoAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCloneGeoAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCloneGeoAnalysis({
          project: '',
          analysisId: 'geo-789',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCloneGeoAnalysis({
          project: 'test',
          analysisId: 'geo-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareCloneGeoAnalysis({
          project: 'test',
          analysisId: 'geo-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('trims project and analysisId in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareCloneGeoAnalysis({
        project: '  test  ',
        analysisId: '  geo-789  ',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'test',
          analysisId: 'geo-789',
        }),
      );
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCloneGeoAnalysis({
        project: 'test',
        analysisId: 'geo-789',
        newName: maxName,
      });
      expect(result.preview).toEqual(expect.objectContaining({ newName: maxName }));
    });
  });

  describe('prepareArchiveGeoAnalysis', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareArchiveGeoAnalysis({
        project: 'test',
        analysisId: 'geo-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'geoanalyses.archive_geo_analysis',
          project: 'test',
          analysisId: 'geo-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareArchiveGeoAnalysis({
        project: 'test',
        analysisId: 'geo-900',
        operatorNote: 'Archive duplicate geo analysis',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Archive duplicate geo analysis',
        }),
      );
    });

    it('throws for empty analysisId', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareArchiveGeoAnalysis({
          project: 'test',
          analysisId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only analysisId', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareArchiveGeoAnalysis({
          project: 'test',
          analysisId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachGeoAnalysesService('test');
      expect(() =>
        service.prepareArchiveGeoAnalysis({
          project: '',
          analysisId: 'geo-900',
        }),
      ).toThrow('must not be empty');
    });

    it('trims project and analysisId in preview', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareArchiveGeoAnalysis({
        project: '  test  ',
        analysisId: '  geo-900  ',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'test',
          analysisId: 'geo-900',
        }),
      );
    });

    it('returns token and expiry metadata', () => {
      const service = new BloomreachGeoAnalysesService('test');
      const result = service.prepareArchiveGeoAnalysis({
        project: 'test',
        analysisId: 'geo-901',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});
