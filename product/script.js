/* ─── CURRENT PRODUCT ────────────────────────────────────────────────── */
const currentProduct = {
  id: 0, name: 'Smartwatch Pro X7', cat: 'Eletrônicos',
  price: 189.90, old: 299, discount: 36, emoji: '⌚'
};
const thumbEmojis = ['⌚', '⌛', '📿', '🔧'];

/* ─── STATE ──────────────────────────────────────────────────────────── */
let prodQty  = 1;

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

/* ─── INIT ───────────────────────────────────────────────────────────── */
renderThumbs();
renderRelated();
updateCart();
