import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_CUSTOMER_ACTION_TYPE,
  UPDATE_CUSTOMER_ACTION_TYPE,
  DELETE_CUSTOMER_ACTION_TYPE,
  CUSTOMER_TRACK_EVENT_ACTION_TYPE,
  BATCH_COMMANDS_ACTION_TYPE,
  CUSTOMER_RATE_LIMIT_WINDOW_MS,
  CUSTOMER_CREATE_RATE_LIMIT,
  CUSTOMER_UPDATE_RATE_LIMIT,
  CUSTOMER_DELETE_RATE_LIMIT,
  validateCustomerId,
  validateCustomerIds,
  validateSearchQuery,
  validateListLimit,
  validateListOffset,
  validateIdType,
  validateProperties,
  validateCustomerEventType,
  validateCustomerBatchCommands,
  buildCustomersUrl,
  createCustomerActionExecutors,
  BloomreachCustomersService,
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
  it('exports CREATE_CUSTOMER_ACTION_TYPE', () => {
    expect(CREATE_CUSTOMER_ACTION_TYPE).toBe('customers.create_customer');
  });

  it('exports UPDATE_CUSTOMER_ACTION_TYPE', () => {
    expect(UPDATE_CUSTOMER_ACTION_TYPE).toBe('customers.update_customer');
  });

  it('exports DELETE_CUSTOMER_ACTION_TYPE', () => {
    expect(DELETE_CUSTOMER_ACTION_TYPE).toBe('customers.delete_customer');
  });
});

describe('rate limit constants', () => {
  it('exports CUSTOMER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(CUSTOMER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports CUSTOMER_CREATE_RATE_LIMIT', () => {
    expect(CUSTOMER_CREATE_RATE_LIMIT).toBe(50);
  });

  it('exports CUSTOMER_UPDATE_RATE_LIMIT', () => {
    expect(CUSTOMER_UPDATE_RATE_LIMIT).toBe(100);
  });

  it('exports CUSTOMER_DELETE_RATE_LIMIT', () => {
    expect(CUSTOMER_DELETE_RATE_LIMIT).toBe(10);
  });
});

