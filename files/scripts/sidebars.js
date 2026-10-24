async function injectEcommeUI() {
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath === '/settings' || currentPath.startsWith('/settings/')) return;
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
      <h3 onclick="openToggleFav()"><i class="fa-solid fa-angle-down"></i>Lista de Desejos <span style="color:var(--muted);font-size:15px" id="favCount">(0)</span></h3>
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
          <button class="btn-mwish1" id="mWish1" onclick="event.stopPropagation(); toggleFav(String(curId));">
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
	   <div style="align-self: flex-start">
        <div class="m-cat" id="mCat"></div>
        <div class="m-name" id="mName"></div>
        <div class="m-desc" id="mDesc"></div>
	   </div>

	   <div style="align-self: end">
		<div class="m-feats" id="mFeats"></div>
        <div class="m-price-row">
          <span class="m-price" id="mPrice"></span>
          <span class="m-old" id="mOld"></span>
          <span class="m-disc" id="mDisc"></span>
        </div>
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
          <button class="btn-madd" onclick="openProductPage()">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            Ver Mais Informações
          </button>
		  <button class="btn-mcart" id="mCart" onclick="addFromModal()">
          	<svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
		  </button>
          <button class="btn-mwish" id="mWish" onclick="event.stopPropagation(); toggleFav(String(curId));">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
	 </div>
    </div>
  </div>
  `);
  window.dispatchEvent(new Event('ecomme:sidebars-ready'));
}
//function initEcommeUI() {

/* ────────────────────────────────────────────────────────────────── */

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

// ------------------------------------------------
if (typeof systemPrefersDark === 'undefined') {
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

  async function saveThemeToSupabase(pref) {
    try {
      if (typeof supabaseClient === 'undefined') return;
      const {data: { user }, error: userError} = await supabaseClient.auth.getUser();
      if (userError || !user) return;
    
      const { error } = await supabaseClient.from('user_settings').upsert({user_id: user.id, theme: pref}, {onConflict: 'user_id'});
      if (error) console.error('Erro ao salvar tema no Supabase:', error);
    } catch (error) {
      console.error('Erro ao sincronizar tema com o Supabase:', error);
    }
  }
  
  function applyTheme(pref, opts) {
    opts = opts || {};
    if (!['light', 'dark', 'auto'].includes(pref)) pref = 'light';
    try {
      localStorage.setItem('ecomme-theme', pref);
      const raw = localStorage.getItem('ecomme_settings');
      const settings = raw ? JSON.parse(raw) : {};
      localStorage.setItem('ecomme_settings', JSON.stringify({...settings, theme: pref}));
    } catch (error) {
      console.warn('Não foi possível salvar o tema localmente:', error);
    }
    const root = document.documentElement;
    if (!opts.silent) root.classList.add('theme-transition');
    root.setAttribute('data-theme', effectiveTheme(pref));
    root.setAttribute('data-theme-pref', pref);
    updateThemeSwitchUI(pref);
    if (!opts.silent) {
      window.setTimeout(function () {
        root.classList.remove('theme-transition');
      }, 420);
    }
    if (opts.saveToSupabase !== false) saveThemeToSupabase(pref);
  }

  function initTheme() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
    updateThemeSwitchUI(pref);

    // Live-follow the OS theme while the user's preference is "auto"
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        var currentPref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
        if (currentPref === 'auto') applyTheme('auto', {silent: false, saveToSupabase: false});
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }
}

/* ── THEME ───────────────────────────────────────────────────────── */
function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeChoice);
    });
  });
}

// ============================================================

window.ecommeLanguage = 'pt-BR';
const ecommeOriginalTextNodes = new WeakMap();
const ecommeOriginalAttributes = new WeakMap();
let ecommeTranslationRunning = false;
let ecommeTranslationObserver = null;
let ecommeTranslationObserverTimer = null;

function shouldIgnoreTranslationElement(element) {
  if (!element) {
    return true;
  }

  if (
    element.closest(
      'script, style, noscript, svg, code, pre, textarea'
    )
  ) {
    return true;
  }

  if (
    element.closest(
      '[data-no-translate]'
    )
  ) {
    return true;
  }

  return false;
}


function isMeaningfulTranslationText(text) {
  if (!text) {
    return false;
  }

  const clean =
    text
      .replace(/\s+/g, ' ')
      .trim();

  if (!clean) {
    return false;
  }

  if (/^[\d\s.,%$€£+\-/:]+$/.test(clean)) {
    return false;
  }

  if (
    /^https?:\/\//i.test(clean) ||
    /^www\./i.test(clean)
  ) {
    return false;
  }

  if (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
  ) {
    return false;
  }

  return true;
}


function getTranslationCache() {

  try {

    const raw =
      localStorage.getItem(
        'ecomme_translation_cache'
      );

    if (!raw) {
      return {};
    }

    return JSON.parse(raw);

  } catch (error) {

    console.warn(
      'Erro ao ler cache de tradução:',
      error
    );

    return {};
  }
}


function saveTranslationCache(cache) {

  try {

    localStorage.setItem(
      'ecomme_translation_cache',
      JSON.stringify(cache)
    );

  } catch (error) {

    console.warn(
      'Erro ao salvar cache de tradução:',
      error
    );
  }
}


function collectTranslationNodes() {

  const items = [];

  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

  let node;

  while (
    node = walker.nextNode()
  ) {

    const parent =
      node.parentElement;

    if (
      !parent ||
      shouldIgnoreTranslationElement(parent)
    ) {
      continue;
    }

    const source =
      node.nodeValue
        .replace(/\s+/g, ' ')
        .trim();

    if (
      !isMeaningfulTranslationText(source)
    ) {
      continue;
    }

    if (
      !ecommeOriginalTextNodes.has(node)
    ) {

      ecommeOriginalTextNodes.set(
        node,
        node.nodeValue
      );
    }

    items.push({
      type: 'text',
      node,
      source
    });
  }

  const elements =
    document.querySelectorAll(
      '[placeholder], [title], [aria-label]'
    );

  elements.forEach(element => {

    if (
      shouldIgnoreTranslationElement(element)
    ) {
      return;
    }

    [
      'placeholder',
      'title',
      'aria-label'
    ].forEach(attribute => {

      const value =
        element.getAttribute(attribute);

      if (
        !isMeaningfulTranslationText(value)
      ) {
        return;
      }

      if (
        !ecommeOriginalAttributes.has(element)
      ) {

        ecommeOriginalAttributes.set(
          element,
          {}
        );
      }

      const originals =
        ecommeOriginalAttributes.get(element);

      if (
        originals[attribute] === undefined
      ) {

        originals[attribute] =
          value;
      }

      items.push({
        type: 'attribute',
        element,
        attribute,
        source: value
      });
    });
  });

  return items;
}


function restoreOriginalPage() {

  document
    .querySelectorAll(
      '[placeholder], [title], [aria-label]'
    )
    .forEach(element => {

      const originals =
        ecommeOriginalAttributes.get(
          element
        );

      if (!originals) {
        return;
      }

      Object.entries(originals)
        .forEach(
          ([attribute, value]) => {

            element.setAttribute(
              attribute,
              value
            );
          }
        );
    });

  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

  let node;

  while (
    node = walker.nextNode()
  ) {

    const original =
      ecommeOriginalTextNodes.get(node);

    if (original !== undefined) {
      node.nodeValue = original;
    }
  }
}


async function requestTranslations(
  language,
  texts
) {
  if (!texts.length) {
    return {};
  }

  let {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.warn(
      'Erro ao obter sessão:',
      sessionError
    );
  }

  if (!session?.access_token) {
    console.warn(
      'Sessão sem access_token. Tentando renovar...'
    );

    const {
      data: refreshData,
      error: refreshError
    } = await supabaseClient.auth.refreshSession();

    if (refreshError) {
      console.error(
        'Erro ao renovar sessão:',
        refreshError
      );

      throw new Error(
        'Não foi possível renovar a sessão da conta.'
      );
    }

    session =
      refreshData?.session || null;
  }

  if (!session?.access_token) {
    throw new Error(
      'A sessão da conta não possui um access token válido.'
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/translate-texts`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        'Authorization':
          `Bearer ${session.access_token}`,

        'apikey':
          SUPABASE_ANON_KEY
      },

      body: JSON.stringify({
        targetLanguage: language,
        texts
      })
    }
  );

  const responseText =
    await response.text();

  let responseData = {};

  try {
    responseData =
      responseText
        ? JSON.parse(responseText)
        : {};
  } catch (error) {
    console.error(
      'Resposta inválida da Edge Function:',
      responseText
    );
  }

  if (!response.ok) {
    console.error(
      'Erro HTTP da Edge Function:',
      response.status,
      responseData
    );

    throw new Error(
      responseData?.error ||
      responseData?.message ||
      `Erro HTTP ${response.status} ao traduzir.`
    );
  }

  return responseData?.translations || {};
}

