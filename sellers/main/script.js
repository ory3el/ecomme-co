/* ── THEME ───────────────────────────────────────────────────────── */
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function effectiveTheme(pref) {
  return pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}
function updateThemeSwitchUI(pref) {
  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    var isActive = btn.dataset.themeChoice === pref;
    btn.setAttribute('aria-checked', String(isActive));
  });
}

function applyTheme(pref, opts) {
  opts = opts || {};
  try { localStorage.setItem('ecomme-theme', pref); } catch (e) {}
  var root = document.documentElement;
  if (!opts.silent) root.classList.add('theme-transition');
  root.setAttribute('data-theme', effectiveTheme(pref));
  root.setAttribute('data-theme-pref', pref);
  updateThemeSwitchUI(pref);
  if (!opts.silent) {
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 420);
  }
}

function initTheme() {
  var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
  updateThemeSwitchUI(pref);

  // Live-follow the OS theme while the user's preference is "auto"
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var currentPref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      if (currentPref === 'auto') applyTheme('auto', { silent: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeChoice);
    });
  });
}

/* SCROLLBAR */
function createCustomScrollbar(scrollElement, isMainBody = false) {
  const scrollTrack = document.createElement('div');
  scrollTrack.className = 'scrollbar-track';
  
  const scrollbar = document.createElement('div');
  scrollbar.className = 'custom-scrollbar hide-scrollbar';
  scrollTrack.appendChild(scrollbar);
  const container = isMainBody ? document.body : scrollElement;
  container.appendChild(scrollTrack);

  if (!isMainBody) {
    scrollTrack.style.position = 'absolute';
    scrollbar.style.position = 'absolute';
  }

  let scrollTimeout;
  let isDragging = false;
  let isHovering = false;
  let startY;
  let startScrollTop;

  scrollTrack.addEventListener('mouseenter', () => {
    isHovering = true;
    scrollbar.classList.remove('hide-scrollbar');
    clearTimeout(scrollTimeout);
  });

  scrollTrack.addEventListener('mouseleave', () => {
    isHovering = false;
    if (!isDragging) {
      scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
    }
  });
  
  const eventTarget = isMainBody ? window : scrollElement;
  
  eventTarget.addEventListener('scroll', () => {
    const scrollHeight = isMainBody ? document.documentElement.scrollHeight : scrollElement.scrollHeight;
    const clientHeight = isMainBody ? window.innerHeight : scrollElement.clientHeight;
    const scrollTop = isMainBody ? window.scrollY : scrollElement.scrollTop;
    
    const scrollableHeight = scrollHeight - clientHeight;
    if (scrollableHeight <= 0) return;

    const scrollPercentage = scrollTop / scrollableHeight;
    const maxScrollbarTravel = clientHeight - scrollbar.offsetHeight;

    if (!isMainBody) {
      scrollTrack.style.top = `${scrollTop}px`;
    }
    
    scrollbar.style.top = `${scrollPercentage * maxScrollbarTravel}px`;

    scrollbar.classList.remove('hide-scrollbar');
    clearTimeout(scrollTimeout);

    if (!isHovering && !isDragging) {
      scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
    }
  });

  scrollbar.addEventListener('mousedown', (e) => {
    isDragging = true;
    scrollbar.classList.add('is-dragging');
    startY = e.clientY;
    startScrollTop = isMainBody ? window.scrollY : scrollElement.scrollTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - startY;
    const clientHeight = isMainBody ? window.innerHeight : scrollElement.clientHeight;
    const maxScrollbarTravel = clientHeight - scrollbar.offsetHeight;
    const movePercentage = deltaY / maxScrollbarTravel;
    
    const scrollHeight = isMainBody ? document.documentElement.scrollHeight : scrollElement.scrollHeight;
    const scrollableHeight = scrollHeight - clientHeight;
    const scrollAmount = movePercentage * scrollableHeight;

    if (isMainBody) {
      window.scrollTo(0, startScrollTop + scrollAmount);
    } else {
      scrollElement.scrollTop = startScrollTop + scrollAmount;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      scrollbar.classList.remove('is-dragging');
      document.body.style.userSelect = '';
      clearTimeout(scrollTimeout);
      
      if (!isHovering) {
        scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
      }
    }
  });
}

const mainElement = document.querySelector('.app-main');
if (mainElement) {
  mainElement.style.position = 'relative'; 
  createCustomScrollbar(mainElement, false);
}

const sidebarElement = document.querySelector('.app-sb');
if (sidebarElement) {
  sidebarElement.style.position = 'relative';
  createCustomScrollbar(sidebarElement, false);
}

/* --------------------------------------------------------- */

function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
}

function buttonLink(url) {
  window.location.href = url;
}

// const $ = id => document.getElementById(id);

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (!favicon) return;
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);


// ══ ESTADO COMPARTILHADO ═══════════════════════════════════
// Antes: myStoreId/editingProductId eram `let` presos dentro de um DOMContentLoaded e as demais funções
// só funcionavam porque a atribuição criava globais implícitas. Agora vivem num único escopo declarado.
// (userId e supabaseClient são declarados no <script> inline do index.html.)
let myStoreId = null;          // id da loja do usuário, no tipo original do banco (nunca convertido)
let myStoreData = null;        // última linha de `lojas` confirmada pelo banco
let editingProductId = null;
let appReady = false;          // só vira true depois de sessão + loja validadas
let storeChannel = null;       // canal Realtime único (evita assinaturas duplicadas)

let PRODS = [];
let ORDERS = [];
let LEDGER = [];
let PAYOUTS = [];
let PAYOUT_ACCOUNT = null;
let BALANCE = null;
let ordersModule = 'unknown';  // 'ok' | 'missing' (migração não executada) | 'error'
let financeModule = 'unknown';
const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ══ HELPERS ════════════════════════════════════════════════
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtBRL = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const onlyDigits = v => String(v ?? '').replace(/\D/g, '');
const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

function isNetworkError(err) {
  if (!err) return false;
  const m = String(err.message || err).toLowerCase();
  return err.name === 'AuthRetryableFetchError' || err.name === 'TypeError' || /failed to fetch|network|load failed|timeout/.test(m);
}
// 42P01 / PGRST205 = tabela inexistente; PGRST202 / 42883 = função inexistente → migração SQL ainda não executada
function isMissingRelation(err) {
  if (!err) return false;
  return ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(err.code) || /does not exist|could not find the (table|function)/i.test(err.message || '');
}
function hideLoading() {
  if (typeof hideLoadingModal === 'function') requestAnimationFrame(() => setTimeout(() => hideLoadingModal(), 180));
}

// Validadores (mesma lógica do cadastro)
function isValidCPF(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += +d[i] * (t + 1 - i);
    if (((sum * 10) % 11) % 10 !== +d[t]) return false;
  }
  return true;
}
function isValidCNPJ(d) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const calc = len => {
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += +d[i] * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function isValidPhoneBR(d) {
  if (d.length < 10 || d.length > 11) return false;
  const ddd = +d.slice(0, 2);
  return ddd >= 11 && ddd <= 99 && (d.length === 10 || d[2] === '9');
}
function parseBRL(str) {
  const n = parseFloat(String(str || '').replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// ══ STATUS DA LOJA → AÇÕES PERMITIDAS ══════════════════════
// Regra adotada (ajuste se sua política for outra):
//   ativa     → tudo liberado
//   pendente  → pode configurar a loja e preparar produtos; NÃO pode solicitar saque
//   suspensa  → somente leitura (nenhuma gravação)
const ACTIVE_STATUS = ['ativa', 'active'];
const SUSPENDED_STATUS = ['suspensa', 'suspenso', 'suspended', 'bloqueada', 'bloqueado', 'blocked', 'rejeitada', 'rejected'];
function storePhase(status) {
  const s = String(status || 'pendente').toLowerCase().trim();
  if (ACTIVE_STATUS.includes(s)) return 'active';
  if (SUSPENDED_STATUS.includes(s)) return 'suspended';
  return 'pending';
}
function storeCan(action) {
  const phase = storePhase(myStoreData && myStoreData.status);
  if (phase === 'suspended') return false;
  if (action === 'payout' || action === 'orders') return phase === 'active';
  return true;
}
function denyAction(action) {
  const phase = storePhase(myStoreData && myStoreData.status);
  const msg = phase === 'suspended'
    ? 'Sua loja está suspensa. Enquanto durar a suspensão, não é possível alterar dados. Fale com o suporte.'
    : (action === 'payout' ? 'Saques só ficam disponíveis depois que sua loja for aprovada.' : 'Esta ação só fica disponível depois que sua loja for aprovada.');
  toast(msg, 'err');
  return false;
}

// ══ PORTÃO DE ACESSO ═══════════════════════════════════════
const GATE_PANES = { checking: 'gateChecking', login: 'gateLogin', noStore: 'gateNoStore', error: 'gateError' };
function showGate(which) {
  const gate = $('authGate'), shell = $('appShell');
  Object.values(GATE_PANES).forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  if (which === 'app') {
    gate.classList.add('hidden');
    shell.removeAttribute('inert');
    shell.style.visibility = '';
    shell.style.display = 'flex';
    shell.style.flexDirection = 'column';
    hideLoading();
    return;
  }
  const pane = $(GATE_PANES[which]);
  if (pane) pane.style.display = which === 'checking' ? 'flex' : 'block';
  gate.style.display = 'flex';
  gate.classList.remove('hidden');
  shell.setAttribute('inert', '');
  shell.style.visibility = 'hidden';
  if (which !== 'checking') hideLoading();
}

async function initDashboard() {
  initTheme();
  initThemeToggle();
  setText('dashDate', new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }));
  showGate('checking');
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError && isNetworkError(userError)) { showGate('error'); return; }
    if (!user || userError) { console.warn('User session not active.'); showGate('login'); return; }
    userId = user.id;

    // Uma única consulta decide: loja existe? (falha de rede NUNCA é tratada como "sem loja")
    const store = await fetchInitialStoreStatus();
    if (store && store.failed) { showGate('error'); return; }
    if (!store) { console.warn('Usuário autenticado, mas não possui loja.'); showGate('noStore'); return; }

    appReady = true;
    showGate('app');
    initNavigation();
    const target = pageFromHash() || localStorage.getItem('activePage') || 'dashboard';
    navigate(PAGE_LABELS[target] ? target : 'dashboard');

    subscribeToStoreStatus();
    await loadProfile(user);
    await loadMyProducts();
    await Promise.all([loadOrders(), loadFinance()]);
    refreshDashboardViews();
  } catch (err) {
    console.error('Falha ao iniciar o painel:', err);
    showGate('error');
  }
}
window.addEventListener('DOMContentLoaded', initDashboard);

// ══ PERFIL (mesma consulta de antes; sem os resquícios do formulário de cadastro) ═══
async function loadProfile(user) {
  try {
    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!profile) return;
    const fullName = profile.full_name || 'Cliente';
    const email = user.email || '';
    setText('accSidebarName', fullName);
    setText('accSidebarEmail', email);
    if (profile.avatar_url && $('accSidebarAvatar')) $('accSidebarAvatar').src = profile.avatar_url;

    const parts = fullName.trim().split(' ');
    if ($('profileFirstName')) $('profileFirstName').value = parts[0] || '';
    if ($('profileLastName')) $('profileLastName').value = parts.slice(1).join(' ') || '';
    if ($('profileEmail')) $('profileEmail').value = email;
    if ($('sb-name') && fullName) $('sb-name').textContent = fullName;

    if (profile.avatar_url) {
      ['profileAvatar', 'headerAvatar'].forEach(id => {
        const img = $(id);
        if (!img) return;
        img.src = profile.avatar_url;
        Object.assign(img.style, { filter: 'none', width: '100%', height: '100%', borderRadius: '100%', objectFit: 'cover' });
      });
    }
  } catch (err) {
    console.warn('Perfil não carregado:', err);
    toast('Não foi possível carregar seu perfil agora.', 'err');
  }
}

// ══ PRODUTOS: carregamento ═════════════════════════════════
async function loadMyProducts() {
  if (myStoreId === null || myStoreId === undefined) return;
  const { data, error } = await supabaseClient
    .from('products').select('*').eq('loja_id', myStoreId).order('id', { ascending: false });
  if (error) {
    console.error('Erro ao carregar produtos:', error);
    toast(isNetworkError(error) ? 'Sem conexão: não foi possível carregar seus produtos.' : 'Não foi possível carregar seus produtos.', 'err');
    return;
  }
  PRODS = data || [];
  buildProdTable();
  const bdg = $('sbProdBdg');
  if (bdg) { bdg.textContent = PRODS.length; bdg.style.display = PRODS.length > 0 ? 'inline-block' : 'none'; }
  buildTopProducts();
}
// ══ NAVEGAÇÃO ══════════════════════════════════════════════
let hasUnsavedChanges = false;
let dirtySource = null;        // 'config' | 'product' — define o que é descartado
let pendingPage = null;
let navBound = false;

