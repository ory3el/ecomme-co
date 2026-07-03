const $ = id => document.getElementById(id);
 
/* ─── NOTIFICATIONS DATA ─────────────────────────────────────────────── */
let notifications = [
  {
    id: 'n1', type: 'order', read: false, group: 'hoje', time: '08:15',
    title: 'Seu pedido saiu para entrega 🚚',
    text: 'Pedido <strong>#EC2026-48271</strong> está com o entregador e chega ainda hoje à tarde.',
    cta: { label: 'Rastrear Pedido', href: 'track-order.html?order=EC2026-48271&email=mariana.ferreira@exemplo.com', icon: 'order' }
  },
  {
    id: 'n2', type: 'promo', read: false, group: 'hoje', time: '07:02',
    title: 'Oferta relâmpago: 40% OFF ⚡',
    text: 'Eletrônicos selecionados com desconto especial só até meia-noite. Não perca!',
    cta: { label: 'Ver Ofertas', href: 'products.html', icon: 'ghost' }
  },
  {
    id: 'n3', type: 'review', read: false, group: 'ontem', time: 'Ontem · 19:40',
    title: 'O que achou do seu Smartwatch Pro X7?',
    text: 'Avalie sua compra e ajude outros clientes a decidir. Leva menos de 1 minuto.',
    cta: { label: 'Avaliar Produto', href: 'product-example.html', icon: 'ghost' }
  },
  {
    id: 'n4', type: 'account', read: false, group: 'ontem', time: 'Ontem · 11:15',
    title: 'Novo login detectado',
    text: 'Identificamos um acesso à sua conta a partir de um novo dispositivo em Curitiba, PR.',
    cta: null
  },
  {
    id: 'n5', type: 'delivered', read: true, group: 'semana', time: 'Segunda · 14:22',
    title: 'Pedido entregue com sucesso ✓',
    text: 'Pedido <strong>#EC2026-47950</strong> foi entregue. Esperamos que aproveite sua compra!',
    cta: { label: 'Ver Pedido', href: 'my-orders.html', icon: 'ghost' }
  },
  {
    id: 'n6', type: 'promo', read: true, group: 'semana', time: 'Domingo · 09:00',
    title: 'Frete grátis em toda a loja esse fim de semana',
    text: 'Aproveite frete grátis sem valor mínimo de compra até domingo às 23h59.',
    cta: { label: 'Explorar Produtos', href: 'products.html', icon: 'ghost' }
  },
  {
    id: 'n7', type: 'system', read: true, group: 'semana', time: 'Sábado · 16:30',
    title: 'Atualizamos nossos Termos de Uso',
    text: 'Fizemos pequenos ajustes na nossa política de privacidade e termos de uso.',
    cta: { label: 'Ler Termos', href: 'terms.html', icon: 'ghost' }
  },
  {
    id: 'n8', type: 'order', read: true, group: 'antigas', time: '12 de junho',
    title: 'Pagamento aprovado',
    text: 'O pagamento do pedido <strong>#EC2026-47950</strong> foi aprovado via Pix.',
    cta: { label: 'Rastrear Pedido', href: 'track-order.html?order=EC2026-47950&email=mariana.ferreira@exemplo.com', icon: 'order' }
  },
  {
    id: 'n9', type: 'system', read: true, group: 'antigas', time: '05 de junho',
    title: 'Bem-vinda à Ecomme! 🎉',
    text: 'Sua conta foi criada com sucesso. Explore nosso catálogo e aproveite o frete grátis de lançamento.',
    cta: { label: 'Explorar Produtos', href: 'products.html', icon: 'ghost' }
  },
];
 
const iconMap = {
  order:     `<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  promo:     `<svg viewBox="0 0 24 24"><path d="M20.59 13.41 13.42 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  system:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  review:    `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  account:   `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  delivered: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="16 10 11 15 8 12"/></svg>`,
};
 
const groupLabels = { hoje: 'Hoje', ontem: 'Ontem', semana: 'Esta Semana', antigas: 'Mais Antigas' };
const groupOrder  = ['hoje', 'ontem', 'semana', 'antigas'];
 
let currentFilter = 'todas';
 
