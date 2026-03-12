import { describe, it, expect } from 'vitest';
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

  it('accepts a valid date', () => {
    expect(validateDateFormat('2026-01-01')).toBe('2026-01-01');
  });

  it('accepts end-of-year date', () => {
    expect(validateDateFormat('2026-12-31')).toBe('2026-12-31');
  });

  it('throws for non-date string', () => {
    expect(() => validateDateFormat('not-a-date')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateDateFormat('')).toThrow('must be in YYYY-MM-DD format');
  });

  it('throws for partial date', () => {
    expect(() => validateDateFormat('2026-03')).toThrow(
      'must be in YYYY-MM-DD format',
    );
  });

  it('throws for date with time component', () => {
    expect(() => validateDateFormat('2026-03-15T10:00:00Z')).toThrow(
      'must be in YYYY-MM-DD format',
    );
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
    expect(() => validateCalendarCampaignType('banner')).toThrow(
      'Campaign type must be one of',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateCalendarCampaignType('')).toThrow(
      'Campaign type must be one of',
    );
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
    expect(() => validateCalendarCampaignStatus('')).toThrow(
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
    expect(() => validateCalendarChannel('telegram')).toThrow(
      'Channel must be one of',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateCalendarChannel('')).toThrow('Channel must be one of');
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
    expect(() => validateExportFormat('xml')).toThrow(
      'Export format must be one of',
    );
  });

  it('throws for empty string', () => {
    expect(() => validateExportFormat('')).toThrow(
      'Export format must be one of',
    );
  });
});

describe('buildCampaignCalendarUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildCampaignCalendarUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/campaigns/calendar',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildCampaignCalendarUrl('my project')).toBe(
      '/p/my%20project/campaigns/calendar',
    );
  });

  it('encodes slashes in project name', () => {
    expect(buildCampaignCalendarUrl('org/project')).toBe(
      '/p/org%2Fproject/campaigns/calendar',
    );
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

  it('executor throws "not yet implemented" on execute', async () => {
    const executors = createCampaignCalendarActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
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
      expect(service.calendarUrl).toBe(
        '/p/kingdom-of-joakim/campaigns/calendar',
      );
    });

    it('trims project name', () => {
      const service = new BloomreachCampaignCalendarService('  my-project  ');
      expect(service.calendarUrl).toBe('/p/my-project/campaigns/calendar');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachCampaignCalendarService('')).toThrow(
        'must not be empty',
      );
    });
  });

  describe('viewCampaignCalendar', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('throws not-yet-implemented with valid date range', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({
          project: 'test',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.viewCampaignCalendar({ project: '' }),
      ).rejects.toThrow('must not be empty');
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
  });

  describe('filterCampaignCalendar', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test' }),
      ).rejects.toThrow('not yet implemented');
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
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project when provided', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates campaign type filter', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', type: 'banner' }),
      ).rejects.toThrow('Campaign type must be one of');
    });

    it('validates status filter', async () => {
      const service = new BloomreachCampaignCalendarService('test');
      await expect(
        service.filterCampaignCalendar({ project: 'test', status: 'active' }),
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

      expect(result.preview).toEqual(
        expect.objectContaining({ type: 'email' }),
      );
    });

    it('includes status filter in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        status: 'scheduled',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ status: 'scheduled' }),
      );
    });

    it('includes channel filter in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        channel: 'sms',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ channel: 'sms' }),
      );
    });

    it('includes explicit export format in preview', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({
        project: 'test',
        format: 'csv',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ format: 'csv' }),
      );
    });

    it('defaults format to json when not specified', () => {
      const service = new BloomreachCampaignCalendarService('test');
      const result = service.prepareExportCalendar({ project: 'test' });

      expect(result.preview).toEqual(
        expect.objectContaining({ format: 'json' }),
      );
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

    it('throws for empty project', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({ project: '' }),
      ).toThrow('must not be empty');
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
      expect(() =>
        service.prepareExportCalendar({ project: 'test', type: 'banner' }),
      ).toThrow('Campaign type must be one of');
    });

    it('throws for invalid status', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({ project: 'test', status: 'active' }),
      ).toThrow('Campaign status must be one of');
    });

    it('throws for invalid channel', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({ project: 'test', channel: 'telegram' }),
      ).toThrow('Channel must be one of');
    });

    it('throws for invalid export format', () => {
      const service = new BloomreachCampaignCalendarService('test');
      expect(() =>
        service.prepareExportCalendar({ project: 'test', format: 'xml' }),
      ).toThrow('Export format must be one of');
    });
  });
});
