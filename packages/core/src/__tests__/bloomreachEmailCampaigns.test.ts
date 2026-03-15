import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CREATE_EMAIL_CAMPAIGN_ACTION_TYPE,
  SEND_EMAIL_CAMPAIGN_ACTION_TYPE,
  SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE,
  CLONE_EMAIL_CAMPAIGN_ACTION_TYPE,
  ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE,
  EMAIL_CAMPAIGN_RATE_LIMIT_WINDOW_MS,
  EMAIL_CAMPAIGN_CREATE_RATE_LIMIT,
  EMAIL_CAMPAIGN_MODIFY_RATE_LIMIT,
  EMAIL_CAMPAIGN_STATUSES,
  SEND_SCHEDULE_TYPES,
  EMAIL_TEMPLATE_TYPES,
  validateCampaignName,
  validateSubjectLine,
  validateEmailCampaignStatus,
  validateTemplateType,
  validateScheduleType,
  validateABTestConfig,
  validateCampaignId,
  validateSchedule,
  validateEmailIntegrationId,
  validateEmailAddress,
  validateTransactionalEmailContent,
  buildEmailCampaignsUrl,
  createEmailCampaignActionExecutors,
  BloomreachEmailCampaignsService,
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
  it('exports CREATE_EMAIL_CAMPAIGN_ACTION_TYPE', () => {
    expect(CREATE_EMAIL_CAMPAIGN_ACTION_TYPE).toBe('email_campaigns.create_campaign');
  });

  it('exports SEND_EMAIL_CAMPAIGN_ACTION_TYPE', () => {
    expect(SEND_EMAIL_CAMPAIGN_ACTION_TYPE).toBe('email_campaigns.send_campaign');
  });

  it('exports CLONE_EMAIL_CAMPAIGN_ACTION_TYPE', () => {
    expect(CLONE_EMAIL_CAMPAIGN_ACTION_TYPE).toBe('email_campaigns.clone_campaign');
  });

  it('exports ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE', () => {
    expect(ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE).toBe('email_campaigns.archive_campaign');
  });
});

describe('rate limit constants', () => {
  it('exports EMAIL_CAMPAIGN_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(EMAIL_CAMPAIGN_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports EMAIL_CAMPAIGN_CREATE_RATE_LIMIT', () => {
    expect(EMAIL_CAMPAIGN_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports EMAIL_CAMPAIGN_MODIFY_RATE_LIMIT', () => {
    expect(EMAIL_CAMPAIGN_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('EMAIL_CAMPAIGN_STATUSES', () => {
  it('contains 6 statuses', () => {
    expect(EMAIL_CAMPAIGN_STATUSES).toHaveLength(6);
  });

  it('contains draft at index 0', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[0]).toBe('draft');
  });

  it('contains scheduled at index 1', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[1]).toBe('scheduled');
  });

  it('contains sending at index 2', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[2]).toBe('sending');
  });

  it('contains sent at index 3', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[3]).toBe('sent');
  });

  it('contains paused at index 4', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[4]).toBe('paused');
  });

  it('contains archived at index 5', () => {
    expect(EMAIL_CAMPAIGN_STATUSES[5]).toBe('archived');
  });

  it('contains expected statuses in order', () => {
    expect(EMAIL_CAMPAIGN_STATUSES).toEqual([
      'draft',
      'scheduled',
      'sending',
      'sent',
      'paused',
      'archived',
    ]);
  });
});

describe('SEND_SCHEDULE_TYPES', () => {
  it('contains 3 schedule types', () => {
    expect(SEND_SCHEDULE_TYPES).toHaveLength(3);
  });

  it('contains immediate at index 0', () => {
    expect(SEND_SCHEDULE_TYPES[0]).toBe('immediate');
  });

  it('contains scheduled at index 1', () => {
    expect(SEND_SCHEDULE_TYPES[1]).toBe('scheduled');
  });

  it('contains recurring at index 2', () => {
    expect(SEND_SCHEDULE_TYPES[2]).toBe('recurring');
  });

  it('contains expected types in order', () => {
    expect(SEND_SCHEDULE_TYPES).toEqual(['immediate', 'scheduled', 'recurring']);
  });
});

