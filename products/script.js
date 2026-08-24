// ============================================================
// ECOMME / PRODUCTS
// PAGINAÇÃO SERVER-SIDE + VIRTUALIZAÇÃO GRID/LIST
// ============================================================


// ============================================================
// FAVICON
// ============================================================

const favicon = document.getElementById('favicon');

function verificarTema(e) {
  if (!favicon) return;

  favicon.href = e.matches
    ? '/images/favicon-light.png'
    : '/images/favicon-blue.png';
}

const mqEscuro = window.matchMedia(
  '(prefers-color-scheme: dark)'
);

verificarTema(mqEscuro);

if (typeof mqEscuro.addEventListener === 'function') {
  mqEscuro.addEventListener(
    'change',
    verificarTema
  );
}


// ============================================================
// UTILITÁRIOS GERAIS
// ============================================================

document.body.style.cursor = 'default';

function buttonLink(url) {
  if (!url) return;
  window.location.href = url;
}

function injectPrefetch(url) {
  if (!url) return;

  const exists = document.querySelector(
    `link[rel="prefetch"][href="${url}"]`
  );

  if (exists) return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;

  document.head.appendChild(link);
}

const $ = id => document.getElementById(id);

const fmt = value => {
  if (value == null || value === '') {
    return '';
  }

  return (
    'R$ ' +
    Number(value)
      .toFixed(2)
      .replace('.', ',')
  );
};

function starsHtml(rating) {
  const value = Math.max(
    0,
    Math.min(
      5,
      Number(rating) || 0
    )
  );

  const filled = Math.floor(value);
  let result = '';

  for (let i = 0; i < filled; i++) {
    result += '★';
  }

  for (let i = filled; i < 5; i++) {
    result += '☆';
  }

  return result;
}

function fishYates(array) {
  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
}


// ============================================================
// ESTADO DO CATÁLOGO
// ============================================================

let products = [];
let shuffled = [];

let view = 'grid';

let catalogCategory = null;
let catalogSearchDebounce = null;

const SERVER_PAGE_SIZE = 48;

let serverPage = 0;
let hasMoreProducts = true;
let loadingServerPage = false;

let catalogRequestId = 0;

const productCache = new Map();


// ============================================================
// ESTADO DO USUÁRIO
// ============================================================

let userId = null;

let cart = [];
let fav = [];


// ============================================================
// ESTADO DO MODAL
// ============================================================

let curId = null;
let mQtyVal = 1;


// ============================================================
// ESTADO DA VIRTUALIZAÇÃO
// ============================================================

let virtualReady = false;

let virtualStartIndex = -1;
let virtualEndIndex = -1;
let virtualColumns = 0;

let virtualRowHeight = 400;

let virtualScrollFrame = false;

let productsObserver = null;


// ============================================================
// ESTADO DO SCROLL
// ============================================================

let isScrolling = false;
let scrollTimer = null;


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
  'https://cedrpcezoaqaeivrfuxn.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ============================================================
// SCROLL PERFORMANCE
// ============================================================

window.addEventListener(
  'scroll',
  () => {
    isScrolling = true;

    document.documentElement.classList.add(
      'is-scrolling'
    );

    clearTimeout(scrollTimer);

    scrollTimer = setTimeout(
      () => {
        isScrolling = false;

        document.documentElement.classList.remove(
          'is-scrolling'
        );
      },
      120
    );

    if (virtualScrollFrame) {
      return;
    }

    virtualScrollFrame = true;

    requestAnimationFrame(
      () => {
        updateBackTop();

        if (virtualReady) {
          renderVirtualProducts();
        }

        virtualScrollFrame = false;
      }
    );
  },
  {
    passive: true
  }
);

function updateBackTop() {
  const backTop = $('backTop');

  if (!backTop) return;

  backTop.classList.toggle(
    'visible',
    window.scrollY > 400
  );
}


// ============================================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================================

window.addEventListener(
  'DOMContentLoaded',
  async () => {
    setupCatalogControls();

    setupKeyboardControls();

    const loaded =
      await loadProductsFromSupabase({
        reset: true
      });

    if (!loaded) {
      renderCatalogError();
      return;
    }

    await initializeSession();

    renderProducts();
  }
);


// ============================================================
// SESSÃO / AUTENTICAÇÃO
// ============================================================

async function initializeSession() {
  const loginBtn =
    $('authLoginBtn');

  const profileContainer =
    $('headerProfileContainer');

  const {
    data: {
      user
    },
    error
  } =
    await supabaseClient.auth.getUser();

  if (error || !user) {
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

    return;
  }

  userId = user.id;

  if (loginBtn) {
    loginBtn.classList.add(
      'hidden'
    );
  }

  if (profileContainer) {
    profileContainer.classList.remove(
      'hidden'
    );
  }

  await loadFromSupabase();

  await loadProfile(user);
}

async function loadProfile(user) {
  const {
    data: profile,
    error
  } =
    await supabaseClient
      .from('profiles')
      .select('*')
      .eq(
        'id',
        user.id
      )
      .single();

  if (error || !profile) {
    return;
  }

  const fullName =
    profile.full_name ||
    'Cliente';

  const email =
    user.email ||
    '';

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

  if (
    profile.avatar_url &&
    $('headerAvatar')
  ) {
    const avatar =
      $('headerAvatar');

    avatar.src =
      profile.avatar_url;

    avatar.style.filter =
      'none';

    avatar.style.width =
      '100%';

    avatar.style.height =
      '100%';

    avatar.style.borderRadius =
      '100%';

    avatar.style.objectFit =
      'cover';
  }
}


// ============================================================
// HEADER AUTH
// ============================================================

function initHeaderAuthListener() {
  const loginBtn =
    $('authLoginBtn');

  const profileContainer =
    $('headerProfileContainer');

  const bellBtn =
    $('bellBtn');

  const headerAvatar =
    $('headerAvatar');

  if (
    !loginBtn ||
    !profileContainer
  ) {
    return;
  }

  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {
      if (
        session &&
        session.user
      ) {
        loginBtn.classList.add(
          'hidden'
        );

        if (bellBtn) {
          bellBtn.classList.remove(
            'hidden'
          );
        }

        profileContainer.classList.remove(
          'hidden'
        );

        userId =
          session.user.id;

        try {
          const {
            data,
            error
          } =
            await supabaseClient
              .from('profiles')
              .select('avatar_url')
              .eq(
                'id',
                session.user.id
              )
              .single();

          if (
            !error &&
            data?.avatar_url &&
            headerAvatar
          ) {
            headerAvatar.src =
              data.avatar_url;
          }
        } catch (error) {
          console.error(
            'Erro ao carregar avatar:',
            error
          );
        }

        return;
      }

      userId = null;

      loginBtn.classList.remove(
        'hidden'
      );

      profileContainer.classList.add(
        'hidden'
      );

      if (bellBtn) {
        bellBtn.classList.add(
          'hidden'
        );
      }

      if (headerAvatar) {
        headerAvatar.src =
          '/images/icons/full/user.webp';
      }
    }
  );
}

initHeaderAuthListener();


// ============================================================
// CARRINHO
// ============================================================

