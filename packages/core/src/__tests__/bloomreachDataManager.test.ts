import { describe, it, expect } from 'vitest';
import {
  ADD_CUSTOMER_PROPERTY_ACTION_TYPE,
  EDIT_CUSTOMER_PROPERTY_ACTION_TYPE,
  ADD_EVENT_DEFINITION_ACTION_TYPE,
  ADD_FIELD_DEFINITION_ACTION_TYPE,
  EDIT_FIELD_DEFINITION_ACTION_TYPE,
  CONFIGURE_MAPPING_ACTION_TYPE,
  ADD_CONTENT_SOURCE_ACTION_TYPE,
  EDIT_CONTENT_SOURCE_ACTION_TYPE,
  SAVE_CHANGES_ACTION_TYPE,
  DATA_MANAGER_RATE_LIMIT_WINDOW_MS,
  DATA_MANAGER_ADD_PROPERTY_RATE_LIMIT,
  DATA_MANAGER_EDIT_PROPERTY_RATE_LIMIT,
  DATA_MANAGER_ADD_EVENT_RATE_LIMIT,
  DATA_MANAGER_ADD_DEFINITION_RATE_LIMIT,
  DATA_MANAGER_CONFIGURE_MAPPING_RATE_LIMIT,
  DATA_MANAGER_CONTENT_SOURCE_RATE_LIMIT,
  DATA_MANAGER_SAVE_RATE_LIMIT,
  buildCustomerPropertiesUrl,
  buildEventsUrl,
  buildDefinitionsUrl,
  buildMappingUrl,
  buildContentSourcesUrl,
  createDataManagerActionExecutors,
  BloomreachDataManagerService,
} from '../index.js';

describe('action type constants', () => {
  it('exports ADD_CUSTOMER_PROPERTY_ACTION_TYPE', () => {
    expect(ADD_CUSTOMER_PROPERTY_ACTION_TYPE).toBe('dataManager.add_customer_property');
  });

  it('exports EDIT_CUSTOMER_PROPERTY_ACTION_TYPE', () => {
    expect(EDIT_CUSTOMER_PROPERTY_ACTION_TYPE).toBe('dataManager.edit_customer_property');
  });

  it('exports ADD_EVENT_DEFINITION_ACTION_TYPE', () => {
    expect(ADD_EVENT_DEFINITION_ACTION_TYPE).toBe('dataManager.add_event_definition');
  });

  it('exports ADD_FIELD_DEFINITION_ACTION_TYPE', () => {
    expect(ADD_FIELD_DEFINITION_ACTION_TYPE).toBe('dataManager.add_field_definition');
  });

  it('exports EDIT_FIELD_DEFINITION_ACTION_TYPE', () => {
    expect(EDIT_FIELD_DEFINITION_ACTION_TYPE).toBe('dataManager.edit_field_definition');
  });

  it('exports CONFIGURE_MAPPING_ACTION_TYPE', () => {
    expect(CONFIGURE_MAPPING_ACTION_TYPE).toBe('dataManager.configure_mapping');
  });

  it('exports ADD_CONTENT_SOURCE_ACTION_TYPE', () => {
    expect(ADD_CONTENT_SOURCE_ACTION_TYPE).toBe('dataManager.add_content_source');
  });

  it('exports EDIT_CONTENT_SOURCE_ACTION_TYPE', () => {
    expect(EDIT_CONTENT_SOURCE_ACTION_TYPE).toBe('dataManager.edit_content_source');
  });

  it('exports SAVE_CHANGES_ACTION_TYPE', () => {
    expect(SAVE_CHANGES_ACTION_TYPE).toBe('dataManager.save_changes');
  });
});