describe('EMAIL_TEMPLATE_TYPES', () => {
  it('contains 2 template types', () => {
    expect(EMAIL_TEMPLATE_TYPES).toHaveLength(2);
  });

  it('contains visual at index 0', () => {
    expect(EMAIL_TEMPLATE_TYPES[0]).toBe('visual');
  });

  it('contains html at index 1', () => {
    expect(EMAIL_TEMPLATE_TYPES[1]).toBe('html');
  });

  it('contains expected types in order', () => {
    expect(EMAIL_TEMPLATE_TYPES).toEqual(['visual', 'html']);
  });
});

describe('validateCampaignName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateCampaignName('  My Campaign  ')).toBe('My Campaign');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateCampaignName('\n\tCampaign Name\t\n')).toBe('Campaign Name');
  });

  it('accepts single-character name', () => {
    expect(validateCampaignName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateCampaignName('12345')).toBe('12345');
  });

  it('accepts punctuation input', () => {
    expect(validateCampaignName('Campaign: Weekly v2')).toBe('Campaign: Weekly v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateCampaignName(name)).toBe(name);
  });

  it('accepts mixed whitespace around valid input', () => {
    expect(validateCampaignName(' \t  Weekly Newsletter \n ')).toBe('Weekly Newsletter');
  });

  it('throws for empty string', () => {
    expect(() => validateCampaignName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCampaignName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateCampaignName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateCampaignName('\n\n')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateCampaignName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateSubjectLine', () => {
  it('returns trimmed subject line for valid input', () => {
    expect(validateSubjectLine('  Hello World  ')).toBe('Hello World');
  });

  it('returns trimmed subject line with tabs and newlines', () => {
    expect(validateSubjectLine('\n\tHello from Weekly Campaign\t\n')).toBe(
      'Hello from Weekly Campaign',
    );
  });

  it('accepts single-character subject line', () => {
    expect(validateSubjectLine('A')).toBe('A');
  });

  it('accepts numeric subject line', () => {
    expect(validateSubjectLine('2026')).toBe('2026');
  });

  it('accepts punctuation subject line', () => {
    expect(validateSubjectLine('Campaign: Weekly v2')).toBe('Campaign: Weekly v2');
  });

  it('accepts subject line at maximum length', () => {
    const subject = 'x'.repeat(998);
    expect(validateSubjectLine(subject)).toBe(subject);
  });

  it('accepts mixed whitespace around valid subject line', () => {
    expect(validateSubjectLine(' \t Weekly launch update \n ')).toBe('Weekly launch update');
  });

  it('throws for empty string', () => {
    expect(() => validateSubjectLine('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSubjectLine('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateSubjectLine('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateSubjectLine('\n\n')).toThrow('must not be empty');
  });

  it('throws for subject line exceeding maximum length', () => {
    const subject = 'x'.repeat(999);
    expect(() => validateSubjectLine(subject)).toThrow('must not exceed 998 characters');
  });
});

describe('validateEmailCampaignStatus', () => {
  it('accepts draft', () => {
    expect(validateEmailCampaignStatus('draft')).toBe('draft');
  });

  it('accepts scheduled', () => {
    expect(validateEmailCampaignStatus('scheduled')).toBe('scheduled');
  });

  it('accepts sending', () => {
    expect(validateEmailCampaignStatus('sending')).toBe('sending');
  });

  it('accepts sent', () => {
    expect(validateEmailCampaignStatus('sent')).toBe('sent');
  });

  it('accepts paused', () => {
    expect(validateEmailCampaignStatus('paused')).toBe('paused');
  });

  it('accepts archived', () => {
    expect(validateEmailCampaignStatus('archived')).toBe('archived');
  });

  it('throws for unknown status', () => {
    expect(() => validateEmailCampaignStatus('active')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateEmailCampaignStatus('')).toThrow('status must be one of');
  });

  it('throws for whitespace-only status', () => {
    expect(() => validateEmailCampaignStatus('   ')).toThrow('status must be one of');
  });

  it('throws for tab-only status', () => {
    expect(() => validateEmailCampaignStatus('\t')).toThrow('status must be one of');
  });

  it('throws for newline-only status', () => {
    expect(() => validateEmailCampaignStatus('\n')).toThrow('status must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateEmailCampaignStatus('Draft')).toThrow('status must be one of');
  });

  it('throws for trailing whitespace on valid value', () => {
    expect(() => validateEmailCampaignStatus('draft ')).toThrow('status must be one of');
  });
});

describe('validateTemplateType', () => {
  it('accepts visual', () => {
    expect(validateTemplateType('visual')).toBe('visual');
  });

  it('accepts html', () => {
    expect(validateTemplateType('html')).toBe('html');
  });

  it('throws for unknown template type', () => {
    expect(() => validateTemplateType('markdown')).toThrow('templateType must be one of');
  });

  it('throws for empty template type', () => {
    expect(() => validateTemplateType('')).toThrow('templateType must be one of');
  });

  it('throws for whitespace-only template type', () => {
    expect(() => validateTemplateType('   ')).toThrow('templateType must be one of');
  });

  it('throws for tab-only template type', () => {
    expect(() => validateTemplateType('\t')).toThrow('templateType must be one of');
  });

  it('throws for newline-only template type', () => {
    expect(() => validateTemplateType('\n')).toThrow('templateType must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateTemplateType('Visual')).toThrow('templateType must be one of');
  });

  it('throws for value with trailing whitespace', () => {
    expect(() => validateTemplateType('html ')).toThrow('templateType must be one of');
  });
});

describe('validateScheduleType', () => {
  it('accepts immediate', () => {
    expect(validateScheduleType('immediate')).toBe('immediate');
  });

  it('accepts scheduled', () => {
    expect(validateScheduleType('scheduled')).toBe('scheduled');
  });

  it('accepts recurring', () => {
    expect(validateScheduleType('recurring')).toBe('recurring');
  });

  it('throws for unknown schedule type', () => {
    expect(() => validateScheduleType('delayed')).toThrow('schedule type must be one of');
  });

  it('throws for empty schedule type', () => {
    expect(() => validateScheduleType('')).toThrow('schedule type must be one of');
  });

  it('throws for whitespace-only schedule type', () => {
    expect(() => validateScheduleType('   ')).toThrow('schedule type must be one of');
  });

  it('throws for tab-only schedule type', () => {
    expect(() => validateScheduleType('\t')).toThrow('schedule type must be one of');
  });

  it('throws for newline-only schedule type', () => {
    expect(() => validateScheduleType('\n')).toThrow('schedule type must be one of');
  });

  it('throws for incorrect casing', () => {
    expect(() => validateScheduleType('Immediate')).toThrow('schedule type must be one of');
  });

  it('throws for trailing whitespace on valid value', () => {
    expect(() => validateScheduleType('scheduled ')).toThrow('schedule type must be one of');
  });
});

describe('validateABTestConfig', () => {
  it('accepts valid config with minimum variants', () => {
    const config = { enabled: true, variants: 2 };
    expect(validateABTestConfig(config)).toEqual(config);
  });

  it('accepts valid config with maximum variants', () => {
    const config = { enabled: true, variants: 10 };
    expect(validateABTestConfig(config)).toEqual(config);
  });

  it('accepts valid config with splitPercentage', () => {
    const config = { enabled: true, variants: 3, splitPercentage: 30 };
    expect(validateABTestConfig(config)).toEqual(config);
  });

  it('accepts splitPercentage at boundaries', () => {
    expect(validateABTestConfig({ enabled: true, variants: 2, splitPercentage: 0 })).toBeDefined();
    expect(
      validateABTestConfig({ enabled: true, variants: 2, splitPercentage: 100 }),
    ).toBeDefined();
  });

  it('accepts config without splitPercentage', () => {
    const config = { enabled: false, variants: 2 };
    expect(validateABTestConfig(config)).toEqual(config);
  });

  it('accepts winnerCriteria payload without additional validation', () => {
    const config = {
      enabled: true,
      variants: 2,
      splitPercentage: 50,
      winnerCriteria: 'click_rate',
    };
    expect(validateABTestConfig(config)).toEqual(config);
  });

  it('throws for variants below minimum', () => {
    expect(() => validateABTestConfig({ enabled: true, variants: 1 })).toThrow(
      'must be an integer between 2 and 10',
    );
  });

  it('throws for variants above maximum', () => {
    expect(() => validateABTestConfig({ enabled: true, variants: 11 })).toThrow(
      'must be an integer between 2 and 10',
    );
  });

  it('throws for non-integer variants', () => {
    expect(() => validateABTestConfig({ enabled: true, variants: 2.5 })).toThrow(
      'must be an integer between 2 and 10',
    );
  });

  it('throws for negative splitPercentage', () => {
    expect(() => validateABTestConfig({ enabled: true, variants: 2, splitPercentage: -1 })).toThrow(
      'must be between 0 and 100',
    );
  });

  it('throws for splitPercentage above 100', () => {
    expect(() =>
      validateABTestConfig({ enabled: true, variants: 2, splitPercentage: 101 }),
    ).toThrow('must be between 0 and 100');
  });

  it('throws for NaN variants', () => {
    expect(() => validateABTestConfig({ enabled: true, variants: Number.NaN })).toThrow(
      'must be an integer between 2 and 10',
    );
  });
});

describe('validateCampaignId', () => {
  it('returns trimmed campaign ID for valid input', () => {
    expect(validateCampaignId('  campaign-123  ')).toBe('campaign-123');
  });

  it('returns trimmed campaign ID with tabs and newlines', () => {
    expect(validateCampaignId('\n\tcampaign-123\t\n')).toBe('campaign-123');
  });

  it('accepts single-character campaign ID', () => {
    expect(validateCampaignId('A')).toBe('A');
  });

  it('accepts numeric campaign ID', () => {
    expect(validateCampaignId('12345')).toBe('12345');
  });

  it('accepts punctuation campaign ID', () => {
    expect(validateCampaignId('Campaign: Weekly v2')).toBe('Campaign: Weekly v2');
  });

  it('accepts campaign ID at 200 characters', () => {
    const campaignId = 'x'.repeat(200);
    expect(validateCampaignId(campaignId)).toBe(campaignId);
  });

  it('accepts mixed whitespace around valid campaign ID', () => {
    expect(validateCampaignId(' \t campaign-456 \n ')).toBe('campaign-456');
  });

  it('returns campaign ID containing slashes', () => {
    expect(validateCampaignId('campaign/group/a')).toBe('campaign/group/a');
  });

  it('returns campaign ID containing dots and dashes', () => {
    expect(validateCampaignId('campaign.v2-alpha')).toBe('campaign.v2-alpha');
  });

  it('throws for empty string', () => {
    expect(() => validateCampaignId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCampaignId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateCampaignId('\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateCampaignId('\n')).toThrow('must not be empty');
  });

  it('returns large campaign IDs beyond 200 chars as-is', () => {
    const campaignId = 'x'.repeat(201);
    expect(validateCampaignId(campaignId)).toBe(campaignId);
  });

  it('returns same value when already trimmed', () => {
    expect(validateCampaignId('campaign-456')).toBe('campaign-456');
  });
});

describe('validateSchedule', () => {
  it('accepts immediate schedule', () => {
    const schedule = { type: 'immediate' as const };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it('accepts scheduled with scheduledAt', () => {
    const schedule = { type: 'scheduled' as const, scheduledAt: '2026-04-01T10:00:00Z' };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it('accepts recurring with cronExpression', () => {
    const schedule = { type: 'recurring' as const, cronExpression: '0 9 * * MON' };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it('accepts scheduled when both scheduledAt and cronExpression are provided', () => {
    const schedule = {
      type: 'scheduled' as const,
      scheduledAt: '2026-04-01T10:00:00Z',
      cronExpression: '0 9 * * MON',
    };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it('accepts recurring when cron expression includes step values', () => {
    const schedule = { type: 'recurring' as const, cronExpression: '*/15 * * * *' };
    expect(validateSchedule(schedule)).toEqual(schedule);
  });

  it('throws for scheduled without scheduledAt', () => {
    expect(() => validateSchedule({ type: 'scheduled' as const })).toThrow(
      'scheduledAt is required',
    );
  });

  it('throws for recurring without cronExpression', () => {
    expect(() => validateSchedule({ type: 'recurring' as const })).toThrow(
      'cronExpression is required',
    );
  });

  it('throws for unknown schedule type', () => {
    expect(() => validateSchedule({ type: 'delayed' as unknown as 'immediate' })).toThrow(
      'schedule type must be one of',
    );
  });

  it('throws for whitespace schedule type', () => {
    expect(() => validateSchedule({ type: '   ' as unknown as 'immediate' })).toThrow(
      'schedule type must be one of',
    );
  });
});

describe('buildEmailCampaignsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildEmailCampaignsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/campaigns/email-campaigns',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildEmailCampaignsUrl('my project')).toBe('/p/my%20project/campaigns/email-campaigns');
  });

  it('encodes slashes in project name', () => {
    expect(buildEmailCampaignsUrl('org/project')).toBe(
      '/p/org%2Fproject/campaigns/email-campaigns',
    );
  });

  it('encodes unicode characters in project name', () => {
    expect(buildEmailCampaignsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/campaigns/email-campaigns',
    );
  });

  it('encodes hash character in project name', () => {
    expect(buildEmailCampaignsUrl('my#project')).toBe('/p/my%23project/campaigns/email-campaigns');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildEmailCampaignsUrl('team-alpha')).toBe('/p/team-alpha/campaigns/email-campaigns');
  });
});

describe('createEmailCampaignActionExecutors', () => {
  it('returns executors for all five action types', () => {
    const executors = createEmailCampaignActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_EMAIL_CAMPAIGN_ACTION_TYPE]).toBeDefined();
    expect(executors[SEND_EMAIL_CAMPAIGN_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_EMAIL_CAMPAIGN_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createEmailCampaignActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" with UI-only context', async () => {
    const executors = createEmailCampaignActionExecutors();
    await expect(executors[CREATE_EMAIL_CAMPAIGN_ACTION_TYPE].execute({})).rejects.toThrow(
      'Bloomreach Engagement UI',
    );
  });

  it('send executor throws "not yet implemented" with UI-only context', async () => {
    const executors = createEmailCampaignActionExecutors();
    await expect(executors[SEND_EMAIL_CAMPAIGN_ACTION_TYPE].execute({})).rejects.toThrow(
      'Bloomreach Engagement UI',
    );
  });

  it('clone executor throws "not yet implemented" with UI-only context', async () => {
    const executors = createEmailCampaignActionExecutors();
    await expect(executors[CLONE_EMAIL_CAMPAIGN_ACTION_TYPE].execute({})).rejects.toThrow(
      'Bloomreach Engagement UI',
    );
  });

  it('archive executor throws "not yet implemented" with UI-only context', async () => {
    const executors = createEmailCampaignActionExecutors();
    await expect(executors[ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE].execute({})).rejects.toThrow(
      'Bloomreach Engagement UI',
    );
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createEmailCampaignActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('stub executors still throw not-yet-implemented with apiConfig', async () => {
    const executors = createEmailCampaignActionExecutors(TEST_API_CONFIG);
    const stubTypes = [
      CREATE_EMAIL_CAMPAIGN_ACTION_TYPE,
      SEND_EMAIL_CAMPAIGN_ACTION_TYPE,
      CLONE_EMAIL_CAMPAIGN_ACTION_TYPE,
      ARCHIVE_EMAIL_CAMPAIGN_ACTION_TYPE,
    ];
    for (const actionType of stubTypes) {
      await expect(executors[actionType].execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachEmailCampaignsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachEmailCampaignsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachEmailCampaignsService);
    });

    it('exposes the email campaigns URL', () => {
      const service = new BloomreachEmailCampaignsService('kingdom-of-joakim');
      expect(service.emailCampaignsUrl).toBe('/p/kingdom-of-joakim/campaigns/email-campaigns');
    });

    it('trims project name', () => {
      const service = new BloomreachEmailCampaignsService('  my-project  ');
      expect(service.emailCampaignsUrl).toBe('/p/my-project/campaigns/email-campaigns');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachEmailCampaignsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachEmailCampaignsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachEmailCampaignsService('org/project');
      expect(service.emailCampaignsUrl).toBe('/p/org%2Fproject/campaigns/email-campaigns');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachEmailCampaignsService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachEmailCampaignsService);
    });

    it('exposes email campaigns URL when constructed with apiConfig', () => {
      const service = new BloomreachEmailCampaignsService('test', TEST_API_CONFIG);
      expect(service.emailCampaignsUrl).toBe('/p/test/campaigns/email-campaigns');
    });
  });

  describe('listEmailCampaigns', () => {
    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns()).rejects.toThrow('does not provide a list endpoint');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.listEmailCampaigns({ project: 'test', status: 'running' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns({ project: '', status: 'draft' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns({ project: '   ', status: 'draft' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('throws no-API-endpoint error for valid project override', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'does not provide a list endpoint',
      );
    });

    it('throws no-API-endpoint error for trimmed project override', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns({ project: '  kingdom-of-joakim  ' })).rejects.toThrow(
        'does not provide a list endpoint',
      );
    });
  });

  describe('viewCampaignResults', () => {
    it('throws no-campaign-results-endpoint error with valid input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: 'test', campaignId: 'campaign-1' }),
      ).rejects.toThrow('does not provide a campaign results endpoint');
    });

    it('validates project input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: '', campaignId: 'campaign-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: '   ', campaignId: 'campaign-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates campaignId input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: 'test', campaignId: '   ' }),
      ).rejects.toThrow('Campaign ID must not be empty');
    });

    it('validates empty campaignId input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: 'test', campaignId: '' }),
      ).rejects.toThrow('Campaign ID must not be empty');
    });
  });

  describe('prepareCreateEmailCampaign', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'Spring Sale',
        subjectLine: "Don't miss our Spring Sale!",
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'email_campaigns.create_campaign',
          project: 'test',
          name: 'Spring Sale',
          subjectLine: "Don't miss our Spring Sale!",
        }),
      );
    });

    it('includes templateType in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'HTML Campaign',
        subjectLine: 'Custom HTML',
        templateType: 'html',
      });

      expect(result.preview).toEqual(expect.objectContaining({ templateType: 'html' }));
    });

    it('includes audience in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'VIP Campaign',
        subjectLine: 'Exclusive offer',
        audience: 'vip-customers',
      });

      expect(result.preview).toEqual(expect.objectContaining({ audience: 'vip-customers' }));
    });

    it('includes schedule in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const schedule = { type: 'scheduled' as const, scheduledAt: '2026-04-01T10:00:00Z' };
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'Scheduled Campaign',
        subjectLine: 'Coming soon',
        schedule,
      });

      expect(result.preview).toEqual(expect.objectContaining({ schedule }));
    });

    it('includes abTest in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const abTest = { enabled: true, variants: 3, splitPercentage: 20 };
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'A/B Test Campaign',
        subjectLine: 'Testing subject lines',
        abTest,
      });

      expect(result.preview).toEqual(expect.objectContaining({ abTest }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'Campaign',
        subjectLine: 'Hello',
        operatorNote: 'Created for Q2 launch',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for Q2 launch' }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: '  my-project  ',
        name: '  My Campaign  ',
        subjectLine: 'Launch now',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'My Campaign',
        }),
      );
    });

    it('trims subjectLine in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: 'Campaign',
        subjectLine: '  Launch now  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          subjectLine: 'Launch now',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: '',
          subjectLine: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty subject line', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: 'Campaign',
          subjectLine: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: '',
          name: 'Campaign',
          subjectLine: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: '   ',
          name: 'Campaign',
          subjectLine: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: 'x'.repeat(201),
          subjectLine: 'Hello',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for invalid template type', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: 'Campaign',
          subjectLine: 'Hello',
          templateType: 'markdown',
        }),
      ).toThrow('templateType must be one of');
    });

    it('throws for invalid schedule', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: 'Campaign',
          subjectLine: 'Hello',
          schedule: { type: 'scheduled' },
        }),
      ).toThrow('scheduledAt is required');
    });

    it('throws for invalid A/B test config', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCreateEmailCampaign({
          project: 'test',
          name: 'Campaign',
          subjectLine: 'Hello',
          abTest: { enabled: true, variants: 1 },
        }),
      ).toThrow('must be an integer between 2 and 10');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateEmailCampaign({
        project: 'test',
        name: maxName,
        subjectLine: 'Hello',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareSendEmailCampaign', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareSendEmailCampaign({
        project: 'test',
        campaignId: 'campaign-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'email_campaigns.send_campaign',
          project: 'test',
          campaignId: 'campaign-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareSendEmailCampaign({
        project: 'test',
        campaignId: 'campaign-123',
        operatorNote: 'Sending after final review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Sending after final review' }),
      );
    });

    it('trims campaignId and reaches prepared state', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareSendEmailCampaign({
        project: 'test',
        campaignId: '  campaign-123  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          campaignId: 'campaign-123',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareSendEmailCampaign({
        project: '  my-project  ',
        campaignId: 'campaign-123',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() => service.prepareSendEmailCampaign({ project: 'test', campaignId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareSendEmailCampaign({ project: 'test', campaignId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareSendEmailCampaign({ project: '', campaignId: 'campaign-123' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareSendEmailCampaign({ project: '   ', campaignId: 'campaign-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCloneEmailCampaign', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCloneEmailCampaign({
        project: 'test',
        campaignId: 'campaign-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'email_campaigns.clone_campaign',
          project: 'test',
          campaignId: 'campaign-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCloneEmailCampaign({
        project: 'test',
        campaignId: 'campaign-789',
        newName: '  Cloned Campaign  ',
      });

      expect(result.preview).toEqual(expect.objectContaining({ newName: 'Cloned Campaign' }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCloneEmailCampaign({
        project: 'test',
        campaignId: 'campaign-789',
        operatorNote: 'Clone for Q3',
      });

      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: 'Clone for Q3' }));
    });

    it('trims campaignId and reaches prepared state', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCloneEmailCampaign({
        project: 'test',
        campaignId: '  campaign-789  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          campaignId: 'campaign-789',
        }),
      );
    });

    it('trims project in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareCloneEmailCampaign({
        project: '  my-project  ',
        campaignId: 'campaign-789',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() => service.prepareCloneEmailCampaign({ project: 'test', campaignId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for whitespace-only campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({ project: 'test', campaignId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({ project: '', campaignId: 'campaign-789' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({ project: '   ', campaignId: 'campaign-789' }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({
          project: 'test',
          campaignId: 'campaign-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when newName exceeds maximum length', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({
          project: 'test',
          campaignId: 'campaign-789',
          newName: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts max-length newName', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const newName = 'x'.repeat(200);
      const result = service.prepareCloneEmailCampaign({
        project: 'test',
        campaignId: 'campaign-789',
        newName,
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          newName,
        }),
      );
    });
  });

  describe('prepareArchiveEmailCampaign', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: 'test',
        campaignId: 'campaign-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'email_campaigns.archive_campaign',
          project: 'test',
          campaignId: 'campaign-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: 'test',
        campaignId: 'campaign-900',
        operatorNote: 'Archive completed campaign',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive completed campaign' }),
      );
    });

    it('accepts trimmed campaignId and reaches prepared state', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: 'test',
        campaignId: '  campaign-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          campaignId: 'campaign-900',
        }),
      );
    });

    it('trims project and reaches prepared state', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: '  my-project  ',
        campaignId: 'campaign-900',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
        }),
      );
    });

    it('keeps slash-containing campaignId after trim', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: 'test',
        campaignId: '  campaign/group/a  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          campaignId: 'campaign/group/a',
        }),
      );
    });

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: 'test', campaignId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: 'test', campaignId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: '', campaignId: 'campaign-900' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: '   ', campaignId: 'campaign-900' }),
      ).toThrow('must not be empty');
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareArchiveEmailCampaign({
        project: 'test',
        campaignId: 'campaign-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });
  });
});

