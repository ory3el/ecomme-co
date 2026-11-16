import { getAsaasConfig, jsonResponse } from '../../_shared/plan-billing.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { allow: 'GET' });
  const checkoutRequested = String(env.PLANS_CHECKOUT_ENABLED || '').trim().toLowerCase() === 'true';
  const benefitsReady = String(env.PLANS_BENEFITS_READY || '').trim().toLowerCase() === 'true';
  const environment = String(env.ASAAS_ENV || 'sandbox').trim().toLowerCase();
  const asaas = getAsaasConfig(env);
  const serverReady = Boolean(String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) && asaas.configured;
  const checkoutEnabled = checkoutRequested && serverReady && (environment === 'sandbox' || (environment === 'production' && benefitsReady));
  return jsonResponse({
    checkoutEnabled,
    environment: ['sandbox', 'production'].includes(environment) ? environment : 'unavailable'
  });
}
