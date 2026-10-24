(function () {
  'use strict';

  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const pagesWithEssentials = ['/', '/products', '/product'];
  const shouldLoadEssentials = pagesWithEssentials.includes(currentPath);

  const pagesWithLogin = [
    '/', '/products', '/product', '/categories', '/offers', '/about',
    '/about-us', '/sellers', '/sellers/register', '/settings'
  ];
  const shouldLoadLogin = pagesWithLogin.includes(currentPath);
  const pageScript = currentPath === '/products' ? '/products/script.js' : '/script.js';

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
    pageScript
  ];

  if (document.readyState !== 'loading') {
    console.error('[Ecomme] imports.js precisa ser incluído diretamente no HTML antes de DOMContentLoaded.');
    return;
  }

  const tags = scripts
    .map(src => `<script defer src="${src}"><\/script>`)
    .join('\n');

  document.write(tags);
})();
