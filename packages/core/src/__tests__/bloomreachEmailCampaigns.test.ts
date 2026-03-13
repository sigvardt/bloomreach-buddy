import { describe, it, expect } from 'vitest';
import {
  CREATE_EMAIL_CAMPAIGN_ACTION_TYPE,
  SEND_EMAIL_CAMPAIGN_ACTION_TYPE,
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
  buildEmailCampaignsUrl,
  createEmailCampaignActionExecutors,
  BloomreachEmailCampaignsService,
} from '../index.js';

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

  it('contains expected types in order', () => {
    expect(SEND_SCHEDULE_TYPES).toEqual(['immediate', 'scheduled', 'recurring']);
  });
});

describe('EMAIL_TEMPLATE_TYPES', () => {
  it('contains 2 template types', () => {
    expect(EMAIL_TEMPLATE_TYPES).toHaveLength(2);
  });

  it('contains expected types in order', () => {
    expect(EMAIL_TEMPLATE_TYPES).toEqual(['visual', 'html']);
  });
});

describe('validateCampaignName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateCampaignName('  My Campaign  ')).toBe('My Campaign');
  });

  it('accepts single-character name', () => {
    expect(validateCampaignName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateCampaignName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateCampaignName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCampaignName('   ')).toThrow('must not be empty');
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

  it('accepts single-character subject line', () => {
    expect(validateSubjectLine('A')).toBe('A');
  });

  it('accepts subject line at maximum length', () => {
    const subject = 'x'.repeat(998);
    expect(validateSubjectLine(subject)).toBe(subject);
  });

  it('throws for empty string', () => {
    expect(() => validateSubjectLine('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSubjectLine('   ')).toThrow('must not be empty');
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
});

describe('validateCampaignId', () => {
  it('returns trimmed campaign ID for valid input', () => {
    expect(validateCampaignId('  campaign-123  ')).toBe('campaign-123');
  });

  it('throws for empty string', () => {
    expect(() => validateCampaignId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCampaignId('   ')).toThrow('must not be empty');
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
});

describe('createEmailCampaignActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createEmailCampaignActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
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

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createEmailCampaignActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
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
  });

  describe('listEmailCampaigns', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(service.listEmailCampaigns()).rejects.toThrow('not yet implemented');
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
  });

  describe('viewCampaignResults', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: 'test', campaignId: 'campaign-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: '', campaignId: 'campaign-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates campaignId input', async () => {
      const service = new BloomreachEmailCampaignsService('test');
      await expect(
        service.viewCampaignResults({ project: 'test', campaignId: '   ' }),
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

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() => service.prepareSendEmailCampaign({ project: 'test', campaignId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareSendEmailCampaign({ project: '', campaignId: 'campaign-123' }),
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

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() => service.prepareCloneEmailCampaign({ project: 'test', campaignId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareCloneEmailCampaign({ project: '', campaignId: 'campaign-789' }),
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

    it('throws for empty campaignId', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: 'test', campaignId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachEmailCampaignsService('test');
      expect(() =>
        service.prepareArchiveEmailCampaign({ project: '', campaignId: 'campaign-900' }),
      ).toThrow('must not be empty');
    });
  });
});
