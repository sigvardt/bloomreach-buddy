import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EXPORT_CALENDAR_ACTION_TYPE,
  CAMPAIGN_CALENDAR_RATE_LIMIT_WINDOW_MS,
  CAMPAIGN_CALENDAR_EXPORT_RATE_LIMIT,
  CAMPAIGN_CALENDAR_CAMPAIGN_TYPES,
  CAMPAIGN_CALENDAR_STATUSES,
  CAMPAIGN_CALENDAR_CHANNELS,
  CAMPAIGN_CALENDAR_EXPORT_FORMATS,
  validateDateFormat,
  validateCalendarDateRange,
  validateCalendarCampaignType,
  validateCalendarCampaignStatus,
  validateCalendarChannel,
  validateExportFormat,
  buildCampaignCalendarUrl,
  createCampaignCalendarActionExecutors,
  BloomreachCampaignCalendarService,
} from '../index.js';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

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
  it('exports EXPORT_CALENDAR_ACTION_TYPE', () => {
    expect(EXPORT_CALENDAR_ACTION_TYPE).toBe('campaign_calendar.export');
  });
});

describe('rate limit constants', () => {
  it('exports CAMPAIGN_CALENDAR_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(CAMPAIGN_CALENDAR_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports CAMPAIGN_CALENDAR_EXPORT_RATE_LIMIT', () => {
    expect(CAMPAIGN_CALENDAR_EXPORT_RATE_LIMIT).toBe(10);
  });
});

describe('CAMPAIGN_CALENDAR_CAMPAIGN_TYPES', () => {
  it('contains 6 campaign types', () => {
    expect(CAMPAIGN_CALENDAR_CAMPAIGN_TYPES).toHaveLength(6);
  });

  it('contains expected types in order', () => {
    expect(CAMPAIGN_CALENDAR_CAMPAIGN_TYPES).toEqual([
      'email',
      'sms',
      'push',
      'in_app',
      'weblayer',
      'webhook',
    ]);
  });
});

describe('CAMPAIGN_CALENDAR_STATUSES', () => {
  it('contains 6 statuses', () => {
    expect(CAMPAIGN_CALENDAR_STATUSES).toHaveLength(6);
  });

  it('contains expected statuses in order', () => {
    expect(CAMPAIGN_CALENDAR_STATUSES).toEqual([
      'draft',
      'scheduled',
      'running',
      'paused',
      'stopped',
      'finished',
    ]);
  });
});

describe('CAMPAIGN_CALENDAR_CHANNELS', () => {
  it('contains 6 channels', () => {
    expect(CAMPAIGN_CALENDAR_CHANNELS).toHaveLength(6);
  });

  it('contains expected channels in order', () => {
    expect(CAMPAIGN_CALENDAR_CHANNELS).toEqual([
      'email',
      'sms',
      'push',
      'in_app',
      'weblayer',
      'webhook',
    ]);
  });
});

describe('CAMPAIGN_CALENDAR_EXPORT_FORMATS', () => {
  it('contains 2 export formats', () => {
    expect(CAMPAIGN_CALENDAR_EXPORT_FORMATS).toHaveLength(2);
  });

  it('contains expected formats in order', () => {
    expect(CAMPAIGN_CALENDAR_EXPORT_FORMATS).toEqual(['json', 'csv']);
  });
});

