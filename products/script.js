/* ── THEME ───────────────────────────────────────────────────────── */
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effectiveTheme(pref) {
  return pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

function updateThemeSwitchUI(pref) {
  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    var isActive = btn.dataset.themeChoice === pref;
    btn.setAttribute('aria-checked', String(isActive));
  });
}

function applyTheme(pref, opts) {
  opts = opts || {};
  try { localStorage.setItem('ecomme-theme', pref); } catch (e) {}
  var root = document.documentElement;
  if (!opts.silent) root.classList.add('theme-transition');
  root.setAttribute('data-theme', effectiveTheme(pref));
  root.setAttribute('data-theme-pref', pref);
  updateThemeSwitchUI(pref);
  if (!opts.silent) {
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 420);
  }
}

function initTheme() {
  var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
  updateThemeSwitchUI(pref);

  // Live-follow the OS theme while the user's preference is "auto"
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var currentPref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      if (currentPref === 'auto') applyTheme('auto', { silent: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeChoice);
    });
  });
}

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart = [];
let fav = [];
let curId = null;
let mQtyVal = 1;
let view = 'grid';
let modalImages = [];
let modalImageIndex = 0;

let products = [];
let shuffled = [];

const EDGE_IMAGE_ZONE = 'https://image.sellerium.workers.dev';
const EDGE_IMAGE_PRESETS = {
  grid: 'grid',
  list: 'list',
  thumbnail: 'thumbnail',
  modal: 'modal'
};

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt = p => p != null ? 'R$ ' + Number(p).toFixed(2).replace('.', ',') : '';
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
/* ───────────────────────────────────────────────────────────────────── */

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

/* --------------------------- */
let isScrolling = false;
let scrollTimer;

window.addEventListener('scroll', () => {
  isScrolling = true;
  document.documentElement.classList.add('is-scrolling');
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    isScrolling = false;
    document.documentElement.classList.remove('is-scrolling');
  }, 120);
}, { passive: true });

// ============================================================

const PRODUCT_REFRESH_INTERVAL = 10000;
let productRefreshTimer = null;
let productRealtimeChannel = null;
let productRefreshRunning = false;
let productDataSignature = '';
let pageIsVisible = true;

// ============================================================