describe('validateCustomerId', () => {
  it('returns trimmed ID for valid input', () => {
    expect(validateCustomerId('  cust-123  ')).toBe('cust-123');
  });

  it('throws for empty string', () => {
    expect(() => validateCustomerId('')).toThrow('Customer ID must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCustomerId('   ')).toThrow('Customer ID must not be empty');
  });

  it('throws for ID exceeding 500 characters', () => {
    expect(() => validateCustomerId('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });

  it('returns same value when already trimmed', () => {
    expect(validateCustomerId('customer-456')).toBe('customer-456');
  });
});

describe('validateCustomerIds', () => {
  it('returns validated IDs when valid', () => {
    expect(validateCustomerIds({ registered: 'abc', email: 'x@y.com' })).toEqual({
      registered: 'abc',
      email: 'x@y.com',
    });
  });

  it('trims values', () => {
    expect(validateCustomerIds({ registered: '  abc  ' })).toEqual({ registered: 'abc' });
  });

  it('filters out empty and undefined values', () => {
    expect(
      validateCustomerIds({
        registered: 'abc',
        cookie: '   ',
        email: undefined,
      }),
    ).toEqual({ registered: 'abc' });
  });

  it('throws when no valid identifiers are provided', () => {
    expect(() => validateCustomerIds({ registered: '   ', cookie: undefined })).toThrow(
      'At least one customer identifier must be provided',
    );
  });

  it('throws for all-empty object', () => {
    expect(() => validateCustomerIds({})).toThrow('At least one customer identifier must be provided');
  });
});

describe('validateSearchQuery', () => {
  it('returns trimmed query for valid input', () => {
    expect(validateSearchQuery('  shoes  ')).toBe('shoes');
  });

  it('throws for empty string', () => {
    expect(() => validateSearchQuery('')).toThrow('Search query must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateSearchQuery('   ')).toThrow('Search query must not be empty');
  });

  it('throws for query exceeding 500 characters', () => {
    expect(() => validateSearchQuery('x'.repeat(501))).toThrow('must not exceed 500 characters');
  });
});

describe('validateListLimit', () => {
  it('returns default 50 when undefined', () => {
    expect(validateListLimit()).toBe(50);
  });

  it('returns the provided value when valid', () => {
    expect(validateListLimit(100)).toBe(100);
  });

  it('throws for 0', () => {
    expect(() => validateListLimit(0)).toThrow('positive integer');
  });

  it('throws for negative', () => {
    expect(() => validateListLimit(-1)).toThrow('positive integer');
  });

  it('throws for non-integer', () => {
    expect(() => validateListLimit(1.5)).toThrow('positive integer');
  });

  it('throws for exceeding 1000', () => {
    expect(() => validateListLimit(1001)).toThrow('must not exceed 1000');
  });
});

describe('validateListOffset', () => {
  it('returns 0 when undefined', () => {
    expect(validateListOffset()).toBe(0);
  });

  it('returns the provided value when valid', () => {
    expect(validateListOffset(25)).toBe(25);
  });

  it('throws for negative', () => {
    expect(() => validateListOffset(-1)).toThrow('non-negative integer');
  });

  it('throws for non-integer', () => {
    expect(() => validateListOffset(2.5)).toThrow('non-negative integer');
  });
});

describe('validateIdType', () => {
  it('returns registered when undefined', () => {
    expect(validateIdType()).toBe('registered');
  });

  it('returns trimmed value when provided', () => {
    expect(validateIdType('  email  ')).toBe('email');
  });

  it('throws for empty string after trim', () => {
    expect(() => validateIdType('   ')).toThrow('ID type must not be empty');
  });
});

describe('validateProperties', () => {
  it('returns the properties when valid', () => {
    expect(validateProperties({ tier: 'gold' })).toEqual({ tier: 'gold' });
  });

  it('throws for empty object', () => {
    expect(() => validateProperties({})).toThrow('At least one property must be provided');
  });

  it('throws for null', () => {
    expect(() => validateProperties(JSON.parse('null'))).toThrow('Properties must be a non-null object');
  });

  it('throws for array', () => {
    expect(() => validateProperties(JSON.parse('[]'))).toThrow('Properties must be a non-null object');
  });

  it('throws for non-object', () => {
    expect(() => validateProperties(JSON.parse('"text"'))).toThrow('Properties must be a non-null object');
  });
});

describe('buildCustomersUrl', () => {
  it('builds URL for simple project name', () => {
    expect(buildCustomersUrl('my-project')).toBe('/p/my-project/crm/customers');
  });

  it('encodes spaces in project name', () => {
    expect(buildCustomersUrl('my project')).toBe('/p/my%20project/crm/customers');
  });

  it('encodes slashes in project name', () => {
    expect(buildCustomersUrl('org/project')).toBe('/p/org%2Fproject/crm/customers');
  });
});

describe('createCustomerActionExecutors', () => {
  it('returns executors for all 5 action types', () => {
    const executors = createCustomerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_CUSTOMER_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_CUSTOMER_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_CUSTOMER_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createCustomerActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors require API credentials when apiConfig is not provided', async () => {
    const executors = createCustomerActionExecutors();
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

    const executors = createCustomerActionExecutors(TEST_API_CONFIG);
    await executors[CREATE_CUSTOMER_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-1' },
      properties: { tier: 'gold' },
    });
    await executors[UPDATE_CUSTOMER_ACTION_TYPE].execute({
      customerId: 'cust-2',
      idType: 'registered',
      properties: { tier: 'platinum' },
    });
    await executors[DELETE_CUSTOMER_ACTION_TYPE].execute({
      customerId: 'cust-3',
      idType: 'registered',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

describe('BloomreachCustomersService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachCustomersService('my-project');
      expect(service).toBeInstanceOf(BloomreachCustomersService);
    });

    it('exposes customersUrl', () => {
      const service = new BloomreachCustomersService('my-project');
      expect(service.customersUrl).toBe('/p/my-project/crm/customers');
    });

    it('trims project name', () => {
      const service = new BloomreachCustomersService('  my-project  ');
      expect(service.customersUrl).toBe('/p/my-project/crm/customers');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachCustomersService('')).toThrow('must not be empty');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachCustomersService('my-project', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachCustomersService);
    });
  });

  describe('listCustomers', () => {
    it('throws API credential error when apiConfig is not provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(service.listCustomers()).rejects.toThrow('requires API credentials');
    });

    it('returns mapped customers when apiConfig is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify([
            { registered: 'cust-1', email_id: 'one@example.com', tier: 'gold' },
            { registered: 'cust-2', cookie: 'cookie-2', tier: 'silver' },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.listCustomers({ project: 'test', limit: 1, offset: 1 });

      expect(result).toEqual([
        {
          customerIds: { registered: 'cust-2', cookie: 'cookie-2' },
          properties: { tier: 'silver' },
          url: '',
        },
      ]);
    });

    it('validates limit when input is provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(service.listCustomers({ project: 'test', limit: 0 })).rejects.toThrow(
        'positive integer',
      );
    });

    it('validates offset when input is provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(service.listCustomers({ project: 'test', offset: -1 })).rejects.toThrow(
        'non-negative integer',
      );
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(service.listCustomers({ project: '', limit: 10, offset: 0 })).rejects.toThrow(
        'must not be empty',
      );
    });
  });

  describe('searchCustomers', () => {
    it('throws API credential error with valid input when apiConfig is not provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.searchCustomers({ project: 'test', query: 'shoes', limit: 10, offset: 0 }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns mapped search result when apiConfig is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              { success: true, value: 'Jane' },
              { success: true, value: 'Doe' },
              { success: true, value: 'jane@example.com' },
              { success: true, value: 'cust-10' },
              { success: true, value: 'cookie-10' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.searchCustomers({
        project: 'test',
        query: 'shoes',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([
        {
          customerIds: { registered: 'cust-10', cookie: 'cookie-10' },
          properties: {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
          },
          url: '',
        },
      ]);
    });

    it('validates query', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.searchCustomers({ project: 'test', query: '   ', limit: 10, offset: 0 }),
      ).rejects.toThrow('Search query must not be empty');
    });

    it('validates project', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.searchCustomers({ project: '', query: 'shoes', limit: 10, offset: 0 }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewCustomer', () => {
    it('throws API credential error with valid input when apiConfig is not provided', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.viewCustomer({ project: 'test', customerId: 'customer-1', idType: 'registered' }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns customer profile when apiConfig is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              { success: true, value: 'John' },
              { success: true, value: 'Smith' },
              { success: true, value: 'john@example.com' },
              { success: true, value: '+123' },
              { success: true, value: 'registered-1' },
              { success: true, value: 'cookie-1' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.viewCustomer({
        project: 'test',
        customerId: 'customer-1',
        idType: 'registered',
      });

      expect(result).toEqual({
        customerIds: { registered: 'registered-1', cookie: 'cookie-1' },
        properties: {
          first_name: 'John',
          last_name: 'Smith',
          email: 'john@example.com',
          phone: '+123',
        },
        url: '',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: '+123',
        events: [],
        segments: [],
      });
    });

    it('validates customerId', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.viewCustomer({ project: 'test', customerId: '   ', idType: 'registered' }),
      ).rejects.toThrow('Customer ID must not be empty');
    });

    it('validates project', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.viewCustomer({ project: '', customerId: 'customer-1', idType: 'registered' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareCreateCustomer', () => {
    it('returns prepared action with valid input and preview fields', () => {
      const service = new BloomreachCustomersService('test');
      const result = service.prepareCreateCustomer({
        project: 'test',
        customerIds: { registered: '  cust-1  ', email: 'user@example.com' },
        properties: { tier: 'gold' },
        operatorNote: 'Create test customer',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'customers.create_customer',
          project: 'test',
          customerIds: { registered: 'cust-1', email: 'user@example.com' },
          properties: { tier: 'gold' },
          operatorNote: 'Create test customer',
        }),
      );
    });

    it('throws for empty customerIds', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareCreateCustomer({
          project: 'test',
          customerIds: {},
          properties: { tier: 'gold' },
        }),
      ).toThrow('At least one customer identifier must be provided');
    });

    it('throws for empty properties', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareCreateCustomer({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          properties: {},
        }),
      ).toThrow('At least one property must be provided');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareCreateCustomer({
          project: '',
          customerIds: { registered: 'cust-1' },
          properties: { tier: 'gold' },
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateCustomer', () => {
    it('returns prepared action and includes preview fields and operatorNote', () => {
      const service = new BloomreachCustomersService('test');
      const result = service.prepareUpdateCustomer({
        project: 'test',
        customerId: '  cust-2  ',
        idType: '  email  ',
        properties: { tier: 'platinum' },
        operatorNote: 'Upgrade tier',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'customers.update_customer',
          project: 'test',
          customerId: 'cust-2',
          idType: 'email',
          properties: { tier: 'platinum' },
          operatorNote: 'Upgrade tier',
        }),
      );
    });

    it('throws for empty customerId', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareUpdateCustomer({
          project: 'test',
          customerId: '   ',
          properties: { tier: 'platinum' },
        }),
      ).toThrow('Customer ID must not be empty');
    });

    it('throws for empty properties', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareUpdateCustomer({
          project: 'test',
          customerId: 'cust-2',
          properties: {},
        }),
      ).toThrow('At least one property must be provided');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareUpdateCustomer({
          project: '',
          customerId: 'cust-2',
          properties: { tier: 'platinum' },
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDeleteCustomer', () => {
    it('returns prepared action and includes preview fields and operatorNote', () => {
      const service = new BloomreachCustomersService('test');
      const result = service.prepareDeleteCustomer({
        project: 'test',
        customerId: '  cust-3  ',
        idType: '  cookie  ',
        operatorNote: 'Cleanup duplicate profile',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'customers.delete_customer',
          project: 'test',
          customerId: 'cust-3',
          idType: 'cookie',
          operatorNote: 'Cleanup duplicate profile',
        }),
      );
    });

    it('throws for empty customerId', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareDeleteCustomer({
          project: 'test',
          customerId: '   ',
        }),
      ).toThrow('Customer ID must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachCustomersService('test');
      expect(() =>
        service.prepareDeleteCustomer({
          project: '',
          customerId: 'cust-3',
        }),
      ).toThrow('must not be empty');
    });
  });
});

