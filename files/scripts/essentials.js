// ── ECOMME GLOBAL SEARCH: loader universal para páginas que usam essentials.js ──
(function loadEcommeGlobalSearchFromEssentials() {
  if (window.__ecommeGlobalSearchInitialized || window.__ecommeGlobalSearchScriptRequested) return;
  if (document.querySelector('script[data-ecomme-global-search]')) {
    window.__ecommeGlobalSearchScriptRequested = true;
    return;
  }

  window.__ecommeGlobalSearchScriptRequested = true;
  const script = document.createElement('script');
  script.src = '/files/scripts/global-search.js';
  script.dataset.ecommeGlobalSearch = 'true';
  script.async = true;
  document.head.appendChild(script);
})();

//function initEssentialsJS() {

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

/* ── THEME ───────────────────────────────────────────────────────── */
/*
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
*/

// ============================================================

window.ecommeDisplaySettings =
  window.ecommeDisplaySettings || {
    currency: 'BRL'
  };

window.ecommeCurrencyRates =
  window.ecommeCurrencyRates || {
    BRL: 1,
    USD: null,
    EUR: null
  };

window.ecommeFormatPrice =
  window.ecommeFormatPrice || function(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) {
      return '';
    }

    const currency = window.ecommeDisplaySettings.currency || 'BRL';
    const rate = Number(window.ecommeCurrencyRates[currency]);
    if (
      currency !== 'BRL' &&
      (!Number.isFinite(rate) || rate <= 0)
    ) {
      return '';
    }

    const convertedValue = value * (currency === 'BRL' ? 1 : rate);
    const localeMap = {
      BRL: 'pt-BR',
      USD: 'en-US',
      EUR: 'de-DE'
    };
    return new Intl.NumberFormat(
      localeMap[currency] || 'pt-BR',
      {style: 'currency', currency}
    ).format(convertedValue);
  };

async function syncEcommeDisplaySettings() {
  try {
    const localRaw = localStorage.getItem('ecomme_settings');
    if (localRaw) {
      const localSettings = JSON.parse(localRaw);
      window.ecommeDisplaySettings = {...window.ecommeDisplaySettings, ...localSettings};
    }

    if (typeof supabaseClient !== 'undefined') {
      const {data: { user }} = await supabaseClient.auth.getUser();
      if (user) {
        const {data} = await supabaseClient
          .from('user_settings')
          .select('currency')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.currency) {
          window.ecommeDisplaySettings.currency = data.currency;
          localStorage.setItem('ecomme_settings', JSON.stringify({...JSON.parse(localStorage.getItem('ecomme_settings') || '{}'), currency: data.currency}));
        }
      }
    }
    const currency = window.ecommeDisplaySettings.currency || 'BRL';
    if (currency === 'BRL') {
      window.ecommeCurrencyRates.BRL = 1;
      return;
    }
    const cachedRaw = localStorage.getItem('ecomme_currency_rates');
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const age = Date.now() - Number(cached.savedAt || 0);
      if (
        age < 6 * 60 * 60 * 1000 &&
        cached.rates?.USD &&
        cached.rates?.EUR
      ) {
        window.ecommeCurrencyRates = cached.rates;
        return;
      }
    }
    
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=BRL&quotes=USD,EUR');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const rates = {
      BRL: 1,
      USD: Number(rows.find(row => row.quote === 'USD')?.rate || 0),
      EUR: Number(rows.find(row => row.quote === 'EUR')?.rate || 0)
    };
    if (!rates.USD || !rates.EUR) throw new Error('Cotações inválidas.');
    window.ecommeCurrencyRates = rates;
    localStorage.setItem('ecomme_currency_rates', JSON.stringify({savedAt: Date.now(), rates}));
  } catch (error) {
    console.warn('Não foi possível sincronizar a moeda:', error);
  }
}

// ============================================================