const PAGE_LABELS = { dashboard:'Dashboard', 'novo-produto':'Novo Produto', produtos:'Meus Produtos', pedidos:'Pedidos', financas:'Financeiro', config:'Configurações', loja:'Minha Loja' };
const HASH_PAGES = { painel:'dashboard', dashboard:'dashboard', produtos:'produtos', 'produtos/novo':'novo-produto', 'novo-produto':'novo-produto', pedidos:'pedidos', financas:'financas', saque:'financas', configuracoes:'config', config:'config', loja:'loja' };

// Antes: '#painel'.replace('/seller/main','') nunca casava com o mapa (a chave não tem '#').
function pageFromHash() {
  const h = decodeURIComponent(location.hash || '').replace(/^#\/?/, '').replace(/^sellers?\/main\/?/, '').replace(/\/$/, '');
  return HASH_PAGES[h] || null;
}

// Retorna true se a navegação aconteceu. Nunca depende de `event` global.
function navigate(page, btn, opts) {
  opts = opts || {};
  if (!appReady) return false;                          // nada é ativado antes de sessão + loja validadas
  const panel = $('page-' + page);
  if (!panel) return false;
  if (hasUnsavedChanges && !opts.force) {
    pendingPage = page;
    showConfirm('Você tem alterações não salvas. <br>Deseja sair sem salvar?', 'Atenção', '⚠️');
    return false;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('on'));
  panel.classList.add('on');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('on'));
  setText('bcText', PAGE_LABELS[page] || page);
  try { localStorage.setItem('activePage', page); } catch (e) {}
  const mainEl = document.querySelector('.app-main');
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
}

// Um único listener por botão (antes havia dois: um navegava, o outro tentava bloquear).
function initNavigation() {
  if (navBound) return;
  navBound = true;
  initProductsTable();   // ligação dos cliques da tabela de produtos (Editar/Duplicar/Pausar/Exportar/Excluir)
  initOrdersWrap();      // ligação dos cliques dos cards de pedidos (Detalhes/Despachar/Aprovar devolução)
  document.querySelectorAll('.nav-btn[data-page], .mob-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      const page = btn.dataset.page;
      if (navigate(page) && page === 'novo-produto') clearProductForm();
    });
  });
  window.addEventListener('hashchange', () => { const p = pageFromHash(); if (p) navigate(p); });

  // Só campos do formulário de produto e das configurações contam como "alterações" (busca/filtros não).
  [['#page-config', 'config'], ['#page-novo-produto', 'product']].forEach(([sel, source]) => {
    document.querySelectorAll(`${sel} .inp, ${sel} .ta, ${sel} .sel, ${sel} input[type="checkbox"]`).forEach(el => {
      const mark = () => { if (appReady) { hasUnsavedChanges = true; dirtySource = source; } };
      el.addEventListener('input', mark);
      el.addEventListener('change', mark);
    });
  });
}

// "Sair sem salvar": descarta de verdade o que estava em edição e só então navega.
function discardUnsaved() {
  const src = dirtySource;
  hasUnsavedChanges = false;
  dirtySource = null;
  if (src === 'config' && myStoreData) renderStoreState(myStoreData.status, myStoreData.slug_url, myStoreData);
  if (src === 'product') clearProductForm();
}
function confirmUnsave() {
  const modal = $('confirmModal');
  if (modal) modal.classList.remove('active');
  if (typeof confirmTimerId !== 'undefined' && confirmTimerId) clearInterval(confirmTimerId);
  discardUnsaved();
  const dest = pendingPage;
  pendingPage = null;
  if (dest) navigate(dest, null, { force: true });
}

