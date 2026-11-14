(function () {
'use strict';
// FAVICON E TEMA DO SISTEMA
const favicon = document.getElementById('favicon');
function verificarTema(event) {
  if (favicon) favicon.href = event.matches ? '/images/favicon-light.png' : '/images/favicon-blue.png';
}
const mqEscuro = window.matchMedia('(prefers-color-scheme: dark)');
verificarTema(mqEscuro);
if (mqEscuro.addEventListener) mqEscuro.addEventListener('change', verificarTema);
else mqEscuro.addListener(verificarTema);

/* ────────────────────────────────────────────────────────────────────── */
document.body.style.cursor = "default";

function buttonLink(url) {
  window.location.href = url;
}

function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
}

function injectPrefetch(url) {
  if (!document.querySelector(`link[href="${url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
}

let products = [];
let offers = [];
let offersChannel = null;
let offersRefreshTimer = null;
let offersPollTimer = null;
let offersLoading = null;
let offersLastUpdated = null;
let offersHasMore = false;
let offersCursor = null;
let offersTotalCount = 0;
let offersRequestVersion = 0;
let offersPageInFlight = null;
let offersSearchTimer = null;
let offersRealtimeRefreshTimer = null;
let offersLastRealtimeAt = 0;
let offersStats = null;
let offersSentinelObserver = null;
let offersCardsObserver = null;
const offersById = new Map();
const OFFERS_PAGE_SIZE = 24;
let cart = [];
let fav = [];
let curId = null;
let mQtyVal = 1;
let view = 'grid';
let shuffled = [];
const $ = id => document.getElementById(id);
const fmt = value => formatOfferPrice(value);

// Disponibiliza estado para o módulo compartilhado de listas múltiplas.
function exposeState(name, getter, setter) {
  try { Object.defineProperty(window, name, { configurable: true, get: getter, set: setter }); }
  catch (_) { window[name] = getter(); }
}
exposeState('products', () => products, value => { if (Array.isArray(value)) products = value; });
exposeState('offers', () => offers, value => { if (Array.isArray(value)) offers = value; });
exposeState('cart', () => cart, value => { if (Array.isArray(value)) cart = value; });
exposeState('fav', () => fav, value => { if (Array.isArray(value)) fav = value; });
exposeState('shuffled', () => shuffled, value => { if (Array.isArray(value)) shuffled = value; });

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function safeImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}
function toNumber(value) {
  const number = Number(String(value == null ? '' : value).replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}
function normalizeOfferProduct(raw) {
  const price = toNumber(raw.price);
  const old = toNumber(raw.old ?? raw.old_price ?? raw.original_price ?? raw.compare_at_price);
  const storedDiscount = Math.max(0, Math.min(99, toNumber(raw.discount)));
  const hasPreviousPrice = old > price && price > 0;
  const priceDiscount = hasPreviousPrice ? Math.max(1, Math.min(99, Math.round((1 - price / old) * 100))) : 0;
  const validStoredDiscount = old <= 0 ? storedDiscount : 0;
  let gallery = raw.gallery_urls;
  if (typeof gallery === 'string') {
    try { gallery = JSON.parse(gallery); } catch (_) { gallery = [gallery]; }
  }
  if (!Array.isArray(gallery)) gallery = [];
  let images = raw.images;
  if (typeof images === 'string') { try { images = JSON.parse(images); } catch (_) { images = [images]; } }
  if (!Array.isArray(images)) images = [];
  const image = [raw.image_url, raw.main_image, raw.thumbnail, ...gallery, ...images, raw.image].map(safeImageUrl).find(Boolean) || '';
  const cat = Array.isArray(raw.cat) ? raw.cat.filter(Boolean).join(', ') : String(raw.cat || raw.category || '');
  const shippingValue = String(raw.shipping == null ? '' : raw.shipping).trim().toLowerCase();
  return {
    ...raw,
    id: String(raw.id),
    name: String(raw.name || 'Produto sem nome'),
    desc: String(raw.desc || raw.description || ''),
    price,
    old,
    discount: priceDiscount || validStoredDiscount,
    rating: toNumber(raw.rating),
    reviews: Math.max(0, toNumber(raw.reviews)),
    cat,
    emoji: raw.emoji || '📦',
    image_url: image,
    gallery_urls: gallery.map(safeImageUrl).filter(Boolean),
    shipping: raw.shipping === true || raw.shipping === 1 || ['true', '1', 'sim', 'grátis', 'gratis', 'free'].includes(shippingValue),
    badge: String(raw.badge || '').trim().toLowerCase()
  };
}
function isRealOffer(product) {
  return !!product && product.price > 0 && product.badge !== 'paused' && product.discount > 0 && (product.old > product.price || product.old <= 0);
}
function formatOfferPrice(value) {
  return 'R$ ' + toNumber(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getOfferImage(product) {
  return safeImageUrl(product.image_url || product.gallery_urls?.[0] || '');
}
function getSupabaseClient() {
  try { return typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient || null; }
  catch (_) { return window.supabaseClient || null; }
}
function currentUserId() {
  try { return typeof userId !== 'undefined' ? userId : null; }
  catch (_) { return null; }
}
function isSavedToWishlist(productId) {
  const items = window.EcommeWishlists?.getItems?.();
  if (Array.isArray(items)) return items.some(item => String(item.product_id) === String(productId));
  return fav.some(item => String(item.id) === String(productId));
}
function showOffersSkeleton() {
  const grid = $('offersGrid');
  if (!grid) return;
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="ocard oc-skeleton" aria-hidden="true">
      <div class="oc-skeleton-image"></div>
      <div class="oc-skeleton-info"><span></span><span></span><span></span></div>
    </div>`).join('');
}
function showOffersError(message = 'Não foi possível carregar as ofertas.') {
  const grid = $('offersGrid');
  if (!grid) return;
  grid.setAttribute('aria-busy', 'false');
  grid.innerHTML = `<div class="empty" role="status"><div class="empty-ico">⚠️</div><h3>Não foi possível carregar as ofertas</h3><p>${escapeHtml(message)}</p><button class="btn-clear" type="button" onclick="retryLoadOffers()">Tentar novamente</button></div>`;
}
function updateOfferStats() {
  const total = Number(offersStats?.total ?? offersTotalCount ?? offers.length) || 0;
  const maxDiscount = Number(offersStats?.max_discount ?? 0) || 0;
  const freeShipping = Number(offersStats?.free_shipping ?? 0) || 0;
  if ($('statActive')) $('statActive').textContent = total.toLocaleString('pt-BR');
  if ($('statMaxDiscount')) $('statMaxDiscount').textContent = maxDiscount ? `${maxDiscount}%` : '—';
  if ($('statShipping')) $('statShipping').textContent = freeShipping.toLocaleString('pt-BR');
  if ($('statUpdated')) $('statUpdated').textContent = offersLastUpdated ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(offersLastUpdated) : '—';
  if ($('offersSub')) $('offersSub').textContent = offersLastUpdated ? `Atualizado às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(offersLastUpdated)}` : 'Aguardando catálogo';
}

async function loadOfferStats() {
  try {
    const response = await fetch('/api/catalog-stats?type=offers', { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (response.ok) {
      offersStats = await response.json();
      updateOfferStats();
      return;
    }
  } catch (_) {}
  try {
    const { data, error } = await getSupabaseClient().rpc('ecomme_offers_catalog_stats');
    if (error) throw error;
    offersStats = data || null;
    updateOfferStats();
  } catch (error) {
    console.warn('[Ecomme ofertas] Estatísticas resumidas indisponíveis:', error);
  }
}

function searchFor(term) {
  if ($('searchInput')) $('searchInput').value = term;
  if ($('headerSearch')) $('headerSearch').value = term;
  scheduleOffersReset();
}
function handleOfferSearch(input) {
  const value = input?.value || '';
  if (input?.id === 'headerSearch' && $('searchInput')) $('searchInput').value = value;
  if (input?.id === 'searchInput' && $('headerSearch')) $('headerSearch').value = value;
  scheduleOffersReset();
}
function scheduleOffersReset(delay = 180) {
  clearTimeout(offersSearchTimer);
  offersSearchTimer = setTimeout(() => resetOffersCatalog().catch(error => {
    console.error('[Ecomme ofertas] Falha ao aplicar filtros:', error);
    showOffersError('Não foi possível aplicar os filtros. Tente novamente.');
  }), delay);
}

// EXECUTE DATABASE
async function initializeOffersPage() {
  const client = getSupabaseClient();
  const loginBtn = $('authLoginBtn');
  const profileContainer = $('headerProfileContainer');
  showOffersSkeleton();
  if (!client) {
    showOffersError('O serviço de catálogo não foi inicializado. Atualize a página e tente novamente.');
    if (loginBtn) loginBtn.classList.remove('hidden');
    return;
  }
  try {
    await Promise.all([resetOffersCatalog({ showSkeleton: false }), loadOfferStats()]);
    startOffersRealtime();
  } catch (error) {
    console.error('[Ecomme ofertas] Falha no carregamento inicial:', error);
    showOffersError('Verifique a conexão com o Supabase e tente novamente.');
  }
  let user = null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error && error.status !== 401) console.warn('[Ecomme ofertas] Não foi possível validar a sessão:', error.message);
    user = data?.user || null;
  } catch (error) {
    console.warn('[Ecomme ofertas] Falha ao consultar a sessão:', error);
  }
  if (!user) {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileContainer) profileContainer.classList.add('hidden');
    injectPrefetch('/login');
    return;
  }
  try {
    userId = user.id;
    await loadFromSupabase();
    if (loginBtn) loginBtn.classList.add('hidden');
    if (profileContainer) profileContainer.classList.remove('hidden');
    const { data: profile, error } = await client.from('profiles').select('full_name,avatar_url').eq('id', user.id).maybeSingle();
    if (error) throw error;
    const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '/images/icons/full/user.webp';
    if ($('accSidebarName')) $('accSidebarName').textContent = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Cliente';
    if ($('accSidebarEmail')) $('accSidebarEmail').textContent = user.email || '';
    if ($('accSidebarAvatar')) $('accSidebarAvatar').src = avatar;
    if ($('sidebarAvatar')) $('sidebarAvatar').src = avatar;
    if ($('headerAvatar')) $('headerAvatar').src = avatar;
  } catch (error) {
    console.error('[Ecomme ofertas] Erro ao carregar os dados da conta:', error);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeOffersPage, { once: true });
else initializeOffersPage();
// HEADER
function initHeaderAuthListener() {
  const client = getSupabaseClient();
  const loginBtn = $('authLoginBtn');
  const profileContainer = $('headerProfileContainer');
  const bellBtn = $('bellBtn');
  const headerAvatar = $('headerAvatar');
  if (!client?.auth || !loginBtn || !profileContainer || initHeaderAuthListener.bound) return;
  initHeaderAuthListener.bound = true;
  client.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user;
    if (!user) {
      userId = null;
      loginBtn.classList.remove('hidden');
      profileContainer.classList.add('hidden');
      if (bellBtn) bellBtn.classList.add('hidden');
      if (headerAvatar) headerAvatar.src = '/images/icons/full/user.webp';
      return;
    }
    userId = user.id;
    loginBtn.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    if (bellBtn) bellBtn.classList.remove('hidden');
    const fallbackAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '/images/icons/full/user.webp';
    if (headerAvatar) headerAvatar.src = fallbackAvatar;
    try {
      const { data, error } = await client.from('profiles').select('full_name,avatar_url').eq('id', user.id).maybeSingle();
      if (error) throw error;
      const avatar = data?.avatar_url || fallbackAvatar;
      if (headerAvatar) headerAvatar.src = avatar;
      if ($('accSidebarAvatar')) $('accSidebarAvatar').src = avatar;
      if ($('accSidebarName')) $('accSidebarName').textContent = data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Cliente';
      if ($('accSidebarEmail')) $('accSidebarEmail').textContent = user.email || '';
    } catch (error) {
      console.error('[Ecomme ofertas] Erro ao carregar perfil:', error);
    }
  });
}
initHeaderAuthListener();

