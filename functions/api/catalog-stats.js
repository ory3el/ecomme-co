const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const CACHE_TTL_SECONDS = 60;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { Allow: 'GET' });
  const url = new URL(request.url);
  const type = String(url.searchParams.get('type') || '').toLowerCase();
  const rpc = type === 'categories' ? 'ecomme_category_product_counts' : type === 'offers' ? 'ecomme_offers_catalog_stats' : null;
  if (!rpc) return jsonResponse({ error: 'Tipo de estatística inválido.' }, 400);

  const key = new Request(new URL(`/api/catalog-stats?type=${type}`, url.origin), { method: 'GET' });
  const cache = globalThis.caches?.default;
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set('x-ecomme-stats-cache', 'HIT');
        return new Response(hit.body, { status: hit.status, headers });
      }
    } catch (error) { console.warn('[Ecomme catalog stats] Cache indisponível:', error); }
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const keyValue = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!keyValue) return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada.' }, 503, { 'cache-control': 'no-store' });

  let upstream;
  try {
    upstream = await fetch(new URL(`/rest/v1/rpc/${rpc}`, supabaseUrl), {
      method: 'POST',
      headers: { apikey: keyValue, 'content-type': 'application/json', accept: 'application/json' },
      body: '{}'
    });
  } catch (error) {
    console.error('[Ecomme catalog stats] Falha no Supabase:', error);
    return jsonResponse({ error: 'Não foi possível carregar as estatísticas.' }, 502, { 'cache-control': 'no-store' });
  }
  const body = await upstream.text();
  if (!upstream.ok) return new Response(body || '{}', { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const response = new Response(body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=120`, 'x-ecomme-stats-cache': 'MISS' } });
  if (cache) {
    const cacheWrite = cache.put(key, response.clone()).catch(error => console.warn('[Ecomme catalog stats] Não foi possível salvar cache:', error));
    if (context.waitUntil) context.waitUntil(cacheWrite);
    else await cacheWrite;
  }
  return response;
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}
