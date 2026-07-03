const products = [
  { id:0, name:'Smartwatch Pro X7', cat:['Eletrônicos', 'Acessórios'], price:189.90, old:299, discount:36, emoji:'⌚', badge:'hot', rating:4.9, reviews:2847, shipping:true, desc:'Smartwatch com monitor cardíaco, SpO2, GPS integrado e resistência à água. Bateria de 14 dias. Compatível com Android e iOS.', features:['Monitor cardíaco e SpO2','GPS integrado','Resistência 5ATM','Bateria 14 dias','Compatível Android/iOS'] },
  { id:1, name:'Fone Bluetooth ANC Pro', cat:'Eletrônicos', price:119.90, old:199, discount:39, emoji:'🎧', badge:'new', rating:4.8, reviews:1523, shipping:true, desc:'Fone de ouvido com cancelamento ativo de ruído, driver 40mm, autonomia de 30h e conexão multidevice.', features:['Cancelamento ativo de ruído','30 horas de autonomia','Driver 40mm premium','Conexão multidevice','Estojo de carregamento'] },
  { id:2, name:'Câmera de Segurança WiFi', cat:'Eletrônicos', price:149.90, old:220, discount:31, emoji:'📷', badge:'sale', rating:4.7, reviews:892, shipping:false, desc:'Câmera IP 2K com visão noturna colorida, detecção de movimento e armazenamento na nuvem.', features:['Resolução 2K Super HD','Visão noturna colorida','Detecção inteligente de movimento','Armazenamento em nuvem','Fácil instalação'] },
  { id:3, name:'Kit Luzes LED Smart RGB', cat:'Casa', price:79.90, old:130, discount:38, emoji:'💡', badge:'hot', rating:4.6, reviews:3102, shipping:true, desc:'Fita LED inteligente de 10m com app, controle por voz (Alexa/Google) e 16 milhões de cores.', features:['10 metros de comprimento','16 milhões de cores','Controle por voz','Compatível Alexa e Google','Instalação simples'] },
  { id:4, name:'Tapete Antiderrapante Premium', cat:'Casa', price:89.90, old:149, discount:39, emoji:'🏠', badge:'new', rating:4.5, reviews:445, shipping:true, desc:'Tapete ecológico antiderrapante com design escandinavo. Lavável à máquina, resistente e macio.', features:['Material ecológico','Base antiderrapante','Lavável à máquina','Design escandinavo','Alta durabilidade'] },
  { id:5, name:'Mini Massageador Portátil', cat:'Fitness', price:129.90, old:210, discount:38, emoji:'💆', badge:'sale', rating:4.9, reviews:2231, shipping:true, desc:'Pistola de massagem percussiva com 6 cabeças intercambiáveis, 30 níveis de intensidade e bateria de 5h.', features:['6 cabeças intercambiáveis','30 níveis de intensidade','Bateria de 5 horas','Motor silencioso','Estojo de transporte'] },
  { id:6, name:'Tênis Running Ultralight', cat:'Moda', price:199.90, old:320, discount:37, emoji:'👟', badge:'hot', rating:4.7, reviews:1876, shipping:true, desc:'Tênis de corrida ultra leve com sola de borracha, tecnologia de amortecimento e palmilha ortopédica removível.', features:['Cabedal em mesh respirável','Amortecimento por gel','Palmilha ortopédica','Solado antiderrapante','Disponível em 8 cores'] },
  { id:7, name:'Mochila Anti-Furto Executiva', cat:['Moda', 'Acessórios'], price:159.90, old:250, discount:36, emoji:'🎒', badge:'new', rating:4.8, reviews:987, shipping:false, desc:'Mochila com compartimento USB, bolso anti-RFID, material impermeável e capacidade de 28L.', features:['Porta USB embutida','Proteção RFID','Impermeável','28 litros de capacidade','Compartimento para notebook'] },
  { id:8, name:'Secador de Cabelo Íon Pro', cat:['Beleza', 'Eletrônicos'], price:149.90, old:249, discount:39, emoji:'💇', badge:'sale', rating:4.6, reviews:654, shipping:true, desc:'Secador 2200W com tecnologia iônica, diffusor incluso e 3 velocidades para cabelos mais lisos e brilhosos.', features:['2200W de potência','Tecnologia iônica','Diffusor incluso','3 velocidades','Cabo giratório 360°'] },
  { id:9, name:'Kit Skincare Vitamina C', cat:'Beleza', price:99.90, old:160, discount:37, emoji:'✨', badge:'hot', rating:4.9, reviews:4521, shipping:true, desc:'Kit completo com sérum, hidratante e protetor solar com vitamina C. Pele radiante em 30 dias.', features:['Sérum vitamina C 30ml','Hidratante FPS 30','Protetor solar facial','Dermatologicamente testado','Vegano e cruelty-free'] },
  { id:10, name:'Raçao Premium para Cães', cat:'Pets', price:89.90, old:140, discount:35, emoji:'🐕', badge:'new', rating:4.8, reviews:1234, shipping:true, desc:'Ração super premium com proteína animal real, sem corantes artificiais e enriquecida com ômega-3.', features:['Proteína animal real','Sem corantes artificiais','Ômega-3 adicionado','Sem transgênicos','Veterinário aprovado'] },
  { id:11, name:'Garrafa Térmica 1L Inox', cat:'Fitness', price:69.90, old:110, discount:36, emoji:'🍶', badge:'sale', rating:4.7, reviews:3876, shipping:true, desc:'Garrafa em aço inox 18/8 que mantém bebidas geladas por 24h e quentes por 12h. Tampa hermética.', features:['Aço inox 18/8 premium','Gelado 24h / Quente 12h','Tampa hermética','BPA Free','1 litro de capacidade'] },
];