async function translatePage(
  language =
    window.ecommeLanguage || 'pt-BR'
) {

  if (
    ecommeTranslationRunning
  ) {
    return;
  }

  if (
    !['pt-BR', 'en-US', 'es-ES']
      .includes(language)
  ) {
    language = 'pt-BR';
  }

  window.ecommeLanguage =
    language;

  if (language === 'pt-BR') {

    if (ecommeTranslationObserver) {
      ecommeTranslationObserver.disconnect();
    }

    restoreOriginalPage();

    if (ecommeTranslationObserver) {
      ecommeTranslationObserver.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );
    }

    return;
  }

  ecommeTranslationRunning = true;

  if (ecommeTranslationObserver) {
    ecommeTranslationObserver.disconnect();
  }

  try {

    restoreOriginalPage();

    const items =
      collectTranslationNodes();

    if (!items.length) {
      return;
    }

    const cache =
      getTranslationCache();

    const languageCache =
      cache[language] || {};

    const uniqueTexts =
      [
        ...new Set(
          items.map(
            item => item.source
          )
        )
      ];

    const missingTexts =
      uniqueTexts.filter(
        text =>
          !languageCache[text]
      );

    for (
      let i = 0;
      i < missingTexts.length;
      i += 40
    ) {

      const batch =
        missingTexts.slice(
          i,
          i + 40
        );

      const translations =
        await requestTranslations(
          language,
          batch
        );

      Object.assign(
        languageCache,
        translations
      );
    }

    cache[language] =
      languageCache;

    saveTranslationCache(cache);

    for (const item of items) {

      const translated =
        languageCache[item.source];

      if (!translated) {
        continue;
      }

      if (item.type === 'text') {

        item.node.nodeValue =
          item.node.nodeValue.replace(
            item.source,
            translated
          );

      }

      if (
        item.type === 'attribute'
      ) {

        item.element.setAttribute(
          item.attribute,
          translated
        );
      }
    }

  } catch (error) {

    console.error(
      'Erro ao traduzir página:',
      error
    );

  } finally {

    ecommeTranslationRunning =
      false;

    if (ecommeTranslationObserver) {

      ecommeTranslationObserver.observe(
        document.body,
        {
          childList: true,
          subtree: true
        }
      );
    }
  }
}


function initEcommeTranslationObserver() {
  if (!document.body) {
    return;
  }

  ecommeTranslationObserver =
    new MutationObserver(() => {

      clearTimeout(
        ecommeTranslationObserverTimer
      );

      ecommeTranslationObserverTimer =
        setTimeout(() => {

          translatePage(
            window.ecommeLanguage
          );

        }, 250);
    });

  ecommeTranslationObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );
}
window.ecommeTranslatePage = translatePage;

// ============================================================

window.ecommeDisplaySettings = window.ecommeDisplaySettings || {currency: 'BRL'};
window.ecommeCurrencyRates = window.ecommeCurrencyRates || {BRL: 1, USD: null, EUR: null};
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

// ------------------------------------------
async function syncEcommeDisplaySettings() {
  window.ecommeDisplaySettings = {
    theme: 'auto',
    language: 'pt-BR',
    currency: 'BRL'
  };

  try {
    const {data: {user}} = await supabaseClient.auth.getUser();

    if (user) {
      const {data, error} = await supabaseClient
        .from('user_settings')
        .select('theme, language, currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações da conta:', error);
      }

      if (
        ['pt-BR', 'en-US', 'es-ES'].includes(data?.language)
      ) {
        window.ecommeDisplaySettings.language = data.language;
      }
      
      if (data) {
        if (
          ['light', 'dark', 'auto'].includes(data.theme)
        ) {
          window.ecommeDisplaySettings.theme = data.theme;
        }

        if (
          ['BRL', 'USD', 'EUR'].includes(data.currency)
        ) {
          window.ecommeDisplaySettings.currency = data.currency;
        }

        try {
          const localRaw = localStorage.getItem('ecomme_settings');
          const localSettings = localRaw
            ? JSON.parse(localRaw)
            : {};

          localStorage.setItem(
            'ecomme_settings',
            JSON.stringify({
              ...localSettings,
              theme: window.ecommeDisplaySettings.theme,
              currency: window.ecommeDisplaySettings.currency
            })
          );
        } catch (error) {
          console.warn(
            'Não foi possível atualizar o cache local:',
            error
          );
        }
      }
    }

    else {
      try {
        const localRaw = localStorage.getItem('ecomme_settings');

        if (localRaw) {
          const localSettings = JSON.parse(localRaw);

          if (
            ['light', 'dark', 'auto'].includes(localSettings?.theme)
          ) {
            window.ecommeDisplaySettings.theme = localSettings.theme;
          }

          if (
            ['BRL', 'USD', 'EUR'].includes(localSettings?.currency)
          ) {
            window.ecommeDisplaySettings.currency = localSettings.currency;
          }
        }
      } catch (error) {
        console.warn(
          'Não foi possível ler as configurações locais:',
          error
        );
      }
    }

    applyTheme(
      window.ecommeDisplaySettings.theme || 'auto',
      {
        silent: true,
        saveToSupabase: false
      }
    );

    window.ecommeLanguage = window.ecommeDisplaySettings.language || 'pt-BR';
    await translatePage(window.ecommeLanguage);
    
    const currency = window.ecommeDisplaySettings.currency || 'BRL';
    if (currency === 'BRL') {
      window.ecommeCurrencyRates.BRL = 1;
      return;
    }

    const cachedRaw = localStorage.getItem('ecomme_currency_rates');
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const age =
        Date.now() - Number(cached.savedAt || 0);

      if (
        age < 6 * 60 * 60 * 1000 &&
        cached.rates?.USD &&
        cached.rates?.EUR
      ) {
        window.ecommeCurrencyRates = cached.rates;
        return;
      }
    }

    const response = await fetch(
      'https://api.frankfurter.dev/v2/rates?base=BRL&quotes=USD,EUR'
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rows = await response.json();

    const rates = {
      BRL: 1,
      USD: Number(
        rows.find(row => row.quote === 'USD')?.rate || 0
      ),
      EUR: Number(
        rows.find(row => row.quote === 'EUR')?.rate || 0
      )
    };

    if (!rates.USD || !rates.EUR) {
      throw new Error('Cotações inválidas.');
    }

    window.ecommeCurrencyRates = rates;
    localStorage.setItem('ecomme_currency_rates',
      JSON.stringify({
        savedAt: Date.now(),
        rates
      })
    );

  } catch (error) {
    console.error(
      'Não foi possível sincronizar as configurações:',
      error
    );

    window.ecommeDisplaySettings.theme = 'light';
    window.ecommeDisplaySettings.currency = 'BRL';

    applyTheme(
      window.ecommeDisplaySettings.theme || 'auto',
      {
        silent: true,
        saveToSupabase: false
      }
    );
  }
}

