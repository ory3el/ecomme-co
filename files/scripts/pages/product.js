/* ECOMME — página dinâmica /product/:id */
let currentProduct = null;
let productPageQty = 1;
let productPageImages = [];
let productGallerySelectedIndex = 0;
let productGallerySlideOutgoingImage = null;
let productGallerySlideMainImage = null;
let productGallerySlideEndHandler = null;
let productGallerySlideCleanupTimer = null;
let productMobileImageViewerImageCache = new Map();
let productGalleryImageLoadCache = new Map();

const PRODUCT_REVIEW_PAGE_SIZE = 20;
const productReviewSearchState = {
  productId: null,
  term: '',
  requestId: 0,
  offset: 0,
  total: 0,
  hasMore: false,
  loading: false,
  debounceTimer: null,
  ownReviewId: null
};

function setProductPageLoading(isLoading) {
  ['.product-main', '.tabs-section'].forEach(selector => {
    const element = document.querySelector(selector);
    if (!element) return;

    element.classList.toggle('is-loading', isLoading);
    element.setAttribute('aria-busy', String(isLoading));
  });
}

function waitForMainProductImage(timeout = 2200) {
  const image = document.getElementById('productMainImage');

  if (!image || !productPageImages.length || image.complete) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let timer;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    timer = setTimeout(finish, timeout);

    // A imagem pode ter sido carregada do cache entre a verificação e os listeners.
    if (image.complete) finish();
  });
}

window.addEventListener('DOMContentLoaded', initProductPage, { once: true });

async function initProductPage() {
  ensureProductReviewSearchUI();
  setProductPageLoading(true);

  const match = location.pathname.match(/^\/product\/([^/]+)\/?$/i);

  if (!match) {
    window.location.replace('/products/');
    return;
  }

  let id;

  try {
    id = decodeURIComponent(match[1]);
  } catch {
    showProductError('Link inválido', 'O endereço do produto não é válido.');
    setProductPageLoading(false);
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

    // As listas múltiplas usam wishlist_items, não apenas profiles.fav.
    // Aguarda essa fonte para que o estado inicial dos corações seja correto.
    if (window.EcommeWishlists && typeof window.EcommeWishlists.refresh === 'function') {
      try {
        await window.EcommeWishlists.refresh();
      } catch (wishlistError) {
        console.warn('Não foi possível sincronizar as listas de desejos:', wishlistError);
      }
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

    // Confirma a propriedade antes de exibir ações de compra.
    await updateOwnProductControls(currentProduct);
    renderProductDetails(currentProduct);
    initProductComparator();
    loadProductStoreDetails(currentProduct).catch(error => {
      console.warn('Não foi possível carregar os dados da loja deste produto:', error);
    });
    // Carrega as avaliações reais sem bloquear a renderização do produto.
    loadProductReviews(currentProduct).catch(error => {
      console.error('Não foi possível carregar as avaliações deste produto:', error);
    });
    renderProductGallery(currentProduct);
    renderRelatedProducts(currentProduct.id);
    bindProductActions();
    updateProductFavoriteButtons();

    if (typeof updateCart === 'function') {
      updateCart();
    }

    // Mantém o skeleton até a imagem principal carregar (com limite para não travar).
    await waitForMainProductImage();
  } catch (error) {
    console.error('Erro ao carregar página do produto:', error);

    showProductError(
      'Não foi possível carregar o produto',
      'Verifique sua conexão e tente novamente.'
    );
  } finally {
    setProductPageLoading(false);
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

  document.querySelector('.tabs-section')?.setAttribute('hidden', '');
  document.querySelector('.related-section')?.setAttribute('hidden', '');
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


/* ── LOJA RESPONSÁVEL PELO PRODUTO ─────────────────────────── */
const PRODUCT_STORE_SOURCES = ['lojas_public', 'lojas'];
const PRODUCT_STORE_COLUMN_SETS = [
  'id, nome_loja, slug_url, logo_url, status',
  'id, nome_loja, slug_url, logo_url',
  'id, nome_loja, slug_url'
];

function isProductStoreMissingColumn(error) {
  return !!error && (error.code === '42703' || /column .* does not exist|could not find the .* column/i.test(error.message || ''));
}

function isProductStoreMissingRelation(error) {
  return !!error && (['42P01', 'PGRST205'].includes(error.code) || /relation .* does not exist|could not find the table/i.test(error.message || ''));
}

function safeProductStoreImage(value) {
  const url = String(value || '').trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp);base64,)/i.test(url) ? url : '';
}

function renderProductStore(store) {
  const link = document.getElementById('productStoreLink');
  const nameElement = document.getElementById('productStoreName');
  const logoElement = document.getElementById('productStoreLogo');
  if (!link || !nameElement || !logoElement || !store) return;

  const name = String(store.nome_loja || 'Loja').trim();
  const slug = String(store.slug_url || '').trim();
  const status = String(store.status || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || (status && !['ativa', 'active'].includes(status))) return;

  link.href = `/store/@${encodeURIComponent(slug)}`;
  link.setAttribute('aria-label', `Visitar a loja ${name}`);
  nameElement.textContent = name;
  logoElement.replaceChildren();

  const showInitial = () => {
    const initial = document.createElement('span');
    initial.className = 'product-store-initial';
    initial.textContent = (name.charAt(0) || 'L').toLocaleUpperCase('pt-BR');
    logoElement.replaceChildren(initial);
  };

  const logoUrl = safeProductStoreImage(store.logo_url) || safeProductStoreImage(store.logo_base64);
  if (logoUrl) {
    const image = document.createElement('img');
    image.src = logoUrl;
    image.alt = `Logo da loja ${name}`;
    image.loading = 'lazy';
    image.addEventListener('error', showInitial, { once: true });
    logoElement.appendChild(image);
  } else {
    showInitial();
  }

  link.hidden = false;
}

async function loadProductStoreDetails(product) {
  const link = document.getElementById('productStoreLink');
  if (!link || !product?.loja_id || typeof supabaseClient === 'undefined') return;

  let store = null;
  for (const source of PRODUCT_STORE_SOURCES) {
    for (const columns of PRODUCT_STORE_COLUMN_SETS) {
      const { data, error } = await supabaseClient
        .from(source)
        .select(columns)
        .eq('id', product.loja_id)
        .limit(1);

      if (!error) {
        store = (data && data[0]) || null;
        break;
      }
      if (isProductStoreMissingColumn(error)) continue;
      if (isProductStoreMissingRelation(error)) break;
      console.warn(`Não foi possível consultar a loja em ${source}:`, error);
      break;
    }
    if (store) break;
  }

  // Lojas antigas podem manter o logo em Base64 em vez de logo_url.
  if (store && !safeProductStoreImage(store.logo_url)) {
    try {
      const { data, error } = await supabaseClient
        .from('lojas')
        .select('logo_base64')
        .eq('id', product.loja_id)
        .maybeSingle();
      if (!error && data?.logo_base64) store.logo_base64 = data.logo_base64;
    } catch (error) {
      console.warn('Não foi possível carregar o logo legado da loja:', error);
    }
  }

  renderProductStore(store);
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
    bars.style.display = 'flex';
  }

  const reviewList = document.querySelector('.rev-list');

  if (reviewList) {
    renderProductReviewSkeletons(3);
  }

  /* Remove dados fixos que não pertencem necessariamente ao produto */

  const swatches = document.querySelector('.swatch-row');
  if (swatches) swatches.style.display = 'none';

  const stockNote = document.querySelector('.stock-note');
  if (stockNote) stockNote.style.display = 'none';

  const stockBar = document.querySelector('.stock-bar-wrap');
  if (stockBar) stockBar.style.display = 'none';
}


/* ── AVALIAÇÕES REAIS DO PRODUTO ───────────────────────────── */

function writeProductReview() {
  if (!currentProduct?.id) {
    showToast('Carregue o produto antes de escrever uma avaliação.');
    return;
  }

  const target = `/review/?product_id=${encodeURIComponent(String(currentProduct.id))}`;
  window.location.href = target;
}

function reviewEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function formatReviewDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function initialsForReviewName(value) {
  const parts = String(value || 'Cliente Ecomme').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'CE';
}

function applyProductReviewSummary(summary) {
  const average = Number(summary?.avg_rating) || 0;
  const total = Number(summary?.total_reviews) || 0;
  const counts = {
    1: Number(summary?.one_star) || 0,
    2: Number(summary?.two_star) || 0,
    3: Number(summary?.three_star) || 0,
    4: Number(summary?.four_star) || 0,
    5: Number(summary?.five_star) || 0
  };

  if (currentProduct) {
    currentProduct.rating = average;
    currentProduct.reviews = total;
  }

  setText('.stars-lg', starsText(average));
  setText('.rating-val', average.toFixed(1));
  setText('.rating-link', `${total.toLocaleString('pt-BR')} avaliações`);

  const reviewTab = document.querySelector('.tabs-nav .tab-btn[data-tab="reviews"]');
  if (reviewTab) reviewTab.textContent = `Avaliações (${total.toLocaleString('pt-BR')})`;

  setText('.rev-avg-num', average.toFixed(1));
  setText('.rev-avg-stars', starsText(average));
  setText('.rev-avg-total', `baseado em ${total.toLocaleString('pt-BR')} avaliações`);

  const specs = document.querySelector('#tab-specs .specs-table');
  if (specs) {
    specs.querySelectorAll('tr').forEach(row => {
      if (row.cells?.[0]?.textContent?.trim() === 'Avaliação' && row.cells[1]) {
        row.cells[1].textContent =
          `${average.toFixed(1)} de 5 (${total.toLocaleString('pt-BR')} avaliações)`;
      }
    });
  }

  const bars = document.querySelector('.rev-bars');
  if (!bars) return;

  bars.style.display = 'flex';
  bars.querySelectorAll('.rev-bar-row').forEach(row => {
    const label = row.querySelector('.rb-lbl')?.textContent || '';
    const rating = Number(label.match(/[1-5]/)?.[0]);
    if (!rating) return;

    const count = counts[rating] || 0;
    const percentage = total ? Math.round((count / total) * 100) : 0;
    const fill = row.querySelector('.rev-bar-fill');
    const pct = row.querySelector('.rb-pct');

    if (fill) fill.style.width = `${percentage}%`;
    if (pct) pct.textContent = `${percentage}%`;
  });
}

function getProductReviewSearchTerms(value) {
  const text = String(value || '').normalize('NFKC').toLocaleLowerCase('pt-BR');
  const rawTokens = text.match(/[\p{L}]+|[\p{N}]+[\p{L}]*/gu) || [];
  const allTokens = rawTokens.flatMap(token => {
    // Em medidas como "1,80m" ou "1.80 m", também procura a parte numérica
    // relevante ("80") para encontrar avaliações que escrevem a medida com espaço.
    const numericPart = token.match(/^\d{2,}/)?.[0];
    return numericPart && numericPart !== token ? [token, numericPart] : [token];
  });
  const stopWords = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que', 'e', 'ou',
    'é', 'ser', 'foi', 'são', 'ao', 'aos', 'à', 'às', 'me', 'se', 'eu', 'ele', 'ela',
    'isso', 'essa', 'esse', 'este', 'esta', 'como', 'qual', 'quais', 'pode', 'posso'
  ]);

  let terms = [...new Set(allTokens.filter(token =>
    (token.length > 1 || /^\d{2,}/.test(token)) && !stopWords.has(token)
  ))];

  // Se a consulta contiver apenas palavras comuns, ainda permite pesquisar por elas.
  if (!terms.length) terms = [...new Set(allTokens.filter(token => token.length > 1))];
  return terms.slice(0, 10);
}