describe('validateDateFormat', () => {
  it('returns trimmed date for valid input', () => {
    expect(validateDateFormat('  2026-03-15  ')).toBe('2026-03-15');
  });

  it('returns trimmed date with tabs and newlines', () => {
    expect(validateDateFormat('\n\t2026-03-15\t\n')).toBe('2026-03-15');
  });

  it('accepts a valid date', () => {
    expect(validateDateFormat('2026-01-01')).toBe('2026-01-01');
  });

  it('accepts leap year date', () => {
    expect(validateDateFormat('2024-02-29')).toBe('2024-02-29');
  });

  it('accepts first day of leap year', () => {
    expect(validateDateFormat('2024-01-01')).toBe('2024-01-01');
  });

  it('accepts end-of-year date', () => {
    expect(validateDateFormat('2026-12-31')).toBe('2026-12-31');
  });

  it('accepts date with leading zero month and day', () => {
    expect(validateDateFormat('2026-03-05')).toBe('2026-03-05');
  });

  it('throws for non-date string', () => {
    expect(() => validateDateFormat('not-a-date')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for empty string', () => {
    expect(() => validateDateFormat('')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for partial date', () => {
    expect(() => validateDateFormat('2026-03')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for date with extra characters', () => {
    expect(() => validateDateFormat('2026-03-15!')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for date with slash separators', () => {
    expect(() => validateDateFormat('2026/03/15')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for date with missing leading zeros', () => {
    expect(() => validateDateFormat('2026-3-5')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for date with trailing space after trim mismatch', () => {
    expect(() => validateDateFormat('2026-03-15 x')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for date with time component', () => {
    expect(() => validateDateFormat('2026-03-15T10:00:00Z')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for date with newline in middle', () => {
    expect(() => validateDateFormat('2026-03-\n15')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for short year', () => {
    expect(() => validateDateFormat('26-03-15')).toThrow('must be in YYYY-MM-DD format');
  });
});

describe('validateCalendarDateRange', () => {
  it('returns valid date range', () => {
    expect(validateCalendarDateRange('2026-03-01', '2026-03-31')).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });
  });

  it('accepts same start and end date', () => {
    expect(validateCalendarDateRange('2026-03-15', '2026-03-15')).toEqual({
      startDate: '2026-03-15',
      endDate: '2026-03-15',
    });
  });

  it('accepts dates spanning a year boundary', () => {
    expect(validateCalendarDateRange('2025-12-31', '2026-01-01')).toEqual({
      startDate: '2025-12-31',
      endDate: '2026-01-01',
    });
  });

  it('accepts leap-day range in leap year', () => {
    expect(validateCalendarDateRange('2024-02-29', '2024-03-01')).toEqual({
      startDate: '2024-02-29',
      endDate: '2024-03-01',
    });
  });

  it('accepts trimmed dates in range', () => {
    expect(validateCalendarDateRange(' 2026-01-01 ', ' 2026-01-31 ')).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('throws when start date is after end date', () => {
    expect(() => validateCalendarDateRange('2026-04-01', '2026-03-01')).toThrow(
      'Start date must not be after end date',
    );
  });

  it('throws for invalid start date format', () => {
    expect(() => validateCalendarDateRange('invalid', '2026-03-31')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for invalid end date format', () => {
    expect(() => validateCalendarDateRange('2026-03-01', 'invalid')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for end date with extra characters', () => {
    expect(() => validateCalendarDateRange('2026-03-01', '2026-03-31!')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for start date with incorrect separator', () => {
    expect(() => validateCalendarDateRange('2026/03/01', '2026-03-31')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });
});

describe('validateCalendarCampaignType', () => {
  it('accepts email', () => {
    expect(validateCalendarCampaignType('email')).toBe('email');
  });

  it('accepts sms', () => {
    expect(validateCalendarCampaignType('sms')).toBe('sms');
  });

  it('accepts push', () => {
    expect(validateCalendarCampaignType('push')).toBe('push');
  });

  it('accepts in_app', () => {
    expect(validateCalendarCampaignType('in_app')).toBe('in_app');
  });

  it('accepts weblayer', () => {
    expect(validateCalendarCampaignType('weblayer')).toBe('weblayer');
  });

  it('accepts webhook', () => {
    expect(validateCalendarCampaignType('webhook')).toBe('webhook');
  });

  it('throws for unknown type', () => {
    expect(() => validateCalendarCampaignType('banner')).toThrow('Campaign type must be one of');
  });

  it('throws for empty string', () => {
    expect(() => validateCalendarCampaignType('')).toThrow('Campaign type must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateCalendarCampaignType('Email')).toThrow('Campaign type must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateCalendarCampaignType('email ')).toThrow('Campaign type must be one of');
  });

  it('throws for value with leading space', () => {
    expect(() => validateCalendarCampaignType(' email')).toThrow('Campaign type must be one of');
  });

  it('throws for special character variant', () => {
    expect(() => validateCalendarCampaignType('e-mail')).toThrow('Campaign type must be one of');
  });
});

describe('validateCalendarCampaignStatus', () => {
  it('accepts draft', () => {
    expect(validateCalendarCampaignStatus('draft')).toBe('draft');
  });

  it('accepts scheduled', () => {
    expect(validateCalendarCampaignStatus('scheduled')).toBe('scheduled');
  });

  it('accepts running', () => {
    expect(validateCalendarCampaignStatus('running')).toBe('running');
  });

  it('accepts paused', () => {
    expect(validateCalendarCampaignStatus('paused')).toBe('paused');
  });

  it('accepts stopped', () => {
    expect(validateCalendarCampaignStatus('stopped')).toBe('stopped');
  });

  it('accepts finished', () => {
    expect(validateCalendarCampaignStatus('finished')).toBe('finished');
  });

  it('throws for unknown status', () => {
    expect(() => validateCalendarCampaignStatus('active')).toThrow(
      'Campaign status must be one of',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateCalendarCampaignStatus('')).toThrow('Campaign status must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateCalendarCampaignStatus('Scheduled')).toThrow(
      'Campaign status must be one of',
    );
  });

  it('throws for value with trailing space', () => {
    expect(() => validateCalendarCampaignStatus('running ')).toThrow(
      'Campaign status must be one of',
    );
  });

  it('throws for value with leading space', () => {
    expect(() => validateCalendarCampaignStatus(' running')).toThrow(
      'Campaign status must be one of',
    );
  });

  it('throws for special character variant', () => {
    expect(() => validateCalendarCampaignStatus('run-ning')).toThrow(
      'Campaign status must be one of',
    );
  });
});

describe('validateCalendarChannel', () => {
  it('accepts email', () => {
    expect(validateCalendarChannel('email')).toBe('email');
  });

  it('accepts sms', () => {
    expect(validateCalendarChannel('sms')).toBe('sms');
  });

  it('accepts push', () => {
    expect(validateCalendarChannel('push')).toBe('push');
  });

  it('accepts in_app', () => {
    expect(validateCalendarChannel('in_app')).toBe('in_app');
  });

  it('accepts weblayer', () => {
    expect(validateCalendarChannel('weblayer')).toBe('weblayer');
  });

  it('accepts webhook', () => {
    expect(validateCalendarChannel('webhook')).toBe('webhook');
  });

  it('throws for unknown channel', () => {
    expect(() => validateCalendarChannel('telegram')).toThrow('Channel must be one of');
  });

  it('throws for empty string', () => {
    expect(() => validateCalendarChannel('')).toThrow('Channel must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateCalendarChannel('Email')).toThrow('Channel must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateCalendarChannel('email ')).toThrow('Channel must be one of');
  });

  it('throws for value with leading space', () => {
    expect(() => validateCalendarChannel(' email')).toThrow('Channel must be one of');
  });

  it('throws for special character variant', () => {
    expect(() => validateCalendarChannel('in-app')).toThrow('Channel must be one of');
  });
});

describe('validateExportFormat', () => {
  it('accepts json', () => {
    expect(validateExportFormat('json')).toBe('json');
  });

  it('accepts csv', () => {
    expect(validateExportFormat('csv')).toBe('csv');
  });

  it('throws for unknown format', () => {
    expect(() => validateExportFormat('xml')).toThrow('Export format must be one of');
  });

  it('throws for empty string', () => {
    expect(() => validateExportFormat('')).toThrow('Export format must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateExportFormat('Csv')).toThrow('Export format must be one of');
  });

  it('throws for value with trailing space', () => {
    expect(() => validateExportFormat('csv ')).toThrow('Export format must be one of');
  });

  it('throws for value with leading space', () => {
    expect(() => validateExportFormat(' csv')).toThrow('Export format must be one of');
  });

  it('throws for special-character variant', () => {
    expect(() => validateExportFormat('c-s-v')).toThrow('Export format must be one of');
  });
});

describe('buildCampaignCalendarUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildCampaignCalendarUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/campaigns/calendar',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildCampaignCalendarUrl('my project')).toBe('/p/my%20project/campaigns/calendar');
  });

  it('encodes slashes in project name', () => {
    expect(buildCampaignCalendarUrl('org/project')).toBe('/p/org%2Fproject/campaigns/calendar');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildCampaignCalendarUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/calendar',
    );
  });

  it('encodes hash character in project name', () => {
    expect(buildCampaignCalendarUrl('my#project')).toBe('/p/my%23project/campaigns/calendar');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildCampaignCalendarUrl('team-alpha')).toBe('/p/team-alpha/campaigns/calendar');
  });
});

describe('createCampaignCalendarActionExecutors', () => {
  it('returns executor for the export action type', () => {
    const executors = createCampaignCalendarActionExecutors();
    expect(Object.keys(executors)).toHaveLength(1);
    expect(executors[EXPORT_CALENDAR_ACTION_TYPE]).toBeDefined();
  });

  it('executor has an actionType property matching its key', () => {
    const executors = createCampaignCalendarActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('export executor throws not-yet-implemented on execute', async () => {
    const executors = createCampaignCalendarActionExecutors();
    await expect(executors[EXPORT_CALENDAR_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createCampaignCalendarActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(1);
  });

  it('executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createCampaignCalendarActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('executor actionType stays stable with apiConfig', () => {
    const executors = createCampaignCalendarActionExecutors(TEST_API_CONFIG);
    expect(executors[EXPORT_CALENDAR_ACTION_TYPE].actionType).toBe(EXPORT_CALENDAR_ACTION_TYPE);
  });

  it('executor map key count stays one without apiConfig', () => {
    const executors = createCampaignCalendarActionExecutors();
    expect(Object.keys(executors)).toEqual([EXPORT_CALENDAR_ACTION_TYPE]);
  });
});

describe('BloomreachCampaignCalendarService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachCampaignCalendarService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachCampaignCalendarService);
    });

    it('exposes the calendar URL', () => {
      const service = new BloomreachCampaignCalendarService('kingdom-of-joakim');
      expect(service.calendarUrl).toBe('/p/kingdom-of-joakim/campaigns/calendar');
    });

    it('trims project name', () => {
      const service = new BloomreachCampaignCalendarService('  my-project  ');
      expect(service.calendarUrl).toBe('/p/my-project/campaigns/calendar');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachCampaignCalendarService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachCampaignCalendarService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachCampaignCalendarService('org/project');
      expect(service.calendarUrl).toBe('/p/org%2Fproject/campaigns/calendar');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachCampaignCalendarService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachCampaignCalendarService);
    });

    it('exposes calendar URL when constructed with apiConfig', () => {
      const service = new BloomreachCampaignCalendarService('test', TEST_API_CONFIG);
      expect(service.calendarUrl).toBe('/p/test/campaigns/calendar');
    });

    it('encodes unicode in constructor project URL', () => {
      const service = new BloomreachCampaignCalendarService('projekt åäö');
      expect(service.calendarUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/calendar');
    });

    it('encodes hash in constructor project URL', () => {
      const service = new BloomreachCampaignCalendarService('my#project');
      expect(service.calendarUrl).toBe('/p/my%23project/campaigns/calendar');
    });
  });

  describe('viewCampaignCalendar', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.viewCampaignCalendar({ project: 'test' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws not-yet-implemented with valid date range', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachCampaignCalendarService('test', TEST_API_CONFIG);
      await expect(service.viewCampaignCalendar({ project: 'test' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws no-API-endpoint error for trimmed project', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.viewCampaignCalendar({ project: '  test  ' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws no-API-endpoint error with startDate only', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error with endDate only', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          endDate: '2026-03-31',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('validates project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.viewCampaignCalendar({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.viewCampaignCalendar({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates start date format', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: 'invalid',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates end date format', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          endDate: 'invalid',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates start date format with extra characters', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01!',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates end date format with slash separators', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          endDate: '2026/03/31',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates date range order', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2026-04-01',
          endDate: '2026-03-01',
        }),
      ).rejects.toThrow('Start date must not be after end date');
    });

    it('accepts leap-year date range and reaches no-endpoint error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2024-02-29',
          endDate: '2024-03-01',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('accepts year-boundary date range and reaches no-endpoint error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2025-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('filterCampaignCalendar', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.filterCampaignCalendar({ project: 'test' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws not-yet-implemented with all filters', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          type: 'email',
          status: 'scheduled',
          channel: 'email',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachCampaignCalendarService('test', TEST_API_CONFIG);
      await expect(service.filterCampaignCalendar({ project: 'test' })).rejects.toThrow(
        'does not provide',
      );
    });

    it('throws no-API-endpoint error with type only', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          type: 'email',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error with status only', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          status: 'scheduled',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error with channel only', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          channel: 'sms',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error with year-boundary dates', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          startDate: '2025-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('validates project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.filterCampaignCalendar({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(service.filterCampaignCalendar({ project: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates campaign type filter', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', type: 'banner' }),
      ).rejects.toThrow('Campaign type must be one of');
    });

    it('validates campaign type casing', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', type: 'Email' }),
      ).rejects.toThrow('Campaign type must be one of');
    });

    it('validates campaign type trailing whitespace', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', type: 'email ' }),
      ).rejects.toThrow('Campaign type must be one of');
    });

    it('validates status filter', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', status: 'active' }),
      ).rejects.toThrow('Campaign status must be one of');
    });

    it('validates status casing', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', status: 'Running' }),
      ).rejects.toThrow('Campaign status must be one of');
    });

    it('validates status trailing whitespace', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', status: 'running ' }),
      ).rejects.toThrow('Campaign status must be one of');
    });

    it('validates channel filter', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          channel: 'telegram',
        }),
      ).rejects.toThrow('Channel must be one of');
    });

    it('validates channel casing', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          channel: 'Email',
        }),
      ).rejects.toThrow('Channel must be one of');
    });

    it('validates channel trailing whitespace', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          channel: 'email ',
        }),
      ).rejects.toThrow('Channel must be one of');
    });

    it('validates start date format with extra characters', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01!',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates end date format with slash separators', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          endDate: '2026/03/31',
        }),
      ).rejects.toThrow('must be in YYYY-MM-DD format');
    });

    it('validates date range order', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          startDate: '2026-04-01',
          endDate: '2026-03-01',
        }),
      ).rejects.toThrow('Start date must not be after end date');
    });

    it('accepts leap-year range with valid filters and reaches no-endpoint error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({
          project: 'test',
          startDate: '2024-02-29',
          endDate: '2024-03-01',
          type: 'push',
          status: 'running',
          channel: 'push',
        }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('prepareExportCalendar', () => {
    it('returns a prepared action with minimal input', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({ project: 'test' });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_calendar.export',
          project: 'test',
          format: 'json',
        }),
      );
    });

    it('includes date range in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        }),
      );
    });

    it('includes type filter in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        type: 'email',
      });

      expect(result.preview).toEqual(expect.objectContaining({ type: 'email' }));
    });

    it('includes status filter in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'scheduled',
      });

      expect(result.preview).toEqual(expect.objectContaining({ status: 'scheduled' }));
    });

    it('includes channel filter in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'sms',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'sms' }));
    });

    it('includes explicit export format in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        format: 'csv',
      });

      expect(result.preview).toEqual(expect.objectContaining({ format: 'csv' }));
    });

    it('defaults format to json when not specified', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({ project: 'test' });

      expect(result.preview).toEqual(expect.objectContaining({ format: 'json' }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        operatorNote: 'Monthly export for review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Monthly export for review' }),
      );
    });

    it('includes all filters in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        type: 'push',
        status: 'running',
        channel: 'push',
        format: 'csv',
        operatorNote: 'Full export',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_calendar.export',
          project: 'test',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          type: 'push',
          status: 'running',
          channel: 'push',
          format: 'csv',
          operatorNote: 'Full export',
        }),
      );
    });

    it('validates single start date without end date', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2026-03-01',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'test',
          startDate: '2026-03-01',
          endDate: undefined,
        }),
      );
    });

    it('validates single end date without start date', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        endDate: '2026-03-31',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'test',
          startDate: undefined,
          endDate: '2026-03-31',
        }),
      );
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachCampaignCalendarService('test', TEST_API_CONFIG);
      const result = service.prepareExportCalendar({
        project: 'test',
        format: 'csv',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_calendar.export',
          project: 'test',
          format: 'csv',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: '  my-project  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('keeps slash-containing project after trim', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: '  org/project  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'org/project',
        }),
      );
    });

    it('includes email type and scheduled status combination in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        type: 'email',
        status: 'scheduled',
        channel: 'email',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          type: 'email',
          status: 'scheduled',
          channel: 'email',
        }),
      );
    });

    it('includes sms channel in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'sms',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'sms' }));
    });

    it('includes push channel in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'push',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'push' }));
    });

    it('includes in_app channel in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'in_app',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'in_app' }));
    });

    it('includes weblayer channel in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'weblayer',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'weblayer' }));
    });

    it('includes webhook channel in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'webhook',
      });

      expect(result.preview).toEqual(expect.objectContaining({ channel: 'webhook' }));
    });

    it('includes draft status in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'draft',
      });

      expect(result.preview).toEqual(expect.objectContaining({ status: 'draft' }));
    });

    it('includes paused status in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'paused',
      });

      expect(result.preview).toEqual(expect.objectContaining({ status: 'paused' }));
    });

    it('includes stopped status in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'stopped',
      });

      expect(result.preview).toEqual(expect.objectContaining({ status: 'stopped' }));
    });

    it('includes finished status in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'finished',
      });

      expect(result.preview).toEqual(expect.objectContaining({ status: 'finished' }));
    });

    it('includes all campaign types in preview when valid', () => {
      const service = new BloomreachCampaignCalendarService('test');

      const emailResult = service.prepareExportCalendar({ project: 'test', type: 'email' });
      const smsResult = service.prepareExportCalendar({ project: 'test', type: 'sms' });
      const pushResult = service.prepareExportCalendar({ project: 'test', type: 'push' });
      const inAppResult = service.prepareExportCalendar({ project: 'test', type: 'in_app' });
      const weblayerResult = service.prepareExportCalendar({ project: 'test', type: 'weblayer' });
      const webhookResult = service.prepareExportCalendar({ project: 'test', type: 'webhook' });

      expect(emailResult.preview).toEqual(expect.objectContaining({ type: 'email' }));
      expect(smsResult.preview).toEqual(expect.objectContaining({ type: 'sms' }));
      expect(pushResult.preview).toEqual(expect.objectContaining({ type: 'push' }));
      expect(inAppResult.preview).toEqual(expect.objectContaining({ type: 'in_app' }));
      expect(weblayerResult.preview).toEqual(expect.objectContaining({ type: 'weblayer' }));
      expect(webhookResult.preview).toEqual(expect.objectContaining({ type: 'webhook' }));
    });

    it('uses csv format exactly when provided', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        format: 'csv',
      });

      expect(result.preview).toEqual(expect.objectContaining({ format: 'csv' }));
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        operatorNote: '',
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareExportCalendar({
        project: 'test',
        operatorNote: note,
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_000);
      nowSpy.mockReturnValueOnce(1_700_000_000_001);
      nowSpy.mockReturnValueOnce(1_700_000_000_002);
      nowSpy.mockReturnValueOnce(1_700_000_000_003);
      nowSpy.mockReturnValueOnce(1_700_000_000_004);
      nowSpy.mockReturnValueOnce(1_700_000_000_005);

      const first = service.prepareExportCalendar({ project: 'test' });
      const second = service.prepareExportCalendar({ project: 'test' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_000_100);
      nowSpy.mockReturnValueOnce(1_700_000_000_101);
      nowSpy.mockReturnValueOnce(1_700_000_000_102);
      nowSpy.mockReturnValueOnce(1_700_000_000_103);
      nowSpy.mockReturnValueOnce(1_700_000_000_104);
      nowSpy.mockReturnValueOnce(1_700_000_000_105);

      const first = service.prepareExportCalendar({ project: 'test' });
      const second = service.prepareExportCalendar({ project: 'test' });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('validates start date format', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          startDate: 'invalid',
        }),
      ).toThrow('must be in YYYY-MM-DD format');
    });

    it('validates end date format', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          endDate: 'invalid',
        }),
      ).toThrow('must be in YYYY-MM-DD format');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: '   ' })).toThrow('must not be empty');
    });

    it('throws for invalid start date extra characters', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          startDate: '2026-03-01!',
        }),
      ).toThrow('must be in YYYY-MM-DD format');
    });

    it('throws for invalid end date slash separators', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          endDate: '2026/03/31',
        }),
      ).toThrow('must be in YYYY-MM-DD format');
    });

    it('throws for invalid campaign type casing', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', type: 'Email' })).toThrow(
        'Campaign type must be one of',
      );
    });

    it('throws for invalid campaign type trailing whitespace', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', type: 'email ' })).toThrow(
        'Campaign type must be one of',
      );
    });

    it('throws for invalid campaign type special character variant', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', type: 'e-mail' })).toThrow(
        'Campaign type must be one of',
      );
    });

    it('throws for invalid status casing', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', status: 'Running' })).toThrow(
        'Campaign status must be one of',
      );
    });

    it('throws for invalid status trailing whitespace', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', status: 'running ' })).toThrow(
        'Campaign status must be one of',
      );
    });

    it('throws for invalid status special character variant', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', status: 'run-ning' })).toThrow(
        'Campaign status must be one of',
      );
    });

    it('throws for invalid channel casing', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', channel: 'Email' })).toThrow(
        'Channel must be one of',
      );
    });

    it('throws for invalid channel trailing whitespace', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', channel: 'email ' })).toThrow(
        'Channel must be one of',
      );
    });

    it('throws for invalid channel special character variant', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', channel: 'in-app' })).toThrow(
        'Channel must be one of',
      );
    });

    it('throws for invalid export format casing', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', format: 'Csv' })).toThrow(
        'Export format must be one of',
      );
    });

    it('throws for invalid export format trailing whitespace', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', format: 'csv ' })).toThrow(
        'Export format must be one of',
      );
    });

    it('throws for invalid export format special-character variant', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', format: 'c-s-v' })).toThrow(
        'Export format must be one of',
      );
    });

    it('accepts leap-year date range and prepares action', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2024-02-29',
        endDate: '2024-03-01',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          startDate: '2024-02-29',
          endDate: '2024-03-01',
        }),
      );
    });

    it('accepts year-boundary date range and prepares action', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2025-12-31',
        endDate: '2026-01-01',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          startDate: '2025-12-31',
          endDate: '2026-01-01',
        }),
      );
    });

    it('throws for end date earlier than start date by one day', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          startDate: '2026-03-02',
          endDate: '2026-03-01',
        }),
      ).toThrow('Start date must not be after end date');
    });

    it('throws for both invalid date format and valid format pair by validating first bad field', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          startDate: 'invalid',
          endDate: '2026-03-01',
        }),
      ).toThrow('must be in YYYY-MM-DD format');
    });

    it('allows operatorNote together with all valid filters', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        type: 'email',
        status: 'scheduled',
        channel: 'email',
        format: 'json',
        operatorNote: 'January export run',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'campaign_calendar.export',
          project: 'test',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          type: 'email',
          status: 'scheduled',
          channel: 'email',
          format: 'json',
          operatorNote: 'January export run',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: '' })).toThrow('must not be empty');
    });

    it('throws for invalid date range', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({
          project: 'test',
          startDate: '2026-04-01',
          endDate: '2026-03-01',
        }),
      ).toThrow('Start date must not be after end date');
    });

    it('throws for invalid campaign type', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', type: 'banner' })).toThrow(
        'Campaign type must be one of',
      );
    });

    it('throws for invalid status', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', status: 'active' })).toThrow(
        'Campaign status must be one of',
      );
    });

    it('throws for invalid channel', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', channel: 'telegram' })).toThrow(
        'Channel must be one of',
      );
    });

    it('throws for invalid export format', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() => service.prepareExportCalendar({ project: 'test', format: 'xml' })).toThrow(
        'Export format must be one of',
      );
    });
  });
});