// ---------------------------------------------------------

(() => {
  const header = document.querySelector('header');
  if (!header) return;

  // Evita instalar o controlador mais de uma vez.
  if (header.dataset.scrollHeaderController === 'active') return;
  header.dataset.scrollHeaderController = 'active';

  header.classList.add('header-gesture-enabled');
  header.classList.remove('header-gesture-hidden');

  let state = 'sticky';
  let finishTimer = null;
  let scrollFramePending = false;

  let lastScrollY = Math.max(0, window.scrollY || 0);
  let downDistance = 0;
  let upDistance = 0;

  // Distâncias de rolagem necessárias para alternar o header.
  const HIDE_AFTER = 200;
  const SHOW_AFTER = 200;
  const SHOW_NEAR_TOP = 500;
  const ANIMATION_FALLBACK_MS = 380;

  function finishTransition() {
    if (state !== 'hiding' && state !== 'showing') return;

    clearTimeout(finishTimer);
    finishTimer = null;

    if (state === 'hiding') {
      // A posição muda somente após a animação de saída.
      header.style.position = 'relative';
      header.style.top = 'auto';
      state = 'relative';
    } else {
      // Restaura o sticky após a animação de entrada.
      header.style.position = 'sticky';
      header.style.top = '0';
      state = 'sticky';
    }
  }

  function hideHeader() {
    if (state !== 'sticky') return;

    clearTimeout(finishTimer);
    state = 'hiding';

    downDistance = 0;
    upDistance = 0;

    header.classList.add('header-gesture-hidden');

    // Segurança caso transitionend não seja disparado.
    finishTimer = setTimeout(
      finishTransition,
      ANIMATION_FALLBACK_MS
    );
  }

  function showHeader() {
    if (state !== 'relative' && state !== 'hiding') return;

    clearTimeout(finishTimer);

    // Restaura o sticky antes da animação de entrada.
    header.style.position = 'sticky';
    header.style.top = '0';
    state = 'showing';

    downDistance = 0;
    upDistance = 0;

    // Garante que o navegador registre os dois estados visuais.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        header.classList.remove('header-gesture-hidden');
      });
    });

    finishTimer = setTimeout(
      finishTransition,
      ANIMATION_FALLBACK_MS
    );
  }

  // Finaliza a transição quando a animação CSS termina.
  header.addEventListener('transitionend', event => {
    if (
      event.target === header &&
      event.propertyName === 'transform'
    ) {
      finishTransition();
    }
  });

  function processScroll() {
    scrollFramePending = false;

    const currentScrollY = Math.max(0, window.scrollY || 0);
    const delta = currentScrollY - lastScrollY;

    lastScrollY = currentScrollY;

    // Próximo do topo, o header deve estar visível.
    if (currentScrollY <= SHOW_NEAR_TOP) {
      downDistance = 0;
      upDistance = 0;

      if (state === 'relative' || state === 'hiding') {
        showHeader();
      }

      return;
    }

    // Ignora oscilações mínimas da rolagem.
    if (Math.abs(delta) < 2) return;

    if (delta > 0) {
      // Rolagem para baixo.
      downDistance += delta;
      upDistance = 0;

      if (
        state === 'sticky' &&
        downDistance >= HIDE_AFTER
      ) {
        hideHeader();
      }
    } else {
      // Rolagem para cima.
      upDistance += Math.abs(delta);
      downDistance = 0;

      if (
        (state === 'relative' || state === 'hiding') &&
        upDistance >= SHOW_AFTER
      ) {
        showHeader();
      }
    }
  }

  window.addEventListener('scroll', () => {
    if (scrollFramePending) return;

    scrollFramePending = true;
    requestAnimationFrame(processScroll);
  }, { passive: true });
})();

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

/* ─── PRODUTOS INDISPONÍVEIS ─────────────────────────────────────────────
   badge "paused" (definido no Supabase pelo vendedor):
   • não aparece na lista de produtos (filtro em getFilteredList → essentials.js)
   • continua em `products`, então carrinho/favoritos ainda o encontram
   • aparece em carrinho/favoritos como "Indisponível", sempre por último
   • não pode ser comprado (addToCart / addAllFavToCart / total / checkout) */
const UNAVAILABLE_BADGE = 'paused';

function isProductUnavailable(product) {
  return !!product && product.badge === UNAVAILABLE_BADGE;
}

// Partição estável usada só para EXIBIR: disponíveis primeiro, indisponíveis por último.
// Não altera o array `cart`/`fav` (a ordem salva no Supabase continua a mesma).
function sortUnavailableLast(items) {
  return [
    ...items.filter(item => !isProductUnavailable(item)),
    ...items.filter(item => isProductUnavailable(item))
  ];
}

function unavailableMsgHtml(item) {
  return isProductUnavailable(item)
    ? '<span class="ci-unavailable-msg">Indisponível</span>'
    : '';
}

const EDGE_IMAGE_ZONE = 'https://image.sellerium.workers.dev';
const EDGE_IMAGE_PRESETS = {
  grid: 'grid',
  list: 'list',
  thumbnail: 'thumbnail',
  modal: 'modal'
};

// ============================================================

const PRODUCT_REFRESH_INTERVAL = 10000;
let productRefreshTimer = null;
let productRealtimeChannel = null;
let productRefreshRunning = false;
let productDataSignature = '';
let pageIsVisible = true;

// ============================================================

document.addEventListener('visibilitychange', () => {
    pageIsVisible = document.visibilityState === 'visible';
    if (pageIsVisible) {
      refreshProductsIfNeeded();
    }
  }
);

// ============================================================

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

