/* -- THEME --------------------------------------------------------- */
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

function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

let products = [];
const EDGE_IMAGE_ZONE = 'https://image.sellerium.workers.dev';
const EDGE_IMAGE_PRESETS = {
  grid: 'grid',
  list: 'list',
  thumbnail: 'thumbnail',
  modal: 'modal'
};

// Contrato da futura Edge Function `checkout-payments`:
// create: recebe checkout + idempotencyKey; devolve { orderId, orderCode, redirectUrl }.
// status: recebe orderId; devolve { status, orderCode }.
// O servidor valida o JWT, recalcula preços/frete/cupons, valida endereço e cria o pedido.
// Também deve rejeitar products.loja_id pertencentes a lojas cujo user_id seja o auth.uid() comprador.
// A chave ASAAS_API_KEY fica exclusivamente nos Secrets da Edge Function; nunca no navegador.
// O pedido só muda para pago após webhook CHECKOUT_PAID validado e processado com idempotência.
const CHECKOUT_PAYMENT_FUNCTION = 'checkout-payments';
let checkoutProfile = null;
let checkoutOrder = null;
let checkoutPaymentStatus = null;
let checkoutOwnedStoreIds = new Set();
let checkoutOwnershipVerified = false;

// ---------------------------------------------
function checkoutNeedsDataModal(user, profile) {
  if (!user || !profile) {
    return true;
  }

  const email = String(user.email || '').trim();

  const fullName = String(
    profile.full_name || ''
  ).trim();

  const phone = String(
    profile.phone || ''
  ).replace(/\D/g, '');

  const cpf = String(
    profile.cpf || ''
  ).replace(/\D/g, '');

  const birthDate = String(
    profile.birth_date || ''
  ).trim();

  // ── NOME E SOBRENOME ──────────────────────────────
  const nameParts = fullName
    ? fullName.split(/\s+/)
    : [];

  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ').trim();

  if (
    firstName.length < 3 ||
    firstName.length > 30
  ) {
    return true;
  }

  if (
    lastName.length < 3 ||
    lastName.length > 50
  ) {
    return true;
  }

  // ── E-MAIL ─────────────────────────────────────────
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return true;
  }

  // ── TELEFONE ───────────────────────────────────────
  if (
    phone.length !== 10 &&
    phone.length !== 11
  ) {
    return true;
  }

  // ── CPF ────────────────────────────────────────────
  if (
    !isValidCPF(cpf)
  ) {
    return true;
  }

  // ── DATA DE NASCIMENTO ─────────────────────────────
  if (!birthDate) {
    return true;
  }

  const parsedBirthDate = new Date(
    `${birthDate}T00:00:00`
  );

  if (
    Number.isNaN(parsedBirthDate.getTime())
  ) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedBirthDate > today) {
    return true;
  }
  return false;
}

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initThemeToggle();
  const loginBtn = document.getElementById('authLoginBtn');
  const profileContainer = document.getElementById('headerProfileContainer');
  const headerImage = document.getElementById('headerAvatar');

  try {
    await loadProductsFromSupabase();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.warn('User session not active.');
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (profileContainer) profileContainer.classList.add('hidden');
      if (typeof injectPrefetch === 'function') injectPrefetch('/login');
      renderCart();
      renderSummary();
      buildInstallOpts();
      hideLoadingModal();
      toast('Entre na sua conta para acessar o checkout.', 'info');
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

    checkoutProfile = !profileError && profile ? profile : null;
    if (checkoutProfile) {
      const fullName = checkoutProfile.full_name || 'Cliente';
      if ($('accSidebarEmail')) $('accSidebarEmail').textContent = user.email || '';
      if (checkoutProfile.avatar_url && $('accSidebarAvatar')) $('accSidebarAvatar').src = checkoutProfile.avatar_url;
      const recipient = document.getElementById('recipient');
      if (recipient) recipient.value = fullName;
      const nameParts = fullName.trim().split(/\s+/);
      const inputFirstName = document.getElementById('profileFirstName');
      const inputLastName = document.getElementById('profileLastName');
      const inputEmail = document.getElementById('profileEmail');
      if (inputFirstName) inputFirstName.value = nameParts[0] || '';
      if (inputLastName) inputLastName.value = nameParts.slice(1).join(' ');
      if (inputEmail) inputEmail.value = user.email || '';

      if (checkoutProfile.avatar_url) {
        [document.getElementById('sidebarAvatar'), headerImage].forEach(image => {
          if (!image) return;
          image.src = checkoutProfile.avatar_url;
          image.style.filter = 'none';
          image.style.width = '100%';
          image.style.height = '100%';
          image.style.borderRadius = '100%';
          image.style.objectFit = 'cover';
        });
      }
    }

    const needsDataModal = checkoutNeedsDataModal(user, checkoutProfile);
    hideLoadingModal();
    if (needsDataModal) {
      setTimeout(() => showDataModal(), 350);
      return;
    }

    const handledReturn = await handleAsaasPaymentReturn();
    if (!handledReturn) await restoreCheckoutOrder();
  } catch (error) {
    console.error('Erro ao inicializar o checkout:', error);
    hideLoadingModal();
    toast('Não foi possível carregar o checkout. Atualize a página.', 'err');
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

/* ─── STATE ─────────────────────────────────────────────────────────── */
let savedAddresses = [];
let selectedAddressId = null;
let selectedAddress = null;
let addressMode = 'saved';
let shippingMethod = 'free';
let cart = [];
let curId = null;
let mQtyVal = 1;

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
function showToast(msg, type) {
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

function toast(msg, type) {
  showToast(msg, type);
}

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeMore(); closeAcc(); }
});

// Identifica as lojas pertencentes ao comprador pela mesma RPC usada no painel Sellers.
async function loadCheckoutOwnedStoreIds() {
  if (!userId) throw new Error('Não foi possível identificar o usuário do checkout.');
  const { data, error } = await supabaseClient.rpc('get_my_store_private');
  if (error) throw error;
  const stores = Array.isArray(data) ? data : (data ? [data] : []);
  return new Set(stores.map(store => store?.id).filter(id => id !== undefined && id !== null).map(String));
}

function isCheckoutOwnStoreProduct(product, storeIds = checkoutOwnedStoreIds) {
  return !!product?.loja_id && storeIds.has(String(product.loja_id));
}

// ── SYNC CART AND WISHLIST WITH SUPABASE ──
async function syncToSupabase() {
  if (!userId) {
    return;
  }

  const cartToSave = cartItems.map(item => ({id: String(item.id), qty: Math.max(1, Number(item.qty) || 1)}));
  const {error} =
    await supabaseClient
      .from('profiles')
      .update({cart: cartToSave})
      .eq('id', userId);

  if (error) {
    console.error('Erro ao sincronizar carrinho:', error);
  }
}

// ── LOAD DATA FROM SUPABASE AFTER PAGE LOAD ──
async function loadFromSupabase() {
  if (!userId) return;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('cart, fav, addresses')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao carregar dados do checkout:', error);
    return;
  }

  cartItems = hydrateCartItems(data?.cart);
  try {
    checkoutOwnedStoreIds = await loadCheckoutOwnedStoreIds();
    checkoutOwnershipVerified = true;
    const ownProducts = cartItems.filter(item => isCheckoutOwnStoreProduct(item));
    if (ownProducts.length) {
      const ownIds = new Set(ownProducts.map(item => String(item.id)));
      cartItems = cartItems.filter(item => !ownIds.has(String(item.id)));
      cart = cartItems;
      await syncToSupabase();
      const count = ownProducts.length;
      toast(`${count} ${count === 1 ? 'produto da sua própria loja foi removido' : 'produtos da sua própria loja foram removidos'} do carrinho.`, 'info');
    }
  } catch (ownershipError) {
    checkoutOwnershipVerified = false;
    console.error('Não foi possível verificar os produtos das lojas do comprador:', ownershipError);
  }
  cart = cartItems;
  await loadCheckoutAddresses(data?.addresses);
  renderCart();
  renderSummary();
  renderAddresses();
  buildInstallOpts();
}

