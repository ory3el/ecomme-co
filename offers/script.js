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
  const total = offers.length;
  const maxDiscount = offers.reduce((max, item) => Math.max(max, toNumber(item.discount)), 0);
  const freeShipping = offers.filter(item => item.shipping).length;
  if ($('statActive')) $('statActive').textContent = total.toLocaleString('pt-BR');
  if ($('statMaxDiscount')) $('statMaxDiscount').textContent = maxDiscount ? `${maxDiscount}%` : '—';
  if ($('statShipping')) $('statShipping').textContent = freeShipping.toLocaleString('pt-BR');
  if ($('statUpdated')) $('statUpdated').textContent = offersLastUpdated ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(offersLastUpdated) : '—';
  if ($('offersSub')) $('offersSub').textContent = offersLastUpdated ? `Atualizado às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(offersLastUpdated)}` : 'Aguardando catálogo';
}

/* ─── SEARCH ─────────────────────────────────────────────────────────── */
function searchFor(term) {
  if ($('searchInput')) $('searchInput').value = term;
  if ($('headerSearch')) $('headerSearch').value = term;
  renderOffers();
}
function handleOfferSearch(input) {
  const value = input?.value || '';
  if (input?.id === 'headerSearch' && $('searchInput')) $('searchInput').value = value;
  if (input?.id === 'searchInput' && $('headerSearch')) $('headerSearch').value = value;
  renderOffers();
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
  const loaded = await loadProductsFromSupabase();
  if (!loaded) showOffersError('Verifique a conexão com o Supabase e tente novamente.');
  else await loadOffersFromSupabase();
  startOffersRealtime();
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
  renderOffers();
}

