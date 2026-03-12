import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_DASHBOARD_TYPES,
  CHANNEL_TYPES,
  validateDateRange,
  validateChannel,
  buildProjectPerformanceUrl,
  buildChannelPerformanceUrl,
  buildBloomreachUsageUrl,
  buildProjectOverviewUrl,
  buildProjectHealthUrl,
  BloomreachPerformanceService,
} from '../index.js';

describe('PERFORMANCE_DASHBOARD_TYPES', () => {
  it('contains exactly 5 dashboard types', () => {
    expect(PERFORMANCE_DASHBOARD_TYPES).toHaveLength(5);
  });

  it('lists all expected types', () => {
    expect(PERFORMANCE_DASHBOARD_TYPES).toEqual([
      'project_performance',
      'channel_performance',
      'bloomreach_usage',
      'project_overview',
      'project_health',
    ]);
  });
});

describe('CHANNEL_TYPES', () => {
  it('contains exactly 6 channel types', () => {
    expect(CHANNEL_TYPES).toHaveLength(6);
  });

  it('lists all expected types', () => {
    expect(CHANNEL_TYPES).toEqual([
      'email',
      'sms',
      'push',
      'whatsapp',
      'weblayer',
      'in_app_message',
    ]);
  });
});

describe('validateDateRange', () => {
  it('returns undefined when no filter is provided', () => {
    expect(validateDateRange(undefined)).toBeUndefined();
  });

  it('passes through a valid date range', () => {
    const range = { startDate: '2025-01-01', endDate: '2025-03-31' };
    expect(validateDateRange(range)).toEqual(range);
  });

  it('accepts a filter with only startDate', () => {
    const range = { startDate: '2025-06-15' };
    expect(validateDateRange(range)).toEqual(range);
  });

  it('accepts a filter with only endDate', () => {
    const range = { endDate: '2025-12-31' };
    expect(validateDateRange(range)).toEqual(range);
  });

  it('accepts same start and end date', () => {
    const range = { startDate: '2025-03-01', endDate: '2025-03-01' };
    expect(validateDateRange(range)).toEqual(range);
  });

  it('accepts an empty object', () => {
    expect(validateDateRange({})).toEqual({});
  });

  it('throws for startDate with wrong format', () => {
    expect(() => validateDateRange({ startDate: '01-01-2025' })).toThrow(
      'startDate must be a valid ISO-8601 date',
    );
  });

  it('throws for endDate with wrong format', () => {
    expect(() => validateDateRange({ endDate: 'March 31' })).toThrow(
      'endDate must be a valid ISO-8601 date',
    );
  });

  it('throws for startDate that is not a real date', () => {
    expect(() => validateDateRange({ startDate: '2025-13-45' })).toThrow(
      'startDate',
    );
  });

  it('throws for endDate that is not a real date', () => {
    expect(() => validateDateRange({ endDate: '2025-02-30' })).toThrow(
      'endDate',
    );
  });

  it('throws when startDate is after endDate', () => {
    expect(() =>
      validateDateRange({ startDate: '2025-06-01', endDate: '2025-01-01' }),
    ).toThrow('must not be after');
  });
});

describe('validateChannel', () => {
  it.each([
    'email',
    'sms',
    'push',
    'whatsapp',
    'weblayer',
    'in_app_message',
  ] as const)('accepts "%s"', (channel) => {
    expect(validateChannel(channel)).toBe(channel);
  });

  it('throws for an unknown channel', () => {
    expect(() => validateChannel('carrier_pigeon')).toThrow(
      'channel must be one of',
    );
  });

  it('throws for an empty string', () => {
    expect(() => validateChannel('')).toThrow('channel must be one of');
  });
});

describe('buildProjectPerformanceUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildProjectPerformanceUrl('my-project')).toBe(
      '/p/my-project/overview/performance-dashboards/project',
    );
  });

  it('encodes special characters in project name', () => {
    expect(buildProjectPerformanceUrl('my project')).toBe(
      '/p/my%20project/overview/performance-dashboards/project',
    );
  });

  it('encodes slashes in project name', () => {
    expect(buildProjectPerformanceUrl('org/proj')).toBe(
      '/p/org%2Fproj/overview/performance-dashboards/project',
    );
  });
});

