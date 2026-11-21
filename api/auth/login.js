import { ensureSchema, getSql } from '../../lib/db.js';
import { createSession, verifyPassword } from '../../lib/auth.js';
import { errorResponse, json, methodNotAllowed, readJson } from '../../lib/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);

    try {
      const body = await readJson(request, 4096);
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!username || !password || Array.from(password).length > 128) {
        return json({ error: 'Nome de usuário ou senha incorretos.' }, 401);
      }

      const sql = getSql();
      await ensureSchema(sql);
      const rows = await sql`SELECT id, username, password_salt, password_hash
        FROM newfire_users
        WHERE username_key = ${username.toLowerCase()}
        LIMIT 1`;
      const user = rows[0];
      const valid = await verifyPassword(
        password,
        user?.password_salt,
        user?.password_hash,
      );

      if (!user || !valid) {
        return json({ error: 'Nome de usuário ou senha incorretos.' }, 401);
      }

      const cookie = await createSession(sql, user.id, request);
      return json({ user: { username: user.username } }, 200, { 'set-cookie': cookie });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
