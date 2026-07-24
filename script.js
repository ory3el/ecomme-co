document.body.style.cursor = "default";

function buttonLink(url) {
  window.location.href = url;
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

  const modal = document.getElementById('performanceModal');
  const btnClose = document.getElementById('btnCloseModal');
  const chkNeverShow = document.getElementById('chkNeverShowAgain');
  const hideWarning = localStorage.getItem('hidePerformanceWarning');
  
  if (hideWarning === 'true') {
    return;
  }

  function showModal() {
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show');
    if (chkNeverShow.checked) {
      localStorage.setItem('hidePerformanceWarning', 'true');
    }
  }

  btnClose.addEventListener('click', closeModal);

  let lastTick = performance.now();
  let lagCount = 0;

  const performanceMonitor = setInterval(() => {
    const currentTick = performance.now();
    const delta = currentTick - lastTick;
    lastTick = currentTick;

    if (delta > 1500) {
      lagCount++;
      
      if (lagCount >= 1) {
        showModal();
        clearInterval(performanceMonitor); 
      }
    }
  }, 1000);
  
  await loadProductsFromSupabase();
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

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart        = [];
let fav         = [];
let curId       = null;
let mQtyVal     = 1;
let view        = 'grid';
let shuffled    = [...products];

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt  = p => 'R$ ' + p.toFixed(2).replace('.', ',');
const $    = id  => document.getElementById(id);

function starsHtml(r) {
  let s = '';
  const f = Math.floor(r);
  for (let i = 0; i < f; i++)    s += '★';
  for (let i = f; i < 5; i++)    s += '☆';
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

/* ─── PARTICLES ──────────────────────────────────────────────────────── */
(function spawnParticles() {
  const wrap = $('particles');
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'sb-p';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${3+Math.random()*5}s;--dl:${Math.random()*3}s;opacity:${.3+Math.random()*.6}`;
    wrap.appendChild(p);
  }
})();

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCart(id, qty = 1) {
  if (!userId) {
    showAuth("Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.", "Conta Necessária", "🔒");
    return;
  }
  const p  = products.find(x => x.id === id);
  const ex = cart.find(x => x.id === id);
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
  $('cartSub').textContent   = fmt(total);
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
  renderProducts();
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
function closeCart() { $('cartSidebar').classList.remove('on'); $('cartOverlay').classList.remove('on'); document.body.classList.remove("nobodyscroll"); }

function checkout() {
  if(!cart.length) { showAlert("Para finalizar a compra, é necessário adicionar produtos ao carrinho primeiro!", "Sem Itens no Carrinho", "ℹ️"); return; }
  //if(!cart.length) { showToast('Adicione produtos ao carrinho primeiro! 😊'); return; }
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
  const ex = fav.find(x => x.id === id);
  if (ex) {
    removeFromFav(id);
    showToast('Removido da Lista de Desejos! 💔');
  } else {
    addToFav(id, 1);
  }
  
  if ($('mWish')) {
    $('mWish').classList.toggle('on', fav.some(x => x.id === id));
  }
  syncToSupabase();
}

function addToFav(id, qty = 1) {
  if (!userId) {
    showAuth("Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.", "Conta Necessária", "🔒");
    return;
  }
  const p  = products.find(x => x.id === id);
  const ex = fav.find(x => x.id === id);
  if (ex) ex.qty += qty; else fav.push({ ...p, qty });
  updateFav();
  showToast(`${p.name} salvo nos favoritos! 🛒`);
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
  renderProducts();
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
function closeFav() { $('favSidebar').classList.remove('on'); $('favOverlay').classList.remove('on'); document.body.classList.remove("nobodyscroll"); }

function addAllFavToCart() {
  if (!fav.length) { showToast('Adicione produtos primeiro! 😊'); return; }
  
  fav.forEach(produto => {
    addToCart(produto.id, 1);
  });
  fav = []; 
  updateFav(); 
  renderProducts();
  // saveFav(); 
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
function closeNotif() { $('notifSidebar').classList.remove('on'); $('notifOverlay').classList.remove('on'); document.body.classList.remove("nobodyscroll"); }

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
function closeMore() { $('moreSidebar').classList.remove('on'); $('moreOverlay').classList.remove('on'); document.body.classList.remove("nobodyscroll"); }

/* ─── ACC SIDEBAR ────────────────────────────────────────────────── */
function openAcc() { 
  closeCart();
  closeFav();
  closeNotif();
  closeMore();
  
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if(sb) sb.classList.add('on'); 
  if(ov) ov.classList.add('on'); 
  document.body.classList.add("nobodyscroll"); 
}

function closeAcc() { 
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if(sb) sb.classList.remove('on'); 
  if(ov) ov.classList.remove('on'); 
  document.body.classList.remove("nobodyscroll"); 
}

/* ─── MODAL ──────────────────────────────────────────────────────── */
function openProduct(id) {
  document.body.classList.add("noscroll");
  const p = products.find(x => x.id === id);
  curId   = id;
  mQtyVal = 1;
  $('mQty').textContent    = 1;
  $('mEmoji').textContent  = p.emoji;
  $('mCat').textContent    = p.cat;
  $('mName').textContent   = p.name;
  $('mDesc').textContent   = p.desc;
  $('mPrice').textContent  = fmt(p.price);
  $('mOld').textContent    = fmt(p.old);
  $('mDisc').textContent   = `-${p.discount}% OFF`;
  $('mFeats').innerHTML    = p.features.map(f =>
    `<div class="m-feat"><div class="fchk">✓</div>${f}</div>`).join('');
  $('mWish').classList.toggle('on', fav.some(x => x.id === id));
  $('modalOverlay').classList.add('on');
}

function handleModalClick(e) { if (e.target === $('modalOverlay')) closeModal(); }
function closeModal()        { $('modalOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }
function chgQty(d)           { mQtyVal = Math.max(1, mQtyVal + d); $('mQty').textContent = mQtyVal; }
function addFromModal()      { addToCart(curId, mQtyVal); closeModal(); openCart(); }
function addFromModal2()     { addToFav(curId, mQtyVal); closeModal(); openFav(); }

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

// NEWSLETTER
function handleSubscribe() {
  showToast('Inscrito! Você receberá descontos exclusivos 🎉');
}

// COUNTDOWN
function updateCountdown() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  const diff = end - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cdH').textContent = String(h).padStart(2,'0');
  document.getElementById('cdM').textContent = String(m).padStart(2,'0');
  document.getElementById('cdS').textContent = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

// BACK TO TOP
window.addEventListener('scroll', () => {
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
});

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); closeFav(); closeMore(); closeAcc(); }
});

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
    loadShuffleAndRender();
  }
}

/* ─── SHUFFLE ────────────────────────────────────────────────────────── */
function shuffleAndRender() {
  shuffled = fishYates(products);
  $('sortSelect').value = 'random';
  renderProducts();
  showToast('Produtos embaralhados! 🔀');
}

function loadShuffleAndRender() {
  shuffled = fishYates(products);
  if ($('sortSelect')) {
    $('sortSelect').value = 'random';
  }
  renderProducts();
}

/* ─── RENDER PRODUCTS ────────────────────────────────────────────────── */
function renderProducts() {
  const grid  = $('productsGrid');
  const q =
(
  $('heroSearch')?.value ||
  $('headerSearch')?.value ||
 '').toLowerCase().trim();
  
  const sort  = $('sortSelect').value;

  let list = [...shuffled];

  /* search filter */
  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) || 
      p.desc.toLowerCase().includes(q) ||
      (Array.isArray(p.cat) 
       ? p.cat.some(c => c.toLowerCase().includes(q)) 
       : p.cat.toLowerCase().includes(q))
    );
  }

  /* sort */
  if      (sort === 'price_asc')  list.sort((a, b) => a.price    - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price    - a.price);
  else if (sort === 'rating')     list.sort((a, b) => b.rating   - a.rating);
  else if (sort === 'discount')   list.sort((a, b) => b.discount - a.discount);

  //$('productsCount').textContent = list.length;

  /* empty state */
  if (!list.length) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-ico">🔍</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente outro termo ou
          <button class="btn-clear"
            onclick="$('headerSearch').value='';renderProducts()">
            Limpar busca
          </button>
        </p>
      </div>`;
    return;
  }

  /* render cards */
  grid.innerHTML = list.map(p => {
    const inW = fav.some(x => x.id === p.id);
    const badgeH  = p.badge === 'hot'  ? `<span class="bpill bhot">🔥 Hot</span>`
                  : p.badge === 'new'  ? `<span class="bpill bnew">Novo</span>`
                  :                     `<span class="bpill bsale">-${p.discount}%</span>`;
    const shipH   = p.shipping
      ? `<div class="pfship">
           <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
           Frete Grátis
         </div>`
      : '';

    if (view === 'list') {
      return `
        <div class="pcard" onclick="openProduct(${p.id})">
          <div class="pimg-wrap">
            <div class="pimg">${p.emoji}</div>
            <div class="pbadges">${badgeH}</div>
          </div>
          <div class="pinfo">
            <div class="pinfo">
              <div class="pcat">${Array.isArray(p.cat) ? p.cat.join(', ') : p.cat}</div>
              <div class="pname">${p.name}</div>
            <div class="prating">
              <span class="pstars">${starsHtml(p.rating)}</span>
              <span class="prcnt">${p.rating} (${p.reviews.toLocaleString('pt-BR')} avaliações)</span>
            </div>
            <div style="color:var(--muted);font-size:13px;margin-bottom:12px;line-height:1.6">
              ${p.desc.substring(0, 130)}…
            </div>
            <div class="price-row">
              <span class="pprice">${fmt(p.price)}</span>
              <span class="pold">${fmt(p.old)}</span>
              <span class="pdisc">-${p.discount}%</span>
            </div>
            ${shipH}
            <div class="pactions">
              <button class="btn-ac" onclick="event.stopPropagation();addToCart(${p.id})">
                <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="pcard" onclick="openProduct(${p.id})">
        <div class="pimg-wrap">
          <div class="pimg">${p.emoji}</div>
          <div class="pbadges">${badgeH}</div>
          <button class="pwish-btn ${inW ? 'on' : ''}"
                  onclick="event.stopPropagation();toggleFav(${p.id}); renderProducts();"
                  title="${inW ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <div class="pactions">
            <button class="btn-ac" onclick="event.stopPropagation();addToCart(${p.id})">
              <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Carrinho
            </button>
            <button class="btn-qv" onclick="event.stopPropagation();openProduct(${p.id})" title="Ver detalhes">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
        <div class="pinfo">
          <div class="pcat">${p.cat}</div>
          <div class="pname">${p.name}</div>
          <div class="prating">
            <span class="pstars">${starsHtml(p.rating)}</span>
            <span class="prcnt">(${p.reviews.toLocaleString('pt-BR')})</span>
          </div>
          <div class="price-row">
            <span class="pprice">${fmt(p.price)}</span>
            <span class="pold">${fmt(p.old)}</span>
            <span class="pdisc">-${p.discount}%</span>
          </div>
          ${shipH}
        </div>
      </div>`;
  }).join('');
}
  
function setView(v) {
  view = v;
  $('productsGrid').className = 'products-grid' + (v === 'list' ? ' lv' : '');
  $('gridBtn').classList.toggle('on', v === 'grid');
  $('listBtn').classList.toggle('on', v === 'list');
  renderProducts();
}

function filterByCategory(event, category) {
  const searchInput = document.getElementById('headerSearch');
  if (searchInput) {
    searchInput.value = category;
    renderProducts();
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
  }
}

// INIT
updateFav();
updateCart();
syncToSupabase();
renderProducts();
loadShuffleAndRender();

// LOGOUT
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut();
  buttonLink('/login')
}

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

// PRELOADER
document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  let loadedImages = 0;
  let totalImages = document.images.length;

  function updateProgress(percent) {
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.innerText = percent + "%";
  }

  if (totalImages === 0) {
    updateProgress(100);
  } else {
    for (let i = 0; i < totalImages; i++) {
      let img = new Image();
      
      img.onload = img.onerror = function() {
        loadedImages++;
        let percent = Math.floor((loadedImages / totalImages) * 100);
        updateProgress(percent);
      };
      img.src = document.images[i].src;
    }
  }
});

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  if (progressBar) progressBar.style.width = "100%";
  if (progressText) progressText.innerText = "100%";
  
  setTimeout(() => {
    preloader.classList.add('fade-out');
    document.body.classList.remove('loading');
    document.body.classList.remove("noscroll");
    
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
    
  }, 600); 
});
