(function () {
  'use strict';

  const scripts = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    '/files/scripts/auth-session-check.js',
    '/files/scripts/console-warning.js',
    '/files/scripts/confirm-modal.js',
    '/files/scripts/loading.js',
    '/files/scripts/sidebars.js',
    '/files/scripts/essentials.js',
    '/files/scripts/wishlist-lists.js',
    '/login/script.js',
    'script.js'
  ];

  if (document.readyState !== 'loading') {
    console.error('[Ecomme] imports.js precisa ser incluído diretamente no HTML antes de DOMContentLoaded.');
    return;
  }

  const tags = scripts
    .map(src => `<script defer src="${src}"><\/script>`)
    .join('\n');

  document.write(tags);

  // ------------------------------------------------------------------------
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const pagesWithEssentials = ['/', '/products', '/product'];
  if (
    pagesWithEssentials.includes(currentPath) &&
    !document.getElementById('ecomme-essentials-script')
  ) {
    const script = document.createElement('script');
    script.id = 'ecomme-essentials-script';
    script.src = '/files/scripts/essentials.js';
    script.async = false;
    document.head.appendChild(script);
  }
})();
