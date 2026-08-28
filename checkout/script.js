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

/* ─── SUPABASE ──────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('authLoginBtn');
  const profileContainer = document.getElementById('headerProfileContainer');
  const headerImage = document.getElementById('headerAvatar');

  await loadProductsFromSupabase();
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  let shuffled = [...products];
  requestAnimationFrame(() => {setTimeout(() => { hideLoadingModal(); } ,180); });
  
  if (!user || userError) {
    console.warn("User session not active.");
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileContainer) profileContainer.classList.add('hidden');
    injectPrefetch('/login');
    renderCart();
    renderSummary();
    buildInstallOpts();
    buildQR();
    buildBarcode();
    startPixTimer();
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

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt = value => {const number = Number(value);
  if (!Number.isFinite(number)) {return 'R$ 0,00';}
  return ('R$ ' + number.toFixed(2).replace('.', ',')
  );
};

const $ = id  => document.getElementById(id);

function starsHtml(r) {
  let s = '';
  const f = Math.floor(r);
  for (let i = 0; i < f; i++)    s += '★';
  for (let i = f; i < 5; i++)    s += '☆';
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
      .update({
        cart:
          cartToSave
      })
      .eq(
        'id',
        userId
      );

  if (error) {
    console.error(
      'Erro ao sincronizar carrinho:',
      error
    );
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
  
  cartItems = hydrateCartItems(
      data?.cart
    );

  cart = cartItems;
  savedAddresses =
    Array.isArray(data?.addresses)
      ? data.addresses
      : [];

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
let shipping = 0;
let currentStep = 1;
let payMethod = '';
let installSel = 1;
let pixInterval;
let pixSeconds = 1799;

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

  document.getElementById('sumItems').innerHTML = cartItems.map(it => `
    <div class="sum-item">
      <div class="sum-item-em">${it.emoji}<div class="sum-item-qty">${it.qty}</div></div>
      <div style="flex:1;min-width:0"><div class="sum-item-name">${it.name}</div><div class="sum-item-cat">${it.cat}</div></div>
      <div class="sum-item-price">${fp(it.price*it.qty)}</div>
    </div>`).join('');
}

// ── STEP NAV ───────────────────────────────────────────
function goStep(n){
  const ids=['step1','step2','step3','step4'];
  const sids=['s1','s2','s3','s4'];
  ids.forEach((id,i)=>{ document.getElementById(id).style.display = i+1===n?'block':'none'; });
  sids.forEach((id,i)=>{
    const el=document.getElementById(id);
    el.className='step-item '+(i+1<n?'done':i+1===n?'active':'');
    el.querySelector('.step-dot').textContent = i+1<n?'✓':i+1;
  });
  currentStep=n;
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===4) showConfirm();
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
function selPayTab(tab, method){
  document.querySelectorAll('.pay-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.pay-panel').forEach(p=>p.classList.remove('on'));
  tab.classList.add('on');
  document.getElementById('pp-'+method).classList.add('on');
  payMethod = method;
  renderSummary();
}

// ── PIX ────────────────────────────────────────────────
function buildQR(){
  const p=[1,1,1,1,1,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1,0,1,0,1,1,0,0,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1];
  document.getElementById('qrGrid').innerHTML=p.map(b=>`<div class="qr-c ${b?'b':'w'}"></div>`).join('');
}

function startPixTimer(){
  pixInterval=setInterval(()=>{ if(pixSeconds<=0){clearInterval(pixInterval);document.getElementById('pixTimer').textContent='EXPIRADO';return;} pixSeconds--; const m=Math.floor(pixSeconds/60),s=pixSeconds%60; document.getElementById('pixTimer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); },1000);
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

// ------------------------------------------------------------------------------
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

// ── BOLETO ─────────────────────────────────────────────
function buildBarcode(){
  const stripes=document.getElementById('barcodeStripes');
  const widths=[1,2,1,3,1,2,2,1,3,1,1,2,3,1,2,1,3,2,1,1,2,3,1,2,1,2,3,1,1,2,3,1,2,2,1,3,2,1,1,2,1,3];
  stripes.innerHTML=widths.map((w,i)=>`<div class="bs" style="width:${w*3}px;background:${i%2===0?'#0f1a2e':'#fff'}"></div>`).join('');
}
function copyBoleto(){ navigator.clipboard?.writeText('1234.56789 01234.567890 12345.678901 1 00000001'); toast('Código do boleto copiado! 📄'); }

// ── PLACE ORDER ─────────────────────────────────────────
function placeOrder(){
  const btn=document.getElementById('payBtn');
  btn.classList.add('loading');
  btn.querySelector('svg').style.display='none';
  setTimeout(()=>{ btn.classList.remove('loading'); goStep(4); },2000);
}

// ── CONFIRMATION ────────────────────────────────────────
function showConfirm(){
  const code='DS-2025-'+String(Math.floor(Math.random()*9000)+1000);
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

// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
.loading-modal-container {
  position: fixed;
  inset: 0;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .3s ease, visibility .3s ease;
}

.loading-modal-container.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.loading-modal-content {
  background: rgba(255,255,255,.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  width: min(90%, 380px);
  padding: 30px 28px;
  border-radius: 36px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,.16);
  transform: scale(0.82);
  transition: transform .35s cubic-bezier(.22,1,.36,1);}
  
.loading-modal-container.active
.loading-modal-content {transform: scale(1);}

.loading-modal-spinner {
  width: 44px;
  height: 44px;
  margin: 0 auto 18px;
  border-radius: 50%;
  border: 4px solid rgba(37,99,235,.16);
  border-top-color: #2563EB;
  animation: loadingSpin .8s linear infinite;
}

.loading-modal-title {
  margin: 0;
  font-family: 'Sora', 'Poppins', sans-serif;
  color: #10161a;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.3;
}

.loading-modal-message {
  margin: 8px 0 0;
  color: #707c8a;
  font-size: 14px;
  line-height: 1.5;
}
@keyframes loadingSpin {to {transform:rotate(360deg);}}
@media (prefers-reduced-motion: reduce) {
  .loading-modal-content {transition: none;}
  .loading-modal-spinner {animation: none;}
  }
  `;
  document.head.appendChild(style);
}

// ── LOADING MODAL ──
function showLoadingModal(title, message) {
  injectModalStyles();
  
  let modal = document.getElementById('loadingModal');
  if (!modal) {modal = document.createElement('div');
    modal.id = 'loadingModal';
    modal.className = 'loading-modal-container';
    modal.innerHTML = `<div class="loading-modal-content">
        <div class="loading-modal-spinner" aria-hidden="true"></div>
        <h3 class="loading-modal-title" id="loadingModalTitle">
          ${title}
        </h3>
        <p class="loading-modal-message" id="loadingModalMessage">
          ${message}
        </p>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    document.getElementById('loadingModalTitle').textContent = title;
    document.getElementById('loadingModalMessage').textContent = message;}

  modal.offsetHeight;
  modal.classList.add('active');
  document.body.classList.add('nobodyscroll');
}

// ============================================================
function hideLoadingModal() {
  const modal = document.getElementById('loadingModal');
  if (!modal) {return;}
  modal.classList.remove('active');
  document.body.classList.remove('nobodyscroll');
}