function buildProductReviewQuery(productId, searchTerm, offset = 0) {
  let query = supabaseClient
    .from('product_reviews')
    .select('id, product_id, rating, title, comment, created_at, reviewer_name, reviewer_avatar', { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PRODUCT_REVIEW_PAGE_SIZE - 1);

  const terms = getProductReviewSearchTerms(searchTerm);
  if (terms.length) {
    // Os termos são compostos somente por letras/números, evitando caracteres
    // especiais na sintaxe OR do PostgREST. Cada termo procura título ou comentário.
    const filters = terms.flatMap(term => [
      `title.ilike.%${term}%`,
      `comment.ilike.%${term}%`
    ]);
    query = query.or(filters.join(','));
  }

  return query;
}

async function addProductReviewEngagement(reviewRows) {
  const engagementById = new Map();
  if (reviewRows.length) {
    try {
      const engagementResult = await supabaseClient.rpc(
        'get_product_review_engagement',
        { p_review_ids: reviewRows.map(review => review.id) }
      );
      if (engagementResult.error) throw engagementResult.error;
      (Array.isArray(engagementResult.data) ? engagementResult.data : []).forEach(row => {
        engagementById.set(String(row.review_id), {
          likes_count: Number(row.likes_count) || 0,
          liked_by_me: Boolean(row.liked_by_me)
        });
      });
    } catch (engagementError) {
      // Falha nas interações não deve esconder as avaliações.
      console.warn('Não foi possível carregar curtidas das avaliações. Execute supabase/product-review-interactions.sql:', engagementError);
    }
  }

  return reviewRows.map(review => ({
    ...review,
    ...(engagementById.get(String(review.id)) || { likes_count: 0, liked_by_me: false })
  }));
}

function setProductReviewSearchStatus(message) {
  const status = document.getElementById('productReviewSearchStatus');
  if (status) status.textContent = message;
}

function renderProductReviewSkeletons(count = 3, options = {}) {
  const list = document.querySelector('.rev-list');
  if (!list) return;

  if (!options.append) list.replaceChildren();
  list.setAttribute('aria-busy', 'true');

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement('article');
    skeleton.className = 'rev-item rev-item-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML = `
      <div class="rev-head">
        <span class="rev-avatar skeleton-shimmer rev-skeleton-avatar"></span>
        <span class="rev-name-row rev-skeleton-name-row">
          <span class="skeleton-shimmer rev-skeleton-line rev-skeleton-name"></span>
          <span class="skeleton-shimmer rev-skeleton-line rev-skeleton-date"></span>
        </span>
      </div>
      <span class="skeleton-shimmer rev-skeleton-stars"></span>
      <div class="rev-skeleton-copy">
        <span class="skeleton-shimmer rev-skeleton-line"></span>
        <span class="skeleton-shimmer rev-skeleton-line"></span>
        <span class="skeleton-shimmer rev-skeleton-line rev-skeleton-line-short"></span>
      </div>
      <div class="rev-interaction-actions rev-skeleton-actions">
        <span class="skeleton-shimmer rev-skeleton-pill"></span>
        <span class="skeleton-shimmer rev-skeleton-pill rev-skeleton-pill-short"></span>
      </div>`;
    fragment.appendChild(skeleton);
  }

  list.appendChild(fragment);
}

function clearProductReviewSkeletons() {
  const list = document.querySelector('.rev-list');
  if (!list) return;
  list.querySelectorAll('.rev-item-skeleton').forEach(item => item.remove());
  list.setAttribute('aria-busy', 'false');
}

function updateProductReviewLoadMoreButton() {
  const button = document.getElementById('productReviewLoadMore');
  if (!button) return;
  button.hidden = !productReviewSearchState.hasMore;
  button.disabled = productReviewSearchState.loading;
  button.textContent = productReviewSearchState.loading
    ? 'Carregando...'
    : 'Carregar mais avaliações';
}

function ensureProductReviewSearchUI() {
  const panel = document.getElementById('tab-reviews');
  if (!panel) return;

  let wrapper = document.getElementById('productReviewSearchPanel');
  const existingInput = document.getElementById('productReviewSearch');
  const existingBox = existingInput?.closest('.rev-search-box') || null;
  let status = document.getElementById('productReviewSearchStatus');

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'productReviewSearchPanel';
    wrapper.className = 'rev-search-panel';

    if (existingBox) {
      wrapper.appendChild(existingBox);
      if (status) wrapper.appendChild(status);
    } else {
      wrapper.innerHTML = `
        <div class="rev-search-box" role="search" aria-label="Pesquisar dentro das avaliações">
          <span class="rev-search-icon" aria-hidden="true">🔍</span>
          <input type="search" id="productReviewSearch" placeholder="Pesquisar nas avaliações (ex.: bateria, altura, conforto)..." autocomplete="off" maxlength="100" aria-label="Pesquisar no título e no texto das avaliações">
          <button type="button" id="productReviewSearchClear" class="rev-search-clear" aria-label="Limpar pesquisa" hidden>Limpar</button>
        </div>`;
    }
    panel.insertBefore(wrapper, panel.firstChild);
  } else if (wrapper.parentElement !== panel || wrapper !== panel.firstElementChild) {
    panel.insertBefore(wrapper, panel.firstChild);
  }

  status = document.getElementById('productReviewSearchStatus');
  if (!status) {
    status = document.createElement('p');
    status.className = 'rev-search-status';
    status.id = 'productReviewSearchStatus';
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Pesquise por um assunto, característica ou dúvida mencionada pelos clientes.';
    wrapper.appendChild(status);
  } else if (status.parentElement !== wrapper) {
    wrapper.appendChild(status);
  }

  const list = panel.querySelector('.rev-list');
  if (list && !document.getElementById('productReviewLoadMore')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'productReviewLoadMore';
    button.className = 'rev-load-more';
    button.hidden = true;
    button.textContent = 'Carregar mais avaliações';
    list.insertAdjacentElement('afterend', button);
  }
}

function ensureProductReviewSearchHandlers() {
  const input = document.getElementById('productReviewSearch');
  const clearButton = document.getElementById('productReviewSearchClear');
  const loadMoreButton = document.getElementById('productReviewLoadMore');
  if (!input || input.dataset.searchBound === 'true') return;
  input.dataset.searchBound = 'true';

  const runSearch = () => {
    clearTimeout(productReviewSearchState.debounceTimer);
    runProductReviewSearch(input.value.trim());
  };

  input.addEventListener('input', () => {
    if (clearButton) clearButton.hidden = !input.value;
    clearTimeout(productReviewSearchState.debounceTimer);
    productReviewSearchState.debounceTimer = setTimeout(runSearch, 400);
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });

  clearButton?.addEventListener('click', () => {
    input.value = '';
    clearButton.hidden = true;
    runSearch();
    input.focus();
  });

  loadMoreButton?.addEventListener('click', loadMoreProductReviews);
}

function appendProductReviewHighlightedText(element, value, searchTerm) {
  const text = String(value ?? '');
  const terms = getProductReviewSearchTerms(searchTerm);

  if (!text || !terms.length) {
    element.textContent = text;
    return;
  }

  // Destaca somente termos pesquisados, criando nós de texto e <mark> para
  // manter o conteúdo da avaliação como texto simples e evitar injeção de HTML.
  const escapedTerms = terms
    .sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(escapedTerms.join('|'), 'giu');
  let lastIndex = 0;
  let match;

  element.replaceChildren();
  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      element.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const highlighted = document.createElement('mark');
    highlighted.className = 'rev-search-highlight';
    highlighted.textContent = match[0];
    element.appendChild(highlighted);
    lastIndex = matcher.lastIndex;
  }

  if (lastIndex < text.length) {
    element.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderProductReviewItems(items, ownReviewId = null, options = {}) {
  const list = document.querySelector('.rev-list');
  if (!list) return;

  ensureProductReviewInteractionHandlers(list);
  if (!options.append) list.replaceChildren();
  else list.querySelectorAll('.rev-item-skeleton').forEach(item => item.remove());
  list.setAttribute('aria-busy', 'false');

  if (!items.length) {
    if (options.append) return;
    const empty = document.createElement('p');
    empty.className = 'rev-text rev-empty';
    empty.textContent = productReviewSearchState.term
      ? `Nenhuma avaliação encontrada para “${productReviewSearchState.term}”. Tente outras palavras.`
      : 'Este produto ainda não possui avaliações. Seja a primeira pessoa a compartilhar sua experiência.';
    list.appendChild(empty);
    return;
  }

  items.forEach(review => {
    const item = document.createElement('article');
    item.className = 'rev-item';

    const head = document.createElement('div');
    head.className = 'rev-head';

    const avatar = document.createElement('div');
    avatar.className = 'rev-avatar';

    if (review.reviewer_avatar) {
      const imageUrl = String(review.reviewer_avatar);
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        avatar.textContent = initialsForReviewName(review.reviewer_name);
      }, { once: true });
      avatar.appendChild(image);
    } else {
      avatar.textContent = initialsForReviewName(review.reviewer_name);
    }

    const nameRow = document.createElement('div');
    nameRow.className = 'rev-name-row';

    const name = document.createElement('span');
    name.className = 'rev-name';
    name.textContent = review.reviewer_name || 'Cliente Ecomme';

    const date = document.createElement('span');
    date.className = 'rev-date';
    date.textContent = formatReviewDate(review.created_at);

    nameRow.append(name, date);
    head.append(avatar, nameRow);

    const stars = document.createElement('div');
    stars.className = 'rev-stars-sm';
    stars.textContent = '★'.repeat(Number(review.rating) || 0) +
      '☆'.repeat(5 - (Number(review.rating) || 0));
    stars.setAttribute('aria-label', `${review.rating} de 5 estrelas`);

    item.append(head, stars);

    if (review.title) {
      const title = document.createElement('h4');
      title.className = 'rev-user-title';
      appendProductReviewHighlightedText(title, review.title, productReviewSearchState.term);
      item.appendChild(title);
    }

    const comment = document.createElement('p');
    comment.className = 'rev-text';
    appendProductReviewHighlightedText(comment, review.comment || '', productReviewSearchState.term);
    item.appendChild(comment);

    const actions = document.createElement('div');
    actions.className = 'rev-interaction-actions';

    const likeButton = document.createElement('button');
    likeButton.type = 'button';
    likeButton.className = `rev-interaction-btn rev-like-btn${review.liked_by_me ? ' is-liked' : ''}`;
    likeButton.dataset.reviewLike = 'true';
    likeButton.dataset.reviewId = String(review.id);
    likeButton.setAttribute('aria-pressed', String(Boolean(review.liked_by_me)));
    likeButton.setAttribute('aria-label', `${review.liked_by_me ? 'Remover curtida' : 'Curtir'} avaliação de ${review.reviewer_name || 'Cliente Ecomme'}`);
    likeButton.innerHTML = `<span class="rev-like-heart" aria-hidden="true"><i class="fa-regular fa-heart"></i></span><span class="rev-like-label">${review.liked_by_me ? 'Curtido' : 'Curtir'}</span><span class="rev-like-count">${Math.max(0, Number(review.likes_count) || 0)}</span>`;
    actions.appendChild(likeButton);

    // Não exibe denúncia na própria avaliação do usuário.
    if (String(review.id) !== String(ownReviewId || '')) {
      const reportButton = document.createElement('button');
      reportButton.type = 'button';
      reportButton.className = 'rev-interaction-btn rev-report-btn';
      reportButton.dataset.reviewReport = 'true';
      reportButton.dataset.reviewId = String(review.id);
      reportButton.setAttribute('aria-label', `Denunciar avaliação de ${review.reviewer_name || 'Cliente Ecomme'}`);
      reportButton.innerHTML = '<span aria-hidden="true">⚑</span><span>Denunciar</span>';
      actions.appendChild(reportButton);
    }

    item.appendChild(actions);
    list.appendChild(item);
  });
}

async function runProductReviewSearch(searchTerm) {
  if (!currentProduct?.id || typeof supabaseClient === 'undefined') return;

  const state = productReviewSearchState;
  const requestId = ++state.requestId;
  state.productId = String(currentProduct.id);
  state.term = String(searchTerm || '').trim().slice(0, 100);
  state.offset = 0;
  state.total = 0;
  state.hasMore = false;
  state.loading = true;

  renderProductReviewSkeletons(3);
  setProductReviewSearchStatus(state.term ? 'Pesquisando nas avaliações...' : 'Carregando as avaliações mais recentes...');
  updateProductReviewLoadMoreButton();

  try {
    const result = await buildProductReviewQuery(state.productId, state.term, 0);
    if (result.error) throw result.error;
    if (requestId !== state.requestId) return;

    const rows = Array.isArray(result.data) ? result.data : [];
    const reviews = await addProductReviewEngagement(rows);
    if (requestId !== state.requestId) return;

    state.offset = rows.length;
    state.total = Number(result.count) || 0;
    state.hasMore = state.offset < state.total;
    renderProductReviewItems(reviews, state.ownReviewId);

    if (state.term) {
      setProductReviewSearchStatus(state.total
        ? ``/*${state.total.toLocaleString('pt-BR')} avaliação(ões) encontrada(s) para “${state.term}”. Exibindo ${state.offset.toLocaleString('pt-BR')} até agora.*/
        : `Nenhuma avaliação encontrada para “${state.term}”. Experimente termos mais curtos ou outras palavras.`);
    } else {
      setProductReviewSearchStatus(``/*Exibindo ${state.offset.toLocaleString('pt-BR')} de ${state.total.toLocaleString('pt-BR')} avaliações mais recentes. Use a busca para encontrar um assunto específico.*/);
    }
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error('Erro ao pesquisar avaliações:', error);
    renderProductReviewItems([], state.ownReviewId);
    setProductReviewSearchStatus('Não foi possível pesquisar as avaliações. Tente novamente.');
  } finally {
    if (requestId === state.requestId) {
      state.loading = false;
      clearProductReviewSkeletons();
      updateProductReviewLoadMoreButton();
    }
  }
}

async function loadMoreProductReviews() {
  const state = productReviewSearchState;
  if (state.loading || !state.hasMore || !state.productId) return;

  const requestId = state.requestId;
  state.loading = true;
  renderProductReviewSkeletons(2, { append: true });
  updateProductReviewLoadMoreButton();
  setProductReviewSearchStatus('Carregando mais avaliações...');

  try {
    const result = await buildProductReviewQuery(state.productId, state.term, state.offset);
    if (result.error) throw result.error;
    if (requestId !== state.requestId) return;

    const rows = Array.isArray(result.data) ? result.data : [];
    const reviews = await addProductReviewEngagement(rows);
    if (requestId !== state.requestId) return;

    renderProductReviewItems(reviews, state.ownReviewId, { append: true });
    state.offset += rows.length;
    state.total = Number(result.count) || state.total;
    state.hasMore = state.offset < state.total;

    setProductReviewSearchStatus(state.term
      ? ``/*${state.total.toLocaleString('pt-BR')} avaliação(ões) encontrada(s) para “${state.term}”. Exibindo ${state.offset.toLocaleString('pt-BR')}.*/
      : `Exibindo ${state.offset.toLocaleString('pt-BR')} de ${state.total.toLocaleString('pt-BR')} avaliações.`);
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error('Erro ao carregar mais avaliações:', error);
    setProductReviewSearchStatus('Não foi possível carregar mais avaliações. Tente novamente.');
  } finally {
    if (requestId === state.requestId) {
      state.loading = false;
      clearProductReviewSkeletons();
      updateProductReviewLoadMoreButton();
    }
  }
}

async function loadProductReviews(product) {
  if (!product?.id || typeof supabaseClient === 'undefined') return;

  const productId = String(product.id);
  const list = document.querySelector('.rev-list');
  const state = productReviewSearchState;
  ensureProductReviewSearchUI();
  const input = document.getElementById('productReviewSearch');
  const clearButton = document.getElementById('productReviewSearchClear');
  ensureProductReviewSearchHandlers();
  clearTimeout(state.debounceTimer);
  if (input) input.value = '';
  if (clearButton) clearButton.hidden = true;
  const initialRequestId = ++state.requestId;
  state.productId = productId;
  state.term = '';
  state.offset = 0;
  state.total = 0;
  state.hasMore = false;
  state.loading = true;
  renderProductReviewSkeletons(3);
  setProductReviewSearchStatus('Carregando avaliações...');
  updateProductReviewLoadMoreButton();

  try {
    const userResult = await supabaseClient.auth.getUser();
    if (initialRequestId !== state.requestId) return;
    const user = userResult?.data?.user || null;

    const requests = [
      supabaseClient.rpc('product_review_summary', {
        p_product_id: productId
      }),
      buildProductReviewQuery(productId, '', 0)
    ];

    // Procura a avaliação do usuário separadamente, porque ela pode ser mais antiga
    // do que as avaliações recentes exibidas na página.
    if (user) {
      requests.push(
        supabaseClient
          .from('product_reviews')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle()
      );
    }

    const [summaryResult, reviewsResult, ownReviewResult] = await Promise.all(requests);
    if (initialRequestId !== state.requestId) return;

    if (summaryResult.error) throw summaryResult.error;
    if (reviewsResult.error) throw reviewsResult.error;
    if (ownReviewResult?.error) throw ownReviewResult.error;

    const summary = Array.isArray(summaryResult.data)
      ? summaryResult.data[0]
      : summaryResult.data;

    const ownReview = ownReviewResult?.data || null;
    const reviewRows = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
    state.ownReviewId = ownReview?.id || null;
    state.offset = reviewRows.length;
    state.total = Number(reviewsResult.count) || 0;
    state.hasMore = state.offset < state.total;

    applyProductReviewSummary(summary || {});
    const reviews = await addProductReviewEngagement(reviewRows);
    if (initialRequestId !== state.requestId) return;
    renderProductReviewItems(reviews, ownReview?.id);
    setProductReviewSearchStatus(
      ``/*Exibindo ${state.offset.toLocaleString('pt-BR')} de ${state.total.toLocaleString('pt-BR')} avaliações mais recentes. Use a busca para encontrar um assunto específico.*/
    );

    const writeButton = document.querySelector('.btn-write-rev');
    if (writeButton) {
      writeButton.textContent = ownReview ? 'Editar minha avaliação' : 'Escrever avaliação';
      writeButton.setAttribute('aria-label', ownReview ? 'Editar minha avaliação' : 'Escrever avaliação');
    }

    if (window.location.hash === '#tab-reviews') {
      requestAnimationFrame(() => goToTab('reviews'));
    }
  } catch (error) {
    if (initialRequestId !== state.requestId) return;
    console.error('Erro ao consultar avaliações no Supabase:', error);

    if (list) {
      list.replaceChildren();
      list.setAttribute('aria-busy', 'false');
      const message = document.createElement('p');
      message.className = 'rev-text';
      message.textContent = 'Não foi possível carregar as avaliações agora. Tente novamente em instantes.';
      list.appendChild(message);
    }
    setProductReviewSearchStatus('Não foi possível carregar as avaliações agora.');
  } finally {
    if (initialRequestId === state.requestId) {
      state.loading = false;
      clearProductReviewSkeletons();
      updateProductReviewLoadMoreButton();
    }
  }
}

/* ── CURTIDAS E DENÚNCIAS DE AVALIAÇÕES ───────────────────────── */
function productReviewToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type === 'success' ? 'ok' : type === 'error' ? 'err' : 'info');
  } else {
    console.info(`[Ecomme avaliações] ${message}`);
  }
}

function redirectToLoginForReviewAction() {
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
}

function ensureProductReviewInteractionHandlers(list) {
  if (list.dataset.interactionsBound === 'true') return;
  list.dataset.interactionsBound = 'true';

  list.addEventListener('click', async event => {
    const likeButton = event.target.closest('[data-review-like]');
    if (likeButton && list.contains(likeButton)) {
      await toggleProductReviewLike(likeButton);
      return;
    }

    const reportButton = event.target.closest('[data-review-report]');
    if (reportButton && list.contains(reportButton)) {
      openProductReviewReport(reportButton.dataset.reviewId, reportButton);
    }
  });
}

async function toggleProductReviewLike(button) {
  if (!button || button.disabled) return;

  if (typeof supabaseClient === 'undefined') {
    productReviewToast('Não foi possível conectar ao serviço de avaliações.', 'error');
    return;
  }

  button.disabled = true;
  try {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) {
      productReviewToast('Entre na sua conta para curtir esta avaliação.');
      redirectToLoginForReviewAction();
      return;
    }

    const { data, error } = await supabaseClient.rpc('toggle_product_review_like', {
      p_review_id: button.dataset.reviewId
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) throw new Error('O Supabase não retornou o estado da curtida.');

    const liked = Boolean(result.is_liked);
    const count = Math.max(0, Number(result.likes_count) || 0);
    button.classList.toggle('is-liked', liked);
    button.setAttribute('aria-pressed', String(liked));
    button.setAttribute('aria-label', `${liked ? 'Remover curtida' : 'Curtir'} avaliação`);
    const label = button.querySelector('.rev-like-label');
    const countEl = button.querySelector('.rev-like-count');
    if (label) label.textContent = liked ? 'Curtido' : 'Curtir';
    if (countEl) countEl.textContent = String(count);
  } catch (error) {
    console.error('Erro ao registrar curtida:', error);
    if (error?.code === '42P01' || /toggle_product_review_like|product_review_likes/i.test(error?.message || '')) {
      productReviewToast('Ative primeiro as interações executando supabase/product-review-interactions.sql no Supabase.', 'error');
    } else if (error?.code === '28000' || /AUTH_REQUIRED/i.test(error?.message || '')) {
      redirectToLoginForReviewAction();
    } else {
      productReviewToast('Não foi possível registrar sua curtida. Tente novamente.', 'error');
    }
  } finally {
    button.disabled = false;
  }
}

let activeReportReviewId = null;
let activeReportButton = null;
let reportSubmitting = false;

function ensureProductReviewReportModal() {
  let modal = document.getElementById('productReviewReportModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'productReviewReportModal';
  modal.className = 'pr-report-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="pr-report-dialog" role="dialog" aria-modal="true" aria-labelledby="prReportTitle">
      <button type="button" class="pr-report-close" data-report-close aria-label="Fechar denúncia">×</button>
      <p class="pr-report-eyebrow">SEGURANÇA DA COMUNIDADE</p>
      <h2 id="prReportTitle">Denunciar avaliação</h2>
      <p class="pr-report-intro">Conte por que esta avaliação deve ser analisada. A denúncia é privada e não mostra seus dados ao autor.</p>
      <form id="prReportForm">
        <label class="pr-report-field" for="prReportReason">Motivo da denúncia <span>*</span>
          <select id="prReportReason" required>
            <option value="">Selecione um motivo</option>
            <option value="spam">Spam ou propaganda</option>
            <option value="offensive">Conteúdo ofensivo ou discurso de ódio</option>
            <option value="false_information">Informação falsa ou enganosa</option>
            <option value="irrelevant">Conteúdo não relacionado ao produto</option>
            <option value="fake_review">Suspeita de avaliação falsa</option>
            <option value="other">Outro motivo</option>
          </select>
        </label>
        <label class="pr-report-field" for="prReportDetails">Detalhes <small>opcional</small>
          <textarea id="prReportDetails" rows="4" maxlength="1000" placeholder="Adicione contexto para ajudar na análise (até 1000 caracteres)."></textarea>
        </label>
        <p id="prReportStatus" class="pr-report-status" role="status" aria-live="polite" hidden></p>
        <div class="pr-report-actions">
          <button type="button" class="pr-report-cancel" data-report-close>Cancelar</button>
          <button type="submit" class="pr-report-submit" id="prReportSubmit">Enviar denúncia</button>
        </div>
      </form>
    </section>`;
  document.body.appendChild(modal);

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-report-close]')) {
      closeProductReviewReport();
    }
  });
  modal.querySelector('#prReportForm').addEventListener('submit', submitProductReviewReport);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeProductReviewReport();
  });
  return modal;
}

function openProductReviewReport(reviewId, button) {
  if (!reviewId) return;
  activeReportReviewId = String(reviewId);
  activeReportButton = button || null;
  reportSubmitting = false;

  const modal = ensureProductReviewReportModal();
  modal.querySelector('#prReportForm').reset();
  const status = modal.querySelector('#prReportStatus');
  status.hidden = true;
  status.textContent = '';
  const submit = modal.querySelector('#prReportSubmit');
  submit.disabled = false;
  submit.textContent = 'Enviar denúncia';
  modal.hidden = false;
  document.body.classList.add('pr-report-open');
  requestAnimationFrame(() => modal.querySelector('#prReportReason')?.focus());
}

function closeProductReviewReport() {
  const modal = document.getElementById('productReviewReportModal');
  if (!modal || reportSubmitting) return;
  modal.hidden = true;
  document.body.classList.remove('pr-report-open');
  activeReportReviewId = null;
  if (activeReportButton?.isConnected) activeReportButton.focus();
  activeReportButton = null;
}

async function submitProductReviewReport(event) {
  event.preventDefault();
  if (reportSubmitting || !activeReportReviewId) return;

  const modal = ensureProductReviewReportModal();
  const reason = modal.querySelector('#prReportReason').value;
  const details = modal.querySelector('#prReportDetails').value.trim();
  const status = modal.querySelector('#prReportStatus');
  const submit = modal.querySelector('#prReportSubmit');
  if (!reason) {
    modal.querySelector('#prReportReason').focus();
    return;
  }
  if (details.length > 1000) {
    status.textContent = 'Os detalhes devem ter no máximo 1000 caracteres.';
    status.hidden = false;
    return;
  }

  reportSubmitting = true;
  submit.disabled = true;
  submit.textContent = 'Enviando…';
  status.hidden = true;

  try {
    if (typeof supabaseClient === 'undefined') throw new Error('SUPABASE_UNAVAILABLE');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) {
      closeProductReviewReportAfterRequest();
      redirectToLoginForReviewAction();
      return;
    }

    const { data, error } = await supabaseClient.rpc('report_product_review', {
      p_review_id: activeReportReviewId,
      p_reason: reason,
      p_details: details || null
    });
    if (error) throw error;

    closeProductReviewReportAfterRequest();
    if (data === true) {
      productReviewToast('Denúncia enviada. Obrigado por ajudar a manter a comunidade segura.', 'success');
    } else {
      productReviewToast('Você já enviou uma denúncia para esta avaliação.', 'info');
    }
  } catch (error) {
    console.error('Erro ao enviar denúncia de avaliação:', error);
    const message = error?.message || '';
    const missingRpc = error?.code === '42883' || /report_product_review|product_review_reports/i.test(message);
    if (missingRpc) {
      status.textContent = 'A função de denúncias ainda não está configurada. Execute supabase/product-review-interactions.sql no SQL Editor do Supabase.';
    } else if (error?.code === '28000' || /AUTH_REQUIRED/i.test(message)) {
      closeProductReviewReportAfterRequest();
      redirectToLoginForReviewAction();
      return;
    } else if (/CANNOT_REPORT_OWN_REVIEW/i.test(message)) {
      status.textContent = 'Você não pode denunciar sua própria avaliação.';
    } else if (/REVIEW_NOT_FOUND/i.test(message)) {
      status.textContent = 'Esta avaliação não está mais disponível.';
    } else {
      status.textContent = 'Não foi possível enviar a denúncia. Verifique sua conexão e tente novamente.';
    }
    status.hidden = false;
  } finally {
    reportSubmitting = false;
    if (modal.isConnected && !modal.hidden) {
      submit.disabled = false;
      submit.textContent = 'Enviar denúncia';
    }
  }
}

function closeProductReviewReportAfterRequest() {
  const modal = document.getElementById('productReviewReportModal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('pr-report-open');
  activeReportReviewId = null;
  activeReportButton = null;
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

function ensureProductGalleryNavigation(gallery) {
  let navigation = gallery.querySelector('.product-gallery-nav');
  if (!navigation) {
    navigation = document.createElement('div');
    navigation.className = 'product-gallery-nav';
    navigation.setAttribute('aria-label', 'Navegação das imagens do produto');

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'product-gallery-nav-button is-previous';
    previous.setAttribute('aria-label', 'Imagem anterior');
    previous.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    previous.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      moveProductGalleryImage(-1, 'prev');
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'product-gallery-nav-button is-next';
    next.setAttribute('aria-label', 'Próxima imagem');
    next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    next.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      moveProductGalleryImage(1, 'next');
    });

    navigation.append(previous, next);
    gallery.appendChild(navigation);
  }

  navigation.hidden = productPageImages.length <= 1;
  return navigation;
}

function moveProductGalleryImage(step, direction) {
  if (productPageImages.length <= 1) return;
  const nextIndex = (productGallerySelectedIndex + step + productPageImages.length) % productPageImages.length;
  selectProductImage(nextIndex, direction);
}

