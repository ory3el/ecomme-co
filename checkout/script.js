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

  await loadProductsFromSupabase();
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  let shuffled = [...products];
  //requestAnimationFrame(() => {setTimeout(() => { hideLoadingModal(); } ,180); });
  
  if (!user || userError) {
    console.warn("User session not active.");
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileContainer) profileContainer.classList.add('hidden');
    injectPrefetch('/login');
    renderCart();
    renderSummary();
    buildInstallOpts();
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

  if (!profileError && profile) {
    const fullName = profile.full_name || "Cliente";
    const email = user.email || "";

    //if ($('recipient')) $('recipient').textContent = fullName;
    if ($('accSidebarEmail')) $('accSidebarEmail').textContent = email;
    if (profile.avatar_url && $('accSidebarAvatar')) {
      $('accSidebarAvatar').src = profile.avatar_url;
    }
    const recipient = document.getElementById('recipient');
    if (recipient) recipient.value = fullName;
    
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const photoUrl = profile.avatar_url || "";

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;

    if (photoUrl) {
      const sidebarImage = document.getElementById('sidebarAvatar');
      
      if (sidebarImage) {
        sidebarImage.src = photoUrl;
        sidebarImage.style.filter = "none";
        sidebarImage.style.width = "100%";
        sidebarImage.style.height = "100%";
        sidebarImage.style.borderRadius = "100%";
        sidebarImage.style.objectFit = "cover";
      }
      if (headerImage) {
        headerImage.src = photoUrl;
        headerImage.style.filter = "none";
        headerImage.style.width = "100%";
        headerImage.style.height = "100%";
        headerImage.style.borderRadius = "100%";
        headerImage.style.objectFit = "cover";
      }
    }
  }
  // ── CHECKOUT DATA VERIFICATION ──────────
  const needsDataModal = checkoutNeedsDataModal(user, profile);

  // ── FINISHES LOADING ───────────────────────────
  requestAnimationFrame(() => {
    setTimeout(() => {
      hideLoadingModal();
      if (needsDataModal) {
        setTimeout(() => {
          showDataModal();
        }, 400);
      }
    }, 180);
  });
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
let cart = [];
let curId = null;
let mQtyVal = 1;
let pixSeconds = 1799;

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
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function toast(msg) {
  showToast(msg);
}

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeMore(); closeAcc(); }
});

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

  const {data, error} = await supabaseClient
    .from('profiles')
    .select('cart, fav, addresses')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(
      'Erro ao carregar dados do checkout:',
      error
    );
    return;
  }
  cartItems = hydrateCartItems(data?.cart);
  cart = cartItems;
  savedAddresses = Array.isArray(data?.addresses) ? data.addresses : [];
  renderCart();
  renderSummary();
  renderAddresses();
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

