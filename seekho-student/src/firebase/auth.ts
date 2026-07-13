import * as Crypto from 'expo-crypto';
import { ref, get, set } from 'firebase/database';
import { db, firebaseEnabled } from './config';
import { createSession, roomExists, setStudentIdentity } from './session';

/**
 * Minimal username/password accounts stored in RTDB under `accounts/{id}`.
 *
 * Passwords are never stored in the clear: we keep a SHA-256 hash of
 * `salt + password` plus the per-account random salt. On first login a new
 * account is created; returning users must enter the matching password.
 *
 * NOTE: the RTDB rules for this prototype are open, so the hashes are readable.
 * SHA-256+salt is a reasonable step up from plaintext for a research kiosk, but
 * it is NOT a substitute for real auth — to harden, move accounts behind
 * Firebase Authentication (email/password) and lock the DB rules.
 */

export interface AuthResult {
  ok: boolean;
  error?: string;
  roomCode?: string;
  studentName?: string;
  isNew?: boolean;
}

interface AccountRecord {
  passwordHash: string;
  salt: string;
  name: string;
  createdAt: number;
}

/** Stable, RTDB-safe id derived from the username (also used as the session id). */
export function deriveAccountId(username: string): string {
  const slug = username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `u-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Friendly display name from a username, e.g. "aisha_khan" → "Aisha Khan". */
export function nameFromUsername(username: string): string {
  const words = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (!words.length) return username.trim();
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function hashPassword(salt: string, password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

const accountRef = (id: string) => ref(db, `accounts/${id}`);

/**
 * Authenticate (or, for a new username, sign up). Returns the session room code
 * and derived display name on success, or a human-readable error on failure.
 */
export async function authenticate(usernameRaw: string, passwordRaw: string): Promise<AuthResult> {
  const username = usernameRaw.trim();
  const password = passwordRaw;
  if (!username) return { ok: false, error: 'Please enter a username.' };
  if (!password.trim()) return { ok: false, error: 'Please enter a password.' };

  const id = deriveAccountId(username);
  const studentName = nameFromUsername(username);

  // Demo mode (no Firebase): accept anything so the app is still usable offline.
  if (!firebaseEnabled) return { ok: true, roomCode: id, studentName, isNew: true };

  try {
    const snap = await get(accountRef(id));

    if (!snap.exists()) {
      // First time this username is used → create the account (sign up).
      const salt = Crypto.randomUUID();
      const passwordHash = await hashPassword(salt, password);
      const record: AccountRecord = { passwordHash, salt, name: studentName, createdAt: Date.now() };
      await set(accountRef(id), record);
      if (!(await roomExists(id))) await createSession(id);
      await setStudentIdentity(id, studentName);
      return { ok: true, roomCode: id, studentName, isNew: true };
    }

    // Returning user → verify the password against the stored salted hash.
    const record = snap.val() as AccountRecord;
    const attempt = await hashPassword(record.salt, password);
    if (attempt !== record.passwordHash) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    // Correct password: make sure the session exists and the name is fresh.
    if (!(await roomExists(id))) await createSession(id);
    await setStudentIdentity(id, record.name || studentName);
    return { ok: true, roomCode: id, studentName: record.name || studentName, isNew: false };
  } catch (e) {
    console.log('[auth] authenticate failed', e);
    return { ok: false, error: 'Could not sign in. Please try again.' };
  }
}
