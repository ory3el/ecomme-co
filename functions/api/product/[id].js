import { coalesceEdgeResponse } from '../../_shared/edge-cache.js';

const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const PRODUCT_CACHE_TTL_SECONDS = 10;
const PRODUCT_CACHE_STALE_SECONDS = 15;

export async function onRequest(context) {
  const { request, env, params } = context;
  const marker = { 'x-ecomme-product-api': '1' };
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { ...marker, Allow: 'GET', 'cache-control': 'no-store' });

  const id = String(params?.id || '').trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return jsonResponse({ error: 'Identificador de produto inválido.' }, 400, { ...marker, 'cache-control': 'no-store' });

  const origin = new URL(request.url).origin;
  const cacheKey = new Request(`${origin}/api/product/${encodeURIComponent(id)}`, { method: 'GET' });
  const edgeCache = globalThis.caches?.default;
  if (edgeCache) {
    try {
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('x-ecomme-product-api', '1');
        headers.set('x-ecomme-product-cache', 'HIT');
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
    } catch (error) {
      console.warn('[Ecomme Product API] Cache indisponível; consultando Supabase.', error);
    }
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) return jsonResponse({ error: 'SUPABASE_PUBLISHABLE_KEY não configurada no Cloudflare Pages.' }, 503, { ...marker, 'cache-control': 'no-store' });

  const apiUrl = new URL('/rest/v1/products', supabaseUrl);
  apiUrl.searchParams.set('select', '*');
  apiUrl.searchParams.set('id', `eq.${id}`);
  apiUrl.searchParams.set('limit', '1');

  const { response: sharedResponse, coalesced } = await coalesceEdgeResponse(`product:${id}`, async () => {
    let upstream;
    try {
      upstream = await fetch(apiUrl.toString(), { method: 'GET', headers: { apikey: publishableKey, accept: 'application/json' } });
    } catch (error) {
      console.error('[Ecomme Product API] Falha ao consultar Supabase:', error);
      return jsonResponse({ error: 'Não foi possível consultar o produto.' }, 502, { ...marker, 'cache-control': 'no-store' });
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      return jsonResponse({ error: 'Falha ao consultar o produto.', detail }, upstream.status, { ...marker, 'cache-control': 'no-store' });
    }

    let rows;
    try { rows = await upstream.json(); } catch { rows = []; }
    const product = Array.isArray(rows) ? rows[0] || null : null;
    if (!product) return jsonResponse({ product: null }, 404, { ...marker, 'cache-control': 'no-store' });

    const response = jsonResponse({ product }, 200, {
      ...marker,
      'cache-control': `public, max-age=0, s-maxage=${PRODUCT_CACHE_TTL_SECONDS}, stale-while-revalidate=${PRODUCT_CACHE_STALE_SECONDS}`,
      'x-ecomme-product-cache': 'MISS'
    });
    if (edgeCache) {
      const cacheWrite = edgeCache.put(cacheKey, response.clone()).catch(error => console.warn('[Ecomme Product API] Não foi possível salvar cache:', error));
      if (context.waitUntil) context.waitUntil(cacheWrite);
      else await cacheWrite;
    }
    return response;
  });

  const headers = new Headers(sharedResponse.headers);
  if (coalesced) headers.set('x-ecomme-product-cache', 'COALESCED');
  return new Response(sharedResponse.body, { status: sharedResponse.status, statusText: sharedResponse.statusText, headers });
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}
