/* ── FORMAT HELPERS ──────────────────────────────────────────────── */
function fmtNumber(n) { return Number(n).toLocaleString('pt-BR'); }
function fmtBRL(n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtPercent(n) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }

/* ── THEME (same convention as /affiliates) ─────────────────────── */
function systemPrefersDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function effectiveTheme(pref) { return pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref; }
function updateThemeSwitchUI(pref) {
  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.setAttribute('aria-checked', String(btn.dataset.themeChoice === pref));
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
  if (!opts.silent) window.setTimeout(function () { root.classList.remove('theme-transition'); }, 420);
}
function initTheme() {
  updateThemeSwitchUI(document.documentElement.getAttribute('data-theme-pref') || 'auto');
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      if (pref === 'auto') applyTheme('auto');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
}
function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () { applyTheme(btn.dataset.themeChoice); });
  });
}

/* ── SCROLL REVEAL ───────────────────────────────────────────────── */
function initScrollAnimations() {
  var targets = document.querySelectorAll('.io-reveal');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach(function (el) { el.classList.add('in'); }); return; }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  targets.forEach(function (el) { observer.observe(el); });
}

/* ── BACK-TO-TOP ─────────────────────────────────────────────────── */
function initHeader() {
  var backTop = document.getElementById('backTop');
  if (!backTop) return;
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      backTop.classList.toggle('visible', window.scrollY > 420);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── GLOBAL COMPONENT SHIMS (same convention as /affiliates) ─────── */
function defineFallback(name, fn) { if (typeof window[name] !== 'function') window[name] = fn; }
var SIDEBAR_IDS = {
  cart: ['cartSidebar', 'cartOverlay'], fav: ['favSidebar', 'favOverlay'],
  notif: ['notifSidebar', 'notifOverlay'], more: ['moreSidebar', 'moreOverlay'], acc: ['accSidebar', 'accOverlay']
};
function closeAllSidebars() {
  Object.keys(SIDEBAR_IDS).forEach(function (key) {
    var ids = SIDEBAR_IDS[key];
    var sb = document.getElementById(ids[0]), ov = document.getElementById(ids[1]);
    if (sb) { sb.classList.remove('on'); sb.setAttribute('aria-hidden', 'true'); }
    if (ov) ov.classList.remove('on');
  });
}
function openSidebar(key) {
  var ids = SIDEBAR_IDS[key]; if (!ids) return;
  closeAllSidebars();
  var sb = document.getElementById(ids[0]), ov = document.getElementById(ids[1]);
  if (sb) { sb.classList.add('on'); sb.setAttribute('aria-hidden', 'false'); }
  if (ov) ov.classList.add('on');
  document.body.classList.add('nobodyscroll');
}
function closeSidebar(key) {
  var ids = SIDEBAR_IDS[key]; if (!ids) return;
  var sb = document.getElementById(ids[0]), ov = document.getElementById(ids[1]);
  if (sb) { sb.classList.remove('on'); sb.setAttribute('aria-hidden', 'true'); }
  if (ov) ov.classList.remove('on');
  document.body.classList.remove('nobodyscroll');
}
function initGlobalShims() {
  defineFallback('openCart', function () { openSidebar('cart'); });
  defineFallback('closeCart', function () { closeSidebar('cart'); });
  defineFallback('openFav', function () { openSidebar('fav'); });
  defineFallback('closeFav', function () { closeSidebar('fav'); });
  defineFallback('openNotif', function () { openSidebar('notif'); });
  defineFallback('closeNotif', function () { closeSidebar('notif'); });
  defineFallback('openMore', function () { openSidebar('more'); });
  defineFallback('closeMore', function () { closeSidebar('more'); });
  defineFallback('openAcc', function () { openSidebar('acc'); });
  defineFallback('closeAcc', function () { closeSidebar('acc'); });
  defineFallback('goToLogin', function (redirect) {
    var path = redirect || window.location.pathname;
    window.location.href = '/login?redirect=' + encodeURIComponent(path);
  });
  defineFallback('buttonLink', function (path) {
    closeAllSidebars(); document.body.classList.remove('nobodyscroll'); window.location.href = path;
  });
  defineFallback('openConfirmLogout', function () {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.signOut().finally(function () { window.location.href = '/'; });
      } else { window.location.href = '/logout'; }
    }
  });
  defineFallback('checkout', function () { window.location.href = '/checkout'; });
  defineFallback('addAllFavToCart', function () {});

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Object.keys(SIDEBAR_IDS).forEach(function (key) {
      var sb = document.getElementById(SIDEBAR_IDS[key][0]);
      if (sb && sb.classList.contains('on')) closeSidebar(key);
    });
    var menu = document.getElementById('periodMenu');
    if (menu && document.getElementById('periodSelect').classList.contains('open')) closePeriodMenu();
  });
}

