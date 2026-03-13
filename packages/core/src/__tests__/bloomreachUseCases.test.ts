import { describe, it, expect, vi, afterEach } from 'vitest';
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
import type { BloomreachApiConfig } from '../bloomreachApiClient.js';

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

  it('accepts use case ID with dots and dashes', () => {
    expect(validateUseCaseId('use-case-123.abc')).toBe('use-case-123.abc');
  });

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validateUseCaseId('\t use-case-123 \t')).toBe('use-case-123');
  });

  it('handles newline-only input', () => {
    expect(() => validateUseCaseId('\n\n')).toThrow('must not be empty');
  });

  it('handles tab-only input', () => {
    expect(() => validateUseCaseId('\t\t')).toThrow('must not be empty');
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

  it('handles mixed whitespace (tabs and spaces)', () => {
    expect(validateUseCaseSearchQuery('\t personalization \t')).toBe('personalization');
  });

  it('handles tab-only input', () => {
    expect(() => validateUseCaseSearchQuery('\t\t')).toThrow('must not be empty');
  });

  it('handles newline-only input', () => {
    expect(() => validateUseCaseSearchQuery('\n\n')).toThrow('must not be empty');
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

  it('throws for case-sensitive mismatch', () => {
    expect(() => validateGoalCategory('Awareness')).toThrow('category must be one of');
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

  it('throws for case-sensitive mismatch', () => {
    expect(() => validateUseCaseTag('New')).toThrow('tag must be one of');
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

  it('encodes unicode characters', () => {
    expect(buildUseCasesUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/use-case-center/use-case-center',
    );
  });

  it('encodes hash character', () => {
    expect(buildUseCasesUrl('my#project')).toBe('/p/my%23project/use-case-center/use-case-center');
  });

  it('keeps dashes unencoded', () => {
    expect(buildUseCasesUrl('team-alpha')).toBe('/p/team-alpha/use-case-center/use-case-center');
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
      await expect(executor.execute({})).rejects.toThrow('Bloomreach Engagement UI');
    }
  });

  it('accepts optional apiConfig parameter', () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    expect(Object.keys(executors)).toHaveLength(3);
  });

  it('executors still throw with apiConfig', async () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('Bloomreach Engagement UI');
    }
  });

  it('executor actionType stays stable with apiConfig', () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    expect(executors[DEPLOY_USE_CASE_ACTION_TYPE].actionType).toBe(DEPLOY_USE_CASE_ACTION_TYPE);
    expect(executors[FAVORITE_USE_CASE_ACTION_TYPE].actionType).toBe(FAVORITE_USE_CASE_ACTION_TYPE);
    expect(executors[UNFAVORITE_USE_CASE_ACTION_TYPE].actionType).toBe(
      UNFAVORITE_USE_CASE_ACTION_TYPE,
    );
  });

  it('executor map keys are exactly the 3 action types', () => {
    const executors = createUseCaseActionExecutors();
    expect(Object.keys(executors)).toEqual([
      DEPLOY_USE_CASE_ACTION_TYPE,
      FAVORITE_USE_CASE_ACTION_TYPE,
      UNFAVORITE_USE_CASE_ACTION_TYPE,
    ]);
  });

  it('deploy executor has specific UI-only message', async () => {
    const executors = createUseCaseActionExecutors();
    await expect(executors[DEPLOY_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case deployment is only available through the Bloomreach Engagement UI.',
    );
  });

  it('favorite executor has specific UI-only message', async () => {
    const executors = createUseCaseActionExecutors();
    await expect(executors[FAVORITE_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case favoriting is only available through the Bloomreach Engagement UI.',
    );
  });

  it('unfavorite executor has specific UI-only message', async () => {
    const executors = createUseCaseActionExecutors();
    await expect(executors[UNFAVORITE_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case unfavoriting is only available through the Bloomreach Engagement UI.',
    );
  });

  it('returns identical action keys with or without apiConfig', () => {
    const withoutConfig = Object.keys(createUseCaseActionExecutors()).sort();
    const withConfig = Object.keys(createUseCaseActionExecutors(TEST_API_CONFIG)).sort();
    expect(withConfig).toEqual(withoutConfig);
  });

  it('preserves actionType mapping with apiConfig', () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('deploy executor has specific UI-only message with apiConfig', async () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    await expect(executors[DEPLOY_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case deployment is only available through the Bloomreach Engagement UI.',
    );
  });

  it('favorite executor has specific UI-only message with apiConfig', async () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    await expect(executors[FAVORITE_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case favoriting is only available through the Bloomreach Engagement UI.',
    );
  });

  it('unfavorite executor has specific UI-only message with apiConfig', async () => {
    const executors = createUseCaseActionExecutors(TEST_API_CONFIG);
    await expect(executors[UNFAVORITE_USE_CASE_ACTION_TYPE].execute({})).rejects.toThrow(
      'Use case unfavoriting is only available through the Bloomreach Engagement UI.',
    );
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

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachUseCasesService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachUseCasesService('org/project');
      expect(service.useCasesUrl).toBe('/p/org%2Fproject/use-case-center/use-case-center');
    });

    it('accepts apiConfig as second parameter', () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      expect(service).toBeInstanceOf(BloomreachUseCasesService);
    });

    it('exposes use cases URL when constructed with apiConfig', () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      expect(service.useCasesUrl).toBe('/p/test/use-case-center/use-case-center');
    });

    it('encodes unicode in constructor project URL', () => {
      const service = new BloomreachUseCasesService('projekt åäö');
      expect(service.useCasesUrl).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/use-case-center/use-case-center');
    });

    it('encodes hash in constructor project URL', () => {
      const service = new BloomreachUseCasesService('my#project');
      expect(service.useCasesUrl).toBe('/p/my%23project/use-case-center/use-case-center');
    });
  });

  describe('listUseCases', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listUseCases()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listUseCases()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error when service has apiConfig', async () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      await expect(service.listUseCases()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error for trimmed project', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listUseCases({ project: '  test  ' })).rejects.toThrow('does not provide');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listUseCases({ project: '   ' })).rejects.toThrow('must not be empty');
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

    it('accepts valid category and tag before endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.listUseCases({ project: 'test', category: 'awareness', tag: 'new' }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('searchUseCases', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({ project: 'test', query: 'cart abandonment' }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      await expect(
        service.searchUseCases({ project: 'test', query: 'cart abandonment' }),
      ).rejects.toThrow('does not provide');
    });

    it('validates project input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({ project: '', query: 'cart abandonment' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({ project: '   ', query: 'cart abandonment' }),
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

    it('accepts valid category and tag before endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({
          project: 'test',
          query: 'cart abandonment',
          category: 'retention',
          tag: 'popular',
        }),
      ).rejects.toThrow('does not provide');
    });

    it('trims query before endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.searchUseCases({
          project: 'test',
          query: '  personalization  ',
        }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('viewUseCase', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: 'test', useCaseId: 'use-case-1' }),
      ).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      await expect(
        service.viewUseCase({ project: 'test', useCaseId: 'use-case-1' }),
      ).rejects.toThrow('does not provide');
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

    it('validates whitespace-only project', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: '   ', useCaseId: 'uc-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('accepts use case ID with dots and dashes', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: 'test', useCaseId: 'use-case-1.abc' }),
      ).rejects.toThrow('does not provide');
    });

    it('trims useCaseId before endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(
        service.viewUseCase({ project: 'test', useCaseId: '  use-case-1  ' }),
      ).rejects.toThrow('does not provide');
    });
  });

  describe('listProjectUseCases', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases()).rejects.toThrow('does not provide');
    });

    it('throws no-API-endpoint error even with apiConfig', async () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      await expect(service.listProjectUseCases()).rejects.toThrow('does not provide');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases({ project: '   ' })).rejects.toThrow('must not be empty');
    });

    it('accepts trimmed project before endpoint error', async () => {
      const service = new BloomreachUseCasesService('test');
      await expect(service.listProjectUseCases({ project: '  test  ' })).rejects.toThrow(
        'does not provide',
      );
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

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_004_000);
      nowSpy.mockReturnValueOnce(1_700_000_004_001);
      nowSpy.mockReturnValueOnce(1_700_000_004_002);
      nowSpy.mockReturnValueOnce(1_700_000_004_003);
      nowSpy.mockReturnValueOnce(1_700_000_004_004);
      nowSpy.mockReturnValueOnce(1_700_000_004_005);

      const first = service.prepareDeployUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareDeployUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_004_100);
      nowSpy.mockReturnValueOnce(1_700_000_004_101);
      nowSpy.mockReturnValueOnce(1_700_000_004_102);
      nowSpy.mockReturnValueOnce(1_700_000_004_103);
      nowSpy.mockReturnValueOnce(1_700_000_004_104);
      nowSpy.mockReturnValueOnce(1_700_000_004_105);

      const first = service.prepareDeployUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareDeployUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('trims project in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: '  my-project  ',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareDeployUseCase({ project: '   ', useCaseId: 'uc-1' }),
      ).toThrow('must not be empty');
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.deploy',
          project: 'test',
          useCaseId: 'uc-1',
        }),
      );
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'uc-1',
        operatorNote: '',
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'uc-1',
        operatorNote: note,
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });

    it('trims useCaseId in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: '  use-case-123  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'use-case-123' }));
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'use-case-123',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('accepts useCaseId with dots and dashes in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareDeployUseCase({
        project: 'test',
        useCaseId: 'use-case.123-alpha',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'use-case.123-alpha' }));
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

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_005_000);
      nowSpy.mockReturnValueOnce(1_700_000_005_001);
      nowSpy.mockReturnValueOnce(1_700_000_005_002);
      nowSpy.mockReturnValueOnce(1_700_000_005_003);
      nowSpy.mockReturnValueOnce(1_700_000_005_004);
      nowSpy.mockReturnValueOnce(1_700_000_005_005);

      const first = service.prepareFavoriteUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareFavoriteUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_005_100);
      nowSpy.mockReturnValueOnce(1_700_000_005_101);
      nowSpy.mockReturnValueOnce(1_700_000_005_102);
      nowSpy.mockReturnValueOnce(1_700_000_005_103);
      nowSpy.mockReturnValueOnce(1_700_000_005_104);
      nowSpy.mockReturnValueOnce(1_700_000_005_105);

      const first = service.prepareFavoriteUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareFavoriteUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('trims project in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: '  my-project  ',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareFavoriteUseCase({ project: '   ', useCaseId: 'uc-1' }),
      ).toThrow('must not be empty');
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.favorite',
          project: 'test',
          useCaseId: 'uc-1',
        }),
      );
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'uc-1',
        operatorNote: '',
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('keeps multiline operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const note = 'Line 1\nLine 2';
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'uc-1',
        operatorNote: note,
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: note }));
    });

    it('trims useCaseId in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: '  use-case-456  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'use-case-456' }));
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-456',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('accepts useCaseId with dots and dashes in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareFavoriteUseCase({
        project: 'test',
        useCaseId: 'favorite.123-alpha',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'favorite.123-alpha' }));
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

    it('creates different prepared action ids across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_006_000);
      nowSpy.mockReturnValueOnce(1_700_000_006_001);
      nowSpy.mockReturnValueOnce(1_700_000_006_002);
      nowSpy.mockReturnValueOnce(1_700_000_006_003);
      nowSpy.mockReturnValueOnce(1_700_000_006_004);
      nowSpy.mockReturnValueOnce(1_700_000_006_005);

      const first = service.prepareUnfavoriteUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareUnfavoriteUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.preparedActionId).not.toBe(second.preparedActionId);
    });

    it('creates different confirm tokens across calls', () => {
      const service = new BloomreachUseCasesService('test');
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValueOnce(1_700_000_006_100);
      nowSpy.mockReturnValueOnce(1_700_000_006_101);
      nowSpy.mockReturnValueOnce(1_700_000_006_102);
      nowSpy.mockReturnValueOnce(1_700_000_006_103);
      nowSpy.mockReturnValueOnce(1_700_000_006_104);
      nowSpy.mockReturnValueOnce(1_700_000_006_105);

      const first = service.prepareUnfavoriteUseCase({ project: 'test', useCaseId: 'uc-1' });
      const second = service.prepareUnfavoriteUseCase({ project: 'test', useCaseId: 'uc-2' });

      expect(first.confirmToken).not.toBe(second.confirmToken);
    });

    it('trims project in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: '  my-project  ',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(expect.objectContaining({ project: 'my-project' }));
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachUseCasesService('test');
      expect(() =>
        service.prepareUnfavoriteUseCase({ project: '   ', useCaseId: 'uc-1' }),
      ).toThrow('must not be empty');
    });

    it('accepts apiConfig in service and still prepares action', () => {
      const service = new BloomreachUseCasesService('test', TEST_API_CONFIG);
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'uc-1',
      });
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'use_cases.unfavorite',
          project: 'test',
          useCaseId: 'uc-1',
        }),
      );
    });

    it('keeps empty operatorNote in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'uc-1',
        operatorNote: '',
      });
      expect(result.preview).toEqual(expect.objectContaining({ operatorNote: '' }));
    });

    it('trims useCaseId in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: '  use-case-789  ',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'use-case-789' }));
    });

    it('produces token fields with expected prefixes', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'use-case-789',
      });
      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
    });

    it('accepts useCaseId with dots and dashes in preview', () => {
      const service = new BloomreachUseCasesService('test');
      const result = service.prepareUnfavoriteUseCase({
        project: 'test',
        useCaseId: 'unfavorite.123-alpha',
      });
      expect(result.preview).toEqual(expect.objectContaining({ useCaseId: 'unfavorite.123-alpha' }));
    });
  });
});
