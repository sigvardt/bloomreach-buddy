import { readFile, writeFile, mkdir, chmod, unlink } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BloomreachStorageState {
  cookies: BloomreachCookie[];
  origins: BloomreachOriginState[];
}

export interface BloomreachCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number; // epoch seconds, -1 for session cookies
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface BloomreachOriginState {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface SessionMetadata {
  capturedAt: string; // ISO-8601
  profileName: string;
  loginUrl: string;
  cookieCount: number;
  earliestCookieExpiry: string | null; // ISO-8601 or null if all session cookies
}

export interface StoredSession {
  schemaVersion: 1;
  metadata: SessionMetadata;
  storageState: BloomreachStorageState;
}

// Internal encrypted envelope (written to disk)
interface EncryptedEnvelope {
  version: 1;
  algorithm: 'aes-256-gcm';
  ciphertext: string; // base64url
  iv: string; // base64url
  tag: string; // base64url
  metadata: SessionMetadata;
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

export function deriveEncryptionKey(profileName: string): Buffer {
  // SHA-256 hash of: hostname + '\0' + username + '\0' + profileName + '\0' + 'bloomreach-buddy'
  // This makes the key machine-bound (stolen files can't be decrypted elsewhere)
  return createHash('sha256')
    .update(hostname())
    .update('\0')
    .update(userInfo().username)
    .update('\0')
    .update(profileName)
    .update('\0')
    .update('bloomreach-buddy')
    .digest();
}

// ---------------------------------------------------------------------------
// Session path helpers
// ---------------------------------------------------------------------------

export function getSessionFilePath(profilesDir: string, profileName: string): string {
  return path.join(profilesDir, profileName, '.session.enc.json');
}

function buildMetadata(
  profileName: string,
  loginUrl: string,
  cookies: BloomreachCookie[],
): SessionMetadata {
  const persistentExpiries = cookies.filter((cookie) => cookie.expires > 0).map((cookie) => cookie.expires);
  const earliestCookieExpiry =
    persistentExpiries.length > 0
      ? new Date(Math.min(...persistentExpiries) * 1000).toISOString()
      : null;

  return {
    capturedAt: new Date().toISOString(),
    profileName,
    loginUrl,
    cookieCount: cookies.length,
    earliestCookieExpiry,
  };
}

// ---------------------------------------------------------------------------
// Save / Load
// ---------------------------------------------------------------------------

export async function saveSession(
  profilesDir: string,
  profileName: string,
  storageState: BloomreachStorageState,
  loginUrl: string,
): Promise<string> {
  const metadata = buildMetadata(profileName, loginUrl, storageState.cookies);
  const storedSession: StoredSession = {
    schemaVersion: 1,
    metadata,
    storageState,
  };

  const key = deriveEncryptionKey(profileName);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const plaintext = Buffer.from(JSON.stringify(storedSession), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    metadata,
  };

  const filePath = getSessionFilePath(profilesDir, profileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(envelope, null, 2) + '\n', 'utf8');
  await chmod(filePath, 0o600);

  return filePath;
}

export async function loadSession(
  profilesDir: string,
  profileName: string,
): Promise<StoredSession | null> {
  const filePath = getSessionFilePath(profilesDir, profileName);

  try {
    const content = await readFile(filePath, 'utf8');
    const envelope = JSON.parse(content) as EncryptedEnvelope;

    const key = deriveEncryptionKey(profileName);
    const iv = Buffer.from(envelope.iv, 'base64url');
    const tag = Buffer.from(envelope.tag, 'base64url');
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64url');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted) as StoredSession;
  } catch {
    return null;
  }
}
/**
 * Delete the stored session for a profile.
 * @returns `true` if a session file existed and was removed, `false` if no session was stored.
 */
export async function deleteSession(
  profilesDir: string,
  profileName: string,
): Promise<boolean> {
  const filePath = getSessionFilePath(profilesDir, profileName);
  try {
    await unlink(filePath);
    return true;
  } catch (error: unknown) {
    // ENOENT = file doesn't exist — that's fine, return false
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Session analysis
// ---------------------------------------------------------------------------

export function isSessionExpired(session: StoredSession): boolean {
  // Check if ALL non-session cookies have expired
  // Session cookies (expires === -1) are considered valid
  // If there are no cookies at all, return true
  const now = Date.now() / 1000; // epoch seconds
  const persistentCookies = session.storageState.cookies.filter((c) => c.expires > 0);
  if (persistentCookies.length === 0 && session.storageState.cookies.length === 0) return true;
  if (persistentCookies.length === 0) return false; // only session cookies
  return persistentCookies.every((c) => c.expires < now);
}

export function summarizeSessionCookies(
  cookies: BloomreachCookie[],
): Array<{ name: string; domain: string; expiresAt: string | null }> {
  return cookies.map((c) => ({
    name: c.name,
    domain: c.domain,
    expiresAt: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : null,
  }));
}
