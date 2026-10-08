/* ── THEME (idêntico ao script.js) ───────────────────────────────── */
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
    btn.addEventListener('click', function () { applyTheme(btn.dataset.themeChoice); });
  });
}

/* ── HELPERS (idênticos ao script.js) ────────────────────────────── */
function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
}
function buttonLink(url) {
  window.location.href = url;
}
const $ = id => document.getElementById(id);

// FAVICON (mesma regra do script.js)
const favicon = document.getElementById('favicon');
function checkTheme(e) {
  if (!favicon) return;
  favicon.href = e.matches ? '/images/favicon-light.png' : '/images/favicon-blue.png';
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

// TOAST (mesmos ids do script.js: toast2 / toastMsg2)
function showToast(msg) {
  const t = document.getElementById('toast2');
  if (!t) return;
  document.getElementById('toastMsg2').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function toast(msg, type = 'ok') { showToast(msg); }

/* ── MENUS LATERAIS (mesmos nomes/ids do script.js) ──────────────── */
function openMore() {
  closeAcc();
  $('moreSidebar').classList.add('on');
  $('moreSidebar').setAttribute('aria-hidden', 'false');
  $('moreOverlay').classList.add('on');
  document.body.classList.add('nobodyscroll');
}
function closeMore() {
  $('moreSidebar').classList.remove('on');
  $('moreSidebar').setAttribute('aria-hidden', 'true');
  $('moreOverlay').classList.remove('on');
  document.body.classList.remove('nobodyscroll');
}
function openAcc() {
  closeMore();
  const sb = $('accSidebar'), ov = $('accOverlay');
  if (sb) { sb.classList.add('on'); sb.setAttribute('aria-hidden', 'false'); }
  if (ov) ov.classList.add('on');
  document.body.classList.add('nobodyscroll');
}
function closeAcc() {
  const sb = $('accSidebar'), ov = $('accOverlay');
  if (sb) { sb.classList.remove('on'); sb.setAttribute('aria-hidden', 'true'); }
  if (ov) ov.classList.remove('on');
  document.body.classList.remove('nobodyscroll');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMore(); closeAcc(); } });

const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() {
  toast('Saindo da conta... 👋', 'info');
  const localSessionId = localStorage.getItem('local_session_id');
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (localSessionId && user) {
    const { error: deleteError } = await supabaseClient
      .from('user_sessions').delete().eq('id', localSessionId).eq('user_id', user.id);
    if (deleteError) console.error('Erro ao remover sessão do banco:', deleteError);
  }
  sessionStorage.setItem('remote_logout_notice_shown', 'true');
  localStorage.removeItem('local_session_id');
  const { error: signOutError } = await supabaseClient.auth.signOut({ scope: 'local' });
  if (signOutError) console.error('Erro ao fazer logout:', signOutError);
  await waitt(700);
  window.location.reload();
}

function openConfirmLogout() {
  if (window.confirm('Tem certeza que quer sair? Suas informações não serão perdidas.')) doLogout();
}

const SELLER_DASHBOARD_URL = '/sellers/main';
const DASHBOARD_PAGES = {
  dashboard:  'dashboard',
  detalhes:   'dashboard',
  vendas:     'pedidos',
  produtos:   'produtos',
  avaliacoes: 'dashboard',
  financeiro: 'financas',
  config:     'config',
  loja:       'loja'
};
function goToDashboard(key) {
  const page = DASHBOARD_PAGES[key] || 'dashboard';
  try { localStorage.setItem('activePage', page); } catch (e) {}
  buttonLink(SELLER_DASHBOARD_URL);
}

/* ── AUTH GATE ───────────────────────────────────────────────────── */
let userId = null;

function showGate(which) {
  const gate = $('authGate');
  ['gateChecking', 'gateLogin', 'gateNoStore'].forEach(id => { if ($(id)) $(id).style.display = 'none'; });
  const pane = { checking: 'gateChecking', login: 'gateLogin', noStore: 'gateNoStore' }[which];
  if ($(pane)) $(pane).style.display = 'block';
  if (gate) gate.classList.remove('hidden');
}
function hideGate() {
  const gate = $('authGate');
  if (gate) gate.classList.add('hidden');
}

