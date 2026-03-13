import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_INTEGRATION_ACTION_TYPE,
  CONFIGURE_INTEGRATION_ACTION_TYPE,
  ENABLE_INTEGRATION_ACTION_TYPE,
  DISABLE_INTEGRATION_ACTION_TYPE,
  DELETE_INTEGRATION_ACTION_TYPE,
  TEST_INTEGRATION_ACTION_TYPE,
  INTEGRATION_RATE_LIMIT_WINDOW_MS,
  INTEGRATION_CREATE_RATE_LIMIT,
  INTEGRATION_MODIFY_RATE_LIMIT,
  INTEGRATION_DELETE_RATE_LIMIT,
  INTEGRATION_TEST_RATE_LIMIT,
  INTEGRATION_TYPES,
  INTEGRATION_STATUSES,
  validateIntegrationName,
  validateIntegrationProject,
  validateIntegrationId,
  validateIntegrationType,
  validateIntegrationStatus,
  validateProvider,
  buildIntegrationsUrl,
  createIntegrationActionExecutors,
  BloomreachIntegrationsService,
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
  it('exports CREATE_INTEGRATION_ACTION_TYPE', () => {
    expect(CREATE_INTEGRATION_ACTION_TYPE).toBe('integrations.create_integration');
  });

  it('exports CONFIGURE_INTEGRATION_ACTION_TYPE', () => {
    expect(CONFIGURE_INTEGRATION_ACTION_TYPE).toBe('integrations.configure_integration');
  });

  it('exports ENABLE_INTEGRATION_ACTION_TYPE', () => {
    expect(ENABLE_INTEGRATION_ACTION_TYPE).toBe('integrations.enable_integration');
  });

  it('exports DISABLE_INTEGRATION_ACTION_TYPE', () => {
    expect(DISABLE_INTEGRATION_ACTION_TYPE).toBe('integrations.disable_integration');
  });

  it('exports DELETE_INTEGRATION_ACTION_TYPE', () => {
    expect(DELETE_INTEGRATION_ACTION_TYPE).toBe('integrations.delete_integration');
  });

  it('exports TEST_INTEGRATION_ACTION_TYPE', () => {
    expect(TEST_INTEGRATION_ACTION_TYPE).toBe('integrations.test_integration');
  });
});