/* ── TOAST ───────────────────────────────────────────────────────── */
function showToast(message) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(function () { toast.classList.remove('show'); }, 2600);
}

/* ── AUTH GATE ───────────────────────────────────────────────────── */
function createAffiliateLink() {
  // integrar posteriormente
}
window.createAffiliateLink = createAffiliateLink;

async function checkSession() {
  var gate = document.getElementById('authGate');
  var main = document.getElementById('dashboardMain');
  try {
    if (!window.supabaseClient || !window.supabaseClient.auth) throw new Error('Supabase indisponível');
    var res = await window.supabaseClient.auth.getSession();
    var session = res && res.data ? res.data.session : null;
    if (!session) {
      window.goToLogin('/affiliate/dashboard');
      return;
    }
    window.userId = session.user ? session.user.id : null;
    var name = (session.user && (session.user.user_metadata && session.user.user_metadata.full_name)) || (session.user && session.user.email) || '';
    var greeting = document.getElementById('dashGreeting');
    if (greeting) greeting.textContent = name ? ('Olá, ' + name.split(' ')[0].split('@')[0] + ' 👋') : 'Olá 👋';

    gate.hidden = true;
    main.hidden = false;

    // Cada seção carrega seus próprios dados de forma independente.
    loadAffiliateStats('30d');
    loadAffiliateLinks();
    loadRecentActivity();
    loadCommissionSummary();

    if (window.supabaseClient.auth.onAuthStateChange) {
      window.supabaseClient.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') window.goToLogin('/affiliate/dashboard');
      });
    }
  } catch (err) {
    console.warn('Não foi possível verificar a sessão:', err);
    window.goToLogin('/affiliate/dashboard');
  }
}

/* ── MOCK DATA (arquitetura pronta para consultas reais ao Supabase) ─
   Cada objeto representa o formato esperado vindo do backend; as
   funções loadX() hoje geram esses objetos localmente com um atraso
   simulado, mas já retornam/preenchem no formato final. */
var affiliateStats = null;
var affiliateLinks = null;
var affiliateActivity = null;
var commissionSummary = null;

var PERIOD_KPI_BASE = {
  '7d':     { clicks: 312,   conversions: 24,   sales: 15,  activeLinks: 14 },
  '30d':    { clicks: 1284,  conversions: 96,   sales: 62,  activeLinks: 14 },
  '90d':    { clicks: 3820,  conversions: 289,  sales: 176, activeLinks: 14 },
  'year':   { clicks: 14950, conversions: 1104, sales: 640, activeLinks: 14 },
  'custom': { clicks: 1284,  conversions: 96,   sales: 62,  activeLinks: 14 }
};
var PERIOD_LABELS = { '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', 'year': 'Este ano', 'custom': 'Personalizado' };
var AVG_TICKET = 124.90;

function pseudoRand(seed) { var x = Math.sin(seed * 999.123) * 10000; return x - Math.floor(x); }

function buildPeriodPoints(period) {
  var months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var points = [];
  if (period === '7d') {
    var now = new Date();
    for (var i = 6; i >= 0; i--) { var d = new Date(now); d.setDate(d.getDate() - i); points.push({ label: d.getDate() + ' ' + months[d.getMonth()] }); }
  } else if (period === '90d') {
    for (var w = 1; w <= 12; w++) points.push({ label: 'Sem ' + w });
  } else if (period === 'year') {
    for (var m = 0; m < 12; m++) points.push({ label: months[m] });
  } else {
    var now2 = new Date();
    for (var j = 27; j >= 0; j -= 3) { var d2 = new Date(now2); d2.setDate(d2.getDate() - j); points.push({ label: d2.getDate() + ' ' + months[d2.getMonth()] }); }
  }
  return points;
}

