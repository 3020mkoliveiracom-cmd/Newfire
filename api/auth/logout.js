import { ensureSchema, getSql, databaseUrl } from '../../lib/db.js';
import { clearSessionCookie, revokeSession } from '../../lib/auth.js';
import { errorResponse, json, methodNotAllowed } from '../../lib/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);

    try {
      if (databaseUrl()) {
        const sql = getSql();
        await ensureSchema(sql);
        await revokeSession(sql, request);
      }
      return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
