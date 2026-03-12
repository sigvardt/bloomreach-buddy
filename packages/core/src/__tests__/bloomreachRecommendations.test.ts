import { describe, it, expect } from 'vitest';
import {
  CREATE_RECOMMENDATION_MODEL_ACTION_TYPE,
  CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE,
  DELETE_RECOMMENDATION_MODEL_ACTION_TYPE,
  RECOMMENDATION_RATE_LIMIT_WINDOW_MS,
  RECOMMENDATION_CREATE_RATE_LIMIT,
  RECOMMENDATION_MODIFY_RATE_LIMIT,
  RECOMMENDATION_MODEL_STATUSES,
  RECOMMENDATION_ALGORITHM_TYPES,
  validateModelName,
  validateModelId,
  validateRecommendationModelStatus,
  validateAlgorithmType,
  validateFilterRules,
  validateBoostRules,
  validateMaxItems,
  buildRecommendationsUrl,
  createRecommendationActionExecutors,
  BloomreachRecommendationsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_RECOMMENDATION_MODEL_ACTION_TYPE', () => {
    expect(CREATE_RECOMMENDATION_MODEL_ACTION_TYPE).toBe('recommendations.create_model');
  });

  it('exports CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE', () => {
    expect(CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE).toBe('recommendations.configure_model');
  });

  it('exports DELETE_RECOMMENDATION_MODEL_ACTION_TYPE', () => {
    expect(DELETE_RECOMMENDATION_MODEL_ACTION_TYPE).toBe('recommendations.delete_model');
  });
});

