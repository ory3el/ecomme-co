(() => {
'use strict';
const $ = id => document.getElementById(id);
const fmt = p => 'R$ ' + Number(p || 0).toFixed(2).replace('.', ',');

/* ─── CONFIG ─────────────────────────────────────────────────────── */
const STORE_SOURCES = ['lojas_public', 'lojas'];
const STORE_COLUMN_SETS = [
  'id, nome_loja, slug_url, slogan, descricao, categoria, cor_destaque, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo, politica_devolucao, cidade, estado, criado_em, status, logo_url, capa_url',
  'id, nome_loja, slug_url, slogan, descricao, categoria, cor_destaque, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo, politica_devolucao, cidade, estado, criado_em, status',
  'id, nome_loja, slug_url, slogan, descricao, categoria, cor_destaque, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo, politica_devolucao, status'
];
const PAUSED_BADGE = 'paused';
const PAGE_SIZE = 24;
const SHIPPING_LABELS = { correios: 'Correios', transportadora: 'Transportadora', retirada: 'Retirada na loja' };

/* ─── ESTADO ─────────────────────────────────────────────────────── */
let currentStore = null;
let storeSource = STORE_SOURCES[0];   // de onde a loja foi lida (view pública ou tabela)
let allStoreProducts = [];      // produtos já carregados em páginas, para carrinho/favoritos
let visibleProducts = [];       // produtos públicos carregados para a busca/ordenação atual
let storeProductsTotal = 0;
let storeHasMore = false;
let storeSummary = null;
let storeTopRated = [];
let storeCategories = [];
let legacyStoreProductsCache = null;
let storeSearchTimer = null;
let storeProductsRequestId = 0;
let storeProductsLoadingMore = false;

/* ─── HELPERS ────────────────────────────────────────────────────── */
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normText = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isActiveStatus = s => ['ativa', 'active'].includes(String(s || '').toLowerCase().trim());
const isPaused = p => p && p.badge === PAUSED_BADGE;
const safeColor = c => (/^#[0-9a-fA-F]{6}$/.test(String(c || '').trim()) ? String(c).trim() : null);
// só https/http ou data:image (cadastros antigos guardavam Base64)
const safeImageUrl = u => {
  const s = String(u || '').trim();
  return /^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|webp);base64,/i.test(s) ? s : null;
};
function isNetworkError(err) {
  const m = String((err && (err.message || err)) || '').toLowerCase();
  return !err ? false : err.name === 'TypeError' || /failed to fetch|network|load failed|timeout/.test(m);
}
function setText(selOrEl, text) {
  const el = typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl;
  if (el) el.textContent = text;
}
function formatMemberSince(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Toast local (o shell pode definir o seu; este é o fallback)
function storeToast(msg) {
  const t = $('toast'), m = $('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('show');
  clearTimeout(storeToast._t);
  storeToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
const toastMsg = msg => (typeof window.showToast === 'function' && window.showToast !== storeToast ? window.showToast(msg) : storeToast(msg));

/* ─── SLUG DA URL ────────────────────────────────────────────────── */
// /store/@minha-loja  (também aceita /store/minha-loja e barra final)
function parseStoreSlug() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const i = segments.findIndex(s => s.toLowerCase() === 'store');
  if (i === -1 || !segments[i + 1]) return null;
  let raw = segments[i + 1];
  try { raw = decodeURIComponent(raw); } catch (e) { return null; }
  const slug = raw.replace(/^@/, '').trim().toLowerCase();
  if (slug.length < 3 || slug.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return { slug, hadAt: raw.startsWith('@') };
}

/* ─── TELAS DE ESTADO ────────────────────────────────────────────── */
function skeletonProductCard() {
  return `<div class="store-skeleton-card" aria-hidden="true"><span class="store-skeleton-shimmer store-skeleton-product-image"></span><div class="store-skeleton-product-info"><span class="store-skeleton-shimmer store-skeleton-product-line"></span><span class="store-skeleton-shimmer store-skeleton-product-line store-skeleton-product-line-short"></span><span class="store-skeleton-shimmer store-skeleton-product-price"></span></div></div>`;
}
function renderStoreSkeleton() {
  const avatar = document.querySelector('.pi-avatar');
  if (avatar) avatar.innerHTML = '<span class="store-skeleton-shimmer store-skeleton-avatar" aria-hidden="true"></span>';
  const name = document.querySelector('.pi-name');
  if (name) name.innerHTML = '<span class="store-skeleton-shimmer store-skeleton-name" aria-hidden="true"></span>';
  const handle = document.querySelector('.pi-handle');
  if (handle) handle.innerHTML = '<span class="store-skeleton-shimmer store-skeleton-handle" aria-hidden="true"></span>';
  const desc = document.querySelector('.pi-desc');
  if (desc) { desc.classList.add('store-skeleton-desc'); desc.setAttribute('aria-hidden', 'true'); desc.innerHTML = '<span class="store-skeleton-shimmer store-skeleton-desc-line"></span><span class="store-skeleton-shimmer store-skeleton-desc-line store-skeleton-desc-short"></span>'; }
  const stats = $('storeStats');
  if (stats) {
    stats.setAttribute('aria-hidden', 'true');
    stats.innerHTML = Array.from({ length: 3 }, (_, i) => `<div class="pi-stat store-skeleton-stat"><span class="store-skeleton-shimmer store-skeleton-stat-value ${i === 1 ? 'store-skeleton-stat-value-short' : i === 2 ? 'store-skeleton-stat-value-mid' : ''}"></span><span class="store-skeleton-shimmer store-skeleton-stat-label"></span><span class="store-skeleton-shimmer store-skeleton-stat-sub"></span></div>`).join('');
  }
  const grid = $('prodGrid');
  if (grid) { grid.setAttribute('aria-busy', 'true'); grid.innerHTML = Array.from({ length: 8 }, skeletonProductCard).join(''); }
  const reviews = $('reviewsContent');
  if (reviews) {
    reviews.setAttribute('aria-busy', 'true');
    reviews.innerHTML = '<div class="store-reviews-skeleton" aria-hidden="true"><div class="store-skeleton-review-summary"><span class="store-skeleton-shimmer store-skeleton-review-score"></span><span class="store-skeleton-shimmer store-skeleton-review-line"></span><span class="store-skeleton-shimmer store-skeleton-review-line store-skeleton-review-line-short"></span></div><div class="store-skeleton-review-list"><div class="store-skeleton-review-card"><span class="store-skeleton-shimmer store-skeleton-review-line"></span><span class="store-skeleton-shimmer store-skeleton-review-line store-skeleton-review-line-mid"></span></div><div class="store-skeleton-review-card"><span class="store-skeleton-shimmer store-skeleton-review-line"></span><span class="store-skeleton-shimmer store-skeleton-review-line store-skeleton-review-line-short"></span></div></div></div>';
  }
  const about = $('aboutGrid');
  if (about) {
    about.setAttribute('aria-busy', 'true');
    about.innerHTML = Array.from({ length: 4 }, (_, i) => `<div class="about-card store-skeleton-about-card" aria-hidden="true"><span class="store-skeleton-shimmer store-skeleton-about-title"></span><span class="store-skeleton-shimmer store-skeleton-about-line"></span><span class="store-skeleton-shimmer store-skeleton-about-line"></span>${i % 2 === 0 ? '<span class="store-skeleton-shimmer store-skeleton-about-line store-skeleton-about-line-short"></span>' : ''}</div>`).join('');
  }
}
function setLoading(on) {
  document.body.classList.toggle('store-loading', on);
  const loader = $('storeLoader');
  if (loader) loader.hidden = true;
  if (on) renderStoreSkeleton();
}

// Troca o conteúdo desta página pelo HTML de outra (a 404 de loja), mantendo a URL e executando seus scripts.
function replaceDocumentWith(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cloneScript = old => {
    const s = document.createElement('script');
    [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    return s;
  };
  document.title = doc.title || document.title;
  document.head.querySelectorAll('link[rel="stylesheet"], style, link[rel="canonical"]').forEach(n => n.remove());
  document.documentElement.removeAttribute('style');
  [...doc.head.children].forEach(n => {
    if (n.tagName === 'SCRIPT') document.head.appendChild(cloneScript(n));
    else if (n.tagName !== 'TITLE') document.head.appendChild(document.importNode(n, true));
  });
  document.body.className = doc.body.className;
  document.body.removeAttribute('style');
  document.body.textContent = '';
  [...doc.body.childNodes].forEach(n => {
    document.body.appendChild(n.nodeName === 'SCRIPT' ? cloneScript(n) : document.importNode(n, true));
  });
}

// Loja inexistente / inativa → mostra a página 404 de loja (mantém a URL; o status HTTP continua 200)
async function showStoreNotFound() {
  try {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    const res = await fetch('/store/404.html', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    if (/id="storeLoader"/.test(html)) throw new Error('A rota /store/404 devolveu o template da loja (veja o _redirects)');
    replaceDocumentWith(html);
  } catch (e) {
    console.warn('Página 404 de loja indisponível, usando aviso simples:', e);
    setLoading(false);
    document.body.textContent = '';
    const main = document.createElement('main');
    main.style.cssText = 'text-align:center;padding:120px 20px;font-family:sans-serif';
    main.innerHTML = '<h1>Loja não encontrada</h1><p style="margin:12px 0 24px;color:#64748B">Verifique o endereço ou volte para a página inicial.</p><a href="/" style="color:#2563EB;font-weight:600">Ir para o início</a>';
    document.body.appendChild(main);
  }
}

function showStoreError(err) {
  console.error('Erro ao carregar a loja:', err);
  setLoading(false);
  const box = $('storeError');
  if (box) {
    setText('#storeErrorMsg', isNetworkError(err)
      ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
      : 'Não foi possível carregar esta loja agora. Tente novamente em instantes.');
    box.hidden = false;
  }
}
function retryLoadStore() { const box = $('storeError'); if (box) box.hidden = true; bootStore(); }

/* ─── DADOS: LOJA ────────────────────────────────────────────────── */
const isMissingRelation = e => !!e && (['42P01', 'PGRST205'].includes(e.code) || /relation .* does not exist|could not find the table/i.test(e.message || ''));
const isMissingColumn = e => !!e && (e.code === '42703' || /column .* does not exist|could not find the .* column/i.test(e.message || ''));

async function fetchStore(slug) {
  let lastError = null;
  for (const source of STORE_SOURCES) {
    let relationMissing = false;
    for (const cols of STORE_COLUMN_SETS) {
      const { data, error } = await supabaseClient.from(source).select(cols).ilike('slug_url', slug).limit(1);
      if (!error) { storeSource = source; return (data && data[0]) || null; }   // achou ou "não existe"
      if (isMissingColumn(error)) continue;                  // coluna nova ausente → conjunto menor
      if (isMissingRelation(error)) { relationMissing = true; break; }   // view ausente → tenta a tabela
      lastError = error;
      throw error;                                           // rede, permissão (RLS), etc.
    }
    if (!relationMissing && lastError) throw lastError;
  }
  throw lastError || new Error('Fonte de dados da loja indisponível');
}

// Cadastros antigos guardavam logo/capa em Base64; só buscamos se não houver URL (colunas pesadas)
async function fetchLegacyImages(storeId) {
  try {
    const { data, error } = await supabaseClient.from(storeSource).select('logo_base64, capa_base64').eq('id', storeId).maybeSingle();
    if (error || !data) return {};
    return { logo: data.logo_base64, capa: data.capa_base64 };
  } catch (e) { return {}; }
}

/* ─── DADOS: PRODUTOS ────────────────────────────────────────────── */
function normalizeStoreProduct(p) {
  if (typeof window.normalizeProduct === 'function') return window.normalizeProduct(p);   // mesmo formato do shell
  return {
    ...p, id: String(p.id), name: p.name || 'Produto sem nome', desc: p.desc || '', price: Number(p.price) || 0,
    old: Number(p.old) || 0, discount: Number(p.discount) || 0, rating: Number(p.rating) || 0, reviews: Number(p.reviews) || 0,
    emoji: p.emoji || '📦', shipping: Boolean(p.shipping), badge: p.badge || 'new', features: Array.isArray(p.features) ? p.features : [],
    cat: Array.isArray(p.cat) ? p.cat : (p.cat ? [p.cat] : []), image_url: p.image_url || null,
    gallery_urls: Array.isArray(p.gallery_urls) ? p.gallery_urls.filter(Boolean).slice(0, 5) : []
  };
}

async function fetchStoreProducts(storeId) {
  const { data, error } = await supabaseClient.from('products').select('*').eq('loja_id', storeId);
  if (error) throw error;
  return (data || []).map(normalizeStoreProduct);
}

function sortLocalStoreProducts(list, sort) {
  const result = [...list];
  if (sort === 'price_asc') result.sort((a, b) => a.price - b.price || String(a.id).localeCompare(String(b.id)));
  else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price || String(a.id).localeCompare(String(b.id)));
  else if (sort === 'rating') result.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || String(a.id).localeCompare(String(b.id)));
  else if (sort === 'new') result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime() || String(b.id).localeCompare(String(a.id)));
  else result.sort((a, b) => b.reviews - a.reviews || b.rating - a.rating || String(a.id).localeCompare(String(b.id)));
  return result;
}

function buildLocalStoreSummary(list) {
  const count = list.length;
  const rated = list.filter(p => p.rating > 0 && p.reviews > 0);
  const reviews = rated.reduce((sum, p) => sum + p.reviews, 0);
  const avg = reviews ? rated.reduce((sum, p) => sum + p.rating * p.reviews, 0) / reviews : 0;
  const categories = [...new Set([].concat(...list.map(p => Array.isArray(p.cat) ? p.cat : [p.cat]).filter(Boolean)))];
  return { summary: { product_count: count, rating_avg: avg, reviews_total: reviews }, top_rated: [...rated].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 8), categories };
}

async function fetchStoreProductPage(storeId, query, sort, offset, includeSummary) {
  if (window.__ecommeStoreProductsApiAvailable !== false) {
    try {
      const params = new URLSearchParams({ store_id: String(storeId), q: String(query || ''), sort: String(sort || 'pop'), offset: String(offset), limit: String(PAGE_SIZE) });
      if (includeSummary) params.set('include_summary', '1');
      const response = await fetch(`/api/store-products?${params.toString()}`, { method: 'GET', credentials: 'omit', cache: 'default', headers: { Accept: 'application/json' } });
      if (response.headers.get('x-ecomme-store-api') === '1' && response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload?.data)) {
          window.__ecommeStoreProductsApiAvailable = true;
          return { data: payload.data.map(normalizeStoreProduct), count: Number(payload.count) || 0, has_more: Boolean(payload.has_more), summary: payload.summary || null, top_rated: Array.isArray(payload.top_rated) ? payload.top_rated.map(normalizeStoreProduct) : null, categories: Array.isArray(payload.categories) ? payload.categories : null };
        }
      }
      throw new Error(`Endpoint de produtos da loja indisponível (HTTP ${response.status}).`);
    } catch (error) {
      console.warn('[Ecomme Store] Paginação da borda indisponível; usando consulta direta como fallback.', error);
      window.__ecommeStoreProductsApiAvailable = false;
    }
  }

  // Fallback de compatibilidade: mantém o comportamento antigo caso a Function/RPC ainda não tenha sido publicada.
  if (!legacyStoreProductsCache) legacyStoreProductsCache = await fetchStoreProducts(storeId);
  const active = legacyStoreProductsCache.filter(p => !isPaused(p));
  const normalizedQuery = normText(query);
  const filtered = active.filter(p => !normalizedQuery || normText(p.name).includes(normalizedQuery) || p.cat.some(c => normText(c).includes(normalizedQuery)) || normText(p.desc).includes(normalizedQuery));
  const sorted = sortLocalStoreProducts(filtered, sort);
  const localMeta = includeSummary ? buildLocalStoreSummary(active) : null;
  return { data: sorted.slice(offset, offset + PAGE_SIZE), count: sorted.length, has_more: sorted.length > offset + PAGE_SIZE, summary: localMeta?.summary || null, top_rated: localMeta?.top_rated ?? null, categories: localMeta?.categories ?? null };
}

// O carrinho/favoritos/modal do shell procuram o produto no array global `products`
function exposeToSharedShell(list) {
  try {
    if (typeof products === 'undefined' || !Array.isArray(products)) return;
    const known = new Set(products.map(p => String(p.id)));
    list.forEach(p => { if (!known.has(String(p.id))) products.push(p); });
  } catch (e) { /* shell não carregado nesta página */ }
}

async function hydrateSavedShellProducts() {
  try {
    if (typeof products === 'undefined' || !Array.isArray(products) || typeof supabaseClient === 'undefined') return;
    const ids = [];
    if (typeof cart !== 'undefined' && Array.isArray(cart)) cart.forEach(item => ids.push(String(item.id || item.product_id || '')));
    if (typeof fav !== 'undefined' && Array.isArray(fav)) fav.forEach(item => ids.push(String(item.id || item.product_id || '')));
    const known = new Set(products.map(product => String(product.id)));
    const missing = [...new Set(ids)].filter(id => id && !known.has(id)).slice(0, 100);
    if (!missing.length) return;
    const { data, error } = await supabaseClient.from('products').select('*').in('id', missing);
    if (error) throw error;
    exposeToSharedShell((data || []).map(normalizeStoreProduct));
  } catch (error) {
    console.warn('[Ecomme Store] Não foi possível pré-carregar todos os itens salvos do usuário:', error);
  }
}

/* ─── RENDER: PERFIL ─────────────────────────────────────────────── */
function renderStoreHeader(store, legacy) {
  const name = store.nome_loja || 'Loja';
  const accent = safeColor(store.cor_destaque);
  const logo = safeImageUrl(store.logo_url) || safeImageUrl(legacy.logo);
  const cover = safeImageUrl(store.capa_url) || safeImageUrl(legacy.capa);

  document.title = `${name} | Ecomme`;
  const desc = (store.slogan || store.descricao || '').trim();
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
  metaDesc.content = desc.slice(0, 160);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = `${window.location.origin}/store/@${store.slug_url}`;

  if (accent) {
    //document.documentElement.style.setProperty('--blue', accent);
  }
    
  setText('#crumbStore', name);
  setText('.pi-name', name);
  const since = formatMemberSince(store.criado_em);
  setText('.pi-handle', `@${store.slug_url}${since ? ' · Membro desde ' + since : ''}`);
  setText('.pi-desc', (store.slogan ? store.slogan + ' — ' : '') + (store.descricao || ''));
  const description = document.querySelector('.pi-desc');
  if (description) { description.classList.remove('store-skeleton-desc'); description.removeAttribute('aria-hidden'); }

  const avatar = document.querySelector('.pi-avatar');
  if (avatar) {
    avatar.textContent = '';
    if (logo) {
      const img = document.createElement('img');
      img.src = logo; img.alt = `Logotipo de ${name}`;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit';
      avatar.appendChild(img);
    } else {
      const words = name.split(/\s+/).filter(Boolean);
      const initial = w => (w.match(/\p{L}|\p{N}/u) || [''])[0];
      const initials = words.length > 1 ? initial(words[0]) + initial(words[1]) : (name.match(/\p{L}|\p{N}/gu) || []).slice(0, 2).join('');
      avatar.textContent = initials.toUpperCase() || '🏪';
      if (accent) avatar.style.background = accent;
    }
  }
  const banner = document.querySelector('.seller-banner');
  if (banner && cover) {
    banner.style.backgroundImage = `linear-gradient(rgba(10,18,40,.35), rgba(10,18,40,.35)), url("${cover.replace(/"/g, '%22')}")`;
    banner.style.backgroundSize = 'cover';
    banner.style.backgroundPosition = 'center';
  }
}

function weightedRating(list) {
  const rated = list.filter(p => p.rating > 0 && p.reviews > 0);
  const total = rated.reduce((s, p) => s + p.reviews, 0);
  if (!total) return null;
  return { avg: rated.reduce((s, p) => s + p.rating * p.reviews, 0) / total, total };
}

function renderStats(store, summary) {
  const count = Number(summary?.product_count) || 0;
  const stats = [{ val: count.toLocaleString('pt-BR'), lbl: 'Produtos', sub: count === 1 ? 'disponível' : 'disponíveis' }];
  const average = Number(summary?.rating_avg) || 0;
  const totalReviews = Number(summary?.reviews_total) || 0;
  if (average > 0 && totalReviews > 0) stats.push({ val: average.toFixed(1).replace('.', ',') + '★', lbl: 'Avaliação média', sub: `${totalReviews.toLocaleString('pt-BR')} avaliações` });
  if (store.prazo_envio) stats.push({ val: String(store.prazo_envio).replace(/\s*úteis/i, ''), lbl: 'Prazo de envio', sub: 'dias úteis' });
  if (store.frete_gratis_ativo && store.frete_valor_minimo) stats.push({ val: String(store.frete_valor_minimo).replace(/,00$/, ''), lbl: 'Frete grátis', sub: 'acima deste valor' });
  const box = $('storeStats');
  if (!box) return;
  box.removeAttribute('aria-hidden');
  box.innerHTML = stats.map((item, i) => `<div class="pi-stat reveal" style="transition-delay:${i * .05}s"><span class="pi-stat-val">${escapeHtml(item.val)}</span><span class="pi-stat-lbl">${escapeHtml(item.lbl)}</span><div class="pi-stat-sub" style="color:var(--muted)">${escapeHtml(item.sub)}</div></div>`).join('');
}

function renderTabs(summary) {
  setText('#tabCountProducts', (Number(summary?.product_count) || 0).toLocaleString('pt-BR'));
  setText('#tabCountReviews', (Number(summary?.reviews_total) || 0).toLocaleString('pt-BR'));
}

function renderReviews(summary, ratedProducts) {
  const box = $('reviewsContent');
  if (!box) return;
  box.removeAttribute('aria-busy');
  const average = Number(summary?.rating_avg) || 0;
  const total = Number(summary?.reviews_total) || 0;
  if (!average || !total) {
    box.innerHTML = '<div class="store-empty"><div class="store-empty-ico">⭐</div><h3>Ainda sem avaliações</h3><p>As avaliações dos produtos desta loja aparecem aqui assim que os clientes avaliarem.</p></div>';
    return;
  }
  const stars = '★'.repeat(Math.round(average)) + '☆'.repeat(5 - Math.round(average));
  const rated = (Array.isArray(ratedProducts) ? ratedProducts : []).slice(0, 8);
  box.innerHTML = `<div class="rev-layout"><div class="rev-summary"><div class="rs-avg"><span class="rs-num">${average.toFixed(1).replace('.', ',')}</span><div class="rs-stars">${stars}</div><div class="rs-total">média ponderada de ${total.toLocaleString('pt-BR')} avaliações dos produtos</div></div></div><div class="rev-list">${rated.map(p => `<div class="rev-item"><div class="rv-head"><div><div class="rv-name">${escapeHtml(p.name)}</div><div class="rv-date">${Number(p.rating || 0).toFixed(1).replace('.', ',')}★ · ${(Number(p.reviews) || 0).toLocaleString('pt-BR')} avaliações</div></div></div></div>`).join('')}</div></div>`;
}

function renderAbout(store, categories) {
  const grid = $('aboutGrid');
  if (!grid) return;
  grid.removeAttribute('aria-busy');
  const since = formatMemberSince(store.criado_em);
  const loc = [store.cidade, store.estado].filter(Boolean).join(', ');
  const formas = (Array.isArray(store.formas_envio) ? store.formas_envio : []).map(v => SHIPPING_LABELS[v] || v);
  const cats = [...new Set([store.categoria, ...(Array.isArray(categories) ? categories : [])].filter(Boolean).map(value => typeof value === 'string' ? value : (value?.name || value?.label || '')))].filter(Boolean);
  const row = (label, value) => value ? `<div class="info-row"><span class="lbl">${escapeHtml(label)}</span><span class="val">${escapeHtml(value)}</span></div>` : '';
  const freight = store.frete_gratis_ativo && store.frete_valor_minimo ? `Acima de ${store.frete_valor_minimo}` : '';
  grid.innerHTML = `<div class="about-card reveal"><h4>Sobre a loja</h4><p>${escapeHtml(store.descricao || 'Esta loja ainda não escreveu uma descrição.')}</p></div><div class="about-card reveal"><h4>Informações</h4>${row('Membro desde', since)}<!--${row('Localização', loc)}-->${row('Prazo de envio', store.prazo_envio)}${row('Formas de envio', formas.join(', '))}${row('Frete grátis', freight)}</div>${cats.length ? `<div class="about-card reveal"><h4>Categorias</h4><div class="tag-wrap">${cats.map(category => `<span class="cat-tag">${escapeHtml(category)}</span>`).join('')}</div></div>` : ''}<div class="about-card reveal"><h4>Troca e devolução</h4>${store.politica_devolucao ? `<p>${escapeHtml(store.politica_devolucao)}</p>` : '<p>Política de devolução não informada pela loja.</p>'}</div>`;
  const side = $('sidebarCol');
  if (side) side.hidden = true;
  const wrap = document.querySelector('.main-wrap');
  if (wrap) wrap.classList.add('no-sidebar');
}

/* ─── RENDER: PRODUTOS ───────────────────────────────────────────── */
function getSortedFiltered() { return visibleProducts; }

function isFavorite(id) {
  try { return typeof fav !== 'undefined' && Array.isArray(fav) && fav.some(f => String(f.id) === String(id)); } catch (e) { return false; }
}

function renderProds() {
  const grid = $('prodGrid');
  if (!grid) return;
  grid.removeAttribute('aria-busy');
  const list = getSortedFiltered();
  const stars = rating => '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  const badgeHtml = product => {
    if (product.badge === 'hot') return '<span class="pbadge ph">🔥 Hot</span>';
    if (product.badge === 'new') return '<span class="pbadge pn">Novo</span>';
    return product.discount > 0 ? `<span class="pbadge ps">-${product.discount}%</span>` : '';
  };

  if (!list.length) {
    const hasStoreProducts = Number(storeSummary?.product_count) > 0;
    const hasQuery = Boolean(normText($('prodSearch')?.value || ''));
    grid.innerHTML = `<div class="store-empty" style="grid-column:1/-1"><div class="store-empty-ico">${hasStoreProducts || hasQuery ? '🔍' : '🛍️'}</div><h3>${hasStoreProducts || hasQuery ? 'Nenhum produto encontrado' : 'Esta loja ainda não tem produtos'}</h3><p>${hasStoreProducts || hasQuery ? 'Tente buscar por outro termo.' : 'Volte em breve para conferir as novidades.'}</p></div>`;
    return;
  }

  grid.innerHTML = list.map((product, i) => {
    const img = safeImageUrl(product.image_url);
    const media = img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">` : escapeHtml(product.emoji);
    const id = escapeHtml(product.id);
    return `<div class="pcard" data-pid="${id}" style="animation:fadeInUp .4s var(--ease) ${Math.min(i, 8) * .05}s backwards" onclick="window.location.href='/product/${encodeURIComponent(String(product.id))}'"><div class="pc-img-wrap"><div class="pc-img">${media}</div><div class="pc-badges">${badgeHtml(product)}</div><button class="pc-wish ${isFavorite(product.id) ? 'on' : ''}" data-act="wish" data-pid="${id}" title="Favoritar" aria-label="Favoritar ${escapeHtml(product.name)}"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><div class="pc-actions"><button class="btn-pcart" data-act="cart" data-pid="${id}"><svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Carrinho</button></div></div><div class="pc-info"><div class="pc-name">${escapeHtml(product.name)}</div>${product.rating > 0 ? `<div class="pc-rating"><span class="pc-stars">${stars(product.rating)}</span><span class="pc-rcount">(${product.reviews.toLocaleString('pt-BR')})</span></div>` : ''}<div class="pc-price-row"><span class="pc-price">${fmt(product.price)}</span>${product.old > product.price ? `<span class="pc-old">${fmt(product.old)}</span>` : ''}${product.discount > 0 ? `<span class="pc-disc">-${product.discount}%</span>` : ''}</div></div></div>`;
  }).join('');

  if (storeHasMore) {
    const remaining = Math.max(0, storeProductsTotal - visibleProducts.length);
    grid.insertAdjacentHTML('beforeend', `<div style="grid-column:1/-1;text-align:center;padding:10px 0"><button class="btn-more-products" data-act="more" ${storeProductsLoadingMore ? 'disabled' : ''}>${storeProductsLoadingMore ? 'Carregando...' : `Ver mais produtos${remaining ? ` (${remaining})` : ''}`}</button></div>`);
  }
}

