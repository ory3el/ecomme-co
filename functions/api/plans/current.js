import { adminSupabaseFetch, getAuthenticatedUser, jsonResponse, requireAdminConfig, responseJson } from '../../_shared/plan-billing.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return jsonResponse({ error: 'Método não permitido.' }, 405, { allow: 'GET' });
  const { user, response: authResponse } = await getAuthenticatedUser(request, env);
  if (authResponse) return authResponse;
  const { config, response: configResponse } = requireAdminConfig(env);
  if (configResponse) return configResponse;

  try {
    const query = new URLSearchParams({
      user_id: `eq.${user.id}`,
      select: 'id,plan_code,billing_cycle,status,amount,current_period_start,current_period_end,cancel_at_period_end,canceled_at,checkout_url,created_at',
      order: 'created_at.desc', limit: '30'
    });
    const response = await adminSupabaseFetch(config, `ecomme_plan_subscriptions?${query}`);
    const rows = await responseJson(response);
    if (!response.ok || !Array.isArray(rows)) {
      console.error('[Ecomme plans] Erro ao consultar plano:', rows);
      return jsonResponse({ error: 'Não foi possível carregar sua assinatura.' }, 503);
    }
    const now = Date.now();
    const current = rows.find(row => {
      if (!['active', 'past_due', 'canceled'].includes(row.status)) return false;
      if (!row.current_period_end) return row.status === 'active';
      return new Date(row.current_period_end).getTime() > now;
    }) || null;
    const pending = rows.find(row => ['pending', 'awaiting_payment'].includes(row.status) && row.checkout_url) || null;
    const latestFailedAttempt = rows.find(row => ['failed', 'expired', 'canceled'].includes(row.status)) || null;
    const paymentIssue = !current && !pending && latestFailedAttempt?.status === 'failed' ? latestFailedAttempt : null;

    return jsonResponse({
      currentPlan: current ? {
        code: current.plan_code,
        billingCycle: current.billing_cycle,
        status: current.status,
        amount: Number(current.amount),
        currentPeriodEnd: current.current_period_end,
        cancelAtPeriodEnd: Boolean(current.cancel_at_period_end || current.status === 'canceled')
      } : { code: 'free', billingCycle: null, status: 'active', amount: 0, currentPeriodEnd: null, cancelAtPeriodEnd: false },
      pendingCheckout: pending ? { plan: pending.plan_code, billingCycle: pending.billing_cycle, checkoutUrl: pending.checkout_url, status: pending.status } : null,
      paymentIssue: paymentIssue ? { plan: paymentIssue.plan_code, billingCycle: paymentIssue.billing_cycle, createdAt: paymentIssue.created_at } : null
    });
  } catch (error) {
    console.error('[Ecomme plans] Erro inesperado ao consultar assinatura:', error);
    return jsonResponse({ error: 'Não foi possível carregar seu plano.' }, 500);
  }
}
