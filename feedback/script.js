/* ══════════════════════════════════════════════════════════════════
   ECOMME — /feedback
   • Autenticação: Supabase Auth (getUser). O user_id NUNCA é enviado pelo navegador:
     a coluna user_id é preenchida pelo banco a partir do JWT (DEFAULT auth.uid() + trigger).
   • Envio idempotente: o id do registro é gerado no cliente e reutilizado em reenvios do
     mesmo conteúdo; se o banco já tiver esse id, o envio anterior chegou e não duplicamos.
   • Sucesso só é exibido depois que o INSERT devolve a linha gravada.
   • Reaproveita do shell compartilhado (se existirem): goToLogin() e showToast().
   • Todo o código fica dentro de uma IIFE: nada vaza para o escopo global.
   ══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─── Constantes (espelham as CHECK constraints da tabela) ─────── */
  const TABLE = 'user_feedback';
  const BUCKET = 'feedback-attachments';
  const COLUMNS = 'id, type, category, title, description, status, attachments, created_at, updated_at';
  const LIMITS = { titleMin: 5, titleMax: 100, descMin: 20, descMax: 2000, maxFiles: 3, maxFileBytes: 5 * 1024 * 1024 };
  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const PAGE_SIZE = 10;
  const DRAFT_KEY = 'ecomme-feedback-draft';

  const TYPES = {
    feature: { label: 'Sugestão de funcionalidade', icon: 'fa-lightbulb' },
    improvement: { label: 'Melhoria', icon: 'fa-wand-magic-sparkles' },
    bug: { label: 'Problema/Erro', icon: 'fa-bug' },
    general: { label: 'Feedback geral', icon: 'fa-comment-dots' }
  };
  const CATEGORIES = { products: 'Produtos', purchases: 'Compras', sellers: 'Vendedores', payments: 'Pagamentos', account: 'Conta', interface: 'Interface', other: 'Outros' };
  // Exatamente os estados definidos na CHECK constraint do banco; qualquer outro valor é exibido como veio.
  const STATUSES = { pending: 'Pendente', in_review: 'Em análise', implemented: 'Implementado', declined: 'Recusado' };

  /* ─── Estado ───────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  let user = null;                 // usuário autenticado (ou null)
  let submitting = false;
  let attempt = null;              // { id, sig } do envio em andamento (reutilizado em reenvios idênticos)
  let files = [];                  // [{ file, url }]
  let items = [];                  // registros do histórico (mais recentes primeiro)
  let hasMore = false;
  let historyView = 'loading';     // loading | ready | login | error | unavailable
  let historySeq = 0;
  let loadingMore = false;
  let channel = null;
  let sendingEl = null;
  let lastFocus = null;
  const openItems = new Set();

  /* ─── Utilidades ───────────────────────────────────────────────── */
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const protocolOf = id => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const rand = () => Math.random().toString(36).slice(2, 8);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function isNetworkError(err) {
    if (!err) return false;
    const m = String(err.message || err).toLowerCase();
    return err.name === 'AuthRetryableFetchError' || err.name === 'TypeError' || /failed to fetch|network|load failed|timeout/.test(m);
  }
  const isMissingRelation = e => !!e && (['42P01', 'PGRST205'].includes(e.code) || /relation .* does not exist|could not find the table/i.test(e.message || ''));

  function toast(msg) {
    if (typeof window.showToast === 'function') { try { window.showToast(msg); return; } catch (e) { /* cai no fallback */ } }
    const t = $('toast'), m = $('toastMsg');
    if (!t || !m) return;
    m.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function goLogin() {
    if (typeof window.goToLogin === 'function') { window.goToLogin(); return; }          // volta para /feedback (mesma regra do site)
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  }

  /* ─── Autenticação ─────────────────────────────────────────────── */
  async function waitForSupabase(timeoutMs = 6000) {
    const start = Date.now();
    while (typeof supabaseClient === 'undefined' || !supabaseClient || !supabaseClient.auth) {
      if (Date.now() - start > timeoutMs) throw new Error('Supabase indisponível');
      await sleep(80);
    }
  }
  // null = sem sessão; lança em falha de rede (não confundir "offline" com "deslogado")
  async function resolveUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) { if (isNetworkError(error)) throw error; return null; }
    return (data && data.user) || null;
  }

  function applyAuthUi() {
    $('fbLoginBanner').hidden = !!user;
  }

  /* ─── Formulário: leitura, validação e contadores ──────────────── */
  const getType = () => { const r = document.querySelector('input[name="fbType"]:checked'); return r ? r.value : ''; };
  function readForm() {
    return { type: getType(), category: $('fbCategory').value, title: $('fbTitle').value.trim(), description: $('fbDescription').value.trim() };
  }
  function validate(v) {
    const e = {};
    if (!TYPES[v.type]) e.type = 'Escolha o tipo de envio.';
    if (!CATEGORIES[v.category]) e.category = 'Selecione a categoria.';
    if (!v.title) e.title = 'Informe um título.';
    else if (v.title.length < LIMITS.titleMin) e.title = `O título precisa ter pelo menos ${LIMITS.titleMin} caracteres.`;
    if (!v.description) e.description = 'Descreva sua sugestão ou o problema.';
    else if (v.description.length < LIMITS.descMin) e.description = `A descrição precisa ter pelo menos ${LIMITS.descMin} caracteres (faltam ${LIMITS.descMin - v.description.length}).`;
    return e;
  }
  const ERR_FIELDS = { type: ['fbTypeError', 'fbTypeField'], category: ['fbCategoryError', 'fbCategory'], title: ['fbTitleError', 'fbTitle'], description: ['fbDescriptionError', 'fbDescription'] };

  function setFieldError(name, msg) {
    const [errId, fieldId] = ERR_FIELDS[name];
    const err = $(errId), field = $(fieldId);
    err.textContent = msg || ''; err.hidden = !msg;
    if (name === 'type') field.classList.toggle('is-invalid', !!msg);
    else { field.classList.toggle('is-invalid', !!msg); field.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  }
  function showErrors(errs) { Object.keys(ERR_FIELDS).forEach(k => setFieldError(k, errs[k])); }
  function focusFirstError(errs) {
    const order = ['type', 'category', 'title', 'description'];
    const first = order.find(k => errs[k]);
    if (!first) return;
    const target = first === 'type' ? document.querySelector('input[name="fbType"]') : $(ERR_FIELDS[first][1]);
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  function updateCounters() {
    const t = $('fbTitle').value.length, d = $('fbDescription').value.length;
    $('fbTitleCount').textContent = `${t}/${LIMITS.titleMax}`;
    $('fbDescriptionCount').textContent = `${d}/${LIMITS.descMax}`;
    $('fbTitleCount').classList.toggle('is-near', t >= LIMITS.titleMax * 0.9);
    $('fbDescriptionCount').classList.toggle('is-near', d >= LIMITS.descMax * 0.9);
  }

  function showAlert(msg) { const a = $('fbFormAlert'); a.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span></span>'; a.lastElementChild.textContent = msg; a.hidden = false; }
  function hideAlert() { $('fbFormAlert').hidden = true; }

  function setBusy(busy) {
    const btn = $('fbSubmit');
    btn.disabled = busy; btn.classList.toggle('is-busy', busy);
    $('fbClear').disabled = busy;
    $('fbForm').setAttribute('aria-busy', String(busy));
    $('fbForm').querySelectorAll('input, select, textarea, button.fb-remove').forEach(el => { if (el !== btn) el.disabled = busy; });
  }

  /* ─── Rascunho local (sobrevive ao login) ──────────────────────── */
  let draftTimer = null;
  function saveDraft() {
    try {
      const v = { type: getType(), category: $('fbCategory').value, title: $('fbTitle').value, description: $('fbDescription').value };
      if (!v.type && !v.category && !v.title && !v.description) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    } catch (e) { /* armazenamento indisponível */ }
  }
  const scheduleDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 300); };
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
  function restoreDraft() {
    try {
      const v = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!v || typeof v !== 'object') return;
      if (TYPES[v.type]) { const r = document.querySelector(`input[name="fbType"][value="${v.type}"]`); if (r) r.checked = true; }
      if (CATEGORIES[v.category]) $('fbCategory').value = v.category;
      if (typeof v.title === 'string') $('fbTitle').value = v.title.slice(0, LIMITS.titleMax);
      if (typeof v.description === 'string') $('fbDescription').value = v.description.slice(0, LIMITS.descMax);
    } catch (e) { /* rascunho inválido: ignora */ }
  }

  /* ─── Anexos ───────────────────────────────────────────────────── */
  function showFilesError(msg) { const e = $('fbFilesError'); e.textContent = msg || ''; e.hidden = !msg; }
  function renderPreviews() {
    const ul = $('fbPreviews');
    ul.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li'); li.className = 'fb-preview';
      const img = document.createElement('img'); img.src = f.url; img.alt = `Imagem selecionada ${i + 1}`;
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'fb-remove'; rm.setAttribute('aria-label', `Remover imagem ${i + 1}`);
      rm.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      rm.addEventListener('click', () => { URL.revokeObjectURL(f.url); files = files.filter(x => x !== f); renderPreviews(); showFilesError(''); });
      li.append(img, rm); ul.appendChild(li);
    });
  }
  function addFiles(list) {
    const problems = [];
    for (const file of Array.from(list || [])) {
      if (files.length >= LIMITS.maxFiles) { problems.push(`Você pode anexar no máximo ${LIMITS.maxFiles} imagens.`); break; }
      if (!ALLOWED_MIME.includes(file.type)) { problems.push(`"${file.name}": formato não suportado (use PNG, JPG ou WEBP).`); continue; }
      if (file.size > LIMITS.maxFileBytes) { problems.push(`"${file.name}": acima de 5 MB.`); continue; }
      if (files.some(f => f.file.name === file.name && f.file.size === file.size && f.file.lastModified === file.lastModified)) continue;
      files.push({ file, url: URL.createObjectURL(file) });
    }
    renderPreviews();
    showFilesError(problems.join(' '));
  }
  function clearFiles() { files.forEach(f => URL.revokeObjectURL(f.url)); files = []; renderPreviews(); showFilesError(''); $('fbFiles').value = ''; }

  /* ─── Histórico: telas ─────────────────────────────────────────── */
  function typeLabel(t) { return TYPES[t] ? TYPES[t].label : String(t || ''); }

  function itemHtml(row) {
    const t = TYPES[row.type], statusKnown = Object.prototype.hasOwnProperty.call(STATUSES, row.status);
    const statusLabel = statusKnown ? STATUSES[row.status] : String(row.status ?? '—');
    const attachments = Array.isArray(row.attachments) ? row.attachments : [];
    const open = openItems.has(row.id);
    const long = String(row.description || '').length > 200;
    return `<li class="fb-item${open ? ' is-open' : ''}" data-id="${escapeHtml(row.id)}">
      <div class="fb-item-top">
        <div class="fb-item-tags">
          <span class="fb-chip"><i class="fa-solid ${t ? t.icon : 'fa-comment'}" aria-hidden="true"></i> ${escapeHtml(typeLabel(row.type))}</span>
          <span class="fb-chip is-cat">${escapeHtml(CATEGORIES[row.category] || row.category || '')}</span>
        </div>
        <span class="fb-status fb-status--${statusKnown ? escapeHtml(row.status) : 'unknown'}">${escapeHtml(statusLabel)}</span>
      </div>
      <h3>${escapeHtml(row.title)}</h3>
      <p class="fb-item-desc">${escapeHtml(row.description)}</p>
      <div class="fb-item-foot">
        <span>Protocolo <span class="fb-protocol">${escapeHtml(protocolOf(row.id))}</span> · Enviado em ${escapeHtml(fmtDate(row.created_at))}</span>
        <span class="fb-item-actions">
          ${attachments.map((p, i) => `<button type="button" class="fb-item-attach" data-path="${escapeHtml(p)}"><i class="fa-solid fa-paperclip" aria-hidden="true"></i> Anexo ${i + 1}</button>`).join('')}
          ${long ? `<button type="button" class="fb-item-toggle" data-toggle>${open ? 'Ver menos' : 'Ver mais'}</button>` : ''}
        </span>
      </div>
    </li>`;
  }

  function stateHtml(kind) {
    const btn = (id, label) => `<button type="button" class="fb-btn fb-btn-primary fb-btn-sm" id="${id}">${label}</button>`;
    if (kind === 'login') return `<i class="fa-solid fa-lock" aria-hidden="true"></i><h3>Entre para ver seus envios</h3><p>O histórico fica vinculado à sua conta Ecomme. Depois do login você volta para esta página.</p>${btn('fbStateLogin', 'Entrar na minha conta')}`;
    if (kind === 'error') return `<i class="fa-solid fa-wifi" aria-hidden="true"></i><h3>Não foi possível carregar seus envios</h3><p>Verifique sua conexão e tente novamente.</p>${btn('fbStateRetry', 'Tentar novamente')}`;
    if (kind === 'unavailable') return `<i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i><h3>Histórico indisponível no momento</h3><p>O canal de feedback está sendo configurado. Tente novamente mais tarde.</p>`;
    return `<i class="fa-regular fa-lightbulb" aria-hidden="true"></i><h3>Você ainda não enviou nenhum feedback</h3><p>Quando você enviar uma sugestão, melhoria ou relato, ele aparece aqui com o status atualizado pela equipe.</p><a class="fb-btn fb-btn-outline fb-btn-sm" href="#enviar">Enviar meu primeiro feedback</a>`;
  }

  function renderHistory(flashId) {
    const skel = $('fbHistorySkeleton'), list = $('fbList'), state = $('fbState'), more = $('fbMoreWrap'), body = $('fbHistory');
    const showing = historyView === 'ready' && items.length > 0;
    skel.hidden = historyView !== 'loading';
    body.setAttribute('aria-busy', String(historyView === 'loading'));
    list.hidden = !showing;
    more.hidden = !(showing && hasMore);
    $('fbMore').disabled = loadingMore;
    if (showing) {
      list.innerHTML = items.map(itemHtml).join('');
      if (flashId) {
        const el = Array.from(list.children).find(n => n.dataset && n.dataset.id === flashId);
        if (el) { el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 2200); }
      }
    } else {
      list.innerHTML = '';
    }
    if (historyView === 'loading' || showing) { state.hidden = true; state.innerHTML = ''; }
    else { state.hidden = false; state.innerHTML = stateHtml(historyView === 'ready' ? 'empty' : historyView); }
  }
  function setHistoryView(v) { historyView = v; renderHistory(); }

  /* "Enviando…": item em skeleton no topo do histórico enquanto o banco confirma */
  function showSending() {
    removeSending();
    const list = $('fbList');
    $('fbState').hidden = true; list.hidden = false;
    const li = document.createElement('li');
    li.className = 'fb-item is-sending'; li.setAttribute('aria-label', 'Enviando seu feedback');
    li.innerHTML = '<div class="fb-skel-item" style="border:none;padding:0"><span class="fb-skel fb-skel-line fb-w40"></span><span class="fb-skel fb-skel-line fb-w80"></span><span class="fb-skel fb-skel-line fb-w60"></span></div>';
    list.prepend(li); sendingEl = li;
  }
  function removeSending() { if (sendingEl) { sendingEl.remove(); sendingEl = null; } }

  /* ─── Histórico: dados ─────────────────────────────────────────── */
  async function loadHistory({ reset }) {
    const seq = ++historySeq;
    if (reset) { items = []; hasMore = false; setHistoryView('loading'); }
    else { loadingMore = true; $('fbMore').disabled = true; }
    const from = reset ? 0 : items.length;
    try {
      const { data, error } = await supabaseClient.from(TABLE).select(COLUMNS)
        .eq('user_id', user.id).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE);   // +1 linha para saber se há mais
      if (seq !== historySeq) return;                                                                      // resposta antiga: ignora
      if (error) throw error;
      const rows = data || [];
      hasMore = rows.length > PAGE_SIZE;
      const known = new Set(items.map(i => i.id));
      rows.slice(0, PAGE_SIZE).forEach(r => { if (!known.has(r.id)) items.push(r); });
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      loadingMore = false; setHistoryView('ready');
    } catch (err) {
      if (seq !== historySeq) return;
      console.error('Erro ao carregar o histórico de feedback:', err);
      loadingMore = false;
      if (!reset && items.length) { toast('Não foi possível carregar mais envios.'); renderHistory(); return; }
      setHistoryView(isMissingRelation(err) ? 'unavailable' : 'error');
    }
  }

  /* ─── Realtime: status alterado pelo backend aparece sem recarregar ─ */
  function unsubscribeRealtime() { if (channel) { try { supabaseClient.removeChannel(channel); } catch (e) { /* ignore */ } channel = null; } }
  function subscribeRealtime() {
    unsubscribeRealtime();
    if (!user) return;
    channel = supabaseClient.channel('ecomme-feedback-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${user.id}` }, onRealtime)
      .subscribe();
  }
  function onRealtime(payload) {
    const row = payload && payload.new, type = payload && payload.eventType;
    if (type === 'DELETE') {
      const id = payload.old && payload.old.id;
      if (id) { items = items.filter(i => i.id !== id); renderHistory(); }
      return;
    }
    if (!row || !row.id) return;
    const idx = items.findIndex(i => i.id === row.id);
    if (idx === -1) {
      if (type === 'INSERT' || type === 'UPDATE') { items.unshift(row); items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); if (historyView !== 'loading') { historyView = 'ready'; renderHistory(row.id); } }
      return;
    }
    const prev = items[idx];
    items[idx] = { ...prev, ...row };
    renderHistory(row.id);
    if (prev.status !== row.status) {
      const label = Object.prototype.hasOwnProperty.call(STATUSES, row.status) ? STATUSES[row.status] : row.status;
      toast(`O status do seu feedback mudou para: ${label}`);
    }
  }

   /* ─── Modal de confirmação ─────────────────────────────────────── */
  function openModal(saved) {
    lastFocus = document.activeElement;
    $('fbModalProtocol').textContent = protocolOf(saved.id);
    $('fbModalStatus').textContent = Object.prototype.hasOwnProperty.call(STATUSES, saved.status) ? STATUSES[saved.status] : String(saved.status ?? '—');
    $('fbModal').hidden = false;
    document.body.classList.add('fb-modal-open');
    const card = $('fbModal').querySelector('.fb-modal-card');
    card.focus({ preventScroll: true });
  }
  function closeModal() {
    if ($('fbModal').hidden) return;
    $('fbModal').hidden = true;
    document.body.classList.remove('fb-modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function trapFocus(ev) {
    if (ev.key === 'Escape') { closeModal(); return; }
    if (ev.key !== 'Tab' || $('fbModal').hidden) return;
    const f = Array.from($('fbModal').querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && (document.activeElement === first || document.activeElement === $('fbModal').querySelector('.fb-modal-card'))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  /* ─── Envio ────────────────────────────────────────────────────── */
  const signatureOf = v => JSON.stringify([v.type, v.category, v.title, v.description, files.map(f => [f.file.name, f.file.size, f.file.lastModified])]);

  async function removeUploaded(paths) {
    if (!paths.length) return;
    try { await supabaseClient.storage.from(BUCKET).remove(paths); } catch (e) { console.warn('Não foi possível limpar anexos de um envio que falhou:', e); }
  }

  function messageForError(err, stage) {
    const code = err && err.code, msg = String((err && (err.message || err.details)) || '');
    if (isNetworkError(err)) return 'Sem conexão com o servidor. Nada foi enviado e seu texto continua no formulário. Tente novamente.';
    if (/Limite de envios/i.test(msg)) return msg;
    if (/jwt|token|expired/i.test(msg) || code === 'PGRST301') return 'Sua sessão expirou. Entre novamente na sua conta e tente de novo.';
    if (code === '42501' || /row-level security|permission denied|not authorized|unauthorized/i.test(msg)) return stage === 'upload'
      ? 'Não foi possível enviar as imagens (sem permissão). Tente sem anexos ou entre novamente.'
      : 'Sem permissão para enviar. Entre novamente na sua conta e tente de novo.';
    if (stage === 'upload') return 'Não foi possível enviar as imagens agora. Remova os anexos ou tente novamente em instantes.';
    if (code === '23514') return 'Algum campo não atende aos limites permitidos. Revise o título e a descrição.';
    if (isMissingRelation(err)) { console.error('A tabela public.user_feedback não existe: execute a migração supabase/migrations/20261023000000_user_feedback.sql'); return 'O envio de feedback está temporariamente indisponível. Tente novamente mais tarde.'; }
    return 'Não foi possível enviar seu feedback agora. Seu texto continua no formulário; tente novamente em instantes.';
  }

  function resetForm() {
    $('fbForm').reset();
    clearFiles(); showErrors({}); hideAlert(); updateCounters(); clearDraft(); attempt = null;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting) return;                                   // bloqueia duplo clique / Enter repetido
    hideAlert();

    const values = readForm();
    const errs = validate(values);
    showErrors(errs);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }

    submitting = true; setBusy(true);                         // trava ANTES de qualquer await (evita corrida entre dois envios)
    const uploaded = [];
    let stage = 'session';

    try {
      // sessão conferida NO MOMENTO do envio (o estado da página pode estar velho)
      let current;
      try { current = await resolveUser(); }
      catch (e) { showAlert('Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.'); return; }
      if (!current) {
        saveDraft(); user = null; applyAuthUi(); setHistoryView('login');
        showAlert('Entre na sua conta para enviar. Seu texto foi guardado e você voltará para esta página depois do login.');
        goLogin();
        return;
      }
      user = current; applyAuthUi();

      showSending();
      const sig = signatureOf(values);
      if (!attempt || attempt.sig !== sig) attempt = { id: uuid(), sig };    // mesmo conteúdo = mesmo id (reenvio seguro)
      const id = attempt.id;

      stage = 'upload';
      const paths = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i].file;
        const path = `${user.id}/${id}/${i + 1}-${rand()}.${EXT[f.type]}`;
        const { error } = await supabaseClient.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: '3600', upsert: false });
        if (error) throw error;
        uploaded.push(path); paths.push(path);
      }

      stage = 'insert';
      // user_id e status NÃO são enviados: o banco os define (JWT + trigger)
      const payload = { id, type: values.type, category: values.category, title: values.title, description: values.description, attachments: paths };
      let { data: saved, error } = await supabaseClient.from(TABLE).insert(payload).select(COLUMNS).single();

      if (error && error.code === '23505') {                                  // o envio anterior já tinha chegado ao banco
        const res = await supabaseClient.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle();
        if (res.error || !res.data) throw error;
        saved = res.data;
        await removeUploaded(uploaded.splice(0));                             // arquivos desta tentativa ficaram órfãos
      } else if (error) {
        throw error;
      }
      if (!saved || !saved.id) throw new Error('O banco não confirmou a gravação do feedback.');

      onSaved(saved);                                                         // só aqui o sucesso é mostrado
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
      await removeUploaded(uploaded);
      showAlert(messageForError(err, stage));
      $('fbFormAlert').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      removeSending();
      submitting = false; setBusy(false);
      renderHistory();
    }
  }

  function onSaved(saved) {
    if (!items.some(i => i.id === saved.id)) items.unshift(saved);
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    historyView = 'ready';
    resetForm();
    removeSending();
    renderHistory(saved.id);
    openModal(saved);
    toast('Feedback enviado com sucesso!');
    if (!channel) subscribeRealtime();
  }

  /* ─── Eventos ──────────────────────────────────────────────────── */
  function bindEvents() {
    const form = $('fbForm');
    form.addEventListener('submit', onSubmit);
    form.addEventListener('input', ev => {
      if (ev.target === $('fbTitle') || ev.target === $('fbDescription')) updateCounters();
      const name = ev.target.name === 'fbType' ? 'type' : ev.target.id === 'fbCategory' ? 'category' : ev.target.id === 'fbTitle' ? 'title' : ev.target.id === 'fbDescription' ? 'description' : null;
      if (name) setFieldError(name, '');
      hideAlert(); scheduleDraft();
    });
    form.addEventListener('change', ev => { if (ev.target.name === 'fbType' || ev.target.id === 'fbCategory') { setFieldError(ev.target.name === 'fbType' ? 'type' : 'category', ''); scheduleDraft(); } });
    $('fbClear').addEventListener('click', () => { if (!submitting) resetForm(); });

    const input = $('fbFiles'), drop = $('fbDrop');
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });

    $('fbLoginBtn').addEventListener('click', () => { saveDraft(); goLogin(); });

    // histórico: delegação (ver mais, anexos, estados)
    $('fbHistory').addEventListener('click', async ev => {
      const t = ev.target.closest('button, a');
      if (!t) return;
      if (t.id === 'fbStateLogin') { goLogin(); return; }
      if (t.id === 'fbStateRetry') { retryInit(); return; }
      if (t.id === 'fbMore') { if (!loadingMore && user) loadHistory({ reset: false }); return; }
      if (t.hasAttribute('data-toggle')) {
        const li = t.closest('.fb-item'), id = li && li.dataset.id;
        if (!id) return;
        if (openItems.has(id)) openItems.delete(id); else openItems.add(id);
        li.classList.toggle('is-open', openItems.has(id));
        t.textContent = openItems.has(id) ? 'Ver menos' : 'Ver mais';
        return;
      }
      if (t.classList.contains('fb-item-attach')) openAttachment(t.dataset.path);
    });

    // modal
    $('fbModal').addEventListener('click', ev => { if (ev.target.hasAttribute('data-close')) closeModal(); });
    $('fbModalHistory').addEventListener('click', () => { closeModal(); $('meus-envios').scrollIntoView({ behavior: 'smooth' }); });
    $('fbModalAnother').addEventListener('click', () => { closeModal(); $('enviar').scrollIntoView({ behavior: 'smooth' }); const r = document.querySelector('input[name="fbType"]'); if (r) r.focus({ preventScroll: true }); });
    document.addEventListener('keydown', trapFocus);
    window.addEventListener('pagehide', unsubscribeRealtime);
  }

  async function openAttachment(path) {
    if (!path) return;
    const win = window.open('about:blank', '_blank');
    if (win) win.opener = null;
    try {
      const { data, error } = await supabaseClient.storage.from(BUCKET).createSignedUrl(path, 60);   // link temporário (bucket privado)
      if (error || !data || !data.signedUrl) throw error || new Error('sem link');
      if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
    } catch (e) {
      if (win) win.close();
      console.error('Erro ao abrir anexo:', e);
      toast('Não foi possível abrir o anexo agora.');
    }
  }

  /* ─── Inicialização ────────────────────────────────────────────── */
  function watchAuth() {
    try {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        const nextId = session && session.user ? session.user.id : null;
        if (event === 'SIGNED_OUT' && user) { setTimeout(() => { user = null; unsubscribeRealtime(); items = []; applyAuthUi(); setHistoryView('login'); }, 0); }
        else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && nextId && (!user || user.id !== nextId)) { setTimeout(retryInit, 0); }
      });
    } catch (e) { /* sem listener: a verificação no envio continua valendo */ }
  }

  async function retryInit() {
    setHistoryView('loading');
    try { user = await resolveUser(); }
    catch (e) { console.error('Falha ao verificar a sessão:', e); setHistoryView('error'); return; }
    applyAuthUi();
    if (!user) { setHistoryView('login'); return; }
    await loadHistory({ reset: true });
    subscribeRealtime();
  }

  async function init() {
    bindEvents();
    restoreDraft();
    updateCounters();
    setHistoryView('loading');
    try { await waitForSupabase(); }
    catch (e) { console.error(e); setHistoryView('error'); return; }
    await retryInit();
    watchAuth();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();