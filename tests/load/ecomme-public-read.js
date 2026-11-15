import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = String(__ENV.BASE_URL || '').replace(/\/+$/, '');
const PRODUCT_ID = String(__ENV.PRODUCT_ID || '').trim();
const ACCESS_CLIENT_ID = String(__ENV.CF_ACCESS_CLIENT_ID || '').trim();
const ACCESS_CLIENT_SECRET = String(__ENV.CF_ACCESS_CLIENT_SECRET || '').trim();

if (!BASE_URL) throw new Error('Defina BASE_URL com a URL do staging.');
if (!ACCESS_CLIENT_ID || !ACCESS_CLIENT_SECRET) {
  throw new Error('Configure os GitHub Secrets CF_ACCESS_CLIENT_ID e CF_ACCESS_CLIENT_SECRET.');
}

const HEADERS = {
  'CF-Access-Client-Id': ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': ACCESS_CLIENT_SECRET,
  'Accept': 'application/json',
};

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {},
};

function classifyBody(body) {
  const value = String(body || '').trim();
  if (!value) return { kind: 'empty', preview: '' };
  try {
    JSON.parse(value);
    return { kind: 'valid-json', preview: '' };
  } catch (_) {
    const compact = value.replace(/\s+/g, ' ').slice(0, 180);
    if (/^<!doctype html|^<html[\s>]/i.test(value)) {
      return { kind: 'html', preview: compact };
    }
    return { kind: 'not-json', preview: compact };
  }
}

function probe(label, path) {
  const response = http.get(`${BASE_URL}${path}`, {
    headers: HEADERS,
    redirects: 5,
    timeout: '20s',
    tags: { endpoint: label, test_type: 'preflight' },
  });

  const contentType = String(
    response.headers['Content-Type'] || response.headers['content-type'] || 'missing'
  );
  const body = classifyBody(response.body);
  const report = {
    endpoint: label,
    status: response.status,
    content_type: contentType,
    body_type: body.kind,
    duration_ms: Math.round(response.timings.duration * 100) / 100,
  };
  if (body.preview) report.body_preview = body.preview;
  console.log(JSON.stringify(report));

  check(response, {
    [`${label}: HTTP 200`]: (r) => r.status === 200,
    [`${label}: valid JSON`]: () => body.kind === 'valid-json',
  });
}

export default function () {
  probe('catalog', '/api/catalog?mode=products&sort=rating&limit=25&seed=diagnostic');
  probe('search', '/api/search?q=produto&page=1&limit=12');
  probe('catalog-stats', '/api/catalog-stats?type=categories');
  if (PRODUCT_ID) {
    probe('product-detail', `/api/product/${encodeURIComponent(PRODUCT_ID)}`);
  }
}