function renderProductGallery(p) {
  productPageImages = imageList(p);
  productGallerySelectedIndex = 0;
  productMobileImageViewerImageCache.clear();
  productGalleryImageLoadCache.clear();

  const gallery = document.getElementById('galleryMain');
  const emoji = document.getElementById('gmainEmoji');
  const thumbs = document.getElementById('galleryThumbs');

  if (!gallery || !emoji || !thumbs) return;

  // Duas camadas alternadas permitem trocar a foto desfocada sem alterar
  // o filtro: somente a opacidade das duas imagens é animada.
  ['productMainBlurImage', 'productMainBlurImageNext'].forEach(id => {
    let blurLayer = document.getElementById(id);
    if (!blurLayer) {
      blurLayer = document.createElement('img');
      blurLayer.id = id;
      blurLayer.alt = '';
      blurLayer.setAttribute('aria-hidden', 'true');
      blurLayer.draggable = false;
      blurLayer.setAttribute('draggable', 'false');
      gallery.insertBefore(blurLayer, gallery.firstChild);
    }
    blurLayer.style.setProperty('transition-property', 'none', 'important');
    blurLayer.className = 'gallery-main-blur';
    blurLayer.removeAttribute('src');
    delete blurLayer.dataset.original;
    delete blurLayer.dataset.loadedSrc;
    delete blurLayer.dataset.fallback;
    blurLayer.onload = null;
    blurLayer.onerror = null;
    void blurLayer.offsetWidth;
    blurLayer.style.removeProperty('transition-property');
  });

  let mainImage = document.getElementById('productMainImage');

  if (!mainImage) {
    mainImage = document.createElement('img');
    mainImage.id = 'productMainImage';
    mainImage.draggable = false;
    mainImage.setAttribute('draggable', 'false');
    mainImage.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;' +
      'object-fit:contain;box-sizing:border-box;padding:28px;' +
      'display:none;z-index:1;pointer-events:none;' +
      'user-select:none;-webkit-user-select:none;-webkit-user-drag:none;';

    emoji.insertAdjacentElement('beforebegin', mainImage);
  }
  mainImage.draggable = false;
  mainImage.setAttribute('draggable', 'false');
  mainImage.style.userSelect = 'none';
  mainImage.style.webkitUserSelect = 'none';
  mainImage.style.webkitUserDrag = 'none';

  let imageLoader = gallery.querySelector('.gallery-image-loader');
  if (!imageLoader) {
    imageLoader = document.createElement('div');
    imageLoader.className = 'gallery-image-loader';
    imageLoader.setAttribute('role', 'status');
    imageLoader.setAttribute('aria-label', 'Carregando imagem do produto');
    imageLoader.setAttribute('aria-hidden', 'true');
    imageLoader.innerHTML = '<span class="gallery-image-loader-panel"><span class="gallery-image-loader-spinner" aria-hidden="true"></span><span class="gallery-image-loader-text">Preparando imagem...</span></span>';
    gallery.appendChild(imageLoader);
  }
  productGalleryLoader = imageLoader;
  imageLoader.classList.remove('is-visible');
  imageLoader.setAttribute('aria-hidden', 'true');
  gallery.setAttribute('aria-busy', 'false');

  emoji.textContent = p.emoji || '📦';
  emoji.style.position = 'relative';
  emoji.style.zIndex = '2';

  const favBtn = document.getElementById('galFav');
  if (favBtn) favBtn.style.zIndex = '3';

  const zoom = gallery.querySelector('.gallery-zoom-hint');
  if (zoom) {
    zoom.style.zIndex = '3';
    if (isProductMobileTouchDevice() && zoom.lastChild?.nodeType === Node.TEXT_NODE) {
      zoom.lastChild.textContent = ' Toque para visualizar';
    }
  }

  ensureProductGalleryNavigation(gallery);

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
  setupProductImageZoom(gallery);
}

// Ampliação lateral que acompanha a posição do ponteiro na imagem principal.
let productZoomPreview = null;
let productZoomPreviewImage = null;
let productZoomPreviewLabel = null;
let productZoomGallery = null;
let productZoomLevel = 0;
const PRODUCT_ZOOM_BASE = 2.3;
const PRODUCT_ZOOM_STEP = 0.26;
const PRODUCT_ZOOM_MAX_LEVEL = 5;

function setupProductImageZoom(gallery) {
  const mainImage = document.getElementById('productMainImage');
  if (!gallery || !mainImage) return;

  if (!productZoomPreview) {
    productZoomPreview = document.createElement('div');
    productZoomPreview.className = 'product-image-zoom-preview';
    productZoomPreview.id = 'productImageZoomPreview';
    productZoomPreview.setAttribute('aria-hidden', 'true');
    productZoomPreview.innerHTML = '<span class="product-image-zoom-label">ZOOM 2,3×</span><img alt="Ampliação da imagem do produto">';
    productZoomPreviewImage = productZoomPreview.querySelector('img');
    productZoomPreviewLabel = productZoomPreview.querySelector('.product-image-zoom-label');
    productZoomPreview.title = 'Clique com o botão esquerdo para aumentar e com o botão direito para diminuir o zoom (até 5 níveis em cada direção).';
    document.body.appendChild(productZoomPreview);
    updateProductImageZoomLevel();
  }

  if (gallery.dataset.zoomInitialized === 'true') return;
  gallery.dataset.zoomInitialized = 'true';
  productZoomGallery = gallery;
  gallery.style.userSelect = 'none';
  gallery.style.webkitUserSelect = 'none';

  // Impede seleção acidental de texto/imagem e arraste nativo no quadro principal.
  gallery.addEventListener('selectstart', event => {
    if (isProductImageZoomTarget(event)) event.preventDefault();
  });
  gallery.addEventListener('dragstart', event => {
    if (isProductImageZoomTarget(event) || event.target.closest?.('#productMainImage')) event.preventDefault();
  });
  gallery.addEventListener('dblclick', event => {
    if (isProductImageZoomTarget(event)) event.preventDefault();
  });
  gallery.addEventListener('pointerdown', handleProductGalleryTouchPointerDown, { passive: true });
  gallery.addEventListener('pointermove', handleProductImageZoomMove, { passive: true });
  gallery.addEventListener('pointermove', handleProductGalleryTouchPointerMove, { passive: false });
  gallery.addEventListener('pointerup', handleProductMobileImageViewerPointerUp, { passive: false });
  gallery.addEventListener('pointercancel', handleProductGalleryTouchPointerCancel, { passive: true });
  gallery.addEventListener('click', handleProductImageZoomIncrease);
  gallery.addEventListener('contextmenu', handleProductImageZoomDecrease);
  gallery.addEventListener('pointerleave', hideProductImageZoom);
  gallery.addEventListener('pointercancel', hideProductImageZoom);
  window.addEventListener('scroll', updateProductImageZoomPosition, { passive: true });
  window.addEventListener('resize', hideProductImageZoom, { passive: true });
}

function handleProductImageZoomMove(event) {
  if (event.pointerType && event.pointerType !== 'mouse') return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches) return;

  const mainImage = document.getElementById('productMainImage');
  const gallery = productZoomGallery;
  if (!mainImage || !gallery || !mainImage.complete || !mainImage.naturalWidth || mainImage.style.display === 'none') return;

  const rect = gallery.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  syncProductImageZoomSource();
  productZoomPreviewImage.style.transformOrigin = `${x * 100}% ${y * 100}%`;
  productZoomPreview.classList.add('is-visible');
  productZoomPreview.setAttribute('aria-hidden', 'false');
  updateProductImageZoomPosition();
}

function isProductImageZoomTarget(event) {
  const gallery = productZoomGallery;
  if (!gallery || !gallery.contains(event.target)) return false;
  if (event.target.closest('button, a, input, [role="button"], .gallery-badges, .gallery-zoom-hint')) return false;
  const mainImage = document.getElementById('productMainImage');
  return Boolean(mainImage && mainImage.complete && mainImage.naturalWidth && mainImage.style.display !== 'none');
}

function updateProductImageZoomLevel() {
  if (!productZoomPreviewImage) return;
  const scale = Math.max(1, PRODUCT_ZOOM_BASE + productZoomLevel * PRODUCT_ZOOM_STEP);
  productZoomPreviewImage.style.transform = `scale(${scale.toFixed(2)})`;
  if (productZoomPreviewLabel) {
    productZoomPreviewLabel.textContent = `ZOOM ${scale.toFixed(1).replace('.', ',')}×`;
  }
  if (productZoomPreview) productZoomPreview.dataset.zoomLevel = String(productZoomLevel);
}

function isProductDesktopZoomDevice() {
  return window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches;
}

function isProductMobileTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

let productGalleryTouchGesture = null;
let productGallerySwipeReturnTimer = null;

function handleProductGalleryTouchPointerDown(event) {
  if (event.pointerType !== 'touch' || !isProductMobileTouchDevice()) return;
  if (productMobileImageViewer?.classList.contains('is-open')) return;
  if (!isProductImageZoomTarget(event) || productGallerySlideMainImage) return;
  if (productGalleryTouchGesture) {
    const activeGesture = productGalleryTouchGesture;
    productGalleryTouchGesture = null;
    if (activeGesture.dragging) returnProductGalleryImageAfterSwipe(activeGesture.image, activeGesture.gallery);
    return;
  }

  const gallery = productZoomGallery;
  const mainImage = document.getElementById('productMainImage');
  if (!gallery || !mainImage || mainImage.classList.contains('is-swipe-returning')) return;

  productGalleryTouchGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    lastX: event.clientX,
    lastTime: performance.now(),
    width: Math.max(1, gallery.clientWidth),
    image: mainImage,
    gallery,
    dragging: false,
    cancelled: false
  };

  try { gallery.setPointerCapture(event.pointerId); } catch (_) {}
}

function handleProductGalleryTouchPointerMove(event) {
  const gesture = productGalleryTouchGesture;
  if (!gesture || gesture.pointerId !== event.pointerId || event.pointerType !== 'touch' || gesture.cancelled) return;

  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  const moveTime = performance.now();
  const moveElapsed = Math.max(1, moveTime - gesture.lastTime);
  gesture.velocity = (event.clientX - gesture.lastX) / moveElapsed;
  gesture.currentX = event.clientX;
  gesture.currentY = event.clientY;

  if (!gesture.dragging) {
    if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15) {
      gesture.cancelled = true;
      return;
    }
    if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
    gesture.dragging = true;
    gesture.image.style.setProperty('transition', 'none', 'important');
    gesture.gallery.classList.add('is-touch-dragging');
  }

  event.preventDefault();
  const boundedDelta = Math.max(-gesture.width * 0.96, Math.min(gesture.width * 0.96, deltaX));
  gesture.image.style.transform = `translate3d(${boundedDelta.toFixed(2)}px,0,0)`;
  gesture.lastX = event.clientX;
  gesture.lastTime = moveTime;
}

function returnProductGalleryImageAfterSwipe(image, gallery) {
  if (!image) return;
  clearTimeout(productGallerySwipeReturnTimer);
  gallery?.classList.remove('is-touch-dragging');
  image.style.removeProperty('transition');
  image.classList.add('is-swipe-returning');
  requestAnimationFrame(() => {
    image.style.transform = 'translate3d(0,0,0)';
  });
  productGallerySwipeReturnTimer = setTimeout(() => {
    image.classList.remove('is-swipe-returning');
    image.style.removeProperty('transform');
    image.style.removeProperty('transition');
  }, 280);
}

function finishProductGalleryTouchGesture(event, allowTap = false) {
  const gesture = productGalleryTouchGesture;
  if (!gesture || gesture.pointerId !== event.pointerId) return { handled: false, wasDrag: false };
  productGalleryTouchGesture = null;

  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  const velocity = Number(gesture.velocity) || 0;
  const wasDrag = gesture.dragging;
  gesture.gallery.classList.remove('is-touch-dragging');

  if (event.type === 'pointercancel') {
    if (wasDrag) returnProductGalleryImageAfterSwipe(gesture.image, gesture.gallery);
    return { handled: true, wasDrag };
  }

  if (wasDrag) {
    event.preventDefault();
    const distanceThreshold = Math.max(48, gesture.width * 0.16);
    const enoughDistance = Math.abs(deltaX) >= distanceThreshold;
    const enoughVelocity = Math.abs(velocity) >= 0.45 && Math.abs(deltaX) >= 28;

    if ((enoughDistance || enoughVelocity) && Math.abs(deltaX) > Math.abs(deltaY) * 1.1 && productPageImages.length > 1) {
      const direction = deltaX < 0 ? 'next' : 'prev';
      const step = direction === 'next' ? 1 : -1;
      const nextIndex = (productGallerySelectedIndex + step + productPageImages.length) % productPageImages.length;
      const progress = Math.max(-0.96, Math.min(0.96, deltaX / gesture.width));
      selectProductImage(nextIndex, direction, { progress });
    } else {
      returnProductGalleryImageAfterSwipe(gesture.image, gesture.gallery);
    }
    return { handled: true, wasDrag: true };
  }

  if (allowTap && !gesture.cancelled && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && isProductImageZoomTarget(event)) {
    event.preventDefault();
    openProductMobileImageViewer();
    return { handled: true, wasDrag: false };
  }

  return { handled: true, wasDrag: false };
}

function handleProductGalleryTouchPointerCancel(event) {
  finishProductGalleryTouchGesture(event, false);
}

function handleProductMobileImageViewerPointerUp(event) {
  if (event.pointerType !== 'touch' || !isProductMobileTouchDevice()) return;
  finishProductGalleryTouchGesture(event, true);
}

let productMobileImageViewer = null;
let productMobileImageViewerImage = null;
let productMobileImageViewerSecondaryImage = null;
let productMobileImageViewerTransition = null;
let productMobileImageViewerTransitionToken = 0;
let productMobileImageViewerTransitionTimer = null;
let productMobileImageViewerCounter = null;
const PRODUCT_MOBILE_VIEWER_SLIDE_DURATION = 260;
let productMobileImageViewerPreviousFocus = null;
let productMobileImageViewerPreviousBodyOverflow = '';
let productMobileImageViewerPreviousRootOverflow = '';
let productMobileImageViewerPointers = new Map();
let productMobileImageViewerGesture = null;
let productMobileImageViewerZoom = 1;
let productMobileImageViewerTranslateX = 0;
let productMobileImageViewerTranslateY = 0;
const PRODUCT_MOBILE_VIEWER_MAX_ZOOM = 4.5;
let productMobileImageViewerIndex = 0;
let productMobileImageViewerInitialIndex = 0;
let productMobileImageViewerRequestId = 0;

function ensureProductMobileImageViewer() {
  if (productMobileImageViewer) return productMobileImageViewer;

  const overlay = document.createElement('div');
  overlay.className = 'product-mobile-image-viewer';
  overlay.id = 'productMobileImageViewer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Imagens do produto');
  overlay.setAttribute('aria-hidden', 'true');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'product-mobile-image-viewer-close';
  closeButton.setAttribute('aria-label', 'Fechar imagens');
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className = 'product-mobile-image-viewer-nav is-previous';
  previousButton.setAttribute('aria-label', 'Imagem anterior');
  previousButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

  const stage = document.createElement('div');
  stage.className = 'product-mobile-image-viewer-stage';

  const image = document.createElement('img');
  image.className = 'product-mobile-image-viewer-image is-active';
  image.alt = '';
  image.decoding = 'async';
  image.loading = 'eager';
  image.fetchPriority = 'high';
  image.draggable = false;
  image.setAttribute('draggable', 'false');

  const secondaryImage = document.createElement('img');
  secondaryImage.className = 'product-mobile-image-viewer-image is-incoming is-hidden';
  secondaryImage.alt = '';
  secondaryImage.decoding = 'async';
  secondaryImage.loading = 'eager';
  secondaryImage.draggable = false;
  secondaryImage.setAttribute('draggable', 'false');
  secondaryImage.setAttribute('aria-hidden', 'true');
  stage.append(image, secondaryImage);

  const counter = document.createElement('span');
  counter.className = 'product-mobile-image-viewer-counter';
  counter.setAttribute('aria-live', 'polite');

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'product-mobile-image-viewer-nav is-next';
  nextButton.setAttribute('aria-label', 'Próxima imagem');
  nextButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  overlay.append(closeButton, previousButton, stage, counter, nextButton);
  document.body.appendChild(overlay);

  closeButton.addEventListener('click', closeProductMobileImageViewer);
  previousButton.addEventListener('click', () => moveProductMobileImageViewer(-1));
  nextButton.addEventListener('click', () => moveProductMobileImageViewer(1));
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeProductMobileImageViewer();
  });
  stage.addEventListener('pointerdown', handleProductMobileImageViewerPointerDown, { passive: false });
  stage.addEventListener('pointermove', handleProductMobileImageViewerPointerMove, { passive: false });
  stage.addEventListener('pointerup', handleProductMobileImageViewerPointerEnd, { passive: false });
  stage.addEventListener('pointercancel', handleProductMobileImageViewerPointerEnd, { passive: false });
  // Safari/iOS usa GestureEvent para parte dos gestos de pinça. Bloqueia o zoom nativo apenas sobre o visualizador.
  ['gesturestart', 'gesturechange'].forEach(type => {
    overlay.addEventListener(type, event => {
      if (overlay.classList.contains('is-open')) event.preventDefault();
    }, { passive: false });
  });
  overlay.addEventListener('touchmove', event => {
    if (overlay.classList.contains('is-open') && event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', handleProductMobileImageViewerKeydown);

  productMobileImageViewer = overlay;
  productMobileImageViewerImage = image;
  productMobileImageViewerSecondaryImage = secondaryImage;
  productMobileImageViewerCounter = counter;
  return overlay;
}

function getProductMobileViewerDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getProductMobileViewerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clampProductMobileViewerTranslation(x, y, scale) {
  const stage = productMobileImageViewer?.querySelector('.product-mobile-image-viewer-stage');
  if (!stage || !productMobileImageViewerImage) return { x: 0, y: 0 };
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const naturalWidth = productMobileImageViewerImage.naturalWidth || width;
  const naturalHeight = productMobileImageViewerImage.naturalHeight || height;
  const fitScale = Math.min(width / naturalWidth, height / naturalHeight);
  const maxX = Math.max(0, (naturalWidth * fitScale * scale - width) / 2);
  const maxY = Math.max(0, (naturalHeight * fitScale * scale - height) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y))
  };
}

function applyProductMobileImageViewerTransform() {
  if (!productMobileImageViewerImage) return;
  const translation = clampProductMobileViewerTranslation(
    productMobileImageViewerTranslateX,
    productMobileImageViewerTranslateY,
    productMobileImageViewerZoom
  );
  productMobileImageViewerTranslateX = translation.x;
  productMobileImageViewerTranslateY = translation.y;
  productMobileImageViewerImage.style.transform = `translate3d(${translation.x.toFixed(2)}px, ${translation.y.toFixed(2)}px, 0) scale(${productMobileImageViewerZoom.toFixed(3)})`;
  productMobileImageViewer?.classList.toggle('is-zoomed', productMobileImageViewerZoom > 1.01);
}

function resetProductMobileImageViewerZoom() {
  productMobileImageViewerZoom = 1;
  productMobileImageViewerTranslateX = 0;
  productMobileImageViewerTranslateY = 0;
  productMobileImageViewerPointers.clear();
  productMobileImageViewerGesture = null;
  applyProductMobileImageViewerTransform();
}

function startProductMobileViewerPinch() {
  const points = [...productMobileImageViewerPointers.values()];
  if (points.length < 2) return;
  const [a, b] = points;
  const midpoint = getProductMobileViewerMidpoint(a, b);
  const stage = productMobileImageViewer?.querySelector('.product-mobile-image-viewer-stage');
  const rect = stage?.getBoundingClientRect();
  if (!rect) return;
  productMobileImageViewerGesture = {
    type: 'pinch',
    startDistance: Math.max(1, getProductMobileViewerDistance(a, b)),
    startZoom: productMobileImageViewerZoom,
    focalX: (midpoint.x - rect.left - rect.width / 2 - productMobileImageViewerTranslateX) / productMobileImageViewerZoom,
    focalY: (midpoint.y - rect.top - rect.height / 2 - productMobileImageViewerTranslateY) / productMobileImageViewerZoom
  };
}

function handleProductMobileImageViewerPointerDown(event) {
  if (!productMobileImageViewer?.classList.contains('is-open') || event.pointerType !== 'touch' || productMobileImageViewerTransition) return;
  event.preventDefault();
  productMobileImageViewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}

  if (productMobileImageViewerPointers.size >= 2) {
    startProductMobileViewerPinch();
    return;
  }

  productMobileImageViewerGesture = {
    type: productMobileImageViewerZoom > 1.01 ? 'pan' : 'swipe',
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastTime: performance.now(),
    velocityX: 0,
    deltaX: 0,
    startTranslateX: productMobileImageViewerTranslateX,
    startTranslateY: productMobileImageViewerTranslateY,
    moved: false
  };
}