async function loadCheckoutAddresses(legacyAddresses = []) {
  if (!userId) return;
  const { data, error } = await supabaseClient
    .from('addresses')
    .select('id, type, recipient_name, street, number, complement, neighborhood, city, state, zip_code, is_default, created_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar endereços da conta:', error);
    toast('Não foi possível carregar seus endereços salvos.', 'err');
    savedAddresses = [];
  } else {
    savedAddresses = (data || []).map(address => ({
      id: address.id,
      type: address.type || 'Casa',
      recipient: address.recipient_name || '',
      cep: address.zip_code || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      city: address.city || '',
      state: address.state || '',
      is_default: Boolean(address.is_default),
      _legacy: false
    }));
  }

  // Compatibilidade temporária com endereços antigos em profiles.addresses.
  if (!savedAddresses.length && Array.isArray(legacyAddresses)) {
    savedAddresses = legacyAddresses.map((address, index) => ({
      id: `legacy-${index}`,
      type: address.type || 'Casa',
      recipient: address.recipient || address.recipient_name || '',
      cep: address.cep || address.zip_code || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      city: address.city || '',
      state: address.state || '',
      is_default: Boolean(address.is_default),
      _legacy: true
    }));
  }

  selectedAddress = savedAddresses.find(address => address.is_default) || savedAddresses[0] || null;
  selectedAddressId = selectedAddress ? String(selectedAddress.id) : null;
  addressMode = selectedAddress ? 'saved' : 'new';
}

// -------------------------------------------------
async function loadProductsFromSupabase() {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error("Erro ao carregar produtos do banco:", error);
    return;
  }

  if (data) {
    products = data;
    shuffled = [...products];
  }
}

function isCheckoutProductUnavailable(product) {
  return String(product?.badge || '').toLowerCase() === 'paused';
}
  
function hydrateCartItems(savedCart) {
  if (
    !Array.isArray(
      savedCart
    )
  ) {
    return [];
  }

  return savedCart
    .map(savedItem => {

      const savedId =
        String(
          savedItem?.id ??
          savedItem?.product_id ??
          ''
        );

      if (!savedId) {
        return null;
      }

      const product =
        products.find(
          item =>
            String(
              item.id
            ) === savedId
        );

      if (!product) {
        console.warn('Produto do carrinho não encontrado:', savedId);
        return null;
      }

      if (isCheckoutProductUnavailable(product)) {
        console.info('Produto indisponível ignorado no checkout:', savedId);
        return null;
      }

      return {
        ...product,

        id:
          savedId,

        qty:
          Math.max(
            1,
            Number(
              savedItem?.qty
            ) || 1
          )
      };
    })
    .filter(Boolean);
}

// ── STATE ──────────────────────────────────────────────
let cartItems = [];
let discount = 0;
let couponCode = '';
let payMethod = '';
let shipping = 0;
let currentStep = 1;
let furthestStep = 1;
let installSel = 1;

// LOGOUT
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut();
  buttonLink('/login')
}

// ── CART ───────────────────────────────────────────────
function renderCart() {
  const list =
    document.getElementById(
      'cartList'
    );

  if (!list) {
    return;
  }

  if (!cartItems.length) {
    list.innerHTML = `
      <div
        style="
          text-align:center;
          padding:32px;
          color:var(--muted);
          font-size:13px;
        "
      >
        🛒 Carrinho vazio
      </div>
    `;

    return;
  }

  list.innerHTML =
    cartItems
      .map(item => {

        const id =
          String(
            item.id
          );

        const qty =
          Math.max(
            1,
            Number(
              item.qty
            ) || 1
          );

        const price =
          Number(
            item.price
          ) || 0;

        const images =
          getProductImages(
            item
          );

        const mainImage =
          images[0] ||
          null;

        const imageUrl =
          mainImage
            ? getOptimizedImageUrl(
                mainImage,
                EDGE_IMAGE_PRESETS.thumbnail
              )
            : null;

        const category =
          Array.isArray(
            item.cat
          )
            ? item.cat.join(
                ', '
              )
            : String(
                item.cat ||
                ''
              );

        return `
          <div
            class="ci"
            id="ci-${escapeHtml(
              id
            )}"
          >

            <div class="ci-img">

              ${
                imageUrl
                  ? `
                    <img
                      src="${escapeHtml(
                        imageUrl
                      )}"
                      alt="${escapeHtml(
                        item.name ||
                        'Produto'
                      )}"
                      loading="lazy"
                      decoding="async"
                      style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:inherit;
                        display:block;
                      "
                      onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='flex';
                      "
                    >

                    <span
                      style="
                        display:none;
                        width:100%;
                        height:100%;
                        align-items:center;
                        justify-content:center;
                        font-size:28px;
                      "
                    >
                      ${escapeHtml(
                        item.emoji ||
                        '📦'
                      )}
                    </span>
                  `
                  : `
                    ${escapeHtml(
                      item.emoji ||
                      '📦'
                    )}
                  `
              }

            </div>

            <div
              class="ci-info"
            >

              <div
                class="ci-name"
              >
                ${escapeHtml(
                  item.name ||
                  'Produto'
                )}
              </div>

              <div
                class="ci-meta"
              >
                ${escapeHtml(
                  category
                )}
              </div>

              <div
                class="ci-qty"
              >

                <button
                  class="qb"
                  onclick="
                    chgQty(
                      '${escapeJs(
                        id
                      )}',
                      -1
                    )
                  "
                >
                  −
                </button>

                <span
                  class="qn"
                  id="q-${escapeHtml(
                    id
                  )}"
                >
                  ${qty}
                </span>

                <button
                  class="qb"
                  onclick="
                    chgQty(
                      '${escapeJs(
                        id
                      )}',
                      1
                    )
                  "
                >
                  +
                </button>

              </div>

            </div>

            <div
              style="
                text-align:right;
                flex-shrink:0;
              "
            >

              <div
                class="ci-price"
                id="p-${escapeHtml(
                  id
                )}"
              >
                ${fp(
                  price * qty
                )}
              </div>

              <div
                style="
                  font-size:10px;
                  color:var(--muted);
                  margin-top:2px;
                "
              >
                ${fp(
                  price
                )} un.
              </div>

            </div>

            <button
              class="rm-btn"
              onclick="
                rmItem(
                  '${escapeJs(
                    id
                  )}'
                )
              "
            >
              <svg
                viewBox="0 0 24 24"
              >
                <polyline
                  points="
                    3 6
                    5 6
                    21 6
                  "
                />

                <path
                  d="
                    M19 6v14
                    a2 2 0 0 1
                    -2 2H7
                    a2 2 0 0 1
                    -2-2V6
                    m3 0V4
                    a1 1 0 0 1
                    1-1h4
                    a1 1 0 0 1
                    1 1v2
                  "
                />
              </svg>
            </button>

          </div>
        `;
      })
      .join('');
}