function showStoreProductLoading() {
  const grid = $('prodGrid');
  if (grid) { grid.setAttribute('aria-busy', 'true'); grid.innerHTML = Array.from({ length: 8 }, skeletonProductCard).join(''); }
}

function applyStorePageMetadata(payload) {
  if (payload?.summary) storeSummary = payload.summary;
  if (Array.isArray(payload?.top_rated)) storeTopRated = payload.top_rated;
  if (Array.isArray(payload?.categories)) storeCategories = payload.categories;
  if (currentStore && storeSummary) {
    renderStats(currentStore, storeSummary);
    renderTabs(storeSummary);
    renderReviews(storeSummary, storeTopRated);
    renderAbout(currentStore, storeCategories);
  }
}

async function loadStoreProductsPage(storeId, { reset = false, initial = false } = {}) {
  if (!reset && (storeProductsLoadingMore || !storeHasMore)) return;
  const requestId = reset ? ++storeProductsRequestId : storeProductsRequestId;
  const query = $('prodSearch')?.value || '';
  const sort = $('prodSort')?.value || 'pop';
  const offset = reset ? 0 : visibleProducts.length;
  if (reset) {
    allStoreProducts = [];
    visibleProducts = [];
    storeProductsTotal = 0;
    storeHasMore = false;
    storeProductsLoadingMore = false;
    showStoreProductLoading();
  } else {
    storeProductsLoadingMore = true;
    renderProds();
  }

  try {
    const payload = await fetchStoreProductPage(storeId, query, sort, offset, reset);
    if (requestId !== storeProductsRequestId) return;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const seen = new Set(allStoreProducts.map(product => String(product.id)));
    rows.forEach(product => {
      if (!seen.has(String(product.id))) {
        allStoreProducts.push(product);
        visibleProducts.push(product);
        seen.add(String(product.id));
      }
    });
    storeProductsTotal = Number(payload.count) || 0;
    storeHasMore = Boolean(payload.has_more);
    storeProductsLoadingMore = false;
    applyStorePageMetadata(payload);
    exposeToSharedShell(rows);
    renderProds();
    if (!reset && !rows.length) storeHasMore = false;
    return payload;
  } catch (error) {
    if (requestId !== storeProductsRequestId) return;
    storeProductsLoadingMore = false;
    console.error('[Ecomme Store] Não foi possível carregar os produtos:', error);
    if (reset) {
      const grid = $('prodGrid');
      if (grid) grid.innerHTML = '<div class="store-empty" style="grid-column:1/-1"><h3>Não foi possível carregar os produtos</h3><p>Verifique sua conexão e tente novamente.</p><button class="btn-more-products" data-act="retry">Tentar novamente</button></div>';
    } else {
      renderProds();
      toastMsg('Não foi possível carregar mais produtos. Tente novamente.');
    }
    if (initial) throw error;
    return null;
  }
}