function handleProductMobileImageViewerPointerMove(event) {
  if (!productMobileImageViewerPointers.has(event.pointerId) || !productMobileImageViewer?.classList.contains('is-open')) return;
  event.preventDefault();
  productMobileImageViewerPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (productMobileImageViewerPointers.size >= 2) {
    if (productMobileImageViewerGesture?.type !== 'pinch') startProductMobileViewerPinch();
    const points = [...productMobileImageViewerPointers.values()];
    const [a, b] = points;
    const gesture = productMobileImageViewerGesture;
    const stage = productMobileImageViewer?.querySelector('.product-mobile-image-viewer-stage');
    const rect = stage?.getBoundingClientRect();
    if (!gesture || gesture.type !== 'pinch' || !rect) return;

    const midpoint = getProductMobileViewerMidpoint(a, b);
    const scale = Math.max(1, Math.min(PRODUCT_MOBILE_VIEWER_MAX_ZOOM,
      gesture.startZoom * getProductMobileViewerDistance(a, b) / gesture.startDistance));
    const centerX = midpoint.x - rect.left - rect.width / 2;
    const centerY = midpoint.y - rect.top - rect.height / 2;
    productMobileImageViewerZoom = scale;
    productMobileImageViewerTranslateX = centerX - gesture.focalX * scale;
    productMobileImageViewerTranslateY = centerY - gesture.focalY * scale;
    applyProductMobileImageViewerTransform();
    return;
  }

  const gesture = productMobileImageViewerGesture;
  if (!gesture) return;
  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  const now = performance.now();
  gesture.velocityX = (event.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime);
  gesture.lastX = event.clientX;
  gesture.lastTime = now;
  gesture.deltaX = deltaX;
  if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) gesture.moved = true;

  if (gesture.type === 'pan' && productMobileImageViewerZoom > 1.01) {
    productMobileImageViewerTranslateX = gesture.startTranslateX + deltaX;
    productMobileImageViewerTranslateY = gesture.startTranslateY + deltaY;
    applyProductMobileImageViewerTransform();
    return;
  }

  if (gesture.type !== 'swipe' || productMobileImageViewerZoom > 1.01) return;
  if (Math.abs(deltaX) < 8 || Math.abs(deltaX) < Math.abs(deltaY) * 1.1) return;

  const direction = deltaX < 0 ? 1 : -1;
  if (productMobileImageViewerTransition && productMobileImageViewerTransition.direction !== direction) {
    cancelProductMobileImageViewerTransition(false);
  }
  if (!productMobileImageViewerTransition) {
    startProductMobileImageViewerTransition(direction, 'drag');
  }
  applyProductMobileImageViewerDrag(deltaX, direction);
}
function handleProductMobileImageViewerPointerEnd(event) {
  if (!productMobileImageViewerPointers.has(event.pointerId)) return;
  const gesture = productMobileImageViewerGesture;
  productMobileImageViewerPointers.delete(event.pointerId);

  if (productMobileImageViewerPointers.size === 1) {
    const remaining = [...productMobileImageViewerPointers.values()][0];
    productMobileImageViewerGesture = {
      type: 'pan', startX: remaining.x, startY: remaining.y,
      startTranslateX: productMobileImageViewerTranslateX,
      startTranslateY: productMobileImageViewerTranslateY, moved: true
    };
  } else if (!productMobileImageViewerPointers.size) {
    productMobileImageViewerGesture = null;
  }

  if (productMobileImageViewerPointers.size || gesture?.type !== 'swipe' || productMobileImageViewerZoom > 1.01) return;
  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  const stage = productMobileImageViewer?.querySelector('.product-mobile-image-viewer-stage');
  const width = Math.max(1, stage?.clientWidth || window.innerWidth);
  const direction = deltaX < 0 ? 1 : -1;
  const enoughDistance = Math.abs(deltaX) >= Math.max(48, width * 0.16);
  const enoughVelocity = Math.abs(gesture.velocityX || 0) >= 0.45 && Math.abs(deltaX) >= 28;
  const shouldCommit = event.type !== 'pointercancel' && gesture.moved &&
    (enoughDistance || enoughVelocity) && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

  if (productMobileImageViewerTransition?.mode === 'drag') {
    finishProductMobileImageViewerDrag(shouldCommit, direction, deltaX);
  } else if (shouldCommit) {
    startProductMobileImageViewerTransition(direction, 'button');
  }
}
function openProductMobileImageViewer() {
  //if (!isProductMobileTouchDevice() || !productPageImages.length) return;
  const mainImage = document.getElementById('productMainImage');
  if (!mainImage || mainImage.style.display === 'none') return;

  const viewer = ensureProductMobileImageViewer();
  productMobileImageViewerPreviousFocus = document.activeElement;
  productMobileImageViewerPreviousBodyOverflow = document.body.style.overflow;
  productMobileImageViewerPreviousRootOverflow = document.documentElement.style.overflow;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  const selectedIndex = Number.parseInt(mainImage.dataset.index || '0', 10);
  productMobileImageViewerIndex = Number.isFinite(selectedIndex) ? selectedIndex : 0;
  productMobileImageViewerInitialIndex = productMobileImageViewerIndex;
  resetProductMobileImageViewerZoom();
  updateProductMobileImageViewer();
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  viewer.querySelector('.product-mobile-image-viewer-close')?.focus({ preventScroll: true });
}

function preloadProductMobileImageViewerImage(index) {
  if (index < 0 || index >= productPageImages.length) return Promise.resolve(null);
  const original = productPageImages[index];
  const imageSrc = optimizedImage(original, 'modal') || original;
  if (!imageSrc) return Promise.resolve(null);

  let cached = productMobileImageViewerImageCache.get(imageSrc);
  if (!cached) {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.src = imageSrc;
    const ready = typeof image.decode === 'function'
      ? image.decode().then(() => image).catch(() => image.complete && image.naturalWidth ? image : null)
      : new Promise(resolve => {
          if (image.complete) return resolve(image.naturalWidth ? image : null);
          image.addEventListener('load', () => resolve(image), { once: true });
          image.addEventListener('error', () => resolve(null), { once: true });
        });
    cached = { image, ready };
    productMobileImageViewerImageCache.set(imageSrc, cached);
  }
  return cached.ready;
}

function updateProductMobileImageViewer() {
  if (!productMobileImageViewer || !productMobileImageViewerImage || !productPageImages.length) return;
  cancelProductMobileImageViewerTransition(false);
  resetProductMobileImageViewerZoom();
  productMobileImageViewerIndex = (productMobileImageViewerIndex + productPageImages.length) % productPageImages.length;
  const original = productPageImages[productMobileImageViewerIndex];
  const imageSrc = optimizedImage(original, 'modal') || original;
  const requestId = ++productMobileImageViewerRequestId;

  productMobileImageViewerImage.alt = `${currentProduct?.name || 'Produto'} — imagem ${productMobileImageViewerIndex + 1}`;
  if (productMobileImageViewerImage.src !== new URL(imageSrc, window.location.href).href) {
    productMobileImageViewerImage.src = imageSrc;
  }
  productMobileImageViewerImage.style.transition = 'none';
  productMobileImageViewerImage.style.transform = 'translate3d(0,0,0) scale(1)';
  productMobileImageViewerImage.classList.add('is-active');
  productMobileImageViewerImage.classList.remove('is-hidden', 'is-incoming', 'is-ready');
  productMobileImageViewerImage.setAttribute('aria-hidden', 'false');

  if (productMobileImageViewerSecondaryImage) {
    productMobileImageViewerSecondaryImage.classList.add('is-hidden');
    productMobileImageViewerSecondaryImage.classList.remove('is-ready', 'is-active');
    productMobileImageViewerSecondaryImage.style.transition = 'none';
    productMobileImageViewerSecondaryImage.style.transform = 'translate3d(0,0,0) scale(1)';
    productMobileImageViewerSecondaryImage.removeAttribute('src');
    productMobileImageViewerSecondaryImage.setAttribute('aria-hidden', 'true');
  }

  productMobileImageViewerCounter.textContent = `${productMobileImageViewerIndex + 1} / ${productPageImages.length}`;
  const hasMultipleImages = productPageImages.length > 1;
  productMobileImageViewer.querySelectorAll('.product-mobile-image-viewer-nav').forEach(button => {
    button.hidden = !hasMultipleImages;
  });

  requestAnimationFrame(() => {
    if (requestId !== productMobileImageViewerRequestId || !productMobileImageViewer?.classList.contains('is-open')) return;
    if (hasMultipleImages) {
      const previousIndex = (productMobileImageViewerIndex - 1 + productPageImages.length) % productPageImages.length;
      const nextIndex = (productMobileImageViewerIndex + 1) % productPageImages.length;
      preloadProductMobileImageViewerImage(previousIndex);
      if (nextIndex !== previousIndex) preloadProductMobileImageViewerImage(nextIndex);
    }
  });
}

function applyProductMobileImageViewerDrag(deltaX, direction) {
  const transition = productMobileImageViewerTransition;
  if (!transition || transition.mode !== 'drag') return;
  const stage = productMobileImageViewer?.querySelector('.product-mobile-image-viewer-stage');
  const width = Math.max(1, transition.width || stage?.clientWidth || window.innerWidth);
  const boundedDelta = Math.max(-width * 0.96, Math.min(width * 0.96, deltaX));
  transition.lastDelta = boundedDelta;
  if (!stage || !transition.ready) return;

  const incomingOffset = direction > 0 ? width : -width;
  const active = productMobileImageViewerImage;
  const incoming = productMobileImageViewerSecondaryImage;
  active.style.transition = 'none';
  incoming.style.transition = 'none';
  active.style.transform = `translate3d(${boundedDelta.toFixed(2)}px,0,0) scale(1)`;
  incoming.style.transform = `translate3d(${(incomingOffset + boundedDelta).toFixed(2)}px,0,0) scale(1)`;
}

function startProductMobileImageViewerTransition(direction, mode = 'button') {
  if (!productPageImages.length || !productMobileImageViewer?.classList.contains('is-open') || productMobileImageViewerTransition) return Promise.resolve(false);
  if (productPageImages.length <= 1) return Promise.resolve(false);

  const fromIndex = productMobileImageViewerIndex;
  const toIndex = (fromIndex + direction + productPageImages.length) % productPageImages.length;
  const token = ++productMobileImageViewerTransitionToken;
  const stage = productMobileImageViewer.querySelector('.product-mobile-image-viewer-stage');
  const width = Math.max(1, stage?.clientWidth || window.innerWidth);
  const transition = {
    token, direction, mode, fromIndex, toIndex, width,
    ready: false, lastDelta: 0, onEnd: null
  };
  productMobileImageViewerTransition = transition;
  productMobileImageViewer?.classList.add('is-transitioning');

  // Reseta somente a escala; não limpa os ponteiros nem o gesto de swipe em andamento.
  productMobileImageViewerZoom = 1;
  productMobileImageViewerTranslateX = 0;
  productMobileImageViewerTranslateY = 0;
  applyProductMobileImageViewerTransform();

  return preloadProductMobileImageViewerImage(toIndex).then(async readyImage => {
    if (productMobileImageViewerTransition !== transition || token !== productMobileImageViewerTransitionToken || !productMobileImageViewer?.classList.contains('is-open')) return false;
    if (!readyImage?.naturalWidth || !productMobileImageViewerSecondaryImage) {
      productMobileImageViewerTransition = null;
      productMobileImageViewer?.classList.remove('is-transitioning');
      return false;
    }

    const incoming = productMobileImageViewerSecondaryImage;
    const active = productMobileImageViewerImage;
    incoming.src = readyImage.currentSrc || readyImage.src;
    if (typeof incoming.decode === 'function') {
      try { await incoming.decode(); } catch (_) {}
    }
    if (productMobileImageViewerTransition !== transition || token !== productMobileImageViewerTransitionToken) return false;
    incoming.alt = `${currentProduct?.name || 'Produto'} — imagem ${toIndex + 1}`;
    incoming.style.transition = 'none';
    incoming.style.transform = `translate3d(${(direction > 0 ? width : -width).toFixed(2)}px,0,0) scale(1)`;
    incoming.classList.remove('is-hidden');
    incoming.classList.add('is-ready', 'is-incoming');
    incoming.setAttribute('aria-hidden', 'false');
    active.style.transition = 'none';
    active.style.transform = 'translate3d(0,0,0) scale(1)';
    transition.ready = true;

    if (transition.mode === 'drag') {
      const gesture = productMobileImageViewerGesture;
      applyProductMobileImageViewerDrag(gesture?.type === 'swipe' ? (gesture.deltaX || 0) : (transition.lastDelta || 0), direction);
      if (transition.pendingCommit) {
        requestAnimationFrame(() => {
          if (productMobileImageViewerTransition === transition) animateProductMobileImageViewerTransition(true);
        });
      }
    } else {
      requestAnimationFrame(() => {
        if (productMobileImageViewerTransition !== transition) return;
        animateProductMobileImageViewerTransition(true);
      });
    }
    return true;
  }).catch(error => {
    if (productMobileImageViewerTransition === transition) {
      productMobileImageViewerTransition = null;
      productMobileImageViewer?.classList.remove('is-transitioning');
    }
    console.warn('Não foi possível preparar a imagem do visualizador:', error);
    return false;
  });
}

function animateProductMobileImageViewerTransition(commit) {
  const transition = productMobileImageViewerTransition;
  if (!transition?.ready) return;
  const active = productMobileImageViewerImage;
  const incoming = productMobileImageViewerSecondaryImage;
  const width = Math.max(1, transition.width);
  const direction = transition.direction;
  const progress = Math.max(-0.96, Math.min(0.96, (Number(transition.lastDelta) || 0) / width));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0 : Math.max(130, 350 * (1 - Math.abs(progress)));

  clearTimeout(productMobileImageViewerTransitionTimer);
  [active, incoming].forEach(image => {
    image.classList.remove(
      'is-viewer-slide-in-next', 'is-viewer-slide-in-prev',
      'is-viewer-slide-out-next', 'is-viewer-slide-out-prev'
    );
    image.style.transition = 'none';
    image.style.setProperty('--gallery-swipe-progress', `${(progress * 100).toFixed(2)}%`);
    image.style.setProperty('--gallery-swipe-duration', `${duration.toFixed(0)}ms`);
  });

  const token = transition.token;
  if (commit) {
    // Usa as mesmas keyframes, curva e duração do bloco principal da galeria.
    // O progresso percentual permite continuar exatamente de onde o dedo soltou.
    active.style.removeProperty('transform');
    incoming.style.removeProperty('transform');
    void active.offsetWidth;
    transition.endElement = incoming;
    transition.onEnd = event => {
      if (event.target === incoming && event.animationName.startsWith('productGallerySlideIn')) {
        completeProductMobileImageViewerTransition(true, token);
      }
    };
    incoming.addEventListener('animationend', transition.onEnd);
    requestAnimationFrame(() => {
      if (productMobileImageViewerTransition !== transition) return;
      const suffix = direction > 0 ? 'next' : 'prev';
      active.classList.add(`is-viewer-slide-out-${suffix}`);
      incoming.classList.add(`is-viewer-slide-in-${suffix}`);
    });
  } else {
    // Um arraste insuficiente retorna à posição inicial com o mesmo easing
    // de retorno usado pela galeria principal.
    const returnDuration = reducedMotion ? 0 : 240;
    active.style.transition = `transform ${returnDuration}ms cubic-bezier(.22,.61,.36,1)`;
    incoming.style.transition = `transform ${returnDuration}ms cubic-bezier(.22,.61,.36,1)`;
    active.style.transform = 'translate3d(0,0,0) scale(1)';
    incoming.style.transform = `translate3d(${(direction > 0 ? width : -width).toFixed(2)}px,0,0) scale(1)`;
    transition.endElement = active;
    transition.onEnd = event => {
      if (event.target === active && event.propertyName === 'transform') {
        completeProductMobileImageViewerTransition(false, token);
      }
    };
    active.addEventListener('transitionend', transition.onEnd);
  }

  productMobileImageViewerTransitionTimer = setTimeout(
    () => completeProductMobileImageViewerTransition(commit, token),
    duration + 90
  );
}

function completeProductMobileImageViewerTransition(commit, token) {
  const transition = productMobileImageViewerTransition;
  if (!transition || transition.token !== token) return;
  clearTimeout(productMobileImageViewerTransitionTimer);
  const active = productMobileImageViewerImage;
  const incoming = productMobileImageViewerSecondaryImage;
  if (transition.onEnd && transition.endElement) {
    transition.endElement.removeEventListener('animationend', transition.onEnd);
    transition.endElement.removeEventListener('transitionend', transition.onEnd);
  }

  if (commit) {
    productMobileImageViewerImage = incoming;
    productMobileImageViewerSecondaryImage = active;
    productMobileImageViewerIndex = transition.toIndex;
    productMobileImageViewerCounter.textContent = `${productMobileImageViewerIndex + 1} / ${productPageImages.length}`;
    productMobileImageViewerImage.classList.add('is-active');
    productMobileImageViewerImage.classList.remove('is-incoming', 'is-ready', 'is-hidden');
    productMobileImageViewerImage.setAttribute('aria-hidden', 'false');
    productMobileImageViewerSecondaryImage.classList.remove('is-ready', 'is-active');
    productMobileImageViewerSecondaryImage.classList.add('is-incoming', 'is-hidden');
    productMobileImageViewerSecondaryImage.setAttribute('aria-hidden', 'true');
  } else {
    incoming.classList.remove('is-ready');
    incoming.classList.add('is-hidden');
    incoming.setAttribute('aria-hidden', 'true');
  }

  [productMobileImageViewerImage, productMobileImageViewerSecondaryImage].forEach(image => {
    image.classList.remove(
      'is-viewer-slide-in-next', 'is-viewer-slide-in-prev',
      'is-viewer-slide-out-next', 'is-viewer-slide-out-prev'
    );
    image.style.transition = 'none';
    image.style.transform = 'translate3d(0,0,0) scale(1)';
    image.style.removeProperty('--gallery-swipe-progress');
    image.style.removeProperty('--gallery-swipe-duration');
  });
  productMobileImageViewerTransition = null;
  productMobileImageViewerZoom = 1;
  productMobileImageViewerTranslateX = 0;
  productMobileImageViewerTranslateY = 0;
  productMobileImageViewer?.classList.remove('is-zoomed', 'is-transitioning');

  if (commit) {
    requestAnimationFrame(() => {
      if (!productMobileImageViewer?.classList.contains('is-open')) return;
      const previousIndex = (productMobileImageViewerIndex - 1 + productPageImages.length) % productPageImages.length;
      const nextIndex = (productMobileImageViewerIndex + 1) % productPageImages.length;
      preloadProductMobileImageViewerImage(previousIndex);
      if (nextIndex !== previousIndex) preloadProductMobileImageViewerImage(nextIndex);
    });
  }
}

function finishProductMobileImageViewerDrag(commit, direction, deltaX) {
  const transition = productMobileImageViewerTransition;
  if (!transition || transition.mode !== 'drag') {
    if (commit) startProductMobileImageViewerTransition(direction, 'button');
    return;
  }
  if (transition.direction !== direction && commit) {
    cancelProductMobileImageViewerTransition(false);
    startProductMobileImageViewerTransition(direction, 'button');
    return;
  }
  if (!transition.ready) {
    if (commit) {
      transition.lastDelta = Math.max(-transition.width * 0.96, Math.min(transition.width * 0.96, deltaX));
      transition.pendingCommit = true;
      return;
    }
    cancelProductMobileImageViewerTransition(false);
    return;
  }
  if (Math.abs(deltaX) < 4 && !commit) {
    cancelProductMobileImageViewerTransition(false);
    return;
  }
  animateProductMobileImageViewerTransition(commit);
}

function cancelProductMobileImageViewerTransition(animateBack = false) {
  const transition = productMobileImageViewerTransition;
  if (!transition) return;
  if (animateBack && transition.ready) {
    animateProductMobileImageViewerTransition(false);
    return;
  }
  ++productMobileImageViewerTransitionToken;
  clearTimeout(productMobileImageViewerTransitionTimer);
  if (transition.onEnd && transition.endElement) {
    transition.endElement.removeEventListener('animationend', transition.onEnd);
    transition.endElement.removeEventListener('transitionend', transition.onEnd);
  }
  [productMobileImageViewerImage, productMobileImageViewerSecondaryImage].forEach(image => {
    if (!image) return;
    image.classList.remove(
      'is-viewer-slide-in-next', 'is-viewer-slide-in-prev',
      'is-viewer-slide-out-next', 'is-viewer-slide-out-prev'
    );
    image.style.transition = 'none';
    image.style.transform = 'translate3d(0,0,0) scale(1)';
    image.style.removeProperty('--gallery-swipe-progress');
    image.style.removeProperty('--gallery-swipe-duration');
  });
  productMobileImageViewerSecondaryImage?.classList.remove('is-ready');
  productMobileImageViewerSecondaryImage?.classList.add('is-hidden');
  productMobileImageViewerSecondaryImage?.setAttribute('aria-hidden', 'true');
  productMobileImageViewerTransition = null;
  productMobileImageViewer?.classList.remove('is-transitioning');
}

function moveProductMobileImageViewer(direction) {
  if (!productPageImages.length || !productMobileImageViewer?.classList.contains('is-open') || productMobileImageViewerTransition) return;
  startProductMobileImageViewerTransition(direction, 'button');
}
function closeProductMobileImageViewer() {
  if (!productMobileImageViewer?.classList.contains('is-open')) return;
  cancelProductMobileImageViewerTransition(false);
  productMobileImageViewer.classList.remove('is-open');
  productMobileImageViewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = productMobileImageViewerPreviousBodyOverflow;
  document.documentElement.style.overflow = productMobileImageViewerPreviousRootOverflow;
  resetProductMobileImageViewerZoom();
  // Atualiza a galeria somente ao fechar; evita recarregar a imagem principal e o fundo desfocado a cada swipe.
  if (productMobileImageViewerIndex !== productMobileImageViewerInitialIndex) {
    selectProductImage(productMobileImageViewerIndex);
    productMobileImageViewerInitialIndex = productMobileImageViewerIndex;
  }
  if (productMobileImageViewerPreviousFocus?.isConnected) {
    productMobileImageViewerPreviousFocus.focus({ preventScroll: true });
  }
}