function buildSeries(period, metric) {
  var points = buildPeriodPoints(period);
  var base = PERIOD_KPI_BASE[period] || PERIOD_KPI_BASE['30d'];
  var totals = { clicks: base.clicks, conversions: base.conversions, sales: base.sales, commission: 0 };
  if (metric === 'commission') return points.map(function (p) { return { label: p.label, value: 0 }; });

  var avg = totals[metric] / points.length;
  return points.map(function (p, idx) {
    var trend = 0.55 + (idx / Math.max(1, points.length - 1)) * 0.9;
    var noise = 0.75 + pseudoRand(idx * 13 + metric.length * 7) * 0.5;
    var value = Math.max(0, Math.round(avg * trend * noise));
    return { label: p.label, value: value };
  });
}

/* ── OVERVIEW: KPIs + chart ──────────────────────────────────────── */
var currentPeriod = '30d';
var currentMetric = 'clicks';

async function loadAffiliateStats(period) {
  currentPeriod = period;
  document.querySelectorAll('.dkpi-row .dkpi-value, .perf-grid .perf-value').forEach(function (el) {
    el.classList.add('skeleton-value'); el.textContent = '\u00A0';
  });

  // Simula a latência de uma consulta real ao Supabase.
  await new Promise(function (resolve) { window.setTimeout(resolve, 420); });

  var base = PERIOD_KPI_BASE[period] || PERIOD_KPI_BASE['30d'];
  affiliateStats = {
    period: period,
    clicks: base.clicks,
    conversions: base.conversions,
    sales: base.sales,
    commission: 0, // percentual de comissão ainda não definido
    activeLinks: base.activeLinks,
    conversionRate: base.clicks ? (base.conversions / base.clicks) * 100 : 0,
    avgTicket: AVG_TICKET,
    earningsPerClick: 0, // depende do percentual de comissão, ainda não definido
    totalSales: base.sales
  };

  renderKpis(affiliateStats);
  renderPerformance(affiliateStats);
  renderChart(currentPeriod, currentMetric);

  var periodLabel = document.getElementById('periodLabel');
  if (periodLabel) periodLabel.textContent = PERIOD_LABELS[period] || period;
}

function renderKpis(stats) {
  var map = {
    clicks: fmtNumber(stats.clicks),
    conversions: fmtNumber(stats.conversions),
    sales: fmtNumber(stats.sales),
    commission: fmtBRL(stats.commission),
    activeLinks: fmtNumber(stats.activeLinks)
  };
  Object.keys(map).forEach(function (key) {
    var el = document.querySelector('.dkpi-value[data-kpi="' + key + '"]');
    if (!el) return;
    el.classList.remove('skeleton-value');
    el.textContent = map[key];
  });
}

function renderPerformance(stats) {
  var map = {
    conversionRate: fmtPercent(stats.conversionRate),
    avgTicket: fmtBRL(stats.avgTicket),
    earningsPerClick: fmtBRL(stats.earningsPerClick),
    totalSales: fmtNumber(stats.totalSales)
  };
  Object.keys(map).forEach(function (key) {
    var el = document.querySelector('.perf-value[data-perf="' + key + '"]');
    if (!el) return;
    el.classList.remove('skeleton-value');
    el.textContent = map[key];
  });
}

/* ── CHART (SVG puro, sem bibliotecas) ───────────────────────────── */
var CHART_W = 760, CHART_H = 220, CHART_PAD_L = 8, CHART_PAD_R = 8, CHART_PAD_T = 16, CHART_PAD_B = 26;

