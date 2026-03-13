import { describe, it, expect } from 'vitest';
import {
  CREATE_METRIC_ACTION_TYPE,
  EDIT_METRIC_ACTION_TYPE,
  DELETE_METRIC_ACTION_TYPE,
  METRIC_RATE_LIMIT_WINDOW_MS,
  METRIC_CREATE_RATE_LIMIT,
  METRIC_MODIFY_RATE_LIMIT,
  METRIC_DELETE_RATE_LIMIT,
  validateMetricName,
  validateMetricId,
  validateDescription,
  validateAggregationType,
  validateAggregation,
  buildMetricsUrl,
  createMetricActionExecutors,
  BloomreachMetricsService,
} from '../index.js';

const validateMetricDescription = validateDescription;

describe('action type constants', () => {
  it('exports CREATE_METRIC_ACTION_TYPE', () => {
    expect(CREATE_METRIC_ACTION_TYPE).toBe('metrics.create_metric');
  });

  it('exports EDIT_METRIC_ACTION_TYPE', () => {
    expect(EDIT_METRIC_ACTION_TYPE).toBe('metrics.edit_metric');
  });

  it('exports DELETE_METRIC_ACTION_TYPE', () => {
    expect(DELETE_METRIC_ACTION_TYPE).toBe('metrics.delete_metric');
  });
});