describe('new action type constants', () => {
  it('exports CUSTOMER_TRACK_EVENT_ACTION_TYPE', () => {
    expect(CUSTOMER_TRACK_EVENT_ACTION_TYPE).toBe('customers.track_event');
  });

  it('exports BATCH_COMMANDS_ACTION_TYPE', () => {
    expect(BATCH_COMMANDS_ACTION_TYPE).toBe('customers.batch_commands');
  });
});

describe('validateCustomerEventType', () => {
  it('returns trimmed event type', () => {
    expect(validateCustomerEventType('  purchase  ')).toBe('purchase');
  });

  it('throws for empty string', () => {
    expect(() => validateCustomerEventType('')).toThrow('Event type must not be empty');
  });

  it('throws for whitespace-only', () => {
    expect(() => validateCustomerEventType('   ')).toThrow('Event type must not be empty');
  });

  it('throws for exceeding 256 characters', () => {
    expect(() => validateCustomerEventType('x'.repeat(257))).toThrow('must not exceed 256 characters');
  });
});

describe('validateCustomerBatchCommands', () => {
  it('returns valid commands', () => {
    const cmds = [{ name: 'customers/events', data: { foo: 1 } }];
    expect(validateCustomerBatchCommands(cmds)).toEqual(cmds);
  });

  it('throws for empty array', () => {
    expect(() => validateCustomerBatchCommands([])).toThrow('At least one batch command');
  });

  it('throws for exceeding 50 commands', () => {
    const cmds = Array.from({ length: 51 }, (_, i) => ({ name: `cmd-${i}`, data: { i } }));
    expect(() => validateCustomerBatchCommands(cmds)).toThrow('must not exceed 50');
  });

  it('throws for command with empty name', () => {
    expect(() => validateCustomerBatchCommands([{ name: '', data: { a: 1 } }])).toThrow('non-empty name');
  });

  it('throws for command with null data', () => {
    expect(() =>
      validateCustomerBatchCommands([{ name: 'test', data: null as unknown as Record<string, unknown> }]),
    ).toThrow('non-null data object');
  });
});

