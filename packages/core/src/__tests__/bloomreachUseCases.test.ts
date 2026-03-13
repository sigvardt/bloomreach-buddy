import { describe, it, expect } from 'vitest';
import {
  DEPLOY_USE_CASE_ACTION_TYPE,
  FAVORITE_USE_CASE_ACTION_TYPE,
  UNFAVORITE_USE_CASE_ACTION_TYPE,
  USE_CASE_RATE_LIMIT_WINDOW_MS,
  USE_CASE_DEPLOY_RATE_LIMIT,
  USE_CASE_FAVORITE_RATE_LIMIT,
  USE_CASE_GOAL_CATEGORIES,
  USE_CASE_TAGS,
  validateUseCaseId,
  validateUseCaseSearchQuery,
  validateGoalCategory,
  validateUseCaseTag,
  buildUseCasesUrl,
  createUseCaseActionExecutors,
  BloomreachUseCasesService,
} from '../index.js';

describe('action type constants', () => {
  it('exports DEPLOY_USE_CASE_ACTION_TYPE', () => {
    expect(DEPLOY_USE_CASE_ACTION_TYPE).toBe('use_cases.deploy');
  });

  it('exports FAVORITE_USE_CASE_ACTION_TYPE', () => {
    expect(FAVORITE_USE_CASE_ACTION_TYPE).toBe('use_cases.favorite');
  });

  it('exports UNFAVORITE_USE_CASE_ACTION_TYPE', () => {
    expect(UNFAVORITE_USE_CASE_ACTION_TYPE).toBe('use_cases.unfavorite');
  });
});

describe('rate limit constants', () => {
  it('exports USE_CASE_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(USE_CASE_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports USE_CASE_DEPLOY_RATE_LIMIT', () => {
    expect(USE_CASE_DEPLOY_RATE_LIMIT).toBe(5);
  });

  it('exports USE_CASE_FAVORITE_RATE_LIMIT', () => {
    expect(USE_CASE_FAVORITE_RATE_LIMIT).toBe(20);
  });
});

describe('USE_CASE_GOAL_CATEGORIES', () => {
  it('contains 4 categories', () => {
    expect(USE_CASE_GOAL_CATEGORIES).toHaveLength(4);
  });

  it('contains expected categories in order', () => {
    expect(USE_CASE_GOAL_CATEGORIES).toEqual([
      'awareness',
      'acquisition',
      'retention',
      'optimization',
    ]);
  });
});

describe('USE_CASE_TAGS', () => {
  it('contains 3 tags', () => {
    expect(USE_CASE_TAGS).toHaveLength(3);
  });

  it('contains expected tags in order', () => {
    expect(USE_CASE_TAGS).toEqual(['new', 'essentials', 'popular']);
  });
});

describe('validateUseCaseId', () => {
  it('returns trimmed ID for valid input', () => {
    expect(validateUseCaseId('  use-case-123  ')).toBe('use-case-123');
  });

  it('throws for empty string', () => {
    expect(() => validateUseCaseId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateUseCaseId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateUseCaseId('use-case-456')).toBe('use-case-456');
  });
});

describe('validateUseCaseSearchQuery', () => {
  it('returns trimmed query for valid input', () => {
    expect(validateUseCaseSearchQuery('  personalization  ')).toBe('personalization');
  });

  it('throws for empty string', () => {
    expect(() => validateUseCaseSearchQuery('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateUseCaseSearchQuery('   ')).toThrow('must not be empty');
  });
});

describe('validateGoalCategory', () => {
  it('accepts awareness', () => {
    expect(validateGoalCategory('awareness')).toBe('awareness');
  });

  it('accepts acquisition', () => {
    expect(validateGoalCategory('acquisition')).toBe('acquisition');
  });

  it('accepts retention', () => {
    expect(validateGoalCategory('retention')).toBe('retention');
  });

  it('accepts optimization', () => {
    expect(validateGoalCategory('optimization')).toBe('optimization');
  });

  it('throws for unknown category', () => {
    expect(() => validateGoalCategory('activation')).toThrow('category must be one of');
  });

  it('throws for empty category', () => {
    expect(() => validateGoalCategory('')).toThrow('category must be one of');
  });
});

describe('validateUseCaseTag', () => {
  it('accepts new', () => {
    expect(validateUseCaseTag('new')).toBe('new');
  });

  it('accepts essentials', () => {
    expect(validateUseCaseTag('essentials')).toBe('essentials');
  });

  it('accepts popular', () => {
    expect(validateUseCaseTag('popular')).toBe('popular');
  });

  it('throws for unknown tag', () => {
    expect(() => validateUseCaseTag('trending')).toThrow('tag must be one of');
  });

  it('throws for empty tag', () => {
    expect(() => validateUseCaseTag('')).toThrow('tag must be one of');
  });
});

describe('buildUseCasesUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildUseCasesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/use-case-center/use-case-center',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildUseCasesUrl('my project')).toBe('/p/my%20project/use-case-center/use-case-center');
  });

  it('encodes slashes in project name', () => {
    expect(buildUseCasesUrl('org/project')).toBe('/p/org%2Fproject/use-case-center/use-case-center');
  });
});