function hydrateCartItems(
  savedCart
) {
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
        console.warn(
          'Produto do carrinho não encontrado:',
          savedId
        );

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
let pixInterval;

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
function renderSummary() {
  const raw = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  const dis = raw * (Number(discount) || 0);
  const pixDis = payMethod === 'pix' ? (raw - dis) * 0.05 : 0;
  const total = raw - dis - pixDis + (Number(shipping) || 0);

  document.getElementById('sumCount').textContent = `(${cartItems.reduce((s,i)=>s+i.qty,0)} itens)`;
  document.getElementById('sumSub').textContent = fp(raw);
  document.getElementById('sumShip').textContent = shipping===0 ? '🎉 Grátis' : fp(shipping);
  document.getElementById('sumShip').style.color = shipping===0 ? 'var(--green)' : 'var(--text)';
  document.getElementById('sumTotal').textContent = fp(total);
  document.getElementById('boletoVal').textContent = fp(total);

  const dr = document.getElementById('discRow');
  if(dis>0){ dr.style.display='flex'; document.getElementById('discTag').textContent=couponCode; document.getElementById('sumDisc').textContent='-'+fp(dis); }
  else dr.style.display='none';

  const pr = document.getElementById('pixDiscRow');
  if(pixDis>0){ pr.style.display='flex'; document.getElementById('sumPixDisc').textContent='-'+fp(pixDis); }
  else pr.style.display='none';

  const note = document.getElementById('installNote');
  if(payMethod==='card' && installSel>1) note.textContent=`${installSel}× de ${fp(total/installSel)} sem juros`;
  else note.textContent='';
  
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
function goStep(n) {
  if (n < 1 || n > 4) return;
  if (currentStep === 4 && n !== 4) return;
  
  const isGoingBack = n <= furthestStep;
  const isGoingForward = n === currentStep + 1;
  if (!isGoingBack && !isGoingForward) return;
  if (n > furthestStep) furthestStep = n;

  currentStep = n;
  if (n === 3) {
    let payMethod = 'pix';

    buildQR();
    updatePaymentButton();
    buildBarcode();
    
    startPixTimer();
    
    const pixTab = document.querySelector(
      '.pay-tab[onclick*="\'pix\'"]'
    );
    if (pixTab) {
      selPayTab(pixTab, 'pix');
    }
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
  
// ── ADDRESS ────────────────────────────────────────────
function selAddr(el){ document.querySelectorAll('.addr-opt').forEach(a=>a.classList.remove('on')); el.classList.add('on'); }
function toggleNewAddr(){ const f=document.getElementById('newAddrForm'); f.classList.toggle('on'); }
function selShip(el,price){ document.querySelectorAll('.ship-opt').forEach(s=>s.classList.remove('on')); el.classList.add('on'); shipping=price; renderSummary(); }
function maskCEP(inp){ let v=inp.value.replace(/\D/g,'').slice(0,8); if(v.length>5) v=v.slice(0,5)+'-'+v.slice(5); inp.value=v; }

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
    toast('CEP encontrado! ✓');
    
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
    toast('Campos liberados para edição manual ✏️', 'inf');
  }
}

//-------------------------------------------------------------
async function saveAddressToSupabase() {
  if (!userId) {
    toast('Faça login para salvar endereços', 'err');
    return;
  }

  const cep = document.getElementById('cepInp').value;
  const street = document.getElementById('streetInp').value;
  const num = document.getElementById('numInp').value;
  const neigh = document.getElementById('neighInp').value;
  const city = document.getElementById('cityInp').value;
  const state = document.getElementById('stateInp').value;
  const recipientInputs = document.querySelectorAll('#newAddrForm .finput');
  const recipient = recipientInputs[recipientInputs.length - 1].value || 'Destinatário Padrão';

  if (!cep || !street || !num || !city) {
    toast('Preencha os campos obrigatórios (Número do local)', 'err');
    return;
  }
  
  const newAddress = {
    id: Date.now(),
    recipient: recipient,
    cep: cep,
    street: street,
    number: num,
    neighborhood: neigh,
    city: city,
    state: state
  };
  savedAddresses.push(newAddress);

  const btn = document.getElementById('saveAddrBtn');
  btn.textContent = '⏳ Salvando...';
  btn.style.opacity = '0.7';

  const { error } = await supabaseClient
    .from('profiles')
    .update({ addresses: savedAddresses })
    .eq('id', userId);

  if (error) {
    console.error("Erro ao salvar endereço:", error);
    toast('Erro ao salvar endereço', 'err');
    savedAddresses.pop();
    btn.textContent = '💾 Salvar na minha conta';
    btn.style.opacity = '1';
    return;
  }
  toast('Endereço salvo com sucesso! 📍', 'ok');
  
  document.getElementById('numInp').value = '';
  document.getElementById('cepInp').value = '';
  document.getElementById('streetInp').value = '';
  document.getElementById('neighInp').value = '';
  document.getElementById('cityInp').value = '';
  document.getElementById('stateInp').value = '';
  document.getElementById('saveAddrBtn').style.display = 'none';
  document.getElementById('unlockAddrBtn').style.display = 'none';

  toggleNewAddr();
  renderAddresses();
}

function renderAddresses() {
  const container = document.getElementById('savedAddressesList');
  
  if (!savedAddresses || savedAddresses.length === 0) {
    container.innerHTML = '<div style="font-size:13px; color:var(--muted); text-align:center; padding: 20px;">Nenhum endereço salvo.</div>';
    return;
  }

  container.innerHTML = savedAddresses.map((addr, index) => `
    <div class="addr-opt ${index === savedAddresses.length - 1 ? 'on' : ''}" onclick="selAddr(this)">
      <div class="addr-label">
        ${index === 0 ? '🏠 Casa' : '📍 Endereço Salvo'} 
        ${index === savedAddresses.length - 1 ? '— Selecionado' : ''}
      </div>
      <div class="addr-name">${addr.recipient}</div>
      <div class="addr-street">${addr.street}, ${addr.number}<br>${addr.neighborhood} · ${addr.state} · CEP ${addr.cep}</div>
    </div>
  `).join('');
}

// ── PAYMENT TABS ───────────────────────────────────────
function selPayTab(tab, method) {
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('on'));
  tab.classList.add('on');
  const panel = document.getElementById('pp-' + method);
  if (panel) {
    panel.classList.add('on');
  }
  payMethod = method;
  renderSummary();
  updatePaymentButton();
}

// ── PIX ────────────────────────────────────────────────
function buildQR(){
  const p=[1,1,1,1,1,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1,0,1,0,1,1,0,0,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1];
  document.getElementById('qrGrid').innerHTML=p.map(b=>`<div class="qr-c ${b?'b':'w'}"></div>`).join('');
}

let pixTimerDB = false;
function startPixTimer(){
  if (pixTimerDB) return;
  pixTimerDB = true;
  
  pixInterval=setInterval(()=>{ 
    if(pixSeconds<=0){
      clearInterval(pixInterval);
      document.getElementById('pixTimer').textContent='EXPIRADO';
      return;
    } 
    pixSeconds--; 
    const m=Math.floor(pixSeconds/60),s=pixSeconds%60; 
    document.getElementById('pixTimer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); 
  },1000);
}

function copyPIX(){
  navigator.clipboard?.writeText('00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000');
  const b=document.getElementById('copyPixBtn'); b.textContent='✓ Copiado!'; b.className='btn-copy copied';
  setTimeout(()=>{ b.textContent='📋 Copiar'; b.className='btn-copy'; },3000);
  toast('Chave PIX copiada! 📋');
}

// ── CARD ───────────────────────────────────────────────
let cardFlipped=false;
function flipCard(f){ cardFlipped=f; document.getElementById('card3d').classList.toggle('flipped',f); }
function toggleCardFlip(){ cardFlipped=!cardFlipped; document.getElementById('card3d').classList.toggle('flipped',cardFlipped); }

function onCardNum(inp){
  let v=inp.value.replace(/\D/g,'').slice(0,16);
  inp.value=v.replace(/(.{4})/g,'$1 ').trim();
  const disp=v.padEnd(16,'•').replace(/(.{4})/g,'$1 ').trim();
  document.getElementById('cardNumDisp').textContent=disp;
  document.getElementById('cardNumBack').textContent=disp;
  // brand detection
  const brands={visa:/(4)/,master:/^5[1-5]/,amex:/^3[47]/,elo:/^(65|63|50|40|43)/};
  let brand='VISA';
  for(const [name,re] of Object.entries(brands)) if(re.test(v)){brand=name.toUpperCase();break;}
  document.getElementById('cardBrandDisp').textContent=brand;
  document.querySelectorAll('.brand-ico').forEach(b=>b.classList.remove('on'));
  const bi=document.getElementById('bi-'+brand.toLowerCase());
  if(bi) bi.classList.add('on');
}
function onCardName(inp){ document.getElementById('cardNameDisp').textContent=inp.value.toUpperCase()||'SEU NOME'; }
function onCardExp(inp){ let v=inp.value.replace(/\D/g,'').slice(0,4); if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2); inp.value=v; document.getElementById('cardExpDisp').textContent=v||'MM/AA'; }
function onCvv(inp){ document.getElementById('cvvDisp').textContent=inp.value||'•••'; }

function validateCardPayment() {
  const cardNum = document.getElementById('cardNum');
  const cardName = document.getElementById('cardName');
  const cardExp = document.getElementById('cardExp');
  const cardCvv = document.getElementById('cardCvv');
  if (!cardNum || !cardName || !cardExp || !cardCvv) {
    return false;
  }
  
  const number = cardNum.value.replace(/\D/g, '');
  const name = cardName.value.trim();
  const exp = cardExp.value.trim();
  const cvv = cardCvv.value.replace(/\D/g, '');
  if (number.length < 13) {
    toast('Digite um número de cartão válido.', 'err');
    cardNum.focus();
    return false;
  }
  if (name.length < 3) {
    toast('Digite o nome do titular.', 'err');
    cardName.focus();
    return false;
  }
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
    toast('Digite uma validade válida no formato MM/AA.', 'err');
    cardExp.focus();
    return false;
  }
  const [month, year] = exp.split('/').map(Number);
  if (month < 1 || month > 12) {
    toast('A validade do cartão é inválida.', 'err');
    cardExp.focus();
    return false;
  }
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (
    year < currentYear ||
    (year === currentYear && month < currentMonth)
  ) {
    toast('Esse cartão está vencido.', 'err');
    cardExp.focus();
    return false;
  }
  if (cvv.length < 3) {
    toast('Digite o CVV do cartão.', 'err');
    cardCvv.focus();
    return false;
  }
  return true;
}