describe('rate limit constants', () => {
  it('exports DATA_MANAGER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(DATA_MANAGER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports DATA_MANAGER_ADD_PROPERTY_RATE_LIMIT', () => {
    expect(DATA_MANAGER_ADD_PROPERTY_RATE_LIMIT).toBe(50);
  });

  it('exports DATA_MANAGER_EDIT_PROPERTY_RATE_LIMIT', () => {
    expect(DATA_MANAGER_EDIT_PROPERTY_RATE_LIMIT).toBe(100);
  });

  it('exports DATA_MANAGER_ADD_EVENT_RATE_LIMIT', () => {
    expect(DATA_MANAGER_ADD_EVENT_RATE_LIMIT).toBe(50);
  });

  it('exports DATA_MANAGER_ADD_DEFINITION_RATE_LIMIT', () => {
    expect(DATA_MANAGER_ADD_DEFINITION_RATE_LIMIT).toBe(50);
  });

  it('exports DATA_MANAGER_CONFIGURE_MAPPING_RATE_LIMIT', () => {
    expect(DATA_MANAGER_CONFIGURE_MAPPING_RATE_LIMIT).toBe(20);
  });

  it('exports DATA_MANAGER_CONTENT_SOURCE_RATE_LIMIT', () => {
    expect(DATA_MANAGER_CONTENT_SOURCE_RATE_LIMIT).toBe(20);
  });

  it('exports DATA_MANAGER_SAVE_RATE_LIMIT', () => {
    expect(DATA_MANAGER_SAVE_RATE_LIMIT).toBe(30);
  });
});

describe('validatePropertyName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: '  prop  ', type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ name: 'prop' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddCustomerProperty({ project: 'test', name: '', type: 'string' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddCustomerProperty({ project: 'test', name: '   ', type: 'string' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddCustomerProperty({ project: 'test', name: 'x'.repeat(201), type: 'string' }),
    ).toThrow('must not exceed 200 characters');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareAddCustomerProperty({ project: 'test', name: value, type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateEventName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: '  event  ', type: 'json' });
    expect(result.preview).toEqual(expect.objectContaining({ name: 'event' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddEventDefinition({ project: 'test', name: '', type: 'json' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddEventDefinition({ project: 'test', name: '   ', type: 'json' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddEventDefinition({ project: 'test', name: 'x'.repeat(201), type: 'json' }),
    ).toThrow('must not exceed 200 characters');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareAddEventDefinition({ project: 'test', name: value, type: 'json' });
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateDefinitionName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: '  definition  ', type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ name: 'definition' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddFieldDefinition({ project: 'test', name: '', type: 'string' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddFieldDefinition({ project: 'test', name: '   ', type: 'string' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddFieldDefinition({ project: 'test', name: 'x'.repeat(201), type: 'string' })).toThrow(
      'must not exceed 200 characters',
    );
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareAddFieldDefinition({ project: 'test', name: value, type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateDescription', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({
      project: 'test',
      name: 'def',
      type: 'string',
      description: '  useful description  ',
    });
    expect(result.preview).toEqual(expect.objectContaining({ description: 'useful description' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddFieldDefinition({ project: 'test', name: 'def', type: 'string', description: '' }),
    ).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddFieldDefinition({ project: 'test', name: 'def', type: 'string', description: '   ' }),
    ).toThrow('must not be empty');
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddFieldDefinition({
        project: 'test',
        name: 'def',
        type: 'string',
        description: 'x'.repeat(1001),
      }),
    ).toThrow('must not exceed 1000 characters');
  });

  it('accepts 1000 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(1000);
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'def', type: 'string', description: value });
    expect(result.preview).toEqual(expect.objectContaining({ description: value }));
  });
});

describe('validatePropertyType', () => {
  it('accepts string', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'string' }));
  });

  it('accepts number', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'number' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'number' }));
  });

  it('accepts boolean', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'boolean' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'boolean' }));
  });

  it('accepts date', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'date' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'date' }));
  });

  it('accepts list', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'list' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'list' }));
  });

  it('accepts json', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'json' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'json' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddCustomerProperty({ project: 'test', name: 'n', type: 'text' })).toThrow(
      'must be one of',
    );
  });
});

describe('validateEventType', () => {
  it('accepts string', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'string' }));
  });

  it('accepts number', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'number' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'number' }));
  });

  it('accepts boolean', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'boolean' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'boolean' }));
  });

  it('accepts date', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'date' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'date' }));
  });

  it('accepts list', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'list' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'list' }));
  });

  it('accepts json', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'json' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'json' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddEventDefinition({ project: 'test', name: 'n', type: 'money' })).toThrow(
      'must be one of',
    );
  });
});