describe('buildChannelPerformanceUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildChannelPerformanceUrl('my-project')).toBe(
      '/p/my-project/overview/performance-dashboards/channel',
    );
  });

  it('encodes special characters', () => {
    expect(buildChannelPerformanceUrl('a b')).toBe(
      '/p/a%20b/overview/performance-dashboards/channel',
    );
  });
});

describe('buildBloomreachUsageUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildBloomreachUsageUrl('my-project')).toBe(
      '/p/my-project/overview/pricing-dashboard-v2',
    );
  });

  it('encodes special characters', () => {
    expect(buildBloomreachUsageUrl('a/b')).toBe(
      '/p/a%2Fb/overview/pricing-dashboard-v2',
    );
  });
});

describe('buildProjectOverviewUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildProjectOverviewUrl('my-project')).toBe(
      '/p/my-project/overview/project',
    );
  });

  it('encodes special characters', () => {
    expect(buildProjectOverviewUrl('x y')).toBe(
      '/p/x%20y/overview/project',
    );
  });
});

describe('buildProjectHealthUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildProjectHealthUrl('my-project')).toBe(
      '/p/my-project/overview/health-dashboard',
    );
  });

  it('encodes special characters', () => {
    expect(buildProjectHealthUrl('a&b')).toBe(
      '/p/a%26b/overview/health-dashboard',
    );
  });
});

describe('BloomreachPerformanceService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachPerformanceService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachPerformanceService);
    });

    it('trims project name', () => {
      const service = new BloomreachPerformanceService('  my-project  ');
      expect(service.projectPerformanceUrl).toBe(
        '/p/my-project/overview/performance-dashboards/project',
      );
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachPerformanceService('')).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachPerformanceService('   ')).toThrow(
        'must not be empty',
      );
    });
  });

  describe('URL getters', () => {
    const service = new BloomreachPerformanceService('test-proj');

    it('exposes projectPerformanceUrl', () => {
      expect(service.projectPerformanceUrl).toBe(
        '/p/test-proj/overview/performance-dashboards/project',
      );
    });

    it('exposes channelPerformanceUrl', () => {
      expect(service.channelPerformanceUrl).toBe(
        '/p/test-proj/overview/performance-dashboards/channel',
      );
    });

    it('exposes usageUrl', () => {
      expect(service.usageUrl).toBe(
        '/p/test-proj/overview/pricing-dashboard-v2',
      );
    });

    it('exposes overviewUrl', () => {
      expect(service.overviewUrl).toBe('/p/test-proj/overview/project');
    });

    it('exposes healthUrl', () => {
      expect(service.healthUrl).toBe(
        '/p/test-proj/overview/health-dashboard',
      );
    });
  });

  describe('viewProjectPerformance', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectPerformance({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectPerformance({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates dateRange before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectPerformance({
          project: 'test',
          dateRange: { startDate: 'bad' },
        }),
      ).rejects.toThrow('startDate must be a valid ISO-8601 date');
    });
  });

  describe('viewChannelPerformance', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewChannelPerformance({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewChannelPerformance({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates dateRange before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewChannelPerformance({
          project: 'test',
          dateRange: { endDate: 'nope' },
        }),
      ).rejects.toThrow('endDate must be a valid ISO-8601 date');
    });

    it('validates channel before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewChannelPerformance({
          project: 'test',
          channel: 'telegraph',
        }),
      ).rejects.toThrow('channel must be one of');
    });
  });

  describe('viewBloomreachUsage', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewBloomreachUsage({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewBloomreachUsage({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewProjectOverview', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectOverview({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectOverview({ project: '   ' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewProjectHealth', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectHealth({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project before throwing', async () => {
      const service = new BloomreachPerformanceService('test');
      await expect(
        service.viewProjectHealth({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });
  });
});
