const DEFAULT_SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

export function getSupabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    publishableKey: String(env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim(),
    serviceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  };
}

export async function getAuthenticatedUser(request, env) {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return { user: null, response: jsonResponse({ error: 'Faça login para continuar.' }, 401) };
  const config = getSupabaseConfig(env);
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.publishableKey, authorization }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) return { user: null, response: jsonResponse({ error: 'Sua sessão expirou. Entre novamente.' }, 401) };
  return { user: payload, response: null };
}

export function requireAdminConfig(env) {
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) return { config: null, response: jsonResponse({ error: 'A integração do Supabase ainda não foi configurada no servidor.' }, 503) };
  return { config, response: null };
}

export async function adminSupabaseFetch(config, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', config.serviceRoleKey);
  headers.set('authorization', `Bearer ${config.serviceRoleKey}`);
  if (options.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(`${config.url}/rest/v1/${path}`, { ...options, headers });
}

export function getAsaasConfig(env) {
  const apiKey = String(env.ASAAS_API_KEY || '').trim();
  const environment = String(env.ASAAS_ENV || 'sandbox').trim().toLowerCase();
  return {
    apiKey,
    environment,
    baseUrl: environment === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3',
    configured: Boolean(apiKey) && ['sandbox', 'production'].includes(environment)
  };
}

export async function asaasRequest(config, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('access_token', config.apiKey);
  headers.set('accept', 'application/json');
  headers.set('user-agent', 'Ecomme/1.0.0');
  if (options.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(`${config.baseUrl}${path}`, { ...options, headers });
}

export async function responseJson(response) {
  return response.json().catch(() => ({}));
}

export function saoPauloDateTime(now = new Date()) {
  const due = new Date(now.getTime() + 2 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(due);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}
