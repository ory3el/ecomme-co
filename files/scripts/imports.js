(function () {
  'use strict';

  const scripts = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    '/files/scripts/auth-session-check.js',
    '/files/scripts/console-warning.js',
    '/files/scripts/loading.js',
    '/files/scripts/sidebars.js',
    '/files/scripts/confirm-modal.js',
    '/files/scripts/wishlist-lists.js',
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
    !document.getElementById('essentials-script')
  ) {
    const essentials = document.createElement('script');
    essentials.id = 'essentials-script';
    essentials.src = '/files/scripts/essentials.js';
    essentials.async = false;
    document.head.appendChild(essentials);
  }
  
  const pagesWithDynamicLogin = ['/', '/products', '/product', '/categories', '/offers', '/about', '/sellers', '/sellers/register', '/settings'];
  if (
    pagesWithDynamicLogin.includes(currentPath) &&
    !document.getElementById('login-script')
  ) {
    const googleAcc = document.createElement('script');
    googleAcc.id = 'google-acc-script';
    googleAcc.src = 'https://accounts.google.com/gsi/client';
    googleAcc.async = true;
    googleAcc.defer = true;
    document.head.appendChild(googleAcc);
    
    const login = document.createElement('script');
    login.id = 'login-script';
    login.src = '/login/script.js';
    login.async = true;
    document.head.appendChild(login);
  }
})();
