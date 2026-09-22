// ============================================================

document.addEventListener('visibilitychange', () => {
    pageIsVisible = document.visibilityState === 'visible';
    if (pageIsVisible) {
      refreshProductsIfNeeded();
    }
  }
);

// ============================================================

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initThemeToggle();
    setupModalSwipe();
    setupModalAutoPlay();
    const loginBtn = document.getElementById('authLoginBtn');
    const profileContainer = document.getElementById('headerProfileContainer');
    const headerImage = document.getElementById('headerAvatar');
    const productsLoaded = await loadProductsFromSupabase();
    if (!productsLoaded) {
      return;
    }

    const {data: { user }, error: userError} = await supabaseClient.auth.getUser();
    if (!user || userError) {
      userId = null;
      if (loginBtn) {
        loginBtn.classList.remove(
          'hidden'
        );
      }
      if (profileContainer) {
        profileContainer.classList.add(
          'hidden'
        );
      }
      injectPrefetch('/login');
      loadShuffleAndRender();
      return;
    }

    userId = user.id;
    await loadFromSupabase();
    if (loginBtn) {
      loginBtn.classList.add('hidden');
    }
    if (profileContainer) {
      profileContainer.classList.remove(
        'hidden'
      );
    }

    const {data: profile, error: profileError} = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileError && profile) {
      const fullName =
        profile.full_name ||
        'Cliente';
      const email =
        user.email || '';
      if ($('accSidebarName')) {
        $('accSidebarName').textContent =
          fullName;
      }
      if ($('accSidebarEmail')) {
        $('accSidebarEmail').textContent =
          email;
      }
      if (
        profile.avatar_url &&
        $('accSidebarAvatar')
      ) {
        $('accSidebarAvatar').src =
          profile.avatar_url;
      }
      
      const photoUrl =
        profile.avatar_url || '';
      if (photoUrl && headerImage) {
        headerImage.src = photoUrl;
        headerImage.style.filter = 'none';
        headerImage.style.width = '100%';
        headerImage.style.height = '100%';
        headerImage.style.borderRadius = '100%';
        headerImage.style.objectFit = 'cover';
      }
    }
    loadShuffleAndRender();
    startProductsRealtime();
    startProductRefresh();
  }
);

// ============================================================

function createProductsSignature(
  productList
) {
  return productList
    .map(product => ({
      id: String(product.id),
      name: product.name,
      price: product.price,
      old: product.old,
      discount: product.discount,
      rating: product.rating,
      reviews: product.reviews,
      shipping: product.shipping,
      badge: product.badge,
      desc: product.desc,
      cat: product.cat,
      image_url: product.image_url,
      gallery_urls: product.gallery_urls,
      features: product.features
    })) .map(product => JSON.stringify(product)) .join('|');
}

// ============================================================

async function refreshProductsIfNeeded() {
  if (
    !pageIsVisible ||
    productRefreshRunning
  ) {return;}
  
  productRefreshRunning = true;
  
  try {
    const {data, error} = await supabaseClient
      .from('products')
      .select('*')
      .order(
        'id',
        {ascending: true}
      );

    if (error) {
      console.error('Erro na atualização automática dos produtos:',error);
      return;
    }

    const updatedProducts = (data || []).map(normalizeProduct);
    const newSignature = createProductsSignature(updatedProducts);
    if (newSignature === productDataSignature) {
      return;
    }

    productDataSignature = newSignature;
    updatedProducts.forEach(
      product => {
        productCache.set(
          String(product.id),
          product
        );
      }
    );
    
    products = updatedProducts;
    shuffled = [...products];
    virtualStartIndex = -1;
    virtualEndIndex = -1;
    virtualColumns = 0;
    renderProducts();
  } finally {productRefreshRunning = false;}
}

// ============================================================

function startProductRefresh() {
  if (productRefreshTimer) {
    clearInterval(productRefreshTimer);
  }

  productRefreshTimer = setInterval( () => {
    refreshProductsIfNeeded();},
    PRODUCT_REFRESH_INTERVAL
    );
}

// ============================================================