function renderOffers() {
  const grid = $('offersGrid');
  if (!grid) return;
  const query = String($('searchInput')?.value || '').trim().toLowerCase();
  const sort = $('sortSelect')?.value || 'discount';
  let list = offers.filter(product => {
    const category = String(product.cat || '').toLowerCase();
    const matchesSearch = !query || product.name.toLowerCase().includes(query) || product.desc.toLowerCase().includes(query) || category.includes(query);
    let matchesFilter = true;
    if (currentDealFilter === 'discount20') matchesFilter = product.discount >= 20;
    else if (currentDealFilter === 'frete') matchesFilter = product.shipping;
    else if (currentDealFilter === 'novidades') matchesFilter = product.badge === 'new';
    else if (currentDealFilter === 'avaliados') matchesFilter = product.rating >= 4 && product.reviews > 0;
    return matchesSearch && matchesFilter;
  });

  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  else list.sort((a, b) => b.discount - a.discount);

  if ($('offersCount')) $('offersCount').textContent = `${list.length.toLocaleString('pt-BR')} ${list.length === 1 ? 'oferta' : 'ofertas'}`;
  grid.setAttribute('aria-busy', 'false');
  if (!list.length) {
    const hasOffers = offers.length > 0;
    grid.innerHTML = `<div class="empty"><div class="empty-ico">${hasOffers ? '🔎' : '🏷️'}</div><h3>${hasOffers ? 'Nenhuma oferta encontrada' : 'Nenhuma oferta ativa no momento'}</h3><p>${hasOffers ? 'Tente outro termo ou ajuste os filtros.' : 'Os produtos aparecerão aqui quando tiverem um desconto válido cadastrado.'}</p><button class="btn-clear" type="button" onclick="clearFilters()">Limpar filtros</button></div>`;
    return;
  }

  grid.innerHTML = list.map((product, index) => {
    const id = escapeHtml(product.id);
    const image = getOfferImage(product);
    const name = escapeHtml(product.name);
    const category = escapeHtml(product.cat || 'Produto');
    const inWishlist = isSavedToWishlist(product.id);
    const oldPrice = product.old > product.price ? `<span class="oc-old">${fmt(product.old)}</span>` : '';
    const savings = product.old > product.price ? `<span class="oc-saving">Economize ${fmt(product.old - product.price)}</span>` : '';
    const shippingBadge = product.shipping ? '<span class="oc-type-badge shipping">🚚 Frete grátis</span>' : (product.badge === 'new' ? '<span class="oc-type-badge daily">Novo</span>' : '<span class="oc-type-badge combo">Oferta verificada</span>');
    const imageMarkup = image ? `<img src="${escapeHtml(image)}" alt="${name}" loading="lazy" decoding="async">` : `<span class="oc-fallback" aria-hidden="true">${escapeHtml(product.emoji)}</span>`;
    const ratingMarkup = product.rating > 0 ? `<div class="oc-rating"><i class="fa-regular fa-star" aria-hidden="true"></i><span>${product.rating.toFixed(1)}</span>${product.reviews > 0 ? `<small>(${product.reviews.toLocaleString('pt-BR')})</small>` : ''}</div>` : '<div class="oc-rating oc-no-rating">Ainda sem avaliações</div>';
    return `<article class="ocard" style="animation-delay:${index * 0.035}s" data-offer-card="${id}" tabindex="0" role="button" aria-label="Ver ${name}">
      <div class="oc-img-wrap"><div class="oc-img">${imageMarkup}</div><span class="oc-disc-badge">-${product.discount}%<small>OFF</small></span>${shippingBadge}<button type="button" class="oc-wish ${inWishlist ? 'on' : ''}" data-offer-action="favorite" data-product-id="${id}" aria-pressed="${inWishlist}" title="${inWishlist ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos'}" aria-label="${inWishlist ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos'}"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button></div>
      <div class="oc-info"><div class="oc-cat">${category}</div><h3 class="oc-name">${name}</h3>${ratingMarkup}<div class="oc-price-row"><span class="oc-price">${fmt(product.price)}</span>${oldPrice}</div>${savings}<button type="button" class="btn-oc-cart" data-offer-action="cart" data-product-id="${id}"><svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Adicionar ao carrinho</button></div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.oc-img img').forEach(image => {
    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'oc-fallback';
      fallback.textContent = '📦';
      image.replaceWith(fallback);
    }, { once: true });
  });
  grid.querySelectorAll('[data-offer-card]').forEach(card => {
    const open = () => openProductModal(card.dataset.offerCard);
    card.addEventListener('click', event => { if (!event.target.closest('button')) open(); });
    card.addEventListener('keydown', event => { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(); } });
  });
  grid.querySelectorAll('[data-offer-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const id = button.dataset.productId;
      if (button.dataset.offerAction === 'favorite') toggleFav(id);
      else addToCart(id, 1);
    });
  });
}

function clearFilters() {
  if ($('searchInput')) $('searchInput').value = '';
  if ($('headerSearch')) $('headerSearch').value = '';
  currentDealFilter = 'todos';
  document.querySelectorAll('.dchip').forEach(chip => chip.classList.toggle('active', chip.dataset.type === 'todos'));
  if ($('sortSelect')) $('sortSelect').value = 'discount';
  renderOffers();
}

//--------------------------------------------------------
async function loadProductsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return false;
  const pageSize = 500;
  const rows = [];
  try {
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client.from('products').select('*').order('id', { ascending: true }).range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    products = rows.map(normalizeOfferProduct).filter(product => product.id && product.id !== 'undefined');
    shuffled = [...products];
    return true;
  } catch (error) {
    console.error('[Ecomme ofertas] Erro ao carregar produtos:', error);
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
  offers = products.filter(isRealOffer);
  offersLastUpdated = new Date();
  updateOfferStats();
  renderOffers();
}

async function refreshOffersFromDatabase() {
  if (offersLoading) return offersLoading;
  offersLoading = (async () => {
    const loaded = await loadProductsFromSupabase();
    if (!loaded) throw new Error('Não foi possível atualizar o catálogo de produtos.');
    await loadOffersFromSupabase();
  })();
  try { await offersLoading; }
  finally { offersLoading = null; }
}

async function retryLoadOffers() {
  showOffersSkeleton();
  try { await refreshOffersFromDatabase(); }
  catch (error) { console.error('[Ecomme ofertas] Falha ao recarregar:', error); showOffersError('O Supabase não retornou os produtos. Tente novamente.'); }
}

function startOffersRealtime() {
  const client = getSupabaseClient();
  if (client?.channel && !offersChannel) {
    try {
      offersChannel = client.channel('ecomme-offers-products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          clearTimeout(offersRefreshTimer);
          offersRefreshTimer = setTimeout(() => refreshOffersFromDatabase().catch(error => console.error('[Ecomme ofertas] Erro na atualização em tempo real:', error)), 500);
        })
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[Ecomme ofertas] Realtime indisponível; a atualização periódica continuará ativa.');
        });
    } catch (error) {
      console.warn('[Ecomme ofertas] Não foi possível iniciar o Realtime:', error);
    }
  }
  if (!offersPollTimer) {
    offersPollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshOffersFromDatabase().catch(error => console.warn('[Ecomme ofertas] Falha na atualização periódica:', error));
    }, 60000);
  }
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
  setDealFilter, renderOffers, clearFilters, retryLoadOffers,
  showAlert, showAuth, closeAlert, closeAuth,
  openProductModal, handleModalClick, closeModal, addFromModal, addFromModal2, chgQty,
  showToast, toast, doLogout
});

})();