window.addEventListener('beforeunload', event => {
  if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; }
});
// ══ CSV (exportações reais; células que começam com = + - @ são neutralizadas) ═══
function downloadCsv(filename, rows) {
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '\uFEFF' + rows.map(r => r.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ══ PRODUTOS: lista, filtros, ações ════════════════════════
let prodFilter = 'all', prodQuery = '', prodCat = '', prodPageNum = 1;
const PROD_PAGE_SIZE = 20;
let soldByProduct = {};                       // preenchido a partir dos itens de pedidos reais

const findProd = id => PRODS.find(p => String(p.id) === String(id));   // ids comparados como texto
const prodIsPaused = p => p.badge === 'paused';
const prodStock = p => Number(p.stock) || 0;
const prodCategory = p => Array.isArray(p.cat) ? (p.cat[0] || '') : (p.cat || '');

function getFilteredProds() {
  const q = prodQuery.trim().toLowerCase();
  return PRODS.filter(p => {
    if (prodFilter === 'active' && prodIsPaused(p)) return false;
    if (prodFilter === 'paused' && !prodIsPaused(p)) return false;
    if (prodFilter === 'low' && prodStock(p) >= 5) return false;
    if (prodCat && prodCategory(p) !== prodCat) return false;
    if (q && !(String(p.name || '').toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q))) return false;
    return true;
  });
}

function updateProdCounts() {
  const counts = {
    all: PRODS.length,
    active: PRODS.filter(p => !prodIsPaused(p)).length,
    paused: PRODS.filter(prodIsPaused).length,
    low: PRODS.filter(p => prodStock(p) < 5).length
  };
  document.querySelectorAll('#page-produtos .stab[data-filter]').forEach(tab => {
    tab.textContent = `${tab.dataset.label} (${counts[tab.dataset.filter] ?? 0})`;
  });
  const sel = $('prodCatFilter');
  if (sel) {
    const cats = [...new Set(PRODS.map(prodCategory).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    sel.value = cats.includes(prodCat) ? prodCat : '';
  }
}

function buildProdTable(filter) {
  if (filter !== undefined) { prodFilter = filter; prodPageNum = 1; }
  const body = $('prodTbody');
  if (!body) return;
  updateProdCounts();

  const all = getFilteredProds();
  const pages = Math.max(1, Math.ceil(all.length / PROD_PAGE_SIZE));
  if (prodPageNum > pages) prodPageNum = pages;
  const slice = all.slice((prodPageNum - 1) * PROD_PAGE_SIZE, prodPageNum * PROD_PAGE_SIZE);

  if (!slice.length) {
    body.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:36px;color:var(--muted)">${PRODS.length ? 'Nenhum produto encontrado com esses filtros.' : 'Você ainda não cadastrou produtos. Clique em “+ Novo Produto” para começar.'}</td></tr>`;
  } else {
    body.innerHTML = slice.map(p => {
      const stock = prodStock(p);
      const stClass = stock < 5 ? 'stock-low' : stock < 15 ? 'stock-med' : 'stock-ok';
      const stTag = !prodIsPaused(p) ? '<span class="tag tag-green">● Ativo</span>' : '<span class="tag tag-gray">⏸ Pausado</span>';
      const sold = soldByProduct[String(p.id)];
      const soldTxt = (ordersModule === 'ok') ? `${sold || 0} vendas` : '—';
      const media = p.image_url
        ? `<img src="${escapeHtml(p.image_url)}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; border-radius:inherit;" alt="${escapeHtml(p.name)}">`
        : '';
      const id = escapeHtml(p.id);
      return `<tr>
      <td class="chk-col"><input type="checkbox" class="chk"></td>
      <td><div class="fac gap10">
        <div class="prod-thumb" style="position: relative;">${escapeHtml(p.emoji || '📦')}${media}</div>
        <div><div class="fs12 fw6">${escapeHtml(p.name)}</div><div class="fs10 muted">ID: ${id}</div></div>
      </div></td>
      <td class="fs11 muted">${escapeHtml(p.sku || '—')}</td>
      <td><span class="tag tag-blue fs10">${escapeHtml(prodCategory(p) || 'Sem categoria')}</span></td>
      <td class="sora fw7 blue fs13">${fmtBRL(p.price)}</td>
      <td><span class="stock-val ${stClass}">${stock} un.</span></td>
      <td class="fs11 muted">${soldTxt}</td>
      <td>${stTag}</td>
      <td><div class="fac gap4">
        <button class="btn btn-ghost btn-xs" style="border-radius:var(--r); display:flex; align-items:center; gap:4px;" data-act="edit" data-id="${id}"><i class="fa-solid fa-pen"></i> Editar</button>
        <div class="action-dots" onclick="toggleMenu(event, this)">⋯
          <div class="action-menu">
            <div class="am-item" data-act="dup" data-id="${id}">📋 Duplicar</div>
            <div class="am-item" data-act="pause" data-id="${id}">${prodIsPaused(p) ? '▶ Reativar' : '⏸ Pausar'}</div>
            <div class="am-item" data-act="export" data-id="${id}">📤 Exportar (CSV)</div>
            <div class="am-item red" data-act="del" data-id="${id}">🗑 Excluir</div>
          </div>
        </div>
      </div></td>
    </tr>`;
    }).join('');
  }
  setText('prodCount', `Mostrando ${slice.length} de ${all.length} produtos`);
  const prev = $('prodPrev'), next = $('prodNext');
  if (prev) prev.disabled = prodPageNum <= 1;
  if (next) next.disabled = prodPageNum >= pages;
}

function initProductsTable() {
  const tb = $('prodTbody');
  if (!tb || tb.dataset.bound) return;
  tb.dataset.bound = '1';
  tb.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    document.querySelectorAll('.action-menu.on').forEach(m => m.classList.remove('on'));
    const id = el.dataset.id;
    ({ edit: editProduct, dup: duplicateProduct, pause: toggleProductPause, del: deleteProduct,
       export: pid => { const p = findProd(pid); if (p) exportProductsCsv([p]); } })[el.dataset.act](id);
  });
}

function toggleAll(cb) { document.querySelectorAll('#prodTbody .chk').forEach(c => c.checked = cb.checked); }
function filterProds(btn, f) {
  document.querySelectorAll('#page-produtos .stab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  buildProdTable(f);
}
function onProdSearch(el) { prodQuery = el.value; prodPageNum = 1; buildProdTable(); }
function onProdCatChange(el) { prodCat = el.value; prodPageNum = 1; buildProdTable(); }
function prodPage(delta) { prodPageNum = Math.max(1, prodPageNum + delta); buildProdTable(); }

function toggleMenu(e, el) {
  // Clique num ITEM do menu: não interrompe a propagação, para a delegação da tabela (data-act) tratar a ação.
  if (e.target.closest('.action-menu')) return;
  e.stopPropagation();
  const m = el.querySelector('.action-menu');
  document.querySelectorAll('.action-menu.on').forEach(x => { if (x !== m) x.classList.remove('on'); });
  m.classList.toggle('on');
}
document.addEventListener('click', () => document.querySelectorAll('.action-menu.on').forEach(m => m.classList.remove('on')));

function exportProductsCsv(list) {
  const rows = [['ID', 'Nome', 'Categoria', 'Preço', 'Estoque', 'Status']];
  (list || PRODS).forEach(p => rows.push([p.id, p.name, prodCategory(p), Number(p.price || 0).toFixed(2).replace('.', ','), prodStock(p), prodIsPaused(p) ? 'Pausado' : 'Ativo']));
  downloadCsv('produtos.csv', rows);
}

async function toggleProductPause(id) {
  const p = findProd(id);
  if (!p) return;
  if (!storeCan('products')) return denyAction('products');
  const next = prodIsPaused(p) ? 'new' : 'paused';        // 'new' é o valor que o próprio painel grava ao publicar
  const { data, error } = await supabaseClient.from('products').update({ badge: next })
    .eq('id', p.id).eq('loja_id', myStoreId).select('id');
  if (error || !data || !data.length) {
    console.error('Erro ao alterar status do produto:', error);
    toast(error ? 'Não foi possível alterar o status do produto.' : 'Nenhuma alteração foi feita (sem permissão ou produto removido).', 'err');
    return;
  }
  await loadMyProducts();
  toast(next === 'paused' ? 'Produto pausado.' : 'Produto reativado.', 'ok');
}

async function duplicateProduct(id) {
  const p = findProd(id);
  if (!p) return;
  if (!storeCan('products')) return denyAction('products');
  toast('Duplicando produto...', 'info');
  try {
    const copy = {
      id: await getUniqueProductId(), loja_id: myStoreId,
      name: String(p.name || '').slice(0, 110) + ' (cópia)',
      cat: p.cat, price: p.price, desc: p.desc, shipping: p.shipping,
      image_url: p.image_url, gallery_urls: p.gallery_urls,          // imagens compartilhadas: a exclusão confere referências
      badge: 'paused', rating: 0, reviews: 0, features: p.features || []
    };
    if ('stock' in p) copy.stock = p.stock;
    const { data, error } = await supabaseClient.from('products').insert([copy]).select('id');
    if (error) throw error;
    if (!data || !data.length) throw new Error('O banco não confirmou a criação da cópia.');
    await loadMyProducts();
    toast('Cópia criada como pausada. Revise e reative quando quiser.', 'ok');
  } catch (err) {
    console.error('Erro ao duplicar produto:', err);
    toast('Não foi possível duplicar o produto.', 'err');
  }
}

function editProduct(id) {
  const p = findProd(id);
  if (!p) return;
  if (!storeCan('products')) return denyAction('products');
  if (hasUnsavedChanges) { toast('Salve ou descarte as alterações pendentes antes de editar outro produto.', 'err'); return; }
  clearProductForm();                                     // zera imagens/estado antes de carregar o produto
  editingProductId = p.id;

  if ($('npName')) $('npName').value = p.name || '';
  if ($('npDesc')) $('npDesc').value = p.desc || '';
  if ($('npPrice')) $('npPrice').value = fmtBRL(p.price);
  if ($('npStock')) $('npStock').value = ('stock' in p) ? prodStock(p) : '';
  if ($('freeShip')) $('freeShip').checked = !!p.shipping;
  if ($('npCat')) {
    const catSelect = $('npCat');
    const catValue = prodCategory(p);
    for (let i = 0; i < catSelect.options.length; i++) {
      if (catValue && catSelect.options[i].text.includes(catValue)) { catSelect.selectedIndex = i; break; }
    }
  }
  const gallery = Array.isArray(p.gallery_urls) ? p.gallery_urls : [];
  productExistingUrls = [p.image_url || null, gallery[1] || null, gallery[2] || null, gallery[3] || null, gallery[4] || null];

  document.querySelectorAll('button[onclick="publishProduct()"]').forEach(btn => {
    btn.innerHTML = btn.innerHTML.replace('Publicar Produto', 'Salvar Produto').replace('🚀', '💾');
  });
  setText('labelNewProduct', `Editar Produto | ${p.name}`);

  updatePreview();
  updateGalleryUI();
  hasUnsavedChanges = false;
  dirtySource = null;
  navigate('novo-produto');
  toast('Modo edição ativado', 'info');
}

// ── Imagens do bucket "products": só apaga o que ninguém mais referencia ──
const PRODUCTS_BUCKET = 'products';
function storagePathFromUrl(url) {
  const marker = `/storage/v1/object/public/${PRODUCTS_BUCKET}/`;
  const s = String(url || '');
  const i = s.indexOf(marker);
  if (i === -1) return null;
  try { return decodeURIComponent(s.slice(i + marker.length).split('?')[0]); } catch (e) { return null; }
}
async function isImageReferencedElsewhere(url, excludeProductId) {
  const a = await supabaseClient.from('products').select('id').eq('image_url', url).neq('id', excludeProductId).limit(1);
  if (a.error || (a.data && a.data.length)) return true;               // na dúvida, NÃO apaga
  const b = await supabaseClient.from('products').select('id').contains('gallery_urls', [url]).neq('id', excludeProductId).limit(1);
  if (b.error || (b.data && b.data.length)) return true;
  return false;
}
async function removeUnreferencedImages(urls, excludeProductId) {
  const paths = [];
  for (const u of new Set((urls || []).filter(Boolean))) {
    const path = storagePathFromUrl(u);
    if (!path) continue;
    if (await isImageReferencedElsewhere(u, excludeProductId)) continue;
    paths.push(path);
  }
  if (!paths.length) return;
  const { error } = await supabaseClient.storage.from(PRODUCTS_BUCKET).remove(paths);
  if (error) console.warn('Não foi possível remover imagens antigas do Storage:', error);
}

async function deleteProduct(id) {
  const p = findProd(id);
  if (!p) return;
  if (!storeCan('products')) return denyAction('products');
  if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o produto "${p.name}"?\nEssa ação não pode ser desfeita.`)) return;
  toast('Excluindo produto...', 'info');
  const urls = [p.image_url, ...(Array.isArray(p.gallery_urls) ? p.gallery_urls : [])];

  // 1º o banco (com confirmação de linha apagada); só depois o Storage
  const { data, error } = await supabaseClient.from('products').delete()
    .eq('id', p.id).eq('loja_id', myStoreId).select('id');
  if (error) {
    console.error('Erro ao excluir produto:', error);
    toast('Não foi possível excluir o produto. Tente novamente.', 'err');
    return;
  }
  if (!data || !data.length) {
    toast('Nenhum produto foi excluído (sem permissão ou já removido).', 'err');
    await loadMyProducts();
    return;
  }
  await removeUnreferencedImages(urls, p.id);
  await loadMyProducts();
  toast('Produto excluído permanentemente! 🗑️', 'ok');
}

// ══ PEDIDOS (public.store_orders — ver migração SQL) ═══════
let ordFilter = 'all';
const ORD_STATUS = { pending:'⏳ Aguardando Despacho', transit:'🚚 Em Trânsito', delivered:'✅ Entregue', returned:'↩ Devolução Solicitada', cancelled:'✖ Cancelado' };
const ORD_TAG = { pending:'tag-orange', transit:'tag-blue', delivered:'tag-green', returned:'tag-yellow', cancelled:'tag-gray' };

function friendlyRpcError(err) {
  if (isMissingRelation(err)) return 'Este recurso ainda não está configurado no banco de dados (migração SQL pendente).';
  if (isNetworkError(err)) return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  if (['P0002', '22023', '42501'].includes(err && err.code) && err.message) return err.message;
  return 'Não foi possível concluir a operação. Tente novamente em instantes.';
}

async function loadOrders() {
  const { data, error } = await supabaseClient
    .from('store_orders')
    .select('id, code, status, customer_name, ship_city, ship_state, total, tracking_code, created_at, return_requested_at, return_approved_at, store_order_items(product_id, name, variant, qty, unit_price)')
    .eq('loja_id', myStoreId)
    .neq('status', 'awaiting_payment')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    ORDERS = [];
    if (isMissingRelation(error)) ordersModule = 'missing';
    else { ordersModule = 'error'; console.error('Erro ao carregar pedidos:', error); toast('Não foi possível carregar seus pedidos agora.', 'err'); }
  } else {
    ordersModule = 'ok';
    ORDERS = data || [];
  }
  soldByProduct = {};
  ORDERS.filter(o => ['pending', 'transit', 'delivered'].includes(o.status)).forEach(o =>
    (o.store_order_items || []).forEach(it => { const k = String(it.product_id); soldByProduct[k] = (soldByProduct[k] || 0) + (it.qty || 0); }));
  buildOrders();
  updateOrderCounts();
  buildProdTable();
}

function updateOrderCounts() {
  const count = s => ORDERS.filter(o => o.status === s).length;
  const counts = { all: ORDERS.length, pending: count('pending'), transit: count('transit'), delivered: count('delivered'), returned: count('returned') };
  document.querySelectorAll('#page-pedidos .stab[data-filter]').forEach(tab => {
    tab.textContent = `${tab.dataset.label} (${counts[tab.dataset.filter] ?? 0})`;
  });
  setText('ordersSub', `${counts.pending} pedidos aguardando despacho`);
  const bdg = $('sbOrdBdg');
  if (bdg) { bdg.textContent = counts.pending; bdg.style.display = counts.pending > 0 ? 'inline-block' : 'none'; }
}

function buildOrders(filter) {
  if (filter !== undefined) ordFilter = filter;
  const wrap = $('ordersWrap');
  if (!wrap) return;
  if (ordersModule === 'missing') {
    wrap.innerHTML = '<div class="card card-pad" style="text-align:center;color:var(--muted)">O módulo de pedidos ainda não está configurado no banco de dados. Execute a migração SQL (seção 6) para ativá-lo.</div>';
    return;
  }
  if (ordersModule === 'error') {
    wrap.innerHTML = '<div class="card card-pad" style="text-align:center;color:var(--muted)">Não foi possível carregar os pedidos. Recarregue a página para tentar novamente.</div>';
    return;
  }
  const data = ordFilter === 'all' ? ORDERS : ORDERS.filter(o => o.status === ordFilter);
  if (!data.length) {
    wrap.innerHTML = `<div class="card card-pad" style="text-align:center;color:var(--muted)">${ORDERS.length ? 'Nenhum pedido neste filtro.' : 'Você ainda não recebeu pedidos.'}</div>`;
    return;
  }
  wrap.innerHTML = data.map(o => {
    const id = escapeHtml(o.id);
    const items = (o.store_order_items || []).map(it => `
            <div class="fac gap10">
              <div class="ord-em">📦</div>
              <div class="ord-info">
                <div class="ord-item-name">${escapeHtml(it.name)}</div>
                <div class="ord-item-var">${it.variant ? escapeHtml(it.variant) + ' · ' : ''}Qtd: ${Number(it.qty) || 0} · ${fmtBRL(it.unit_price)}</div>
              </div>
            </div>`).join('');
    const place = [o.ship_city, o.ship_state].filter(Boolean).join(' / ');
    return `
    <div class="ord">
      <div class="ord-hd">
        <div class="fac gap12">
          <span class="ord-id">#${escapeHtml(o.code)}</span><span class="muted fs11">·</span>
          <span class="fs11 muted">${fmtDateTime(o.created_at)}</span>
          ${place ? `<span class="fs11 muted">·</span><span class="fs11 muted">📍 ${escapeHtml(place)}</span>` : ''}
        </div>
        <span class="tag ${ORD_TAG[o.status] || 'tag-gray'}">${ORD_STATUS[o.status] || escapeHtml(o.status)}</span>
      </div>
      <div class="ord-body">
        <div class="ord-items">${items}</div>
        <div style="text-align:right;flex-shrink:0">
          <div class="fs11 muted mb4">👤 ${escapeHtml(o.customer_name || 'Cliente')}</div>
          <div class="ord-total">${fmtBRL(o.total)}</div>
        </div>
      </div>
      <div class="ord-ft">
        <div class="fac gap8">
          <button class="btn btn-ghost btn-xs" style="border-radius:var(--r)" data-ord-act="details" data-id="${id}">👁 Detalhes</button>
        </div>
        <div class="ord-actions">
          ${o.status === 'pending' ? `
            <input class="tracking-inp" placeholder="Cód. rastreamento (ex: BR123456789BR)" id="track-${id}" maxlength="40">
            <button class="btn btn-p btn-xs" data-ord-act="dispatch" data-id="${id}">🚚 Marcar como Despachado</button>` : ''}
          ${o.status === 'transit' ? `<span class="tag tag-blue">Rastreio: ${escapeHtml(o.tracking_code || '—')}</span>` : ''}
          ${o.status === 'returned' && !o.return_approved_at ? `<button class="btn btn-danger btn-xs" data-ord-act="return" data-id="${id}">Aprovar Devolução</button>` : ''}
          ${o.status === 'returned' && o.return_approved_at ? '<span class="tag tag-gray">Devolução aprovada</span>' : ''}
        </div>
      </div>
      <div class="ord-details" id="ord-details-${id}" style="display:none;padding:12px 16px;border-top:1px solid var(--b2);font-size:12px;color:var(--muted)">
        Cliente: <strong>${escapeHtml(o.customer_name || '—')}</strong> · Entrega: ${escapeHtml(place || '—')}<br>
        Rastreio: ${escapeHtml(o.tracking_code || 'ainda não informado')}
      </div>
    </div>`;
  }).join('');
}

function initOrdersWrap() {
  const wrap = $('ordersWrap');
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = '1';
  wrap.addEventListener('click', ev => {
    const el = ev.target.closest('[data-ord-act]');
    if (!el) return;
    const id = el.dataset.id;
    if (el.dataset.ordAct === 'dispatch') dispatchOrder(id, el);
    else if (el.dataset.ordAct === 'return') approveReturn(id, el);
    else if (el.dataset.ordAct === 'details') { const d = $('ord-details-' + id); if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none'; }
  });
}

function filterOrds(btn) {
  document.querySelectorAll('.order-filter-tabs .stab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  buildOrders(btn.dataset.filter || 'all');
}

async function dispatchOrder(id, btn) {
  if (!storeCan('orders')) return denyAction('orders');
  const code = ($('track-' + id)?.value || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(code)) { toast('Informe um código de rastreamento válido (8 a 40 letras/números).', 'err'); return; }
  if (btn) btn.disabled = true;
  const { error } = await supabaseClient.rpc('seller_dispatch_order', { p_order_id: id, p_tracking: code });
  if (error) {
    console.error('Erro ao despachar pedido:', error);
    toast(friendlyRpcError(error), 'err');
    if (btn) btn.disabled = false;
    return;
  }
  await loadOrders();
  refreshDashboardViews();
  toast(`Pedido despachado! Código: ${code} 🚚`, 'ok');
}

async function approveReturn(id, btn) {
  if (!storeCan('orders')) return denyAction('orders');
  if (!confirm('Aprovar esta devolução? O estorno será lançado no seu extrato.')) return;
  if (btn) btn.disabled = true;
  const { error } = await supabaseClient.rpc('seller_approve_return', { p_order_id: id });
  if (error) {
    console.error('Erro ao aprovar devolução:', error);
    toast(friendlyRpcError(error), 'err');
    if (btn) btn.disabled = false;
    return;
  }
  await Promise.all([loadOrders(), loadFinance()]);
  refreshDashboardViews();
  toast('Devolução aprovada e estorno lançado.', 'ok');
}

function exportOrdersCsv() {
  if (ordersModule !== 'ok' || !ORDERS.length) { toast('Não há pedidos para exportar.', 'info'); return; }
  const rows = [['Pedido', 'Data', 'Cliente', 'Cidade/UF', 'Status', 'Total', 'Rastreio']];
  ORDERS.forEach(o => rows.push([o.code, new Date(o.created_at).toLocaleString('pt-BR'), o.customer_name || '', [o.ship_city, o.ship_state].filter(Boolean).join('/'),
    ORD_STATUS[o.status] || o.status, Number(o.total).toFixed(2).replace('.', ','), o.tracking_code || '']));
  downloadCsv('pedidos.csv', rows);
}

// ══ FINANCEIRO (seller_ledger / seller_payout_* / seller_balance) ═══
async function loadFinance() {
  const [bal, ledger, payouts, acct] = await Promise.all([
    supabaseClient.rpc('seller_balance'),
    supabaseClient.from('seller_ledger').select('id, order_id, kind, gross, commission, net, status, release_at, created_at, store_orders(code)')
      .eq('loja_id', myStoreId).order('created_at', { ascending: false }).limit(200),
    supabaseClient.from('seller_payout_requests').select('id, amount, method, status, created_at, processed_at')
      .eq('loja_id', myStoreId).order('created_at', { ascending: false }).limit(100),
    supabaseClient.from('seller_payout_accounts').select('*').eq('loja_id', myStoreId).maybeSingle()
  ]);
  const errs = [bal.error, ledger.error, payouts.error, acct.error].filter(Boolean);
  if (errs.length) {
    BALANCE = null; LEDGER = []; PAYOUTS = []; PAYOUT_ACCOUNT = null;
    if (errs.some(isMissingRelation)) financeModule = 'missing';
    else { financeModule = 'error'; console.error('Erro ao carregar financeiro:', errs); toast('Não foi possível carregar os dados financeiros agora.', 'err'); }
  } else {
    financeModule = 'ok';
    BALANCE = (bal.data && bal.data[0]) || { available_amount: 0, pending_amount: 0, paid_amount: 0, refunded_amount: 0, reserved_amount: 0 };
    LEDGER = ledger.data || [];
    PAYOUTS = payouts.data || [];
    PAYOUT_ACCOUNT = acct.data || null;
  }
  renderFinance();
  fillPayoutAccountForm();
}

function renderFinance() {
  const ok = financeModule === 'ok';
  const dash = '—';
  const b = BALANCE || {};
  setText('balAvail', ok ? fmtBRL(b.available_amount) : dash);
  setText('balPending', ok ? fmtBRL(b.pending_amount) : dash);
  setText('balAvailNote', ok ? `Atualizado em ${fmtDateTime(new Date())}` : (financeModule === 'missing' ? 'Módulo financeiro ainda não configurado no banco' : 'Dados indisponíveis'));
  setText('balPendingNote', ok ? 'Vendas aguardando liberação' : '');
  setText('finDate', fmtDateTime(new Date()));

  const now = new Date();
  const monthSales = LEDGER.filter(g => g.kind === 'sale' && new Date(g.created_at).getMonth() === now.getMonth() && new Date(g.created_at).getFullYear() === now.getFullYear());
  setText('balMonth', ok ? fmtBRL(monthSales.reduce((s, g) => s + Number(g.gross), 0)) : dash);
  setText('balMonthNote', ok ? `${months[now.getMonth()]} ${now.getFullYear()} · ${monthSales.length} venda(s)` : '');

  const sub = $('wcSub');
  if (sub) sub.textContent = ok
    ? `Disponível: ${fmtBRL(b.available_amount)}${Number(b.reserved_amount) > 0 ? ` · Em análise: ${fmtBRL(b.reserved_amount)}` : ''}`
    : 'Os dados de saldo não estão disponíveis no momento.';

  const dest = $('saqueDest');
  if (dest) {
    const a = PAYOUT_ACCOUNT;
    let label = null;
    if (a && (a.pix_key || '').trim()) label = 'PIX — ' + String(a.pix_key).replace(/.(?=.{4})/g, '•');
    else if (a && (a.agency || '').trim() && (a.account || '').trim()) label = `${a.bank || 'Banco'} — Ag ${a.agency} · Cc ••${String(a.account).slice(-3)}`;
    dest.innerHTML = `<option>${escapeHtml(label || 'Cadastre seus dados de recebimento (Configurações → Recebimentos)')}</option>`;
    dest.disabled = true;
  }
  const btn = document.querySelector('.btn-withdraw');
  if (btn) btn.disabled = !ok;
  buildExtract();
}

const EXTRACT_ICONS = { 'Venda': ['💰', '#dcfce7'], 'Devolução': ['↩', '#fee2e2'], 'Saque': ['💸', '#ffedd5'], 'Ajuste': ['⚙', '#e0e7ff'] };
function extractRows() {
  const rows = [];
  LEDGER.forEach(g => rows.push({ date: g.created_at, type: g.kind === 'sale' ? 'Venda' : g.kind === 'refund' ? 'Devolução' : 'Ajuste',
    order: (g.store_orders && g.store_orders.code) || '—', gross: Number(g.gross), comm: Number(g.commission), net: Number(g.net),
    status: g.status === 'available' ? 'available' : 'pending' }));
  PAYOUTS.forEach(p => rows.push({ date: p.created_at, type: 'Saque', order: '—', gross: -Number(p.amount), comm: 0, net: -Number(p.amount),
    status: p.status === 'paid' ? 'done' : p.status === 'rejected' ? 'rejected' : 'processing' }));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  const period = $('extractPeriod') ? $('extractPeriod').value : '30';
  const since = new Date();
  if (period === 'month') since.setDate(1); else since.setDate(since.getDate() - Number(period));
  since.setHours(0, 0, 0, 0);
  return rows.filter(r => new Date(r.date) >= since);
}

function buildExtract() {
  const body = $('extractBody');
  if (!body) return;
  if (financeModule !== 'ok') {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--muted)">${financeModule === 'missing' ? 'O módulo financeiro ainda não está configurado no banco de dados (migração SQL pendente).' : 'Não foi possível carregar o extrato.'}</td></tr>`;
    setText('extractCount', 'Mostrando 0 de 0 transações'); setText('extractTotal', '—');
    return;
  }
  const rows = extractRows();
  const tags = { available: '<span class="tag tag-green">Disponível</span>', pending: '<span class="tag tag-orange">Pendente</span>',
    done: '<span class="tag tag-gray">Concluído</span>', processing: '<span class="tag tag-blue">Em processamento</span>', rejected: '<span class="tag tag-gray">Recusado</span>' };
  body.innerHTML = rows.length ? rows.map(r => {
    const [ico, bg] = EXTRACT_ICONS[r.type] || ['•', '#eee'];
    const neg = r.net < 0;
    return `<tr>
      <td><div class="fac gap8"><div class="ext-row-icon" style="background:${bg}">${ico}</div><span class="fs12 fw6">${r.type}</span></div></td>
      <td class="fs11 muted">${r.type}</td>
      <td class="fs11">${escapeHtml(r.order)}</td>
      <td class="fs12 fw6">${fmtBRL(r.gross)}</td>
      <td class="fs11 red">${r.comm ? '-' + fmtBRL(r.comm) : '—'}</td>
      <td class="fs13 fw7 ${neg ? 'ext-val-neg' : 'ext-val-pos'}">${fmtBRL(r.net)}</td>
      <td>${tags[r.status] || ''}</td>
      <td class="fs11 muted">${fmtDateTime(r.date)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--muted)">Nenhuma transação no período.</td></tr>';
  setText('extractCount', `Mostrando ${rows.length} de ${rows.length} transações`);
  setText('extractTotal', fmtBRL(rows.reduce((s, r) => s + r.net, 0)));
}

function exportExtractCsv() {
  if (financeModule !== 'ok') { toast('O extrato não está disponível no momento.', 'info'); return; }
  const rows = [['Data', 'Tipo', 'Pedido', 'Bruto', 'Comissão', 'Líquido', 'Status']];
  extractRows().forEach(r => rows.push([new Date(r.date).toLocaleString('pt-BR'), r.type, r.order, r.gross.toFixed(2).replace('.', ','), r.comm.toFixed(2).replace('.', ','), r.net.toFixed(2).replace('.', ','), r.status]));
  if (rows.length === 1) { toast('Não há transações no período.', 'info'); return; }
  downloadCsv('extrato.csv', rows);
}

function formatSaque(inp) {
  const v = inp.value.replace(/\D/g, '');
  inp.value = v ? 'R$ ' + (parseInt(v, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

let payoutBusy = false;
async function doSaque() {
  if (payoutBusy) return;
  if (!storeCan('payout')) return denyAction('payout');
  if (financeModule !== 'ok') { toast('O módulo financeiro não está disponível.', 'err'); return; }
  const amount = parseBRL($('saqueVal')?.value);
  if (!(amount > 0)) { toast('Informe o valor do saque.', 'err'); return; }
  if (amount > Number((BALANCE || {}).available_amount || 0)) { toast('O valor é maior que o saldo disponível.', 'err'); return; }
  if (!PAYOUT_ACCOUNT) { toast('Cadastre seus dados de recebimento antes de sacar.', 'err'); showCfgFromAnywhere('pagamentos'); return; }

  payoutBusy = true;
  const btn = document.querySelector('.btn-withdraw');
  if (btn) btn.disabled = true;
  try {
    const { error } = await supabaseClient.rpc('request_payout', { p_amount: amount });
    if (error) { console.error('Erro ao solicitar saque:', error); toast(friendlyRpcError(error), 'err'); return; }
    if ($('saqueVal')) $('saqueVal').value = '';
    await loadFinance();
    toast('Solicitação de saque registrada. Acompanhe o status no extrato.', 'ok');
  } finally {
    payoutBusy = false;
    if (btn) btn.disabled = financeModule !== 'ok';
  }
}
function showCfgFromAnywhere(panel) {
  if (!navigate('config')) return;
  const item = Array.from(document.querySelectorAll('.cfg-nav-item')).find(i => (i.getAttribute('onclick') || '').includes(`'${panel}'`));
  showCfg(panel, item);
}

// ══ DASHBOARD (KPIs, gráfico, pedidos recentes e top produtos — somente dados reais) ═══
function refreshDashboardViews() {
  const ok = ordersModule === 'ok';
  const valid = ORDERS.filter(o => ['pending', 'transit', 'delivered'].includes(o.status));
  const now = new Date();
  const inMonth = valid.filter(o => { const d = new Date(o.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const revenue = inMonth.reduce((s, o) => s + Number(o.total), 0);
  setText('kpiRevenue', ok ? fmtBRL(revenue) : '—');
  setText('kpiOrders', ok ? String(inMonth.length) : '—');
  setText('kpiTicket', ok ? fmtBRL(inMonth.length ? revenue / inMonth.length : 0) : '—');
  const rated = PRODS.map(p => Number(p.rating)).filter(r => r > 0);
  setText('kpiRating', rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1).replace('.', ',') : '--');
  setText('revMonthTag', ok ? `${fmtBRL(revenue)} este mês` : '—');
  setText('revChartTitle', `📈 Faturamento Mensal (${now.getFullYear()})`);
  buildRevChart(valid);
  buildRecentOrders();
  buildTopProducts();
}

function buildRevChart(valid) {
  const el = $('revChart');
  if (!el) return;
  const year = new Date().getFullYear();
  const monthly = new Array(12).fill(0);
  (valid || []).forEach(o => { const d = new Date(o.created_at); if (d.getFullYear() === year) monthly[d.getMonth()] += Number(o.total); });
  const max = Math.max(...monthly, 1);
  el.innerHTML = monthly.map((v, i) => {
    const h = v > 0 ? Math.max(4, Math.round((v / max) * 140)) : 2;
    return `<div class="rev-bar-wrap"><div class="rev-bar blue" style="height:${h}px"><div class="rev-bar-tip">${fmtBRL(v)}</div></div><div class="rev-label">${months[i]}</div></div>`;
  }).join('');
}

function buildRecentOrders() {
  const body = $('recentOrdersBody');
  if (!body) return;
  if (ordersModule !== 'ok' || !ORDERS.length) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:26px;color:var(--muted)">${ordersModule === 'missing' ? 'Módulo de pedidos ainda não configurado.' : 'Nenhum pedido recebido ainda.'}</td></tr>`;
    return;
  }
  body.innerHTML = ORDERS.slice(0, 5).map(o => {
    const items = o.store_order_items || [];
    const prod = items.length ? escapeHtml(items[0].name) + (items.length > 1 ? ` +${items.length - 1}` : '') : '—';
    return `<tr><td class="td-link fs11">#${escapeHtml(o.code)}</td><td class="fs12">${escapeHtml(o.customer_name || 'Cliente')}</td><td class="fs12">${prod}</td>
      <td class="fs12 fw6">${fmtBRL(o.total)}</td><td><span class="tag ${ORD_TAG[o.status] || 'tag-gray'}">${ORD_STATUS[o.status] || escapeHtml(o.status)}</span></td>
      <td class="fs11 muted">${fmtDateTime(o.created_at)}</td></tr>`;
  }).join('');
}

function buildTopProducts() {
  const box = $('topProdsBox');
  if (!box) return;
  const qty = {};
  ORDERS.filter(o => ['pending', 'transit', 'delivered'].includes(o.status)).forEach(o =>
    (o.store_order_items || []).forEach(it => { qty[it.name] = (qty[it.name] || 0) + (it.qty || 0); }));
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 5);
  box.innerHTML = top.length
    ? top.map(([name, q], i) => `<div class="fac gap10" style="padding:10px 0;border-bottom:1px solid var(--b2)"><span class="fs12 fw7 blue">${i + 1}º</span><span class="fs12" style="flex:1">${escapeHtml(name)}</span><span class="fs11 muted">${q} un.</span></div>`).join('')
    : `<div style="text-align:center;color:var(--muted);padding:30px 0;font-size:12px">${ordersModule === 'ok' ? 'Os produtos mais vendidos aparecem aqui assim que houver pedidos.' : 'Disponível quando o módulo de pedidos estiver ativo.'}</div>`;
}
// ══ NEW PRODUCT ══════════════════════════════════════════
let currentPreviewBlobUrl = null;
let currentPreviewFile = null;

const emos = {'📱 Eletrônicos':'📱','👗 Moda':'👗','🏠 Casa':'🏠','💪 Fitness':'💪','💄 Beleza':'💄','🐾 Pets':'🐾','📦 Diversos':'📦'};
function updatePreview() {
  const n = document.getElementById('npName')?.value || 'Nome do produto';
  const p = document.getElementById('npPrice')?.value || 'R$ 0,00';
  const c = document.getElementById('npCat')?.value || 'Categoria';
  const d = document.getElementById('npDesc')?.value || 'Descrição curta aqui...';
  
  if(document.getElementById('previewName')) document.getElementById('previewName').textContent = n;
  if(document.getElementById('previewPrice')) document.getElementById('previewPrice').textContent = p || 'R$ 0,00';
  if(document.getElementById('previewCat')) document.getElementById('previewCat').textContent = c;
  if(document.getElementById('previewDesc')) document.getElementById('previewDesc').textContent = d.slice(0,80);
  
  const em = emos[c] || '📦';
  const previewEl = document.getElementById('previewImg');
  
  const mainImageFile = productImagesFiles[0];
  const isEditing = typeof editingProductId !== 'undefined' && editingProductId;

  if (previewEl) {
    if (mainImageFile) {
      if (currentPreviewFile !== mainImageFile) {
        if (currentPreviewBlobUrl) {
          URL.revokeObjectURL(currentPreviewBlobUrl);
        }
        currentPreviewBlobUrl = URL.createObjectURL(mainImageFile);
        currentPreviewFile = mainImageFile;
      }
      previewEl.innerHTML = `<img src="${currentPreviewBlobUrl}" style="position:absolute; top:0; left:0; width:100%; object-fit:cover; border-radius:inherit;" alt="Preview">`;
      
    } else if (isEditing) {
      const p = findProd(editingProductId);
      const existingMain = productExistingUrls[0];
      if (p && existingMain) {
        if (previewEl.tagName.toLowerCase() !== 'img') {
          previewEl.innerHTML = `<img src="${escapeHtml(existingMain)}" style="position:absolute; top:0; left:0; width:100%; object-fit:cover; border-radius:inherit;" alt="${escapeHtml(p.name)}">`;
        } else {
          previewEl.src = existingMain;
        }
      } else {
        previewEl.innerHTML = `<div class="fs24" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${em}</div>`;
      }
      
    } else {
      if (previewEl.tagName.toLowerCase() !== 'img') {
        previewEl.innerHTML = `<div class="fs24" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${em}</div>`;
      } else {
        previewEl.src = ''; 
      }
    }
  }
  
  const set = (id, ok) => {
  const el = document.getElementById(id);
  if (!el) return;
    
  el.style.color = ok ? 'var(--green)' : 'var(--red)';
  const icon = el.querySelector('i');

  if (icon) {
    icon.className = ok
      ? 'fa-solid fa-check'
      : 'fa-solid fa-xmark';
  }
  };
  
  set('chk-name',n&&n!=='Nome do produto');
  set('chk-cat',c&&c!=='Selecionar...'&&c!=='Categoria');
  set('chk-price',p&&p!=='R$ 0,00'&&p!=``);
  set('chk-desc',d&&d.length>10);
}
  

// ══ MARGEM (cálculo real; sem números aleatórios e sem percentual inventado) ═══
// Preencha com a comissão real da Ecomme quando ela for definida (ex.: 0.09 = 9%). null = não exibe o líquido.
const PLATFORM_COMMISSION_RATE = null;

function maskMoney(el) {
  const v = onlyDigits(el.value).slice(0, 9);
  el.value = v ? 'R$ ' + (parseInt(v, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}
function calcMargin() {
  const box = $('marginCalc');
  if (!box) return;
  const cost = parseBRL($('npCost') && $('npCost').value);
  const price = parseBRL($('npPrice') && $('npPrice').value);
  if (!(cost > 0) || !(price > 0)) { box.style.display = 'none'; return; }
  box.style.display = 'flex';
  const margin = ((price - cost) / price) * 100;
  setText('marginVal', `${margin.toFixed(1).replace('.', ',')}% (${fmtBRL(price - cost)})`);
  const wrap = $('netWrap');
  if (wrap) {
    wrap.style.display = PLATFORM_COMMISSION_RATE === null ? 'none' : '';
    if (PLATFORM_COMMISSION_RATE !== null) setText('netVal', fmtBRL(price * (1 - PLATFORM_COMMISSION_RATE) - cost));
  }
}
/* ---------------- GALERIA DE IMAGENS DO PRODUTO ---------------- */
let productImagesFiles = [null, null, null, null, null]; 
// URLs que o produto em edição já possui no banco (uma por slot). Antes a galeria consultava PRODS a cada renderização
// e a exclusão de uma imagem existente nunca era refletida.
let productExistingUrls = [null, null, null, null, null];
let targetSecondarySlot = null;
let activeImageSlot = 0;

function triggerImageUpload(slotIndex) {
  const isSlotOccupied = (index) => productImagesFiles[index] !== null || !!productExistingUrls[index];

  if (slotIndex > 0 && isSlotOccupied(slotIndex)) {
    openImageActionModal(slotIndex);
    return;
  }

  let targetSlot = slotIndex;
  for (let i = 0; i < slotIndex; i++) {
    if (!isSlotOccupied(i)) {
      targetSlot = i;
      break; 
    }
  }
  
  activeImageSlot = targetSlot;
  const fileInput = document.getElementById('npImage');
  if(fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

/* ---------------- Image Action Modal ------------------ */
function openImageActionModal(slotIndex) {
  targetSecondarySlot = slotIndex;
  const modal = document.getElementById('imageActionModal');
  if (modal) modal.classList.add('active');
}

function closeImageActionModal() {
  const modal = document.getElementById('imageActionModal');
  if (modal) modal.classList.remove('active');
  targetSecondarySlot = null;
}

function actionChangeImage() {
  const slot = targetSecondarySlot;
  closeImageActionModal();
  
  if (slot !== null) {
    activeImageSlot = slot;
    const fileInput = document.getElementById('npImage');
    if(fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }
}

function actionDeleteImage() {
  if (targetSecondarySlot !== null) {
    deleteImageSlot(targetSecondarySlot);
    closeImageActionModal();
  }
}

/* ---------------- EXCLUSÃO E ATUALIZAÇÃO VISUAL ---------------- */
async function deleteImageSlot(slotIndex, event) {
  if (event) {
    event.stopPropagation(); 
  }

  const affectedBlocks = [];
  for (let i = slotIndex; i < 5; i++) {
    const block = document.getElementById(`img-block-${i}`);
    if (block && block.classList.contains('has-image')) {
      affectedBlocks.push(block.querySelector('.img-preview-container'));
    }
  }

  affectedBlocks.forEach(preview => {
    if (preview) preview.classList.add('img-animate-out');
  });
  
  const fileToRemove = productImagesFiles[slotIndex];
  if (fileToRemove && fileToRemove.previewUrl) {
    URL.revokeObjectURL(fileToRemove.previewUrl);
  }

  await new Promise(resolve => setTimeout(resolve, 300));
  
  productImagesFiles.splice(slotIndex, 1);
  productImagesFiles.push(null);
  productExistingUrls.splice(slotIndex, 1);
  productExistingUrls.push(null);
  hasUnsavedChanges = true; dirtySource = 'product';
  
  updatePreview();
  updateGalleryUI();

  for (let i = slotIndex; i < 5; i++) {
    const block = document.getElementById(`img-block-${i}`);
    if (block && block.classList.contains('has-image')) {
      const preview = block.querySelector('.img-preview-container');
      if (preview) {
        preview.classList.add('img-animate-in');
        setTimeout(() => preview.classList.remove('img-animate-in'), 300);
      }
    }
  }
}

function updateGalleryUI() {
  for (let i = 0; i < 5; i++) {
    const block = document.getElementById(`img-block-${i}`);
    if (!block) continue;

    const file = productImagesFiles[i];
    let innerHtmlContent = '';
    const deleteBtnHTML = i === 0 ? `<button class="btn-delete-main-img" onclick="deleteImageSlot(0, event)" title="Excluir imagem"><i class="fa-solid fa-trash"></i></button>` : '';

    const dbImageUrl = productExistingUrls[i] || null;

    if (file) {
      const url = file.previewUrl || (file.previewUrl = URL.createObjectURL(file));   // uma URL por arquivo (antes vazava uma a cada render)
      innerHtmlContent = `
        <div class="img-preview-container"><img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" alt="Imagem ${i}"></div>
        <div class="img-edit-overlay"><i class="fa-solid fa-pen"></i></div>
        ${deleteBtnHTML}
      `;
      block.classList.add('has-image');
      
    } else if (dbImageUrl) {
      const altText = i === 0 ? "Imagem do Produto" : `Imagem ${i}`;
      innerHtmlContent = `
        <div class="img-preview-container"><img src="${escapeHtml(dbImageUrl)}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" alt="${altText}"></div>
        <div class="img-edit-overlay"><i class="fa-solid fa-pen"></i></div>
        ${deleteBtnHTML}
      `;
      block.classList.add('has-image');
      
    } else {
      innerHtmlContent = `
          <div class="img-preview-container">${i === 0 ? '<div class="fs24" style="font-size: 50px"><i class="fa-solid fa-image"></i></div>' : '<i class="fa-solid fa-plus fs20 muted"></i>'}</div>
          <div class="img-edit-overlay"><i class="fa-solid fa-pen"></i></div>
      `;
      block.classList.remove('has-image');
    }
    
    block.innerHTML = innerHtmlContent;
  }
}

let cropperInstance = null;
let originalFileName = "";

function openCropModal(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem deve ter no máximo 5MB ⚠️', 'err');
    event.target.value = '';
    return;
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast('Formato não suportado. Use JPG, PNG ou WEBP.', 'err');
    event.target.value = '';
    return;
  }

  originalFileName = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgElement = document.getElementById('imageToCrop');
    imgElement.src = e.target.result;
    
    document.getElementById('cropModal').style.display = 'flex';
    document.getElementById('cropModal').classList.add('active');

    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = new Cropper(imgElement, {
      autoCropArea: 1,
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      background: false,
    });
  };
  
  reader.readAsDataURL(file);
}

function closeCropModal() {
  document.getElementById('cropModal').style.display = 'none';
  document.getElementById('cropModal').classList.remove('active');
  
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  document.getElementById('npImage').value = '';
}

async function executeCrop() {
  if (!cropperInstance) {
    toast('Erro: O recortador não foi inicializado corretamente. ⚠️', 'err');
    return;
  }
  
  cropperInstance.getCroppedCanvas({
    width: 600,
    height: 600,
    fillColor: '#ffffff',
    imageSmoothingQuality: 'high'
  }).toBlob(async (blob) => {
    
    if (!blob) {
      toast('Erro ao processar o recorte da imagem.', 'err');
      closeCropModal();
      return;
    }

    const croppedFile = new File([blob], originalFileName, { type: 'image/jpeg' });
    const oldFile = productImagesFiles[activeImageSlot];
    if (oldFile && oldFile.previewUrl) {
      URL.revokeObjectURL(oldFile.previewUrl);
    }
    productImagesFiles[activeImageSlot] = croppedFile;
    
    updateGalleryUI();
    updatePreview();

    closeCropModal();
  }, 'image/jpeg', 0.9);
}

// Lembre-se de atualizar a função clearProductForm() para limpar esse array quando sair
// Adicione isso dentro da sua função clearProductForm() existente:
// productImagesFiles = [null, null, null, null, null];
// updateGalleryUI();


/* ---------------------------------------------- */
// ══ PUBLICAR / SALVAR PRODUTO ═══════════════════════════════
let isPublishing = false;
const IMG_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function setPublishBusy(busy) {
  isPublishing = busy;
  document.querySelectorAll('button[onclick="publishProduct()"]').forEach(b => { b.disabled = busy; });
}

async function uploadProductImage(file, index) {
  const ext = IMG_EXT[file.type] || 'jpg';
  const fileName = `${Date.now()}-slot${index}-${Math.random().toString(36).substring(2)}.${ext}`;
  const { error } = await supabaseClient.storage.from(PRODUCTS_BUCKET).upload(fileName, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(PRODUCTS_BUCKET).getPublicUrl(fileName);
  return { path: fileName, url: data.publicUrl };
}

async function publishProduct() {
  if (isPublishing) return;
  if (!storeCan('products')) return denyAction('products');
  if (myStoreId === null || myStoreId === undefined) { toast('Sua loja não foi carregada. Recarregue a página.', 'err'); return; }

  const isEditing = editingProductId !== null && editingProductId !== '';
  const name = ($('npName')?.value || '').trim();
  const desc = ($('npDesc')?.value || '').trim();
  const price = parseBRL($('npPrice')?.value);
  const stockRaw = ($('npStock')?.value || '').trim();
  const catSel = $('npCat');
  const shipping = $('freeShip')?.checked || false;
  const hasMainImage = !!(productImagesFiles[0] || productExistingUrls[0]);

  // Antes: o teste comparava com "Selecionar..." mas o placeholder é "Selecione...": categoria nunca era exigida.
  if (name.length < 3) { toast('Informe o nome do produto (mínimo 3 caracteres).', 'err'); return; }
  if (!catSel || catSel.selectedIndex <= 0) { toast('Selecione uma categoria.', 'err'); return; }
  if (!(price > 0)) { toast('Informe um preço de venda maior que zero.', 'err'); return; }
  if (desc.length < 10) { toast('A descrição curta precisa ter pelo menos 10 caracteres.', 'err'); return; }
  if (stockRaw !== '' && !/^\d+$/.test(stockRaw)) { toast('O estoque deve ser um número inteiro (0 ou mais).', 'err'); return; }
  if (!hasMainImage) { toast('Adicione pelo menos a imagem principal (bloco maior) do produto.', 'err'); return; }

  const editing = isEditing ? findProd(editingProductId) : null;
  if (isEditing && !editing) { toast('Produto não encontrado. Volte para a lista e tente novamente.', 'err'); return; }

  setPublishBusy(true);
  const uploaded = [];                       // arquivos novos: removidos se algo falhar depois
  try {
    toast('Enviando imagens e processando...', 'info');
    const finalUrls = [null, null, null, null, null];
    for (let i = 0; i < 5; i++) {
      if (productImagesFiles[i]) {
        const up = await uploadProductImage(productImagesFiles[i], i);
        uploaded.push(up.path);
        finalUrls[i] = up.url;
      } else {
        finalUrls[i] = productExistingUrls[i] || null;
      }
    }

    const catText = catSel.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();   // remove o emoji do texto da opção
    const productData = {
      name, cat: [catText], price: Number(price.toFixed(2)), desc, shipping,
      image_url: finalUrls[0], gallery_urls: finalUrls
    };
    if (stockRaw !== '') productData.stock = parseInt(stockRaw, 10);

    const write = async () => {
      if (isEditing) {
        return supabaseClient.from('products').update(productData).eq('id', editing.id).eq('loja_id', myStoreId).select('id');
      }
      const row = { ...productData, id: await getUniqueProductId(), loja_id: myStoreId, badge: 'new', rating: 0, reviews: 0, features: [] };
      return supabaseClient.from('products').insert([row]).select('id');
    };

    let res = await write();
    // Coluna "stock" ausente (migração não executada): tenta de novo sem ela e avisa claramente.
    if (res.error && /stock/i.test(res.error.message || '') && ['PGRST204', '42703'].includes(res.error.code)) {
      delete productData.stock;
      res = await write();
      if (!res.error) toast('Produto salvo, mas o estoque NÃO foi gravado: falta a coluna "stock" (execute a migração SQL).', 'err');
    }
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('O banco não confirmou a gravação (nenhuma linha afetada).');

    // Só depois da confirmação: apaga do Storage as imagens que saíram deste produto e ninguém mais usa
    if (editing) {
      const oldUrls = [editing.image_url, ...(Array.isArray(editing.gallery_urls) ? editing.gallery_urls : [])].filter(Boolean);
      const removed = oldUrls.filter(u => !finalUrls.includes(u));
      await removeUnreferencedImages(removed, editing.id);
    }

    toast(isEditing ? 'Produto atualizado com sucesso! 💾' : 'Produto publicado com sucesso! 🚀', 'ok');
    hasUnsavedChanges = false; dirtySource = null;
    clearProductForm();
    await loadMyProducts();
    navigate('produtos');
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    if (uploaded.length) {
      const { error: rmErr } = await supabaseClient.storage.from(PRODUCTS_BUCKET).remove(uploaded);
      if (rmErr) console.warn('Não foi possível limpar imagens enviadas:', rmErr);
    }
    toast(isNetworkError(err) ? 'Sem conexão. Nada foi salvo; tente novamente.' : 'Não foi possível salvar o produto. Suas informações continuam no formulário.', 'err');
  } finally {
    setPublishBusy(false);
  }
}
// --------------------------------------------------------
function clearProductForm() {
  if (typeof productImagesFiles !== 'undefined') {
    productImagesFiles.forEach(file => {
      if (file && file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });

    productImagesFiles = [null, null, null, null, null];
  }
  productExistingUrls = [null, null, null, null, null];

  editingProductId = null;
  if (currentPreviewBlobUrl) {
    URL.revokeObjectURL(currentPreviewBlobUrl);
    currentPreviewBlobUrl = null;
  }

  currentPreviewFile = null;
  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.value = '';
  });

  if (typeof updateGalleryUI === 'function') {
    updateGalleryUI();
  }

  if ($('npName')) $('npName').value = '';
  if ($('npPrice')) $('npPrice').value = '';
  if ($('npStock')) $('npStock').value = '';
  if ($('npCost')) $('npCost').value = '';
  if (typeof calcMargin === 'function') calcMargin();
  if ($('npDesc')) $('npDesc').value = '';
  if ($('npCat')) $('npCat').selectedIndex = 0;
  if ($('freeShip')) $('freeShip').checked = false;
  if ($('npImage')) $('npImage').value = '';

  const labelNewProduct = document.getElementById('labelNewProduct');
  labelNewProduct.textContent = 'Cadastrar Novo Produto';
  
  const previewEl = document.getElementById('previewImg');
  if (previewEl) {
    previewEl.innerHTML = '📦';
  }

  document.querySelectorAll('button[onclick="publishProduct()"]').forEach(btn => {
    if (btn.innerHTML.includes('Salvar')) {
      btn.innerHTML = btn.innerHTML
        .replace('Salvar Produto', 'Publicar Produto')
        .replace('💾', '🚀');
    }
  });

  updatePreview();
  resetPublishChecklist();
}

/* ---------------------------------------- */
function resetPublishChecklist() {
  const checklist = {
    'chk-name': 'Nome do produto',
    'chk-cat': 'Categoria selecionada',
    'chk-price': 'Preço de venda',
    'chk-desc': 'Descrição curta'
  };

  Object.entries(checklist).forEach(([id, text]) => {
    const el = document.getElementById(id);

    if (!el) return;
    el.style.color = 'var(--red)';
    const icon = el.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-xmark';
    }
  });
}

// --------------------------------------------------------
const rnd4 = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');

function generateCustomId() {
  return `${rnd4()}-${rnd4()}-${rnd4()}`;
}

async function getUniqueProductId() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const newId = generateCustomId();
    const { data, error } = await supabaseClient.from('products').select('id').eq('id', newId).maybeSingle();
    if (error) throw error;                 // erro de rede/permissão não é "id livre"
    if (!data) return newId;
  }
  throw new Error('Não foi possível gerar um identificador único para o produto.');
}


// ══ CONFIG ══════════════════════════════════════════════
function showCfg(id, el){
  document.querySelectorAll('.cfg-panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.cfg-nav-item').forEach(i=>i.classList.remove('on'));
  const panel=document.getElementById('cfg-'+id);
  if(panel) panel.classList.add('on');
  if(el) el.classList.add('on');
}


// ══ TOAST (um só: antes havia 3 versões e o tipo "err" era ignorado, exibindo erro como sucesso) ═══
let toastTimer = null;
function showToast(msg, type) {
  const t = $('toast2');
  if (!t) return;
  const kind = type === 'err' ? 'err' : type === 'info' ? 'info' : 'ok';
  t.classList.remove('ok', 'err', 'info');
  t.classList.add(kind);
  const ico = t.querySelector('.toast2-icon');
  if (ico) ico.textContent = kind === 'err' ? '!' : kind === 'info' ? 'i' : '✓';
  setText('toastMsg2', msg);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), kind === 'err' ? 4200 : 2800);
}
function toast(msg, type = 'ok') { showToast(msg, type); }
function toast2(msg, type = 'info') { showToast(msg, type); }

