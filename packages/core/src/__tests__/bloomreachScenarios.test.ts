import { describe, it, expect } from 'vitest';
import {
  CREATE_SCENARIO_ACTION_TYPE,
  START_SCENARIO_ACTION_TYPE,
  STOP_SCENARIO_ACTION_TYPE,
  CLONE_SCENARIO_ACTION_TYPE,
  ARCHIVE_SCENARIO_ACTION_TYPE,
  SCENARIO_RATE_LIMIT_WINDOW_MS,
  SCENARIO_CREATE_RATE_LIMIT,
  SCENARIO_MODIFY_RATE_LIMIT,
  SCENARIO_STATUSES,
  validateScenarioName,
  validateScenarioStatus,
  validateScenarioId,
  buildScenariosUrl,
  createScenarioActionExecutors,
  BloomreachScenariosService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_SCENARIO_ACTION_TYPE', () => {
    expect(CREATE_SCENARIO_ACTION_TYPE).toBe('scenarios.create_scenario');
  });

  it('exports START_SCENARIO_ACTION_TYPE', () => {
    expect(START_SCENARIO_ACTION_TYPE).toBe('scenarios.start_scenario');
  });

  it('exports STOP_SCENARIO_ACTION_TYPE', () => {
    expect(STOP_SCENARIO_ACTION_TYPE).toBe('scenarios.stop_scenario');
  });

  it('exports CLONE_SCENARIO_ACTION_TYPE', () => {
    expect(CLONE_SCENARIO_ACTION_TYPE).toBe('scenarios.clone_scenario');
  });

  it('exports ARCHIVE_SCENARIO_ACTION_TYPE', () => {
    expect(ARCHIVE_SCENARIO_ACTION_TYPE).toBe('scenarios.archive_scenario');
  });
});

