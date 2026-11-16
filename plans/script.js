/* ─── PLANOS E ASSINATURAS ECOMME ────────────────────────────────────── */
let isAnnual = false;
let planCheckoutBusy = false;
let planSession = null;
let planLoadError = null;
let planCheckoutEnabled = false;
let planCheckoutEnvironment = 'unavailable';
let planAvailabilityError = null;
let currentPlanState = {
  currentPlan: { code: 'free', status: 'active', billingCycle: null, amount: 0, currentPeriodEnd: null, cancelAtPeriodEnd: false },
  pendingCheckout: null
};

const PLAN_CONFIG = {
  plus: { name: 'Ecomme Plus', shortName: 'Plus', monthly: 19, annual: 15, annualTotal: 180 },
  premium: { name: 'Ecomme Premium', shortName: 'Premium', monthly: 49, annual: 39, annualTotal: 468 },
  business: { name: 'Ecomme Business', shortName: 'Business', monthly: 99, annual: 79, annualTotal: 948 }
};
const BILLING_NOTES = {
  plus: { monthly: '', annual: 'R$ 180 cobrados por ano · economia de R$ 48' },
  premium: { monthly: '', annual: 'R$ 468 cobrados por ano · economia de R$ 120' },
  business: { monthly: '', annual: 'R$ 948 cobrados por ano · economia de R$ 240' }
};

function planToast(message, type = 'ok') {
  if (typeof window.showToast === 'function') {
    try { window.showToast(message, type); return; } catch (_) {}
  }
  console.info(`[Ecomme plans] ${message}`);
}

function getPlanSupabaseClient() {
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient?.auth) return supabaseClient;
  } catch (_) {}
  return window.supabaseClient?.auth ? window.supabaseClient : null;
}

function formatPlanDate(value) {
  if (!value) return 'o fim do período já pago';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'o fim do período já pago';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(date);
}

function setPlanButtonsBusy(busy) {
  planCheckoutBusy = Boolean(busy);
  document.querySelectorAll('#btn-plan-plus,#btn-plan-premium,#btn-plan-business,#btn-plan-free').forEach(button => {
    if (button) button.disabled = planCheckoutBusy || button.dataset.planLocked === 'true';
  });
}

/* ─── COBRANÇA MENSAL / ANUAL ────────────────────────────────────────── */
function toggleBilling() {
  isAnnual = !isAnnual;
  const pill = document.getElementById('tgPill');
  const lblM = document.getElementById('lblMonthly');
  const lblA = document.getElementById('lblAnnual');
  if (pill) pill.classList.toggle('annual', isAnnual);
  if (lblM) lblM.classList.toggle('active', !isAnnual);
  if (lblA) lblA.classList.toggle('active', isAnnual);

  Object.keys(PLAN_CONFIG).forEach(code => {
    const config = PLAN_CONFIG[code];
    const amount = document.getElementById(`amt-${code}`);
    const save = document.getElementById(`save-${code}`);
    const price = isAnnual ? config.annual : config.monthly;
    if (amount) {
      amount.classList.remove('price-anim');
      void amount.offsetWidth;
      amount.classList.add('price-anim');
      amount.textContent = String(price);
    }
    if (save) save.textContent = isAnnual ? BILLING_NOTES[code].annual : '\u00a0';
  });
  document.querySelectorAll('.pc-period').forEach(period => {
    period.textContent = isAnnual ? '/mês*' : '/mês';
    period.title = isAnnual ? 'Valor médio mensal. A cobrança é anual, em parcela única.' : 'Cobrança mensal.';
  });
  const saveBadge = document.getElementById('saveBadge');
  if (saveBadge) saveBadge.textContent = isAnnual ? 'Cobrança anual com desconto' : 'Economize ao escolher o anual';
}

/* ─── AUTENTICAÇÃO E CHECKOUT ────────────────────────────────────────── */
async function getPlanSession() {
  const client = getPlanSupabaseClient();
  if (!client) throw new Error('O sistema de autenticação ainda está carregando. Atualize a página.');
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Não foi possível validar sua sessão. Entre novamente.');
  planSession = data?.session || null;
  return planSession;
}

