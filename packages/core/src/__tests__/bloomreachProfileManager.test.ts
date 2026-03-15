import path from 'node:path';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import lockfile from 'proper-lockfile';
import { chromium } from 'playwright-core';
import type { BrowserContext } from 'playwright-core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BloomreachBuddyError } from '../bloomreachApiClient.js';
import {
  BloomreachProfileManager,
  resolveProfilesDir,
} from '../bloomreachProfileManager.js';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
}));

vi.mock('proper-lockfile', () => ({
  default: {
    lock: vi.fn(),
  },
}));

vi.mock('playwright-core', () => ({
  chromium: {
    launchPersistentContext: vi.fn(),
  },
}));

const ORIGINAL_ENV = process.env;

describe('resolveProfilesDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BLOOMREACH_PROFILE_DIR;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses explicit parameter when provided', () => {
    process.env.BLOOMREACH_PROFILE_DIR = '/env/profiles';

    const result = resolveProfilesDir('/explicit/profiles');

    expect(result).toBe('/explicit/profiles');
  });

  it('falls back to BLOOMREACH_PROFILE_DIR environment variable', () => {
    process.env.BLOOMREACH_PROFILE_DIR = '/env/profiles';

    const result = resolveProfilesDir();

    expect(result).toBe('/env/profiles');
  });

  it('defaults to ~/.bloomreach-buddy/profiles when explicit and env are missing', () => {
    const result = resolveProfilesDir();

    expect(result).toBe(path.join(homedir(), '.bloomreach-buddy', 'profiles'));
  });
});

describe('BloomreachProfileManager', () => {
  const manager = new BloomreachProfileManager({ profilesDir: '/profiles' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfileUserDataDir', () => {
    it('returns default profile path when no profile name is provided', () => {
      expect(manager.getProfileUserDataDir()).toBe(path.join('/profiles', 'default'));
    });

    it('returns custom profile path when profile name is provided', () => {
      expect(manager.getProfileUserDataDir('team-a')).toBe(
        path.join('/profiles', 'team-a'),
      );
    });
  });

  describe('withProfileLock', () => {
    it('acquires lock, runs callback, and releases lock', async () => {
      const releaseMock = vi.fn(async () => undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);

      const callback = vi.fn(async () => 'ok');

      const result = await manager.withProfileLock('default', callback);

      const expectedDir = path.join('/profiles', 'default');
      expect(result).toBe('ok');
      expect(mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
      expect(lockfile.lock).toHaveBeenCalledWith(expectedDir, {
        realpath: false,
        lockfilePath: path.join(expectedDir, '.profile.lock'),
        retries: {
          retries: 20,
          factor: 1.2,
          minTimeout: 100,
          maxTimeout: 1000,
        },
      });
      expect(callback).toHaveBeenCalledWith(expectedDir);
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });

    it('maps lock failures to PROFILE_LOCKED', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(lockfile.lock).mockRejectedValue(new Error('busy'));
      const callback = vi.fn(async () => 'ok');

      await expect(manager.withProfileLock('shared', callback)).rejects.toMatchObject({
        code: 'PROFILE_LOCKED',
        message: 'Browser profile "shared" is locked by another process.',
      });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('runWithPersistentContext', () => {
    it('launches persistent context with expected options and closes on success', async () => {
      const releaseMock = vi.fn(async () => undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);

      const closeMock = vi.fn(async () => undefined);
      const context = {
        close: closeMock,
      } as unknown as BrowserContext;

      vi.mocked(chromium.launchPersistentContext).mockResolvedValue(context);

      const callback = vi.fn(async () => 'done');

      const result = await manager.runWithPersistentContext(
        'qa',
        {
          headless: false,
          args: ['--window-size=1280,720'],
        },
        callback,
      );

      const expectedDir = path.join('/profiles', 'qa');
      expect(result).toBe('done');
      expect(chromium.launchPersistentContext).toHaveBeenCalledWith(expectedDir, {
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          '--window-size=1280,720',
        ],
      });
      expect(callback).toHaveBeenCalledWith(context);
      expect(closeMock).toHaveBeenCalledTimes(1);
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });

    it('closes context when callback throws and rethrows the error', async () => {
      const releaseMock = vi.fn(async () => undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);

      const closeMock = vi.fn(async () => undefined);
      const context = {
        close: closeMock,
      } as unknown as BrowserContext;

      vi.mocked(chromium.launchPersistentContext).mockResolvedValue(context);

      const failure = new BloomreachBuddyError('NETWORK_ERROR', 'callback failed');

      await expect(
        manager.runWithPersistentContext('qa', {}, async () => {
          throw failure;
        }),
      ).rejects.toBe(failure);

      expect(closeMock).toHaveBeenCalledTimes(1);
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });
  });
});