document.addEventListener(
  'visibilitychange',
  () => {
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

/*function updateHeaderContrast() {
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
window.addEventListener("resize", updateHeaderContrast);*/

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

const catalogSearchDebounce = null;
let userIsSearching = false;

function setupProductSearch() {
  const inputs = [$('heroSearch'), $('headerSearch')].filter(Boolean);

  inputs.forEach(
    input => {
      input.addEventListener(
        'input',
        () => {
          userIsSearching = true;
          clearTimeout(
            window.catalogSearchTimer
          );
          inputs.forEach(
            other => {
              if (
                other !== input
              ) {
                other.value =
                  input.value;
              }
            }
          );
          window.catalogSearchTimer =
            setTimeout(
              async () => {
                userIsSearching = false;
                await resetCatalogAndLoad();
              },
              400
            );
        }
      );
    }
  );
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
        <div class="ci-img">
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
        <div class="ci-img">
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

/* ----------------------------------- */
function showModalImage(index) {
  const mEmoji = $('mEmoji');
  const modalGallery = $('modalGallery');
  if (!mEmoji || !modalImages.length) {return;}

  modalImageIndex = ( index + modalImages.length) % modalImages.length;
  const image = modalImages[modalImageIndex];
  const optimizedImage = getOptimizedImageUrl(image, EDGE_IMAGE_PRESETS.modal);

  mEmoji.innerHTML = `
    <img
      src="${optimizedImage}"
      alt="Imagem do produto"
      decoding="async"
      fetchpriority="high"
    >
  `;

  if (modalGallery) {
    modalGallery.querySelectorAll('.modal-gallery-thumb')
      .forEach(
        (button, buttonIndex) => {
          button.classList.toggle('on',buttonIndex === modalImageIndex);
        }
      );

    const activeThumb = modalGallery.querySelector('.modal-gallery-thumb.on');
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }
}

/* ----------------------------------------- */
function previousImg() {
  if (modalImages.length <= 1) {return;}
  showModalImage(modalImageIndex - 1);
}

function nextImg() {
  if (modalImages.length <= 1) {return;}
  showModalImage(modalImageIndex + 1);
}

/* ----------------------------------------- */
function updateModalNavigationVisibility() {
  const buttons = document.querySelectorAll('.modal-image-nav');
  const visible = modalImages.length > 1;
  buttons.forEach(button => {button.style.display = visible ? 'flex' : 'none';});
}

/* ----------------------------------------- */
document.addEventListener('keydown', event => {
    const modal = $('modalOverlay');
    if (!modal || !modal.classList.contains('on')) {return;}
    if (event.key === 'ArrowLeft') {previousImg();}
    if (event.key === 'ArrowRight') {nextImg();}
  }
);

/* ----------------------------------------- */
let modalTouchStartX = 0;
let modalTouchEndX = 0;

function setupModalSwipe() {
  const area = $('mEmoji');
  if (!area) {return;}

  area.addEventListener('touchstart', event => {
    modalTouchStartX = event.changedTouches[0].clientX;
  }, {passive: true});

  area.addEventListener('touchend', event => {
      modalTouchEndX = event.changedTouches[0].clientX;
      const delta = modalTouchEndX - modalTouchStartX;
      if (Math.abs(delta) < 50) {return;}
      if (delta > 0) {previousImg();} else {nextImg();}
  }, {passive: true});
}

/* ----------------------------------------- */
let productModalHistoryOpen = false;

function openProductModalHistory() {
  if (productModalHistoryOpen) return;
  history.pushState(
    {
      ...(history.state || {}),
      productModal: true
    }, '', window.location.href
  );
  productModalHistoryOpen = true;
}

function closeProductModal() {
  if (!productModalHistoryOpen) {
    closeModal();
    return;
  }
  history.back();
}

window.addEventListener('popstate', () => {
  if (!productModalHistoryOpen) return;
  productModalHistoryOpen = false;
  closeModal();
});

/* ─── MODAL ──────────────────────────────────────────────────────── */
function openProduct(id) {
  document.body.classList.add("noscroll");
  const normalizedId = String(id);
  const p = products.find(
    x => String(x.id) === normalizedId
  );

  if (!p) {
    console.error("Produto não encontrado:", normalizedId);
    document.body.classList.remove("noscroll");
    return;
  }
  openProductModalHistory();
  curId = normalizedId;
  mQtyVal = 1;
  $('mQty').textContent = 1;
  
  const images = getProductImages(p);
  modalImages = images;
  modalImageIndex = 0;
  updateModalNavigationVisibility();
  const mainImage = images[0] || null;
  const optimizedMainImage = mainImage ? getOptimizedImageUrl(mainImage, EDGE_IMAGE_PRESETS.modal) : null;
  const mEmoji = $('mEmoji');

  if (mEmoji) {
    mEmoji.innerHTML = optimizedMainImage? `<img
            src="${optimizedMainImage}"
            alt="${p.name}"
            decoding="async"
            fetchpriority="high">` : p.emoji;
  }

  const modalGallery = $('modalGallery');
  if (modalGallery) {
    modalGallery.innerHTML = '';
    images.forEach((image, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'modal-gallery-thumb' + (index === 0 ? ' on' : '');
      const thumbnail = getOptimizedImageUrl(image, EDGE_IMAGE_PRESETS.thumbnail);

      button.innerHTML = `
        <img
          src="${thumbnail}"
          alt="${p.name} - imagem ${index + 1}"
          loading="lazy"
          decoding="async">
      `;
      button.addEventListener('click', () => {showModalImage(index);});
      modalGallery.appendChild(button);
    });

modalGallery.style.display =
  images.length > 1 ? 'flex' : 'none';

showModalImage(modalImageIndex);

  $('mEmoji').style.position = 'relative';
  $('mCat').textContent =
    Array.isArray(p.cat)
      ? p.cat.join(', ')
      : p.cat;

  $('mName').textContent = p.name;
  $('mDesc').textContent = p.desc;
  $('mPrice').textContent = fmt(p.price);
  $('mPrice1').textContent = fmt(p.price);

  $('mOld').textContent =
    p.old > 0 ? fmt(p.old) : '';

  $('mDisc').textContent =
    p.discount > 0
      ? `-${p.discount}% OFF`
      : '';

  $('mFeats').innerHTML =
    p.features.map(f =>
      `<div class="m-feat">
        <div class="fchk">✓</div>
        ${f}
      </div>`
    ).join('');

  $('mWish').classList.toggle(
    'on',
    fav.some(
      x => String(x.id) === normalizedId
    )
  );
  $('modalOverlay').classList.add('on');
 }
};

function handleModalClick(e) { if (e.target === $('modalOverlay')) closeProductModal(); }
function closeModal()        { $('modalOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }
function chgQty(d)           { mQtyVal = Math.max(1, mQtyVal + d); $('mQty').textContent = mQtyVal; }

function addFromModal() {
  addToCart(String(curId), mQtyVal);
  closeModal();
  openCart();
}
function addFromModal2() {
  addToFav(String(curId), mQtyVal);
  closeModal();
  openFav();
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

// BACK TO TOP
const backTop = document.getElementById('backTop');
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    backTop.classList.toggle(
      'visible',
      window.scrollY > 400
    );
    scrollTicking = false;
  });
}, { passive: true });

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeNotif(); closeCart(); closeFav(); closeMore(); closeAcc(); }
});

