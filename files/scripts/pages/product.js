/* ECOMME — página dinâmica /product/:id */
let currentProduct = null;
let productPageQty = 1;
let productPageImages = [];

window.addEventListener('DOMContentLoaded', initProductPage, { once: true });

async function initProductPage() {
  const match = location.pathname.match(/^\/product\/([^/]+)\/?$/i);

  if (!match) {
    location.replace('/products');
    return;
  }

  let id;

  try {
    id = decodeURIComponent(match[1]);
  } catch {
    showProductError('Link inválido', 'O endereço do produto não é válido.');
    return;
  }

  try {
    if (typeof loadProductsFromSupabase !== 'function') {
      throw new Error('Função loadProductsFromSupabase não encontrada.');
    }

    const loaded = await loadProductsFromSupabase();

    if (loaded === false) {
      throw new Error('O Supabase não conseguiu carregar os produtos.');
    }

    const list = typeof products !== 'undefined' && Array.isArray(products)
      ? products
      : [];

    const raw = list.find(p => String(p.id) === String(id));

    if (!raw) {
      showProductError(
        'Produto não encontrado',
        'O produto foi removido ou o link está incorreto.'
      );
      return;
    }

    currentProduct = typeof normalizeProduct === 'function'
      ? normalizeProduct(raw)
      : raw;

    renderProductDetails(currentProduct);
    renderProductGallery(currentProduct);
    renderRelatedProducts(currentProduct.id);
    bindProductActions();
    updateProductFavoriteButtons();

    if (typeof updateCart === 'function') {
      updateCart();
    }
  } catch (error) {
    console.error('Erro ao carregar página do produto:', error);

    showProductError(
      'Não foi possível carregar o produto',
      'Verifique sua conexão e tente novamente.'
    );
  }
}