describe('rate limit constants', () => {
  it('exports METRIC_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(METRIC_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports METRIC_CREATE_RATE_LIMIT', () => {
    expect(METRIC_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports METRIC_MODIFY_RATE_LIMIT', () => {
    expect(METRIC_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports METRIC_DELETE_RATE_LIMIT', () => {
    expect(METRIC_DELETE_RATE_LIMIT).toBe(10);
  });
});

describe('validateMetricName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateMetricName('  Revenue Metric  ')).toBe('Revenue Metric');
  });

  it('returns trimmed name with tabs and newlines', () => {
    expect(validateMetricName('\n\tCheckout Value\t\n')).toBe('Checkout Value');
  });

  it('accepts single-character name', () => {
    expect(validateMetricName('A')).toBe('A');
  });

  it('accepts numeric name', () => {
    expect(validateMetricName('123')).toBe('123');
  });

  it('accepts name with punctuation', () => {
    expect(validateMetricName('Metric: Revenue v2')).toBe('Metric: Revenue v2');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateMetricName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateMetricName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateMetricName('   ')).toThrow('must not be empty');
  });

  it('throws for tab-only string', () => {
    expect(() => validateMetricName('\t\t')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateMetricName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateMetricId', () => {
  it('returns trimmed metric ID for valid input', () => {
    expect(validateMetricId('  metric-123  ')).toBe('metric-123');
  });

  it('returns same value when already trimmed', () => {
    expect(validateMetricId('metric-456')).toBe('metric-456');
  });

  it('returns ID containing slashes', () => {
    expect(validateMetricId('metric/group/a')).toBe('metric/group/a');
  });

  it('throws for empty string', () => {
    expect(() => validateMetricId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateMetricId('   ')).toThrow('must not be empty');
  });

  it('throws for newline-only string', () => {
    expect(() => validateMetricId('\n')).toThrow('must not be empty');
  });
});

describe('validateDescription', () => {
  it('returns trimmed description for valid input', () => {
    expect(validateMetricDescription('  Useful metric description  ')).toBe(
      'Useful metric description',
    );
  });

  it('accepts description at max length', () => {
    const description = 'x'.repeat(1000);
    expect(validateMetricDescription(description)).toBe(description);
  });

  it('throws for empty string', () => {
    expect(() => validateMetricDescription('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateMetricDescription('   ')).toThrow('must not be empty');
  });

  it('throws for description exceeding max length', () => {
    const description = 'x'.repeat(1001);
    expect(() => validateMetricDescription(description)).toThrow(
      'must not exceed 1000 characters',
    );
  });
});

describe('validateAggregationType', () => {
  it('accepts sum and returns lowercase', () => {
    expect(validateAggregationType('sum')).toBe('sum');
  });

  it('accepts count', () => {
    expect(validateAggregationType('count')).toBe('count');
  });

  it('accepts average', () => {
    expect(validateAggregationType('average')).toBe('average');
  });

  it('accepts min', () => {
    expect(validateAggregationType('min')).toBe('min');
  });

  it('accepts max', () => {
    expect(validateAggregationType('max')).toBe('max');
  });

  it('accepts unique', () => {
    expect(validateAggregationType('unique')).toBe('unique');
  });

  it('accepts uppercase input and returns lowercase', () => {
    expect(validateAggregationType('SUM')).toBe('sum');
  });

  it('accepts input with leading and trailing whitespace', () => {
    expect(validateAggregationType('  count  ')).toBe('count');
  });

  it('throws for empty string', () => {
    expect(() => validateAggregationType('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateAggregationType('   ')).toThrow('must not be empty');
  });

  it('throws for invalid type', () => {
    expect(() => validateAggregationType('median')).toThrow('must be one of');
  });
});

describe('validateAggregation', () => {
  it('accepts valid aggregation with count (no propertyName required)', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'count',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'count',
      propertyName: undefined,
    });
  });

  it('accepts valid aggregation with unique (no propertyName required)', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'unique',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'unique',
      propertyName: undefined,
    });
  });

  it('accepts valid aggregation with sum and propertyName', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'sum',
        propertyName: 'revenue',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'sum',
      propertyName: 'revenue',
    });
  });

  it('accepts valid aggregation with average and propertyName', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'average',
        propertyName: 'basket_size',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'average',
      propertyName: 'basket_size',
    });
  });

  it('accepts valid aggregation with min and propertyName', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'min',
        propertyName: 'price',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'min',
      propertyName: 'price',
    });
  });

  it('accepts valid aggregation with max and propertyName', () => {
    expect(
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'max',
        propertyName: 'price',
      }),
    ).toEqual({
      eventName: 'purchase',
      aggregationType: 'max',
      propertyName: 'price',
    });
  });

  it('throws for empty eventName', () => {
    expect(() =>
      validateAggregation({
        eventName: '',
        aggregationType: 'count',
      }),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only eventName', () => {
    expect(() =>
      validateAggregation({
        eventName: '   ',
        aggregationType: 'count',
      }),
    ).toThrow('must not be empty');
  });

  it('throws for invalid aggregationType', () => {
    expect(() =>
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'median',
      }),
    ).toThrow('must be one of');
  });

  it('throws for sum without propertyName', () => {
    expect(() =>
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'sum',
      }),
    ).toThrow('propertyName is required');
  });

  it('throws for average without propertyName', () => {
    expect(() =>
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'average',
      }),
    ).toThrow('propertyName is required');
  });

  it('throws for min without propertyName', () => {
    expect(() =>
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'min',
      }),
    ).toThrow('propertyName is required');
  });

  it('throws for max without propertyName', () => {
    expect(() =>
      validateAggregation({
        eventName: 'purchase',
        aggregationType: 'max',
      }),
    ).toThrow('propertyName is required');
  });
});

describe('buildMetricsUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildMetricsUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/data/metrics');
  });

  it('encodes spaces in project name', () => {
    expect(buildMetricsUrl('my project')).toBe('/p/my%20project/data/metrics');
  });

  it('encodes slashes in project name', () => {
    expect(buildMetricsUrl('org/project')).toBe('/p/org%2Fproject/data/metrics');
  });

  it('encodes unicode characters in project name', () => {
    expect(buildMetricsUrl('projekt åäö')).toBe('/p/projekt%20%C3%A5%C3%A4%C3%B6/data/metrics');
  });

  it('encodes hash character in project name', () => {
    expect(buildMetricsUrl('my#project')).toBe('/p/my%23project/data/metrics');
  });

  it('keeps dashes unencoded in project name', () => {
    expect(buildMetricsUrl('team-alpha')).toBe('/p/team-alpha/data/metrics');
  });
});