// Atalho do menu da conta (a lista de desejos fica na vitrine)
function openFav() { closeAcc(); buttonLink('/'); }
// ══ LOJA: leitura, estado em tempo real e configurações ═════
const STORE_COLUMNS = 'id, status, slug_url, nome_loja, slogan, descricao, email, telefone, nome_razao, nome_fantasia, inscricao_estadual, documento, regime_tributario, complemento, endereco, numero, cidade, estado, cep, tipo_pessoa, prazo_envio, formas_envio, frete_gratis_ativo, frete_valor_minimo, politica_devolucao, cor_destaque';
const STORE_ASSETS_BUCKET = 'store-assets';
let STORE_IMAGES = { logo: null, capa: null };

const setVal = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 500);

function formatDocument(d, tipo) {
  const x = onlyDigits(d);
  if (x.length === 11) return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (x.length === 14) return x.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(d ?? '');
}
function formatPhone(d) {
  const x = onlyDigits(d);
  if (x.length === 11) return x.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (x.length === 10) return x.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return String(d ?? '');
}
const isPJ = () => (myStoreData && myStoreData.tipo_pessoa === 'pj') || (!myStoreData?.tipo_pessoa && onlyDigits($('store-cnpj-cpf')?.value).length === 14);

function renderStoreState(status, slug, data) {
  data = data || {};
  const pendingUI = $('store-pending-state'), activeUI = $('store-active-state'), suspendedUI = $('store-suspended-state');
  if (!pendingUI || !activeUI) { console.error('Erro: elementos de estado da loja não encontrados no HTML.'); return; }

  const phase = storePhase(status);
  const safeSlug = slug || 'loja-em-configuracao';
  const storeLabel = data.nome_loja || 'Minha loja';

  pendingUI.style.display = phase === 'pending' ? 'block' : 'none';
  activeUI.style.display = phase === 'active' ? 'block' : 'none';
  if (suspendedUI) suspendedUI.style.display = phase === 'suspended' ? 'block' : 'none';

  const headerStore = $('header-store');
  if (phase === 'active') {
    if (headerStore) { headerStore.textContent = storeLabel; headerStore.style.display = 'flex'; }
    setText('sb-store', storeLabel);
    setText('sb-storename', `@${safeSlug}`);
  } else {
    if (headerStore) headerStore.style.display = 'none';
    setText('sb-store', phase === 'suspended' ? 'Loja suspensa' : 'Loja em Análise..');
    setText('sb-storename', phase === 'suspended' ? 'Fale com o suporte.' : 'Aguarde um momento.');
  }
  setText('storeName', storeLabel);
  setText('storeNameBy', storeLabel);

  // Configurações: preenchidas em QUALQUER estado (antes só quando ativa)
  setVal('cfgStoreName', data.nome_loja);
  setVal('cfgStoreSlogan', data.slogan);
  setVal('cfgStoreDesc', data.descricao);
  setVal('cfgStoreEmail', data.email);
  setVal('cfgStorePhone', data.telefone);
  setVal('store-cnpj-cpf', data.documento);
  setVal('store-legal-name', data.nome_razao);
  setVal('store-trade-name', data.nome_fantasia);
  setVal('store-ie', data.inscricao_estadual);
  if ($('store-tax-regime') && data.regime_tributario) $('store-tax-regime').value = data.regime_tributario;
  const compl = data.complemento ? ` ${data.complemento}` : '';
  setVal('store-address', [data.endereco && `${data.endereco}${data.numero ? ', ' + data.numero : ''}${compl}`, data.cidade && `${data.cidade}${data.estado ? '/' + data.estado : ''}`, data.cep && `CEP ${data.cep}`].filter(Boolean).join(' - '));

  // Frete e política (gravados no cadastro; agora também carregados e editáveis)
  if ($('cfgPrazo') && data.prazo_envio) $('cfgPrazo').value = data.prazo_envio;
  const formas = Array.isArray(data.formas_envio) ? data.formas_envio : [];
  document.querySelectorAll('#cfgFormas input[type="checkbox"]').forEach(cb => { cb.checked = formas.includes(cb.value); });
  if ($('cfgFreteAtivo')) $('cfgFreteAtivo').checked = !!data.frete_gratis_ativo;
  setVal('cfgFreteMin', data.frete_valor_minimo);
  setVal('cfgPolitica', data.politica_devolucao);

  // PF não possui nome fantasia / IE / regime: esses campos ficam desabilitados e não são exigidos
  const pf = (data.tipo_pessoa || '') === 'pf';
  ['store-trade-name', 'store-ie', 'store-tax-regime'].forEach(id => { const el = $(id); if (el) el.disabled = pf; });

  setConfigReadOnly(phase === 'suspended');
  renderStoreImages();
}