/* ── SAUDAÇÃO ────────────────────────────────────────────────────── */
function greetingPeriod(date) {
  const h = (date || new Date()).getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
function initGreeting() {
  if ($('greetPeriod')) $('greetPeriod').textContent = greetingPeriod();
}
function setGreetingName(fullName) {
  const first = (fullName || '').trim().split(' ')[0];
  if ($('greetName')) $('greetName').textContent = first ? ', ' + first : '';
}

function renderSessionStoreState(status, slug, data) {
  const el = $('storeStatus'), txt = $('storeStatusText');
  if (!el || !txt) return;
  const safeStatus = (status || 'pendente').toLowerCase().trim();
  const isActive = safeStatus === 'ativa' || safeStatus === 'active';
  el.classList.toggle('is-active', isActive);
  el.classList.toggle('is-pending', !isActive);
  txt.textContent = isActive ? 'Loja ativa' : 'Loja em análise';
  const link = document.querySelector('.store-card .store-link');
  if (link && data && data.nome_loja) link.title = data.nome_loja;
}

async function fetchInitialStoreStatus() {
  if (!userId) return null;
  try {
    const { data, error } = await supabaseClient
      .from('lojas')
      .select('id, status, slug_url, nome_loja')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar status da loja:', error);
      renderSessionStoreState('pendente', '');
      return { failed: true };
    }
    if (data) {
      renderSessionStoreState(data.status, data.slug_url, data);
      return data;
    }
    return null;
  } catch (err) {
    console.error('Erro inesperado ao carregar loja:', err);
    renderSessionStoreState('pendente', '');
    return { failed: true };
  }
}

function subscribeToStoreStatus() {
  if (!userId) return;
  supabaseClient
    .channel('store-status-channel')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'lojas', filter: `user_id=eq.${userId}` },
      (payload) => {
        const novoStatus = payload.new.status;
        renderSessionStoreState(novoStatus, payload.new.slug_url, payload.new);
        if (novoStatus === 'ativa' || novoStatus === 'active') {
          toast('Sua loja foi ativada e já está no ar! 🎉', 'ok');
        }
      })
    .subscribe();
}

/* ── PERFIL (mesma consulta do script.js) ────────────────────────── */
async function loadProfile(user) {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles').select('*').eq('id', user.id).single();
  if (profileError || !profile) return;

  const fullName = profile.full_name || '';
  if ($('accSidebarName')) $('accSidebarName').textContent = fullName || 'Cliente';
  if ($('accSidebarEmail')) $('accSidebarEmail').textContent = user.email || '';
  setGreetingName(fullName);

  if (profile.avatar_url) {
    if ($('accSidebarAvatar')) $('accSidebarAvatar').src = profile.avatar_url;
    const headerImage = $('headerAvatar');
    if (headerImage) headerImage.src = profile.avatar_url;
  }
}

const EMPTY_SUMMARY = {
  notifications: null,
  revenue:    { value: null, delta: null, series: [] },
  salesToday: { value: null, delta: null, series: [] },
  salesTotal: { value: null, delta: null, series: [] },
  reviews:    { value: null, count: null, delta: null, series: [] },
  performance: {
    score: null,
    conversion: { delta: null },
    response:   { value: null, delta: null },
    onTime:     { value: null, delta: null },
    cancel:     { value: null, delta: null },
    trend: []
  }
};

const DEMO_SUMMARY = {
  notifications: 3,
  revenue:    { value: 4892.37, delta: { change: 12.5, unit: '%', positiveIsGood: true }, series: [3,5,4,7,6,8,9] },
  salesToday: { value: 48,      delta: { change: 20,   unit: '%', positiveIsGood: true }, series: [6,5,7,6,8,7,9] },
  salesTotal: { value: 1248,    delta: { change: 8.3,  unit: '%', positiveIsGood: true }, series: [12,13,11,14,13,15,14] },
  reviews:    { value: 4.8, count: 892, delta: { change: 0.2, unit: '', positiveIsGood: true }, series: [4,5,4,5,5,5,5] },
  performance: {
    score: 96,
    conversion: { delta: { change: 2, unit: '%', positiveIsGood: true } },
    response:   { value: '1h 24min', delta: { change: 32,  unit: '%', positiveIsGood: true } },
    onTime:     { value: 96,        delta: { change: 2,   unit: '%', positiveIsGood: true } },
    cancel:     { value: 1.2,       delta: { change: -0.8, unit: '%', positiveIsGood: false } },
    trend: [0,31,27,53,56,95,95,116]
  }
};

const fmtBRL = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtInt = n => Number(n).toLocaleString('pt-BR');
const fmtDec = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
function orDash(v, fn) { return (v === null || v === undefined) ? '—' : fn(v); }

function setDelta(id, d) {
  const el = $(id);
  if (!el) return;
  el.textContent = '';
  if (!d || typeof d.change !== 'number') { el.textContent = '—'; el.className = 'delta is-empty'; return; }
  const up = d.change >= 0;
  const good = up === (d.positiveIsGood !== false);
  el.className = 'delta ' + (good ? 'is-good' : 'is-bad');
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-arrow-' + (up ? 'up' : 'down');
  icon.setAttribute('aria-hidden', 'true');
  el.append(icon, document.createTextNode((up ? '+' : '-') + fmtDec(Math.abs(d.change)) + (d.unit === undefined ? '%' : d.unit)));
}