// -------------------------------------------
const sumTotal = document.getElementById('sumTotal').textContent;
function buildInstallOpts() {
  const total = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  const opts = [1, 2, 3, 4, 5, 6];
  const container = document.getElementById('installOpts');
  if (!container) {return;}

  container.innerHTML = opts.map(n => {
    const installment = total / n;
          return 
            `<div class="inst-btn ${n === 1 ? 'on' : ''}" onclick="selInstall(this,${n})">
              <span class="inst-n">${n}×</span>
              <div class="inst-val">${fp(installment)}</div>
              ${n === 1 ? `<span class="inst-badge">À vista</span>`: n <= 3 ? `<span class="inst-badge">Sem juros</span>` : ''}
            </div>`; }
    ) .join('');
}

function selInstall(btn,n){ document.querySelectorAll('.inst-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); installSel=n; renderSummary(); }

// -------------------------------------------
function validatePayment() {
  if (!payMethod) {
    toast('Escolha uma forma de pagamento.', 'err');
    return false;
  }
  
  switch (payMethod) {
    case 'pix': return true;
    case 'card': return validateCardPayment();
    case 'boleto': return true;
    default:
      toast('Forma de pagamento inválida.', 'err');
      return false;
  }
}

// -------------------------------------------
function updatePaymentButton() {
  const btn = document.getElementById('payBtn');
  if (!btn) return;
  const svg = btn.querySelector('svg');
  let text = 'Confirmar pedido';
  if (payMethod === 'pix') {
    text = 'Confirmar pedido com PIX';
  }

  if (payMethod === 'card') {
    text = 'Pagar com cartão';
  }

  if (payMethod === 'boleto') {
    text = 'Gerar boleto';
  }

  btn.innerHTML = `
    ${text}
    <svg viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12,5 19,12 12,19"/>
    </svg>
  `;
}

// ── BOLETO ─────────────────────────────────────────────
function buildBarcode(){
  const stripes=document.getElementById('barcodeStripes');
  const widths=[1,2,1,3,1,2,2,1,3,1,1,2,3,1,2,1,3,2,1,1,2,3,1,2,1,2,3,1,1,2,3,1,2,2,1,3,2,1,1,2,1,3];
  stripes.innerHTML=widths.map((w,i)=>`<div class="bs" style="width:${w*3}px;background:${i%2===0?'#0f1a2e':'#fff'}"></div>`).join('');
}
function copyBoleto(){ navigator.clipboard?.writeText('1234.56789 01234.567890 12345.678901 1 00000001'); toast('Código do boleto copiado! 📄'); }

// ── PLACE ORDER ─────────────────────────────────────────
async function placeOrder() {
  if (currentStep !== 3) {
    return;
  }
  
  if (!validatePayment()) {
    return;
  }
  
  const btn = document.getElementById('payBtn');
  if (!btn || btn.classList.contains('loading')) {
    return;
  }
  
  btn.classList.add('loading');
  btn.disabled = true;
  const svg = btn.querySelector('svg');
  if (svg) {
    svg.style.display = 'none';
  }
  const originalText = btn.childNodes[0];
  if (originalText) {
    originalText.textContent = ' Processando...';
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    goStep(4);
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    toast('Não foi possível processar o pagamento.', 'err');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (svg) {
      svg.style.display = '';
    }
  }
}

// ── CONFIRMATION ────────────────────────────────────────
function showConfirm(){
  const code='EC-'+String(Math.floor(Math.random()*9999))+'-'+String(Math.floor(Math.random()*9999));
  document.getElementById('orderCode').textContent=code;
  const today=new Date();
  const transit=new Date(today); transit.setDate(today.getDate()+3);
  const delivery=new Date(today); delivery.setDate(today.getDate()+(shipping===29.9?4:shipping===15.9?10:15));
  document.getElementById('otlTransit').textContent=transit.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  document.getElementById('otlDelivery').textContent=delivery.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  spawnConfetti();
  clearInterval(pixInterval);
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

function toast(msg,type='ok'){
  const t=document.getElementById('toast');
  const ic=document.getElementById('tIco');
  document.getElementById('tMsg').textContent=msg;
  ic.className='t-ico '+(type==='ok'?'ok':type==='inf'?'inf':'err-t');
  ic.textContent=type==='ok'?'✓':type==='inf'?'ℹ':'!';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}
window.addEventListener('keydown',e=>{ if(e.key==='Escape') flipCard(false); });

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
  showToast('Revise os dados de sua conta', type = 'info');

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
  if (loaded) {
    overlay.classList.add('active');
    document.body.classList.add("nobodyscroll");
    validateData();
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

    const { error } = await supabaseClient
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        cpf: cpf,
        birth_date: birthDate
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    const overlay = document.getElementById('dataOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.classList.remove("nobodyscroll");
    }

    toast('Dados atualizados com sucesso! ✓', 'ok');
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