function addToCart(
  id,
  qty = 1
) {
  if (!userId) {
    showAuth(
      'Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.',
      'Conta Necessária',
      '🔒'
    );

    return;
  }

  const normalizedId =
    String(id);

  const product =
    getProductById(
      normalizedId
    );

  if (!product) {
    console.error(
      'Produto não encontrado para o carrinho:',
      normalizedId
    );

    return;
  }

  const amount =
    Math.max(
      1,
      Number(qty) || 1
    );

  const existing =
    cart.find(
      item =>
        String(item.id) ===
        normalizedId
    );

  if (existing) {
    existing.qty += amount;
  } else {
    cart.push({
      ...product,
      id: normalizedId,
      qty: amount
    });
  }

  updateCart();

  showToast(
    `${product.name} adicionado ao carrinho! 🛒`
  );

  syncToSupabase();
}

function removeFromCart(id) {
  const normalizedId =
    String(id);

  cart =
    cart.filter(
      item =>
        String(item.id) !==
        normalizedId
    );

  updateCart();

  syncToSupabase();
}

function changeCartQty(
  id,
  delta
) {
  const normalizedId =
    String(id);

  const item =
    cart.find(
      product =>
        String(product.id) ===
        normalizedId
    );

  if (!item) {
    return;
  }

  item.qty +=
    Number(delta) || 0;

  if (item.qty <= 0) {
    removeFromCart(
      normalizedId
    );

    return;
  }

  updateCart();

  syncToSupabase();
}

function updateCart() {
  cart =
    cart
      .map(item => {
        const product =
          getProductById(
            item.id
          );

        if (!product) {
          return null;
        }

        return {
          ...product,
          id: String(item.id),
          qty:
            Math.max(
              1,
              Number(item.qty) || 1
            )
        };
      })
      .filter(Boolean);

  const total =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.price *
        item.qty,
      0
    );

  const count =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.qty,
      0
    );

  if ($('cartBadge')) {
    $('cartBadge').textContent =
      count;

    $('cartBadge').style.display =
      count > 0
        ? 'flex'
        : 'none';
  }

  if ($('cartCount')) {
    $('cartCount').textContent =
      `(${count})`;
  }

  if ($('cartSub')) {
    $('cartSub').textContent =
      fmt(total);
  }

  if ($('cartTotal')) {
    $('cartTotal').textContent =
      fmt(total);
  }

  const container =
    $('cartItems');

  if (!container) {
    return;
  }

  if (!cart.length) {
    container.innerHTML = `
      <div class="cart-empty-st">
        <span>🛒</span>
        <p>Seu carrinho está vazio</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    cart
      .map(item => {
        const image =
          getProductImages(item)[0];

        return `
          <div class="ci">
            <div class="ci-img">
              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${escapeHtml(item.name)}"
                      loading="lazy"
                      decoding="async"
                    >
                  `
                  : escapeHtml(
                      item.emoji
                    )
              }
            </div>

            <div class="ci-info">
              <div class="ci-name">
                ${escapeHtml(item.name)}
              </div>

              <div class="ci-price">
                ${fmt(item.price)}
              </div>

              <div class="ci-qty">
                <button
                  class="qb"
                  onclick="
                    changeCartQty(
                      '${escapeJsString(item.id)}',
                      -1
                    )
                  "
                >
                  −
                </button>

                <span class="qn">
                  ${item.qty}
                </span>

                <button
                  class="qb"
                  onclick="
                    changeCartQty(
                      '${escapeJsString(item.id)}',
                      1
                    )
                  "
                >
                  +
                </button>
              </div>
            </div>

            <button
              class="del"
              onclick="
                removeFromCart(
                  '${escapeJsString(item.id)}'
                )
              "
              title="Remover do Carrinho"
            >
              🗑️
            </button>

            <button
              class="cart-item-towish"
              onclick="
                moveFromCartToFav(
                  '${escapeJsString(item.id)}'
                )
              "
            >
              ❤️
            </button>
          </div>
        `;
      })
      .join('');
}

function openCart() {
  closeMore();
  closeFav();
  closeNotif();
  closeAcc();

  if ($('cartSidebar')) {
    $('cartSidebar').classList.add(
      'on'
    );
  }

  if ($('cartOverlay')) {
    $('cartOverlay').classList.add(
      'on'
    );
  }

  document.body.classList.add(
    'nobodyscroll'
  );
}

function closeCart() {
  if ($('cartSidebar')) {
    $('cartSidebar').classList.remove(
      'on'
    );
  }

  if ($('cartOverlay')) {
    $('cartOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'nobodyscroll'
  );
}

function checkout() {
  if (!cart.length) {
    showAlert(
      'Para finalizar a compra, é necessário adicionar produtos ao carrinho primeiro!',
      'Sem Itens no Carrinho',
      'ℹ️'
    );

    return;
  }

  showToast(
    'Redirecionando para o pagamento... 🔒'
  );

  window.location.href =
    '/checkout';
}


// ============================================================
// FAVORITOS
// ============================================================

function toggleFav(id) {
  if (!userId) {
    showAuth(
      'Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.',
      'Conta Necessária',
      '🔒'
    );

    return;
  }

  const normalizedId =
    String(id);

  const exists =
    fav.some(
      item =>
        String(item.id) ===
        normalizedId
    );

  if (exists) {
    removeFromFav(
      normalizedId
    );

    showToast(
      'Removido da Lista de Desejos! 💔'
    );
  } else {
    addToFav(
      normalizedId,
      1
    );
  }

  syncWishlistButtons(
    normalizedId
  );
}

function addToFav(
  id,
  qty = 1
) {
  if (!userId) {
    showAuth(
      'Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.',
      'Conta Necessária',
      '🔒'
    );

    return;
  }

  const normalizedId =
    String(id);

  const product =
    getProductById(
      normalizedId
    );

  if (!product) {
    console.error(
      'Produto não encontrado para favoritos:',
      normalizedId
    );

    return;
  }

  const existing =
    fav.find(
      item =>
        String(item.id) ===
        normalizedId
    );

  const amount =
    Math.max(
      1,
      Number(qty) || 1
    );

  if (existing) {
    existing.qty += amount;
  } else {
    fav.push({
      ...product,
      id: normalizedId,
      qty: amount
    });
  }

  updateFav();

  showToast(
    `${product.name} salvo nos favoritos! ❤️`
  );

  syncToSupabase();

  syncWishlistButtons(
    normalizedId
  );
}

function removeFromFav(id) {
  const normalizedId =
    String(id);

  fav =
    fav.filter(
      item =>
        String(item.id) !==
        normalizedId
    );

  updateFav();

  syncToSupabase();

  syncWishlistButtons(
    normalizedId
  );
}

function changeFavQty(
  id,
  delta
) {
  const normalizedId =
    String(id);

  const item =
    fav.find(
      product =>
        String(product.id) ===
        normalizedId
    );

  if (!item) {
    return;
  }

  item.qty +=
    Number(delta) || 0;

  if (item.qty <= 0) {
    removeFromFav(
      normalizedId
    );

    return;
  }

  updateFav();

  syncToSupabase();
}

function syncWishlistButtons(id) {
  const normalizedId =
    String(id);

  const active =
    fav.some(
      item =>
        String(item.id) ===
        normalizedId
    );

  document
    .querySelectorAll(
      '.pwish-btn'
    )
    .forEach(
      button => {
        if (
          String(
            button.dataset.productId
          ) !== normalizedId
        ) {
          return;
        }

        button.classList.toggle(
          'on',
          active
        );

        button.title =
          active
            ? 'Remover dos favoritos'
            : 'Adicionar aos favoritos';
      }
    );

  if ($('mWish')) {
    $('mWish').classList.toggle(
      'on',
      active
    );
  }
}

function updateFav() {
  fav =
    fav
      .map(item => {
        const product =
          getProductById(
            item.id
          );

        if (!product) {
          return null;
        }

        return {
          ...product,
          id: String(item.id),
          qty:
            Math.max(
              1,
              Number(item.qty) || 1
            )
        };
      })
      .filter(Boolean);

  const total =
    fav.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.price *
        item.qty,
      0
    );

  const count =
    fav.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.qty,
      0
    );

  if ($('wishBadge')) {
    $('wishBadge').textContent =
      count;

    $('wishBadge').style.display =
      count > 0
        ? 'flex'
        : 'none';
  }

  if ($('favCount')) {
    $('favCount').textContent =
      `(${count})`;
  }

  if ($('favTotal')) {
    $('favTotal').textContent =
      fmt(total);
  }

  const container =
    $('favItems');

  if (!container) {
    return;
  }

  if (!fav.length) {
    container.innerHTML = `
      <div class="fav-empty-st">
        <span>❤️</span>
        <p>Nenhum produto salvo no momento</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    fav
      .map(item => {
        const image =
          getProductImages(item)[0];

        return `
          <div class="ci">
            <div class="ci-img">
              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${escapeHtml(item.name)}"
                      loading="lazy"
                      decoding="async"
                    >
                  `
                  : escapeHtml(
                      item.emoji
                    )
              }
            </div>

            <div class="ci-info">
              <div class="ci-name">
                ${escapeHtml(item.name)}
              </div>

              <div class="ci-price">
                ${fmt(item.price)}
              </div>

              <button
                class="btn-madd"
                onclick="
                  addToCart(
                    '${escapeJsString(item.id)}',
                    1
                  );

                  removeFromFav(
                    '${escapeJsString(item.id)}'
                  );

                  closeFav();
                  openCart();
                "
              >
                Adicionar ao Carrinho
              </button>
            </div>

            <button
              class="del"
              onclick="
                removeFromFav(
                  '${escapeJsString(item.id)}'
                )
              "
            >
              🗑️
            </button>
          </div>
        `;
      })
      .join('');
}