function sparkPoints(d, h) {
  const max = Math.max(...d), min = Math.min(...d);
  const base = h - 4, amp = h - 8;
  return d.map((v, j) => [j * (100 / (d.length - 1)), base - ((v - min) / (max - min || 1)) * amp]);
}
function smoothPath(p) {
  let out = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return out;
}
function renderSpark(el, d, h, opts) {
  if (!el) return;
  opts = opts || {};
  if (!Array.isArray(d) || d.length < 2) { el.innerHTML = ''; el.classList.add('is-empty'); return; }
  el.classList.remove('is-empty');
  const uid = (el.id || 'sp') + '-g';
  const pts = sparkPoints(d, h);
  const line = smoothPath(pts);
  const dotIdx = opts.dots === 'all' ? pts.map((_, i) => i).slice(1) : [pts.length - 1];
  const dots = dotIdx.map(i => `<i class="spark-dot" style="left:${pts[i][0]}%;top:${(pts[i][1] / h) * 100}%"></i>`).join('');
  el.innerHTML = `<svg viewBox="0 0 100 ${h}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="${uid}f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${h}"><stop offset="0" stop-color="currentColor" stop-opacity=".24"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
      <linearGradient id="${uid}s" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="${opts.fade ? .25 : 1}"/><stop offset=".4" stop-color="currentColor" stop-opacity="1"/></linearGradient>
    </defs>
    <path d="${line} L100,${h} L0,${h} Z" fill="url(#${uid}f)"/>
    <path d="${line}" fill="none" stroke="url(#${uid}s)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>${dots}`;
}
function buildSparklines(datas) {
  (datas || []).forEach((d, i) => renderSpark($('spark' + (i + 1)), d, 32));
}

function renderDonut(score) {
  const C = 2 * Math.PI * 42;
  const val = $('donutVal');
  const has = typeof score === 'number';
  if (val) val.setAttribute('stroke-dasharray', has ? `${(Math.max(0, Math.min(100, score)) / 100) * C} ${C}` : `0 ${C}`);
  setText('donutText', has ? Math.round(score) + '%' : '—');
  const donut = $('donut');
  if (donut) donut.setAttribute('aria-label', has ? `Desempenho geral da loja: ${Math.round(score)}%` : 'Desempenho geral da loja: sem dados');
}

function setBellBadge(n) {
  const b = $('bellBadge');
  if (!b) return;
  const has = typeof n === 'number' && n > 0;
  b.hidden = !has;
  if (has) b.textContent = n > 9 ? '9+' : String(n);
}

function applySessionSummary(s) {
  s = s || EMPTY_SUMMARY;
  setText('valRevenue', orDash(s.revenue.value, fmtBRL));
  setText('valToday',   orDash(s.salesToday.value, fmtInt));
  setText('valTotal',   orDash(s.salesTotal.value, fmtInt));
  setText('valReviews', s.reviews.value === null ? '—' : fmtDec(s.reviews.value));
  if ($('valReviewsStar')) $('valReviewsStar').hidden = s.reviews.value === null;
  setText('valReviewsCount', s.reviews.count === null ? '' : `(${fmtInt(s.reviews.count)} avaliações)`);

  setDelta('dltRevenue', s.revenue.delta);
  setDelta('dltToday',   s.salesToday.delta);
  setDelta('dltTotal',   s.salesTotal.delta);
  setDelta('dltReviews', s.reviews.delta);

  buildSparklines([s.revenue.series, s.salesToday.series, s.salesTotal.series, s.reviews.series]);

  const p = s.performance;
  renderDonut(p.score);
  setDelta('dltConv', p.conversion.delta);
  setText('valResponse', orDash(p.response.value, v => v));
  setDelta('dltResponse', p.response.delta);
  setText('valOnTime', orDash(p.onTime.value, v => fmtDec(v) + '%'));
  setDelta('dltOnTime', p.onTime.delta);
  setText('valCancel', orDash(p.cancel.value, v => fmtDec(v) + '%'));
  setDelta('dltCancel', p.cancel.delta);
  renderSpark($('perfTrend'), p.trend, 32, { dots: 'all', fade: true });
  setBellBadge(s.notifications);
}

async function loadSessionSummary() {
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';
  if ($('demoTag')) $('demoTag').hidden = !demo;
  applySessionSummary(demo ? DEMO_SUMMARY : EMPTY_SUMMARY);
}
window.applySessionSummary = applySessionSummary;

/* ── BOOTSTRAP ───────────────────────────────────────────────────── */
async function bootSession() {
  showGate('checking');
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (!user || userError) {
      console.warn('User session not active.');
      showGate('login');
      return;
    }
    userId = user.id;

    const store = await fetchInitialStoreStatus();
    if (store === null) {
      console.warn('Usuário autenticado, mas não possui loja.');
      showGate('noStore');
      return;
    }

    hideGate();
    subscribeToStoreStatus();
    await loadProfile(user);
    await loadSessionSummary();
  } catch (err) {
    console.error('Erro ao iniciar o resumo:', err);
    showGate('login');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initThemeToggle();
  initGreeting();
  applySessionSummary(EMPTY_SUMMARY);
  bootSession();
});
