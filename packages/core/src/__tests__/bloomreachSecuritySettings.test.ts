import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';
import {
  CREATE_SSH_TUNNEL_ACTION_TYPE,
  UPDATE_SSH_TUNNEL_ACTION_TYPE,
  DELETE_SSH_TUNNEL_ACTION_TYPE,
  ENABLE_TWO_STEP_ACTION_TYPE,
  DISABLE_TWO_STEP_ACTION_TYPE,
  UPDATE_TWO_STEP_ACTION_TYPE,
  SECURITY_SETTINGS_RATE_LIMIT_WINDOW_MS,
  SECURITY_SETTINGS_SSH_TUNNEL_RATE_LIMIT,
  SECURITY_SETTINGS_TWO_STEP_RATE_LIMIT,
  validateTunnelName,
  validateHost,
  validatePort,
  validateUsername,
  validateTunnelId,
  buildSshTunnelsUrl,
  buildTwoStepVerificationUrl,
  createSecuritySettingsActionExecutors,
  BloomreachSecuritySettingsService,
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
  it('exports CREATE_SSH_TUNNEL_ACTION_TYPE', () => {
    expect(CREATE_SSH_TUNNEL_ACTION_TYPE).toBe('security_settings.create_ssh_tunnel');
  });

  it('exports UPDATE_SSH_TUNNEL_ACTION_TYPE', () => {
    expect(UPDATE_SSH_TUNNEL_ACTION_TYPE).toBe('security_settings.update_ssh_tunnel');
  });

  it('exports DELETE_SSH_TUNNEL_ACTION_TYPE', () => {
    expect(DELETE_SSH_TUNNEL_ACTION_TYPE).toBe('security_settings.delete_ssh_tunnel');
  });

  it('exports ENABLE_TWO_STEP_ACTION_TYPE', () => {
    expect(ENABLE_TWO_STEP_ACTION_TYPE).toBe('security_settings.enable_two_step');
  });

  it('exports DISABLE_TWO_STEP_ACTION_TYPE', () => {
    expect(DISABLE_TWO_STEP_ACTION_TYPE).toBe('security_settings.disable_two_step');
  });

  it('exports UPDATE_TWO_STEP_ACTION_TYPE', () => {
    expect(UPDATE_TWO_STEP_ACTION_TYPE).toBe('security_settings.update_two_step');
  });
});

describe('rate limit constants', () => {
  it('exports SECURITY_SETTINGS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(SECURITY_SETTINGS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports SECURITY_SETTINGS_SSH_TUNNEL_RATE_LIMIT', () => {
    expect(SECURITY_SETTINGS_SSH_TUNNEL_RATE_LIMIT).toBe(10);
  });

  it('exports SECURITY_SETTINGS_TWO_STEP_RATE_LIMIT', () => {
    expect(SECURITY_SETTINGS_TWO_STEP_RATE_LIMIT).toBe(10);
  });
});

describe('validateTunnelName', () => {
  it('throws for empty string', () => {
    expect(() => validateTunnelName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTunnelName('   ')).toThrow('must not be empty');
  });

  it('returns trimmed name for valid input', () => {
    expect(validateTunnelName('  Primary SSH Tunnel  ')).toBe('Primary SSH Tunnel');
  });

  it('accepts tunnel name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateTunnelName(name)).toBe(name);
  });

  it('throws for tunnel name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateTunnelName(name)).toThrow('must not exceed 200 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateTunnelName('\n\tPrimary Tunnel\t\n')).toBe('Primary Tunnel');
  });

  it('accepts single-character name', () => {
    expect(validateTunnelName('T')).toBe('T');
  });

  it('accepts unicode tunnel name', () => {
    expect(validateTunnelName('Produkční tunel')).toBe('Produkční tunel');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTunnelName('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTunnelName('\n\n')).toThrow('must not be empty');
  });
});