describe('rate limit constants', () => {
  it('exports SCENARIO_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(SCENARIO_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports SCENARIO_CREATE_RATE_LIMIT', () => {
    expect(SCENARIO_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports SCENARIO_MODIFY_RATE_LIMIT', () => {
    expect(SCENARIO_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('SCENARIO_STATUSES', () => {
  it('contains 4 statuses', () => {
    expect(SCENARIO_STATUSES).toHaveLength(4);
  });

  it('contains expected statuses in order', () => {
    expect(SCENARIO_STATUSES).toEqual(['active', 'inactive', 'finishing', 'draft']);
  });
});

describe('validateScenarioName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateScenarioName('  My Scenario  ')).toBe('My Scenario');
  });

  it('accepts single-character name', () => {
    expect(validateScenarioName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateScenarioName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateScenarioName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateScenarioName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateScenarioName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateScenarioStatus', () => {
  it('accepts active', () => {
    expect(validateScenarioStatus('active')).toBe('active');
  });

  it('accepts inactive', () => {
    expect(validateScenarioStatus('inactive')).toBe('inactive');
  });

  it('accepts finishing', () => {
    expect(validateScenarioStatus('finishing')).toBe('finishing');
  });

  it('accepts draft', () => {
    expect(validateScenarioStatus('draft')).toBe('draft');
  });

  it('throws for unknown status', () => {
    expect(() => validateScenarioStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateScenarioStatus('')).toThrow('status must be one of');
  });
});

describe('validateScenarioId', () => {
  it('returns trimmed scenario ID for valid input', () => {
    expect(validateScenarioId('  scenario-123  ')).toBe('scenario-123');
  });

  it('throws for empty string', () => {
    expect(() => validateScenarioId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateScenarioId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateScenarioId('scenario-456')).toBe('scenario-456');
  });
});

describe('buildScenariosUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildScenariosUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/campaigns/campaign-designs',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildScenariosUrl('my project')).toBe('/p/my%20project/campaigns/campaign-designs');
  });

  it('encodes slashes in project name', () => {
    expect(buildScenariosUrl('org/project')).toBe('/p/org%2Fproject/campaigns/campaign-designs');
  });
});

describe('createScenarioActionExecutors', () => {
  it('returns executors for all five action types', () => {
    const executors = createScenarioActionExecutors();
    expect(Object.keys(executors)).toHaveLength(5);
    expect(executors[CREATE_SCENARIO_ACTION_TYPE]).toBeDefined();
    expect(executors[START_SCENARIO_ACTION_TYPE]).toBeDefined();
    expect(executors[STOP_SCENARIO_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_SCENARIO_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_SCENARIO_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createScenarioActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createScenarioActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachScenariosService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachScenariosService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachScenariosService);
    });

    it('exposes the scenarios URL', () => {
      const service = new BloomreachScenariosService('kingdom-of-joakim');
      expect(service.scenariosUrl).toBe('/p/kingdom-of-joakim/campaigns/campaign-designs');
    });

    it('trims project name', () => {
      const service = new BloomreachScenariosService('  my-project  ');
      expect(service.scenariosUrl).toBe('/p/my-project/campaigns/campaign-designs');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachScenariosService('')).toThrow('must not be empty');
    });
  });

  describe('listScenarios', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(service.listScenarios()).rejects.toThrow('not yet implemented');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(
        service.listScenarios({ project: 'test', status: 'paused' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(
        service.listScenarios({ project: '', status: 'active' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewScenario', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(
        service.viewScenario({ project: 'test', scenarioId: 'scenario-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(
        service.viewScenario({ project: '', scenarioId: 'scenario-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates scenarioId input', async () => {
      const service = new BloomreachScenariosService('test');
      await expect(
        service.viewScenario({ project: 'test', scenarioId: '   ' }),
      ).rejects.toThrow('Scenario ID must not be empty');
    });
  });

  describe('prepareCreateScenario', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCreateScenario({
        project: 'test',
        name: 'My Scenario',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'scenarios.create_scenario',
          project: 'test',
          name: 'My Scenario',
        }),
      );
    });

    it('includes tags in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCreateScenario({
        project: 'test',
        name: 'Tagged Scenario',
        tags: ['welcome', 'high-value'],
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ tags: ['welcome', 'high-value'] }),
      );
    });

    it('includes templateId in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCreateScenario({
        project: 'test',
        name: 'Templated Scenario',
        templateId: 'template-123',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ templateId: 'template-123' }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCreateScenario({
        project: 'test',
        name: 'Scenario',
        operatorNote: 'Created for campaign launch',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for campaign launch' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachScenariosService('test');
      expect(() => service.prepareCreateScenario({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareCreateScenario({ project: '', name: 'Scenario' }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareCreateScenario({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });
  });

  describe('prepareStartScenario', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareStartScenario({
        project: 'test',
        scenarioId: 'scenario-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'scenarios.start_scenario',
          project: 'test',
          scenarioId: 'scenario-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareStartScenario({
        project: 'test',
        scenarioId: 'scenario-123',
        operatorNote: 'Start after QA signoff',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Start after QA signoff' }),
      );
    });

    it('throws for empty scenarioId', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareStartScenario({ project: 'test', scenarioId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareStartScenario({ project: '', scenarioId: 'scenario-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareStopScenario', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareStopScenario({
        project: 'test',
        scenarioId: 'scenario-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'scenarios.stop_scenario',
          project: 'test',
          scenarioId: 'scenario-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareStopScenario({
        project: 'test',
        scenarioId: 'scenario-456',
        operatorNote: 'Pause due to maintenance',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Pause due to maintenance' }),
      );
    });

    it('throws for empty scenarioId', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareStopScenario({ project: 'test', scenarioId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareStopScenario({ project: '', scenarioId: 'scenario-456' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCloneScenario', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCloneScenario({
        project: 'test',
        scenarioId: 'scenario-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'scenarios.clone_scenario',
          project: 'test',
          scenarioId: 'scenario-789',
        }),
      );
    });

    it('includes newName in preview when provided', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareCloneScenario({
        project: 'test',
        scenarioId: 'scenario-789',
        newName: '  Cloned Scenario  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ newName: 'Cloned Scenario' }),
      );
    });

    it('throws for empty scenarioId', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareCloneScenario({ project: 'test', scenarioId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareCloneScenario({ project: '', scenarioId: 'scenario-789' }),
      ).toThrow('must not be empty');
    });

    it('throws when newName is whitespace only', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareCloneScenario({
          project: 'test',
          scenarioId: 'scenario-789',
          newName: '   ',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveScenario', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareArchiveScenario({
        project: 'test',
        scenarioId: 'scenario-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'scenarios.archive_scenario',
          project: 'test',
          scenarioId: 'scenario-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachScenariosService('test');
      const result = service.prepareArchiveScenario({
        project: 'test',
        scenarioId: 'scenario-900',
        operatorNote: 'Archive completed seasonal flow',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive completed seasonal flow' }),
      );
    });

    it('throws for empty scenarioId', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareArchiveScenario({ project: 'test', scenarioId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachScenariosService('test');
      expect(() =>
        service.prepareArchiveScenario({ project: '', scenarioId: 'scenario-900' }),
      ).toThrow('must not be empty');
    });
  });
});