describe('validateFieldType', () => {
  it('accepts string', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'string' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'string' }));
  });

  it('accepts number', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'number' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'number' }));
  });

  it('accepts boolean', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'boolean' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'boolean' }));
  });

  it('accepts date', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'date' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'date' }));
  });

  it('accepts list', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'list' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'list' }));
  });

  it('accepts json', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'json' });
    expect(result.preview).toEqual(expect.objectContaining({ type: 'json' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddFieldDefinition({ project: 'test', name: 'n', type: 'object' })).toThrow(
      'must be one of',
    );
  });
});

describe('validateSourceType', () => {
  it('accepts api', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'api', url: 'https://x.y' });
    expect(result.preview).toEqual(expect.objectContaining({ sourceType: 'api' }));
  });

  it('accepts csv', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'csv', url: 'https://x.y' });
    expect(result.preview).toEqual(expect.objectContaining({ sourceType: 'csv' }));
  });

  it('accepts webhook', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({
      project: 'test',
      name: 'src',
      sourceType: 'webhook',
      url: 'https://x.y',
    });
    expect(result.preview).toEqual(expect.objectContaining({ sourceType: 'webhook' }));
  });

  it('accepts database', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({
      project: 'test',
      name: 'src',
      sourceType: 'database',
      url: 'https://x.y',
    });
    expect(result.preview).toEqual(expect.objectContaining({ sourceType: 'database' }));
  });

  it('accepts sftp', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'sftp', url: 'https://x.y' });
    expect(result.preview).toEqual(expect.objectContaining({ sourceType: 'sftp' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'ftp', url: 'https://x.y' })).toThrow(
      'must be one of',
    );
  });
});

describe('validateSourceUrl', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({
      project: 'test',
      name: 'src',
      sourceType: 'api',
      url: '  https://example.com/feed  ',
    });
    expect(result.preview).toEqual(expect.objectContaining({ url: 'https://example.com/feed' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'api', url: '' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'api', url: '   ' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddContentSource({
        project: 'test',
        name: 'src',
        sourceType: 'api',
        url: `https://example.com/${'x'.repeat(1989)}`,
      }),
    ).toThrow('must not exceed 2000 characters');
  });

  it('throws for invalid absolute URL', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: 'src', sourceType: 'api', url: '/relative/path' })).toThrow(
      'must be a valid absolute URL',
    );
  });
});

describe('validateSourceName', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareAddContentSource({ project: 'test', name: '  source  ', sourceType: 'api', url: 'https://x.y' });
    expect(result.preview).toEqual(expect.objectContaining({ name: 'source' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: '', sourceType: 'api', url: 'https://x.y' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareAddContentSource({ project: 'test', name: '   ', sourceType: 'api', url: 'https://x.y' })).toThrow(
      'must not be empty',
    );
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareAddContentSource({ project: 'test', name: 'x'.repeat(201), sourceType: 'api', url: 'https://x.y' }),
    ).toThrow('must not exceed 200 characters');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareAddContentSource({ project: 'test', name: value, sourceType: 'api', url: 'https://x.y' });
    expect(result.preview).toEqual(expect.objectContaining({ name: value }));
  });
});

