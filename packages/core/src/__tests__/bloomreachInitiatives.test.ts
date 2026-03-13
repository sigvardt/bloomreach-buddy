import { describe, it, expect } from 'vitest';
import {
  CREATE_INITIATIVE_ACTION_TYPE,
  IMPORT_INITIATIVE_ACTION_TYPE,
  ADD_ITEMS_ACTION_TYPE,
  ARCHIVE_INITIATIVE_ACTION_TYPE,
  INITIATIVE_RATE_LIMIT_WINDOW_MS,
  INITIATIVE_CREATE_RATE_LIMIT,
  INITIATIVE_MODIFY_RATE_LIMIT,
  INITIATIVE_STATUSES,
  INITIATIVE_ITEM_TYPES,
  validateInitiativeName,
  validateInitiativeDescription,
  validateInitiativeStatus,
  validateInitiativeId,
  validateInitiativeItemType,
  validateInitiativeItems,
  validateImportConfiguration,
  buildInitiativesUrl,
  createInitiativeActionExecutors,
  BloomreachInitiativesService,
} from '../index.js';

describe('action type constants', () => {
  it('exports CREATE_INITIATIVE_ACTION_TYPE', () => {
    expect(CREATE_INITIATIVE_ACTION_TYPE).toBe('initiatives.create_initiative');
  });

  it('exports IMPORT_INITIATIVE_ACTION_TYPE', () => {
    expect(IMPORT_INITIATIVE_ACTION_TYPE).toBe('initiatives.import_initiative');
  });

  it('exports ADD_ITEMS_ACTION_TYPE', () => {
    expect(ADD_ITEMS_ACTION_TYPE).toBe('initiatives.add_items');
  });

  it('exports ARCHIVE_INITIATIVE_ACTION_TYPE', () => {
    expect(ARCHIVE_INITIATIVE_ACTION_TYPE).toBe('initiatives.archive_initiative');
  });
});

