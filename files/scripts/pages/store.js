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
let allStoreProducts = [];      // todos (inclusive pausados): o shell precisa deles para carrinho/favoritos
let visibleProducts = [];       // somente os que podem aparecer na loja
let shownCount = PAGE_SIZE;

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
function setLoading(on) {
  document.body.classList.toggle('store-loading', on);
  const l = $('storeLoader');
  if (l) l.hidden = !on;
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

// O carrinho/favoritos/modal do shell procuram o produto no array global `products`
function exposeToSharedShell(list) {
  try {
    if (typeof products === 'undefined' || !Array.isArray(products)) return;
    const known = new Set(products.map(p => String(p.id)));
    list.forEach(p => { if (!known.has(String(p.id))) products.push(p); });
  } catch (e) { /* shell não carregado nesta página */ }
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

function renderStats(store, list) {
  const stats = [{ val: String(list.length), lbl: 'Produtos', sub: list.length === 1 ? 'disponível' : 'disponíveis' }];
  const rating = weightedRating(list);
  if (rating) stats.push({ val: rating.avg.toFixed(1).replace('.', ',') + '★', lbl: 'Avaliação média', sub: `${rating.total.toLocaleString('pt-BR')} avaliações` });
  if (store.prazo_envio) stats.push({ val: String(store.prazo_envio).replace(/\s*úteis/i, ''), lbl: 'Prazo de envio', sub: 'dias úteis' });
  if (store.frete_gratis_ativo && store.frete_valor_minimo) stats.push({ val: String(store.frete_valor_minimo).replace(/,00$/, ''), lbl: 'Frete grátis', sub: 'acima deste valor' });
  const box = $('storeStats');
  if (!box) return;
  box.innerHTML = stats.map((s, i) => `<div class="pi-stat reveal" style="transition-delay:${i * .05}s">
      <span class="pi-stat-val">${escapeHtml(s.val)}</span>
      <span class="pi-stat-lbl">${escapeHtml(s.lbl)}</span>
      <div class="pi-stat-sub" style="color:var(--muted)">${escapeHtml(s.sub)}</div></div>`).join('');
}

function renderTabs(list) {
  setText('#tabCountProducts', String(list.length));
  const rating = weightedRating(list);
  setText('#tabCountReviews', rating ? rating.total.toLocaleString('pt-BR') : '0');
}

function renderReviews(list) {
  const box = $('reviewsContent');
  if (!box) return;
  const rating = weightedRating(list);
  if (!rating) {
    box.innerHTML = '<div class="store-empty"><div class="store-empty-ico">⭐</div><h3>Ainda sem avaliações</h3><p>As avaliações dos produtos desta loja aparecem aqui assim que os clientes avaliarem.</p></div>';
    return;
  }
  const stars = '★'.repeat(Math.round(rating.avg)) + '☆'.repeat(5 - Math.round(rating.avg));
  const rated = list.filter(p => p.rating > 0 && p.reviews > 0).sort((a, b) => b.reviews - a.reviews).slice(0, 8);
  box.innerHTML = `<div class="rev-layout"><div class="rev-summary">
      <div class="rs-avg"><span class="rs-num">${rating.avg.toFixed(1).replace('.', ',')}</span><div class="rs-stars">${stars}</div>
      <div class="rs-total">média ponderada de ${rating.total.toLocaleString('pt-BR')} avaliações dos produtos</div></div></div>
      <div class="rev-list">${rated.map(p => `<div class="rev-item"><div class="rv-head"><div><div class="rv-name">${escapeHtml(p.name)}</div>
        <div class="rv-date">${p.rating.toFixed(1).replace('.', ',')}★ · ${p.reviews.toLocaleString('pt-BR')} avaliações</div></div></div></div>`).join('')}</div></div>`;
}

function renderAbout(store, list) {
  const grid = $('aboutGrid');
  if (!grid) return;
  const since = formatMemberSince(store.criado_em);
  const loc = [store.cidade, store.estado].filter(Boolean).join(', ');
  const formas = (Array.isArray(store.formas_envio) ? store.formas_envio : []).map(v => SHIPPING_LABELS[v] || v);
  const cats = [...new Set([store.categoria, ...list.flatMap(p => p.cat)].filter(Boolean))];
  const row = (l, v) => v ? `<div class="info-row"><span class="lbl">${escapeHtml(l)}</span><span class="val">${escapeHtml(v)}</span></div>` : '';
  const freight = store.frete_gratis_ativo && store.frete_valor_minimo ? `Acima de ${store.frete_valor_minimo}` : '';
  grid.innerHTML = `
    <div class="about-card reveal"><h4>Sobre a loja</h4><p>${escapeHtml(store.descricao || 'Esta loja ainda não escreveu uma descrição.')}</p></div>
    <div class="about-card reveal"><h4>Informações</h4>${row('Membro desde', since)}${row('Localização', loc)}${row('Prazo de envio', store.prazo_envio)}${row('Formas de envio', formas.join(', '))}${row('Frete grátis', freight)}</div>
    ${cats.length ? `<div class="about-card reveal"><h4>Categorias</h4><div class="tag-wrap">${cats.map(c => `<span class="cat-tag">${escapeHtml(c)}</span>`).join('')}</div></div>` : ''}
    <div class="about-card reveal"><h4>Troca e devolução</h4>${store.politica_devolucao ? `<p>${escapeHtml(store.politica_devolucao)}</p>` : '<p>Política de devolução não informada pela loja.</p>'}</div>`;
  const side = $('sidebarCol');
  if (side) side.hidden = true;     // coluna lateral só tinha conteúdo de demonstração
  const wrap = document.querySelector('.main-wrap');
  if (wrap) wrap.classList.add('no-sidebar');
}

/* ─── RENDER: PRODUTOS ───────────────────────────────────────────── */
function getSortedFiltered() {
  const q = normText($('prodSearch') ? $('prodSearch').value : '');
  const sort = $('prodSort') ? $('prodSort').value : 'pop';
  let list = visibleProducts.filter(p => !q || normText(p.name).includes(q) || p.cat.some(c => normText(c).includes(q)));
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (sort === 'new') list.sort((a, b) => (a.created_at && b.created_at ? new Date(b.created_at) - new Date(a.created_at) : 0));
  else list.sort((a, b) => b.reviews - a.reviews || b.rating - a.rating);
  return list;
}

function isFavorite(id) {
  try { return typeof fav !== 'undefined' && Array.isArray(fav) && fav.some(f => String(f.id) === String(id)); } catch (e) { return false; }
}

function renderProds(resetPage) {
  const grid = $('prodGrid');
  if (!grid) return;
  if (resetPage) shownCount = PAGE_SIZE;
  const list = getSortedFiltered();
  const slice = list.slice(0, shownCount);
  const stars = r => '★'.repeat(Math.floor(r)) + '☆'.repeat(5 - Math.floor(r));
  const badgeHtml = p => {
    if (p.badge === 'hot') return '<span class="pbadge ph">🔥 Hot</span>';
    if (p.badge === 'new') return '<span class="pbadge pn">Novo</span>';
    return p.discount > 0 ? `<span class="pbadge ps">-${p.discount}%</span>` : '';
  };

  if (!slice.length) {
    grid.innerHTML = `<div class="store-empty" style="grid-column:1/-1"><div class="store-empty-ico">${visibleProducts.length ? '🔍' : '🛍️'}</div>
      <h3>${visibleProducts.length ? 'Nenhum produto encontrado' : 'Esta loja ainda não tem produtos'}</h3>
      <p>${visibleProducts.length ? 'Tente buscar por outro termo.' : 'Volte em breve para conferir as novidades.'}</p></div>`;
  } else {
    grid.innerHTML = slice.map((p, i) => {
      const img = safeImageUrl(p.image_url);
      const media = img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">` : escapeHtml(p.emoji);
      const id = escapeHtml(p.id);
      return `<div class="pcard" data-pid="${id}" style="animation:fadeInUp .4s var(--ease) ${Math.min(i, 8) * .05}s backwards" onclick="window.location.href='/product/${encodeURIComponent(String(p.id))}'">
      <div class="pc-img-wrap">
        <div class="pc-img">${media}</div>
        <div class="pc-badges">${badgeHtml(p)}</div>
        <button class="pc-wish ${isFavorite(p.id) ? 'on' : ''}" data-act="wish" data-pid="${id}" title="Favoritar" aria-label="Favoritar ${escapeHtml(p.name)}">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="pc-actions">
          <button class="btn-pcart" data-act="cart" data-pid="${id}">
            <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Carrinho
          </button>
        </div>
      </div>
      <div class="pc-info">
        <div class="pc-name">${escapeHtml(p.name)}</div>
        ${p.rating > 0 ? `<div class="pc-rating"><span class="pc-stars">${stars(p.rating)}</span><span class="pc-rcount">(${p.reviews.toLocaleString('pt-BR')})</span></div>` : ''}
        <div class="pc-price-row">
          <span class="pc-price">${fmt(p.price)}</span>
          ${p.old > p.price ? `<span class="pc-old">${fmt(p.old)}</span>` : ''}
          ${p.discount > 0 ? `<span class="pc-disc">-${p.discount}%</span>` : ''}
        </div>
      </div>
    </div>`;
    }).join('');
    if (list.length > slice.length) {
      grid.insertAdjacentHTML('beforeend', `<div style="grid-column:1/-1;text-align:center;padding:10px 0"><button class="btn-more-products" data-act="more">Ver mais produtos (${list.length - slice.length})</button></div>`);
    }
  }
}
function filterProds() { renderProds(true); }
function onHeaderSearch(el) {            // a busca do cabeçalho filtra os produtos desta loja
  const inp = $('prodSearch');
  if (inp) inp.value = el.value;
  renderProds(true);
}

// Cliques do grid (delegação): abrir produto, carrinho, favoritar, "ver mais"
function initProductGrid() {
  const grid = $('prodGrid');
  if (!grid || grid.dataset.bound) return;
  grid.dataset.bound = '1';
  grid.addEventListener('click', ev => {
    const actEl = ev.target.closest('[data-act]');
    if (actEl && actEl.dataset.act === 'more') { shownCount += PAGE_SIZE; renderProds(false); return; }
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
    allStoreProducts = await fetchStoreProducts(store.id);
    visibleProducts = allStoreProducts.filter(p => !isPaused(p));

    currentStore = store;
    exposeToSharedShell(allStoreProducts);
    renderStoreHeader(store, legacy);
    renderStats(store, visibleProducts);
    renderTabs(visibleProducts);
    renderReviews(visibleProducts);
    renderAbout(store, visibleProducts);
    initProductGrid();
    renderProds(true);
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
