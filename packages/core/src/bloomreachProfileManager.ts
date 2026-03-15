import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import lockfile from 'proper-lockfile';
import { chromium } from 'playwright-core';
import type { BrowserContext, LaunchOptions } from 'playwright-core';
import { BloomreachBuddyError } from './bloomreachApiClient.js';

export interface ProfileManagerConfig {
  /** Base directory for browser profiles. Default: ~/.bloomreach-buddy/profiles */
  profilesDir: string;
}

export interface PersistentContextOptions {
  /** Run in headless mode. Default: true */
  headless?: boolean;
  /** Extra Chromium launch arguments */
  args?: string[];
}

export function resolveProfilesDir(explicit?: string): string {
  return (
    explicit ??
    process.env.BLOOMREACH_PROFILE_DIR ??
    path.join(homedir(), '.bloomreach-buddy', 'profiles')
  );
}

export class BloomreachProfileManager {
  readonly profilesDir: string;

  constructor(config: ProfileManagerConfig) {
    this.profilesDir = config.profilesDir;
  }

  getProfileUserDataDir(profileName?: string): string {
    return path.join(this.profilesDir, profileName || 'default');
  }

  async withProfileLock<T>(
    profileName: string,
    callback: (userDataDir: string) => Promise<T>,
  ): Promise<T> {
    const userDataDir = this.getProfileUserDataDir(profileName);
    await mkdir(userDataDir, { recursive: true });

    let release: (() => Promise<void>) | undefined;

    try {
      release = await lockfile.lock(userDataDir, {
        realpath: false,
        lockfilePath: path.join(userDataDir, '.profile.lock'),
        retries: {
          retries: 20,
          factor: 1.2,
          minTimeout: 100,
          maxTimeout: 1000,
        },
      });
    } catch {
      throw new BloomreachBuddyError(
        'PROFILE_LOCKED',
        `Browser profile "${profileName}" is locked by another process.`,
      );
    }

    try {
      return await callback(userDataDir);
    } finally {
      if (release !== undefined) {
        await release();
      }
    }
  }

  async runWithPersistentContext<T>(
    profileName: string,
    options: PersistentContextOptions,
    callback: (context: BrowserContext) => Promise<T>,
  ): Promise<T> {
    return this.withProfileLock(profileName, async (userDataDir) => {
      const launchOptions: LaunchOptions = {
        headless: options.headless ?? true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          ...(options.args ?? []),
        ],
      };

      const context = await chromium.launchPersistentContext(
        userDataDir,
        launchOptions,
      );

      try {
        return await callback(context);
      } finally {
        await context.close();
      }
    });
  }
}
