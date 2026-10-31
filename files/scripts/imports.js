(function () {
  'use strict';
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const pagesWithSearch = ['/', '/products', '/categories', '/offers', '/about', '/product', '/products/search'];
  const shouldLoadSearch = pagesWithSearch.includes(currentPath);
  const pagesWithEssentials = ['/', '/products', '/product'];
  const shouldLoadEssentials = pagesWithEssentials.includes(currentPath);
  const pagesWithLogin = ['/', '/products', '/product', '/categories', '/offers', '/about-us', '/sellers', '/sellers/register', '/settings'];
  const shouldLoadLogin = pagesWithLogin.includes(currentPath);
  const pageScripts = { '/': '/script.js', '/products': '/products/script.js', '/notifications': '/notifications/script.js' };
  const pageScript = pageScripts[currentPath] || null;
  const styles = [
    '/files/styles/essentials.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    ...(!shouldLoadSearch ? ['/files/styles/hide-search-bar.css',] : []),
    ...(shouldLoadEssentials ? ['/files/styles/essentials-products.css'] : []),
    //...(currentPath === '/notifications' ? ['/notifications/styles.css'] : [])
  ];
  const scripts = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    '/files/scripts/auth-session-check.js',
    '/files/scripts/console-warning.js',
    '/files/scripts/loading.js',
    '/files/scripts/sidebars.js',
    '/files/scripts/confirm-modal.js',
    '/files/scripts/wishlist-lists.js',
    ...(shouldLoadEssentials ? ['/files/scripts/essentials.js'] : []),
    ...(shouldLoadLogin ? ['https://accounts.google.com/gsi/client', '/login/script.js'] : []),
    ...(pageScript ? [pageScript] : [])
  ];
  if (document.readyState !== 'loading') {
    console.error('[Ecomme] imports.js precisa ser incluído diretamente no HTML antes de DOMContentLoaded.');
    return;
  }
  styles.forEach(href => {
    const absoluteHref = new URL(href, window.location.origin).href;
    const exists = [...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === absoluteHref);
    if (exists) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = absoluteHref;
    link.dataset.ecommeImport = 'true';
    document.head.appendChild(link);
  });
  const tags = scripts.map(src => `<script defer src="${src}"><\/script>`).join('\n');
  document.write(tags);
})();
