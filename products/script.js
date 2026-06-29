function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '../images/favicon-light.png';
  } else {
    favicon.href = '../images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

/* ─── DATA ─────────────────────────────────────────────────────────── */
const products = [
  { id:0,  name:'Smartwatch Pro X7',          cat:'Eletrônicos', price:189.90, old:299, discount:36, emoji:'⌚', badge:'hot',  rating:4.9, reviews:2847, shipping:true,  desc:'Smartwatch com monitor cardíaco, SpO2, GPS integrado e resistência à água. Bateria de 14 dias. Compatível com Android e iOS.',              features:['Monitor cardíaco e SpO2','GPS integrado','Resistência 5ATM','Bateria 14 dias','Compatível Android/iOS'] },
  { id:1,  name:'Fone Bluetooth ANC Pro',      cat:'Eletrônicos', price:119.90, old:199, discount:39, emoji:'🎧', badge:'new',  rating:4.8, reviews:1523, shipping:true,  desc:'Fone de ouvido com cancelamento ativo de ruído, driver 40mm, autonomia de 30h e conexão multidevice.',                                        features:['Cancelamento ativo de ruído','30h de autonomia','Driver 40mm premium','Conexão multidevice','Estojo de carregamento'] },
  { id:2,  name:'Câmera de Segurança WiFi',    cat:'Eletrônicos', price:149.90, old:220, discount:31, emoji:'📷', badge:'sale', rating:4.7, reviews:892,  shipping:false, desc:'Câmera IP 2K com visão noturna colorida, detecção de movimento e armazenamento na nuvem.',                                                       features:['Resolução 2K Super HD','Visão noturna colorida','Detecção inteligente','Armazenamento em nuvem','Fácil instalação'] },
  { id:3,  name:'Kit Luzes LED Smart RGB',     cat:'Casa',        price:79.90,  old:130, discount:38, emoji:'💡', badge:'hot',  rating:4.6, reviews:3102, shipping:true,  desc:'Fita LED inteligente de 10m com app, controle por voz (Alexa/Google) e 16 milhões de cores.',                                                    features:['10 metros de fita','16M de cores','Controle por voz','Compatível Alexa/Google','Instalação simples'] },
  { id:4,  name:'Tapete Antiderrapante Premium',cat:'Casa',       price:89.90,  old:149, discount:39, emoji:'🏠', badge:'new',  rating:4.5, reviews:445,  shipping:true,  desc:'Tapete ecológico antiderrapante com design escandinavo. Lavável à máquina, resistente e macio.',                                                   features:['Material ecológico','Base antiderrapante','Lavável à máquina','Design escandinavo','Alta durabilidade'] },
  { id:5,  name:'Mini Massageador Portátil',   cat:'Fitness',     price:129.90, old:210, discount:38, emoji:'💆', badge:'sale', rating:4.9, reviews:2231, shipping:true,  desc:'Pistola de massagem percussiva com 6 cabeças intercambiáveis, 30 níveis de intensidade e bateria de 5h.',                                          features:['6 cabeças intercambiáveis','30 níveis de intensidade','Bateria 5 horas','Motor silencioso','Estojo incluso'] },
  { id:6,  name:'Tênis Running Ultralight',    cat:'Moda',        price:199.90, old:320, discount:37, emoji:'👟', badge:'hot',  rating:4.7, reviews:1876, shipping:true,  desc:'Tênis de corrida ultra leve com sola de borracha, tecnologia de amortecimento e palmilha ortopédica removível.',                                  features:['Cabedal mesh respirável','Amortecimento por gel','Palmilha ortopédica','Solado antiderrapante','8 cores disponíveis'] },
  { id:7,  name:'Mochila Anti-Furto Executiva',cat:'Moda',        price:159.90, old:250, discount:36, emoji:'🎒', badge:'new',  rating:4.8, reviews:987,  shipping:false, desc:'Mochila com compartimento USB, bolso anti-RFID, material impermeável e capacidade de 28L.',                                                       features:['Porta USB embutida','Proteção RFID','Impermeável','28 litros','Compartimento para notebook'] },
  { id:8,  name:'Secador de Cabelo Íon Pro',   cat:'Beleza',      price:149.90, old:249, discount:39, emoji:'💇', badge:'sale', rating:4.6, reviews:654,  shipping:true,  desc:'Secador 2200W com tecnologia iônica, diffusor incluso e 3 velocidades para cabelos mais lisos e brilhosos.',                                       features:['2200W de potência','Tecnologia iônica','Diffusor incluso','3 velocidades','Cabo giratório 360°'] },
  { id:9,  name:'Kit Skincare Vitamina C',     cat:'Beleza',      price:99.90,  old:160, discount:37, emoji:'✨', badge:'hot',  rating:4.9, reviews:4521, shipping:true,  desc:'Kit completo com sérum, hidratante e protetor solar com vitamina C. Pele radiante em 30 dias.',                                                    features:['Sérum vitamina C 30ml','Hidratante FPS 30','Protetor solar facial','Dermatologicamente testado','Vegano e cruelty-free'] },
  { id:10, name:'Ração Premium para Cães',     cat:'Pets',        price:89.90,  old:140, discount:35, emoji:'🐕', badge:'new',  rating:4.8, reviews:1234, shipping:true,  desc:'Ração super premium com proteína animal real, sem corantes artificiais e enriquecida com ômega-3.',                                               features:['Proteína animal real','Sem corantes artificiais','Ômega-3 adicionado','Sem transgênicos','Veterinário aprovado'] },
  { id:11, name:'Garrafa Térmica 1L Inox',     cat:'Fitness',     price:69.90,  old:110, discount:36, emoji:'🍶', badge:'sale', rating:4.7, reviews:3876, shipping:true,  desc:'Garrafa em aço inox 18/8 que mantém bebidas geladas por 24h e quentes por 12h. Tampa hermética.',                                               features:['Aço inox 18/8','Gelado 24h / Quente 12h','Tampa hermética','BPA Free','1 litro de capacidade'] },
];

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart        = [];
let fav         = [];
let curId       = null;
let mQtyVal     = 1;
let view        = 'grid';
let shuffled    = [...products];

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt  = p => 'R$ ' + p.toFixed(2).replace('.', ',');
const $    = id  => document.getElementById(id);

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

/* ─── SEARCH ─────────────────────────────────────────────────────────── */
function searchFor(term) {
  if ($('heroSearch')) $('heroSearch').value = term;
  if ($('headerSearch')) $('headerSearch').value = term;
  renderProducts();
}

/* ─── SHUFFLE ────────────────────────────────────────────────────────── */
function shuffleAndRender() {
  shuffled = fishYates(products);
  $('sortSelect').value = 'random';
  renderProducts();
  showToast('Produtos embaralhados! 🔀');
}

/* ─── RENDER PRODUCTS ────────────────────────────────────────────────── */
function renderProducts() {
  const grid  = $('productsGrid');
  const q =
(
  $('heroSearch')?.value ||
  $('headerSearch')?.value ||
 '').toLowerCase().trim();
  
  const sort  = $('sortSelect').value;

  let list = [...shuffled];

  /* search filter */
  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q)  ||
      p.desc.toLowerCase().includes(q)
    );
  }

  /* sort */
  if      (sort === 'price_asc')  list.sort((a, b) => a.price    - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price    - a.price);
  else if (sort === 'rating')     list.sort((a, b) => b.rating   - a.rating);
  else if (sort === 'discount')   list.sort((a, b) => b.discount - a.discount);

  //$('productsCount').textContent = list.length;

  /* empty state */
  if (!list.length) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-ico">🔍</div>
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente outro termo ou
          <button class="btn-clear" onclick="$('searchInput').value='';renderProducts()">limpar a busca</button>
        </p>
      </div>`;
    return;
  }

  /* render cards */
  grid.innerHTML = list.map(p => {
    const inW = fav.some(x => x.id === p.id);
    const badgeH  = p.badge === 'hot'  ? `<span class="bpill bhot">🔥 Hot</span>`
                  : p.badge === 'new'  ? `<span class="bpill bnew">Novo</span>`
                  :                     `<span class="bpill bsale">-${p.discount}%</span>`;
    const shipH   = p.shipping
      ? `<div class="pfship">
           <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
           Frete Grátis
         </div>`
      : '';

    if (view === 'list') {
      return `
        <div class="pcard" onclick="openProduct(${p.id})">
          <div class="pimg-wrap">
            <div class="pimg">${p.emoji}</div>
            <div class="pbadges">${badgeH}</div>
          </div>
          <div class="pinfo">
            <div class="pcat">${p.cat}</div>
            <div class="pname">${p.name}</div>
            <div class="prating">
              <span class="pstars">${starsHtml(p.rating)}</span>
              <span class="prcnt">${p.rating} (${p.reviews.toLocaleString('pt-BR')} avaliações)</span>
            </div>
            <div style="color:var(--muted);font-size:13px;margin-bottom:12px;line-height:1.6">
              ${p.desc.substring(0, 130)}…
            </div>
            <div class="price-row">
              <span class="pprice">${fmt(p.price)}</span>
              <span class="pold">${fmt(p.old)}</span>
              <span class="pdisc">-${p.discount}%</span>
            </div>
            ${shipH}
            <div class="pactions">
              <button class="btn-ac" onclick="event.stopPropagation();addToCart(${p.id})">
                <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="pcard" onclick="openProduct(${p.id})">
        <div class="pimg-wrap">
          <div class="pimg">${p.emoji}</div>
          <div class="pbadges">${badgeH}</div>
          <button class="pwish-btn ${inW ? 'on' : ''}"
                  onclick="event.stopPropagation();toggleFav(${p.id}); renderProducts();"
                  title="${inW ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <div class="pactions">
            <button class="btn-ac" onclick="event.stopPropagation();addToCart(${p.id})">
              <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Carrinho
            </button>
            <button class="btn-qv" onclick="event.stopPropagation();openProduct(${p.id})" title="Ver detalhes">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
        <div class="pinfo">
          <div class="pcat">${p.cat}</div>
          <div class="pname">${p.name}</div>
          <div class="prating">
            <span class="pstars">${starsHtml(p.rating)}</span>
            <span class="prcnt">(${p.reviews.toLocaleString('pt-BR')})</span>
          </div>
          <div class="price-row">
            <span class="pprice">${fmt(p.price)}</span>
            <span class="pold">${fmt(p.old)}</span>
            <span class="pdisc">-${p.discount}%</span>
          </div>
          ${shipH}
        </div>
      </div>`;
  }).join('');
}

function setView(v) {
  view = v;
  $('productsGrid').className = 'products-grid' + (v === 'list' ? ' lv' : '');
  $('gridBtn').classList.toggle('on', v === 'grid');
  $('listBtn').classList.toggle('on', v === 'list');
  renderProducts();
}

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCart(id, qty = 1) {
  const p  = products.find(x => x.id === id);
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty += qty; else cart.push({ ...p, qty });
  updateCart();
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCart();
}

function changeCartQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (item) {
    item.qty += d;
    if (item.qty <= 0) removeFromCart(id); else updateCart();
  }
}

function updateCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $('cartBadge').textContent = count;
  $('cartCount').textContent = `(${count})`;
  $('cartSub').textContent   = fmt(total);
  $('cartTotal').textContent = fmt(total);

  const el = $('cartItems');
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty-st"><span>🛒</span><p>Seu carrinho está vazio</p></div>`;
    return;
  }
  el.innerHTML = cart.map(item => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <div class="ci-qty">
          <button class="qb" onclick="changeCartQty(${item.id},-1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="changeCartQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="del" onclick="removeFromCart(${item.id})" title="Remover do Carrinho">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
      <button class="cart-item-towish" onclick="moveFromCartToFav(${item.id})" title="Adicionar à Lista de Desejos">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>`).join('');
  renderProducts();
}

function openCart()  { $('cartSidebar').classList.add('on'); $('cartOverlay').classList.add('on'); document.body.classList.add("noscroll"); }
function closeCart() { $('cartSidebar').classList.remove('on'); $('cartOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }

/* ─── FAV ───────────────────────────────────────────────────────── */
function toggleFav(id) {
  const ex = fav.find(x => x.id === id);
  if (ex) {
    removeFromFav(id);
    showToast('Removido da Lista de Desejos! 💔');
  } else {
    addToFav(id, 1);
  }
  
  if ($('mWish')) {
    $('mWish').classList.toggle('on', fav.some(x => x.id === id));
  }
}

function addToFav(id, qty = 1) {
  const p  = products.find(x => x.id === id);
  const ex = fav.find(x => x.id === id);
  if (ex) ex.qty += qty; else fav.push({ ...p, qty });
  updateFav();
  showToast(`${p.name} salvo nos favoritos! 🛒`);
}

function removeFromFav(id) {
  fav = fav.filter(x => x.id !== id);
  updateFav();
}

function changeFavQty(id, d) {
  const item = fav.find(x => x.id === id);
  if (item) {
    item.qty += d;
    if (item.qty <= 0) removeFromFav(id); else updateFav();
  }
}

function updateFav() {
  const total = fav.reduce((s, i) => s + i.price * i.qty, 0);
  const count = fav.reduce((s, i) => s + i.qty, 0);
  $('wishBadge').textContent = count;
  $('wishBadge').style.display = count > 0 ? 'flex' : 'none';
  $('favCount').textContent = `(${count})`;
  $('favTotal').textContent = fmt(total);

  const el = $('favItems');
  if (!fav.length) {
    el.innerHTML = `<div class="fav-empty-st"><span>🛒</span><p>Nenhum produto salvo no momento</p></div>`;
    return;
  }
 el.innerHTML = fav.map(item => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        
        <button class="btn-madd" onclick="addToCart(${item.id}, 1); removeFromFav(${item.id}); showToast('Adicionado ao carrinho! 🛒'); closeFav(); openCart(); renderProducts();">
          <svg style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Adicionar ao Carrinho
        </button>
        
      </div>
      <button class="del" onclick="removeFromFav(${item.id}); renderProducts();">
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>`).join('');
  renderProducts();
}
  
