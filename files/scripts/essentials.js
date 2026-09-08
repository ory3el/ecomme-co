function injectEcommeUI() {
  if (document.getElementById('cartSidebar')) return;

  document.body.insertAdjacentHTML('beforeend', `
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
}

function initEcommeUI() {
  injectEcommeUI();

  updateCart();
  updateFav();

  // outros módulos...
}
initEcommeUI()
