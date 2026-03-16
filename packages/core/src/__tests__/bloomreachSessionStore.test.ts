import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', async () => {
  const actual = await vi.importActual('node:os') as Record<string, unknown>;
  return {
    ...actual,
    hostname: () => 'test-host',
    userInfo: () => ({
      ...(actual.userInfo as () => Record<string, unknown>)(),
      username: 'test-user',
    }),
  };
});

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises') as Record<string, unknown>;
  return {
    ...actual,
    chmod: vi.fn(async () => undefined),
  };
});

import {
  deriveEncryptionKey,
  getSessionFilePath,
  isSessionExpired,
  loadSession,
  deleteSession,
  saveSession,
  summarizeSessionCookies,
  type BloomreachStorageState,
  type StoredSession,
} from '../bloomreachSessionStore.js';

function makeStorageState(nowSeconds: number): BloomreachStorageState {
  return {
    cookies: [
      {
        name: 'auth',
        value: 'secret-cookie-value',
        domain: '.bloomreach.com',
        path: '/',
        expires: nowSeconds + 3600,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'session-only',
        value: 'session-value',
        domain: '.bloomreach.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      },
    ],
    origins: [
      {
        origin: 'https://app.exponea.com',
        localStorage: [{ name: 'token', value: 'abc123' }],
      },
    ],
  };
}

describe('bloomreachSessionStore', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'bloomreach-session-store-'));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('deriveEncryptionKey is deterministic, unique per profile, and 32 bytes', () => {
    const first = deriveEncryptionKey('profile-a');
    const second = deriveEncryptionKey('profile-a');
    const different = deriveEncryptionKey('profile-b');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(different)).toBe(false);
    expect(first.length).toBe(32);
  });

  it('getSessionFilePath builds profile session path', () => {
    const result = getSessionFilePath('/tmp/profiles', 'my-profile');
    expect(result).toBe(path.join('/tmp/profiles', 'my-profile', '.session.enc.json'));
  });

  it('saveSession and loadSession round-trip encrypted session data', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const storageState = makeStorageState(nowSeconds);

    const filePath = await saveSession(
      tempRoot,
      'alpha',
      storageState,
      'https://app.exponea.com/login',
    );

    const encryptedOnDisk = await readFile(filePath, 'utf8');
    expect(encryptedOnDisk).toContain('"algorithm": "aes-256-gcm"');
    expect(encryptedOnDisk).toContain('"metadata"');
    expect(encryptedOnDisk).not.toContain('secret-cookie-value');
    expect(encryptedOnDisk).not.toContain('"storageState"');

    const loaded = await loadSession(tempRoot, 'alpha');
    expect(loaded).not.toBeNull();

    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.storageState).toEqual(storageState);
    expect(loaded?.metadata.profileName).toBe('alpha');
    expect(loaded?.metadata.loginUrl).toBe('https://app.exponea.com/login');
    expect(loaded?.metadata.cookieCount).toBe(2);
    expect(loaded?.metadata.earliestCookieExpiry).toBe(
      new Date((nowSeconds + 3600) * 1000).toISOString(),
    );
    expect(new Date(loaded?.metadata.capturedAt ?? '').toString()).not.toBe('Invalid Date');
  });

  it('loadSession returns null for missing file', async () => {
    const loaded = await loadSession(tempRoot, 'does-not-exist');
    expect(loaded).toBeNull();
  });

  it('loadSession returns null for corrupt file', async () => {
    const sessionFilePath = getSessionFilePath(tempRoot, 'broken');
    await mkdir(path.dirname(sessionFilePath), { recursive: true });
    await writeFile(sessionFilePath, 'this is not valid json', 'utf8');

    const loaded = await loadSession(tempRoot, 'broken');
    expect(loaded).toBeNull();
  });

  it('isSessionExpired handles expired, valid, session-only, and empty cookie sets', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const expiredSession: StoredSession = {
      schemaVersion: 1,
      metadata: {
        capturedAt: new Date().toISOString(),
        profileName: 'p',
        loginUrl: 'https://example.com',
        cookieCount: 1,
        earliestCookieExpiry: new Date((nowSeconds - 100) * 1000).toISOString(),
      },
      storageState: {
        cookies: [
          {
            name: 'old',
            value: 'x',
            domain: 'example.com',
            path: '/',
            expires: nowSeconds - 100,
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
        ],
        origins: [],
      },
    };

    const validSession: StoredSession = {
      ...expiredSession,
      storageState: {
        cookies: [
          {
            ...expiredSession.storageState.cookies[0],
            expires: nowSeconds + 100,
          },
        ],
        origins: [],
      },
    };

    const sessionOnlyCookies: StoredSession = {
      ...expiredSession,
      storageState: {
        cookies: [
          {
            ...expiredSession.storageState.cookies[0],
            expires: -1,
          },
        ],
        origins: [],
      },
    };

    const noCookies: StoredSession = {
      ...expiredSession,
      storageState: {
        cookies: [],
        origins: [],
      },
    };

    expect(isSessionExpired(expiredSession)).toBe(true);
    expect(isSessionExpired(validSession)).toBe(false);
    expect(isSessionExpired(sessionOnlyCookies)).toBe(false);
    expect(isSessionExpired(noCookies)).toBe(true);
  });

  it('summarizeSessionCookies returns cookie metadata with nullable expiresAt', () => {
    const cookies: BloomreachStorageState['cookies'] = [
      {
        name: 'persistent',
        value: 'v1',
        domain: '.bloomreach.com',
        path: '/',
        expires: 1893456000,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'session',
        value: 'v2',
        domain: '.bloomreach.com',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Strict',
      },
    ];

    const summary = summarizeSessionCookies(cookies);

    expect(summary).toEqual([
      {
        name: 'persistent',
        domain: '.bloomreach.com',
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
      {
        name: 'session',
        domain: '.bloomreach.com',
        expiresAt: null,
      },
    ]);
  });

  describe('deleteSession', () => {
    it('removes existing session file and returns true', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const storageState = makeStorageState(nowSeconds);
      await saveSession(tempRoot, 'to-delete', storageState, 'https://example.com/login');

      const result = await deleteSession(tempRoot, 'to-delete');
      expect(result).toBe(true);

      // Verify the session is gone
      const loaded = await loadSession(tempRoot, 'to-delete');
      expect(loaded).toBeNull();
    });

    it('returns false when no session exists', async () => {
      const result = await deleteSession(tempRoot, 'nonexistent');
      expect(result).toBe(false);
    });
  });

});
