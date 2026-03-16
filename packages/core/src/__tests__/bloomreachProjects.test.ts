import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserContext, ElementHandle, Page } from 'playwright-core';
import type { BloomreachProfileManager } from '../bloomreachProfileManager.js';
import type { SelectedProjectMetadata, StoredSession } from '../bloomreachSessionStore.js';
import { BloomreachProjectsService, selectedMetadataToProject } from '../bloomreachProjects.js';

vi.mock('../bloomreachSessionStore.js', () => ({
  loadSession: vi.fn(),
  updateSessionMetadata: vi.fn(),
  clearSelectedProject: vi.fn(),
  isSessionExpired: vi.fn(),
}));

vi.mock('../auth/projectSelectors.js', () => ({
  scrapeProjectTree: vi.fn(),
  flattenProjects: vi.fn(),
  findProjectElement: vi.fn(),
  clickProjectAndCaptureUrl: vi.fn(),
  toSlug: vi.fn(),
}));

import {
  loadSession,
  updateSessionMetadata,
  clearSelectedProject,
  isSessionExpired,
} from '../bloomreachSessionStore.js';
import {
  scrapeProjectTree,
  flattenProjects,
  findProjectElement,
  clickProjectAndCaptureUrl,
  toSlug,
} from '../auth/projectSelectors.js';

type SessionWithOptionalSelection = StoredSession & {
  metadata: StoredSession['metadata'] & {
    selectedProject?: SelectedProjectMetadata;
  };
};

const mockPage = {
  goto: vi.fn(),
  waitForTimeout: vi.fn(),
  url: vi.fn(),
} as unknown as Page;

const mockContext = {
  pages: vi.fn(),
  newPage: vi.fn(),
} as unknown as BrowserContext;

function createMockProfileManager(page: Page, context: BrowserContext): BloomreachProfileManager {
  const contextWithPage = {
    ...context,
    pages: vi.fn().mockReturnValue([page]),
    newPage: vi.fn().mockResolvedValue(page),
  } as unknown as BrowserContext;

  return {
    runWithPersistentContext: vi
      .fn()
      .mockImplementation(
        async (
          _name: string,
          _opts: unknown,
          callback: (ctx: BrowserContext) => Promise<unknown>,
        ) => callback(contextWithPage),
      ),
  } as unknown as BloomreachProfileManager;
}

function createSession(selectedProject?: SelectedProjectMetadata): SessionWithOptionalSelection {
  return {
    schemaVersion: 1,
    metadata: {
      capturedAt: '2026-01-01T00:00:00.000Z',
      profileName: 'default',
      loginUrl: 'https://eu.login.bloomreach.com/login',
      cookieCount: 1,
      earliestCookieExpiry: '2030-01-01T00:00:00.000Z',
      selectedProject,
    },
    storageState: {
      cookies: [],
      origins: [],
    },
  };
}

const scrapedTree = {
  organizations: [
    {
      name: 'Org One',
      workspaces: [
        {
          name: 'Workspace One',
          products: [
            {
              name: 'Engagement',
              projectCount: 2,
              projects: ['Alpha Project', 'Beta Project'],
            },
          ],
        },
      ],
    },
  ],
};

const flattenedProjects = [
  {
    name: 'Alpha Project',
    organization: 'Org One',
    workspace: 'Workspace One',
    product: 'Engagement',
  },
  {
    name: 'Beta Project',
    organization: 'Org One',
    workspace: 'Workspace One',
    product: 'Engagement',
  },
];

const selectedProjectMeta: SelectedProjectMetadata = {
  name: 'Legacy Project',
  slug: 'legacy-project',
  url: 'https://app.exponea.com/p/legacy-project/home',
  organization: 'Legacy Org',
  workspace: 'Legacy Workspace',
  product: 'Engagement',
  selectedAt: '2026-01-05T12:00:00.000Z',
};

