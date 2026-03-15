import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  TRACK_EVENT_ACTION_TYPE,
  TRACK_BATCH_ACTION_TYPE,
  TRACK_CUSTOMER_ACTION_TYPE,
  TRACK_CONSENT_ACTION_TYPE,
  TRACK_CAMPAIGN_ACTION_TYPE,
  TRACKING_RATE_LIMIT_WINDOW_MS,
  TRACKING_EVENT_RATE_LIMIT,
  TRACKING_BATCH_RATE_LIMIT,
  TRACKING_CUSTOMER_RATE_LIMIT,
  TRACKING_CONSENT_RATE_LIMIT,
  TRACKING_CAMPAIGN_RATE_LIMIT,
  validateTrackingCustomerIds,
  validateEventType,
  validateBatchCommands,
  validateConsentAction,
  validateCampaignType,
  validateCampaignAction,
  validateTimestamp,
  createTrackingActionExecutors,
  BloomreachTrackingService,
} from '../index.js';
import * as bloomreachIndex from '../index.js';

const TEST_API_CONFIG: BloomreachApiConfig = {
  projectToken: 'test-token-123',
  apiKeyId: 'key-id',
  apiSecret: 'key-secret',
  baseUrl: 'https://api.test.com',
};

const validateTrackingConsentCategory = (bloomreachIndex as Record<string, unknown>)
  .validateTrackingConsentCategory as (category: string) => string;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action type constants', () => {
  it('exports TRACK_EVENT_ACTION_TYPE', () => {
    expect(TRACK_EVENT_ACTION_TYPE).toBe('tracking.track_event');
  });

  it('exports TRACK_BATCH_ACTION_TYPE', () => {
    expect(TRACK_BATCH_ACTION_TYPE).toBe('tracking.track_batch');
  });

  it('exports TRACK_CUSTOMER_ACTION_TYPE', () => {
    expect(TRACK_CUSTOMER_ACTION_TYPE).toBe('tracking.track_customer');
  });

  it('exports TRACK_CONSENT_ACTION_TYPE', () => {
    expect(TRACK_CONSENT_ACTION_TYPE).toBe('tracking.track_consent');
  });

  it('exports TRACK_CAMPAIGN_ACTION_TYPE', () => {
    expect(TRACK_CAMPAIGN_ACTION_TYPE).toBe('tracking.track_campaign');
  });
});

describe('rate limit constants', () => {
  it('exports TRACKING_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(TRACKING_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports TRACKING_EVENT_RATE_LIMIT', () => {
    expect(TRACKING_EVENT_RATE_LIMIT).toBe(100);
  });

  it('exports TRACKING_BATCH_RATE_LIMIT', () => {
    expect(TRACKING_BATCH_RATE_LIMIT).toBe(50);
  });

  it('exports TRACKING_CUSTOMER_RATE_LIMIT', () => {
    expect(TRACKING_CUSTOMER_RATE_LIMIT).toBe(100);
  });

  it('exports TRACKING_CONSENT_RATE_LIMIT', () => {
    expect(TRACKING_CONSENT_RATE_LIMIT).toBe(100);
  });

  it('exports TRACKING_CAMPAIGN_RATE_LIMIT', () => {
    expect(TRACKING_CAMPAIGN_RATE_LIMIT).toBe(100);
  });
});

describe('validateTrackingCustomerIds', () => {
  it('returns validated IDs when valid', () => {
    expect(validateTrackingCustomerIds({ registered: 'abc', email: 'x@y.com' })).toEqual({
      registered: 'abc',
      email: 'x@y.com',
    });
  });

  it('trims values', () => {
    expect(validateTrackingCustomerIds({ registered: '  abc  ' })).toEqual({ registered: 'abc' });
  });

  it('filters out empty and undefined values', () => {
    expect(
      validateTrackingCustomerIds({
        registered: 'abc',
        cookie: '   ',
        email: undefined,
      }),
    ).toEqual({ registered: 'abc' });
  });

  it('throws when no valid identifiers are provided', () => {
    expect(() => validateTrackingCustomerIds({ registered: '   ', cookie: undefined })).toThrow(
      'At least one customer identifier must be provided',
    );
  });

  it('throws for all-empty object', () => {
    expect(() => validateTrackingCustomerIds({})).toThrow(
      'At least one customer identifier must be provided',
    );
  });

  it('throws for ID exceeding 500 characters', () => {
    expect(() => validateTrackingCustomerIds({ registered: 'x'.repeat(501) })).toThrow(
      'must not exceed 500 characters',
    );
  });
});

