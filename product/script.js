/* ─── CURRENT PRODUCT ────────────────────────────────────────────────── */
const currentProduct = {
  id: 0, name: 'Smartwatch Pro X7', cat: 'Eletrônicos',
  price: 189.90, old: 299, discount: 36, emoji: '⌚'
};
const thumbEmojis = ['⌚', '⌛', '📿', '🔧'];

/* ─── RELATED PRODUCTS POOL ──────────────────────────────────────────── */
const products = [
  { id:1,  name:'Fone Bluetooth ANC Pro',       cat:'Eletrônicos', price:119.90, old:199, discount:39, emoji:'🎧', badge:'new',  rating:4.8, reviews:1523, shipping:true },
  { id:2,  name:'Câmera de Segurança WiFi',     cat:'Eletrônicos', price:149.90, old:220, discount:31, emoji:'📷', badge:'sale', rating:4.7, reviews:892,  shipping:false },
  { id:3,  name:'Kit Luzes LED Smart RGB',      cat:'Casa',        price:79.90,  old:130, discount:38, emoji:'💡', badge:'hot',  rating:4.6, reviews:3102, shipping:true },
  { id:5,  name:'Mini Massageador Portátil',    cat:'Fitness',     price:129.90, old:210, discount:38, emoji:'💆', badge:'sale', rating:4.9, reviews:2231, shipping:true },
  { id:6,  name:'Tênis Running Ultralight',     cat:'Moda',        price:199.90, old:320, discount:37, emoji:'👟', badge:'hot',  rating:4.7, reviews:1876, shipping:true },
  { id:11, name:'Garrafa Térmica 1L Inox',      cat:'Fitness',     price:69.90,  old:110, discount:36, emoji:'🍶', badge:'sale', rating:4.7, reviews:3876, shipping:true },
];

/* ─── STATE ──────────────────────────────────────────────────────────── */
let cart     = [];
let wishlist = [];
let prodQty  = 1;

const $   = id => document.getElementById(id);
const fmt = p => 'R$ ' + p.toFixed(2).replace('.', ',');

/* ─── GALLERY ────────────────────────────────────────────────────────── */
function renderThumbs() {
  $('galleryThumbs').innerHTML = thumbEmojis.map((e, i) => `
    <button class="gthumb ${i === 0 ? 'on' : ''}" onclick="selectThumb(this,'${e}')">${e}</button>
  `).join('');
}
function selectThumb(btn, emoji) {
  document.querySelectorAll('.gthumb').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  $('gmainEmoji').textContent = emoji;
}

/* ─── SWATCH ─────────────────────────────────────────────────────────── */
function selectSwatch(btn, name) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('on'));
  btn.classList.add('on');
  $('swatchSelected').textContent = name;
}

/* ─── TABS ───────────────────────────────────────────────────────────── */
function goToTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('on', p.id === 'tab-' + tab));
  document.querySelector('.tabs-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── QTY ────────────────────────────────────────────────────────────── */
function chgQty(d) {
  prodQty = Math.max(1, prodQty + d);
  $('prodQty').textContent = prodQty;
}

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCartGeneric(p, qty = 1) {
  const ex = cart.find(x => x.id === p.id);
  if (ex) ex.qty += qty; else cart.push({ ...p, qty });
  updateCart();
}

function addToCartMain() {
  addToCartGeneric(currentProduct, prodQty);
  showToast(`${currentProduct.name} adicionado ao carrinho! 🛒`);
}

function buyNow() {
  addToCartGeneric(currentProduct, prodQty);
  updateCart();
  openCart();
  showToast('Pronto! Finalize seu pedido no carrinho 🛍️');
}

function addRelated(id) {
  const p = products.find(x => x.id === id);
  addToCartGeneric(p, 1);
  showToast(`${p.name} adicionado ao carrinho! 🛒`);
}

function removeFromCart(id) { cart = cart.filter(x => x.id !== id); updateCart(); }
function changeCartQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (item) { item.qty += d; if (item.qty <= 0) removeFromCart(id); else updateCart(); }
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
      <button class="del" onclick="removeFromCart(${item.id})">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>`).join('');
}

function openCart()  { $('cartSidebar').classList.add('on'); $('cartOverlay').classList.add('on'); }
function closeCart() { $('cartSidebar').classList.remove('on'); $('cartOverlay').classList.remove('on'); }
function checkout() {
  if (!cart.length) { showToast('Adicione produtos primeiro! 😊'); return; }
  showToast('Redirecionando para o pagamento… 🔒');
  setTimeout(closeCart, 1200);
}

/* ─── WISHLIST ───────────────────────────────────────────────────────── */
function toggleWishlist(id) {
  const idx = wishlist.indexOf(id);
  if (idx === -1) { wishlist.push(id); showToast('Adicionado aos favoritos ❤️'); }
  else            { wishlist.splice(idx, 1); showToast('Removido dos favoritos'); }

  const badge = $('wishBadge');
  badge.textContent   = wishlist.length;
  badge.style.display = wishlist.length ? 'flex' : 'none';

  if (id === 0) {
    $('galFav').classList.toggle('on', wishlist.includes(0));
    $('favLg').classList.toggle('on', wishlist.includes(0));
  }
  renderRelated();
}
function alertWish() { alert(`Lista de favoritos: ${wishlist.length} produto(s)`); }

/* ─── RELATED PRODUCTS RENDER ────────────────────────────────────────── */
function starsHtml(r) {
  const f = Math.floor(r); let s = '';
  for (let i = 0; i < f; i++) s += '★';
  for (let i = f; i < 5; i++) s += '☆';
  return s;
}

function renderRelated() {
  const grid = $('relatedGrid');
  grid.innerHTML = products.map(p => {
    const inW    = wishlist.includes(p.id);
    const badgeH = p.badge === 'hot'  ? `<span class="bpill bhot">🔥 Hot</span>`
                 : p.badge === 'new'  ? `<span class="bpill bnew">Novo</span>`
                 :                      `<span class="bpill bsale">-${p.discount}%</span>`;
    return `
      <div class="pcard" onclick="location.href='/product/${p.id}'">
        <div class="pimg-wrap">
          <div class="pimg">${p.emoji}</div>
          <div class="pbadges">${badgeH}</div>
          <button class="pwish-btn ${inW ? 'on' : ''}" onclick="event.stopPropagation();toggleWishlist(${p.id})">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <div class="pactions">
            <button class="btn-ac" onclick="event.stopPropagation();addRelated(${p.id})">
              <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              Carrinho
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
        </div>
      </div>`;
  }).join('');
}

/* ─── SHARE ──────────────────────────────────────────────────────────── */
function shareToast() { showToast('Link copiado para a área de transferência! 🔗'); }

/* ─── TOAST ──────────────────────────────────────────────────────────── */
function showToast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('on');
  setTimeout(() => $('toast').classList.remove('on'), 2800);
}

/* ─── BACK TO TOP + STICKY BUY ───────────────────────────────────────── */
window.addEventListener('scroll', () => {
  $('btt').classList.toggle('on', window.scrollY > 300);
});

/* ─── ESC ────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

/* ─── INIT ───────────────────────────────────────────────────────────── */
renderThumbs();
renderRelated();
updateCart();
