// FAVICON
const favicon = document.getElementById('favicon');
function verificarTema(e) {
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}
const mqEscuro = window.matchMedia('(prefers-color-scheme: dark)');
verificarTema(mqEscuro);
mqEscuro.addEventListener('change', verificarTema);

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

/* ─── SEARCH ─────────────────────────────────────────────────────────── */
function searchFor(term) {
  if ($('heroSearch')) $('heroSearch').value = term;
  if ($('headerSearch')) $('headerSearch').value = term;
  renderProducts();
}

/* ─── SUPABASE ──────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('authLoginBtn');
  const profileContainer = document.getElementById('headerProfileContainer');
  const headerImage = document.getElementById('headerAvatar');

  await loadProductsFromSupabase();
  await loadOffersFromSupabase();
  
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  let shuffled = [...products];

  if (!user || userError) {
    console.warn("User session not active.");
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileContainer) profileContainer.classList.add('hidden');
    injectPrefetch('/login');
    return;
  }
  userId = user.id;
  await loadFromSupabase();

  if (loginBtn) loginBtn.classList.add('hidden');
  if (profileContainer) profileContainer.classList.remove('hidden');

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profileError && profile) {
    const fullName = profile.full_name || "Cliente";
    const email = user.email || "";

    if ($('accSidebarName')) $('accSidebarName').textContent = fullName;
    if ($('accSidebarEmail')) $('accSidebarEmail').textContent = email;
    if (profile.avatar_url && $('accSidebarAvatar')) {
      $('accSidebarAvatar').src = profile.avatar_url;
    }

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const photoUrl = profile.avatar_url || "";

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;

    if (photoUrl) {
      const sidebarImage = document.getElementById('sidebarAvatar');

      if (sidebarImage) {
        sidebarImage.src = photoUrl;
        sidebarImage.style.filter = "none";
        sidebarImage.style.width = "100%";
        sidebarImage.style.height = "100%";
        sidebarImage.style.borderRadius = "100%";
        sidebarImage.style.objectFit = "cover";
      }
      if (headerImage) {
        headerImage.src = photoUrl;
        headerImage.style.filter = "none";
        headerImage.style.width = "100%";
        headerImage.style.height = "100%";
        headerImage.style.borderRadius = "100%";
        headerImage.style.objectFit = "cover";
      }
    }
  }
});

// HEADER
function initHeaderAuthListener() {
  const loginBtn = document.getElementById('authLoginBtn');
  const profileContainer = document.getElementById('headerProfileContainer');
  const bellBtn = document.getElementById('bellBtn');
  const headerAvatar = document.getElementById('headerAvatar');

  if (!loginBtn || !profileContainer) return;
  
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      loginBtn.classList.add('hidden');
      bellBtn.classList.remove('hidden');
      profileContainer.classList.remove('hidden');

      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profileData && profileData.avatar_url) {
          headerAvatar.src = profileData.avatar_url;
        } else {
          headerAvatar.src = "/images/icons/full/user.webp";
        }
      } catch (err) {
        console.error("Erro ao carregar o avatar do header:", err);
      }
    } else {
      loginBtn.classList.remove('hidden');
      profileContainer.classList.add('hidden');
      bellBtn.classList.add('hidden');
      if (headerAvatar) headerAvatar.src = "/images/icons/full/user.webp";
    }
  });
}
initHeaderAuthListener();

/*
function updateHeaderContrast() {
  const header = document.querySelector("header");
  const sampleY = header.offsetHeight + 10;
  const x = window.innerWidth / 2;
  const el = document.elementFromPoint(x, sampleY);

  if (!el) return;
  const style = getComputedStyle(el);
  const bg = style.backgroundColor;
  const rgb = bg.match(/\d+/g);

  if (!rgb) return;
  const r = Number(rgb[0]);
  const g = Number(rgb[1]);
  const b = Number(rgb[2]);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (brightness < 90) {
    header.classList.add("dark-glass");
  } else {
    header.classList.remove("dark-glass");
  }
}
window.addEventListener("scroll", updateHeaderContrast);
window.addEventListener("resize", updateHeaderContrast);
updateHeaderContrast();
*/

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart = [];
let fav = [];
let curId = null;
let mQtyVal = 1;
let view = 'grid';
let shuffled = [...products];

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt = p => 'R$ ' + p.toFixed(2).replace('.', ',');
const $ = id => document.getElementById(id);

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
    return;
  }
  const p = products.find(x => String(x.id) === String(id)) || offers.find(x => String(x.id) === String(id));
  
  if (!p) return;
  const ex = cart.find(x => String(x.id) === String(id));
  if (ex) ex.qty += qty; else cart.push({ ...p, qty });
  updateCart();
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
  syncToSupabase();
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCart();
  syncToSupabase();
}

