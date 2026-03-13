import { describe, it, expect } from 'vitest';
import {
  UPDATE_PROJECT_NAME_ACTION_TYPE,
  UPDATE_CUSTOM_URL_ACTION_TYPE,
  UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE,
  CREATE_CUSTOM_TAG_ACTION_TYPE,
  UPDATE_CUSTOM_TAG_ACTION_TYPE,
  DELETE_CUSTOM_TAG_ACTION_TYPE,
  CREATE_PROJECT_VARIABLE_ACTION_TYPE,
  UPDATE_PROJECT_VARIABLE_ACTION_TYPE,
  DELETE_PROJECT_VARIABLE_ACTION_TYPE,
  PROJECT_SETTINGS_RATE_LIMIT_WINDOW_MS,
  PROJECT_SETTINGS_MODIFY_RATE_LIMIT,
  PROJECT_SETTINGS_TAG_RATE_LIMIT,
  PROJECT_SETTINGS_VARIABLE_RATE_LIMIT,
  validateProjectName,
  validateCustomTagName,
  validateCustomTagId,
  validateTagColor,
  validateVariableName,
  validateVariableValue,
  validateCustomUrl,
  buildProjectSettingsGeneralUrl,
  buildProjectSettingsTermsUrl,
  buildProjectSettingsCustomTagsUrl,
  buildProjectSettingsVariablesUrl,
  createProjectSettingsActionExecutors,
  BloomreachProjectSettingsService,
} from '../index.js';

describe('action type constants', () => {
  it('exports UPDATE_PROJECT_NAME_ACTION_TYPE', () => {
    expect(UPDATE_PROJECT_NAME_ACTION_TYPE).toBe('project_settings.update_project_name');
  });

  it('exports UPDATE_CUSTOM_URL_ACTION_TYPE', () => {
    expect(UPDATE_CUSTOM_URL_ACTION_TYPE).toBe('project_settings.update_custom_url');
  });

  it('exports UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE', () => {
    expect(UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE).toBe(
      'project_settings.update_terms_and_conditions',
    );
  });

  it('exports CREATE_CUSTOM_TAG_ACTION_TYPE', () => {
    expect(CREATE_CUSTOM_TAG_ACTION_TYPE).toBe('project_settings.create_custom_tag');
  });

  it('exports UPDATE_CUSTOM_TAG_ACTION_TYPE', () => {
    expect(UPDATE_CUSTOM_TAG_ACTION_TYPE).toBe('project_settings.update_custom_tag');
  });

  it('exports DELETE_CUSTOM_TAG_ACTION_TYPE', () => {
    expect(DELETE_CUSTOM_TAG_ACTION_TYPE).toBe('project_settings.delete_custom_tag');
  });

  it('exports CREATE_PROJECT_VARIABLE_ACTION_TYPE', () => {
    expect(CREATE_PROJECT_VARIABLE_ACTION_TYPE).toBe(
      'project_settings.create_project_variable',
    );
  });

  it('exports UPDATE_PROJECT_VARIABLE_ACTION_TYPE', () => {
    expect(UPDATE_PROJECT_VARIABLE_ACTION_TYPE).toBe(
      'project_settings.update_project_variable',
    );
  });

  it('exports DELETE_PROJECT_VARIABLE_ACTION_TYPE', () => {
    expect(DELETE_PROJECT_VARIABLE_ACTION_TYPE).toBe(
      'project_settings.delete_project_variable',
    );
  });
});

describe('rate limit constants', () => {
  it('exports PROJECT_SETTINGS_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(PROJECT_SETTINGS_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports PROJECT_SETTINGS_MODIFY_RATE_LIMIT', () => {
    expect(PROJECT_SETTINGS_MODIFY_RATE_LIMIT).toBe(20);
  });

  it('exports PROJECT_SETTINGS_TAG_RATE_LIMIT', () => {
    expect(PROJECT_SETTINGS_TAG_RATE_LIMIT).toBe(30);
  });

  it('exports PROJECT_SETTINGS_VARIABLE_RATE_LIMIT', () => {
    expect(PROJECT_SETTINGS_VARIABLE_RATE_LIMIT).toBe(30);
  });
});

