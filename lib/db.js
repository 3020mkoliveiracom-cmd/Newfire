import { neon } from '@neondatabase/serverless';

let schemaPromise;

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || '';
}

export function getSql() {
  const url = databaseUrl();
  if (!url) {
    const error = new Error('DATABASE_NOT_CONFIGURED');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return neon(url);
}

export async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS newfire_users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        username_key TEXT NOT NULL UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;

      await sql`CREATE TABLE IF NOT EXISTS newfire_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES newfire_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;

      await sql`CREATE INDEX IF NOT EXISTS newfire_sessions_user_id_idx
        ON newfire_sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS newfire_sessions_expires_at_idx
        ON newfire_sessions(expires_at)`;

      await sql`CREATE TABLE IF NOT EXISTS newfire_saves (
        user_id BIGINT PRIMARY KEY REFERENCES newfire_users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    })();
  }

  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = undefined;
    throw error;
  }
}