function setConfigReadOnly(ro) {
  document.querySelectorAll('#page-config .inp, #page-config .ta, #page-config .sel, #page-config input, #page-config textarea, #page-config select').forEach(el => {
    if (ro) { el.dataset.wasDisabled = el.disabled ? '1' : '0'; el.disabled = true; }
    else if (el.dataset.wasDisabled !== undefined) { el.disabled = el.dataset.wasDisabled === '1'; delete el.dataset.wasDisabled; }
  });
  const save = $('btn-save-config');
  if (save) save.disabled = ro;
}

async function fetchInitialStoreStatus() {
  if (!userId) return null;
  try {
    const { data, error } = await supabaseClient.from('lojas').select(STORE_COLUMNS).eq('user_id', userId).maybeSingle();
    if (error) {
      console.error('Erro ao buscar a loja:', error);
      return { failed: true };            // falha NÃO é "sem loja"
    }
    if (!data) return null;
    myStoreId = data.id;
    myStoreData = data;
    renderStoreState(data.status, data.slug_url, data);
    loadStoreImages();
    return data;
  } catch (err) {
    console.error('Erro inesperado ao carregar loja:', err);
    return { failed: true };
  }
}

// Imagens: logo_url/capa_url (Storage) ou, para cadastros antigos, logo_base64/capa_base64.
// Consultas tolerantes: se a migração ainda não criou as colunas novas, cai para as antigas.
async function loadStoreImages() {
  try {
    let res = await supabaseClient.from('lojas').select('logo_url, capa_url').eq('id', myStoreId).maybeSingle();
    if (res.error) res = await supabaseClient.from('lojas').select('logo_base64, capa_base64').eq('id', myStoreId).maybeSingle();
    if (res.error || !res.data) return;
    STORE_IMAGES = { logo: res.data.logo_url || res.data.logo_base64 || null, capa: res.data.capa_url || res.data.capa_base64 || null };
    renderStoreImages();
  } catch (e) { /* imagens são opcionais */ }
}
function renderStoreImages() {
  const box = $('cfgLogoPreview');
  const sbImage = $('sbLogoPreview');
  if (!box || !sbImage) return;
  const name = (myStoreData && myStoreData.nome_loja) || '';
  if (STORE_IMAGES.logo) {
    box.textContent = '';
    sbImage.textContent = '';
    const img = document.createElement('img');
    img.src = STORE_IMAGES.logo; img.alt = 'Logotipo da loja';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit';
    box.appendChild(img);
    sbImage.appendChild(img);
  } else {
    box.textContent = (name.match(/\p{L}/gu) || []).slice(0, 2).join('').toUpperCase() || '🏪';
    sbImage.textContent = (name.match(/\p{L}/gu) || []).slice(0, 2).join('').toUpperCase() || '🏪';
  }
}

