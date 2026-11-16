import { adminSupabaseFetch, asaasRequest, getAsaasConfig, getAuthenticatedUser, jsonResponse, requireAdminConfig, responseJson } from '../../_shared/plan-billing.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, { allow: 'POST' });
  const { user, response: authResponse } = await getAuthenticatedUser(request, env);
  if (authResponse) return authResponse;
  const { config: db, response: dbResponse } = requireAdminConfig(env);
  if (dbResponse) return dbResponse;
  const asaas = getAsaasConfig(env);
  if (!asaas.configured) return jsonResponse({ error: 'O cancelamento da assinatura ainda não está configurado.' }, 503);

  try {
    const query = new URLSearchParams({
      user_id: `eq.${user.id}`, status: 'in.(active,past_due)',
      select: 'id,asaas_subscription_id,status,current_period_end,cancel_at_period_end',
      order: 'created_at.desc', limit: '1'
    });
    const lookup = await adminSupabaseFetch(db, `ecomme_plan_subscriptions?${query}`);
    const rows = await responseJson(lookup);
    if (!lookup.ok || !Array.isArray(rows)) return jsonResponse({ error: 'Não foi possível consultar sua assinatura.' }, 503);
    const current = rows[0];
    if (!current) return jsonResponse({ error: 'Não existe uma assinatura paga ativa para cancelar.' }, 404);
    if (current.cancel_at_period_end) return jsonResponse({ ok: true, alreadyCanceled: true, currentPeriodEnd: current.current_period_end });
    if (!current.asaas_subscription_id) return jsonResponse({ error: 'O Asaas ainda está confirmando a assinatura. Tente novamente em instantes.' }, 409);

    const cancelResponse = await asaasRequest(asaas, `/subscriptions/${encodeURIComponent(current.asaas_subscription_id)}`, { method: 'DELETE' });
    const cancelData = await responseJson(cancelResponse);
    if (!cancelResponse.ok) {
      console.error('[Ecomme plans] Asaas não cancelou a recorrência:', cancelData);
      return jsonResponse({ error: 'O Asaas não conseguiu cancelar a renovação. Tente novamente ou fale com o suporte.' }, 502);
    }

    const update = await adminSupabaseFetch(db, `ecomme_plan_subscriptions?id=eq.${encodeURIComponent(current.id)}`, {
      method: 'PATCH', headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ cancel_at_period_end: true, canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    });
    if (!update.ok) {
      console.error('[Ecomme plans] Recorrência cancelada no Asaas, mas a atualização local falhou.');
      return jsonResponse({ error: 'A renovação foi cancelada no Asaas, mas a atualização da conta está pendente. Atualize a página.' }, 503);
    }
    return jsonResponse({ ok: true, currentPeriodEnd: current.current_period_end });
  } catch (error) {
    console.error('[Ecomme plans] Erro ao cancelar assinatura:', error);
    return jsonResponse({ error: 'Não foi possível cancelar a renovação agora.' }, 500);
  }
}
