// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  await loadProductsFromSupabase();
  let shuffled = [...products];
  renderThumbs();
  renderRelated();
});

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

/* ─── RELATED PRODUCTS RENDER ─────────────────────────────── */
function starsHtml(r) {
  const rating = Math.max(0, Math.min(5, Number(r) || 0));
  const full = Math.floor(rating);
  let stars = '';

  for (let i = 0; i < full; i++) stars += '★';
  for (let i = full; i < 5; i++) stars += '☆';

  return stars;
}

function renderRelated() {
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;

  const relatedProducts = (Array.isArray(products) ? products : [])
    .filter(p => p && !isProductUnavailable(p));

  if (!relatedProducts.length) {
    grid.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted)">
        Nenhum produto recomendado disponível no momento.
      </p>
    `;
    return;
  }

  grid.innerHTML = relatedProducts.map(p => {
    const id = String(p.id);

    // A lista de desejos do Ecomme é "fav" e armazena objetos de produtos.
    const inW = Array.isArray(fav) &&
      fav.some(item => String(item.id) === id);

    // Usa as imagens reais cadastradas no produto.
    const images = getProductImages(p);
    const image = images[0] || null;
    const optimizedImage = image
      ? getOptimizedImageUrl(image, EDGE_IMAGE_PRESETS.grid)
      : null;

    const category = Array.isArray(p.cat)
      ? p.cat.join(', ')
      : String(p.cat || '');

    const badgeH = p.badge === 'hot'
      ? '<span class="bpill bhot">🔥 Hot</span>'
      : p.badge === 'new'
        ? '<span class="bpill bnew">Novo</span>'
        : Number(p.discount) > 0
          ? `<span class="bpill bsale">-${p.discount}%</span>`
          : '';

    const imageHtml = optimizedImage
      ? `<img
           class="product-image-reveal"
           src="${optimizedImage}"
           alt="${p.name}"
           loading="lazy"
           decoding="async"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;"
         >`
      : (p.emoji || '📦');

    const oldPrice = Number(p.old) > 0
      ? `<span class="pold">${window.ecommeFormatPrice(p.old)}</span>`
      : '';

    const discount = Number(p.discount) > 0
      ? `<span class="pdisc">-${p.discount}%</span>`
      : '';

    return `
      <div class="pcard" onclick="location.href='/product/${id}'">
        <div class="pimg-wrap">
          <div class="pimg" style="position:relative;">
            ${imageHtml}
          </div>

          <div class="pbadges">
            ${badgeH}
          </div>

          <button
            class="pwish-btn ${inW ? 'on' : ''}"
            onclick="event.stopPropagation();toggleFav('${id}')"
            aria-label="Adicionar aos favoritos"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <div class="pactions">
            <button
              class="btn-ac"
              onclick="event.stopPropagation();addToCart('${id}', 1)"
            >
              <svg viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Carrinho
            </button>
          </div>
        </div>

        <div class="pinfo">
          <div class="pcat">${category}</div>
          <div class="pname">${p.name || 'Produto sem nome'}</div>

          <div class="prating">
            <span class="pstars">${starsHtml(p.rating)}</span>
            <span class="prcnt">(${Number(p.reviews || 0).toLocaleString('pt-BR')})</span>
          </div>

          <div class="price-row">
            <span class="pprice">${window.ecommeFormatPrice(p.price)}</span>
            ${oldPrice}
            ${discount}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ─── SHARE ──────────────────────────────────────────────────────────── */
function shareToast() { showToast('Link copiado para a área de transferência! 🔗'); }