function handleProductMobileImageViewerKeydown(event) {
  if (!productMobileImageViewer?.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeProductMobileImageViewer();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveProductMobileImageViewer(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveProductMobileImageViewer(1);
  }
}

function handleProductImageZoomIncrease(event) {
  if (!isProductDesktopZoomDevice() || event.button !== 0 || !isProductImageZoomTarget(event)) return;
  productZoomLevel = Math.min(PRODUCT_ZOOM_MAX_LEVEL, productZoomLevel + 1);
  updateProductImageZoomLevel();
  handleProductImageZoomMove(event);
}

function handleProductImageZoomDecrease(event) {
  if (!isProductDesktopZoomDevice() || !isProductImageZoomTarget(event)) return;
  event.preventDefault();
  productZoomLevel = Math.max(-PRODUCT_ZOOM_MAX_LEVEL, productZoomLevel - 1);
  updateProductImageZoomLevel();
  handleProductImageZoomMove(event);
}

function syncProductImageZoomSource() {
  const mainImage = document.getElementById('productMainImage');
  if (!mainImage || !productZoomPreviewImage) return;
  const source = mainImage.dataset.original || mainImage.currentSrc || mainImage.src;
  if (source && productZoomPreviewImage.src !== new URL(source, window.location.href).href) {
    productZoomPreviewImage.src = source;
  }
}

function updateProductImageZoomPosition() {
  if (!productZoomPreview || !productZoomGallery || !productZoomPreview.classList.contains('is-visible')) return;

  const rect = productZoomGallery.getBoundingClientRect();
  const gap = 16;
  const size = Math.min(340, window.innerWidth - 24, window.innerHeight - 24);
  const rightSpace = window.innerWidth - rect.right;
  const leftSpace = rect.left;
  let left;

  if (rightSpace >= size + gap) left = rect.right + gap;
  else if (leftSpace >= size + gap) left = rect.left - size - gap;
  else left = Math.max(12, Math.min(window.innerWidth - size - 12, rect.right + gap));

  const top = Math.max(12, Math.min(rect.top, window.innerHeight - size - 12));
  productZoomPreview.style.width = `${size}px`;
  productZoomPreview.style.height = `${size}px`;
  productZoomPreview.style.left = `${left}px`;
  productZoomPreview.style.top = `${top}px`;
}

function hideProductImageZoom() {
  if (!productZoomPreview) return;
  productZoomPreview.classList.remove('is-visible');
  productZoomPreview.setAttribute('aria-hidden', 'true');
}

let productGallerySelectionRequestId = 0;
let productGalleryTransitionTimer = null;
let productGalleryLoadingTimer = null;
let productGalleryLoader = null;
const PRODUCT_GALLERY_FADE_DURATION = 220;
const PRODUCT_GALLERY_LOADING_DELAY = 140;

function normalizeProductGalleryImageSrc(src) {
  try {
    return new URL(src, document.baseURI).href;
  } catch (_) {
    return String(src || '');
  }
}

// `complete` e `naturalWidth` sozinhos podem ainda descrever a imagem anterior
// logo apos trocar o src. Tambem exigimos que currentSrc corresponda ao pedido.
function isProductGalleryImageReadyForSource(image, src) {
  if (!image || !src || !image.complete || image.naturalWidth <= 0 || !image.currentSrc) return false;
  const expectedSrc = normalizeProductGalleryImageSrc(src);
  const currentSrc = normalizeProductGalleryImageSrc(image.currentSrc);
  return currentSrc === expectedSrc;
}

function preloadProductGalleryImage(src, priority = 'high') {
  const cached = productGalleryImageLoadCache.get(src);
  if (cached) return cached.promise;

  const image = new Image();
  const entry = { loaded: false, promise: null };
  entry.promise = new Promise(resolve => {
    let settled = false;
    const finish = success => {
      if (settled) return;
      settled = true;
      resolve(success);
    };

    image.decoding = 'async';
    image.loading = 'eager';
    image.fetchPriority = priority;
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete) finish(image.naturalWidth > 0);
  }).then(async success => {
    if (!success) {
      if (productGalleryImageLoadCache.get(src) === entry) productGalleryImageLoadCache.delete(src);
      return false;
    }

    if (typeof image.decode === 'function') {
      try { await image.decode(); } catch (_) {}
    }
    entry.loaded = true;
    return true;
  });

  productGalleryImageLoadCache.set(src, entry);
  return entry.promise;
}

function preloadProductGalleryNeighborImages(index) {
  if (productPageImages.length < 2) return;
  const neighborIndexes = [
    (index - 1 + productPageImages.length) % productPageImages.length,
    (index + 1) % productPageImages.length
  ];
  neighborIndexes.forEach(neighborIndex => {
    const source = productPageImages[neighborIndex];
    const src = optimizedImage(source, 'modal') || source;
    if (src) preloadProductGalleryImage(src, 'low');
  });
}

function getProductGalleryDominantBlurImage(images) {
  const loaded = images.filter(image => {
    const loadedSrc = image.dataset.loadedSrc;
    return loadedSrc && isProductGalleryImageReadyForSource(image, loadedSrc);
  });
  if (!loaded.length) return null;
  return loaded.reduce((best, image) => {
    const opacity = Number.parseFloat(getComputedStyle(image).opacity) || 0;
    const bestOpacity = best ? (Number.parseFloat(getComputedStyle(best).opacity) || 0) : -1;
    const isVisible = image.classList.contains('is-visible');
    const bestIsVisible = best?.classList.contains('is-visible') || false;
    if (opacity > bestOpacity || (opacity === bestOpacity && isVisible && !bestIsVisible)) return image;
    return best;
  }, null);
}

function hideProductGalleryBlurLayerImmediately(image) {
  if (!image) return;
  image.style.setProperty('transition-property', 'none', 'important');
  image.classList.remove('is-visible');
  void image.offsetWidth;
  image.style.removeProperty('transition-property');
}

function scheduleProductGalleryLoader(requestId) {
  clearTimeout(productGalleryLoadingTimer);
  const gallery = document.getElementById('galleryMain');
  if (gallery) gallery.setAttribute('aria-busy', 'true');
  productGalleryLoadingTimer = setTimeout(() => {
    if (requestId !== productGallerySelectionRequestId || !productGalleryLoader) return;
    productGalleryLoader.classList.add('is-visible');
    productGalleryLoader.setAttribute('aria-hidden', 'false');
  }, PRODUCT_GALLERY_LOADING_DELAY);
}

function hideProductGalleryLoader(requestId = null) {
  if (requestId !== null && requestId !== productGallerySelectionRequestId) return;
  clearTimeout(productGalleryLoadingTimer);
  if (productGalleryLoader) {
    productGalleryLoader.classList.remove('is-visible');
    productGalleryLoader.setAttribute('aria-hidden', 'true');
  }
  const gallery = document.getElementById('galleryMain');
  if (gallery) gallery.setAttribute('aria-busy', 'false');
}

function clearProductGallerySlideTransition() {
  clearTimeout(productGallerySlideCleanupTimer);
  productGallerySlideCleanupTimer = null;

  if (productGallerySlideMainImage && productGallerySlideEndHandler) {
    productGallerySlideMainImage.removeEventListener('animationend', productGallerySlideEndHandler);
  }
  productGallerySlideMainImage?.classList.remove('is-slide-in-next', 'is-slide-in-prev', 'is-fading-out');
  productGallerySlideMainImage?.style.removeProperty('--gallery-swipe-progress');
  productGallerySlideMainImage?.style.removeProperty('--gallery-swipe-duration');
  document.getElementById('productMainImage')?.classList.remove('is-fading-out');
  document.getElementById('productMainImage')?.style.removeProperty('--gallery-swipe-progress');
  document.getElementById('productMainImage')?.style.removeProperty('--gallery-swipe-duration');
  productGallerySlideOutgoingImage?.remove();
  productGallerySlideMainImage = null;
  productGallerySlideOutgoingImage = null;
  productGallerySlideEndHandler = null;

  document.getElementById('galleryMain')?.classList.remove('is-sliding-image');
}

function startProductGallerySlideTransition(mainImage, outgoingImage, direction, requestId) {
  if (!mainImage || !outgoingImage) return;

  const gallery = document.getElementById('galleryMain');
  const enterClass = direction === 'prev' ? 'is-slide-in-prev' : 'is-slide-in-next';
  const exitClass = direction === 'prev' ? 'is-slide-out-prev' : 'is-slide-out-next';
  const finish = () => {
    if (requestId !== productGallerySelectionRequestId) return;
    clearProductGallerySlideTransition();
  };

  productGallerySlideMainImage = mainImage;
  productGallerySlideOutgoingImage = outgoingImage;
  productGallerySlideEndHandler = event => {
    if (event.target === mainImage && event.animationName.startsWith('productGallerySlideIn')) finish();
  };
  mainImage.addEventListener('animationend', productGallerySlideEndHandler);
  gallery?.classList.add('is-sliding-image');

  requestAnimationFrame(() => {
    if (requestId !== productGallerySelectionRequestId || productGallerySlideOutgoingImage !== outgoingImage || productGallerySlideMainImage !== mainImage) return;
    outgoingImage.classList.add(exitClass);
    mainImage.classList.add(enterClass);
  });

  // Fallback para prefers-reduced-motion ou navegadores sem animationend.
  productGallerySlideCleanupTimer = setTimeout(finish, 430);
}

function selectProductImage(index, direction = null, swipeTransition = null) {
  hideProductImageZoom();
  if (!swipeTransition) {
    clearTimeout(productGallerySwipeReturnTimer);
    const returningImage = document.getElementById('productMainImage');
    returningImage?.classList.remove('is-swipe-returning');
    returningImage?.style.removeProperty('transform');
    returningImage?.style.removeProperty('transition');
    document.getElementById('galleryMain')?.classList.remove('is-touch-dragging');
  }
  clearProductGallerySlideTransition();
  const mainImage = document.getElementById('productMainImage');
  const gallery = document.getElementById('galleryMain');
  const blurImages = [
    document.getElementById('productMainBlurImage'),
    document.getElementById('productMainBlurImageNext')
  ].filter(Boolean);
  const emoji = document.getElementById('gmainEmoji');

  if (!mainImage || !gallery || !emoji || !currentProduct) return;

  if (!productPageImages.length) {
    productGallerySelectionRequestId++;
    productGallerySelectedIndex = 0;
    clearProductGallerySlideTransition();
    clearTimeout(productGalleryTransitionTimer);
    hideProductGalleryLoader(productGallerySelectionRequestId);
    mainImage.style.display = 'none';
    mainImage.classList.remove('is-fading-out');
    blurImages.forEach(image => image.classList.remove('is-visible'));
    emoji.style.display = 'block';
    return;
  }

  index = direction === 'next' || direction === 'prev'
    ? ((Number(index) % productPageImages.length) + productPageImages.length) % productPageImages.length
    : Math.max(0, Math.min(productPageImages.length - 1, Number(index) || 0));
  productGallerySelectedIndex = index;
  const original = productPageImages[index];
  const imageSrc = optimizedImage(original, 'modal') || original;
  const requestId = ++productGallerySelectionRequestId;
  const hadVisibleImage = mainImage.style.display !== 'none' && !!mainImage.src;
  const cachedImage = productGalleryImageLoadCache.get(imageSrc);
  clearTimeout(productGalleryTransitionTimer);
  if (cachedImage?.loaded) hideProductGalleryLoader(requestId);
  else scheduleProductGalleryLoader(requestId);

  // Atualiza a seleção visual imediatamente, sem esperar o carregamento da imagem.
  document.querySelectorAll('#galleryThumbs .gthumb').forEach((button, i) => {
    button.classList.toggle('on', i === index);
  });

  if (mainImage.dataset.original === original && mainImage.style.display !== 'none') {
    hideProductGalleryLoader(requestId);
    mainImage.dataset.index = String(index);
    mainImage.alt = `${currentProduct.name} — imagem ${index + 1}`;
    mainImage.classList.remove('is-fading-out');
    const matchingBlur = blurImages.find(image => {
      const loadedSrc = image.dataset.loadedSrc;
      return image.dataset.original === original && loadedSrc && isProductGalleryImageReadyForSource(image, loadedSrc);
    });
    if (matchingBlur) {
      const revealMatchingBlur = () => {
        if (requestId !== productGallerySelectionRequestId || matchingBlur.dataset.original !== original) return;
        if (!isProductGalleryImageReadyForSource(matchingBlur, matchingBlur.dataset.loadedSrc)) return;
        blurImages.forEach(image => {
          if (image === matchingBlur) image.classList.add('is-visible');
          else hideProductGalleryBlurLayerImmediately(image);
        });
      };
      matchingBlur.onload = revealMatchingBlur;
      revealMatchingBlur();
      preloadProductGalleryNeighborImages(index);
      return;
    }
  }

  preloadProductGalleryImage(imageSrc).then(async optimizedReady => {
    if (requestId !== productGallerySelectionRequestId) return;

    let finalImageSrc = imageSrc;
    if (!optimizedReady && imageSrc !== original) {
      const originalReady = await preloadProductGalleryImage(original);
      if (requestId !== productGallerySelectionRequestId) return;
      if (originalReady) finalImageSrc = original;
    }

    if (requestId !== productGallerySelectionRequestId) return;

    // O fundo antigo permanece intacto até a nova camada desfocada estar pronta.
    // Nas setas, a foto principal usa uma transição direcional; nas miniaturas,
    // preservamos o fade tradicional já existente.
    clearTimeout(productGalleryLoadingTimer);
    if (!direction) mainImage.classList.add('is-fading-out');

    const applyNewImage = () => {
      if (requestId !== productGallerySelectionRequestId) return;

      let mainImageReady = false;
      let blurImageReady = !blurImages.length;
      const finishGalleryImageLoading = () => {
        if (mainImageReady && blurImageReady) hideProductGalleryLoader(requestId);
      };

      const currentBlurImage = getProductGalleryDominantBlurImage(blurImages);
      blurImages.forEach(image => {
        if (image !== currentBlurImage) hideProductGalleryBlurLayerImmediately(image);
        else image.classList.add('is-visible');
      });
      const nextBlurImage = blurImages.find(image => image !== currentBlurImage) || blurImages[0] || null;
      const swipeProgress = swipeTransition ? Math.max(-0.96, Math.min(0.96, Number(swipeTransition.progress) || 0)) : 0;
      let outgoingImage = null;

      if (direction && hadVisibleImage) {
        outgoingImage = mainImage.cloneNode(false);
        outgoingImage.removeAttribute('id');
        outgoingImage.className = 'product-gallery-slide-out';
        outgoingImage.alt = '';
        outgoingImage.setAttribute('aria-hidden', 'true');
        outgoingImage.draggable = false;
        outgoingImage.setAttribute('draggable', 'false');
        outgoingImage.style.removeProperty('transform');
        outgoingImage.style.removeProperty('transition');
        outgoingImage.style.setProperty('--gallery-swipe-progress', `${(swipeProgress * 100).toFixed(2)}%`);
        if (swipeTransition) outgoingImage.style.setProperty('--gallery-swipe-duration', `${Math.max(130, 350 * (1 - Math.abs(swipeProgress))).toFixed(0)}ms`);
        outgoingImage.src = mainImage.currentSrc || mainImage.src;
        productGallerySlideOutgoingImage = outgoingImage;
        gallery.insertBefore(outgoingImage, mainImage.nextSibling);
      }

      mainImage.style.removeProperty('transform');
      mainImage.style.removeProperty('transition');
      mainImage.style.setProperty('--gallery-swipe-progress', `${(swipeProgress * 100).toFixed(2)}%`);
      if (swipeTransition) mainImage.style.setProperty('--gallery-swipe-duration', `${Math.max(130, 350 * (1 - Math.abs(swipeProgress))).toFixed(0)}ms`);
      else mainImage.style.removeProperty('--gallery-swipe-duration');

      mainImage.dataset.original = original;
      mainImage.dataset.index = String(index);
      mainImage.dataset.fallback = finalImageSrc === original ? '1' : '0';
      mainImage.alt = `${currentProduct.name} — imagem ${index + 1}`;

      if (nextBlurImage) {
        let nextBlurImageReady = false;
        let expectedBlurSrc = finalImageSrc;
        const activateNextBlurImage = () => {
          if (requestId !== productGallerySelectionRequestId || nextBlurImageReady) return;
          if (nextBlurImage.dataset.original !== original || mainImage.dataset.original !== original) return;
          if (!isProductGalleryImageReadyForSource(nextBlurImage, expectedBlurSrc)) return;
          nextBlurImageReady = true;
          nextBlurImage.dataset.loadedSrc = normalizeProductGalleryImageSrc(expectedBlurSrc);
          // Normaliza qualquer crossfade interrompido: a camada de saída é a foto
          // visualmente dominante; a entrada fica escondida até estar decodificada.
          blurImages.forEach(image => {
            if (image !== nextBlurImage && image !== currentBlurImage) hideProductGalleryBlurLayerImmediately(image);
          });
          // As duas camadas mantêm o blur fixo; somente opacity faz o crossfade.
          nextBlurImage.classList.add('is-visible');
          if (currentBlurImage) currentBlurImage.classList.remove('is-visible');
          blurImageReady = true;
          finishGalleryImageLoading();
        };

        const nextBlurImageAlreadyReady =
          nextBlurImage.dataset.original === original &&
          nextBlurImage.dataset.loadedSrc === normalizeProductGalleryImageSrc(finalImageSrc) &&
          isProductGalleryImageReadyForSource(nextBlurImage, finalImageSrc);
        nextBlurImage.dataset.original = original;
        nextBlurImage.dataset.fallback = finalImageSrc === original ? '1' : '0';
        nextBlurImage.onload = activateNextBlurImage;
        nextBlurImage.onerror = function () {
          if (requestId !== productGallerySelectionRequestId) return;
          if (this.dataset.fallback !== '1') {
            this.dataset.fallback = '1';
            expectedBlurSrc = this.dataset.original;
            this.src = expectedBlurSrc;
            if (isProductGalleryImageReadyForSource(this, expectedBlurSrc)) activateNextBlurImage();
          } else {
            this.classList.remove('is-visible');
            blurImageReady = true;
            finishGalleryImageLoading();
          }
        };

        if (nextBlurImageAlreadyReady) {
          activateNextBlurImage();
        } else {
          // A camada permanece invisível até o novo src ser de fato carregado.
          // Não usamos `complete` isoladamente: ele pode ainda refletir a foto antiga.
          expectedBlurSrc = finalImageSrc;
          nextBlurImage.src = expectedBlurSrc;
          if (isProductGalleryImageReadyForSource(nextBlurImage, expectedBlurSrc)) activateNextBlurImage();
        }
      }

      let expectedMainSrc = finalImageSrc;
      mainImage.onload = () => {
        if (requestId !== productGallerySelectionRequestId || mainImageReady) return;
        if (!isProductGalleryImageReadyForSource(mainImage, expectedMainSrc)) return;
        mainImage.style.display = 'block';
        emoji.style.display = 'none';
        mainImage.dataset.loadedSrc = normalizeProductGalleryImageSrc(expectedMainSrc);
        syncProductImageZoomSource();
        mainImageReady = true;
        preloadProductGalleryNeighborImages(index);
        requestAnimationFrame(() => {
          if (requestId !== productGallerySelectionRequestId) return;
          if (outgoingImage && direction) {
            mainImage.classList.remove('is-fading-out');
            startProductGallerySlideTransition(mainImage, outgoingImage, direction, requestId);
          } else {
            mainImage.classList.remove('is-fading-out');
          }
          finishGalleryImageLoading();
        });
      };

      mainImage.onerror = function () {
        if (requestId !== productGallerySelectionRequestId) return;
        if (expectedMainSrc !== original) {
          expectedMainSrc = original;
          this.dataset.fallback = '1';
          this.src = expectedMainSrc;
          if (isProductGalleryImageReadyForSource(this, expectedMainSrc)) this.onload?.();
          return;
        }
        clearProductGallerySlideTransition();
        this.style.display = 'none';
        this.classList.remove('is-fading-out', 'is-slide-in-next', 'is-slide-in-prev');
        blurImages.forEach(image => image.classList.remove('is-visible'));
        emoji.style.display = 'block';
        hideProductGalleryLoader(requestId);
        hideProductImageZoom();
      };

      mainImage.src = expectedMainSrc;
      // Se o recurso já estiver no cache, só concluímos quando currentSrc
      // confirmar que a imagem atual corresponde ao novo endereço.
      if (isProductGalleryImageReadyForSource(mainImage, expectedMainSrc)) mainImage.onload?.();
      finishGalleryImageLoading();
    };

    if (hadVisibleImage && !direction) {
      productGalleryTransitionTimer = setTimeout(applyNewImage, PRODUCT_GALLERY_FADE_DURATION);
    } else {
      applyNewImage();
    }
  }).catch(error => {
    if (requestId !== productGallerySelectionRequestId) return;
    console.warn('Não foi possível preparar a imagem do produto:', error);
    mainImage.classList.remove('is-fading-out');
    hideProductGalleryLoader(requestId);
  });
}