describe('validateEventType', () => {
  it('returns trimmed event type', () => {
    expect(validateEventType('  purchase  ')).toBe('purchase');
  });

  it('throws for empty string', () => {
    expect(() => validateEventType('')).toThrow('Event type must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateEventType('   ')).toThrow('Event type must not be empty');
  });

  it('throws for exceeding 500 chars', () => {
    expect(() => validateEventType('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });
});

describe('validateBatchCommands', () => {
  it('returns validated commands', () => {
    expect(
      validateBatchCommands([
        { name: 'customers', commandId: '  cmd-1  ', data: { customer_ids: { registered: '1' } } },
      ]),
    ).toEqual([{ name: 'customers', commandId: 'cmd-1', data: { customer_ids: { registered: '1' } } }]);
  });

  it('throws for empty array', () => {
    expect(() => validateBatchCommands([])).toThrow('At least one batch command must be provided');
  });

  it('throws for invalid command name', () => {
    expect(() =>
      validateBatchCommands([
        {
          name: 'invalid' as 'customers',
          data: {},
        },
      ]),
    ).toThrow('invalid name');
  });

  it('throws for null data object', () => {
    expect(() =>
      validateBatchCommands([
        {
          name: 'customers',
          data: JSON.parse('null') as Record<string, unknown>,
        },
      ]),
    ).toThrow('non-null data object');
  });

  it('throws for missing data object', () => {
    expect(() =>
      validateBatchCommands([
        {
          name: 'customers',
        } as unknown as { name: 'customers'; data: Record<string, unknown> },
      ]),
    ).toThrow('non-null data object');
  });

  it('validates commandId by trimming and rejecting empty after trim', () => {
    expect(() =>
      validateBatchCommands([
        {
          name: 'customers',
          commandId: '   ',
          data: {},
        },
      ]),
    ).toThrow('empty commandId');
  });
});

describe('validateTrackingConsentCategory', () => {
  it('returns trimmed category', () => {
    expect(validateTrackingConsentCategory('  analytics  ')).toBe('analytics');
  });

  it('throws for empty', () => {
    expect(() => validateTrackingConsentCategory('')).toThrow('Consent category must not be empty');
  });

  it('throws for whitespace-only', () => {
    expect(() => validateTrackingConsentCategory('   ')).toThrow('Consent category must not be empty');
  });

  it('throws for exceeding 500 chars', () => {
    expect(() => validateTrackingConsentCategory('x'.repeat(501))).toThrow(
      'must not exceed 500 characters',
    );
  });
});

describe('validateConsentAction', () => {
  it('returns accept for accept', () => {
    expect(validateConsentAction('accept')).toBe('accept');
  });

  it('returns reject for reject', () => {
    expect(validateConsentAction('reject')).toBe('reject');
  });

  it('normalizes to lowercase', () => {
    expect(validateConsentAction('  ACCEPT  ')).toBe('accept');
  });

  it('throws for invalid action', () => {
    expect(() => validateConsentAction('maybe')).toThrow("must be 'accept' or 'reject'");
  });
});

describe('validateCampaignType', () => {
  it('returns trimmed campaign type', () => {
    expect(validateCampaignType('  newsletter  ')).toBe('newsletter');
  });

  it('throws for empty', () => {
    expect(() => validateCampaignType('')).toThrow('Campaign type must not be empty');
  });

  it('throws for exceeding 500 chars', () => {
    expect(() => validateCampaignType('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });
});

describe('validateCampaignAction', () => {
  it('returns trimmed action', () => {
    expect(validateCampaignAction('  open  ')).toBe('open');
  });

  it('throws for empty', () => {
    expect(() => validateCampaignAction('')).toThrow('Campaign action must not be empty');
  });

  it('throws for exceeding 500 chars', () => {
    expect(() => validateCampaignAction('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });
});

describe('validateTimestamp', () => {
  it('returns undefined when undefined', () => {
    expect(validateTimestamp()).toBeUndefined();
  });

  it('returns the value when valid positive number', () => {
    expect(validateTimestamp(123456789)).toBe(123456789);
  });

  it('throws for non-finite values', () => {
    expect(() => validateTimestamp(Number.NaN)).toThrow('Timestamp must be a positive number');
    expect(() => validateTimestamp(Number.POSITIVE_INFINITY)).toThrow(
      'Timestamp must be a positive number',
    );
  });

  it('throws for zero or negative', () => {
    expect(() => validateTimestamp(0)).toThrow('Timestamp must be a positive number');
    expect(() => validateTimestamp(-1)).toThrow('Timestamp must be a positive number');
  });
});

describe('createTrackingActionExecutors', () => {
  it('returns executors for all 5 action types', () => {
    const executors = createTrackingActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[TRACK_EVENT_ACTION_TYPE]).toBeDefined();
    expect(executors[TRACK_BATCH_ACTION_TYPE]).toBeDefined();
    expect(executors[TRACK_CUSTOMER_ACTION_TYPE]).toBeDefined();
    expect(executors[TRACK_CONSENT_ACTION_TYPE]).toBeDefined();
    expect(executors[TRACK_CAMPAIGN_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createTrackingActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors require API credentials when apiConfig is not provided', async () => {
    const executors = createTrackingActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('requires API credentials');
    }
  });

  it('executors attempt API calls when apiConfig is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const executors = createTrackingActionExecutors(TEST_API_CONFIG);
    await executors[TRACK_EVENT_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-1' },
      eventType: 'purchase',
      properties: { value: 100 },
    });
    await executors[TRACK_BATCH_ACTION_TYPE].execute({
      commands: [{ name: 'customers', data: { customer_ids: { registered: 'cust-1' } } }],
    });
    await executors[TRACK_CUSTOMER_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-2' },
      properties: { tier: 'gold' },
    });
    await executors[TRACK_CONSENT_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-3' },
      category: 'analytics',
      action: 'accept',
    });
    await executors[TRACK_CAMPAIGN_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-4' },
      campaignType: 'newsletter',
      action: 'open',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });
});

describe('BloomreachTrackingService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachTrackingService('my-project');
      expect(service).toBeInstanceOf(BloomreachTrackingService);
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachTrackingService('')).toThrow('must not be empty');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachTrackingService('my-project', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachTrackingService);
    });
  });

  describe('prepareTrackEvent', () => {
    it('returns prepared action with valid input and preview fields', () => {
      const service = new BloomreachTrackingService('test');
      const result = service.prepareTrackEvent({
        project: 'test',
        customerIds: { registered: '  cust-1  ', email: 'user@example.com' },
        eventType: '  purchase  ',
        timestamp: 123456,
        properties: { value: 100 },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tracking.track_event',
          project: 'test',
          customerIds: { registered: 'cust-1', email: 'user@example.com' },
          eventType: 'purchase',
          timestamp: 123456,
          properties: { value: 100 },
        }),
      );
    });

    it('validates customerIds and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackEvent({
          project: 'test',
          customerIds: {},
          eventType: 'purchase',
        }),
      ).toThrow('At least one customer identifier must be provided');
    });

    it('validates eventType and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackEvent({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          eventType: '   ',
        }),
      ).toThrow('Event type must not be empty');
    });

    it('validates project and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackEvent({
          project: '',
          customerIds: { registered: 'cust-1' },
          eventType: 'purchase',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareTrackBatch', () => {
    it('returns prepared action with valid batch commands', () => {
      const service = new BloomreachTrackingService('test');
      const result = service.prepareTrackBatch({
        project: 'test',
        commands: [{ name: 'customers', commandId: '  cmd-1  ', data: { customer_ids: { registered: '1' } } }],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tracking.track_batch',
          project: 'test',
          commands: [{ name: 'customers', commandId: 'cmd-1', data: { customer_ids: { registered: '1' } } }],
        }),
      );
    });

    it('throws for empty commands array', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackBatch({
          project: 'test',
          commands: [],
        }),
      ).toThrow('At least one batch command must be provided');
    });

    it('throws for invalid command name', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackBatch({
          project: 'test',
          commands: [{ name: 'invalid' as 'customers', data: {} }],
        }),
      ).toThrow('invalid name');
    });

    it('validates project', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackBatch({
          project: '',
          commands: [{ name: 'customers', data: {} }],
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareTrackCustomer', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachTrackingService('test');
      const result = service.prepareTrackCustomer({
        project: 'test',
        customerIds: { registered: '  cust-1  ' },
        properties: { tier: 'gold' },
        updateTimestamp: 123456,
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tracking.track_customer',
          project: 'test',
          customerIds: { registered: 'cust-1' },
          properties: { tier: 'gold' },
          updateTimestamp: 123456,
        }),
      );
    });

    it('throws for empty customerIds', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCustomer({
          project: 'test',
          customerIds: {},
          properties: { tier: 'gold' },
        }),
      ).toThrow('At least one customer identifier must be provided');
    });

    it('throws for empty properties', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCustomer({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          properties: {},
        }),
      ).toThrow('At least one property must be provided');
    });

    it('validates project', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCustomer({
          project: '',
          customerIds: { registered: 'cust-1' },
          properties: { tier: 'gold' },
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareTrackConsent', () => {
    it('returns prepared action with valid consent input', () => {
      const service = new BloomreachTrackingService('test');
      const result = service.prepareTrackConsent({
        project: 'test',
        customerIds: { registered: '  cust-1  ' },
        category: '  analytics  ',
        action: 'accept',
        timestamp: 123456,
        properties: { source: 'banner' },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tracking.track_consent',
          project: 'test',
          customerIds: { registered: 'cust-1' },
          category: 'analytics',
          consentAction: 'accept',
          timestamp: 123456,
          properties: { source: 'banner' },
        }),
      );
    });

    it('validates category and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackConsent({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          category: '   ',
          action: 'accept',
        }),
      ).toThrow('Consent category must not be empty');
    });

    it('validates action and throws for invalid', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackConsent({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          category: 'analytics',
          action: 'maybe' as 'accept',
        }),
      ).toThrow("must be 'accept' or 'reject'");
    });

    it('validates project', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackConsent({
          project: '',
          customerIds: { registered: 'cust-1' },
          category: 'analytics',
          action: 'accept',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareTrackCampaign', () => {
    it('returns prepared action with valid campaign input', () => {
      const service = new BloomreachTrackingService('test');
      const result = service.prepareTrackCampaign({
        project: 'test',
        customerIds: { registered: '  cust-1  ' },
        campaignType: '  newsletter  ',
        action: '  open  ',
        timestamp: 123456,
        properties: { medium: 'email' },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'tracking.track_campaign',
          project: 'test',
          customerIds: { registered: 'cust-1' },
          campaignType: 'newsletter',
          campaignAction: 'open',
          timestamp: 123456,
          properties: { medium: 'email' },
        }),
      );
    });

    it('validates campaignType and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCampaign({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          campaignType: '   ',
          action: 'open',
        }),
      ).toThrow('Campaign type must not be empty');
    });

    it('validates action and throws for empty', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCampaign({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          campaignType: 'newsletter',
          action: '   ',
        }),
      ).toThrow('Campaign action must not be empty');
    });

    it('validates project', () => {
      const service = new BloomreachTrackingService('test');
      expect(() =>
        service.prepareTrackCampaign({
          project: '',
          customerIds: { registered: 'cust-1' },
          campaignType: 'newsletter',
          action: 'open',
        }),
      ).toThrow('must not be empty');
    });
  });
});
