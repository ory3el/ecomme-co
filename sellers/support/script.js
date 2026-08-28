const $ = id => document.getElementById(id);

/* ─── SCROLL REVEAL ──────────────────────────────────────────────────── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in','visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal,.reveal-l,.reveal-r,.stat-it').forEach(el => observer.observe(el));

/* ─── ANIMATED STATUS BARS ───────────────────────────────────────────── */
const barObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.sb-bar-fill').forEach(bar => {
        bar.style.width = (bar.dataset.w || 0) + '%';
      });
      barObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll('.sb-card').forEach(el => {
  el.querySelectorAll('.sb-bar-fill').forEach(b => { b.style.width = '0'; b.style.transitionDelay = '.3s'; });
  barObserver.observe(el);
});

/* ─── LIVE AGENTS COUNTER ANIMATION ─────────────────────────────────── */
let agentBase = 12;
setInterval(() => {
  agentBase = Math.max(8, Math.min(18, agentBase + (Math.random() > .5 ? 1 : -1)));
  const el = $('agentsOnline');
  if (el) el.textContent = agentBase;
}, 3200);

/* ─── HERO SEARCH ────────────────────────────────────────────────────── */
function handleHeroSearch() {
  const q = $('heroSearch').value.trim();
  if (!q) { showToast('Digite algo para buscar!'); return; }
  showToast(`Buscando por "${q}"… 🔍`);
}
function quickSearch(q) {
  $('heroSearch').value = q;
  showToast(`Buscando por "${q}"… 🔍`);
}
$('heroSearch').addEventListener('keydown', e => { if (e.key === 'Enter') handleHeroSearch(); });

/* ─── CHAT ───────────────────────────────────────────────────────────── */
const chatReplies = [
  'Claro! Posso ajudar com isso agora mesmo. 😊',
  'Entendido! Já estou verificando para você.',
  'Ótima pergunta! A resposta é: sim, isso é possível.',
  'Sem problemas! Vou escalar para um especialista em segundos.',
  'Feito! Você receberá um e-mail de confirmação em instantes.',
  'Anotado. Posso te ajudar com mais alguma coisa?',
];
let chatMsgCount = 0;
function sendChatMsg() {
  const input = $('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  const body = $('chatBody');
  const now = new Date(); const hm = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const userDiv = document.createElement('div'); userDiv.className = 'cw-msg out';
  userDiv.innerHTML = `<div class="msg-ava user">MF</div><div><div class="msg-bubble">${msg}</div><div class="msg-time">${hm}</div></div>`;
  body.appendChild(userDiv); input.value = ''; body.scrollTop = body.scrollHeight;
  /* typing indicator */
  const typing = document.createElement('div'); typing.className = 'cw-typing'; typing.id = 'typingIndicator';
  typing.innerHTML = `<div class="msg-ava agent">AC</div><div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  body.appendChild(typing); body.scrollTop = body.scrollHeight;
  setTimeout(() => {
    typing.remove();
    const reply = chatReplies[chatMsgCount % chatReplies.length]; chatMsgCount++;
    const agDiv = document.createElement('div'); agDiv.className = 'cw-msg in';
    agDiv.innerHTML = `<div class="msg-ava agent">AC</div><div><div class="msg-bubble">${reply}</div><div class="msg-time">${hm}</div></div>`;
    body.appendChild(agDiv); body.scrollTop = body.scrollHeight;
  }, 1400 + Math.random() * 600);
}
function startChat() { document.querySelector('.chat-section').scrollIntoView({ behavior:'smooth', block:'center' }); setTimeout(() => $('chatInput').focus(), 600); }

/* ─── FAQ ────────────────────────────────────────────────────────────── */
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const ans  = item.querySelector('.faq-a');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = null; });
  if (!wasOpen) { item.classList.add('open'); ans.style.maxHeight = ans.scrollHeight + 'px'; }
}

/* ─── TICKET FORM ────────────────────────────────────────────────────── */
function submitTicket() {
  const subject = $('fSubject').value;
  const msg = $('fMsg').value.trim();
  if (!subject) { showToast('Selecione um assunto para o chamado.'); return; }
  if (!msg)     { showToast('Descreva seu problema antes de enviar.'); return; }
  const protocol = '#SUP-' + Math.floor(10000 + Math.random() * 90000);
  $('ticketProtocol').textContent = protocol;
  $('ticketFormWrap').style.display = 'none';
  const suc = $('formSuccess');
  suc.style.display = 'block';
  suc.style.animation = 'scaleIn .45s cubic-bezier(.4,0,.2,1)';
  showToast(`Chamado aberto! Protocolo ${protocol} 📋`);
}
function resetForm() {
  $('ticketFormWrap').style.display = 'block';
  $('formSuccess').style.display = 'none';
  $('fSubject').value = '';
  $('fOrder').value = '';
  $('fMsg').value = '';
}

/* ─── MISC ───────────────────────────────────────────────────────────── */
window.addEventListener('scroll', () => { $('btt').classList.toggle('on', window.scrollY > 300); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

/* ─── SAT CIRCLE ANIMATE ON VIEW ────────────────────────────────────── */
const satObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { const f = $('satFill'); if (f) { f.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1) .4s'; f.style.strokeDashoffset = '26'; } satObserver.disconnect(); } });
}, { threshold: 0.5 });
const satEl = document.querySelector('.sat-circle');
if (satEl) { document.querySelector('.sat-circle .fill').style.strokeDashoffset = '175'; satObserver.observe(satEl); }