// ── HYDRATE USER SAVED ITEMS ──
function hydrateUserItems(savedItems) {
  if (!Array.isArray(savedItems)) return [];
  return savedItems
    .map(item => {
      const product = products.find(
        p => String(p.id) === String(item.id)
      );
      if (!product) return null;
      return {
        ...product,
        qty: Math.max(1, Number(item.qty) || 1)
      };
    })
    .filter(Boolean);
}

// ── SYNC CART AND WISHLIST WITH SUPABASE ──
async function syncToSupabase() {
  if (!userId) return;

  const cartToSave = cart.map(item => ({
    id: String(item.id),
    qty: Number(item.qty) || 1
  }));

  const favToSave = fav.map(item => ({
    id: String(item.id),
    qty: Number(item.qty) || 1
  }));

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      cart: cartToSave,
      fav: favToSave
    })
    .eq('id', userId);

  if (error) {
    console.error(
      'Erro ao sincronizar carrinho/favoritos:',
      error
    );
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

// ── POP-UP LOGOUT ────────────────────────────────────────────
let confirmRedTimerId = null;
async function showConfirmRed(message, title, icon) { 
  injectModalStyles();
  
  let confirmRedModal = document.getElementById('confirmRedModal');
  if (!confirmRedModal) {
    confirmRedModal = document.createElement('div');
    confirmRedModal.id = 'confirmRedModal';
    confirmRedModal.className = 'modal-alert-container';
    confirmRedModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="confirmRedIcon">${icon}</div>
        <h3 id="confirmRedTitle">${title}</h3>
        <p id="confirmRedMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeConfirmRed()">Voltar</button>
          <button class="btn-alert-confirm-red" id="btnConfirmLogout" onclick="confirmLogout()">Sair da conta</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmRedModal); 
  } else {
    document.getElementById('confirmRedMsg').innerHTML = message;
    document.getElementById('confirmRedTitle').textContent = title;
    document.getElementById('confirmRedIcon').innerHTML = icon; 
  }
  
  // ── LOGIC 3s ──
  const confirmRedBtn = document.getElementById('btnConfirmLogout');
  let timeLeft = 3;
  confirmRedBtn.disabled = true;
  confirmRedBtn.style.opacity = '0.5';
  confirmRedBtn.style.cursor = 'not-allowed';
  confirmRedBtn.style.transition = 'all 0.3s ease';
  confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
  
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
  confirmRedTimerId = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
    } else {
      clearInterval(confirmRedTimerId);
      confirmRedBtn.disabled = false;
      confirmRedBtn.style.opacity = '1';
      confirmRedBtn.style.cursor = 'pointer';
      confirmRedBtn.textContent = 'Sair da conta';
    }
  }, 1000);
  
  confirmRedModal.offsetHeight;
  confirmRedModal.classList.add('active');
}
  
