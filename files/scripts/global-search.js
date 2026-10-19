(() => {
  'use strict';

  if (window.__ecommeGlobalSearchInitialized) return;
  window.__ecommeGlobalSearchInitialized = true;

  const SEARCH_PATH = '/products/search/';

  function ensureSearchStyles() {
    if (document.querySelector('link[data-ecomme-search-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/files/styles/global-search.css';
    link.dataset.ecommeSearchStyle = 'true';
    document.head.appendChild(link);
  }

  function submitSearch(input) {
    const query = String(input?.value || '').trim();
    if (!query) {
      input?.focus();
      return;
    }

    if (location.pathname.replace(/\/+$/, '') === '/products/search'
        && typeof window.ecommeRunSearch === 'function') {
      window.ecommeRunSearch(query, 1);
      return;
    }

    const url = new URL(SEARCH_PATH, location.origin);
    url.searchParams.set('q', query);
    location.assign(url.pathname + url.search);
  }

  function bindSearchContainer(container) {
    if (!container || container.dataset.ecommeSearchBound === 'true') return;

    const input = container.querySelector('input');
    if (!input || input.disabled) return;

    container.dataset.ecommeSearchBound = 'true';
    ensureSearchStyles();

    let button = container.querySelector(
      '.ecomme-search-submit, .hdr-search-btn, button[type="submit"]'
    );

    // Header padrão do Ecomme: inclui automaticamente o botão sem alterar o HTML de cada página.
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'ecomme-search-submit';
      button.setAttribute('aria-label', 'Pesquisar produtos');
      button.title = 'Pesquisar produtos';
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>`;
      container.appendChild(button);
    }

    const onSubmit = event => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      submitSearch(input);
    };

    // Captura primeiro para impedir que handlers antigos processem Enter de outra forma.
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing) return;
      onSubmit(event);
    }, true);

    // Captura o clique antes do onclick inline existente na página de busca.
    button.addEventListener('click', onSubmit, true);
    button.setAttribute('aria-label', 'Pesquisar produtos');
    if (!button.title) button.title = 'Pesquisar produtos';
  }

  function init(root = document) {
    const selectors = [
      '.search-bar',
      '.hdr-search'
    ];

    selectors.forEach(selector => {
      if (root.matches?.(selector)) bindSearchContainer(root);
      root.querySelectorAll?.(selector).forEach(bindSearchContainer);
    });
  }

  function start() {
    init(document);

    // Só observa um ponto de montagem conhecido se o header ainda não existe.
    // Evita observar a página inteira durante a renderização dos produtos.
    if (!document.querySelector('.search-bar, .hdr-search')) {
      const mount = document.getElementById('index-header')
        || document.getElementById('headerMount')
        || document.querySelector('[data-header-mount]');

      if (mount && !window.__ecommeSearchMutationObserver) {
        window.__ecommeSearchMutationObserver = new MutationObserver(records => {
          for (const record of records) {
            record.addedNodes.forEach(node => {
              if (node.nodeType !== Node.ELEMENT_NODE) return;
              if (node.matches?.('.search-bar, .hdr-search')) {
                bindSearchContainer(node);
              } else if (node.querySelector) {
                init(node);
              }
            });
          }
        });

        window.__ecommeSearchMutationObserver.observe(mount, {
          childList: true,
          subtree: true
        });
      }
    }
  }

  window.ecommeSubmitSearch = submitSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