function renderChart(period, metric) {
  var svg = document.getElementById('chartSvg');
  var tbody = document.getElementById('chartDataBody');
  if (!svg) return;

  var series = buildSeries(period, metric);
  var values = series.map(function (p) { return p.value; });
  var max = Math.max.apply(null, values.concat([1]));
  var min = 0;
  var innerW = CHART_W - CHART_PAD_L - CHART_PAD_R;
  var innerH = CHART_H - CHART_PAD_T - CHART_PAD_B;

  function xAt(i) { return CHART_PAD_L + (series.length === 1 ? innerW / 2 : (innerW * i) / (series.length - 1)); }
  function yAt(v) { return CHART_PAD_T + innerH - ((v - min) / (max - min || 1)) * innerH; }

  var linePts = series.map(function (p, i) { return xAt(i) + ',' + yAt(p.value); }).join(' ');
  var areaPts = linePts + ' ' + xAt(series.length - 1) + ',' + (CHART_PAD_T + innerH) + ' ' + xAt(0) + ',' + (CHART_PAD_T + innerH);

  var gridLines = '';
  for (var g = 0; g <= 3; g++) {
    var gy = CHART_PAD_T + (innerH * g) / 3;
    gridLines += '<line x1="' + CHART_PAD_L + '" y1="' + gy + '" x2="' + (CHART_W - CHART_PAD_R) + '" y2="' + gy + '"/>';
  }

  var dots = series.map(function (p, i) {
    var x = xAt(i), y = yAt(p.value);
    return '<circle class="chart-dot" tabindex="0" cx="' + x + '" cy="' + y + '" r="3.5" ' +
      'data-x="' + x + '" data-y="' + y + '" data-label="' + p.label + '" data-value="' + p.value + '" ' +
      'aria-label="' + p.label + ': ' + p.value + '"></circle>';
  }).join('');

  var showEveryNth = series.length > 10 ? Math.ceil(series.length / 8) : 1;
  var axisLabels = series.map(function (p, i) {
    if (i % showEveryNth !== 0 && i !== series.length - 1) return '';
    return '<text x="' + xAt(i) + '" y="' + (CHART_H - 6) + '" text-anchor="middle">' + p.label + '</text>';
  }).join('');

  svg.innerHTML =
    '<g class="chart-grid">' + gridLines + '</g>' +
    '<polygon class="chart-fill" points="' + areaPts + '"></polygon>' +
    '<polyline class="chart-line" points="' + linePts + '"></polyline>' +
    '<g class="chart-axis">' + axisLabels + '</g>' +
    '<g>' + dots + '</g>';

  // Alternativa textual acessível
  if (tbody) {
    tbody.innerHTML = series.map(function (p) {
      return '<tr><td>' + p.label + '</td><td>' + p.value + '</td></tr>';
    }).join('');
  }

  bindChartTooltips();

  document.querySelectorAll('.chart-tab').forEach(function (tab) {
    var active = tab.dataset.metric === metric;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}

function bindChartTooltips() {
  var svg = document.getElementById('chartSvg');
  var wrap = document.getElementById('chartWrap');
  var tooltip = document.getElementById('chartTooltip');
  if (!svg || !tooltip) return;

  function showTip(dot) {
    var x = parseFloat(dot.getAttribute('data-x'));
    var y = parseFloat(dot.getAttribute('data-y'));
    var label = dot.getAttribute('data-label');
    var value = dot.getAttribute('data-value');
    var svgRect = svg.getBoundingClientRect();
    var wrapRect = wrap.getBoundingClientRect();
    var scaleX = svgRect.width / CHART_W;
    var scaleY = svgRect.height / CHART_H;
    tooltip.innerHTML = label + '<strong>' + fmtNumber(value) + '</strong>';
    tooltip.style.left = (svgRect.left - wrapRect.left + x * scaleX) + 'px';
    tooltip.style.top = (svgRect.top - wrapRect.top + y * scaleY) + 'px';
    tooltip.hidden = false;
  }
  function hideTip() { tooltip.hidden = true; }

  svg.querySelectorAll('.chart-dot').forEach(function (dot) {
    dot.addEventListener('mouseenter', function () { showTip(dot); });
    dot.addEventListener('mouseleave', hideTip);
    dot.addEventListener('focus', function () { showTip(dot); });
    dot.addEventListener('blur', hideTip);
    dot.addEventListener('touchstart', function (e) { e.preventDefault(); showTip(dot); }, { passive: false });
  });
  wrap.addEventListener('touchend', function (e) {
    if (!e.target.closest('.chart-dot')) hideTip();
  });
}

function initChartControls() {
  document.querySelectorAll('.chart-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentMetric = tab.dataset.metric;
      renderChart(currentPeriod, currentMetric);
    });
  });
}