/* ─── RENDER ─────────────────────────────────────────────────────────── */
function renderNotifications(skipAnim) {
  updateCounts();
  const wrap = $('notifSection');
 
  let list = notifications.filter(n => {
    if (currentFilter === 'todas') return true;
    if (currentFilter === 'nao-lidas') return !n.read;
    return n.type === currentFilter;
  });
 
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-notif">
        <div class="ico">🔔</div>
        <h3>Tudo em dia por aqui</h3>
        <p>Não há notificações para este filtro no momento.</p>
      </div>`;
    return;
  }
 
  let html = '';
  let delayIdx = 0;
  groupOrder.forEach(g => {
    const items = list.filter(n => n.group === g);
    if (!items.length) return;
    html += `<div class="group-label">${groupLabels[g]}</div>`;
    items.forEach(n => {
      const delay = skipAnim ? 0 : (delayIdx * 0.05);
      delayIdx++;
      html += renderItem(n, delay);
    });
  });
 
  wrap.innerHTML = html;
}

const card
const card

function renderItem(n, delay) {
  const ctaHtml = n.cta
    ? `<div class="ni-cta-row">
         <a class="ni-cta ${n.cta.icon === 'order' ? 'primary' : 'ghost'}" href="${n.cta.href}" onclick="event.stopPropagation()">${n.cta.label}</a>
       </div>`
    : '';
  return `
    <div class="notif-item ${n.read ? '' : 'unread'} ${n._isNew ? 'new-arrival' : ''}" id="ni-${n.id}"
         style="animation-delay:${delay}s" onclick="openNotification('${n.id}')">
      <div class="ni-icon ${n.type}">${iconMap[n.type]}</div>
      <div class="ni-body">
        <div class="ni-top">
          <span class="ni-title">${n.title}</span>
          <span class="ni-time">${n.time}</span>
        </div>
        <div class="ni-text">${n.text}</div>
        ${ctaHtml}
      </div>
      <div class="ni-side">
        <span class="ni-dot ${n.read ? 'hidden-dot' : ''}" id="dot-${n.id}"></span>
        <button class="ni-del" onclick="event.stopPropagation();deleteNotification('${n.id}')" title="Remover">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`;
}
 
/* ─── COUNTS ─────────────────────────────────────────────────────────── */
function updateCounts() {
  const total   = notifications.length;
  const unread  = notifications.filter(n => !n.read).length;
  const order   = notifications.filter(n => n.type === 'order' || n.type === 'delivered').length;
  const promo   = notifications.filter(n => n.type === 'promo').length;
  const system  = notifications.filter(n => n.type === 'system' || n.type === 'account').length;
 
  $('cnt-todas').textContent      = total;
  $('cnt-nao-lidas').textContent  = unread;
  $('cnt-order').textContent      = order;
  $('cnt-promo').textContent      = promo;
  $('cnt-system').textContent     = system;
 
  $('unreadCountText').textContent = unread;
  $('bellBadge').textContent = unread;
  $('bellBadge').style.display = unread ? 'flex' : 'none';
  $('readAllBtn').disabled = unread === 0;
}
 
/* ─── INTERACTIONS ───────────────────────────────────────────────────── */
function openNotification(id) {
  const n = notifications.find(x => x.id === id);
  if (!n) return;
  if (!n.read) {
    n.read = true;
    const el = $('ni-' + id);
    const dot = $('dot-' + id);
    if (el) el.classList.remove('unread');
    if (dot) dot.classList.add('hidden-dot');
    updateCounts();
    // re-render if filter is "não lidas" so it animates out
    if (currentFilter === 'nao-lidas') {
      setTimeout(() => renderNotifications(true), 250);
    }
  }
}
 
function deleteNotification(id) {
  const el = $('ni-' + id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(() => {
    notifications = notifications.filter(n => n.id !== id);
    renderNotifications(true);
    showToast('Notificação removida');
  }, 320);
}
 
function markAllRead() {
  const hadUnread = notifications.some(n => !n.read);
  if (!hadUnread) return;
  notifications.forEach(n => n.read = true);
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  document.querySelectorAll('.ni-dot').forEach(d => d.classList.add('hidden-dot'));
  updateCounts();
  showToast('Todas as notificações foram marcadas como lidas ✓');
  setTimeout(() => renderNotifications(true), 300);
}
 
/* ─── DEMO: simulate a new incoming notification ────────────────────── */
function simulateNewNotification() {
  const demoPool = [
    { type: 'promo', title: 'Cupom exclusivo liberado 🎁', text: 'Use <strong>BEMVINDA10</strong> e ganhe 10% OFF na próxima compra.', cta: { label: 'Usar Cupom', href: 'products.html', icon: 'ghost' } },
    { type: 'order', title: 'Pedido confirmado ✓', text: 'Recebemos seu pedido <strong>#EC2026-49120</strong> e já estamos preparando tudo.', cta: { label: 'Rastrear Pedido', href: 'track-order.html', icon: 'order' } },
    { type: 'system', title: 'Nova funcionalidade disponível', text: 'Agora você pode acompanhar pedidos em tempo real direto pela página de notificações.', cta: null },
  ];
  const pick = demoPool[Math.floor(Math.random() * demoPool.length)];
  const newNotif = {
    id: 'demo-' + Date.now(),
    type: pick.type, read: false, group: 'hoje', time: 'Agora mesmo',
    title: pick.title, text: pick.text, cta: pick.cta, _isNew: true
  };
  notifications.unshift(newNotif);
  currentFilter = 'todas';
  setActiveTab(document.querySelector('.ftab[data-filter="todas"]'));
  renderNotifications(true);
 
  $('bellBtn').classList.add('ring');
  $('bellBadge').classList.add('pop');
  setTimeout(() => { $('bellBtn').classList.remove('ring'); $('bellBadge').classList.remove('pop'); }, 700);
 
  showToast('Nova notificação recebida 🔔');
}
 
/* ─── FILTER TABS ────────────────────────────────────────────────────── */
function setActiveTab(btn) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  movePill(btn);
}
 
function movePill(btn) {
  const bg = $('filterPillBg');
  const wrapRect = $('filterTabs').getBoundingClientRect();
  const btnRect  = btn.getBoundingClientRect();
  bg.style.left  = (btnRect.left - wrapRect.left) + 'px';
  bg.style.width = btnRect.width + 'px';
}
 
document.querySelectorAll('.ftab').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    setActiveTab(btn);
    renderNotifications();
  });
});
 
/* ─── SETTINGS PANEL ─────────────────────────────────────────────────── */
function openSettings()  { $('settingsPanel').classList.add('on'); $('settingsOverlay').classList.add('on'); }
function closeSettings() { $('settingsPanel').classList.remove('on'); $('settingsOverlay').classList.remove('on'); }
function toggleSwitch(btn) { btn.classList.toggle('on'); }
function savePrefs() {
  showToast('Preferências salvas com sucesso! ⚙️');
  closeSettings();
}
 
/* ─── INIT ───────────────────────────────────────────────────────────── */
renderNotifications(true);
requestAnimationFrame(() => {
  const active = document.querySelector('.ftab.active');
  if (active) movePill(active);
});