/* ── PRODUTOS RECOMENDADOS: CARROSSEL INCREMENTAL ───────────── */
const RELATED_FETCH_BATCH_SIZE = 12;
let relatedCarouselState = null;

function relatedVisibleCount() {
  if (window.matchMedia('(max-width: 768px)').matches) return 2;
  if (window.matchMedia('(max-width: 1100px)').matches) return 3;
  return 4;
}

function shuffleRelatedBatch(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function relatedProductImageUrl(product) {
  const original = imageList(product)[0];
  return original ? (optimizedImage(original, 'grid') || original) : '';
}

function preloadRelatedProduct(product, state) {
  const id = String(product.id);
  const src = relatedProductImageUrl(product);
  if (!src || state.preloadedIds.has(id)) return state.preloadedImages.get(id) || null;

  state.preloadedIds.add(id);
  const image = new Image();
  image.decoding = 'async';
  // Só pré-carregamos a imagem do próximo produto, então ela pode ter prioridade alta.
  image.fetchPriority = 'high';
  const decodeWhenReady = () => {
    if (image.naturalWidth <= 0 || typeof image.decode !== 'function') return;
    image.decode().catch(() => {});
  };
  image.addEventListener('load', decodeWhenReady, { once: true });
  image.addEventListener('error', () => {}, { once: true });

  image.src = src;
  state.preloadedImages.set(id, image);

  // A imagem pode vir do cache e já estar completa quando src é definido.
  if (image.complete && image.naturalWidth > 0) decodeWhenReady();
  return image;
}

async function loadRelatedBatch(state) {
  if (state.loadingPromise) return state.loadingPromise;
  if (state.exhausted) return;

  state.loadingPromise = (async () => {
    try {
      if (state.total === null && !state.countChecked) {
        state.countChecked = true;
        const countResult = await supabaseClient
          .from('products')
          .select('id', { count: 'exact', head: true });

        if (countResult.error) {
          console.warn('Não foi possível contar os produtos recomendados; usando paginação sequencial.', countResult.error);
          state.cursor = 0;
        } else {
          state.total = Number(countResult.count) || 0;
          if (state.total <= 0) {
            state.exhausted = true;
            return;
          }
          // Começa em um ponto aleatório sem baixar o catálogo inteiro.
          state.cursor = Math.floor(Math.random() * state.total);
        }
      }

      const from = Math.max(0, state.cursor);
      const to = state.total === null
        ? from + RELATED_FETCH_BATCH_SIZE - 1
        : Math.min(from + RELATED_FETCH_BATCH_SIZE - 1, state.total - 1);

      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      state.scannedRows += rows.length;

      if (state.total !== null) {
        state.cursor = to >= state.total - 1 ? 0 : to + 1;
        if (state.scannedRows >= state.total || rows.length === 0) {
          state.exhausted = true;
        }
      } else {
        state.cursor = from + rows.length;
        if (rows.length < RELATED_FETCH_BATCH_SIZE) state.exhausted = true;
      }

      const candidates = shuffleRelatedBatch(rows)
        .map(raw => typeof normalizeProduct === 'function' ? normalizeProduct(raw) : raw)
        .filter(product => product && String(product.id) !== state.currentId)
        .filter(product => !(typeof isProductUnavailable === 'function' && isProductUnavailable(product)))
        .filter(product => !state.knownIds.has(String(product.id)));

      candidates.forEach(product => {
        const id = String(product.id);
        state.knownIds.add(id);
        state.pool.push(product);
      });

      // Nunca faz uma requisição sem fim se todos os registros já foram varridos.
      if (state.total !== null && state.scannedRows >= state.total) {
        state.exhausted = true;
      }
    } catch (error) {
      state.fetchError = error;
      state.exhausted = true;
      console.error('Erro ao carregar produtos recomendados:', error);
    } finally {
      state.loadingPromise = null;
      updateRelatedControls(state);
    }
  })();

  return state.loadingPromise;
}

async function takeNextRelatedProduct(state) {
  while (!state.pool.length && !state.exhausted) {
    await loadRelatedBatch(state);
  }
  return state.pool.shift() || null;
}

async function reserveNextRelatedProduct(state) {
  if (state.reservedNext || state.reservingNext || (state.exhausted && !state.pool.length)) return;
  state.reservingNext = true;

  try {
    const product = await takeNextRelatedProduct(state);
    if (!product) return;

    state.reservedNext = product;
    preloadRelatedProduct(product, state);
  } finally {
    state.reservingNext = false;
    updateRelatedControls(state);
  }
}

function relatedProductCardHTML(product) {
  const id = safeHtml(product.id);
  const name = safeHtml(product.name || 'Produto sem nome');
  const img = relatedProductImageUrl(product);

  const picture = img
    ? `<img class="product-image-reveal" src="${safeHtml(img)}" alt="${name}" loading="eager" decoding="async" fetchpriority="low" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
    : safeHtml(product.emoji || '📦');

  const inFav = typeof fav !== 'undefined' && Array.isArray(fav) &&
    fav.some(item => String(item.id) === String(product.id));

  const badge = product.badge === 'hot'
    ? '<span class="bpill bhot">🔥 Hot</span>'
    : product.badge === 'new'
      ? '<span class="bpill bnew">Novo</span>'
      : Number(product.discount) > 0
        ? `<span class="bpill bsale">-${Number(product.discount)}%</span>`
        : '';

  const old = Number(product.old) > Number(product.price)
    ? `<span class="pold">${safeHtml(priceText(product.old))}</span>`
    : '';

  const discount = Number(product.discount) > 0
    ? `<span class="pdisc">-${Number(product.discount)}%</span>`
    : '';

  return `
    <div class="pcard related-product-card" data-related-product="${id}" tabindex="0" role="link" aria-label="Ver ${name}">
      <div class="pimg-wrap">
        <div class="pimg" style="position:relative;">${picture}</div>
        <div class="pbadges">${badge}</div>
        <button type="button" class="pwish-btn ${inFav ? 'on' : ''}" data-related-fav="${id}" aria-label="Favoritar ${name}" title="Favoritar">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="pactions">
          <button type="button" class="btn-ac" data-related-cart="${id}">Carrinho</button>
        </div>
      </div>
      <div class="pinfo">
        <div class="pcat">${safeHtml(categoryText(product))}</div>
        <div class="pname" data-no-translate>${name}</div>
        <div class="prating"><span class="pstars">${starsText(product.rating)}</span><span class="prcnt">(${(Number(product.reviews) || 0).toLocaleString('pt-BR')})</span></div>
        <div class="price-row"><span class="pprice">${safeHtml(priceText(product.price))}</span>${old}${discount}</div>
      </div>
    </div>`;
}

function bindRelatedCard(card, product, state) {
  // Mantém somente produtos efetivamente exibidos no cache global usado pelo carrinho/favoritos.
  if (typeof products !== 'undefined' && Array.isArray(products) &&
      !products.some(item => String(item.id) === String(product.id))) {
    products.push(product);
  }

  card.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    location.href = `/product/${encodeURIComponent(String(product.id))}`;
  });

  card.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button')) {
      event.preventDefault();
      location.href = `/product/${encodeURIComponent(String(product.id))}`;
    }
  });

  const favButton = card.querySelector('[data-related-fav]');
  if (favButton) {
    favButton.addEventListener('click', event => {
      event.stopPropagation();
      if (typeof toggleFav === 'function') toggleFav(favButton.dataset.relatedFav);
      setTimeout(updateProductFavoriteButtons, 0);
      favButton.classList.toggle('on', Array.isArray(fav) && fav.some(item => String(item.id) === String(product.id)));
    });
  }

  const cartButton = card.querySelector('[data-related-cart]');
  if (cartButton) {
    cartButton.addEventListener('click', event => {
      event.stopPropagation();
      if (typeof addToCart === 'function') addToCart(cartButton.dataset.relatedCart, 1);
    });
  }
}

function relatedPendingCardHTML() {
  return `
    <div class="related-skeleton-card related-pending-card" aria-hidden="true">
      <div class="skeleton-shimmer rsk-image"></div>
      <div class="rsk-info">
        <span class="skeleton-shimmer rsk-line"></span>
        <span class="skeleton-shimmer rsk-line rsk-line-short"></span>
        <span class="skeleton-shimmer rsk-price"></span>
      </div>
    </div>`;
}

function ensureRelatedPendingCard(state) {
  if (state.pendingPlaceholder && state.pendingPlaceholder.isConnected) {
    return state.pendingPlaceholder;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = relatedPendingCardHTML().trim();
  const placeholder = wrapper.firstElementChild;
  state.grid.appendChild(placeholder);
  state.pendingPlaceholder = placeholder;
  return placeholder;
}

function prepareRelatedCardImages(card) {
  // Usa o mesmo controlador de revelação empregado em /products.
  if (typeof prepareProductImageAnimations === 'function') {
    prepareProductImageAnimations(card);
    return;
  }

  // Fallback seguro caso a função compartilhada não esteja disponível.
  card.querySelectorAll('img.product-image-reveal').forEach(img => {
    const markLoaded = () => requestAnimationFrame(() => img.classList.add('is-loaded'));
    if (img.complete) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    }
  });
}

function relatedCarouselStep(state) {
  const card = state.grid.querySelector('.pcard, .related-skeleton-card');
  if (!card) return state.grid.clientWidth;
  const styles = getComputedStyle(state.grid);
  const gap = parseFloat(styles.columnGap || styles.gap) || 0;
  return card.getBoundingClientRect().width + gap;
}

async function appendNextRelatedCard(state, suppliedPlaceholder = null) {
  if (state.appending) return;
  if (state.exhausted && !state.reservedNext && !state.pool.length && !state.loadingPromise && !state.reservingNext) {
    updateRelatedControls(state);
    return;
  }

  state.appending = true;
  let placeholder = suppliedPlaceholder || (state.pendingPlaceholder?.isConnected ? state.pendingPlaceholder : null);

  try {
    let product = state.reservedNext;
    state.reservedNext = null;

    // Ao adicionar depois do primeiro lote, insere um cartão de tamanho fixo ANTES
    // de aguardar a consulta. O scroll pode começar imediatamente e não pula depois.
    if (!product && state.hasRendered && !placeholder) {
      placeholder = ensureRelatedPendingCard(state);
    }

    if (!product) product = await takeNextRelatedProduct(state);

    if (!product) {
      if (placeholder?.isConnected) placeholder.remove();
      if (state.pendingPlaceholder === placeholder) state.pendingPlaceholder = null;

      if (!state.grid.querySelector('.pcard')) {
        state.grid.innerHTML = '<p class="related-empty">Não há outros produtos disponíveis para recomendar.</p>';
      }
      state.section.classList.remove('is-loading');
      state.section.setAttribute('aria-busy', 'false');
      updateRelatedControls(state);
      return;
    }

    if (!state.hasRendered) {
      // Remove apenas os skeletons iniciais, preservando eventual placeholder de navegação.
      state.grid.querySelectorAll('.related-skeleton-card').forEach(skeleton => {
        if (skeleton !== placeholder) skeleton.remove();
      });
      state.hasRendered = true;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = relatedProductCardHTML(product).trim();
    const card = wrapper.firstElementChild;

    if (placeholder?.isConnected) {
      placeholder.replaceWith(card);
    } else {
      state.grid.appendChild(card);
    }
    if (state.pendingPlaceholder === placeholder) state.pendingPlaceholder = null;

    state.renderedCount++;
    bindRelatedCard(card, product, state);
    prepareRelatedCardImages(card);

    // Continua a buscar em segundo plano; nunca bloqueia o início da animação.
    if (state.pool.length <= 2 && !state.exhausted) {
      loadRelatedBatch(state).catch(() => {});
    }
    reserveNextRelatedProduct(state).catch(() => {});
  } catch (error) {
    if (placeholder?.isConnected) placeholder.remove();
    if (state.pendingPlaceholder === placeholder) state.pendingPlaceholder = null;
    console.error('Erro ao adicionar produto recomendado:', error);
  } finally {
    state.appending = false;
    updateRelatedControls(state);
  }
}

function updateRelatedControls(state) {
  if (!state || !state.grid) return;

  const prev = document.getElementById('relatedPrev');
  const next = document.getElementById('relatedNext');
  const atStart = state.grid.scrollLeft <= 3;
  const atEnd = state.grid.scrollLeft + state.grid.clientWidth >= state.grid.scrollWidth - 4;
  const noMore = state.exhausted && !state.reservedNext && !state.pool.length && !state.loadingPromise && !state.reservingNext;

  if (prev) prev.disabled = atStart;
  if (next) next.disabled = noMore && atEnd;
}

function finalizeRelatedProgrammaticScroll(state, token) {
  if (token !== state.programmaticScrollToken) return;

  clearTimeout(state.scrollSnapFallbackTimer);
  state.scrollSnapFallbackTimer = null;

  if (state.scrollEndHandler) {
    state.grid.removeEventListener('scrollend', state.scrollEndHandler);
    state.scrollEndHandler = null;
  }

  state.isProgrammaticScrolling = false;

  // Reabilita o snap apenas depois que a rolagem suave terminou.
  requestAnimationFrame(() => {
    if (token !== state.programmaticScrollToken) return;
    state.grid.classList.remove('is-programmatic-scrolling');
    updateRelatedControls(state);
  });
}

function scrollRelatedGrid(state, amount, beforeScroll = null) {
  const grid = state.grid;
  state.programmaticScrollToken = (state.programmaticScrollToken || 0) + 1;
  const token = state.programmaticScrollToken;

  clearTimeout(state.scrollSnapFallbackTimer);
  if (state.scrollEndHandler) {
    grid.removeEventListener('scrollend', state.scrollEndHandler);
    state.scrollEndHandler = null;
  }

  // Impede que o scroll-snap altere o destino no meio da animação.
  state.isProgrammaticScrolling = true;
  grid.classList.add('is-programmatic-scrolling');

  // O espaço do próximo cartão é reservado antes de iniciar o movimento.
  if (typeof beforeScroll === 'function') beforeScroll();

  const onScrollEnd = () => finalizeRelatedProgrammaticScroll(state, token);
  state.scrollEndHandler = onScrollEnd;
  grid.addEventListener('scrollend', onScrollEnd, { once: true });

  const before = grid.scrollLeft;
  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const expectedTarget = Math.max(0, Math.min(maxScroll, before + amount));
  const shouldMove = Math.abs(expectedTarget - before) > 1;

  grid.scrollBy({ left: amount, behavior: 'smooth' });

  // Fallback para navegadores sem scrollend ou quando o destino já foi atingido.
  // Não use o scrollLeft imediatamente após scrollBy: em uma animação suave,
  // ele normalmente ainda não mudou nesse instante.
  state.scrollSnapFallbackTimer = setTimeout(() => {
    finalizeRelatedProgrammaticScroll(state, token);
  }, shouldMove ? 850 : 80);
}

function reserveSlotBeforeRelatedNavigation(state, step) {
  const grid = state.grid;
  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  const projectedLeft = Math.min(maxScroll, grid.scrollLeft + step);
  const willReachEnd = projectedLeft + grid.clientWidth >= grid.scrollWidth - step * 0.55;
  const hasPotential = Boolean(
    state.reservedNext || state.pool.length || state.loadingPromise ||
    state.reservingNext || !state.exhausted
  );

  if (!willReachEnd || !hasPotential) return;

  const placeholder = ensureRelatedPendingCard(state);
  if (!state.appending) appendNextRelatedCard(state, placeholder).catch(() => {});
}

function bindRelatedCarouselControls(state) {
  const prev = document.getElementById('relatedPrev');
  const next = document.getElementById('relatedNext');

  if (prev && prev.dataset.bound !== 'true') {
    prev.dataset.bound = 'true';
    prev.addEventListener('click', () => {
      const step = relatedCarouselStep(state);
      scrollRelatedGrid(state, -step);
    });
  }

  if (next && next.dataset.bound !== 'true') {
    next.dataset.bound = 'true';
    next.addEventListener('click', () => {
      const step = relatedCarouselStep(state);
      scrollRelatedGrid(state, step, () => {
        reserveSlotBeforeRelatedNavigation(state, step);
      });
      // Os dados e a imagem do próximo produto continuam sendo preparados em background.
      reserveNextRelatedProduct(state).catch(() => {});
    });
  }

  if (state.grid.dataset.scrollBound !== 'true') {
    state.grid.dataset.scrollBound = 'true';
    state.grid.addEventListener('scroll', () => {
      updateRelatedControls(state);
      if (state.isProgrammaticScrolling || state.scrollCheckFrame) return;

      state.scrollCheckFrame = requestAnimationFrame(() => {
        state.scrollCheckFrame = 0;
        updateRelatedControls(state);
      });

      // Não insere cartões durante uma animação de rolagem: isso muda os snap points
      // e pode fazer o navegador interromper o movimento pela metade.
      clearTimeout(state.nearEndFallbackTimer);
      state.nearEndFallbackTimer = setTimeout(() => {
        if (state.isProgrammaticScrolling) return;
        const step = relatedCarouselStep(state);
        const nearEnd = state.grid.scrollLeft + state.grid.clientWidth >= state.grid.scrollWidth - step * 0.5;
        if (nearEnd) appendNextRelatedCard(state).catch(() => {});
      }, 140);
    }, { passive: true });

    // Em navegadores que suportam scrollend, carrega o próximo item só depois do movimento.
    state.grid.addEventListener('scrollend', () => {
      if (state.isProgrammaticScrolling) return;
      clearTimeout(state.nearEndFallbackTimer);
      const step = relatedCarouselStep(state);
      const nearEnd = state.grid.scrollLeft + state.grid.clientWidth >= state.grid.scrollWidth - step * 0.5;
      if (nearEnd) appendNextRelatedCard(state).catch(() => {});
    }, { passive: true });
  }

  updateRelatedControls(state);
}

async function renderRelatedProducts(currentId) {
  const grid = document.getElementById('relatedGrid');
  const section = document.querySelector('.related-section');
  if (!grid || !section || typeof supabaseClient === 'undefined') return;

  const state = {
    currentId: String(currentId),
    section,
    grid,
    total: null,
    cursor: 0,
    scannedRows: 0,
    countChecked: false,
    exhausted: false,
    loadingPromise: null,
    fetchError: null,
    pool: [],
    knownIds: new Set([String(currentId)]),
    preloadedIds: new Set(),
    preloadedImages: new Map(),
    reservedNext: null,
    reservingNext: false,
    pendingPlaceholder: null,
    appending: false,
    hasRendered: false,
    renderedCount: 0,
    scrollCheckFrame: 0,
    isProgrammaticScrolling: false,
    programmaticScrollToken: 0,
    scrollEndHandler: null,
    scrollSnapFallbackTimer: null,
    nearEndFallbackTimer: null
  };

  relatedCarouselState = state;
  section.classList.add('is-loading');
  section.setAttribute('aria-busy', 'true');
  bindRelatedCarouselControls(state);

  try {
    // A primeira busca traz somente um pequeno lote, nunca o catálogo completo.
    const initialCount = relatedVisibleCount() + 1;
    for (let i = 0; i < initialCount; i++) {
      if (state.exhausted && !state.reservedNext && !state.pool.length) break;
      await appendNextRelatedCard(state);
      if (!state.renderedCount) break;
    }

    if (!state.renderedCount) {
      grid.innerHTML = '<p class="related-empty">Não há outros produtos disponíveis para recomendar.</p>';
    }
  } finally {
    section.classList.remove('is-loading');
    section.setAttribute('aria-busy', 'false');
    updateRelatedControls(state);
  }

  // Pré-carrega um produto adicional (dados e imagem) antes de o usuário avançar.
  // Reserva o próximo item em segundo plano, sem bloquear a página.
  reserveNextRelatedProduct(state).catch(() => {});
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
      if (!currentProduct) return;

      const productId = String(currentProduct.id);
      const wishlistApi = window.EcommeWishlists;
      if (wishlistApi && typeof wishlistApi.openPicker === 'function') {
        Promise.resolve(wishlistApi.openPicker(productId)).finally(updateProductFavoriteButtons);
      } else if (typeof toggleFav === 'function') {
        toggleFav(productId);
        setTimeout(updateProductFavoriteButtons, 0);
      }
    };
  });

  const offerButton = document.getElementById('makeProductOfferBtn');
  if (offerButton) {
    offerButton.onclick = openProductOfferModal;
    offerButton.hidden = typeof isProductUnavailable === 'function' && isProductUnavailable(currentProduct);
  }
}


/* ── OFERTAS DO PRODUTO ────────────────────────────────────── */
function ensureProductOfferModal() {
  let modal = document.getElementById('productOfferModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'productOfferModal';
  modal.className = 'product-offer-backdrop';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="product-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="productOfferTitle">
      <button type="button" class="product-offer-close" data-offer-close aria-label="Fechar">&times;</button>
      <div class="product-offer-kicker"><i class="fa-solid fa-handshake-angle" aria-hidden="true"></i> Negocie com o vendedor</div>
      <h2 id="productOfferTitle">Faça sua oferta</h2>
      <p class="product-offer-product" id="productOfferProduct"></p>
      <div class="product-offer-list-price"><span>Preço anunciado</span><strong id="productOfferListedPrice"></strong></div>
      <form id="productOfferForm" novalidate>
        <label for="productOfferAmount">Quanto você gostaria de pagar?</label>
        <div class="product-offer-input-wrap"><span>R$</span><input id="productOfferAmount" type="number" inputmode="decimal" min="0.01" step="0.01" required></div>
        <label for="productOfferMessage">Mensagem ao vendedor <span>(opcional)</span></label>
        <textarea id="productOfferMessage" rows="3" maxlength="500" placeholder="Escreva uma mensagem, se desejar..."></textarea>
        <p class="product-offer-note">O vendedor poderá aceitar, recusar ou enviar uma contraproposta. A oferta não confirma uma compra.</p>
        <p class="product-offer-error" id="productOfferError" role="alert" hidden></p>
        <button type="submit" class="product-offer-submit" id="productOfferSubmit">Enviar oferta</button>
      </form>
    </section>`;
  document.body.appendChild(modal);

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-offer-close]')) closeProductOfferModal();
  });
  modal.querySelector('#productOfferForm')?.addEventListener('submit', submitProductOffer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeProductOfferModal();
  });
  return modal;
}

