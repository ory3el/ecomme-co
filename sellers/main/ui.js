/* ═══════════════════════════════════════════════════════════════════
   ECOMME SELLERS · PAINEL — camada de interface (carregado DEPOIS do script.js)
   Responsabilidade: comportamento visual do shell e do dashboard.
   NÃO fala com o Supabase: só lê os dados que o script.js já carregou
   (PRODS, ORDERS, ordersModule) e chama as funções dele (navigate,
   loadMyProducts, loadOrders, loadFinance, onProdSearch, editProduct…).
   Índice: 1 Sidebar · 2 Busca global · 3 Tabelas e menus · 4 Dashboard · 5 Init
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = (s, r) => (r || document).querySelector(s);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const safe = fn => function () { try { return fn.apply(this, arguments); } catch (e) { console.error('[ui.js]', e); } };
  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const brl = n => (typeof fmtBRL === 'function' ? fmtBRL(n) : Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  const prods = () => (typeof PRODS !== 'undefined' && Array.isArray(PRODS)) ? PRODS : [];
  const orders = () => (typeof ORDERS !== 'undefined' && Array.isArray(ORDERS)) ? ORDERS : [];
  const ordersOk = () => typeof ordersModule !== 'undefined' && ordersModule === 'ok';
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const VALID = ['pending', 'transit', 'delivered'];
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const shell = $('appShell');
  const sidebar = $('appSidebar');
  const mqDrawer = window.matchMedia('(max-width:860px)');

  /* ── 1. SIDEBAR ──────────────────────────────────────────────── */
  const SB_KEY = 'ecomme-sb-collapsed';
  function setCollapsed(on, persist) {
    shell.classList.toggle('sb-collapsed', on);
    const t = $('sbToggle');
    if (t) { t.setAttribute('aria-expanded', String(!on)); t.setAttribute('aria-label', on ? 'Expandir menu' : 'Recolher menu'); }
    qsa('.nav-btn, .sb-user', sidebar).forEach(b => {
      if (on) b.title = (qs('.nav-lbl', b) || qs('.sb-user-txt strong', b) || {}).textContent || '';
      else b.removeAttribute('title');
    });
    if (persist) LS.set(SB_KEY, on ? '1' : '0');
  }
  function openDrawer() {
    sidebar.classList.add('is-open');
    $('sbScrim').classList.add('on');
    const b = $('sbOpen'); if (b) b.setAttribute('aria-expanded', 'true');
    const first = qs('.nav-btn.on', sidebar) || qs('.nav-btn', sidebar);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 320);
  }
  function closeDrawer() {
    sidebar.classList.remove('is-open');
    $('sbScrim').classList.remove('on');
    const b = $('sbOpen'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  function initSidebar() {
    const stored = LS.get(SB_KEY);
    const narrowDesktop = window.innerWidth > 860 && window.innerWidth < 1180;
    setCollapsed(stored === null ? narrowDesktop : stored === '1', false);
    $('sbToggle').addEventListener('click', () => setCollapsed(!shell.classList.contains('sb-collapsed'), true));
    $('sbOpen').addEventListener('click', openDrawer);
    $('sbScrim').addEventListener('click', closeDrawer);
    const mobMenu = $('mob-menu'); if (mobMenu) mobMenu.addEventListener('click', openDrawer);
    mqDrawer.addEventListener('change', e => { if (!e.matches) closeDrawer(); });

    // submenus
    qsa('.nav-grp-btn').forEach(btn => btn.addEventListener('click', () => {
      const g = btn.closest('.nav-group');
      const open = !g.classList.contains('open');
      g.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    }));

    // item ativo → aria-current, grupo aberto e gaveta fechada (navegação pode vir de qualquer lugar do script.js)
    const sync = () => {
      qsa('.nav-btn[data-page], .mob-btn[data-page]').forEach(b => {
        if (b.classList.contains('on')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      });
      qsa('.nav-group', sidebar).forEach(g => {
        const has = !!qs('.nav-btn.on', g);
        g.classList.toggle('has-on', has);
        if (has && !g.classList.contains('open')) { g.classList.add('open'); qs('.nav-grp-btn', g).setAttribute('aria-expanded', 'true'); }
      });
    };
    const mo = new MutationObserver(muts => {
      if (!muts.some(m => m.target.matches && m.target.matches('.nav-btn, .mob-btn'))) return;
      sync();
      if (mqDrawer.matches && sidebar.classList.contains('is-open')) closeDrawer();
    });
    qsa('.nav-btn, .mob-btn').forEach(b => mo.observe(b, { attributes: true, attributeFilter: ['class'] }));
    sync();
  }

  /* ── 2. BUSCA GLOBAL (somente dados já carregados) ───────────── */
  const PAGES = [
    ['dashboard', 'Dashboard', 'chart-pie'], ['produtos', 'Meus Produtos', 'box-open'], ['novo-produto', 'Novo Produto', 'plus'],
    ['pedidos', 'Pedidos', 'truck-fast'], ['financas', 'Financeiro', 'sack-dollar'], ['config', 'Configurações da loja', 'gear'], ['loja', 'Minha Loja', 'store']
  ];
  let gsItems = [], gsSel = -1;

  function gsBuild(q) {
    const n = norm(q.trim());
    const out = [];
    const pages = PAGES.filter(p => !n || norm(p[1]).includes(n));
    if (pages.length) out.push({ group: n ? 'Páginas' : 'Ir para', items: pages.slice(0, n ? 3 : 7).map(p => ({ kind: 'page', id: p[0], icon: p[2], title: p[1], sub: 'Abrir página' })) });
    if (n) {
      const ps = prods().filter(p => norm(p.name).includes(n) || norm(p.id).includes(n) || norm(p.sku).includes(n)).slice(0, 5);
      if (ps.length) out.push({ group: 'Produtos', items: ps.map(p => ({ kind: 'prod', id: p.id, icon: 'box-open', title: p.name, sub: `${brl(p.price)} · ID ${p.id}` })) });
      const os = orders().filter(o => norm(o.code).includes(n) || norm(o.customer_name).includes(n) || (o.store_order_items || []).some(it => norm(it.name).includes(n))).slice(0, 5);
      if (os.length) out.push({ group: 'Pedidos', items: os.map(o => ({ kind: 'order', id: o.id, icon: 'receipt', title: `#${o.code} · ${o.customer_name || 'Cliente'}`, sub: brl(o.total) })) });
    }
    return out;
  }
  function gsRender() {
    const box = $('gsResults'), input = $('gSearchInput');
    const groups = gsBuild(input.value);
    gsItems = [];
    if (!groups.length) box.innerHTML = '<div class="gs-empty">Nada encontrado. Tente outro termo.</div>';
    else box.innerHTML = groups.map(g => `<div class="gs-grp">${esc(g.group)}</div>` + g.items.map(it => {
      const i = gsItems.push(it) - 1;
      return `<button type="button" class="gs-item" role="option" data-i="${i}"><i class="fa-solid fa-${it.icon}"></i><span><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></span></button>`;
    }).join('')).join('');
    gsSel = -1;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function gsClose() { const b = $('gsResults'); if (b) b.hidden = true; $('gSearchInput').setAttribute('aria-expanded', 'false'); gsSel = -1; }
  function gsMark(i) {
    const els = qsa('.gs-item', $('gsResults'));
    els.forEach((e, k) => e.classList.toggle('sel', k === i));
    if (els[i]) els[i].scrollIntoView({ block: 'nearest' });
    gsSel = i;
  }
  function gsGo(it) {
    gsClose(); $('gSearchInput').blur(); $('gSearchInput').value = '';
    if (it.kind === 'page') {
      if (typeof navigate === 'function' && navigate(it.id) && it.id === 'novo-produto' && typeof clearProductForm === 'function') clearProductForm();
    } else if (it.kind === 'prod') {
      if (navigate('produtos')) {
        const s = $('prodSearch'); const p = prods().find(x => String(x.id) === String(it.id));
        if (s && p) { s.value = p.name; if (typeof onProdSearch === 'function') onProdSearch(s); }
      }
    } else if (it.kind === 'order') {
      if (!navigate('pedidos')) return;
      const all = qs('.order-filter-tabs .stab[data-filter="all"]'); if (all) all.click();
      setTimeout(() => {
        const d = $('ord-details-' + it.id); if (!d) return;
        d.style.display = 'block';
        const card = d.closest('.ord'); card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 60);
    }
  }
  function initSearch() {
    const input = $('gSearchInput'), box = $('gsResults');
    input.addEventListener('focus', gsRender);
    input.addEventListener('input', gsRender);
    input.addEventListener('keydown', e => {
      const n = gsItems.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (box.hidden) gsRender(); gsMark((gsSel + 1) % Math.max(n, 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); gsMark((gsSel - 1 + n) % Math.max(n, 1)); }
      else if (e.key === 'Enter') { const it = gsItems[gsSel >= 0 ? gsSel : 0]; if (it) { e.preventDefault(); gsGo(it); } }
      else if (e.key === 'Escape') { gsClose(); input.blur(); }
    });
    box.addEventListener('mousedown', e => e.preventDefault());           // não perde o foco antes do clique
    box.addEventListener('click', e => { const b = e.target.closest('.gs-item'); if (b) gsGo(gsItems[+b.dataset.i]); });
    input.addEventListener('blur', () => setTimeout(gsClose, 120));
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !(document.activeElement || {}).isContentEditable) {
        e.preventDefault(); input.focus();
      }
    });
  }

  /* ── 3. TABELAS RESPONSIVAS, MENUS E ACESSIBILIDADE ──────────── */
  function labelTable(t) {
    const heads = qsa('thead th', t).map(th => th.textContent.trim());
    qsa('tbody tr', t).forEach(tr => {
      if (tr.classList.contains('empty-row')) return;
      Array.from(tr.children).forEach((td, i) => { const l = heads[i] || ''; if (td.getAttribute('data-label') !== l) td.setAttribute('data-label', l); });
    });
  }
  function initTables() {
    qsa('table.rt').forEach(t => {
      const body = qs('tbody', t); if (!body) return;
      labelTable(t);
      new MutationObserver(() => labelTable(t)).observe(body, { childList: true });
    });
    // menu de ações: posição fixa (não é cortado pelo overflow da tabela) e inverte perto da borda
    document.addEventListener('click', e => {
      const dots = e.target.closest('.action-dots'); if (!dots) return;
      requestAnimationFrame(() => {
        const m = qs('.action-menu', dots); if (!m || !m.classList.contains('on')) return;
        const r = dots.getBoundingClientRect(), h = m.offsetHeight || 190, w = m.offsetWidth || 190;
        const up = r.bottom + h + 12 > window.innerHeight && r.top > h + 12;
        m.style.position = 'fixed';
        m.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
        m.style.top = (up ? r.top - h - 6 : r.bottom + 6) + 'px';
        m.style.right = 'auto'; m.style.bottom = 'auto';
      });
    }, true); // captura: o toggleMenu() do script.js usa stopPropagation()
    const main = $('appMain');
    main.addEventListener('scroll', () => qsa('.action-menu.on').forEach(m => m.classList.remove('on')), { passive: true });
    document.addEventListener('keydown', e => {
      const t = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('.action-dots, .stab')) { e.preventDefault(); t.click(); }
      if (e.key === 'Escape') {
        qsa('.action-menu.on').forEach(m => m.classList.remove('on'));
        if (qs('#moreSidebar.on') && typeof closeMore === 'function') closeMore();
        if (qs('#accSidebar.on') && typeof closeAcc === 'function') closeAcc();
        if (sidebar.classList.contains('is-open')) closeDrawer();
      }
    });
    qsa('.stab').forEach(s => { s.tabIndex = 0; s.setAttribute('role', 'button'); });
    // painéis laterais: aria-hidden acompanha o estado aberto/fechado
    const more = $('moreSidebar');
    if (more) new MutationObserver(() => more.setAttribute('aria-hidden', String(!more.classList.contains('on')))).observe(more, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── 4. DASHBOARD ────────────────────────────────────────────── */
  const dash = { period: LS.get('ecomme-dash-period') || '30d', metric: 'rev', table: false, ready: false, last: null, busy: false, hover: null };
  if (!['7d', '30d', '90d', '12m'].includes(dash.period)) dash.period = '30d';
  const ST = [['pending', 'Aguardando despacho', 'clock'], ['transit', 'Em trânsito', 'truck-fast'], ['delivered', 'Entregues', 'circle-check'], ['returned', 'Devoluções', 'rotate-left']];

  /* períodos → baldes (dias ou meses) */
  function buckets(period) {
    const now = new Date(), out = { keys: [], labels: [], tips: [], monthly: period === '12m', start: null };
    if (out.monthly) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.keys.push(d.getFullYear() + '-' + d.getMonth());
        out.labels.push(MONTHS[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''));
        out.tips.push(d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
      }
      out.start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
      const n = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        out.keys.push(d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate());
        out.labels.push(String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'));
        out.tips.push(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
        if (i === n - 1) out.start = d;
      }
    }
    return out;
  }
  const keyOf = (d, monthly) => monthly ? d.getFullYear() + '-' + d.getMonth() : d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  const validOrders = () => orders().filter(o => VALID.includes(o.status));

  function periodData() {
    const b = buckets(dash.period);
    const rev = new Array(b.keys.length).fill(0), cnt = new Array(b.keys.length).fill(0);
    const idx = new Map(b.keys.map((k, i) => [k, i]));
    const inPeriod = [];
    validOrders().forEach(o => {
      const d = new Date(o.created_at); if (isNaN(d) || d < b.start) return;
      const i = idx.get(keyOf(d, b.monthly)); if (i === undefined) return;
      rev[i] += Number(o.total) || 0; cnt[i]++; inPeriod.push(o);
    });
    return { b, rev, cnt, inPeriod, totalRev: rev.reduce((a, c) => a + c, 0), totalCnt: cnt.reduce((a, c) => a + c, 0) };
  }

  /* curva monótona (não "estoura" abaixo de zero) */
  function monoPath(p) {
    const n = p.length; if (n < 2) return '';
    const dx = [], m = [], t = new Array(n);
    for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1].x - p[i].x; m[i] = (p[i + 1].y - p[i].y) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += ` C${(p[i].x + h).toFixed(1)},${(p[i].y + t[i] * h).toFixed(1)} ${(p[i + 1].x - h).toFixed(1)},${(p[i + 1].y - t[i + 1] * h).toFixed(1)} ${p[i + 1].x.toFixed(1)},${p[i + 1].y.toFixed(1)}`;
    }
    return d;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function compact(v) {
    const f = x => x.toFixed(1).replace('.', ',').replace(/,0$/, '');
    if (v >= 1e6) return 'R$ ' + f(v / 1e6) + ' mi';
    if (v >= 1e3) return 'R$ ' + f(v / 1e3) + ' mil';
    return 'R$ ' + (Math.round(v * 100) / 100).toLocaleString('pt-BR');
  }

  function drawChart() {
    const el = $('revChart'); if (!el) return;
    const D = periodData(), isRev = dash.metric === 'rev';
    const vals = isRev ? D.rev : D.cnt, n = vals.length;
    const total = isRev ? D.totalRev : D.totalCnt;
    const periodTxt = { '7d': 'nos últimos 7 dias', '30d': 'nos últimos 30 dias', '90d': 'nos últimos 90 dias', '12m': 'nos últimos 12 meses' }[dash.period];
    $('chartTitle').textContent = isRev ? 'Evolução do faturamento' : 'Pedidos por período';
    $('chartSub').textContent = ordersOk()
      ? `${brl(D.totalRev)} em ${D.totalCnt} pedido${D.totalCnt === 1 ? '' : 's'} ${periodTxt}`
      : 'Disponível quando o módulo de pedidos estiver ativo.';

    if (dash.table) {
      el.classList.remove('is-hover');
      el.innerHTML = `<div class="ch-table"><table><thead><tr><th>${D.b.monthly ? 'Mês' : 'Dia'}</th><th>Faturamento</th><th>Pedidos</th></tr></thead><tbody>` +
        D.b.tips.map((t, i) => `<tr><td>${esc(t)}</td><td>${brl(D.rev[i])}</td><td>${D.cnt[i]}</td></tr>`).reverse().join('') + '</tbody></table></div>';
      return;
    }

    const W = Math.max(el.clientWidth || 640, 260), H = Math.max(el.clientHeight || 280, 180);
    const L = isRev ? 58 : 34, R = 12, T = 12, B = 28, pw = W - L - R, ph = H - T - B;
    const maxv = Math.max(...vals, 0);
    const top = isRev ? niceMax(maxv * 1.04) : Math.max(4, Math.ceil(maxv / 4) * 4);
    const X = i => L + (n === 1 ? pw / 2 : i * pw / (n - 1)), Y = v => T + ph - (v / top) * ph;
    const pts = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
    const line = monoPath(pts) || `M${L},${Y(0)} L${L + pw},${Y(0)}`;
    const area = n > 1 ? `${line} L${pts[n - 1].x.toFixed(1)},${T + ph} L${pts[0].x.toFixed(1)},${T + ph} Z` : '';
    let grid = '';
    for (let k = 0; k <= 4; k++) {
      const v = top * k / 4, y = Y(v);
      grid += `<line class="ch-grid" x1="${L}" x2="${L + pw}" y1="${y}" y2="${y}"/><text class="ch-axis" x="${L - 10}" y="${y + 4}" text-anchor="end">${isRev ? compact(v) : Math.round(v)}</text>`;
    }
    const maxLbl = Math.max(2, Math.floor(pw / 64)), step = Math.ceil(n / maxLbl);
    let xl = '';
    for (let i = n - 1; i >= 0; i -= step) xl += `<text class="ch-axis" x="${X(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${D.b.labels[i]}</text>`;
    const summary = `${isRev ? 'Faturamento' : 'Pedidos'} ${periodTxt}: ${isRev ? brl(total) : total}`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(summary)}">
      <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c1)" stop-opacity=".30"/><stop offset="1" stop-color="var(--c1)" stop-opacity="0"/></linearGradient></defs>
      ${grid}${xl}
      ${area ? `<path d="${area}" fill="url(#revGrad)"/>` : ''}
      <path class="ch-line" d="${line}"/>
      <line class="ch-cross" id="chCross" x1="0" x2="0" y1="${T}" y2="${T + ph}"/>
      <circle class="ch-dot" id="chDot" r="5" cx="0" cy="0"/>
      <rect class="ch-hit" x="${L}" y="${T}" width="${pw}" height="${ph}" style="touch-action:pan-y"/>
    </svg><div class="ch-tip" id="chTip"></div>` +
      (total === 0 ? `<div class="ch-empty">${ordersOk() ? (isRev ? 'Nenhuma venda neste período.' : 'Nenhum pedido neste período.') : 'Sem dados de pedidos ainda.'}</div>` : '');

    const cross = $('chCross'), dot = $('chDot'), tip = $('chTip');
    const show = i => {
      i = Math.max(0, Math.min(n - 1, i)); dash.hover = i;
      cross.setAttribute('x1', pts[i].x); cross.setAttribute('x2', pts[i].x);
      dot.setAttribute('cx', pts[i].x); dot.setAttribute('cy', pts[i].y);
      tip.innerHTML = `<span>${esc(D.b.tips[i])}</span><b>${isRev ? brl(D.rev[i]) : D.cnt[i] + (D.cnt[i] === 1 ? ' pedido' : ' pedidos')}</b><span>${isRev ? D.cnt[i] + (D.cnt[i] === 1 ? ' pedido' : ' pedidos') : brl(D.rev[i])}</span>`;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(0, Math.min(W - tw, pts[i].x - tw / 2)) + 'px';
      tip.style.top = Math.max(0, pts[i].y - th - 14) + 'px';
      el.classList.add('is-hover');
    };
    const hide = () => { el.classList.remove('is-hover'); dash.hover = null; };
    const hit = qs('.ch-hit', el);
    const fromEvent = e => { const r = hit.getBoundingClientRect(); return Math.round(((e.clientX - r.left) / r.width) * (n - 1)); };
    hit.addEventListener('pointermove', e => show(fromEvent(e)));
    hit.addEventListener('pointerdown', e => show(fromEvent(e)));
    hit.addEventListener('pointerleave', hide);
    el.onkeydown = e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show((dash.hover ?? n) - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show((dash.hover ?? -1) + 1); }
      else if (e.key === 'Escape') hide();
    };
    el.onblur = hide;
  }

  /* vendas por categoria (itens dos pedidos × categoria do produto) */
  function drawCategories() {
    const box = $('catBox'); if (!box) return;
    const D = periodData();
    $('catSub').textContent = 'Itens vendidos ' + ({ '7d': 'nos últimos 7 dias', '30d': 'nos últimos 30 dias', '90d': 'nos últimos 90 dias', '12m': 'nos últimos 12 meses' }[dash.period]);
    const byId = new Map(prods().map(p => [String(p.id), p]));
    const sum = new Map();
    D.inPeriod.forEach(o => (o.store_order_items || []).forEach(it => {
      const p = byId.get(String(it.product_id));
      const cat = p ? ((typeof prodCategory === 'function' ? prodCategory(p) : '') || 'Sem categoria') : 'Produtos removidos';
      sum.set(cat, (sum.get(cat) || 0) + (Number(it.qty) || 0) * (Number(it.unit_price) || 0));
    }));
    let rows = [...sum.entries()].filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { box.innerHTML = `<div class="empty-box">${ordersOk() ? 'As categorias mais vendidas aparecem aqui assim que houver pedidos no período.' : 'Disponível quando o módulo de pedidos estiver ativo.'}</div>`; return; }
    if (rows.length > 5) { const rest = rows.slice(4).reduce((a, r) => a + r[1], 0); rows = rows.slice(0, 4).concat([['Outras categorias', rest]]); }
    const total = rows.reduce((a, r) => a + r[1], 0);
    const R = 60, C = 2 * Math.PI * R, gap = rows.length > 1 ? 3 : 0;
    let off = 0, arcs = '';
    const colorOf = (i, name) => name === 'Outras categorias' ? 'var(--c-other)' : `var(--c${i + 1})`;
    rows.forEach((r, i) => {
      const len = r[1] / total * C, dash_ = Math.max(len - gap, 0.5);
      arcs += `<circle data-i="${i}" cx="74" cy="74" r="${R}" stroke="${colorOf(i, r[0])}" stroke-dasharray="${dash_.toFixed(2)} ${(C - dash_).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
      off += len;
    });
    box.innerHTML = `<div class="donut-wrap"><div class="donut"><svg viewBox="0 0 148 148" role="img" aria-label="Vendas por categoria, total ${esc(brl(total))}"><circle class="d-track" cx="74" cy="74" r="${R}"/>${arcs}</svg>
      <div class="donut-c"><strong>${esc(compact(total))}</strong><small>em itens</small></div></div>
      <div class="donut-legend">${rows.map((r, i) => `<div class="dl-row" data-i="${i}"><span class="dl-dot" style="background:${colorOf(i, r[0])}"></span><span class="dl-name" title="${esc(r[0])}">${esc(r[0])}</span><span class="dl-pct">${Math.round(r[1] / total * 100)}%</span><span class="dl-val">${esc(brl(r[1]))}</span></div>`).join('')}</div></div>`;
    const arcEls = qsa('.donut circle[data-i]', box);
    qsa('.dl-row', box).forEach(row => {
      row.addEventListener('mouseenter', () => arcEls.forEach(a => a.style.opacity = a.dataset.i === row.dataset.i ? 1 : .3));
      row.addEventListener('mouseleave', () => arcEls.forEach(a => a.style.opacity = ''));
    });
  }

  /* desempenho: status dos pedidos no período */
  function drawStatus() {
    const box = $('ordStatusBox'); if (!box) return;
    const b = buckets(dash.period);
    const list = orders().filter(o => { const d = new Date(o.created_at); return !isNaN(d) && d >= b.start && ST.some(s => s[0] === o.status); });
    if (!ordersOk() || !list.length) { box.innerHTML = `<div class="empty-box">${ordersOk() ? 'Sem pedidos no período selecionado.' : 'Disponível quando o módulo de pedidos estiver ativo.'}</div>`; return; }
    const total = list.length;
    box.innerHTML = ST.map(([k, label, ico]) => {
      const c = list.filter(o => o.status === k).length, pct = Math.round(c / total * 100);
      return `<div class="st-row st-${k}"><span class="st-ico"><i class="fa-solid fa-${ico}"></i></span><div class="st-info"><b><span>${label}</span><span>${c} · ${pct}%</span></b><div class="st-bar"><i data-w="${pct}"></i></div></div></div>`;
    }).join('');
    requestAnimationFrame(() => qsa('.st-bar i', box).forEach(i => i.style.width = i.dataset.w + '%'));
  }

  /* KPIs extras + variação em relação ao mês anterior (só quando há dados suficientes) */
  function trend(id, cur, prev, complete) {
    const el = $(id); if (!el) return;
    if (!ordersOk() || !complete || !(prev > 0)) { el.className = 'kpi-trend'; el.innerHTML = ''; return; }
    const pct = (cur - prev) / prev * 100;
    const up = pct >= 0.05, down = pct <= -0.05;
    el.className = 'kpi-trend ' + (up ? 'trend-up' : down ? 'trend-down' : '');
    el.innerHTML = `<i class="fa-solid fa-arrow-${up ? 'trend-up' : down ? 'trend-down' : 'right'}"></i> ${(pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',')}% vs mês anterior`;
  }
  function drawKpis() {
    const P = prods(), O = orders(), ok = ordersOk();
    const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    const paused = P.filter(p => typeof prodIsPaused === 'function' && prodIsPaused(p)).length;
    const low = P.filter(p => typeof prodStock === 'function' && prodStock(p) < 5).length;
    set('kpiProds', String(P.length));
    set('kpiProdsSub', low ? `${low} com estoque baixo` : '');
    set('kpiActive', String(P.length - paused));
    set('kpiActiveSub', paused ? `${paused} pausado${paused > 1 ? 's' : ''}` : '');
    const pend = O.filter(o => o.status === 'pending').length, tr = O.filter(o => o.status === 'transit').length;
    set('kpiPending', ok ? String(pend) : '—');
    set('kpiPendingSub', ok ? `${tr} em trânsito` : '');
    const rated = P.filter(p => Number(p.rating) > 0).length;
    set('kpiRatingTrend', rated ? `${rated} produto${rated > 1 ? 's' : ''} avaliado${rated > 1 ? 's' : ''}` : '');
    const now = new Date(), py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), pm = (now.getMonth() + 11) % 12;
    const ms = (y, m) => { const l = validOrders().filter(o => { const d = new Date(o.created_at); return d.getFullYear() === y && d.getMonth() === m; }); const r = l.reduce((a, o) => a + (Number(o.total) || 0), 0); return { r, n: l.length, t: l.length ? r / l.length : 0 }; };
    const cur = ms(now.getFullYear(), now.getMonth()), prv = ms(py, pm);
    // os pedidos carregados são os 200 mais recentes: só compara se o mês anterior estiver completo
    const oldest = O.length ? new Date(O[O.length - 1].created_at) : null;
    const complete = O.length < 200 || (oldest && oldest <= new Date(py, pm, 1));
    trend('kpiRevenueTrend', cur.r, prv.r, complete);
    trend('kpiOrdersTrend', cur.n, prv.n, complete);
    trend('kpiTicketTrend', cur.t, prv.t, complete);
  }

  function updatedText() {
    const el = $('dashUpdated'); if (!el) return;
    if (!dash.last) { el.textContent = 'Atualizando…'; return; }
    const m = Math.floor((Date.now() - dash.last) / 60000);
    el.textContent = 'Última atualização: ' + (m < 1 ? 'menos de um minuto' : m === 1 ? 'há 1 minuto' : m < 60 ? `há ${m} minutos` : `há ${Math.floor(m / 60)} h`);
  }
  const renderDash = safe(function () {
    if (!dash.ready) return;
    drawKpis(); drawChart(); drawCategories(); drawStatus();
  });
  function setLoading(on) {
    const pg = $('page-dashboard'); if (!pg) return;
    pg.classList.toggle('is-loading', on);
    ['revChart', 'catBox', 'ordStatusBox'].forEach(id => { const e = $(id); if (e && on) e.innerHTML = '<div class="skel-block" style="height:100%;min-height:150px"></div>'; });
  }

  function initDashboard() {
    setLoading(true); updatedText();
    // gancho: o script.js chama refreshDashboardViews() depois de carregar produtos, pedidos e financeiro
    ['refreshDashboardViews', 'loadMyProducts', 'loadOrders'].forEach(name => {
      const orig = window[name]; if (typeof orig !== 'function') return;
      window[name] = function () {
        const r = orig.apply(this, arguments);
        const after = () => {
          if (name === 'refreshDashboardViews') { dash.ready = true; dash.last = Date.now(); setLoading(false); updatedText(); }
          renderDash();
        };
        return (r && typeof r.then === 'function') ? r.then(v => { after(); return v; }) : (after(), r);
      };
    });
    setInterval(updatedText, 30000);

    const sel = $('dashPeriod'); sel.value = dash.period;
    sel.addEventListener('change', () => { dash.period = sel.value; LS.set('ecomme-dash-period', dash.period); renderDash(); });

    qsa('#chartMetric button').forEach(b => b.addEventListener('click', () => {
      dash.metric = b.dataset.metric;
      qsa('#chartMetric button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
      drawChart();
    }));
    const tb = $('chartTableBtn');
    tb.addEventListener('click', () => { dash.table = !dash.table; tb.setAttribute('aria-pressed', String(dash.table)); tb.innerHTML = dash.table ? '<i class="fa-solid fa-chart-area"></i> Gráfico' : '<i class="fa-solid fa-table-list"></i> Tabela'; drawChart(); });

    let raf = 0;
    new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (dash.ready && !dash.table) drawChart(); }); }).observe($('revChart'));

    // olho: oculta valores (privacidade) — preferência lembrada
    const masked = LS.get('ecomme-kpi-mask') === '1';
    const applyMask = on => qsa('.kpi').forEach(k => { k.classList.toggle('is-masked', on); const b = qs('.kpi-eye', k); if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Mostrar valores' : 'Ocultar valores'); qs('i', b).className = 'fa-solid fa-eye' + (on ? '-slash' : ''); } });
    applyMask(masked);
    qsa('.kpi-eye').forEach(b => b.addEventListener('click', () => { const on = !qs('.kpi').classList.contains('is-masked'); LS.set('ecomme-kpi-mask', on ? '1' : '0'); applyMask(on); }));

    // atualizar: recarrega os mesmos dados reais que o painel já usa
    const rb = $('dashRefresh');
    rb.addEventListener('click', async () => {
      if (dash.busy) return; dash.busy = true; rb.disabled = true; rb.classList.add('is-busy');
      try {
        await Promise.all([loadMyProducts(), loadOrders(), loadFinance()]);
        refreshDashboardViews();
        if (typeof toast === 'function') toast('Dados atualizados.', 'ok');
      } catch (e) {
        console.error(e); if (typeof toast === 'function') toast('Não foi possível atualizar agora.', 'err');
      } finally { dash.busy = false; rb.disabled = false; rb.classList.remove('is-busy'); }
    });
  }

  /* ── 5. INIT ─────────────────────────────────────────────────── */
  safe(initSidebar)();
  safe(initSearch)();
  safe(initTables)();
  safe(initDashboard)();
})();
