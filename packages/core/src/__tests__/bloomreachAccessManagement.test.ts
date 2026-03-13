import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  INVITE_TEAM_MEMBER_ACTION_TYPE,
  UPDATE_MEMBER_ROLE_ACTION_TYPE,
  REMOVE_TEAM_MEMBER_ACTION_TYPE,
  CREATE_API_KEY_ACTION_TYPE,
  DELETE_API_KEY_ACTION_TYPE,
  ACCESS_RATE_LIMIT_WINDOW_MS,
  ACCESS_INVITE_RATE_LIMIT,
  ACCESS_MODIFY_RATE_LIMIT,
  ACCESS_API_KEY_RATE_LIMIT,
  TEAM_MEMBER_ROLES,
  validateEmail,
  validateMemberRole,
  validateMemberId,
  validateApiKeyName,
  validateApiKeyId,
  buildProjectTeamUrl,
  buildApiKeysUrl,
  createAccessActionExecutors,
  BloomreachAccessManagementService,
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
  it('exports INVITE_TEAM_MEMBER_ACTION_TYPE', () => {
    expect(INVITE_TEAM_MEMBER_ACTION_TYPE).toBe('access.invite_team_member');
  });

  it('exports UPDATE_MEMBER_ROLE_ACTION_TYPE', () => {
    expect(UPDATE_MEMBER_ROLE_ACTION_TYPE).toBe('access.update_member_role');
  });

  it('exports REMOVE_TEAM_MEMBER_ACTION_TYPE', () => {
    expect(REMOVE_TEAM_MEMBER_ACTION_TYPE).toBe('access.remove_team_member');
  });

  it('exports CREATE_API_KEY_ACTION_TYPE', () => {
    expect(CREATE_API_KEY_ACTION_TYPE).toBe('access.create_api_key');
  });

  it('exports DELETE_API_KEY_ACTION_TYPE', () => {
    expect(DELETE_API_KEY_ACTION_TYPE).toBe('access.delete_api_key');
  });
});

describe('rate limit constants', () => {
  it('exports ACCESS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(ACCESS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports ACCESS_INVITE_RATE_LIMIT', () => {
    expect(ACCESS_INVITE_RATE_LIMIT).toBe(20);
  });

  it('exports ACCESS_MODIFY_RATE_LIMIT', () => {
    expect(ACCESS_MODIFY_RATE_LIMIT).toBe(30);
  });

  it('exports ACCESS_API_KEY_RATE_LIMIT', () => {
    expect(ACCESS_API_KEY_RATE_LIMIT).toBe(10);
  });
});

describe('TEAM_MEMBER_ROLES', () => {
  it('contains expected roles', () => {
    expect(TEAM_MEMBER_ROLES).toEqual(['admin', 'manager', 'analyst', 'editor', 'viewer']);
  });
});

