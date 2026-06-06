const products = [
  { id:0, name:'Smartwatch Pro X7', cat:'Eletrônicos', price:189.90, old:299, discount:36, emoji:'⌚', badge:'hot', rating:4.9, reviews:2847, shipping:true, desc:'Smartwatch com monitor cardíaco, SpO2, GPS integrado e resistência à água. Bateria de 14 dias. Compatível com Android e iOS.', features:['Monitor cardíaco e SpO2','GPS integrado','Resistência 5ATM','Bateria 14 dias','Compatível Android/iOS'] },
  { id:1, name:'Fone Bluetooth ANC Pro', cat:'Eletrônicos', price:119.90, old:199, discount:39, emoji:'🎧', badge:'new', rating:4.8, reviews:1523, shipping:true, desc:'Fone de ouvido com cancelamento ativo de ruído, driver 40mm, autonomia de 30h e conexão multidevice.', features:['Cancelamento ativo de ruído','30 horas de autonomia','Driver 40mm premium','Conexão multidevice','Estojo de carregamento'] },
  { id:2, name:'Câmera de Segurança WiFi', cat:'Eletrônicos', price:149.90, old:220, discount:31, emoji:'📷', badge:'sale', rating:4.7, reviews:892, shipping:false, desc:'Câmera IP 2K com visão noturna colorida, detecção de movimento e armazenamento na nuvem.', features:['Resolução 2K Super HD','Visão noturna colorida','Detecção inteligente de movimento','Armazenamento em nuvem','Fácil instalação'] },
  { id:3, name:'Kit Luzes LED Smart RGB', cat:'Casa', price:79.90, old:130, discount:38, emoji:'💡', badge:'hot', rating:4.6, reviews:3102, shipping:true, desc:'Fita LED inteligente de 10m com app, controle por voz (Alexa/Google) e 16 milhões de cores.', features:['10 metros de comprimento','16 milhões de cores','Controle por voz','Compatível Alexa e Google','Instalação simples'] },
  { id:4, name:'Tapete Antiderrapante Premium', cat:'Casa', price:89.90, old:149, discount:39, emoji:'🏠', badge:'new', rating:4.5, reviews:445, shipping:true, desc:'Tapete ecológico antiderrapante com design escandinavo. Lavável à máquina, resistente e macio.', features:['Material ecológico','Base antiderrapante','Lavável à máquina','Design escandinavo','Alta durabilidade'] },
  { id:5, name:'Mini Massageador Portátil', cat:'Fitness', price:129.90, old:210, discount:38, emoji:'💆', badge:'sale', rating:4.9, reviews:2231, shipping:true, desc:'Pistola de massagem percussiva com 6 cabeças intercambiáveis, 30 níveis de intensidade e bateria de 5h.', features:['6 cabeças intercambiáveis','30 níveis de intensidade','Bateria de 5 horas','Motor silencioso','Estojo de transporte'] },
  { id:6, name:'Tênis Running Ultralight', cat:'Moda', price:199.90, old:320, discount:37, emoji:'👟', badge:'hot', rating:4.7, reviews:1876, shipping:true, desc:'Tênis de corrida ultra leve com sola de borracha, tecnologia de amortecimento e palmilha ortopédica removível.', features:['Cabedal em mesh respirável','Amortecimento por gel','Palmilha ortopédica','Solado antiderrapante','Disponível em 8 cores'] },
  { id:7, name:'Mochila Anti-Furto Executiva', cat:'Moda', price:159.90, old:250, discount:36, emoji:'🎒', badge:'new', rating:4.8, reviews:987, shipping:false, desc:'Mochila com compartimento USB, bolso anti-RFID, material impermeável e capacidade de 28L.', features:['Porta USB embutida','Proteção RFID','Impermeável','28 litros de capacidade','Compartimento para notebook'] },
  { id:8, name:'Secador de Cabelo Íon Pro', cat:'Beleza', price:149.90, old:249, discount:39, emoji:'💇', badge:'sale', rating:4.6, reviews:654, shipping:true, desc:'Secador 2200W com tecnologia iônica, diffusor incluso e 3 velocidades para cabelos mais lisos e brilhosos.', features:['2200W de potência','Tecnologia iônica','Diffusor incluso','3 velocidades','Cabo giratório 360°'] },
  { id:9, name:'Kit Skincare Vitamina C', cat:'Beleza', price:99.90, old:160, discount:37, emoji:'✨', badge:'hot', rating:4.9, reviews:4521, shipping:true, desc:'Kit completo com sérum, hidratante e protetor solar com vitamina C. Pele radiante em 30 dias.', features:['Sérum vitamina C 30ml','Hidratante FPS 30','Protetor solar facial','Dermatologicamente testado','Vegano e cruelty-free'] },
  { id:10, name:'Raçao Premium para Cães', cat:'Pets', price:89.90, old:140, discount:35, emoji:'🐕', badge:'new', rating:4.8, reviews:1234, shipping:true, desc:'Ração super premium com proteína animal real, sem corantes artificiais e enriquecida com ômega-3.', features:['Proteína animal real','Sem corantes artificiais','Ômega-3 adicionado','Sem transgênicos','Veterinário aprovado'] },
  { id:11, name:'Garrafa Térmica 1L Inox', cat:'Fitness', price:69.90, old:110, discount:36, emoji:'🍶', badge:'sale', rating:4.7, reviews:3876, shipping:true, desc:'Garrafa em aço inox 18/8 que mantém bebidas geladas por 24h e quentes por 12h. Tampa hermética.', features:['Aço inox 18/8 premium','Gelado 24h / Quente 12h','Tampa hermética','BPA Free','1 litro de capacidade'] },
];