describe('SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE', () => {
  it('exports correct value', () => {
    expect(SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE).toBe('email_campaigns.send_transactional');
  });
});

describe('validateEmailIntegrationId', () => {
  it('returns trimmed ID', () => {
    expect(validateEmailIntegrationId('  int-123  ')).toBe('int-123');
  });

  it('throws for empty string', () => {
    expect(() => validateEmailIntegrationId('')).toThrow('Integration ID must not be empty');
  });
});

describe('validateEmailAddress', () => {
  it('returns trimmed email', () => {
    expect(validateEmailAddress('  user@example.com  ')).toBe('user@example.com');
  });

  it('throws for empty string', () => {
    expect(() => validateEmailAddress('')).toThrow('Email address must not be empty');
  });

  it('throws for missing @', () => {
    expect(() => validateEmailAddress('invalid')).toThrow('must contain an @ symbol');
  });
});

describe('validateTransactionalEmailContent', () => {
  it('returns content with templateId', () => {
    const content = { templateId: 'tpl-1' };
    expect(validateTransactionalEmailContent(content)).toEqual(content);
  });

  it('returns content with html', () => {
    const content = { html: '<p>Hello</p>' };
    expect(validateTransactionalEmailContent(content)).toEqual(content);
  });

  it('throws when neither templateId nor html', () => {
    expect(() => validateTransactionalEmailContent({})).toThrow('either a templateId or raw html');
  });
});

