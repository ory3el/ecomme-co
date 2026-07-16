function buttonLink(url) {
  window.location.href = url;
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

TweenMax.to('.txt', 1, {
	alpha: 1,
  y: 20,	
  yoyo: true,
	ease: Power3.easeInOut
});

TweenMax.staggerTo('#water path', 2, {
	x:"+=10",
  y:"+=5",	
  repeat: -1,
  yoyo: true,
	ease: Power3.easeInOut
}, 1);

TweenMax.to('#bottle', 3, {
  x:"+=30",
  y:"+=5",
  rotation:"+=7",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
}, 2);

TweenMax.staggerTo('#numbers path', 4, {
	rotation:-30,
  skewY:'10deg',
  x:"+=10",
  y:"+=5",	
  repeat: -1,
	yoyo: true,
	ease: Power1.easeInOut
}, '-=5');

TweenMax.staggerTo('#bubbles circle', 4, {
	x:"+=1",
  y:"+=80",	
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
}, '-=5');

TweenMax.staggerTo('#bubbles2 circle', 3, {
	x:"+=10",
  y:"+=40",	
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
}, '-=5');

TweenMax.to('#tent5', 4, {       morphSVG:"M450.156,820.511l0.395,0.462c34.244,40.2,30.831,65.406,18.13,86.909 c-0.001,0.002-0.003,0.005-0.004,0.007h84.433c0.009-0.056,0.019-0.106,0.028-0.162c1.949-11.366,3.12-25.264,1.164-36.695 c-2.091-14.146-8.913-35.893-26.464-64.532c-14.815-22.431-21.191-29.198-66.652-72.601c-61-57.914-54.765-51.116-61.914-61.358 c-16.548-25.645-15.705-60.353,4.333-87.092c15.819-21.144,34.798-28.843,56.219-33.275c8.384-1.736,14.551-9.302,14.253-18.149 c-0.333-9.89-8.622-17.638-18.513-17.304c-33.573,1.164-62.735,12.935-86.354,36.629c-23.05,23.077-36.875,54.064-36.968,91.268 c0.14,29.981,10.858,60.685,34.242,86.519C392.059,759.365,426.772,794.55,450.156,820.511z",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
});

TweenMax.to('#tent4', 3, {       
  morphSVG:"M678.762,908c-7.375-7-10.719-9.452-10.704-18.699c0.039-17.91-1.99-31.691-5.165-47.461 c-2.837-14.484-8.394-29.914-11.583-39.278c-2.635-7.736-5.304-15.567-7.993-23.46c-5.376-15.775-10.838-31.801-16.299-47.826 c-25.11-73.119-24.338-68.769-27.206-79.148c-3.907-14.896-4.926-30.899-3.19-47.083c3.722-36.142,5.271-50.405,20.125-84.377 c6.7-16.029,8.475-17.166,10.567-26.349c2.475-10.863-11.223-15.921-19.68-11.264l-0.496,0.271 c-28.2,15.537-36.074,47.484-40.917,61.554c-5.392,15.665-10.905,34.927-15.036,54.552c-4.177,19.57-6.094,41.165-4.659,62.923 c1.43,22.687,3.889,41.979,15.028,86.276c4.238,16.854,15.19,48.619,18.667,65.369c1.736,8.366,5.298,22.469,7,30.667 c7.291,35.14,13.001,42.575-8.396,55.833c-6.003,3.72-51.41-2.645-58.072,7.5H678.762z",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
});

TweenMax.to('#tent1', 2, {    morphSVG:"M405.637,642.917c0,0,2.25,1.084,4.5,2.583c38.333,21.834,61,53.5,60.75,80.167 c-0.228,2.635-0.039,5.346-2.25,24.833c-2.681,23.632-0.761,7.514-7.75,64.25c-0.708,5.752-1.671,13.099-2.25,18.75 c-1.01,9.87-5.218,31.077-7.968,45.077c-0.886,4.509-4.407,23.298-22.538,29.423h94.539c-0.658-0.31-2.571-1.919-3.22-2.25 c-1.964-1.018-1.257-5.26-1.562-7.375c-0.5-3.459,3.336-64.208,3.333-63.208c0.025-11.676,1.039-25.425,1.064-37.286 c0.264-53.723,1.586-59.657-1.473-75.706c-2.789-14.937-8.465-29.403-15.792-42.254c-11.888-21.014-29.788-40.621-53.315-55.898 c-14.672-9.366-29.065-15.318-44.653-19.242c-10.883-2.706-20.402,2.722-21.619,12.828 C384.138,628.345,395.996,637.312,405.637,642.917z",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
});

TweenMax.to('#tent2', 5, {       
  morphSVG:"M698.706,908h72.34c-1.096-0.779-2.206-1.641-3.331-2.599 c-3.384-2.985-6.706-6.95-9.616-11.765c-12.827-22.479-4.942-43.119-0.125-64.463c2.116-9.53,5.021-21.135,6.943-28.909 c8.716-34.801,11.304-55.468,14.971-90.264c1.952-18.525,4.916-45.252,1-52.168c-1.544-2.727-6.5-6.917-6.5-6.917 c-7.43-5.265-16.876-1.355-18.833,1.751c-4.542,7.208-3.5,9.083-5.333,19.5l-1.4,8.69c0,0-0.719,4.456-0.766,5.06 c-0.249,3.212-10.683,41.219-13.667,52.083c-1.867,6.797-3.533,10.019-15.75,47.5c-17.994,55.205-25.143,68.466-24.142,95.311 C694.838,890.285,696.331,899.419,698.706,908z",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
});

TweenMax.to('#tent3', 3, {       
  morphSVG:"M666.075,731.812c3.99,6.251,7.875,9.812,10,11.438c11.772,9.003,14.993,8.5,22.312,10.062 c12.938,1.625,18.401-0.703,17.167-7.646c-1.333-7.5-8.333-9.833-11.833-13c0,0-6.709-5.144-7.333-6 c-13.007-17.865-13.626-40.143-5.993-63.319c8.052-23.494,26.03-37.068,44.531-35.814c27.905,1.515,47.311,34.713,41.909,67.399 c-3.46,21.342-7.755,22.059-60.977,87.356c-14.96,18.373-20.292,25.379-29.22,40.961c-0.925,2.238-6.75,12.805-7.875,15 c-6.708,13.083-20.481,38.413-13.708,62.667c0.462,1.655,1.419,5.385,1.917,6.916l79.738,0.056 c-1.284-2.668-2.859-5.166-4.737-7.41l-0.39-0.465c-15.193-18.172-19.202-32.954-4.37-54.402 c35.395-51.118,62.788-80.826,73.049-105.114c9.218-22.019,12.586-48.238,8.223-74.45c-8.502-50.861-43.94-86.775-83.541-85.985 c-47.86,0.497-85.77,54.147-79.259,116.324C657.22,710.87,660.735,723.448,666.075,731.812z",
  repeat: -1,
  yoyo: true,
	ease: Power1.easeInOut
});

/* ─── SUPABASE ──────────────────────────────────────────────────────── */
/*
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('authLoginBtn');
  const profileContainer = document.getElementById('headerProfileContainer');
  const headerImage = document.getElementById('headerAvatar');
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (!user || userError) {
    console.warn("User session not active.");
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileContainer) profileContainer.classList.add('hidden');
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

// LOGOUT
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut();
  buttonLink('/login')
}
*/

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart        = [];
let fav         = [];
let curId       = null;
let mQtyVal     = 1;

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

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCart(id, qty = 1) {
  if (!userId) {
    showAuthAlert("Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.");
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

/* ─── FAV ───────────────────────────────────────────────────────── */
function toggleFav(id) {
  if (!userId) {
    showAuthAlert("Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.");
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
    showAuthAlert("Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.");
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

function checkout() {
  if(!cart.length) { showToast('Adicione produtos ao carrinho primeiro! 😊'); return; }
  showToast('Redirecionando para o pagamento... 🔒');
  window.location.href = "/checkout"
  setTimeout(closeCart, 1200);
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

// BACK TO TOP
window.addEventListener('scroll', () => {
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
});

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); closeFav(); closeMore(); closeAcc(); }
});

// INIT
updateCart();
updateFav();

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
