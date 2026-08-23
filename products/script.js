// ============================================================
// ECOMME / PRODUCTS
// PAGINAÇÃO SERVER-SIDE + VIRTUALIZAÇÃO DO CATÁLOGO
// ============================================================


// ============================================================
// FAVICON
// ============================================================

const favicon = document.getElementById('favicon');

function verificarTema(e) {
  if (!favicon) return;

  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}

const mqEscuro =
  window.matchMedia('(prefers-color-scheme: dark)');

verificarTema(mqEscuro);

if (mqEscuro.addEventListener) {
  mqEscuro.addEventListener(
    'change',
    verificarTema
  );
}


// ============================================================
// GERAIS
// ============================================================

document.body.style.cursor = "default";

function buttonLink(url) {
  window.location.href = url;
}

function injectPrefetch(url) {
  if (!url) return;

  if (
    !document.querySelector(
      `link[href="${url}"]`
    )
  ) {
    const link = document.createElement('link');

    link.rel = 'prefetch';
    link.href = url;

    document.head.appendChild(link);
  }
}


// ============================================================
// ESTADO PRINCIPAL
// ============================================================

let products = [];

let cart = [];
let fav = [];

let curId = null;
let mQtyVal = 1;

let view = 'grid';

let shuffled = [];


// ============================================================
// CONFIGURAÇÃO DO CATÁLOGO
// ============================================================

// Quantos produtos o navegador pede ao Supabase por vez.
const SERVER_PAGE_SIZE = 48;

// Quantas linhas extras ficam renderizadas acima/abaixo
// da área visível.
const VIRTUAL_OVERSCAN_ROWS = 2;

// Página atual do Supabase.
let serverPage = 0;

// Informa se existem mais produtos no servidor.
let hasMoreProducts = true;

// Evita duas requisições simultâneas.
let loadingServerPage = false;

// Identificador da requisição atual.
// Serve para invalidar requisições antigas quando
// o usuário faz uma nova busca rapidamente.
let catalogRequestId = 0;

// Debounce da pesquisa.
let catalogSearchDebounce = null;

// Categoria atualmente selecionada.
let catalogCategory = null;


// ============================================================
// CACHE DOS PRODUTOS
// ============================================================

// Mantém produtos que já foram obtidos.
//
// Também permite que um produto do carrinho/favoritos
// continue disponível mesmo que ele não esteja na
// página atual do catálogo.
const productCache = new Map();


// ============================================================
// ESTADO DA VIRTUALIZAÇÃO
// ============================================================

let virtualStartIndex = -1;
let virtualEndIndex = -1;
let virtualColumns = 0;

let virtualRowHeight = 390;

let virtualScrollRaf = false;

let virtualReady = false;

let productsObserver = null;


// ============================================================
// ESTADO DE SCROLL
// ============================================================

let isScrolling = false;
let scrollTimer = null;


// ============================================================
// UTILITÁRIOS
// ============================================================

const fmt = p => {
  if (p == null || p === '') {
    return '';
  }

  return (
    'R$ ' +
    Number(p)
      .toFixed(2)
      .replace('.', ',')
  );
};

const $ = id =>
  document.getElementById(id);


// ============================================================
// ESTRELAS
// ============================================================

function starsHtml(r) {

  const rating =
    Number(r) || 0;

  let s = '';

  const filled =
    Math.floor(rating);

  for (let i = 0; i < filled; i++) {
    s += '★';
  }

  for (
    let i = filled;
    i < 5;
    i++
  ) {
    s += '☆';
  }

  return s;
}


// ============================================================
// FISHER-YATES
// ============================================================

function fishYates(arr) {

  const a = [...arr];

  for (
    let i = a.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      a[i],
      a[j]
    ] = [
      a[j],
      a[i]
    ];
  }

  return a;
}


// ============================================================
// BUSCAR PRODUTO PELO ID
// ============================================================

function getProductById(id) {

  const normalizedId =
    String(id);

  return (
    productCache.get(normalizedId) ||
    products.find(
      p =>
        String(p.id) ===
        normalizedId
    ) ||
    null
  );
}


// ============================================================
// SCROLL
// ============================================================

window.addEventListener(
  'scroll',
  () => {

    isScrolling = true;

    document.documentElement.classList.add(
      'is-scrolling'
    );

    clearTimeout(scrollTimer);

    scrollTimer =
      setTimeout(() => {

        isScrolling = false;

        document.documentElement.classList.remove(
          'is-scrolling'
        );

      }, 120);

    if (virtualScrollRaf) {
      return;
    }

    virtualScrollRaf = true;

    requestAnimationFrame(() => {

      const backTop =
        document.getElementById(
          'backTop'
        );

      if (backTop) {

        backTop.classList.toggle(
          'visible',
          window.scrollY > 400
        );

      }

      if (virtualReady) {
        renderVirtualProducts();
      }

      virtualScrollRaf = false;

    });

  },
  {
    passive: true
  }
);


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
  "https://cedrpcezoaqaeivrfuxn.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

let userId = null;


// ============================================================
// DOMContentLoaded
// ============================================================

window.addEventListener(
  'DOMContentLoaded',
  async () => {

    const loginBtn =
      document.getElementById(
        'authLoginBtn'
      );

    const profileContainer =
      document.getElementById(
        'headerProfileContainer'
      );

    const headerImage =
      document.getElementById(
        'headerAvatar'
      );


    // ----------------------------------------------------------
    // Controles do catálogo
    // ----------------------------------------------------------

    setupCatalogControls();


    // ----------------------------------------------------------
    // Primeiro carregamos produtos
    // ----------------------------------------------------------

    const productsLoaded =
      await loadProductsFromSupabase({
        reset: true
      });


    if (!productsLoaded) {

      console.error(
        'Não foi possível carregar os produtos.'
      );

      return;
    }


    // ----------------------------------------------------------
    // Verificação da sessão
    // ----------------------------------------------------------

    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseClient.auth.getUser();


    // ----------------------------------------------------------
    // Visitante não logado
    // ----------------------------------------------------------

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

      injectPrefetch(
        '/login'
      );

      renderProducts();

      return;
    }


    // ----------------------------------------------------------
    // Usuário logado
    // ----------------------------------------------------------

    userId =
      user.id;


    // ----------------------------------------------------------
    // Carrinho + favoritos
    // ----------------------------------------------------------

    await loadFromSupabase();


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


    // ----------------------------------------------------------
    // Perfil
    // ----------------------------------------------------------

    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();


    if (
      !profileError &&
      profile
    ) {

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


      const photoUrl =
        profile.avatar_url ||
        '';


      if (
        photoUrl &&
        headerImage
      ) {

        headerImage.src =
          photoUrl;

        headerImage.style.filter =
          'none';

        headerImage.style.width =
          '100%';

        headerImage.style.height =
          '100%';

        headerImage.style.borderRadius =
          '100%';

        headerImage.style.objectFit =
          'cover';
      }
    }


    // ----------------------------------------------------------
    // Render inicial
    // ----------------------------------------------------------

    renderProducts();

  }
);