function starsHtml(r) {
  let s = '';
  const f = Math.floor(r);
  for (let i = 0; i < f; i++) s += '★';
  for (let i = f; i < 5; i++) s += '☆';
  return s;
}

function fishYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCart(id, qty = 1) {
  if (!userId) {
    showAuth("Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.", "Conta Necessária", "🔒");
    return false;
  }
  const p = products.find(x => String(x.id) === String(id)) || offers.find(x => String(x.id) === String(id));
  
  if (!p) return false;
  if (String(p.badge || '').toLowerCase() === 'paused') {
    showToast(`${p.name} está indisponível no momento.`);
    return false;
  }
  const ex = cart.find(x => String(x.id) === String(id));
  if (ex) ex.qty += qty; else cart.push({ ...p, qty });
  updateCart();
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
  syncToSupabase();
  return true;
}

function removeFromCart(id) {
  cart = cart.filter(x => String(x.id) !== String(id));
  updateCart();
  syncToSupabase();
}

function changeCartQty(id, d) {
  const item = cart.find(x => String(x.id) === String(id));
  if (item) {
    item.qty += d;
    if (item.qty <= 0) removeFromCart(id); else updateCart();
  }
  syncToSupabase();
}

function updateCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  $('cartBadge').textContent = count;
  $('cartBadge').style.display = count > 0 ? 'flex' : 'none';
  $('cartCount').textContent = `(${count})`;
  $('cartSub').textContent = fmt(total);
  $('cartTotal').textContent = fmt(total);

  const el = $('cartItems');
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty-st"><span>🛒</span><p>Seu carrinho está vazio</p></div>`;
    return;
  }
  
  el.innerHTML = cart.map(item => {
    const itemId = escapeHtml(item.id);
    const itemName = escapeHtml(item.name || 'Produto');
    const itemEmoji = escapeHtml(item.emoji || '📦');
    return `
    <div class="ci">
      <div class="ci-img">${itemEmoji}</div>
      <div class="ci-info">
        <div class="ci-name">${itemName}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <div class="ci-qty">
          <button class="qb" onclick="changeCartQty('${itemId}',-1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="changeCartQty('${itemId}',1)">+</button>
        </div>
      </div>
      <button class="del" onclick="removeFromCart('${itemId}')" title="Remover do Carrinho">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
      <button class="cart-item-towish" onclick="moveFromCartToFav('${itemId}')" title="Adicionar à Lista de Desejos">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>`;
  }).join('');

  renderOffers();
  syncToSupabase();
}

