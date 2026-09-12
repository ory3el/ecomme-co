function injectSidebars() {
  if (document.getElementById('cartSidebar')) return;

  document.body.insertAdjacentHTML('afterbegin', `
    <script src="/files/scripts/sidebars.js"></script>
  `);
}
injectSidebars();


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
  
/*}
injectEcommeUI();*/