// -----------------------------------
function chgQty(id, delta) {
  const normalizedId = String(id);
  const item =
    cartItems.find(
      product =>
        String(
          product.id
        ) === normalizedId
    );

  if (!item) {return;}
  item.qty = Math.max(1, Number(item.qty || 1) + Number(delta || 0));
  cart = cartItems;
  const qtyElement =
    document.getElementById(
      'q-' + normalizedId
    );
  const priceElement =
    document.getElementById(
      'p-' + normalizedId
    );
  if (qtyElement) {
    qtyElement.textContent =
      item.qty;
  }
  if (priceElement) {
    priceElement.textContent =
      fp(
        Number(item.price || 0) *
        item.qty
      );
  }
  renderSummary();
  buildInstallOpts();
  syncToSupabase();
}

function rmItem(id) {
  const normalizedId = String(id);
  const element = document.getElementById('ci-' + normalizedId);
  if (element) {
    element.style.transition = 'opacity .3s, transform .3s';
    element.style.opacity = '0';
    element.style.transform = 'translateX(20px)';
  }

  setTimeout(() => {
      cartItems =
        cartItems.filter(
          item =>
            String(
              item.id
            ) !== normalizedId
        );

      cart = cartItems;
      renderCart();
      renderSummary();
      syncToSupabase();
    },300
  );
}

// ── COUPON ─────────────────────────────────────────────
const COUPONS = {SAVE10:.10, SAVE20:.20, BLUE15:.15, SHOP25:.25};
function applyCoupon(){
  const v = document.getElementById('couponInp').value.trim().toUpperCase();
  const fb = document.getElementById('couponFb');
  fb.className = 'coupon-feedback';
  if(COUPONS[v]){ discount=COUPONS[v]; couponCode=v; fb.className='coupon-feedback ok'; fb.textContent=`✓ Cupom ${v} aplicado! ${discount*100}% de desconto`; renderSummary(); toast(`Cupom ${v}: ${discount*100}% OFF aplicado 🎉`,'ok'); }
  else{ fb.className='coupon-feedback err'; fb.textContent='Cupom inválido ou expirado. Tente: SAVE10, SAVE20, BLUE15'; }
}

// ── SUMMARY ────────────────────────────────────────────
function calculateCheckoutTotals() {
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  const couponDiscount = subtotal * (Number(discount) || 0);
  const pixDiscount = payMethod === 'pix' ? (subtotal - couponDiscount) * 0.05 : 0;
  const shippingCost = Number(shipping) || 0;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    pixDiscount: Math.round(pixDiscount * 100) / 100,
    shipping: Math.round(shippingCost * 100) / 100,
    total: Math.max(0, Math.round((subtotal - couponDiscount - pixDiscount + shippingCost) * 100) / 100)
  };
}

function renderSummary() {
  const totals = calculateCheckoutTotals();
  const { subtotal: raw, couponDiscount: dis, pixDiscount: pixDis, total } = totals;
  const sumCount = document.getElementById('sumCount');
  if (sumCount) sumCount.textContent = `(${cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} itens)`;
  const sumSub = document.getElementById('sumSub');
  const sumShip = document.getElementById('sumShip');
  const sumTotal = document.getElementById('sumTotal');
  if (sumSub) sumSub.textContent = fp(raw);
  if (sumShip) {
    sumShip.textContent = shipping === 0 ? '🎉 Grátis' : fp(shipping);
    sumShip.style.color = shipping === 0 ? 'var(--green)' : 'var(--text)';
  }
  if (sumTotal) sumTotal.textContent = fp(total);

  const discRow = document.getElementById('discRow');
  if (discRow) {
    if (dis > 0) {
      discRow.style.display = 'flex';
      document.getElementById('discTag').textContent = couponCode;
      document.getElementById('sumDisc').textContent = '-' + fp(dis);
    } else discRow.style.display = 'none';
  }

  const pixDiscRow = document.getElementById('pixDiscRow');
  if (pixDiscRow) {
    if (pixDis > 0) {
      pixDiscRow.style.display = 'flex';
      document.getElementById('sumPixDisc').textContent = '-' + fp(pixDis);
    } else pixDiscRow.style.display = 'none';
  }

  const note = document.getElementById('installNote');
  if (note) note.textContent = payMethod === 'card' && installSel > 1 ? `${installSel}× de ${fp(total / installSel)} (estimativa)` : '';

  const sumItems = document.getElementById('sumItems');
  if (sumItems) {sumItems.innerHTML = cartItems .map(item => {
        const images = getProductImages(item);
        const mainImage = images[0] || null;
        const optimizedImage = mainImage ? getOptimizedImageUrl(mainImage, EDGE_IMAGE_PRESETS.thumbnail) : null;
        const category = Array.isArray(item.cat) ? item.cat.join(', ') : String(item.cat || '');
        const quantity = Math.max(1, Number(item.qty) || 1);
        const price = Number(item.price) || 0;

        return `
          <div class="sum-item">
            <div class="sum-item-em">
              ${optimizedImage ? `<img src="${escapeHtml(optimizedImage)}"
                      alt="${escapeHtml(item.name || 'Produto')}"
                      loading="lazy"
                      decoding="async"
                      class="sum-item-image">`
                  :
                   `<span class="sum-item-fallback">
                      ${escapeHtml(item.emoji || '📦')}
                    </span>`
              }
              <div class="sum-item-qty">${quantity}</div>
            </div>
            <div style="flex:1; min-width:0;">
              <div class="sum-item-name">
                ${escapeHtml(item.name || 'Produto')}
              </div>
              <div class="sum-item-cat">
                ${escapeHtml(category)}
              </div>
            </div>
            <div class="sum-item-price">
              ${fp(price * quantity)}
            </div>
          </div>
        `;
      }).join('');
  }
}

// ── STEP NAV ───────────────────────────────────────────
function goStep(n, force = false) {
  if (n < 1 || n > 4) return;
  if (!force && currentStep === 4 && n !== 4) return;

  if (!force && n > currentStep && cartItems.length === 0) {
    toast('Não há produtos disponíveis para finalizar a compra.', 'err');
    return;
  }
  if (!force && n === 3 && !validateDeliveryStep()) return;
  if (n === 3 && !payMethod) payMethod = 'pix';

  const isGoingBack = n <= furthestStep;
  const isGoingForward = n === currentStep + 1;
  if (!force && !isGoingBack && !isGoingForward) return;
  if (n > furthestStep) furthestStep = n;

  currentStep = n;
  if (n === 3) {
    const selectedTab = document.querySelector(`.pay-tab[onclick*="'${payMethod}'"]`) || document.querySelector('.pay-tab');
    if (selectedTab) selPayTab(selectedTab, payMethod || 'pix');
    updatePaymentButton();
    buildInstallOpts();
  }
  
  const ids = ['step1', 'step2', 'step3', 'step4'];
  const sids = ['s1', 's2', 's3', 's4'];

  ids.forEach((id, i) => {
    const panel = document.getElementById(id);
    if (panel) panel.style.display = (i + 1 === n) ? 'block' : 'none';
  });

  sids.forEach((id, i) => {
    const stepNumber = i + 1;
    const el = document.getElementById(id);
    if (!el) return;
  
    if (stepNumber < n) {
      el.className = 'step-item done';
    } else if (stepNumber === n) {
      el.className = 'step-item active';
    } else {
      el.className = 'step-item';
    }

    const dot = el.querySelector('.step-dot');
    const label = el.querySelector('.step-lbl');

    if (dot) {
      dot.textContent = stepNumber < n
        ? '✓'
        : stepNumber;
    }

    const unlocked = currentStep !== 4 && stepNumber <= furthestStep;
    if (dot) dot.disabled = !unlocked;
    if (label) label.disabled = !unlocked;

    el.setAttribute(
      'aria-disabled',
      String(!unlocked)
    );
  });

  window.scrollTo({top: 0, behavior: 'smooth'});
  if (n === 4) {
    showConfirm();
  }
}