describe('validateDefinitionId', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareEditFieldDefinition({ project: 'test', definitionId: '  def-1  ' });
    expect(result.preview).toEqual(expect.objectContaining({ definitionId: 'def-1' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditFieldDefinition({ project: 'test', definitionId: '' })).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditFieldDefinition({ project: 'test', definitionId: '   ' })).toThrow('must not be empty');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareEditFieldDefinition({ project: 'test', definitionId: value });
    expect(result.preview).toEqual(expect.objectContaining({ definitionId: value }));
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditFieldDefinition({ project: 'test', definitionId: 'x'.repeat(201) })).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateSourceId', () => {
  it('valid input returns trimmed value', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareEditContentSource({ project: 'test', sourceId: '  src-1  ' });
    expect(result.preview).toEqual(expect.objectContaining({ sourceId: 'src-1' }));
  });

  it('throws for empty string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditContentSource({ project: 'test', sourceId: '' })).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditContentSource({ project: 'test', sourceId: '   ' })).toThrow('must not be empty');
  });

  it('accepts 200 characters', () => {
    const service = new BloomreachDataManagerService('test');
    const value = 'x'.repeat(200);
    const result = service.prepareEditContentSource({ project: 'test', sourceId: value });
    expect(result.preview).toEqual(expect.objectContaining({ sourceId: value }));
  });

  it('throws for too-long input', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() => service.prepareEditContentSource({ project: 'test', sourceId: 'x'.repeat(201) })).toThrow(
      'must not exceed 200 characters',
    );
  });
});

describe('validateMappingFields', () => {
  it('valid input trims both fields', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({
      project: 'test',
      sourceField: '  source_field  ',
      targetField: '  target_field  ',
      transformationType: 'direct',
    });
    expect(result.preview).toEqual(expect.objectContaining({ sourceField: 'source_field', targetField: 'target_field' }));
  });

  it('throws for both empty', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({ project: 'test', sourceField: '', targetField: '', transformationType: 'direct' }),
    ).toThrow('must not be empty');
  });

  it('throws for empty source', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({ project: 'test', sourceField: '   ', targetField: 'target', transformationType: 'direct' }),
    ).toThrow('must not be empty');
  });

  it('throws for empty target', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({ project: 'test', sourceField: 'source', targetField: '   ', transformationType: 'direct' }),
    ).toThrow('must not be empty');
  });

  it('throws for too-long source field', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({
        project: 'test',
        sourceField: 'x'.repeat(201),
        targetField: 'target',
        transformationType: 'direct',
      }),
    ).toThrow('must not exceed 200 characters');
  });

  it('throws for too-long target field', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({
        project: 'test',
        sourceField: 'source',
        targetField: 'x'.repeat(201),
        transformationType: 'direct',
      }),
    ).toThrow('must not exceed 200 characters');
  });
});

describe('validateTransformationType', () => {
  it('accepts direct', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({ project: 'test', sourceField: 'a', targetField: 'b', transformationType: 'direct' });
    expect(result.preview).toEqual(expect.objectContaining({ transformationType: 'direct' }));
  });

  it('accepts concatenate', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({
      project: 'test',
      sourceField: 'a',
      targetField: 'b',
      transformationType: 'concatenate',
    });
    expect(result.preview).toEqual(expect.objectContaining({ transformationType: 'concatenate' }));
  });

  it('accepts split', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({ project: 'test', sourceField: 'a', targetField: 'b', transformationType: 'split' });
    expect(result.preview).toEqual(expect.objectContaining({ transformationType: 'split' }));
  });

  it('accepts format', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({ project: 'test', sourceField: 'a', targetField: 'b', transformationType: 'format' });
    expect(result.preview).toEqual(expect.objectContaining({ transformationType: 'format' }));
  });

  it('accepts lookup', () => {
    const service = new BloomreachDataManagerService('test');
    const result = service.prepareConfigureMapping({ project: 'test', sourceField: 'a', targetField: 'b', transformationType: 'lookup' });
    expect(result.preview).toEqual(expect.objectContaining({ transformationType: 'lookup' }));
  });

  it('throws for invalid enum value', () => {
    const service = new BloomreachDataManagerService('test');
    expect(() =>
      service.prepareConfigureMapping({ project: 'test', sourceField: 'a', targetField: 'b', transformationType: 'merge' }),
    ).toThrow('must be one of');
  });
});

describe('buildCustomerPropertiesUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildCustomerPropertiesUrl('my-project')).toBe('/p/my-project/data/management/customer-properties');
  });

  it('encodes spaces', () => {
    expect(buildCustomerPropertiesUrl('my project')).toBe('/p/my%20project/data/management/customer-properties');
  });

  it('encodes slashes', () => {
    expect(buildCustomerPropertiesUrl('org/project')).toBe('/p/org%2Fproject/data/management/customer-properties');
  });
});

