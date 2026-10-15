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

/* ─── INIT ───────────────────────────────────────────────────────────── */
renderThumbs();
renderRelated();
updateCart();
