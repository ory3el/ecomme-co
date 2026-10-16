const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const id = String(params.id || '').trim();

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return serveStaticAsset(context, request);
  }

  if (request.method !== 'GET') {
    return serveStaticAsset(context, request);
  }

  const staticPageUrl = new URL('/product/index.html', url.origin);
  let pageResponse;

  try {
    const staticRequest = new Request(staticPageUrl.toString(), {
      method: 'GET',
      headers: request.headers
    });

    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      pageResponse = await env.ASSETS.fetch(staticRequest);
    } else {
      pageResponse = await context.next(staticRequest);
    }
  } catch (error) {
    console.error('[Ecomme OG] Não foi possível carregar product/index.html:', error);
    return new Response('Não foi possível carregar a página do produto.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  if (!pageResponse.ok || !(pageResponse.headers.get('content-type') || '').includes('text/html')) {
    return pageResponse;
  }

  const supabaseUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  let product = null;

  if (!publishableKey) {
    console.error('[Ecomme OG] Configure SUPABASE_PUBLISHABLE_KEY nas variáveis do Cloudflare Pages.');
  } else {
    try {
      const apiUrl = new URL('/rest/v1/products', supabaseUrl);
      apiUrl.searchParams.set(
        'select',
        'id,name,desc,price,old,discount,image_url,gallery_urls,cat'
      );
      apiUrl.searchParams.set('id', `eq.${id}`);
      apiUrl.searchParams.set('limit', '1');

      const dbResponse = await fetch(apiUrl.toString(), {
        headers: {
          apikey: publishableKey,
          accept: 'application/json'
        }
      });

      if (!dbResponse.ok) {
        const detail = (await dbResponse.text()).slice(0, 400);
        throw new Error(`Supabase HTTP ${dbResponse.status}: ${detail}`);
      }

      const rows = await dbResponse.json();
      product = Array.isArray(rows) ? rows[0] || null : null;
    } catch (error) {
      console.error('[Ecomme OG] Erro ao consultar o produto:', error);
    }
  }

  const name = cleanText(product?.name) || `Produto ${id}`;
  const title = `${name} | Ecomme`;
  const description = truncate(
    cleanText(product?.desc) || `Confira ${name} na Ecomme. Veja detalhes e outras informações na página do produto.`,
    220
  );
  const canonicalUrl = new URL(`/product/${encodeURIComponent(id)}/`, url.origin).toString();
  const imageUrl = getProductImage(product, url.origin);

  const metaTags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta property="og:type" content="product">',
    '<meta property="og:site_name" content="Ecomme">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(name)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`
  ].join('\n  ');

  let html = await pageResponse.text();
  html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<\/head\s*>/i, `  ${metaTags}\n</head>`);

  const headers = new Headers(pageResponse.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, s-maxage=300');
  headers.delete('content-length');
  headers.delete('etag');
  headers.delete('last-modified');

  return new Response(html, {
    status: pageResponse.status,
    statusText: pageResponse.statusText,
    headers
  });
}

function serveStaticAsset(context, request) {
  if (context.env.ASSETS && typeof context.env.ASSETS.fetch === 'function') {
    return context.env.ASSETS.fetch(request);
  }
  return context.next();
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getProductImage(product, origin) {
  const candidates = [];

  if (product?.image_url) candidates.push(product.image_url);

  if (Array.isArray(product?.gallery_urls)) {
    candidates.push(...product.gallery_urls);
  } else if (typeof product?.gallery_urls === 'string') {
    try {
      const parsed = JSON.parse(product.gallery_urls);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    } catch {
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try {
      const imageUrl = new URL(candidate.trim(), origin);
      if (imageUrl.protocol === 'https:' || imageUrl.protocol === 'http:') {
        return imageUrl.toString();
      }
    } catch {
      
    }
  }

  return new URL('/images/mainlogo.png', origin).toString();
}
