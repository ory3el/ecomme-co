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
