import { describe, it, expect } from 'vitest';
import {
  CREATE_EMAIL_TEMPLATE_ACTION_TYPE,
  CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE,
  CREATE_BLOCK_ACTION_TYPE,
  CREATE_CUSTOM_ROW_ACTION_TYPE,
  CREATE_SNIPPET_ACTION_TYPE,
  EDIT_SNIPPET_ACTION_TYPE,
  UPLOAD_FILE_ACTION_TYPE,
  DELETE_FILE_ACTION_TYPE,
  CLONE_TEMPLATE_ACTION_TYPE,
  ARCHIVE_TEMPLATE_ACTION_TYPE,
  ASSET_MANAGER_RATE_LIMIT_WINDOW_MS,
  ASSET_MANAGER_CREATE_RATE_LIMIT,
  ASSET_MANAGER_MODIFY_RATE_LIMIT,
  ASSET_TYPES,
  TEMPLATE_STATUSES,
  FILE_CATEGORIES,
  SNIPPET_LANGUAGES,
  TEMPLATE_BUILDER_TYPES,
  validateAssetName,
  validateAssetType,
  validateTemplateStatus,
  validateFileCategory,
  validateSnippetLanguage,
  validateBuilderType,
  validateSnippetContent,
  validateMimeType,
  validateAssetId,
  buildEmailTemplatesUrl,
  buildWeblayerTemplatesUrl,
  buildBlocksUrl,
  buildCustomRowsUrl,
  buildSnippetsUrl,
  buildFilesUrl,
  createAssetManagerActionExecutors,
  BloomreachAssetManagerService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_EMAIL_TEMPLATE_ACTION_TYPE', () => {
    expect(CREATE_EMAIL_TEMPLATE_ACTION_TYPE).toBe('asset_manager.create_email_template');
  });

  it('exports CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE', () => {
    expect(CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE).toBe(
      'asset_manager.create_weblayer_template',
    );
  });

  it('exports CREATE_BLOCK_ACTION_TYPE', () => {
    expect(CREATE_BLOCK_ACTION_TYPE).toBe('asset_manager.create_block');
  });

  it('exports CREATE_CUSTOM_ROW_ACTION_TYPE', () => {
    expect(CREATE_CUSTOM_ROW_ACTION_TYPE).toBe('asset_manager.create_custom_row');
  });

  it('exports CREATE_SNIPPET_ACTION_TYPE', () => {
    expect(CREATE_SNIPPET_ACTION_TYPE).toBe('asset_manager.create_snippet');
  });

  it('exports EDIT_SNIPPET_ACTION_TYPE', () => {
    expect(EDIT_SNIPPET_ACTION_TYPE).toBe('asset_manager.edit_snippet');
  });

  it('exports UPLOAD_FILE_ACTION_TYPE', () => {
    expect(UPLOAD_FILE_ACTION_TYPE).toBe('asset_manager.upload_file');
  });

  it('exports DELETE_FILE_ACTION_TYPE', () => {
    expect(DELETE_FILE_ACTION_TYPE).toBe('asset_manager.delete_file');
  });

  it('exports CLONE_TEMPLATE_ACTION_TYPE', () => {
    expect(CLONE_TEMPLATE_ACTION_TYPE).toBe('asset_manager.clone_template');
  });

  it('exports ARCHIVE_TEMPLATE_ACTION_TYPE', () => {
    expect(ARCHIVE_TEMPLATE_ACTION_TYPE).toBe('asset_manager.archive_template');
  });
});