function goToHeaderStep(n) {
  if (n > furthestStep) return;
  goStep(n);
}
  
// ── ADDRESS & DELIVERY ─────────────────────────────────
function selAddr(element, addressId) {
  selectedAddress = savedAddresses.find(address => String(address.id) === String(addressId)) || null;
  selectedAddressId = selectedAddress ? String(selectedAddress.id) : null;
  addressMode = 'saved';
  document.querySelectorAll('.addr-opt').forEach(card => card.classList.remove('on'));
  if (element) element.classList.add('on');
  document.getElementById('newAddrForm')?.classList.remove('on');
}

function toggleNewAddr() {
  const form = document.getElementById('newAddrForm');
  if (!form) return;
  const opening = !form.classList.contains('on');
  form.classList.toggle('on', opening);
  if (opening) {
    addressMode = 'new';
    document.querySelectorAll('.addr-opt').forEach(card => card.classList.remove('on'));
  } else {
    addressMode = 'saved';
    const fallback = savedAddresses.find(address => address.is_default) || savedAddresses[0] || null;
    selectedAddress = fallback;
    selectedAddressId = fallback ? String(fallback.id) : null;
    renderAddresses();
  }
}

function selShip(element, price, method = 'free') {
  document.querySelectorAll('.ship-opt').forEach(option => option.classList.remove('on'));
  if (element) element.classList.add('on');
  shipping = Number(price) || 0;
  shippingMethod = method;
  renderSummary();
  buildInstallOpts();
}

function collectAddressFromForm() {
  const get = id => String(document.getElementById(id)?.value || '').trim();
  const address = {
    recipient: get('recipient'),
    cep: get('cepInp').replace(/\D/g, ''),
    street: get('streetInp'),
    number: get('numInp'),
    complement: get('complementInp'),
    neighborhood: get('neighInp'),
    city: get('cityInp'),
    state: get('stateInp').toUpperCase(),
    type: 'Outro',
    _legacy: false,
    _unsaved: true
  };
  if (!address.recipient || address.recipient.length < 3) throw new Error('Informe o nome do destinatário.');
  if (address.cep.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.');
  if (!address.street || !address.number || !address.city || !/^[A-Z]{2}$/.test(address.state)) {
    throw new Error('Preencha rua, número, cidade e estado do endereço.');
  }
  return address;
}

function validateDeliveryStep() {
  if (addressMode === 'new') {
    try {
      selectedAddress = collectAddressFromForm();
      selectedAddressId = null;
      return true;
    } catch (error) {
      toast(error.message, 'err');
      document.getElementById('newAddrForm')?.classList.add('on');
      return false;
    }
  }
  if (!selectedAddress) {
    toast('Selecione um endereço salvo ou informe um novo endereço.', 'err');
    return false;
  }
  return true;
}

function maskCEP(input) {
  let value = input.value.replace(/\D/g, '').slice(0, 8);
  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
  input.value = value;
}

//-------------------------------------------------------------
async function searchCEP() {
  const v = document.getElementById('cepInp').value.replace(/\D/g, '');
  if (v.length !== 8) {
    toast('CEP inválido', 'err');
    return;
  }

  try {
    document.getElementById('streetInp').value = 'Buscando...';
    const response = await fetch(`https://viacep.com.br/ws/${v}/json/`);
    if (!response.ok) throw new Error('Falha ao consultar o CEP.');
    const data = await response.json();

    if (data.erro) {
      toast('CEP não encontrado', 'err');
      document.getElementById('streetInp').value = '';
      document.getElementById('neighInp').value = '';
      document.getElementById('cityInp').value = '';
      document.getElementById('stateInp').value = '';
      document.getElementById('unlockAddrBtn').style.display = 'inline-block';
      return;
    }

    document.getElementById('streetInp').value = data.logradouro || '';
    document.getElementById('neighInp').value = data.bairro || '';
    document.getElementById('cityInp').value = data.localidade || '';
    document.getElementById('stateInp').value = data.uf || '';
    document.getElementById('streetInp').readOnly = true;
    document.getElementById('neighInp').readOnly = true;
    document.getElementById('cityInp').readOnly = true;
    document.getElementById('stateInp').readOnly = true;
    document.getElementById('unlockAddrBtn').style.display = 'inline-block';
    document.getElementById('saveAddrBtn').style.display = 'inline-block';
    
    const numInput = document.getElementById('numInp');
    if (numInput) numInput.focus();
    toast('CEP encontrado!', 'ok');
    
  } catch (error) {
    toast('Erro de conexão ao buscar o CEP', 'err');
    document.getElementById('streetInp').value = '';
    console.error("Erro no ViaCEP:", error);
  }
}

//-------------------------------------------------------------
function unlockAddressFields() {
  const msg = "⚠️ ATENÇÃO:\n\nAlterar os dados do endereço manualmente não é aconselhável. Se a rua ou o bairro não baterem exatamente com o registro oficial do CEP nos Correios, a transportadora poderá recusar ou falhar na entrega do seu pacote.\n\nDeseja liberar a digitação mesmo assim?";
  
  if (confirm(msg)) {
    document.getElementById('streetInp').readOnly = false;
    document.getElementById('neighInp').readOnly = false;
    document.getElementById('cityInp').readOnly = false;
    document.getElementById('stateInp').readOnly = false;
    document.getElementById('unlockAddrBtn').style.display = 'none';
    document.getElementById('streetInp').focus();
    toast('Campos liberados para edição manual ✏️', 'info');
  }
}

//-------------------------------------------------------------
async function saveAddressToSupabase() {
  if (!userId) {
    toast('Faça login para salvar endereços.', 'err');
    return;
  }

  if (savedAddresses.filter(item => !item._legacy).length >= 5) {
    toast('Você já possui 5 endereços cadastrados.', 'err');
    return;
  }

  let address;
  try {
    address = collectAddressFromForm();
  } catch (error) {
    toast(error.message, 'err');
    return;
  }

  const button = document.getElementById('saveAddrBtn');
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ Salvando...';
  }

  try {
    const { data, error } = await supabaseClient
      .from('addresses')
      .insert({
        user_id: userId,
        type: address.type,
        recipient_name: address.recipient,
        street: address.street,
        number: address.number,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city,
        state: address.state,
        zip_code: address.cep,
        is_default: savedAddresses.filter(item => !item._legacy).length === 0
      })
      .select('id, type, recipient_name, street, number, complement, neighborhood, city, state, zip_code, is_default, created_at')
      .single();

    if (error) throw error;
    const saved = {
      id: data.id,
      type: data.type || 'Casa',
      recipient: data.recipient_name || '',
      cep: data.zip_code || '',
      street: data.street || '',
      number: data.number || '',
      complement: data.complement || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      is_default: Boolean(data.is_default),
      _legacy: false
    };
    savedAddresses = savedAddresses.filter(item => !item._legacy);
    savedAddresses.push(saved);
    selectedAddress = saved;
    selectedAddressId = String(saved.id);
    addressMode = 'saved';
    clearNewAddressForm();
    document.getElementById('newAddrForm')?.classList.remove('on');
    renderAddresses();
    toast('Endereço salvo e selecionado para esta compra!', 'ok');
  } catch (error) {
    console.error('Erro ao salvar endereço:', error);
    toast('Não foi possível salvar o endereço. Verifique a tabela addresses.', 'err');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '💾 Salvar na minha conta';
    }
  }
}