describe('buildEventsUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildEventsUrl('my-project')).toBe('/p/my-project/data/management/events');
  });

  it('encodes spaces', () => {
    expect(buildEventsUrl('my project')).toBe('/p/my%20project/data/management/events');
  });

  it('encodes slashes', () => {
    expect(buildEventsUrl('org/project')).toBe('/p/org%2Fproject/data/management/events');
  });
});

describe('buildDefinitionsUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildDefinitionsUrl('my-project')).toBe('/p/my-project/data/management/definitions');
  });

  it('encodes spaces', () => {
    expect(buildDefinitionsUrl('my project')).toBe('/p/my%20project/data/management/definitions');
  });

  it('encodes slashes', () => {
    expect(buildDefinitionsUrl('org/project')).toBe('/p/org%2Fproject/data/management/definitions');
  });
});

describe('buildMappingUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildMappingUrl('my-project')).toBe('/p/my-project/data/management/mapping');
  });

  it('encodes spaces', () => {
    expect(buildMappingUrl('my project')).toBe('/p/my%20project/data/management/mapping');
  });

  it('encodes slashes', () => {
    expect(buildMappingUrl('org/project')).toBe('/p/org%2Fproject/data/management/mapping');
  });
});

describe('buildContentSourcesUrl', () => {
  it('builds URL for simple project', () => {
    expect(buildContentSourcesUrl('my-project')).toBe('/p/my-project/data/management/content-sources');
  });

  it('encodes spaces', () => {
    expect(buildContentSourcesUrl('my project')).toBe('/p/my%20project/data/management/content-sources');
  });

  it('encodes slashes', () => {
    expect(buildContentSourcesUrl('org/project')).toBe('/p/org%2Fproject/data/management/content-sources');
  });
});

