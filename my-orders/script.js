/* ─── CUSTOMER (shared identity used to deep-link into /track-order) ── */
const customerEmail = 'mariana.ferreira@exemplo.com';

/* ─── ORDERS DATA — kept in sync with the mock DB in /track-order ───── */
const orders = [
  {
    num: 'EC2026-48271',
    dateLabel: '18 de junho de 2026',
    dateSort: '2026-06-18',
    status: 'andamento',
    statusLabel: 'Saiu para Entrega',
    pillClass: 'amber',
    items: [
      { emoji: '⌚', name: 'Smartwatch Pro X7', qty: 1, price: 189.90 },
      { emoji: '🎧', name: 'Fone Bluetooth ANC Pro', qty: 1, price: 119.90 },
      { emoji: '🍶', name: 'Garrafa Térmica 1L Inox', qty: 1, price: 69.90 },
    ],
    total: 379.70,
    note: 'Previsão de entrega: hoje, 26 de junho de 2026.'
  },
  {
    num: 'EC2026-48590',
    dateLabel: '23 de junho de 2026',
    dateSort: '2026-06-23',
    status: 'andamento',
    statusLabel: 'Em Preparação',
    pillClass: 'blue',
    items: [
      { emoji: '💆', name: 'Mini Massageador Portátil', qty: 1, price: 129.90 },
    ],
    total: 129.90,
    note: 'Previsão de entrega: 29 de junho a 03 de julho de 2026.'
  },
  {
    num: 'EC2026-47950',
    dateLabel: '12 de junho de 2026',
    dateSort: '2026-06-12',
    status: 'entregue',
    statusLabel: 'Entregue',
    pillClass: 'green',
    items: [
      { emoji: '💡', name: 'Kit Luzes LED Smart RGB', qty: 1, price: 79.90 },
      { emoji: '🏠', name: 'Tapete Antiderrapante Premium', qty: 1, price: 89.90 },
    ],
    total: 169.80,
    note: 'Entregue em 14 de junho de 2026.'
  },
  {
    num: 'EC2026-47102',
    dateLabel: '05 de junho de 2026',
    dateSort: '2026-06-05',
    status: 'entregue',
    statusLabel: 'Entregue',
    pillClass: 'green',
    items: [
      { emoji: '🎒', name: 'Mochila Anti-Furto Executiva', qty: 1, price: 159.90 },
    ],
    total: 159.90,
    note: 'Entregue em 09 de junho de 2026.'
  },
  {
    num: 'EC2026-46210',
    dateLabel: '02 de junho de 2026',
    dateSort: '2026-06-02',
    status: 'cancelado',
    statusLabel: 'Cancelado',
    pillClass: 'red',
    items: [
      { emoji: '✨', name: 'Kit Skincare Vitamina C', qty: 1, price: 99.90 },
    ],
    total: 99.90,
    note: 'Cancelado em 03/06/2026 a pedido do cliente. Reembolso processado via Pix em 05/06/2026.'
  },
];

/* ─── STATE ──────────────────────────────────────────────────────────── */
let cart = [];
let wishlist = [];
const $ = id => document.getElementById(id);
const fmt = p => 'R$ ' + p.toFixed(2).replace('.', ',');