describe('rate limit constants', () => {
  it('exports INITIATIVE_RATE_LIMIT_WINDOW_MS as 1 hour', () => {
    expect(INITIATIVE_RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('exports INITIATIVE_CREATE_RATE_LIMIT', () => {
    expect(INITIATIVE_CREATE_RATE_LIMIT).toBe(10);
  });

  it('exports INITIATIVE_MODIFY_RATE_LIMIT', () => {
    expect(INITIATIVE_MODIFY_RATE_LIMIT).toBe(20);
  });
});

describe('INITIATIVE_STATUSES', () => {
  it('contains 3 statuses', () => {
    expect(INITIATIVE_STATUSES).toHaveLength(3);
  });

  it('contains expected statuses in order', () => {
    expect(INITIATIVE_STATUSES).toEqual(['active', 'archived', 'draft']);
  });
});

describe('INITIATIVE_ITEM_TYPES', () => {
  it('contains 3 item types', () => {
    expect(INITIATIVE_ITEM_TYPES).toHaveLength(3);
  });

  it('contains expected item types in order', () => {
    expect(INITIATIVE_ITEM_TYPES).toEqual(['campaign', 'analysis', 'asset']);
  });
});

describe('validateInitiativeName', () => {
  it('returns trimmed name for valid input', () => {
    expect(validateInitiativeName('  My Initiative  ')).toBe('My Initiative');
  });

  it('accepts single-character name', () => {
    expect(validateInitiativeName('A')).toBe('A');
  });

  it('accepts name at maximum length', () => {
    const name = 'x'.repeat(200);
    expect(validateInitiativeName(name)).toBe(name);
  });

  it('throws for empty string', () => {
    expect(() => validateInitiativeName('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateInitiativeName('   ')).toThrow('must not be empty');
  });

  it('throws for name exceeding maximum length', () => {
    const name = 'x'.repeat(201);
    expect(() => validateInitiativeName(name)).toThrow('must not exceed 200 characters');
  });
});

describe('validateInitiativeDescription', () => {
  it('returns trimmed description for valid input', () => {
    expect(validateInitiativeDescription('  Great initiative  ')).toBe('Great initiative');
  });

  it('allows empty string', () => {
    expect(validateInitiativeDescription('')).toBe('');
  });

  it('accepts description at maximum length', () => {
    const description = 'x'.repeat(2000);
    expect(validateInitiativeDescription(description)).toBe(description);
  });

  it('throws for description exceeding maximum length', () => {
    const description = 'x'.repeat(2001);
    expect(() => validateInitiativeDescription(description)).toThrow(
      'must not exceed 2000 characters',
    );
  });
});

describe('validateInitiativeStatus', () => {
  it('accepts active', () => {
    expect(validateInitiativeStatus('active')).toBe('active');
  });

  it('accepts archived', () => {
    expect(validateInitiativeStatus('archived')).toBe('archived');
  });

  it('accepts draft', () => {
    expect(validateInitiativeStatus('draft')).toBe('draft');
  });

  it('throws for unknown status', () => {
    expect(() => validateInitiativeStatus('paused')).toThrow('status must be one of');
  });

  it('throws for empty status', () => {
    expect(() => validateInitiativeStatus('')).toThrow('status must be one of');
  });
});

describe('validateInitiativeId', () => {
  it('returns trimmed initiative ID for valid input', () => {
    expect(validateInitiativeId('  initiative-123  ')).toBe('initiative-123');
  });

  it('throws for empty string', () => {
    expect(() => validateInitiativeId('')).toThrow('must not be empty');
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateInitiativeId('   ')).toThrow('must not be empty');
  });

  it('returns same value when already trimmed', () => {
    expect(validateInitiativeId('initiative-456')).toBe('initiative-456');
  });
});

describe('validateInitiativeItemType', () => {
  it('accepts campaign', () => {
    expect(validateInitiativeItemType('campaign')).toBe('campaign');
  });

  it('accepts analysis', () => {
    expect(validateInitiativeItemType('analysis')).toBe('analysis');
  });

  it('accepts asset', () => {
    expect(validateInitiativeItemType('asset')).toBe('asset');
  });

  it('throws for unknown item type', () => {
    expect(() => validateInitiativeItemType('segment')).toThrow('Item type must be one of');
  });

  it('throws for empty item type', () => {
    expect(() => validateInitiativeItemType('')).toThrow('Item type must be one of');
  });
});

describe('validateInitiativeItems', () => {
  it('accepts valid items', () => {
    const items = [
      { id: 'campaign-1', type: 'campaign' as const },
      { id: 'analysis-1', type: 'analysis' as const },
    ];
    expect(validateInitiativeItems(items)).toEqual(items);
  });

  it('throws for empty array', () => {
    expect(() => validateInitiativeItems([])).toThrow('Items array must not be empty');
  });

  it('throws when item count exceeds maximum', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({
      id: `item-${i + 1}`,
      type: 'asset' as const,
    }));
    expect(() => validateInitiativeItems(items)).toThrow('Cannot add more than 100 items');
  });

  it('throws when an item has empty ID', () => {
    const items = [{ id: '   ', type: 'campaign' as const }];
    expect(() => validateInitiativeItems(items)).toThrow('Each item must have a non-empty ID');
  });

  it('throws when an item has invalid type', () => {
    const items = [{ id: 'item-1', type: 'segment' as unknown as 'campaign' }];
    expect(() => validateInitiativeItems(items)).toThrow('Item type must be one of');
  });
});

describe('validateImportConfiguration', () => {
  it('returns configuration when valid', () => {
    const configuration = { source: 'json', overwrite: true };
    expect(validateImportConfiguration(configuration)).toEqual(configuration);
  });

  it('throws for empty configuration object', () => {
    expect(() => validateImportConfiguration({})).toThrow('must not be empty');
  });
});

describe('buildInitiativesUrl', () => {
  it('builds URL for a simple project name', () => {
    expect(buildInitiativesUrl('kingdom-of-joakim')).toBe('/p/kingdom-of-joakim/initiatives');
  });

  it('encodes spaces in project name', () => {
    expect(buildInitiativesUrl('my project')).toBe('/p/my%20project/initiatives');
  });

  it('encodes slashes in project name', () => {
    expect(buildInitiativesUrl('org/project')).toBe('/p/org%2Fproject/initiatives');
  });
});

describe('createInitiativeActionExecutors', () => {
  it('returns executors for all four action types', () => {
    const executors = createInitiativeActionExecutors();
    expect(Object.keys(executors)).toHaveLength(4);
    expect(executors[CREATE_INITIATIVE_ACTION_TYPE]).toBeDefined();
    expect(executors[IMPORT_INITIATIVE_ACTION_TYPE]).toBeDefined();
    expect(executors[ADD_ITEMS_ACTION_TYPE]).toBeDefined();
    expect(executors[ARCHIVE_INITIATIVE_ACTION_TYPE]).toBeDefined();
  });

  it('each executor has an actionType property matching its key', () => {
    const executors = createInitiativeActionExecutors();
    for (const [key, executor] of Object.entries(executors)) {
      expect(executor.actionType).toBe(key);
    }
  });

  it('executors throw "not yet implemented" on execute', async () => {
    const executors = createInitiativeActionExecutors();
    for (const executor of Object.values(executors)) {
      await expect(executor.execute({})).rejects.toThrow('not yet implemented');
    }
  });
});

describe('BloomreachInitiativesService', () => {
  describe('constructor', () => {
    it('creates a service instance with valid project', () => {
      const service = new BloomreachInitiativesService('kingdom-of-joakim');
      expect(service).toBeInstanceOf(BloomreachInitiativesService);
    });

    it('exposes the initiatives URL', () => {
      const service = new BloomreachInitiativesService('kingdom-of-joakim');
      expect(service.initiativesUrl).toBe('/p/kingdom-of-joakim/initiatives');
    });

    it('trims project name', () => {
      const service = new BloomreachInitiativesService('  my-project  ');
      expect(service.initiativesUrl).toBe('/p/my-project/initiatives');
    });

    it('throws for empty project', () => {
      expect(() => new BloomreachInitiativesService('')).toThrow('must not be empty');
    });
  });

  describe('listInitiatives', () => {
    it('throws not-yet-implemented error', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(service.listInitiatives()).rejects.toThrow('not yet implemented');
    });
  });

  describe('filterInitiatives', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.filterInitiatives({ project: 'test', status: 'active' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates status when provided', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.filterInitiatives({ project: 'test', status: 'paused' }),
      ).rejects.toThrow('status must be one of');
    });

    it('validates project input', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.filterInitiatives({ project: '', status: 'active' }),
      ).rejects.toThrow('must not be empty');
    });
  });

  describe('viewInitiative', () => {
    it('throws not-yet-implemented error with valid input', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.viewInitiative({ project: 'test', initiativeId: 'initiative-1' }),
      ).rejects.toThrow('not yet implemented');
    });

    it('validates project input', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.viewInitiative({ project: '', initiativeId: 'initiative-1' }),
      ).rejects.toThrow('must not be empty');
    });

    it('validates initiativeId input', async () => {
      const service = new BloomreachInitiativesService('test');
      await expect(
        service.viewInitiative({ project: 'test', initiativeId: '   ' }),
      ).rejects.toThrow('Initiative ID must not be empty');
    });
  });

  describe('prepareCreateInitiative', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareCreateInitiative({
        project: 'test',
        name: 'My Initiative',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'initiatives.create_initiative',
          project: 'test',
          name: 'My Initiative',
        }),
      );
    });

    it('includes tags in preview', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareCreateInitiative({
        project: 'test',
        name: 'Tagged Initiative',
        tags: ['campaign', 'q2'],
      });

      expect(result.preview).toEqual(expect.objectContaining({ tags: ['campaign', 'q2'] }));
    });

    it('includes description in preview', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareCreateInitiative({
        project: 'test',
        name: 'Described Initiative',
        description: 'Important initiative',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ description: 'Important initiative' }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareCreateInitiative({
        project: 'test',
        name: 'Initiative',
        operatorNote: 'Created for launch planning',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Created for launch planning' }),
      );
    });

    it('throws for empty name', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() => service.prepareCreateInitiative({ project: 'test', name: '' })).toThrow(
        'must not be empty',
      );
    });

    it('throws for empty project', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareCreateInitiative({ project: '', name: 'Initiative' }),
      ).toThrow('must not be empty');
    });

    it('throws for too-long name', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareCreateInitiative({
          project: 'test',
          name: 'x'.repeat(201),
        }),
      ).toThrow('must not exceed 200 characters');
    });

    it('throws for too-long description', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareCreateInitiative({
          project: 'test',
          name: 'Initiative',
          description: 'x'.repeat(2001),
        }),
      ).toThrow('must not exceed 2000 characters');
    });
  });

  describe('prepareImportInitiative', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareImportInitiative({
        project: 'test',
        configuration: { source: 'yaml', overwrite: false },
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'initiatives.import_initiative',
          project: 'test',
        }),
      );
    });

    it('includes configurationKeys in preview', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareImportInitiative({
        project: 'test',
        configuration: { source: 'json', mode: 'replace', retries: 2 },
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ configurationKeys: ['source', 'mode', 'retries'] }),
      );
    });

    it('throws for empty configuration object', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareImportInitiative({
          project: 'test',
          configuration: {},
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareImportInitiative({
          project: '',
          configuration: { source: 'json' },
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareAddItems', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareAddItems({
        project: 'test',
        initiativeId: 'initiative-123',
        items: [
          { id: 'campaign-1', type: 'campaign' },
          { id: 'analysis-1', type: 'analysis' },
        ],
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'initiatives.add_items',
          project: 'test',
          initiativeId: 'initiative-123',
          itemCount: 2,
        }),
      );
      expect(result.preview).toEqual(
        expect.objectContaining({
          items: [
            { id: 'campaign-1', type: 'campaign' },
            { id: 'analysis-1', type: 'analysis' },
          ],
        }),
      );
    });

    it('throws for empty initiativeId', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareAddItems({
          project: 'test',
          initiativeId: '',
          items: [{ id: 'asset-1', type: 'asset' }],
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty items array', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareAddItems({
          project: 'test',
          initiativeId: 'initiative-123',
          items: [],
        }),
      ).toThrow('Items array must not be empty');
    });

    it('throws for too many items', () => {
      const service = new BloomreachInitiativesService('test');
      const items = Array.from({ length: 101 }, (_, i) => ({
        id: `item-${i + 1}`,
        type: 'asset' as const,
      }));
      expect(() =>
        service.prepareAddItems({
          project: 'test',
          initiativeId: 'initiative-123',
          items,
        }),
      ).toThrow('Cannot add more than 100 items');
    });

    it('throws for item with empty ID', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareAddItems({
          project: 'test',
          initiativeId: 'initiative-123',
          items: [{ id: '   ', type: 'campaign' }],
        }),
      ).toThrow('Each item must have a non-empty ID');
    });

    it('throws for item with invalid type', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareAddItems({
          project: 'test',
          initiativeId: 'initiative-123',
          items: [{ id: 'item-1', type: 'segment' as unknown as 'campaign' }],
        }),
      ).toThrow('Item type must be one of');
    });

    it('throws for empty project', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareAddItems({
          project: '',
          initiativeId: 'initiative-123',
          items: [{ id: 'asset-1', type: 'asset' }],
        }),
      ).toThrow('must not be empty');
    });
  });

  describe('prepareArchiveInitiative', () => {
    it('returns a prepared action with valid input', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareArchiveInitiative({
        project: 'test',
        initiativeId: 'initiative-900',
      });

      expect(result.preparedActionId).toMatch(/^pa_/);
      expect(result.confirmToken).toMatch(/^ct_stub_/);
      expect(result.expiresAtMs).toBeGreaterThan(Date.now());
      expect(result.preview).toEqual(
        expect.objectContaining({
          action: 'initiatives.archive_initiative',
          project: 'test',
          initiativeId: 'initiative-900',
        }),
      );
    });

    it('includes operatorNote in preview', () => {
      const service = new BloomreachInitiativesService('test');
      const result = service.prepareArchiveInitiative({
        project: 'test',
        initiativeId: 'initiative-900',
        operatorNote: 'Archive finished campaign grouping',
      });

      expect(result.preview).toEqual(
        expect.objectContaining({ operatorNote: 'Archive finished campaign grouping' }),
      );
    });

    it('throws for empty initiativeId', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareArchiveInitiative({
          project: 'test',
          initiativeId: '',
        }),
      ).toThrow('must not be empty');
    });

    it('throws for empty project', () => {
      const service = new BloomreachInitiativesService('test');
      expect(() =>
        service.prepareArchiveInitiative({
          project: '',
          initiativeId: 'initiative-900',
        }),
      ).toThrow('must not be empty');
    });
  });
});
