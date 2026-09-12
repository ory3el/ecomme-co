function injectSidebars() {
  document.body.insertAdjacentHTML('afterbegin', `
    <script src="/files/scripts/sidebars.js"></script>
  `);
}
injectSidebars();

/*function injectEcommeUI() {
  if (document.getElementById('cartSidebar')) return;

  document.body.insertAdjacentHTML('afterbegin', `
  <!-- CART SIDEBAR -->
  <div class="overlay" id="cartOverlay" onclick="closeCart()"></div>
  <div class="cart-sb" id="cartSidebar">
    <div class="cart-hd">
      <h3>Carrinho <span style="color:var(--muted);font-size:15px" id="cartCount">(0)</span></h3>
      <button class="cart-cls" onclick="closeCart()">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cart-body" id="cartItems"></div>
    <div class="cart-ft">
      <div class="cart-tots">
        <div class="ct-row"><span class="lbl">Subtotal</span><span id="cartSub">R$ 0,00</span></div>
        <div class="ct-row"><span class="lbl">Frete</span><span style="color:var(--green)">Grátis acima de R$199</span></div>
        <div class="ct-row ttl"><span class="lbl">Total</span><span class="amt" id="cartTotal">R$ 0,00</span></div>
      </div>
      <button class="btn-ckout" onclick="checkout()">
        <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Finalizar Compra
      </button>
      <button class="btn-cont" onclick="closeCart()"><- Continuar Comprando</button>
    </div>
  </div>

  <!-- FAV SIDEBAR -->
  <div class="overlay" id="favOverlay" onclick="closeFav()"></div>
  <div class="fav-sb" id="favSidebar">
    <div class="fav-hd">
      <h3>Lista de Desejos <span style="color:var(--muted);font-size:15px" id="favCount">(0)</span></h3>
      <button class="fav-cls" onclick="closeFav()">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="fav-body" id="favItems"></div>
    <div class="fav-ft">
      <div class="fav-tots">
        <div class="ct-row ttl"><span class="lbl">Total</span><span class="amt" id="favTotal">R$ 0,00</span></div>
      </div>
      <button class="btn-ckout" onclick="addAllFavToCart()">
        <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        Adicionar tudo ao carrinho
      </button>
      <button class="btn-cont" onclick="closeFav()"><- Continuar Comprando</button>
    </div>
  </div>

  <!-- NOTIFICATION SIDEBAR -->
  <div class="overlay" id="notifOverlay" onclick="closeNotif()"></div>
  <div class="notif-sb" id="notifSidebar">
    <div class="notif-hd">
      <h3>Notificações <span style="color:var(--muted);font-size:15px" id="notifCount">(0)</span></h3>
      <button class="notif-cls" onclick="closeNotif()">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="notif-body"></div>
    <div class="notif-ft">
      <button class="btn-ckout" onclick="window.location.href = '/notifications'">
        Ver Mais Notificações
        <span class="btn-arrow">&gt;</span>
      </button>
      <button class="btn-cont" onclick="closeNotif()">
        Fechar Notificações
      </button>
    </div>
  </div>

  <!-- MORE SIDEBAR -->
  <div class="overlay" id="moreOverlay" onclick="closeMore()"></div>
  <div class="more-sb" id="moreSidebar" role="dialog" aria-label="Menu" aria-hidden="true">
    <div class="more-hd">
      <h3>Principais Atalhos</h3>
      <button class="more-cls" aria-label="Fechar menu" onclick="closeMore()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="more-body">
      <!-- THEME SWITCH -->
      <div class="theme-switch-wrap">
        <p class="acc-label">Aparência</p>
        <div class="theme-switch" id="themeSwitch" role="radiogroup" aria-label="Tema da interface">
          <button class="theme-opt" data-theme-choice="light" role="radio" aria-checked="false" title="Tema claro">
            <i class="fa-solid fa-sun" aria-hidden="true"></i><span>Claro</span>
          </button>
          <button class="theme-opt" data-theme-choice="auto" role="radio" aria-checked="false" title="Seguir o sistema">
            <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i><span>Automático</span>
          </button>
          <button class="theme-opt" data-theme-choice="dark" role="radio" aria-checked="false" title="Tema escuro">
            <i class="fa-solid fa-moon" aria-hidden="true"></i><span>Escuro</span>
          </button>
        </div>
      </div>
      <div class="acc-menu-group" style="gap:10px">
        <button class="btn-acc-option" onclick="buttonLink('/settings')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-gear"></i> Configurações</span>
            <p class="btn-txt">Gerencie e personalize as preferências do sistema, o comportamento das ferramentas e os parâmetros da sua conta.</p>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/track-order')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-truck"></i> Acompanhar Pedido</span>
            <p class="btn-txt">Acompanhe o status e a localização exata das suas entregas em tempo real.</p>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/sellers')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-sack-dollar"></i> Página do Vendedor</span>
            <p class="btn-txt">Seu canal direto de vendas para atrair e converter clientes.</p>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
        <button class="btn-acc-option active" onclick="buttonLink('/affiliates')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-handshake"></i> Programa de Afiliados</span>
            <p class="btn-txt">Gere links, divulgue produtos e acompanhe suas comissões.</p>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/terms')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-file-contract"></i> Termos e Condições de Uso</span>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/support')">
          <div class="btn-content">
            <span class="btn-title"><i class="fa-solid fa-circle-question"></i> Suporte</span>
          </div>
          <span class="btn-arrow">&gt;</span>
        </button>
      </div>
    </div>
    <div class="notif-ft">
      <button class="btn-cont" onclick="closeMore()">Fechar Menu</button>
    </div>
  </div>

  <!-- ACC SIDEBAR -->
  <div class="overlay" id="accOverlay" onclick="closeAcc()"></div>
  <div class="acc-sb" id="accSidebar">
    <div class="acc-hd">
      <h3>Minha Conta</h3>
      <button class="acc-cls" onclick="closeAcc()">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="acc-body">
      <button class="acc-profile-summary" onclick="buttonLink('/settings')">
        <div class="acc-avatar-large">
          <img id="accSidebarAvatar" src="/images/icons/full/user.webp" alt="Avatar">
        </div>
        <div class="acc-info" style="gap: 3px; display: flex; align-items: baseline;">
          <strong id="accSidebarName"></strong>
          <span id="accSidebarEmail"></span>
        </div>
      </button>
      <div class="acc-menu-group">
        <p class="acc-label">Atalhos</p>
        <button class="btn-acc-option" onclick="buttonLink('/settings')">
          <i class="fa-solid fa-user-pen"></i>
          <span>Editar Perfil</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/my-orders')">
          <i class="fa-solid fa-box-open"></i>
          <span>Minhas Compras</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/reviews')">
          <i class="fa-solid fa-star"></i>
          <span>Minhas Avaliações</span>
        </button>
        <button class="btn-acc-option" onclick="openFav(); closeAcc();">
          <i class="fa-solid fa-heart"></i>
          <span>Lista de Desejos</span>
        </button>
      </div>
      <div class="acc-menu-group">
        <p class="acc-label">Suporte</p>
        <button class="btn-acc-option" onclick="buttonLink('/support')">
          <i class="fa-solid fa-circle-question"></i>
          <span>Ajuda & FAQ</span>
        </button>
        <button class="btn-acc-option" onclick="buttonLink('/terms')">
          <i class="fa-solid fa-file-contract"></i>
          <span>Termos de Uso</span>
        </button>
      </div>
      <div class="acc-ft">
        <button class="btn-logout-sb" onclick="openConfirmLogout()">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
          Sair da Conta
        </button>
      </div>
    </div>
  </div>
    
  <!-- PRODUCT MODAL -->
  <div class="modal-ov" id="modalOverlay" onclick="handleModalClick(event)">
    <div class="modal">
      <div class="modal-img-area">
        <div class="modal-img" id="modalImg">
          <button class="btn-mwish1" id="mWish" onclick="addFromModal2()">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <button class="mcls" onclick="closeProductModal()">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="mArrows">
            <button class="pArrow1" onclick="previousImg()"><i class="fa-solid fa-chevron-right arrow0 arrow1"></i></button>
            <button class="pArrow2" onclick="nextImg()"><i class="fa-solid fa-chevron-right arrow0 arrow2"></i></button>
          </div>
          <span id="mEmoji"></span>
        </div>
        <div class="m-qty-ctrl1">
          <button class="qb1" onclick="chgQty(-1)">−</button>
          <span class="m-qty-num1" id="mQty">1</span>
          <button class="qb1" onclick="chgQty(1)">+</button>
        </div>
        <div class="modal-gallery" id="modalGallery"></div>
      </div>
      <div class="modal-info">
        <div class="m-cat" id="mCat"></div>
        <div class="m-name" id="mName"></div>
        <div class="m-desc" id="mDesc"></div>
        <div class="m-price-row">
          <span class="m-price" id="mPrice"></span>
          <span class="m-old" id="mOld"></span>
          <span class="m-disc" id="mDisc"></span>
        </div>
        <div class="m-feats" id="mFeats"></div>
        <hr class="m-div">
        <div class="m-qty-row">
          <span class="m-qty-lbl">Quantidade:</span>
          <div class="m-qty-ctrl0">
            <button class="qb" onclick="chgQty(-1)">−</button>
            <span class="m-qty-num" id="mQty">1</span>
            <button class="qb" onclick="chgQty(1)">+</button>
          </div>
        </div>
        <div class="m-btns">
          <span class="m-price1" id="mPrice1"></span>
          <button class="btn-madd" onclick="addFromModal()">
            <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Adicionar ao Carrinho
          </button>
          <button class="btn-mwish" id="mWish" onclick="addFromModal2()">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast" id="toast">
    <div class="toast-icon">✓</div>
    <span id="toastMsg">Produto adicionado!</span>
  </div>

  <!-- BACK TO TOP -->
  <button class="back-top" id="backTop" onclick="window.scrollTo({top:0,behavior:'smooth'})">
    <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
  </button>

  <!-- QUICKLINK -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/quicklink/2.3.0/quicklink.umd.js"></script>
  <script>
    // Start the Quicklink
    window.addEventListener('load', () => {
      quicklink.listen();
    });
  </script>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let userId = null;
</script>
<script src="/files/scripts/auth-session-check.js"></script>
<script src="/files/scripts/console-warning.js"></script>
  `);
  initEcommeUI()
}
function initEcommeUI() {*/

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
  
/*}
injectEcommeUI();*/