/* ── PERIOD DROPDOWN ─────────────────────────────────────────────── */
function closePeriodMenu() {
  var wrap = document.getElementById('periodSelect');
  var btn = document.getElementById('periodBtn');
  if (!wrap) return;
  wrap.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function initPeriodSelect() {
  var wrap = document.getElementById('periodSelect');
  var btn = document.getElementById('periodBtn');
  var menu = document.getElementById('periodMenu');
  if (!wrap || !btn || !menu) return;

  btn.addEventListener('click', function () {
    var isOpen = wrap.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('li').forEach(function (item) {
    function select() {
      menu.querySelectorAll('li').forEach(function (li) { li.removeAttribute('aria-selected'); });
      item.setAttribute('aria-selected', 'true');
      closePeriodMenu();
      loadAffiliateStats(item.dataset.period);
    }
    item.addEventListener('click', select);
    item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  });

  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) closePeriodMenu();
  });
}

/* ── LINKS ───────────────────────────────────────────────────────── */
function statusBadge(status) {
  var map = {
    active:     { label: 'Ativo',       cls: 'badge-green' },
    pending:    { label: 'Pendente',    cls: 'badge-amber' },
    processing: { label: 'Processando', cls: 'badge-blue' },
    done:       { label: 'Concluído',   cls: 'badge-green' },
    cancelled:  { label: 'Cancelado',   cls: 'badge-red' }
  };
  var s = map[status] || map.pending;
  return '<span class="badge ' + s.cls + '">' + s.label + '</span>';
}

async function loadAffiliateLinks() {
  await new Promise(function (resolve) { window.setTimeout(resolve, 560); });

  affiliateLinks = [
    { product: 'Smartwatch X', slug: 'smartwatch-x', clicks: 248, conversions: 21, sales: 14, commission: 0, status: 'active' },
    { product: 'Fone Bluetooth Pro', slug: 'fone-bluetooth-pro', clicks: 190, conversions: 12, sales: 9, commission: 0, status: 'active' },
    { product: 'Câmera Instantânea', slug: 'camera-instantanea', clicks: 87, conversions: 5, sales: 3, commission: 0, status: 'pending' },
    { product: 'Kit Fitness Elite', slug: 'kit-fitness-elite', clicks: 0, conversions: 0, sales: 0, commission: 0, status: 'processing' }
  ];

  renderLinksTable(affiliateLinks);
  renderLinksCards(affiliateLinks);
}

function linkUrlFor(slug) { return window.location.origin + '/r/' + slug + '?ref=meu-codigo'; }

function copyAffiliateLink(slug, btn) {
  var url = linkUrlFor(slug);
  var done = function (ok) {
    if (ok) {
      var original = btn.textContent;
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      showToast('Link copiado!');
      window.setTimeout(function () { btn.textContent = original; btn.classList.remove('copied'); }, 1800);
    } else {
      showToast('Não foi possível copiar o link.');
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () { done(true); }).catch(function () { done(false); });
  } else {
    try {
      var ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      done(ok);
    } catch (e) { done(false); }
  }
}
window.copyAffiliateLink = copyAffiliateLink;

function renderLinksTable(links) {
  var tbody = document.getElementById('linksTbody');
  if (!tbody) return;
  if (!links.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">Nenhum link criado ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = links.map(function (l, i) {
    return '<tr>' +
      '<td class="link-product">' + l.product + '</td>' +
      '<td>' + fmtNumber(l.clicks) + '</td>' +
      '<td>' + fmtNumber(l.conversions) + '</td>' +
      '<td>' + fmtNumber(l.sales) + '</td>' +
      '<td>' + fmtBRL(l.commission) + '</td>' +
      '<td>' + statusBadge(l.status) + '</td>' +
      '<td><button class="copy-link-btn" data-idx="' + i + '" aria-label="Copiar link de ' + l.product + '"><i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar link</button></td>' +
      '</tr>';
  }).join('');
  tbody.querySelectorAll('.copy-link-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { copyAffiliateLink(links[+btn.dataset.idx].slug, btn); });
  });
}