// ============================================================

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
    await syncEcommeDisplaySettings();
	if (typeof injectEcommeUI === 'function') {
      await injectEcommeUI();
    }
    initTheme();
    initThemeToggle();
    setupModalSwipe();
    setupModalAutoPlay();
    initEcommeTranslationObserver();
    const loginBtn = document.getElementById('authLoginBtn');
    const profileContainer = document.getElementById('headerProfileContainer');
    const productsLoaded = await loadProductsFromSupabase();
    if (!productsLoaded) return;

    const {data: { user }, error: userError} = await supabaseClient.auth.getUser();
    if (!user || userError) {
      userId = null;
      if (loginBtn) {
        loginBtn.classList.remove('hidden');
      }
      if (profileContainer) {
        profileContainer.classList.add('hidden');
      }
      injectPrefetch('/login');
      return;
    }

    userId = user.id;
    await loadSidebarSavedItemsFromSupabase();
    if (loginBtn) {
      loginBtn.classList.add('hidden');
    }
    if (profileContainer) {
      profileContainer.classList.remove('hidden');
    }

    const {data: profile, error: profileError} = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileError && profile) {
      const fullName = profile.full_name || 'Cliente';
      const email = user.email || '';
      if ($('accSidebarName')) {
        $('accSidebarName').textContent = fullName;
      }
      if ($('accSidebarEmail')) {
        $('accSidebarEmail').textContent = email;
      }
      if (profile.avatar_url && $('accSidebarAvatar')) {
        $('accSidebarAvatar').src = profile.avatar_url;
        $('accSidebarAvatar').style.display = "flex";
        if ($('accSidebarIcon')) $('accSidebarIcon').style.display = "none";
      }
    }
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
          headerAvatar.style.filter = 'none';
          headerAvatar.style.width = '100%';
          headerAvatar.style.height = '100%';
          headerAvatar.style.borderRadius = '100%';
          headerAvatar.style.objectFit = 'cover';
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
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) return;
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
    products = updatedProducts;
    shuffled = [...products];
    virtualStartIndex = -1;
    virtualEndIndex = -1;
    virtualColumns = 0;
    updateCart();   // o vendedor pode ter pausado/reativado um produto
    updateFav();
  } finally {productRefreshRunning = false;}
}

// ============================================================

function startProductRefresh() {
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) return;
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
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) return;
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
      .subscribe(status => {/*console.log('Products Realtime:',status);*/});
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
  if (isProductUnavailable(p)) {
    showToast(`${p.name} está indisponível no momento.`, 'err');
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
  updateProductActionUI(normalizedId);
  showToast(`${p.name} adicionado ao carrinho 🛒`);
  syncToSupabase();
}

function removeFromCart(id) {
  const normalizedId = String(id);
  cart = cart.filter(item => String(item.id) !== normalizedId);

  updateCart();
  updateProductActionUI(normalizedId);
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
  const buyableCart = cart.filter(item => !isProductUnavailable(item));

  const total = buyableCart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const count = buyableCart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  if ($('cartBadge')) {
    $('cartBadge').textContent = count;
    $('cartBadge').style.display = count > 0 ? 'flex' : 'none';
  }

  if ($('cartCount')) $('cartCount').textContent = `(${count})`;
  if ($('cartSub')) $('cartSub').textContent = window.ecommeFormatPrice(total);
  if ($('cartTotal')) $('cartTotal').textContent = window.ecommeFormatPrice(total);

  const el = $('cartItems');

  if (!cart.length && $('cartSidebar')) {
    el.innerHTML = `
      <div class="cart-empty-st">
        <span><i class="fa-solid fa-cart-shopping"></i></span>
        <p>Seu carrinho está vazio</p>
      </div>
    `;
    return;
  }

  if ($('cartSidebar')) {
  el.innerHTML = sortUnavailableLast(cart).map(item => {
    const images = getProductImages(item);
    const image = images[0] || null;
    const optimizedImage = image ? getOptimizedImageUrl( image, EDGE_IMAGE_PRESETS.thumbnail ) : null;

    return `
      <div class="ci${isProductUnavailable(item) ? ' ci-unavailable' : ''}">
        <div class="ci-img" onclick="openProduct('${item.id}'); closeCart()">
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
          <div class="ci-name" data-no-translate>${item.name}</div>
          <div class="ci-price" data-no-translate>
            ${window.ecommeFormatPrice(item.price)}
          </div>
          <div class="ci-qty">
            <button
              class="qb"
              onclick="changeCartQty('${item.id}', -1)"
            >
              −
            </button>
            <span class="qn">${item.qty}x</span>
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
          onclick="confirmRemoveFromCart('${item.id}', '${item.name.replace(/'/g, "\\'")}')"
          title="Remover do Carrinho">
          <i class="fa-regular fa-trash-can"></i>
        </button>
        <button class="cart-item-towish ${fav.some(f => String(f.id) === String(item.id)) ? 'on' : ''}" data-product-id="${item.id}"
          onclick="event.stopPropagation(); toggleFav('${item.id}');"
          title="${fav.some(f => String(f.id) === String(item.id)) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
          <i class="fa-regular fa-heart"></i>
        </button>
        ${unavailableMsgHtml(item)}
      </div>
    `;
  }).join('');
  }
}

function updateCartWishButtons() {
  document.querySelectorAll('.cart-item-towish[data-product-id]').forEach(button => {
    const productId = String(button.dataset.productId);
    const isFav = fav.some(
      item => String(item.id) === productId
    );
    button.classList.toggle('on', isFav);
    button.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  });
}

function openCart() {
  closeMore();
  closeFav();
  closeNotif();
  closeAcc();
  if ($('cartSidebar')) $('cartSidebar').classList.add('on');
  if ($('cartOverlay')) $('cartOverlay').classList.add('on');
  if ($('cartSidebar')) document.body.classList.add("nobodyscroll");
  updateCart();
}

