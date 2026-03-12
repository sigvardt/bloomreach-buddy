import { describe, it, expect } from 'vitest';
import {
  CREATE_DASHBOARD_ACTION_TYPE,
  SET_HOME_DASHBOARD_ACTION_TYPE,
  DELETE_DASHBOARD_ACTION_TYPE,
  DASHBOARD_RATE_LIMIT_WINDOW_MS,
  DASHBOARD_CREATE_RATE_LIMIT,
  DASHBOARD_MODIFY_RATE_LIMIT,
  validateDashboardName,
  validateProject,
  validateLayoutConfig,
  buildDashboardsUrl,
  createDashboardActionExecutors,
  BloomreachDashboardsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_DASHBOARD_ACTION_TYPE', () => {
    expect(CREATE_DASHBOARD_ACTION_TYPE).toBe('dashboards.create_dashboard');
  });

  it('exports SET_HOME_DASHBOARD_ACTION_TYPE', () => {
    expect(SET_HOME_DASHBOARD_ACTION_TYPE).toBe('dashboards.set_home_dashboard');
  });

  it('exports DELETE_DASHBOARD_ACTION_TYPE', () => {
    expect(DELETE_DASHBOARD_ACTION_TYPE).toBe('dashboards.delete_dashboard');
  });
});

describe('rate limit constants', () => {
  it('exports DASHBOARD_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(DASHBOARD_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports DASHBOARD_CREATE_RATE_LIMIT', () => {
    expect(DASHBOARD_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports DASHBOARD_MODIFY_RATE_LIMIT', () => {
    expect(DASHBOARD_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('validateDashboardName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateDashboardName('  My Dashboard  ')).toBe('My Dashboard');
  });

  it('accepts single-character name', () => {
    expect(validateDashboardName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateDashboardName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateDashboardName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateDashboardName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateDashboardName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateProject', () => {
  it('returns trimmed project for valid input', () => {
    expect(validateProject('  kingdom-of-joakim  ')).toBe('kingdom-of-joakim');
  });

  it('throws for empty string', () => {
    expect(() => validateProject('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateProject('   ')).toThrow('must not be empty');
  });
});

describe('validateLayoutConfig', () => {
  it('accepts config without columns', () => {
    expect(validateLayoutConfig({})).toEqual({});
  });

  it('accepts valid column count', () => {
    expect(validateLayoutConfig({ columns: 3 })).toEqual({ columns: 3 });
  });

  it('accepts minimum column count (1)', () => {
    expect(validateLayoutConfig({ columns: 1 })).toEqual({ columns: 1 });
  });

  it('accepts maximum column count (6)', () => {
    expect(validateLayoutConfig({ columns: 6 })).toEqual({ columns: 6 });
  });

  it('throws for column count below minimum', () => {
    expect(() => validateLayoutConfig({ columns: 0 })).toThrow('between 1 and 6');
  });

  it('throws for column count above maximum', () => {
    expect(() => validateLayoutConfig({ columns: 7 })).toThrow('between 1 and 6');
  });

  it('throws for non-integer column count', () => {
    expect(() => validateLayoutConfig({ columns: 2.5 })).toThrow('between 1 and 6');
  });
});

describe('buildDashboardsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildDashboardsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/dashboards');
  });

  it('encodes special characters in project name', () => {
    expect(buildDashboardsUrl('my project')).toBe('/p/my%20project/dashboards');
  });

  it('handles project name with slashes', () => {
    expect(buildDashboardsUrl('org/project')).toBe('/p/org%2Fproject/dashboards');
  });
});

describe('createDashboardActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createDashboardActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_DASHBOARD_ACTION_TYPE]).toBeDefined();
    expect(executors[SET_HOME_DASHBOARD_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_DASHBOARD_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property', () => {
    const executors = createDashboardActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createDashboardActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachDashboardsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachDashboardsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachDashboardsService);
    });

    it('exposes the dashboards URL', () => {
      const service = new BloomreachDashboardsService('kingdom-of-joakim');
      expect(service.dashboardsUrl).toBe('/p/kingdom-of-joakim/dashboards');
    });

    it('trims project name', () => {
      const service = new BloomreachDashboardsService('  my-project  ');
      expect(service.dashboardsUrl).toBe('/p/my-project/dashboards');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachDashboardsService('')).toThrow('must not be empty');
    });
  });

  describe('listDashboards', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDashboardsService('test');
      await expect(service.listDashboards()).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareCreateDashboard', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareCreateDashboard({
        project: 'test',
        name: 'My Dashboard',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dashboards.create_dashboard',
          project: 'test',
          name: 'My Dashboard',
          analysisCount: 0,
        }),
      );
    });

    it('includes analyses count in preview', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareCreateDashboard({
        project: 'test',
        name: 'Dashboard',
        analyses: [
          { id: 'a1', name: 'Analysis 1' },
          { id: 'a2', name: 'Analysis 2' },
        ],
      });

      expect(result.preview).toEqual(expect.objectContaining({ analysisCount: 2 }));
    });

    it('includes layout in preview', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareCreateDashboard({
        project: 'test',
        name: 'Dashboard',
        layout: { columns: 3 },
      });

      expect(result.preview).toEqual(expect.objectContaining({ layout: { columns: 3 } }));
    });

    it('defaults layout to 2 columns', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareCreateDashboard({
        project: 'test',
        name: 'Dashboard',
      });

      expect(result.preview).toEqual(expect.objectContaining({ layout: { columns: 2 } }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareCreateDashboard({
        project: 'test',
        name: 'Dashboard',
        operatorNote: 'Created for weekly review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for weekly review' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareCreateDashboard({ project: 'test', name: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareCreateDashboard({ project: '', name: 'Dashboard' }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid layout columns', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareCreateDashboard({
          project: 'test',
          name: 'Dashboard',
          layout: { columns: 10 },
        }),
      ).toThrow('between 1 and 6');
    });
  });

  describe('prepareSetHomeDashboard', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareSetHomeDashboard({
        project: 'test',
        dashboardId: 'dash-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dashboards.set_home_dashboard',
          project: 'test',
          dashboardId: 'dash-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareSetHomeDashboard({
        project: 'test',
        dashboardId: 'dash-123',
        operatorNote: 'Setting as default view',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Setting as default view' }),
      );
    });

    it('throws for empty dashboardId', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareSetHomeDashboard({ project: 'test', dashboardId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareSetHomeDashboard({ project: '', dashboardId: 'dash-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDeleteDashboard', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachDashboardsService('test');
      const result = service.prepareDeleteDashboard({
        project: 'test',
        dashboardId: 'dash-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dashboards.delete_dashboard',
          project: 'test',
          dashboardId: 'dash-456',
        }),
      );
    });

    it('throws for empty dashboardId', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareDeleteDashboard({ project: 'test', dashboardId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only dashboardId', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareDeleteDashboard({ project: 'test', dashboardId: '   ' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachDashboardsService('test');
      expect(() =>
        service.prepareDeleteDashboard({ project: '', dashboardId: 'dash-456' }),
      ).toThrow('must not be empty');
    });
  });
});
