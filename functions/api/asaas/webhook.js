import { getSupabaseConfig, jsonResponse } from '../../_shared/plan-billing.js';

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, { allow: 'POST' });
  const expectedToken = String(env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (!expectedToken) return jsonResponse({ error: 'Webhook não configurado.' }, 503);
  const suppliedToken = request.headers.get('asaas-access-token') || '';
  if (!constantTimeEqual(suppliedToken, expectedToken)) return jsonResponse({ error: 'Não autorizado.' }, 401);

  const db = getSupabaseConfig(env);
  if (!db.serviceRoleKey) return jsonResponse({ error: 'Integração do banco não configurada.' }, 503);
  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 250_000) return jsonResponse({ error: 'Webhook muito grande.' }, 413);
    payload = JSON.parse(raw || '{}');
  } catch (_) { return jsonResponse({ error: 'JSON inválido.' }, 400); }

  const eventId = String(payload.id || '').trim();
  const eventName = String(payload.event || '').trim().toUpperCase();
  if (!eventId || !eventName) return jsonResponse({ error: 'Evento incompleto.' }, 400);

  const body = {
    p_event_id: eventId,
    p_event_name: eventName,
    p_checkout_id: payload.checkout?.id || null,
    p_external_reference: payload.checkout?.externalReference || payload.subscription?.externalReference || payload.payment?.externalReference || null,
    p_customer_id: payload.subscription?.customer || payload.payment?.customer || payload.checkout?.customer || null,
    p_provider_subscription_id: payload.subscription?.id || payload.payment?.subscription || null,
    p_payment_status: payload.payment?.status || null,
    p_subscription_status: payload.subscription?.status || null
  };

  try {
    const response = await fetch(`${db.url}/rest/v1/rpc/ecomme_process_asaas_plan_event`, {
      method: 'POST',
      headers: {
        apikey: db.serviceRoleKey,
        authorization: `Bearer ${db.serviceRoleKey}`,
        'content-type': 'application/json', accept: 'application/json'
      },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[Ecomme plans] Falha ao processar webhook Asaas:', result);
      return jsonResponse({ error: 'Falha ao processar evento.' }, 503);
    }
    if (result?.matched === false && ['CHECKOUT_PAID', 'SUBSCRIPTION_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(eventName)) {
      console.error('[Ecomme plans] Evento Asaas ainda não corresponde a uma assinatura local:', eventName);
      return jsonResponse({ error: 'Assinatura ainda não localizada; o evento poderá ser reenviado.' }, 503);
    }
    return jsonResponse({ received: true, processed: Boolean(result?.processed), duplicate: Boolean(result?.duplicate) });
  } catch (error) {
    console.error('[Ecomme plans] Erro inesperado no webhook:', error);
    return jsonResponse({ error: 'Falha temporária ao processar evento.' }, 503);
  }
}
