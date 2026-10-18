/* ECOMME — página dinâmica /product/:id */
let currentProduct = null;
let productPageQty = 1;
let productPageImages = [];

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
    reviewList.replaceChildren();

    const msg = document.createElement('p');
    msg.className = 'rev-text';

    msg.textContent = 'Carregando avaliações deste produto...';

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

function renderProductReviewItems(items, ownReviewId = null) {
  const list = document.querySelector('.rev-list');
  if (!list) return;

  ensureProductReviewInteractionHandlers(list);
  list.replaceChildren();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'rev-text rev-empty';
    empty.textContent = 'Este produto ainda não possui avaliações. Seja a primeira pessoa a compartilhar sua experiência.';
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
      title.textContent = review.title;
      item.appendChild(title);
    }

    const comment = document.createElement('p');
    comment.className = 'rev-text';
    comment.textContent = review.comment || '';
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

async function loadProductReviews(product) {
  if (!product?.id || typeof supabaseClient === 'undefined') return;

  const productId = String(product.id);
  const list = document.querySelector('.rev-list');

  try {
    const userResult = await supabaseClient.auth.getUser();
    const user = userResult?.data?.user || null;

    const requests = [
      supabaseClient.rpc('product_review_summary', {
        p_product_id: productId
      }),
      supabaseClient
        .from('product_reviews')
        .select('id, product_id, rating, title, comment, created_at, reviewer_name, reviewer_avatar')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20)
    ];

    // Procura a avaliação do usuário separadamente, porque ela pode ser mais antiga
    // do que as 20 avaliações recentes exibidas na página.
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

    if (summaryResult.error) throw summaryResult.error;
    if (reviewsResult.error) throw reviewsResult.error;
    if (ownReviewResult?.error) throw ownReviewResult.error;

    const summary = Array.isArray(summaryResult.data)
      ? summaryResult.data[0]
      : summaryResult.data;

    const ownReview = ownReviewResult?.data || null;
    const reviewRows = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
    const engagementById = new Map();

    // Curtidas ficam em uma tabela privada e são lidas por uma RPC que retorna
    // somente contagens e se o usuário atual já curtiu cada avaliação.
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

    applyProductReviewSummary(summary || {});
    renderProductReviewItems(reviewRows.map(review => ({
      ...review,
      ...(engagementById.get(String(review.id)) || { likes_count: 0, liked_by_me: false })
    })), ownReview?.id);
    const writeButton = document.querySelector('.btn-write-rev');
    if (writeButton) {
      writeButton.textContent = ownReview ? 'Editar minha avaliação' : 'Escrever avaliação';
      writeButton.setAttribute('aria-label', ownReview ? 'Editar minha avaliação' : 'Escrever avaliação');
    }

    if (window.location.hash === '#tab-reviews') {
      requestAnimationFrame(() => goToTab('reviews'));
    }
  } catch (error) {
    console.error('Erro ao consultar avaliações no Supabase:', error);

    if (list) {
      list.replaceChildren();
      const message = document.createElement('p');
      message.className = 'rev-text';
      message.textContent = 'Não foi possível carregar as avaliações agora. Tente novamente em instantes.';
      list.appendChild(message);
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
