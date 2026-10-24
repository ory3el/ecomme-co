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
    '/products/script.js'
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