// ── SKELETON ──────────────────────────────────────────────────────────
if (typeof window.__ecommeProductsInitialLoadComplete !== 'boolean') {
  window.__ecommeProductsInitialLoadComplete = false;
}

function showProductsGridSkeleton() {
  const grid = document.getElementById('productsGrid');
  if (!grid || grid.dataset.ecommeSkeletonLoading === 'true') return;

  grid.dataset.ecommeSkeletonLoading = 'true';
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: 10 }, () => `
    <div class="related-skeleton-card products-grid-skeleton" aria-hidden="true">
      <div class="skeleton-shimmer rsk-image"></div>
      <div class="rsk-info">
        <span class="skeleton-shimmer rsk-line"></span>
        <span class="skeleton-shimmer rsk-line rsk-line-short"></span>
        <span class="skeleton-shimmer rsk-price"></span>
      </div>
    </div>
  `).join('');
}

function finishProductsGridSkeleton() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.dataset.ecommeSkeletonLoading = 'false';
  grid.setAttribute('aria-busy', 'false');
}

function showProductsGridLoadError() {
  const grid = document.getElementById('productsGrid');
  if (!grid || grid.dataset.ecommeSkeletonLoading !== 'true') return;

  grid.dataset.ecommeSkeletonLoading = 'false';
  grid.setAttribute('aria-busy', 'false');
  grid.innerHTML = `
    <div class="products-grid-load-error" role="status">
      <strong>Não foi possível carregar os produtos.</strong>
      <span>Verifique sua conexão e atualize a página para tentar novamente.</span>
    </div>
  `;
}

showProductsGridSkeleton();

function isEcommeProductDetailRoute() {
  return /^\/product\/[^/]+\/?$/i.test(window.location.pathname);
}

async function loadEcommeCurrentProductOnly() {
  const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/i);
  if (!match) return false;

  let id;
  try { id = decodeURIComponent(match[1]); }
  catch { return false; }

  if (!window.__ecommeProductDetailLoadPromise) {
    window.__ecommeProductDetailLoadPromise = (async () => {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    })();
  }

  let raw;
  try {
    raw = await window.__ecommeProductDetailLoadPromise;
  } catch (error) {
    console.error('Erro ao carregar o produto atual:', error);
    window.__ecommeProductDetailLoadPromise = null;
    return false;
  }

  if (!raw) return false;

  const normalized = typeof normalizeProduct === 'function'
    ? normalizeProduct(raw)
    : raw;

  const existing = typeof products !== 'undefined' && Array.isArray(products)
    ? products
    : [];
  const merged = new Map(existing.map(item => [String(item.id), item]));
  merged.set(String(normalized.id), normalized);
  products = [...merged.values()];
  shuffled = [...products];
  if (typeof rebuildEcommeProductIndex === 'function') rebuildEcommeProductIndex();

  if (typeof productCache !== 'undefined' && productCache?.set) {
    productCache.set(String(normalized.id), normalized);
  }
  if (typeof createProductsSignature === 'function') {
    productDataSignature = createProductsSignature(products);
  }

  return true;
}

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
    await syncEcommeDisplaySettings();
    // A página de produto carrega apenas o produto atual e lotes incrementais de recomendações.
    if (isEcommeProductDetailRoute()) return;
    const productsLoaded = await loadProductsFromSupabase();
    if (!productsLoaded) return;
    loadShuffleAndRender();
    startProductsRealtime();
    startProductRefresh();
  }
);

// ============================================================