function showProductError(title, message) {
  document.title = `${title} | Ecomme`;

  const main = document.querySelector('.product-main');

  if (main) {
    main.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px">
        <h1>${safeHtml(title)}</h1>
        <p>${safeHtml(message)}</p>
        <a href="/products">Voltar aos produtos</a>
      </div>
    `;
  }

  document.getElementById('relatedGrid')?.replaceChildren();
}

function safeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function priceText(value) {
  const n = Number(value) || 0;

  return typeof window.ecommeFormatPrice === 'function'
    ? window.ecommeFormatPrice(n)
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(n);
}

function categoryText(p) {
  return Array.isArray(p.cat)
    ? p.cat.filter(Boolean).join(', ')
    : String(p.cat || '');
}

function starsText(value) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));

  return '★'.repeat(Math.floor(n)) +
    '☆'.repeat(5 - Math.floor(n));
}

function setText(selector, value) {
  const el = document.querySelector(selector);

  if (el) {
    el.textContent = String(value ?? '');
  }
}

/* ── DADOS DO PRODUTO ─────────────────────────────────────── */

function renderProductDetails(p) {
  const category = categoryText(p);
  const price = Number(p.price) || 0;
  const old = Number(p.old) || 0;
  const rating = Number(p.rating) || 0;
  const reviews = Number(p.reviews) || 0;

  let discount = Number(p.discount) || 0;

  if (!discount && old > price && old > 0) {
    discount = Math.round((1 - price / old) * 100);
  }

  setText('.info-cat', category || 'Produto');
  setText('.info-sku', `ID: ${p.id}`);
  setText('.info-name', p.name || 'Produto sem nome');
  setText('.stars-lg', starsText(rating));
  setText('.rating-val', rating.toFixed(1));

  setText(
    '.rating-link',
    `${reviews.toLocaleString('pt-BR')} avaliações`
  );

  setText('.info-price', priceText(price));
  setText('.info-old', old > price ? priceText(old) : '');
  setText('.info-disc-pill', discount > 0 ? `-${discount}%` : '');

  setText(
    '.info-desc-short',
    p.desc || 'Descrição não cadastrada para este produto.'
  );

  const sold = Number(p.sold_count || p.sold || 0);

  setText(
    '.sold-count',
    sold > 0
      ? `+${sold.toLocaleString('pt-BR')} vendidos`
      : ''
  );

  const oldEl = document.querySelector('.info-old');

  if (oldEl) {
    oldEl.style.display = old > price ? '' : 'none';
  }

  const discEl = document.querySelector('.info-disc-pill');

  if (discEl) {
    discEl.style.display = discount > 0 ? '' : 'none';
  }

  const soldEl = document.querySelector('.sold-count');

  if (soldEl && !sold) {
    soldEl.style.display = 'none';
  }

  const installment = document.querySelector('.info-installment');

  if (installment) {
    installment.innerHTML =
      `ou em <strong>10x de ${safeHtml(priceText(price / 10))}</strong>` +
      ` sem juros · via Pix <strong>5% de desconto</strong>`;
  }

  const crumb = document.querySelector('.breadcrumb .cur');

  if (crumb) {
    crumb.textContent = p.name || 'Produto';
  }

  const catCrumb = document.querySelector('.breadcrumb a[href*="cat="]');

  if (catCrumb && category) {
    catCrumb.textContent = category;
    catCrumb.href = `/products?cat=${encodeURIComponent(category)}`;
  }

  document.title = `${p.name || 'Produto'} | Ecomme`;

  /* Selos do produto */

  const badges = document.querySelector('.gallery-badges');

  if (badges) {
    badges.replaceChildren();

    if (p.badge === 'hot') {
      addBadge(badges, '🔥 Mais vendido', 'hot');
    } else if (p.badge === 'new') {
      addBadge(badges, 'Novo', 'hot');
    } else if (
      typeof isProductUnavailable === 'function' &&
      isProductUnavailable(p)
    ) {
      addBadge(badges, 'Indisponível', 'hot');
    }

    if (discount > 0) {
      addBadge(badges, `-${discount}% OFF`, 'disc');
    }
  }

  /* Descrição e características reais */

  const desc = document.querySelector('#tab-desc .desc-panel');

  if (desc) {
    desc.replaceChildren();

    const para = document.createElement('p');
    para.textContent =
      p.desc || 'Descrição não cadastrada para este produto.';

    desc.appendChild(para);

    if (Array.isArray(p.features) && p.features.length) {
      const grid = document.createElement('div');
      grid.className = 'desc-feats-grid';

      p.features.filter(Boolean).forEach(feature => {
        const item = document.createElement('div');
        item.className = 'desc-feat';

        const icon = document.createElement('div');
        icon.className = 'df-ico';
        icon.textContent = '✓';

        const text = document.createElement('div');
        text.className = 'df-text';
        text.textContent = feature;

        item.append(icon, text);
        grid.appendChild(item);
      });

      desc.appendChild(grid);
    }
  }

  /* Tabela de especificações */

  const specs = document.querySelector('#tab-specs .specs-table');

  if (specs) {
    specs.replaceChildren();

    const rows = [
      ['Produto', p.name || 'Produto sem nome'],
      ['Categoria', category || 'Não informada'],
      ['Preço', priceText(price)],
      [
        'Avaliação',
        `${rating.toFixed(1)} de 5 (${reviews.toLocaleString('pt-BR')} avaliações)`
      ]
    ];

    (Array.isArray(p.features) ? p.features : [])
      .filter(Boolean)
      .forEach((feature, i) => {
        rows.push([`Característica ${i + 1}`, feature]);
      });

    rows.forEach(([label, value]) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      const b = document.createElement('td');

      a.textContent = label;
      b.textContent = value;

      tr.append(a, b);
      specs.appendChild(tr);
    });
  }

  /* Resumo das avaliações */

  const reviewTab = document.querySelector(
    '.tabs-nav .tab-btn[data-tab="reviews"]'
  );

  if (reviewTab) {
    reviewTab.textContent =
      `Avaliações (${reviews.toLocaleString('pt-BR')})`;
  }

  setText('.rev-avg-num', rating.toFixed(1));
  setText('.rev-avg-stars', starsText(rating));

  setText(
    '.rev-avg-total',
    `baseado em ${reviews.toLocaleString('pt-BR')} avaliações`
  );

  const bars = document.querySelector('.rev-bars');

  if (bars) {
    bars.style.display = 'none';
  }

  const reviewList = document.querySelector('.rev-list');

  if (reviewList) {
    reviewList.replaceChildren();

    const msg = document.createElement('p');
    msg.className = 'rev-text';

    msg.textContent = reviews
      ? 'As avaliações individuais ainda não estão conectadas a esta página.'
      : 'Este produto ainda não possui avaliações.';

    reviewList.appendChild(msg);
  }

  /* Remove dados fixos que não pertencem necessariamente ao produto */

  const swatches = document.querySelector('.swatch-row');
  if (swatches) swatches.style.display = 'none';

  const stockNote = document.querySelector('.stock-note');
  if (stockNote) stockNote.style.display = 'none';

  const stockBar = document.querySelector('.stock-bar-wrap');
  if (stockBar) stockBar.style.display = 'none';
}

function addBadge(parent, text, style) {
  const badge = document.createElement('span');

  badge.className = `gbadge ${style}`;
  badge.textContent = text;

  parent.appendChild(badge);
}

/* ── GALERIA DO PRODUTO ───────────────────────────────────── */

function imageList(p) {
  if (typeof getProductImages === 'function') {
    return getProductImages(p).filter(Boolean);
  }

  return [
    p.image_url,
    ...(Array.isArray(p.gallery_urls) ? p.gallery_urls : [])
  ].filter(Boolean).slice(0, 5);
}

function optimizedImage(url, preset) {
  try {
    if (
      typeof getOptimizedImageUrl === 'function' &&
      typeof EDGE_IMAGE_PRESETS !== 'undefined'
    ) {
      return getOptimizedImageUrl(
        url,
        EDGE_IMAGE_PRESETS[preset] || preset
      );
    }
  } catch (error) {
    console.warn('Falha ao otimizar imagem:', error);
  }

  return url || '';
}

function renderProductGallery(p) {
  productPageImages = imageList(p);

  const gallery = document.getElementById('galleryMain');
  const emoji = document.getElementById('gmainEmoji');
  const thumbs = document.getElementById('galleryThumbs');

  if (!gallery || !emoji || !thumbs) return;

  let mainImage = document.getElementById('productMainImage');

  if (!mainImage) {
    mainImage = document.createElement('img');
    mainImage.id = 'productMainImage';

    mainImage.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;' +
      'object-fit:contain;box-sizing:border-box;padding:28px;' +
      'display:none;z-index:1;pointer-events:none;';

    emoji.insertAdjacentElement('beforebegin', mainImage);
  }

  emoji.textContent = p.emoji || '📦';
  emoji.style.position = 'relative';
  emoji.style.zIndex = '2';

  const favBtn = document.getElementById('galFav');
  if (favBtn) favBtn.style.zIndex = '3';

  const zoom = gallery.querySelector('.gallery-zoom-hint');
  if (zoom) zoom.style.zIndex = '3';

  thumbs.replaceChildren();
  thumbs.style.display = productPageImages.length ? 'flex' : 'none';

  productPageImages.forEach((url, i) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = `gthumb${i === 0 ? ' on' : ''}`;

    const img = document.createElement('img');
    img.src = optimizedImage(url, 'thumbnail');
    img.alt = `${p.name} — imagem ${i + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText =
      'width:100%;height:100%;object-fit:contain;border-radius:inherit;';

    button.appendChild(img);
    button.addEventListener('click', () => selectProductImage(i));
    thumbs.appendChild(button);
  });

  selectProductImage(0);
}

