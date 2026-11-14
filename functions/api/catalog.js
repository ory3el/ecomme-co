const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const CACHE_TTL_SECONDS = 20;
const CACHE_STALE_SECONDS = 60;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, { Allow: 'GET' });
  }

  const url = new URL(request.url);
  const sortInput = String(url.searchParams.get('sort') || 'random').toLowerCase();
  const allowedSorts = new Set(['random', 'price_asc', 'price_desc', 'rating', 'discount']);
  const sort = allowedSorts.has(sortInput) ? sortInput : 'random';
  const search = String(url.searchParams.get('search') || '').normalize('NFC').trim().replace(/\s+/g, ' ').slice(0, 120);
  const cacheSearch = search.toLocaleLowerCase('pt-BR');
  const cursorValue = readBounded(url.searchParams.get('cursor_value'), 128);
  const cursorId = readBounded(url.searchParams.get('cursor_id'), 128);
  const seed = String(url.searchParams.get('seed') || '').slice(0, 80);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '25', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 25) : 25;

  const params = new URLSearchParams();
  params.set('v', '1');
  if (cacheSearch) params.set('search', cacheSearch);
  params.set('sort', sort);
  if (cursorValue !== null) params.set('cursor_value', cursorValue);
  if (cursorId !== null) params.set('cursor_id', cursorId);
  params.set('limit', String(limit));
  if (seed) params.set('seed', seed);

  const cacheKeyUrl = new URL('/api/catalog', url.origin);
  cacheKeyUrl.search = params.toString();
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });
  const edgeCache = globalThis.caches?.default;

  if (edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('x-ecomme-catalog-cache', 'HIT');
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers
        });
      }
    } catch (error) {
      console.warn('[Ecomme Catalog Edge] Cache indisponível; consultando Supabase.', error);
    }
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) {
    return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada no Cloudflare Pages.' }, 503, {
      'cache-control': 'no-store'
    });
  }

  const rpcUrl = new URL('/rest/v1/rpc/ecomme_catalog_products_page', supabaseUrl);
  let upstream;
  try {
    upstream = await fetch(rpcUrl.toString(), {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        p_search: search || null,
        p_sort: sort,
        p_cursor_value: cursorValue,
        p_cursor_id: cursorId,
        p_limit: limit,
        p_seed: seed
      })
    });
  } catch (error) {
    console.error('[Ecomme Catalog Edge] Falha ao consultar Supabase:', error);
    return jsonResponse({ error: 'Não foi possível consultar o catálogo.' }, 502, { 'cache-control': 'no-store' });
  }

  const body = await upstream.text();
  if (!upstream.ok) {
    return new Response(body || JSON.stringify({ error: 'Falha ao consultar o catálogo.' }), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
    'x-ecomme-catalog-cache': 'MISS'
  });
  const response = new Response(body, { status: 200, headers });

  if (edgeCache && context.waitUntil) {
    context.waitUntil(edgeCache.put(cacheKey, response.clone()).catch(error => {
      console.warn('[Ecomme Catalog Edge] Não foi possível salvar cache:', error);
    }));
  }
  return response;
}

function readBounded(value, maxLength) {
  if (value == null || value === '') return null;
  const normalized = String(value).slice(0, maxLength);
  return normalized.length ? normalized : null;
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}
