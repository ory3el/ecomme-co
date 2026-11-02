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

  let activeVoiceSession = null;
  let voiceModalElements = null;

  function ensureVoiceModal() {
    if (voiceModalElements) return voiceModalElements;

    const overlay = document.createElement('div');
    overlay.className = 'ecomme-voice-modal-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="ecomme-voice-modal" role="dialog" aria-modal="true" aria-labelledby="ecomme-voice-title" aria-describedby="ecomme-voice-description">
        <button class="ecomme-voice-close" type="button" aria-label="Fechar pesquisa por voz" title="Fechar">&times;</button>
        <div class="ecomme-voice-modal-heading">
          <span class="ecomme-voice-eyebrow">PESQUISA POR VOZ</span>
          <h2 id="ecomme-voice-title">O que você está procurando?</h2>
          <p id="ecomme-voice-description">Comece a falar. Sua pesquisa será transcrita aqui em tempo real.</p>
        </div>
        <div class="ecomme-voice-transcript" aria-live="polite" aria-atomic="true">
          <span class="ecomme-voice-transcript-placeholder">Comece a falar...</span>
          <span class="ecomme-voice-transcript-final"></span>
          <span class="ecomme-voice-transcript-interim"></span>
        </div>
        <div class="ecomme-voice-live-indicator">
          <span class="ecomme-voice-mic-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"></path><path d="M19 11a7 7 0 0 1-14 0M12 18v4m-4 0h8"></path></svg>
          </span>
          <span class="ecomme-voice-modal-status" role="status" aria-live="polite">Preparando o microfone...</span>
        </div>
        <div class="ecomme-voice-modal-actions">
          <button class="ecomme-voice-cancel" type="button">Cancelar</button>
          <button class="ecomme-voice-send" type="button" disabled>
            <span>Enviar e pesquisar</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </section>`;
    document.body.appendChild(overlay);

    const elements = {
      overlay,
      dialog: overlay.querySelector('.ecomme-voice-modal'),
      close: overlay.querySelector('.ecomme-voice-close'),
      placeholder: overlay.querySelector('.ecomme-voice-transcript-placeholder'),
      finalText: overlay.querySelector('.ecomme-voice-transcript-final'),
      interimText: overlay.querySelector('.ecomme-voice-transcript-interim'),
      mic: overlay.querySelector('.ecomme-voice-mic-orb'),
      status: overlay.querySelector('.ecomme-voice-modal-status'),
      cancel: overlay.querySelector('.ecomme-voice-cancel'),
      send: overlay.querySelector('.ecomme-voice-send')
    };

    elements.send.addEventListener('click', () => requestVoiceSend(activeVoiceSession));
    elements.cancel.addEventListener('click', cancelActiveVoiceSession);
    elements.close.addEventListener('click', cancelActiveVoiceSession);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) cancelActiveVoiceSession();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !elements.overlay.hidden) {
        event.preventDefault();
        cancelActiveVoiceSession();
      }
    });

    voiceModalElements = elements;
    return elements;
  }

  function setVoiceModalStatus(message, state = 'listening') {
    const elements = ensureVoiceModal();
    elements.status.textContent = message;
    elements.mic.classList.toggle('is-listening', state === 'listening');
    elements.mic.classList.toggle('is-error', state === 'error');
    elements.mic.classList.toggle('is-processing', state === 'processing');
  }

  function cleanVoiceText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function voiceWordKey(word) {
    return String(word || '').toLocaleLowerCase('pt-BR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // Remove repetições consecutivas de palavras ou blocos idênticos, comuns
  // quando o serviço de voz repete uma hipótese durante a mesma captura.
  function collapseRepeatedSpeech(value) {
    const words = cleanVoiceText(value).split(' ').filter(Boolean);
    const output = [];
    for (let i = 0; i < words.length;) {
      let repeated = 0;
      const max = Math.min(8, output.length, words.length - i);
      for (let size = max; size >= 1; size--) {
        let matches = true;
        for (let j = 0; j < size; j++) {
          const previousKey = voiceWordKey(output[output.length - size + j]);
          const currentKey = voiceWordKey(words[i + j]);
          if (!previousKey || previousKey !== currentKey) {
            matches = false;
            break;
          }
        }
        if (matches) {
          repeated = size;
          break;
        }
      }
      if (repeated) i += repeated;
      else output.push(words[i++]);
    }
    return output.join(' ');
  }

  // Uma nova instância do reconhecimento pode devolver novamente o final da
  // sessão anterior. Remove o maior trecho em comum entre o fim e o começo.
  function removeVoiceOverlap(previousText, nextText) {
    const previous = cleanVoiceText(previousText).split(' ').filter(Boolean);
    const next = cleanVoiceText(nextText).split(' ').filter(Boolean);
    // O serviço pode reenviar dezenas de palavras (ou toda a transcrição anterior)
    // ao reiniciar a captura. O limite antigo de 24 palavras deixava o restante duplicado.
    const max = Math.min(250, previous.length, next.length);
    let overlap = 0;

    for (let size = max; size >= 1; size--) {
      let matches = true;
      for (let i = 0; i < size; i++) {
        const a = voiceWordKey(previous[previous.length - size + i]);
        const b = voiceWordKey(next[i]);
        if (!a || a !== b) {
          matches = false;
          break;
        }
      }
      if (matches) {
        overlap = size;
        break;
      }
    }

    return next.slice(overlap).join(' ');
  }

  function mergeVoiceTranscript(previousText, nextText) {
    const previous = collapseRepeatedSpeech(previousText);
    const next = collapseRepeatedSpeech(nextText);
    const remainder = removeVoiceOverlap(previous, next);
    return [previous, remainder].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  function getVoiceTranscript(session) {
    const confirmed = mergeVoiceTranscript(session.finalTranscript, session.currentFinalTranscript);
    return mergeVoiceTranscript(confirmed, session.interimTranscript);
  }

  function renderVoiceTranscript(session) {
    const elements = ensureVoiceModal();
    const confirmed = mergeVoiceTranscript(session.finalTranscript, session.currentFinalTranscript);
    const interim = removeVoiceOverlap(confirmed, collapseRepeatedSpeech(session.interimTranscript));
    const hasText = Boolean(mergeVoiceTranscript(confirmed, interim));
    elements.placeholder.hidden = hasText;
    elements.finalText.textContent = confirmed;
    elements.interimText.textContent = interim ? ` ${interim}` : '';
    elements.send.disabled = !hasText || session.sendRequested;
  }

  function openVoiceModal(session) {
    const elements = ensureVoiceModal();
    activeVoiceSession = session;
    elements.placeholder.hidden = false;
    elements.finalText.textContent = '';
    elements.interimText.textContent = '';
    elements.send.disabled = true;
    elements.send.querySelector('span').textContent = 'Enviar e pesquisar';
    setVoiceModalStatus('Ouvindo você... comece a falar.', 'listening');
    elements.overlay.hidden = false;
    elements.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ecomme-voice-modal-open');
    requestAnimationFrame(() => {
      elements.overlay.classList.add('is-open');
      elements.cancel.focus({ preventScroll: true });
    });
  }

  function closeVoiceModal() {
    if (!voiceModalElements) return;
    const elements = voiceModalElements;
    elements.overlay.classList.remove('is-open');
    elements.overlay.hidden = true;
    elements.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ecomme-voice-modal-open');
  }

  function resetVoiceButton(session) {
    const button = session?.voiceButton;
    if (!button) return;
    button.classList.remove('is-requesting', 'is-listening');
    button.removeAttribute('aria-busy');
    button.dataset.ecommeVoiceBusy = 'false';
    button.title = 'Pesquisar por voz';
    button.setAttribute('aria-label', 'Pesquisar por voz');
    button._ecommeRecognition = null;
  }

  function cleanupVoiceSession(session) {
    if (!session) return;
    session.cancelled = true;
    session.shouldContinue = false;
    clearTimeout(session.restartTimer);
    clearTimeout(session.sendFallbackTimer);
    try { session.recognition?.abort(); } catch (_) { /* reconhecimento já encerrado */ }
    if (window.__ecommeActiveVoiceRecognition === session.recognition) {
      window.__ecommeActiveVoiceRecognition = null;
    }
    resetVoiceButton(session);
    if (activeVoiceSession === session) activeVoiceSession = null;
    closeVoiceModal();
  }

  function cancelActiveVoiceSession() {
    const session = activeVoiceSession;
    if (!session) {
      closeVoiceModal();
      return;
    }
    cleanupVoiceSession(session);
    if (session.voiceStatus) session.voiceStatus.textContent = 'Pesquisa por voz cancelada.';
    if (session.voiceButton?.isConnected) session.voiceButton.focus({ preventScroll: true });
  }

  function finishVoiceSearch(session) {
    if (!session || session.cancelled) return;
    const query = getVoiceTranscript(session);
    if (!query) {
      session.sendRequested = false;
      session.shouldContinue = false;
      clearTimeout(session.restartTimer);
      if (voiceModalElements) {
        voiceModalElements.send.disabled = true;
        setVoiceModalStatus('Não identificamos nenhuma fala. Feche e tente novamente.', 'error');
      }
      resetVoiceButton(session);
      return;
    }

    const input = session.input;
    cleanupVoiceSession(session);
    if (session.voiceStatus) session.voiceStatus.textContent = `Pesquisa por voz: ${query}`;
    submitSearch(input, query);
  }

  function requestVoiceSend(session) {
    if (!session || session.cancelled) return;
    const query = getVoiceTranscript(session);
    if (!query) {
      setVoiceModalStatus('Comece a falar para formar sua pesquisa.', 'listening');
      return;
    }

    session.sendRequested = true;
    session.shouldContinue = false;
    clearTimeout(session.restartTimer);
    if (voiceModalElements) {
      voiceModalElements.send.disabled = true;
      voiceModalElements.send.querySelector('span').textContent = 'Enviando...';
    }
    setVoiceModalStatus('Finalizando a transcrição...', 'processing');

    if (!session.recognition || session.ended) {
      finishVoiceSearch(session);
      return;
    }

    try { session.recognition.stop(); } catch (_) { finishVoiceSearch(session); return; }
    session.sendFallbackTimer = setTimeout(() => finishVoiceSearch(session), 1200);
  }

  function appendSessionTranscript(session) {
    // Só confirma resultados finais. A junção remove qualquer sobreposição
    // com o final da sessão anterior para não repetir palavras no reinício.
    session.finalTranscript = mergeVoiceTranscript(
      session.finalTranscript,
      session.currentFinalTranscript
    );
    session.currentFinalTranscript = '';
    session.interimTranscript = '';
  }

  function startVoiceRecognition(session, SpeechRecognitionAPI) {
    if (!session || session.cancelled || !session.shouldContinue) return;

    let recognition;
    try {
      recognition = new SpeechRecognitionAPI();
    } catch (_) {
      session.shouldContinue = false;
      setVoiceModalStatus('Não foi possível iniciar o reconhecimento de fala neste navegador.', 'error');
      resetVoiceButton(session);
      return;
    }

    session.recognition = recognition;
    session.ended = false;
    session.currentFinalTranscript = '';
    session.interimTranscript = '';
    session.fatalError = '';
    session.voiceButton._ecommeRecognition = recognition;
    window.__ecommeActiveVoiceRecognition = recognition;

    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (session.cancelled) return;
      session.voiceButton.classList.add('is-listening');
      setVoiceModalStatus('Ouvindo você... continue falando.', 'listening');
    };

    recognition.onresult = event => {
      if (session.cancelled) return;

      // event.results já contém a fotografia COMPLETA dos resultados atuais
      // da instância: finais confirmados + hipóteses provisórias. Reconstruir
      // sempre do zero evita reaproveitar fragmentos antigos por índice.
      const confirmed = [];
      const interim = [];
      const results = event.results;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) continue;
        (result.isFinal ? confirmed : interim).push(transcript);
      }

      session.currentFinalTranscript = collapseRepeatedSpeech(confirmed.join(' '));
      const confirmedSoFar = mergeVoiceTranscript(session.finalTranscript, session.currentFinalTranscript);
      session.interimTranscript = removeVoiceOverlap(
        confirmedSoFar,
        collapseRepeatedSpeech(interim.join(' '))
      );

      renderVoiceTranscript(session);
      if (getVoiceTranscript(session)) {
        setVoiceModalStatus('Texto reconhecido. Você pode continuar falando ou enviar a pesquisa.', 'listening');
      }
    };

    recognition.onerror = event => {
      if (session.cancelled) return;
      const messages = {
        'not-allowed': 'O navegador bloqueou o reconhecimento de fala. Verifique a permissão do microfone.',
        'service-not-allowed': 'O navegador não permitiu o serviço de reconhecimento de fala.',
        'audio-capture': 'Não foi possível capturar o áudio do microfone.',
        'no-speech': 'Ainda não detectamos fala. Comece a falar perto do microfone.',
        'network': 'O serviço de reconhecimento não conseguiu se conectar. Verifique sua internet.',
        'language-not-supported': 'O reconhecimento de fala em português não está disponível neste navegador.'
      };
      const message = messages[event.error] || (event.error === 'aborted' ? '' : 'Ocorreu um erro durante o reconhecimento de fala.');
      if (event.error && !['no-speech', 'aborted'].includes(event.error)) {
        session.fatalError = message || 'O reconhecimento de fala foi interrompido.';
        session.shouldContinue = false;
      }
      if (message) setVoiceModalStatus(message, event.error === 'no-speech' ? 'listening' : 'error');
    };

    recognition.onend = () => {
      if (session.recognition !== recognition) return;
      session.ended = true;
      appendSessionTranscript(session);
      renderVoiceTranscript(session);
      if (session.voiceButton._ecommeRecognition === recognition) session.voiceButton._ecommeRecognition = null;
      if (window.__ecommeActiveVoiceRecognition === recognition) window.__ecommeActiveVoiceRecognition = null;

      if (session.cancelled) return;
      if (session.sendRequested) {
        finishVoiceSearch(session);
        return;
      }
      if (!session.shouldContinue) {
        resetVoiceButton(session);
        if (session.fatalError) setVoiceModalStatus(session.fatalError, 'error');
        return;
      }

      setVoiceModalStatus('Continue falando. Estamos mantendo sua transcrição.', 'listening');
      session.restartTimer = setTimeout(() => {
        if (activeVoiceSession === session && session.shouldContinue && !session.cancelled) {
          startVoiceRecognition(session, SpeechRecognitionAPI);
        }
      }, 300);
    };

    try {
      recognition.start();
    } catch (error) {
      session.shouldContinue = false;
      session.ended = true;
      const message = error?.name === 'InvalidStateError'
        ? 'O reconhecimento de fala já está em andamento. Feche e tente novamente.'
        : 'A permissão foi concedida, mas não foi possível iniciar a captura de voz.';
      setVoiceModalStatus(message, 'error');
      resetVoiceButton(session);
    }
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
      if (activeVoiceSession) return;
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
        // A chamada é feita diretamente a partir do clique para solicitar permissão.
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
      const session = {
        input,
        voiceButton,
        voiceStatus,
        recognition: null,
        finalTranscript: '',
        currentFinalTranscript: '',
        interimTranscript: '',
        shouldContinue: Boolean(SpeechRecognitionAPI),
        sendRequested: false,
        cancelled: false,
        ended: true,
        fatalError: '',
        restartTimer: null,
        sendFallbackTimer: null
      };

      openVoiceModal(session);
      if (!SpeechRecognitionAPI) {
        session.shouldContinue = false;
        setVoiceModalStatus('O acesso ao microfone foi autorizado, mas este navegador não oferece transcrição de fala. Experimente uma versão atualizada do Chrome ou Edge.', 'error');
        return;
      }

      voiceButton.classList.add('is-listening');
      voiceButton.title = 'Pesquisa por voz em andamento';
      voiceButton.setAttribute('aria-label', 'Pesquisa por voz em andamento');
      voiceStatus.textContent = 'Ouvindo e transcrevendo sua fala...';
      startVoiceRecognition(session, SpeechRecognitionAPI);
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
