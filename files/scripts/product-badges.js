(function () {
  'use strict';

  const NEW_PRODUCT_BADGE_DAYS = 15;
  const NEW_PRODUCT_BADGE_MS = NEW_PRODUCT_BADGE_DAYS * 24 * 60 * 60 * 1000;
  const createdAtCache = new Map();
  const expiryTimers = new Map();

  function scheduleExpiry(product, createdAt) {
    const id = String(product?.id ?? '');
    if (!id || expiryTimers.has(id)) return;
    const delay = Math.max(0, createdAt + NEW_PRODUCT_BADGE_MS - Date.now());
    const timer = window.setTimeout(() => {
      document.querySelectorAll('[data-new-product-badge]').forEach(element => {
        if (element.getAttribute('data-new-product-badge') === id) element.remove();
      });
      expiryTimers.delete(id);
    }, delay + 25);
    expiryTimers.set(id, timer);
  }

  function getClient() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.ecommeSupabaseClient || window.supabaseClient || null;
  }

  function isNew(product) {
    if (!product || String(product.badge || '').toLowerCase() !== 'new') return false;
    const createdAt = Date.parse(product.created_at || product.createdAt || '');
    if (!Number.isFinite(createdAt)) return false;
    const age = Date.now() - createdAt;
    const active = age >= 0 && age < NEW_PRODUCT_BADGE_MS;
    if (active) scheduleExpiry(product, createdAt);
    return active;
  }

  async function hydrate(items, client = getClient()) {
    if (!Array.isArray(items) || !items.length || !client) return items;

    const products = items.map(item => item?.product || item).filter(item => item && item.id != null);
    const missingIds = [...new Set(products
      .filter(product => !product.created_at && !product.createdAt && !createdAtCache.has(String(product.id)))
      .map(product => String(product.id)))];

    if (missingIds.length) {
      try {
        const { data, error } = await client.from('products')
          .select('id,created_at')
          .in('id', missingIds);
        if (error) throw error;
        (data || []).forEach(row => createdAtCache.set(String(row.id), row.created_at || null));
        missingIds.forEach(id => { if (!createdAtCache.has(id)) createdAtCache.set(id, null); });
      } catch (error) {
        console.warn('[Ecomme badges] Não foi possível consultar a data de criação dos produtos:', error);
        return items;
      }
    }

    products.forEach(product => {
      if (!product.created_at && !product.createdAt && createdAtCache.has(String(product.id))) {
        const createdAt = createdAtCache.get(String(product.id));
        if (createdAt) product.created_at = createdAt;
      }
    });
    return items;
  }

  window.EcommeProductBadges = Object.freeze({
    newProductDays: NEW_PRODUCT_BADGE_DAYS,
    isNew,
    hydrate
  });
})();
