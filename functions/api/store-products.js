const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const CACHE_TTL_SECONDS = 15;
const CACHE_STALE_SECONDS = 45;
const MAX_LIMIT = 48;
const MAX_OFFSET = 100000;
const SORTS = new Set(['pop', 'price_asc', 'price_desc', 'rating', 'new']);
const inFlight = new Map();

export async function onRequest(context) {
  const { request, env } = context;
  const marker = { 'x-ecomme-store-api': '1' };
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { ...marker, Allow: 'GET', 'cache-control': 'no-store' });

  const url = new URL(request.url);
  const storeId = String(url.searchParams.get('store_id') || '').trim().slice(0, 128);
  if (!storeId) return jsonResponse({ error: 'Identificador da loja não informado.' }, 400, { ...marker, 'cache-control': 'no-store' });

  const query = normalizeText(url.searchParams.get('q'), 100);
  const sortInput = String(url.searchParams.get('sort') || 'pop').toLowerCase();
  const sort = SORTS.has(sortInput) ? sortInput : 'pop';
  const parsedOffset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(parsedOffset) ? Math.min(Math.max(parsedOffset, 0), MAX_OFFSET) : 0;
  const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '24', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT) : 24;
  const includeSummary = url.searchParams.get('include_summary') === '1' && offset === 0;

  const keyParams = new URLSearchParams({ v: '1', store_id: storeId, sort, offset: String(offset), limit: String(limit) });
  if (query) keyParams.set('q', query.toLocaleLowerCase('pt-BR'));
  if (includeSummary) keyParams.set('include_summary', '1');
  const cacheUrl = new URL('/api/store-products', url.origin);
  cacheUrl.search = keyParams.toString();
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const edgeCache = globalThis.caches?.default;

  if (edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('x-ecomme-store-cache', 'HIT');
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
    } catch (error) {
      console.warn('[Ecomme Store Edge] Cache indisponível; consultando Supabase.', error);
    }
  }

  const { response: sharedResponse, coalesced } = await coalesceResponse(cacheUrl.href, async () => {
    const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
    const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
    if (!publishableKey) return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada no Cloudflare Pages.' }, 503, { ...marker, 'cache-control': 'no-store' });

    let upstream;
    try {
      upstream = await fetch(new URL('/rest/v1/rpc/ecomme_store_products_page', supabaseUrl), {
        method: 'POST',
        headers: { apikey: publishableKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          p_store_id: storeId,
          p_search: query || null,
          p_sort: sort,
          p_offset: offset,
          p_limit: limit,
          p_include_summary: includeSummary
        })
      });
    } catch (error) {
      console.error('[Ecomme Store Edge] Falha ao consultar Supabase:', error);
      return jsonResponse({ error: 'Não foi possível consultar os produtos desta loja.' }, 502, { ...marker, 'cache-control': 'no-store' });
    }

    const body = await upstream.text();
    if (!upstream.ok) {
      return jsonResponse({ error: 'Falha ao consultar os produtos desta loja.', detail: body.slice(0, 600) }, upstream.status, { ...marker, 'cache-control': 'no-store' });
    }

    let payload;
    try { payload = JSON.parse(body); }
    catch { return jsonResponse({ error: 'Resposta inválida ao consultar os produtos da loja.' }, 502, { ...marker, 'cache-control': 'no-store' }); }
    const response = jsonResponse({
      data: Array.isArray(payload?.data) ? payload.data : [],
      count: Math.max(0, Number(payload?.count) || 0),
      has_more: Boolean(payload?.has_more),
      summary: payload?.summary || null,
      top_rated: Array.isArray(payload?.top_rated) ? payload.top_rated : null,
      categories: Array.isArray(payload?.categories) ? payload.categories : null
    }, 200, {
      ...marker,
      'cache-control': `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
      'x-ecomme-store-cache': 'MISS'
    });

    if (edgeCache) {
      const cacheWrite = edgeCache.put(cacheKey, response.clone()).catch(error => console.warn('[Ecomme Store Edge] Não foi possível salvar cache:', error));
      if (context.waitUntil) context.waitUntil(cacheWrite);
      else await cacheWrite;
    }
    return response;
  });

  const headers = new Headers(sharedResponse.headers);
  if (coalesced) headers.set('x-ecomme-store-cache', 'COALESCED');
  return new Response(sharedResponse.body, { status: sharedResponse.status, statusText: sharedResponse.statusText, headers });
}

async function coalesceResponse(key, task) {
  const current = inFlight.get(key);
  if (current) return { response: (await current).clone(), coalesced: true };
  const pending = Promise.resolve().then(task);
  inFlight.set(key, pending);
  try { return { response: (await pending).clone(), coalesced: false }; }
  finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
}
function normalizeText(value, maxLength) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}