const fmt  = p => 'R$ ' + p.toFixed(2).replace('.', ',');
const $    = id  => document.getElementById(id);

/* ─── CUSTOMER (shared identity used to deep-link into /track-order) ── */
const customerEmail = 'mariana.ferreira@exemplo.com';

/* ─── ORDERS DATA — kept in sync with the mock DB in /track-order ───── */
const orders = [

  /*
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
  */
];

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
    /* 🛡️ SANITIZAÇÃO DE SEGURANÇA (XSS) */
    // Limpamos todos os textos que podem vir de inputs externos ou banco de dados
    const safeNum         = DOMPurify.sanitize(o.num);
    const safeNote        = DOMPurify.sanitize(o.note);
    const safeStatusLabel = DOMPurify.sanitize(o.statusLabel);
    const safeDateLabel   = DOMPurify.sanitize(o.dateLabel);

    const thumbs = o.items.slice(0, 3).map(it => `<div class="oc-thumb">${it.emoji}</div>`).join('');
    const extra  = o.items.length > 3 ? `<div class="oc-thumb more">+${o.items.length - 3}</div>` : '';
    const itemsLabel = `${o.items.length} ${o.items.length === 1 ? 'item' : 'itens'}`;
    const trackUrl = `track-order.html?order=${encodeURIComponent(o.num)}&email=${encodeURIComponent(customerEmail)}`;

    const isCancel = o.status === 'cancelado';
    const noteBox = isCancel
      ? `<div class="od-info-box cancel-note">
           <h5><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Pedido Cancelado</h5>
           <p>${safeNote}</p> </div>`
      : `<div class="od-info-box">
           <h5><svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Status da Entrega</h5>
           <p>${safeNote}</p> </div>`;

    return `
      <div class="order-card" id="oc-${i}">
        <div class="oc-main">
          <div class="oc-id-col">
            <div class="oc-num">#${safeNum}</div> <div class="oc-date">${safeDateLabel}</div> </div>
          <div class="oc-status-col">
            <span class="status-pill ${o.pillClass}"><span class="dot"></span>${safeStatusLabel}</span> </div>
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
              ${o.items.map(it => {
                const safeName = DOMPurify.sanitize(it.name);
                return `
                <div class="od-item">
                  <div class="od-img">${it.emoji}</div>
                  <div class="od-info">
                    <div class="od-name">${safeName}</div> <div class="od-qty">Qtd: ${it.qty}</div>
                  </div>
                  <div class="od-price">${fmt(it.price)}</div>
                </div>`;
              }).join('')}
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

renderOrders();
