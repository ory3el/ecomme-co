(() => {
  'use strict';

  if (window.__ecommeGlobalSearchInitialized) return;
  window.__ecommeGlobalSearchInitialized = true;

  const SEARCH_PATH = '/products/search/';
  const SUPABASE_URL_1 = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY_1 = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';
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

  function normalizeSuggestionRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter(row => row && row.name)
      .map(row => ({
        id: String(row.id ?? ''),
        name: String(row.name).trim(),
        category: cleanCategory(row.cat)
      }))
      .filter(row => row.name);
  }

  function requestMicrophoneStream() {
    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
      // Chamado diretamente a partir do clique para acionar o diálogo de permissão.
      return mediaDevices.getUserMedia.call(mediaDevices, { audio: true, video: false });
    }

    const legacyGetUserMedia = navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia;

    if (typeof legacyGetUserMedia === 'function') {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, { audio: true, video: false }, resolve, reject);
      });
    }

    const error = new Error('Acesso ao microfone não é suportado neste navegador.');
    error.name = 'NotSupportedError';
    return Promise.reject(error);
  }

  function stopMicrophoneStream(stream) {
    if (!stream || typeof stream.getTracks !== 'function') return;
    stream.getTracks().forEach(track => {
      try { track.stop(); } catch (_) { /* trilha já encerrada */ }
    });
  }

  function microphoneErrorMessage(error) {
    const messages = {
      NotAllowedError: 'Acesso ao microfone negado ou bloqueado. Permita o microfone nas configurações do navegador e tente novamente.',
      PermissionDeniedError: 'Acesso ao microfone negado. Permita o uso do microfone nas configurações do navegador.',
      NotFoundError: 'Nenhum microfone foi encontrado. Conecte um microfone e tente novamente.',
      DevicesNotFoundError: 'Nenhum microfone foi encontrado. Conecte um microfone e tente novamente.',
      NotReadableError: 'O microfone está ocupado ou não pode ser acessado no momento.',
      TrackStartError: 'O microfone não conseguiu iniciar. Verifique se ele está conectado e não está sendo usado por outro aplicativo.',
      OverconstrainedError: 'Não foi possível utilizar o microfone disponível.',
      SecurityError: 'O navegador bloqueou o acesso ao microfone por segurança.',
      NotSupportedError: 'Este navegador não oferece acesso ao microfone nesta página.',
      AbortError: 'A solicitação de acesso ao microfone foi interrompida.'
    };
    return messages[error?.name] || 'Não foi possível acessar o microfone. Verifique a conexão e as permissões do navegador.';
  }

  async function fetchSuggestions(query, signal) {
    const cacheKey = query.toLocaleLowerCase('pt-BR');
    if (suggestionCache.has(cacheKey)) return suggestionCache.get(cacheKey);

    // Pesquisa principal somente em colunas textuais. Usar cat.ilike no mesmo
    // filtro OR pode invalidar a consulta inteira quando cat for text[]/jsonb.
    const url = new URL('/rest/v1/products', SUPABASE_URL_1);
    url.searchParams.set('select', 'id,name,cat');
    url.searchParams.set('or', `(name.ilike.*${query}*,desc.ilike.*${query}*)`);
    url.searchParams.set('limit', String(SUGGESTION_LIMIT));
    url.searchParams.set('order', 'name.asc');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY_1,
        Accept: 'application/json'
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Sugestões Supabase: HTTP ${response.status}`);
    }

    const primaryRows = normalizeSuggestionRows(await response.json());
    const results = [...primaryRows];
    const seenIds = new Set(results.map(row => row.id).filter(Boolean));
    const seenNames = new Set(results.map(row => row.name.toLocaleLowerCase('pt-BR')));

    // Se ainda houver espaço, tenta encontrar produtos pela categoria usando
    // contains (cs), compatível com categorias armazenadas como arrays/jsonb.
    // A tentativa é opcional: se o tipo da coluna não suportar contains, as
    // sugestões por nome/descrição continuam funcionando normalmente.
    if (results.length < SUGGESTION_LIMIT) {
      const categoryQuery = query.replace(/[{}"\\]/g, ' ').replace(/\s+/g, ' ').trim();
      if (categoryQuery) {
        try {
          const categoryUrl = new URL('/rest/v1/products', SUPABASE_URL_1);
          categoryUrl.searchParams.set('select', 'id,name,cat');
          categoryUrl.searchParams.set('cat', `cs.{${categoryQuery}}`);
          categoryUrl.searchParams.set('limit', String(SUGGESTION_LIMIT));
          categoryUrl.searchParams.set('order', 'name.asc');

          const categoryResponse = await fetch(categoryUrl.toString(), {
            method: 'GET',
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY_1,
              Accept: 'application/json'
            },
            signal
          });

          if (categoryResponse.ok) {
            for (const row of normalizeSuggestionRows(await categoryResponse.json())) {
              const nameKey = row.name.toLocaleLowerCase('pt-BR');
              if ((row.id && seenIds.has(row.id)) || seenNames.has(nameKey)) continue;
              results.push(row);
              if (row.id) seenIds.add(row.id);
              seenNames.add(nameKey);
              if (results.length >= SUGGESTION_LIMIT) break;
            }
          }
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          // Categoria é uma busca complementar; falha nela não invalida a busca principal.
        }
      }
    }

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
    let voiceButton = container.querySelector('.ecomme-voice-search');
    let voiceStatus = container.querySelector('.ecomme-voice-status');

    if (!voiceButton) {
      voiceButton = document.createElement('button');
      voiceButton.type = 'button';
      voiceButton.className = 'ecomme-voice-search';
      voiceButton.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"></path>
          <path d="M19 11a7 7 0 0 1-14 0M12 18v4m-4 0h8"></path>
        </svg>`;
      container.appendChild(voiceButton);
    }

    // Não desabilite o botão por detecção de suporte: o clique precisa poder
    // solicitar a permissão real do microfone via getUserMedia().
    voiceButton.type = 'button';
    voiceButton.disabled = false;
    voiceButton.classList.remove('is-unavailable');
    voiceButton.title = 'Pesquisar por voz';
    voiceButton.setAttribute('aria-label', 'Pesquisar por voz');

    if (!voiceStatus) {
      voiceStatus = document.createElement('span');
      voiceStatus.className = 'ecomme-voice-status';
      voiceStatus.setAttribute('role', 'status');
      voiceStatus.setAttribute('aria-live', 'polite');
      container.appendChild(voiceStatus);
    }

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

    // O controlador universal passa a ser responsável pela barra do header.
    // Remove handlers inline legados que filtravam a página atual ou lançavam
    // ReferenceError em páginas sem renderProducts()/onHeaderSearch().
    input.removeAttribute('oninput');
    if (container.classList.contains('hdr-search')) {
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

    voiceButton.addEventListener('click', async () => {
      const currentRecognition = voiceButton._ecommeRecognition;
      if (voiceButton.classList.contains('is-listening') && currentRecognition) {
        voiceButton.title = 'Finalizando reconhecimento...';
        voiceButton.setAttribute('aria-label', 'Finalizando reconhecimento de voz');
        try { currentRecognition.stop(); } catch (_) { /* reconhecimento já finalizado */ }
        return;
      }

      if (voiceButton.dataset.ecommeVoiceBusy === 'true') return;

      if (window.isSecureContext === false && location.hostname !== 'localhost') {
        voiceStatus.textContent = 'A permissão do microfone exige uma conexão segura (HTTPS).';
        return;
      }

      voiceButton.dataset.ecommeVoiceBusy = 'true';
      voiceButton.classList.add('is-requesting');
      voiceButton.setAttribute('aria-busy', 'true');
      voiceButton.title = 'Solicitando acesso ao microfone...';
      voiceButton.setAttribute('aria-label', 'Solicitando acesso ao microfone');
      voiceStatus.textContent = 'Solicitando permissão para usar o microfone...';

      let permissionStream = null;
      try {
        // IMPORTANTE: esta chamada acontece antes do primeiro await e dentro
        // do clique do usuário, para que o navegador possa exibir a permissão.
        permissionStream = await requestMicrophoneStream();
      } catch (error) {
        voiceStatus.textContent = microphoneErrorMessage(error);
        return;
      } finally {
        stopMicrophoneStream(permissionStream);
        voiceButton.dataset.ecommeVoiceBusy = 'false';
        voiceButton.classList.remove('is-requesting');
        voiceButton.removeAttribute('aria-busy');
        voiceButton.title = 'Pesquisar por voz';
        voiceButton.setAttribute('aria-label', 'Pesquisar por voz');
      }

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        voiceStatus.textContent = 'Acesso ao microfone autorizado, mas este navegador não oferece reconhecimento de fala. Use um navegador compatível para pesquisar por voz.';
        return;
      }

      const previousRecognition = window.__ecommeActiveVoiceRecognition;
      if (previousRecognition) {
        previousRecognition.__ecommeCancelled = true;
        try { previousRecognition.abort(); } catch (_) { /* já finalizado */ }
      }

      const recognition = new SpeechRecognitionAPI();
      let finalTranscript = '';
      let recognitionError = '';
      const previousValue = input.value;

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      voiceStatus.textContent = 'Ouvindo... fale o nome do produto.';
      voiceButton.classList.add('is-listening');
      voiceButton.title = 'Ouvindo... clique para finalizar';
      voiceButton.setAttribute('aria-label', 'Ouvindo. Clique para finalizar a pesquisa por voz');
      voiceButton._ecommeRecognition = recognition;
      window.__ecommeActiveVoiceRecognition = recognition;

      recognition.onresult = event => {
        const confirmed = [];
        const interim = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result?.[0]?.transcript?.trim();
          if (!transcript) continue;
          (result.isFinal ? confirmed : interim).push(transcript);
        }
        finalTranscript = confirmed.join(' ').trim();
        const preview = [finalTranscript, interim.join(' ')].filter(Boolean).join(' ').trim();
        if (preview) input.value = preview;
      };

      recognition.onerror = event => {
        const messages = {
          'not-allowed': 'O microfone foi bloqueado para o reconhecimento de fala. Verifique a permissão do site.',
          'service-not-allowed': 'O navegador não permitiu o serviço de reconhecimento de fala.',
          'audio-capture': 'Nenhum microfone disponível foi encontrado.',
          'no-speech': 'Nenhuma fala foi detectada. Tente novamente.',
          'network': 'Não foi possível reconhecer a voz. Verifique sua conexão.',
          'language-not-supported': 'O reconhecimento em português não está disponível neste navegador.'
        };
        recognitionError = messages[event.error] || (event.error === 'aborted' ? '' : 'Não foi possível iniciar o reconhecimento de fala.');
      };

      recognition.onend = () => {
        voiceButton.classList.remove('is-listening');
        voiceButton.title = 'Pesquisar por voz';
        voiceButton.setAttribute('aria-label', 'Pesquisar por voz');
        if (voiceButton._ecommeRecognition === recognition) voiceButton._ecommeRecognition = null;
        if (window.__ecommeActiveVoiceRecognition === recognition) {
          window.__ecommeActiveVoiceRecognition = null;
        }

        if (recognition.__ecommeCancelled) return;

        if (finalTranscript) {
          input.value = finalTranscript;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          voiceStatus.textContent = `Pesquisando por: ${finalTranscript}`;
          submitSearch(input, finalTranscript);
          return;
        }

        input.value = previousValue;
        voiceStatus.textContent = recognitionError || 'Não foi possível identificar a fala. Tente novamente.';
      };

      try {
        recognition.start();
      } catch (error) {
        voiceButton.classList.remove('is-listening');
        voiceButton._ecommeRecognition = null;
        if (window.__ecommeActiveVoiceRecognition === recognition) {
          window.__ecommeActiveVoiceRecognition = null;
        }
        voiceButton.title = 'Pesquisar por voz';
        voiceButton.setAttribute('aria-label', 'Pesquisar por voz');
        voiceStatus.textContent = error?.name === 'InvalidStateError'
          ? 'O reconhecimento de voz já está em andamento.'
          : 'A permissão do microfone foi concedida, mas o reconhecimento de fala não pôde iniciar.';
      }
    });

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

    // Observa o body inteiro: alguns headers são carregados posteriormente
    // por fetch() e inseridos no DOM depois de DOMContentLoaded.
    if (document.body && !window.__ecommeSearchMutationObserver) {
      window.__ecommeSearchMutationObserver = new MutationObserver(records => {
        for (const record of records) {
          record.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.matches?.('.search-bar, .hdr-search')) {
              bindSearchContainer(node);
            }
            if (node.querySelector) init(node);
          });
        }
      });
      window.__ecommeSearchMutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  window.ecommeSubmitSearch = submitSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
