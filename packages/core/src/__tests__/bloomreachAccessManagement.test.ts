import { describe, it, expect } from 'vitest';
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

  it('throws for no at-sign', () => {
    expect(() => validateEmail('person.example.com')).toThrow('must contain "@"');
  });

  it('throws for at-sign at start', () => {
    expect(() => validateEmail('@example.com')).toThrow('must contain "@"');
  });

  it('throws for at-sign at end', () => {
    expect(() => validateEmail('person@')).toThrow('must contain "@"');
  });
});

describe('validateMemberRole', () => {
  it('returns valid role', () => {
    expect(validateMemberRole('admin')).toBe('admin');
  });

  it('throws for invalid role', () => {
    expect(() => validateMemberRole('owner')).toThrow('must be one of');
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

  it('throws for too long name', () => {
    const name = 'x'.repeat(201);
    expect(() => validateApiKeyName(name)).toThrow('must not exceed 200 characters');
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
});

describe('buildProjectTeamUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildProjectTeamUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/project-team-v2',
    );
  });

  it('encodes special characters in project name', () => {
    expect(buildProjectTeamUrl('my project')).toBe('/p/my%20project/project-settings/project-team-v2');
  });
});

describe('buildApiKeysUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildApiKeysUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/project-settings/api');
  });

  it('encodes special characters in project name', () => {
    expect(buildApiKeysUrl('my project')).toBe('/p/my%20project/project-settings/api');
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

  it('each executor has an actionType property', () => {
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
  });

  describe('listTeamMembers', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listTeamMembers()).rejects.toThrow('not yet implemented');
    });
  });

  describe('listApiKeys', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachAccessManagementService('test');
      await expect(service.listApiKeys()).rejects.toThrow('not yet implemented');
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
});