function filterProds() {
  clearTimeout(storeSearchTimer);
  storeSearchTimer = setTimeout(() => {
    if (currentStore) loadStoreProductsPage(currentStore.id, { reset: true });
  }, 260);
}
function onHeaderSearch(el) {
  const input = $('prodSearch');
  if (input) input.value = el.value;
  filterProds();
}

// Cliques do grid (delegação): abrir produto, carrinho, favoritar, "ver mais"
function initProductGrid() {
  const grid = $('prodGrid');
  if (!grid || grid.dataset.bound) return;
  grid.dataset.bound = '1';
  grid.addEventListener('click', ev => {
    const actEl = ev.target.closest('[data-act]');
    if (actEl && actEl.dataset.act === 'more') { loadStoreProductsPage(currentStore.id, { reset: false }); return; }
    if (actEl && actEl.dataset.act === 'retry') { loadStoreProductsPage(currentStore.id, { reset: true }); return; }
    const card = ev.target.closest('.pcard');
    if (!card) return;
    const id = card.dataset.pid;
    if (actEl && actEl.dataset.act === 'cart') {
      ev.stopPropagation();
      if (typeof addToCart === 'function') addToCart(id, 1); else toastMsg('O carrinho não está disponível agora. Recarregue a página.');
    } else if (actEl && actEl.dataset.act === 'wish') {
      ev.stopPropagation();
      if (typeof toggleFav === 'function') { toggleFav(id); syncWishButtons(); } else toastMsg('Favoritos indisponíveis agora. Recarregue a página.');
    } else if (typeof openProduct === 'function') {
      openProduct(id);
    }
  });
  // favoritos mudam pelo shell (carrinho/lista de desejos): mantém os corações em dia
  const favList = $('favItems');
  if (favList && 'MutationObserver' in window) new MutationObserver(syncWishButtons).observe(favList, { childList: true });
}
function syncWishButtons() {
  document.querySelectorAll('#prodGrid .pc-wish').forEach(btn => btn.classList.toggle('on', isFavorite(btn.dataset.pid)));
}