function closeCart() {
  if ($('cartSidebar')) $('cartSidebar').classList.remove('on');
  if ($('cartOverlay')) $('cartOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

function checkout() {
  if (!cart.length) {
    showAlert("Para finalizar a compra, é necessário adicionar produtos ao carrinho primeiro!", "Sem Itens no Carrinho", "ℹ️");
    return;
  }
  if (!cart.some(item => !isProductUnavailable(item))) {
    showAlert("Todos os produtos do seu carrinho estão indisponíveis no momento. Remova-os ou aguarde a volta ao estoque.", "Produtos Indisponíveis", "ℹ️");
    return;
  }
  showToast('Redirecionando para o pagamento... 🔒');
  window.location.href = "/checkout"
  setTimeout(closeCart, 1200);
}

let cartItemPendingDelete = null;
function confirmRemoveFromCart(id, productName) {
  cartItemPendingDelete = String(id);
  showConfirm(`Remover "${productName}" do carrinho? Você pode adicioná-lo novamente quando quiser.`, 'Remover do Carrinho', '<i class="fa-solid fa-trash-can"></i>');
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
      'Removido da Lista de Desejos 💔'
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
  if ($('mWish1')) {
    $('mWish1').classList.toggle(
      'on',
      fav.some(
        x => String(x.id) === normalizedId
      )
    );
  }
  updateCartWishButtons();
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
  updateProductActionUI(normalizedId);
  showToast(`${p.name} salvo nos favoritos ❤️`);
  syncToSupabase();
}

function removeFromFav(id) {
  const normalizedId = String(id);
  fav = fav.filter(item => String(item.id) !== normalizedId);

  updateFav();
  updateProductActionUI(normalizedId);
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

  const total = fav
    .filter(item => !isProductUnavailable(item))
    .reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

  const count = fav
  .filter(item => !isProductUnavailable(item))
  .reduce((sum, item) => sum + item.qty, 0);

  if ($('wishBadge')) {
    $('wishBadge').textContent = count;
    $('wishBadge').style.display = count > 0 ? 'flex' : 'none';
  }

  if ($('favCount') && $('favTotal')) {
    $('favCount').textContent = `(${count})`;
    $('favTotal').textContent = window.ecommeFormatPrice(total);
  }

  const el = $('favItems');
  if (!fav.length && $('favSidebar')) {
    el.innerHTML = `
      <div class="fav-empty-st">
        <span><i class="fa-regular fa-heart"></i></span>
        <p>Nenhum produto salvo no momento</p>
      </div>
    `;
    return;
  }

  if ($('favItems') && $('favSidebar')) {
   el.innerHTML = sortUnavailableLast(fav).map(item => {
    const images = getProductImages(item);
    const image = images[0] || null;
    const optimizedImage = image ? getOptimizedImageUrl(image, EDGE_IMAGE_PRESETS.thumbnail) : null;

    return `
      <div class="ci${isProductUnavailable(item) ? ' ci-unavailable' : ''}">
        <div class="ci-img" onclick="openProduct('${item.id}'); closeFav()">
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
          <div class="ci-name" data-no-translate>
            ${item.name}
          </div>
          <div class="ci-price" data-no-translate>
            ${window.ecommeFormatPrice(item.price)}
          </div>
          ${isProductUnavailable(item) ? '' : `
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
          </button>`}
        </div>
        <button
          class="del"
          onclick="removeFromFav('${item.id}')"
        >
          <i class="fa-regular fa-trash-can"></i>
        </button>
        ${unavailableMsgHtml(item)}
      </div>
    `;
   }).join('');
  }
}

function openFav() {
  closeMore();
  closeCart();
  closeNotif();
  closeAcc();
  if ($('favSidebar')) $('favSidebar').classList.add('on');
  if ($('favOverlay')) $('favOverlay').classList.add('on');
  if ($('favOverlay')) document.body.classList.add("nobodyscroll");
}

function closeFav() {
  if ($('favSidebar')) $('favSidebar').classList.remove('on');
  if ($('favOverlay')) $('favOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

function addAllFavToCart() {
  if (!fav.length) {
    showToast('Adicione produtos primeiro! 😊');
    return;
  }
  const availableFav = fav.filter(produto => !isProductUnavailable(produto));
  if (!availableFav.length) {
    showToast('Nenhum dos itens salvos está disponível no momento.', 'err');
    return;
  }
  availableFav.forEach(produto => {
    addToCart(String(produto.id), 1);
  });
  const hadUnavailable = fav.length > availableFav.length;
  fav = fav.filter(produto => isProductUnavailable(produto));   // indisponíveis continuam nos favoritos
  updateFav();
  closeFav();
  openCart();
  showToast(hadUnavailable
    ? 'Os itens disponíveis foram para o carrinho! 🛒'
    : 'Todos os itens foram para o carrinho! 🛒');
}

function moveFromCartToFav(id) {
  addToFav(String(id), 1);
  showToast('Produto adicionado à Lista de Desejos! ❤️');
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
  if ($('notifSidebar')) $('notifSidebar').classList.remove('on');
  if ($('notifOverlay')) $('notifOverlay').classList.remove('on');
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
  if ($('moreSidebar')) $('moreSidebar').classList.remove('on');
  if ($('moreOverlay')) $('moreOverlay').classList.remove('on');
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
let modalImageRequestId = 0;
function showModalImage(index, direction = 'next', animate = true) {
  const mEmoji = $('mEmoji');
  const modalGallery = $('modalGallery');
  if (!mEmoji || !modalImages.length) return;
  const requestId = ++modalImageRequestId;
  const oldImage = mEmoji.querySelector('.modal-main-image');
  modalImageIndex = (index + modalImages.length) % modalImages.length;
  const image = modalImages[modalImageIndex];
  if (!image) return;
  const optimizedImage = getOptimizedImageUrl(
    image,
    EDGE_IMAGE_PRESETS.modal
  );

  const newImage = new Image();
  newImage.alt = 'Imagem do produto';
  newImage.decoding = 'async';
  newImage.fetchPriority = 'high';
  newImage.className = 'modal-main-image';

  const mountImage = () => {
    if (requestId !== modalImageRequestId) return;

    newImage.className =
      `modal-main-image ${
        animate
          ? (direction === 'next'
              ? 'modal-enter-next'
              : 'modal-enter-prev')
          : ''
      }`;

    if (animate && oldImage) {
      oldImage.classList.add(
        direction === 'next'
          ? 'modal-exit-next'
          : 'modal-exit-prev'
      );
    }

    mEmoji.appendChild(newImage);
    if (animate) {
      newImage.addEventListener(
        'animationend',
        () => {
          mEmoji
            .querySelectorAll('.modal-main-image')
            .forEach(img => {
              if (img !== newImage) {
                img.remove();
              }
            });
        },
        { once: true }
      );
    } else {
      mEmoji
        .querySelectorAll('.modal-main-image')
        .forEach(img => {
          if (img !== newImage) {
            img.remove();
          }
        });
    }
  };

  newImage.onload = mountImage;
  newImage.onerror = () => {
    if (requestId !== modalImageRequestId) return;
    if (!oldImage) {
      newImage.className = 'modal-main-image';
      mEmoji.appendChild(newImage);
    }
  };

  newImage.src = optimizedImage;
  if (newImage.complete && newImage.naturalWidth > 0) {
    requestAnimationFrame(mountImage);
  }

  if (modalGallery) {
    modalGallery
      .querySelectorAll('.modal-gallery-thumb')
      .forEach((button, buttonIndex) => {
        button.classList.toggle(
          'on',
          buttonIndex === modalImageIndex
        );
      });

    const activeThumb =
      modalGallery.querySelector(
        '.modal-gallery-thumb.on'
      );

    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: animate ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center'
      });
    }
  }
}

/* ----------------------------------------- */
function mobileArrowFeedback(button, callback) {
  if (!button) {
    callback();
    return;
  }

  if (window.matchMedia('(pointer: coarse)').matches) {
    button.classList.remove('mobile-clicked');
    void button.offsetWidth;
    button.classList.add('mobile-clicked');
    callback();
    setTimeout(() => {
      button.classList.remove('mobile-clicked');
    }, 220);
  } else {
    callback();
  }
}

/* ----------------------------------------- */
let modalLastImageInteraction = 0;
const MODAL_FAST_CLICK_THRESHOLD = 350;

function shouldAnimateModalImage() {
  const now = performance.now();
  const elapsed = now - modalLastImageInteraction;
  modalLastImageInteraction = now;
  return elapsed >= MODAL_FAST_CLICK_THRESHOLD;
}

function changeModalImageManually(index, direction = 'next') {
  const animate = shouldAnimateModalImage();
  showModalImage(index, direction, animate);
  resetModalAutoPlayAfterManualInteraction();
}

/* ----------------------------------------- */
function previousImg() {
  if (modalImages.length <= 1) return;
  const button = document.querySelector('.pArrow1');
  mobileArrowFeedback(button, () => {
    changeModalImageManually(modalImageIndex - 1, 'prev');
  });
}

function nextImg() {
  if (modalImages.length <= 1) return;
  const button = document.querySelector('.pArrow2');
  mobileArrowFeedback(button, () => {
    changeModalImageManually(modalImageIndex + 1, 'next');
  });
}

/* ----------------------------------------- */
function updateModalNavigationVisibility() {
  const buttons = document.querySelectorAll('.mArrows');
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
    stopModalAutoPlay();
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

/* ----------------------------------------- */
let modalAutoPlayTimer = null;
let modalAutoPlayResumeTimer = null;

const MODAL_AUTO_PLAY_INTERVAL = 3000;
const MODAL_AUTO_PLAY_MANUAL_DELAY = 6000;

function startModalAutoPlay(delay = 0) {
  stopModalAutoPlay();
  if (modalImages.length <= 1) return;
  
  const start = () => {
    if (modalImages.length <= 1) return;

    modalAutoPlayTimer = setInterval(() => {
      if (modalImages.length <= 1) {
        stopModalAutoPlay();
        return;
      }
      showModalImage(modalImageIndex + 1, 'next', true);
    }, MODAL_AUTO_PLAY_INTERVAL);
  };

  if (delay > 0) {
    modalAutoPlayResumeTimer = setTimeout(() => {
      modalAutoPlayResumeTimer = null;
      start();
    }, delay);
  } else {
    start();
  }
}

function stopModalAutoPlay() {
  if (modalAutoPlayTimer) {
    clearInterval(modalAutoPlayTimer);
    modalAutoPlayTimer = null;
  }

  if (modalAutoPlayResumeTimer) {
    clearTimeout(modalAutoPlayResumeTimer);
    modalAutoPlayResumeTimer = null;
  }
}

function resetModalAutoPlayAfterManualInteraction() {
  startModalAutoPlay(
    MODAL_AUTO_PLAY_MANUAL_DELAY
  );
}

function setupModalAutoPlay() {
  const modalImgArea = document.querySelector('.modal-img-area');
  if (!modalImgArea) return;
  modalImgArea.addEventListener('mouseenter', stopModalAutoPlay);
  modalImgArea.addEventListener('mouseleave', () => {startModalAutoPlay();});
}

/* ─── MODAL ──────────────────────────────────────────────────────── */
async function openProduct(id) {
  document.body.classList.add("noscroll");

  const productsLoaded = await loadProductsFromSupabase();
  if (!productsLoaded) {
    showToast('Produtos não carregados', 'err');
    return;
  }
  
  const normalizedId = String(id);
  const p = products.find(
    x => String(x.id) === normalizedId
  );

  if (!p) {
    showToast('Produto não encontrado.', type = 'err');
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
    if (modalImages.length > 0) {
      mEmoji.innerHTML = '';
    } else {
      mEmoji.innerHTML = p.emoji || '';
    }
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
      button.addEventListener('click', () => {
        const direction = index >= modalImageIndex ? 'next' : 'prev';
        changeModalImageManually(index, direction);
        resetModalAutoPlayAfterManualInteraction();
      });
      modalGallery.appendChild(button);
    });

  modalGallery.style.display = images.length > 1 ? 'flex' : 'none';
  showModalImage(modalImageIndex, 'next', false);

  $('mCat').textContent =
    Array.isArray(p.cat)
      ? p.cat.join(', ')
      : p.cat;

  $('mName').textContent = p.name;
  $('mDesc').textContent = p.desc;
  $('mPrice').textContent = window.ecommeFormatPrice(p.price);
  $('mPrice1').textContent = window.ecommeFormatPrice(p.price);
  $('mOld').textContent = p.old > 0 ? window.ecommeFormatPrice(p.old) : '';
  $('mDisc').textContent = p.discount > 0 ? `-${p.discount}% OFF` : '';
  $('mFeats').innerHTML = p.features.map(f =>
      `<div class="m-feat">
        <div class="fchk">✓</div>
        ${f}
      </div>`
    ).join('');
    
  if ($('mWish')) $('mWish').classList.toggle('on', fav.some(x => String(x.id) === normalizedId));
  if ($('mWish1')) $('mWish1').classList.toggle('on', fav.some(x => String(x.id) === normalizedId));
  $('modalOverlay').classList.add('on');
 }
 startModalAutoPlay();
};

function handleModalClick(e) { if (e.target === $('modalOverlay')) closeProductModal(); }
function closeModal()        { $('modalOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }
function chgQty(d)           { mQtyVal = Math.max(1, mQtyVal + d); $('mQty').textContent = mQtyVal; }

function addFromModal() {
  toggleFav(String(curId));
  const normalizedId = String(curId);
  const isFav = fav.some(item => String(item.id) === normalizedId);
  if ($('mWish')) $('mWish').classList.toggle('on', isFav);
  if ($('mWish1')) $('mWish1').classList.toggle('on', isFav);
  if (window.location.pathname === '/settings' || window.location.pathname === '/settings/') {
    loadWishlist();
    loadCart();
    return;
  }
  closeModal();
  openFav();
}
function addFromModal2() {
  toggleFav(String(curId));
  const normalizedId = String(curId);
  const isFav = fav.some(item => String(item.id) === normalizedId);
  if ($('mWish')) $('mWish').classList.toggle('on', isFav);
  if ($('mWish1')) $('mWish1').classList.toggle('on', isFav);
  if (window.location.pathname === '/settings' || window.location.pathname === '/settings/') {
    loadWishlist();
    loadCart();
    return;
  }
  closeModal();
  openFav();
}


function openProductPage() {
  if (curId === null || curId === undefined || String(curId).trim() === '') {
    console.error('Nenhum produto selecionado para abrir a página.');
    showToast('Nenhum produto selecionado para abrir a página.', 'err')
    return;
  }
  if (typeof stopModalAutoPlay === 'function') stopModalAutoPlay();
  const productId = encodeURIComponent(String(curId));
  window.location.href = `/product/${productId}`;
}


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

//--------------------------------------------------------
async function loadSidebarSavedItemsFromSupabase() {
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
  if (typeof isEcommeProductDetailRoute === 'function' && isEcommeProductDetailRoute()) {
    const savedIds = [...new Set(
      [...(Array.isArray(data?.cart) ? data.cart : []), ...(Array.isArray(data?.fav) ? data.fav : [])]
        .map(item => item && item.id != null ? String(item.id) : '')
        .filter(Boolean)
    )];

    if (savedIds.length) {
      // Loteia os IDs para evitar URLs de consulta muito grandes quando o
      // usuário possui muitos produtos salvos. A rota /product não carrega o
      // catálogo inteiro, somente o produto atual e os itens realmente salvos.
      const merged = new Map(
        (Array.isArray(products) ? products : []).map(product => [String(product.id), product])
      );
      const chunks = [];
      for (let i = 0; i < savedIds.length; i += 100) {
        chunks.push(savedIds.slice(i, i + 100));
      }

      const results = await Promise.all(chunks.map(ids =>
        supabaseClient
          .from('products')
          .select('*')
          .in('id', ids)
      ));

      let failedChunks = 0;
      for (const result of results) {
        if (result.error) {
          failedChunks++;
          console.warn('Falha ao carregar um lote de produtos do carrinho/favoritos:', result.error);
          continue;
        }

        (result.data || []).forEach(raw => {
          const item = typeof normalizeProduct === 'function' ? normalizeProduct(raw) : raw;
          merged.set(String(item.id), item);
        });
      }

      if (failedChunks) {
        console.warn(`Não foi possível carregar ${failedChunks} lote(s) de produtos salvos na página do produto.`);
      }

      products = [...merged.values()];
      shuffled = [...products];
    }
  }

  cart = hydrateUserItems(data?.cart);
  fav = hydrateUserItems(data?.fav);
  updateCart();
  updateFav();
}

//--------------------------------------------------------
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

// TOAST
/*function showToast(msg) {
  const t = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (toastMsg) toastMsg.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}*/

// TOAST
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = t?.querySelector('.toast-icon');
  if (!t) return;
  if (toastMsg) toastMsg.textContent = msg;
  if (toastIcon) {
    toastIcon.className = `toast-icon ${type}`;
    toastIcon.innerHTML = type === 'ok' ? '<i class="fa-solid fa-check"></i>' : type === 'err' ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-info"></i>';
  }
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.classList.remove('show');
  }, 5000);
}