function subscribeToStoreStatus() {
  if (!userId || storeChannel) return;            // uma única assinatura por sessão
  storeChannel = supabaseClient
    .channel('store-status-channel')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lojas', filter: `user_id=eq.${userId}` }, payload => {
      const before = storePhase(myStoreData && myStoreData.status);
      myStoreData = { ...(myStoreData || {}), ...payload.new };   // o payload omite colunas grandes inalteradas: mescla
      const after = storePhase(myStoreData.status);
      if (!hasUnsavedChanges || after !== before) renderStoreState(myStoreData.status, myStoreData.slug_url, myStoreData);
      if (before !== 'active' && after === 'active') toast('Sua loja foi ativada e já está no ar! 🎉', 'ok');
      if (before !== 'suspended' && after === 'suspended') toast('Sua loja foi suspensa. Fale com o suporte.', 'err');
    })
    .subscribe();
}
function unsubscribeFromStoreStatus() {
  if (storeChannel) { try { supabaseClient.removeChannel(storeChannel); } catch (e) {} storeChannel = null; }
}
window.addEventListener('pagehide', unsubscribeFromStoreStatus);

// ── Recebimentos (public.seller_payout_accounts) ──
function fillPayoutAccountForm() {
  const a = PAYOUT_ACCOUNT || {};
  setVal('dataAgencia', a.agency); setVal('dataConta', a.account); setVal('dataPix', a.pix_key);
  setVal('dataTitular', a.holder_name); setVal('titular-cnpj-cpf', a.holder_document);
  if ($('dataBanco') && a.bank) $('dataBanco').value = a.bank;
  if ($('dataTipoConta') && a.account_type) $('dataTipoConta').value = a.account_type;
}
function collectPayoutAccount() {
  const row = {
    bank: $('dataBanco') ? $('dataBanco').value : '',
    account_type: $('dataTipoConta') ? $('dataTipoConta').value : '',
    agency: cleanText($('dataAgencia')?.value, 20), account: cleanText($('dataConta')?.value, 24),
    pix_key: cleanText($('dataPix')?.value, 100), holder_name: cleanText($('dataTitular')?.value, 120),
    holder_document: cleanText($('titular-cnpj-cpf')?.value, 20)
  };
  const touched = !!(row.agency || row.account || row.pix_key || row.holder_name || row.holder_document);
  return { row, touched };
}

