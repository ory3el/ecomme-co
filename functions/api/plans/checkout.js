import {
  adminSupabaseFetch, asaasRequest, getAsaasConfig, getAuthenticatedUser,
  jsonResponse, requireAdminConfig, responseJson, saoPauloDateTime
} from '../../_shared/plan-billing.js';

const PLANS = {
  plus: { name: 'Ecomme Plus', monthlyCents: 1900, annualMonthlyCents: 1500 },
  premium: { name: 'Ecomme Premium', monthlyCents: 4900, annualMonthlyCents: 3900 },
  business: { name: 'Ecomme Business', monthlyCents: 9900, annualMonthlyCents: 7900 }
};

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, { allow: 'POST' });
  const { user, response: authResponse } = await getAuthenticatedUser(request, env);
  if (authResponse) return authResponse;
  const asaasEnvironment = String(env.ASAAS_ENV || 'sandbox').trim().toLowerCase();
  const checkoutRequested = String(env.PLANS_CHECKOUT_ENABLED || '').trim().toLowerCase() === 'true';
  const benefitsReady = String(env.PLANS_BENEFITS_READY || '').trim().toLowerCase() === 'true';
  if (!checkoutRequested || (asaasEnvironment === 'production' && !benefitsReady)) {
    return jsonResponse({ error: 'As assinaturas estão temporariamente indisponíveis. Tente novamente mais tarde.' }, 503);
  }
  const { config: db, response: dbResponse } = requireAdminConfig(env);
  if (dbResponse) return dbResponse;
  const asaas = getAsaasConfig(env);
  if (!asaas.configured) return jsonResponse({ error: 'O pagamento ainda não está configurado. Tente novamente mais tarde.' }, 503);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return jsonResponse({ error: 'Solicitação muito grande.' }, 413);
    body = JSON.parse(raw || '{}');
  } catch (_) { return jsonResponse({ error: 'Dados da assinatura inválidos.' }, 400); }

  const planCode = String(body.plan || '').trim().toLowerCase();
  const billingCycle = String(body.billingCycle || '').trim().toLowerCase();
  const plan = PLANS[planCode];
  if (!plan || !['monthly', 'annual'].includes(billingCycle)) return jsonResponse({ error: 'Plano ou período de cobrança inválido.' }, 400);
  const amountCents = billingCycle === 'annual' ? plan.annualMonthlyCents * 12 : plan.monthlyCents;
  const amount = Number((amountCents / 100).toFixed(2));
  const origin = new URL(request.url).origin;

  try {
    const query = new URLSearchParams({
      user_id: `eq.${user.id}`,
      select: 'id,plan_code,billing_cycle,status,checkout_id,checkout_url,asaas_subscription_id,asaas_customer_id,current_period_end,cancel_at_period_end,created_at',
      order: 'created_at.desc', limit: '30'
    });
    const existingResponse = await adminSupabaseFetch(db, `ecomme_plan_subscriptions?${query}`);
    const existingRows = await responseJson(existingResponse);
    if (!existingResponse.ok || !Array.isArray(existingRows)) {
      console.error('[Ecomme plans] Não foi possível consultar assinaturas:', existingRows);
      return jsonResponse({ error: 'Não foi possível consultar seu plano. Verifique a configuração do banco de dados.' }, 503);
    }

    const now = Date.now();
    const currentPaid = existingRows.find(row => ['active', 'past_due', 'canceled'].includes(row.status) && row.current_period_end && new Date(row.current_period_end).getTime() > now);
    if (currentPaid && !currentPaid.cancel_at_period_end) {
      return jsonResponse({ error: 'Você já tem uma assinatura ativa. Cancele a renovação atual antes de contratar outro plano.' }, 409);
    }
    if (currentPaid?.cancel_at_period_end) {
      return jsonResponse({ error: 'Sua assinatura atual continua válida até o fim do período pago. Você poderá escolher outro plano depois dessa data.' }, 409);
    }

    const awaitingPayment = existingRows.find(row => row.status === 'awaiting_payment');
    if (awaitingPayment) return jsonResponse({ error: 'Seu checkout foi concluído e o Asaas está confirmando a primeira cobrança. Aguarde a atualização da assinatura antes de tentar novamente.' }, 409);

    const pending = existingRows.find(row => row.status === 'pending');
    if (pending && now - new Date(pending.created_at).getTime() < 55 * 60 * 1000) {
      if (pending.plan_code === planCode && pending.billing_cycle === billingCycle && pending.checkout_url && pending.checkout_id) {
        return jsonResponse({ checkoutUrl: pending.checkout_url, reused: true });
      }
      return jsonResponse({ error: 'Você já tem um checkout pendente. Conclua ou aguarde a expiração antes de escolher outro plano.' }, 409);
    }
    if (pending) {
      const expireResponse = await adminSupabaseFetch(db, `ecomme_plan_subscriptions?id=eq.${encodeURIComponent(pending.id)}`, {
        method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ status: 'expired', updated_at: new Date().toISOString() })
      });
      if (!expireResponse.ok) return jsonResponse({ error: 'Não foi possível renovar a tentativa de pagamento. Atualize a página e tente novamente.' }, 503);
    }

    const profileQuery = new URLSearchParams({ id: `eq.${user.id}`, select: 'full_name', limit: '1' });
    const profileResponse = await adminSupabaseFetch(db, `profiles?${profileQuery}`);
    const profileRows = profileResponse.ok ? await responseJson(profileResponse) : [];
    const name = String(profileRows?.[0]?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente Ecomme').trim().slice(0, 100);
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) return jsonResponse({ error: 'Sua conta não possui um e-mail válido para o pagamento.' }, 400);

    const customerMapQuery = new URLSearchParams({ user_id: `eq.${user.id}`, select: 'asaas_customer_id,email', limit: '1' });
    const customerMapResponse = await adminSupabaseFetch(db, `ecomme_plan_customers?${customerMapQuery}`);
    const customerMap = customerMapResponse.ok ? (await responseJson(customerMapResponse))[0] : null;
    let customerId = customerMap?.asaas_customer_id || null;

    if (!customerId) {
      const customerResponse = await asaasRequest(asaas, '/customers', {
        method: 'POST', body: JSON.stringify({ name, email, externalReference: user.id })
      });
      const customerData = await responseJson(customerResponse);
      if (!customerResponse.ok || !customerData.id) {
        console.error('[Ecomme plans] Asaas não criou o cliente:', customerData);
        return jsonResponse({ error: 'Não foi possível preparar seus dados de pagamento. Confira a configuração do Asaas.' }, 502);
      }
      customerId = customerData.id;
      const mapResponse = await adminSupabaseFetch(db, 'ecomme_plan_customers?on_conflict=user_id', {
        method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: user.id, asaas_customer_id: customerId, email, updated_at: new Date().toISOString() })
      });
      if (!mapResponse.ok) {
        console.error('[Ecomme plans] Não foi possível guardar o cliente Asaas:', await responseJson(mapResponse));
        return jsonResponse({ error: 'Não foi possível preparar sua assinatura no momento.' }, 503);
      }
    }

    const externalReference = crypto.randomUUID();
    const insertResponse = await adminSupabaseFetch(db, 'ecomme_plan_subscriptions', {
      method: 'POST', headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: user.id, plan_code: planCode, billing_cycle: billingCycle, status: 'pending',
        amount, currency: 'BRL', provider: 'asaas', external_reference: externalReference,
        asaas_customer_id: customerId
      })
    });
    const inserted = await responseJson(insertResponse);
    if (!insertResponse.ok || !Array.isArray(inserted) || !inserted[0]?.id) {
      console.error('[Ecomme plans] Falha ao registrar tentativa:', inserted);
      return jsonResponse({ error: 'Não foi possível registrar sua solicitação de assinatura.' }, 503);
    }
    const localSubscription = inserted[0];

    const checkoutPayload = {
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: 60,
      externalReference,
      customer: customerId,
      callback: {
        successUrl: `${origin}/plans?checkout=success`,
        cancelUrl: `${origin}/plans?checkout=cancelled`,
        expiredUrl: `${origin}/plans?checkout=expired`
      },
      items: [{
        name: plan.name,
        description: billingCycle === 'annual' ? 'Assinatura anual Ecomme' : 'Assinatura mensal Ecomme',
        quantity: 1,
        value: amount
      }],
      subscription: { cycle: billingCycle === 'annual' ? 'YEARLY' : 'MONTHLY', nextDueDate: saoPauloDateTime() }
    };

    const checkoutResponse = await asaasRequest(asaas, '/checkouts', { method: 'POST', body: JSON.stringify(checkoutPayload) });
    const checkoutData = await responseJson(checkoutResponse);
    if (!checkoutResponse.ok || !checkoutData.id) {
      console.error('[Ecomme plans] Asaas não criou o checkout:', checkoutData);
      await adminSupabaseFetch(db, `ecomme_plan_subscriptions?id=eq.${encodeURIComponent(localSubscription.id)}`, {
        method: 'PATCH', headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString() })
      });
      return jsonResponse({ error: 'O Asaas não conseguiu criar o checkout. Confira a conta e as configurações de assinatura.' }, 502);
    }

    const checkoutUrl = `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkoutData.id)}`;
    const updateResponse = await adminSupabaseFetch(db, `ecomme_plan_subscriptions?id=eq.${encodeURIComponent(localSubscription.id)}`, {
      method: 'PATCH', headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ checkout_id: checkoutData.id, checkout_url: checkoutUrl, updated_at: new Date().toISOString() })
    });
    if (!updateResponse.ok) {
      console.error('[Ecomme plans] Checkout criado, mas não foi vinculado ao registro local.');
      return jsonResponse({ error: 'O checkout foi preparado, mas não conseguimos vinculá-lo à sua conta. Entre em contato com o suporte antes de tentar novamente.' }, 503);
    }
    return jsonResponse({ checkoutUrl, reused: false });
  } catch (error) {
    console.error('[Ecomme plans] Erro ao iniciar assinatura:', error);
    return jsonResponse({ error: 'Ocorreu um erro ao iniciar sua assinatura. Tente novamente.' }, 500);
  }
}