// ============================================================
// HEADER AUTH
// ============================================================

function initHeaderAuthListener() {

  const loginBtn =
    document.getElementById(
      'authLoginBtn'
    );

  const profileContainer =
    document.getElementById(
      'headerProfileContainer'
    );

  const bellBtn =
    document.getElementById(
      'bellBtn'
    );

  const headerAvatar =
    document.getElementById(
      'headerAvatar'
    );


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


        try {

          const {
            data: profileData,
            error: profileError
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
            !profileError &&
            profileData &&
            profileData.avatar_url
          ) {

            if (headerAvatar) {

              headerAvatar.src =
                profileData.avatar_url;
            }

          } else {

            if (headerAvatar) {

              headerAvatar.src =
                "/images/icons/full/user.webp";
            }
          }

        } catch (err) {

          console.error(
            "Erro ao carregar o avatar do header:",
            err
          );
        }


      } else {

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
            "/images/icons/full/user.webp";
        }

      }

    }
  );
}

initHeaderAuthListener();


// ============================================================
// CART
// ============================================================

function addToCart(
  id,
  qty = 1
) {

  if (!userId) {

    showAuth(
      "Para adicionar produtos ao carrinho e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );

    return;
  }


  const normalizedId =
    String(id);

  const p =
    getProductById(
      normalizedId
    );


  if (!p) {

    console.error(
      "Produto não encontrado para o carrinho:",
      normalizedId
    );

    return;
  }


  const ex =
    cart.find(
      x =>
        String(x.id) ===
        normalizedId
    );


  if (ex) {

    ex.qty +=
      Number(qty) || 1;

  } else {

    cart.push({

      ...p,

      id:
        normalizedId,

      qty:
        Number(qty) || 1

    });
  }


  updateCart();

  showToast(
    `${p.name} adicionado ao carrinho! 🛒`
  );

  syncToSupabase();
}


function removeFromCart(id) {

  const normalizedId =
    String(id);

  cart =
    cart.filter(
      x =>
        String(x.id) !==
        normalizedId
    );

  updateCart();

  syncToSupabase();
}


function changeCartQty(
  id,
  d
) {

  const normalizedId =
    String(id);

  const item =
    cart.find(
      x =>
        String(x.id) ===
        normalizedId
    );


  if (!item) {
    return;
  }


  item.qty +=
    Number(d) || 0;


  if (item.qty <= 0) {

    removeFromCart(
      normalizedId
    );

    return;
  }


  updateCart();

  syncToSupabase();
}


// ============================================================
// UPDATE CART
// ============================================================

function updateCart() {

  const validCart =
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
          qty:
            Number(item.qty) || 1
        };
      })
      .filter(Boolean);


  cart =
    validCart;


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


  const el =
    $('cartItems');


  if (!el) {
    return;
  }


  if (!cart.length) {

    el.innerHTML = `

      <div class="cart-empty-st">

        <span>🛒</span>

        <p>
          Seu carrinho está vazio
        </p>

      </div>

    `;

    return;
  }


  el.innerHTML =
    cart
      .map(item => {

        const images =
          getProductImages(
            item
          );

        const image =
          images[0] || null;


        return `

          <div class="ci">

            <div class="ci-img">

              ${
                image

                ?

                `
                <img
                  src="${image}"
                  alt="${item.name}"
                  loading="lazy"
                  decoding="async"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:inherit;
                  "
                >
                `

                :

                item.emoji

              }

            </div>


            <div class="ci-info">

              <div class="ci-name">
                ${item.name}
              </div>

              <div class="ci-price">
                ${fmt(item.price)}
              </div>

              <div class="ci-qty">

                <button
                  class="qb"
                  onclick="
                    changeCartQty(
                      '${item.id}',
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
                      '${item.id}',
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
                  '${item.id}'
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
                  '${item.id}'
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


// ============================================================
// CART SIDEBAR
// ============================================================

function openCart() {

  closeMore();
  closeFav();
  closeNotif();
  closeAcc();

  const sidebar =
    $('cartSidebar');

  const overlay =
    $('cartOverlay');

  if (sidebar) {
    sidebar.classList.add('on');
  }

  if (overlay) {
    overlay.classList.add('on');
  }

  document.body.classList.add(
    "nobodyscroll"
  );
}


function closeCart() {

  if ($('cartSidebar')) {

    $('cartSidebar')
      .classList.remove('on');
  }

  if ($('cartOverlay')) {

    $('cartOverlay')
      .classList.remove('on');
  }

  document.body.classList.remove(
    "nobodyscroll"
  );
}


function checkout() {

  if (!cart.length) {

    showAlert(
      "Para finalizar a compra, é necessário adicionar produtos ao carrinho primeiro!",
      "Sem Itens no Carrinho",
      "ℹ️"
    );

    return;
  }

  showToast(
    'Redirecionando para o pagamento... 🔒'
  );

  window.location.href =
    "/checkout";
}


// ============================================================
// FAVORITOS
// ============================================================

function syncWishlistButtons(
  id
) {

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
    .forEach(button => {

      if (
        String(
          button.dataset.productId
        ) !==
        normalizedId
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

    });


  if ($('mWish')) {

    $('mWish').classList.toggle(
      'on',
      active
    );
  }
}


function toggleFav(id) {

  if (!userId) {

    showAuth(
      "Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );

    return;
  }


  const normalizedId =
    String(id);


  const ex =
    fav.find(
      x =>
        String(x.id) ===
        normalizedId
    );


  if (ex) {

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
      "Para adicionar itens à sua lista de desejos e salvá-los na sua conta, é necessário fazer login ou criar uma nova conta.",
      "Conta Necessária",
      "🔒"
    );

    return;
  }


  const normalizedId =
    String(id);


  const p =
    getProductById(
      normalizedId
    );


  if (!p) {

    console.error(
      "Produto não encontrado para favoritos:",
      normalizedId
    );

    return;
  }


  const ex =
    fav.find(
      x =>
        String(x.id) ===
        normalizedId
    );


  if (ex) {

    ex.qty +=
      Number(qty) || 1;

  } else {

    fav.push({

      ...p,

      id:
        normalizedId,

      qty:
        Number(qty) || 1

    });
  }


  updateFav();

  showToast(
    `${p.name} salvo nos favoritos! ❤️`
  );

  syncToSupabase();

  syncWishlistButtons(
    normalizedId
  );
}


function removeFromFav(
  id
) {

  const normalizedId =
    String(id);


  fav =
    fav.filter(
      x =>
        String(x.id) !==
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
  d
) {

  const normalizedId =
    String(id);


  const item =
    fav.find(
      x =>
        String(x.id) ===
        normalizedId
    );


  if (!item) {
    return;
  }


  item.qty +=
    Number(d) || 0;


  if (item.qty <= 0) {

    removeFromFav(
      normalizedId
    );

    return;
  }


  updateFav();

  syncToSupabase();
}


// ============================================================
// UPDATE FAVORITOS
// ============================================================

function updateFav() {

  const validFav =
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
          qty:
            Number(item.qty) || 1
        };

      })
      .filter(Boolean);


  fav =
    validFav;


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


  const el =
    $('favItems');


  if (!el) {
    return;
  }


  if (!fav.length) {

    el.innerHTML = `

      <div class="fav-empty-st">

        <span>❤️</span>

        <p>
          Nenhum produto salvo no momento
        </p>

      </div>

    `;

    return;
  }


  el.innerHTML =
    fav
      .map(item => {

        const images =
          getProductImages(
            item
          );

        const image =
          images[0] || null;


        return `

          <div class="ci">

            <div class="ci-img">

              ${
                image

                ?

                `
                <img
                  src="${image}"
                  alt="${item.name}"
                  loading="lazy"
                  decoding="async"
                  style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:inherit;
                  "
                >
                `

                :

                item.emoji

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
                  addToCart(
                    '${item.id}',
                    1
                  );

                  removeFromFav(
                    '${item.id}'
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
                  '${item.id}'
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

    $('favSidebar')
      .classList.add('on');
  }

  if ($('favOverlay')) {

    $('favOverlay')
      .classList.add('on');
  }

  document.body.classList.add(
    "nobodyscroll"
  );
}


function closeFav() {

  if ($('favSidebar')) {

    $('favSidebar')
      .classList.remove('on');
  }

  if ($('favOverlay')) {

    $('favOverlay')
      .classList.remove('on');
  }

  document.body.classList.remove(
    "nobodyscroll"
  );
}


function addAllFavToCart() {

  if (!fav.length) {

    showToast(
      'Adicione produtos primeiro! 😊'
    );

    return;
  }


  const items =
    [...fav];


  items.forEach(
    produto => {

      addToCart(
        String(produto.id),
        1
      );

    }
  );


  fav = [];

  updateFav();

  renderProducts();

  closeFav();

  openCart();

  showToast(
    'Todos os itens foram para o carrinho! 🛒'
  );
}


function moveFromCartToFav(
  id
) {

  addToFav(
    String(id),
    1
  );

  showToast(
    'Produto adicionado à Lista de Desejos! ❤️'
  );
}


// ============================================================
// PAGINAÇÃO SERVER-SIDE
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

  // Se o filtro de categoria estiver ativo,
  // não usamos o texto como segundo filtro.
  if (catalogCategory) {
    return '';
  }


  return String(

    $('heroSearch')?.value ||

    $('headerSearch')?.value ||

    ''

  )
    .trim();
}


function getCatalogSort() {

  return (
    $('sortSelect')?.value ||
    'random'
  );
}


function buildProductsQuery() {

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


  // ----------------------------------------------------------
  // Categoria
  // ----------------------------------------------------------

  if (catalogCategory) {

    query =
      query.contains(
        'cat',
        [catalogCategory]
      );
  }


  // ----------------------------------------------------------
  // Busca textual
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Ordenação
  // ----------------------------------------------------------

  if (
    sort ===
    'price_asc'
  ) {

    query =
      query
        .order(
          'price',
          {
            ascending:
              true
          }
        )
        .order(
          'id',
          {
            ascending:
              true
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
            ascending:
              false
          }
        )
        .order(
          'id',
          {
            ascending:
              true
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
            ascending:
              false
          }
        )
        .order(
          'id',
          {
            ascending:
              true
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
            ascending:
              false
          }
        )
        .order(
          'id',
          {
            ascending:
              true
          }
        );

  } else {

    // Random é tratado localmente por lote.
    // O banco mantém ordem estável.
    query =
      query.order(
        'id',
        {
          ascending:
            true
        }
      );
  }


  return query;
}


// ============================================================
// LIMPAR ESTADO DO CATÁLOGO
// ============================================================

function clearCatalogState() {

  serverPage =
    0;

  hasMoreProducts =
    true;

  products =
    [];

  shuffled =
    [];

  virtualStartIndex =
    -1;

  virtualEndIndex =
    -1;

  virtualColumns =
    0;

  virtualReady =
    false;

  if (productsObserver) {

    productsObserver.disconnect();

    productsObserver =
      null;
  }
}


// ============================================================
// BUSCAR UMA PÁGINA DE PRODUTOS
// ============================================================

async function fetchProductPage({
  reset = false
} = {}) {


  if (reset) {

    catalogRequestId += 1;

    clearCatalogState();
  }


  if (
    !reset &&
    (
      loadingServerPage ||
      !hasMoreProducts
    )
  ) {

    return false;
  }


  loadingServerPage =
    true;


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
      await buildProductsQuery()
        .range(
          from,
          to
        );


    // Se uma pesquisa mais recente foi
    // iniciada enquanto aguardávamos o servidor,
    // ignoramos a resposta antiga.
    if (
      requestId !==
      catalogRequestId
    ) {

      return false;
    }


    if (error) {

      console.error(
        'Erro ao carregar produtos do Supabase:',
        error
      );

      return false;
    }


    const pageProducts =
      (
        data ||
        []
      )
        .map(
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
          p =>
            String(
              p.id
            )
        )
      );


    const newProducts =
      [];


    for (
      const product
      of pageProducts
    ) {

      const id =
        String(
          product.id
        );


      // Atualiza cache global.
      productCache.set(
        id,
        product
      );


      // Evita duplicata.
      if (
        !existingIds.has(
          id
        )
      ) {

        products.push(
          product
        );

        newProducts.push(
          product
        );

        existingIds.add(
          id
        );
      }
    }


    // --------------------------------------------------------
    // Random local por página
    // --------------------------------------------------------

    if (
      getCatalogSort() ===
      'random'
    ) {

      if (
        serverPage ===
        0
      ) {

        products =
          fishYates(
            products
          );

      } else if (
        newProducts.length
      ) {

        const previous =
          products.filter(
            product =>
              !newProducts.includes(
                product
              )
          );


        products = [
          ...previous,
          ...fishYates(
            newProducts
          )
        ];
      }
    }


    shuffled =
      products;


    serverPage +=
      1;


    console.log(
      `Página ${serverPage} carregada | produtos no cliente: ${products.length}`
    );


    return true;


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


// ============================================================
// COMPATIBILIDADE
// ============================================================

async function loadProductsFromSupabase({
  reset = true
} = {}) {

  return fetchProductPage({
    reset
  });
}


// ============================================================
// RESETAR CATÁLOGO + BUSCAR PRIMEIRA PÁGINA
// ============================================================

async function resetCatalogAndLoad() {

  const grid =
    $('productsGrid');


  if (grid) {

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


  const loaded =
    await fetchProductPage({
      reset: true
    });


  if (loaded) {

    virtualStartIndex =
      -1;

    virtualEndIndex =
      -1;

    renderProducts();
  }
}


// ============================================================
// NOTIFICAÇÕES
// ============================================================

function openNotif() {

  closeCart();
  closeFav();
  closeAcc();
  closeMore();

  const sidebar =
    $('notifSidebar');

  const overlay =
    $('notifOverlay');


  if (sidebar) {

    sidebar.classList.add(
      'on'
    );
  }


  if (overlay) {

    overlay.classList.add(
      'on'
    );
  }


  document.body.classList.add(
    "nobodyscroll"
  );
}


function closeNotif() {

  if ($('notifSidebar')) {

    $('notifSidebar')
      .classList.remove('on');
  }

  if ($('notifOverlay')) {

    $('notifOverlay')
      .classList.remove('on');
  }

  document.body.classList.remove(
    "nobodyscroll"
  );
}


// ============================================================
// MORE SIDEBAR
// ============================================================

function openMore() {

  closeFav();
  closeCart();
  closeAcc();
  closeNotif();


  if ($('moreSidebar')) {

    $('moreSidebar')
      .classList.add('on');
  }


  if ($('moreOverlay')) {

    $('moreOverlay')
      .classList.add('on');
  }


  document.body.classList.add(
    "nobodyscroll"
  );
}


function closeMore() {

  if ($('moreSidebar')) {

    $('moreSidebar')
      .classList.remove('on');
  }

  if ($('moreOverlay')) {

    $('moreOverlay')
      .classList.remove('on');
  }

  document.body.classList.remove(
    "nobodyscroll"
  );
}


// ============================================================
// ACCOUNT SIDEBAR
// ============================================================

function openAcc() {

  closeCart();
  closeFav();
  closeNotif();
  closeMore();


  const sb =
    document.getElementById(
      'accSidebar'
    );

  const ov =
    document.getElementById(
      'accOverlay'
    );


  if (sb) {
    sb.classList.add('on');
  }


  if (ov) {
    ov.classList.add('on');
  }


  document.body.classList.add(
    "nobodyscroll"
  );
}


function closeAcc() {

  const sb =
    document.getElementById(
      'accSidebar'
    );

  const ov =
    document.getElementById(
      'accOverlay'
    );


  if (sb) {
    sb.classList.remove(
      'on'
    );
  }


  if (ov) {
    ov.classList.remove(
      'on'
    );
  }


  document.body.classList.remove(
    "nobodyscroll"
  );
}


// ============================================================
// MODAL DO PRODUTO
// ============================================================

function openProduct(id) {

  document.body.classList.add(
    "noscroll"
  );


  const normalizedId =
    String(id);


  const p =
    getProductById(
      normalizedId
    );


  if (!p) {

    console.error(
      "Produto não encontrado:",
      normalizedId
    );

    document.body.classList.remove(
      "noscroll"
    );

    return;
  }


  curId =
    normalizedId;


  mQtyVal =
    1;


  if ($('mQty')) {

    $('mQty').textContent =
      '1';
  }


  // ----------------------------------------------------------
  // IMAGENS
  // ----------------------------------------------------------

  const images =
    getProductImages(
      p
    );


  const mainImage =
    images[0] ||
    null;


  const mEmoji =
    $('mEmoji');


  if (mEmoji) {

    mEmoji.innerHTML =
      mainImage

        ?

        `
          <img
            src="${mainImage}"
            alt="${p.name}"
            decoding="async"
            fetchpriority="high"
          >
        `

        :

        p.emoji;
  }


  // ----------------------------------------------------------
  // GALERIA
  // ----------------------------------------------------------

  const modalGallery =
    $('modalGallery');


  if (modalGallery) {

    modalGallery.innerHTML =
      '';


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
            src="${image}"
            alt="${p.name} - imagem ${index + 1}"
            loading="lazy"
            decoding="async"
          >

        `;


        button.addEventListener(
          'click',
          () => {

            if (mEmoji) {

              mEmoji.innerHTML = `

                <img
                  src="${image}"
                  alt="${p.name}"
                  decoding="async"
                >

              `;
            }


            modalGallery
              .querySelectorAll(
                '.modal-gallery-thumb'
              )
              .forEach(
                btn =>
                  btn.classList.remove(
                    'on'
                  )
              );


            button.classList.add(
              'on'
            );

          }
        );


        modalGallery.appendChild(
          button
        );

      }
    );


    modalGallery.style.display =
      images.length > 1
        ? 'flex'
        : 'none';
  }


  if (mEmoji) {

    mEmoji.style.position =
      'relative';
  }


  // ----------------------------------------------------------
  // DADOS DO PRODUTO
  // ----------------------------------------------------------

  if ($('mCat')) {

    $('mCat').textContent =
      Array.isArray(p.cat)
        ? p.cat.join(', ')
        : p.cat;
  }


  if ($('mName')) {

    $('mName').textContent =
      p.name;
  }


  if ($('mDesc')) {

    $('mDesc').textContent =
      p.desc;
  }


  if ($('mPrice')) {

    $('mPrice').textContent =
      fmt(p.price);
  }


  if ($('mOld')) {

    $('mOld').textContent =
      p.old > 0
        ? fmt(p.old)
        : '';
  }


  if ($('mDisc')) {

    $('mDisc').textContent =
      p.discount > 0
        ? `-${p.discount}% OFF`
        : '';
  }


  if ($('mFeats')) {

    $('mFeats').innerHTML =
      p.features
        .map(
          feature => `

            <div class="m-feat">

              <div class="fchk">
                ✓
              </div>

              ${feature}

            </div>

          `
        )
        .join('');
  }


  if ($('mWish')) {

    $('mWish').classList.toggle(
      'on',
      fav.some(
        x =>
          String(x.id) ===
          normalizedId
      )
    );
  }


  if ($('modalOverlay')) {

    $('modalOverlay')
      .classList.add('on');
  }
}


function handleModalClick(e) {

  const overlay =
    $('modalOverlay');

  if (
    overlay &&
    e.target === overlay
  ) {
    closeModal();
  }
}


function closeModal() {

  if ($('modalOverlay')) {

    $('modalOverlay')
      .classList.remove('on');
  }

  document.body.classList.remove(
    "noscroll"
  );
}


function chgQty(d) {

  mQtyVal =
    Math.max(
      1,
      mQtyVal +
      Number(d || 0)
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
// TOAST
// ============================================================

function showToast(msg) {

  const t =
    document.getElementById(
      'toast'
    );

  const msgEl =
    document.getElementById(
      'toastMsg'
    );


  if (!t || !msgEl) {
    return;
  }


  msgEl.textContent =
    msg;


  t.classList.add(
    'show'
  );


  setTimeout(
    () =>
      t.classList.remove(
        'show'
      ),
    2800
  );
}


function toast(msg) {

  showToast(msg);
}


// ============================================================
// ESC
// ============================================================

document.addEventListener(
  'keydown',
  e => {

    if (
      e.key ===
      'Escape'
    ) {

      closeModal();
      closeCart();
      closeFav();
      closeMore();
      closeAcc();

    }

  }
);


// ============================================================
// HIDRATAR CARRINHO / FAVORITOS
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
            item?.id ||
            ''
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


  // ----------------------------------------------------------
  // Busca somente os produtos necessários
  // ----------------------------------------------------------

  if (
    missingIds.length
  ) {

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

      data
        .map(
          normalizeProduct
        )
        .forEach(
          product => {

            productCache.set(
              String(
                product.id
              ),
              product
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


  // ----------------------------------------------------------
  // Reconstrói os objetos
  // ----------------------------------------------------------

  return savedItems
    .map(
      item => {

        const id =
          String(
            item?.id ||
            ''
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


// ============================================================
// SYNC SUPABASE
// ============================================================

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
          Number(
            item.qty
          ) || 1

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
          Number(
            item.qty
          ) || 1

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


// ============================================================
// LOAD FROM SUPABASE
// ============================================================

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
// MODAL ALERT STYLES
// ============================================================

function injectModalStyles() {

  if (
    document.getElementById(
      'modal-alert-styles'
    )
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

      top: 0;
      left: 0;

      width: 100%;
      height: 100%;

      background:
        rgba(
          0,
          0,
          0,
          .6
        );

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      z-index:
        10000;

      opacity:
        0;

      pointer-events:
        none;

      transition:
        opacity
        .3s
        ease;

    }


    .modal-alert-container.active {

      opacity:
        1;

      pointer-events:
        auto;

    }


    .modal-alert-content {

      background:
        #fff;

      padding:
        30px;

      border-radius:
        16px;

      max-width:
        400px;

      width:
        90%;

      text-align:
        center;

      box-shadow:
        0
        10px
        30px
        rgba(
          0,
          0,
          0,
          .2
        );

      transform:
        scale(
          .8
        );

      transition:
        transform
        .3s
        ease;

    }


    .modal-alert-container.active
    .modal-alert-content {

      transform:
        scale(
          1
        );

    }


    .modal-alert-icon {

      font-size:
        44px;

      margin-bottom:
        15px;

    }


    .modal-alert-content h3 {

      margin:
        0 0
        10px 0;

      font-family:
        'Sora',
        'Poppins',
        sans-serif;

      color:
        #10161a;

      font-size:
        20px;

      font-weight:
        700;

    }


    .modal-alert-content p {

      color:
        #707c8a;

      font-size:
        14.5px;

      line-height:
        1.5;

      margin:
        0 0
        24px 0;

    }


    .modal-alert-buttons {

      display:
        flex;

      gap:
        12px;

      justify-content:
        center;

    }


    .btn-alert-confirm {

      background:
        #2563EB;

      color:
        #fff;

      border:
        none;

      padding:
        11px 24px;

      border-radius:
        8px;

      font-weight:
        600;

      cursor:
        pointer;

      font-size:
        14px;

      transition:
        background
        .2s;

    }


    .btn-alert-confirm:hover {

      background:
        #1d4ed8;

    }


    .btn-alert-cancel {

      background:
        #e8ebf0;

      color:
        #10161a;

      border:
        none;

      padding:
        11px 24px;

      border-radius:
        8px;

      font-weight:
        600;

      cursor:
        pointer;

      font-size:
        14px;

      transition:
        background
        .2s;

    }


    .btn-alert-cancel:hover {

      background:
        #d1d5db;

    }

  `;


  document.head.appendChild(
    style
  );
}


// ============================================================
// ALERT
// ============================================================

async function showAlert(
  message,
  title,
  icon
) {

  injectModalStyles();


  let alertModal =
    document.getElementById(
      'alertModal'
    );


  if (!alertModal) {

    alertModal =
      document.createElement(
        'div'
      );


    alertModal.id =
      'alertModal';


    alertModal.className =
      'modal-alert-container';


    alertModal.innerHTML = `

      <div
        class="modal-alert-content"
      >

        <div
          class="modal-alert-icon"
          id="alertIcon"
        >
          ${icon}
        </div>


        <h3
          id="alertTitle"
        >
          ${title}
        </h3>


        <p
          id="alertMsg"
        >
          ${message}
        </p>


        <div
          class="modal-alert-buttons"
        >

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
      alertModal
    );

  } else {

    document.getElementById(
      'alertMsg'
    ).textContent =
      message;


    document.getElementById(
      'alertTitle'
    ).textContent =
      title;


    document.getElementById(
      'alertIcon'
    ).textContent =
      icon;
  }


  alertModal.offsetHeight;


  alertModal.classList.add(
    'active'
  );
}


// ============================================================
// AUTH MODAL
// ============================================================

async function showAuth(
  message,
  title,
  icon
) {

  injectModalStyles();


  let authModal =
    document.getElementById(
      'authModal'
    );


  if (!authModal) {

    authModal =
      document.createElement(
        'div'
      );


    authModal.id =
      'authModal';


    authModal.className =
      'modal-alert-container';


    authModal.innerHTML = `

      <div
        class="modal-alert-content"
      >

        <div
          class="modal-alert-icon"
          id="authIcon"
        >
          ${icon}
        </div>


        <h3
          id="authTitle"
        >
          ${title}
        </h3>


        <p
          id="authMsg"
        >
          ${message}
        </p>


        <div
          class="modal-alert-buttons"
        >

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
      authModal
    );

  } else {

    document.getElementById(
      'authMsg'
    ).textContent =
      message;


    document.getElementById(
      'authTitle'
    ).textContent =
      title;


    document.getElementById(
      'authIcon'
    ).textContent =
      icon;
  }


  authModal.offsetHeight;


  authModal.classList.add(
    'active'
  );
}


function closeAlert() {

  const alertModal =
    document.getElementById(
      'alertModal'
    );


  if (alertModal) {

    alertModal.classList.remove(
      'active'
    );
  }
}


function closeAuth() {

  const authModal =
    document.getElementById(
      'authModal'
    );


  if (authModal) {

    authModal.classList.remove(
      'active'
    );
  }
}


// ============================================================
// CATALOG CONTROLS
// ============================================================

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

  await resetCatalogAndLoad();
}


// ============================================================
// INPUTS / SELECTS
// ============================================================

function setupCatalogControls() {

  const searchInputs = [

    $('heroSearch'),

    $('headerSearch')

  ].filter(Boolean);


  searchInputs.forEach(
    input => {

      input.addEventListener(
        'input',
        () => {

          catalogCategory =
            null;


          searchInputs.forEach(
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

      if (
        !virtualReady ||
        virtualScrollRaf
      ) {

        return;
      }


      virtualScrollRaf =
        true;


      requestAnimationFrame(
        () => {

          virtualStartIndex =
            -1;

          virtualEndIndex =
            -1;

          virtualColumns =
            0;

          virtualRowHeight =
            getEstimatedRowHeight();


          renderVirtualProducts();


          virtualScrollRaf =
            false;

        }
      );

    },
    {
      passive:
        true
    }
  );
}


// ============================================================
// PRODUCT CARD
// ============================================================

function productCardHtml(p) {

  const images =
    getProductImages(
      p
    );


  const mainImage =
    images[0] ||
    null;


  const inW =
    fav.some(
      x =>
        String(x.id) ===
        String(p.id)
    );


  const category =
    Array.isArray(p.cat)

      ? p.cat.join(', ')

      : String(
          p.cat ||
          ''
        );


  // ----------------------------------------------------------
  // Badge
  // ----------------------------------------------------------

  let badgeH =
    '';


  if (
    p.badge ===
    'hot'
  ) {

    badgeH = `

      <span
        class="bpill bhot"
      >
        🔥 Hot
      </span>

    `;

  } else if (
    p.badge ===
    'new'
  ) {

    badgeH = `

      <span
        class="bpill bnew"
      >
        Novo
      </span>

    `;

  } else if (
    p.discount >
    0
  ) {

    badgeH = `

      <span
        class="bpill bsale"
      >
        -${p.discount}%
      </span>

    `;
  }


  // ----------------------------------------------------------
  // Frete
  // ----------------------------------------------------------

  const shipH =
    p.shipping

      ? `

        <div
          class="pfship"
        >

          <svg
            viewBox="0 0 24 24"
          >

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


  // ----------------------------------------------------------
  // Preço antigo
  // ----------------------------------------------------------

  const oldPrice =
    p.old > 0

      ? `
        <span class="pold">
          ${fmt(p.old)}
        </span>
      `

      : '';


  // ----------------------------------------------------------
  // Desconto
  // ----------------------------------------------------------

  const discount =
    p.discount > 0

      ? `
        <span class="pdisc">
          -${p.discount}%
        </span>
      `

      : '';


  // ----------------------------------------------------------
  // Imagem
  // ----------------------------------------------------------

  const imageHtml =
    mainImage

      ? `

        <img
          src="${mainImage}"
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
          "
        >

      `

      : '';


  // ==========================================================
  // LIST VIEW
  // ==========================================================

  if (
    view ===
    'list'
  ) {

    return `

      <div
        class="pcard"
        onclick="
          openProduct(
            '${p.id}'
          )
        "
      >

        <div
          class="pimg-wrap"
        >

          <div
            class="pimg"
            style="
              position:relative;
            "
          >

            ${
              !mainImage
                ? p.emoji
                : ''
            }


            ${imageHtml}

          </div>


          <div
            class="pbadges"
          >
            ${badgeH}
          </div>

        </div>


        <div
          class="pinfo"
        >

          <div
            class="pcat"
          >
            ${category}
          </div>


          <div
            class="pname"
          >
            ${p.name}
          </div>


          <div
            class="prating"
          >

            <span
              class="pstars"
            >
              ${starsHtml(
                p.rating
              )}
            </span>


            <span
              class="prcnt"
            >
              ${p.rating}
              (
              ${
                p.reviews.toLocaleString(
                  'pt-BR'
                )
              }
              avaliações)
            </span>

          </div>


          <div
            class="list-product-description"
          >

            ${
              String(
                p.desc
              ).substring(
                0,
                130
              )
            }

            ${
              String(
                p.desc
              ).length > 130
                ? '…'
                : ''
            }

          </div>


          <div
            class="price-row"
          >

            <span
              class="pprice"
            >
              ${fmt(
                p.price
              )}
            </span>

            ${oldPrice}

            ${discount}

          </div>


          ${shipH}


          <div
            class="pactions"
          >

            <button
              class="btn-ac"

              onclick="
                event.stopPropagation();

                addToCart(
                  '${p.id}'
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


  // ==========================================================
  // GRID VIEW
  // ==========================================================

  return `

    <div
      class="pcard"

      onclick="
        openProduct(
          '${p.id}'
        )
      "
    >

      <div
        class="pimg-wrap"
      >

        <div
          class="pimg"
          style="
            position:relative;
          "
        >

          ${
            !mainImage
              ? p.emoji
              : ''
          }

          ${imageHtml}

        </div>


        <div
          class="pbadges"
        >
          ${badgeH}
        </div>


        <button
          class="
            pwish-btn
            ${inW ? 'on' : ''}
          "

          data-product-id="${p.id}"

          onclick="
            event.stopPropagation();

            toggleFav(
              '${p.id}'
            );
          "

          title="${
            inW
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
                0-7.78
                z
              "
            />

          </svg>

        </button>


        <div
          class="pactions"
        >

          <button
            class="btn-ac"

            onclick="
              event.stopPropagation();

              addToCart(
                '${p.id}'
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
                '${p.id}'
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
                  -11-8
                  z
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


      <div
        class="pinfo"
      >

        <div
          class="pcat"
        >
          ${category}
        </div>


        <div
          class="pname"
        >
          ${p.name}
        </div>


        <div
          class="prating"
        >

          <span
            class="pstars"
          >
            ${starsHtml(
              p.rating
            )}
          </span>


          <span
            class="prcnt"
          >
            (
            ${
              p.reviews.toLocaleString(
                'pt-BR'
              )
            }
            )
          </span>

        </div>


        <div
          class="price-row"
        >

          <span
            class="pprice"
          >
            ${fmt(
              p.price
            )}
          </span>

          ${oldPrice}

          ${discount}

        </div>


        ${shipH}

      </div>

    </div>

  `;
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


  if (
    width <= 600
  ) {
    return 2;
  }


  if (
    width <= 900
  ) {
    return 3;
  }


  if (
    width <= 1200
  ) {
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
      ? 390
      : 300;
  }


  if (
    window.innerWidth <= 600
  ) {
    return 350;
  }


  if (
    window.innerWidth <= 900
  ) {
    return 370;
  }


  if (
    window.innerWidth <= 1200
  ) {
    return 380;
  }


  return 400;
}


function getLoadedCatalogList() {

  return Array.isArray(
    products
  )

    ? products

    : [];
}


// ============================================================
// CRIA ESTRUTURA VIRTUAL
// ============================================================

function ensureVirtualDom() {

  const grid =
    $('productsGrid');


  if (!grid) {
    return null;
  }


  let virtualProducts =
    $('virtualProducts');


  if (
    !virtualProducts
  ) {

    grid.innerHTML = `

      <div
        id="virtualScrollContent"

        style="
          position:relative;
          width:100%;
          min-height:0;
        "
      >


        <div
          id="virtualTopSpacer"
          aria-hidden="true"
        ></div>


        <div
          id="virtualProducts"

          style="
            display:grid;
            width:100%;
            align-items:start;
          "
        ></div>


        <div
          id="virtualBottomSpacer"
          aria-hidden="true"
        ></div>


        <div
          id="gridSentinel"

          aria-hidden="true"

          style="
            position:absolute;
            left:0;
            width:100%;
            height:1px;
            pointer-events:none;
          "
        ></div>


      </div>

    `;


    virtualReady =
      true;
  }


  return {

    grid,

    root:
      $('virtualScrollContent'),

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


// ============================================================
// DESTRUIR OBSERVER
// ============================================================

function destroyVirtualObserver() {

  if (
    productsObserver
  ) {

    productsObserver.disconnect();

    productsObserver =
      null;
  }
}


// ============================================================
// RENDER VIRTUAL
// ============================================================

function renderVirtualProducts() {

  const grid =
    $('productsGrid');


  if (!grid) {
    return;
  }


  const list =
    getLoadedCatalogList();


  // ----------------------------------------------------------
  // Estado vazio
  // ----------------------------------------------------------

  if (!list.length) {

    destroyVirtualObserver();

    virtualReady =
      false;

    virtualStartIndex =
      -1;

    virtualEndIndex =
      -1;

    virtualColumns =
      0;


    grid.style.minHeight =
      '';


    grid.innerHTML = `

      <div
        class="empty"
        style="
          grid-column:
            1/-1;
        "
      >

        <div
          class="empty-ico"
        >
          🔍
        </div>


        <h3>
          Nenhum produto encontrado
        </h3>


        <p>

          Tente outro termo ou

          <button
            class="btn-clear"
            type="button"
            id="clearCatalogSearchBtn"
          >
            Limpar busca
          </button>

        </p>

      </div>

    `;


    const clearBtn =
      $('clearCatalogSearchBtn');


    if (clearBtn) {

      clearBtn.addEventListener(
        'click',
        () => {

          catalogCategory =
            null;


          if (
            $('headerSearch')
          ) {

            $('headerSearch')
              .value =
              '';
          }


          if (
            $('heroSearch')
          ) {

            $('heroSearch')
              .value =
              '';
          }


          resetCatalogAndLoad();

        }
      );
    }


    return;
  }


  // ----------------------------------------------------------
  // Estrutura
  // ----------------------------------------------------------

  const refs =
    ensureVirtualDom();


  if (!refs) {
    return;
  }


  const {
    grid: gridEl,
    root,
    products: productContainer,
    sentinel
  } = refs;


  // ----------------------------------------------------------
  // Configuração
  // ----------------------------------------------------------

  const columns =
    getGridColumns();


  const estimatedRowHeight =
    virtualRowHeight ||
    getEstimatedRowHeight();


  const totalRows =
    Math.ceil(
      list.length /
      columns
    );


  const gridTop =
    gridEl.getBoundingClientRect()
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
      estimatedRowHeight
    );


  const firstRow =
    Math.max(

      0,

      Math.floor(
        relativeScroll /
        estimatedRowHeight
      ) -
      VIRTUAL_OVERSCAN_ROWS

    );


  const rowCount =
    Math.min(

      totalRows,

      visibleRows +
      VIRTUAL_OVERSCAN_ROWS *
      2

    );


  const lastRow =
    Math.min(

      totalRows,

      firstRow +
      rowCount

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


  // ----------------------------------------------------------
  // Não renderiza se a janela continua igual
  // ----------------------------------------------------------

  if (

    startIndex ===
    virtualStartIndex &&

    endIndex ===
    virtualEndIndex &&

    columns ===
    virtualColumns

  ) {

    observeSentinel();

    return;
  }


  virtualStartIndex =
    startIndex;

  virtualEndIndex =
    endIndex;

  virtualColumns =
    columns;


  // ----------------------------------------------------------
  // Spacers
  // ----------------------------------------------------------

  const topHeight =
    firstRow *
    estimatedRowHeight;


  const bottomHeight =
    Math.max(

      0,

      (
        totalRows -
        lastRow
      ) *
      estimatedRowHeight

    );


  const totalHeight =
    totalRows *
    estimatedRowHeight;


  gridEl.style.display =
    'block';


  gridEl.style.minHeight =
    `${Math.max(
      0,
      totalHeight
    )}px`;


  root.style.minHeight =
    `${Math.max(
      0,
      totalHeight
    )}px`;


  refs.top.style.height =
    `${topHeight}px`;


  refs.bottom.style.height =
    `${bottomHeight}px`;


  // ----------------------------------------------------------
  // Grid
  // ----------------------------------------------------------

  productContainer.style.gridTemplateColumns =
    `repeat(
      ${columns},
      minmax(
        0,
        1fr
      )
    )`;


  productContainer.style.columnGap =
    view === 'list'
      ? '0px'
      : '10px';


  productContainer.style.rowGap =
    view === 'list'
      ? '12px'
      : '10px';


  productContainer.style.transform =
    'none';


  // ----------------------------------------------------------
  // Renderiza somente a janela
  // ----------------------------------------------------------

  productContainer.innerHTML =
    list
      .slice(
        startIndex,
        endIndex
      )
      .map(
        productCardHtml
      )
      .join('');


  // ----------------------------------------------------------
  // Mede a altura real
  // ----------------------------------------------------------

  requestAnimationFrame(
    () => {

      const firstCard =
        productContainer.querySelector(
          '.pcard'
        );


      if (!firstCard) {
        return;
      }


      const measuredHeight =
        firstCard
          .getBoundingClientRect()
          .height;


      const gap =
        view === 'list'
          ? 12
          : 10;


      const nextHeight =
        measuredHeight +
        gap;


      if (

        Number.isFinite(
          nextHeight
        ) &&

        nextHeight > 80 &&

        Math.abs(
          nextHeight -
          virtualRowHeight
        ) > 2

      ) {

        virtualRowHeight =
          nextHeight;


        virtualStartIndex =
          -1;

        virtualEndIndex =
          -1;


        renderVirtualProducts();

      }

    }
  );


  // ----------------------------------------------------------
  // Sentinel
  // ----------------------------------------------------------

  sentinel.style.top =
    `${Math.max(
      0,
      totalHeight -
      800
    )}px`;


  sentinel.style.display =
    hasMoreProducts
      ? 'block'
      : 'none';


  observeSentinel();
}


// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts() {

  renderVirtualProducts();
}


// ============================================================
// OBSERVER
// ============================================================

function observeSentinel() {

  const sentinel =
    $('gridSentinel');


  if (
    !sentinel ||
    !hasMoreProducts
  ) {

    destroyVirtualObserver();

    return;
  }


  if (
    productsObserver
  ) {

    if (
      productsObserver.__sentinel ===
      sentinel
    ) {

      return;
    }


    productsObserver.disconnect();

    productsObserver =
      null;
  }


  productsObserver =
    new IntersectionObserver(

      async entries => {

        const entry =
          entries[0];


        if (
          !entry ||
          !entry.isIntersecting
        ) {

          return;
        }


        if (
          loadingServerPage
        ) {

          return;
        }


        const observer =
          productsObserver;


        productsObserver =
          null;


        if (observer) {

          observer.disconnect();
        }


        const beforeCount =
          products.length;


        await fetchProductPage();


        if (
          products.length !==
          beforeCount
        ) {

          virtualStartIndex =
            -1;

          virtualEndIndex =
            -1;


          renderProducts();
        }

      },

      {
        root:
          null,

        rootMargin:
          '0px 0px 900px 0px',

        threshold:
          0
      }

    );


  productsObserver.__sentinel =
    sentinel;


  productsObserver.observe(
    sentinel
  );
}


// ============================================================
// BUSCA
// ============================================================

async function searchFor(term) {

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


  await resetCatalogAndLoad();
}


// ============================================================
// ALTERAR VIEW
// ============================================================

function setView(v) {

  if (
    v !== 'grid' &&
    v !== 'list'
  ) {

    return;
  }


  view =
    v;


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


  if ($('productsGrid')) {

    $('productsGrid').className =
      'products-grid' +
      (
        v === 'list'
          ? ' lv'
          : ''
      );
  }


  virtualRowHeight =
    getEstimatedRowHeight();


  virtualStartIndex =
    -1;

  virtualEndIndex =
    -1;

  virtualColumns =
    0;


  renderProducts();
}


// ============================================================
// FILTRO POR CATEGORIA
// ============================================================

async function filterByCategory(
  event,
  category
) {

  if (event) {
    event.preventDefault();
  }


  catalogCategory =
    String(
      category ||
      ''
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
    document.getElementById(
      'produtos'
    );


  if (section) {

    section.scrollIntoView({
      behavior:
        'smooth',

      block:
        'start'
    });
  }
}


// ============================================================
// NORMALIZAÇÃO
// ============================================================

function normalizeProduct(p) {

  const normalized = {

    ...p,

    id:
      String(
        p.id
      ),

    name:
      p.name ||
      'Produto sem nome',

    desc:
      p.desc ||
      '',

    price:
      Number(
        p.price
      ) || 0,

    old:
      Number(
        p.old
      ) || 0,

    discount:
      Number(
        p.discount
      ) || 0,

    rating:
      Number(
        p.rating
      ) || 0,

    reviews:
      Number(
        p.reviews
      ) || 0,

    emoji:
      p.emoji ||
      '📦',

    shipping:
      Boolean(
        p.shipping
      ),

    badge:
      p.badge ||
      'new',


    features:
      Array.isArray(
        p.features
      )

        ? p.features

        : [],


    cat:
      Array.isArray(
        p.cat
      )

        ? p.cat

        : (
            p.cat
              ? [p.cat]
              : []
          ),


    image_url:
      p.image_url ||
      null,


    gallery_urls:
      Array.isArray(
        p.gallery_urls
      )

        ? p.gallery_urls
            .filter(Boolean)
            .slice(
              0,
              5
            )

        : []

  };


  // Salva automaticamente no cache.
  productCache.set(
    normalized.id,
    normalized
  );


  return normalized;
}


// ============================================================
// IMAGENS
// ============================================================

function getProductImages(
  product
) {

  const images =
    [];


  if (
    product.image_url
  ) {

    images.push(
      product.image_url
    );
  }


  if (
    Array.isArray(
      product.gallery_urls
    )
  ) {

    product.gallery_urls
      .forEach(
        url => {

          if (
            url &&
            !images.includes(
              url
            )
          ) {

            images.push(
              url
            );
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
// LOGOUT
// ============================================================

async function doLogout() {

  toast(
    'Saindo da conta... 👋',
    'info'
  );


  await supabaseClient.auth.signOut();


  buttonLink(
    '/login'
  );
}