describe('createDataManagerActionExecutors', () => {
  it('returns executors for all 9 action types', () => {
    const executors = createDataManagerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(9);
    expect(executors[ADD_CUSTOMER_PROPERTY_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_CUSTOMER_PROPERTY_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_EVENT_DEFINITION_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_FIELD_DEFINITION_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_FIELD_DEFINITION_ACTION_TYPE]).toBeDefined();
    expect(executors[CONFIGURE_MAPPING_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_CONTENT_SOURCE_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_CONTENT_SOURCE_ACTION_TYPE]).toBeDefined();
    expect(executors[SAVE_CHANGES_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has actionType matching its key', () => {
    const executors = createDataManagerActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('each executor throws not yet implemented on execute', async () => {
    const executors = createDataManagerActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachDataManagerService', () => {
  describe('constructor', () => {
    it('creates instance with valid project', () => {
      const service = new BloomreachDataManagerService('my-project');
      expect(service).toBeInstanceOf(BloomreachDataManagerService);
    });

    it('exposes all 5 URL getters with correct paths', () => {
      const service = new BloomreachDataManagerService('my-project');
      expect(service.customerPropertiesUrl).toBe('/p/my-project/data/management/customer-properties');
      expect(service.eventsUrl).toBe('/p/my-project/data/management/events');
      expect(service.definitionsUrl).toBe('/p/my-project/data/management/definitions');
      expect(service.mappingUrl).toBe('/p/my-project/data/management/mapping');
      expect(service.contentSourcesUrl).toBe('/p/my-project/data/management/content-sources');
    });

    it('trims project name', () => {
      const service = new BloomreachDataManagerService('  my-project  ');
      expect(service.customerPropertiesUrl).toBe('/p/my-project/data/management/customer-properties');
      expect(service.eventsUrl).toBe('/p/my-project/data/management/events');
      expect(service.definitionsUrl).toBe('/p/my-project/data/management/definitions');
      expect(service.mappingUrl).toBe('/p/my-project/data/management/mapping');
      expect(service.contentSourcesUrl).toBe('/p/my-project/data/management/content-sources');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachDataManagerService('')).toThrow('must not be empty');
    });
  });

  describe('listCustomerProperties', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listCustomerProperties()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listCustomerProperties({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('listEvents', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listEvents()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listEvents({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('listFieldDefinitions', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listFieldDefinitions()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listFieldDefinitions({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('listMappings', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listMappings()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listMappings({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('listContentSources', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listContentSources()).rejects.toThrow('not yet implemented');
    });

    it('validates project when input provided', async () => {
      const service = new BloomreachDataManagerService('test');
      await expect(service.listContentSources({ project: '' })).rejects.toThrow('must not be empty');
    });
  });

  describe('prepareAddCustomerProperty', () => {
    it('returns prepared action with valid input, preview includes all fields', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareAddCustomerProperty({
        project: 'test',
        name: '  customer_tier  ',
        type: 'string',
        description: '  Tier on profile  ',
        group: '  loyalty  ',
        isRequired: true,
        operatorNote: 'Add new property',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.add_customer_property',
          project: 'test',
          name: 'customer_tier',
          type: 'string',
          description: 'Tier on profile',
          group: 'loyalty',
          isRequired: true,
          operatorNote: 'Add new property',
        }),
      );
    });

    it('throws for empty property name', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddCustomerProperty({ project: 'test', name: '', type: 'string' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for invalid property type', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddCustomerProperty({ project: 'test', name: 'tier', type: 'text' })).toThrow(
        'must be one of',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddCustomerProperty({ project: '', name: 'tier', type: 'string' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareEditCustomerProperty', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareEditCustomerProperty({
        project: 'test',
        propertyName: '  customer_tier  ',
        description: '  New description  ',
        type: 'string',
        group: '  loyalty  ',
        operatorNote: 'Adjust property metadata',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.edit_customer_property',
          project: 'test',
          propertyName: 'customer_tier',
          description: 'New description',
          type: 'string',
          group: 'loyalty',
          operatorNote: 'Adjust property metadata',
        }),
      );
    });

    it('throws for empty property name', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditCustomerProperty({ project: 'test', propertyName: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditCustomerProperty({ project: '', propertyName: 'tier' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareAddEventDefinition', () => {
    it('returns prepared action with valid input including properties array', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareAddEventDefinition({
        project: 'test',
        name: '  checkout_completed  ',
        type: 'json',
        description: '  Checkout completed event  ',
        properties: [
          { name: ' order_id ', type: 'string', description: '  Unique order id  ', isRequired: true },
          { name: ' total ', type: 'number' },
        ],
        operatorNote: 'Track checkout outcomes',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.add_event_definition',
          project: 'test',
          name: 'checkout_completed',
          type: 'json',
          description: 'Checkout completed event',
          operatorNote: 'Track checkout outcomes',
        }),
      );
      expect(result.preview).toEqual(
        expect.objectContaining({
          properties: [
            { name: 'order_id', type: 'string', description: 'Unique order id', isRequired: true },
            { name: 'total', type: 'number', description: undefined, isRequired: undefined },
          ],
        }),
      );
    });

    it('throws for empty event name', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddEventDefinition({ project: 'test', name: '', type: 'json' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for invalid event type', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddEventDefinition({ project: 'test', name: 'event', type: 'object' })).toThrow(
        'must be one of',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddEventDefinition({ project: '', name: 'event', type: 'json' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareAddFieldDefinition', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareAddFieldDefinition({
        project: 'test',
        name: '  Product Category  ',
        type: 'string',
        description: '  Category for products  ',
        category: '  catalog  ',
        operatorNote: 'Create field',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.add_field_definition',
          project: 'test',
          name: 'Product Category',
          type: 'string',
          description: 'Category for products',
          category: 'catalog',
          operatorNote: 'Create field',
        }),
      );
    });

    it('throws for empty definition name', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddFieldDefinition({ project: 'test', name: '', type: 'string' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for invalid field type', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddFieldDefinition({ project: 'test', name: 'def', type: 'object' })).toThrow(
        'must be one of',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddFieldDefinition({ project: '', name: 'def', type: 'string' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareEditFieldDefinition', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareEditFieldDefinition({
        project: 'test',
        definitionId: '  def-123  ',
        name: '  Product Segment  ',
        type: 'string',
        description: '  Segmentation field  ',
        category: '  segmentation  ',
        operatorNote: 'Update field',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.edit_field_definition',
          project: 'test',
          definitionId: 'def-123',
          name: 'Product Segment',
          type: 'string',
          description: 'Segmentation field',
          category: 'segmentation',
          operatorNote: 'Update field',
        }),
      );
    });

    it('throws for empty definition ID', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditFieldDefinition({ project: 'test', definitionId: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditFieldDefinition({ project: '', definitionId: 'def' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareConfigureMapping', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareConfigureMapping({
        project: 'test',
        sourceField: '  src_email  ',
        targetField: '  customer.email  ',
        transformationType: 'direct',
        isActive: true,
        operatorNote: 'Set email mapping',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.configure_mapping',
          project: 'test',
          sourceField: 'src_email',
          targetField: 'customer.email',
          transformationType: 'direct',
          isActive: true,
          operatorNote: 'Set email mapping',
        }),
      );
    });

    it('throws for empty source field', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() =>
        service.prepareConfigureMapping({ project: 'test', sourceField: '', targetField: 't', transformationType: 'direct' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty target field', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() =>
        service.prepareConfigureMapping({ project: 'test', sourceField: 's', targetField: '', transformationType: 'direct' }),
      ).toThrow('must not be empty');
    });

    it('throws for invalid transformation type', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() =>
        service.prepareConfigureMapping({ project: 'test', sourceField: 's', targetField: 't', transformationType: 'merge' }),
      ).toThrow('must be one of');
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() =>
        service.prepareConfigureMapping({ project: '', sourceField: 's', targetField: 't', transformationType: 'direct' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareAddContentSource', () => {
    it('returns prepared action with valid input including configuration', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareAddContentSource({
        project: 'test',
        name: '  Product Feed API  ',
        sourceType: 'api',
        url: '  https://api.example.com/products  ',
        configuration: { auth: 'bearer', schedule: 'hourly' },
        operatorNote: 'Add source',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.add_content_source',
          project: 'test',
          name: 'Product Feed API',
          sourceType: 'api',
          url: 'https://api.example.com/products',
          configuration: { auth: 'bearer', schedule: 'hourly' },
          operatorNote: 'Add source',
        }),
      );
    });

    it('throws for empty source name', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddContentSource({ project: 'test', name: '', sourceType: 'api', url: 'https://x.y' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for invalid source type', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() =>
        service.prepareAddContentSource({ project: 'test', name: 'source', sourceType: 'manual', url: 'https://x.y' }),
      ).toThrow('must be one of');
    });

    it('throws for empty URL', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddContentSource({ project: 'test', name: 'source', sourceType: 'api', url: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareAddContentSource({ project: '', name: 'source', sourceType: 'api', url: 'https://x.y' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareEditContentSource', () => {
    it('returns prepared action with valid input', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareEditContentSource({
        project: 'test',
        sourceId: '  source-123  ',
        name: '  Product Feed API v2  ',
        url: '  https://api.example.com/v2/products  ',
        configuration: { auth: 'oauth2' },
        operatorNote: 'Upgrade source',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.edit_content_source',
          project: 'test',
          sourceId: 'source-123',
          name: 'Product Feed API v2',
          url: 'https://api.example.com/v2/products',
          configuration: { auth: 'oauth2' },
          operatorNote: 'Upgrade source',
        }),
      );
    });

    it('throws for empty source ID', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditContentSource({ project: 'test', sourceId: '' })).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareEditContentSource({ project: '', sourceId: 'source-1' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareSaveChanges', () => {
    it('returns prepared action with valid input and operatorNote', () => {
      const service = new BloomreachDataManagerService('test');
      const result = service.prepareSaveChanges({
        project: 'test',
        operatorNote: 'Save all staged changes',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'dataManager.save_changes',
          project: 'test',
          operatorNote: 'Save all staged changes',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachDataManagerService('test');
      expect(() => service.prepareSaveChanges({ project: '' })).toThrow('must not be empty');
    });
  });
});
