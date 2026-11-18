import { coalesceEdgeResponse, addResponseEtag, applyConditionalGet } from '../_shared/edge-cache.js';

const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const CACHE_TTL_SECONDS = 15;
const CACHE_STALE_SECONDS = 45;
const MAX_LIMIT = 48;
const MAX_PAGE = 1000;
const SORTS = new Set(['rel', 'asc', 'desc', 'rat', 'disc', 'pop', 'new']);

export async function onRequest(context) {
  const { request, env } = context;
  const marker = { 'x-ecomme-search-api': '1' };
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, { ...marker, Allow: 'GET', 'cache-control': 'no-store' });
  }

  const url = new URL(request.url);
  const query = normalizeText(url.searchParams.get('q') || url.searchParams.get('search'), 100);
  const sortInput = String(url.searchParams.get('sort') || 'rel').toLowerCase();
  const sort = SORTS.has(sortInput) ? sortInput : 'rel';
  const page = clampInteger(url.searchParams.get('page'), 1, MAX_PAGE, 1);
  const limit = clampInteger(url.searchParams.get('limit'), 1, MAX_LIMIT, 12);
  const category = normalizeText(url.searchParams.get('category'), 100);
  let minPrice = parseOptionalNumber(url.searchParams.get('min_price'));
  let maxPrice = parseOptionalNumber(url.searchParams.get('max_price'));
  if (minPrice !== null && minPrice < 0) minPrice = null;
  if (maxPrice !== null && maxPrice < 0) maxPrice = null;
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const ratingInput = parseOptionalNumber(url.searchParams.get('min_rating'));
  const minRating = ratingInput !== null && ratingInput >= 1 && ratingInput <= 5 ? ratingInput : null;
  const brands = [...new Set(url.searchParams.getAll('brand').map(value => normalizeText(value, 80)).filter(Boolean))].slice(0, 20);
  const freeShipping = url.searchParams.get('free_shipping') === '1';
  const discountOnly = url.searchParams.get('discount_only') === '1';

  const cacheParams = new URLSearchParams({
    v: '4', q: query.toLocaleLowerCase('pt-BR'), sort, page: String(page), limit: String(limit),
    category: category.toLocaleLowerCase('pt-BR'), min_price: minPrice === null ? '' : String(minPrice),
    max_price: maxPrice === null ? '' : String(maxPrice), min_rating: minRating === null ? '' : String(minRating),
    free_shipping: freeShipping ? '1' : '0', discount_only: discountOnly ? '1' : '0'
  });
  [...brands].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(brand => cacheParams.append('brand', brand.toLocaleLowerCase('pt-BR')));

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

  const rpcUrl = new URL('/rest/v1/rpc/ecomme_search_products', supabaseUrl);
  const rpcBody = {
    p_query: query || null,
    p_page: page,
    p_page_size: limit,
    p_sort: sort,
    p_category: category || null,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_brands: brands,
    p_min_rating: minRating,
    p_free_shipping: freeShipping,
    p_discount_only: discountOnly
  };

  const { response: sharedResponse, coalesced } = await coalesceEdgeResponse(`search:${cacheKeyUrl.href}`, async () => {
    let upstream;
    try {
      upstream = await fetch(rpcUrl.toString(), {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(rpcBody)
      });
    } catch (error) {
      console.error('[Ecomme Search Edge] Falha ao consultar Supabase:', error);
      return jsonResponse({ error: 'Não foi possível consultar a busca.' }, 502, { ...marker, 'cache-control': 'no-store' });
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 600);
      console.error('[Ecomme Search Edge] RPC de busca falhou:', upstream.status, detail);
      return jsonResponse({
        error: 'Não foi possível carregar a pesquisa. Verifique se a migração de filtros da busca foi executada no Supabase.',
        detail
      }, upstream.status, { ...marker, 'cache-control': 'no-store' });
    }

    let payload;
    try {
      payload = await upstream.json();
    } catch {
      payload = null;
    }
    if (!payload || !Array.isArray(payload.data) || !payload.facets) {
      return jsonResponse({ error: 'A resposta da pesquisa está em formato inválido.' }, 502, { ...marker, 'cache-control': 'no-store' });
    }

    const response = await addResponseEtag(jsonResponse(payload, 200, {
      ...marker,
      'cache-control': `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
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

function normalizeText(value, maxLength) {
  return String(value || '').normalize('NFC').trim().replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').slice(0, maxLength);
}
function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}
function parseOptionalNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}
