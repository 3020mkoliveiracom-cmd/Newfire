import { ensureSchema, getSql } from '../lib/db.js';
import { getSessionUser } from '../lib/auth.js';
import { errorResponse, json, methodNotAllowed, readJson } from '../lib/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'PUT') {
      return methodNotAllowed(['GET', 'PUT']);
    }

    try {
      const sql = getSql();
      await ensureSchema(sql);
      const user = await getSessionUser(sql, request);
      if (!user) return json({ error: 'Faça login para acessar o progresso.' }, 401);

      if (request.method === 'GET') {
        const rows = await sql`SELECT data, updated_at
          FROM newfire_saves
          WHERE user_id = ${user.id}
          LIMIT 1`;
        return json({ data: rows[0]?.data ?? null, updatedAt: rows[0]?.updated_at ?? null });
      }

      const data = await readJson(request, 256 * 1024);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return json({ error: 'Formato de progresso inválido.' }, 400);
      }
      const serialized = JSON.stringify(data);
      if (new TextEncoder().encode(serialized).byteLength > 256 * 1024) {
        return json({ error: 'O progresso salvo é muito grande.' }, 413);
      }

      await sql`INSERT INTO newfire_saves (user_id, data, updated_at)
        VALUES (${user.id}, ${serialized}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;

      return json({ ok: true, updatedAt: new Date().toISOString() });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