function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}
function confirmLogout() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  doLogout();
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
}
function closeConfirmRed() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
}

//--------------------------------------------------------
async function loadFromSupabase() {
  if (!userId) return;
  const {
    data,
    error
  } = await supabaseClient
    .from('profiles')
    .select('cart, fav')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(
      'Erro ao carregar carrinho/favoritos:',
      error
    );
    return;
  }
  cart = hydrateUserItems(
    data?.cart
  );
  fav = hydrateUserItems(
    data?.fav
  );
  updateCart();
  updateFav();
}

/* ─── SHUFFLE ────────────────────────────────────────────────────────── */
function shuffleAndRender() {
  shuffled = fishYates(products);
  visibleCount = PAGE_SIZE;
  lastRenderState = '';
  if ($('sortSelect')) {
    $('sortSelect').value = 'random';
  }
  renderProducts();
  showToast(
    'Produtos embaralhados! 🔀'
  );
}

/* ---------------------------------- */
function loadShuffleAndRender() {
  shuffled = fishYates(products);
  visibleCount = PAGE_SIZE;
  lastRenderState = '';
  if ($('sortSelect')) {
    $('sortSelect').value = 'random';
  }
  renderProducts();
}

/* ─── RENDER PRODUCTS ────────────────────────────────────────────────── */
function productCardHtml(p) {
  const images = getProductImages(p);
  const mainImage =
    images[0] || null;

  const inW =
    fav.some(
      x =>
        String(x.id) ===
        String(p.id)
    );

  const category =
    Array.isArray(p.cat)
      ? p.cat.join(', ')
      : String(p.cat || '');

  let badgeH = '';
  if (p.badge === 'hot') {
    badgeH = `
      <span class="bpill bhot">
        🔥 Hot
      </span>
    `;
  } else if (p.badge === 'new') {
    badgeH = `
      <span class="bpill bnew">
        Novo
      </span>
    `;
  } else if (p.discount > 0) {
    badgeH = `
      <span class="bpill bsale">
        -${p.discount}%
      </span>
    `;
  }
  
  const shipH = p.shipping
    ? `
      <div class="pfship">
        <svg viewBox="0 0 24 24">
          <rect
            x="1"
            y="3"
            width="15"
            height="13"
          />
          <polygon
            points="
              16 8
              20 8
              23 11
              23 16
              16 16
              16 8
            "
          />
          <circle
            cx="5.5"
            cy="18.5"
            r="2.5"
          />
          <circle
            cx="18.5"
            cy="18.5"
            r="2.5"
          />
        </svg>

        Frete Grátis
      </div>
    `
    : '';

  const oldPrice =
    p.old > 0
      ? `
        <span class="pold">
          ${fmt(p.old)}
        </span>
      `
      : '';
  const discount =
    p.discount > 0
      ? `
        <span class="pdisc">
          -${p.discount}%
        </span>
      `
      : '';
  
  const imagePreset =
    view === 'list'
      ? EDGE_IMAGE_PRESETS.list
      : EDGE_IMAGE_PRESETS.grid;

  const optimizedMainImage =
    mainImage
      ? getOptimizedImageUrl(
          mainImage,
          imagePreset
        )
      : null;

  const imageHtml =
    optimizedMainImage
      ? `
        <img
          class="product-image-reveal"
          src="${optimizedMainImage}"
          alt="${p.name}"
          loading="lazy"
          decoding="async"
          style="
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:inherit;
          ">`
      : '';

  if (view === 'list') {
    return `
      <div
        class="pcard"
        onclick="openProduct('${p.id}')"
      >
        <div class="pimg-wrap">
          <div
            class="pimg"
            style="position:relative;"
          >
            ${!mainImage ? p.emoji : ''}
            ${imageHtml}
          </div>
          <div class="pbadges">
            ${badgeH}
          </div>
        </div>
        <div class="pinfo">
          <div class="pcat">
            ${category}
          </div>
          <div class="pname">
            ${p.name}
          </div>
          <div class="prating">
            <span class="pstars">
              ${starsHtml(p.rating)}
            </span>
            <span class="prcnt">
              ${p.rating}
              (${p.reviews.toLocaleString('pt-BR')} avaliações)
            </span>
          </div>
          <div
            style="
              color:var(--muted);
              font-size:13px;
              margin-bottom:12px;
              line-height:1.6;
            "
          >
            ${p.desc.substring(0, 130)}
            ${p.desc.length > 130 ? '…' : ''}
          </div>
          <div class="price-row">
            <span class="pprice">
              ${fmt(p.price)}
            </span>
            ${oldPrice}
            ${discount}
          </div>
          ${shipH}
          <div class="pactions">
            <button
              class="btn-ac"
              onclick="
                event.stopPropagation();
                addToCart('${p.id}');
              "
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div
      class="pcard"
      onclick="openProduct('${p.id}')"
    >
      <div class="pimg-wrap">
        <div
          class="pimg"
          style="position:relative;"
        >
          ${!mainImage ? p.emoji : ''}
          ${imageHtml}
        </div>
        <div class="pbadges">
          ${badgeH}
        </div>
        <button
          class="pwish-btn ${inW ? 'on' : ''}"
          onclick="
            event.stopPropagation();
            toggleFav('${p.id}');
          "
          title="${
            inW
              ? 'Remover dos favoritos'
              : 'Adicionar aos favoritos'
          }"
        >
          <svg viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="pactions">
          <button
            class="btn-ac"
            onclick="
              event.stopPropagation();
              addToCart('${p.id}');
            "
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Carrinho
          </button>
          <button
            class="btn-qv"
            onclick="
              event.stopPropagation();
              openProduct('${p.id}');
            "
            title="Ver detalhes"
          >
            <svg viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="pinfo">
        <div class="pcat">
          ${category}
        </div>
        <div class="pname">
          ${p.name}
        </div>
        <div class="prating">
          <span class="pstars">
            ${starsHtml(p.rating)}
          </span>
          <span class="prcnt">
            (${p.reviews.toLocaleString('pt-BR')})
          </span>
        </div>
        <div class="price-row">
          <span class="pprice">
            ${fmt(p.price)}
          </span>
          ${oldPrice}
          ${discount}
        </div>
        ${shipH}
      </div>
    </div>
  `;
}

/* ------------------------------- */
const PAGE_SIZE = 24;
let visibleCount = PAGE_SIZE;
let productsObserver = null;
let loadingMoreProducts = false;
let lastRenderState = '';

/* ------------------------------- */
function getFilteredList() {
  const q = (
    $('heroSearch')?.value ||
    $('headerSearch')?.value ||
    ''
  ).toLowerCase().trim();
  const sort = $('sortSelect')?.value || 'random';
  let list = shuffled;

  if (q) {
    list = list.filter(p => {
      const name = String(p.name || '').toLowerCase();
      const desc = String(p.desc || '').toLowerCase();
      const categories = Array.isArray(p.cat)
        ? p.cat
        : [p.cat];
      const categoryMatch = categories.some(cat =>
        String(cat || '').toLowerCase().includes(q)
      );
      return (
        name.includes(q) ||
        desc.includes(q) ||
        categoryMatch
      );
    });
  }

  if (sort === 'price_asc') {
    return [...list].sort(
      (a, b) => a.price - b.price
    );
  }
  if (sort === 'price_desc') {
    return [...list].sort(
      (a, b) => b.price - a.price
    );
  }
  if (sort === 'rating') {
    return [...list].sort(
      (a, b) => b.rating - a.rating
    );
  }
  if (sort === 'discount') {
    return [...list].sort(
      (a, b) => b.discount - a.discount
    );
  }
  return list;
}

/* ------------------------------- */
function renderProducts() {
  pLoadingFlex();
  const grid = $('productsGrid');
  if (!grid) return;
  const q = (
    $('heroSearch')?.value ||
    $('headerSearch')?.value ||
    ''
  ).toLowerCase().trim();
  const sort = $('sortSelect')?.value || 'random';
  const renderState =
    `${view}|${q}|${sort}`;
  if (renderState !== lastRenderState) {
    visibleCount = PAGE_SIZE;
    lastRenderState = renderState;
  }
  if (productsObserver) {
    productsObserver.disconnect();
    productsObserver = null;
  }
  loadingMoreProducts = false;
  const list = getFilteredList();

  if (!list.length) {
    pLoadingNone();
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-ico">
          🔍
        </div>
        <h3>
          Nenhum resultado encontrado
        </h3>
        <p>
          Tente outro termo ou
          <button
            class="btn-clear"
            onclick="
              $('headerSearch').value='';
              $('heroSearch').value='';
              renderProducts();
            "
          >
            Limpar busca
          </button>
        </p>
      </div>
    `;
    return;
  }

  const slice = list.slice(0, visibleCount);
  grid.innerHTML = slice
    .map(productCardHtml)
    .join('');

  pLoadingNone();
  prepareProductImageAnimations(grid);
  if (slice.length < list.length) {
    const sentinel =
      document.createElement('div');
    sentinel.id = 'gridSentinel';
    sentinel.style.cssText = `
      grid-column: 1 / -1;
      height: 1px;
      width: 100%;
      pointer-events: none;
    `;
    grid.appendChild(sentinel);
    observeSentinel();
  }
}

/* ------------------------------- */
function observeSentinel() {
  const sentinel = $('gridSentinel');
  if (!sentinel) return;
  if (productsObserver) {
    productsObserver.disconnect();
    productsObserver = null;
  }

  productsObserver =
    new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) {
          return;
        }
        if (loadingMoreProducts) {
          return;
        }
        
        loadingMoreProducts = true;
        productsObserver.disconnect();
        productsObserver = null;
        visibleCount += PAGE_SIZE;
        requestAnimationFrame(() => {
          renderProducts();
          loadingMoreProducts = false;
        });
      },
      {
        root: null,
        rootMargin: '0px 0px 500px 0px',
        threshold: 0
      }
    );
  productsObserver.observe(sentinel);
}

/* ------------------------------- */
function searchFor(term) {
  if ($('heroSearch')) {
    $('heroSearch').value = term;
  }
  if ($('headerSearch')) {
    $('headerSearch').value = term;
  }
  visibleCount = PAGE_SIZE;
  lastRenderState = '';
  renderProducts();
}

/* ------------------------------------------------------------ */

function setView(v) {
  if (v !== 'grid' && v !== 'list') {
    return;
  }
  view = v;
  $('productsGrid').className =
    'products-grid' +
    (v === 'list' ? ' lv' : '');
  $('gridBtn').classList.toggle(
    'on',
    v === 'grid'
  );
  $('listBtn').classList.toggle(
    'on',
    v === 'list'
  );
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