function startProductsRealtime() {
  if (
    productRealtimeChannel
  ) {
    supabaseClient.removeChannel(
      productRealtimeChannel
    );
  }

  productRealtimeChannel = supabaseClient.channel('products-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products'
    },
        
        payload => { if (!pageIsVisible) {return;}
          refreshProductsIfNeeded();
        }
      )
      .subscribe(status => {console.log('Products Realtime:',status);});
}

// ============================================================

function prepareProductImageAnimations(
  container = document
) {
  const images =
    container.querySelectorAll(
      'img.product-image-reveal'
    );
  images.forEach(
    img => {
      const markLoaded = () => {
        img.classList.add(
          'is-loaded'
        );
      };
      if (img.complete) {
        requestAnimationFrame(
          markLoaded
        );
      } else {
        img.addEventListener(
          'load',
          markLoaded,
          {
            once: true
          }
        );
        img.addEventListener(
          'error',
          () => {
            img.classList.add(
              'is-loaded'
            );
          },
          {
            once: true
          }
        );
      }
    }
  );
}

// ============================================================
function getOptimizedImageUrl(
  sourceUrl,
  preset = 'grid'
) {
  if (!sourceUrl) {
    return '';
  }
  try {
    const workerUrl =
      new URL(
        EDGE_IMAGE_ZONE
      );
    workerUrl.searchParams.set(
      'preset',
      preset
    );
    workerUrl.searchParams.set(
      'src',
      sourceUrl
    );
    return workerUrl.toString();
  } catch (error) {
    console.error(
      'Erro ao gerar URL otimizada:',
      error
    );
    return sourceUrl;
  }
}
// ============================================================

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCart(id, qty = 1) {
  if (!userId) {
    showAuth(
      "Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );
    return;
  }
  const normalizedId = String(id);
  const p = products.find(
    x => String(x.id) === normalizedId
  );
  if (!p) {
    console.error("Produto não encontrado para o carrinho:", normalizedId);
    return;
  }
  const ex = cart.find(
    x => String(x.id) === normalizedId
  );
  if (ex) {
    ex.qty += qty;
  } else {
    cart.push({
      ...p,
      id: normalizedId,
      qty
    });
  }
  updateCart();
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
  syncToSupabase();
}

function removeFromCart(id) {
  const normalizedId = String(id);
  cart = cart.filter(
    x => String(x.id) !== normalizedId
  );
  updateCart();
  syncToSupabase();
}

function changeCartQty(id, d) {
  const normalizedId = String(id);
  const item = cart.find(
    x => String(x.id) === normalizedId
  );
  if (item) {
    item.qty += d;
    if (item.qty <= 0) {
      removeFromCart(normalizedId);
    } else {
      updateCart();
      syncToSupabase();
    }
  }
}

// UPDATE CART -------------------------- //
function updateCart() {
  const validCart = cart
    .map(item => {
      const product = products.find(
        p => String(p.id) === String(item.id)
      );

      if (!product) return null;

      return {
        ...product,
        qty: item.qty
      };
    })
    .filter(Boolean);

  cart = validCart;

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const count = cart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  $('cartBadge').textContent = count;
  $('cartBadge').style.display = count > 0 ? 'flex' : 'none';

  $('cartCount').textContent = `(${count})`;
  $('cartSub').textContent = fmt(total);
  $('cartTotal').textContent = fmt(total);

  const el = $('cartItems');

  if (!cart.length) {
    el.innerHTML = `
      <div class="cart-empty-st">
        <span>🛒</span>
        <p>Seu carrinho está vazio</p>
      </div>
    `;
    return;
  }

  el.innerHTML = cart.map(item => {
    const images = getProductImages(item);
    const image = images[0] || null;
    const optimizedImage = image ? getOptimizedImageUrl( image, EDGE_IMAGE_PRESETS.thumbnail ) : null;

    return `
      <div class="ci">
        <div class="ci-img" onclick="openProduct('${item.id}')">
          ${
            image
              ? `<img
                   src="${optimizedImage}"
                   alt="${item.name}"
                   style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
                 >`
              : item.emoji
          }
        </div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <div class="ci-price">
            ${fmt(item.price)}
          </div>
          <div class="ci-qty">
            <button
              class="qb"
              onclick="changeCartQty('${item.id}', -1)"
            >
              −
            </button>
            <span class="qn">${item.qty}</span>
            <button
              class="qb"
              onclick="changeCartQty('${item.id}', 1)"
            >
              +
            </button>
          </div>
        </div>
        <button
          class="del"
          onclick="removeFromCart('${item.id}')"
          title="Remover do Carrinho"
        >
          <i class="fa-regular fa-trash-can"></i>
        </button>
        <button
          class="cart-item-towish"
          onclick="moveFromCartToFav('${item.id}')"
        >
          <i class="fa-regular fa-heart"></i>
        </button>
      </div>
    `;
  }).join('');
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
    showAuth(
      "Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );
    return;
  }

  const normalizedId = String(id);

  const ex = fav.find(
    x => String(x.id) === normalizedId
  );

  if (ex) {
    removeFromFav(normalizedId);
    showToast(
      'Removido da Lista de Desejos! 💔'
    );
  } else {
    addToFav(normalizedId, 1);
  }

  if ($('mWish')) {
    $('mWish').classList.toggle(
      'on',
      fav.some(
        x => String(x.id) === normalizedId
      )
    );
  }
}

function addToFav(id, qty = 1) {
  if (!userId) {
    showAuth(
      "Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );
    return;
  }
  const normalizedId = String(id);
  const p = products.find(
    x => String(x.id) === normalizedId
  );
  if (!p) {
    console.error("Produto não encontrado para favoritos:", normalizedId);
    return;
  }
  const ex = fav.find(
    x => String(x.id) === normalizedId
  );
  if (ex) {
    ex.qty += qty;
  } else {
    fav.push({
      ...p,
      id: normalizedId,
      qty
    });
  }
  updateFav();
  showToast(`${p.name} salvo nos favoritos! ❤️`);
  syncToSupabase();
}

function removeFromFav(id) {
  const normalizedId = String(id);
  fav = fav.filter(
    x => String(x.id) !== normalizedId
  );
  updateFav();
  syncToSupabase();
}

function changeFavQty(id, d) {
  const normalizedId = String(id);
  const item = fav.find(
    x => String(x.id) === normalizedId
  );
  if (item) {
    item.qty += d;
    if (item.qty <= 0) {
      removeFromFav(normalizedId);
    } else {
      updateFav();
      syncToSupabase();
    }
  }
}

// UPDATE FAV ------------------------- //
function updateFav() {
  const validFav = fav
    .map(item => {
      const product = products.find(
        p => String(p.id) === String(item.id)
      );

      if (!product) return null;

      return {
        ...product,
        qty: item.qty
      };
    })
    .filter(Boolean);

  fav = validFav;

  const total = fav.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const count = fav.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  $('wishBadge').textContent = count;
  $('wishBadge').style.display = count > 0 ? 'flex' : 'none';

  $('favCount').textContent = `(${count})`;
  $('favTotal').textContent = fmt(total);

  const el = $('favItems');

  if (!fav.length) {
    el.innerHTML = `
      <div class="fav-empty-st">
        <span>❤️</span>
        <p>Nenhum produto salvo no momento</p>
      </div>
    `;
    return;
  }

  el.innerHTML = fav.map(item => {
    const images = getProductImages(item);
    const image = images[0] || null;
    const optimizedImage = image ? getOptimizedImageUrl(image, EDGE_IMAGE_PRESETS.thumbnail) : null;

    return `
      <div class="ci">
        <div class="ci-img" onclick="openProduct('${item.id}')">
          ${
            image
              ? `<img
                   src="${optimizedImage}"
                   alt="${item.name}"
                   style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
                 >`
              : item.emoji
          }
        </div>
        <div class="ci-info">
          <div class="ci-name">
            ${item.name}
          </div>
          <div class="ci-price">
            ${fmt(item.price)}
          </div>
          <button
            class="btn-madd"
            onclick="
              addToCart('${item.id}', 1);
              removeFromFav('${item.id}');
              closeFav();
              openCart();
            "
          >
            Adicionar ao Carrinho
          </button>
        </div>
        <button
          class="del"
          onclick="removeFromFav('${item.id}')"
        >
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');
  renderProducts();
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
  if (!fav.length) {
    showToast('Adicione produtos primeiro! 😊');
    return;
  }
  fav.forEach(produto => {
    addToCart(String(produto.id), 1);
  });
  fav = [];
  updateFav();
  renderProducts();
  closeFav();
  openCart();
  showToast('Todos os itens foram para o carrinho! 🛒');
}

function moveFromCartToFav(id) {
  addToFav(String(id), 1);
  showToast('Produto adicionado à Lista de Desejos! ❤️');
}

/* ---------------------------------------- */
async function loadProductsFromSupabase() {
  const {data, error} = await supabaseClient
    .from('products')
    .select('*')
    .order('id', {ascending: true});

  if (error) {
    console.error(
      'Erro ao carregar produtos:',
      error
    );

    products = [];
    shuffled = [];
    return false;
  }

  products = (data || []).map(normalizeProduct);
  shuffled = [...products];
  productDataSignature = createProductsSignature(products);
  return true;
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

// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
    .modal-alert-container {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      /*background: rgba(0, 0, 0, 0.6);*/
      backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      z-index: 500000;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .modal-alert-container.active {
      opacity: 1; pointer-events: auto;
    }
    .modal-alert-content {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      padding: 30px;
      border-radius: 36px;
      max-width: 440px;
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
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }
    .btn-alert-confirm-red {
      background: #eb2525;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #d81d1d;
    }
    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
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

function normalizeProduct(p) {
  return {
    ...p,

    id: String(p.id),
    name: p.name || 'Produto sem nome',
    desc: p.desc || '',
    price: Number(p.price) || 0,
    old: Number(p.old) || 0,
    discount: Number(p.discount) || 0,
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
    emoji: p.emoji || '📦',
    shipping: Boolean(p.shipping),
    badge: p.badge || 'new',
    
    features: Array.isArray(p.features)
      ? p.features
      : [],

    cat: Array.isArray(p.cat)
      ? p.cat
      : (p.cat ? [p.cat] : []),

    image_url: p.image_url || null,
    gallery_urls: Array.isArray(p.gallery_urls)
      ? p.gallery_urls.filter(Boolean).slice(0, 5)
      : []
  };
}

function getProductImages(product) {
  const images = [];
  if (product.image_url) {
    images.push(product.image_url);
  }
  if (Array.isArray(product.gallery_urls)) {
    product.gallery_urls.forEach(url => {
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }
  return images.slice(0, 5);
}

const pLoading = document.getElementById('pLoading');
function pLoadingNone() {
  if (pLoading) {
    pLoading.style.display = 'none';
  }
}
function pLoadingFlex() {
  if (pLoading) {
    pLoading.style.display = 'flex';
  }
}

// ---------------------------------
supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem(
        'local_session_id'
      );
      if (typeof stopSessionCheck === 'function') {
        stopSessionCheck();
      }
    }
  }
);

// LOGOUT
const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() {
  toast('Saindo da conta... 👋', 'info');
  const localSessionId = localStorage.getItem('local_session_id');
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (localSessionId && user) {
    const { error: deleteError } = await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('id', localSessionId)
        .eq('user_id', user.id);
    
    if (deleteError) {console.error('Erro ao remover sessão do banco:', deleteError);}
  }
  sessionStorage.setItem('remote_logout_notice_shown', 'true');
  localStorage.removeItem('local_session_id');
  const { error: signOutError } = await supabaseClient.auth.signOut({scope: 'local'});
  if (signOutError) {console.error('Erro ao fazer logout:', signOutError); }
  toast('Você saiu da conta.', 'info');
  await waitt(700);
  window.location.reload();
}

/* ----------------------------------------------------- */
function openConfirmLogout() {
  closeAcc();
  showConfirmRed('Tem certeza que quer sair? <br>Suas informações não serão perdidas.', 'Sair da Conta', '<i class="fa-solid fa-right-from-bracket"></i>');
}
