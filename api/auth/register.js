import { ensureSchema, getSql } from '../../lib/db.js';
import { createSession, hashPassword } from '../../lib/auth.js';
import { errorResponse, json, methodNotAllowed, readJson } from '../../lib/http.js';

const USERNAME_RULE = /^[A-Za-z0-9_]{3,20}$/;

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);

    try {
      const body = await readJson(request, 4096);
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      const passwordLength = Array.from(password).length;

      if (!USERNAME_RULE.test(username)) {
        return json({ error: 'O nome deve ter 3 a 20 caracteres: letras, números ou _. ' }, 400);
      }
      if (passwordLength < 8 || passwordLength > 128) {
        return json({ error: 'A senha deve ter de 8 a 128 caracteres.' }, 400);
      }

      const sql = getSql();
      await ensureSchema(sql);
      const credentials = await hashPassword(password);

      let users;
      try {
        users = await sql`INSERT INTO newfire_users
          (username, username_key, password_salt, password_hash)
          VALUES (${username}, ${username.toLowerCase()}, ${credentials.salt}, ${credentials.hash})
          RETURNING id, username`;
      } catch (error) {
        if (error?.code === '23505') {
          return json({ error: 'Esse nome de usuário já está em uso.' }, 409);
        }
        throw error;
      }

      const user = users[0];
      const cookie = await createSession(sql, user.id, request);
      return json({ user: { username: user.username } }, 201, { 'set-cookie': cookie });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