function renderLinksCards(links) {
  var wrap = document.getElementById('linksCards');
  if (!wrap) return;
  if (!links.length) {
    wrap.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px;">Nenhum link criado ainda.</p>';
    return;
  }
  wrap.innerHTML = links.map(function (l, i) {
    return '<div class="link-card">' +
      '<div class="link-card-hd"><span class="link-card-title">' + l.product + '</span>' + statusBadge(l.status) + '</div>' +
      '<div class="link-card-stats">' +
        '<span><strong>' + fmtNumber(l.clicks) + '</strong> cliques</span>' +
        '<span><strong>' + fmtNumber(l.conversions) + '</strong> conversões</span>' +
        '<span><strong>' + fmtNumber(l.sales) + '</strong> vendas</span>' +
      '</div>' +
      '<div class="link-card-comm">Comissão: <strong>' + fmtBRL(l.commission) + '</strong></div>' +
      '<button class="copy-link-btn" data-idx="' + i + '" style="width:100%;justify-content:center;" aria-label="Copiar link de ' + l.product + '"><i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar link</button>' +
      '</div>';
  }).join('');
  wrap.querySelectorAll('.copy-link-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { copyAffiliateLink(links[+btn.dataset.idx].slug, btn); });
  });
}

/* ── ATIVIDADE RECENTE ───────────────────────────────────────────── */
async function loadRecentActivity() {
  await new Promise(function (resolve) { window.setTimeout(resolve, 640); });

  affiliateActivity = [
    { icon: 'circle-check', text: 'Venda atribuída ao link do Smartwatch X', time: 'Hoje, 14:32' },
    { icon: 'arrow-pointer', text: 'Novo clique no link do Fone Bluetooth Pro', time: 'Hoje, 12:05' },
    { icon: 'bullseye', text: 'Conversão registrada — Câmera Instantânea', time: 'Ontem, 19:47' },
    { icon: 'link', text: 'Link criado para Kit Fitness Elite', time: 'Ontem, 09:14' }
  ];

  renderActivity(affiliateActivity);
}

function renderActivity(items) {
  var list = document.getElementById('activityList');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<li class="activity-empty">Nenhuma atividade por enquanto.</li>';
    return;
  }
  list.innerHTML = items.map(function (a) {
    return '<li class="activity-item">' +
      '<span class="activity-icon"><i class="fa-solid fa-' + a.icon + '" aria-hidden="true"></i></span>' +
      '<div class="activity-body"><p class="activity-desc">' + a.text + '</p><p class="activity-time">' + a.time + '</p></div>' +
      '</li>';
  }).join('');
}

/* ── RESUMO DE COMISSÕES ─────────────────────────────────────────── */
async function loadCommissionSummary() {
  await new Promise(function (resolve) { window.setTimeout(resolve, 500); });

  // Percentuais e regras de comissão ainda não definidos — todos os
  // valores permanecem zerados até a integração real com o Supabase.
  commissionSummary = { available: 0, pending: 0, total: 0 };
  renderCommission(commissionSummary);
}

function renderCommission(summary) {
  var map = { available: summary.available, pending: summary.pending, total: summary.total };
  Object.keys(map).forEach(function (key) {
    var el = document.querySelector('.comm-row .val[data-comm="' + key + '"]');
    if (!el) return;
    el.classList.remove('skeleton-value');
    el.textContent = fmtBRL(map[key]);
  });
}

/* ── BOOTSTRAP ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initGlobalShims();
  initTheme();
  initThemeToggle();
  initScrollAnimations();
  initHeader();
  initChartControls();
  initPeriodSelect();
  checkSession();
});
