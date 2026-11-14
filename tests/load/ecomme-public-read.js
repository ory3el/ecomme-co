import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = String(__ENV.BASE_URL || '').replace(/\/+$/, '');
const PRODUCT_ID = String(__ENV.PRODUCT_ID || '').trim();
if (!BASE_URL) throw new Error('Defina BASE_URL com a URL do ambiente de staging da Ecomme.');

export const options = {
  scenarios: {
    marketplace_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 250 },
        { duration: '2m', target: 250 },
        { duration: '1m', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.99'],
  },
  discardResponseBodies: false,
};

function verifyJson(response, label) {
  const contentType = String(response.headers['Content-Type'] || response.headers['content-type'] || '');
  const ok = check(response, {
    [`${label}: status 200`]: r => r.status === 200,
    [`${label}: JSON response`]: () => contentType.toLowerCase().includes('application/json'),
  });
  if (!ok && response.status >= 500) {
    console.error(`${label} returned ${response.status}: ${String(response.body || '').slice(0, 250)}`);
  }
}

export default function () {
  const choice = Math.random();
  let response;
  let label;

  if (choice < 0.65) {
    // Trafego quente: simula muitos visitantes consultando a mesma pagina do catalogo.
    label = 'catalog-hot';
    response = http.get(`${BASE_URL}/api/catalog?mode=products&sort=rating&limit=25&seed=loadtest-hot`, {
      tags: { endpoint: 'catalog', cache_profile: 'hot' },
    });
  } else if (choice < 0.82) {
    // Cache miss controlado: seed individual força chaves diferentes e exercita o RPC.
    label = 'catalog-cold';
    response = http.get(`${BASE_URL}/api/catalog?mode=products&sort=rating&limit=25&seed=load-${__VU}-${__ITER}`, {
      tags: { endpoint: 'catalog', cache_profile: 'cold' },
    });
  } else if (choice < 0.92) {
    label = 'search';
    response = http.get(`${BASE_URL}/api/search?q=produto&page=1&limit=12`, {
      tags: { endpoint: 'search' },
    });
  } else if (choice < 0.97) {
    label = 'catalog-stats';
    response = http.get(`${BASE_URL}/api/catalog-stats?type=categories`, {
      tags: { endpoint: 'catalog-stats' },
    });
  } else if (PRODUCT_ID) {
    label = 'product-detail';
    response = http.get(`${BASE_URL}/api/product/${encodeURIComponent(PRODUCT_ID)}`, {
      tags: { endpoint: 'product-detail' },
    });
  } else {
    label = 'catalog-hot-fallback';
    response = http.get(`${BASE_URL}/api/catalog?mode=products&sort=rating&limit=25&seed=loadtest-hot`, {
      tags: { endpoint: 'catalog', cache_profile: 'hot' },
    });
  }

  verifyJson(response, label);
  // Tempo de leitura entre acoes; evita transformar 1.000 VUs em um flood sem pausa.
  sleep(0.8 + Math.random() * 1.2);
}
