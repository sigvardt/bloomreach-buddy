import { describe, it, expect, vi, afterEach } from 'vitest';
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
  PROJECT_TYPES,
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
  maskProjectToken,
  createProjectSettingsActionExecutors,
  BloomreachProjectSettingsService,
} from '../index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('enum arrays', () => {
  it('exports PROJECT_TYPES in order', () => {
    expect(PROJECT_TYPES).toEqual(['Production', 'Sandbox', 'Development']);
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

  it('accepts single-character name', () => expect(validateProjectName('A')).toBe('A'));

  it('accepts mixed whitespace around valid name', () =>
    expect(validateProjectName(' \t  My Project \n ')).toBe('My Project'));

  it('throws for newline-only string', () =>
    expect(() => validateProjectName('\n\n')).toThrow('must not be empty'));

  it('throws for tab-only string', () =>
    expect(() => validateProjectName('\t\t')).toThrow('must not be empty'));

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

  it('accepts single-character tag name', () => expect(validateCustomTagName('X')).toBe('X'));

  it('accepts mixed whitespace around valid name', () =>
    expect(validateCustomTagName(' \t Priority \n ')).toBe('Priority'));

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

  it('accepts lowercase hex color', () => expect(validateTagColor('#ff5733')).toBe('#ff5733'));

  it('trims whitespace around valid hex color', () =>
    expect(validateTagColor('  #FF5733  ')).toBe('#FF5733'));

  it('throws for empty string', () => expect(() => validateTagColor('')).toThrow('valid hex color code'));

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

  it('accepts single-character variable name', () => expect(validateVariableName('x')).toBe('x'));

  it('accepts mixed whitespace around valid name', () =>
    expect(validateVariableName(' \t welcome_msg \n ')).toBe('welcome_msg'));

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

  it('accepts empty string', () => expect(validateVariableValue('')).toBe(''));

  it('accepts value at maximum length', () => {
    const v = 'x'.repeat(5000);
    expect(validateVariableValue(v)).toBe(v);
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

  it('accepts single-character URL', () => expect(validateCustomUrl('x')).toBe('x'));

  it('accepts mixed whitespace around valid URL', () =>
    expect(validateCustomUrl(' \t https://example.com \n ')).toBe('https://example.com'));

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

  it('encodes unicode characters in all URLs', () => {
    expect(buildProjectSettingsGeneralUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/general',
    );
    expect(buildProjectSettingsTermsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/terms-and-conditions',
    );
    expect(buildProjectSettingsCustomTagsUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/custom-tags',
    );
    expect(buildProjectSettingsVariablesUrl('projekt åäö')).toBe(
      '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/project-variables-project',
    );
  });

  it('encodes hash in all URLs', () => {
    expect(buildProjectSettingsGeneralUrl('my#project')).toBe(
      '/p/my%23project/project-settings/general',
    );
    expect(buildProjectSettingsTermsUrl('my#project')).toBe(
      '/p/my%23project/project-settings/terms-and-conditions',
    );
    expect(buildProjectSettingsCustomTagsUrl('my#project')).toBe(
      '/p/my%23project/project-settings/custom-tags',
    );
    expect(buildProjectSettingsVariablesUrl('my#project')).toBe(
      '/p/my%23project/project-settings/project-variables-project',
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

  it('executors throw with UI-only error message', async () => {
    const executors = createProjectSettingsActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
      await expect(executor.execute({})).rejects.toThrow('Bloomreach Engagement UI');
    }
  });
});

describe('maskProjectToken', () => {
  it('masks token showing only last 4 characters', () => {
    expect(maskProjectToken('abc123-def456-ghi789')).toBe('*'.repeat(16) + 'i789');
  });

  it('returns all asterisks for token with exactly 4 characters', () => {
    expect(maskProjectToken('abcd')).toBe('****');
  });

  it('returns all asterisks for token shorter than 4 characters', () => {
    expect(maskProjectToken('ab')).toBe('**');
  });

  it('returns 4 asterisks for empty string', () => {
    expect(maskProjectToken('')).toBe('****');
  });

  it('masks single-character token', () => {
    expect(maskProjectToken('x')).toBe('*');
  });

  it('masks 5-character token showing last 4', () => {
    expect(maskProjectToken('abcde')).toBe('*bcde');
  });

  it('preserves exact length of original token', () => {
    const token = 'project-token-12345678';
    const masked = maskProjectToken(token);
    expect(masked.length).toBe(token.length);
    expect(masked.endsWith('5678')).toBe(true);
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

    it('encodes special characters in project name', () => {
      const service = new BloomreachProjectSettingsService('my project');
      expect(service.projectSettingsGeneralUrl).toContain('my%20project');

      const service2 = new BloomreachProjectSettingsService('org/proj');
      expect(service2.projectSettingsGeneralUrl).toContain('org%2Fproj');
    });

    it('encodes unicode characters in constructor URL', () => {
      const service = new BloomreachProjectSettingsService('projekt åäö');
      expect(service.projectSettingsGeneralUrl).toBe(
        '/p/projekt%20%C3%A5%C3%A4%C3%B6/project-settings/general',
      );
    });

    it('encodes hash in constructor URL', () => {
      const service = new BloomreachProjectSettingsService('my#project');
      expect(service.projectSettingsGeneralUrl).toBe('/p/my%23project/project-settings/general');
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

    it('validates project for read methods when input is provided', async () => {
      const service = new BloomreachProjectSettingsService('test');
      await expect(service.viewProjectSettings({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.viewProjectToken({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.viewTermsAndConditions({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.listCustomTags({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.listProjectVariables({ project: '' })).rejects.toThrow('must not be empty');
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

    it('accepts update with only color (no name)', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateCustomTag({
        project: 'test',
        tagId: 'tag-1',
        color: '#0000FF',
      });
      expect(result.preview.color).toBe('#0000FF');
      expect(result.preview.name).toBeUndefined();
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

    it('accepts update with only description (no value)', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectVariable({
        project: 'test',
        variableName: 'welcome_message',
        description: 'Updated description only',
      });
      expect(result.preview.description).toBe('Updated description only');
      expect(result.preview.value).toBeUndefined();
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

  describe('token expiry', () => {
    it('sets expiresAtMs to approximately 30 minutes from now', () => {
      const service = new BloomreachProjectSettingsService('test');
      const before = Date.now();
      const result = service.prepareUpdateProjectName({
        project: 'test',
        name: 'Expiry Test',
      });
      const after = Date.now();

      const expectedTtl = 30 * 60 * 1000;
      expect(result.expiresAtMs).toBeGreaterThanOrEqual(before + expectedTtl);
      expect(result.expiresAtMs).toBeLessThanOrEqual(after + expectedTtl);
    });

    it('all prepare methods set consistent expiry', () => {
      const service = new BloomreachProjectSettingsService('test');
      const tolerance = 1000;
      const expectedTtl = 30 * 60 * 1000;

      const results = [
        service.prepareUpdateProjectName({ project: 'test', name: 'Name' }),
        service.prepareUpdateCustomUrl({ project: 'test', customUrl: 'https://example.com' }),
        service.prepareUpdateTermsAndConditions({ project: 'test', accepted: true }),
        service.prepareCreateCustomTag({ project: 'test', name: 'Tag' }),
        service.prepareUpdateCustomTag({ project: 'test', tagId: 'tag-1', name: 'Updated' }),
        service.prepareDeleteCustomTag({ project: 'test', tagId: 'tag-1' }),
        service.prepareCreateProjectVariable({ project: 'test', name: 'var', value: 'val' }),
        service.prepareUpdateProjectVariable({ project: 'test', variableName: 'var', value: 'val' }),
        service.prepareDeleteProjectVariable({ project: 'test', variableName: 'var' }),
      ];

      for (const result of results) {
        const now = Date.now();
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + expectedTtl - tolerance);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + expectedTtl + tolerance);
      }
    });
  });

  describe('optional fields in preview', () => {
    it('prepareUpdateProjectName includes operatorNote when provided', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectName({
        project: 'test',
        name: 'Name',
        operatorNote: 'test-note',
      });
      expect(result.preview.operatorNote).toBe('test-note');
    });

    it('prepareUpdateProjectName excludes operatorNote when omitted', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectName({
        project: 'test',
        name: 'Name',
      });
      expect(result.preview.operatorNote).toBeUndefined();
    });

    it('prepareCreateCustomTag includes color when provided', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateCustomTag({
        project: 'test',
        name: 'Tag',
        color: '#FF0000',
      });
      expect(result.preview.color).toBe('#FF0000');
    });

    it('prepareCreateCustomTag excludes color when omitted', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateCustomTag({
        project: 'test',
        name: 'Tag',
      });
      expect(result.preview.color).toBeUndefined();
    });

    it('prepareCreateProjectVariable includes description when provided', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateProjectVariable({
        project: 'test',
        name: 'var',
        value: 'val',
        description: 'A description',
      });
      expect(result.preview.description).toBe('A description');
    });

    it('prepareCreateProjectVariable excludes description when omitted', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateProjectVariable({
        project: 'test',
        name: 'var',
        value: 'val',
      });
      expect(result.preview.description).toBeUndefined();
    });
  });

  describe('prepare methods shared validation', () => {
    it('throws on empty project for all prepare methods', () => {
      const service = new BloomreachProjectSettingsService('test');

      expect(() => service.prepareUpdateProjectName({ project: '', name: 'Name' })).toThrow(
        'must not be empty',
      );

      expect(() =>
        service.prepareUpdateCustomUrl({ project: '', customUrl: 'https://x.com' }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareUpdateTermsAndConditions({ project: '', accepted: true }),
      ).toThrow('must not be empty');

      expect(() => service.prepareCreateCustomTag({ project: '', name: 'Tag' })).toThrow(
        'must not be empty',
      );

      expect(() =>
        service.prepareUpdateCustomTag({ project: '', tagId: 'tag-1', name: 'Tag' }),
      ).toThrow('must not be empty');

      expect(() => service.prepareDeleteCustomTag({ project: '', tagId: 'tag-1' })).toThrow(
        'must not be empty',
      );

      expect(() =>
        service.prepareCreateProjectVariable({ project: '', name: 'var', value: 'val' }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareUpdateProjectVariable({ project: '', variableName: 'var', value: 'val' }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareDeleteProjectVariable({ project: '', variableName: 'var' }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepare method boundary validation', () => {
    it('accepts project name at exactly 200 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateProjectName({
        project: 'test',
        name: 'x'.repeat(200),
      });
      expect(result.preview.name).toBe('x'.repeat(200));
    });

    it('rejects project name at 201 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateProjectName({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts tag name at exactly 100 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateCustomTag({
        project: 'test',
        name: 'x'.repeat(100),
      });
      expect(result.preview.name).toBe('x'.repeat(100));
    });

    it('rejects tag name at 101 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareCreateCustomTag({
          project: 'test',
          name: 'x'.repeat(101),
        }),
      ).toThrow('must not exceed 100 characters');
    });

    it('accepts variable name at exactly 200 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareCreateProjectVariable({
        project: 'test',
        name: 'x'.repeat(200),
        value: 'val',
      });
      expect(result.preview.name).toBe('x'.repeat(200));
    });

    it('rejects variable name at 201 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareCreateProjectVariable({
          project: 'test',
          name: 'x'.repeat(201),
          value: 'val',
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts variable value at exactly 5000 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      const val = 'x'.repeat(5000);
      const result = service.prepareCreateProjectVariable({
        project: 'test',
        name: 'var',
        value: val,
      });
      expect(result.preview.value).toBe(val);
    });

    it('rejects variable value at 5001 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareCreateProjectVariable({
          project: 'test',
          name: 'var',
          value: 'x'.repeat(5001),
        }),
      ).toThrow('must not exceed 5000 characters');
    });

    it('accepts custom URL at exactly 500 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      const result = service.prepareUpdateCustomUrl({
        project: 'test',
        customUrl: 'x'.repeat(500),
      });
      expect(result.preview.customUrl).toBe('x'.repeat(500));
    });

    it('rejects custom URL at 501 characters', () => {
      const service = new BloomreachProjectSettingsService('test');
      expect(() =>
        service.prepareUpdateCustomUrl({
          project: 'test',
          customUrl: 'x'.repeat(501),
        }),
      ).toThrow('must not exceed 500 characters');
    });
  });
});
