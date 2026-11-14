// ============================================================

document.addEventListener('visibilitychange', () => {
  pageIsVisible = document.visibilityState === 'visible';
  if (pageIsVisible && window.__ecommeProductsNeedsRender) {
    window.__ecommeProductsNeedsRender = false;
    if (typeof renderProducts === 'function') renderProducts();
  }
});

// ============================================================