function clearNewAddressForm() {
  ['cepInp', 'streetInp', 'numInp', 'complementInp', 'neighInp', 'cityInp', 'stateInp'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  const recipient = document.getElementById('recipient');
  if (recipient && checkoutProfile?.full_name) recipient.value = checkoutProfile.full_name;
  ['streetInp', 'neighInp', 'cityInp', 'stateInp'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.readOnly = true;
  });
  const saveButton = document.getElementById('saveAddrBtn');
  const unlockButton = document.getElementById('unlockAddrBtn');
  if (saveButton) saveButton.style.display = 'none';
  if (unlockButton) unlockButton.style.display = 'none';
}

function renderAddresses() {
  const container = document.getElementById('savedAddressesList');
  if (!container) return;
  if (!savedAddresses.length) {
    container.innerHTML = '<div style="font-size:13px;color:var(--muted);text-align:center;padding:20px">Nenhum endereço salvo. Você pode informar um novo endereço abaixo.</div>';
    return;
  }

  container.innerHTML = savedAddresses.map(address => {
    const isSelected = addressMode === 'saved' && selectedAddress && String(address.id) === String(selectedAddress.id);
    const label = address.is_default ? '🏠 Endereço principal' : '📍 Endereço salvo';
    const sourceNote = address._legacy ? '<div style="font-size:10px;color:var(--muted);margin-top:4px">Endereço antigo do checkout</div>' : '';
    return `
      <div class="addr-opt ${isSelected ? 'on' : ''}" onclick="selAddr(this,'${escapeJs(address.id)}')">
        <div class="addr-label">${label}${isSelected ? ' — Selecionado' : ''}</div>
        <div class="addr-name">${escapeHtml(address.recipient || 'Destinatário')}</div>
        <div class="addr-street">${escapeHtml(address.street)}, ${escapeHtml(address.number)}${address.complement ? ' · ' + escapeHtml(address.complement) : ''}<br>${escapeHtml(address.neighborhood)} · ${escapeHtml(address.city)} / ${escapeHtml(address.state)} · CEP ${escapeHtml(address.cep)}</div>
        ${sourceNote}
      </div>`;
  }).join('');
}

// ── PAYMENT METHOD SELECTION ───────────────────────────
function selPayTab(tab, method) {
  if (!['pix', 'card'].includes(method)) return;
  document.querySelectorAll('.pay-tab').forEach(item => item.classList.remove('on'));
  document.querySelectorAll('.pay-panel').forEach(panel => panel.classList.remove('on'));
  if (tab) tab.classList.add('on');
  document.getElementById('pp-' + method)?.classList.add('on');
  payMethod = method;
  renderSummary();
  buildInstallOpts();
  updatePaymentButton();
}

function buildInstallOpts() {
  const container = document.getElementById('installOpts');
  if (!container) return;
  const total = calculateCheckoutTotals().total;
  const options = [1, 2, 3, 4, 5, 6];
  container.innerHTML = options.map(number => `
    <button type="button" class="inst-btn ${number === installSel ? 'on' : ''}" onclick="selInstall(this,${number})">
      <span class="inst-n">${number}×</span>
      <div class="inst-val">${fp(total / number)}</div>
      ${number === 1 ? '<span class="inst-badge">À vista</span>' : number <= 3 ? '<span class="inst-badge">Estimativa</span>' : ''}
    </button>`).join('');
}

function selInstall(button, number) {
  const value = Number(number);
  if (!Number.isInteger(value) || value < 1 || value > 6) return;
  installSel = value;
  document.querySelectorAll('.inst-btn').forEach(item => item.classList.remove('on'));
  if (button) button.classList.add('on');
  renderSummary();
}

function validatePayment() {
  if (!['pix', 'card'].includes(payMethod)) {
    toast('Escolha uma forma de pagamento.', 'err');
    return false;
  }
  if (payMethod === 'card' && (!Number.isInteger(installSel) || installSel < 1 || installSel > 6)) {
    toast('Selecione uma opção de parcelamento.', 'err');
    return false;
  }
  return true;
}

function updatePaymentButton() {
  const button = document.getElementById('payBtn');
  if (!button) return;
  const labels = {
    pix: 'Continuar para pagamento PIX',
    card: 'Continuar para pagamento com cartão',
  };
  button.innerHTML = `${labels[payMethod] || 'Continuar para pagamento'} <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>`;
}

function setCheckoutSessionValue(key, value) {
  try { sessionStorage.setItem(key, value); } catch (_) {}
}

function removeCheckoutSessionValue(key) {
  try { sessionStorage.removeItem(key); } catch (_) {}
}

function getCheckoutIdempotencyKey(payload) {
  const storageKey = 'ecomme_checkout_attempt';
  const fingerprint = JSON.stringify(payload);
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (previous?.fingerprint === fingerprint && previous?.key) return previous.key;
  } catch (_) {}
  const key = window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key })); } catch (_) {}
  return key;
}

function validateAsaasCheckoutUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (_) { throw new Error('O serviço retornou um link de pagamento inválido.'); }
  const allowedHosts = new Set(['asaas.com', 'www.asaas.com', 'sandbox.asaas.com']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase()) || url.pathname.replace(/\/$/, '') !== '/checkoutSession/show') {
    throw new Error('O serviço retornou um endereço de pagamento não autorizado.');
  }
  return url.toString();
}

function buildCheckoutRequest() {
  if (!cartItems.length) throw new Error('Seu carrinho está vazio.');
  if (!validateDeliveryStep()) throw new Error('Confira o endereço de entrega.');
  if (!validatePayment()) throw new Error('Confira a forma de pagamento.');
  const address = selectedAddress;
  const isDatabaseAddress = address && !address._legacy && !address._unsaved;
  return {
    version: 1,
    cart: cartItems.map(item => ({
      product_id: String(item.id),
      quantity: Math.max(1, Math.floor(Number(item.qty) || 1))
    })),
    address_id: isDatabaseAddress ? address.id : null,
    shipping_address: isDatabaseAddress ? null : {
      recipient_name: address.recipient,
      zip_code: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement || null,
      neighborhood: address.neighborhood || null,
      city: address.city,
      state: address.state
    },
    shipping_method: shippingMethod,
    coupon_code: couponCode || null,
    payment_method: payMethod,
    installments: payMethod === 'card' ? installSel : 1
  };
}

async function refreshCheckoutCartPrices() {
  if (!cartItems.length) throw new Error('Seu carrinho está vazio.');
  try {
    checkoutOwnedStoreIds = await loadCheckoutOwnedStoreIds();
    checkoutOwnershipVerified = true;
  } catch (ownershipError) {
    checkoutOwnershipVerified = false;
    console.error('Falha na validação de propriedade das lojas:', ownershipError);
    throw new Error('Não foi possível verificar se algum produto pertence à sua própria loja. Tente novamente.');
  }
  const productIds = cartItems.map(item => item.id);
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .in('id', productIds);
  if (error) throw new Error('Não foi possível atualizar os produtos. Tente novamente.');

  const latestProducts = new Map((data || []).map(product => [String(product.id), product]));
  const updatedItems = [];
  for (const oldItem of cartItems) {
    const fresh = latestProducts.get(String(oldItem.id));
    if (!fresh || isCheckoutProductUnavailable(fresh)) {
      throw new Error(`O produto “${oldItem.name || 'selecionado'}” não está mais disponível.`);
    }
    if (isCheckoutOwnStoreProduct(fresh)) {
      throw new Error(`O produto “${fresh.name || oldItem.name || 'selecionado'}” pertence à sua própria loja e não pode ser comprado.`);
    }
    const currentPrice = Number(fresh.price);
    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      throw new Error(`O preço do produto “${fresh.name || oldItem.name}” está inválido.`);
    }
    updatedItems.push({ ...fresh, id: String(fresh.id), qty: oldItem.qty });
  }
  cartItems = updatedItems;
  cart = cartItems;
  renderCart();
  renderSummary();
  buildInstallOpts();
}

