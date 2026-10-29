(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let notificationLoadError = null;
let notifications = [];
let currentFilter = 'todas';

function notify(message, type = 'ok') {
  if (typeof window.showToast === 'function') window.showToast(message, type);
  else console.info('[Ecomme notificações]', message);
}

const iconMap = {
  order: `<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  shipped: `<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  delivered: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="16 10 11 15 8 12"/></svg>`,
  return: `<svg viewBox="0 0 24 24"><path d="M3 7h13a5 5 0 0 1 0 10h-2"/><polyline points="7 3 3 7 7 11"/></svg>`,
  promo: `<svg viewBox="0 0 24 24"><path d="M20.59 13.41 13.42 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  coupon: `<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4h18v-4a2 2 0 0 1 0-4V5H3z"/><path d="M13 5v14"/></svg>`,
  product: `<svg viewBox="0 0 24 24"><path d="M20 7.5 12 3 4 7.5v9L12 21l8-4.5z"/><path d="M4.5 7.7 12 12l7.5-4.3M12 12v9"/></svg>`,
  wishlist: `<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/></svg>`,
  system: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  review: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  account: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  security: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><polyline points="9 12 11 14 15 10"/></svg>`
};

const groupLabels = { hoje: 'Hoje', ontem: 'Ontem', semana: 'Esta Semana', antigas: 'Mais Antigas' };
const groupOrder = ['hoje', 'ontem', 'semana', 'antigas'];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function safeHref(href) {
  if (!href) return '';
  try {
    const url = new URL(String(href), window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : '';
  } catch (_) { return ''; }
}

function getGroup(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return 'antigas';
  if (date.toDateString() === now.toDateString()) return 'hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'ontem';
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return date >= weekAgo ? 'semana' : 'antigas';
}

function normalizeItem(row) {
  return {
    ...row,
    read: Boolean(row.read_at),
    group: getGroup(row.created_at),
    time: window.EcommeNotifications?.formatTime(row.created_at) || '',
    text: row.body || '',
    href: safeHref(row.target_url),
    ctaLabel: row.metadata?.action_label || 'Abrir',
    iconType: iconMap[row.type] ? row.type : (['order', 'shipped', 'delivered', 'return', 'promo', 'coupon', 'product', 'wishlist', 'review', 'account', 'security'].includes(row.type) ? row.type : 'system')
  };
}

function setActiveTab(btn) {
  document.querySelectorAll('.ftab').forEach(tab => tab.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (btn) movePill(btn);
}

function movePill(btn) {
  const bg = $('filterPillBg');
  const wrap = $('filterTabs');
  if (!bg || !wrap || !btn) return;
  const wrapRect = wrap.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  bg.style.left = (btnRect.left - wrapRect.left) + 'px';
  bg.style.width = btnRect.width + 'px';
}

function matchesFilter(n) {
  if (currentFilter === 'todas') return true;
  if (currentFilter === 'nao-lidas') return !n.read;
  if (currentFilter === 'order') return ['order', 'shipped', 'delivered', 'return'].includes(n.type);
  if (currentFilter === 'promo') return ['promo', 'coupon', 'wishlist'].includes(n.type);
  if (currentFilter === 'system') return ['system', 'account', 'security'].includes(n.type);
  return n.type === currentFilter;
}

function renderNotifications(skipAnim = false) {
  const api = window.EcommeNotifications;
  notifications = (api?.getNotifications?.() || []).map(normalizeItem);
  updateCounts();
  const wrap = $('notifSection');
  if (!wrap) return;
  wrap.setAttribute('aria-busy', 'false');
  if (notificationLoadError) { renderLoadError(); return; }

  if (api && !api.isAuthenticated()) {
    wrap.innerHTML = `<div class="empty-notif"><div class="ico">🔔</div><h3>Acesse sua conta</h3><p>Entre na Ecomme para sincronizar suas notificações entre dispositivos.</p><a class="ni-cta primary" href="/login?redirect=%2Fnotifications">Entrar na conta</a></div>`;
    return;
  }

  const list = notifications.filter(matchesFilter);
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-notif"><div class="ico">🔔</div><h3>Tudo em dia por aqui</h3><p>Não há notificações para este filtro no momento.</p></div>`;
    return;
  }

  let html = '';
  let delayIndex = 0;
  groupOrder.forEach(group => {
    const items = list.filter(item => item.group === group);
    if (!items.length) return;
    html += `<div class="group-label">${groupLabels[group]}</div>`;
    items.forEach(item => {
      html += renderItem(item, skipAnim ? 0 : delayIndex * 0.04);
      delayIndex++;
    });
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll('.notif-item[data-notification-id]').forEach(item => {
    item.addEventListener('click', event => {
      const id = item.dataset.notificationId;
      const actionLink = event.target.closest('[data-open-notification]');
      if (actionLink) { event.preventDefault(); openNotification(id); return; }
      if (event.target.closest('button, a')) return;
      openNotification(id);
    });
    item.addEventListener('keydown', event => {
      if (event.target !== item || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openNotification(item.dataset.notificationId);
    });
  });
}

function renderItem(n, delay) {
  const href = safeHref(n.href);
  const ctaHtml = href ? `<div class="ni-cta-row"><a class="ni-cta ${['order', 'shipped', 'delivered'].includes(n.type) ? 'primary' : 'ghost'}" href="${esc(href)}" data-open-notification>${esc(n.ctaLabel || 'Abrir')}</a></div>` : '';
  return `
    <article class="notif-item ${n.read ? '' : 'unread'}" id="ni-${esc(n.id)}" data-notification-id="${esc(n.id)}" tabindex="0" aria-label="Abrir notificação: ${esc(n.title)}" style="animation-delay:${delay}s">
      <div class="ni-icon ${esc(n.iconType)}">${iconMap[n.iconType] || iconMap.system}</div>
      <div class="ni-body">
        <div class="ni-top"><span class="ni-title">${esc(n.title)}</span><span class="ni-time">${esc(n.time)}</span></div>
        <div class="ni-text">${esc(n.text)}</div>${ctaHtml}
      </div>
      <div class="ni-side"><span class="ni-dot ${n.read ? 'hidden-dot' : ''}" id="dot-${esc(n.id)}"></span><button class="ni-del" onclick="event.stopPropagation();deleteNotification('${esc(n.id)}')" title="Remover" aria-label="Remover notificação"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
  </article>`;
}

function updateCounts() {
  const total = notifications.length;
  const unread = notifications.filter(item => !item.read).length;
  const order = notifications.filter(item => ['order', 'shipped', 'delivered', 'return'].includes(item.type)).length;
  const promo = notifications.filter(item => ['promo', 'coupon', 'wishlist'].includes(item.type)).length;
  const system = notifications.filter(item => ['system', 'account', 'security'].includes(item.type)).length;
  if ($('cnt-todas')) $('cnt-todas').textContent = total;
  if ($('cnt-nao-lidas')) $('cnt-nao-lidas').textContent = unread;
  if ($('cnt-order')) $('cnt-order').textContent = order;
  if ($('cnt-promo')) $('cnt-promo').textContent = promo;
  if ($('cnt-system')) $('cnt-system').textContent = system;
  if ($('unreadCountText')) $('unreadCountText').textContent = unread;
  if ($('bellBadge')) {
    $('bellBadge').textContent = unread;
    $('bellBadge').style.display = unread ? 'flex' : 'none';
  }
  if ($('readAllBtn')) $('readAllBtn').disabled = unread === 0;
  const sidebarCount = $('notifCount');
  if (sidebarCount) sidebarCount.textContent = `(${total})`;
}

async function openNotification(id) {
  const api = window.EcommeNotifications;
  const row = notifications.find(item => String(item.id) === String(id));
  if (!row || !api) return;
  try {
    await api.markRead(id);
    notify('Notificação marcada como lida.', 'ok');
    if (row.href) window.location.href = row.href;
    else if (currentFilter === 'nao-lidas') renderNotifications(true);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    notify('Não foi possível atualizar a notificação.', 'err');
  }
}

async function deleteNotification(id) {
  const el = $('ni-' + id);
  if (el) el.classList.add('removing');
  try {
    await window.EcommeNotifications.deleteNotification(id);
    notify('Notificação removida.');
  } catch (error) {
    console.error('Erro ao remover notificação:', error);
    notify('Não foi possível remover a notificação.', 'err');
  }
}

async function markAllRead() {
  try {
    await window.EcommeNotifications.markAllRead();
    notify('Todas as notificações foram marcadas como lidas ✓');
  } catch (error) {
    console.error('Erro ao marcar notificações:', error);
    notify('Não foi possível marcar as notificações.', 'err');
  }
}

function openSettings() {
  const panel = $('settingsPanel');
  const overlay = $('settingsOverlay');
  panel?.classList.add('on');
  overlay?.classList.add('on');
  panel?.setAttribute('aria-hidden', 'false');
  overlay?.setAttribute('aria-hidden', 'false');
  window.EcommeNotifications?.applyPreferencesToUI();
  panel?.querySelector('.sp-close')?.focus();
}
function closeSettings() {
  $('settingsPanel')?.classList.remove('on');
  $('settingsOverlay')?.classList.remove('on');
  $('settingsPanel')?.setAttribute('aria-hidden', 'true');
  $('settingsOverlay')?.setAttribute('aria-hidden', 'true');
  $('settingsButton')?.focus();
}
function toggleSwitch(button) {
  const enabled = !button.classList.contains('on');
  button.classList.toggle('on', enabled);
  button.setAttribute('aria-pressed', String(enabled));
}
async function savePrefs() {
  try {
    await window.EcommeNotifications.saveFromMiniPanel();
    closeSettings();
  } catch (_) {}
}

// Mantém a interface sincronizada quando uma notificação chega em tempo real.
window.addEventListener('ecomme:notifications-changed', () => renderNotifications(true));
function renderLoadError() {
  const wrap = $('notifSection');
  if (!wrap || !notificationLoadError) return;
  const message = String(notificationLoadError.message || '');
  const missingTable = /user_notifications|user_notification_preferences|relation .* does not exist/i.test(message) || notificationLoadError.code === '42P01';
  wrap.setAttribute('aria-busy', 'false');
  wrap.innerHTML = `<div class="empty-notif error-state"><div class="ico">⚠️</div><h3>Não foi possível carregar as notificações</h3><p>${missingTable ? 'Execute o arquivo supabase/notifications.sql no SQL Editor do Supabase e confirme as políticas RLS.' : 'Confira a conexão com o Supabase e as permissões da sua conta.'}</p><button type="button" class="ni-cta primary" id="retryNotificationsBtn">Tentar novamente</button></div>`;
  $('retryNotificationsBtn')?.addEventListener('click', retryNotifications);
}
async function retryNotifications() {
  const api = window.EcommeNotifications;
  if (!api) return;
  notificationLoadError = null;
  const wrap = $('notifSection');
  if (wrap) {
    wrap.setAttribute('aria-busy', 'true');
    wrap.innerHTML = `<div class="skeleton-item"><span class="sk-circle"></span><div class="sk-lines"><span class="sk-line w60"></span><span class="sk-line w90"></span></div></div><div class="skeleton-item"><span class="sk-circle"></span><div class="sk-lines"><span class="sk-line w60"></span><span class="sk-line w90"></span></div></div>`;
  }
  await api.loadNotifications();
  if (!notificationLoadError) renderNotifications(true);
}
window.addEventListener('ecomme:notifications-error', event => {
  notificationLoadError = event.detail?.error || new Error('Falha ao carregar notificações.');
  console.error('Falha na camada de notificações:', notificationLoadError);
  renderLoadError();
});
document.querySelectorAll('.ftab').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter || 'todas';
    setActiveTab(button);
    renderNotifications(true);
  });
});

async function initNotificationPage() {
  const api = window.EcommeNotifications;
  if (!api) {
    const wrap = $('notifSection');
    if (wrap) {
      wrap.setAttribute('aria-busy', 'false');
      wrap.innerHTML = '<div class="empty-notif error-state"><div class="ico">⚠️</div><h3>Não foi possível inicializar as notificações</h3><p>Confira se os scripts compartilhados e o cliente Supabase foram carregados.</p></div>';
    }
    return;
  }
  try {
    await api.init();
    api.applyPreferencesToUI();
    if (!notificationLoadError) renderNotifications(true);
  } catch (error) {
    console.error('[Ecomme] Erro ao inicializar a página de notificações:', error);
    notificationLoadError = error;
    renderLoadError();
  }
  requestAnimationFrame(() => {
    const active = document.querySelector('.ftab.active');
    if (active) movePill(active);
  });
}

Object.assign(window, { openNotification, deleteNotification, markAllRead, openSettings, closeSettings, toggleSwitch, savePrefs, retryNotifications });
window.addEventListener('keydown', event => { if (event.key === 'Escape' && $('settingsPanel')?.classList.contains('on')) closeSettings(); });
window.addEventListener('resize', () => { const active = document.querySelector('.ftab.active'); if (active) movePill(active); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNotificationPage, { once: true });
else initNotificationPage();
})();