function redirectToPlanLogin(planCode) {
  const cycle = isAnnual ? 'annual' : 'monthly';
  const destination = `/plans?plan=${encodeURIComponent(planCode)}&billing=${encodeURIComponent(cycle)}`;
  window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
}

async function selectPlan(name) {
  const planCode = String(name || '').trim().toLowerCase();
  if (!PLAN_CONFIG[planCode] || planCheckoutBusy) return;
  if (!planCheckoutEnabled) {
    planToast(planAvailabilityError || 'As assinaturas estão temporariamente indisponíveis.', 'info');
    return;
  }

  let session;
  try { session = await getPlanSession(); }
  catch (error) { planToast(error.message, 'err'); return; }
  if (!session?.access_token) {
    redirectToPlanLogin(planCode);
    return;
  }

  const current = currentPlanState.currentPlan || {};
  const currentActive = current.code !== 'free' && current.currentPeriodEnd && new Date(current.currentPeriodEnd).getTime() > Date.now();
  if (currentActive) {
    const msg = current.cancelAtPeriodEnd
      ? `Seu plano atual permanece válido até ${formatPlanDate(current.currentPeriodEnd)}. Aguarde o fim do período para contratar outro plano.`
      : 'Cancele primeiro a renovação do seu plano atual. Você continuará com os benefícios até o fim do período pago.';
    planToast(msg, 'info');
    return;
  }
  if (currentPlanState.pendingCheckout) {
    planToast('Você já tem um checkout pendente. Retome o pagamento pelo aviso no topo da página.', 'info');
    return;
  }

  setPlanButtonsBusy(true);
  planToast(`Preparando o checkout do ${PLAN_CONFIG[planCode].name}...`, 'info');
  try {
    const response = await fetch('/api/plans/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan: planCode, billingCycle: isAnnual ? 'annual' : 'monthly' })
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      planSession = null;
      planToast('Sua sessão expirou. Entre novamente para continuar.', 'err');
      redirectToPlanLogin(planCode);
      return;
    }
    if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Não foi possível iniciar o pagamento.');
    window.location.assign(result.checkoutUrl);
  } catch (error) {
    console.error('[Ecomme plans] Falha ao iniciar checkout:', error);
    planToast(error.message || 'Erro ao iniciar o checkout.', 'err');
    setPlanButtonsBusy(false);
  }
}

function renderPlanAvailabilityNotice() {
  const notice = document.getElementById('planAvailabilityNotice');
  if (!notice) return;
  if (planCheckoutEnabled && planCheckoutEnvironment !== 'sandbox') {
    notice.hidden = true;
    notice.innerHTML = '';
    return;
  }
  notice.hidden = false;
  if (planAvailabilityError) {
    notice.innerHTML = '<div class="pan-copy"><span class="pan-title">Não foi possível verificar a disponibilidade das assinaturas.</span><span class="pan-description">' + planAvailabilityError.replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char])) + '</span></div><div class="pan-actions"><button class="pan-btn" type="button" onclick="retryLoadPlanAvailability()">Tentar novamente</button></div>';
    return;
  }
  if (planCheckoutEnabled && planCheckoutEnvironment === 'sandbox') {
    notice.innerHTML = '<div class="pan-copy"><span class="pan-title">Ambiente de testes ativo (Asaas Sandbox).</span><span class="pan-description">Os pagamentos realizados aqui são de teste e não representam uma cobrança real.</span></div>';
    return;
  }
  notice.innerHTML = '<div class="pan-copy"><span class="pan-title">Assinaturas ainda não estão disponíveis.</span><span class="pan-description">Estamos preparando a ativação dos planos e dos benefícios. Nenhuma cobrança será iniciada enquanto o checkout não for habilitado.</span></div>';
}