let cart = [];
let wishlist = [];
let currentCategory = 'Todos';
let currentView = 'grid';
let currentProduct = null;
let modalQty = 1;

function formatPrice(p) { return 'R$ ' + p.toFixed(2).replace('.',','); }

function renderStars(r) {
  const full = Math.floor(r), half = r % 1 >= 0.5;
  let s = '';
  for(let i = 0; i < full; i++) s += '★';
  if(half) s += '½';
  while(s.replace('½','').length + (half?1:0) < 5) s += '☆';
  return s.replace('½','★');
}

function login(url) {
  window.location.href = url;
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;
  const minP = parseFloat(document.getElementById('minPrice').value) || 0;
  const maxP = parseFloat(document.getElementById('maxPrice').value) || Infinity;

  let filtered = products.filter(p => {
    const matchCat = currentCategory === 'Todos' || p.cat === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(search) || p.cat.toLowerCase().includes(search);
    const matchPrice = p.price >= minP && p.price <= maxP;
    return matchCat && matchSearch && matchPrice;
  });

  if(sort === 'price_asc') filtered.sort((a,b) => a.price - b.price);
  else if(sort === 'price_desc') filtered.sort((a,b) => b.price - a.price);
  else if(sort === 'rating') filtered.sort((a,b) => b.rating - a.rating);
  else if(sort === 'new') filtered.sort((a,b) => b.id - a.id);

  document.getElementById('productsCount').textContent = `Mostrando ${filtered.length} de ${products.length}`;

  if(!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:16px">🔍</div><p>Nenhum produto encontrado</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const inWish = wishlist.includes(p.id);
    const badgeHtml = p.badge === 'hot' ? '<span class="badge-pill badge-hot">🔥 Hot</span>' :
      p.badge === 'new' ? '<span class="badge-pill badge-new">Novo</span>' :
      `<span class="badge-pill badge-sale">-${p.discount}%</span>`;

    if(currentView === 'list') {
      return `<div class="product-card" onclick="openProduct(${p.id})">
        <div class="product-img-wrap">
          <div class="product-img">${p.emoji}</div>
          <div class="product-badges">${badgeHtml}</div>
        </div>
        <div class="product-info">
          <div class="product-category">${p.cat}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-rating">
            <span class="product-stars">${renderStars(p.rating)}</span>
            <span class="product-rating-count">${p.rating} (${p.reviews.toLocaleString('pt-BR')})</span>
          </div>
          <div>${p.desc.substring(0,120)}...</div>
          <div class="product-price-row" style="margin-top:8px">
            <span class="product-price">${formatPrice(p.price)}</span>
            <span class="product-old-price">${formatPrice(p.old)}</span>
          </div>
          <div class="product-actions">
            <button class="btn-cart" onclick="event.stopPropagation();addToCart(${p.id})">
              <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Adicionar
            </button>
          </div>
        </div>
      </div>`;
    }

    return `<div class="product-card" onclick="openProduct(${p.id})">
      <div class="product-img-wrap">
        <div class="product-img">${p.emoji}</div>
        <div class="product-badges">${badgeHtml}</div>
        <button class="product-wishlist ${inWish?'active':''}" onclick="event.stopPropagation();toggleWishlist(${p.id})">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="product-actions">
          <button class="btn-cart" onclick="event.stopPropagation();addToCart(${p.id})">
            <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Carrinho
          </button>
          <button class="btn-quick" onclick="event.stopPropagation();openProduct(${p.id})" title="Ver detalhes">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-category">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="product-stars">${renderStars(p.rating)}</span>
          <span class="product-rating-count">(${p.reviews.toLocaleString('pt-BR')})</span>
        </div>
        <div class="product-price-row">
          <span class="product-price">${formatPrice(p.price)}</span>
          <span class="product-old-price">${formatPrice(p.old)}</span>
          <span class="product-discount">-${p.discount}%</span>
        </div>
        ${p.shipping ? `<div class="product-shipping"><svg viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3m-4 8l2 2 4-4m1-4H9a2 2 0 0 0-2 2v6"/></svg> Frete Grátis</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function filterByCategory(cat) {
  currentCategory = cat;
  document.getElementById('productsTitle').textContent = cat === 'Todos' ? 'Todos os Produtos' : cat;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  event && event.target && event.target.classList.add('active');
  document.querySelectorAll('.cat-card').forEach(c => c.style.borderColor = '');
  document.getElementById('produtos').scrollIntoView({behavior:'smooth', block:'start'});
  renderProducts();
}

function filterProducts() { renderProducts(); }

function setView(v) {
  currentView = v;
  const grid = document.getElementById('productsGrid');
  grid.className = 'products-grid' + (v === 'list' ? ' list-view' : '');
  document.getElementById('gridViewBtn').classList.toggle('active', v === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', v === 'list');
  renderProducts();
}

function toggleTag(btn, tag) {
  document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setActive(el) {
  document.querySelectorAll('.nav-main a').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
}

// CART
function addToCart(id, qty = 1) {
  const p = products.find(x => x.id === id);
  const existing = cart.find(x => x.id === id);
  if(existing) existing.qty += qty;
  else cart.push({...p, qty});
  updateCart();
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCart();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if(item) {
    item.qty += delta;
    if(item.qty <= 0) removeFromCart(id);
    else updateCart();
  }
}

function updateCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartBadge').textContent = count;
  document.getElementById('cartCount').textContent = `(${count})`;
  document.getElementById('cartSubtotal').textContent = formatPrice(total);
  document.getElementById('cartTotal').textContent = formatPrice(total);

  const el = document.getElementById('cartItems');
  if(!cart.length) {
    el.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Seu carrinho está vazio</p></div>`;
    return;
  }
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="cart-item-delete" onclick="removeFromCart(${item.id})">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  `).join('');
  renderProducts();
}

function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

function checkout() {
  if(!cart.length) { showToast('Adicione produtos ao carrinho primeiro! 😊'); return; }
  showToast('Redirecionando para o pagamento... 🔒');
  setTimeout(closeCart, 1200);
}

// WISHLIST
function toggleWishlist(id) {
  const idx = wishlist.indexOf(id);
  if(idx === -1) { wishlist.push(id); showToast('Adicionado à lista de desejos ❤️'); }
  else { wishlist.splice(idx, 1); showToast('Removido da lista de desejos'); }
  const badge = document.getElementById('wishBadge');
  badge.textContent = wishlist.length;
  badge.style.display = wishlist.length ? 'flex' : 'none';
  renderProducts();
}

// MODAL
function openProduct(id) {
  const p = products.find(x => x.id === id);
  currentProduct = id;
  modalQty = 1;
  document.getElementById('modalQty').textContent = 1;
  document.getElementById('modalImg').style.fontSize = '120px';
  document.getElementById('modalImg').innerHTML = `<button class="modal-close" onclick="closeModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><span style="font-size:100px">${p.emoji}</span>`;
  document.getElementById('modalCategory').textContent = p.cat;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalDesc').textContent = p.desc;
  document.getElementById('modalPrice').textContent = formatPrice(p.price);
  document.getElementById('modalOld').textContent = formatPrice(p.old);
  document.getElementById('modalDisc').textContent = `-${p.discount}% OFF`;
  document.getElementById('modalFeatures').innerHTML = p.features.map(f => `<div class="modal-feature">${f}</div>`).join('');
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if(!e || e.target === document.getElementById('modalOverlay') || e.currentTarget === document.querySelector('.modal-close')) {
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  document.getElementById('modalQty').textContent = modalQty;
}

function addFromModal() {
  addToCart(currentProduct, modalQty);
  document.getElementById('modalOverlay').classList.remove('open');
  openCart();
}

// TOAST
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// NEWSLETTER
function handleSubscribe() {
  showToast('Inscrito! Você receberá descontos exclusivos 🎉');
}

// COUNTDOWN
function updateCountdown() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  const diff = end - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cdH').textContent = String(h).padStart(2,'0');
  document.getElementById('cdM').textContent = String(m).padStart(2,'0');
  document.getElementById('cdS').textContent = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

// BACK TO TOP
window.addEventListener('scroll', () => {
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
});

// KEYBOARD ESC
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') { closeModal(); closeCart(); }
});

// INIT
updateCart();
renderProducts();

function buttonLink(url) {
  window.location.href = url;
}

// PRELOADER
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  
  setTimeout(() => {
    preloader.classList.add('fade-out');
    document.body.classList.remove('loading');
    
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
    
  }, 600);
});