describe('createEmailCampaignActionExecutors - transactional', () => {
  it('includes SendTransactionalEmailExecutor', () => {
    const executors = createEmailCampaignActionExecutors();
    expect(executors[SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE]).toBeDefined();
  });

  it('SendTransactionalEmailExecutor requires API credentials', async () => {
    const executors = createEmailCampaignActionExecutors();
    await expect(executors[SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE].execute({})).rejects.toThrow('requires API credentials');
  });

  it('SendTransactionalEmailExecutor calls email API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const executors = createEmailCampaignActionExecutors(TEST_API_CONFIG);
    await executors[SEND_TRANSACTIONAL_EMAIL_ACTION_TYPE].execute({
      integrationId: 'int-1',
      recipient: { customerIds: { registered: 'user@test.com' }, email: 'user@test.com' },
      emailContent: { templateId: 'tpl-1' },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/email/v2/projects/');
    expect(url).toContain('/sync');
  });
});

describe('BloomreachEmailCampaignsService - transactional', () => {
  describe('sendTransactionalEmail', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.sendTransactionalEmail({
          project: 'test',
          integrationId: 'int-1',
          recipient: { customerIds: { registered: 'u@t.com' }, email: 'u@t.com' },
          emailContent: { templateId: 'tpl-1' },
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('sends email via API with valid input', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachEmailCampaignsService('test', TEST_API_CONFIG);
      const result = await service.sendTransactionalEmail({
        project: 'test',
        integrationId: 'int-1',
        recipient: { customerIds: { registered: 'u@t.com' }, email: 'u@t.com' },
        emailContent: { templateId: 'tpl-1' },
      });
      expect(result.success).toBe(true);
    });

    it('validates integrationId', async () => {
      const service = new BloomreachEmailCampaignsService('test', TEST_API_CONFIG);
      await expect(
        service.sendTransactionalEmail({
          project: 'test',
          integrationId: '',
          recipient: { customerIds: { registered: 'u@t.com' }, email: 'u@t.com' },
          emailContent: { templateId: 'tpl-1' },
        }),
      ).rejects.toThrow('Integration ID must not be empty');
    });

    it('validates email address', async () => {
      const service = new BloomreachEmailCampaignsService('test', TEST_API_CONFIG);
      await expect(
        service.sendTransactionalEmail({
          project: 'test',
          integrationId: 'int-1',
          recipient: { customerIds: { registered: 'u' }, email: 'invalid' },
          emailContent: { templateId: 'tpl-1' },
        }),
      ).rejects.toThrow('must contain an @ symbol');
    });
  });

  describe('prepareSendTransactionalEmail', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachEmailCampaignsService('test');
      const result = service.prepareSendTransactionalEmail({
        project: 'test',
        integrationId: 'int-1',
        recipient: { customerIds: { registered: 'u@t.com' }, email: 'u@t.com' },
        emailContent: { templateId: 'tpl-1' },
        operatorNote: 'Test email',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'email_campaigns.send_transactional',
          integrationId: 'int-1',
        }),
      );
    });
  });
});