describe('BloomreachProjectsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPage.goto = vi.fn().mockResolvedValue(null) as unknown as Page['goto'];
    mockPage.waitForTimeout = vi
      .fn()
      .mockResolvedValue(undefined) as unknown as Page['waitForTimeout'];
    mockPage.url = vi
      .fn()
      .mockReturnValue('https://eu.login.bloomreach.com/my-account') as unknown as Page['url'];

    vi.mocked(loadSession).mockResolvedValue(createSession());
    vi.mocked(updateSessionMetadata).mockResolvedValue(true);
    vi.mocked(clearSelectedProject).mockResolvedValue(true);
    vi.mocked(isSessionExpired).mockReturnValue(false);

    vi.mocked(scrapeProjectTree).mockResolvedValue(scrapedTree);
    vi.mocked(flattenProjects).mockReturnValue(flattenedProjects);
    vi.mocked(findProjectElement).mockResolvedValue({} as unknown as ElementHandle);
    vi.mocked(clickProjectAndCaptureUrl).mockResolvedValue({
      url: 'https://app.exponea.com/p/alpha-project/home',
      slug: 'alpha-project',
    });
    vi.mocked(toSlug).mockImplementation((name: string) =>
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    );
  });

  it('throws AUTH_REQUIRED when no session exists', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    await expect(service.listProjects()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      name: 'BloomreachBuddyError',
    });
  });

  it('throws AUTH_REQUIRED when session is expired', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession());
    vi.mocked(isSessionExpired).mockReturnValue(true);
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    await expect(service.listProjects()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      name: 'BloomreachBuddyError',
    });
  });

  it('navigates to my-account and returns scraped project list', async () => {
    const profileManager = createMockProfileManager(mockPage, mockContext);
    const service = new BloomreachProjectsService(profileManager, {
      profilesDir: '/profiles',
    });

    const result = await service.listProjects({ profileName: 'p1' });

    expect(result.profileName).toBe('p1');
    expect(result.hierarchy).toEqual(scrapedTree);
    expect(result.projects).toEqual([
      {
        name: 'Alpha Project',
        slug: 'alpha-project',
        url: '',
        organization: 'Org One',
        workspace: 'Workspace One',
        product: 'Engagement',
      },
      {
        name: 'Beta Project',
        slug: 'beta-project',
        url: '',
        organization: 'Org One',
        workspace: 'Workspace One',
        product: 'Engagement',
      },
    ]);
    expect(mockPage.goto).toHaveBeenCalledWith('https://eu.login.bloomreach.com/my-account', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    expect(profileManager.runWithPersistentContext).toHaveBeenCalledWith(
      'p1',
      { headless: false },
      expect.any(Function),
    );
  });

  it('derives my-account URL from loginUrl', async () => {
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
      loginUrl: 'https://us.login.bloomreach.com/login/path?x=1',
    });

    await service.listProjects();

    expect(mockPage.goto).toHaveBeenCalledWith('https://us.login.bloomreach.com/my-account', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
  });

  it('selects project by name, captures URL, and saves to session', async () => {
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.selectProject('Alpha Project', { profileName: 'p1' });

    expect(findProjectElement).toHaveBeenCalledWith(mockPage, 'Alpha Project');
    expect(clickProjectAndCaptureUrl).toHaveBeenCalled();
    expect(updateSessionMetadata).toHaveBeenCalledWith('/profiles', 'p1', {
      selectedProject: expect.objectContaining({
        name: 'Alpha Project',
        slug: 'alpha-project',
        url: 'https://app.exponea.com/p/alpha-project/home',
        organization: 'Org One',
        workspace: 'Workspace One',
        product: 'Engagement',
      }),
    });
    expect(result.project).toEqual({
      name: 'Alpha Project',
      slug: 'alpha-project',
      url: 'https://app.exponea.com/p/alpha-project/home',
      organization: 'Org One',
      workspace: 'Workspace One',
      product: 'Engagement',
    });
    expect(result.profileName).toBe('p1');
  });

  it('throws TARGET_NOT_FOUND when project not found', async () => {
    vi.mocked(findProjectElement).mockResolvedValue(null);
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    await expect(service.selectProject('missing-project')).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
      name: 'BloomreachBuddyError',
    });
    expect(clickProjectAndCaptureUrl).not.toHaveBeenCalled();
    expect(updateSessionMetadata).not.toHaveBeenCalled();
  });

  it('throws AUTH_REQUIRED when not authenticated', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    await expect(service.selectProject('alpha-project')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      name: 'BloomreachBuddyError',
    });
  });

  it('includes previousProject in result when one was previously selected', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession(selectedProjectMeta));
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.selectProject('alpha-project');

    expect(result.previousProject).toEqual({
      name: 'Legacy Project',
      slug: 'legacy-project',
      url: 'https://app.exponea.com/p/legacy-project/home',
      organization: 'Legacy Org',
      workspace: 'Legacy Workspace',
      product: 'Engagement',
    });
  });

  it('sets previousProject to null when no prior selection', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession());
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.selectProject('alpha-project');

    expect(result.previousProject).toBeNull();
  });

  it('returns stored project from session metadata', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession(selectedProjectMeta));
    const profileManager = createMockProfileManager(mockPage, mockContext);
    const service = new BloomreachProjectsService(profileManager, {
      profilesDir: '/profiles',
    });

    const result = await service.currentProject({ profileName: 'p1' });

    expect(result).toEqual({
      profileName: 'p1',
      project: {
        name: 'Legacy Project',
        slug: 'legacy-project',
        url: 'https://app.exponea.com/p/legacy-project/home',
        organization: 'Legacy Org',
        workspace: 'Legacy Workspace',
        product: 'Engagement',
      },
    });
    expect(profileManager.runWithPersistentContext).not.toHaveBeenCalled();
  });

  it('returns null when no project selected', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession());
    const profileManager = createMockProfileManager(mockPage, mockContext);
    const service = new BloomreachProjectsService(profileManager, {
      profilesDir: '/profiles',
    });

    const result = await service.currentProject();

    expect(result).toEqual({
      project: null,
      profileName: 'default',
    });
    expect(profileManager.runWithPersistentContext).not.toHaveBeenCalled();
  });

  it('returns null when no session exists', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);
    const profileManager = createMockProfileManager(mockPage, mockContext);
    const service = new BloomreachProjectsService(profileManager, {
      profilesDir: '/profiles',
    });

    const result = await service.currentProject({ profileName: 'p1' });

    expect(result).toEqual({
      project: null,
      profileName: 'p1',
    });
    expect(profileManager.runWithPersistentContext).not.toHaveBeenCalled();
  });

  it('clears project selection from session', async () => {
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.clearProject({ profileName: 'p1' });

    expect(clearSelectedProject).toHaveBeenCalledWith('/profiles', 'p1');
    expect(result.cleared).toBe(true);
    expect(result.profileName).toBe('p1');
  });

  it('returns previousProject when clearing', async () => {
    vi.mocked(loadSession).mockResolvedValue(createSession(selectedProjectMeta));
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.clearProject();

    expect(result.previousProject).toEqual({
      name: 'Legacy Project',
      slug: 'legacy-project',
      url: 'https://app.exponea.com/p/legacy-project/home',
      organization: 'Legacy Org',
      workspace: 'Legacy Workspace',
      product: 'Engagement',
    });
  });

  it('returns cleared: false when no session exists', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);
    vi.mocked(clearSelectedProject).mockResolvedValue(false);
    const service = new BloomreachProjectsService(createMockProfileManager(mockPage, mockContext), {
      profilesDir: '/profiles',
    });

    const result = await service.clearProject({ profileName: 'p1' });

    expect(result).toEqual({
      cleared: false,
      profileName: 'p1',
      previousProject: null,
    });
  });
});

describe('selectedMetadataToProject', () => {
  it('converts SelectedProjectMetadata to BloomreachProject', () => {
    const result = selectedMetadataToProject(selectedProjectMeta);

    expect(result).toEqual({
      name: 'Legacy Project',
      slug: 'legacy-project',
      url: 'https://app.exponea.com/p/legacy-project/home',
      organization: 'Legacy Org',
      workspace: 'Legacy Workspace',
      product: 'Engagement',
    });
  });
});