describe('validateEmail', () => {
  it('returns valid email', () => {
    expect(validateEmail('person@example.com')).toBe('person@example.com');
  });

  it('trims email', () => {
    expect(validateEmail('  person@example.com  ')).toBe('person@example.com');
  });

  it('throws for empty email', () => {
    expect(() => validateEmail('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateEmail('   ')).toThrow('must not be empty');
  });

  it('throws for no at-sign', () => {
    expect(() => validateEmail('person.example.com')).toThrow('must contain "@"');
  });

  it('throws for at-sign at start', () => {
    expect(() => validateEmail('@example.com')).toThrow('must contain "@"');
  });

  it('throws for at-sign at end', () => {
    expect(() => validateEmail('person@')).toThrow('must contain "@"');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateEmail('\n\tperson@example.com\t\n')).toBe('person@example.com');
  });

  it('throws for tab-only string', () => {
    expect(() => validateEmail('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateEmail('\n\n')).toThrow('must not be empty');
  });
});

describe('validateMemberRole', () => {
  it('returns valid role', () => {
    expect(validateMemberRole('admin')).toBe('admin');
  });

  it('accepts all valid roles', () => {
    for (const role of TEAM_MEMBER_ROLES) {
      expect(validateMemberRole(role)).toBe(role);
    }
  });

  it('throws for invalid role', () => {
    expect(() => validateMemberRole('owner')).toThrow('must be one of');
  });

  it('throws for empty string', () => {
    expect(() => validateMemberRole('')).toThrow('must be one of');
  });

  it('throws for role with wrong case', () => {
    expect(() => validateMemberRole('Admin')).toThrow('must be one of');
  });
});

describe('validateMemberId', () => {
  it('returns valid ID', () => {
    expect(validateMemberId('member-123')).toBe('member-123');
  });

  it('trims ID', () => {
    expect(validateMemberId('  member-123  ')).toBe('member-123');
  });

  it('throws for empty ID', () => {
    expect(() => validateMemberId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateMemberId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateMemberId('\n\tmember-abc\t\n')).toBe('member-abc');
  });

  it('accepts unicode member ID', () => {
    expect(validateMemberId('člen-123')).toBe('člen-123');
  });

  it('throws for tab-only string', () => {
    expect(() => validateMemberId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateMemberId('\n\n')).toThrow('must not be empty');
  });
});

describe('validateApiKeyName', () => {
  it('returns valid name', () => {
    expect(validateApiKeyName('Server-to-Server')).toBe('Server-to-Server');
  });

  it('trims name', () => {
    expect(validateApiKeyName('  Private API Key  ')).toBe('Private API Key');
  });

  it('accepts minimum length name', () => {
    expect(validateApiKeyName('a')).toBe('a');
  });

  it('accepts max length name', () => {
    const name = 'x'.repeat(200);
    expect(validateApiKeyName(name)).toBe(name);
  });

  it('throws for empty name', () => {
    expect(() => validateApiKeyName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateApiKeyName('   ')).toThrow('must not be empty');
  });

  it('throws for too long name', () => {
    const name = 'x'.repeat(201);
    expect(() => validateApiKeyName(name)).toThrow('must not exceed 200 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateApiKeyName('\n\tServer Key\t\n')).toBe('Server Key');
  });

  it('accepts unicode key name', () => {
    expect(validateApiKeyName('Produkční klíč')).toBe('Produkční klíč');
  });

  it('throws for tab-only string', () => {
    expect(() => validateApiKeyName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateApiKeyName('\n\n')).toThrow('must not be empty');
  });
});

describe('validateApiKeyId', () => {
  it('returns valid ID', () => {
    expect(validateApiKeyId('key-123')).toBe('key-123');
  });

  it('trims ID', () => {
    expect(validateApiKeyId('  key-123  ')).toBe('key-123');
  });

  it('throws for empty ID', () => {
    expect(() => validateApiKeyId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateApiKeyId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateApiKeyId('\n\tkey-abc\t\n')).toBe('key-abc');
  });

  it('accepts unicode key ID', () => {
    expect(validateApiKeyId('klíč-123')).toBe('klíč-123');
  });

  it('throws for tab-only string', () => {
    expect(() => validateApiKeyId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateApiKeyId('\n\n')).toThrow('must not be empty');
  });
});

describe('URL builders', () => {
  it('builds URLs for a simple project name', () => {
    expect(buildProjectTeamUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/project-team-v2',
    );
    expect(buildApiKeysUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/api',
    );
  });

  it('encodes spaces in URLs', () => {
    expect(buildProjectTeamUrl('my project')).toBe(
      '/p/my%20project/project-settings/project-team-v2',
    );
    expect(buildApiKeysUrl('my project')).toBe('/p/my%20project/project-settings/api');
  });

  it('handles project names with slashes in URLs', () => {
    expect(buildProjectTeamUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/project-team-v2',
    );
    expect(buildApiKeysUrl('org/project')).toBe('/p/org%2Fproject/project-settings/api');
  });

  it('encodes unicode project names in URLs', () => {
    expect(buildProjectTeamUrl('projekt åäö')).toContain('%C3%A5');
    expect(buildApiKeysUrl('projekt åäö')).toContain('%C3%A5');
  });

  it('encodes hash in URLs', () => {
    expect(buildProjectTeamUrl('my#project')).toBe(
      '/p/my%23project/project-settings/project-team-v2',
    );
    expect(buildApiKeysUrl('my#project')).toBe('/p/my%23project/project-settings/api');
  });
});

describe('createAccessActionExecutors', () => {
  it('returns executors for all five action types', () => {
    const executors = createAccessActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[INVITE_TEAM_MEMBER_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_MEMBER_ROLE_ACTION_TYPE]).toBeDefined();
    expect(executors[REMOVE_TEAM_MEMBER_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_API_KEY_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_API_KEY_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching key', () => {
    const executors = createAccessActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createAccessActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('executors throw UI-only availability message on execute', async () => {
    const executors = createAccessActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('InviteTeamMemberExecutor mentions UI-only availability', async () => {
    const executors = createAccessActionExecutors();
    await expect(executors[INVITE_TEAM_MEMBER_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateMemberRoleExecutor mentions UI-only availability', async () => {
    const executors = createAccessActionExecutors();
    await expect(executors[UPDATE_MEMBER_ROLE_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('RemoveTeamMemberExecutor mentions UI-only availability', async () => {
    const executors = createAccessActionExecutors();
    await expect(executors[REMOVE_TEAM_MEMBER_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('CreateApiKeyExecutor mentions UI-only availability', async () => {
    const executors = createAccessActionExecutors();
    await expect(executors[CREATE_API_KEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteApiKeyExecutor mentions UI-only availability', async () => {
    const executors = createAccessActionExecutors();
    await expect(executors[DELETE_API_KEY_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });
});

describe('apiConfig acceptance', () => {
  it('createAccessActionExecutors accepts apiConfig', () => {
    const executors = createAccessActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('createAccessActionExecutors works without apiConfig', () => {
    const executors = createAccessActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
  });

  it('BloomreachAccessManagementService accepts apiConfig', () => {
    const service = new BloomreachAccessManagementService('test', TEST_API_CONFIG);
    expect(service.projectTeamUrl).toBe('/p/test/project-settings/project-team-v2');
  });

  it('BloomreachAccessManagementService works without apiConfig', () => {
    const service = new BloomreachAccessManagementService('test');
    expect(service.projectTeamUrl).toBe('/p/test/project-settings/project-team-v2');
  });
});

describe('BloomreachAccessManagementService', () => {
  describe('constructor', () => {
    it('creates instance', () => {
      const service = new BloomreachAccessManagementService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachAccessManagementService);
    });

    it('exposes URLs', () => {
      const service = new BloomreachAccessManagementService('kingdom-of-joakim');
      expect(service.projectTeamUrl).toBe('/p/kingdom-of-joakim/project-settings/project-team-v2');
      expect(service.apiKeysUrl).toBe('/p/kingdom-of-joakim/project-settings/api');
    });

    it('trims project', () => {
      const service = new BloomreachAccessManagementService('  my-project  ');
      expect(service.projectTeamUrl).toBe('/p/my-project/project-settings/project-team-v2');
      expect(service.apiKeysUrl).toBe('/p/my-project/project-settings/api');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachAccessManagementService('')).toThrow('must not be empty');
    });

    it('encodes spaces in URL', () => {
      const service = new BloomreachAccessManagementService('my project');
      expect(service.projectTeamUrl).toBe('/p/my%20project/project-settings/project-team-v2');
    });

    it('encodes unicode in URL', () => {
      const service = new BloomreachAccessManagementService('projekt åäö');
      expect(service.projectTeamUrl).toContain('%C3%A5');
    });

    it('encodes hash in URL', () => {
      const service = new BloomreachAccessManagementService('my#project');
      expect(service.projectTeamUrl).toBe('/p/my%23project/project-settings/project-team-v2');
    });
  });

  describe('URL getters', () => {
    it('returns both access management URLs', () => {
      const service = new BloomreachAccessManagementService('kingdom-of-joakim');
      expect(service.projectTeamUrl).toBe('/p/kingdom-of-joakim/project-settings/project-team-v2');
      expect(service.apiKeysUrl).toBe('/p/kingdom-of-joakim/project-settings/api');
    });
  });

  describe('read methods', () => {
    it('listTeamMembers throws not-yet-implemented error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listTeamMembers()).rejects.toThrow('not yet implemented');
    });

    it('listApiKeys throws not-yet-implemented error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listApiKeys()).rejects.toThrow('not yet implemented');
    });

    it('listTeamMembers throws descriptive UI-only error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listTeamMembers()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listApiKeys throws descriptive UI-only error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listApiKeys()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listTeamMembers validates project when input provided', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listTeamMembers({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('listApiKeys validates project when input provided', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listApiKeys({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareInviteTeamMember', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareInviteTeamMember({
        project: 'test',
        email: 'member@example.com',
        role: 'manager',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'access.invite_team_member',
          project: 'test',
          email: 'member@example.com',
          role: 'manager',
        }),
      );
    });

    it('trims email value', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareInviteTeamMember({
        project: 'test',
        email: '  member@example.com  ',
        role: 'admin',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          email: 'member@example.com',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareInviteTeamMember({
        project: 'test',
        email: 'member@example.com',
        role: 'editor',
        operatorNote: 'invited for content team',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'invited for content team',
        }),
      );
    });

    it('throws for empty email', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareInviteTeamMember({ project: 'test', email: '', role: 'admin' }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid email', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareInviteTeamMember({
          project: 'test',
          email: 'invalid-email',
          role: 'admin',
        }),
      ).toThrow('must contain "@"');
    });

    it('throws for invalid role', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareInviteTeamMember({
          project: 'test',
          email: 'member@example.com',
          role: 'owner',
        }),
      ).toThrow('must be one of');
    });

    it('throws for empty project', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareInviteTeamMember({
          project: '',
          email: 'member@example.com',
          role: 'admin',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateMemberRole', () => {
    it('returns prepared action', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareUpdateMemberRole({
        project: 'test',
        memberId: 'mem-123',
        role: 'editor',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'access.update_member_role',
          project: 'test',
          memberId: 'mem-123',
          role: 'editor',
        }),
      );
    });

    it('trims memberId value', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareUpdateMemberRole({
        project: 'test',
        memberId: '  mem-123  ',
        role: 'viewer',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          memberId: 'mem-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareUpdateMemberRole({
        project: 'test',
        memberId: 'mem-123',
        role: 'analyst',
        operatorNote: 'promoted to analyst',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'promoted to analyst',
        }),
      );
    });

    it('throws for empty memberId', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareUpdateMemberRole({ project: 'test', memberId: '', role: 'editor' }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid role', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareUpdateMemberRole({
          project: 'test',
          memberId: 'mem-123',
          role: 'owner',
        }),
      ).toThrow('must be one of');
    });

    it('throws for empty project', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareUpdateMemberRole({ project: '', memberId: 'mem-123', role: 'editor' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareRemoveTeamMember', () => {
    it('returns prepared action', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareRemoveTeamMember({
        project: 'test',
        memberId: 'mem-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'access.remove_team_member',
          project: 'test',
          memberId: 'mem-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareRemoveTeamMember({
        project: 'test',
        memberId: 'mem-456',
        operatorNote: 'left the company',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'left the company',
        }),
      );
    });

    it('throws for empty memberId', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareRemoveTeamMember({ project: 'test', memberId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareRemoveTeamMember({ project: '', memberId: 'mem-456' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateApiKey', () => {
    it('returns prepared action', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareCreateApiKey({
        project: 'test',
        name: 'My API Key',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'access.create_api_key',
          project: 'test',
          name: 'My API Key',
        }),
      );
    });

    it('trims name value', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareCreateApiKey({
        project: 'test',
        name: '  Server Key  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Server Key',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareCreateApiKey({
        project: 'test',
        name: 'Server Key',
        operatorNote: 'for production server',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'for production server',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareCreateApiKey({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for too long name', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() =>
        service.prepareCreateApiKey({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for empty project', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareCreateApiKey({ project: '', name: 'My API Key' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareDeleteApiKey', () => {
    it('returns prepared action', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareDeleteApiKey({
        project: 'test',
        apiKeyId: 'key-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'access.delete_api_key',
          project: 'test',
          apiKeyId: 'key-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachAccessManagementService('test');
      const result = service.prepareDeleteApiKey({
        project: 'test',
        apiKeyId: 'key-456',
        operatorNote: 'rotating keys',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'rotating keys',
        }),
      );
    });

    it('throws for empty apiKeyId', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareDeleteApiKey({ project: 'test', apiKeyId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachAccessManagementService('test');
      expect(() => service.prepareDeleteApiKey({ project: '', apiKeyId: 'key-456' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('token expiry consistency', () => {
    it('all prepare methods set expiry ~30 minutes in the future', () => {
      const service = new BloomreachAccessManagementService('test');
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;

      const results = [
        service.prepareInviteTeamMember({
          project: 'test',
          email: 'a@b.com',
          role: 'admin',
        }),
        service.prepareUpdateMemberRole({
          project: 'test',
          memberId: 'm-1',
          role: 'editor',
        }),
        service.prepareRemoveTeamMember({ project: 'test', memberId: 'm-1' }),
        service.prepareCreateApiKey({ project: 'test', name: 'K' }),
        service.prepareDeleteApiKey({ project: 'test', apiKeyId: 'k-1' }),
      ];

      for (const result of results) {
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + thirtyMinMs - 1000);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + thirtyMinMs + 5000);
      }
    });
  });
});
