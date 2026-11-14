(() => {
  if (window.__ecommeCatalogPerfInitialized) return;
  if (window.location.pathname.replace(/\/+$/, '') !== '/products') return;

  const params = new URLSearchParams(window.location.search);
  let enabled = params.get('ecommePerf') === '1';
  try { enabled = enabled || localStorage.getItem('ecomme:catalogPerf') === '1'; } catch (_) {}
  if (!enabled || !('performance' in window)) return;

  window.__ecommeCatalogPerfInitialized = true;
  const state = {
    startedAt: performance.timeOrigin || Date.now(),
    fcp: null,
    lcp: null,
    cls: 0,
    interactions: new Map(),
    longTaskCount: 0,
    longTaskTotal: 0,
    resources: { total: 0, images: 0, scripts: 0, styles: 0, transferBytes: 0, imageBytes: 0 },
    observers: []
  };

  function observe(type, callback, options = { buffered: true }) {
    if (!('PerformanceObserver' in window)) return;
    try {
      const observer = new PerformanceObserver(list => callback(list.getEntries()));
      observer.observe({ type, ...options });
      state.observers.push(observer);
    } catch (_) {}
  }

  observe('paint', entries => {
    for (const entry of entries) if (entry.name === 'first-contentful-paint') state.fcp = entry.startTime;
  });
  observe('largest-contentful-paint', entries => {
    for (const entry of entries) state.lcp = entry.startTime;
  });
  observe('layout-shift', entries => {
    for (const entry of entries) if (!entry.hadRecentInput) state.cls += entry.value;
  });
  observe('event', entries => {
    for (const entry of entries) {
      if (!entry.interactionId || entry.duration <= 0) continue;
      const previous = state.interactions.get(entry.interactionId) || 0;
      state.interactions.set(entry.interactionId, Math.max(previous, entry.duration));
    }
  }, { buffered: true, durationThreshold: 40 });
  observe('longtask', entries => {
    for (const entry of entries) {
      state.longTaskCount++;
      state.longTaskTotal += entry.duration;
    }
  });
  observe('resource', entries => {
    for (const entry of entries) {
      const name = String(entry.name || '');
      const size = Number(entry.transferSize || entry.encodedBodySize || 0);
      state.resources.total++;
      state.resources.transferBytes += size;
      if (/\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i.test(name) || ['image', 'img'].includes(entry.initiatorType)) {
        state.resources.images++;
        state.resources.imageBytes += size;
      } else if (entry.initiatorType === 'script' || /\.js(\?|$)/i.test(name)) {
        state.resources.scripts++;
      } else if (entry.initiatorType === 'css' || /\.css(\?|$)/i.test(name)) {
        state.resources.styles++;
      }
    }
  });

  function getSnapshot() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const durations = [...state.interactions.values()].sort((a, b) => a - b);
    const inpIndex = durations.length ? Math.max(0, Math.ceil(durations.length * 0.98) - 1) : -1;
    return {
      route: '/products',
      ttfbMs: navigation ? Math.round(navigation.responseStart - navigation.requestStart) : null,
      fcpMs: state.fcp == null ? null : Math.round(state.fcp),
      lcpMs: state.lcp == null ? null : Math.round(state.lcp),
      inpApproxMs: inpIndex < 0 ? null : Math.round(durations[inpIndex]),
      cls: Number(state.cls.toFixed(4)),
      longTaskCount: state.longTaskCount,
      longTaskTotalMs: Math.round(state.longTaskTotal),
      interactionsMeasured: durations.length,
      resources: { ...state.resources }
    };
  }

  function print() {
    const snapshot = getSnapshot();
    console.group('[Ecomme Performance] /products');
    console.table(snapshot);
    console.info('Métricas locais. INP é aproximado; use RUM/Web Vitals em produção para o valor oficial.');
    console.groupEnd();
    return snapshot;
  }

  window.EcommeCatalogPerf = {
    snapshot: getSnapshot,
    print,
    disconnect() { state.observers.forEach(observer => observer.disconnect()); state.observers = []; }
  };

  window.addEventListener('pagehide', () => state.observers.forEach(observer => observer.disconnect()), { once: true });
  window.addEventListener('load', () => setTimeout(print, 5000), { once: true });
  console.info('[Ecomme Performance] Monitor ativo. Use EcommeCatalogPerf.print() para gerar um relatório ou EcommeCatalogPerf.snapshot() para obter os dados.');
})();