// ── Salvar configurações: valida → grava → confirma → só então atualiza a tela ──
function validateConfig() {
  const fail = (field, msg) => ({ ok: false, field, msg });
  const name = cleanText($('cfgStoreName')?.value, 60);
  const slogan = cleanText($('cfgStoreSlogan')?.value, 50);
  const desc = cleanText($('cfgStoreDesc')?.value, 600);
  const email = String($('cfgStoreEmail')?.value || '').trim().toLowerCase();
  const phoneDigits = onlyDigits($('cfgStorePhone')?.value);
  const docDigits = onlyDigits($('store-cnpj-cpf')?.value);
  const legal = cleanText($('store-legal-name')?.value, 120);
  const pj = isPJ();

  if (name.length < 3) return fail('cfgStoreName', 'O nome da loja precisa ter pelo menos 3 caracteres.');
  if (desc.length < 10) return fail('cfgStoreDesc', 'A descrição da loja precisa ter pelo menos 10 caracteres.');
  if (!isValidEmail(email)) return fail('cfgStoreEmail', 'Informe um e-mail de contato válido.');
  if (!isValidPhoneBR(phoneDigits)) return fail('cfgStorePhone', 'Informe um telefone/WhatsApp válido com DDD.');
  if (pj ? !isValidCNPJ(docDigits) : !isValidCPF(docDigits)) return fail('store-cnpj-cpf', pj ? 'CNPJ inválido.' : 'CPF inválido.');
  if (legal.length < 3) return fail('store-legal-name', pj ? 'Informe a razão social.' : 'Informe o nome completo.');

  const data = {
    nome_loja: name, slogan, descricao: desc, email, telefone: formatPhone(phoneDigits),
    documento: formatDocument(docDigits), nome_razao: legal
  };
  if (pj) {
    const trade = cleanText($('store-trade-name')?.value, 120);
    const ie = onlyDigits($('store-ie')?.value);
    const regime = $('store-tax-regime')?.value || '';
    if (trade.length < 2) return fail('store-trade-name', 'Informe o nome fantasia.');
    if (ie.length < 8) return fail('store-ie', 'Informe a inscrição estadual.');
    if (!regime || /selecione/i.test(regime)) return fail('store-tax-regime', 'Selecione o regime tributário.');
    Object.assign(data, { nome_fantasia: trade, inscricao_estadual: ie, regime_tributario: regime });
  }

  // Frete / política (colunas gravadas pelo cadastro)
  if ($('cfgPrazo')) data.prazo_envio = $('cfgPrazo').value;
  const formas = Array.from(document.querySelectorAll('#cfgFormas input[type="checkbox"]:checked')).map(cb => cb.value);
  if ($('cfgFormas')) {
    if (!formas.length) return fail('cfgFormas', 'Selecione pelo menos uma forma de envio.');
    data.formas_envio = formas;
  }
  if ($('cfgFreteAtivo')) {
    const ativo = $('cfgFreteAtivo').checked;
    const min = parseBRL($('cfgFreteMin')?.value);
    if (ativo && !(min > 0)) return fail('cfgFreteMin', 'Informe o valor mínimo para frete grátis.');
    data.frete_gratis_ativo = ativo;
    data.frete_valor_minimo = ativo ? 'R$ ' + min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ($('cfgFreteMin')?.value || '');
  }
  if ($('cfgPolitica')) data.politica_devolucao = cleanText($('cfgPolitica').value, 1000);

  // Recebimentos (opcional; se preencher, precisa estar completo)
  const pay = collectPayoutAccount();
  if (pay.touched) {
    const hasPix = !!pay.row.pix_key;
    const hasBank = !!(pay.row.agency && pay.row.account);
    if (!hasPix && !hasBank) return fail('dataPix', 'Informe uma chave PIX ou agência e conta.');
    if (pay.row.holder_name.length < 3) return fail('dataTitular', 'Informe o nome do titular.');
    const hd = onlyDigits(pay.row.holder_document);
    if (!(isValidCPF(hd) || isValidCNPJ(hd))) return fail('titular-cnpj-cpf', 'CPF/CNPJ do titular inválido.');
    pay.row.holder_document = formatDocument(hd);
  }
  return { ok: true, data, pay };
}

