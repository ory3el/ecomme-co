(() => {
  'use strict';

  function boot() {
    const SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';
    const PAGE_SIZE = 12;
    const grid = document.getElementById('pgrid');
    const noResults = document.getElementById('noResults');
    const searchInput = document.getElementById('searchInput');
    if (!grid || !searchInput) return;

    const state = {
      query: '', page: 1, pageSize: PAGE_SIZE, total: 0, sort: 'rel', rows: [], facets: null,
      requestId: 0, priceMin: 0, priceMax: 0, priceTimer: null,
      filters: { category: null, minPrice: null, maxPrice: null, brands: [], minRating: null, freeShipping: false, discountOnly: false }
    };

    let client = null;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }

    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    const numberOrNull = value => value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value);

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
      return parseArray(value)
        .map(item => typeof item === 'string' ? item : (item?.name || item?.label || ''))
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(', ') || 'Geral';
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
      const discount = storedDiscount > 0 ? storedDiscount : (old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0);
      const features = parseArray(row.features).filter(Boolean);
      return {
        ...row,
        id: String(row.id), name: String(row.name || 'Produto sem nome'), desc: String(row.desc || row.description || ''),
        price, old, disc: discount, discount, rat: Number(row.rating) || 0, rating: Number(row.rating) || 0,
        reviews: Number(row.reviews) || 0, cat: getCategory(row.cat),
        brand: String(row.brand || row.brand_name || row.marca || row.manufacturer || ''),
        ship: row.shipping === true || row.shipping === 'true' || row.shipping === 1,
        stock: Number(row.stock ?? row.quantity ?? 0) || 0,
        badge: ['hot', 'new', 'sale', 'top'].includes(String(row.badge || '').toLowerCase()) ? String(row.badge).toLowerCase() : '',
        em: String(row.emoji || row.em || '📦'), imageUrl: getImage(row), feats: features, features,
        gallery_urls: parseArray(row.gallery_urls).filter(Boolean)
      };
    }

    function getRpcArgs(query, page, sort) {
      return {
        p_query: String(query || '').trim() || null,
        p_page: page,
        p_page_size: state.pageSize,
        p_sort: sort || 'rel',
        p_category: state.filters.category || null,
        p_min_price: state.filters.minPrice,
        p_max_price: state.filters.maxPrice,
        p_brands: state.filters.brands,
        p_min_rating: state.filters.minRating,
        p_free_shipping: state.filters.freeShipping,
        p_discount_only: state.filters.discountOnly
      };
    }

    function getRequestParams(query, page, sort) {
      const params = new URLSearchParams({ q: query || '', page: String(page), sort: sort || 'rel', limit: String(state.pageSize) });
      const filters = state.filters;
      if (filters.category) params.set('category', filters.category);
      if (filters.minPrice !== null) params.set('min_price', String(filters.minPrice));
      if (filters.maxPrice !== null) params.set('max_price', String(filters.maxPrice));
      if (filters.minRating !== null) params.set('min_rating', String(filters.minRating));
      filters.brands.forEach(brand => params.append('brand', brand));
      if (filters.freeShipping) params.set('free_shipping', '1');
      if (filters.discountOnly) params.set('discount_only', '1');
      return params;
    }

    async function requestPage(query, page, sort) {
      const params = getRequestParams(query, page, sort);
      if (window.__ecommeSearchEdgeAvailable !== false) {
        try {
          const response = await fetch(`/api/search?${params.toString()}`, {
            method: 'GET', credentials: 'omit', cache: 'default', headers: { Accept: 'application/json' }
          });
          if (response.headers.get('x-ecomme-search-api') === '1' && response.ok) {
            window.__ecommeSearchEdgeAvailable = true;
            const payload = await response.json();
            return {
              data: Array.isArray(payload?.data) ? payload.data : [],
              count: Number(payload?.count) || 0,
              facets: payload?.facets || null,
              error: null
            };
          }
          if (response.status === 404 || response.status === 503 || response.headers.get('x-ecomme-search-api') !== '1') {
            window.__ecommeSearchEdgeAvailable = false;
          } else {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.detail || payload?.error || `Edge Search HTTP ${response.status}`);
          }
        } catch (error) {
          if (error instanceof TypeError || /Failed to fetch|NetworkError/i.test(String(error?.message || ''))) {
            window.__ecommeSearchEdgeAvailable = false;
          } else {
            console.warn('[Ecomme search] Endpoint de busca indisponível; tentando RPC direto.', error);
            if (String(error?.message || '').includes('migração de filtros')) throw error;
            window.__ecommeSearchEdgeAvailable = false;
          }
        }
      }

      if (!client) return { data: [], count: 0, facets: null, error: new Error('A conexão com a busca não está disponível.') };
      try {
        const { data, error } = await client.rpc('ecomme_search_products', getRpcArgs(query, page, sort));
        if (error) throw error;
        if (!data || !Array.isArray(data.data)) throw new Error('A resposta da busca está em formato inválido.');
        return { data: data.data, count: Number(data.count) || 0, facets: data.facets || null, error: null };
      } catch (error) {
        return { data: [], count: 0, facets: null, error };
      }
    }

    function updateQueryUI(query, page) {
      searchInput.value = query;
      const shown = query ? `“${query}”` : 'Produtos recentes';
      const term = document.getElementById('queryTerm');
      const badge = document.getElementById('queryTermBadge');
      if (term) term.textContent = shown;
      if (badge) badge.textContent = shown;

      const title = document.getElementById('toolbarTitle');
      if (title) title.innerHTML = query ? `Resultados para <em>“${escapeHTML(query)}”</em>` : 'Produtos recentes na Ecomme';
      document.title = query ? `Ecomme — Resultados: "${query}"` : 'Ecomme — Produtos recentes';

      const url = new URL(window.location.href);
      ['q', 'page', 'sort', 'category', 'min_price', 'max_price', 'min_rating', 'brand', 'free_shipping', 'discount_only'].forEach(key => url.searchParams.delete(key));
      if (query) url.searchParams.set('q', query);
      if (page > 1) url.searchParams.set('page', String(page));
      if (state.sort !== 'rel') url.searchParams.set('sort', state.sort);
      const filters = state.filters;
      if (filters.category) url.searchParams.set('category', filters.category);
      if (filters.minPrice !== null) url.searchParams.set('min_price', String(filters.minPrice));
      if (filters.maxPrice !== null) url.searchParams.set('max_price', String(filters.maxPrice));
      if (filters.minRating !== null) url.searchParams.set('min_rating', String(filters.minRating));
      filters.brands.forEach(brand => url.searchParams.append('brand', brand));
      if (filters.freeShipping) url.searchParams.set('free_shipping', '1');
      if (filters.discountOnly) url.searchParams.set('discount_only', '1');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);

      const relatedTitle = document.querySelector('.related-section .sec-title');
      if (relatedTitle) relatedTitle.textContent = query ? `Mais produtos relacionados a “${query}”` : 'Produtos para explorar';
    }

    function showLoading(query) {
      noResults?.classList.remove('on');
      grid.innerHTML = `<div class="search-loading" role="status" aria-live="polite"><span class="search-spinner" aria-hidden="true"></span><span>${query ? `Buscando “${escapeHTML(query)}”...` : 'Carregando produtos...'}</span></div>`;
      const count = document.getElementById('resultCount');
      const sub = document.getElementById('toolbarSub');
      if (count) count.textContent = 'Buscando...';
      if (sub) sub.textContent = 'Consultando o catálogo da Ecomme...';
    }

    function renderLiveGrid(rows) {
      if (!rows.length) {
        grid.innerHTML = '';
        noResults?.classList.add('on');
        const query = document.getElementById('noResultsQuery');
        if (query) query.textContent = state.query ? `“${state.query}”` : 'o catálogo';
        const title = noResults?.querySelector('.nr-title');
        if (title) title.textContent = 'Nenhum produto encontrado';
        const subtitle = noResults?.querySelector('.nr-sub');
        if (subtitle) subtitle.textContent = state.query
          ? `Não encontramos produtos para “${state.query}” com os filtros selecionados. Ajuste os filtros ou tente outro termo.`
          : 'Não encontramos produtos com os filtros selecionados. Ajuste os filtros para ver mais resultados.';
        const suggestions = document.getElementById('noResultsSug');
        if (suggestions) {
          const terms = ['iPhone', 'Notebook', 'Smartwatch'];
          suggestions.innerHTML = terms.map(term => `<button type="button" class="nr-sug-chip" data-search-term="${escapeHTML(term)}">${escapeHTML(term)}</button>`).join('');
          suggestions.querySelectorAll('[data-search-term]').forEach(button => button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1)));
        }
        return;
      }

      noResults?.classList.remove('on');
      const view = typeof currentView === 'string' ? currentView : 'g';
      grid.className = 'pgrid' + (view === 'l' ? ' lv' : view === 'g4' ? ' grd4' : '');
      grid.innerHTML = rows.map((product, index) => {
        const image = product.imageUrl
          ? `<img class="pimg-photo" src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async">`
          : '';
        const badge = typeof window.badgeHtml === 'function' ? window.badgeHtml(product.badge, product.created_at, product.id) : '';
        const freeShipping = product.ship ? '<span class="pbadge pb-free">Frete grátis</span>' : '';
        const oldPrice = product.old > product.price ? `<span class="pold-price">${formatCurrency(product.old)}</span>` : '';
        const discountBadge = product.disc > 0 ? `<span class="pdisc">-${product.disc}%</span>` : '';
        const old = oldPrice + discountBadge;
        const rating = product.rat > 0 ? product.rat.toFixed(1).replace('.', ',') : '—';
        const reviewsText = product.reviews > 0 ? `(${product.reviews.toLocaleString('pt-BR')})` : '(sem avaliações)';
        const stockTag = product.stock > 0 && product.stock < 5
          ? `<span class="tag-red" style="margin-left:auto;background:rgba(220,38,38,.1);color:var(--red);font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">Estoque: ${product.stock}</span>`
          : '';
        return `
          <a class="pcard ${index === 0 && view !== 'l' ? 'pcard-featured' : ''}" href="/product/${encodeURIComponent(product.id)}/" data-product-id="${escapeHTML(product.id)}">
            <div class="pimg-wrap"><div class="pimg"><span class="pimg-placeholder">${escapeHTML(product.em || '📦')}</span>${image}</div><div class="pcard-badges">${badge}${freeShipping}</div></div>
            <div class="pcard-info">
              <div class="pcat-row"><span class="pcat">${escapeHTML(product.cat)}</span>${product.brand ? `<span class="tag-ghost" style="background:rgba(148,163,184,.12);color:var(--stone);font-size:9px;font-weight:600;padding:1px 6px;border-radius:4px">${escapeHTML(product.brand)}</span>` : ''}</div>
              <div class="pname">${escapeHTML(product.name)}</div>
              <div class="prat"><div class="pstars">${typeof window.stars === 'function' ? window.stars(product.rat) : ''}</div><span class="prat-score">${rating}</span><span class="prat-count">${reviewsText}</span></div>
              <div class="pprice-row"><span class="pprice">${formatCurrency(product.price)}</span>${old}</div>
              ${product.ship ? '<div class="pship">Frete grátis</div>' : ''}
              <div class="pseller"><div class="pseller-av">E</div><span>Marketplace Ecomme</span>${stockTag}</div>
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
      const element = document.getElementById('pagination');
      if (!element) return;
      const pageCount = Math.ceil(state.total / state.pageSize);
      if (!pageCount) { element.innerHTML = ''; return; }
      const start = Math.max(1, Math.min(state.page - 2, pageCount - 4));
      const end = Math.min(pageCount, start + 4);
      let html = `<button class="pgbtn" ${state.page <= 1 ? 'disabled' : ''} onclick="goPage(${state.page - 1})" aria-label="Página anterior">←</button>`;
      for (let page = start; page <= end; page++) {
        html += `<button class="pgbtn ${page === state.page ? 'on' : ''}" onclick="goPage(${page})" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`;
      }
      html += `<button class="pgbtn" ${state.page >= pageCount ? 'disabled' : ''} onclick="goPage(${state.page + 1})" aria-label="Próxima página">→</button>
        <div class="per-page"><span>Por página:</span><select aria-label="Resultados por página" onchange="ecommeSetPageSize(this.value)">${[12, 24, 48].map(size => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size}</option>`).join('')}</select></div>`;
      element.innerHTML = html;
    }

    function renderLiveCategories(facets) {
      const element = document.getElementById('categoryList');
      if (!element) return;
      const categories = Array.isArray(facets?.categories) ? facets.categories : [];
      const icons = { 'eletrônicos': '💻', 'moda': '👗', 'casa': '🏠', 'fitness': '💪', 'beleza': '💄', 'pets': '🐾', 'diversos': '📦' };
      const allCount = Number(facets?.category_total ?? facets?.total) || 0;
      const selected = state.filters.category;
      const button = (name, count, icon = '🏷️', value = '') => `
        <button type="button" class="cat-btn ${selected === value ? 'on' : ''}" data-category-filter="${escapeHTML(value)}" ${value && Number(count) <= 0 ? 'disabled' : ''}>
          <span class="cat-ico">${icon}</span><span class="cat-lbl">${escapeHTML(name)}</span><span class="cb-count">${Number(count) || 0}</span>
        </button>`;
      element.innerHTML = button('Todas', allCount, '🏷️', '') + categories.map(item => {
        const name = String(item.name || '').trim();
        return button(name, item.count, icons[name.toLocaleLowerCase('pt-BR')] || '📦', name);
      }).join('');
      element.querySelectorAll('[data-category-filter]').forEach(buttonElement => {
        buttonElement.addEventListener('click', () => {
          state.filters.category = buttonElement.dataset.categoryFilter || null;
          applyFilters();
        });
      });
    }

    function renderLiveBrands(facets) {
      const element = document.getElementById('brandList');
      if (!element) return;
      const brands = Array.isArray(facets?.brands) ? facets.brands : [];
      if (!brands.length) {
        element.innerHTML = '<div class="fs12 clr-stone">Ainda não há marcas cadastradas nos produtos encontrados.</div>';
        return;
      }
      element.innerHTML = brands.map(item => {
        const name = String(item.name || '');
        const checked = state.filters.brands.includes(name);
        return `<label class="brand-item"><input type="checkbox" data-brand-filter="${escapeHTML(name)}" ${checked ? 'checked' : ''}><span class="brand-name">${escapeHTML(name)}</span><span class="brand-count">(${Number(item.count) || 0})</span></label>`;
      }).join('');
      element.querySelectorAll('[data-brand-filter]').forEach(input => input.addEventListener('change', () => {
        const name = input.dataset.brandFilter;
        if (input.checked && !state.filters.brands.includes(name)) state.filters.brands.push(name);
        else state.filters.brands = state.filters.brands.filter(brand => brand !== name);
        applyFilters();
      }));
    }

    function renderLiveRatings(facets) {
      const element = document.getElementById('ratingList');
      if (!element) return;
      const rows = Array.isArray(facets?.ratings) ? facets.ratings : [];
      const total = Number(facets?.rating_total ?? facets?.total) || 0;
      if (!rows.some(row => Number(row.count) > 0)) {
        element.innerHTML = '<div class="fs12 clr-stone">Ainda não há avaliações cadastradas para os produtos disponíveis.</div>';
        return;
      }
      element.innerHTML = rows.map(row => {
        const stars = Number(row.stars);
        const count = Number(row.count) || 0;
        const percent = total ? Math.round(count / total * 100) : 0;
        const selected = Number(state.filters.minRating) === stars;
        return `<button type="button" class="rating-item ${selected ? 'on' : ''}" data-rating-filter="${stars}" ${count <= 0 && !selected ? 'disabled' : ''}>
          <span class="rating-radio" aria-hidden="true"></span>
          <span class="stars-row">${Array.from({ length: 5 }, (_, index) => `<span class="star ${index < stars ? 'on' : 'off'}">★</span>`).join('')}</span>
          <span class="rat-count">(${count.toLocaleString('pt-BR')})</span>
          <span class="rat-bar"><span class="rat-bar-fill" style="width:${percent}%"></span></span>
        </button>`;
      }).join('');
      element.querySelectorAll('[data-rating-filter]').forEach(item => item.addEventListener('click', () => {
        const value = Number(item.dataset.ratingFilter);
        state.filters.minRating = state.filters.minRating === value ? null : value;
        applyFilters();
      }));
    }

    function renderLiveFilterCounts(facets) {
      const shippingCount = document.getElementById('freeShippingCount');
      const discountCount = document.getElementById('discountCount');
      if (shippingCount) shippingCount.textContent = `(${Number(facets?.free_shipping_count) || 0})`;
      if (discountCount) discountCount.textContent = `(${Number(facets?.discount_count) || 0})`;
      const shippingInput = document.getElementById('freeShippingFilter');
      const discountInput = document.getElementById('discountFilter');
      if (shippingInput) {
        shippingInput.checked = state.filters.freeShipping;
        shippingInput.disabled = !Number(facets?.free_shipping_count) && !state.filters.freeShipping;
        shippingInput.closest('.ship-opt')?.classList.toggle('on', state.filters.freeShipping);
      }
      if (discountInput) {
        discountInput.checked = state.filters.discountOnly;
        discountInput.disabled = !Number(facets?.discount_count) && !state.filters.discountOnly;
      }
    }

    function updatePriceRangeControls(facets) {
      const minInput = document.getElementById('rangeMin');
      const maxInput = document.getElementById('rangeMax');
      if (!minInput || !maxInput) return;
      const actualMin = numberOrNull(facets?.min_price);
      const actualMax = numberOrNull(facets?.max_price);
      const hasPriceData = actualMin !== null && actualMax !== null;
      state.priceMin = hasPriceData ? Math.floor(actualMin) : 0;
      state.priceMax = hasPriceData ? Math.ceil(actualMax) : 0;
      const samePrice = hasPriceData && state.priceMin === state.priceMax;
      const sliderMax = hasPriceData ? (samePrice ? state.priceMax + 1 : state.priceMax) : 1;
      [minInput, maxInput].forEach(input => {
        input.min = String(state.priceMin);
        input.max = String(sliderMax);
        input.step = String(Math.max(1, Math.round((sliderMax - state.priceMin) / 200)));
        input.disabled = !hasPriceData || samePrice;
      });
      let low = state.filters.minPrice ?? state.priceMin;
      let high = state.filters.maxPrice ?? state.priceMax;
      low = hasPriceData ? Math.max(state.priceMin, Math.min(low, state.priceMax)) : 0;
      high = hasPriceData ? Math.max(state.priceMin, Math.min(high, state.priceMax)) : 0;
      if (low > high) low = high;
      minInput.value = String(low);
      maxInput.value = String(high);
      const minLabel = document.getElementById('priceMin');
      const maxLabel = document.getElementById('priceMax');
      if (minLabel) minLabel.textContent = hasPriceData ? formatCurrency(low) : 'Sem preços';
      if (maxLabel) maxLabel.textContent = hasPriceData ? formatCurrency(high) : 'disponíveis';
      document.querySelectorAll('.price-preset').forEach(button => {
        const presetMin = Number(button.dataset.min) || 0;
        const presetMax = button.dataset.max === '' ? null : numberOrNull(button.dataset.max);
        const expectedMin = presetMin > state.priceMin ? presetMin : null;
        const expectedMax = presetMax !== null && presetMax < state.priceMax ? presetMax : null;
        const isActive = (expectedMin !== null || expectedMax !== null)
          && expectedMin === state.filters.minPrice && expectedMax === state.filters.maxPrice;
        button.classList.toggle('on', hasPriceData && isActive);
        button.disabled = !hasPriceData;
      });
    }

    function renderActiveFilters() {
      const bar = document.getElementById('activeFiltersBar');
      const chips = document.getElementById('activeChips');
      if (!bar || !chips) return;
      const filters = state.filters;
      const entries = [];
      if (filters.category) entries.push({ key: 'category', label: filters.category });
      if (filters.minPrice !== null || filters.maxPrice !== null) entries.push({ key: 'price', label: `${filters.minPrice === null ? formatCurrency(state.priceMin) : formatCurrency(filters.minPrice)} – ${filters.maxPrice === null ? formatCurrency(state.priceMax) : formatCurrency(filters.maxPrice)}` });
      filters.brands.forEach(brand => entries.push({ key: `brand:${brand}`, label: brand }));
      if (filters.minRating !== null) entries.push({ key: 'rating', label: `${filters.minRating}+ estrelas` });
      if (filters.freeShipping) entries.push({ key: 'shipping', label: 'Frete grátis' });
      if (filters.discountOnly) entries.push({ key: 'discount', label: 'Com desconto' });
      if (!entries.length) { bar.classList.remove('has-filters'); chips.innerHTML = ''; return; }
      bar.classList.add('has-filters');
      chips.innerHTML = entries.map(entry => `<button type="button" class="af-chip" data-clear-filter="${escapeHTML(entry.key)}">${escapeHTML(entry.label)} <span class="af-chip-x">×</span></button>`).join('');
      chips.querySelectorAll('[data-clear-filter]').forEach(button => button.addEventListener('click', () => removeFilter(button.dataset.clearFilter)));
    }

    function removeFilter(key) {
      if (key === 'category') state.filters.category = null;
      else if (key === 'price') { state.filters.minPrice = null; state.filters.maxPrice = null; }
      else if (key === 'rating') state.filters.minRating = null;
      else if (key === 'shipping') state.filters.freeShipping = false;
      else if (key === 'discount') state.filters.discountOnly = false;
      else if (key.startsWith('brand:')) state.filters.brands = state.filters.brands.filter(brand => brand !== key.slice(6));
      applyFilters();
    }

    function renderLiveRelated(rows) {
      const container = document.getElementById('relatedScroll');
      if (container) {
        const products = rows.slice(0, 8);
        container.innerHTML = products.map(product => `<a class="rcard" href="/product/${encodeURIComponent(product.id)}/">
          <div class="rcard-img">${product.imageUrl ? `<img src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}" loading="lazy">` : escapeHTML(product.em || '📦')}</div>
          <div class="rcard-info"><div class="rcard-name">${escapeHTML(product.name)}</div><div class="rcard-price">${formatCurrency(product.price)}</div></div>
        </a>`).join('');
        const section = container.closest('.related-section');
        if (section) section.hidden = !products.length;
      }
      const tags = document.getElementById('relatedTags');
      if (tags) {
        const suggestions = [state.query ? `${state.query} barato` : 'Ofertas', 'iPhone', 'Notebook', 'Fone Bluetooth', 'Smartwatch', 'Câmera', 'Acessórios'];
        tags.innerHTML = [...new Set(suggestions)].map(term => `<button class="stag-chip" data-search-term="${escapeHTML(term)}"><span class="stag-ico">⌕</span>${escapeHTML(term)}</button>`).join('');
        tags.querySelectorAll('[data-search-term]').forEach(button => button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1)));
      }
    }

    async function runSearch(query = state.query, page = 1) {
      state.query = String(query ?? '').trim();
      state.page = Math.max(1, Number(page) || 1);
      const requestId = ++state.requestId;
      updateQueryUI(state.query, state.page);
      showLoading(state.query);
      let result;
      try {
        result = await requestPage(state.query, state.page, state.sort);
      } catch (error) {
        result = { error };
      }
      if (requestId !== state.requestId) return;

      if (result?.error) {
        console.error('[Ecomme search] Erro ao consultar o catálogo:', result.error);
        grid.innerHTML = '';
        noResults?.classList.add('on');
        const title = noResults?.querySelector('.nr-title');
        const subtitle = noResults?.querySelector('.nr-sub');
        if (title) title.textContent = 'Não foi possível carregar a pesquisa';
        if (subtitle) subtitle.textContent = 'Execute a migração SQL de filtros da busca no Supabase e tente novamente. Se ela já foi executada, verifique a conexão do catálogo.';
        const count = document.getElementById('resultCount');
        if (count) count.textContent = 'Erro na busca';
        const sub = document.getElementById('toolbarSub');
        if (sub) sub.textContent = 'A pesquisa não conseguiu consultar o catálogo.';
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
        return;
      }

      const mapped = (Array.isArray(result.data) ? result.data : []).map(normalizeProduct);
      state.rows = mapped;
      state.total = Number(result.count) || 0;
      state.facets = result.facets || {};
      PRODUCTS = mapped;
      RELATED_PRODS = mapped.slice(0, 8);

      const pageCount = Math.ceil(state.total / state.pageSize);
      if (pageCount && state.page > pageCount) {
        state.page = pageCount;
        return runSearch(state.query, state.page);
      }

      renderLiveGrid(mapped);
      renderLivePagination();
      renderLiveCategories(state.facets);
      renderLiveBrands(state.facets);
      renderLiveRatings(state.facets);
      renderLiveFilterCounts(state.facets);
      updatePriceRangeControls(state.facets);
      renderActiveFilters();
      renderLiveRelated(mapped);

      const countText = `${state.total.toLocaleString('pt-BR')} ${state.total === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
      const count = document.getElementById('resultCount');
      if (count) count.textContent = countText;
      const sub = document.getElementById('toolbarSub');
      if (sub) {
        const start = state.total ? ((state.page - 1) * state.pageSize + 1) : 0;
        const end = Math.min(state.page * state.pageSize, state.total);
        const labels = { rel: 'relevância', pop: 'popularidade', new: 'mais recentes', asc: 'menor preço', desc: 'maior preço', rat: 'melhor avaliação', disc: 'maior desconto' };
        sub.textContent = `${start}${state.total ? `–${end}` : ''} de ${state.total} produtos · Ordenado por ${labels[state.sort] || 'relevância'}`;
      }
    }

    function applyFilters() {
      clearTimeout(state.priceTimer);
      runSearch(state.query, 1);
    }

    function readInitialFilters() {
      const params = new URLSearchParams(window.location.search);
      state.filters.category = String(params.get('category') || '').trim() || null;
      state.filters.minPrice = numberOrNull(params.get('min_price'));
      state.filters.maxPrice = numberOrNull(params.get('max_price'));
      if (state.filters.minPrice !== null && state.filters.minPrice < 0) state.filters.minPrice = null;
      if (state.filters.maxPrice !== null && state.filters.maxPrice < 0) state.filters.maxPrice = null;
      if (state.filters.minPrice !== null && state.filters.maxPrice !== null && state.filters.minPrice > state.filters.maxPrice) {
        [state.filters.minPrice, state.filters.maxPrice] = [state.filters.maxPrice, state.filters.minPrice];
      }
      const rating = numberOrNull(params.get('min_rating'));
      state.filters.minRating = rating !== null && rating >= 1 && rating <= 5 ? rating : null;
      state.filters.brands = [...new Set(params.getAll('brand').map(value => String(value).trim()).filter(Boolean))];
      state.filters.freeShipping = params.get('free_shipping') === '1';
      state.filters.discountOnly = params.get('discount_only') === '1';
    }

    function filterByCat(category) {
      state.filters.category = category && category !== 'Todas' && category !== 'Todos' ? String(category) : null;
      applyFilters();
    }
    function clearCatFilter() { state.filters.category = null; applyFilters(); }
    function updatePriceRange() {
      const minInput = document.getElementById('rangeMin');
      const maxInput = document.getElementById('rangeMax');
      if (!minInput || !maxInput) return;
      let low = Number(minInput.value);
      let high = Number(maxInput.value);
      if (low > high) {
        if (document.activeElement === minInput) high = low;
        else low = high;
      }
      minInput.value = String(low);
      maxInput.value = String(high);
      const minLabel = document.getElementById('priceMin');
      const maxLabel = document.getElementById('priceMax');
      if (minLabel) minLabel.textContent = formatCurrency(low);
      if (maxLabel) maxLabel.textContent = formatCurrency(high);
      clearTimeout(state.priceTimer);
      state.priceTimer = setTimeout(() => {
        state.filters.minPrice = low > state.priceMin ? low : null;
        state.filters.maxPrice = high < state.priceMax ? high : null;
        applyFilters();
      }, 280);
    }
    function resetPrice() {
      state.filters.minPrice = null;
      state.filters.maxPrice = null;
      document.querySelectorAll('.price-preset').forEach(button => button.classList.remove('on'));
      updatePriceRangeControls(state.facets || {});
      applyFilters();
    }
    function setPreset(minimum, maximum, button) {
      const low = Math.max(state.priceMin, Number(minimum) || state.priceMin);
      const high = Math.min(state.priceMax, Number(maximum) || state.priceMax);
      state.filters.minPrice = low > state.priceMin ? low : null;
      state.filters.maxPrice = high < state.priceMax ? high : null;
      document.querySelectorAll('.price-preset').forEach(item => item.classList.remove('on'));
      button?.classList.add('on');
      updatePriceRangeControls(state.facets || {});
      applyFilters();
    }
    function filterBrands(query) {
      const value = String(query || '').trim().toLocaleLowerCase('pt-BR');
      document.querySelectorAll('.brand-item').forEach(element => {
        const label = element.querySelector('.brand-name')?.textContent || '';
        element.style.display = label.toLocaleLowerCase('pt-BR').includes(value) ? 'flex' : 'none';
      });
    }
    function onRatingFilter(value) {
      const rating = Number(value);
      state.filters.minRating = state.filters.minRating === rating ? null : rating;
      applyFilters();
    }
    function toggleShipOpt(element) {
      const input = element?.querySelector('input') || document.getElementById('freeShippingFilter');
      if (input) state.filters.freeShipping = !!input.checked;
      else state.filters.freeShipping = !state.filters.freeShipping;
      applyFilters();
    }
    function clearAllFilters() {
      state.filters = { category: null, minPrice: null, maxPrice: null, brands: [], minRating: null, freeShipping: false, discountOnly: false };
      const brandSearch = document.getElementById('brandSearch');
      if (brandSearch) brandSearch.value = '';
      document.querySelectorAll('.price-preset').forEach(button => button.classList.remove('on'));
      applyFilters();
    }

    window.ecommeRunSearch = runSearch;
    window.doSearch = query => runSearch(typeof query === 'string' ? query.trim() : searchInput.value.trim(), 1);
    window.goPage = page => {
      const pageCount = Math.ceil(state.total / state.pageSize);
      if (page < 1 || page > pageCount) return;
      runSearch(state.query, page);
      document.querySelector('.page-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.doSort = sort => {
      state.sort = ['rel', 'pop', 'new', 'asc', 'desc', 'rat', 'disc'].includes(String(sort)) ? String(sort) : 'rel';
      runSearch(state.query, 1);
    };
    window.ecommeSetPageSize = size => {
      state.pageSize = [12, 24, 48].includes(Number(size)) ? Number(size) : PAGE_SIZE;
      runSearch(state.query, 1);
    };
    window.renderGrid = renderLiveGrid;
    window.renderBrands = () => renderLiveBrands(state.facets);
    window.renderRatings = () => renderLiveRatings(state.facets);
    window.renderRelated = () => renderLiveRelated(state.rows);
    window.filterByCat = filterByCat;
    window.clearCatFilter = clearCatFilter;
    window.updatePriceRange = updatePriceRange;
    window.resetPrice = resetPrice;
    window.setPreset = setPreset;
    window.filterBrands = filterBrands;
    window.onRatingFilter = onRatingFilter;
    window.toggleShipOpt = toggleShipOpt;
    window.clearAllFilters = clearAllFilters;
    window.removeActiveFilter = removeFilter;

    window.onSearchInput = input => {
      const value = String(input?.value || '').trim().toLocaleLowerCase('pt-BR');
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
      const suggestions = ['iPhone', 'Notebook', 'Fone Bluetooth', 'Smartwatch', 'Câmera', 'Tênis', 'Mochila', 'Acessórios']
        .filter(term => term.toLocaleLowerCase('pt-BR').includes(value)).slice(0, 6);
      if (tags) {
        tags.innerHTML = suggestions.map(term => `<button type="button" class="ac-tag" data-search-term="${escapeHTML(term)}">⌕ ${escapeHTML(term)}</button>`).join('');
        tags.querySelectorAll('[data-search-term]').forEach(button => button.addEventListener('click', () => runSearch(button.dataset.searchTerm, 1)));
      }
      const matching = state.rows.filter(product => product.name.toLocaleLowerCase('pt-BR').includes(value)
        || product.cat.toLocaleLowerCase('pt-BR').includes(value)
        || product.brand.toLocaleLowerCase('pt-BR').includes(value)).slice(0, 4);
      if (items) items.innerHTML = matching.map(product => `<a class="ac-item" href="/product/${encodeURIComponent(product.id)}/">
        <div class="ac-item-ico">${product.imageUrl ? `<img src="${escapeHTML(product.imageUrl)}" alt="" loading="lazy">` : escapeHTML(product.em)}</div>
        <div style="flex:1;min-width:0"><div class="ac-item-name">${escapeHTML(product.name.slice(0, 50))}${product.name.length > 50 ? '…' : ''}</div><div class="ac-item-cat">${escapeHTML(product.cat)}${product.brand ? ` · ${escapeHTML(product.brand)}` : ''}</div></div>
        <div class="ac-item-price">${formatCurrency(product.price)}</div></a>`).join('');
    };
    window.onSearchKey = event => {
      if (event.key === 'Enter') { event.preventDefault(); runSearch(searchInput.value, 1); }
    };
    // O cabeçalho é carregado por fetch depois de DOMContentLoaded nesta página.
    // Esta função evita o handler inline do header chamar renderProducts inexistente.
    window.renderProducts = () => window.onSearchInput?.(searchInput);

    document.getElementById('freeShippingFilter')?.addEventListener('change', event => {
      state.filters.freeShipping = event.target.checked;
      applyFilters();
    });
    document.getElementById('discountFilter')?.addEventListener('change', event => {
      state.filters.discountOnly = event.target.checked;
      applyFilters();
    });
    document.getElementById('rangeMin')?.addEventListener('change', updatePriceRange);
    document.getElementById('rangeMax')?.addEventListener('change', updatePriceRange);

    readInitialFilters();
    const urlParams = new URLSearchParams(window.location.search);
    state.query = urlParams.get('q') || '';
    state.page = Math.max(1, Number(urlParams.get('page')) || 1);
    state.sort = ['rel', 'pop', 'new', 'asc', 'desc', 'rat', 'disc'].includes(urlParams.get('sort')) ? urlParams.get('sort') : 'rel';
    const sortSelect = document.getElementById('sortSel');
    if (sortSelect) sortSelect.value = state.sort;
    runSearch(state.query, state.page);
  }

  if (document.getElementById('searchInput')) boot();
  else window.addEventListener('ecomme:components-ready', boot, { once: true });
})();