describe('validateHost', () => {
  it('throws for empty string', () => {
    expect(() => validateHost('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateHost('   ')).toThrow('must not be empty');
  });

  it('returns trimmed host for valid input', () => {
    expect(validateHost('  ssh.example.com  ')).toBe('ssh.example.com');
  });

  it('accepts host at maximum length', () => {
    const host = 'x'.repeat(253);
    expect(validateHost(host)).toBe(host);
  });

  it('throws for host exceeding maximum length', () => {
    const host = 'x'.repeat(254);
    expect(() => validateHost(host)).toThrow('must not exceed 253 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateHost('\n\tssh.example.com\t\n')).toBe('ssh.example.com');
  });

  it('accepts single-character host', () => {
    expect(validateHost('x')).toBe('x');
  });

  it('accepts unicode host', () => {
    expect(validateHost('ssh.ëxample.com')).toBe('ssh.ëxample.com');
  });

  it('throws for tab-only string', () => {
    expect(() => validateHost('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateHost('\n\n')).toThrow('must not be empty');
  });
});

describe('validatePort', () => {
  it('throws for 0', () => {
    expect(() => validatePort(0)).toThrow();
  });

  it('throws for negative value', () => {
    expect(() => validatePort(-1)).toThrow();
  });

  it('throws for value greater than 65535', () => {
    expect(() => validatePort(65536)).toThrow();
  });

  it('throws for non-integer value', () => {
    expect(() => validatePort(1.5)).toThrow();
  });

  it('accepts 1', () => {
    expect(validatePort(1)).toBe(1);
  });

  it('accepts 65535', () => {
    expect(validatePort(65535)).toBe(65535);
  });

  it('accepts typical SSH port', () => {
    expect(validatePort(22)).toBe(22);
  });

  it('throws for NaN', () => {
    expect(() => validatePort(NaN)).toThrow();
  });
});

describe('validateUsername', () => {
  it('throws for empty string', () => {
    expect(() => validateUsername('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateUsername('   ')).toThrow('must not be empty');
  });

  it('returns trimmed username for valid input', () => {
    expect(validateUsername('  deploy  ')).toBe('deploy');
  });

  it('accepts username at maximum length', () => {
    const username = 'x'.repeat(200);
    expect(validateUsername(username)).toBe(username);
  });

  it('throws for username exceeding maximum length', () => {
    const username = 'x'.repeat(201);
    expect(() => validateUsername(username)).toThrow('must not exceed 200 characters');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateUsername('\n\tdeploy\t\n')).toBe('deploy');
  });

  it('accepts single-character username', () => {
    expect(validateUsername('d')).toBe('d');
  });

  it('accepts unicode username', () => {
    expect(validateUsername('přístup')).toBe('přístup');
  });

  it('throws for tab-only string', () => {
    expect(() => validateUsername('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateUsername('\n\n')).toThrow('must not be empty');
  });
});

describe('validateTunnelId', () => {
  it('throws for empty string', () => {
    expect(() => validateTunnelId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateTunnelId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed tunnel ID for valid input', () => {
    expect(validateTunnelId('  tunnel-123  ')).toBe('tunnel-123');
  });

  it('returns trimmed value with tabs and newlines', () => {
    expect(validateTunnelId('\n\ttunnel-abc\t\n')).toBe('tunnel-abc');
  });

  it('accepts unicode tunnel ID', () => {
    expect(validateTunnelId('tunel-č123')).toBe('tunel-č123');
  });

  it('throws for tab-only string', () => {
    expect(() => validateTunnelId('\t\t')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateTunnelId('\n\n')).toThrow('must not be empty');
  });
});

describe('URL builders', () => {
  it('builds URLs for a simple project name', () => {
    expect(buildSshTunnelsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/ssh-tunnels',
    );
    expect(buildTwoStepVerificationUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/project-two-step',
    );
  });

  it('encodes spaces in URLs', () => {
    expect(buildSshTunnelsUrl('my project')).toBe('/p/my%20project/project-settings/ssh-tunnels');
    expect(buildTwoStepVerificationUrl('my project')).toBe(
      '/p/my%20project/project-settings/project-two-step',
    );
  });

  it('handles project names with slashes in URLs', () => {
    expect(buildSshTunnelsUrl('org/project')).toBe('/p/org%2Fproject/project-settings/ssh-tunnels');
    expect(buildTwoStepVerificationUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/project-two-step',
    );
  });

  it('encodes unicode project names in URLs', () => {
    expect(buildSshTunnelsUrl('projekt åäö')).toContain('%C3%A5');
    expect(buildTwoStepVerificationUrl('projekt åäö')).toContain('%C3%A5');
  });

  it('encodes hash in URLs', () => {
    expect(buildSshTunnelsUrl('my#project')).toBe('/p/my%23project/project-settings/ssh-tunnels');
    expect(buildTwoStepVerificationUrl('my#project')).toBe(
      '/p/my%23project/project-settings/project-two-step',
    );
  });
});

describe('createSecuritySettingsActionExecutors', () => {
  it('returns executors for all six action types', () => {
    const executors = createSecuritySettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(6);
    expect(executors[CREATE_SSH_TUNNEL_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_SSH_TUNNEL_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_SSH_TUNNEL_ACTION_TYPE]).toBeDefined();
    expect(executors[ENABLE_TWO_STEP_ACTION_TYPE]).toBeDefined();
    expect(executors[DISABLE_TWO_STEP_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_TWO_STEP_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching key', () => {
    const executors = createSecuritySettingsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createSecuritySettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });

  it('executors throw UI-only availability message on execute', async () => {
    const executors = createSecuritySettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow(
        'only available through the Bloomreach Engagement UI',
      );
    }
  });

  it('CreateSshTunnelExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[CREATE_SSH_TUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateSshTunnelExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[UPDATE_SSH_TUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DeleteSshTunnelExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[DELETE_SSH_TUNNEL_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('EnableTwoStepExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[ENABLE_TWO_STEP_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('DisableTwoStepExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[DISABLE_TWO_STEP_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });

  it('UpdateTwoStepExecutor mentions UI-only availability', async () => {
    const executors = createSecuritySettingsActionExecutors();
    await expect(executors[UPDATE_TWO_STEP_ACTION_TYPE].execute({})).rejects.toThrow(
      'only available through the Bloomreach Engagement UI',
    );
  });
});

describe('apiConfig acceptance', () => {
  it('createSecuritySettingsActionExecutors accepts apiConfig', () => {
    const executors = createSecuritySettingsActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(6);
  });

  it('createSecuritySettingsActionExecutors works without apiConfig', () => {
    const executors = createSecuritySettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(6);
  });

  it('BloomreachSecuritySettingsService accepts apiConfig', () => {
    const service = new BloomreachSecuritySettingsService('test', TEST_API_CONFIG);
    expect(service.sshTunnelsUrl).toBe('/p/test/project-settings/ssh-tunnels');
  });

  it('BloomreachSecuritySettingsService works without apiConfig', () => {
    const service = new BloomreachSecuritySettingsService('test');
    expect(service.sshTunnelsUrl).toBe('/p/test/project-settings/ssh-tunnels');
  });
});

describe('BloomreachSecuritySettingsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachSecuritySettingsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachSecuritySettingsService);
    });

    it('trims project name', () => {
      const service = new BloomreachSecuritySettingsService('  my-project  ');
      expect(service.sshTunnelsUrl).toBe('/p/my-project/project-settings/ssh-tunnels');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachSecuritySettingsService('')).toThrow('must not be empty');
    });

    it('encodes spaces in URL', () => {
      const service = new BloomreachSecuritySettingsService('my project');
      expect(service.sshTunnelsUrl).toBe('/p/my%20project/project-settings/ssh-tunnels');
    });

    it('encodes unicode in URL', () => {
      const service = new BloomreachSecuritySettingsService('projekt åäö');
      expect(service.sshTunnelsUrl).toContain('%C3%A5');
    });

    it('encodes hash in URL', () => {
      const service = new BloomreachSecuritySettingsService('my#project');
      expect(service.sshTunnelsUrl).toBe('/p/my%23project/project-settings/ssh-tunnels');
    });
  });

  describe('URL getters', () => {
    it('returns both security settings URLs', () => {
      const service = new BloomreachSecuritySettingsService('kingdom-of-joakim');
      expect(service.sshTunnelsUrl).toBe('/p/kingdom-of-joakim/project-settings/ssh-tunnels');
      expect(service.twoStepVerificationUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/project-two-step',
      );
    });
  });

  describe('read methods', () => {
    it('listSshTunnels throws not-yet-implemented error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.listSshTunnels()).rejects.toThrow('not yet implemented');
    });

    it('viewSshTunnel throws not-yet-implemented error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.viewSshTunnel()).rejects.toThrow('not yet implemented');
    });

    it('viewTwoStepVerification throws not-yet-implemented error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.viewTwoStepVerification()).rejects.toThrow('not yet implemented');
    });

    it('listSshTunnels throws descriptive UI-only error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.listSshTunnels()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewSshTunnel throws descriptive UI-only error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.viewSshTunnel()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('viewTwoStepVerification throws descriptive UI-only error', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.viewTwoStepVerification()).rejects.toThrow('Bloomreach Engagement UI');
    });

    it('listSshTunnels validates project when input provided', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(service.listSshTunnels({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('viewSshTunnel validates project when input provided', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(
        service.viewSshTunnel({ project: '', tunnelId: 'x' }),
      ).rejects.toThrow('must not be empty');
    });

    it('viewTwoStepVerification validates project when input provided', async () => {
      const service = new BloomreachSecuritySettingsService('test');
      await expect(
        service.viewTwoStepVerification({ project: '' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareCreateSshTunnel', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareCreateSshTunnel({
        project: 'test',
        name: 'Main tunnel',
        host: 'ssh.example.com',
        port: 22,
        username: 'deploy',
        operatorNote: 'create primary tunnel',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'security_settings.create_ssh_tunnel',
          project: 'test',
          name: 'Main tunnel',
          host: 'ssh.example.com',
          port: 22,
          username: 'deploy',
          operatorNote: 'create primary tunnel',
        }),
      );
    });

    it('trims name, host, and username values', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareCreateSshTunnel({
        project: 'test',
        name: '  Main tunnel  ',
        host: '  ssh.example.com  ',
        port: 22,
        username: '  deploy  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Main tunnel',
          host: 'ssh.example.com',
          username: 'deploy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareCreateSshTunnel({
          project: '',
          name: 'Main tunnel',
          host: 'ssh.example.com',
          port: 22,
          username: 'deploy',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty name', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareCreateSshTunnel({
          project: 'test',
          name: '',
          host: 'ssh.example.com',
          port: 22,
          username: 'deploy',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty host', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareCreateSshTunnel({
          project: 'test',
          name: 'Main tunnel',
          host: '',
          port: 22,
          username: 'deploy',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid port', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareCreateSshTunnel({
          project: 'test',
          name: 'Main tunnel',
          host: 'ssh.example.com',
          port: 0,
          username: 'deploy',
        }),
      ).toThrow();
    });
  });

  describe('prepareUpdateSshTunnel', () => {
    it('returns a prepared action with valid input and name field', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareUpdateSshTunnel({
        project: 'test',
        tunnelId: 'tunnel-1',
        name: 'Updated tunnel name',
        operatorNote: 'rename tunnel',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'security_settings.update_ssh_tunnel',
          project: 'test',
          tunnelId: 'tunnel-1',
          name: 'Updated tunnel name',
          operatorNote: 'rename tunnel',
        }),
      );
    });

    it('throws when no fields are provided for update', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareUpdateSshTunnel({
          project: 'test',
          tunnelId: 'tunnel-1',
        }),
      ).toThrow('At least one');
    });

    it('validates tunnel ID', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareUpdateSshTunnel({
          project: 'test',
          tunnelId: '',
          name: 'Updated tunnel name',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() =>
        service.prepareUpdateSshTunnel({
          project: '',
          tunnelId: 'tunnel-1',
          name: 'Updated tunnel name',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDeleteSshTunnel', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareDeleteSshTunnel({
        project: 'test',
        tunnelId: 'tunnel-2',
        operatorNote: 'remove stale tunnel',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'security_settings.delete_ssh_tunnel',
          project: 'test',
          tunnelId: 'tunnel-2',
          operatorNote: 'remove stale tunnel',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() => service.prepareDeleteSshTunnel({ project: '', tunnelId: 'tunnel-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty tunnel ID', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() => service.prepareDeleteSshTunnel({ project: 'test', tunnelId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareEnableTwoStep', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareEnableTwoStep({
        project: 'test',
        operatorNote: 'turn on 2sv',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'security_settings.enable_two_step',
          project: 'test',
          operatorNote: 'turn on 2sv',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() => service.prepareEnableTwoStep({ project: '' })).toThrow('must not be empty');
    });
  });

  describe('prepareDisableTwoStep', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const result = service.prepareDisableTwoStep({
        project: 'test',
        operatorNote: 'turn off 2sv',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'security_settings.disable_two_step',
          project: 'test',
          operatorNote: 'turn off 2sv',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachSecuritySettingsService('test');
      expect(() => service.prepareDisableTwoStep({ project: '' })).toThrow('must not be empty');
    });
  });

  describe('token expiry consistency', () => {
    it('all prepare methods set expiry ~30 minutes in the future', () => {
      const service = new BloomreachSecuritySettingsService('test');
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;

      const results = [
        service.prepareCreateSshTunnel({
          project: 'test',
          name: 'T',
          host: 'h',
          port: 22,
          username: 'u',
        }),
        service.prepareUpdateSshTunnel({
          project: 'test',
          tunnelId: 't-1',
          name: 'T2',
        }),
        service.prepareDeleteSshTunnel({ project: 'test', tunnelId: 't-1' }),
        service.prepareEnableTwoStep({ project: 'test' }),
        service.prepareDisableTwoStep({ project: 'test' }),
      ];

      for (const result of results) {
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + thirtyMinMs - 1000);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + thirtyMinMs + 5000);
      }
    });
  });
});