// ── CREATE PAYMENT SESSION (FUTURE ASAAS EDGE FUNCTION) ──
async function placeOrder() {
  if (currentStep !== 3) return;
  const button = document.getElementById('payBtn');
  if (!button || button.disabled) return;

  let requestBody;
  try {
    requestBody = buildCheckoutRequest();
  } catch (error) {
    toast(error.message || 'Confira os dados do checkout.', 'err');
    return;
  }

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.classList.add('loading');
  button.textContent = 'Preparando pagamento...';

  try {
    await refreshCheckoutCartPrices();
    requestBody = buildCheckoutRequest();
    const idempotencyKey = getCheckoutIdempotencyKey(requestBody);

    const { data, error } = await supabaseClient.functions.invoke(CHECKOUT_PAYMENT_FUNCTION, {
      body: { action: 'create', idempotencyKey, checkout: requestBody }
    });
    if (error) throw error;
    if (!data || !data.orderId || !data.redirectUrl) {
      throw new Error('A resposta do serviço de pagamento está incompleta.');
    }

    const redirectUrl = validateAsaasCheckoutUrl(data.redirectUrl);
    checkoutOrder = {
      id: String(data.orderId),
      code: data.orderCode || String(data.orderId),
      status: String(data.status || 'pending').toLowerCase()
    };
    setCheckoutSessionValue('ecomme_checkout_order', JSON.stringify(checkoutOrder));
    window.location.assign(redirectUrl);
  } catch (error) {
    console.error('Erro ao preparar o pagamento:', error);
    const message = String(error?.message || '').toLowerCase();
    const statusCode = Number(error?.context?.status || error?.status || 0);
    if (statusCode === 404 || message.includes('not found') || message.includes('404') || message.includes('failed to send a request')) {
      toast('A integração de pagamento ainda não está configurada. Nenhum pedido foi confirmado.', 'err');
    } else {
      toast(error?.message || 'Não foi possível iniciar o pagamento. Tente novamente.', 'err');
    }
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
    button.innerHTML = originalHtml;
    updatePaymentButton();
  }
}

async function fetchCheckoutOrderStatus(orderId) {
  const { data, error } = await supabaseClient.functions.invoke(CHECKOUT_PAYMENT_FUNCTION, {
    body: { action: 'status', orderId: String(orderId) }
  });
  if (error) throw error;
  if (!data || !data.status) throw new Error('O servidor não retornou o status do pedido.');

  checkoutOrder = {
    id: String(orderId),
    code: data.orderCode || String(orderId),
    status: String(data.status).toLowerCase()
  };
  checkoutPaymentStatus = checkoutOrder.status;

  if (checkoutPaymentStatus === 'paid' || checkoutPaymentStatus === 'confirmed') {
    cartItems = [];
    cart = [];
    renderCart();
    renderSummary();
    await syncToSupabase();
    removeCheckoutSessionValue('ecomme_checkout_attempt');
    removeCheckoutSessionValue('ecomme_checkout_order');
  } else {
    setCheckoutSessionValue('ecomme_checkout_order', JSON.stringify(checkoutOrder));
  }

  currentStep = 1;
  furthestStep = 3;
  goStep(4, true);
  return checkoutOrder;
}

// O retorno do navegador nunca confirma um pagamento; o status vem do backend/webhook.
async function restoreCheckoutOrder() {
  let savedOrder = null;
  try { savedOrder = JSON.parse(sessionStorage.getItem('ecomme_checkout_order') || 'null'); } catch (_) {}
  if (!savedOrder?.id) return false;
  try {
    await fetchCheckoutOrderStatus(savedOrder.id);
    return true;
  } catch (error) {
    console.error('Erro ao restaurar o pedido:', error);
    toast('Não foi possível recuperar o status do pedido.', 'err');
    return false;
  }
}

async function handleAsaasPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('asaas_return') !== '1') return false;
  const orderId = params.get('order_id');
  if (!orderId || orderId.length > 128) {
    toast('Não foi possível identificar o pedido retornado pelo pagamento.', 'err');
    return true;
  }

  try {
    await fetchCheckoutOrderStatus(orderId);
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (error) {
    console.error('Erro ao consultar o status do pedido:', error);
    toast('Não foi possível consultar o status do pagamento. Atualize a página para tentar novamente.', 'err');
    return true;
  }
}

function startNewPaymentAttempt() {
  if (!['cancelled', 'canceled', 'expired', 'failed', 'refused'].includes(String(checkoutPaymentStatus || '').toLowerCase())) return;
  removeCheckoutSessionValue('ecomme_checkout_attempt');
  removeCheckoutSessionValue('ecomme_checkout_order');
  checkoutOrder = null;
  checkoutPaymentStatus = null;
  currentStep = 4;
  goStep(3, true);
}

async function refreshPaymentStatus() {
  const orderId = checkoutOrder?.id;
  const button = document.getElementById('refreshPaymentStatusBtn');
  if (!orderId) {
    toast('Não foi possível identificar o pedido.', 'err');
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = 'Consultando...';
  }
  try {
    await fetchCheckoutOrderStatus(orderId);
    if (checkoutPaymentStatus === 'paid' || checkoutPaymentStatus === 'confirmed') {
      toast('Pagamento confirmado!', 'ok');
    } else {
      toast('O pagamento ainda está aguardando confirmação.', 'info');
    }
  } catch (error) {
    console.error('Erro ao atualizar o status do pagamento:', error);
    toast('Não foi possível atualizar o status. Tente novamente.', 'err');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Consultar pagamento';
    }
  }
}