function toast(msg, type = 'ok') {
  showToast(msg, type = 'ok');
}

// BACK TO TOP
const backTop = document.getElementById('backTop');
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    if (backTop) backTop.classList.toggle('visible',window.scrollY > 400);
    scrollTicking = false;
  });
}, { passive: true });

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeNotif(); closeCart(); closeFav(); closeMore(); closeAcc(); }
});

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


// ── ECOMME GLOBAL HEADER SEARCH ─────────────────────────────────────
(function loadEcommeGlobalSearch() {
  if (window.__ecommeGlobalSearchScriptRequested) return;
  window.__ecommeGlobalSearchScriptRequested = true;

  if (document.querySelector('script[data-ecomme-global-search]')) return;

  const script = document.createElement('script');
  script.src = '/files/scripts/global-search.js';
  script.dataset.ecommeGlobalSearch = 'true';
  script.async = true;
  document.head.appendChild(script);
})();

//initEssentialsJS();

// --------------------------------------------------------
(function () {
  if (window.EcommeNotifications) return;

  const DEFAULT_PREFERENCES = {
    pedidos: true,
    pedido_entrega: true,
    pedido_entregue: true,
    devolucao: false,
    ofertas_relampago: true,
    cupons_exclusivos: true,
    novidades_semanais: false,
    favoritos_promocao: true,
    novidades_produtos: false,
    solicitacoes_avaliacao: true,
    seguranca_conta: true,
    canal_email: true,
    canal_whatsapp: true,
    canal_push: false
  };

  const MINI_GROUPS = {
    pedidos: ['pedidos', 'pedido_entrega', 'pedido_entregue', 'devolucao'],
    promo: ['ofertas_relampago', 'cupons_exclusivos'],
    produtos: ['novidades_produtos', 'favoritos_promocao'],
    review: ['solicitacoes_avaliacao'],
    seguranca: ['seguranca_conta'],
    newsletter: ['novidades_semanais']
  };

  const $ = id => document.getElementById(id);
  let currentUser = null;
  let notifications = [];
  let preferences = { ...DEFAULT_PREFERENCES };
  let realtimeChannel = null;
  let started = false;
  let initRetries = 0;
  let preferencesLoading = false;
  let notificationsLoading = false;

  function getClient() {
    try {
      return typeof supabaseClient !== 'undefined' ? supabaseClient : null;
    } catch (_) {
      return null;
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function safeInternalHref(href) {
    if (!href) return '';
    try {
      const url = new URL(String(href), window.location.origin);
      if (url.origin !== window.location.origin) return '';
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '';
    }
  }

  function emitChange() {
    window.dispatchEvent(new CustomEvent('ecomme:notifications-changed', {
      detail: { notifications: [...notifications], preferences: { ...preferences } }
    }));
    renderSidebar();
  }

  function showMessage(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      try { window.showToast(message, type); return; } catch (_) {}
    }
    console.info('[Ecomme notificações]', message);
  }

  function typePreference(type, metadata = {}) {
    const explicit = metadata && metadata.preference_key;
    if (explicit && Object.prototype.hasOwnProperty.call(DEFAULT_PREFERENCES, explicit)) return explicit;
    const map = {
      order: 'pedidos',
      shipped: 'pedido_entrega',
      delivered: 'pedido_entregue',
      return: 'devolucao',
      promo: 'ofertas_relampago',
      coupon: 'cupons_exclusivos',
      product: 'novidades_produtos',
      wishlist: 'favoritos_promocao',
      review: 'solicitacoes_avaliacao',
      account: 'seguranca_conta',
      security: 'seguranca_conta',
      newsletter: 'novidades_semanais'
    };
    return map[type] || null;
  }

  function isAllowedByPreferences(type, metadata = {}) {
    const key = typePreference(type, metadata);
    if (!key) return true;
    if (['pedido_entrega', 'pedido_entregue', 'devolucao'].includes(key) && !preferences.pedidos) return false;
    return preferences[key] !== false;
  }

  function readGuestPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem('ecomme_notification_preferences_guest') || '{}');
      preferences = { ...DEFAULT_PREFERENCES, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
    } catch (_) {
      preferences = { ...DEFAULT_PREFERENCES };
    }
  }

  async function loadPreferences() {
    if (preferencesLoading) return preferences;
    preferencesLoading = true;
    try {
      if (!currentUser) {
        readGuestPreferences();
        applyPreferencesToUI();
        return preferences;
      }
      const client = getClient();
      if (!client) throw new Error('Cliente Supabase não foi inicializado.');
      const { data, error } = await client
        .from('user_notification_preferences')
        .select('preferences')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      preferences = { ...DEFAULT_PREFERENCES, ...(data?.preferences || {}) };
      applyPreferencesToUI();
      return preferences;
    } catch (error) {
      console.error('Não foi possível carregar as preferências de notificações:', error);
      showMessage('Não foi possível carregar as preferências. Confira se executou supabase/notifications.sql.', 'err');
      applyPreferencesToUI();
      return preferences;
    } finally {
      preferencesLoading = false;
    }
  }

  async function savePreferences(nextPreferences) {
    preferences = { ...DEFAULT_PREFERENCES, ...(nextPreferences || {}) };
    if (!currentUser) {
      try {
        localStorage.setItem('ecomme_notification_preferences_guest', JSON.stringify(preferences));
      } catch (_) {}
      applyPreferencesToUI();
      return { ok: true, localOnly: true };
    }

    const client = getClient();
    if (!client) throw new Error('Cliente Supabase não foi inicializado.');
    const { error } = await client
      .from('user_notification_preferences')
      .upsert({
        user_id: currentUser.id,
        preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) throw error;
    applyPreferencesToUI();
    return { ok: true, localOnly: false };
  }

  function applyPreferencesToUI() {
    document.querySelectorAll('[data-notification-pref]').forEach(input => {
      const key = input.dataset.notificationPref;
      if (key && Object.prototype.hasOwnProperty.call(preferences, key)) {
        input.checked = Boolean(preferences[key]);
      }
    });

    document.querySelectorAll('.sp-row .toggle[data-pref]').forEach(button => {
      const keys = MINI_GROUPS[button.dataset.pref] || [];
      const enabled = keys.length > 0 && keys.every(key => preferences[key] !== false);
      button.classList.toggle('on', enabled);
      button.setAttribute('aria-pressed', String(enabled));
    });
  }

  async function loadNotifications() {
    if (notificationsLoading) return notifications;
    notificationsLoading = true;
    try {
      if (!currentUser) {
        notifications = [];
        emitChange();
        return notifications;
      }
      const client = getClient();
      if (!client) throw new Error('Cliente Supabase não foi inicializado.');
      const { data, error } = await client
        .from('user_notifications')
        .select('id,user_id,type,title,body,target_url,metadata,created_at,read_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      notifications = Array.isArray(data) ? data : [];
      emitChange();
      return notifications;
    } catch (error) {
      console.error('Não foi possível carregar as notificações:', error);
      notifications = [];
      emitChange();
      window.dispatchEvent(new CustomEvent('ecomme:notifications-error', { detail: { error } }));
      return notifications;
    } finally {
      notificationsLoading = false;
    }
  }

  async function createForCurrentUser({ type = 'system', title, body = '', target_url = null, metadata = {} } = {}) {
    if (!currentUser) throw new Error('Entre na sua conta para guardar notificações.');
    if (!title || !String(title).trim()) throw new Error('O título da notificação é obrigatório.');
    if (!isAllowedByPreferences(type, metadata)) return { skipped: true };

    const client = getClient();
    const payload = {
      user_id: currentUser.id,
      type: String(type).slice(0, 40),
      title: String(title).trim().slice(0, 180),
      body: String(body || '').trim().slice(0, 2000),
      target_url: safeInternalHref(target_url) || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    };
    const { data, error } = await client
      .from('user_notifications')
      .insert(payload)
      .select('id,user_id,type,title,body,target_url,metadata,created_at,read_at')
      .single();
    if (error) throw error;
    notifications = [data, ...notifications.filter(item => item.id !== data.id)].slice(0, 100);
    emitChange();
    return { data };
  }

  async function markRead(id) {
    if (!currentUser) return;
    const item = notifications.find(row => String(row.id) === String(id));
    if (!item || item.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await getClient()
      .from('user_notifications')
      .update({ read_at: readAt })
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (error) throw error;
    notifications = notifications.map(row => String(row.id) === String(id) ? { ...row, read_at: readAt } : row);
    emitChange();
  }

  async function markAllRead() {
    if (!currentUser) return;
    const unreadIds = notifications.filter(row => !row.read_at).map(row => row.id);
    if (!unreadIds.length) return;
    const readAt = new Date().toISOString();
    const { error } = await getClient()
      .from('user_notifications')
      .update({ read_at: readAt })
      .eq('user_id', currentUser.id)
      .is('read_at', null);
    if (error) throw error;
    notifications = notifications.map(row => ({ ...row, read_at: row.read_at || readAt }));
    emitChange();
  }

  async function deleteNotification(id) {
    if (!currentUser) return;
    const { error } = await getClient()
      .from('user_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (error) throw error;
    notifications = notifications.filter(row => String(row.id) !== String(id));
    emitChange();
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay) return 'Hoje · ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem · ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  window.addEventListener('ecomme:sidebars-ready', () => {
    renderSidebar();
    // Os sidebars são inseridos via fetch em algumas páginas; se a primeira
    // inicialização ocorreu antes da inserção, tente inicializar novamente.
    if (!started) init();
  });

  function renderSidebar() {
    const body = document.querySelector('#notifSidebar .notif-body');
    const count = $('notifCount');
    const badge = $('bellBadge');
    const unread = notifications.filter(row => !row.read_at).length;
    if (count) count.textContent = `(${notifications.length})`;
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = unread ? 'flex' : 'none';
    }
    if (!body) return;

    if (!currentUser) {
      body.innerHTML = '<div class="ecomme-notif-empty">Entre na sua conta para ver suas notificações.</div>';
      return;
    }
    if (!notifications.length) {
      body.innerHTML = '<div class="ecomme-notif-empty">Você ainda não tem notificações.</div>';
      return;
    }

    body.innerHTML = notifications.slice(0, 5).map(row => {
      const href = safeInternalHref(row.target_url);
      return `<button type="button" class="ecomme-notif-preview ${row.read_at ? '' : 'is-unread'}" data-notification-id="${escapeHTML(row.id)}">
        <span class="ecomme-notif-preview-title">${escapeHTML(row.title)}</span>
        <span class="ecomme-notif-preview-body">${escapeHTML(row.body || '')}</span>
        <span class="ecomme-notif-preview-time">${escapeHTML(formatTime(row.created_at))}</span>
        ${href ? `<span class="ecomme-notif-preview-hint">Abrir notificação ↗</span>` : ''}
      </button>`;
    }).join('');

    body.querySelectorAll('[data-notification-id]').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.notificationId;
        const item = notifications.find(row => String(row.id) === String(id));
        try { await markRead(id); } catch (error) { console.error(error); }
        const href = safeInternalHref(item?.target_url);
        if (href) window.location.href = href;
      });
    });
  }

  function startRealtime() {
    const client = getClient();
    if (!client || !currentUser) return;
    if (realtimeChannel) client.removeChannel(realtimeChannel);
    realtimeChannel = client
      .channel(`ecomme-notifications-${currentUser.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, () => { loadNotifications(); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_notification_preferences',
        filter: `user_id=eq.${currentUser.id}`
      }, () => { loadPreferences(); })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime de notificações não conectou:', status);
        }
      });
  }

  async function initializeForUser(user) {
    if (realtimeChannel && getClient()) {
      getClient().removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    currentUser = user || null;
    notifications = [];
    if (!currentUser) {
      readGuestPreferences();
      applyPreferencesToUI();
      emitChange();
      return;
    }
    await Promise.all([loadPreferences(), loadNotifications()]);
    startRealtime();
  }

  async function init() {
    if (started) return;
    const hasNotificationsUI = document.querySelector('#notifSidebar, #bellBtn, #notifSection, [data-notification-pref]');
    if (!hasNotificationsUI) return;
    const client = getClient();
    if (!client) {
      if (initRetries++ < 30) window.setTimeout(init, 100);
      else console.warn('Sistema de notificações: supabaseClient não foi inicializado.');
      return;
    }
    started = true;
    try {
      const { data, error } = await client.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') console.warn('Verificação de sessão das notificações:', error.message);
      await initializeForUser(data?.user || null);
    } catch (error) {
      console.error('Falha ao inicializar notificações:', error);
      await initializeForUser(null);
    }

    client.auth.onAuthStateChange((_event, session) => {
      // Evita executar operações Supabase diretamente dentro do callback de auth.
      window.setTimeout(() => initializeForUser(session?.user || null), 0);
    });
  }

  async function saveFromSettings() {
    const next = { ...preferences };
    document.querySelectorAll('[data-notification-pref]').forEach(input => {
      const key = input.dataset.notificationPref;
      if (key && Object.prototype.hasOwnProperty.call(DEFAULT_PREFERENCES, key)) next[key] = Boolean(input.checked);
    });
    try {
      const result = await savePreferences(next);
      showMessage(result.localOnly ? 'Preferências salvas neste navegador. Entre na conta para sincronizar entre dispositivos.' : 'Preferências de notificações salvas na sua conta.', 'ok');
      return result;
    } catch (error) {
      console.error('Erro ao salvar preferências de notificações:', error);
      showMessage('Não foi possível salvar as preferências. Confira a conexão e as políticas RLS.', 'err');
      throw error;
    }
  }

  async function saveFromMiniPanel() {
    const next = { ...preferences };
    document.querySelectorAll('.sp-row .toggle[data-pref]').forEach(button => {
      const keys = MINI_GROUPS[button.dataset.pref] || [];
      keys.forEach(key => { next[key] = button.classList.contains('on'); });
    });
    try {
      const result = await savePreferences(next);
      showMessage(result.localOnly ? 'Preferências salvas neste navegador.' : 'Preferências salvas na sua conta.', 'ok');
      return result;
    } catch (error) {
      console.error('Erro ao salvar preferências da página de notificações:', error);
      showMessage('Não foi possível salvar as preferências. Confira o banco de dados.', 'err');
      throw error;
    }
  }

  async function activateAllSettings() {
    preferences = Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(key => [key, true]));
    document.querySelectorAll('#panel-notifications [data-notification-pref]').forEach(input => { input.checked = true; });
    applyPreferencesToUI();
    return saveFromSettings();
  }

  window.EcommeNotifications = {
    init,
    getUser: () => currentUser,
    isAuthenticated: () => Boolean(currentUser),
    getNotifications: () => [...notifications],
    getPreferences: () => ({ ...preferences }),
    loadNotifications,
    loadPreferences,
    createForCurrentUser,
    markRead,
    markAllRead,
    deleteNotification,
    savePreferences,
    saveFromSettings,
    saveFromMiniPanel,
    activateAllSettings,
    applyPreferencesToUI,
    formatTime,
    renderSidebar
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