describe('rate limit constants', () => {
  it('exports RECOMMENDATION_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(RECOMMENDATION_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports RECOMMENDATION_CREATE_RATE_LIMIT', () => {
    expect(RECOMMENDATION_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports RECOMMENDATION_MODIFY_RATE_LIMIT', () => {
    expect(RECOMMENDATION_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('RECOMMENDATION_MODEL_STATUSES', () => {
  it('contains 4 statuses', () => {
    expect(RECOMMENDATION_MODEL_STATUSES).toHaveLength(4);
  });

  it('contains expected statuses in order', () => {
    expect(RECOMMENDATION_MODEL_STATUSES).toEqual(['active', 'inactive', 'training', 'draft']);
  });
});

describe('RECOMMENDATION_ALGORITHM_TYPES', () => {
  it('contains 5 algorithm types', () => {
    expect(RECOMMENDATION_ALGORITHM_TYPES).toHaveLength(5);
  });

  it('contains expected algorithm types in order', () => {
    expect(RECOMMENDATION_ALGORITHM_TYPES).toEqual([
      'collaborative_filtering',
      'content_based',
      'hybrid',
      'trending',
      'personalized',
    ]);
  });
});

describe('validateModelName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateModelName('  My Model  ')).toBe('My Model');
  });

  it('accepts single-character name', () => {
    expect(validateModelName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateModelName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateModelName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateModelName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateModelName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateModelId', () => {
  it('returns trimmed model ID for valid input', () => {
    expect(validateModelId('  model-123  ')).toBe('model-123');
  });

  it('throws for empty string', () => {
    expect(() => validateModelId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateModelId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateModelId('model-456')).toBe('model-456');
  });
});

describe('validateRecommendationModelStatus', () => {
  it('accepts active', () => {
    expect(validateRecommendationModelStatus('active')).toBe('active');
  });

  it('accepts inactive', () => {
    expect(validateRecommendationModelStatus('inactive')).toBe('inactive');
  });

  it('accepts training', () => {
    expect(validateRecommendationModelStatus('training')).toBe('training');
  });

  it('accepts draft', () => {
    expect(validateRecommendationModelStatus('draft')).toBe('draft');
  });

  it('throws for unknown status', () => {
    expect(() => validateRecommendationModelStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateRecommendationModelStatus('')).toThrow('status must be one of');
  });
});

describe('validateAlgorithmType', () => {
  it('accepts collaborative_filtering', () => {
    expect(validateAlgorithmType('collaborative_filtering')).toBe('collaborative_filtering');
  });

  it('accepts content_based', () => {
    expect(validateAlgorithmType('content_based')).toBe('content_based');
  });

  it('accepts hybrid', () => {
    expect(validateAlgorithmType('hybrid')).toBe('hybrid');
  });

  it('accepts trending', () => {
    expect(validateAlgorithmType('trending')).toBe('trending');
  });

  it('accepts personalized', () => {
    expect(validateAlgorithmType('personalized')).toBe('personalized');
  });

  it('throws for unknown type', () => {
    expect(() => validateAlgorithmType('matrix_factorization')).toThrow('algorithm must be one of');
  });

  it('throws for empty type', () => {
    expect(() => validateAlgorithmType('')).toThrow('algorithm must be one of');
  });
});

describe('validateFilterRules', () => {
  it('accepts valid filter rules array', () => {
    const rules = [
      { field: 'category', operator: 'equals', value: 'shoes' },
      { field: 'in_stock', operator: 'equals', value: 'true' },
    ];
    expect(validateFilterRules(rules)).toEqual(rules);
  });

  it('accepts empty array', () => {
    expect(validateFilterRules([])).toEqual([]);
  });

  it('throws for exceeding 50 rules', () => {
    const rules = Array.from({ length: 51 }, (_, i) => ({
      field: `field-${i}`,
      operator: 'equals',
      value: 'value',
    }));
    expect(() => validateFilterRules(rules)).toThrow('must contain at most 50');
  });

  it('throws for rule with empty field', () => {
    const rules = [{ field: '', operator: 'equals', value: 'value' }];
    expect(() => validateFilterRules(rules)).toThrow('field must not be empty');
  });

  it('throws for rule with empty operator', () => {
    const rules = [{ field: 'category', operator: '', value: 'value' }];
    expect(() => validateFilterRules(rules)).toThrow('operator must not be empty');
  });

  it('throws for rule with empty value', () => {
    const rules = [{ field: 'category', operator: 'equals', value: '' }];
    expect(() => validateFilterRules(rules)).toThrow('value must not be empty');
  });
});

describe('validateBoostRules', () => {
  it('accepts valid boost rules array', () => {
    const rules = [
      { field: 'margin', weight: 20 },
      { field: 'recency', weight: 80 },
    ];
    expect(validateBoostRules(rules)).toEqual(rules);
  });

  it('accepts empty array', () => {
    expect(validateBoostRules([])).toEqual([]);
  });

  it('throws for exceeding 50 rules', () => {
    const rules = Array.from({ length: 51 }, (_, i) => ({
      field: `field-${i}`,
      weight: 10,
    }));
    expect(() => validateBoostRules(rules)).toThrow('must contain at most 50');
  });

  it('throws for weight below 0', () => {
    const rules = [{ field: 'margin', weight: -1 }];
    expect(() => validateBoostRules(rules)).toThrow('weight must be between 0 and 100');
  });

  it('throws for weight above 100', () => {
    const rules = [{ field: 'margin', weight: 101 }];
    expect(() => validateBoostRules(rules)).toThrow('weight must be between 0 and 100');
  });

  it('accepts weight at boundaries', () => {
    expect(validateBoostRules([{ field: 'min-weight', weight: 0 }])).toBeDefined();
    expect(validateBoostRules([{ field: 'max-weight', weight: 100 }])).toBeDefined();
  });

  it('throws for rule with empty field', () => {
    const rules = [{ field: '', weight: 50 }];
    expect(() => validateBoostRules(rules)).toThrow('field must not be empty');
  });
});

describe('validateMaxItems', () => {
  it('accepts valid integer', () => {
    expect(validateMaxItems(10)).toBe(10);
  });

  it('accepts minimum value', () => {
    expect(validateMaxItems(1)).toBe(1);
  });

  it('accepts maximum value', () => {
    expect(validateMaxItems(100)).toBe(100);
  });

  it('throws for 0', () => {
    expect(() => validateMaxItems(0)).toThrow('must be an integer between 1 and 100');
  });

  it('throws for 101', () => {
    expect(() => validateMaxItems(101)).toThrow('must be an integer between 1 and 100');
  });

  it('throws for non-integer', () => {
    expect(() => validateMaxItems(5.5)).toThrow('must be an integer between 1 and 100');
  });
});

describe('buildRecommendationsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildRecommendationsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/campaigns/recommendations',
    );
  });

  it('encodes spaces in project name', () => {
    expect(buildRecommendationsUrl('my project')).toBe(
      '/p/my%20project/campaigns/recommendations',
    );
  });

  it('encodes slashes in project name', () => {
    expect(buildRecommendationsUrl('org/project')).toBe(
      '/p/org%2Fproject/campaigns/recommendations',
    );
  });
});

describe('createRecommendationActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createRecommendationActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_RECOMMENDATION_MODEL_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_RECOMMENDATION_MODEL_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_RECOMMENDATION_MODEL_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createRecommendationActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createRecommendationActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachRecommendationsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachRecommendationsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachRecommendationsService);
    });

    it('exposes recommendationsUrl correctly', () => {
      const service = new BloomreachRecommendationsService('kingdom-of-joakim');
      expect(service.recommendationsUrl).toBe('/p/kingdom-of-joakim/campaigns/recommendations');
    });

    it('trims project name', () => {
      const service = new BloomreachRecommendationsService('  my-project  ');
      expect(service.recommendationsUrl).toBe('/p/my-project/campaigns/recommendations');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachRecommendationsService('')).toThrow('must not be empty');
    });
  });

  describe('listRecommendationModels', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(service.listRecommendationModels()).rejects.toThrow('not yet implemented');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(
        service.listRecommendationModels({ project: 'test', status: 'paused' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(
        service.listRecommendationModels({ project: '', status: 'active' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewModelPerformance', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(
        service.viewModelPerformance({ project: 'test', modelId: 'model-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(
        service.viewModelPerformance({ project: '', modelId: 'model-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates modelId input', async () => {
      const service = new BloomreachRecommendationsService('test');
      await expect(
        service.viewModelPerformance({ project: 'test', modelId: '   ' }),
      ).rejects.toThrow('Model ID must not be empty');
    });
  });

  describe('prepareCreateRecommendationModel', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareCreateRecommendationModel({
        project: 'test',
        name: 'My Model',
        modelType: 'product_recommendations',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'recommendations.create_model',
          project: 'test',
          name: 'My Model',
        }),
      );
    });

    it('includes modelType in preview', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareCreateRecommendationModel({
        project: 'test',
        name: 'Catalog Model',
        modelType: 'category_recommendations',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ modelType: 'category_recommendations' }),
      );
    });

    it('includes algorithm in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareCreateRecommendationModel({
        project: 'test',
        name: 'Hybrid Model',
        modelType: 'product_recommendations',
        algorithm: 'hybrid',
      });

      expect(result.preview).toEqual(expect.objectContaining({ algorithm: 'hybrid' }));
    });

    it('includes catalogId in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareCreateRecommendationModel({
        project: 'test',
        name: 'Catalog Model',
        modelType: 'product_recommendations',
        catalogId: 'catalog-123',
      });

      expect(result.preview).toEqual(expect.objectContaining({ catalogId: 'catalog-123' }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareCreateRecommendationModel({
        project: 'test',
        name: 'Model',
        modelType: 'product_recommendations',
        operatorNote: 'Created for spring merchandising',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for spring merchandising' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareCreateRecommendationModel({
          project: 'test',
          name: '',
          modelType: 'product_recommendations',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareCreateRecommendationModel({
          project: '',
          name: 'Model',
          modelType: 'product_recommendations',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareCreateRecommendationModel({
          project: 'test',
          name: 'x'.repeat(201),
          modelType: 'product_recommendations',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for empty modelType', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareCreateRecommendationModel({
          project: 'test',
          name: 'Model',
          modelType: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid algorithm type', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareCreateRecommendationModel({
          project: 'test',
          name: 'Model',
          modelType: 'product_recommendations',
          algorithm: 'matrix_factorization',
        }),
      ).toThrow('algorithm must be one of');
    });
  });

  describe('prepareConfigureRecommendationModel', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'recommendations.configure_model',
          project: 'test',
          modelId: 'model-123',
        }),
      );
    });

    it('includes algorithm in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        algorithm: 'personalized',
      });

      expect(result.preview).toEqual(expect.objectContaining({ algorithm: 'personalized' }));
    });

    it('includes catalogId in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        catalogId: 'catalog-456',
      });

      expect(result.preview).toEqual(expect.objectContaining({ catalogId: 'catalog-456' }));
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const filters = [{ field: 'category', operator: 'equals', value: 'shoes' }];
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        filters,
      });

      expect(result.preview).toEqual(expect.objectContaining({ filters }));
    });

    it('includes boostRules in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const boostRules = [{ field: 'margin', weight: 75 }];
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        boostRules,
      });

      expect(result.preview).toEqual(expect.objectContaining({ boostRules }));
    });

    it('includes maxItems in preview when provided', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        maxItems: 25,
      });

      expect(result.preview).toEqual(expect.objectContaining({ maxItems: 25 }));
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareConfigureRecommendationModel({
        project: 'test',
        modelId: 'model-123',
        operatorNote: 'Tune recommendations for spring sale',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Tune recommendations for spring sale' }),
      );
    });

    it('throws for empty modelId', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: 'test',
          modelId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: '',
          modelId: 'model-123',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid algorithm type', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: 'test',
          modelId: 'model-123',
          algorithm: 'matrix_factorization',
        }),
      ).toThrow('algorithm must be one of');
    });

    it('throws for invalid filter rules', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: 'test',
          modelId: 'model-123',
          filters: [{ field: '', operator: 'equals', value: 'x' }],
        }),
      ).toThrow('field must not be empty');
    });

    it('throws for invalid boost rules', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: 'test',
          modelId: 'model-123',
          boostRules: [{ field: 'margin', weight: -1 }],
        }),
      ).toThrow('weight must be between 0 and 100');
    });

    it('throws for invalid maxItems', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareConfigureRecommendationModel({
          project: 'test',
          modelId: 'model-123',
          maxItems: 101,
        }),
      ).toThrow('must be an integer between 1 and 100');
    });
  });

  describe('prepareDeleteRecommendationModel', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareDeleteRecommendationModel({
        project: 'test',
        modelId: 'model-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'recommendations.delete_model',
          project: 'test',
          modelId: 'model-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachRecommendationsService('test');
      const result = service.prepareDeleteRecommendationModel({
        project: 'test',
        modelId: 'model-900',
        operatorNote: 'Remove outdated seasonal model',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Remove outdated seasonal model' }),
      );
    });

    it('throws for empty modelId', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareDeleteRecommendationModel({
          project: 'test',
          modelId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachRecommendationsService('test');
      expect(() =>
        service.prepareDeleteRecommendationModel({
          project: '',
          modelId: 'model-900',
        }),
      ).toThrow('must not be empty');
    });
  });
});