function changeCartQty(id, d) {
  const item = cart.find(x => x.id === id);
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
  
  el.innerHTML = cart.map(item => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <div class="ci-qty">
          <button class="qb" onclick="changeCartQty(${item.id},-1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="changeCartQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="del" onclick="removeFromCart(${item.id})" title="Remover do Carrinho">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
      <button class="cart-item-towish" onclick="moveFromCartToFav(${item.id})" title="Adicionar à Lista de Desejos">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>`).join('');
    
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
  fav = fav.filter(x => x.id !== id);
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
  const total = fav.reduce((s, i) => s + i.price * i.qty, 0);
  const count = fav.reduce((s, i) => s + i.qty, 0);
  
  $('wishBadge').textContent = count;
  $('wishBadge').style.display = count > 0 ? 'flex' : 'none';
  $('favCount').textContent = `(${count})`;
  $('favTotal').textContent = fmt(total);

  const el = $('favItems');
  if (!fav.length) {
    el.innerHTML = `<div class="fav-empty-st"><span>🛒</span><p>Nenhum produto salvo no momento</p></div>`;
    return;
  }
  
  el.innerHTML = fav.map(item => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <button class="btn-madd" onclick="addToCart(${item.id}, 1); removeFromFav(${item.id}); showToast('Adicionado ao carrinho! 🛒'); closeFav(); openCart(); renderProducts();">
          <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Adicionar ao Carrinho
        </button>
      </div>
      <button class="del" onclick="removeFromFav(${item.id}); renderProducts();">
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
  closeMore();
  closeCart();
  closeNotif();
  closeAcc();
  $('favSidebar').classList.add('on');
  $('favOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeFav() {
  $('favSidebar').classList.remove('on');
  $('favOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

function addAllFavToCart() {
  if (!fav.length) { showToast('Adicione produtos primeiro! 😊'); return; }

  fav.forEach(produto => {
    addToCart(produto.id, 1);
  });
  fav = [];
  updateFav();
  renderProducts();
  closeFav();
  openCart();
  showToast('Todos os itens foram para o carrinho! 🛒');
}

function moveFromCartToFav(id) {
  addToFav(id, 1);
  showToast('Produto adicionado à Lista de Desejos! ❤️');
}

/* ─── NOTIFICATION ───────────────────────────────────────────────── */
function openNotif() {
  closeCart();
  closeFav();
  closeAcc();
  closeMore();
  if (typeof closeMore === 'function') closeMore();
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
  if (typeof closeMore === 'function') closeNotif();
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

/* ─── COUNTDOWN (hero master timer, resets daily at midnight) ───────── */
function updateHeroCountdown() {
  const now = new Date();
  const end = new Date(now); end.setHours(23,59,59,0);
  const diff = end - now;
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
  $('cdH').textContent = String(h).padStart(2,'0');
  $('cdM').textContent = String(m).padStart(2,'0');
  $('cdS').textContent = String(s).padStart(2,'0');
}
setInterval(updateHeroCountdown, 1000);
updateHeroCountdown();

/* ─── PER-CARD COUNTDOWN ─────────────────────────────────────────────── */
const startTime = Date.now();
function fmtCardCountdown(endsInMin) {
  const elapsedMs = Date.now() - startTime;
  const totalMs = endsInMin * 60000 - elapsedMs;
  if (totalMs <= 0) return '00:00:00';
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  if (h > 0) return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function tickCardCountdowns() {
  document.querySelectorAll('.oc-cd-time[data-ends]').forEach(el => {
    const ends = parseFloat(el.dataset.ends);
    el.textContent = fmtCardCountdown(ends);
  });
}
setInterval(tickCardCountdowns, 1000);

/* ─── DEAL FILTER ────────────────────────────────────────────────────── */
function setDealFilter(btn, type) {
  document.querySelectorAll('.dchip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  currentDealFilter = type;
  renderOffers();
}

/* ─── RENDER ─────────────────────────────────────────────────────────── */
const stars = r => '★'.repeat(Math.floor(r)) + '☆'.repeat(5-Math.floor(r));

function renderOffers() {
  const q = $('searchInput').value.toLowerCase().trim();
  const sort = $('sortSelect').value;

  let list = offers.filter(o => {
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.cat.toLowerCase().includes(q);
    const matchType = currentDealFilter === 'todos'
      || (currentDealFilter === 'frete' ? o.freeShip : o.type === currentDealFilter);
    return matchQ && matchType;
  });

  if (sort === 'price_asc') list.sort((a,b)=>a.price-b.price);
  else if (sort === 'price_desc') list.sort((a,b)=>b.price-a.price);
  else if (sort === 'rating') list.sort((a,b)=>b.rating-a.rating);
  else if (sort === 'ending') list.sort((a,b)=>a.endsInMin-b.endsInMin);
  else list.sort((a,b)=>b.discount-a.discount);

  $('offersCount').textContent = `${list.length} oferta${list.length!==1?'s':''}`;
  $('statActive').textContent = list.length;

  const grid = $('offersGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty">
      <div class="empty-ico">🔍</div>
      <h3>Nenhuma oferta encontrada</h3>
      <p>Tente outro termo ou <button class="btn-clear" onclick="clearFilters()">limpar os filtros</button></p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map((o, i) => {
    const inW = fav.some(x => String(x.id) === String(o.id));
    
    const typeBadge = o.type === 'flash'
      ? `<div class="oc-type-badge flash"><span class="lg">⚡</span> Relâmpago</div>`
      : o.type === 'daily'
      ? `<div class="oc-type-badge daily">☀️ Do Dia</div>`
      : `<div class="oc-type-badge combo">📦 Combo</div>`;
    const claimedClass = o.claimed >= 85 ? '' : 'warm';
    
    return `
      <div class="ocard" style="animation-delay:${i*0.04}s" onclick="openProductModal('${o.id}')">
        <div class="oc-img-wrap">
          <div class="oc-img">${o.emoji}</div>
          <div class="oc-disc-badge">-${o.discount}%<small>OFF</small></div>
          ${typeBadge}
          <button class="oc-wish ${inW ? 'on' : ''}" onclick="event.stopPropagation(); toggleFav(${o.id})">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <div class="oc-actions">
            <button class="btn-oc-cart" onclick="event.stopPropagation(); addToCart('${o.id}')">
              <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Adicionar
            </button>
          </div>
        </div>
        <div class="oc-info">
          <div class="oc-cat">${o.cat}</div>
          <div class="oc-name">${o.name}</div>
          <div class="oc-rating"><span class="oc-stars">${stars(o.rating)}</span><span class="oc-rcount">(${o.reviews.toLocaleString('pt-BR')})</span></div>
          <div class="oc-price-row"><span class="oc-price">${fmt(o.price)}</span><span class="oc-old">${fmt(o.old)}</span></div>
          <div class="oc-cd">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Termina em <span class="oc-cd-time" data-ends="${o.endsInMin}">${fmtCardCountdown(o.endsInMin)}</span>
          </div>
          <div class="oc-stock-wrap">
            <div class="oc-stock-track"><div class="oc-stock-fill ${claimedClass}" style="--tw:${o.claimed}%"></div></div>
            <div class="oc-stock-txt"><span><strong>${o.claimed}%</strong> vendido</span><span>Estoque limitado</span></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function clearFilters() {
  $('searchInput').value = '';
  currentDealFilter = 'todos';
  document.querySelectorAll('.dchip').forEach(c => c.classList.remove('active'));
  document.querySelector('.dchip[data-type="todos"]').classList.add('active');
  renderOffers();
}

//--------------------------------------------------------
async function loadProductsFromSupabase() {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos do banco:", error);
    return;
  }

  if (data) {
    products = data;
    shuffled = [...products];
  }
}

// ── SYNC CART AND WISHLIST WITH SUPABASE ──
async function syncToSupabase() {
  if (!userId) return;
  
const currentFav = fav;
const currentCart = cart;

const { error } = await supabaseClient
.from("profiles")
.update({
    cart: currentCart,
    fav: currentFav
})
.eq("id", userId);

  if (error) {
    console.error("Erro ao sincronizar dados com o Supabase:", error);
  }
}

// ── LOAD DATA FROM SUPABASE AFTER PAGE LOAD ──
async function loadFromSupabase() {
  if (!userId) return;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('cart, fav')
    .eq('id', userId)
    .single();

  if (!error && data) {
    if (data.cart) {
      cart = data.cart;
    }
    
    if (data.fav) {
      fav = data.fav;
    }

    if (typeof updateCart === 'function') updateCart();
    if (typeof updateFav === 'function') updateFav(); 
  }
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
  
  let alertModal = document.getElementById('alertModal');
  
  if (!alertModal) {
    alertModal = document.createElement('div');
    alertModal.id = 'alertModal';
    alertModal.className = 'modal-alert-container';
    alertModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="alertIcon">${icon}</div>
        <h3 id="alertTitle">${title}</h3>
        <p id="alertMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-confirm" onclick="closeAlert()">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(alertModal);
  } else {

    document.getElementById('alertMsg').textContent = message;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertIcon').textContent = icon;
  }
  
  alertModal.offsetHeight;
  alertModal.classList.add('active');
}

// ── POP-UP AUTH ──
async function showAuth(message, title, icon) { 
  injectModalStyles();
  
  let authModal = document.getElementById('authModal');
  
  if (!authModal) {
    authModal = document.createElement('div');
    authModal.id = 'authModal';
    authModal.className = 'modal-alert-container';
    authModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="authIcon">${icon}</div>
        <h3 id="authTitle">${title}</h3>
        <p id="authMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeAuth()">Cancelar</button>
          <button class="btn-alert-confirm" onclick="buttonLink('/login')">Fazer Login</button>
        </div>
      </div>
    `;
    document.body.appendChild(authModal);
  } else {
    
    document.getElementById('authMsg').textContent = message;
    document.getElementById('authTitle').textContent = title;
    document.getElementById('authIcon').textContent = icon;
  }
  
  authModal.offsetHeight;
  authModal.classList.add('active');
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
  const { data, error } = await supabaseClient
    .from('offers')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error("Erro ao carregar ofertas do banco:", error);
    return;
  }

  if (data) {
    offers = data;
    renderOffers();
  }
}

/* ─── MODAL ──────────────────────────────────────────────────────────── */
function openProductModal(id) {
  const o = offers.find(x => String(x.id) === String(id)) || products.find(x => String(x.id) === String(id));
  
  if (!o) {
    console.error("Produto não encontrado para o ID:", id);
    return; 
  }

  currentProduct = id;
  $('mEmoji').textContent = o.emoji;
  $('mCat').textContent = o.cat;
  $('mName').textContent = o.name;
  $('mPrice').textContent = fmt(o.price);
  
  $('mOld').textContent = o.old ? fmt(o.old) : '';
  $('mDisc').textContent = o.discount ? `-${o.discount}% OFF` : '';
  $('mDesc').textContent = o.desc || "Sem descrição disponível.";
  
  if (o.endsInMin) {
    $('mCdText').innerHTML = `Termina em <strong class="oc-cd-time" data-ends="${o.endsInMin}">${fmtCardCountdown(o.endsInMin)}</strong>`;
  } else {
    $('mCdText').innerHTML = ""; 
  }
  
  $('modalOverlay').classList.add('on');
}

function handleModalClick(e) { if (e.target === $('modalOverlay')) closeModal(); }
function closeModal() { $('modalOverlay').classList.remove('on'); }
function addFromModal() { addToCart(currentProduct, 1); closeModal(); openCart(); }

/* ─── LIVE SOLD COUNTER ──────────────────────────────────────────────── */
let soldCount = 1200;
setInterval(() => {
  soldCount += Math.floor(Math.random()*3);
  $('statClaimed').textContent = soldCount >= 1000 ? (soldCount/1000).toFixed(1)+'K' : soldCount;
}, 3500);

/* ─── INIT ───────────────────────────────────────────────────────────── */
renderOffers();

// TOAST
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function toast(msg) {
  showToast(msg);
}

// LOGOUT
const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut({scope: 'local'});
  toast('Você saiu da conta, recarregando a página.', 'info');

  closeAcc();
  await waitt(1000);
  window.location.reload();
}