describe('createMetricActionExecutors', () => {
  it('returns executors for all three action types', () => {
    const executors = createMetricActionExecutors();
    expect(Object.keys(executors)).toHaveLength(3);
    expect(executors[CREATE_METRIC_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_METRIC_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_METRIC_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createMetricActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('create executor throws "not yet implemented" on execute', async () => {
    const executors = createMetricActionExecutors();
    await expect(executors[CREATE_METRIC_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('edit executor throws "not yet implemented" on execute', async () => {
    const executors = createMetricActionExecutors();
    await expect(executors[EDIT_METRIC_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });

  it('delete executor throws "not yet implemented" on execute', async () => {
    const executors = createMetricActionExecutors();
    await expect(executors[DELETE_METRIC_ACTION_TYPE].execute({})).rejects.toThrow(
      'not yet implemented',
    );
  });
});

describe('BloomreachMetricsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachMetricsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachMetricsService);
    });

    it('exposes the metrics URL', () => {
      const service = new BloomreachMetricsService('kingdom-of-joakim');
      expect(service.metricsUrl).toBe('/p/kingdom-of-joakim/data/metrics');
    });

    it('trims project name', () => {
      const service = new BloomreachMetricsService('  my-project  ');
      expect(service.metricsUrl).toBe('/p/my-project/data/metrics');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachMetricsService('')).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      expect(() => new BloomreachMetricsService('   ')).toThrow('must not be empty');
    });

    it('encodes slashes in constructor project URL', () => {
      const service = new BloomreachMetricsService('org/project');
      expect(service.metricsUrl).toBe('/p/org%2Fproject/data/metrics');
    });
  });

  describe('listMetrics', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(service.listMetrics()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input is provided', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(service.listMetrics({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('validates whitespace-only project when input is provided', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(service.listMetrics({ project: '   ' })).rejects.toThrow('must not be empty');
    });

    it('throws not-yet-implemented error for valid project override', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(service.listMetrics({ project: 'kingdom-of-joakim' })).rejects.toThrow(
        'not yet implemented',
      );
    });
  });

  describe('viewMetricResults', () => {
    it('throws not-yet-implemented error with valid minimal input', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(
        service.viewMetricResults({
          project: 'test',
          metricId: 'metric-1',
        }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(
        service.viewMetricResults({
          project: '',
          metricId: 'metric-1',
        }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates metricId input when empty', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(
        service.viewMetricResults({
          project: 'test',
          metricId: '',
        }),
      ).rejects.toThrow('Metric ID must not be empty');
    });

    it('validates metricId input when whitespace-only', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(
        service.viewMetricResults({
          project: 'test',
          metricId: '   ',
        }),
      ).rejects.toThrow('Metric ID must not be empty');
    });

    it('accepts trimmed metricId and reaches not-yet-implemented', async () => {
      const service = new BloomreachMetricsService('test');
      await expect(
        service.viewMetricResults({
          project: 'test',
          metricId: '  metric-99  ',
        }),
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareCreateMetric', () => {
    it('returns a prepared action with valid minimal input (count aggregation, no propertyName)', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: 'test',
        name: 'Orders Count',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'count',
        },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'metrics.create_metric',
          project: 'test',
          name: 'Orders Count',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'count',
            propertyName: undefined,
          },
        }),
      );
    });

    it('returns a prepared action with valid input including propertyName (sum aggregation)', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: 'test',
        name: 'Revenue Sum',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'sum',
          propertyName: 'order_value',
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'sum',
            propertyName: 'order_value',
          },
        }),
      );
    });

    it('includes description in preview when provided', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: 'test',
        name: 'Revenue Sum',
        description: '  Total revenue per period  ',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'sum',
          propertyName: 'order_value',
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          description: 'Total revenue per period',
        }),
      );
    });

    it('includes filters in preview when provided', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: 'test',
        name: 'US Revenue',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'sum',
          propertyName: 'order_value',
        },
        filters: {
          customerAttributes: { segment: 'vip' },
          eventProperties: { currency: 'USD' },
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          filters: {
            customerAttributes: { segment: 'vip' },
            eventProperties: { currency: 'USD' },
          },
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: 'test',
        name: 'Revenue Sum',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'sum',
          propertyName: 'order_value',
        },
        operatorNote: 'Create metric for weekly review',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Create metric for weekly review',
        }),
      );
    });

    it('trims project and name in preview', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareCreateMetric({
        project: '  my-project  ',
        name: '  Revenue Sum  ',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'sum',
          propertyName: 'order_value',
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          project: 'my-project',
          name: 'Revenue Sum',
        }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: '',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'count',
          },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only name', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: '   ',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'count',
          },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: '',
          name: 'Revenue Sum',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'count',
          },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: 'x'.repeat(201),
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'count',
          },
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for empty eventName in aggregation', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: 'Revenue Sum',
          aggregation: {
            eventName: '',
            aggregationType: 'count',
          },
        }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid aggregationType', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: 'Revenue Sum',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'median',
          },
        }),
      ).toThrow('must be one of');
    });

    it('throws for sum aggregation without propertyName', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareCreateMetric({
          project: 'test',
          name: 'Revenue Sum',
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'sum',
          },
        }),
      ).toThrow('propertyName is required');
    });

    it('accepts max-length name and still prepares action', () => {
      const service = new BloomreachMetricsService('test');
      const maxName = 'x'.repeat(200);
      const result = service.prepareCreateMetric({
        project: 'test',
        name: maxName,
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'count',
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: maxName,
        }),
      );
    });
  });

  describe('prepareEditMetric', () => {
    it('returns a prepared action with valid input (metricId only)', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareEditMetric({
        project: 'test',
        metricId: 'metric-123',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'metrics.edit_metric',
          project: 'test',
          metricId: 'metric-123',
        }),
      );
    });

    it('includes name in preview when provided', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareEditMetric({
        project: 'test',
        metricId: 'metric-123',
        name: '  Revenue Total  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          name: 'Revenue Total',
        }),
      );
    });

    it('includes aggregation in preview when provided', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareEditMetric({
        project: 'test',
        metricId: 'metric-123',
        aggregation: {
          eventName: 'purchase',
          aggregationType: 'average',
          propertyName: 'order_value',
        },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          aggregation: {
            eventName: 'purchase',
            aggregationType: 'average',
            propertyName: 'order_value',
          },
        }),
      );
    });

    it('includes description in preview when provided', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareEditMetric({
        project: 'test',
        metricId: 'metric-123',
        description: '  Updated description  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          description: 'Updated description',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareEditMetric({
        project: 'test',
        metricId: 'metric-123',
        operatorNote: 'Align metric naming',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Align metric naming',
        }),
      );
    });

    it('throws for empty metricId', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareEditMetric({
          project: 'test',
          metricId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only metricId', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareEditMetric({
          project: 'test',
          metricId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareEditMetric({
          project: '',
          metricId: 'metric-123',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareEditMetric({
          project: '   ',
          metricId: 'metric-123',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareDeleteMetric', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareDeleteMetric({
        project: 'test',
        metricId: 'metric-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'metrics.delete_metric',
          project: 'test',
          metricId: 'metric-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareDeleteMetric({
        project: 'test',
        metricId: 'metric-900',
        operatorNote: 'Remove obsolete metric',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          operatorNote: 'Remove obsolete metric',
        }),
      );
    });

    it('throws for empty metricId', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareDeleteMetric({
          project: 'test',
          metricId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only metricId', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareDeleteMetric({
          project: 'test',
          metricId: '   ',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareDeleteMetric({
          project: '',
          metricId: 'metric-900',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for whitespace-only project', () => {
      const service = new BloomreachMetricsService('test');
      expect(() =>
        service.prepareDeleteMetric({
          project: '   ',
          metricId: 'metric-900',
        }),
      ).toThrow('must not be empty');
    });

    it('accepts trimmed metricId and reaches prepared state', () => {
      const service = new BloomreachMetricsService('test');
      const result = service.prepareDeleteMetric({
        project: 'test',
        metricId: '  metric-900  ',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          metricId: 'metric-900',
        }),
      );
    });
  });
});