function selectProductImage(index) {
  const mainImage = document.getElementById('productMainImage');
  const emoji = document.getElementById('gmainEmoji');

  if (!mainImage || !emoji || !currentProduct) return;

  if (!productPageImages.length) {
    mainImage.style.display = 'none';
    emoji.style.display = 'block';
    return;
  }

  const original = productPageImages[index];

  mainImage.dataset.original = original;
  mainImage.dataset.fallback = '0';
  mainImage.alt = `${currentProduct.name} — imagem ${index + 1}`;

  mainImage.onerror = function () {
    if (this.dataset.fallback !== '1') {
      this.dataset.fallback = '1';
      this.src = this.dataset.original;
      return;
    }

    this.style.display = 'none';
    emoji.style.display = 'block';
  };

  mainImage.onload = () => {
    mainImage.style.display = 'block';
    emoji.style.display = 'none';
  };

  mainImage.src = optimizedImage(original, 'modal') || original;

  document.querySelectorAll('#galleryThumbs .gthumb')
    .forEach((button, i) => {
      button.classList.toggle('on', i === index);
    });
}

/* ── PRODUTOS RECOMENDADOS ────────────────────────────────── */

function renderRelatedProducts(currentId) {
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;

  const list = (
    typeof products !== 'undefined' && Array.isArray(products)
      ? products
      : []
  )
    .filter(p => String(p.id) !== String(currentId))
    .filter(p => !(
      typeof isProductUnavailable === 'function' &&
      isProductUnavailable(p)
    ))
    .slice(0, 8);

  if (!list.length) {
    grid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;padding:24px;">' +
      'Não há outros produtos disponíveis para recomendar.</p>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const id = safeHtml(p.id);
    const name = safeHtml(p.name || 'Produto sem nome');
    const img = imageList(p)[0];

    const picture = img
      ? `<img class="product-image-reveal"
           src="${safeHtml(optimizedImage(img, 'grid'))}"
           alt="${name}" loading="lazy" decoding="async"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
      : safeHtml(p.emoji || '📦');

    const inFav = typeof fav !== 'undefined' &&
      Array.isArray(fav) &&
      fav.some(x => String(x.id) === String(p.id));

    const badge = p.badge === 'hot'
      ? '<span class="bpill bhot">🔥 Hot</span>'
      : p.badge === 'new'
        ? '<span class="bpill bnew">Novo</span>'
        : Number(p.discount) > 0
          ? `<span class="bpill bsale">-${Number(p.discount)}%</span>`
          : '';

    const old = Number(p.old) > Number(p.price)
      ? `<span class="pold">${safeHtml(priceText(p.old))}</span>`
      : '';

    const disc = Number(p.discount) > 0
      ? `<span class="pdisc">-${Number(p.discount)}%</span>`
      : '';

    return `
      <div class="pcard" data-related-product="${id}">
        <div class="pimg-wrap">
          <div class="pimg" style="position:relative;">${picture}</div>
          <div class="pbadges">${badge}</div>

          <button type="button"
            class="pwish-btn ${inFav ? 'on' : ''}"
            data-related-fav="${id}" aria-label="Favoritar">
            <svg viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <div class="pactions">
            <button type="button" class="btn-ac"
              data-related-cart="${id}">Carrinho</button>
          </div>
        </div>

        <div class="pinfo">
          <div class="pcat">${safeHtml(categoryText(p))}</div>
          <div class="pname" data-no-translate>${name}</div>
          <div class="prating">
            <span class="pstars">${starsText(p.rating)}</span>
            <span class="prcnt">(${(Number(p.reviews) || 0).toLocaleString('pt-BR')})</span>
          </div>
          <div class="price-row">
            <span class="pprice">${safeHtml(priceText(p.price))}</span>
            ${old}${disc}
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-related-product]').forEach(card => {
    card.addEventListener('click', () => {
      location.href =
        `/product/${encodeURIComponent(card.dataset.relatedProduct)}`;
    });
  });

  grid.querySelectorAll('[data-related-fav]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();

      if (typeof toggleFav === 'function') {
        toggleFav(button.dataset.relatedFav);
      }

      setTimeout(updateProductFavoriteButtons, 0);
    });
  });

  grid.querySelectorAll('[data-related-cart]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();

      if (typeof addToCart === 'function') {
        addToCart(button.dataset.relatedCart, 1);
      }
    });
  });
}

