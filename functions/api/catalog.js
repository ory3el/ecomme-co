import { coalesceEdgeResponse } from '../_shared/edge-cache.js';

const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const CACHE_TTL_SECONDS = 20;
const CACHE_STALE_SECONDS = 60;
const MARKETPLACE_MODES = new Set(['categories', 'offers']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { Allow: 'GET' });

  const url = new URL(request.url);
  const modeInput = String(url.searchParams.get('mode') || 'products').toLowerCase();
  const mode = MARKETPLACE_MODES.has(modeInput) ? modeInput : 'products';
  const sortInput = String(url.searchParams.get('sort') || (mode === 'offers' ? 'discount' : 'random')).toLowerCase();
  const allowedSorts = mode === 'offers'
    ? new Set(['random', 'price_asc', 'price_desc', 'rating', 'discount'])
    : new Set(['random', 'price_asc', 'price_desc', 'rating', 'discount', 'popular', 'new']);
  const sort = allowedSorts.has(sortInput) ? sortInput : (mode === 'offers' ? 'discount' : 'random');
  const search = normalizeText(url.searchParams.get('search'), 120);
  const category = normalizeText(url.searchParams.get('category'), 80);
  const tag = normalizeText(url.searchParams.get('tag'), 32).toLowerCase();
  const color = normalizeText(url.searchParams.get('colors'), 180);
  const minPrice = parseOptionalNumber(url.searchParams.get('min_price'));
  const maxPrice = parseOptionalNumber(url.searchParams.get('max_price'));
  const minRating = parseOptionalNumber(url.searchParams.get('min_rating'));
  const cursorValue = readBounded(url.searchParams.get('cursor_value'), 128);
  const cursorId = readBounded(url.searchParams.get('cursor_id'), 128);
  const seed = String(url.searchParams.get('seed') || '').slice(0, 80);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '25', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 25) : 25;

  const cacheParams = new URLSearchParams({ v: mode === 'products' ? '2' : '1', mode, sort, limit: String(limit) });
  if (search) cacheParams.set('search', search.toLocaleLowerCase('pt-BR'));
  if (category) cacheParams.set('category', category.toLocaleLowerCase('pt-BR'));
  if (tag) cacheParams.set('tag', tag);
  if (color) cacheParams.set('colors', color.toLocaleLowerCase('pt-BR'));
  if (minPrice !== null) cacheParams.set('min_price', String(minPrice));
  if (maxPrice !== null) cacheParams.set('max_price', String(maxPrice));
  if (minRating !== null) cacheParams.set('min_rating', String(minRating));
  if (cursorValue !== null) cacheParams.set('cursor_value', cursorValue);
  if (cursorId !== null) cacheParams.set('cursor_id', cursorId);
  if (seed) cacheParams.set('seed', seed);

  const cacheKeyUrl = new URL('/api/catalog', url.origin);
  cacheKeyUrl.search = cacheParams.toString();
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });
  const edgeCache = globalThis.caches?.default;

  if (edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('x-ecomme-catalog-cache', 'HIT');
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
    } catch (error) {
      console.warn('[Ecomme Catalog Edge] Cache indisponível; consultando Supabase.', error);
    }
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada no Cloudflare Pages.' }, 503, { 'cache-control': 'no-store' });

  const useMarketplaceRpc = mode !== 'products';
  const rpcName = useMarketplaceRpc ? 'ecomme_marketplace_catalog_page' : 'ecomme_catalog_products_page';
  const rpcUrl = new URL(`/rest/v1/rpc/${rpcName}`, supabaseUrl);
  const rpcBody = useMarketplaceRpc ? {
    p_mode: mode,
    p_search: search || null,
    p_sort: sort,
    p_cursor_value: cursorValue,
    p_cursor_id: cursorId,
    p_limit: limit,
    p_seed: seed,
    p_category: category || null,
    p_tag: tag || null,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_min_rating: minRating,
    p_colors: color || null
  } : {
    p_search: search || null,
    p_sort: sort,
    p_cursor_value: cursorValue,
    p_cursor_id: cursorId,
    p_limit: limit,
    p_seed: seed
  };

  // Agrupa cache misses idênticos no mesmo isolate, evitando rajadas duplicadas no Supabase.
  const { response: sharedResponse, coalesced } = await coalesceEdgeResponse(`catalog:${cacheKeyUrl.href}`, async () => {
    let upstream;
    try {
      upstream = await fetch(rpcUrl.toString(), {
        method: 'POST',
        headers: { apikey: publishableKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(rpcBody)
      });
    } catch (error) {
      console.error('[Ecomme Catalog Edge] Falha ao consultar Supabase:', error);
      return jsonResponse({ error: 'Não foi possível consultar o catálogo.' }, 502, { 'cache-control': 'no-store' });
    }

    const body = await upstream.text();
    if (!upstream.ok) return new Response(body || JSON.stringify({ error: 'Falha ao consultar o catálogo.' }), {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });

    const response = new Response(body, { status: 200, headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
      'x-ecomme-catalog-cache': 'MISS',
      'x-ecomme-catalog-mode': mode
    }});
    if (edgeCache) {
      const cacheWrite = edgeCache.put(cacheKey, response.clone()).catch(error => console.warn('[Ecomme Catalog Edge] Não foi possível salvar cache:', error));
      if (context.waitUntil) context.waitUntil(cacheWrite);
      else await cacheWrite;
    }
    return response;
  });

  const headers = new Headers(sharedResponse.headers);
  if (coalesced) headers.set('x-ecomme-catalog-cache', 'COALESCED');
  return new Response(sharedResponse.body, { status: sharedResponse.status, statusText: sharedResponse.statusText, headers });
}

function normalizeText(value, maxLength) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
function parseOptionalNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function readBounded(value, maxLength) {
  if (value == null || value === '') return null;
  const normalized = String(value).slice(0, maxLength);
  return normalized.length ? normalized : null;
}
function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}