let savingConfig = false;
async function saveConfig(ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  if (savingConfig) return;
  if (!userId || myStoreId === null) { toast('Sua sessão não está ativa. Recarregue a página.', 'err'); return; }
  if (!storeCan('config')) return denyAction('config');

  const v = validateConfig();
  if (!v.ok) {
    showAlert(v.msg, 'Revise os dados', '🚫');
    const el = $(v.field);
    if (el && el.focus) { el.focus(); }
    return;
  }

  const btn = $('btn-save-config');
  const original = btn ? btn.innerText : '';
  savingConfig = true;
  if (btn) { btn.innerText = 'Salvando...'; btn.disabled = true; }
  try {
    const { data, error } = await supabaseClient.from('lojas').update(v.data)
      .eq('id', myStoreId).eq('user_id', userId).select(STORE_COLUMNS);
    if (error) throw error;
    if (!data || data.length !== 1) throw new Error('O banco não confirmou a atualização (nenhuma linha afetada).');

    let payoutFailed = false;
    if (v.pay.touched) {
      const { data: acc, error: accErr } = await supabaseClient.from('seller_payout_accounts')
        .upsert({ loja_id: myStoreId, ...v.pay.row, updated_at: new Date().toISOString() }, { onConflict: 'loja_id' }).select().single();
      if (accErr) {
        payoutFailed = true;
        console.error('Erro ao salvar recebimentos:', accErr);
      } else { PAYOUT_ACCOUNT = acc; renderFinance(); }
    }

    myStoreData = { ...myStoreData, ...data[0] };
    renderStoreState(myStoreData.status, myStoreData.slug_url, myStoreData);   // a tela só muda depois da confirmação
    if (payoutFailed) {
      toast('Dados da loja salvos, mas os dados de recebimento NÃO foram gravados. Tente novamente.', 'err');
    } else {
      hasUnsavedChanges = false; dirtySource = null;
      toast('As configurações foram salvas com sucesso!', 'ok');
    }
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    toast(isNetworkError(err) ? 'Sem conexão. Nada foi salvo; suas alterações continuam na tela.' : 'Não foi possível salvar. Suas alterações continuam na tela.', 'err');
  } finally {
    savingConfig = false;
    if (btn) { btn.innerText = original; btn.disabled = storePhase(myStoreData && myStoreData.status) === 'suspended'; }
  }
}

// ── Logotipo da loja (Storage + lojas.logo_url), troca segura ──
async function onCfgLogoSelected(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (!storeCan('config')) return denyAction('config');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Formato não suportado. Use PNG, JPG ou WEBP.', 'err'); return; }
  if (file.size > 2 * 1024 * 1024) { toast('O logotipo deve ter no máximo 2 MB.', 'err'); return; }

  const oldUrl = STORE_IMAGES.logo;
  const path = `${userId}/logo-${Date.now()}.${IMG_EXT[file.type]}`;
  try {
    toast('Enviando logotipo...', 'info');
    const { error: upErr } = await supabaseClient.storage.from(STORE_ASSETS_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const url = supabaseClient.storage.from(STORE_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl;
    const { data, error } = await supabaseClient.from('lojas').update({ logo_url: url }).eq('id', myStoreId).eq('user_id', userId).select('id');
    if (error || !data || data.length !== 1) {
      await supabaseClient.storage.from(STORE_ASSETS_BUCKET).remove([path]);          // sem órfão
      throw error || new Error('O banco não confirmou a atualização do logotipo.');
    }
    STORE_IMAGES.logo = url;
    renderStoreImages();
    // remove o arquivo anterior (apenas se estava no nosso bucket)
    const marker = `/storage/v1/object/public/${STORE_ASSETS_BUCKET}/`;
    if (oldUrl && oldUrl.includes(marker)) {
      await supabaseClient.storage.from(STORE_ASSETS_BUCKET).remove([decodeURIComponent(oldUrl.split(marker)[1].split('?')[0])]);
    }
    toast('Logotipo atualizado!', 'ok');
  } catch (err) {
    console.error('Erro ao atualizar logotipo:', err);
    toast(isMissingRelation(err) || /bucket|logo_url/i.test(err.message || '') ? 'O armazenamento de logotipos ainda não está configurado (migração SQL pendente).' : 'Não foi possível atualizar o logotipo.', 'err');
  }
}
// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
    .modal-alert-container {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      /*background: rgba(0, 0, 0, 0.6);*/
      backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      z-index: 500000;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .modal-alert-container.active {
      opacity: 1; pointer-events: auto;
    }
    .modal-alert-content {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      padding: 30px;
      border-radius: 36px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transform: scale(0.8);
      transition: transform 0.3s ease;
    }
    .modal-alert-container.active .modal-alert-content {
      transform: scale(1);
    }
    .modal-alert-icon {
      font-size: 44px;
      margin-bottom: 15px;
    }
    .modal-alert-content h3 {
      margin: 0 0 10px 0;
      font-family: 'Sora', 'Poppins', sans-serif;
      color: #10161a;
      font-size: 20px;
      font-weight: 700;
    }
    .modal-alert-content p {
      color: #707c8a;
      font-size: 14.5px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .modal-alert-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-alert-confirm {
      background: #2563EB;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }
    .btn-alert-confirm-red {
      background: #eb2525;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #d81d1d;
    }
    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-cancel:hover {
      background: #d1d5db;
    }
  `;
  document.head.appendChild(style);
}

// ── POP-UP WARNING ──
async function showAlert(message, title, icon) {
  injectModalStyles();
  
  let alertModal = document.getElementById('alertModal');
  
  if (!alertModal) {
    alertModal = document.createElement('div');
    alertModal.id = 'alertModal';
    alertModal.className = 'modal-alert-container';
    alertModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="alertIcon">${icon}</div>
        <h3 id="alertTitle">${title}</h3>
        <p id="alertMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-confirm" onclick="closeAlert()">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(alertModal);
  } else {

    document.getElementById('alertMsg').textContent = message;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertIcon').textContent = icon;
  }
  
  alertModal.offsetHeight;
  alertModal.classList.add('active');
}

// ── POP-UP CONFIRM ──
let confirmTimerId = null;

async function showConfirm(message, title, icon) { 
  injectModalStyles();
  
  let confirmModal = document.getElementById('confirmModal');
  
  if (!confirmModal) {
    confirmModal = document.createElement('div');
    confirmModal.id = 'confirmModal';
    confirmModal.className = 'modal-alert-container';
    confirmModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="confirmIcon">${icon}</div>
        <h3 id="confirmTitle">${title}</h3>
        <p id="confirmMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeConfirm()">Voltar</button>
          <button class="btn-alert-confirm" id="btnConfirmUnsave" onclick="confirmUnsave()">Sair sem salvar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal); 
  } else {
    document.getElementById('confirmMsg').innerHTML = message;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmIcon').innerHTML = icon; 
  }
  
  // ── LOGIC 3s ──
  const confirmBtn = document.getElementById('btnConfirmUnsave');
  let timeLeft = 3;
  
  confirmBtn.disabled = true;
  confirmBtn.style.opacity = '0.5';
  confirmBtn.style.cursor = 'not-allowed';
  confirmBtn.style.transition = 'all 0.3s ease';
  confirmBtn.textContent = `Sair sem salvar (${timeLeft}s)`;
  
  if (confirmTimerId) clearInterval(confirmTimerId);
  
  confirmTimerId = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      confirmBtn.textContent = `Sair sem salvar (${timeLeft}s)`;
    } else {
      clearInterval(confirmTimerId);
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
      confirmBtn.textContent = 'Sair sem salvar';
    }
  }, 1000);
  
  confirmModal.offsetHeight;
  confirmModal.classList.add('active');
}
  
function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

function closeConfirm() {
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal) {
    confirmModal.classList.remove('active');
  }
  if (confirmTimerId) clearInterval(confirmTimerId);
}

// ── POP-UP LOGOUT ──
let confirmRedTimerId = null;

async function showConfirmRed(message, title, icon) { 
  injectModalStyles();
  
  let confirmRedModal = document.getElementById('confirmRedModal');
  
  if (!confirmRedModal) {
    confirmRedModal = document.createElement('div');
    confirmRedModal.id = 'confirmRedModal';
    confirmRedModal.className = 'modal-alert-container';
    confirmRedModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="confirmRedIcon">${icon}</div>
        <h3 id="confirmRedTitle">${title}</h3>
        <p id="confirmRedMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeConfirmRed()">Voltar</button>
          <button class="btn-alert-confirm-red" id="btnConfirmLogout" onclick="confirmLogout()">Sair da conta</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmRedModal); 
  } else {
    document.getElementById('confirmRedMsg').innerHTML = message;
    document.getElementById('confirmRedTitle').textContent = title;
    document.getElementById('confirmRedIcon').innerHTML = icon; 
  }
  
  // ── LOGIC 3s ──
  const confirmRedBtn = document.getElementById('btnConfirmLogout');
  let timeLeft = 3;
  
  confirmRedBtn.disabled = true;
  confirmRedBtn.style.opacity = '0.5';
  confirmRedBtn.style.cursor = 'not-allowed';
  confirmRedBtn.style.transition = 'all 0.3s ease';
  confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
  
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
  
  confirmRedTimerId = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
    } else {
      clearInterval(confirmRedTimerId);
      confirmRedBtn.disabled = false;
      confirmRedBtn.style.opacity = '1';
      confirmRedBtn.style.cursor = 'pointer';
      confirmRedBtn.textContent = 'Sair da conta';
    }
  }, 1000);
  
  confirmRedModal.offsetHeight;
  confirmRedModal.classList.add('active');
}
  

function confirmLogout() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  doLogout();
  
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
}

function closeConfirmRed() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
}

/* ─── MORE ───────────────────────────────────────────────────────── */
function openMore() {
  closeAcc();
  if (typeof closeMore === 'function')
  $('moreSidebar').classList.add('on');
  $('moreOverlay').classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeMore() {
  $('moreSidebar').classList.remove('on');
  $('moreOverlay').classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

/* ─── ACC SIDEBAR ────────────────────────────────────────────────── */
function openAcc() {
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.add('on');
  if (ov) ov.classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeAcc() {
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.remove('on');
  if (ov) ov.classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

// ---------------------------------
supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem(
        'local_session_id'
      );
      if (typeof stopSessionCheck === 'function') {
        stopSessionCheck();
      }
      unsubscribeFromStoreStatus();
    }
  }
);

// LOGOUT
const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() {
  toast('Saindo da conta... 👋', 'info');
  const localSessionId = localStorage.getItem('local_session_id');
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (localSessionId && user) {
    const { error: deleteError } = await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('id', localSessionId)
        .eq('user_id', user.id);
    
    if (deleteError) {console.error('Erro ao remover sessão do banco:', deleteError);}
  }
  sessionStorage.setItem('remote_logout_notice_shown', 'true');
  localStorage.removeItem('local_session_id');
  const { error: signOutError } = await supabaseClient.auth.signOut({scope: 'local'});
  if (signOutError) {console.error('Erro ao fazer logout:', signOutError); }
  toast('Você saiu da conta.', 'info');
  await waitt(700);
  window.location.reload();
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function sanitizeInputAbc123(input) {
  /* Letters (including accents), Numbers, Spaces, Dots, '@', '(', ')' and '-' */
  if (typeof input !== 'string') return input;
  return input.replace(/[^a-zA-ZÀ-ÿ0-9\.'"@()\s\-]/g, '');
}

function sanitizeInput123(input) {
  /* Numbers, Dots, Hyphens, Slashes and Parentheses (For Docs and Phones) */
  if (typeof input !== 'string') return input;
  return input.replace(/[^0-9\.\-\/\(\)\s]/g, '');
}

/* ----------------------------------------------------- */
function openConfirmLogout() {
  showConfirmRed('Tem certeza que quer sair? <br>Suas informações não serão perdidas.', 'Sair da Conta', '<i class="fa-solid fa-right-from-bracket"></i>');
}