describe('createCustomerActionExecutors - new executors', () => {
  it('returns executors for new action types', () => {
    const executors = createCustomerActionExecutors();
    expect(executors[CUSTOMER_TRACK_EVENT_ACTION_TYPE]).toBeDefined();
    expect(executors[BATCH_COMMANDS_ACTION_TYPE]).toBeDefined();
  });

  it('new executors require API credentials', async () => {
    const executors = createCustomerActionExecutors();
    await expect(executors[CUSTOMER_TRACK_EVENT_ACTION_TYPE].execute({})).rejects.toThrow('requires API credentials');
    await expect(executors[BATCH_COMMANDS_ACTION_TYPE].execute({})).rejects.toThrow('requires API credentials');
  });

  it('TrackEventExecutor calls tracking API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const executors = createCustomerActionExecutors(TEST_API_CONFIG);
    await executors[CUSTOMER_TRACK_EVENT_ACTION_TYPE].execute({
      customerIds: { registered: 'cust-1' },
      eventType: 'purchase',
      properties: { total: 99 },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/track/v2/projects/');
    expect(url).toContain('/customers/events');
  });

  it('BatchCommandsExecutor calls batch API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const executors = createCustomerActionExecutors(TEST_API_CONFIG);
    await executors[BATCH_COMMANDS_ACTION_TYPE].execute({
      commands: [{ name: 'customers/events', data: { event_type: 'test' } }],
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/track/v2/projects/');
    expect(url).toContain('/batch');
  });
});

describe('BloomreachCustomersService - new methods', () => {
  describe('trackEvent', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.trackEvent({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          eventType: 'purchase',
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('calls tracking API with valid input', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.trackEvent({
        project: 'test',
        customerIds: { registered: 'cust-1' },
        eventType: 'purchase',
        timestamp: 1620139769,
        properties: { total_price: 99.99 },
      });
      expect(result.success).toBe(true);
    });

    it('validates eventType', async () => {
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      await expect(
        service.trackEvent({
          project: 'test',
          customerIds: { registered: 'cust-1' },
          eventType: '',
        }),
      ).rejects.toThrow('Event type must not be empty');
    });

    it('validates customerIds', async () => {
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      await expect(
        service.trackEvent({
          project: 'test',
          customerIds: {},
          eventType: 'purchase',
        }),
      ).rejects.toThrow('At least one customer identifier');
    });
  });

  describe('trackBatchCommands', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.trackBatchCommands({
          project: 'test',
          commands: [{ name: 'customers/events', data: { event_type: 'test' } }],
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('calls batch API with valid input', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.trackBatchCommands({
        project: 'test',
        commands: [{ name: 'customers/events', data: { event_type: 'test' } }],
      });
      expect(result.success).toBe(true);
    });

    it('validates commands', async () => {
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      await expect(
        service.trackBatchCommands({
          project: 'test',
          commands: [],
        }),
      ).rejects.toThrow('At least one batch command');
    });
  });

  describe('exportCustomerEvents', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.exportCustomerEvents({
          project: 'test',
          customerIds: { registered: 'cust-1' },
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns events from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify([{ type: 'purchase', timestamp: 123 }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.exportCustomerEvents({
        project: 'test',
        customerIds: { registered: 'cust-1' },
        eventTypes: ['purchase'],
      });
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
    });
  });

  describe('exportSingleCustomer', () => {
    it('throws API credential error when no apiConfig', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.exportSingleCustomer({
          project: 'test',
          customerIds: { registered: 'cust-1' },
        }),
      ).rejects.toThrow('requires API credentials');
    });

    it('returns customer data from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ properties: { tier: 'gold' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const service = new BloomreachCustomersService('test', TEST_API_CONFIG);
      const result = await service.exportSingleCustomer({
        project: 'test',
        customerIds: { registered: 'cust-1' },
      });
      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
    });
  });
});
