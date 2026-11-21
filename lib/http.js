export function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

export function methodNotAllowed(allowed) {
  return json({ error: 'Método não permitido.' }, 405, { allow: allowed.join(', ') });
}

export async function readJson(request, maxBytes = 8192) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    const error = new Error('REQUEST_TOO_LARGE');
    error.code = 'REQUEST_TOO_LARGE';
    throw error;
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    const error = new Error('REQUEST_TOO_LARGE');
    error.code = 'REQUEST_TOO_LARGE';
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('BAD_JSON');
    error.code = 'BAD_JSON';
    throw error;
  }
}

export function errorResponse(error) {
  if (error?.code === 'DATABASE_NOT_CONFIGURED') {
    return json({ error: 'O banco de dados ainda não está conectado ao projeto.' }, 503);
  }
  if (error?.code === 'BAD_JSON') {
    return json({ error: 'A solicitação não contém JSON válido.' }, 400);
  }
  if (error?.code === 'REQUEST_TOO_LARGE') {
    return json({ error: 'A solicitação é muito grande.' }, 413);
  }

  // Não registrar corpos de requisição, nomes de usuário, senhas ou connection strings.
  console.error('[newfire-api] Erro interno', {
    name: error?.name || 'Error',
    code: error?.code || 'UNHANDLED',
  });
  return json({ error: 'Não foi possível concluir a solicitação. Tente novamente.' }, 500);
}