describe('validateProjectName', () => {
  it('throws for empty string', () => {
    expect(() => validateProjectName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateProjectName('   ')).toThrow('must not be empty');
  });

  it('returns trimmed name for valid input', () => {
    expect(validateProjectName('  My Project  ')).toBe('My Project');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateProjectName(name)).toBe(name);
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateProjectName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateCustomTagName', () => {
  it('throws for empty string', () => {
    expect(() => validateCustomTagName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCustomTagName('   ')).toThrow('must not be empty');
  });

  it('returns trimmed name for valid input', () => {
    expect(validateCustomTagName('  Priority  ')).toBe('Priority');
  });

  it('accepts tag name at maximum length', () => {
    const name = 'x'.repeat(100);
    expect(validateCustomTagName(name)).toBe(name);
  });

  it('throws for tag name exceeding maximum length', () => {
    const name = 'x'.repeat(101);
    expect(() => validateCustomTagName(name)).toThrow('must not exceed 100 characters');
  });
});

describe('validateCustomTagId', () => {
  it('throws for empty string', () => {
    expect(() => validateCustomTagId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCustomTagId('   ')).toThrow('must not be empty');
  });

  it('returns trimmed ID for valid input', () => {
    expect(validateCustomTagId('  tag-123  ')).toBe('tag-123');
  });
});

describe('validateTagColor', () => {
  it('accepts valid hex color', () => {
    expect(validateTagColor('#FF5733')).toBe('#FF5733');
  });

  it('throws for missing # prefix', () => {
    expect(() => validateTagColor('FF5733')).toThrow('valid hex color code');
  });

  it('throws for wrong hex length', () => {
    expect(() => validateTagColor('#FFF')).toThrow('valid hex color code');
  });

  it('throws for invalid hex characters', () => {
    expect(() => validateTagColor('#GG5733')).toThrow('valid hex color code');
  });
});

describe('validateVariableName', () => {
  it('throws for empty string', () => {
    expect(() => validateVariableName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateVariableName('   ')).toThrow('must not be empty');
  });

  it('returns trimmed variable name for valid input', () => {
    expect(validateVariableName('  welcome_message  ')).toBe('welcome_message');
  });

  it('accepts variable name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateVariableName(name)).toBe(name);
  });

  it('throws for variable name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateVariableName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateVariableValue', () => {
  it('accepts valid variable value', () => {
    expect(validateVariableValue('hello world')).toBe('hello world');
  });

  it('throws for value exceeding maximum length', () => {
    const value = 'x'.repeat(5001);
    expect(() => validateVariableValue(value)).toThrow('must not exceed 5000 characters');
  });
});

describe('validateCustomUrl', () => {
  it('throws for empty string', () => {
    expect(() => validateCustomUrl('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateCustomUrl('   ')).toThrow('must not be empty');
  });

  it('returns trimmed URL for valid input', () => {
    expect(validateCustomUrl('  https://example.com/path  ')).toBe('https://example.com/path');
  });

  it('accepts custom URL at maximum length', () => {
    const url = 'x'.repeat(500);
    expect(validateCustomUrl(url)).toBe(url);
  });

  it('throws for custom URL exceeding maximum length', () => {
    const url = 'x'.repeat(501);
    expect(() => validateCustomUrl(url)).toThrow('must not exceed 500 characters');
  });
});

describe('URL builders', () => {
  it('builds all URLs for a simple project name', () => {
    expect(buildProjectSettingsGeneralUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/general',
    );
    expect(buildProjectSettingsTermsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/terms-and-conditions',
    );
    expect(buildProjectSettingsCustomTagsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/custom-tags',
    );
    expect(buildProjectSettingsVariablesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/project-settings/project-variables-project',
    );
  });

  it('encodes special characters in all URLs', () => {
    expect(buildProjectSettingsGeneralUrl('my project')).toBe(
      '/p/my%20project/project-settings/general',
    );
    expect(buildProjectSettingsTermsUrl('my project')).toBe(
      '/p/my%20project/project-settings/terms-and-conditions',
    );
    expect(buildProjectSettingsCustomTagsUrl('my project')).toBe(
      '/p/my%20project/project-settings/custom-tags',
    );
    expect(buildProjectSettingsVariablesUrl('my project')).toBe(
      '/p/my%20project/project-settings/project-variables-project',
    );
  });

  it('handles project names with slashes in all URLs', () => {
    expect(buildProjectSettingsGeneralUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/general',
    );
    expect(buildProjectSettingsTermsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/terms-and-conditions',
    );
    expect(buildProjectSettingsCustomTagsUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/custom-tags',
    );
    expect(buildProjectSettingsVariablesUrl('org/project')).toBe(
      '/p/org%2Fproject/project-settings/project-variables-project',
    );
  });
});

describe('createProjectSettingsActionExecutors', () => {
  it('returns executors for all nine action types', () => {
    const executors = createProjectSettingsActionExecutors();
    expect(Object.keys(executors)).toHaveLength(9);
    expect(executors[UPDATE_PROJECT_NAME_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_CUSTOM_URL_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_TERMS_AND_CONDITIONS_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_CUSTOM_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_CUSTOM_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_CUSTOM_TAG_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_PROJECT_VARIABLE_ACTION_TYPE]).toBeDefined();
    expect(executors[UPDATE_PROJECT_VARIABLE_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_PROJECT_VARIABLE_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property', () => {
    const executors = createProjectSettingsActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createProjectSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachProjectSettingsService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachProjectSettingsService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachProjectSettingsService);
    });

    it('trims project name', () => {
      const service = new BloomreachProjectSettingsService('  my-project  ');
      expect(service.projectSettingsGeneralUrl).toBe('/p/my-project/project-settings/general');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachProjectSettingsService('')).toThrow('must not be empty');
    });
  });

  describe('URL getters', () => {
    it('returns all project settings URLs', () => {
      const service = new BloomreachProjectSettingsService('kingdom-of-joakim');
      expect(service.projectSettingsGeneralUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/general',
      );
      expect(service.projectSettingsTermsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/terms-and-conditions',
      );
      expect(service.projectSettingsCustomTagsUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/custom-tags',
      );
      expect(service.projectSettingsVariablesUrl).toBe(
        '/p/kingdom-of-joakim/project-settings/project-variables-project',
      );
    });
  });

  describe('read methods', () => {
    it('viewProjectSettings throws not-yet-implemented error', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.viewProjectSettings()).rejects.toThrow('not yet implemented');
    });

    it('viewProjectToken throws not-yet-implemented error', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.viewProjectToken()).rejects.toThrow('not yet implemented');
    });

    it('viewTermsAndConditions throws not-yet-implemented error', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.viewTermsAndConditions()).rejects.toThrow('not yet implemented');
    });

    it('listCustomTags throws not-yet-implemented error', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.listCustomTags()).rejects.toThrow('not yet implemented');
    });

    it('listProjectVariables throws not-yet-implemented error', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.listProjectVariables()).rejects.toThrow('not yet implemented');
    });
  });

  describe('prepareUpdateProjectName', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectName({
        project: 'test',
        name: 'New Name',
        operatorNote: 'rename project',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.update_project_name',
          project: 'test',
          name: 'New Name',
          operatorNote: 'rename project',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareUpdateProjectName({ project: '', name: 'New Name' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareUpdateProjectName({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareUpdateCustomUrl', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateCustomUrl({
        project: 'test',
        customUrl: 'https://example.com/new',
        operatorNote: 'set vanity domain',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.update_custom_url',
          project: 'test',
          customUrl: 'https://example.com/new',
          operatorNote: 'set vanity domain',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareUpdateCustomUrl({ project: '', customUrl: 'x' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty custom URL', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareUpdateCustomUrl({ project: 'test', customUrl: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareUpdateTermsAndConditions', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateTermsAndConditions({
        project: 'test',
        accepted: true,
        operatorNote: 'accepted legal terms',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.update_terms_and_conditions',
          project: 'test',
          accepted: true,
          operatorNote: 'accepted legal terms',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateTermsAndConditions({ project: '', accepted: true }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareCreateCustomTag', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateCustomTag({
        project: 'test',
        name: 'Urgent',
        color: '#FF0000',
        operatorNote: 'create triage tag',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.create_custom_tag',
          project: 'test',
          name: 'Urgent',
          color: '#FF0000',
          operatorNote: 'create triage tag',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareCreateCustomTag({ project: '', name: 'Urgent' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty tag name', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareCreateCustomTag({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareUpdateCustomTag', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateCustomTag({
        project: 'test',
        tagId: 'tag-1',
        name: 'Updated Tag',
        color: '#00FF00',
        operatorNote: 'refresh tag style',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.update_custom_tag',
          project: 'test',
          tagId: 'tag-1',
          name: 'Updated Tag',
          color: '#00FF00',
          operatorNote: 'refresh tag style',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateCustomTag({ project: '', tagId: 'tag-1', name: 'Updated' }),
      ).toThrow('must not be empty');
    });

    it('throws for empty tag ID', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateCustomTag({ project: 'test', tagId: '', name: 'Updated' }),
      ).toThrow('must not be empty');
    });

    it('throws when neither name nor color is provided', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateCustomTag({
          project: 'test',
          tagId: 'tag-1',
        }),
      ).toThrow('At least one of name or color must be provided');
    });
  });

  describe('prepareDeleteCustomTag', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareDeleteCustomTag({
        project: 'test',
        tagId: 'tag-2',
        operatorNote: 'cleanup old tag',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.delete_custom_tag',
          project: 'test',
          tagId: 'tag-2',
          operatorNote: 'cleanup old tag',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareDeleteCustomTag({ project: '', tagId: 'tag-2' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty tag ID', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() => service.prepareDeleteCustomTag({ project: 'test', tagId: '' })).toThrow(
        'must not be empty',
      );
    });
  });

  describe('prepareCreateProjectVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateProjectVariable({
        project: 'test',
        name: 'welcome_message',
        value: 'Hello there',
        description: 'Used in welcome email',
        operatorNote: 'add template variable',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.create_project_variable',
          project: 'test',
          name: 'welcome_message',
          value: 'Hello there',
          description: 'Used in welcome email',
          operatorNote: 'add template variable',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareCreateProjectVariable({
          project: '',
          name: 'welcome_message',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty variable name', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareCreateProjectVariable({
          project: 'test',
          name: '',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareUpdateProjectVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectVariable({
        project: 'test',
        variableName: 'welcome_message',
        value: 'Hello again',
        description: 'Updated value',
        operatorNote: 'refresh copy',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.update_project_variable',
          project: 'test',
          variableName: 'welcome_message',
          value: 'Hello again',
          description: 'Updated value',
          operatorNote: 'refresh copy',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateProjectVariable({
          project: '',
          variableName: 'welcome_message',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty variable name', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateProjectVariable({
          project: 'test',
          variableName: '',
          value: 'Hello',
        }),
      ).toThrow('must not be empty');
    });

    it('throws when neither value nor description is provided', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateProjectVariable({
          project: 'test',
          variableName: 'welcome_message',
        }),
      ).toThrow('At least one of value or description must be provided');
    });
  });

  describe('prepareDeleteProjectVariable', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareDeleteProjectVariable({
        project: 'test',
        variableName: 'welcome_message',
        operatorNote: 'remove obsolete variable',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'project_settings.delete_project_variable',
          project: 'test',
          variableName: 'welcome_message',
          operatorNote: 'remove obsolete variable',
        }),
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareDeleteProjectVariable({
          project: '',
          variableName: 'welcome_message',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty variable name', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareDeleteProjectVariable({
          project: 'test',
          variableName: '',
        }),
      ).toThrow('must not be empty');
    });
  });
});
