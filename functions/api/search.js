import { coalesceEdgeResponse, addResponseEtag, applyConditionalGet } from '../_shared/edge-cache.js';

const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const SEARCH_CACHE_TTL_SECONDS = 15;
const SEARCH_CACHE_STALE_SECONDS = 45;
const MAX_LIMIT = 48;
const MAX_PAGE = 1000;
const SORTS = {
  rel: 'id.asc',
  asc: 'price.asc,id.asc',
  desc: 'price.desc,id.asc',
  rat: 'rating.desc,id.asc',
  disc: 'discount.desc,id.asc',
  pop: 'reviews.desc,id.asc',
  new: 'created_at.desc,id.desc',
  name: 'name.asc,id.asc'
};

export async function onRequest(context) {
  const { request, env } = context;
  const marker = { 'x-ecomme-search-api': '1' };
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, { ...marker, Allow: 'GET', 'cache-control': 'no-store' });
  }

  const url = new URL(request.url);
  const query = normalizeSearch(url.searchParams.get('q') || url.searchParams.get('search'));
  const sortInput = String(url.searchParams.get('sort') || 'rel').toLowerCase();
  const sort = Object.hasOwn(SORTS, sortInput) ? sortInput : 'rel';
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), MAX_PAGE) : 1;
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '12', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT) : 12;
  const categoryModeInput = String(url.searchParams.get('category_mode') || '').toLowerCase();
  const categoryMode = ['contains', 'ilike'].includes(categoryModeInput) ? categoryModeInput : '';
  const nameOnly = url.searchParams.get('name_only') === '1';
  const offset = (page - 1) * limit;

  const cacheParams = new URLSearchParams({ v: '1', q: query.toLocaleLowerCase('pt-BR'), sort, page: String(page), limit: String(limit) });
  if (categoryMode) cacheParams.set('category_mode', categoryMode);
  if (nameOnly) cacheParams.set('name_only', '1');
  const cacheKeyUrl = new URL('/api/search', url.origin);
  cacheKeyUrl.search = cacheParams.toString();
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });
  const edgeCache = globalThis.caches?.default;

  if (edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('x-ecomme-search-cache', 'HIT');
        return applyConditionalGet(request, new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers }));
      }
    } catch (error) {
      console.warn('[Ecomme Search Edge] Cache indisponível; consultando Supabase.', error);
    }
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) {
    return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada no Cloudflare Pages.' }, 503, {
      ...marker, 'cache-control': 'no-store'
    });
  }

  const restUrl = new URL('/rest/v1/products', supabaseUrl);
  restUrl.searchParams.set('select', '*');
  restUrl.searchParams.set('order', SORTS[nameOnly ? 'name' : sort]);

  if (query) {
    const pattern = `%${query}%`;
    if (nameOnly) {
      restUrl.searchParams.set('name', `ilike.${pattern}`);
    } else if (categoryMode === 'contains') {
      restUrl.searchParams.set('cat', `cs.{"${escapeArrayValue(query)}"}`);
    } else if (categoryMode === 'ilike') {
      restUrl.searchParams.set('cat', `ilike.${pattern}`);
    } else {
      restUrl.searchParams.set('or', `(name.ilike.${pattern},desc.ilike.${pattern})`);
    }
  }

  const { response: sharedResponse, coalesced } = await coalesceEdgeResponse(`search:${cacheKeyUrl.href}`, async () => {
    let upstream;
    try {
      upstream = await fetch(restUrl.toString(), {
        method: 'GET',
        headers: {
          apikey: publishableKey,
          accept: 'application/json',
          prefer: 'count=exact',
          'range-unit': 'items',
          range: `${offset}-${offset + limit - 1}`
        }
      });
    } catch (error) {
      console.error('[Ecomme Search Edge] Falha ao consultar Supabase:', error);
      return jsonResponse({ error: 'Não foi possível consultar a busca.' }, 502, { ...marker, 'cache-control': 'no-store' });
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      return jsonResponse({ error: 'Falha ao consultar a busca.', detail }, upstream.status, {
        ...marker,
        'cache-control': 'no-store'
      });
    }

    let rows;
    try {
      rows = await upstream.json();
      if (!Array.isArray(rows)) rows = [];
    } catch {
      rows = [];
    }

    const contentRange = upstream.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+|\*)$/);
    const count = totalMatch && totalMatch[1] !== '*' ? Number(totalMatch[1]) : rows.length;
    const response = await addResponseEtag(jsonResponse({ data: rows, count }, 200, {
      ...marker,
      'cache-control': `public, max-age=0, s-maxage=${SEARCH_CACHE_TTL_SECONDS}, stale-while-revalidate=${SEARCH_CACHE_STALE_SECONDS}`,
      'x-ecomme-search-cache': 'MISS'
    }));

    if (edgeCache) {
      const cacheWrite = edgeCache.put(cacheKey, response.clone()).catch(error => console.warn('[Ecomme Search Edge] Não foi possível salvar cache:', error));
      if (context.waitUntil) context.waitUntil(cacheWrite);
      else await cacheWrite;
    }
    return response;
  });

  const headers = new Headers(sharedResponse.headers);
  headers.set('x-ecomme-search-cache', coalesced ? 'COALESCED' : 'MISS');
  return applyConditionalGet(request, new Response(sharedResponse.body, {
    status: sharedResponse.status,
    statusText: sharedResponse.statusText,
    headers
  }));
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFC').trim().replace(/[(),%_*\\'"`]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
}
function escapeArrayValue(value) {
  return String(value || '').replace(/[{},"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}
function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}
