import { ensureSchema, getSql } from '../../lib/db.js';
import { clearSessionCookie, getSessionUser } from '../../lib/auth.js';
import { errorResponse, json, methodNotAllowed } from '../../lib/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);

    try {
      const sql = getSql();
      await ensureSchema(sql);
      const user = await getSessionUser(sql, request);
      if (!user) {
        return json({ user: null }, 401, { 'set-cookie': clearSessionCookie(request) });
      }
      return json({ user: { username: user.username } });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