describe('createUseCaseActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createUseCaseActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[DEPLOY_USE_CASE_ACTION_TYPE]).toBeDefined();
    expect(executors[FAVORITE_USE_CASE_ACTION_TYPE]).toBeDefined();
    expect(executors[UNFAVORITE_USE_CASE_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createUseCaseActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createUseCaseActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachUseCasesService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachUseCasesService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachUseCasesService);
    });

    it('exposes the use cases URL', () => {
      const service = new BloomreachUseCasesService('kingdom-of-joakim');
      expect(service.useCasesUrl).toBe('/p/kingdom-of-joakim/use-case-center/use-case-center');
    });

    it('trims project name', () => {
      const service = new BloomreachUseCasesService('  my-project  ');
      expect(service.useCasesUrl).toBe('/p/my-project/use-case-center/use-case-center');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachUseCasesService('')).toThrow('must not be empty');
    });
  });

  describe('listUseCases', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listUseCases()).rejects.toThrow('not yet implemented');
    });

    it('validates category when provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.listUseCases({ project: 'test', category: 'activation' }),
      ).rejects.toThrow('category must be one of');
    });

    it('validates tag when provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.listUseCases({ project: 'test', tag: 'trending' }),
      ).rejects.toThrow('tag must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.listUseCases({ project: '', category: 'awareness', tag: 'new' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('searchUseCases', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({ project: 'test', query: 'cart abandonment' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({ project: '', query: 'cart abandonment' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates query (empty throws)', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.searchUseCases({ project: 'test', query: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates category when provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({
          project: 'test',
          query: 'cart abandonment',
          category: 'activation',
        }),
      ).rejects.toThrow('category must be one of');
    });

    it('validates tag when provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({
          project: 'test',
          query: 'cart abandonment',
          tag: 'trending',
        }),
      ).rejects.toThrow('tag must be one of');
    });
  });

  describe('viewUseCase', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: 'test', useCaseId: 'use-case-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: '', useCaseId: 'use-case-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates useCaseId input with empty string', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.viewUseCase({ project: 'test', useCaseId: '' })).rejects.toThrow(
        'must not be empty',
      );
    });

    it('validates useCaseId input with whitespace', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.viewUseCase({ project: 'test', useCaseId: '   ' })).rejects.toThrow(
        'must not be empty',
      );
    });
  });

  describe('listProjectUseCases', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareDeployUseCase', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'use-case-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.deploy',
          project: 'test',
          useCaseId: 'use-case-123',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'use-case-123',
        operatorNote: 'Deploy after QA signoff',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Deploy after QA signoff' }),
      );
    });

    it('throws for empty useCaseId', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareDeployUseCase({ project: 'test', useCaseId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareDeployUseCase({ project: '', useCaseId: 'use-case-123' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareFavoriteUseCase', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-456',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.favorite',
          project: 'test',
          useCaseId: 'use-case-456',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-456',
        operatorNote: 'Favorite for launch team',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Favorite for launch team' }),
      );
    });

    it('throws for empty useCaseId', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareFavoriteUseCase({ project: 'test', useCaseId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareFavoriteUseCase({ project: '', useCaseId: 'use-case-456' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUnfavoriteUseCase', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-789',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.unfavorite',
          project: 'test',
          useCaseId: 'use-case-789',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-789',
        operatorNote: 'Unfavorite stale item',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Unfavorite stale item' }),
      );
    });

    it('throws for empty useCaseId', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareUnfavoriteUseCase({ project: 'test', useCaseId: '' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareUnfavoriteUseCase({ project: '', useCaseId: 'use-case-789' }),
      ).toThrow('must not be empty');
    });
  });
});
