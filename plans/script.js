/* ─── BILLING TOGGLE ─────────────────────────────────────────────────── */
let isAnnual = false;

const prices = {
  monthly: { free: 'R$0', plus: '19', premium: '49', business: '99' },
  annual:  { free: 'R$0', plus: '15', premium: '39', business: '79' },
  saveNotes: {
    plus:     { m: '', a: 'R$48 de economia por ano' },
    premium:  { m: '', a: 'R$120 de economia por ano' },
    business: { m: '', a: 'R$240 de economia por ano' },
  }
};

function toggleBilling() {
  isAnnual = !isAnnual;
  const pill = $('tgPill');
  const lblM = $('lblMonthly');
  const lblA = $('lblAnnual');

  if (isAnnual) {
    pill.classList.add('annual');
    lblM.classList.remove('active');
    lblA.classList.add('active');
  } else {
    pill.classList.remove('annual');
    lblA.classList.remove('active');
    lblM.classList.add('active');
  }

  const p = isAnnual ? prices.annual : prices.monthly;
  const sn = prices.saveNotes;

  /* animate prices */
  ['plus','premium','business'].forEach(plan => {
    const el = $('amt-' + plan);
    el.classList.remove('price-anim');
    void el.offsetWidth;
    el.classList.add('price-anim');
    el.textContent = p[plan];

    const saveEl = $('save-' + plan);
    if (isAnnual) {
      saveEl.innerHTML = `<span style="animation:badgeSlide .4s var(--ease)">${sn[plan].a}</span>`;
    } else {
      saveEl.innerHTML = '&nbsp;';
    }
  });

  showToast(isAnnual ? '💰 Preços anuais aplicados — até 25% de desconto!' : 'Preços mensais aplicados.');
}

/* ─── SELECT PLAN ────────────────────────────────────────────────────── */
function selectPlan(name) {
  const period = isAnnual ? 'anual' : 'mensal';
  const priceMap = { Plus: isAnnual ? 'R$15' : 'R$19', Premium: isAnnual ? 'R$39' : 'R$49', Business: isAnnual ? 'R$79' : 'R$99' };
  showToast(`🎉 Iniciando assinatura ${name} — ${priceMap[name]}/mês (${period})`);
}

/* ─── FAQ ────────────────────────────────────────────────────────────── */
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const ans  = item.querySelector('.faq-a');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = null; });
  if (!wasOpen) { item.classList.add('open'); ans.style.maxHeight = ans.scrollHeight + 'px'; }
}

/* ─── REVEAL ON SCROLL ───────────────────────────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in','visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal, .stat-it').forEach(el => revealObs.observe(el));

/* ─── COMPARISON TABLE COLUMN HOVER ─────────────────────────────────── */
document.querySelectorAll('.ct-cell.featured-col, .ct-head-cell.featured-col').forEach(cell => {
  const idx = Array.from(cell.parentElement.children).indexOf(cell);
  cell.addEventListener('mouseenter', () => {
    document.querySelectorAll('.ct-row').forEach(row => {
      if (row.children[idx]) row.children[idx].style.background = 'rgba(37,99,235,.08)';
    });
  });
  cell.addEventListener('mouseleave', () => {
    document.querySelectorAll('.ct-row').forEach(row => {
      if (row.children[idx]) row.children[idx].style.background = '';
    });
  });
});

/* ─── PLAN CARD TILT ON MOUSE ────────────────────────────────────────── */
document.querySelectorAll('.plan-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-8px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
    card.style.transition = 'transform .1s';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform .4s var(--ease)';
  });
});

/* ─── STAGGER PLAN CARDS ─────────────────────────────────────────────── */
const planObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; planObs.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.plan-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(32px)';
  card.style.transition = 'opacity .6s var(--ease), transform .6s var(--ease)';
  planObs.observe(card);
});
