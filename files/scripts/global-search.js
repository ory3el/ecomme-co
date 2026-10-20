(() => {
  'use strict';

  if (window.__ecommeGlobalSearchInitialized) return;
  window.__ecommeGlobalSearchInitialized = true;

  const SEARCH_PATH = '/products/search/';
  const SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';
  const SUGGESTION_LIMIT = 7;
  const MIN_QUERY_LENGTH = 2;
  const DEBOUNCE_MS = 190;
  const suggestionCache = new Map();
  let panelSequence = 0;

  function ensureSearchStyles() {
    if (document.querySelector('link[data-ecomme-search-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/files/styles/global-search.css';
    link.dataset.ecommeSearchStyle = 'true';
    document.head.appendChild(link);
  }

  function submitSearch(input, queryOverride) {
    const query = String(queryOverride ?? input?.value ?? '').trim();
    if (!query) {
      input?.focus();
      return;
    }

    if (input) input.value = query;
    closeActivePanel();

    if (location.pathname.replace(/\/+$/, '') === '/products/search'
        && typeof window.ecommeRunSearch === 'function') {
      window.ecommeRunSearch(query, 1);
      return;
    }

    const url = new URL(SEARCH_PATH, location.origin);
    url.searchParams.set('q', query);
    location.assign(url.pathname + url.search);
  }

  let activePanel = null;
  let activeInput = null;
  let activeContainer = null;

  function closeActivePanel() {
    if (!activePanel) return;
    activePanel.hidden = true;
    activePanel.classList.remove('is-open');
    if (activeInput) activeInput.setAttribute('aria-expanded', 'false');
    activePanel = activeInput = activeContainer = null;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function safeQuery(value) {
    return String(value || '').trim()
      .replace(/[%,_*()\\'"`]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 80);
  }

  function cleanCategory(value) {
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? item : (item?.name || item?.label || ''))
        .filter(Boolean).join(', ');
    }
    if (typeof value !== 'string') return '';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return cleanCategory(parsed);
    } catch { /* cat também pode ser texto simples */ }
    return value.trim();
  }

  async function fetchSuggestions(query, signal) {
    const cacheKey = query.toLocaleLowerCase('pt-BR');
    if (suggestionCache.has(cacheKey)) return suggestionCache.get(cacheKey);

    const url = new URL('/rest/v1/products', SUPABASE_URL);
    url.searchParams.set('select', 'id,name,cat');
    // Sugere produtos que correspondem pelo nome, descrição ou categoria.
    // O termo já foi sanitizado para não quebrar a sintaxe do filtro PostgREST.
    url.searchParams.set('or', `(name.ilike.*${query}*,desc.ilike.*${query}*,cat.ilike.*${query}*)`);
    url.searchParams.set('limit', String(SUGGESTION_LIMIT));
    url.searchParams.set('order', 'name.asc');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Accept: 'application/json'
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Sugestões Supabase: HTTP ${response.status}`);
    }

    const rows = await response.json();
    const results = (Array.isArray(rows) ? rows : [])
      .filter(row => row && row.name)
      .map(row => ({
        id: String(row.id ?? ''),
        name: String(row.name).trim(),
        category: cleanCategory(row.cat)
      }))
      .filter(row => row.name);

    suggestionCache.set(cacheKey, results);
    // Limita o cache para não crescer indefinidamente em sessões longas.
    if (suggestionCache.size > 80) {
      suggestionCache.delete(suggestionCache.keys().next().value);
    }
    return results;
  }

  function positionPanel(container, panel) {
    const rect = container.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 280), Math.max(280, window.innerWidth - margin * 2));
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - width - margin)
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 80)}px`;
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${Math.max(140, window.innerHeight - rect.bottom - 20)}px`;
  }

  function getPanel(container, input) {
    // Search results had a static demo autocomplete. Hide it and replace it
    // with the same live suggestions used by every other header.
    const legacyPanel = container.querySelector('.ac-drop');
    if (legacyPanel) {
      legacyPanel.hidden = true;
      legacyPanel.setAttribute('aria-hidden', 'true');
      legacyPanel.style.setProperty('display', 'none', 'important');
      legacyPanel.innerHTML = '';
    }

    const panel = document.createElement('div');
    panel.className = 'ecomme-search-suggestions';
    panel.id = `ecomme-search-suggestions-${++panelSequence}`;
    panel.hidden = true;
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Sugestões de pesquisa');
    document.body.appendChild(panel);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', panel.id);
    input.setAttribute('aria-expanded', 'false');
    return panel;
  }

  function makeRow({ title, subtitle = '', value, kind = 'term', icon = '⌕' }, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ecomme-suggest-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.dataset.suggestionIndex = String(index);
    button.dataset.searchValue = value;
    button.dataset.suggestionKind = kind;

    const iconNode = document.createElement('span');
    iconNode.className = 'ecomme-suggest-icon';
    iconNode.setAttribute('aria-hidden', 'true');
    iconNode.textContent = icon;

    const copy = document.createElement('span');
    copy.className = 'ecomme-suggest-copy';
    const titleNode = document.createElement('span');
    titleNode.className = 'ecomme-suggest-title';
    titleNode.textContent = title;
    copy.appendChild(titleNode);

    if (subtitle) {
      const subtitleNode = document.createElement('span');
      subtitleNode.className = 'ecomme-suggest-subtitle';
      subtitleNode.textContent = subtitle;
      copy.appendChild(subtitleNode);
    }

    const enterNode = document.createElement('span');
    enterNode.className = 'ecomme-suggest-enter';
    enterNode.setAttribute('aria-hidden', 'true');
    enterNode.textContent = '↵';

    button.append(iconNode, copy, enterNode);
    return button;
  }

  function renderSuggestions(panel, query, rows, loading = false) {
    const fragment = document.createDocumentFragment();
    const heading = document.createElement('div');
    heading.className = 'ecomme-suggest-heading';
    heading.textContent = 'PESQUISAS SUGERIDAS';
    fragment.appendChild(heading);

    fragment.appendChild(makeRow({
      title: `Pesquisar por “${query}”`,
      subtitle: 'Ver todos os resultados para este termo',
      value: query,
      kind: 'term',
      icon: '⌕'
    }, 0));

    if (loading) {
      const status = document.createElement('div');
      status.className = 'ecomme-suggest-status';
      status.textContent = 'Buscando sugestões…';
      fragment.appendChild(status);
    } else if (rows.length) {
      const productHeading = document.createElement('div');
      productHeading.className = 'ecomme-suggest-heading';
      productHeading.textContent = 'TERMOS RELACIONADOS A PRODUTOS';
      fragment.appendChild(productHeading);

      const seen = new Set([query.toLocaleLowerCase('pt-BR')]);
      let index = 1;
      for (const row of rows) {
        const key = row.name.toLocaleLowerCase('pt-BR');
        if (seen.has(key)) continue;
        seen.add(key);
        const subtitle = row.category ? `Categoria: ${row.category}` : 'Pesquisar este produto';
        fragment.appendChild(makeRow({
          title: row.name,
          subtitle,
          value: row.name,
          kind: 'product-term',
          icon: '⌕'
        }, index++));
      }
    } else if (!loading) {
      const status = document.createElement('div');
      status.className = 'ecomme-suggest-status';
      status.textContent = 'Nenhuma sugestão de produto encontrada. Você ainda pode pesquisar o termo digitado.';
      fragment.appendChild(status);
    }

    panel.replaceChildren(fragment);
    panel.querySelectorAll('.ecomme-suggest-item').forEach((item, index) => {
      item.id = `${panel.id}-option-${index}`;
      item.dataset.suggestionIndex = String(index);
    });
  }

  function openPanel(container, input, panel) {
    positionPanel(container, panel);
    panel.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    input.setAttribute('aria-expanded', 'true');
    activePanel = panel;
    activeInput = input;
    activeContainer = container;
  }

  function highlightItem(panel, index) {
    const items = [...panel.querySelectorAll('.ecomme-suggest-item')];
    if (!items.length) return -1;
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, i) => {
      const selected = i === nextIndex;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    if (activeInput) activeInput.setAttribute('aria-activedescendant', items[nextIndex].id || '');
    items[nextIndex].scrollIntoView({ block: 'nearest' });
    return nextIndex;
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

    const panel = getPanel(container, input);
    let debounceTimer = null;
    let requestController = null;
    let requestVersion = 0;
    let activeIndex = -1;

    function hidePanel() {
      if (activePanel === panel) closeActivePanel();
      else {
        panel.hidden = true;
        panel.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
      }
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
    }

    async function updateSuggestions() {
      const query = safeQuery(input.value);
      clearTimeout(debounceTimer);
      if (requestController) requestController.abort();
      requestController = null;
      const version = ++requestVersion;

      if (query.length < MIN_QUERY_LENGTH) {
        hidePanel();
        return;
      }

      openPanel(container, input, panel);
      activeIndex = -1;
      renderSuggestions(panel, query, [], true);

      debounceTimer = setTimeout(async () => {
        const controller = new AbortController();
        requestController = controller;
        try {
          const rows = await fetchSuggestions(query, controller.signal);
          if (version !== requestVersion || input.value.trim().length < MIN_QUERY_LENGTH) return;
          renderSuggestions(panel, query, rows, false);
          positionPanel(container, panel);
        } catch (error) {
          if (error?.name === 'AbortError') return;
          if (version !== requestVersion) return;
          console.warn('[Ecomme Search] Não foi possível carregar sugestões:', error);
          renderSuggestions(panel, query, [], false);
        }
      }, DEBOUNCE_MS);
    }

    input.addEventListener('input', updateSuggestions);
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= MIN_QUERY_LENGTH) updateSuggestions();
    });

    // Remover somente os handlers antigos do campo especializado /products/search,
    // pois ele tinha sugestões de demonstração baseadas num array local.
    if (container.classList.contains('hdr-search')) {
      input.removeAttribute('oninput');
      input.removeAttribute('onkeydown');
    }

    input.addEventListener('keydown', event => {
      if (event.isComposing) return;

      if (event.key === 'ArrowDown' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        activeIndex = highlightItem(panel, activeIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        activeIndex = highlightItem(panel, activeIndex < 0 ? 0 : activeIndex - 1);
        return;
      }
      if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        hidePanel();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        const items = [...panel.querySelectorAll('.ecomme-suggest-item')];
        const selected = activeIndex >= 0 ? items[activeIndex] : null;
        submitSearch(input, selected?.dataset.searchValue || input.value);
      }
    }, true);

    panel.addEventListener('pointerdown', event => {
      // Impede o blur do campo antes do evento click da sugestão.
      if (event.target.closest('.ecomme-suggest-item')) event.preventDefault();
    });

    panel.addEventListener('click', event => {
      const item = event.target.closest('.ecomme-suggest-item');
      if (!item || !panel.contains(item)) return;
      submitSearch(input, item.dataset.searchValue || input.value);
    });

    const onSubmit = event => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      const items = [...panel.querySelectorAll('.ecomme-suggest-item')];
      const selected = activeIndex >= 0 ? items[activeIndex] : null;
      submitSearch(input, selected?.dataset.searchValue || input.value);
    };

    button.addEventListener('click', onSubmit, true);
    button.setAttribute('aria-label', 'Pesquisar produtos');
    if (!button.title) button.title = 'Pesquisar produtos';

    // Ajusta o menu durante a rolagem e redimensionamento apenas enquanto aberto.
    const reposition = () => {
      if (!panel.hidden && activeContainer === container) positionPanel(container, panel);
    };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
  }

  document.addEventListener('pointerdown', event => {
    if (!activePanel) return;
    if (activePanel.contains(event.target)) return;
    if (activeContainer?.contains(event.target)) return;
    closeActivePanel();
  });

  function init(root = document) {
    const selectors = ['.search-bar', '.hdr-search'];
    selectors.forEach(selector => {
      if (root.matches?.(selector)) bindSearchContainer(root);
      root.querySelectorAll?.(selector).forEach(bindSearchContainer);
    });
  }

  function start() {
    init(document);

    // Header pode ser injetado dinamicamente nas páginas compartilhadas.
    if (!document.querySelector('.search-bar, .hdr-search')) {
      const mount = document.getElementById('index-header')
        || document.getElementById('headerMount')
        || document.querySelector('[data-header-mount]');

      if (mount && !window.__ecommeSearchMutationObserver) {
        window.__ecommeSearchMutationObserver = new MutationObserver(records => {
          for (const record of records) {
            record.addedNodes.forEach(node => {
              if (node.nodeType !== Node.ELEMENT_NODE) return;
              if (node.matches?.('.search-bar, .hdr-search')) bindSearchContainer(node);
              else if (node.querySelector) init(node);
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
