import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'newfire_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_BYTES = 64;
const DUMMY_SALT = Buffer.alloc(16, 0x5a);

async function derivePassword(password, salt) {
  return Buffer.from(await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS));
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return {
    salt: salt.toString('base64url'),
    hash: hash.toString('base64url'),
  };
}

export async function verifyPassword(password, saltText, hashText) {
  let salt;
  let expected;
  try {
    salt = saltText ? Buffer.from(saltText, 'base64url') : null;
    expected = hashText ? Buffer.from(hashText, 'base64url') : null;
  } catch {
    salt = null;
    expected = null;
  }

  if (!salt || salt.length !== 16 || !expected || expected.length !== PASSWORD_BYTES) {
    const dummy = await derivePassword(password, DUMMY_SALT);
    timingSafeEqual(dummy, Buffer.alloc(PASSWORD_BYTES));
    return false;
  }

  const actual = await derivePassword(password, salt);
  return timingSafeEqual(actual, expected);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === SESSION_COOKIE) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

function secureCookieFlag(request) {
  try {
    return new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  } catch {
    return '; Secure';
  }
}

function cookieSameSite(request) {
  return new URL(request.url).protocol === 'https:' ? 'None' : 'Lax';
}

export function clearSessionCookie(request) {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=${cookieSameSite(request)}${secureCookieFlag(request) ? '; Secure' : ''}`;
}

export async function createSession(sql, userId, request) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();

  await sql`DELETE FROM newfire_sessions WHERE expires_at <= NOW()`;
  await sql`INSERT INTO newfire_sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash(token)}, ${userId}, ${expiresAt})`;

  const cookie = `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=${cookieSameSite(request)}${secureCookieFlag(request) ? '; Secure' : ''}`;
  return cookie;
}

export async function getSessionUser(sql, request) {
  const token = readSessionToken(request);
  if (!token || token.length > 100) return null;

  const rows = await sql`SELECT u.id, u.username
    FROM newfire_sessions s
    JOIN newfire_users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash(token)}
      AND s.expires_at > NOW()
    LIMIT 1`;

  return rows[0] || null;
}

export async function revokeSession(sql, request) {
  const token = readSessionToken(request);
  if (!token || token.length > 100) return;
  await sql`DELETE FROM newfire_sessions WHERE token_hash = ${tokenHash(token)}`;
}