async function refreshProductsIfNeeded() {
  // /products usa eventos incrementais do Supabase Realtime. Não refaça SELECT * do catálogo.
  if (window.location.pathname.replace(/\/+$/, '') === '/products') return false;
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) return false;
  if (!pageIsVisible || productRefreshRunning) return false;

  productRefreshRunning = true;
  try {
    const {data, error} = await supabaseClient
      .from('products')
      .select('*')
      .order('id', {ascending: true});
    if (error) {
      console.error('Erro na atualização automática dos produtos:', error);
      return false;
    }

    const updatedProducts = (data || []).map(normalizeProduct);
    const newSignature = createProductsSignature(updatedProducts);
    if (newSignature === productDataSignature) return false;

    productDataSignature = newSignature;
    products = updatedProducts;
    shuffled = [...products];
    if (typeof rebuildEcommeProductIndex === 'function') rebuildEcommeProductIndex();
    if (window.EcommeCategoryFilters?.onProductsLoaded) window.EcommeCategoryFilters.onProductsLoaded(products);
    if (typeof renderProducts === 'function') renderProducts();
    updateCart();
    updateFav();
    return true;
  } finally {
    productRefreshRunning = false;
  }
}

/* ---------------------------------------- */
async function loadProductsFromSupabase() {
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) {
    return loadEcommeCurrentProductOnly();
  }

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
    window.__ecommeProductsInitialLoadComplete = true;
    showProductsGridLoadError();
    return false;
  }
  
  products = (data || []).map(normalizeProduct);
  shuffled = [...products];
  if (window.EcommeCategoryFilters?.onProductsLoaded) window.EcommeCategoryFilters.onProductsLoaded(products);
  productDataSignature = createProductsSignature(products);
  window.__ecommeProductsInitialLoadComplete = true;
  finishProductsGridSkeleton();
  return true;
}

// ── POP-UP AUTH ──
async function showAuth(message, title, icon) {
  // Reutiliza o injetor de estilos definido em confirm-modal.js.
  if (typeof injectConfirmModalStyles === 'function') {
    injectConfirmModalStyles();
  }

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

// ----------------------------------
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
      features: product.features,
      dominant_color: product.dominant_color,
      dominant_colors: product.dominant_colors,
      color_palette: product.color_palette,
      color_analysis_status: product.color_analysis_status
    })) .map(product => JSON.stringify(product)) .join('|');
}

