(function () {
  'use strict';
  const state = { category: 'Todos', tag: 'Todos' };
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
    const ratings = [...document.querySelectorAll('[data-rating-min]:checked')].map(input => Number(input.dataset.ratingMin)).filter(Number.isFinite);
    if (ratings.length) {
      const minRating = Math.min(...ratings);
      result = result.filter(product => Number(product.rating) >= minRating);
    }
    return result;
  }
  function getStateKey() {
    return [state.category, state.tag, $('minPrice')?.value || '', $('maxPrice')?.value || '', ...[...document.querySelectorAll('[data-rating-min]')].map(input => input.checked ? input.dataset.ratingMin : '')].join(':');
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
    window.renderProducts?.();
    if (window.matchMedia('(max-width: 900px)').matches) toggleCategoryFilters(false);
    $('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function onProductsLoaded(list) {
    const availableProducts = (list || []).filter(available);
    const categories = ['Todos', 'Eletrônicos', 'Moda', 'Casa', 'Fitness', 'Beleza', 'Pets'];
    categories.forEach(category => {
      const count = category === 'Todos' ? availableProducts.length : availableProducts.filter(product => matchesCategory(product, category)).length;
      document.querySelectorAll(`[data-category-count="${CSS.escape(category)}"]`).forEach(element => { element.textContent = count; });
      document.querySelectorAll(`.cat-card[data-category="${CSS.escape(category)}"] .cat-card-count`).forEach(element => { element.textContent = `${count} ${count === 1 ? 'produto' : 'produtos'}`; });
    });
  }
  function onRender(count, total) {
    const countElement = $('productsCount');
    if (countElement) countElement.textContent = `${count} ${count === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
    const resultsLabel = document.querySelector('.category-toolbar-label span');
    if (resultsLabel) resultsLabel.textContent = state.category === 'Todos' ? 'Produtos disponíveis' : `Categoria: ${state.category === 'Casa' ? 'Casa & Deco' : state.category}`;
  }
  function filterProducts() { window.renderProducts?.(); }
  function toggleTag(button, tag) {
    state.tag = tag || 'Todos';
    document.querySelectorAll('.filter-tag').forEach(element => element.classList.toggle('active', element === button));
    filterProducts();
  }
  function clearCategoryFilters() {
    state.category = 'Todos';
    state.tag = 'Todos';
    if ($('minPrice')) $('minPrice').value = '';
    if ($('maxPrice')) $('maxPrice').value = '';
    document.querySelectorAll('[data-rating-min]').forEach(input => { input.checked = false; });
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
  window.EcommeCategoryFilters = { filter, getStateKey, onProductsLoaded, onRender, setCategory, reset: clearCategoryFilters };
  window.filterProducts = filterProducts;
  window.toggleTag = toggleTag;
  window.clearCategoryFilters = clearCategoryFilters;
  window.toggleCategoryFilters = toggleCategoryFilters;
  window.addEventListener('keydown', event => { if (event.key === 'Escape') toggleCategoryFilters(false); });
  document.addEventListener('DOMContentLoaded', updateCategoryUI, { once: true });
})();