function showConfirm() {
  const status = String(checkoutPaymentStatus || checkoutOrder?.status || 'pending').toLowerCase();
  const paid = status === 'paid' || status === 'confirmed';
  const failed = ['cancelled', 'canceled', 'expired', 'failed', 'refused'].includes(status);
  const title = document.getElementById('confirmTitle');
  const subtitle = document.getElementById('confirmSub');
  const code = document.getElementById('orderCode');
  const timelineTitle = document.getElementById('orderTimelineTitle');
  const trackButton = document.getElementById('trackOrderBtn');
  const refreshButton = document.getElementById('refreshPaymentStatusBtn');
  const retryButton = document.getElementById('tryNewPaymentBtn');
  const confirmIcon = document.getElementById('confirmIcon');

  if (code) code.textContent = checkoutOrder?.code || '—';
  if (title) title.textContent = paid ? 'Pedido confirmado!' : failed ? 'Pagamento não concluído' : 'Aguardando confirmação do pagamento';
  if (subtitle) subtitle.textContent = paid
    ? 'Pagamento confirmado pelo servidor. O pedido foi liberado para as próximas etapas.'
    : failed
      ? 'O pagamento não foi concluído. Você pode iniciar uma nova tentativa de pagamento.'
      : 'O pedido foi registrado e aguarda a confirmação oficial do pagamento. O retorno do navegador, sozinho, não confirma a compra.';
  if (timelineTitle) timelineTitle.textContent = paid ? 'Próximas etapas' : 'Status do pagamento';
  if (confirmIcon) {
    confirmIcon.textContent = paid ? '🎉' : failed ? '⚠️' : '⌛';
    confirmIcon.classList.remove('is-paid', 'is-pending', 'is-failed');
    confirmIcon.classList.add(paid ? 'is-paid' : failed ? 'is-failed' : 'is-pending');
  }
  if (trackButton) trackButton.style.display = paid && checkoutOrder?.id ? 'inline-flex' : 'none';
  if (refreshButton) refreshButton.style.display = !paid && !failed && checkoutOrder?.id ? 'inline-flex' : 'none';
  if (retryButton) retryButton.style.display = failed ? 'inline-flex' : 'none';

  const steps = [...document.querySelectorAll('.otl-step')];
  const stepData = paid ? [
    ['done', '✓', 'Pagamento', 'Confirmado'],
    ['curr', '📦', 'Preparação', 'Aguardando loja'],
    ['', '🚚', 'Em trânsito', 'Após postagem'],
    ['', '🏠', 'Entregue', 'Após transporte']
  ] : [
    [failed ? '' : 'curr', failed ? '!' : '…', 'Pagamento', failed ? 'Não concluído' : 'Aguardando'],
    ['', '📦', 'Preparação', 'Após pagamento'],
    ['', '🚚', 'Em trânsito', 'Após postagem'],
    ['', '🏠', 'Entregue', 'Após transporte']
  ];
  steps.forEach((step, index) => {
    if (!step) return;
    if (!stepData[index]) return;
    const [className, dot, label, date] = stepData[index];
    step.className = `otl-step${className ? ` ${className}` : ''}`;
    const dotEl = step.querySelector('.otl-dot');
    const labelEl = step.querySelector('.otl-lbl');
    const dateEl = step.querySelector('.otl-date');
    if (dotEl) dotEl.textContent = dot;
    if (labelEl) labelEl.textContent = label;
    if (dateEl) dateEl.textContent = date;
  });
  if (paid) spawnConfetti();
}

function spawnConfetti(){
  const el=document.getElementById('confetti');
  const colors=['#2563eb','#16a34a','#f97316','#eab308','#7c3aed','#ec4899'];
  el.innerHTML=Array.from({length:16},(_,i)=>{
    const c=colors[i%colors.length];
    const tx=(Math.random()*160-80)+'px';
    const ty=(Math.random()*-120-40)+'px';
    const r=(Math.random()*360)+'deg';
    const delay=(Math.random()*.4)+'s';
    return `<div class="cf" style="background:${c};left:${50+Math.random()*20-10}%;top:50%;--tx:${tx};--ty:${ty};--r:${r};animation-delay:${delay}"></div>`;
  }).join('');
}

// ── HELPERS ─────────────────────────────────────────────
function fp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)
  ) {
    return 'R$ 0,00';
  }
  return ('R$ ' + number.toFixed(2).replace('.', ',')
  );
}


// ----------------------------------------
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function escapeJs(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

// ----------------------------------------
function getProductImages(product) {
  if (!product) {
    return [];
  }

  const images = [];
  if (
    typeof product.image_url === 'string' &&
    product.image_url.trim()
  ) {
    images.push(product.image_url.trim() );
  }

  if (
    Array.isArray(product.gallery_urls)
  ) {
    product.gallery_urls.forEach(url => {
        if (typeof url !== 'string') {
          return;
        }

        const cleanUrl = url.trim();
        if (!cleanUrl || images.includes(cleanUrl)) {
          return;
        }
        images.push(cleanUrl);
      }
    );
  }
  return images.slice(0, 5);
}

// ----------------------------------------
function getOptimizedImageUrl(sourceUrl, preset = 'grid') {
  if (!sourceUrl) {
    return '';
  }
  try {
    const workerUrl = new URL(EDGE_IMAGE_ZONE);
    workerUrl.searchParams.set('preset', preset);
    workerUrl.searchParams.set('src', sourceUrl);
    return workerUrl.toString();
  } catch (error) {
    console.error('Erro ao gerar URL otimizada:', error);
    return sourceUrl;
  }
}

// ------------------------------------

function maskDataPhone(input) {
  if (!input) return;
  let value = input.value.replace(/\D/g, '').slice(0, 11);
  if (value.length > 6) {
    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  } else if (value.length > 2) {
    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
  } else if (value.length > 0) {
    value = `(${value}`;
  }
  input.value = value;
}

// ---------------------------
function maskDataCPF(input) {
  if (!input) return;
  let value = input.value.replace(/\D/g, '').slice(0, 11);

  if (value.length > 9) {
    value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
  } else if (value.length > 6) {
    value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
  } else if (value.length > 3) {
    value = `${value.slice(0, 3)}.${value.slice(3)}`;
  }
  input.value = value;
}

// --------------------------
function isValidCPF(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  if (remainder !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === Number(cpf[10]);
}

// -------------------------------------------
function setDataInputError(input, hasError) {
  if (!input) return;
  input.style.borderColor = hasError ? '#EF4444' : '';
  input.style.boxShadow = hasError
    ? '0 0 0 3px rgba(239,68,68,.10)'
    : '';
}

// ------------------------------------
async function loadDataModalProfile() {
  const nameInput = document.getElementById('dataName');
  const surnameInput = document.getElementById('dataSurname');
  const emailInput = document.getElementById('dataEmail');
  const phoneInput = document.getElementById('dataPhone');
  const cpfInput = document.getElementById('dataCpf');
  const birthInput = document.getElementById('dataBirth');

  if (
    !nameInput ||
    !surnameInput ||
    !emailInput ||
    !phoneInput ||
    !cpfInput ||
    !birthInput
  ) {
    return false;
  }

  try {
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      toast('Sua sessão expirou. Faça login novamente.', 'err');
      return false;
    }

    userId = user.id;

    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from('profiles')
      .select('full_name, phone, cpf, birth_date')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        'Erro ao carregar dados do perfil para o modal:',
        profileError
      );

      toast('Não foi possível carregar seus dados.', 'err');
      return false;
    }

    const fullName = String(profile?.full_name || '').trim();

    const nameParts = fullName
      ? fullName.split(/\s+/)
      : [];

    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');

    nameInput.value = firstName;
    surnameInput.value = lastName;
    emailInput.value = user.email || '';

    phoneInput.value = profile?.phone || '';
    maskDataPhone(phoneInput);

    cpfInput.value = profile?.cpf || '';
    maskDataCPF(cpfInput);

    birthInput.value = profile?.birth_date || '';

    return true;

  } catch (error) {
    console.error(
      'Erro ao carregar dados para o Data Modal:',
      error
    );

    toast('Não foi possível carregar seus dados.', 'err');
    return false;
  }
}

// ------------------------------------