/* ─── RENDER ORDERS ──────────────────────────────────────────────────── */
function renderOrders() {
  const q      = $('searchInput').value.toLowerCase().trim();
  const status = $('statusFilter').value;
  const sort   = $('sortSelect').value;

  let list = orders.filter(o => {
    const matchQ = !q || o.num.toLowerCase().includes(q) ||
      o.items.some(it => it.name.toLowerCase().includes(q));
    const matchStatus = status === 'todos' || o.status === status;
    return matchQ && matchStatus;
  });

  if (sort === 'recentes') list.sort((a, b) => b.dateSort.localeCompare(a.dateSort));
  if (sort === 'antigos')  list.sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  if (sort === 'maior')    list.sort((a, b) => b.total - a.total);
  if (sort === 'menor')    list.sort((a, b) => a.total - b.total);

  $('resultCount').textContent = `${list.length} pedido${list.length !== 1 ? 's' : ''}`;

  const wrap = $('ordersList');
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-orders">
        <div class="ico">📦</div>
        <h3>Nenhum pedido encontrado</h3>
        <p>Tente ajustar sua busca ou os filtros selecionados.</p>
        <button class="btn-clear-filters" onclick="clearFilters()">Limpar filtros</button>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map((o, i) => {
    const thumbs = o.items.slice(0, 3).map(it => `<div class="oc-thumb">${it.emoji}</div>`).join('');
    const extra  = o.items.length > 3 ? `<div class="oc-thumb more">+${o.items.length - 3}</div>` : '';
    const itemsLabel = `${o.items.length} ${o.items.length === 1 ? 'item' : 'itens'}`;
    const trackUrl = `track-order.html?order=${encodeURIComponent(o.num)}&email=${encodeURIComponent(customerEmail)}`;

    const isCancel = o.status === 'cancelado';
    const noteBox = isCancel
      ? `<div class="od-info-box cancel-note">
           <h5><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Pedido Cancelado</h5>
           <p>${o.note}</p>
         </div>`
      : `<div class="od-info-box">
           <h5><svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Status da Entrega</h5>
           <p>${o.note}</p>
         </div>`;

    return `
      <div class="order-card" id="oc-${i}">
        <div class="oc-main">
          <div class="oc-id-col">
            <div class="oc-num">#${o.num}</div>
            <div class="oc-date">${o.dateLabel}</div>
          </div>
          <div class="oc-status-col">
            <span class="status-pill ${o.pillClass}"><span class="dot"></span>${o.statusLabel}</span>
          </div>
          <div class="oc-items-col">
            <div class="oc-thumbs">${thumbs}${extra}</div>
            <span class="oc-items-label">${itemsLabel}</span>
          </div>
          <div class="oc-total-col">
            <div class="oc-total">${fmt(o.total)}</div>
            <div class="oc-total-label">Total</div>
          </div>
          <div class="oc-actions-col">
            <a class="btn-track-order" href="${trackUrl}">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Rastrear Pedido
            </a>
            <button class="btn-expand" onclick="toggleOrder(${i})" title="Ver detalhes">
              <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
        <div class="oc-detail" id="ocDetail-${i}">
          <div class="oc-detail-inner">
            <div class="od-items">
              ${o.items.map(it => `
                <div class="od-item">
                  <div class="od-img">${it.emoji}</div>
                  <div class="od-info">
                    <div class="od-name">${it.name}</div>
                    <div class="od-qty">Qtd: ${it.qty}</div>
                  </div>
                  <div class="od-price">${fmt(it.price)}</div>
                </div>`).join('')}
            </div>
            <div class="od-side">
              ${noteBox}
              <div class="od-btns">
                <button class="btn-rebuy" onclick="rebuyOrder(${i})">
                  <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  Comprar de Novo
                </button>
                <button class="btn-help" onclick="showToast('Abrindo chat de suporte... 💬')">Ajuda</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function clearFilters() {
  $('searchInput').value = '';
  $('statusFilter').value = 'todos';
  $('sortSelect').value = 'recentes';
  renderOrders();
}

/* ─── EXPAND/COLLAPSE ────────────────────────────────────────────────── */
function toggleOrder(i) {
  const card   = $('oc-' + i);
  const detail = $('ocDetail-' + i);
  const isOpen = card.classList.contains('open');

  document.querySelectorAll('.order-card.open').forEach(c => {
    c.classList.remove('open');
    c.querySelector('.oc-detail').style.maxHeight = null;
  });

  if (!isOpen) {
    card.classList.add('open');
    detail.style.maxHeight = detail.scrollHeight + 'px';
  }
}

/* ─── REBUY ──────────────────────────────────────────────────────────── */
function rebuyOrder(i) {
  const order = orders.filter(matchesCurrentFilter)[i] || orders[i];
  // safer: find by rendered index against the same filtered/sorted list used in render
  const list = getFilteredSortedList();
  const o = list[i];
  o.items.forEach(it => addToCartGeneric({ id: it.name, name: it.name, emoji: it.emoji, price: it.price }, it.qty));
  showToast(`${o.items.length > 1 ? 'Itens' : 'Item'} do pedido #${o.num} adicionado ao carrinho! 🛒`);
  openCart();
}
function matchesCurrentFilter() { return true; }

function getFilteredSortedList() {
  const q      = $('searchInput').value.toLowerCase().trim();
  const status = $('statusFilter').value;
  const sort   = $('sortSelect').value;
  let list = orders.filter(o => {
    const matchQ = !q || o.num.toLowerCase().includes(q) || o.items.some(it => it.name.toLowerCase().includes(q));
    const matchStatus = status === 'todos' || o.status === status;
    return matchQ && matchStatus;
  });
  if (sort === 'recentes') list.sort((a, b) => b.dateSort.localeCompare(a.dateSort));
  if (sort === 'antigos')  list.sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  if (sort === 'maior')    list.sort((a, b) => b.total - a.total);
  if (sort === 'menor')    list.sort((a, b) => a.total - b.total);
  return list;
}

/* ─── CART ───────────────────────────────────────────────────────────── */
function addToCartGeneric(p, qty = 1) {
  const ex = cart.find(x => x.id === p.id);
  if (ex) ex.qty += qty; else cart.push({ ...p, qty });
  updateCart();
}
function removeFromCart(id) { cart = cart.filter(x => x.id !== id); updateCart(); }
function changeCartQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (item) { item.qty += d; if (item.qty <= 0) removeFromCart(id); else updateCart(); }
}
function updateCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $('cartBadge').textContent = count;
  $('cartCount').textContent = `(${count})`;
  $('cartSub').textContent   = fmt(total);
  $('cartTotal').textContent = fmt(total);

  const el = $('cartItems');
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty-st"><span>🛒</span><p>Seu carrinho está vazio</p></div>`;
    return;
  }
  el.innerHTML = cart.map((item, idx) => `
    <div class="ci">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${fmt(item.price)}</div>
        <div class="ci-qty">
          <button class="qb" onclick="changeCartQty('${item.id}',-1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="changeCartQty('${item.id}',1)">+</button>
        </div>
      </div>
      <button class="del" onclick="removeFromCart('${item.id}')">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>`).join('');
}
function openCart()  { $('cartSidebar').classList.add('on'); $('cartOverlay').classList.add('on'); }
function closeCart() { $('cartSidebar').classList.remove('on'); $('cartOverlay').classList.remove('on'); }
function checkout() {
  if (!cart.length) { showToast('Adicione produtos primeiro! 😊'); return; }
  showToast('Redirecionando para o pagamento… 🔒');
  setTimeout(closeCart, 1200);
}
function alertWish() { showToast(`Lista de favoritos: ${wishlist.length} produto(s)`); }

/* ─── TOAST ──────────────────────────────────────────────────────────── */
function showToast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('on');
  setTimeout(() => $('toast').classList.remove('on'), 2800);
}

/* ─── BACK TO TOP ────────────────────────────────────────────────────── */
window.addEventListener('scroll', () => { $('btt').classList.toggle('on', window.scrollY > 300); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

/* ─── INIT ───────────────────────────────────────────────────────────── */
updateCart();
renderOrders();