/* ── BOTÕES ───────────────────────────────────────────────── */

function bindProductActions() {
  document.querySelectorAll('.qty-ctrl .qb').forEach((button, i) => {
    button.onclick = () => changeProductQty(i === 0 ? -1 : 1);
  });

  ['galFav', 'favLg'].forEach(id => {
    const button = document.getElementById(id);
    if (!button) return;

    button.onclick = event => {
      event.preventDefault();

      if (currentProduct && typeof toggleFav === 'function') {
        toggleFav(String(currentProduct.id));
      }

      setTimeout(updateProductFavoriteButtons, 0);
    };
  });
}

function changeProductQty(delta) {
  productPageQty = Math.max(1, productPageQty + Number(delta || 0));

  const el = document.getElementById('prodQty');

  if (el) el.textContent = String(productPageQty);
}

function updateProductFavoriteButtons() {
  if (!currentProduct) return;

  const id = String(currentProduct.id);

  const selected = typeof fav !== 'undefined' &&
    Array.isArray(fav) &&
    fav.some(x => String(x.id) === id);

  ['galFav', 'favLg'].forEach(buttonId => {
    document.getElementById(buttonId)?.classList.toggle('on', selected);
  });

  document.querySelectorAll('[data-related-fav]').forEach(button => {
    const isFav = typeof fav !== 'undefined' &&
      Array.isArray(fav) &&
      fav.some(x => String(x.id) === String(button.dataset.relatedFav));

    button.classList.toggle('on', isFav);
    button.title = isFav
      ? 'Remover dos favoritos'
      : 'Adicionar aos favoritos';
  });
}

function addToCartMain() {
  if (currentProduct && typeof addToCart === 'function') {
    addToCart(String(currentProduct.id), productPageQty);
  }
}

async function buyNow() {
  if (!currentProduct) return;

  if (typeof userId === 'undefined' || !userId) {
    if (typeof showAuth === 'function') {
      showAuth(
        'Entre na sua conta para continuar com a compra.',
        'Conta necessária',
        '🔒'
      );
    } else {
      location.href = '/login';
    }

    return;
  }

  if (
    typeof isProductUnavailable === 'function' &&
    isProductUnavailable(currentProduct)
  ) {
    if (typeof showToast === 'function') {
      showToast('Este produto está indisponível no momento.');
    }

    return;
  }

  addToCartMain();

  if (typeof syncToSupabase === 'function') {
    await syncToSupabase();
  }

  location.href = '/checkout';
}

function goToTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.toggle('on', button.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('on', panel.id === `tab-${tab}`);
  });

  document.querySelector('.tabs-section')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectSwatch(button, name) {
  document.querySelectorAll('.swatch')
    .forEach(item => item.classList.remove('on'));

  button.classList.add('on');

  const el = document.getElementById('swatchSelected');
  if (el) el.textContent = name;
}

async function shareToast() {
  try {
    await navigator.clipboard.writeText(location.href);

    if (typeof showToast === 'function') {
      showToast('Link do produto copiado! 🔗');
    }
  } catch {
    prompt('Copie o link deste produto:', location.href);
  }
}
