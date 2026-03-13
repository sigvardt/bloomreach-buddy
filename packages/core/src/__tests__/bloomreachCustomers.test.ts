import { describe, it, expect } from 'vitest';
import {
  CREATE_CUSTOMER_ACTION_TYPE,
  UPDATE_CUSTOMER_ACTION_TYPE,
  DELETE_CUSTOMER_ACTION_TYPE,
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
  buildCustomersUrl,
  createCustomerActionExecutors,
  BloomreachCustomersService,
} from '../index.js';

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
  it('returns executors for all 3 action types', () => {
    const executors = createCustomerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
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

  it('executors throw not yet implemented on execute', async () => {
    const executors = createCustomerActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
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
  });

  describe('listCustomers', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(service.listCustomers()).rejects.toThrow('not yet implemented');
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
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.searchCustomers({ project: 'test', query: 'shoes', limit: 10, offset: 0 }),
      ).rejects.toThrow('not yet implemented');
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
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachCustomersService('test');
      await expect(
        service.viewCustomer({ project: 'test', customerId: 'customer-1', idType: 'registered' }),
      ).rejects.toThrow('not yet implemented');
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
