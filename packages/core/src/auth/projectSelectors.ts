import type { BrowserContext, ElementHandle, Page } from 'playwright-core';

/** A scraped project entry with its full hierarchy path. */
export interface ScrapedProject {
  name: string;
  organization: string;
  workspace: string;
  product: string;
}

/** Result of scraping the full project tree from /my-account. */
export interface ScrapedProjectTree {
  organizations: ScrapedOrganization[];
}

export interface ScrapedOrganization {
  name: string;
  workspaces: ScrapedWorkspace[];
}

export interface ScrapedWorkspace {
  name: string;
  products: ScrapedProduct[];
}

export interface ScrapedProduct {
  name: string;
  projectCount: number;
  projects: string[];
}

/** Timeout (ms) for waiting for the project tree to render. */
export const PROJECT_TREE_RENDER_TIMEOUT_MS = 10_000;

/** Scrape the organization/workspace/product/project hierarchy from /my-account. */
export async function scrapeProjectTree(page: Page): Promise<ScrapedProjectTree> {
  try {
    await page.waitForSelector('e-ui-accordion.discovery-like', {
      timeout: PROJECT_TREE_RENDER_TIMEOUT_MS,
    });
  } catch {
    return { organizations: [] };
  }

  const tree = await page.evaluate<ScrapedProjectTree>(() => {
    type DomElement = {
      parentElement: DomElement | null;
      textContent: string | null;
      matches: (selector: string) => boolean;
      querySelector: (selector: string) => DomElement | null;
      querySelectorAll: (selector: string) => Iterable<DomElement>;
    };

    type DomDocument = {
      querySelectorAll: (selector: string) => Iterable<DomElement>;
    };

    const normalizeText = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/g, ' ').trim();

    const domDocument = (globalThis as { document?: DomDocument }).document;
    if (!domDocument) {
      return { organizations: [] };
    }

    const getNearestAccordionAncestor = (element: DomElement): DomElement | null => {
      let current = element.parentElement;
      while (current) {
        if (current.matches('e-ui-accordion.discovery-like')) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const getChildAccordions = (accordion: DomElement): DomElement[] => {
      const descendants = Array.from<DomElement>(
        accordion.querySelectorAll('e-ui-accordion.discovery-like'),
      );

      return descendants.filter(
        (descendant) => getNearestAccordionAncestor(descendant) === accordion,
      );
    };

    const getLeafRows = (accordion: DomElement): string[] => {
      const rows = Array.from<DomElement>(accordion.querySelectorAll('div.discovery-like-row'));

      return rows
        .filter((row) => getNearestAccordionAncestor(row) === accordion)
        .map((row) => normalizeText(row.textContent))
        .filter((name) => name.length > 0);
    };

    const getHeaderText = (accordion: DomElement): string => {
      const strongHeader = accordion.querySelector('span.ui.strong');
      if (strongHeader) {
        return normalizeText(strongHeader.textContent);
      }

      const uiHeader = accordion.querySelector('span.ui');
      return normalizeText(uiHeader?.textContent);
    };

    const parseProductHeader = (headerText: string): { name: string; count: number | null } => {
      const trimmed = normalizeText(headerText);
      const match = trimmed.match(/^(.*?)(?:\((\d+)\))?$/);

      if (!match) {
        return { name: trimmed, count: null };
      }

      const productName = normalizeText(match[1]);
      const parsedCount = match[2] ? Number.parseInt(match[2], 10) : null;
      return { name: productName, count: Number.isNaN(parsedCount) ? null : parsedCount };
    };

    const allAccordions = Array.from<DomElement>(
      domDocument.querySelectorAll('e-ui-accordion.discovery-like'),
    );
    const organizations = allAccordions
      .filter((accordion) => !getNearestAccordionAncestor(accordion))
      .map((organizationAccordion) => {
        const organizationName = getHeaderText(organizationAccordion);

        const workspaceAccordions = getChildAccordions(organizationAccordion);
        const workspaces = workspaceAccordions.map((workspaceAccordion) => {
          const workspaceName = getHeaderText(workspaceAccordion);

          const productAccordions = getChildAccordions(workspaceAccordion);
          const products = productAccordions.map((productAccordion) => {
            const headerText = getHeaderText(productAccordion);
            const parsedHeader = parseProductHeader(headerText);
            const projects = getLeafRows(productAccordion);

            return {
              name: parsedHeader.name,
              projectCount: parsedHeader.count ?? projects.length,
              projects,
            };
          });

          return {
            name: workspaceName,
            products,
          };
        });

        return {
          name: organizationName,
          workspaces,
        };
      });

    return { organizations };
  });

  return tree;
}

/** Flatten a scraped tree into project entries with full hierarchy path. */
export function flattenProjects(tree: ScrapedProjectTree): ScrapedProject[] {
  return tree.organizations.flatMap((organization) =>
    organization.workspaces.flatMap((workspace) =>
      workspace.products.flatMap((product) =>
        product.projects.map((projectName) => ({
          name: projectName,
          organization: organization.name,
          workspace: workspace.name,
          product: product.name,
        })),
      ),
    ),
  );
}

/** Find a project row element by exact name or slug match. */
export async function findProjectElement(
  page: Page,
  nameOrSlug: string,
): Promise<ElementHandle | null> {
  const rows = await page.$$('div.discovery-like-row');
  const nameQuery = nameOrSlug.trim().toLowerCase();
  const slugQuery = toSlug(nameOrSlug);

  for (const row of rows) {
    const rowText = (await row.textContent())?.replace(/\s+/g, ' ').trim();
    if (!rowText) {
      continue;
    }

    const rowName = rowText.toLowerCase();
    const rowSlug = toSlug(rowText);
    if (rowName === nameQuery || rowSlug === nameQuery || rowSlug === slugQuery) {
      return row;
    }
  }

  return null;
}

/** Click a project row, capture new-tab URL, then close the tab. */
export async function clickProjectAndCaptureUrl(
  context: BrowserContext,
  projectElement: ElementHandle,
): Promise<{ url: string; slug: string } | null> {
  try {
    const newPagePromise = context.waitForEvent('page', { timeout: 10_000 });
    await projectElement.click();
    const newPage = await newPagePromise;

    try {
      await newPage.waitForLoadState('domcontentloaded');
      const url = newPage.url();
      const slug = extractProjectSlug(url);
      if (!slug) {
        return null;
      }

      return { url, slug };
    } finally {
      await newPage.close();
    }
  } catch {
    return null;
  }
}

/** Extract project slug from URLs like https://.../p/{slug}/home. */
export function extractProjectSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/p\/([^/]+)(?:\/|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Convert a project name to a normalized kebab-case slug. */
export function toSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