async function showDataModal() {
  let overlay = document.getElementById('dataOverlay');
  showToast('Revise os dados da sua conta', 'info');
  showLoadingModal('Carregando...', 'Renderizando Modal');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dataOverlay';
    overlay.className = 'data-overlay';
    overlay.innerHTML = `
      <div class="data-modal">
        <div class="data-head">
          <h3>
            Precisamos de mais alguns dados essenciais
          </h3>
          <p>
            Esses dados serão usados para verificar
            sua identidade e validar sua compra.
          </p>
        </div>

        <div class="data-grid">

          <div class="data-field">
            <label>
              Nome
              <span class="data-required">*</span>
            </label>

            <input
              id="dataName"
              class="data-input"
              type="text"
              maxlength="100"
              autocomplete="given-name"
              oninput="updateDataInputState(this, 3, 30)"
            >
          </div>

          <div class="data-field">
            <label>
              Sobrenome
              <span class="data-required">*</span>
            </label>

            <input
              id="dataSurname"
              class="data-input"
              type="text"
              maxlength="100"
              autocomplete="family-name"
              oninput="updateDataInputState(this, 3, 50)"
            >
          </div>

          <div class="data-field full">
            <label>
              E-mail
              <span class="data-required">*</span>
            </label>

            <input
              id="dataEmail"
              class="data-input"
              type="email"
              readonly
              tabindex="-1"
            >
          </div>

          <div class="data-field full">
            <label>
              Telefone / WhatsApp
              <span class="data-required">*</span>
            </label>

            <input
              id="dataPhone"
              class="data-input"
              type="tel"
              placeholder="(00) 00000-0000"
              maxlength="15"
              oninput="maskDataPhone(this); updateDataPhoneState(this)"
            >
          </div>

          <div class="data-field">
            <label>
              CPF
              <span class="data-required">*</span>
            </label>

            <input
              id="dataCpf"
              class="data-input"
              type="tel"
              placeholder="000.000.000-00"
              maxlength="14"
              oninput="maskDataCPF(this); updateDataCPFState(this)"
            >
          </div>

          <div class="data-field">
            <label>
              Data de nascimento
              <span class="data-required">*</span>
            </label>

            <input
              id="dataBirth"
              class="data-input"
              type="date"
              onchange="updateDataBirthState(this)"
            >
          </div>
        </div>

        <div
          id="dataErrorMessage"
          role="alert"
          aria-live="polite"
          style="
            display:none;
            margin-top:16px;
            padding:10px 12px;
            border-radius:12px;
            background:rgba(239,68,68,.08);
            color:#dc2626;
            font-size:12px;
            font-weight:600;
          "
        ></div>
        <div class="data-actions">

          <button
            type="button"
            class="data-btn data-cancel"
            onclick="buttonLink('/')"
          >
            Sair do checkout
          </button>

          <button
            type="button"
            id="dataContinue"
            class="data-btn data-continue"
            onclick="validateData()"
          >
            Continuar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const loaded = await loadDataModalProfile();
  hideLoadingModal();
  if (loaded) {
    overlay.classList.add('active');
    document.body.classList.add("nobodyscroll");
    validateData();
  } else {
    showToast('Erro ao carregar Modal', 'err');
  }
}

// --------------------------------------

async function validateData() {
  const nameInput = document.getElementById('dataName');
  const surnameInput = document.getElementById('dataSurname');
  const emailInput = document.getElementById('dataEmail');
  const phoneInput = document.getElementById('dataPhone');
  const cpfInput = document.getElementById('dataCpf');
  const birthInput = document.getElementById('dataBirth');

  const continueBtn = document.getElementById('dataContinue');
  const errorMessage = document.getElementById('dataErrorMessage');

  if (
    !nameInput ||
    !surnameInput ||
    !emailInput ||
    !phoneInput ||
    !cpfInput ||
    !birthInput
  ) {
    return false;
  }

  function clearErrors() {
    [
      nameInput,
      surnameInput,
      emailInput,
      phoneInput,
      cpfInput,
      birthInput
    ].forEach(input => {
      setDataInputError(input, false);
    });

    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.style.display = 'none';
    }
  }


  function showError(message, input = null) {
    if (input) {
      setDataInputError(input, true);
      input.focus();
    }

    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    } else {
      toast(message, 'err');
    }

    return false;
  }

  clearErrors();
  const firstName = nameInput.value.trim();
  const lastName = surnameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.replace(/\D/g, '');
  const cpf = cpfInput.value.replace(/\D/g, '');
  const birthDate = birthInput.value;

  if (firstName.length < 3) {
    return showError(
      'O nome deve ter pelo menos 3 caracteres.',
      nameInput
    );
  }

  if (firstName.length > 30) {
    return showError(
      'O nome deve ter no máximo 30 caracteres.',
      nameInput
    );
  }

  if (lastName.length < 3) {
    return showError(
      'O sobrenome deve ter pelo menos 3 caracteres.',
      surnameInput
    );
  }

  if (lastName.length > 50) {
    return showError(
      'O sobrenome deve ter no máximo 50 caracteres.',
      surnameInput
    );
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return showError(
      'O e-mail da sua conta não é válido.',
      emailInput
    );
  }

  if (
    phone.length !== 10 &&
    phone.length !== 11
  ) {
    return showError(
      'Digite um telefone válido com DDD.',
      phoneInput
    );
  }

  if (!isValidCPF(cpf)) {
    return showError(
      'Digite um CPF válido.',
      cpfInput
    );
  }

  if (!birthDate) {
    return showError(
      'Informe sua data de nascimento.',
      birthInput
    );
  }

  const parsedBirthDate = new Date(
    `${birthDate}T00:00:00`
  );

  if (
    Number.isNaN(parsedBirthDate.getTime())
  ) {
    return showError(
      'A data de nascimento informada é inválida.',
      birthInput
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedBirthDate > today) {
    return showError(
      'A data de nascimento não pode estar no futuro.',
      birthInput
    );
  }

  if (!userId) {
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      toast(
        'Sua sessão expirou. Faça login novamente.',
        'err'
      );

      return false;
    }

    userId = user.id;
  }

  const originalText = continueBtn
    ? continueBtn.innerHTML
    : 'Continuar';

  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.style.opacity = '0.7';
    continueBtn.innerHTML = 'Salvando...';
  }

  try {
    const fullName =
      `${firstName} ${lastName}`.trim();

    const profileUpdate = { full_name: fullName, phone, cpf, birth_date: birthDate };
    const { error } = await supabaseClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    checkoutProfile = { ...(checkoutProfile || {}), ...profileUpdate };
    const overlay = document.getElementById('dataOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.classList.remove("nobodyscroll");
    }

    toast('Dados atualizados com sucesso!', 'ok');
    const handledReturn = await handleAsaasPaymentReturn();
    if (!handledReturn) await restoreCheckoutOrder();
    return true;

  } catch (error) {
    console.error(
      'Erro ao atualizar os dados do Data Modal:',
      error
    );

    showError(
      'Não foi possível salvar seus dados agora. Tente novamente.'
    );

    return false;

  } finally {
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.style.opacity = '1';
      continueBtn.innerHTML = originalText || 'Continuar';
    }
  }
}

// --------------------------------------------------------
function updateDataInputState(input, minLength, maxLength) {
  if (!input) return;
  const length = input.value.trim().length;
  if (length >= minLength && length <= maxLength) {
    input.style.borderColor = '#10B981';
    input.style.boxShadow = '0 0 0 3px rgba(16,185,129,.10)';
  } else {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }
}

function updateDataPhoneState(input) {
  if (!input) return;
  const phone = input.value.replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) {
    input.style.borderColor = '#10B981';
    input.style.boxShadow = '0 0 0 3px rgba(16,185,129,.10)';
  } else {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }
}

function updateDataCPFState(input) {
  if (!input) return;
  const cpf = input.value.replace(/\D/g, '');
  if (cpf.length === 11 && isValidCPF(cpf)) {
    input.style.borderColor = '#10B981';
    input.style.boxShadow = '0 0 0 3px rgba(16,185,129,.10)';
  } else {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }
}

function updateDataBirthState(input) {
  if (!input) return;
  const value = input.value;
  if (!value) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    return;
  }
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (
    !Number.isNaN(date.getTime()) &&
    date <= today
  ) {
    input.style.borderColor = '#10B981';
    input.style.boxShadow = '0 0 0 3px rgba(16,185,129,.10)';
  } else {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }
}