function openFav() {
  closeMore();
  closeCart();
  closeNotif();
  closeAcc();

  if ($('favSidebar')) {
    $('favSidebar').classList.add(
      'on'
    );
  }

  if ($('favOverlay')) {
    $('favOverlay').classList.add(
      'on'
    );
  }

  document.body.classList.add(
    'nobodyscroll'
  );
}

function closeFav() {
  if ($('favSidebar')) {
    $('favSidebar').classList.remove(
      'on'
    );
  }

  if ($('favOverlay')) {
    $('favOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'nobodyscroll'
  );
}

function addAllFavToCart() {
  if (!fav.length) {
    showToast(
      'Adicione produtos primeiro! 😊'
    );

    return;
  }

  const items = [...fav];

  items.forEach(item => {
    const normalizedId =
      String(item.id);

    const existing =
      cart.find(
        cartItem =>
          String(cartItem.id) ===
          normalizedId
      );

    const amount =
      Math.max(
        1,
        Number(item.qty) || 1
      );

    if (existing) {
      existing.qty += amount;
    } else {
      cart.push({
        ...item,
        id: normalizedId,
        qty: amount
      });
    }
  });

  fav = [];

  updateCart();
  updateFav();

  syncToSupabase();

  renderProducts();

  closeFav();
  openCart();

  showToast(
    'Todos os itens foram para o carrinho! 🛒'
  );
}

function moveFromCartToFav(id) {
  addToFav(
    String(id),
    1
  );

  showToast(
    'Produto adicionado à Lista de Desejos! ❤️'
  );
}


// ============================================================
// BUSCA / PAGINAÇÃO DO SUPABASE
// ============================================================

const PRODUCT_SELECT_FIELDS = `
  id,
  name,
  cat,
  price,
  old,
  discount,
  rating,
  reviews,
  shipping,
  badge,
  features,
  desc,
  image_url,
  gallery_urls
`;

function getCatalogSearchTerm() {
  if (catalogCategory) {
    return '';
  }

  return String(
    $('heroSearch')?.value ||
    $('headerSearch')?.value ||
    ''
  ).trim();
}

function getCatalogSort() {
  return (
    $('sortSelect')?.value ||
    'random'
  );
}

function getCatalogQuery() {
  const search =
    getCatalogSearchTerm();

  const sort =
    getCatalogSort();

  let query =
    supabaseClient
      .from('products')
      .select(
        PRODUCT_SELECT_FIELDS
      );

  if (catalogCategory) {
    query =
      query.contains(
        'cat',
        [catalogCategory]
      );
  }

  if (search) {
    const safeSearch =
      search
        .replace(
          /[%_,]/g,
          ''
        )
        .trim();

    if (safeSearch) {
      query =
        query.or(
          `name.ilike.%${safeSearch}%,desc.ilike.%${safeSearch}%`
        );
    }
  }

  if (
    sort ===
    'price_asc'
  ) {
    query =
      query
        .order(
          'price',
          {
            ascending: true
          }
        )
        .order(
          'id',
          {
            ascending: true
          }
        );
  } else if (
    sort ===
    'price_desc'
  ) {
    query =
      query
        .order(
          'price',
          {
            ascending: false
          }
        )
        .order(
          'id',
          {
            ascending: true
          }
        );
  } else if (
    sort ===
    'rating'
  ) {
    query =
      query
        .order(
          'rating',
          {
            ascending: false
          }
        )
        .order(
          'id',
          {
            ascending: true
          }
        );
  } else if (
    sort ===
    'discount'
  ) {
    query =
      query
        .order(
          'discount',
          {
            ascending: false
          }
        )
        .order(
          'id',
          {
            ascending: true
          }
        );
  } else {
    query =
      query.order(
        'id',
        {
          ascending: true
        }
      );
  }

  return query;
}

async function fetchProductPage({
  reset = false
} = {}) {
  if (reset) {
    catalogRequestId += 1;

    serverPage = 0;
    hasMoreProducts = true;

    products = [];
    shuffled = [];

    virtualStartIndex = -1;
    virtualEndIndex = -1;
    virtualColumns = 0;

    if (productsObserver) {
      productsObserver.disconnect();
      productsObserver = null;
    }
  }

  if (
    loadingServerPage ||
    (!reset && !hasMoreProducts)
  ) {
    return false;
  }

  loadingServerPage = true;

  const requestId =
    ++catalogRequestId;

  const from =
    serverPage *
    SERVER_PAGE_SIZE;

  const to =
    from +
    SERVER_PAGE_SIZE -
    1;

  try {
    const {
      data,
      error
    } =
      await getCatalogQuery()
        .range(
          from,
          to
        );

    if (
      requestId !==
      catalogRequestId
    ) {
      return false;
    }

    if (error) {
      console.error(
        'Erro ao carregar produtos:',
        error
      );

      return false;
    }

    const pageProducts =
      (
        data || []
      ).map(
        normalizeProduct
      );

    if (
      pageProducts.length <
      SERVER_PAGE_SIZE
    ) {
      hasMoreProducts =
        false;
    }

    const existingIds =
      new Set(
        products.map(
          product =>
            String(
              product.id
            )
        )
      );

    pageProducts.forEach(
      product => {
        const id =
          String(
            product.id
          );

        productCache.set(
          id,
          product
        );

        if (
          existingIds.has(
            id
          )
        ) {
          return;
        }

        products.push(
          product
        );

        existingIds.add(
          id
        );
      }
    );

    if (
      getCatalogSort() ===
      'random'
    ) {
      shuffled =
        fishYates(
          products
        );
    } else {
      shuffled =
        [...products];
    }

    serverPage += 1;

    console.log(
      `Página ${serverPage} carregada. Produtos no cliente: ${products.length}`
    );

    return true;
  } catch (error) {
    console.error(
      'Erro inesperado ao carregar produtos:',
      error
    );

    return false;
  } finally {
    if (
      requestId ===
      catalogRequestId
    ) {
      loadingServerPage =
        false;
    }
  }
}

async function loadProductsFromSupabase({
  reset = true
} = {}) {
  return fetchProductPage({
    reset
  });
}

async function resetCatalogAndLoad() {
  renderCatalogLoading();

  const loaded =
    await fetchProductPage({
      reset: true
    });

  if (loaded) {
    virtualReady = false;

    renderProducts();
  } else {
    renderCatalogError();
  }
}

async function loadNextProductPage() {
  if (
    loadingServerPage ||
    !hasMoreProducts
  ) {
    return;
  }

  const before =
    products.length;

  const loaded =
    await fetchProductPage();

  if (
    loaded &&
    products.length !== before
  ) {
    virtualStartIndex = -1;
    virtualEndIndex = -1;

    renderProducts();
  }
}


// ============================================================
// RENDERIZAÇÃO DE PRODUTOS
// ============================================================

function productCardHtml(product) {
  const p =
    normalizeForCard(
      product
    );

  const images =
    getProductImages(p);

  const mainImage =
    images[0] ||
    null;

  const inWishlist =
    fav.some(
      item =>
        String(item.id) ===
        String(p.id)
    );

  const category =
    Array.isArray(p.cat)
      ? p.cat.join(', ')
      : String(
          p.cat || ''
        );

  const badgeHtml =
    getProductBadgeHtml(
      p
    );

  const shippingHtml =
    p.shipping
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

  const imageHtml =
    mainImage
      ? `
        <img
          src="${escapeHtml(
            mainImage
          )}"
          alt="${escapeHtml(
            p.name
          )}"
          loading="lazy"
          decoding="async"
        >
      `
      : '';

  const safeId =
    escapeJsString(
      p.id
    );

  if (
    view ===
    'list'
  ) {
    return `
      <div
        class="pcard"
        data-product-id="${escapeHtml(p.id)}"
        onclick="
          openProduct(
            '${safeId}'
          )
        "
      >
        <div class="pimg-wrap">
          <div
            class="pimg"
            style="position:relative;"
          >
            ${
              !mainImage
                ? escapeHtml(
                    p.emoji
                  )
                : ''
            }

            ${imageHtml}
          </div>

          <div class="pbadges">
            ${badgeHtml}
          </div>
        </div>

        <div class="pinfo">
          <div class="pcat">
            ${escapeHtml(category)}
          </div>

          <div class="pname">
            ${escapeHtml(
              p.name
            )}
          </div>

          <div class="prating">
            <span class="pstars">
              ${starsHtml(
                p.rating
              )}
            </span>

            <span class="prcnt">
              ${p.rating}
              (${Number(
                p.reviews
              ).toLocaleString(
                'pt-BR'
              )} avaliações)
            </span>
          </div>

          <div
            class="list-product-description"
          >
            ${escapeHtml(
              p.desc.substring(
                0,
                130
              )
            )}
            ${
              p.desc.length > 130
                ? '…'
                : ''
            }
          </div>

          <div class="price-row">
            <span class="pprice">
              ${fmt(p.price)}
            </span>

            ${oldPrice}
            ${discount}
          </div>

          ${shippingHtml}

          <div class="pactions">
            <button
              class="btn-ac"
              onclick="
                event.stopPropagation();

                addToCart(
                  '${safeId}'
                );
              "
            >
              <svg
                viewBox="0 0 24 24"
              >
                <path
                  d="
                    M6 2
                    3 6
                    v14
                    a2 2 0 0 0
                    2 2
                    h14
                    a2 2 0 0 0
                    2-2
                    V6
                    l-3-4z
                  "
                />
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                />
                <path
                  d="
                    M16 10
                    a4 4 0 0 1
                    -8 0
                  "
                />
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
      data-product-id="${escapeHtml(p.id)}"
      onclick="
        openProduct(
          '${safeId}'
        )
      "
    >
      <div class="pimg-wrap">
        <div
          class="pimg"
          style="position:relative;"
        >
          ${
            !mainImage
              ? escapeHtml(
                  p.emoji
                )
              : ''
          }

          ${imageHtml}
        </div>

        <div class="pbadges">
          ${badgeHtml}
        </div>

        <button
          class="
            pwish-btn
            ${inWishlist ? 'on' : ''}
          "
          data-product-id="${escapeHtml(
            p.id
          )}"
          onclick="
            event.stopPropagation();

            toggleFav(
              '${safeId}'
            );
          "
          title="${
            inWishlist
              ? 'Remover dos favoritos'
              : 'Adicionar aos favoritos'
          }"
        >
          <svg
            viewBox="0 0 24 24"
          >
            <path
              d="
                M20.84 4.61
                a5.5 5.5 0 0 0
                -7.78 0
                L12 5.67
                l-1.06-1.06
                a5.5 5.5 0 0 0
                -7.78 7.78
                l1.06 1.06
                L12 21.23
                l7.78-7.78
                1.06-1.06
                a5.5 5.5 0 0 0
                0-7.78z
              "
            />
          </svg>
        </button>

        <div class="pactions">
          <button
            class="btn-ac"
            onclick="
              event.stopPropagation();

              addToCart(
                '${safeId}'
              );
            "
          >
            <svg
              viewBox="0 0 24 24"
            >
              <path
                d="
                  M6 2
                  3 6
                  v14
                  a2 2 0 0 0
                  2 2
                  h14
                  a2 2 0 0 0
                  2-2
                  V6
                  l-3-4z
                "
              />
              <line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
              />
              <path
                d="
                  M16 10
                  a4 4 0 0 1
                  -8 0
                "
              />
            </svg>

            Carrinho
          </button>

          <button
            class="btn-qv"
            onclick="
              event.stopPropagation();

              openProduct(
                '${safeId}'
              );
            "
            title="Ver detalhes"
          >
            <svg
              viewBox="0 0 24 24"
            >
              <path
                d="
                  M1 12
                  s4-8
                  11-8
                  11 8
                  -4 8
                  -11 8
                  -11-8
                  -11-8z
                "
              />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="pinfo">
        <div class="pcat">
          ${escapeHtml(category)}
        </div>

        <div class="pname">
          ${escapeHtml(
            p.name
          )}
        </div>

        <div class="prating">
          <span class="pstars">
            ${starsHtml(
              p.rating
            )}
          </span>

          <span class="prcnt">
            (${Number(
              p.reviews
            ).toLocaleString(
              'pt-BR'
            )})
          </span>
        </div>

        <div class="price-row">
          <span class="pprice">
            ${fmt(p.price)}
          </span>

          ${oldPrice}
          ${discount}
        </div>

        ${shippingHtml}
      </div>
    </div>
  `;
}

function normalizeForCard(product) {
  return {
    id: String(product.id),
    name:
      product.name ||
      'Produto sem nome',
    desc:
      String(
        product.desc || ''
      ),
    price:
      Number(
        product.price
      ) || 0,
    old:
      Number(
        product.old
      ) || 0,
    discount:
      Number(
        product.discount
      ) || 0,
    rating:
      Number(
        product.rating
      ) || 0,
    reviews:
      Number(
        product.reviews
      ) || 0,
    emoji:
      product.emoji ||
      '📦',
    shipping:
      Boolean(
        product.shipping
      ),
    badge:
      product.badge ||
      '',
    features:
      Array.isArray(
        product.features
      )
        ? product.features
        : [],
    cat:
      Array.isArray(
        product.cat
      )
        ? product.cat
        : (
            product.cat
              ? [product.cat]
              : []
          ),
    image_url:
      product.image_url ||
      null,
    gallery_urls:
      Array.isArray(
        product.gallery_urls
      )
        ? product.gallery_urls
            .filter(Boolean)
            .slice(
              0,
              5
            )
        : []
  };
}

function getProductBadgeHtml(product) {
  if (
    product.badge ===
    'hot'
  ) {
    return `
      <span class="bpill bhot">
        🔥 Hot
      </span>
    `;
  }

  if (
    product.badge ===
    'new'
  ) {
    return `
      <span class="bpill bnew">
        Novo
      </span>
    `;
  }

  if (
    product.discount > 0
  ) {
    return `
      <span class="bpill bsale">
        -${product.discount}%
      </span>
    `;
  }

  return '';
}


// ============================================================
// NORMALIZAÇÃO DOS PRODUTOS
// ============================================================

function normalizeProduct(product) {
  const normalized = {
    ...product,

    id:
      String(
        product.id
      ),

    name:
      product.name ||
      'Produto sem nome',

    desc:
      product.desc ||
      '',

    price:
      Number(
        product.price
      ) || 0,

    old:
      Number(
        product.old
      ) || 0,

    discount:
      Number(
        product.discount
      ) || 0,

    rating:
      Number(
        product.rating
      ) || 0,

    reviews:
      Number(
        product.reviews
      ) || 0,

    emoji:
      product.emoji ||
      '📦',

    shipping:
      Boolean(
        product.shipping
      ),

    badge:
      product.badge ||
      '',

    features:
      Array.isArray(
        product.features
      )
        ? product.features
        : [],

    cat:
      Array.isArray(
        product.cat
      )
        ? product.cat
        : (
            product.cat
              ? [product.cat]
              : []
          ),

    image_url:
      product.image_url ||
      null,

    gallery_urls:
      Array.isArray(
        product.gallery_urls
      )
        ? product.gallery_urls
            .filter(Boolean)
            .slice(
              0,
              5
            )
        : []
  };

  productCache.set(
    normalized.id,
    normalized
  );

  return normalized;
}

function getProductById(id) {
  const normalizedId =
    String(id);

  return (
    productCache.get(
      normalizedId
    ) ||
    products.find(
      product =>
        String(product.id) ===
        normalizedId
    ) ||
    null
  );
}

function getProductImages(product) {
  const images = [];

  if (
    product?.image_url
  ) {
    images.push(
      product.image_url
    );
  }

  if (
    Array.isArray(
      product?.gallery_urls
    )
  ) {
    product.gallery_urls.forEach(
      url => {
        if (
          url &&
          !images.includes(url)
        ) {
          images.push(url);
        }
      }
    );
  }

  return images.slice(
    0,
    5
  );
}


// ============================================================
// VIRTUALIZAÇÃO
// ============================================================

function getGridColumns() {
  if (
    view ===
    'list'
  ) {
    return 1;
  }

  const width =
    window.innerWidth;

  if (width <= 600) {
    return 2;
  }

  if (width <= 900) {
    return 3;
  }

  if (width <= 1200) {
    return 4;
  }

  return 5;
}

function getEstimatedRowHeight() {
  if (
    view ===
    'list'
  ) {
    return window.innerWidth <= 768
      ? 500
      : 300;
  }

  if (
    window.innerWidth <= 600
  ) {
    return 360;
  }

  if (
    window.innerWidth <= 900
  ) {
    return 390;
  }

  if (
    window.innerWidth <= 1200
  ) {
    return 400;
  }

  return 420;
}

function ensureVirtualDom() {
  const grid =
    $('productsGrid');

  if (!grid) {
    return null;
  }

  let root =
    $('virtualScrollContent');

  if (!root) {
    grid.innerHTML = `
      <div
        id="virtualScrollContent"
        style="
          position:relative;
          width:100%;
        "
      >
        <div
          id="virtualTopSpacer"
          aria-hidden="true"
        ></div>

        <div
          id="virtualProducts"
        ></div>

        <div
          id="virtualBottomSpacer"
          aria-hidden="true"
        ></div>

        <div
          id="gridSentinel"
          aria-hidden="true"
        ></div>
      </div>
    `;

    root =
      $('virtualScrollContent');

    virtualReady = true;
  }

  return {
    grid,
    root,
    top:
      $('virtualTopSpacer'),
    products:
      $('virtualProducts'),
    bottom:
      $('virtualBottomSpacer'),
    sentinel:
      $('gridSentinel')
  };
}

function destroyProductsObserver() {
  if (
    productsObserver
  ) {
    productsObserver.disconnect();
    productsObserver = null;
  }
}

function renderVirtualProducts() {
  const list =
    products;

  const grid =
    $('productsGrid');

  if (
    !grid
  ) {
    return;
  }

  if (!list.length) {
    destroyProductsObserver();

    virtualReady = false;

    grid.style.minHeight =
      '';

    renderCatalogEmpty();

    return;
  }

  const refs =
    ensureVirtualDom();

  if (!refs) {
    return;
  }

  const columns =
    getGridColumns();

  const rowHeight =
    Math.max(
      100,
      virtualRowHeight ||
        getEstimatedRowHeight()
    );

  const totalRows =
    Math.ceil(
      list.length /
      columns
    );

  const gridTop =
    grid.getBoundingClientRect()
      .top +
    window.scrollY;

  const relativeScroll =
    Math.max(
      0,
      window.scrollY -
      gridTop
    );

  const visibleRows =
    Math.ceil(
      window.innerHeight /
      rowHeight
    );

  const firstRow =
    Math.max(
      0,
      Math.floor(
        relativeScroll /
        rowHeight
      ) -
        2
    );

  const lastRow =
    Math.min(
      totalRows,
      firstRow +
        visibleRows +
        4
    );

  const startIndex =
    firstRow *
    columns;

  const endIndex =
    Math.min(
      list.length,
      lastRow *
      columns
    );

  if (
    startIndex ===
      virtualStartIndex &&
    endIndex ===
      virtualEndIndex &&
    columns ===
      virtualColumns
  ) {
    positionSentinel(
      refs.sentinel,
      totalRows,
      rowHeight
    );

    observeSentinel();

    return;
  }

  virtualStartIndex =
    startIndex;

  virtualEndIndex =
    endIndex;

  virtualColumns =
    columns;

  const topHeight =
    firstRow *
    rowHeight;

  const bottomHeight =
    Math.max(
      0,
      (
        totalRows -
        lastRow
      ) *
        rowHeight
    );

  const totalHeight =
    totalRows *
    rowHeight;

  grid.style.display =
    'block';

  grid.style.minHeight =
    `${totalHeight}px`;

  refs.root.style.minHeight =
    `${totalHeight}px`;

  refs.top.style.height =
    `${topHeight}px`;

  refs.bottom.style.height =
    `${bottomHeight}px`;

  refs.products.style.display =
    'grid';

  refs.products.style.gridTemplateColumns =
    `repeat(
      ${columns},
      minmax(0, 1fr)
    )`;

  refs.products.style.columnGap =
    view === 'list'
      ? '0px'
      : '10px';

  refs.products.style.rowGap =
    view === 'list'
      ? '12px'
      : '10px';

  refs.products.innerHTML =
    list
      .slice(
        startIndex,
        endIndex
      )
      .map(
        productCardHtml
      )
      .join('');

  positionSentinel(
    refs.sentinel,
    totalRows,
    rowHeight
  );

  observeSentinel();

  measureVirtualRow(
    refs.products,
    columns
  );
}

function measureVirtualRow(
  container,
  columns
) {
  const cards =
    [
      ...container.querySelectorAll(
        '.pcard'
      )
    ];

  if (!cards.length) {
    return;
  }

  const rowCards =
    cards.slice(
      0,
      columns
    );

  const rowHeight =
    Math.max(
      ...rowCards.map(
        card =>
          card.getBoundingClientRect()
            .height
      )
    );

  const gap =
    view === 'list'
      ? 12
      : 10;

  const measured =
    rowHeight +
    gap;

  if (
    Number.isFinite(
      measured
    ) &&
    measured > 100 &&
    Math.abs(
      measured -
        virtualRowHeight
    ) > 2
  ) {
    virtualRowHeight =
      measured;

    virtualStartIndex = -1;
    virtualEndIndex = -1;

    requestAnimationFrame(
      renderVirtualProducts
    );
  }
}

function positionSentinel(
  sentinel,
  totalRows,
  rowHeight
) {
  if (!sentinel) {
    return;
  }

  if (
    !hasMoreProducts
  ) {
    sentinel.style.display =
      'none';

    return;
  }

  sentinel.style.display =
    'block';

  sentinel.style.position =
    'absolute';

  sentinel.style.left =
    '0';

  sentinel.style.right =
    '0';

  sentinel.style.top =
    `${Math.max(
      0,
      totalRows *
        rowHeight -
        900
    )}px`;

  sentinel.style.height =
    '1px';

  sentinel.style.pointerEvents =
    'none';
}

function observeSentinel() {
  const sentinel =
    $('gridSentinel');

  if (
    !sentinel ||
    !hasMoreProducts
  ) {
    destroyProductsObserver();
    return;
  }

  if (
    productsObserver
  ) {
    productsObserver.disconnect();
  }

  productsObserver =
    new IntersectionObserver(
      async entries => {
        const entry =
          entries[0];

        if (
          !entry?.isIntersecting
        ) {
          return;
        }

        if (
          loadingServerPage
        ) {
          return;
        }

        destroyProductsObserver();

        await loadNextProductPage();
      },
      {
        root: null,
        rootMargin:
          '0px 0px 900px 0px',
        threshold: 0
      }
    );

  productsObserver.observe(
    sentinel
  );
}

function renderProducts() {
  virtualRowHeight =
    getEstimatedRowHeight();

  renderVirtualProducts();
}


// ============================================================
// CONTROLES DO CATÁLOGO
// ============================================================

function setupCatalogControls() {
  const inputs =
    [
      $('heroSearch'),
      $('headerSearch')
    ].filter(Boolean);

  inputs.forEach(
    input => {
      input.addEventListener(
        'input',
        () => {
          catalogCategory =
            null;

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

          clearTimeout(
            catalogSearchDebounce
          );

          catalogSearchDebounce =
            setTimeout(
              () => {
                resetCatalogAndLoad();
              },
              280
            );
        }
      );
    }
  );

  const sortSelect =
    $('sortSelect');

  if (sortSelect) {
    sortSelect.addEventListener(
      'change',
      () => {
        resetCatalogAndLoad();
      }
    );
  }

  window.addEventListener(
    'resize',
    () => {
      virtualRowHeight =
        getEstimatedRowHeight();

      virtualStartIndex = -1;
      virtualEndIndex = -1;
      virtualColumns = 0;

      renderProducts();
    },
    {
      passive: true
    }
  );
}

function searchFor(term) {
  const value =
    String(term || '');

  catalogCategory =
    null;

  if ($('heroSearch')) {
    $('heroSearch').value =
      value;
  }

  if ($('headerSearch')) {
    $('headerSearch').value =
      value;
  }

  clearTimeout(
    catalogSearchDebounce
  );

  resetCatalogAndLoad();
}

async function setView(v) {
  if (
    v !== 'grid' &&
    v !== 'list'
  ) {
    return;
  }

  view =
    v;

  if ($('productsGrid')) {
    $('productsGrid').className =
      'products-grid' +
      (
        v === 'list'
          ? ' lv'
          : ''
      );
  }

  if ($('gridBtn')) {
    $('gridBtn').classList.toggle(
      'on',
      v === 'grid'
    );
  }

  if ($('listBtn')) {
    $('listBtn').classList.toggle(
      'on',
      v === 'list'
    );
  }

  virtualReady = false;
  virtualStartIndex = -1;
  virtualEndIndex = -1;
  virtualColumns = 0;
  virtualRowHeight =
    getEstimatedRowHeight();

  if (
    productsObserver
  ) {
    productsObserver.disconnect();
    productsObserver = null;
  }

  renderProducts();
}

async function filterByCategory(
  event,
  category
) {
  if (event) {
    event.preventDefault();
  }

  catalogCategory =
    String(
      category || ''
    ).trim();

  if ($('headerSearch')) {
    $('headerSearch').value =
      catalogCategory;
  }

  if ($('heroSearch')) {
    $('heroSearch').value =
      catalogCategory;
  }

  await resetCatalogAndLoad();

  const section =
    $('produtos');

  if (section) {
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

async function shuffleAndRender() {
  if ($('sortSelect')) {
    $('sortSelect').value =
      'random';
  }

  catalogCategory =
    null;

  if ($('heroSearch')) {
    $('heroSearch').value =
      '';
  }

  if ($('headerSearch')) {
    $('headerSearch').value =
      '';
  }

  await resetCatalogAndLoad();

  showToast(
    'Produtos embaralhados! 🔀'
  );
}

async function loadShuffleAndRender() {
  await shuffleAndRender();
}


// ============================================================
// MODAL DE PRODUTO
// ============================================================

async function openProduct(id) {
  const normalizedId =
    String(id);

  let product =
    getProductById(
      normalizedId
    );

  if (!product) {
    product =
      await fetchSingleProduct(
        normalizedId
      );
  }

  if (!product) {
    console.error(
      'Produto não encontrado:',
      normalizedId
    );

    return;
  }

  document.body.classList.add(
    'noscroll'
  );

  curId =
    normalizedId;

  mQtyVal =
    1;

  if ($('mQty')) {
    $('mQty').textContent =
      '1';
  }

  const images =
    getProductImages(
      product
    );

  const mainImage =
    images[0] ||
    null;

  const mEmoji =
    $('mEmoji');

  if (mEmoji) {
    mEmoji.innerHTML =
      mainImage
        ? `
          <img
            src="${escapeHtml(
              mainImage
            )}"
            alt="${escapeHtml(
              product.name
            )}"
            decoding="async"
            fetchpriority="high"
          >
        `
        : escapeHtml(
            product.emoji
          );

    mEmoji.style.position =
      'relative';
  }

  renderModalGallery(
    product,
    images
  );

  if ($('mCat')) {
    $('mCat').textContent =
      Array.isArray(
        product.cat
      )
        ? product.cat.join(
            ', '
          )
        : product.cat || '';
  }

  if ($('mName')) {
    $('mName').textContent =
      product.name;
  }

  if ($('mDesc')) {
    $('mDesc').textContent =
      product.desc;
  }

  if ($('mPrice')) {
    $('mPrice').textContent =
      fmt(product.price);
  }

  if ($('mOld')) {
    $('mOld').textContent =
      product.old > 0
        ? fmt(
            product.old
          )
        : '';
  }

  if ($('mDisc')) {
    $('mDisc').textContent =
      product.discount > 0
        ? `-${product.discount}% OFF`
        : '';
  }

  if ($('mFeats')) {
    $('mFeats').innerHTML =
      product.features
        .map(
          feature => `
            <div class="m-feat">
              <div class="fchk">
                ✓
              </div>
              ${escapeHtml(
                feature
              )}
            </div>
          `
        )
        .join('');
  }

  if ($('mWish')) {
    $('mWish').classList.toggle(
      'on',
      fav.some(
        item =>
          String(item.id) ===
          normalizedId
      )
    );
  }

  if ($('modalOverlay')) {
    $('modalOverlay').classList.add(
      'on'
    );
  }
}

async function fetchSingleProduct(id) {
  const normalizedId =
    String(id);

  const {
    data,
    error
  } =
    await supabaseClient
      .from('products')
      .select(
        PRODUCT_SELECT_FIELDS
      )
      .eq(
        'id',
        normalizedId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'Erro ao buscar produto:',
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return normalizeProduct(
    data
  );
}

function renderModalGallery(
  product,
  images
) {
  const gallery =
    $('modalGallery');

  const main =
    $('mEmoji');

  if (!gallery) {
    return;
  }

  gallery.innerHTML =
    '';

  if (
    images.length <= 1
  ) {
    gallery.style.display =
      'none';

    return;
  }

  gallery.style.display =
    'flex';

  images.forEach(
    (
      image,
      index
    ) => {
      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        'modal-gallery-thumb' +
        (
          index === 0
            ? ' on'
            : ''
        );

      button.innerHTML = `
        <img
          src="${escapeHtml(
            image
          )}"
          alt="${escapeHtml(
            product.name
          )} - imagem ${index + 1}"
          loading="lazy"
          decoding="async"
        >
      `;

      button.addEventListener(
        'click',
        () => {
          if (main) {
            main.innerHTML = `
              <img
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  product.name
                )}"
                decoding="async"
              >
            `;
          }

          gallery
            .querySelectorAll(
              '.modal-gallery-thumb'
            )
            .forEach(
              item =>
                item.classList.remove(
                  'on'
                )
            );

          button.classList.add(
            'on'
          );
        }
      );

      gallery.appendChild(
        button
      );
    }
  );
}

function handleModalClick(
  event
) {
  const overlay =
    $('modalOverlay');

  if (
    overlay &&
    event.target === overlay
  ) {
    closeModal();
  }
}

function closeModal() {
  if ($('modalOverlay')) {
    $('modalOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'noscroll'
  );
}

function chgQty(delta) {
  mQtyVal =
    Math.max(
      1,
      mQtyVal +
        Number(delta || 0)
    );

  if ($('mQty')) {
    $('mQty').textContent =
      mQtyVal;
  }
}

function addFromModal() {
  addToCart(
    String(curId),
    mQtyVal
  );

  closeModal();

  openCart();
}

function addFromModal2() {
  addToFav(
    String(curId),
    mQtyVal
  );

  closeModal();

  openFav();
}


// ============================================================
// PERFIL / CARRINHO / FAVORITOS DO USUÁRIO
// ============================================================

async function hydrateUserItems(
  savedItems
) {
  if (
    !Array.isArray(
      savedItems
    ) ||
    !savedItems.length
  ) {
    return [];
  }

  const ids =
    savedItems
      .map(
        item =>
          String(
            item?.id || ''
          )
      )
      .filter(Boolean);

  const missingIds =
    ids.filter(
      id =>
        !productCache.has(
          id
        )
    );

  if (missingIds.length) {
    const {
      data,
      error
    } =
      await supabaseClient
        .from('products')
        .select(
          PRODUCT_SELECT_FIELDS
        )
        .in(
          'id',
          missingIds
        );

    if (
      !error &&
      Array.isArray(data)
    ) {
      data.forEach(
        product => {
          const normalized =
            normalizeProduct(
              product
            );

          productCache.set(
            normalized.id,
            normalized
          );
        }
      );
    } else if (error) {
      console.error(
        'Erro ao carregar produtos salvos:',
        error
      );
    }
  }

  return savedItems
    .map(
      item => {
        const id =
          String(
            item?.id || ''
          );

        const product =
          productCache.get(
            id
          );

        if (!product) {
          return null;
        }

        return {
          ...product,
          id,
          qty:
            Math.max(
              1,
              Number(
                item.qty
              ) || 1
            )
        };
      }
    )
    .filter(Boolean);
}

async function syncToSupabase() {
  if (!userId) {
    return;
  }

  const cartToSave =
    cart.map(
      item => ({
        id:
          String(
            item.id
          ),
        qty:
          Math.max(
            1,
            Number(
              item.qty
            ) || 1
          )
      })
    );

  const favToSave =
    fav.map(
      item => ({
        id:
          String(
            item.id
          ),
        qty:
          Math.max(
            1,
            Number(
              item.qty
            ) || 1
          )
      })
    );

  const {
    error
  } =
    await supabaseClient
      .from('profiles')
      .update({
        cart:
          cartToSave,
        fav:
          favToSave
      })
      .eq(
        'id',
        userId
      );

  if (error) {
    console.error(
      'Erro ao sincronizar carrinho/favoritos:',
      error
    );
  }
}

async function loadFromSupabase() {
  if (!userId) {
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from('profiles')
      .select(
        'cart, fav'
      )
      .eq(
        'id',
        userId
      )
      .single();

  if (error) {
    console.error(
      'Erro ao carregar carrinho/favoritos:',
      error
    );

    return;
  }

  cart =
    await hydrateUserItems(
      data?.cart
    );

  fav =
    await hydrateUserItems(
      data?.fav
    );

  updateCart();
  updateFav();
}


// ============================================================
// SIDEBARS
// ============================================================

function openNotif() {
  closeCart();
  closeFav();
  closeAcc();
  closeMore();

  if ($('notifSidebar')) {
    $('notifSidebar').classList.add(
      'on'
    );
  }

  if ($('notifOverlay')) {
    $('notifOverlay').classList.add(
      'on'
    );
  }

  document.body.classList.add(
    'nobodyscroll'
  );
}

function closeNotif() {
  if ($('notifSidebar')) {
    $('notifSidebar').classList.remove(
      'on'
    );
  }

  if ($('notifOverlay')) {
    $('notifOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'nobodyscroll'
  );
}

function openMore() {
  closeFav();
  closeCart();
  closeAcc();
  closeNotif();

  if ($('moreSidebar')) {
    $('moreSidebar').classList.add(
      'on'
    );
  }

  if ($('moreOverlay')) {
    $('moreOverlay').classList.add(
      'on'
    );
  }

  document.body.classList.add(
    'nobodyscroll'
  );
}

function closeMore() {
  if ($('moreSidebar')) {
    $('moreSidebar').classList.remove(
      'on'
    );
  }

  if ($('moreOverlay')) {
    $('moreOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'nobodyscroll'
  );
}

function openAcc() {
  closeCart();
  closeFav();
  closeNotif();
  closeMore();

  if ($('accSidebar')) {
    $('accSidebar').classList.add(
      'on'
    );
  }

  if ($('accOverlay')) {
    $('accOverlay').classList.add(
      'on'
    );
  }

  document.body.classList.add(
    'nobodyscroll'
  );
}

function closeAcc() {
  if ($('accSidebar')) {
    $('accSidebar').classList.remove(
      'on'
    );
  }

  if ($('accOverlay')) {
    $('accOverlay').classList.remove(
      'on'
    );
  }

  document.body.classList.remove(
    'nobodyscroll'
  );
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {
  const toast =
    $('toast');

  const messageElement =
    $('toastMsg');

  if (
    !toast ||
    !messageElement
  ) {
    return;
  }

  messageElement.textContent =
    message;

  toast.classList.add(
    'show'
  );

  setTimeout(
    () => {
      toast.classList.remove(
        'show'
      );
    },
    2800
  );
}

function toast(message) {
  showToast(
    message
  );
}


// ============================================================
// ALERT / AUTH MODALS
// ============================================================

function injectModalStyles() {
  if (
    $('modal-alert-styles')
  ) {
    return;
  }

  const style =
    document.createElement(
      'style'
    );

  style.id =
    'modal-alert-styles';

  style.textContent = `
    .modal-alert-container {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      transition: opacity .3s ease;
    }

    .modal-alert-container.active {
      opacity: 1;
      pointer-events: auto;
    }

    .modal-alert-content {
      background: #fff;
      padding: 30px;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,.2);
      transform: scale(.8);
      transition: transform .3s ease;
    }

    .modal-alert-container.active
    .modal-alert-content {
      transform: scale(1);
    }

    .modal-alert-icon {
      font-size: 44px;
      margin-bottom: 15px;
    }

    .modal-alert-content h3 {
      margin: 0 0 10px;
      color: #10161a;
      font-size: 20px;
      font-weight: 700;
    }

    .modal-alert-content p {
      color: #707c8a;
      font-size: 14.5px;
      line-height: 1.5;
      margin: 0 0 24px;
    }

    .modal-alert-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-alert-confirm,
    .btn-alert-cancel {
      border: none;
      padding: 11px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background .2s;
    }

    .btn-alert-confirm {
      background: #2563EB;
      color: #fff;
    }

    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }

    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
    }

    .btn-alert-cancel:hover {
      background: #d1d5db;
    }
  `;

  document.head.appendChild(
    style
  );
}

function showAlert(
  message,
  title,
  icon
) {
  injectModalStyles();

  let modal =
    $('alertModal');

  if (!modal) {
    modal =
      document.createElement(
        'div'
      );

    modal.id =
      'alertModal';

    modal.className =
      'modal-alert-container';

    modal.innerHTML = `
      <div class="modal-alert-content">
        <div
          class="modal-alert-icon"
          id="alertIcon"
        >
          ${icon}
        </div>

        <h3 id="alertTitle">
          ${escapeHtml(title)}
        </h3>

        <p id="alertMsg">
          ${escapeHtml(message)}
        </p>

        <div class="modal-alert-buttons">
          <button
            class="btn-alert-confirm"
            onclick="closeAlert()"
          >
            OK
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(
      modal
    );
  } else {
    $('alertIcon').textContent =
      icon;

    $('alertTitle').textContent =
      title;

    $('alertMsg').textContent =
      message;
  }

  modal.classList.add(
    'active'
  );
}

function showAuth(
  message,
  title,
  icon
) {
  injectModalStyles();

  let modal =
    $('authModal');

  if (!modal) {
    modal =
      document.createElement(
        'div'
      );

    modal.id =
      'authModal';

    modal.className =
      'modal-alert-container';

    modal.innerHTML = `
      <div class="modal-alert-content">
        <div
          class="modal-alert-icon"
          id="authIcon"
        >
          ${icon}
        </div>

        <h3 id="authTitle">
          ${escapeHtml(title)}
        </h3>

        <p id="authMsg">
          ${escapeHtml(message)}
        </p>

        <div class="modal-alert-buttons">
          <button
            class="btn-alert-cancel"
            onclick="closeAuth()"
          >
            Cancelar
          </button>

          <button
            class="btn-alert-confirm"
            onclick="
              buttonLink('/login')
            "
          >
            Fazer Login
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(
      modal
    );
  } else {
    $('authIcon').textContent =
      icon;

    $('authTitle').textContent =
      title;

    $('authMsg').textContent =
      message;
  }

  modal.classList.add(
    'active'
  );
}

function closeAlert() {
  if ($('alertModal')) {
    $('alertModal').classList.remove(
      'active'
    );
  }
}

function closeAuth() {
  if ($('authModal')) {
    $('authModal').classList.remove(
      'active'
    );
  }
}


// ============================================================
// ESTADOS VISUAIS DO CATÁLOGO
// ============================================================

function renderCatalogLoading() {
  const grid =
    $('productsGrid');

  if (!grid) {
    return;
  }

  destroyProductsObserver();

  virtualReady =
    false;

  grid.style.minHeight =
    '';

  grid.innerHTML = `
    <div
      class="empty"
      style="grid-column:1/-1;"
    >
      <div class="empty-ico">
        ⏳
      </div>

      <h3>
        Carregando produtos...
      </h3>
    </div>
  `;
}

function renderCatalogError() {
  const grid =
    $('productsGrid');

  if (!grid) {
    return;
  }

  grid.innerHTML = `
    <div
      class="empty"
      style="grid-column:1/-1;"
    >
      <div class="empty-ico">
        ⚠️
      </div>

      <h3>
        Não foi possível carregar os produtos
      </h3>

      <p>
        Atualize a página e tente novamente.
      </p>

      <button
        class="btn-clear"
        onclick="
          resetCatalogAndLoad()
        "
      >
        Tentar novamente
      </button>
    </div>
  `;
}

function renderCatalogEmpty() {
  const grid =
    $('productsGrid');

  if (!grid) {
    return;
  }

  grid.style.display =
    '';

  grid.innerHTML = `
    <div
      class="empty"
      style="grid-column:1/-1;"
    >
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
            clearCatalogSearch()
          "
        >
          Limpar busca
        </button>
      </p>
    </div>
  `;
}

async function clearCatalogSearch() {
  catalogCategory =
    null;

  if ($('headerSearch')) {
    $('headerSearch').value =
      '';
  }

  if ($('heroSearch')) {
    $('heroSearch').value =
      '';
  }

  await resetCatalogAndLoad();
}


// ============================================================
// TECLADO / ESC
// ============================================================

function setupKeyboardControls() {
  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key !==
        'Escape'
      ) {
        return;
      }

      closeModal();
      closeCart();
      closeFav();
      closeMore();
      closeAcc();
      closeNotif();
    }
  );
}


// ============================================================
// ESCAPE DE HTML / JS
// ============================================================

function escapeHtml(value) {
  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function escapeJsString(value) {
  return String(
    value ?? ''
  )
    .replace(
      /\\/g,
      '\\\\'
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\r/g,
      '\\r'
    )
    .replace(
      /\n/g,
      '\\n'
    );
}


// ============================================================
// LOGOUT
// ============================================================

async function doLogout() {
  showToast(
    'Saindo da conta... 👋'
  );

  const {
    error
  } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error(
      'Erro ao sair:',
      error
    );

    showToast(
      'Não foi possível sair da conta.'
    );

    return;
  }

  buttonLink(
    '/login'
  );
}