// --------------------------------------------------------
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
  const mainImage = images[0] || null;
  const inW = fav.some(x => String(x.id) === String(p.id));
  const category = Array.isArray(p.cat) ? p.cat.join(', ') : String(p.cat || '');
  const ratingNumber = Number(p.rating);
  const averageRating = (Number.isFinite(ratingNumber) ? ratingNumber : 0).toFixed(1);
  
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

  const oldPrice = p.old > 0 ? ` <span class="pold"> ${window.ecommeFormatPrice(p.old)}</span>` : '';
  const discount = p.discount > 0 ? `<span class="pdisc"> -${p.discount}% </span>` : '';
  const imagePreset = view === 'list' ? EDGE_IMAGE_PRESETS.list : EDGE_IMAGE_PRESETS.grid;
  const optimizedMainImage = mainImage ? getOptimizedImageUrl(mainImage, imagePreset) : null;
  
  const imageHtml =
    optimizedMainImage
      ? `
        <img
          class="product-image-reveal"
          data-src="${optimizedMainImage}"
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
        data-product-id="${p.id}"
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
          <div class="prating" aria-label="Média das avaliações: ${averageRating} de 5">
            <i class="fa-regular fa-star pstars" aria-hidden="true"></i>
            <span class="prcnt">${averageRating}</span>
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
              ${window.ecommeFormatPrice(p.price)}
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
      data-product-id="${p.id}"
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
          data-product-action="favorite"
          onclick="event.stopPropagation(); toggleFav('${p.id}');"
          title="${inW ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
        >
          <svg viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="pactions">
          <button
            class="btn-ac"
            data-product-action="cart"
            onclick="event.stopPropagation(); addToCart('${p.id}');"
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
        <div class="pname" data-no-translate>
          ${p.name}
        </div>
        <div class="prating" aria-label="Média das avaliações: ${averageRating} de 5">
          <i class="fa-regular fa-star pstars" aria-hidden="true"></i>
          <span class="prcnt">${averageRating}</span>
        </div>
        <div class="price-row">
          <span class="pprice">
            ${window.ecommeFormatPrice(p.price)}
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
let lastFilteredProductIds = [];
let productCardsVirtualObserver = null;
const PRODUCT_CARD_VIRTUAL_ROOT_MARGIN = '1000px 0px 1000px 0px';

/* ------------------------------- */
function getFilteredList() {
  const q = (
    $('heroSearch')?.value ||
    $('headerSearch')?.value ||
    ''
  ).toLowerCase().trim();
  const sort = $('sortSelect')?.value || 'random';
  // Produtos pausados (badge "paused") não aparecem na lista; continuam em `products` para carrinho/favoritos
  let list = shuffled.filter(p => !isProductUnavailable(p));

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

  if (window.EcommeCategoryFilters?.filter) {
    list = window.EcommeCategoryFilters.filter(list);
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
  if (sort === 'popular') {
    return [...list].sort((a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0));
  }
  if (sort === 'new') {
    return [...list].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime() || Number(a.id) || 0;
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime() || Number(b.id) || 0;
      return dateB - dateA;
    });
  }
  if (sort === 'discount') {
    return [...list].sort(
      (a, b) => b.discount - a.discount
    );
  }
  return list;
}

//--------------------------------------------------------
let ecommeProductsById = new Map();

function rebuildEcommeProductIndex() {
  ecommeProductsById = new Map((Array.isArray(products) ? products : []).map(product => [String(product.id), product]));
}

function getEcommeProductById(id) {
  const key = String(id);
  return ecommeProductsById.get(key) || (Array.isArray(products) ? products.find(product => String(product.id) === key) : null) || null;
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

/* ------------------------------- */
function disconnectProductCardVirtualizer() {
  if (productCardsVirtualObserver) {
    productCardsVirtualObserver.disconnect();
    productCardsVirtualObserver = null;
  }
}

function activateProductCardImage(card) {
  if (!card) return;
  const images = card.querySelectorAll('img.product-image-reveal[data-src]');
  images.forEach(img => {
    const source = img.dataset.src;
    if (!source) return;
    img.src = source;
    delete img.dataset.src;
  });
  prepareProductImageAnimations(card);
}

function virtualizeProductCard(card) {
  if (!card || card.dataset.ecommeVirtualized === 'true') return;
  if (card.contains(document.activeElement)) return;

  const measuredHeight = Math.ceil(card.getBoundingClientRect().height || Number(card.dataset.ecommeVirtualHeight) || 380);
  if (measuredHeight > 0) {
    card.dataset.ecommeVirtualHeight = String(measuredHeight);
    card.style.height = `${measuredHeight}px`;
    card.style.minHeight = `${measuredHeight}px`;
  }

  card.replaceChildren();
  card.removeAttribute('onclick');
  card.removeAttribute('role');
  card.tabIndex = -1;
  card.dataset.ecommeVirtualized = 'true';
  card.classList.add('pcard--virtual-placeholder');
  card.setAttribute('aria-hidden', 'true');
}

function restoreProductCard(card) {
  if (!card || card.dataset.ecommeVirtualized !== 'true') return card;
  const product = getEcommeProductById(card.dataset.productId);
  if (!product) {
    productCardsVirtualObserver?.unobserve(card);
    card.remove();
    return null;
  }

  const reservedHeight = Number(card.dataset.ecommeVirtualHeight) || 0;
  const template = document.createElement('template');
  template.innerHTML = productCardHtml(product).trim();
  const restoredCard = template.content.firstElementChild;
  if (!restoredCard) return card;

  if (reservedHeight > 0) restoredCard.style.minHeight = `${reservedHeight}px`;
  productCardsVirtualObserver?.unobserve(card);
  card.replaceWith(restoredCard);
  if (reservedHeight > 0) {
    requestAnimationFrame(() => {
      restoredCard.style.minHeight = '';
    });
  }
  productCardsVirtualObserver?.observe(restoredCard);
  activateProductCardImage(restoredCard);
  return restoredCard;
}

function ensureProductCardVirtualizer() {
  if (productCardsVirtualObserver || !('IntersectionObserver' in window)) return;
  productCardsVirtualObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const card = entry.target;
      if (!card.isConnected) {
        productCardsVirtualObserver?.unobserve(card);
        return;
      }
      if (entry.isIntersecting) {
        if (card.dataset.ecommeVirtualized === 'true') restoreProductCard(card);
        else activateProductCardImage(card);
      } else {
        virtualizeProductCard(card);
      }
    });
  }, {
    root: null,
    rootMargin: PRODUCT_CARD_VIRTUAL_ROOT_MARGIN,
    threshold: 0
  });
}

function observeProductCards(cards) {
  if (!cards || !cards.length) return;
  if (!('IntersectionObserver' in window)) {
    cards.forEach(activateProductCardImage);
    return;
  }
  ensureProductCardVirtualizer();
  cards.forEach(card => productCardsVirtualObserver.observe(card));
}

function addProductsSentinel(grid, listLength) {
  if (visibleCount >= listLength) return;
  const sentinel = document.createElement('div');
  sentinel.id = 'gridSentinel';
  sentinel.style.cssText = 'grid-column:1/-1;height:1px;width:100%;pointer-events:none;';
  grid.appendChild(sentinel);
  observeSentinel();
}

function renderProducts() {
  const grid = $('productsGrid');
  if (!grid) return;
  if (grid.dataset.ecommeSkeletonLoading === 'true' && window.__ecommeProductsInitialLoadComplete !== true) return;

  grid.setAttribute('aria-busy', 'false');
  pLoadingFlex();

  const q = ($('heroSearch')?.value || $('headerSearch')?.value || '').toLowerCase().trim();
  const sort = $('sortSelect')?.value || 'random';
  const categoryState = window.EcommeCategoryFilters?.getStateKey?.() || '';
  const renderState = `${view}|${q}|${sort}|${categoryState}`;
  if (renderState !== lastRenderState) {
    visibleCount = PAGE_SIZE;
    lastRenderState = renderState;
  }

  if (productsObserver) {
    productsObserver.disconnect();
    productsObserver = null;
  }
  disconnectProductCardVirtualizer();
  loadingMoreProducts = false;

  const list = getFilteredList();
  lastFilteredProductIds = list.map(product => String(product.id));
  const countElement = $('productsCount');
  if (countElement) countElement.textContent = `${list.length} ${list.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
  if (window.EcommeCategoryFilters?.onRender) window.EcommeCategoryFilters.onRender(list.length, products.length);

  if (!list.length) {
    pLoadingNone();
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-ico">🔍</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente outro termo ou <button class="btn-clear" onclick="if (window.EcommeCategoryFilters?.reset) { window.EcommeCategoryFilters.reset(); } else { if ($('headerSearch')) $('headerSearch').value = ''; if ($('heroSearch')) $('heroSearch').value = ''; renderProducts(); }">Limpar filtros</button></p>
      </div>
    `;
    return;
  }

  const slice = list.slice(0, visibleCount);
  grid.innerHTML = slice.map(productCardHtml).join('');
  pLoadingNone();
  observeProductCards([...grid.querySelectorAll('.pcard[data-product-id]')]);
  addProductsSentinel(grid, list.length);
}

function appendNextProductsBatch() {
  const grid = $('productsGrid');
  if (!grid) return;
  const list = getFilteredList();
  const startIndex = visibleCount;
  const nextEnd = Math.min(startIndex + PAGE_SIZE, list.length);
  const batch = list.slice(startIndex, nextEnd);
  const sentinel = $('gridSentinel');

  if (productsObserver) {
    productsObserver.disconnect();
    productsObserver = null;
  }
  sentinel?.remove();

  if (!batch.length) return;

  const template = document.createElement('template');
  template.innerHTML = batch.map(productCardHtml).join('');
  const cards = [...template.content.querySelectorAll('.pcard[data-product-id]')];
  grid.appendChild(template.content);
  visibleCount = nextEnd;
  observeProductCards(cards);
  addProductsSentinel(grid, list.length);
}

function observeSentinel() {
  const sentinel = $('gridSentinel');
  if (!sentinel) return;
  if (productsObserver) {
    productsObserver.disconnect();
    productsObserver = null;
  }

  productsObserver = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry?.isIntersecting || loadingMoreProducts) return;
    loadingMoreProducts = true;
    productsObserver?.disconnect();
    productsObserver = null;
    requestAnimationFrame(() => {
      appendNextProductsBatch();
      loadingMoreProducts = false;
    });
  }, {root: null, rootMargin: '0px 0px 500px 0px', threshold: 0});
  productsObserver.observe(sentinel);
}

function replaceRenderedProductCard(productId) {
  const grid = $('productsGrid');
  if (!grid) return;
  const card = [...grid.querySelectorAll('.pcard[data-product-id]')].find(item => String(item.dataset.productId) === String(productId));
  if (!card || card.dataset.ecommeVirtualized === 'true') return;
  const product = getEcommeProductById(productId);
  if (!product) return;

  const template = document.createElement('template');
  template.innerHTML = productCardHtml(product).trim();
  const replacement = template.content.firstElementChild;
  if (!replacement) return;
  productCardsVirtualObserver?.unobserve(card);
  card.replaceWith(replacement);
  observeProductCards([replacement]);
}

function flushEcommeProductRealtimeChanges() {
  const queue = window.__ecommeProductRealtimeQueue;
  if (!(queue instanceof Map) || !queue.size) return;
  const changes = [...queue.values()];
  queue.clear();
  const changedIds = [];
  let changedAny = false;

  changes.forEach(change => {
    const id = String(change.id);
    const previousIndex = products.findIndex(item => String(item.id) === id);
    if (change.eventType === 'DELETE') {
      if (previousIndex >= 0) {
        products.splice(previousIndex, 1);
        shuffled = shuffled.filter(item => String(item.id) !== id);
        changedAny = true;
        changedIds.push(id);
        if (typeof productCache !== 'undefined' && productCache?.delete) productCache.delete(id);
      }
      return;
    }

    if (!change.record || !change.record.id) return;
    const previous = previousIndex >= 0 ? products[previousIndex] : null;
    const normalized = normalizeProduct({...previous, ...change.record});
    if (previous && JSON.stringify(previous) === JSON.stringify(normalized)) return;

    if (previousIndex >= 0) products[previousIndex] = normalized;
    else products.push(normalized);

    const shuffledIndex = shuffled.findIndex(item => String(item.id) === id);
    if (shuffledIndex >= 0) shuffled[shuffledIndex] = normalized;
    else shuffled.push(normalized);

    if (typeof productCache !== 'undefined' && productCache?.set) productCache.set(id, normalized);
    changedAny = true;
    changedIds.push(id);
  });

  if (!changedAny) return;
  rebuildEcommeProductIndex();

  if (window.location.pathname.replace(/\/+$/, '') !== '/products') {
    if (pageIsVisible) {
      updateCart();
      updateFav();
    } else {
      window.__ecommeProductsNeedsRender = true;
    }
    return;
  }

  if (!pageIsVisible) {
    window.__ecommeProductsNeedsRender = true;
    return;
  }

  const nextIds = getFilteredList().map(product => String(product.id));
  const orderChanged = nextIds.length !== lastFilteredProductIds.length || nextIds.some((id, index) => id !== lastFilteredProductIds[index]);
  if (orderChanged) {
    renderProducts();
  } else {
    changedIds.forEach(replaceRenderedProductCard);
  }
  lastFilteredProductIds = nextIds;
  updateCart();
  updateFav();
}

function queueEcommeProductRealtimeChange(payload) {
  const eventType = String(payload?.eventType || payload?.event || '').toUpperCase();
  const record = eventType === 'DELETE' ? payload?.old : payload?.new;
  const id = record?.id;
  if (id === undefined || id === null) return;

  if (!(window.__ecommeProductRealtimeQueue instanceof Map)) window.__ecommeProductRealtimeQueue = new Map();
  window.__ecommeProductRealtimeQueue.set(String(id), {
    id: String(id),
    eventType,
    record: record ? {...record} : null
  });
  if (window.__ecommeProductRealtimeFlushTimer) return;
  window.__ecommeProductRealtimeFlushTimer = setTimeout(() => {
    window.__ecommeProductRealtimeFlushTimer = null;
    flushEcommeProductRealtimeChanges();
  }, 80);
}

window.queueEcommeProductRealtimeChange = queueEcommeProductRealtimeChange;
window.flushEcommeProductRealtimeChanges = flushEcommeProductRealtimeChanges;
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
  if (v !== 'grid' && v !== 'list') return;
  view = v;
  const grid = $('productsGrid');
  const gridButton = $('gridBtn') || $('gridViewBtn');
  const listButton = $('listBtn') || $('listViewBtn');
  if (grid) grid.className = 'products-grid' + (v === 'list' ? ' lv' : '');
  gridButton?.classList.toggle('on', v === 'grid');
  gridButton?.classList.toggle('active', v === 'grid');
  listButton?.classList.toggle('on', v === 'list');
  listButton?.classList.toggle('active', v === 'list');
  renderProducts();
}

function filterByCategory(event, category) {
  const selectedCategory = category !== undefined ? category : (typeof event === 'string' ? event : 'Todos');
  if (window.EcommeCategoryFilters?.setCategory) {
    window.EcommeCategoryFilters.setCategory(selectedCategory);
    return;
  }
  const searchInput = document.getElementById('headerSearch');
  if (searchInput) {
    searchInput.value = selectedCategory;
    renderProducts();
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
  }
}

// ------------------------------------
function updateProductActionUI(id) {
  const productId = String(id);

  const isFav = fav.some(
    item => String(item.id) === productId
  );

  const isInCart = cart.some(
    item => String(item.id) === productId
  );

  document.querySelectorAll('.pcard[data-product-id]').forEach(card => {
    if (String(card.dataset.productId) !== productId) return;

    const favButton = card.querySelector(
      '[data-product-action="favorite"]'
    );

    if (favButton) {
      favButton.classList.toggle('on', isFav);
      favButton.title = isFav
        ? 'Remover dos favoritos'
        : 'Adicionar aos favoritos';

      favButton.setAttribute('aria-pressed', String(isFav));
    }

    const cartButton = card.querySelector(
      '[data-product-action="cart"]'
    );

    if (cartButton) {
      cartButton.classList.toggle('in-cart', isInCart);
      cartButton.title = isInCart
        ? 'Produto já está no carrinho'
        : 'Adicionar ao carrinho';

      cartButton.setAttribute('aria-pressed', String(isInCart));
    }
  });

  document.querySelectorAll('.cart-item-towish[data-product-id]').forEach(button => {
    if (String(button.dataset.productId) !== productId) return;

    button.classList.toggle('on', isFav);
    button.title = isFav
      ? 'Remover dos favoritos'
      : 'Adicionar aos favoritos';
  });

  if (String(curId) === productId) {
    document.getElementById('mWish')?.classList.toggle('on', isFav);
    document.getElementById('mWish1')?.classList.toggle('on', isFav);
  }
}
//}
  
/*
const script1 = document.createElement('script');
script1.src = '/files/scripts/sidebars.js';

document.body.appendChild(script1);
*/

/*}
injectEcommeUI();*/
