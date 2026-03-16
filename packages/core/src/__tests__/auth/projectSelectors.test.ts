import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserContext, ElementHandle, Page } from 'playwright-core';
import {
  PROJECT_TREE_RENDER_TIMEOUT_MS,
  clickProjectAndCaptureUrl,
  extractProjectSlug,
  findProjectElement,
  flattenProjects,
  scrapeProjectTree,
  toSlug,
} from '../../auth/projectSelectors.js';

function createMockPage(evaluateResult: unknown = null): Page {
  return {
    waitForSelector: vi.fn().mockResolvedValue({}),
    evaluate: vi.fn().mockResolvedValue(evaluateResult),
  } as unknown as Page;
}

function createMockElementHandle(text: string): ElementHandle {
  return {
    textContent: vi.fn().mockResolvedValue(text),
  } as unknown as ElementHandle;
}

describe('projectSelectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scrapeProjectTree', () => {
    it('extracts single org with single workspace, product, and project', async () => {
      const evaluateResult = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'POWER',
                products: [
                  {
                    name: 'Engagement',
                    projectCount: 1,
                    projects: ['Kingdom of Joakim'],
                  },
                ],
              },
            ],
          },
        ],
      };
      const page = createMockPage(evaluateResult);

      const result = await scrapeProjectTree(page);

      expect(result).toEqual(evaluateResult);
      expect(page.waitForSelector).toHaveBeenCalledWith('e-ui-accordion.discovery-like', {
        timeout: PROJECT_TREE_RENDER_TIMEOUT_MS,
      });
      expect(page.evaluate).toHaveBeenCalledTimes(1);
    });

    it('extracts multiple organizations with nested workspaces', async () => {
      const evaluateResult = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'Workspace A',
                products: [{ name: 'Engagement', projectCount: 1, projects: ['Alpha'] }],
              },
            ],
          },
          {
            name: 'NOVA',
            workspaces: [
              {
                name: 'Workspace B',
                products: [{ name: 'Discovery', projectCount: 2, projects: ['Beta', 'Gamma'] }],
              },
            ],
          },
        ],
      };
      const page = createMockPage(evaluateResult);

      const result = await scrapeProjectTree(page);

      expect(result.organizations).toHaveLength(2);
      expect(result).toEqual(evaluateResult);
    });

    it('returns empty organizations array when no accordion found', async () => {
      const page = createMockPage({ organizations: [{ name: 'ignored' }] });
      vi.mocked(page.waitForSelector).mockRejectedValueOnce(new Error('timeout'));

      const result = await scrapeProjectTree(page);

      expect(result).toEqual({ organizations: [] });
      expect(page.evaluate).not.toHaveBeenCalled();
    });

    it('handles product with count badge "(3)" correctly', async () => {
      const evaluateResult = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'POWER',
                products: [
                  {
                    name: 'Engagement',
                    projectCount: 3,
                    projects: ['A', 'B', 'C'],
                  },
                ],
              },
            ],
          },
        ],
      };
      const page = createMockPage(evaluateResult);

      const result = await scrapeProjectTree(page);

      expect(result.organizations[0]?.workspaces[0]?.products[0]?.projectCount).toBe(3);
    });

    it('handles multiple projects under one product', async () => {
      const evaluateResult = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'POWER',
                products: [
                  {
                    name: 'Engagement',
                    projectCount: 3,
                    projects: ['Kingdom of Joakim', 'Kingdom of Alice', 'Kingdom of Bob'],
                  },
                ],
              },
            ],
          },
        ],
      };
      const page = createMockPage(evaluateResult);

      const result = await scrapeProjectTree(page);

      expect(result.organizations[0]?.workspaces[0]?.products[0]?.projects).toEqual([
        'Kingdom of Joakim',
        'Kingdom of Alice',
        'Kingdom of Bob',
      ]);
    });
  });

  describe('flattenProjects', () => {
    it('flattens hierarchical tree to flat project array', () => {
      const tree = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'Workspace 1',
                products: [{ name: 'Engagement', projectCount: 2, projects: ['Alpha', 'Beta'] }],
              },
            ],
          },
        ],
      };

      const result = flattenProjects(tree);

      expect(result).toHaveLength(2);
      expect(result.map((project) => project.name)).toEqual(['Alpha', 'Beta']);
    });

    it('includes organization, workspace, product in each flattened project', () => {
      const tree = {
        organizations: [
          {
            name: 'POWER',
            workspaces: [
              {
                name: 'Main Workspace',
                products: [
                  {
                    name: 'Engagement',
                    projectCount: 1,
                    projects: ['Kingdom of Joakim'],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = flattenProjects(tree);

      expect(result).toEqual([
        {
          name: 'Kingdom of Joakim',
          organization: 'POWER',
          workspace: 'Main Workspace',
          product: 'Engagement',
        },
      ]);
    });

    it('returns empty array for empty tree', () => {
      expect(flattenProjects({ organizations: [] })).toEqual([]);
    });
  });

  describe('findProjectElement', () => {
    it('finds project by exact name match (case-insensitive)', async () => {
      const target = createMockElementHandle('Kingdom of Joakim');
      const page = {
        $$: vi.fn().mockResolvedValue([createMockElementHandle('Other Project'), target]),
      } as unknown as Page;

      const result = await findProjectElement(page, 'kingdom of joakim');

      expect(result).toBe(target);
    });

    it('finds project by slug match', async () => {
      const target = createMockElementHandle('Kingdom of Joakim');
      const page = {
        $$: vi.fn().mockResolvedValue([target]),
      } as unknown as Page;

      const result = await findProjectElement(page, 'kingdom-of-joakim');

      expect(result).toBe(target);
    });

    it('returns null when no matching project found', async () => {
      const page = {
        $$: vi
          .fn()
          .mockResolvedValue([createMockElementHandle('Alpha'), createMockElementHandle('Beta')]),
      } as unknown as Page;

      const result = await findProjectElement(page, 'gamma');

      expect(result).toBeNull();
    });

    it('returns first match when multiple candidates exist', async () => {
      const first = createMockElementHandle('Kingdom of Joakim');
      const second = createMockElementHandle('Kingdom of Joakim');
      const page = {
        $$: vi.fn().mockResolvedValue([first, second]),
      } as unknown as Page;

      const result = await findProjectElement(page, 'kingdom-of-joakim');

      expect(result).toBe(first);
    });
  });

  describe('clickProjectAndCaptureUrl', () => {
    it('captures URL from new tab and returns url + slug', async () => {
      const mockNewPage = {
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://power.bloomreach.co/p/kingdom-of-joakim/home'),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        waitForEvent: vi.fn().mockResolvedValue(mockNewPage),
      } as unknown as BrowserContext;
      const projectElement = {
        click: vi.fn().mockResolvedValue(undefined),
      } as unknown as ElementHandle;

      const result = await clickProjectAndCaptureUrl(mockContext, projectElement);

      expect(result).toEqual({
        url: 'https://power.bloomreach.co/p/kingdom-of-joakim/home',
        slug: 'kingdom-of-joakim',
      });
    });

    it('closes the new tab after capture', async () => {
      const mockNewPage = {
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://power.bloomreach.co/p/kingdom-of-joakim/home'),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        waitForEvent: vi.fn().mockResolvedValue(mockNewPage),
      } as unknown as BrowserContext;
      const projectElement = {
        click: vi.fn().mockResolvedValue(undefined),
      } as unknown as ElementHandle;

      await clickProjectAndCaptureUrl(mockContext, projectElement);

      expect(mockNewPage.close).toHaveBeenCalledTimes(1);
    });

    it('returns null when URL does not match project pattern', async () => {
      const mockNewPage = {
        waitForLoadState: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://power.bloomreach.co/my-account'),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockContext = {
        waitForEvent: vi.fn().mockResolvedValue(mockNewPage),
      } as unknown as BrowserContext;
      const projectElement = {
        click: vi.fn().mockResolvedValue(undefined),
      } as unknown as ElementHandle;

      const result = await clickProjectAndCaptureUrl(mockContext, projectElement);

      expect(result).toBeNull();
      expect(mockNewPage.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractProjectSlug', () => {
    it('extracts slug from standard project URL', () => {
      expect(extractProjectSlug('https://power.bloomreach.co/p/kingdom-of-joakim/home')).toBe(
        'kingdom-of-joakim',
      );
    });

    it('extracts slug from URL with trailing path', () => {
      expect(
        extractProjectSlug('https://power.bloomreach.co/p/kingdom-of-joakim/segments/list'),
      ).toBe('kingdom-of-joakim');
    });

    it('returns null for non-project URL', () => {
      expect(extractProjectSlug('https://power.bloomreach.co/my-account')).toBeNull();
    });

    it('returns null for malformed URL', () => {
      expect(extractProjectSlug('not a url')).toBeNull();
    });
  });

  describe('toSlug', () => {
    it('converts project name to kebab-case slug', () => {
      expect(toSlug('Kingdom of Joakim')).toBe('kingdom-of-joakim');
    });

    it('handles special characters', () => {
      expect(toSlug('Engagement & Loyalty!!!')).toBe('engagement-loyalty');
    });

    it('collapses multiple hyphens', () => {
      expect(toSlug('Kingdom --- of   Joakim')).toBe('kingdom-of-joakim');
    });
  });
});
