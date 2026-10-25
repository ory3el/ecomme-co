// ============================================================

document.addEventListener('visibilitychange', () => {
    pageIsVisible = document.visibilityState === 'visible';
    if (pageIsVisible) {
      refreshProductsIfNeeded();
    }
  }
);

// ============================================================