async function loadPlanAvailability() {
  planAvailabilityError = null;
  planCheckoutEnabled = false;
  try {
    const response = await fetch('/api/plans/config', { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível consultar a disponibilidade dos planos.');
    planCheckoutEnabled = result.checkoutEnabled === true;
    planCheckoutEnvironment = result.environment || 'unavailable';
  } catch (error) {
    planAvailabilityError = error.message || 'Verifique sua conexão e tente novamente.';
  }
  renderPlanAvailabilityNotice();
  updatePlanCards();
}

function retryLoadPlanAvailability() {
  loadPlanAvailability();
}

function renderPlanAccountNotice() {
  const notice = document.getElementById('planAccountNotice');
  if (!notice) return;
  if (planLoadError) {
    notice.hidden = false;
    notice.innerHTML = `<div class="pan-copy"><span class="pan-title">Não foi possível consultar sua assinatura.</span><span class="pan-description">${planLoadError.replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]))}</span></div><div class="pan-actions"><button class="pan-btn" type="button" onclick="retryLoadCurrentPlan()">Tentar novamente</button></div>`;
    return;
  }
  const current = currentPlanState.currentPlan || { code: 'free' };
  const pending = currentPlanState.pendingCheckout;
  const paymentIssue = currentPlanState.paymentIssue;
  const currentName = current.code === 'free' ? 'Grátis' : (PLAN_CONFIG[current.code]?.name || 'Plano pago');
  const currentActive = current.code !== 'free' && current.currentPeriodEnd && new Date(current.currentPeriodEnd).getTime() > Date.now();

  if (!planSession) {
    notice.hidden = true;
    notice.innerHTML = '';
    return;
  }

  notice.hidden = false;
  if (pending) {
    const pendingName = PLAN_CONFIG[pending.plan]?.name || 'plano selecionado';
    if (pending.status === 'awaiting_payment') {
      notice.innerHTML = `<div class="pan-copy"><span class="pan-title">Checkout do ${pendingName} concluído.</span><span class="pan-description">O Asaas está processando a primeira cobrança. Seu plano será ativado assim que o pagamento for confirmado.</span></div>`;
    } else {
      notice.innerHTML = `<div class="pan-copy"><span class="pan-title">Você tem um checkout pendente para o ${pendingName}.</span><span class="pan-description">Conclua o checkout no Asaas. O plano só será ativado depois da confirmação da primeira cobrança.</span></div><div class="pan-actions"><button class="pan-btn" type="button" onclick="resumePendingPlanCheckout()">Retomar pagamento</button></div>`;
    }
    return;
  }

  if (paymentIssue && !currentActive) {
    const failedName = PLAN_CONFIG[paymentIssue.plan]?.name || 'plano selecionado';
    notice.innerHTML = `<div class="pan-copy"><span class="pan-title">Não foi possível confirmar a cobrança do ${failedName}.</span><span class="pan-description">Confira a situação do pagamento e tente novamente escolhendo um plano.</span></div>`;
    return;
  }

  if (!currentActive) {
    notice.innerHTML = `
      <div class="pan-copy">
        <span class="pan-title">Seu plano atual é ${currentName}.</span>
        <span class="pan-description">Escolha um plano pago para iniciar uma assinatura. A cobrança e a ativação são processadas pelo checkout.</span>
      </div>`;
    return;
  }

  const endDate = formatPlanDate(current.currentPeriodEnd);
  if (current.cancelAtPeriodEnd || current.status === 'canceled') {
    notice.innerHTML = `
      <div class="pan-copy">
        <span class="pan-title">Renovação cancelada — ${currentName} continua ativo.</span>
        <span class="pan-description">Você mantém os benefícios até ${endDate}. Depois dessa data, sua conta volta ao plano Grátis.</span>
      </div>`;
  } else if (current.status === 'past_due') {
    notice.innerHTML = `
      <div class="pan-copy">
        <span class="pan-title">${currentName}: pagamento em atraso.</span>
        <span class="pan-description">Verifique sua cobrança no Asaas. O acesso permanece sujeito ao período já pago, até ${endDate}.</span>
      </div>
      <div class="pan-actions"><button class="pan-btn secondary" type="button" onclick="cancelCurrentPlan()">Cancelar renovação</button></div>`;
  } else {
    notice.innerHTML = `
      <div class="pan-copy">
        <span class="pan-title">Seu plano atual é ${currentName}.</span>
        <span class="pan-description">Próxima renovação prevista. O período atual termina em ${endDate}. Você pode cancelar a renovação e manter os benefícios até essa data.</span>
      </div>
      <div class="pan-actions"><button class="pan-btn secondary" type="button" onclick="cancelCurrentPlan()">Cancelar renovação</button></div>`;
  }
}

function updatePlanCards() {
  if (planLoadError) {
    document.querySelectorAll('#btn-plan-plus,#btn-plan-premium,#btn-plan-business,#btn-plan-free').forEach(button => { if (button) button.disabled = true; });
    document.querySelectorAll('.current-plan-bar').forEach(bar => { bar.hidden = true; });
    return;
  }
  const current = currentPlanState.currentPlan || { code: 'free' };
  const pending = currentPlanState.pendingCheckout;
  const currentActive = current.code !== 'free' && current.currentPeriodEnd && new Date(current.currentPeriodEnd).getTime() > Date.now();
  const blocked = Boolean(currentActive || pending);
  const freeCurrentBar = document.getElementById('current-plan-free');
  if (freeCurrentBar) freeCurrentBar.hidden = current.code !== 'free';

  const freeButton = document.getElementById('btn-plan-free');
  if (freeButton) {
    freeButton.dataset.planLocked = String(!currentActive || Boolean(current.cancelAtPeriodEnd));
    if (currentActive && !current.cancelAtPeriodEnd) {
      freeButton.disabled = planCheckoutBusy;
      freeButton.textContent = 'Cancelar renovação';
    } else if (currentActive) {
      freeButton.disabled = true;
      freeButton.textContent = 'Renovação cancelada';
    } else {
      freeButton.disabled = true;
      freeButton.textContent = current.code === 'free' ? 'Plano Atual' : 'Plano Grátis';
    }
  }

  Object.keys(PLAN_CONFIG).forEach(code => {
    const button = document.getElementById(`btn-plan-${code}`);
    const currentBar = document.getElementById(`current-plan-${code}`);
    const isCurrent = current.code === code && currentActive;
    if (currentBar) currentBar.hidden = !isCurrent;
    if (!button) return;
    button.dataset.planLocked = String(blocked || isCurrent || !planCheckoutEnabled);
    if (isCurrent) button.textContent = 'Plano Atual';
    else if (pending) button.textContent = 'Pagamento Pendente';
    else if (currentActive) button.textContent = 'Plano indisponível até o fim do ciclo';
    else if (!planCheckoutEnabled) button.textContent = 'Assinaturas indisponíveis';
    else button.innerHTML = `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg> Assinar ${PLAN_CONFIG[code].shortName}`;
    button.disabled = planCheckoutBusy || blocked || !planCheckoutEnabled;
  });
  if (freeButton && planCheckoutBusy) freeButton.disabled = true;
}

async function loadCurrentPlan() {
  planLoadError = null;
  try {
    const session = await getPlanSession();
    if (!session?.access_token) {
      currentPlanState = { currentPlan: { code: 'free', status: 'active', amount: 0 }, pendingCheckout: null };
      updatePlanCards();
      renderPlanAccountNotice();
      return;
    }
    const response = await fetch('/api/plans/current', { headers: { authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível consultar seu plano.');
    currentPlanState = result;
  } catch (error) {
    console.warn('[Ecomme plans] Não foi possível carregar o plano:', error);
    planLoadError = error.message || 'Verifique sua conexão e tente novamente.';
    currentPlanState = { currentPlan: { code: 'unknown', status: 'unknown', amount: 0 }, pendingCheckout: null };
  }
  updatePlanCards();
  renderPlanAccountNotice();
}

function retryLoadCurrentPlan() {
  loadCurrentPlan();
}

function resumePendingPlanCheckout() {
  const url = currentPlanState.pendingCheckout?.checkoutUrl;
  if (currentPlanState.pendingCheckout?.status === 'awaiting_payment') {
    planToast('O checkout já foi concluído. Aguarde a confirmação da primeira cobrança.', 'info');
    return;
  }
  if (!url || !/^https:\/\/asaas\.com\/checkoutSession\/show\?id=[a-zA-Z0-9-]+$/.test(url)) {
    planToast('O link de pagamento não está disponível. Atualize a página e tente novamente.', 'err');
    return;
  }
  window.location.assign(url);
}

async function cancelCurrentPlan() {
  const current = currentPlanState.currentPlan || {};
  if (!current.code || current.code === 'free' || current.cancelAtPeriodEnd) return;
  if (!window.confirm(`Deseja cancelar a renovação do ${PLAN_CONFIG[current.code]?.name || 'plano'}? Você continuará com os benefícios até ${formatPlanDate(current.currentPeriodEnd)}.`)) return;
  let session;
  try { session = await getPlanSession(); }
  catch (error) { planToast(error.message, 'err'); return; }
  if (!session?.access_token) { planToast('Entre novamente para cancelar sua assinatura.', 'err'); return; }

  setPlanButtonsBusy(true);
  try {
    const response = await fetch('/api/plans/cancel', {
      method: 'POST', headers: { authorization: `Bearer ${session.access_token}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível cancelar a renovação.');
    planToast(`Renovação cancelada. Seus benefícios permanecem até ${formatPlanDate(result.currentPeriodEnd)}.`, 'ok');
    await loadCurrentPlan();
  } catch (error) {
    console.error('[Ecomme plans] Falha ao cancelar renovação:', error);
    planToast(error.message, 'err');
  } finally {
    setPlanButtonsBusy(false);
    updatePlanCards();
  }
}

function handleFreePlanAction() {
  const current = currentPlanState.currentPlan || {};
  if (current.code === 'free' || !current.code) {
    planToast('Você já está no plano Grátis.');
    return;
  }
  cancelCurrentPlan();
}

/* ─── FAQ ───────────────────────────────────────────────────────────── */
function toggleFaq(btn) {
  const item = btn?.closest('.faq-item');
  if (!item) return;
  const answer = item.querySelector('.faq-a');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(openItem => {
    openItem.classList.remove('open');
    const openAnswer = openItem.querySelector('.faq-a');
    if (openAnswer) openAnswer.style.maxHeight = null;
  });
  if (!wasOpen && answer) {
    item.classList.add('open');
    answer.style.maxHeight = `${answer.scrollHeight}px`;
  }
}

/* ─── REVEAL ON SCROLL ───────────────────────────────────────────────── */
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in', 'visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal, .stat-it').forEach(element => revealObserver.observe(element));

  const planObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        planObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.plan-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(32px)';
    card.style.transition = 'opacity .6s var(--ease), transform .6s var(--ease)';
    planObserver.observe(card);
  });
}

/* ─── COMPARISON TABLE COLUMN HOVER ──────────────────────────────────── */
document.querySelectorAll('.ct-cell.featured-col, .ct-head-cell.featured-col').forEach(cell => {
  const index = Array.from(cell.parentElement.children).indexOf(cell);
  cell.addEventListener('mouseenter', () => {
    document.querySelectorAll('.ct-row').forEach(row => {
      if (row.children[index]) row.children[index].style.background = 'rgba(37,99,235,.08)';
    });
  });
  cell.addEventListener('mouseleave', () => {
    document.querySelectorAll('.ct-row').forEach(row => {
      if (row.children[index]) row.children[index].style.background = '';
    });
  });
});

/* ─── PLAN CARD TILT (DESKTOP) ───────────────────────────────────────── */
if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('mousemove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-8px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
      card.style.transition = 'transform .1s';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform .4s var(--ease)';
    });
  });
}

/* ─── RETORNO DO CHECKOUT / INICIALIZAÇÃO ────────────────────────────── */
async function initPlansPage() {
  const params = new URLSearchParams(window.location.search);
  const checkoutResult = params.get('checkout');
  if (checkoutResult === 'success') {
    planToast('Checkout concluído. Estamos aguardando a confirmação segura do Asaas para ativar seu plano.', 'info');
  } else if (checkoutResult === 'cancelled') {
    planToast('O checkout foi cancelado. Nenhum plano foi ativado.', 'info');
  } else if (checkoutResult === 'expired') {
    planToast('O checkout expirou. Escolha o plano novamente para gerar um novo pagamento.', 'err');
  }
  if (checkoutResult) window.history.replaceState({}, document.title, '/plans');

  await loadPlanAvailability();
  await loadCurrentPlan();

  const requestedPlan = String(params.get('plan') || '').toLowerCase();
  const requestedBilling = String(params.get('billing') || '').toLowerCase();
  if (PLAN_CONFIG[requestedPlan] && ['monthly', 'annual'].includes(requestedBilling)) {
    if (isAnnual !== (requestedBilling === 'annual')) toggleBilling();
    await selectPlan(requestedPlan);
  }
}

document.addEventListener('DOMContentLoaded', initPlansPage, { once: true });