async function openProductOfferModal() {
  if (!currentProduct) return;
  if (typeof supabaseClient === 'undefined') {
    if (typeof showToast === 'function') showToast('Não foi possível conectar ao sistema de ofertas.', 'err');
    return;
  }
  const offerBtn = document.getElementById('makeProductOfferBtn');
  let lockButton = false;
  if (offerBtn) { offerBtn.disabled = true; offerBtn.classList.add('is-loading'); }

  try {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      location.href = `/login?redirect=${redirect}`;
      return;
    }

    const { data: previousOffers, error: previousOfferError } = await supabaseClient
      .from('product_offers')
      .select('id,status')
      .eq('product_id', String(currentProduct.id))
      .eq('buyer_id', authData.user.id)
      .limit(1);
    if (previousOfferError) throw previousOfferError;
    if (previousOffers?.length) {
      lockButton = true;
      throw new Error('PRODUCT_OFFER_ALREADY_SENT');
    }

    if (typeof isProductUnavailable === 'function' && isProductUnavailable(currentProduct)) {
      throw new Error('Este produto está indisponível para receber ofertas.');
    }

    const { data: eligible, error } = await supabaseClient.rpc('can_make_product_offer', {
      p_product_id: String(currentProduct.id)
    });
    if (error) throw error;
    if (eligible !== true) throw new Error('Você não pode fazer uma oferta para um produto da sua própria loja.');

    const modal = ensureProductOfferModal();
    const price = Number(currentProduct.price) || 0;
    const amount = modal.querySelector('#productOfferAmount');
    modal.querySelector('#productOfferProduct').textContent = currentProduct.name || 'Produto';
    modal.querySelector('#productOfferListedPrice').textContent = priceText(price);
    amount.max = String(Math.max(0, price - 0.01));
    const suggestedAmount = Math.min(Math.round(price * 0.9 * 100) / 100, Math.round((price - 0.01) * 100) / 100);
    amount.value = Math.max(0.01, suggestedAmount).toFixed(2);
    modal.querySelector('#productOfferMessage').value = '';
    modal.querySelector('#productOfferError').hidden = true;
    modal.querySelector('#productOfferSubmit').disabled = false;
    modal.hidden = false;
    requestAnimationFrame(() => amount.focus());
    document.body.classList.add('product-offer-open');
  } catch (error) {
    console.error('Não foi possível abrir a oferta:', error);
    const message = error?.code === '42883' || error?.code === '42P01' || /can_make_product_offer|product_offers|product_offer_claims/i.test(error?.message || '')
      ? 'O sistema de ofertas ainda não foi configurado ou precisa ser atualizado. Execute novamente supabase/product-offers.sql no SQL Editor do Supabase.'
      : /PRODUCT_OFFER_ALREADY_SENT/i.test(error?.message || '')
        ? 'Você já enviou uma oferta para este produto. Só é permitido enviar uma oferta por produto.'
        : (error?.message || 'Não foi possível iniciar uma oferta. Tente novamente.');
    if (typeof showToast === 'function') showToast(message, 'err');
  } finally {
    if (offerBtn) {
      offerBtn.disabled = lockButton;
      offerBtn.classList.remove('is-loading');
      if (lockButton) {
        offerBtn.innerHTML = '<i class="fa-solid fa-ban"></i>';
        offerBtn.classList.add('offer-sent');
      }
    }
  }
}

function closeProductOfferModal() {
  const modal = document.getElementById('productOfferModal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('product-offer-open');
}

async function submitProductOffer(event) {
  event.preventDefault();
  if (!currentProduct || typeof supabaseClient === 'undefined') return;
  const modal = ensureProductOfferModal();
  const amountInput = modal.querySelector('#productOfferAmount');
  const messageInput = modal.querySelector('#productOfferMessage');
  const errorEl = modal.querySelector('#productOfferError');
  const submit = modal.querySelector('#productOfferSubmit');
  const amount = Number(amountInput.value);
  const listedPrice = Number(currentProduct.price) || 0;

  if (!Number.isFinite(amount) || amount <= 0 || amount >= listedPrice) {
    errorEl.textContent = 'Informe um valor maior que R$ 0,00 e menor que o preço anunciado.';
    errorEl.hidden = false;
    amountInput.focus();
    return;
  }
  if (messageInput.value.trim().length > 500) {
    errorEl.textContent = 'A mensagem pode ter no máximo 500 caracteres.';
    errorEl.hidden = false;
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Enviando oferta…';
  errorEl.hidden = true;
  try {
    const { data, error } = await supabaseClient.rpc('create_product_offer', {
      p_product_id: String(currentProduct.id),
      p_offer_price: amount,
      p_message: messageInput.value.trim() || null
    });
    if (error) throw error;
    closeProductOfferModal();
    const offerButton = document.getElementById('makeProductOfferBtn');
    if (offerButton) {
      offerButton.disabled = true;
      offerButton.textContent = 'Oferta já enviada';
      offerButton.classList.add('offer-sent');
    }
    if (typeof showToast === 'function') showToast('Oferta enviada! O vendedor receberá uma notificação.', 'ok');
  } catch (error) {
    console.error('Erro ao enviar oferta:', error);
    const rawMessage = error?.message || '';
    const message = error?.code === '42883' || error?.code === '42P01' || /create_product_offer|product_offers|product_offer_claims/i.test(rawMessage)
      ? 'O sistema de ofertas não está atualizado. Execute novamente supabase/product-offers.sql no SQL Editor do Supabase.'
      : /PRODUCT_OFFER_ALREADY_SENT|PENDING_OFFER_EXISTS/i.test(rawMessage)
        ? 'Você já enviou uma oferta para este produto. Só é permitido enviar uma oferta por produto.'
        : /PRODUCT_UNAVAILABLE/i.test(rawMessage)
          ? 'Este produto está indisponível para receber ofertas.'
          : /CANNOT_OFFER_OWN_STORE/i.test(rawMessage)
            ? 'Você não pode fazer uma oferta para um produto da sua própria loja.'
            : /OFFER_MUST_BE_LOWER_THAN_LIST_PRICE/i.test(rawMessage)
              ? 'A oferta precisa ser menor que o preço anunciado.'
              : 'Não foi possível enviar sua oferta. Verifique o valor e tente novamente.';
    errorEl.textContent = message;
    errorEl.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Enviar oferta';
  }
}

function changeProductQty(delta) {
  productPageQty = Math.max(1, productPageQty + Number(delta || 0));

  const el = document.getElementById('prodQty');

  if (el) el.textContent = String(productPageQty);
}

function isProductSavedInAnyWishlist(productId) {
  const id = String(productId);
  const wishlistApi = window.EcommeWishlists;

  if (wishlistApi && typeof wishlistApi.isReady === 'function' && wishlistApi.isReady() && typeof wishlistApi.isSaved === 'function') {
    return wishlistApi.isSaved(id);
  }

  return typeof fav !== 'undefined' && Array.isArray(fav) &&
    fav.some(item => String(item.id) === id);
}

function updateProductFavoriteButtons() {
  if (!currentProduct) return;

  const id = String(currentProduct.id);
  const selected = isProductSavedInAnyWishlist(id);

  ['galFav', 'favLg'].forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.classList.toggle('on', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.title = selected ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos';
  });

  document.querySelectorAll('[data-related-fav]').forEach(button => {
    const isFav = isProductSavedInAnyWishlist(button.dataset.relatedFav);
    button.classList.toggle('on', isFav);
    button.setAttribute('aria-pressed', String(isFav));
    button.title = isFav ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos';
  });
}

let productOwnershipVerified = false;
let currentProductIsOwnStore = false;

async function getCurrentUserStoreId() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
    throw new Error('O serviço de autenticação não está disponível.');
  }

  // getSession() identifica a ausência de login sem tratar isso como falha de verificação.
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData?.session?.user) return null;

  const { data, error } = await supabaseClient.rpc('get_my_store_private');
  if (error) throw error;

  const store = Array.isArray(data) ? data[0] : data;
  return store?.id !== undefined && store?.id !== null ? String(store.id) : null;
}

async function updateOwnProductControls(product) {
  const addButton = document.querySelector('.main-btns .btn-addcart');
  const buyButton = document.querySelector('.main-btns .btn-buynow');
  const actions = document.querySelector('.main-btns');
  if (!actions) return;

  let notice = document.getElementById('ownProductNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'ownProductNotice';
    notice.className = 'own-product-notice';
    notice.hidden = true;
    notice.innerHTML = `
      <span class="own-product-notice-icon" aria-hidden="true"><i class="fa-solid fa-store"></i></span>
      <span class="own-product-notice-text"></span>
      <a class="own-product-manage" href="/sellers/main#produtos">Gerenciar Produto</a>
    `;
    actions.insertAdjacentElement('beforebegin', notice);
  }

  productOwnershipVerified = false;
  currentProductIsOwnStore = false;

  try {
    const ownStoreId = await getCurrentUserStoreId();
    productOwnershipVerified = true;
    currentProductIsOwnStore = !!ownStoreId && !!product?.loja_id && ownStoreId === String(product.loja_id);

    if (currentProductIsOwnStore) {
      const text = notice.querySelector('.own-product-notice-text');
      if (text) text.textContent = 'Este produto pertence à sua loja.';
      notice.hidden = false;
      if (addButton) addButton.hidden = true;
      if (buyButton) buyButton.hidden = true;
      document.querySelector('.qty-action-row')?.setAttribute('hidden', '');
      document.querySelector('.stock-bar-wrap')?.setAttribute('hidden', '');
    } else {
      notice.hidden = true;
      if (addButton) addButton.hidden = false;
      if (buyButton) buyButton.hidden = false;
      document.querySelector('.qty-action-row')?.removeAttribute('hidden');
      document.querySelector('.stock-bar-wrap')?.removeAttribute('hidden');
    }
  } catch (error) {
    console.warn('Não foi possível verificar se o produto pertence à loja do usuário:', error);
    const text = notice.querySelector('.own-product-notice-text');
    if (text) text.textContent = 'Não foi possível verificar a propriedade deste produto. Atualize a página para tentar novamente.';
    notice.querySelector('.own-product-manage')?.setAttribute('hidden', '');
    notice.hidden = false;
    if (addButton) addButton.hidden = true;
    if (buyButton) buyButton.hidden = true;
    document.querySelector('.qty-action-row')?.setAttribute('hidden', '');
    document.querySelector('.stock-bar-wrap')?.setAttribute('hidden', '');
  }
}

function addToCartMain() {
  if (currentProductIsOwnStore) {
    if (typeof showToast === 'function') showToast('Você não pode adicionar ao carrinho um produto da sua própria loja.');
    return;
  }
  if (!productOwnershipVerified) {
    if (typeof showToast === 'function') showToast('Não foi possível verificar a loja deste produto. Atualize a página e tente novamente.');
    return;
  }
  if (currentProduct && typeof addToCart === 'function') {
    addToCart(String(currentProduct.id), productPageQty);
  }
}

async function buyNow() {
  if (!currentProduct) return;
  if (currentProductIsOwnStore) {
    if (typeof showToast === 'function') showToast('Você não pode comprar um produto da sua própria loja.');
    return;
  }
  if (!productOwnershipVerified) {
    if (typeof showToast === 'function') showToast('Não foi possível verificar a loja deste produto. Atualize a página e tente novamente.');
    return;
  }

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


/* ── DENÚNCIA DE PRODUTO ───────────────────────────────────────── */
let activeProductReportId = null;
let activeProductReportButton = null;
let productReportSubmitting = false;

function ensureProductReportModal() {
  let modal = document.getElementById('productReportModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'productReportModal';
  modal.className = 'product-report-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="product-report-dialog" role="dialog" aria-modal="true" aria-labelledby="productReportTitle" aria-describedby="productReportIntro" tabindex="-1">
      <button type="button" class="product-report-close" data-product-report-close aria-label="Fechar denúncia"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      <p class="product-report-eyebrow">SEGURANÇA DA COMUNIDADE</p>
      <h2 id="productReportTitle">Denunciar produto</h2>
      <p class="product-report-intro" id="productReportIntro">Informe o motivo da denúncia. Nossa equipe poderá analisar o anúncio e tomar as medidas necessárias. Seus dados não serão exibidos publicamente.</p>
      <form id="productReportForm">
        <label class="product-report-field" for="productReportReason">Motivo da denúncia <span>*</span>
          <select id="productReportReason" required>
            <option value="">Selecione um motivo</option>
            <option value="counterfeit">Produto falsificado ou suspeita de falsificação</option>
            <option value="prohibited">Produto proibido ou de venda restrita</option>
            <option value="misleading">Anúncio enganoso ou informações incorretas</option>
            <option value="intellectual_property">Violação de propriedade intelectual</option>
            <option value="inappropriate">Conteúdo impróprio ou ofensivo</option>
            <option value="wrong_category">Categoria ou classificação inadequada</option>
            <option value="other">Outro motivo</option>
          </select>
        </label>
        <label class="product-report-field" for="productReportDetails">Detalhes <small>opcional</small>
          <textarea id="productReportDetails" rows="4" maxlength="1000" placeholder="Descreva o que devemos analisar (até 1000 caracteres)."></textarea>
        </label>
        <p id="productReportStatus" class="product-report-status" role="status" aria-live="polite" hidden></p>
        <div class="product-report-actions">
          <button type="button" class="product-report-cancel" data-product-report-close>Cancelar</button>
          <button type="submit" class="product-report-submit" id="productReportSubmit">Enviar denúncia</button>
        </div>
      </form>
    </section>`;
  document.body.appendChild(modal);

  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-product-report-close]')) {
      closeProductReport();
    }
  });
  modal.querySelector('#productReportForm').addEventListener('submit', submitProductReport);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeProductReport();
  });
  return modal;
}

function openProductReport(button) {
  if (!currentProduct?.id) return;
  activeProductReportId = String(currentProduct.id);
  activeProductReportButton = button || null;
  productReportSubmitting = false;

  const modal = ensureProductReportModal();
  modal.querySelector('#productReportForm').reset();
  const status = modal.querySelector('#productReportStatus');
  status.hidden = true;
  status.textContent = '';
  const submit = modal.querySelector('#productReportSubmit');
  submit.disabled = false;
  submit.textContent = 'Enviar denúncia';
  modal.hidden = false;
  document.body.classList.add('product-report-open');
  requestAnimationFrame(() => modal.querySelector('#productReportReason')?.focus());
}

function closeProductReport() {
  const modal = document.getElementById('productReportModal');
  if (!modal || productReportSubmitting) return;
  modal.hidden = true;
  document.body.classList.remove('product-report-open');
  activeProductReportId = null;
  if (activeProductReportButton?.isConnected) activeProductReportButton.focus();
  activeProductReportButton = null;
}

function closeProductReportAfterRequest() {
  const modal = document.getElementById('productReportModal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('product-report-open');
  activeProductReportId = null;
  if (activeProductReportButton?.isConnected) activeProductReportButton.focus();
  activeProductReportButton = null;
}

async function submitProductReport(event) {
  event.preventDefault();
  if (productReportSubmitting || !activeProductReportId) return;

  const modal = ensureProductReportModal();
  const reason = modal.querySelector('#productReportReason').value;
  const details = modal.querySelector('#productReportDetails').value.trim();
  const status = modal.querySelector('#productReportStatus');
  const submit = modal.querySelector('#productReportSubmit');

  if (!reason) {
    modal.querySelector('#productReportReason').focus();
    return;
  }
  if (details.length > 1000) {
    status.textContent = 'Os detalhes devem ter no máximo 1000 caracteres.';
    status.hidden = false;
    return;
  }

  productReportSubmitting = true;
  submit.disabled = true;
  submit.textContent = 'Enviando…';
  status.hidden = true;

  try {
    if (typeof supabaseClient === 'undefined') throw new Error('SUPABASE_UNAVAILABLE');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) {
      productReviewToast('Entre na sua conta para denunciar este produto.');
      closeProductReportAfterRequest();
      redirectToLoginForReviewAction();
      return;
    }

    const { data, error } = await supabaseClient.rpc('report_product', {
      p_product_id: activeProductReportId,
      p_reason: reason,
      p_details: details || null
    });
    if (error) throw error;

    closeProductReportAfterRequest();
    if (data === true) {
      productReviewToast('Denúncia enviada. Obrigado por ajudar a manter a Ecomme segura.', 'success');
    } else {
      productReviewToast('Você já enviou uma denúncia para este produto.', 'info');
    }
  } catch (error) {
    console.error('Erro ao enviar denúncia de produto:', error);
    const message = error?.message || '';
    const missingRpc = error?.code === '42883' || /report_product|product_reports/i.test(message);
    if (missingRpc) {
      status.textContent = 'A função de denúncias ainda não está configurada. Execute supabase/migrations/20261109_create_product_reports.sql no SQL Editor do Supabase.';
    } else if (error?.code === '28000' || /AUTH_REQUIRED/i.test(message)) {
      closeProductReportAfterRequest();
      redirectToLoginForReviewAction();
      return;
    } else if (/CANNOT_REPORT_OWN_PRODUCT/i.test(message)) {
      status.textContent = 'Você não pode denunciar um produto da sua própria loja.';
    } else if (/PRODUCT_NOT_FOUND/i.test(message)) {
      status.textContent = 'Este produto não está mais disponível para denúncia.';
    } else {
      status.textContent = 'Não foi possível enviar a denúncia. Verifique sua conexão e tente novamente.';
    }
    status.hidden = false;
  } finally {
    productReportSubmitting = false;
    if (modal.isConnected && !modal.hidden) {
      submit.disabled = false;
      submit.textContent = 'Enviar denúncia';
    }
  }
}

function closeProductMoreMenu() {
  const menu = document.getElementById('productMoreOptionsMenu');
  const trigger = document.getElementById('productMoreOptionsTrigger');
  if (!menu || !trigger) return;
  menu.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
}

function toggleProductMoreMenu() {
  const menu = document.getElementById('productMoreOptionsMenu');
  const trigger = document.getElementById('productMoreOptionsTrigger');
  if (!menu || !trigger) return;
  const willOpen = menu.hidden;
  menu.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) menu.querySelector('[role="menuitem"]')?.focus();
}

/* ── COMPARADOR NATIVO DE PRODUTOS ─────────────────────────────── */
const productCompareState = {
  selected: [],
  searchResults: [],
  searchRequest: 0,
  searchTimer: null,
  stores: new Map(),
  view: 'select',
  loadingStores: false,
  previousBodyOverflow: ''
};

function initProductComparator() {
  const actions = document.querySelector('.main-btns');
  if (!actions || !currentProduct || document.getElementById('productMoreOptionsTrigger')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'product-more-options';
  wrapper.innerHTML = `
    <button type="button" class="product-more-trigger" id="productMoreOptionsTrigger" aria-label="Mais opções do produto" aria-haspopup="menu" aria-expanded="false" aria-controls="productMoreOptionsMenu" title="Mais opções">
      <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
    </button>
    <div class="product-more-menu" id="productMoreOptionsMenu" role="menu" aria-label="Mais opções do produto" hidden>
      <button type="button" class="product-more-item" role="menuitem" data-product-more-action="report">
        <i class="fa-regular fa-flag" aria-hidden="true"></i><span>Denunciar produto</span>
      </button>
      <button type="button" class="product-more-item" role="menuitem" data-product-more-action="compare">
        <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i><span>Comparar produtos</span>
      </button>
    </div>`;
  actions.appendChild(wrapper);

  const trigger = wrapper.querySelector('#productMoreOptionsTrigger');
  const menu = wrapper.querySelector('#productMoreOptionsMenu');
  trigger.addEventListener('click', toggleProductMoreMenu);
  wrapper.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-product-more-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.productMoreAction;
    closeProductMoreMenu();
    if (action === 'report') openProductReport(trigger);
    if (action === 'compare') openProductCompare();
  });
  wrapper.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || menu.hidden) return;
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    event.preventDefault();
    items[nextIndex]?.focus();
  });
  document.addEventListener('click', event => {
    if (!wrapper.contains(event.target)) closeProductMoreMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeProductMoreMenu();
      trigger.focus();
    }
  });

  const overlay = document.createElement('div');
  overlay.id = 'productCompareModal';
  overlay.className = 'ecompare-overlay';
  overlay.innerHTML = `
    <section class="ecompare-dialog" role="dialog" aria-modal="true" aria-labelledby="ecompareTitle" aria-describedby="ecompareSubtitle" tabindex="-1">
      <header class="ecompare-header">
        <div class="ecompare-heading">
          <span class="ecompare-heading-icon"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i></span>
          <div><h2 id="ecompareTitle">Comparar produtos</h2><p id="ecompareSubtitle">Veja as principais diferenças antes de escolher.</p></div>
        </div>
        <div class="ecompare-header-actions">
          <button type="button" class="ecompare-back" data-compare-back hidden><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Voltar</span></button>
          <button type="button" class="ecompare-close" data-compare-close aria-label="Fechar comparador"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>
      </header>
      <div class="ecompare-content" id="productCompareContent"></div>
    </section>
  </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-compare-close]')) {
      closeProductCompare();
      return;
    }
    if (event.target.closest('[data-compare-back]')) {
      productCompareState.view = 'select';
      renderProductCompareSelector();
      return;
    }
    const addButton = event.target.closest('[data-add-compare]');
    if (addButton) {
      addProductToCompare(addButton.dataset.addCompare);
      return;
    }
    const removeButton = event.target.closest('[data-remove-compare]');
    if (removeButton) {
      removeProductFromCompare(removeButton.dataset.removeCompare);
      return;
    }
    if (event.target.closest('[data-compare-submit]')) showProductCompareTable();
  });

  overlay.addEventListener('input', event => {
    if (event.target.id !== 'productCompareSearch') return;
    clearTimeout(productCompareState.searchTimer);
    const term = event.target.value.trim();
    productCompareState.searchRequest++;
    productCompareState.searchTimer = setTimeout(() => searchProductsForCompare(term), 280);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeProductCompare();
  });
}
function openProductCompare() {
  if (!currentProduct) return;
  const overlay = document.getElementById('productCompareModal');
  if (!overlay) return;

  productCompareState.selected = [currentProduct];
  productCompareState.searchResults = [];
  productCompareState.searchRequest++;
  productCompareState.view = 'select';
  productCompareState.stores.clear();
  const oldSearch = document.getElementById('productCompareSearch');
  if (oldSearch) oldSearch.value = '';
  productCompareState.previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  overlay.classList.add('is-open');
  renderProductCompareSelector();
  requestAnimationFrame(() => document.getElementById('productCompareSearch')?.focus());
}