function openCart() {
  closeMore();
  closeFav();
  closeNotif();
  closeAcc();
  $('cartSidebar').classList.add('on');
  $('cartOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeCart() {
  $('cartSidebar').classList.remove('on');
  $('cartOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

function checkout() {
  if (!cart.length) {
    showAlert("Para finalizar a compra, é necessário adicionar produtos ao carrinho primeiro!", "Sem Itens no Carrinho", "ℹ️");
    return;
  }
  showToast('Redirecionando para o pagamento... 🔒');
  window.location.href = "/checkout"
  setTimeout(closeCart, 1200);
}

/* ─── FAV ───────────────────────────────────────────────────────── */
function toggleFav(id) {
  if (window.EcommeWishlists?.openPicker) return window.EcommeWishlists.openPicker(String(id));
  if (!userId) {
    showAuth("Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.", "Conta Necessária", "🔒");
    return;
  }
  const ex = fav.find(x => String(x.id) === String(id));
  
  if (ex) {
    removeFromFav(id);
    showToast('Removido da Lista de Desejos! 💔');
  } else {
    addToFav(id, 1);
  }

  if ($('mWish')) {
    $('mWish').classList.toggle('on', fav.some(x => String(x.id) === String(id)));
  }
  syncToSupabase();
}

function addToFav(id, qty = 1) {
  if (window.EcommeWishlists?.openPicker) return window.EcommeWishlists.openPicker(String(id));
  if (!userId) {
    showAuth("Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.", "Conta Necessária", "🔒");
    return;
  }
  const p = products.find(x => String(x.id) === String(id)) || offers.find(x => String(x.id) === String(id));
  if (!p) return;

  const ex = fav.find(x => String(x.id) === String(id));
  if (ex) ex.qty += qty; else fav.push({ ...p, qty });
  
  updateFav();
  showToast(`${p.name} salvo nos favoritos! ❤️`);
  syncToSupabase();
}

function removeFromFav(id) {
  if (window.EcommeWishlists?.removeFromActiveList) return window.EcommeWishlists.removeFromActiveList(String(id));
  fav = fav.filter(x => String(x.id) !== String(id));
  updateFav();
  syncToSupabase();
}

function changeFavQty(id, d) {
  const item = fav.find(x => x.id === id);
  if (item) {
    item.qty += d;
    if (item.qty <= 0) removeFromFav(id); else updateFav();
  }
  syncToSupabase();
}

function updateFav() {
  if (window.EcommeWishlists?.updateSidebar) return window.EcommeWishlists.updateSidebar();
  const total = fav.reduce((s, i) => s + i.price * i.qty, 0);
  const count = fav.reduce((s, i) => s + i.qty, 0);
  
  $('wishBadge').textContent = count;
  $('wishBadge').style.display = count > 0 ? 'flex' : 'none';
  $('favCount').textContent = `(${count})`;
  $('favTotal').textContent = fmt(total);

  const el = $('favItems');
  if (!fav.length) {
    el.innerHTML = `<div class="fav-empty-st"><span>🛒</span><p>Nenhum produto salvo no momento</p></div>`;
    renderOffers();
    return;
  }
  
  el.innerHTML = fav.map(item => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <button class="btn-madd" onclick="addToCart(${item.id}, 1); removeFromFav(${item.id}); showToast('Adicionado ao carrinho! 🛒'); closeFav(); openCart(); renderOffers();">
          <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Adicionar ao Carrinho
        </button>
      </div>
      <button class="del" onclick="removeFromFav(${item.id}); renderOffers();">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>`).join('');
    
  renderOffers();
  syncToSupabase();
}

function openFav() {
  if (window.EcommeWishlists?.openFav) return window.EcommeWishlists.openFav();
  closeMore();
  closeCart();
  closeNotif();
  closeAcc();
  $('favSidebar').classList.add('on');
  $('favOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeFav() {
  if (window.EcommeWishlists?.closeFav) return window.EcommeWishlists.closeFav();
  $('favSidebar').classList.remove('on');
  $('favOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

function addAllFavToCart() {
  if (window.EcommeWishlists?.addAllToCart) return window.EcommeWishlists.addAllToCart();
  if (!fav.length) { showToast('Adicione produtos primeiro! 😊'); return; }

  fav.forEach(produto => {
    addToCart(produto.id, 1);
  });
  fav = [];
  updateFav();
  renderOffers();
  closeFav();
  openCart();
  showToast('Todos os itens foram para o carrinho! 🛒');
}

function moveFromCartToFav(id) {
  if (window.EcommeWishlists?.openPicker) { window.EcommeWishlists.openPicker(String(id)); return; }
  addToFav(id, 1);
  showToast('Produto adicionado à Lista de Desejos! ❤️');
}

/* ─── NOTIFICATION ───────────────────────────────────────────────── */
function openNotif() {
  closeCart();
  closeFav();
  closeAcc();
  closeMore();
  $('notifSidebar').classList.add('on');
  $('notifOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeNotif() {
  $('notifSidebar').classList.remove('on');
  $('notifOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

/* ─── MORE ───────────────────────────────────────────────────────── */
function openMore() {
  closeFav();
  closeCart();
  closeAcc();
  closeNotif();
  $('moreSidebar').classList.add('on');
  $('moreOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeMore() {
  $('moreSidebar').classList.remove('on');
  $('moreOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

/* ─── ACC SIDEBAR ────────────────────────────────────────────────── */
function openAcc() {
  closeCart();
  closeFav();
  closeNotif();
  closeMore();

  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.add('on');
  if (ov) ov.classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeAcc() {
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.remove('on');
  if (ov) ov.classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

/* ─── OFFERS DATA ────────────────────────────────────────────────────── */

let currentDealFilter = 'todos';
let currentProduct = null;

/* ─── FILTROS E RENDERIZAÇÃO DAS OFERTAS ──────────────────────────────── */
function setDealFilter(button, type) {
  document.querySelectorAll('.dchip').forEach(chip => chip.classList.toggle('active', chip === button));
  currentDealFilter = type || 'todos';
  scheduleOffersReset(0);
}

function offerCardHtml(product, index = 0) {
  const id = escapeHtml(product.id);
  const image = getOfferImage(product);
  const name = escapeHtml(product.name);
  const category = escapeHtml(product.cat || 'Produto');
  const inWishlist = isSavedToWishlist(product.id);
  const oldPrice = product.old > product.price ? `<span class="oc-old">${fmt(product.old)}</span>` : '';
  const savings = product.old > product.price ? `<span class="oc-saving">Economize ${fmt(product.old - product.price)}</span>` : '';
  const shippingBadge = product.shipping ? '<span class="oc-type-badge shipping">🚚 Frete grátis</span>' : (product.badge === 'new' ? '<span class="oc-type-badge daily">Novo</span>' : '<span class="oc-type-badge combo">Oferta verificada</span>');
  const imageMarkup = image ? `<img data-src="${escapeHtml(image)}" alt="${name}" loading="lazy" decoding="async" width="480" height="480">` : `<span class="oc-fallback" aria-hidden="true">${escapeHtml(product.emoji)}</span>`;
  const ratingMarkup = product.rating > 0 ? `<div class="oc-rating"><i class="fa-regular fa-star" aria-hidden="true"></i><span>${product.rating.toFixed(1)}</span>${product.reviews > 0 ? `<small>(${product.reviews.toLocaleString('pt-BR')})</small>` : ''}</div>` : '<div class="oc-rating oc-no-rating">Ainda sem avaliações</div>';
  return `<article class="ocard" data-offer-card="${id}" style="animation-delay:${Math.min(index, 8) * 0.025}s" tabindex="0" role="button" aria-label="Ver ${name}">
    <div class="oc-img-wrap"><div class="oc-img">${imageMarkup}</div><span class="oc-disc-badge">-${product.discount}%<small>OFF</small></span>${shippingBadge}<button type="button" class="oc-wish ${inWishlist ? 'on' : ''}" data-offer-action="favorite" data-product-id="${id}" aria-pressed="${inWishlist}" title="${inWishlist ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos'}" aria-label="${inWishlist ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos'}"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button></div>
    <div class="oc-info"><div class="oc-cat">${category}</div><h3 class="oc-name">${name}</h3>${ratingMarkup}<div class="oc-price-row"><span class="oc-price">${fmt(product.price)}</span>${oldPrice}</div>${savings}<button type="button" class="btn-oc-cart" data-offer-action="cart" data-product-id="${id}"><svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Adicionar ao carrinho</button></div>
  </article>`;
}

function activateOfferCard(card) {
  if (!card) return;
  card.querySelectorAll('img[data-src]').forEach(image => {
    image.src = image.dataset.src;
    delete image.dataset.src;
    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'oc-fallback';
      fallback.textContent = '📦';
      image.replaceWith(fallback);
    }, { once: true });
  });
}
function virtualizeOfferCard(card) {
  if (!card || card.dataset.offerVirtualized === 'true' || card.contains(document.activeElement)) return;
  const height = Math.ceil(card.getBoundingClientRect().height || Number(card.dataset.offerVirtualHeight) || 420);
  card.dataset.offerVirtualHeight = String(height);
  card.style.height = `${height}px`;
  card.style.minHeight = `${height}px`;
  card.replaceChildren();
  card.removeAttribute('role');
  card.removeAttribute('aria-label');
  card.tabIndex = -1;
  card.dataset.offerVirtualized = 'true';
  card.classList.add('ocard--virtual');
  card.setAttribute('aria-hidden', 'true');
}
function restoreOfferCard(card) {
  if (!card || card.dataset.offerVirtualized !== 'true') return card;
  const product = offersById.get(String(card.dataset.offerCard));
  if (!product) { offersCardsObserver?.unobserve(card); card.remove(); return null; }
  const template = document.createElement('template');
  template.innerHTML = offerCardHtml(product).trim();
  const replacement = template.content.firstElementChild;
  const height = Number(card.dataset.offerVirtualHeight) || 0;
  if (!replacement) return card;
  offersCardsObserver?.unobserve(card);
  card.replaceWith(replacement);
  if (height) {
    replacement.style.minHeight = `${height}px`;
    requestAnimationFrame(() => { replacement.style.minHeight = ''; replacement.style.height = ''; });
  }
  offersCardsObserver?.observe(replacement);
  activateOfferCard(replacement);
  return replacement;
}
function ensureOffersVirtualizer() {
  if (offersCardsObserver || !('IntersectionObserver' in window)) return;
  offersCardsObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const card = entry.target;
    if (!card.isConnected) { offersCardsObserver?.unobserve(card); return; }
    if (entry.isIntersecting) {
      if (card.dataset.offerVirtualized === 'true') restoreOfferCard(card);
      else activateOfferCard(card);
    } else virtualizeOfferCard(card);
  }), { root: null, rootMargin: '900px 0px 900px 0px', threshold: 0 });
}
function observeOfferCards(cards) {
  if (!Array.isArray(cards) || !cards.length) return;
  if (!('IntersectionObserver' in window)) { cards.forEach(activateOfferCard); return; }
  ensureOffersVirtualizer();
  cards.forEach(card => offersCardsObserver.observe(card));
}
function bindOffersGridEvents() {
  const grid = $('offersGrid');
  if (!grid || grid.dataset.eventsBound === 'true') return;
  grid.dataset.eventsBound = 'true';
  grid.addEventListener('click', event => {
    const action = event.target.closest('[data-offer-action]');
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const id = action.dataset.productId;
      if (action.dataset.offerAction === 'favorite') toggleFav(id);
      else addToCart(id, 1);
      return;
    }
    const card = event.target.closest('[data-offer-card]');
    if (card && card.dataset.offerVirtualized !== 'true') openProductModal(card.dataset.offerCard);
  });
  grid.addEventListener('keydown', event => {
    const card = event.target.closest('[data-offer-card]');
    if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openProductModal(card.dataset.offerCard);
    }
  });
}
function observeOffersSentinel() {
  const sentinel = $('offersSentinel');
  if (!sentinel || !offersHasMore || !('IntersectionObserver' in window)) return;
  offersSentinelObserver?.disconnect();
  offersSentinelObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting) || offersPageInFlight) return;
    offersSentinelObserver?.disconnect();
    loadNextOffersPage().catch(error => { console.error('[Ecomme ofertas] Falha no próximo lote:', error); addOffersSentinel(); });
  }, { root: null, rootMargin: '850px 0px', threshold: 0 });
  offersSentinelObserver.observe(sentinel);
}
function addOffersSentinel() {
  const grid = $('offersGrid');
  if (!grid) return;
  grid.querySelector('#offersSentinel')?.remove();
  if (!offersHasMore) return;
  const sentinel = document.createElement('div');
  sentinel.id = 'offersSentinel';
  sentinel.className = 'offers-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  grid.appendChild(sentinel);
  observeOffersSentinel();
}

function renderOffers({ append = false, addedProducts = null } = {}) {
  const grid = $('offersGrid');
  if (!grid) return;
  const query = String($('searchInput')?.value || '').trim().toLowerCase();
  const matchesClient = product => {
    const category = String(product.cat || '').toLowerCase();
    const matchesSearch = !query || product.name.toLowerCase().includes(query) || product.desc.toLowerCase().includes(query) || category.includes(query);
    let matchesFilter = true;
    if (currentDealFilter === 'discount20') matchesFilter = product.discount >= 20;
    else if (currentDealFilter === 'frete') matchesFilter = product.shipping;
    else if (currentDealFilter === 'novidades') matchesFilter = product.badge === 'new' || product.badge.includes('novo');
    else if (currentDealFilter === 'avaliados') matchesFilter = product.rating >= 4 && product.reviews > 0;
    return matchesSearch && matchesFilter;
  };
  const source = append && Array.isArray(addedProducts) ? addedProducts : offers;
  const list = source.filter(matchesClient);
  if ($('offersCount')) $('offersCount').textContent = offersHasMore
    ? `${offers.length.toLocaleString('pt-BR')} de ${offersTotalCount.toLocaleString('pt-BR')} ofertas`
    : `${offersTotalCount.toLocaleString('pt-BR')} ${offersTotalCount === 1 ? 'oferta' : 'ofertas'}`;
  grid.setAttribute('aria-busy', 'false');
  if (!list.length && !append) {
    offersSentinelObserver?.disconnect();
    offersCardsObserver?.disconnect();
    offersSentinelObserver = null;
    offersCardsObserver = null;
    const hasOffers = offersTotalCount > 0;
    grid.innerHTML = `<div class="empty"><div class="empty-ico">${hasOffers ? '🔎' : '🏷️'}</div><h3>${hasOffers ? 'Nenhuma oferta encontrada' : 'Nenhuma oferta ativa no momento'}</h3><p>${hasOffers ? 'Tente outro termo ou ajuste os filtros.' : 'Os produtos aparecerão aqui quando tiverem um desconto válido cadastrado.'}</p><button class="btn-clear" type="button" onclick="clearFilters()">Limpar filtros</button></div>`;
    return;
  }
  if (!append) {
    offersSentinelObserver?.disconnect();
    offersCardsObserver?.disconnect();
    offersSentinelObserver = null;
    offersCardsObserver = null;
    grid.innerHTML = '';
  } else grid.querySelector('#offersSentinel')?.remove();

  const template = document.createElement('template');
  template.innerHTML = list.map((product, index) => offerCardHtml(product, append ? offers.length - list.length + index : index)).join('');
  const cards = [...template.content.querySelectorAll('[data-offer-card]')];
  grid.appendChild(template.content);
  observeOfferCards(cards);
  bindOffersGridEvents();
  addOffersSentinel();
}

function clearFilters() {
  if ($('searchInput')) $('searchInput').value = '';
  if ($('headerSearch')) $('headerSearch').value = '';
  currentDealFilter = 'todos';
  document.querySelectorAll('.dchip').forEach(chip => chip.classList.toggle('active', chip.dataset.type === 'todos'));
  if ($('sortSelect')) $('sortSelect').value = 'discount';
  scheduleOffersReset(0);
}

const offersRandomSeed = `ecomme-offers-v1-${new Date().toISOString().slice(0, 10)}`;
function parseOffersPage(data) {
  const rows = Array.isArray(data) ? data : [];
  const pageRows = rows.slice(0, OFFERS_PAGE_SIZE);
  const items = pageRows.map(row => normalizeOfferProduct(row?.product || row)).filter(product => product.id && product.id !== 'undefined' && isRealOffer(product));
  const last = pageRows[pageRows.length - 1];
  return {
    items,
    hasMore: rows.length > OFFERS_PAGE_SIZE,
    totalCount: Number(pageRows[0]?.total_count ?? 0) || 0,
    cursor: last ? { value: last.cursor_value ?? null, id: String(last.cursor_id ?? last.product?.id ?? last.id) } : null
  };
}
function offersPageUrl(cursor = null) {
  const params = new URLSearchParams({ mode: 'offers', sort: $('sortSelect')?.value || 'discount', limit: String(OFFERS_PAGE_SIZE + 1), seed: offersRandomSeed });
  const search = String($('searchInput')?.value || '').trim().slice(0, 120);
  if (search) params.set('search', search);
  if (currentDealFilter !== 'todos') params.set('tag', currentDealFilter);
  if (cursor?.value != null) params.set('cursor_value', String(cursor.value));
  if (cursor?.id != null) params.set('cursor_id', String(cursor.id));
  return `/api/catalog?${params.toString()}`;
}
async function requestOffersPage(cursor = null) {
  try {
    const response = await fetch(offersPageUrl(cursor), { credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (response.ok) return parseOffersPage(await response.json());
    if (![404, 503].includes(response.status)) throw new Error(`Catálogo de ofertas HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  } catch (error) {
    if (!(error instanceof TypeError) && !/Failed to fetch|NetworkError/i.test(String(error?.message || ''))) throw error;
  }
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('ecomme_marketplace_catalog_page', {
    p_mode: 'offers', p_search: String($('searchInput')?.value || '').trim().slice(0, 120) || null,
    p_sort: $('sortSelect')?.value || 'discount', p_cursor_value: cursor?.value ?? null,
    p_cursor_id: cursor?.id ?? null, p_limit: OFFERS_PAGE_SIZE + 1, p_seed: offersRandomSeed,
    p_category: null, p_tag: currentDealFilter === 'todos' ? null : currentDealFilter,
    p_min_price: null, p_max_price: null, p_min_rating: null, p_colors: null
  });
  if (error) throw error;
  return parseOffersPage(data);
}
function mergeOffersProducts(items) {
  const byId = new Map(products.map(item => [String(item.id), item]));
  items.forEach(item => { byId.set(String(item.id), item); offersById.set(String(item.id), item); });
  products = [...byId.values()];
}
async function resetOffersCatalog({ showSkeleton = true } = {}) {
  const requestVersion = ++offersRequestVersion;
  offersPageInFlight = null;
  offersSentinelObserver?.disconnect();
  offersCardsObserver?.disconnect();
  offersHasMore = false;
  offersCursor = null;
  offersTotalCount = 0;
  offers = [];
  offersById.clear();
  products = [...cart, ...fav].filter((item, index, list) => list.findIndex(other => String(other.id) === String(item.id)) === index);
  if (showSkeleton) showOffersSkeleton();
  const page = await requestOffersPage(null);
  if (requestVersion !== offersRequestVersion) return false;
  offers = page.items;
  offersHasMore = page.hasMore;
  offersCursor = page.cursor;
  offersTotalCount = page.totalCount;
  offersLastUpdated = new Date();
  mergeOffersProducts(offers);
  updateOfferStats();
  renderOffers();
  return true;
}
async function loadNextOffersPage() {
  if (!offersHasMore || offersPageInFlight) return false;
  const requestVersion = offersRequestVersion;
  const cursor = offersCursor ? { ...offersCursor } : null;
  const pending = requestOffersPage(cursor);
  offersPageInFlight = pending;
  try {
    const page = await pending;
    if (requestVersion !== offersRequestVersion) return false;
    const known = new Set(offers.map(item => String(item.id)));
    const fresh = page.items.filter(item => !known.has(String(item.id)));
    offersHasMore = page.hasMore;
    offersCursor = page.cursor;
    offersTotalCount = page.totalCount || offersTotalCount;
    if (fresh.length) {
      offers.push(...fresh);
      mergeOffersProducts(fresh);
      renderOffers({ append: true, addedProducts: fresh });
    } else addOffersSentinel();
    updateOfferStats();
    return true;
  } finally {
    if (offersPageInFlight === pending) offersPageInFlight = null;
  }
}
function scheduleOffersRealtimeRefresh(delay = 550) {
  clearTimeout(offersRealtimeRefreshTimer);
  offersRealtimeRefreshTimer = setTimeout(() => resetOffersCatalog({ showSkeleton: false }).catch(error => console.warn('[Ecomme ofertas] Falha na revalidação:', error)), delay);
}
async function loadSavedProductDetails() {
  const client = getSupabaseClient();
  if (!client) return;
  const ids = [...new Set([...cart, ...fav].map(item => String(item.id)).filter(Boolean))];
  const missing = ids.filter(id => !products.some(item => String(item.id) === id));
  if (!missing.length) return;
  try {
    const { data, error } = await client.from('products').select('*').in('id', missing);
    if (error) throw error;
    mergeOffersProducts((data || []).map(normalizeOfferProduct));
  } catch (error) {
    console.warn('[Ecomme ofertas] Não foi possível carregar detalhes dos produtos salvos:', error);
  }
}

async function loadProductsFromSupabase() {
  try { return await resetOffersCatalog({ showSkeleton: false }); }
  catch (error) {
    console.error('[Ecomme ofertas] Erro ao carregar ofertas paginadas:', error);
    products = [];
    offers = [];
    return false;
  }
}

// ── SYNC CART AND WISHLIST WITH SUPABASE ──
async function syncToSupabase() {
  const client = getSupabaseClient();
  const id = currentUserId();
  if (!client || !id) return;
  const payload = { cart };
  if (!window.EcommeWishlists) payload.fav = fav;
  const { error } = await client.from('profiles').update(payload).eq('id', id);
  if (error) console.error('[Ecomme ofertas] Erro ao sincronizar dados com o Supabase:', error);
}

// ── LOAD DATA FROM SUPABASE AFTER PAGE LOAD ──
async function loadFromSupabase() {
  const client = getSupabaseClient();
  const id = currentUserId();
  if (!client || !id) return;
  const { data, error } = await client.from('profiles').select('cart,fav').eq('id', id).maybeSingle();
  if (error) {
    console.error('[Ecomme ofertas] Erro ao carregar carrinho:', error);
    return;
  }
  if (!data) return;
  if (Array.isArray(data.cart)) cart = data.cart;
  if (!window.EcommeWishlists && Array.isArray(data.fav)) fav = data.fav;
  await loadSavedProductDetails();
  updateCart();
  if (!window.EcommeWishlists) updateFav();
}

// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
    .modal-alert-container {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .modal-alert-container.active {
      opacity: 1; pointer-events: auto;
    }
    .modal-alert-content {
      background: #fff;
      padding: 30px;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transform: scale(0.8);
      transition: transform 0.3s ease;
    }
    .modal-alert-container.active .modal-alert-content {
      transform: scale(1);
    }
    .modal-alert-icon {
      font-size: 44px;
      margin-bottom: 15px;
    }
    .modal-alert-content h3 {
      margin: 0 0 10px 0;
      font-family: 'Sora', 'Poppins', sans-serif;
      color: #10161a;
      font-size: 20px;
      font-weight: 700;
    }
    .modal-alert-content p {
      color: #707c8a;
      font-size: 14.5px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .modal-alert-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-alert-confirm {
      background: #2563EB;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }
    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
      border: none;
      padding: 11px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-cancel:hover {
      background: #d1d5db;
    }
  `;
  document.head.appendChild(style);
}

// ── POP-UP WARNING ──
async function showAlert(message, title, icon) {
  injectModalStyles();
  let modal = document.getElementById('alertModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'modal-alert-container';
    modal.innerHTML = '<div class="modal-alert-content"><div class="modal-alert-icon" id="alertIcon"></div><h3 id="alertTitle"></h3><p id="alertMsg"></p><div class="modal-alert-buttons"><button class="btn-alert-confirm" onclick="closeAlert()">OK</button></div></div>';
    document.body.appendChild(modal);
  }
  $('alertIcon').textContent = icon || 'ℹ️';
  $('alertTitle').textContent = title || 'Atenção';
  $('alertMsg').textContent = message || '';
  modal.offsetHeight;
  modal.classList.add('active');
}

async function showAuth(message, title, icon) {
  injectModalStyles();
  let modal = document.getElementById('authModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'modal-alert-container';
    modal.innerHTML = '<div class="modal-alert-content"><div class="modal-alert-icon" id="authIcon"></div><h3 id="authTitle"></h3><p id="authMsg"></p><div class="modal-alert-buttons"><button class="btn-alert-cancel" onclick="closeAuth()">Cancelar</button><button class="btn-alert-confirm" onclick="goToLogin()">Fazer Login</button></div></div>';
    document.body.appendChild(modal);
  }
  $('authIcon').textContent = icon || '🔒';
  $('authTitle').textContent = title || 'Conta necessária';
  $('authMsg').textContent = message || '';
  modal.offsetHeight;
  modal.classList.add('active');
}
function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

function closeAuth() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.classList.remove('active');
  }
}
  
//--------------------------------------------------------
async function loadOffersFromSupabase() {
  offers = offers.filter(isRealOffer);
  offersLastUpdated = new Date();
  updateOfferStats();
  renderOffers();
}

async function refreshOffersFromDatabase() {
  return resetOffersCatalog({ showSkeleton: false });
}

async function retryLoadOffers() {
  showOffersSkeleton();
  try {
    await Promise.all([resetOffersCatalog({ showSkeleton: false }), loadOfferStats()]);
  } catch (error) {
    console.error('[Ecomme ofertas] Falha ao recarregar:', error);
    showOffersError('O Supabase não retornou as ofertas. Tente novamente.');
  }
}

function handleOfferRealtime(message, eventType) {
  const payload = message?.payload || message || {};
  const record = payload.new || payload.record || null;
  const oldRecord = payload.old || null;
  const id = String(record?.id ?? oldRecord?.id ?? '');
  if (!id) { scheduleOffersRealtimeRefresh(); return; }
  offersLastRealtimeAt = Date.now();
  const existingIndex = offers.findIndex(item => String(item.id) === id);
  if (eventType === 'DELETE') {
    if (existingIndex >= 0) {
      offers.splice(existingIndex, 1);
      offersById.delete(id);
      products = products.filter(item => String(item.id) !== id || cart.some(cartItem => String(cartItem.id) === id) || fav.some(favItem => String(favItem.id) === id));
      renderOffers();
      scheduleOffersRealtimeRefresh(900);
    }
    return;
  }
  if (!record?.id) { scheduleOffersRealtimeRefresh(); return; }
  const normalized = normalizeOfferProduct(record);
  if (existingIndex >= 0) {
    if (isRealOffer(normalized)) {
      offers[existingIndex] = normalized;
      offersById.set(id, normalized);
      mergeOffersProducts([normalized]);
      renderOffers();
    } else {
      offers.splice(existingIndex, 1);
      offersById.delete(id);
      renderOffers();
    }
    scheduleOffersRealtimeRefresh(900);
    return;
  }
  if (isRealOffer(normalized)) scheduleOffersRealtimeRefresh();
}

function startOffersRealtime() {
  const client = getSupabaseClient();
  if (!client?.channel || offersChannel) return;
  try {
    offersChannel = client.channel('catalog:products')
      .on('broadcast', { event: 'INSERT' }, message => handleOfferRealtime(message, 'INSERT'))
      .on('broadcast', { event: 'UPDATE' }, message => handleOfferRealtime(message, 'UPDATE'))
      .on('broadcast', { event: 'DELETE' }, message => handleOfferRealtime(message, 'DELETE'))
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[Ecomme ofertas] Broadcast indisponível; a revalidação por visibilidade continuará ativa.');
      });
  } catch (error) {
    console.warn('[Ecomme ofertas] Não foi possível iniciar Broadcast:', error);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - offersLastRealtimeAt > 90000) {
      scheduleOffersRealtimeRefresh(150);
      loadOfferStats();
    }
  });
}
/* ─── MODAL ──────────────────────────────────────────────────────────── */
function openProductModal(id) {
  const product = offers.find(item => String(item.id) === String(id)) || products.find(item => String(item.id) === String(id));
  if (!product) {
    console.warn('[Ecomme ofertas] Produto não encontrado:', id);
    return;
  }
  currentProduct = String(id);
  const image = getOfferImage(product);
  const imageContainer = $('mEmoji');
  if (imageContainer) imageContainer.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" class="offer-modal-product-image">` : escapeHtml(product.emoji || '📦');
  if ($('mCat')) $('mCat').textContent = product.cat || 'Produto';
  if ($('mName')) $('mName').textContent = product.name;
  if ($('mPrice')) $('mPrice').textContent = fmt(product.price);
  if ($('mOld')) $('mOld').textContent = product.old > product.price ? fmt(product.old) : '';
  if ($('mDisc')) $('mDisc').textContent = product.discount ? `-${product.discount}% OFF` : '';
  if ($('mDesc')) $('mDesc').textContent = product.desc || 'Sem descrição disponível.';
  if ($('mWish')) $('mWish').classList.toggle('on', isSavedToWishlist(id));
  if ($('modalOverlay')) $('modalOverlay').classList.add('on');
}

function handleModalClick(event) { if (event.target === $('modalOverlay')) closeModal(); }
function closeModal() { if ($('modalOverlay')) $('modalOverlay').classList.remove('on'); }
function addFromModal() { if (!currentProduct) return; if (!addToCart(currentProduct, 1)) return; closeModal(); openCart(); }
function addFromModal2() { if (!currentProduct) return; toggleFav(currentProduct); closeModal(); }
function chgQty(change) { mQtyVal = Math.max(1, mQtyVal + Number(change || 0)); if ($('mQty')) $('mQty').textContent = mQtyVal; }

// TOAST
function showToast(message) {
  const toastElement = $('toast');
  const messageElement = $('toastMsg');
  if (!toastElement || !messageElement) return;
  messageElement.textContent = message;
  toastElement.classList.add('show');
  setTimeout(() => toastElement.classList.remove('show'), 2800);
}
function toast(message) { showToast(message); }

// LOGOUT
const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() {
  const client = getSupabaseClient();
  if (!client?.auth) return showToast('Não foi possível acessar a sessão da conta.');
  try {
    showToast('Saindo da conta... 👋');
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    closeAcc();
    showToast('Você saiu da conta.');
    await waitt(700);
    window.location.reload();
  } catch (error) {
    console.error('[Ecomme ofertas] Erro ao sair da conta:', error);
    showToast('Não foi possível sair da conta. Tente novamente.');
  }
}

// Expõe somente as funções utilizadas pelos onclick/onchange do HTML e pelos templates.
Object.assign(window, {
  buttonLink, goToLogin, searchFor, handleOfferSearch, initHeaderAuthListener,
  addToCart, removeFromCart, changeCartQty, updateCart, openCart, closeCart, checkout,
  toggleFav, addToFav, removeFromFav, changeFavQty, updateFav, openFav, closeFav, addAllFavToCart, moveFromCartToFav,
  openNotif, closeNotif, openMore, closeMore, openAcc, closeAcc,
  setDealFilter, renderOffers, clearFilters, retryLoadOffers, setOfferSort: () => scheduleOffersReset(0),
  showAlert, showAuth, closeAlert, closeAuth,
  openProductModal, handleModalClick, closeModal, addFromModal, addFromModal2, chgQty,
  showToast, toast, doLogout
});

})();

