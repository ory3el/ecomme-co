(function () {
  'use strict';
  const state = { category: 'Todos', tag: 'Todos', colors: [] };
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const available = product => product && product.badge !== 'paused';
  function productCategories(product) {
    const raw = Array.isArray(product?.cat) ? product.cat : [product?.cat];
    return raw.map(item => normalize(item)).filter(Boolean);
  }
  function matchesCategory(product, category) {
    if (category === 'Todos') return true;
    const selected = normalize(category);
    return productCategories(product).some(item => {
      if (selected === 'casa') return item.includes('casa') || item.includes('decor');
      return item.includes(selected);
    });
  }
  function filter(list) {
    let result = list;
    if (state.category !== 'Todos') result = result.filter(product => matchesCategory(product, state.category));
    const min = Number.parseFloat($('minPrice')?.value || '');
    const max = Number.parseFloat($('maxPrice')?.value || '');
    if (Number.isFinite(min)) result = result.filter(product => Number(product.price) >= min);
    if (Number.isFinite(max)) result = result.filter(product => Number(product.price) <= max);
    if (state.tag !== 'Todos') {
      result = result.filter(product => {
        const badge = normalize(product.badge);
        if (state.tag === 'Sale') return Number(product.discount) > 0 || badge.includes('sale') || badge.includes('promo');
        if (state.tag === 'Novo') return badge === 'new' || badge.includes('novo');
        if (state.tag === 'Hot') return badge === 'hot' || badge.includes('best') || badge.includes('popular');
        if (state.tag === 'Frete Grátis') return Boolean(product.shipping);
        return true;
      });
    }
    if (state.colors.length) {
      const selectedColors = state.colors.map(normalize);
      result = result.filter(product => {
        const productColors = Array.isArray(product.dominant_colors) ? product.dominant_colors : product.dominant_color ? [product.dominant_color] : [];
        return productColors.some(color => selectedColors.includes(normalize(color)));
      });
    }
    const ratings = [...document.querySelectorAll('[data-rating-min]:checked')].map(input => Number(input.dataset.ratingMin)).filter(Number.isFinite);
    if (ratings.length) {
      const minRating = Math.min(...ratings);
      result = result.filter(product => Number(product.rating) >= minRating);
    }
    return result;
  }
  function getStateKey() {
    return [state.category, state.tag, $('minPrice')?.value || '', $('maxPrice')?.value || '', state.colors.slice().sort().join(','), ...[...document.querySelectorAll('[data-rating-min]')].map(input => input.checked ? input.dataset.ratingMin : '')].join(':');
  }
  function updateCategoryUI() {
    document.querySelectorAll('[data-category]').forEach(element => {
      const active = element.dataset.category === state.category;
      element.classList.toggle('active', active);
      if (element.classList.contains('category-btn')) element.setAttribute('aria-pressed', String(active));
    });
    const title = $('productsTitle');
    if (title) title.textContent = state.category === 'Todos' ? 'Todos os produtos' : state.category === 'Casa' ? 'Casa & Deco' : state.category;
  }
  function setCategory(category) {
    state.category = category || 'Todos';
    updateCategoryUI();
    filterProducts();
    if (window.matchMedia('(max-width: 900px)').matches) toggleCategoryFilters(false);
    $('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  let categoryCountsPromise = null;
  function loadCategoryCounts() {
    if (categoryCountsPromise) return categoryCountsPromise;
    categoryCountsPromise = (async () => {
      try {
        let data = null;
        try {
          const response = await fetch('/api/catalog-stats?type=categories', { credentials: 'omit', cache: 'default', headers: { Accept: 'application/json' } });
          if (response.ok) data = await response.json();
        } catch (_) {}
        if (!data) {
          const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
          if (!client?.rpc) return;
          const result = await client.rpc('ecomme_category_product_counts');
          if (result.error) throw result.error;
          data = result.data;
        }
        const counts = data && typeof data === 'object' ? data : {};
        Object.entries(counts).forEach(([category, value]) => {
          const count = Number(value) || 0;
          document.querySelectorAll(`[data-category-count="${CSS.escape(category)}"]`).forEach(element => { element.textContent = count.toLocaleString('pt-BR'); });
          document.querySelectorAll(`.cat-card[data-category="${CSS.escape(category)}"] .cat-card-count`).forEach(element => { element.textContent = `${count.toLocaleString('pt-BR')} ${count === 1 ? 'produto' : 'produtos'}`; });
        });
      } catch (error) {
        console.warn('[Ecomme categorias] Contagens resumidas indisponíveis:', error);
      }
    })();
    return categoryCountsPromise;
  }
  function onProductsLoaded(list) {
    const loadedProducts = list || [];
    const indexedCount = loadedProducts.filter(product => Array.isArray(product.dominant_colors) && product.dominant_colors.length).length;
    const colorStatus = $('colorFilterStatus');
    if (colorStatus) colorStatus.textContent = indexedCount ? `Cores identificadas em ${indexedCount} produto(s) carregado(s).` : 'As cores são identificadas automaticamente nas imagens dos produtos.';
    loadCategoryCounts();
  }
  function onRender(count, total, serverTotal) {
    const countElement = $('productsCount');
    const hasServerTotal = serverTotal !== undefined && serverTotal !== null && Number.isFinite(Number(serverTotal));
    const displayedCount = hasServerTotal ? Number(serverTotal) : count;
    if (countElement) countElement.textContent = `${displayedCount.toLocaleString('pt-BR')} ${displayedCount === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
    const resultsLabel = document.querySelector('.category-toolbar-label span');
    if (resultsLabel) resultsLabel.textContent = state.category === 'Todos' ? 'Produtos disponíveis' : `Categoria: ${state.category === 'Casa' ? 'Casa & Deco' : state.category}`;
  }
  let filterUpdateTimer = null;
  function filterProducts() {
    clearTimeout(filterUpdateTimer);
    filterUpdateTimer = setTimeout(() => {
      if (window.EcommeCatalog?.isActive?.()) window.EcommeCatalog.reset();
      else window.renderProducts?.();
    }, 140);
  }
  function toggleTag(button, tag) {
    state.tag = tag || 'Todos';
    document.querySelectorAll('.filter-tag').forEach(element => element.classList.toggle('active', element === button));
    filterProducts();
  }
  function toggleProductColor(button, color) {
    const selected = normalize(color);
    const existingIndex = state.colors.findIndex(item => normalize(item) === selected);
    if (existingIndex >= 0) state.colors.splice(existingIndex, 1);
    else state.colors.push(color);
    document.querySelectorAll('[data-product-color]').forEach(element => {
      const active = state.colors.some(item => normalize(item) === normalize(element.dataset.productColor));
      element.classList.toggle('active', active);
      element.setAttribute('aria-pressed', String(active));
    });
    filterProducts();
  }
  function clearCategoryFilters() {
    state.category = 'Todos';
    state.tag = 'Todos';
    state.colors = [];
    if ($('minPrice')) $('minPrice').value = '';
    if ($('maxPrice')) $('maxPrice').value = '';
    document.querySelectorAll('[data-rating-min]').forEach(input => { input.checked = false; });
    document.querySelectorAll('[data-product-color]').forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); });
    document.querySelectorAll('.filter-tag').forEach(button => button.classList.toggle('active', button.textContent.trim() === 'Todos'));
    if ($('headerSearch')) $('headerSearch').value = '';
    if ($('sortSelect')) $('sortSelect').value = 'random';
    updateCategoryUI();
    filterProducts();
  }
  function toggleCategoryFilters(open) {
    const sidebar = $('categoryFilterSidebar');
    const backdrop = $('categoryFilterBackdrop');
    if (!sidebar || !backdrop) return;
    const shouldOpen = typeof open === 'boolean' ? open : !sidebar.classList.contains('is-open');
    sidebar.classList.toggle('is-open', shouldOpen);
    backdrop.classList.toggle('is-visible', shouldOpen);
    document.body.classList.toggle('category-filter-open', shouldOpen);
  }
  function getServerFilters() {
    const ratings = [...document.querySelectorAll('[data-rating-min]:checked')].map(input => Number(input.dataset.ratingMin)).filter(Number.isFinite);
    const minPrice = Number.parseFloat($('minPrice')?.value || '');
    const maxPrice = Number.parseFloat($('maxPrice')?.value || '');
    const tagMap = { Sale: 'sale', Novo: 'novo', Hot: 'hot', 'Frete Grátis': 'frete' };
    return {
      category: state.category === 'Todos' ? '' : state.category,
      tag: tagMap[state.tag] || '',
      minPrice: Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
      minRating: ratings.length ? Math.min(...ratings) : null,
      colors: state.colors.map(normalize).join('|')
    };
  }
  window.EcommeCategoryFilters = { filter, getStateKey, getServerFilters, onProductsLoaded, onRender, setCategory, reset: clearCategoryFilters };
  window.filterProducts = filterProducts;
  window.toggleTag = toggleTag;
  window.toggleProductColor = toggleProductColor;
  window.clearCategoryFilters = clearCategoryFilters;
  window.toggleCategoryFilters = toggleCategoryFilters;
  window.addEventListener('keydown', event => { if (event.key === 'Escape') toggleCategoryFilters(false); });
  document.addEventListener('DOMContentLoaded', updateCategoryUI, { once: true });
})();
