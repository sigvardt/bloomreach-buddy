import type { BrowserContext, Page } from 'playwright-core';
import { BloomreachBuddyError } from './errors.js';
import type {
  BloomreachProfileManager,
  PersistentContextOptions,
} from './bloomreachProfileManager.js';
import type { BloomreachAuthConfig, BloomreachSessionOptions } from './bloomreachAuth.js';
import { isAuthenticatedPage } from './bloomreachAuth.js';
import {
  loadSession,
  updateSessionMetadata,
  clearSelectedProject as clearSelectedProjectFromStore,
  isSessionExpired,
} from './bloomreachSessionStore.js';
import type { SelectedProjectMetadata } from './bloomreachSessionStore.js';
import {
  scrapeProjectTree,
  flattenProjects,
  findProjectElement,
  clickProjectAndCaptureUrl,
  toSlug,
} from './auth/projectSelectors.js';
import type { ScrapedProject, ScrapedProjectTree } from './auth/projectSelectors.js';

/** A Bloomreach project with full hierarchy context. */
export interface BloomreachProject {
  name: string;
  slug: string;
  url: string;
  organization: string;
  workspace: string;
  product: string;
}

/** Result of listing available projects. */
export interface ProjectListResult {
  projects: BloomreachProject[];
  hierarchy: ScrapedProjectTree;
  scrapedAt: string;
  profileName: string;
}

/** Result of selecting a project. */
export interface ProjectSelectResult {
  project: BloomreachProject;
  selectedAt: string;
  profileName: string;
  previousProject: BloomreachProject | null;
}

/** Currently selected project (or null if none). */
export interface ProjectCurrentResult {
  project: BloomreachProject | null;
  profileName: string;
}

/** Result of clearing project selection. */
export interface ProjectClearResult {
  cleared: boolean;
  profileName: string;
  previousProject: BloomreachProject | null;
}

/** Convert SelectedProjectMetadata to BloomreachProject. */
export function selectedMetadataToProject(meta: SelectedProjectMetadata): BloomreachProject {
  return {
    name: meta.name,
    slug: meta.slug,
    url: meta.url,
    organization: meta.organization,
    workspace: meta.workspace,
    product: meta.product,
  };
}

export class BloomreachProjectsService {
  private readonly profileManager: BloomreachProfileManager;
  private readonly profilesDir: string;
  private readonly loginUrl: string;

  constructor(profileManager: BloomreachProfileManager, config: BloomreachAuthConfig) {
    this.profileManager = profileManager;
    this.profilesDir = config.profilesDir;
    const loginUrl =
      config.loginUrl ??
      process.env.BLOOMREACH_LOGIN_URL ??
      'https://eu.login.bloomreach.com/login';
    this.loginUrl = loginUrl;
  }