describe('rate limit constants', () => {
  it('exports INTEGRATION_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(INTEGRATION_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports INTEGRATION_CREATE_RATE_LIMIT', () => {
    expect(INTEGRATION_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports INTEGRATION_MODIFY_RATE_LIMIT', () => {
    expect(INTEGRATION_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports INTEGRATION_DELETE_RATE_LIMIT', () => {
    expect(INTEGRATION_DELETE_RATE_LIMIT).toBe(10);
  });

  it('exports INTEGRATION_TEST_RATE_LIMIT', () => {
    expect(INTEGRATION_TEST_RATE_LIMIT).toBe(30);
  });
});

describe('type and status enums', () => {
  it('exports all expected integration types', () => {
    expect(INTEGRATION_TYPES).toEqual([
      'esp',
      'sms',
      'push',
      'ad_platform',
      'webhook',
      'analytics',
      'crm',
      'custom',
    ]);
  });

  it('exports all expected integration statuses', () => {
    expect(INTEGRATION_STATUSES).toEqual(['active', 'inactive', 'error', 'pending']);
  });
});

describe('validateIntegrationName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateIntegrationName('  My Integration  ')).toBe('My Integration');
  });

  it('accepts single-character name', () => {
    expect(validateIntegrationName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateIntegrationName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateIntegrationName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateIntegrationName('   ')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string with tabs', () => {
    expect(() => validateIntegrationName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateIntegrationName('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateIntegrationName('\n\tMy Integration\t\n')).toBe('My Integration');
  });

  it('accepts unicode name', () => {
    expect(validateIntegrationName('Integrační modul')).toBe('Integrační modul');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateIntegrationName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateIntegrationProject', () => {
  it('returns trimmed project for valid input', () => {
    expect(validateIntegrationProject('  my-project  ')).toBe('my-project');
  });

  it('throws for empty string', () => {
    expect(() => validateIntegrationProject('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateIntegrationProject('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateIntegrationProject('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateIntegrationProject('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateIntegrationProject('\n\tmy-project\t\n')).toBe('my-project');
  });

  it('accepts unicode project name', () => {
    expect(validateIntegrationProject('projekt-åäö')).toBe('projekt-åäö');
  });
});

describe('validateIntegrationId', () => {
  it('returns trimmed ID for valid input', () => {
    expect(validateIntegrationId('  integ-123  ')).toBe('integ-123');
  });

  it('throws for empty string', () => {
    expect(() => validateIntegrationId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateIntegrationId('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateIntegrationId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateIntegrationId('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateIntegrationId('\n\tinteg-abc\t\n')).toBe('integ-abc');
  });

  it('accepts unicode integration ID', () => {
    expect(validateIntegrationId('integrace-123')).toBe('integrace-123');
  });
});

describe('validateIntegrationType', () => {
  it('accepts all valid integration types', () => {
    for (const type of INTEGRATION_TYPES) {
      expect(validateIntegrationType(type)).toBe(type);
    }
  });

  it('throws for invalid type', () => {
    expect(() => validateIntegrationType('invalid')).toThrow("Invalid integration type 'invalid'");
  });

  it('throws for empty string', () => {
    expect(() => validateIntegrationType('')).toThrow('Invalid integration type');
  });

  it('throws for type with wrong case', () => {
    expect(() => validateIntegrationType('ESP')).toThrow('Invalid integration type');
  });
});

describe('validateIntegrationStatus', () => {
  it('accepts all valid integration statuses', () => {
    for (const status of INTEGRATION_STATUSES) {
      expect(validateIntegrationStatus(status)).toBe(status);
    }
  });

  it('throws for invalid status', () => {
    expect(() => validateIntegrationStatus('broken')).toThrow(
      "Invalid integration status 'broken'",
    );
  });

  it('throws for empty string', () => {
    expect(() => validateIntegrationStatus('')).toThrow('Invalid integration status');
  });

  it('throws for status with wrong case', () => {
    expect(() => validateIntegrationStatus('Active')).toThrow('Invalid integration status');
  });
});

describe('validateProvider', () => {
  it('returns trimmed provider for valid input', () => {
    expect(validateProvider('  SendGrid  ')).toBe('SendGrid');
  });

  it('throws for empty string', () => {
    expect(() => validateProvider('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateProvider('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateProvider('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateProvider('\n\n')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateProvider('\n\tSendGrid\t\n')).toBe('SendGrid');
  });

  it('accepts unicode provider', () => {
    expect(validateProvider('Posílač')).toBe('Posílač');
  });
});

describe('buildIntegrationsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildIntegrationsUrl('my-project')).toBe('/p/my-project/data/integrations');
  });

  it('encodes special characters in project name', () => {
    expect(buildIntegrationsUrl('my project')).toBe('/p/my%20project/data/integrations');
  });

  it('handles project name with slashes', () => {
    expect(buildIntegrationsUrl('org/project')).toBe('/p/org%2Fproject/data/integrations');
  });

  it('encodes unicode project names', () => {
    expect(buildIntegrationsUrl('projekt åäö')).toContain('%C3%A5');
  });

  it('encodes hash in project name', () => {
    expect(buildIntegrationsUrl('my#project')).toBe('/p/my%23project/data/integrations');
  });
});

describe('createIntegrationActionExecutors', () => {
  it('returns executors for all six action types', () => {
    const executors = createIntegrationActionExecutors();
    expect(Object.keys(executors)).toHaveLength(6);
    expect(executors[CREATE_INTEGRATION_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_INTEGRATION_ACTION_TYPE]).toBeDefined();
    expect(executors[ENABLE_INTEGRATION_ACTION_TYPE]).toBeDefined();
    expect(executors[DISABLE_INTEGRATION_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_INTEGRATION_ACTION_TYPE]).toBeDefined();
    expect(executors[TEST_INTEGRATION_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property', () => {
    const executors = createIntegrationActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createIntegrationActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('executors throw UI-only availability message on execute', async () => {
    const executors = createIntegrationActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('CreateIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[CREATE_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('ConfigureIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[CONFIGURE_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('EnableIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[ENABLE_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DisableIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[DISABLE_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[DELETE_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('TestIntegrationExecutor mentions UI-only availability', async () => {
    const executors = createIntegrationActionExecutors();
    await expect(executors[TEST_INTEGRATION_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });
});

describe('apiConfig acceptance', () => {
  it('createIntegrationActionExecutors accepts apiConfig', () => {
    const executors = createIntegrationActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(6);
  });

  it('createIntegrationActionExecutors works without apiConfig', () => {
    const executors = createIntegrationActionExecutors();
    expect(Object.keys(executors)).toHaveLength(6);
  });

  it('BloomreachIntegrationsService accepts apiConfig', () => {
    const service = new BloomreachIntegrationsService('test', TEST_API_CONFIG);
    expect(service.integrationsUrl).toBe('/p/test/data/integrations');
  });

  it('BloomreachIntegrationsService works without apiConfig', () => {
    const service = new BloomreachIntegrationsService('test');
    expect(service.integrationsUrl).toBe('/p/test/data/integrations');
  });
});

describe('BloomreachIntegrationsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachIntegrationsService('my-project');
      expect(service).toBeInstanceOf(BloomreachIntegrationsService);
    });

    it('exposes the integrations URL', () => {
      const service = new BloomreachIntegrationsService('my-project');
      expect(service.integrationsUrl).toBe('/p/my-project/data/integrations');
    });

    it('trims project name', () => {
      const service = new BloomreachIntegrationsService('  my-project  ');
      expect(service.integrationsUrl).toBe('/p/my-project/data/integrations');
    });

    it('encodes spaces in URL', () => {
      const service = new BloomreachIntegrationsService('my project');
      expect(service.integrationsUrl).toBe('/p/my%20project/data/integrations');
    });

    it('encodes unicode in URL', () => {
      const service = new BloomreachIntegrationsService('projekt åäö');
      expect(service.integrationsUrl).toContain('%C3%A5');
    });

    it('encodes hash in URL', () => {
      const service = new BloomreachIntegrationsService('my#project');
      expect(service.integrationsUrl).toBe('/p/my%23project/data/integrations');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachIntegrationsService('')).toThrow('must not be empty');
    });
  });

  describe('read methods', () => {
    it('listIntegrations throws not-yet-implemented error', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(service.listIntegrations()).rejects.toThrow('not yet implemented');
    });

    it('viewIntegration throws not-yet-implemented error', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.viewIntegration({ project: 'test', integrationId: 'integ-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('listIntegrations throws descriptive UI-only error', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(service.listIntegrations()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewIntegration throws descriptive UI-only error', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.viewIntegration({ project: 'test', integrationId: 'integ-1' }),
      ).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listIntegrations validates project when input provided', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(service.listIntegrations({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listIntegrations validates type when provided', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.listIntegrations({ project: 'test', type: 'invalid-type' }),
      ).rejects.toThrow('Invalid integration type');
    });

    it('listIntegrations validates status when provided', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.listIntegrations({ project: 'test', status: 'bogus' }),
      ).rejects.toThrow('Invalid integration status');
    });

    it('viewIntegration validates project', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.viewIntegration({ project: '', integrationId: 'integ-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('viewIntegration validates integrationId', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.viewIntegration({ project: 'test', integrationId: '' }),
      ).rejects.toThrow('must not be empty');
    });

    it('viewIntegration validates whitespace-only integrationId', async () => {
      const service = new BloomreachIntegrationsService('test');
      await expect(
        service.viewIntegration({ project: 'test', integrationId: '   ' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareCreateIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareCreateIntegration({
        project: 'test',
        name: 'SendGrid ESP',
        type: 'esp',
        provider: 'SendGrid',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.create_integration',
          project: 'test',
          name: 'SendGrid ESP',
          type: 'esp',
          provider: 'SendGrid',
          hasCredentials: false,
          hasSettings: false,
        }),
      );
    });

    it('reports hasCredentials when credentials provided', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareCreateIntegration({
        project: 'test',
        name: 'SendGrid ESP',
        type: 'esp',
        provider: 'SendGrid',
        credentials: { apiKey: 'sk-xxx' },
      });

      expect(result.preview).toEqual(expect.objectContaining({ hasCredentials: true }));
    });

    it('reports hasSettings when settings provided', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareCreateIntegration({
        project: 'test',
        name: 'Webhook',
        type: 'webhook',
        provider: 'custom',
        settings: { endpoint: 'https://example.com/hook' },
      });

      expect(result.preview).toEqual(expect.objectContaining({ hasSettings: true }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareCreateIntegration({
        project: 'test',
        name: 'Twilio SMS',
        type: 'sms',
        provider: 'Twilio',
        operatorNote: 'Setting up SMS channel',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Setting up SMS channel' }),
      );
    });

    it('trims name value', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareCreateIntegration({
        project: 'test',
        name: '  SendGrid ESP  ',
        type: 'esp',
        provider: 'SendGrid',
      });
      expect(result.preview).toEqual(expect.objectContaining({ name: 'SendGrid ESP' }));
    });

    it('throws for empty name', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareCreateIntegration({
          project: 'test',
          name: '',
          type: 'esp',
          provider: 'SendGrid',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareCreateIntegration({
          project: '',
          name: 'Test',
          type: 'esp',
          provider: 'SendGrid',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid integration type', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareCreateIntegration({
          project: 'test',
          name: 'Test',
          type: 'invalid' as 'esp',
          provider: 'Test',
        }),
      ).toThrow('Invalid integration type');
    });

    it('throws for empty provider', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareCreateIntegration({
          project: 'test',
          name: 'Test',
          type: 'esp',
          provider: '',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareConfigureIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareConfigureIntegration({
        project: 'test',
        integrationId: 'integ-123',
        credentials: { apiKey: 'new-key' },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.configure_integration',
          project: 'test',
          integrationId: 'integ-123',
          updatesCredentials: true,
          updatesSettings: false,
        }),
      );
    });

    it('reports updatesSettings when settings provided', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareConfigureIntegration({
        project: 'test',
        integrationId: 'integ-123',
        settings: { timeout: 5000 },
      });

      expect(result.preview).toEqual(expect.objectContaining({ updatesSettings: true }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareConfigureIntegration({
        project: 'test',
        integrationId: 'integ-123',
        operatorNote: 'Rotating API key',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Rotating API key' }),
      );
    });

    it('throws for empty integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareConfigureIntegration({ project: 'test', integrationId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareConfigureIntegration({ project: 'test', integrationId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareConfigureIntegration({ project: '', integrationId: 'integ-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareEnableIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareEnableIntegration({
        project: 'test',
        integrationId: 'integ-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.enable_integration',
          project: 'test',
          integrationId: 'integ-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareEnableIntegration({
        project: 'test',
        integrationId: 'integ-123',
        operatorNote: 'Re-enabling after fix',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Re-enabling after fix' }),
      );
    });

    it('throws for empty integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareEnableIntegration({ project: 'test', integrationId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareEnableIntegration({ project: 'test', integrationId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareEnableIntegration({ project: '', integrationId: 'integ-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDisableIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareDisableIntegration({
        project: 'test',
        integrationId: 'integ-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.disable_integration',
          project: 'test',
          integrationId: 'integ-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareDisableIntegration({
        project: 'test',
        integrationId: 'integ-123',
        operatorNote: 'Temporarily disabling for maintenance',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Temporarily disabling for maintenance' }),
      );
    });

    it('throws for empty integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDisableIntegration({ project: 'test', integrationId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDisableIntegration({ project: 'test', integrationId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDisableIntegration({ project: '', integrationId: 'integ-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDeleteIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareDeleteIntegration({
        project: 'test',
        integrationId: 'integ-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.delete_integration',
          project: 'test',
          integrationId: 'integ-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareDeleteIntegration({
        project: 'test',
        integrationId: 'integ-456',
        operatorNote: 'Removing deprecated webhook',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Removing deprecated webhook' }),
      );
    });

    it('throws for empty integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDeleteIntegration({ project: 'test', integrationId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDeleteIntegration({ project: 'test', integrationId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareDeleteIntegration({ project: '', integrationId: 'integ-456' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareTestIntegration', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareTestIntegration({
        project: 'test',
        integrationId: 'integ-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'integrations.test_integration',
          project: 'test',
          integrationId: 'integ-789',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachIntegrationsService('test');
      const result = service.prepareTestIntegration({
        project: 'test',
        integrationId: 'integ-789',
        operatorNote: 'Verifying connectivity after config change',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Verifying connectivity after config change' }),
      );
    });

    it('throws for empty integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareTestIntegration({ project: 'test', integrationId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only integrationId', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareTestIntegration({ project: 'test', integrationId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachIntegrationsService('test');
      expect(() =>
        service.prepareTestIntegration({ project: '', integrationId: 'integ-789' }),
      ).toThrow('must not be empty');
    });
  });
});
