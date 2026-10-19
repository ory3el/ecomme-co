(() => {
  'use strict';

  const SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';
  const PAGE_SIZE = 12;

  const grid = document.getElementById('pgrid');
  const noResults = document.getElementById('noResults');
  const searchInput = document.getElementById('searchInput');

  if (!grid || !searchInput) return;

  const state = {
    query: '',
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    sort: 'rel',
    rows: [],
    requestId: 0
  };

  let client = null;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function parseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  function getCategory(value) {
    const parts = parseArray(value)
      .map(item => typeof item === 'string' ? item : (item?.name || item?.label || ''))
      .map(item => String(item || '').trim())
      .filter(Boolean);
    return parts.join(', ') || 'Geral';
  }

  function getImage(row) {
    const gallery = parseArray(row.gallery_urls);
    const candidate = row.image_url || gallery.find(Boolean) || row.image || '';
    if (!candidate) return '';
    try {
      const parsed = new URL(String(candidate), location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function normalizeProduct(row) {
    const price = Number(row.price) || 0;
    const old = Number(row.old) || 0;
    const storedDiscount = Number(row.discount);
    const discount = storedDiscount > 0
      ? storedDiscount
      : (old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0);

    const features = parseArray(row.features).filter(Boolean);
    const gallery = parseArray(row.gallery_urls).filter(Boolean);

    return {
      ...row,
      id: String(row.id),
      name: String(row.name || 'Produto sem nome'),
      desc: String(row.desc || row.description || ''),
      price,
      old,
      disc: discount,
      discount,
      rat: Number(row.rating) || 0,
      rating: Number(row.rating) || 0,
      reviews: Number(row.reviews) || 0,
      cat: getCategory(row.cat),
      brand: String(row.brand || row.brand_name || row.marca || row.manufacturer || ''),
      ship: Boolean(row.shipping ?? row.ship ?? false),
      stock: Number(row.stock ?? row.quantity ?? 0) || 0,
      badge: ['hot', 'new', 'sale', 'top'].includes(String(row.badge || '').toLowerCase())
        ? String(row.badge).toLowerCase()
        : '',
      em: String(row.emoji || row.em || '📦'),
      imageUrl: getImage(row),
      feats: features,
      features,
      gallery_urls: gallery
    };
  }

  function applySort(builder, sort) {
    switch (sort) {
      case 'asc':
        return builder.order('price', { ascending: true }).order('id', { ascending: true });
      case 'desc':
        return builder.order('price', { ascending: false }).order('id', { ascending: true });
      case 'rat':
        return builder.order('rating', { ascending: false }).order('id', { ascending: true });
      case 'disc':
        return builder.order('discount', { ascending: false }).order('id', { ascending: true });
      case 'pop':
        return builder.order('reviews', { ascending: false }).order('id', { ascending: true });
      case 'new':
        return builder.order('created_at', { ascending: false }).order('id', { ascending: false });
      default:
        return builder.order('id', { ascending: true });
    }
  }

  async function requestPage(query, page, sort, categoryFallback) {
    let builder = client.from('products').select('*', { count: 'exact' });

    if (categoryFallback === 'contains' && query.trim()) {
      builder = builder.contains('cat', [query.trim()]);
    } else if (categoryFallback === 'ilike' && query.trim()) {
      builder = builder.ilike('cat', `%${query.trim().replace(/[%,_*()]/g, ' ')}%`);
    } else {
      const phrase = String(query || '')
        .trim()
        .replace(/[(),%_*\\'"`]/g, ' ')
        .replace(/\s+/g, ' ');
      if (phrase) {
        builder = builder.or(`name.ilike.%${phrase}%,desc.ilike.%${phrase}%`);
      }
    }

    builder = applySort(builder, sort);
    return builder.range((page - 1) * state.pageSize, page * state.pageSize - 1);
  }

  function showLoading(query) {
    noResults?.classList.remove('on');
    grid.innerHTML = `
      <div class="search-loading" role="status" aria-live="polite">
        <span class="search-spinner" aria-hidden="true"></span>
        <span>${query ? `Buscando “${escapeHTML(query)}”...` : 'Carregando produtos...'}</span>
      </div>`;
    const count = document.getElementById('resultCount');
    if (count) count.textContent = 'Buscando...';
    const sub = document.getElementById('toolbarSub');
    if (sub) sub.textContent = 'Consultando o catálogo da Ecomme...';
  }

  function updateQueryUI(query, page) {
    searchInput.value = query;
    const badge = document.getElementById('queryTerm');
    const badge2 = document.getElementById('queryTermBadge');
    const shown = query ? `“${query}”` : 'Produtos recentes';
    if (badge) badge.textContent = shown;
    if (badge2) badge2.textContent = shown;

    const title = document.getElementById('toolbarTitle');
    if (title) {
      title.innerHTML = query
        ? `Resultados para <em>“${escapeHTML(query)}”</em>`
        : 'Produtos recentes na Ecomme';
    }

    document.title = query
      ? `Ecomme — Resultados: "${query}"`
      : 'Ecomme — Produtos recentes';

    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (page > 1) url.searchParams.set('page', String(page));
    else url.searchParams.delete('page');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);

    const relatedTitle = document.querySelector('.related-section .sec-title');
    if (relatedTitle) relatedTitle.textContent = query
      ? `Mais produtos relacionados a “${query}”`
      : 'Produtos para explorar';
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }

  function renderLiveGrid(rows) {
    if (!rows.length) {
      grid.innerHTML = '';
      noResults?.classList.add('on');

      const q = document.getElementById('noResultsQuery');
      if (q) q.textContent = state.query ? `“${state.query}”` : 'o catálogo';
      const title = noResults?.querySelector('.nr-title');
      if (title) title.textContent = 'Nenhum produto encontrado';

      const subtitle = noResults?.querySelector('.nr-sub');
      if (subtitle) {
        subtitle.textContent = state.query
          ? `Não encontramos produtos para “${state.query}”. Tente outro termo ou explore o catálogo.`
          : 'Ainda não há produtos disponíveis para exibir.';
      }

      const suggestions = document.getElementById('noResultsSug');
      if (suggestions) {
        const candidates = Array.isArray(window.AC_SUGGESTIONS)
          ? window.AC_SUGGESTIONS
          : ['iPhone', 'Notebook', 'Smartwatch'];
        suggestions.innerHTML = candidates.map(term =>
          `<button type="button" class="nr-sug-chip" data-search-term="${escapeHTML(term)}">${escapeHTML(term)}</button>`
        ).join('');
        suggestions.querySelectorAll('[data-search-term]').forEach(button => {
          button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1));
        });
      }
      return;
    }

    noResults?.classList.remove('on');
    grid.className = 'pgrid' + (currentView === 'l' ? ' lv' : currentView === 'g4' ? ' grd4' : '');

    grid.innerHTML = rows.map((p, index) => {
      const image = p.imageUrl
        ? `<img class="pimg-photo" src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" decoding="async">`
        : '';
      const badge = typeof window.badgeHtml === 'function' ? window.badgeHtml(p.badge) : '';
      const freeShipping = p.ship
        ? '<span class="pbadge pb-free">Frete grátis</span>'
        : '';
      const old = p.old > p.price
        ? `<span class="pold-price">${formatCurrency(p.old)}</span><span class="pdisc">-${p.disc}%</span>`
        : '';
      const imageFallback = escapeHTML(p.em || '📦');
      const href = `/product/${encodeURIComponent(p.id)}/`;
      const rating = p.rat > 0 ? p.rat.toFixed(1).replace('.', ',') : '—';
      const reviewsText = p.reviews > 0
        ? `(${p.reviews.toLocaleString('pt-BR')})`
        : '(sem avaliações)';
      const stockTag = p.stock > 0 && p.stock < 5
        ? `<span class="tag-red" style="margin-left:auto;background:rgba(220,38,38,.1);color:var(--red);font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">Estoque: ${p.stock}</span>`
        : '';

      return `
        <a class="pcard ${index === 0 && currentView !== 'l' ? 'pcard-featured' : ''}" href="${href}" data-product-id="${escapeHTML(p.id)}">
          <div class="pimg-wrap">
            <div class="pimg">
              <span class="pimg-placeholder">${imageFallback}</span>
              ${image}
            </div>
            <div class="pcard-badges">${badge}${freeShipping}</div>
          </div>
          <div class="pcard-info">
            <div class="pcat-row">
              <span class="pcat">${escapeHTML(p.cat)}</span>
              ${p.brand ? `<span class="tag-ghost" style="background:rgba(148,163,184,.12);color:var(--stone);font-size:9px;font-weight:600;padding:1px 6px;border-radius:4px">${escapeHTML(p.brand)}</span>` : ''}
            </div>
            <div class="pname">${escapeHTML(p.name)}</div>
            <div class="prat">
              <div class="pstars">${typeof window.stars === 'function' ? window.stars(p.rat) : ''}</div>
              <span class="prat-score">${rating}</span>
              <span class="prat-count">${reviewsText}</span>
            </div>
            <div class="pprice-row">
              <span class="pprice">${formatCurrency(p.price)}</span>
              ${old}
            </div>
            <div class="pinstall">ou <strong>12 × ${formatCurrency(p.price / 12)}</strong> sem juros</div>
            ${p.ship ? '<div class="pship">Frete grátis</div>' : ''}
            <div class="pseller">
              <div class="pseller-av">E</div>
              <span>Marketplace Ecomme</span>
              ${stockTag}
            </div>
          </div>
        </a>`;
    }).join('');

    grid.querySelectorAll('img.pimg-photo').forEach(img => {
      const markLoaded = () => {
        if (!img.isConnected) return;
        img.classList.add('is-loaded');
        img.closest('.pimg')?.classList.add('has-image');
      };
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
      if (img.complete && img.naturalWidth > 0) markLoaded();
    });
  }

  function renderLivePagination() {
    const el = document.getElementById('pagination');
    if (!el) return;

    const pageCount = Math.ceil(state.total / state.pageSize);
    if (!pageCount) {
      el.innerHTML = '';
      return;
    }

    const start = Math.max(1, Math.min(state.page - 2, pageCount - 4));
    const end = Math.min(pageCount, start + 4);
    let html = `
      <button class="pgbtn" ${state.page <= 1 ? 'disabled' : ''} onclick="goPage(${state.page - 1})" aria-label="Página anterior">←</button>`;

    for (let n = start; n <= end; n++) {
      html += `<button class="pgbtn ${n === state.page ? 'on' : ''}" onclick="goPage(${n})" ${n === state.page ? 'aria-current="page"' : ''}>${n}</button>`;
    }

    html += `
      <button class="pgbtn" ${state.page >= pageCount ? 'disabled' : ''} onclick="goPage(${state.page + 1})" aria-label="Próxima página">→</button>
      <div class="per-page">
        <span>Por página:</span>
        <select aria-label="Resultados por página" onchange="ecommeSetPageSize(this.value)">
          ${[12, 24, 48].map(size => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size}</option>`).join('')}
        </select>
      </div>`;
    el.innerHTML = html;
  }

  function renderLiveBrands(rows) {
    const element = document.getElementById('brandList');
    if (!element) return;
    const counts = new Map();
    rows.forEach(row => {
      if (!row.brand) return;
      counts.set(row.brand, (counts.get(row.brand) || 0) + 1);
    });
    const brandRows = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    BRANDS = brandRows.map(([name, count]) => ({
      name, count, rating: 0
    }));

    if (!brandRows.length) {
      element.innerHTML = '<div class="fs12 clr-stone">As marcas não estão informadas nos produtos desta página.</div>';
      return;
    }

    element.innerHTML = brandRows.map(([name, count]) => `
      <label class="brand-item">
        <input type="checkbox" data-brand-filter="${escapeHTML(name)}">
        <span class="brand-name">${escapeHTML(name)}</span>
        <span class="brand-count">(${count})</span>
      </label>`).join('');

    element.querySelectorAll('[data-brand-filter]').forEach(input => {
      input.addEventListener('change', () => {
        const selected = [...element.querySelectorAll('[data-brand-filter]:checked')].map(item => item.dataset.brandFilter);
        const filtered = selected.length ? state.rows.filter(p => selected.includes(p.brand)) : state.rows;
        renderLiveGrid(filtered);
        if (selected.length) {
          const sub = document.getElementById('toolbarSub');
          if (sub) sub.textContent = `${filtered.length} produtos nesta página · Marca filtrada`;
        }
      });
    });
  }

  function renderLiveRatings(rows) {
    const element = document.getElementById('ratingList');
    if (!element) return;
    const items = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: rows.filter(p => p.rat >= stars).length
    }));
    const total = Math.max(rows.length, 1);
    element.innerHTML = items.map(item => {
      const pct = Math.round(item.count / total * 100);
      return `
        <div class="rating-item" data-rating-filter="${item.stars}">
          <input type="radio" name="rat" style="accent-color:var(--blue)">
          <div class="stars-row">${Array.from({ length: 5 }, (_, i) => `<span class="star ${i < item.stars ? 'on' : 'off'}">★</span>`).join('')}</div>
          <span class="rat-count">(${item.count})</span>
          <div class="rat-bar"><div class="rat-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    element.querySelectorAll('[data-rating-filter]').forEach(item => {
      item.addEventListener('click', () => {
        element.querySelectorAll('.rating-item').forEach(other => other.classList.remove('on'));
        item.classList.add('on');
        const minimum = Number(item.dataset.ratingFilter);
        renderLiveGrid(state.rows.filter(p => p.rat >= minimum));
      });
    });
  }

  function renderLiveRelated(rows) {
    const container = document.getElementById('relatedScroll');
    if (container) {
      const products = rows.slice(0, 8);
      container.innerHTML = products.map(p => `
        <a class="rcard" href="/product/${encodeURIComponent(p.id)}/">
          <div class="rcard-img">${p.imageUrl
            ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy">`
            : escapeHTML(p.em || '📦')}</div>
          <div class="rcard-info">
            <div class="rcard-name">${escapeHTML(p.name)}</div>
            <div class="rcard-price">${formatCurrency(p.price)}</div>
          </div>
        </a>`).join('');
      const section = container.closest('.related-section');
      if (section) section.hidden = !products.length;
    }

    const tags = document.getElementById('relatedTags');
    if (tags) {
      const suggested = [
        state.query ? `${state.query} barato` : 'Ofertas',
        'iPhone', 'Notebook', 'Fone Bluetooth', 'Smartwatch',
        'Câmera', 'Acessórios'
      ].filter((term, index, array) => array.indexOf(term) === index);
      tags.innerHTML = suggested.map(term => `
        <button class="stag-chip" data-search-term="${escapeHTML(term)}">
          <span class="stag-ico">⌕</span>${escapeHTML(term)}
        </button>`).join('');
      tags.querySelectorAll('[data-search-term]').forEach(button => {
        button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1));
      });
    }
  }

  async function runSearch(query, page = 1) {
    if (!client) {
      showLoading(query);
      grid.innerHTML = '<div class="search-loading search-error">Não foi possível iniciar a busca. A biblioteca do Supabase não carregou.</div>';
      return;
    }

    state.query = String(query ?? '').trim();
    state.page = Math.max(1, Number(page) || 1);
    const requestId = ++state.requestId;
    updateQueryUI(state.query, state.page);
    showLoading(state.query);

    let result;
    try {
      result = await requestPage(state.query, state.page, state.sort, '');
      if (!result.error && !(result.data || []).length && state.query) {
        const categoryResult = await requestPage(state.query, state.page, state.sort, 'contains');
        if (!categoryResult.error && (categoryResult.data || []).length) {
          result = categoryResult;
        } else {
          const textCategoryResult = await requestPage(state.query, state.page, state.sort, 'ilike');
          if (!textCategoryResult.error && (textCategoryResult.data || []).length) {
            result = textCategoryResult;
          }
        }
      }

      if (result.error && state.sort !== 'rel') {
        console.warn('[Ecomme search] Ordenação alternativa indisponível; usando a ordem padrão.', result.error);
        state.sort = 'rel';
        const sort = document.getElementById('sortSel');
        if (sort) sort.value = 'rel';
        result = await requestPage(state.query, state.page, 'rel', '');
      }
    } catch (error) {
      result = { error };
    }

    if (requestId !== state.requestId) return;

    if (result?.error) {
      console.error('[Ecomme search] Erro ao consultar o catálogo:', result.error);
      grid.innerHTML = '';
      noResults?.classList.add('on');
      const title = noResults?.querySelector('.nr-title');
      if (title) title.textContent = 'Não foi possível carregar os produtos';
      const subtitle = noResults?.querySelector('.nr-sub');
      if (subtitle) subtitle.textContent = 'Verifique a conexão e tente novamente em alguns instantes.';
      const count = document.getElementById('resultCount');
      if (count) count.textContent = 'Erro na busca';
      const sub = document.getElementById('toolbarSub');
      if (sub) sub.textContent = 'O catálogo não respondeu à consulta.';
      const pagination = document.getElementById('pagination');
      if (pagination) pagination.innerHTML = '';
      return;
    }

    const rawRows = Array.isArray(result.data) ? result.data : [];
    const mapped = rawRows.map(normalizeProduct);
    const total = Number(result.count ?? mapped.length) || 0;

    state.rows = mapped;
    state.total = total;
    PRODUCTS = mapped;
    RELATED_PRODS = mapped.slice(0, 8);

    renderLiveGrid(mapped);
    renderLivePagination();
    renderLiveBrands(mapped);
    renderLiveRatings(mapped);
    renderLiveRelated(mapped);

    const countText = `${total.toLocaleString('pt-BR')} ${total === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
    const count = document.getElementById('resultCount');
    if (count) count.textContent = countText;
    const sub = document.getElementById('toolbarSub');
    if (sub) {
      const start = total ? ((state.page - 1) * state.pageSize + 1) : 0;
      const end = Math.min(state.page * state.pageSize, total);
      const labels = { rel: 'relevância', pop: 'popularidade', new: 'recentes', asc: 'menor preço', desc: 'maior preço', rat: 'melhor avaliação', disc: 'maior desconto' };
      sub.textContent = `${start}${total ? `–${end}` : ''} de ${total} produtos · Ordenado por ${labels[state.sort] || 'relevância'}`;
    }

    const rangeMin = document.getElementById('rangeMin');
    const rangeMax = document.getElementById('rangeMax');
    if (rangeMin && rangeMax && mapped.length) {
      const maxPrice = Math.max(8000, ...mapped.map(p => Math.ceil(p.price / 1000) * 1000));
      rangeMin.max = String(maxPrice);
      rangeMax.max = String(maxPrice);
      if (Number(rangeMax.value) < maxPrice) rangeMax.value = String(maxPrice);
    }
  }

  window.ecommeRunSearch = runSearch;
  window.doSearch = function (query) {
    const term = typeof query === 'string' ? query.trim() : searchInput.value.trim();
    return runSearch(term, 1);
  };
  window.goPage = function (page) {
    if (page < 1 || page > Math.ceil(state.total / state.pageSize)) return;
    runSearch(state.query, page);
    const target = document.querySelector('.page-body');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.doSort = function (sort) {
    state.sort = String(sort || 'rel');
    runSearch(state.query, 1);
  };
  window.ecommeSetPageSize = function (size) {
    state.pageSize = [12, 24, 48].includes(Number(size)) ? Number(size) : PAGE_SIZE;
    runSearch(state.query, 1);
  };
  window.renderGrid = renderLiveGrid;
  window.renderBrands = () => renderLiveBrands(state.rows);
  window.renderRatings = () => renderLiveRatings(state.rows);
  window.renderRelated = () => renderLiveRelated(state.rows);

  window.onSearchInput = function (input) {
    const value = String(input?.value || '').trim().toLowerCase();
    const drop = document.getElementById('acDrop');
    const tags = document.getElementById('acSugTags');
    const items = document.getElementById('acItems');
    if (!value) {
      if (drop) drop.style.display = 'none';
      if (tags) tags.innerHTML = '';
      if (items) items.innerHTML = '';
      return;
    }
    if (drop) drop.style.display = '';
    const suggestions = (Array.isArray(AC_SUGGESTIONS) ? AC_SUGGESTIONS : ['iPhone', 'Notebook', 'Smartwatch'])
      .filter(item => item.toLowerCase().includes(value))
      .slice(0, 6);
    if (tags) {
      tags.innerHTML = suggestions.map(term =>
        `<button type="button" class="ac-tag" data-search-term="${escapeHTML(term)}">⌕ ${escapeHTML(term)}</button>`
      ).join('');
      tags.querySelectorAll('[data-search-term]').forEach(button => {
        button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1));
      });
    }
    const suggestionsFromRows = state.rows.filter(p =>
      p.name.toLowerCase().includes(value) ||
      p.cat.toLowerCase().includes(value) ||
      p.brand.toLowerCase().includes(value)
    ).slice(0, 4);
    if (items) {
      items.innerHTML = suggestionsFromRows.map(p => `
        <a class="ac-item" href="/product/${encodeURIComponent(p.id)}/">
          <div class="ac-item-ico">${p.imageUrl
            ? `<img src="${escapeHTML(p.imageUrl)}" alt="" loading="lazy">`
            : escapeHTML(p.em)}</div>
          <div style="flex:1;min-width:0">
            <div class="ac-item-name">${escapeHTML(p.name.slice(0, 50))}${p.name.length > 50 ? '…' : ''}</div>
            <div class="ac-item-cat">${escapeHTML(p.cat)}${p.brand ? ` · ${escapeHTML(p.brand)}` : ''}</div>
          </div>
          <div class="ac-item-price">${formatCurrency(p.price)}</div>
        </a>`).join('');
    }
  };

  window.onSearchKey = function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch(searchInput.value, 1);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const firstQuery = params.get('q') || '';
  const firstPage = Number(params.get('page')) || 1;
  state.sort = params.get('sort') || (firstQuery ? 'rel' : 'new');
  const initialSort = document.getElementById('sortSel');
  if (initialSort) initialSort.value = state.sort;
  runSearch(firstQuery, firstPage);
})();