describe('rate limit constants', () => {
  it('exports ASSET_MANAGER_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(ASSET_MANAGER_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports ASSET_MANAGER_CREATE_RATE_LIMIT', () => {
    expect(ASSET_MANAGER_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports ASSET_MANAGER_MODIFY_RATE_LIMIT', () => {
    expect(ASSET_MANAGER_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('enum arrays', () => {
  it('exports ASSET_TYPES in order', () => {
    expect(ASSET_TYPES).toEqual([
      'email_template',
      'weblayer_template',
      'block',
      'custom_row',
      'snippet',
      'file',
    ]);
  });

  it('exports TEMPLATE_STATUSES in order', () => {
    expect(TEMPLATE_STATUSES).toEqual(['active', 'archived', 'draft']);
  });

  it('exports FILE_CATEGORIES in order', () => {
    expect(FILE_CATEGORIES).toEqual(['image', 'document', 'font', 'other']);
  });

  it('exports SNIPPET_LANGUAGES in order', () => {
    expect(SNIPPET_LANGUAGES).toEqual(['jinja', 'html']);
  });

  it('exports TEMPLATE_BUILDER_TYPES in order', () => {
    expect(TEMPLATE_BUILDER_TYPES).toEqual(['visual', 'html']);
  });
});

describe('validateAssetName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateAssetName('  Hero Template  ')).toBe('Hero Template');
  });

  it('accepts single-character name', () => {
    expect(validateAssetName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateAssetName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateAssetName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateAssetName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    expect(() => validateAssetName('x'.repeat(201))).toThrow('must not exceed 200 characters');
  });
});

describe('validateAssetType', () => {
  it('accepts all known asset types', () => {
    expect(validateAssetType('email_template')).toBe('email_template');
    expect(validateAssetType('weblayer_template')).toBe('weblayer_template');
    expect(validateAssetType('block')).toBe('block');
    expect(validateAssetType('custom_row')).toBe('custom_row');
    expect(validateAssetType('snippet')).toBe('snippet');
    expect(validateAssetType('file')).toBe('file');
  });

  it('throws for unknown asset type', () => {
    expect(() => validateAssetType('template')).toThrow('assetType must be one of');
  });
});

describe('validateTemplateStatus', () => {
  it('accepts all statuses', () => {
    expect(validateTemplateStatus('active')).toBe('active');
    expect(validateTemplateStatus('archived')).toBe('archived');
    expect(validateTemplateStatus('draft')).toBe('draft');
  });

  it('throws for unknown status', () => {
    expect(() => validateTemplateStatus('paused')).toThrow('status must be one of');
  });
});

describe('validateFileCategory', () => {
  it('accepts all categories', () => {
    expect(validateFileCategory('image')).toBe('image');
    expect(validateFileCategory('document')).toBe('document');
    expect(validateFileCategory('font')).toBe('font');
    expect(validateFileCategory('other')).toBe('other');
  });

  it('throws for unknown category', () => {
    expect(() => validateFileCategory('video')).toThrow('category must be one of');
  });
});

describe('validateSnippetLanguage', () => {
  it('accepts jinja and html', () => {
    expect(validateSnippetLanguage('jinja')).toBe('jinja');
    expect(validateSnippetLanguage('html')).toBe('html');
  });

  it('throws for unknown language', () => {
    expect(() => validateSnippetLanguage('liquid')).toThrow('language must be one of');
  });
});

describe('validateBuilderType', () => {
  it('accepts visual and html', () => {
    expect(validateBuilderType('visual')).toBe('visual');
    expect(validateBuilderType('html')).toBe('html');
  });

  it('throws for unknown builder type', () => {
    expect(() => validateBuilderType('markdown')).toThrow('builderType must be one of');
  });
});

describe('validateSnippetContent', () => {
  it('accepts non-empty content', () => {
    expect(validateSnippetContent('{% if customer %}Hello{% endif %}')).toBe(
      '{% if customer %}Hello{% endif %}',
    );
  });

  it('accepts content at maximum length', () => {
    const content = 'x'.repeat(100_000);
    expect(validateSnippetContent(content)).toBe(content);
  });

  it('throws for empty content', () => {
    expect(() => validateSnippetContent('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only content', () => {
    expect(() => validateSnippetContent('   ')).toThrow('must not be empty');
  });

  it('throws for content above max length', () => {
    expect(() => validateSnippetContent('x'.repeat(100_001))).toThrow(
      'must not exceed 100000 characters',
    );
  });
});

describe('validateMimeType', () => {
  it('returns trimmed mime type', () => {
    expect(validateMimeType('  image/png  ')).toBe('image/png');
  });

  it('throws for empty mime type', () => {
    expect(() => validateMimeType('')).toThrow('must not be empty');
  });

  it('throws when mime type has no slash', () => {
    expect(() => validateMimeType('image')).toThrow('must include a "/"');
  });
});

describe('validateAssetId', () => {
  it('returns trimmed ID', () => {
    expect(validateAssetId('  asset-123  ')).toBe('asset-123');
  });

  it('throws for empty ID', () => {
    expect(() => validateAssetId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only ID', () => {
    expect(() => validateAssetId('   ')).toThrow('must not be empty');
  });
});

describe('URL builders', () => {
  it('buildEmailTemplatesUrl handles simple, spaces, and slashes', () => {
    expect(buildEmailTemplatesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/data/assets/email-templates',
    );
    expect(buildEmailTemplatesUrl('my project')).toBe(
      '/p/my%20project/data/assets/email-templates',
    );
    expect(buildEmailTemplatesUrl('org/project')).toBe(
      '/p/org%2Fproject/data/assets/email-templates',
    );
  });

  it('buildWeblayerTemplatesUrl handles simple, spaces, and slashes', () => {
    expect(buildWeblayerTemplatesUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/data/assets/weblayer-templates',
    );
    expect(buildWeblayerTemplatesUrl('my project')).toBe(
      '/p/my%20project/data/assets/weblayer-templates',
    );
    expect(buildWeblayerTemplatesUrl('org/project')).toBe(
      '/p/org%2Fproject/data/assets/weblayer-templates',
    );
  });

  it('buildBlocksUrl handles simple, spaces, and slashes', () => {
    expect(buildBlocksUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/data/assets/blocks');
    expect(buildBlocksUrl('my project')).toBe('/p/my%20project/data/assets/blocks');
    expect(buildBlocksUrl('org/project')).toBe('/p/org%2Fproject/data/assets/blocks');
  });

  it('buildCustomRowsUrl handles simple, spaces, and slashes', () => {
    expect(buildCustomRowsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/data/assets/custom-rows',
    );
    expect(buildCustomRowsUrl('my project')).toBe('/p/my%20project/data/assets/custom-rows');
    expect(buildCustomRowsUrl('org/project')).toBe('/p/org%2Fproject/data/assets/custom-rows');
  });

  it('buildSnippetsUrl handles simple, spaces, and slashes', () => {
    expect(buildSnippetsUrl('kingdom-of-joakim')).toBe(
      '/p/kingdom-of-joakim/data/assets/snippets',
    );
    expect(buildSnippetsUrl('my project')).toBe('/p/my%20project/data/assets/snippets');
    expect(buildSnippetsUrl('org/project')).toBe('/p/org%2Fproject/data/assets/snippets');
  });

  it('buildFilesUrl handles simple, spaces, and slashes', () => {
    expect(buildFilesUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/data/assets/files');
    expect(buildFilesUrl('my project')).toBe('/p/my%20project/data/assets/files');
    expect(buildFilesUrl('org/project')).toBe('/p/org%2Fproject/data/assets/files');
  });
});

describe('createAssetManagerActionExecutors', () => {
  it('returns executors for all ten action types', () => {
    const executors = createAssetManagerActionExecutors();
    expect(Object.keys(executors)).toHaveLength(10);
    expect(executors[CREATE_EMAIL_TEMPLATE_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_WEBLAYER_TEMPLATE_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_BLOCK_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_CUSTOM_ROW_ACTION_TYPE]).toBeDefined();
    expect(executors[CREATE_SNIPPET_ACTION_TYPE]).toBeDefined();
    expect(executors[EDIT_SNIPPET_ACTION_TYPE]).toBeDefined();
    expect(executors[UPLOAD_FILE_ACTION_TYPE]).toBeDefined();
    expect(executors[DELETE_FILE_ACTION_TYPE]).toBeDefined();
    expect(executors[CLONE_TEMPLATE_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_TEMPLATE_ACTION_TYPE]).toBeDefined();
  });

  it('each executor actionType matches its key', () => {
    const executors = createAssetManagerActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createAssetManagerActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachAssetManagerService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachAssetManagerService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachAssetManagerService);
    });

    it('exposes all expected URLs', () => {
      const service = new BloomreachAssetManagerService('kingdom-of-joakim');
      expect(service.emailTemplatesUrl).toBe(
        '/p/kingdom-of-joakim/data/assets/email-templates',
      );
      expect(service.weblayerTemplatesUrl).toBe(
        '/p/kingdom-of-joakim/data/assets/weblayer-templates',
      );
      expect(service.blocksUrl).toBe('/p/kingdom-of-joakim/data/assets/blocks');
      expect(service.customRowsUrl).toBe('/p/kingdom-of-joakim/data/assets/custom-rows');
      expect(service.snippetsUrl).toBe('/p/kingdom-of-joakim/data/assets/snippets');
      expect(service.filesUrl).toBe('/p/kingdom-of-joakim/data/assets/files');
    });

    it('trims project name', () => {
      const service = new BloomreachAssetManagerService('  test  ');
      expect(service.emailTemplatesUrl).toBe('/p/test/data/assets/email-templates');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachAssetManagerService('')).toThrow('must not be empty');
    });

    it('encodes special characters in project name', () => {
      const service = new BloomreachAssetManagerService('my project');
      expect(service.emailTemplatesUrl).toContain('my%20project');

      const service2 = new BloomreachAssetManagerService('org/proj');
      expect(service2.emailTemplatesUrl).toContain('org%2Fproj');
    });
  });

  describe('list methods', () => {
    it('listEmailTemplates throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listEmailTemplates()).rejects.toThrow('not yet implemented');
    });

    it('listWeblayerTemplates throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listWeblayerTemplates()).rejects.toThrow('not yet implemented');
    });

    it('listBlocks throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listBlocks()).rejects.toThrow('not yet implemented');
    });

    it('listCustomRows throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listCustomRows()).rejects.toThrow('not yet implemented');
    });

    it('listSnippets throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listSnippets()).rejects.toThrow('not yet implemented');
    });

    it('listFiles throws not-yet-implemented error', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listFiles()).rejects.toThrow('not yet implemented');
    });

    it('validates project for list methods when input is provided', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(service.listEmailTemplates({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
      await expect(service.listWeblayerTemplates({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
      await expect(service.listBlocks({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.listCustomRows({ project: '' })).rejects.toThrow(
        'must not be empty',
      );
      await expect(service.listSnippets({ project: '' })).rejects.toThrow('must not be empty');
      await expect(service.listFiles({ project: '' })).rejects.toThrow('must not be empty');
    });

    it('validates listFiles category when provided', async () => {
      const service = new BloomreachAssetManagerService('test');
      await expect(
        service.listFiles({ project: 'test', category: 'video' }),
      ).rejects.toThrow('category must be one of');
    });
  });

  describe('prepareCreateEmailTemplate', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateEmailTemplate({
        project: 'test',
        name: 'Order Confirmation',
        builderType: 'html',
        htmlContent: '<html></html>',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.create_email_template',
          project: 'test',
          name: 'Order Confirmation',
          builderType: 'html',
        }),
      );
    });

    it('throws for invalid builder type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCreateEmailTemplate({
          project: 'test',
          name: 'Template',
          builderType: 'visual-plus',
        }),
      ).toThrow('builderType must be one of');
    });
  });

  describe('prepareCreateWeblayerTemplate', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateWeblayerTemplate({
        project: 'test',
        name: 'Weblayer Hero',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.create_weblayer_template',
          project: 'test',
          name: 'Weblayer Hero',
        }),
      );
    });
  });

  describe('prepareCreateBlock', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateBlock({
        project: 'test',
        name: 'Footer Block',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.create_block',
          project: 'test',
          name: 'Footer Block',
        }),
      );
    });
  });

  describe('prepareCreateCustomRow', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateCustomRow({
        project: 'test',
        name: 'Two Column Row',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.create_custom_row',
          project: 'test',
          name: 'Two Column Row',
        }),
      );
    });
  });

  describe('prepareCreateSnippet', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateSnippet({
        project: 'test',
        name: 'Greeting Snippet',
        language: 'jinja',
        content: 'Hello {{ customer.first_name }}',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.create_snippet',
          project: 'test',
          name: 'Greeting Snippet',
          language: 'jinja',
        }),
      );
    });

    it('throws for empty content', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCreateSnippet({
          project: 'test',
          name: 'Snippet',
          language: 'jinja',
          content: '   ',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareEditSnippet', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareEditSnippet({
        project: 'test',
        snippetId: 'snippet-123',
        name: 'Updated Name',
        language: 'html',
        content: '<div>Hello</div>',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.edit_snippet',
          project: 'test',
          snippetId: 'snippet-123',
          name: 'Updated Name',
          language: 'html',
        }),
      );
    });

    it('throws for empty snippetId', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareEditSnippet({
          project: 'test',
          snippetId: '   ',
        }),
      ).toThrow('Asset ID must not be empty');
    });
  });

  describe('prepareUploadFile', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareUploadFile({
        project: 'test',
        name: 'logo.png',
        mimeType: 'image/png',
        category: 'image',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.upload_file',
          project: 'test',
          name: 'logo.png',
          mimeType: 'image/png',
          category: 'image',
        }),
      );
    });

    it('throws for invalid mime type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareUploadFile({
          project: 'test',
          name: 'logo',
          mimeType: 'image',
        }),
      ).toThrow('must include a "/"');
    });
  });

  describe('prepareDeleteFile', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareDeleteFile({
        project: 'test',
        fileId: 'file-001',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.delete_file',
          project: 'test',
          fileId: 'file-001',
        }),
      );
    });
  });

  describe('prepareCloneTemplate', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCloneTemplate({
        project: 'test',
        templateId: 'tmpl-1',
        assetType: 'email_template',
        newName: 'Clone Name',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.clone_template',
          project: 'test',
          templateId: 'tmpl-1',
          assetType: 'email_template',
          newName: 'Clone Name',
        }),
      );
    });

    it('throws for non-cloneable asset type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCloneTemplate({
          project: 'test',
          templateId: 'tmpl-1',
          assetType: 'snippet',
        }),
      ).toThrow('cloneable types');
    });

    it('throws for file asset type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCloneTemplate({
          project: 'test',
          templateId: 'tmpl-1',
          assetType: 'file',
        }),
      ).toThrow('cloneable types');
    });

    it('succeeds without newName', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCloneTemplate({
        project: 'test',
        templateId: 'tmpl-1',
        assetType: 'weblayer_template',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.clone_template',
          project: 'test',
          templateId: 'tmpl-1',
          assetType: 'weblayer_template',
        }),
      );
      expect(result.preview.newName).toBeUndefined();
    });
  });

  describe('prepareArchiveTemplate', () => {
    it('returns prepared action for valid input', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareArchiveTemplate({
        project: 'test',
        templateId: 'tmpl-2',
        assetType: 'custom_row',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.archive_template',
          project: 'test',
          templateId: 'tmpl-2',
          assetType: 'custom_row',
        }),
      );
    });

    it('throws for non-cloneable asset type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareArchiveTemplate({
          project: 'test',
          templateId: 'tmpl-2',
          assetType: 'file',
        }),
      ).toThrow('cloneable types');
    });

    it('throws for snippet asset type', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareArchiveTemplate({
          project: 'test',
          templateId: 'tmpl-2',
          assetType: 'snippet',
        }),
      ).toThrow('cloneable types');
    });
  });

  describe('prepare methods shared validation', () => {
    it('throws on empty project for prepare methods', () => {
      const service = new BloomreachAssetManagerService('test');

      expect(() =>
        service.prepareCreateEmailTemplate({
          project: '',
          name: 'Template',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareCreateWeblayerTemplate({
          project: '',
          name: 'Template',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareCreateBlock({
          project: '',
          name: 'Block',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareCreateCustomRow({
          project: '',
          name: 'Row',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareCreateSnippet({
          project: '',
          name: 'Snippet',
          language: 'jinja',
          content: 'x',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareEditSnippet({
          project: '',
          snippetId: 'snippet-1',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareUploadFile({
          project: '',
          name: 'file',
          mimeType: 'image/png',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareDeleteFile({
          project: '',
          fileId: 'file-1',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareCloneTemplate({
          project: '',
          templateId: 'tmpl-1',
          assetType: 'email_template',
        }),
      ).toThrow('must not be empty');

      expect(() =>
        service.prepareArchiveTemplate({
          project: '',
          templateId: 'tmpl-1',
          assetType: 'email_template',
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('token expiry', () => {
    it('sets expiresAtMs to approximately 30 minutes from now', () => {
      const service = new BloomreachAssetManagerService('test');
      const before = Date.now();
      const result = service.prepareCreateEmailTemplate({
        project: 'test',
        name: 'Expiry Test',
      });
      const after = Date.now();

      const expectedTtl = 30 * 60 * 1000;
      expect(result.expiresAtMs).toBeGreaterThanOrEqual(before + expectedTtl);
      expect(result.expiresAtMs).toBeLessThanOrEqual(after + expectedTtl);
    });

    it('all prepare methods set consistent expiry', () => {
      const service = new BloomreachAssetManagerService('test');
      const tolerance = 1000;
      const expectedTtl = 30 * 60 * 1000;

      const results = [
        service.prepareCreateEmailTemplate({ project: 'test', name: 'Email' }),
        service.prepareCreateWeblayerTemplate({ project: 'test', name: 'Weblayer' }),
        service.prepareCreateBlock({ project: 'test', name: 'Block' }),
        service.prepareCreateCustomRow({ project: 'test', name: 'Row' }),
        service.prepareCreateSnippet({
          project: 'test',
          name: 'Snippet',
          language: 'jinja',
          content: 'x',
        }),
        service.prepareEditSnippet({ project: 'test', snippetId: 'snippet-1' }),
        service.prepareUploadFile({ project: 'test', name: 'file.png', mimeType: 'image/png' }),
        service.prepareDeleteFile({ project: 'test', fileId: 'file-1' }),
        service.prepareCloneTemplate({
          project: 'test',
          templateId: 'tmpl-1',
          assetType: 'email_template',
        }),
        service.prepareArchiveTemplate({
          project: 'test',
          templateId: 'tmpl-2',
          assetType: 'weblayer_template',
        }),
      ];

      for (const result of results) {
        const now = Date.now();
        expect(result.expiresAtMs).toBeGreaterThanOrEqual(now + expectedTtl - tolerance);
        expect(result.expiresAtMs).toBeLessThanOrEqual(now + expectedTtl + tolerance);
      }
    });
  });

  describe('optional fields in preview', () => {
    it('prepareCreateEmailTemplate includes all optional fields when provided', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateEmailTemplate({
        project: 'test',
        name: 'Email With Optional Fields',
        builderType: 'html',
        htmlContent: '<html><body>Hello</body></html>',
        operatorNote: 'optional-fields-test',
      });

      expect(result.preview.builderType).toBe('html');
      expect(result.preview.htmlContent).toBe('<html><body>Hello</body></html>');
      expect(result.preview.operatorNote).toBe('optional-fields-test');
    });

    it('prepareCreateEmailTemplate excludes optional fields when omitted', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateEmailTemplate({
        project: 'test',
        name: 'Email Without Optional Fields',
      });

      expect(result.preview.builderType).toBeUndefined();
      expect(result.preview.htmlContent).toBeUndefined();
      expect(result.preview.operatorNote).toBeUndefined();
    });

    it('prepareCreateWeblayerTemplate includes htmlContent when provided', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateWeblayerTemplate({
        project: 'test',
        name: 'Weblayer',
        htmlContent: '<div>banner</div>',
      });

      expect(result.preview.htmlContent).toBe('<div>banner</div>');
    });

    it('prepareUploadFile includes all optional fields when provided', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareUploadFile({
        project: 'test',
        name: 'asset.pdf',
        mimeType: 'application/pdf',
        fileSize: 12345,
        category: 'document',
        operatorNote: 'upload-optional-fields-test',
      });

      expect(result.preview.fileSize).toBe(12345);
      expect(result.preview.category).toBe('document');
      expect(result.preview.operatorNote).toBe('upload-optional-fields-test');
    });

    it('prepareUploadFile omits optional fields when not provided', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareUploadFile({
        project: 'test',
        name: 'logo.png',
        mimeType: 'image/png',
      });

      expect(result.preview.fileSize).toBeUndefined();
      expect(result.preview.category).toBeUndefined();
      expect(result.preview.operatorNote).toBeUndefined();
    });
  });

  describe('edit snippet partial updates', () => {
    it('accepts update with only name', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareEditSnippet({
        project: 'test',
        snippetId: 'snippet-1',
        name: 'New Name',
      });

      expect(result.preview.name).toBe('New Name');
      expect(result.preview.language).toBeUndefined();
      expect(result.preview.content).toBeUndefined();
    });

    it('accepts update with only language', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareEditSnippet({
        project: 'test',
        snippetId: 'snippet-1',
        language: 'html',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.preview.language).toBe('html');
    });

    it('accepts update with only content', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareEditSnippet({
        project: 'test',
        snippetId: 'snippet-1',
        content: '<p>new</p>',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.preview.content).toBe('<p>new</p>');
    });

    it('accepts update with no optional fields', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareEditSnippet({
        project: 'test',
        snippetId: 'snippet-1',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'asset_manager.edit_snippet',
          project: 'test',
          snippetId: 'snippet-1',
        }),
      );
      expect(result.preview.name).toBeUndefined();
      expect(result.preview.language).toBeUndefined();
      expect(result.preview.content).toBeUndefined();
    });
  });

  describe('prepare method boundary validation', () => {
    it('accepts asset name at exactly 200 characters', () => {
      const service = new BloomreachAssetManagerService('test');
      const result = service.prepareCreateEmailTemplate({
        project: 'test',
        name: 'x'.repeat(200),
      });

      expect(result.preview.name).toBe('x'.repeat(200));
    });

    it('rejects asset name at 201 characters', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCreateEmailTemplate({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('accepts snippet content at exactly 100000 characters', () => {
      const service = new BloomreachAssetManagerService('test');
      const content = 'x'.repeat(100_000);
      const result = service.prepareCreateSnippet({
        project: 'test',
        name: 'Boundary Snippet',
        language: 'jinja',
        content,
      });

      expect(result.preview.content).toBe(content);
    });

    it('rejects snippet content at 100001 characters', () => {
      const service = new BloomreachAssetManagerService('test');
      expect(() =>
        service.prepareCreateSnippet({
          project: 'test',
          name: 'Too Long Snippet',
          language: 'jinja',
          content: 'x'.repeat(100_001),
        }),
      ).toThrow('must not exceed 100000 characters');
    });
  });
});