  async listProjects(options?: BloomreachSessionOptions): Promise<ProjectListResult> {
    const profileName = options?.profileName ?? 'default';
    const session = await loadSession(this.profilesDir, profileName);

    if (!session || isSessionExpired(session)) {
      throw new BloomreachBuddyError(
        'AUTH_REQUIRED',
        'Browser session is not authenticated. Run "bloomreach login" first.',
      );
    }

    const myAccountUrl = this.buildMyAccountUrl();
    const persistentOptions: PersistentContextOptions = { headless: false };

    const { hierarchy, projects } = await this.profileManager.runWithPersistentContext(
      profileName,
      persistentOptions,
      async (context: BrowserContext) => {
        const page: Page = context.pages()[0] ?? (await context.newPage());

        await page.goto(myAccountUrl, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.waitForTimeout(500);

        if (!isAuthenticatedPage(page.url())) {
          throw new BloomreachBuddyError(
            'AUTH_REQUIRED',
            'Browser session is not authenticated. Run "bloomreach login" first.',
          );
        }

        const scrapedHierarchy = await scrapeProjectTree(page);
        const flattened = flattenProjects(scrapedHierarchy);

        const projectList = flattened.map((project: ScrapedProject) => ({
          name: project.name,
          slug: toSlug(project.name),
          url: '',
          organization: project.organization,
          workspace: project.workspace,
          product: project.product,
        }));

        return {
          hierarchy: scrapedHierarchy,
          projects: projectList,
        };
      },
    );

    return {
      projects,
      hierarchy,
      scrapedAt: new Date().toISOString(),
      profileName,
    };
  }

  async selectProject(
    nameOrSlug: string,
    options?: BloomreachSessionOptions,
  ): Promise<ProjectSelectResult> {
    const profileName = options?.profileName ?? 'default';
    const session = await loadSession(this.profilesDir, profileName);

    if (!session || isSessionExpired(session)) {
      throw new BloomreachBuddyError(
        'AUTH_REQUIRED',
        'Browser session is not authenticated. Run "bloomreach login" first.',
      );
    }

    const previousProject = session.metadata.selectedProject
      ? selectedMetadataToProject(session.metadata.selectedProject)
      : null;

    const myAccountUrl = this.buildMyAccountUrl();
    const persistentOptions: PersistentContextOptions = { headless: false };

    const selected = await this.profileManager.runWithPersistentContext(
      profileName,
      persistentOptions,
      async (context: BrowserContext) => {
        const page: Page = context.pages()[0] ?? (await context.newPage());
        await page.goto(myAccountUrl, { waitUntil: 'networkidle', timeout: 30_000 });

        if (!isAuthenticatedPage(page.url())) {
          throw new BloomreachBuddyError(
            'AUTH_REQUIRED',
            'Browser session is not authenticated. Run "bloomreach login" first.',
          );
        }

        const hierarchy = await scrapeProjectTree(page);
        const flattened = flattenProjects(hierarchy);

        const projectElement = await findProjectElement(page, nameOrSlug);
        if (!projectElement) {
          throw new BloomreachBuddyError(
            'TARGET_NOT_FOUND',
            `Project "${nameOrSlug}" not found in Bloomreach account project list.`,
          );
        }

        const captured = await clickProjectAndCaptureUrl(context, projectElement);
        if (!captured) {
          throw new BloomreachBuddyError(
            'TARGET_NOT_FOUND',
            `Project "${nameOrSlug}" was found but opening it failed or URL could not be captured.`,
          );
        }

        const normalizedQuery = nameOrSlug.trim().toLowerCase();
        const querySlug = toSlug(nameOrSlug);
        const matchedProject = flattened.find((project) => {
          const projectName = project.name.trim().toLowerCase();
          const projectSlug = toSlug(project.name);
          return (
            projectName === normalizedQuery ||
            projectSlug === normalizedQuery ||
            projectSlug === querySlug
          );
        });

        if (!matchedProject) {
          throw new BloomreachBuddyError(
            'TARGET_NOT_FOUND',
            `Project "${nameOrSlug}" metadata could not be resolved from the project hierarchy.`,
          );
        }

        return {
          name: matchedProject.name,
          slug: captured.slug,
          url: captured.url,
          organization: matchedProject.organization,
          workspace: matchedProject.workspace,
          product: matchedProject.product,
        };
      },
    );

    const selectedAt = new Date().toISOString();
    const selectedProject: SelectedProjectMetadata = {
      ...selected,
      selectedAt,
    };

    const updated = await updateSessionMetadata(this.profilesDir, profileName, {
      selectedProject,
    });

    if (!updated) {
      throw new BloomreachBuddyError(
        'AUTH_REQUIRED',
        'Browser session is not authenticated. Run "bloomreach login" first.',
      );
    }

    return {
      project: selected,
      selectedAt,
      profileName,
      previousProject,
    };
  }

  async currentProject(options?: BloomreachSessionOptions): Promise<ProjectCurrentResult> {
    const profileName = options?.profileName ?? 'default';
    const session = await loadSession(this.profilesDir, profileName);

    if (!session || isSessionExpired(session) || !session.metadata.selectedProject) {
      return {
        project: null,
        profileName,
      };
    }

    return {
      project: selectedMetadataToProject(session.metadata.selectedProject),
      profileName,
    };
  }

  async clearProject(options?: BloomreachSessionOptions): Promise<ProjectClearResult> {
    const profileName = options?.profileName ?? 'default';
    const session = await loadSession(this.profilesDir, profileName);
    const previousProject = session?.metadata.selectedProject
      ? selectedMetadataToProject(session.metadata.selectedProject)
      : null;

    const cleared = await clearSelectedProjectFromStore(this.profilesDir, profileName);

    return {
      cleared,
      profileName,
      previousProject,
    };
  }

  private buildMyAccountUrl(): string {
    try {
      const parsed = new URL(this.loginUrl);
      parsed.pathname = '/my-account';
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return 'https://eu.login.bloomreach.com/my-account';
    }
  }
}
