const pendingResponses = new Map();

export async function coalesceEdgeResponse(key, task) {
  const active = pendingResponses.get(key);
  if (active) return { response: (await active).clone(), coalesced: true };
  const pending = Promise.resolve().then(task);
  pendingResponses.set(key, pending);
  try {
    const response = await pending;
    return { response: response.clone(), coalesced: false };
  } finally {
    if (pendingResponses.get(key) === pending) pendingResponses.delete(key);
  }
}

export async function addResponseEtag(response) {
  const body = await response.clone().arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', body);
  const etag = `"${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}"`;
  const headers = new Headers(response.headers);
  headers.set('etag', etag);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function applyConditionalGet(request, response) {
  const etag = response.headers.get('etag');
  const candidates = request.headers.get('if-none-match');
  if (!etag || !candidates) return response;
  const matches = candidates.split(',').some(value => {
    const candidate = value.trim();
    return candidate === '*' || candidate === etag || candidate.replace(/^W\//, '') === etag;
  });
  if (!matches) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(null, { status: 304, headers });
}