function openFav()  { $('favSidebar').classList.add('on'); $('favOverlay').classList.add('on'); document.body.classList.add("noscroll"); }
function closeFav() { $('favSidebar').classList.remove('on'); $('favOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }

function addAllFavToCart() {
  if (!fav.length) { showToast('Adicione produtos primeiro! 😊'); return; }
  
  fav.forEach(produto => {
    addToCart(produto.id, 1);
  });
  fav = []; 
  updateFav(); 
  renderProducts();
  // saveFav(); 
  closeFav();
  openCart();
  showToast('Todos os itens foram para o carrinho! 🛒');
}

function moveFromCartToFav(id) {
  addToFav(id, 1);
  showToast('Produto adicionado à Lista de Desejos! ❤️');
}

function checkout() {
  if (!cart.length) { showToast('Adicione produtos primeiro! 😊'); return; }
  showToast('Redirecionando para o pagamento… 🔒');
  window.location.href = "/checkout"
  setTimeout(closeCart, 1200);
}

/* ─── MORE ───────────────────────────────────────────────────────── */
function openMore()  { $('moreSidebar').classList.add('on'); $('moreOverlay').classList.add('on'); document.body.classList.add("noscroll"); }
function closeMore() { $('moreSidebar').classList.remove('on'); $('moreOverlay').classList.remove('on'); document.body.classList.remove("noscroll"); }

function checkout2() {
  showToast('Redirecionando para a página de checkout... 🔒');
  window.location.href = "/checkout"
  setTimeout(closeCart, 1200);
}

/* ─── MODAL ──────────────────────────────────────────────────────────── */
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

/* ─── TOAST ──────────────────────────────────────────────────────────── */
function showToast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('on');
  setTimeout(() => $('toast').classList.remove('on'), 2800);
}

/* ─── BACK TO TOP ────────────────────────────────────────────────────── */
window.addEventListener('scroll', () =>
  $('btt').classList.toggle('on', window.scrollY > 300)
);

/* ─── ESC ────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); closeFav();}
});

/* ─── INIT ───────────────────────────────────────────────────────────── */
shuffled = fishYates(products);
updateCart();
renderProducts();