/* ─── COMPARTILHAR (real) ────────────────────────────────────────── */
async function handleShare() {
  const url = `${window.location.origin}/store/@${currentStore ? currentStore.slug_url : ''}`;
  const title = currentStore ? currentStore.nome_loja : 'Loja Ecomme';
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url);
    toastMsg('Link da loja copiado! 🔗');
  } catch (e) {
    if (e && e.name === 'AbortError') return;      // usuário fechou o menu de compartilhar
    toastMsg('Não foi possível copiar o link. Copie pelo endereço do navegador.');
  }
}

/* ─── ABAS ───────────────────────────────────────────────────────── */
function switchTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  const panel = $('panel-' + tab);
  if (panel) panel.classList.add('on');
  movePill(btn);
}
function movePill(btn) {
  const bg = $('tabPill'), bar = $('tabBar');
  if (!bg || !bar) return;
  const barRect = bar.getBoundingClientRect(), btnRect = btn.getBoundingClientRect();
  bg.style.left = (btnRect.left - barRect.left) + 'px';
  bg.style.width = btnRect.width + 'px';
}
window.addEventListener('resize', () => { const a = document.querySelector('.tab-btn.on'); if (a) movePill(a); });

/* ─── ANIMAÇÃO DE ENTRADA (.reveal → .in) ────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

/* ─── CARGA PRINCIPAL ────────────────────────────────────────────── */
async function bootStore() {
  const parsed = parseStoreSlug();
  if (!parsed) { await showStoreNotFound(); return; }
  if (!parsed.hadAt) window.history.replaceState(null, '', `/store/@${parsed.slug}${window.location.search}`);   // endereço canônico

  setLoading(true);
  try {
    const store = await fetchStore(parsed.slug);
    if (!store || !isActiveStatus(store.status)) { await showStoreNotFound(); return; }

    const legacy = (!store.logo_url || !store.capa_url) ? await fetchLegacyImages(store.id) : {};
    currentStore = store;
    legacyStoreProductsCache = null;
    storeSummary = null;
    storeTopRated = [];
    storeCategories = [];
    renderStoreHeader(store, legacy);
    initProductGrid();
    await loadStoreProductsPage(store.id, { reset: true, initial: true });
    await hydrateSavedShellProducts();
    initReveal();
    setLoading(false);
    requestAnimationFrame(() => { const a = document.querySelector('.tab-btn.on'); if (a) movePill(a); });
  } catch (err) {
    showStoreError(err);
  }
}
window.addEventListener('DOMContentLoaded', bootStore);

// Somente o que o HTML chama por atributo (onclick/oninput) fica no escopo global
Object.assign(window, { switchTab, filterProds, handleShare, onHeaderSearch, retryLoadStore });
})();