function closeProductCompare() {
  const overlay = document.getElementById('productCompareModal');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  document.body.style.overflow = productCompareState.previousBodyOverflow;
  document.getElementById('productMoreOptionsTrigger')?.focus();
  clearTimeout(productCompareState.searchTimer);
  productCompareState.searchRequest++;
}

function compareProductImage(product) {
  if (typeof relatedProductImageUrl === 'function') return relatedProductImageUrl(product);
  return product?.image_url || product?.gallery_urls?.find(Boolean) || '';
}

function renderProductCompareSelector() {
  const content = document.getElementById('productCompareContent');
  const back = document.querySelector('[data-compare-back]');
  const title = document.getElementById('ecompareTitle');
  const subtitle = document.getElementById('ecompareSubtitle');
  if (!content) return;

  if (back) back.hidden = true;
  if (title) title.textContent = 'Comparar produtos';
  if (subtitle) subtitle.textContent = 'Adicione produtos para comparar lado a lado.';

  const selected = productCompareState.selected;
  const previousTerm = document.getElementById('productCompareSearch')?.value || '';
  content.innerHTML = `
    <div class="ecompare-intro"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>O produto desta página já está incluído. Adicione mais ${selected.length === 1 ? '1 produto' : 'produtos'} para comparar até 5 opções.</span></div>
    <div class="ecompare-selected-wrap">
      <div class="ecompare-section-label"><span>Produtos selecionados</span><strong>${selected.length}/5</strong></div>
      <div class="ecompare-selected-list">${selected.map(product => {
        const id = safeHtml(product.id);
        const image = compareProductImage(product);
        const isCurrent = String(product.id) === String(currentProduct?.id);
        return `<div class="ecompare-selected-item">
          <div class="ecompare-product-thumb">${image ? `<img src="${safeHtml(image)}" alt="" loading="lazy">` : `<span>${safeHtml(product.emoji || '📦')}</span>`}</div>
          <div class="ecompare-product-copy"><strong>${safeHtml(product.name || 'Produto sem nome')}</strong><span>${safeHtml(priceText(Number(product.price) || 0))}${isCurrent ? ' · Produto atual' : ''}</span></div>
          ${isCurrent ? '<span class="ecompare-current-tag">Atual</span>' : `<button type="button" class="ecompare-remove" data-remove-compare="${id}" aria-label="Remover ${safeHtml(product.name)} da comparação"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`}
        </div>`;
      }).join('')}</div>
    </div>
    <div class="ecompare-search-area">
      <label class="ecompare-section-label" for="productCompareSearch">Adicionar outro produto</label>
      <div class="ecompare-search-box"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="productCompareSearch" type="search" autocomplete="off" placeholder="Digite o nome do produto..."><kbd>Buscar</kbd></div>
      <div class="ecompare-results" id="productCompareResults" aria-live="polite"><div class="ecompare-search-empty"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Digite pelo menos 2 letras para pesquisar no catálogo.</span></div></div>
    </div>
    <footer class="ecompare-footer"><span>${selected.length} de 2 a 5 produtos selecionados</span><button type="button" class="ecompare-primary" data-compare-submit ${selected.length < 2 ? 'disabled="disabled"' : ''}><i class="fa-solid fa-table-columns" aria-hidden="true"></i> Comparar ${selected.length} produtos</button></footer>`;

  const search = document.getElementById('productCompareSearch');
  if (search) search.value = previousTerm;
  const results = document.getElementById('productCompareResults');
  if (previousTerm.trim().length >= 2 && results) {
    if (productCompareState.searchResults.length) renderProductCompareSearchResults();
    else results.innerHTML = '<div class="ecompare-search-empty"><i class="fa-solid fa-box-open" aria-hidden="true"></i><span>Nenhum produto disponível encontrado com esse nome.</span></div>';
  }
}

async function searchProductsForCompare(term) {
  const results = document.getElementById('productCompareResults');
  const requestId = ++productCompareState.searchRequest;
  const searchTerm = String(term || '').trim();
  if (!results) return;

  if (searchTerm.length < 2) {
    productCompareState.searchResults = [];
    results.innerHTML = '<div class="ecompare-search-empty"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Digite pelo menos 2 letras para pesquisar no catálogo.</span></div>';
    return;
  }
  if (typeof supabaseClient === 'undefined') {
    results.innerHTML = '<div class="ecompare-search-empty">O catálogo não está disponível no momento.</div>';
    return;
  }

  results.innerHTML = '<div class="ecompare-search-loading"><span class="ecompare-spinner"></span> Pesquisando produtos...</div>';
  try {
    const safeTerm = searchTerm.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .ilike('name', `%${safeTerm}%`)
      .order('name', { ascending: true })
      .limit(24);
    if (error) throw error;
    if (requestId !== productCompareState.searchRequest) return;

    const selectedIds = new Set(productCompareState.selected.map(product => String(product.id)));
    productCompareState.searchResults = (Array.isArray(data) ? data : [])
      .map(raw => typeof normalizeProduct === 'function' ? normalizeProduct(raw) : raw)
      .filter(product => product && !selectedIds.has(String(product.id)))
      .filter(product => !(typeof isProductUnavailable === 'function' && isProductUnavailable(product)))
      .slice(0, 20);

    renderProductCompareSearchResults();
  } catch (error) {
    if (requestId !== productCompareState.searchRequest) return;
    console.error('Erro ao pesquisar produtos para comparação:', error);
    results.innerHTML = '<div class="ecompare-search-empty ecompare-search-error"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Não foi possível pesquisar agora. Tente novamente.</span></div>';
  }
}

function renderProductCompareSearchResults() {
  const results = document.getElementById('productCompareResults');
  if (!results) return;
  const list = productCompareState.searchResults;
  if (!list.length) {
    results.innerHTML = '<div class="ecompare-search-empty"><i class="fa-solid fa-box-open" aria-hidden="true"></i><span>Nenhum produto disponível encontrado com esse nome.</span></div>';
    return;
  }
  const atLimit = productCompareState.selected.length >= 5;
  results.innerHTML = list.map(product => {
    const id = safeHtml(product.id);
    const image = compareProductImage(product);
    const category = typeof categoryText === 'function' ? categoryText(product) : '';
    return `<div class="ecompare-result-item">
      <div class="ecompare-product-thumb">${image ? `<img src="${safeHtml(image)}" alt="" loading="lazy">` : `<span>${safeHtml(product.emoji || '📦')}</span>`}</div>
      <div class="ecompare-product-copy"><strong>${safeHtml(product.name || 'Produto sem nome')}</strong><span>${safeHtml(category || 'Produto')} · ${safeHtml(priceText(Number(product.price) || 0))}</span></div>
      <button type="button" class="ecompare-add" data-add-compare="${id}" ${atLimit ? 'disabled' : ''} aria-label="Adicionar ${safeHtml(product.name)} à comparação"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Adicionar</span></button>
    </div>`;
  }).join('');
}

function addProductToCompare(productId) {
  if (productCompareState.selected.length >= 5) return;
  const product = productCompareState.searchResults.find(item => String(item.id) === String(productId));
  if (!product || productCompareState.selected.some(item => String(item.id) === String(productId))) return;
  productCompareState.selected.push(product);
  productCompareState.searchResults = productCompareState.searchResults.filter(item => String(item.id) !== String(productId));
  renderProductCompareSelector();
}

function removeProductFromCompare(productId) {
  if (String(productId) === String(currentProduct?.id)) return;
  productCompareState.selected = productCompareState.selected.filter(item => String(item.id) !== String(productId));
  renderProductCompareSelector();
}

function productCompareSpecEntries(product) {
  const entries = new Map();
  const addEntry = (key, value) => {
    const label = String(key || '').trim();
    if (!label || value === null || value === undefined || String(value).trim() === '') return;
    const normalized = String(value).trim();
    entries.set(label, normalized);
  };
  const sources = ['specifications', 'specs', 'attributes', 'especificacoes'];
  sources.forEach(source => {
    let value = product?.[source];
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { value = null; }
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          addEntry(item.label || item.name || item.key || item.atributo || `Especificação ${index + 1}`, item.value ?? item.valor ?? item.content);
        } else {
          addEntry(`Especificação ${index + 1}`, item);
        }
      });
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        const display = item && typeof item === 'object' ? (item.value ?? item.valor ?? item.label ?? JSON.stringify(item)) : item;
        addEntry(key, display);
      });
    }
  });
  (Array.isArray(product?.features) ? product.features : []).forEach((feature, index) => {
    addEntry(`Característica ${index + 1}`, feature);
  });
  return entries;
}

function productCompareWarranty(product) {
  const fields = ['garantia', 'warranty', 'warranty_period', 'garantia_produto', 'prazo_garantia', 'garantia_meses', 'warranty_months'];
  for (const field of fields) {
    const value = product?.[field];
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (/meses|months/i.test(field) && /^\d+(?:[.,]\d+)?$/.test(String(value).trim())) {
      const months = Number(String(value).replace(',', '.'));
      return `${value} ${months === 1 ? 'mês' : 'meses'}`;
    }
    return String(value);
  }
  return 'Não informada';
}

async function loadProductCompareStores(selectedProducts) {
  const ids = [...new Set(selectedProducts.map(product => product.loja_id).filter(Boolean).map(String))];
  if (!ids.length || typeof supabaseClient === 'undefined') return new Map();

  const sources = ['lojas_public', 'lojas'];
  const columnSets = [
    'id, nome_loja, slug_url, logo_url, status, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo',
    'id, nome_loja, slug_url, status, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo',
    'id, nome_loja, slug_url, status'
  ];
  const stores = new Map();

  for (const source of sources) {
    for (const columns of columnSets) {
      const { data, error } = await supabaseClient.from(source).select(columns).in('id', ids);
      if (!error) {
        (data || []).forEach(store => stores.set(String(store.id), store));
        break;
      }
      if (isProductStoreMissingColumn(error)) continue;
      if (isProductStoreMissingRelation(error)) break;
      console.warn(`Não foi possível carregar vendedores para comparação em ${source}:`, error);
      break;
    }
    if (stores.size >= ids.length) break;
  }

  const storesWithoutLogo = [...stores.values()].filter(store => !safeProductStoreImage(store.logo_url)).map(store => String(store.id));
  if (storesWithoutLogo.length) {
    try {
      const { data, error } = await supabaseClient.from('lojas').select('id, logo_base64').in('id', storesWithoutLogo);
      if (!error) (data || []).forEach(store => {
        const existing = stores.get(String(store.id));
        if (existing && store.logo_base64) existing.logo_base64 = store.logo_base64;
      });
    } catch (error) {
      console.warn('Não foi possível carregar logos legados das lojas comparadas:', error);
    }
  }
  return stores;
}

function productCompareShipping(product, store) {
  const details = [];
  if (product?.shipping) {
    details.push('Frete grátis informado para este produto');
  } else if (store?.frete_gratis_ativo && store?.frete_valor_minimo) {
    details.push(`Frete grátis acima de ${store.frete_valor_minimo}`);
  } else {
    details.push('Valor calculado no checkout');
  }
  if (store?.prazo_envio) details.push(`Prazo de envio: ${store.prazo_envio}`);
  const shippingNames = { correios: 'Correios', transportadora: 'Transportadora', retirada: 'Retirada na loja' };
  const methods = Array.isArray(store?.formas_envio) ? store.formas_envio.map(value => shippingNames[value] || value).filter(Boolean) : [];
  if (methods.length) details.push(`Modalidades: ${methods.join(', ')}`);
  return details.join(' · ');
}

function renderProductCompareTable() {
  const content = document.getElementById('productCompareContent');
  const back = document.querySelector('[data-compare-back]');
  const title = document.getElementById('ecompareTitle');
  const subtitle = document.getElementById('ecompareSubtitle');
  if (!content) return;

  if (back) back.hidden = false;
  if (title) title.textContent = 'Comparação de produtos';
  if (subtitle) subtitle.textContent = `${productCompareState.selected.length} produtos selecionados · compare as informações lado a lado.`;
  if (productCompareState.loadingStores) {
    content.innerHTML = '<div class="ecompare-table-loading"><span class="ecompare-spinner"></span> Carregando informações dos vendedores...</div>';
    return;
  }

  const selected = productCompareState.selected;
  const stores = productCompareState.stores;
  const prices = selected.map(product => Number(product.price) || 0).filter(price => price > 0);
  const lowestPrice = prices.length ? Math.min(...prices) : null;
  const specsByProduct = selected.map(productCompareSpecEntries);
  const specKeys = [...new Set(specsByProduct.flatMap(map => [...map.keys()]))];
  const columns = selected.map(product => {
    const image = compareProductImage(product);
    const store = stores.get(String(product.loja_id)) || null;
    const name = safeHtml(product.name || 'Produto sem nome');
    const price = Number(product.price) || 0;
    const isLowest = lowestPrice !== null && price === lowestPrice;
    return `<th scope="col" class="ecompare-product-column">
      <div class="ecompare-column-product">
        <div class="ecompare-column-image">${image ? `<img src="${safeHtml(image)}" alt="${name}" loading="lazy">` : `<span>${safeHtml(product.emoji || '📦')}</span>`}</div>
        <strong>${name}</strong>
        ${isLowest ? '<span class="ecompare-lowest-badge"><i class="fa-solid fa-tag" aria-hidden="true"></i> Menor preço</span>' : ''}
        <span class="ecompare-column-id">ID: ${safeHtml(product.id)}</span>
      </div>
    </th>`;
  }).join('');

  const renderRow = (label, values, className = '') => `<tr class="${className}"><th scope="row">${safeHtml(label)}</th>${values.map(value => `<td>${value}</td>`).join('')}</tr>`;
  const priceCells = selected.map(product => {
    const price = Number(product.price) || 0;
    const isLowest = lowestPrice !== null && price === lowestPrice;
    return `<strong class="ecompare-price ${isLowest ? 'is-lowest' : ''}">${safeHtml(priceText(price))}</strong>`;
  });
  const ratingCells = selected.map(product => {
    const rating = Number(product.rating) || 0;
    const reviews = Number(product.reviews) || 0;
    return `<span class="ecompare-rating"><strong>★ ${rating.toFixed(1).replace('.', ',')}</strong><small>${reviews.toLocaleString('pt-BR')} avaliações</small></span>`;
  });
  const storeCells = selected.map(product => {
    const store = stores.get(String(product.loja_id)) || null;
    if (!store) return '<span class="ecompare-not-informed">Vendedor não informado</span>';
    const name = safeHtml(store.nome_loja || 'Loja');
    const slug = String(store.slug_url || '').trim();
    const status = String(store.status || '').trim().toLowerCase();
    const active = slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) && (!status || ['ativa', 'active'].includes(status));
    const logo = safeProductStoreImage(store.logo_url) || safeProductStoreImage(store.logo_base64);
    const logoHtml = logo ? `<img src="${safeHtml(logo)}" alt="" loading="lazy">` : `<span>${safeHtml((store.nome_loja || 'L').charAt(0).toLocaleUpperCase('pt-BR'))}</span>`;
    const contentHtml = `<span class="ecompare-seller-logo">${logoHtml}</span><strong>${name}</strong>`;
    return active ? `<a class="ecompare-seller-link" href="/store/@${encodeURIComponent(slug)}">${contentHtml}<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>` : `<span class="ecompare-seller-link is-static">${contentHtml}</span>`;
  });
  const specificationRows = specKeys.length
    ? specKeys.map(key => renderRow(key, specsByProduct.map(map => map.has(key) ? safeHtml(map.get(key)) : '<span class="ecompare-not-informed">Não informado</span>'), 'ecompare-spec-row')).join('')
    : renderRow('Especificações', selected.map(() => '<span class="ecompare-not-informed">Não informadas</span>'), 'ecompare-spec-row');

  content.innerHTML = `
    <div class="ecompare-table-intro"><span><i class="fa-solid fa-arrows-left-right" aria-hidden="true"></i> Deslize horizontalmente para ver todos os produtos.</span></div>
    <div class="ecompare-table-scroll"><table class="ecompare-table"><thead><tr><th scope="col" class="ecompare-label-column">Produto</th>${columns}</tr></thead><tbody>
      ${renderRow('Preço', priceCells, 'ecompare-price-row')}
      ${renderRow('Avaliações', ratingCells)}
      <tr class="ecompare-group-row"><th colspan="${selected.length + 1}">Especificações</th></tr>
      ${specificationRows}
      ${renderRow('Frete e envio', selected.map(product => safeHtml(productCompareShipping(product, stores.get(String(product.loja_id)) || null))))}
      ${renderRow('Garantia', selected.map(product => safeHtml(productCompareWarranty(product))))}
      ${renderRow('Vendedor', storeCells)}
    </tbody></table></div>
    <div class="ecompare-bottom-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> O custo final do frete pode variar conforme o endereço de entrega. Confira as condições na etapa de compra.</div>`;
}

async function showProductCompareTable() {
  if (productCompareState.selected.length < 2 || productCompareState.selected.length > 5) return;
  productCompareState.view = 'compare';
  productCompareState.loadingStores = true;
  productCompareState.stores = new Map();
  renderProductCompareTable();
  try {
    productCompareState.stores = await loadProductCompareStores(productCompareState.selected);
  } catch (error) {
    console.error('Não foi possível carregar todos os vendedores da comparação:', error);
  } finally {
    productCompareState.loadingStores = false;
    if (productCompareState.view === 'compare') renderProductCompareTable();
  }
}
