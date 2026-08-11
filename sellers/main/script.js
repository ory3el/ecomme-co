/* SCROLLBAR */
function createCustomScrollbar(scrollElement, isMainBody = false) {
  const scrollTrack = document.createElement('div');
  scrollTrack.className = 'scrollbar-track';
  
  const scrollbar = document.createElement('div');
  scrollbar.className = 'custom-scrollbar hide-scrollbar';
  scrollTrack.appendChild(scrollbar);
  const container = isMainBody ? document.body : scrollElement;
  container.appendChild(scrollTrack);

  if (!isMainBody) {
    scrollTrack.style.position = 'absolute';
    scrollbar.style.position = 'absolute';
  }

  let scrollTimeout;
  let isDragging = false;
  let isHovering = false;
  let startY;
  let startScrollTop;

  scrollTrack.addEventListener('mouseenter', () => {
    isHovering = true;
    scrollbar.classList.remove('hide-scrollbar');
    clearTimeout(scrollTimeout);
  });

  scrollTrack.addEventListener('mouseleave', () => {
    isHovering = false;
    if (!isDragging) {
      scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
    }
  });
  
  const eventTarget = isMainBody ? window : scrollElement;
  
  eventTarget.addEventListener('scroll', () => {
    const scrollHeight = isMainBody ? document.documentElement.scrollHeight : scrollElement.scrollHeight;
    const clientHeight = isMainBody ? window.innerHeight : scrollElement.clientHeight;
    const scrollTop = isMainBody ? window.scrollY : scrollElement.scrollTop;
    
    const scrollableHeight = scrollHeight - clientHeight;
    if (scrollableHeight <= 0) return;

    const scrollPercentage = scrollTop / scrollableHeight;
    const maxScrollbarTravel = clientHeight - scrollbar.offsetHeight;

    if (!isMainBody) {
      scrollTrack.style.top = `${scrollTop}px`;
    }
    
    scrollbar.style.top = `${scrollPercentage * maxScrollbarTravel}px`;

    scrollbar.classList.remove('hide-scrollbar');
    clearTimeout(scrollTimeout);

    if (!isHovering && !isDragging) {
      scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
    }
  });

  scrollbar.addEventListener('mousedown', (e) => {
    isDragging = true;
    scrollbar.classList.add('is-dragging');
    startY = e.clientY;
    startScrollTop = isMainBody ? window.scrollY : scrollElement.scrollTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - startY;
    const clientHeight = isMainBody ? window.innerHeight : scrollElement.clientHeight;
    const maxScrollbarTravel = clientHeight - scrollbar.offsetHeight;
    const movePercentage = deltaY / maxScrollbarTravel;
    
    const scrollHeight = isMainBody ? document.documentElement.scrollHeight : scrollElement.scrollHeight;
    const scrollableHeight = scrollHeight - clientHeight;
    const scrollAmount = movePercentage * scrollableHeight;

    if (isMainBody) {
      window.scrollTo(0, startScrollTop + scrollAmount);
    } else {
      scrollElement.scrollTop = startScrollTop + scrollAmount;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      scrollbar.classList.remove('is-dragging');
      document.body.style.userSelect = '';
      clearTimeout(scrollTimeout);
      
      if (!isHovering) {
        scrollTimeout = setTimeout(() => scrollbar.classList.add('hide-scrollbar'), 1500);
      }
    }
  });
}

const mainElement = document.querySelector('.app-main');
if (mainElement) {
  mainElement.style.position = 'relative'; 
  createCustomScrollbar(mainElement, false);
}

const sidebarElement = document.querySelector('.app-sb');
if (sidebarElement) {
  sidebarElement.style.position = 'relative';
  createCustomScrollbar(sidebarElement, false);
}

/* --------------------------------------------------------- */

function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
}

function buttonLink(url) {
  window.location.href = url;
}

const $ = id => document.getElementById(id);

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

// ══ DATA ════════════════════════════════════════════════
const revData = [ /* 12.4,18.2,15.6,21.8,19.2,23.4,26.8,22.1,28.4,24.6,31.2,38.8 */ ];
const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PRODS = [
  /*
  {em:'⌚',name:'Smartwatch Pro X7',sku:'TL-001',cat:'Eletrônicos',price:'R$ 189,90',stock:42,sold:94,status:'active'},
  {em:'🎧',name:'Fone BT ANC Pro',sku:'TL-002',cat:'Eletrônicos',price:'R$ 119,90',stock:28,sold:72,status:'active'},
  {em:'📷',name:'Câmera Segurança WiFi 2K',sku:'TL-003',cat:'Eletrônicos',price:'R$ 149,90',stock:4,sold:31,status:'active'},
  {em:'💡',name:'Kit LED Smart RGB 10m',sku:'TL-004',cat:'Casa',price:'R$ 79,90',stock:67,sold:64,status:'active'},
  {em:'🍶',name:'Garrafa Térmica Inox 1L',sku:'TL-005',cat:'Fitness',price:'R$ 69,90',stock:23,sold:23,status:'active'},
  {em:'🎒',name:'Mochila Anti-Furto Exec.',sku:'TL-006',cat:'Moda',price:'R$ 159,90',stock:2,sold:18,status:'active'},
  {em:'💆',name:'Pistola Massagem Percuss.',sku:'TL-007',cat:'Fitness',price:'R$ 129,90',stock:15,sold:41,status:'paused'},
  {em:'✨',name:'Kit Skincare Vitamina C',sku:'TL-008',cat:'Beleza',price:'R$ 99,90',stock:31,sold:55,status:'active'},
  */
];
const ORDERS = [
  /*
  {id:'DS-0042',client:'Ana Carolina',items:[{em:'⌚',name:'Smartwatch Pro X7',var:'Preto P',qty:1}],total:'R$ 189,90',status:'pending',date:'Hoje 14:32',city:'São Paulo, SP'},
  {id:'DS-0041',client:'Pedro Martins',items:[{em:'💡',name:'Kit LED Smart RGB',var:'10m',qty:2},{em:'🎧',name:'Fone BT ANC',var:'Azul',qty:1}],total:'R$ 319,70',status:'pending',date:'Hoje 11:18',city:'Rio de Janeiro, RJ'},
  {id:'DS-0040',client:'Carla Souza',items:[{em:'👟',name:'Tênis Running UltraLight',var:'Azul 38',qty:1}],total:'R$ 199,90',status:'transit',date:'Ontem 09:45',city:'Belo Horizonte, MG'},
  {id:'DS-0039',client:'Lucas Ferreira',items:[{em:'🎒',name:'Mochila Executiva',var:'Preta',qty:1}],total:'R$ 159,90',status:'delivered',date:'10/01',city:'Curitiba, PR'},
  {id:'DS-0038',client:'Marina Costa',items:[{em:'✨',name:'Kit Skincare Vit. C',var:'Kit completo',qty:1}],total:'R$ 99,90',status:'returned',date:'08/01',city:'Porto Alegre, RS'},
  */
];
const EXTRACT = [
  /*
  {ico:'💰',type:'Venda',order:'DS-0042',gross:'R$ 189,90',comm:'R$ 17,09',net:'R$ 172,81',status:'pending',date:'Hoje'},
  {ico:'💰',type:'Venda',order:'DS-0041',gross:'R$ 319,70',comm:'R$ 28,77',net:'R$ 290,93',status:'pending',date:'Hoje'},
  {ico:'💰',type:'Venda',order:'DS-0040',gross:'R$ 199,90',comm:'R$ 17,99',net:'R$ 181,91',status:'available',date:'Ontem'},
  {ico:'💸',type:'Saque',order:'—',gross:'R$ 3.200,00',comm:'—',net:'- R$ 3.200,00',status:'done',date:'10/01'},
  {ico:'💰',type:'Venda',order:'DS-0039',gross:'R$ 159,90',comm:'R$ 14,39',net:'R$ 145,51',status:'available',date:'09/01'},
  {ico:'↩️',type:'Devolução',order:'DS-0038',gross:'R$ 99,90',comm:'R$ 0,00',net:'- R$ 99,90',status:'done',date:'09/01'},
  {ico:'💰',type:'Venda',order:'DS-0037',gross:'R$ 389,80',comm:'R$ 35,08',net:'R$ 354,72',status:'available',date:'08/01'},
  {ico:'💸',type:'Saque',order:'—',gross:'R$ 5.000,00',comm:'—',net:'- R$ 5.000,00',status:'done',date:'05/01'},
  */
];

/* ─── SUPABASE ──────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
  const authGate = document.getElementById('authGate');
  const gateChecking = document.getElementById('gateChecking');
  const gateLogin = document.getElementById('gateLogin');
  const gateNoStore = document.getElementById('gateNoStore');
  const appShell = document.getElementById('appShell');

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (!user || userError) {
    console.warn("User session not active.");
    if (gateChecking) gateChecking.style.display = 'none';
    if (gateLogin) gateLogin.style.display = 'block';
    
    if (authGate) {
      authGate.style.display = 'flex';
      authGate.classList.remove('hidden');
    }
    return;
  }
  userId = user.id; 
  
  const { data: lojaCheck, error: lojaError } = await supabaseClient
    .from('lojas')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!lojaCheck) {
    console.warn("Usuário autenticado, mas não possui loja.");
    if (gateChecking) gateChecking.style.display = 'none';
    if (gateNoStore) gateNoStore.style.display = 'block';
    
    if (authGate) {
      authGate.style.display = 'flex';
      authGate.classList.remove('hidden');
    }
    return;
  }
  
  if (authGate) {
    authGate.classList.add('hidden');
    if (appShell) appShell.classList.remove('inert');
    setTimeout(() => { authGate.style.display = 'none'; }, 550);
  }

  await fetchInitialStoreStatus();
  subscribeToStoreStatus();
  
  // ============================================================
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profileError && profile) {
    const fullName = profile.full_name || "Cliente";
    const email = user.email || "";

    if ($('accSidebarName')) $('accSidebarName').textContent = fullName;
    if ($('accSidebarEmail')) $('accSidebarEmail').textContent = email;
    if (profile.avatar_url && $('accSidebarAvatar')) {
      $('accSidebarAvatar').src = profile.avatar_url;
    }
    
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const photoUrl = profile.avatar_url || "";

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;

    /* ------------------------------------------------------------------------ */
    const sbName = document.getElementById('sb-name')

    if (sbName && fullName) {
      sbName.textContent = fullName;
    }
    
    /* ------------------------------------------------------------------------ */
    const fldName = document.getElementById('fldNome');
    const fldEmail = document.getElementById('fldEmail');

    if (fldName && fullName) {
      fldName.value = fullName;
    }
  
    if (fldEmail && email) {
      fldEmail.value = email;
    }

    if (typeof validateStep1 === 'function') validateStep1();
    if (typeof loadFromSupabase === 'function') {
      await loadFromSupabase();
    }
    
    const fldPhone = document.getElementById('fldTelefone');
    const fldCpf = document.getElementById('fldDoc');

    const phone = profile.phone || "";
    const cpf = profile.cpf || "";

    if (fldPhone) { 
      fldPhone.value = phone; 
      if (typeof maskPhone !== 'undefined') maskPhone.updateValue();
    } 

    if (fldCpf) { 
      fldCpf.value = cpf; 
      if (typeof maskDoc !== 'undefined') maskDoc.updateValue();
    }

    if (photoUrl) {
      const avatarImage = document.getElementById('profileAvatar');
      const sidebarImage = document.getElementById('sidebarAvatar');
      const headerImage = document.getElementById('headerAvatar');
      if (avatarImage) {
        avatarImage.src = photoUrl;
        avatarImage.style.filter = "none";
        avatarImage.style.width = "100%";
        avatarImage.style.height = "100%";
        avatarImage.style.borderRadius = "100%";
        avatarImage.style.objectFit = "cover";
      }
      /*if (sidebarImage) {
        sidebarImage.src = photoUrl;
        sidebarImage.style.filter = "none";
        sidebarImage.style.width = "100%";
        sidebarImage.style.height = "100%";
        sidebarImage.style.borderRadius = "100%";
        sidebarImage.style.objectFit = "cover";
      }*/
      if (headerImage) {
        headerImage.src = photoUrl;
        headerImage.style.filter = "none";
        headerImage.style.width = "100%";
        headerImage.style.height = "100%";
        headerImage.style.borderRadius = "100%";
        headerImage.style.objectFit = "cover";
      }
    }
  }
});

/* ============================================================ MASK HELPERS */
const onlyDigits = v => v.replace(/\D/g,'');
const getEl = id => document.getElementById(id);

const elDoc = getEl('fldDoc');
if (elDoc) {
  const maskDoc = IMask(elDoc, {
    mask: [
      { mask: '000.000.000-00', maxLength: 11 },
      { mask: '00.000.000/0000-00', maxLength: 14 }
    ],
    dispatch: function (appended, dynamicMasked) {
      return typeof personType !== 'undefined' && personType === 'pf' 
        ? dynamicMasked.compiledMasks[0] 
        : dynamicMasked.compiledMasks[1];
    }
  });
  maskDoc.on('accept', () => { if (typeof validateStep1 === 'function') validateStep1(); });
}

const elPhone = getEl('fldTelefone');
if (elPhone) {
  const maskPhone = IMask(elPhone, {
    mask: [
      { mask: '(00) 0000-0000' }, 
      { mask: '(00) 00000-0000' }
    ]
  });
  maskPhone.on('accept', () => { if (typeof validateStep1 === 'function') validateStep1(); });
}

const elIE = getEl('fldIE');
if (elIE) {
  const maskIEMask = IMask(elIE, {
    mask: '000.000.000.000'
  });
  maskIEMask.on('accept', () => { if (typeof validateStep1 === 'function') validateStep1(); });
}

const elCep = getEl('fldCep');
if (elCep) {
  const maskCep = IMask(elCep, {
    mask: '00000-000'
  });
  maskCep.on('accept', () => {
    const digits = maskCep.unmaskedValue; 
    if(digits.length < 8){ 
      const statCep = getEl('statCep');
      // Confirme se a função setStatus existe
      if (statCep && typeof setStatus === 'function') setStatus(statCep, ''); 
      if (typeof validateStep1 === 'function') validateStep1(); 
      return; 
    }
  });
}
  
// ══ NAVIGATION ══════════════════════════════════════════
function showLanding(){ document.getElementById('landing').style.display='block'; document.getElementById('appShell').style.display='none'; window.scrollTo(0,0); }
function enterPanel(){ document.getElementById('landing').style.display='none'; document.getElementById('appShell').style.display='flex'; document.getElementById('appShell').style.flexDirection='column'; navigate('dashboard'); }
function navigate(page, btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('on'));
  const panel = document.getElementById('page-'+page);
  if(panel) panel.classList.add('on');
  if(btn) btn.classList.add('on');
  else { const nb = document.querySelector(`[data-page="${page}"]`); if(nb) nb.classList.add('on'); }
  const labels={dashboard:'Dashboard','novo-produto':'Novo Produto',produtos:'Meus Produtos',pedidos:'Pedidos',financas:'Financeiro',config:'Configurações',loja:'Minha Loja'};
  document.getElementById('bcText').textContent = labels[page]||page;
  window.scrollTo({top:0,behavior:'smooth'});
}

// ══ CHART ══════════════════════════════════════════════
function buildRevChart(){
  const max = Math.max(...revData);
  const html = revData.map((v,i) => {
    const h = Math.round((v/max)*140);
    return `<div class="rev-bar-wrap">
      <div class="rev-bar blue" style="height:${h}px">
        <div class="rev-bar-tip">R$ ${v.toFixed(1)}K</div>
      </div>
      <div class="rev-label">${months[i]}</div>
    </div>`;
  }).join('');
  const el = document.getElementById('revChart');
  if(el) el.innerHTML = html;
}

function buildSparklines(){
  const datas = [[3,5,4,7,6,8,9],[6,5,7,6,8,7,9],[12,13,11,14,13,15,14],[4,5,4,5,5,5,5]];
  datas.forEach((d,i) => {
    const el = document.getElementById('spark'+(i+1));
    if(!el) return;
    const max = Math.max(...d), min = Math.min(...d);
    const pts = d.map((v,j) => `${j*(100/6)},${28-((v-min)/(max-min||1))*24}`).join(' ');
    const fillPts = `0,28 ${pts} ${100},28`;
    const colors = ['#2563eb','#16a34a','#f97316','#eab308'];
    el.innerHTML = `<svg viewBox="0 0 100 32" preserveAspectRatio="none">
      <polygon points="${fillPts}" fill="${colors[i]}" opacity=".15"/>
      <polyline points="${pts}" fill="none" stroke="${colors[i]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  });
}

// ══ PRODUCTS TABLE ══════════════════════════════════════
function buildProdTable(filter='all'){
  const data = filter==='low' ? PRODS.filter(p=>p.stock<5) : filter==='paused' ? PRODS.filter(p=>p.status==='paused') : PRODS;
  const body = document.getElementById('prodTbody');
  if(!body) return;
  body.innerHTML = data.map(p => {
    const stClass = p.stock<5?'stock-low':p.stock<15?'stock-med':'stock-ok';
    const stTag = p.status==='active'?'<span class="tag tag-green">● Ativo</span>':'<span class="tag tag-gray">⏸ Pausado</span>';
    return `<tr>
      <td class="chk-col"><input type="checkbox" class="chk"></td>
      <td><div class="fac gap10"><div class="prod-thumb">${p.em}</div><div><div class="fs12 fw6">${p.name}</div><div class="fs10 muted">${p.sku}</div></div></div></td>
      <td class="fs11 muted">${p.sku}</td>
      <td><span class="tag tag-blue fs10">${p.cat}</span></td>
      <td class="sora fw7 blue fs13">${p.price}</td>
      <td><span class="stock-val ${stClass}">${p.stock} un.</span></td>
      <td class="fs11 muted">${p.sold} vendas</td>
      <td>${stTag}</td>
      <td><div class="fac gap4">
        <button class="btn btn-ghost btn-xs" style="border-radius:var(--r)" onclick="toast('Editando ${p.name}','info')">✏️</button>
        <div class="action-dots" onclick="toggleMenu(event, this)">⋯
          <div class="action-menu">
            <div class="am-item" onclick="toast('Duplicando produto')">📋 Duplicar</div>
            <div class="am-item" onclick="toast('Produto pausado')">⏸ Pausar</div>
            <div class="am-item" onclick="toast('Exportando dados','info')">📤 Exportar</div>
            <div class="am-item red" onclick="toast('Produto removido')">🗑 Excluir</div>
          </div>
        </div>
      </div></td>
    </tr>`;
  }).join('');
}

function toggleAll(cb){ document.querySelectorAll('.chk').forEach(c=>c.checked=cb.checked); }
function filterProds(btn, f){ document.querySelectorAll('.stab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); buildProdTable(f); }

function toggleMenu(e, el){
  e.stopPropagation();
  const m = el.querySelector('.action-menu'); 
  document.querySelectorAll('.action-menu.on').forEach(x=>{if(x!==m)x.classList.remove('on')}); 
  m.classList.toggle('on'); 
}

document.addEventListener('click',()=>document.querySelectorAll('.action-menu.on').forEach(m=>m.classList.remove('on')));

// ══ ORDERS ══════════════════════════════════════════════
function buildOrders(filter='all'){
  const statusMap = {pending:'⏳ Aguardando Despacho',transit:'🚚 Em Trânsito',delivered:'✅ Entregue',returned:'↩ Devolução Solicitada'};
  const tagMap = {pending:'tag-orange',transit:'tag-blue',delivered:'tag-green',returned:'tag-yellow'};
  const data = filter==='all' ? ORDERS : ORDERS.filter(o=>o.status===filter);
  const wrap = document.getElementById('ordersWrap');
  if(!wrap) return;
  wrap.innerHTML = data.map(o => `
    <div class="ord">
      <div class="ord-hd">
        <div class="fac gap12">
          <span class="ord-id">#${o.id}</span>
          <span class="muted fs11">·</span>
          <span class="fs11 muted">${o.date}</span>
          <span class="fs11 muted">·</span>
          <span class="fs11 muted">📍 ${o.city}</span>
        </div>
        <span class="tag ${tagMap[o.status]}">${statusMap[o.status]}</span>
      </div>
      <div class="ord-body">
        <div class="ord-items">
          ${o.items.map(it=>`
            <div class="fac gap10">
              <div class="ord-em">${it.em}</div>
              <div class="ord-info">
                <div class="ord-item-name">${it.name}</div>
                <div class="ord-item-var">${it.var} · Qtd: ${it.qty}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="fs11 muted mb4">👤 ${o.client}</div>
          <div class="ord-total">${o.total}</div>
        </div>
      </div>
      <div class="ord-ft">
        <div class="fac gap8">
          <button class="btn btn-ghost btn-xs" style="border-radius:var(--r)" onclick="toast('Abrindo detalhes...','info')">👁 Detalhes</button>
          <button class="btn btn-ghost btn-xs" style="border-radius:var(--r)" onclick="toast('Gerando NF...','info')">🧾 Emitir NF</button>
          <button class="btn btn-ghost btn-xs" style="border-radius:var(--r)" onclick="toast('Imprimindo etiqueta...','info')">🖨 Etiqueta</button>
        </div>
        <div class="ord-actions">
          ${o.status==='pending'?`
            <input class="tracking-inp" placeholder="Cód. rastreamento (ex: BR123)" id="track-${o.id}">
            <button class="btn btn-p btn-xs" onclick="dispatch('${o.id}')">🚚 Marcar como Despachado</button>
          `:''}
          ${o.status==='transit'?`<span class="tag tag-blue">Rastreando envio...</span>`:''}
          ${o.status==='returned'?`<button class="btn btn-danger btn-xs" onclick="toast('Aprovando devolução...','info')">Aprovar Devolução</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

function filterOrds(btn){ document.querySelectorAll('.order-filter-tabs .stab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); buildOrders('all'); toast('Filtro aplicado'); }
function dispatch(id){ const t=document.getElementById('track-'+id)?.value; if(!t){toast('Digite o código de rastreamento','err');return;} toast(`Pedido #${id} despachado! Código: ${t} 🚚`); const bdg=document.getElementById('sbOrdBdg'); if(bdg&&parseInt(bdg.textContent)>0)bdg.textContent=parseInt(bdg.textContent)-1; buildOrders('all'); }

// ══ EXTRACT TABLE ════════════════════════════════════════
function buildExtract(){
  const body = document.getElementById('extractBody');
  if(!body) return;
  body.innerHTML = EXTRACT.map(r => {
    const sTag = r.status==='available'?'<span class="tag tag-green">Disponível</span>':r.status==='pending'?'<span class="tag tag-orange">Pendente</span>':'<span class="tag tag-gray">Concluído</span>';
    const valClass = r.net.startsWith('-')?'ext-val-neg':'ext-val-pos';
    return `<tr>
      <td><div class="fac gap8"><div class="ext-row-icon" style="background:${r.type==='Saque'?'#ffedd5':r.type==='Devolução'?'#fee2e2':'#dcfce7'}">${r.ico}</div><span class="fs12 fw6">${r.type}</span></div></td>
      <td class="fs11 muted">${r.type}</td>
      <td class="td-link fs11" onclick="toast('Pedido ${r.order}')">${r.order}</td>
      <td class="fs12 fw6">${r.gross}</td>
      <td class="fs11 red">${r.comm}</td>
      <td class="fs13 fw7 ${valClass}">${r.net}</td>
      <td>${sTag}</td>
      <td class="fs11 muted">${r.date}</td>
    </tr>`;
  }).join('');
}

// ══ NEW PRODUCT ══════════════════════════════════════════
const emos = {'📱 Eletrônicos':'📱','👗 Moda':'👗','🏠 Casa':'🏠','💪 Fitness':'💪','💄 Beleza':'💄','🐾 Pets':'🐾'};
function updatePreview(){
  const n=document.getElementById('npName')?.value||'Nome do produto';
  const p=document.getElementById('npPrice')?.value||'R$ 0,00';
  const c=document.getElementById('npCat')?.value||'Categoria';
  const d=document.getElementById('npDesc')?.value||'Descrição curta aqui...';
  if(document.getElementById('previewName'))document.getElementById('previewName').textContent=n;
  if(document.getElementById('previewPrice'))document.getElementById('previewPrice').textContent=p||'R$ 0,00';
  if(document.getElementById('previewCat'))document.getElementById('previewCat').textContent=c;
  if(document.getElementById('previewDesc'))document.getElementById('previewDesc').textContent=d.slice(0,80);
  const em = emos[c]||'📦';
  if(document.getElementById('previewImg'))document.getElementById('previewImg').textContent=em;
  // checklist
  const set=(id,ok)=>{const el=document.getElementById(id);if(el){el.style.color=ok?'var(--green)':'var(--red)';el.textContent=(ok?'✓ ':'○ ')+el.textContent.slice(2);}};
  set('chk-name',n&&n!=='Nome do produto');
  set('chk-cat',c&&c!=='Selecionar...'&&c!=='Categoria');
  set('chk-price',p&&p!=='R$ 0,00'&&p!='');
  set('chk-desc',d&&d.length>10);
}
function calcMargin(){
  const el = document.getElementById('marginCalc');
  if(el) el.style.display='flex';
  const margin = Math.round(20+Math.random()*30)+'%';
  const netV = 'R$ '+(Math.random()*100+100).toFixed(2).replace('.',',');
  const mv = document.getElementById('marginVal'); if(mv) mv.textContent=margin;
  const nv = document.getElementById('netVal'); if(nv) nv.textContent=netV;
}
function addVariation(){ const l=document.getElementById('varList'); if(l){const d=document.createElement('div');d.className='var-item';d.innerHTML=`<span class="fs12">⚫ Preto — G · R$ 189,90 · Est: 5</span><div style="flex:1"></div><div class="var-remove" onclick="this.parentElement.remove()">✕</div>`;l.appendChild(d);}}
function publishProduct(){
  const n=document.getElementById('npName')?.value;
  if(!n){toast('Preencha o nome do produto','err');return;}
  toast('Produto publicado com sucesso! 🚀');
  navigate('produtos');
}

// ══ CONFIG ══════════════════════════════════════════════
function showCfg(id, el){
  document.querySelectorAll('.cfg-panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.cfg-nav-item').forEach(i=>i.classList.remove('on'));
  const panel=document.getElementById('cfg-'+id);
  if(panel) panel.classList.add('on');
  if(el) el.classList.add('on');
}

// ══ LANDING ══════════════════════════════════════════════
function toggleFAQ(el){ el.closest('.faq-item').classList.toggle('open'); }
function doSellerRegister(){ const v=document.getElementById('ctaEmail')?.value; if(!v||!v.includes('@')){toast('Digite um e-mail válido','err');return;} toast('Conta criada! Redirecionando para o painel... 🚀'); setTimeout(enterPanel,1400); }

// ══ FINANCES ════════════════════════════════════════════
function formatSaque(inp){ let v=inp.value.replace(/\D/g,''); if(v) inp.value='R$ '+parseInt(v).toLocaleString('pt-BR'); }
function doSaque(){ const v=document.getElementById('saqueVal')?.value; if(!v||v==='R$ 0,00'){toast('Digite o valor do saque','err');return;} toast(`Saque de ${v} solicitado! Processamento em 1 dia útil 💸`); if(document.getElementById('saqueVal'))document.getElementById('saqueVal').value=''; }

// ══ TOAST ════════════════════════════════════════════════
function toast(msg,type='ok'){
  const t=document.getElementById('toast'),ic=document.getElementById('tIco'),tx=document.getElementById('tMsg');
  tx.textContent=msg;
  ic.className='t-dot '+(type==='ok'?'t-ok':type==='err'?'t-err':'t-inf');
  ic.textContent=type==='ok'?'✓':type==='err'?'!':'ℹ';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}

// TOAST
function showToast(msg) {
  const t = document.getElementById('toast2');
  document.getElementById('toastMsg2').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function toast2(msg) {
  showToast(msg);
}

// ══ INIT ════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded',()=>{
  const now = new Date();
  const ds = now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const dd = document.getElementById('dashDate'); if(dd) dd.textContent=ds;
  const fd = document.getElementById('finDate'); if(fd) fd.textContent=now.toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  buildRevChart();
  buildSparklines();
  buildProdTable();
  buildOrders();
  buildExtract();

  document.getElementById('appShell').style.display='flex'; 
  document.getElementById('appShell').style.flexDirection='column';

  const hash = location.hash.replace('/seller/main','');
  const pageMap={'painel':'dashboard','produtos':'produtos','produtos/novo':'novo-produto','pedidos':'pedidos','financas':'financas','saque':'financas','configuracoes':'config'}; 
  navigate(pageMap[hash]||'dashboard'); 
});

window.addEventListener('hashchange',()=>{
  const hash=location.hash.replace('/seller/main','');
  const pm={'painel':'dashboard','produtos':'produtos','produtos/novo':'novo-produto','pedidos':'pedidos','financas':'financas','saque':'financas','configuracoes':'config'};
  navigate(pm[hash]||'dashboard');
});
  
/* -------------------------------------------------------------- */
function renderStoreState(status, slug, data) {
  const pendingUI = document.getElementById('store-pending-state');
  const activeUI = document.getElementById('store-active-state');
  const iframe = document.getElementById('store-preview-frame');
  const urlDisplay = document.getElementById('store-url-display');
  const headerStore = document.getElementById('header-store');
  const sbStoreName = document.getElementById('sb-storename');
  const sbStore = document.getElementById('sb-store');

  const cfgStoreName = document.getElementById('cfgStoreName');
  const cfgStoreSlogan = document.getElementById('cfgStoreSlogan');
  const cfgStoreDesc = document.getElementById('cfgStoreDesc');
  const cfgStoreEmail = document.getElementById('cfgStoreEmail');
  const cfgStorePhone = document.getElementById('cfgStorePhone');

  const storeCnpjCpf = document.getElementById('store-cnpj-cpf');
  const storeLegalName = document.getElementById('store-legal-name');
  const storeTradeName = document.getElementById('store-trade-name');
  const storeTaxRegime = document.getElementById('store-tax-regime');
  const storeAddress = document.getElementById('store-address');
  const storeCNAE = document.getElementById('store-cnae');
  const storeIE = document.getElementById('store-ie');
  
  if (!pendingUI || !activeUI) {
    console.error("Erro: Um ou mais elementos da loja não foram encontrados no HTML.");
    return;
  }

  const safeStatus = (status || 'pendente').toLowerCase().trim();
  const safeSlug = slug || 'loja-em-configuracao';

  if (safeStatus === 'ativa' || safeStatus === 'active') {
    pendingUI.style.display = 'none';
    activeUI.style.display = 'block';

    //const publicStoreUrl = `/store/@${safeSlug}`;
    //urlDisplay.textContent = publicStoreUrl;
    headerStore.textContent = `${data.nome_loja}`;
    headerStore.style.display = 'flex';
    sbStore.textContent = `${data.nome_loja}`;
    sbStoreName.textContent = `@${safeSlug}`;

    cfgStoreName.value = data.nome_loja;
    cfgStoreSlogan.value = data.slogan;
    cfgStoreDesc.value = data.descricao;
    cfgStoreEmail.value = data.email;
    cfgStorePhone.value = data.telefone;

    storeCnpjCpf.value = data.documento;
    storeLegalName.value = data.nome_razao;
    storeTradeName.value = data.nome_fantasia;
    storeTaxRegime.value = data.regime_tributario;
    storeAddress.value = `${data.endereco}, ${data.numero} - ${data.complemento} ${data.cidade}/${data.estado} - CEP ${data.cep}`;
    //storeCNAE.value = data.?;
    storeIE.value = data.inscricao_estadual;
    
    /*if (iframe.src !== publicStoreUrl) {
      iframe.src = publicStoreUrl;
    }*/
  } else {
    headerStore.style.display = 'none';
    pendingUI.style.display = 'block';
    activeUI.style.display = 'none';
    sbStore.textContent = 'Loja em Análise..';
    sbStoreName.textContent = `Aguarde um momento.`;
  }
}

async function fetchInitialStoreStatus() {
  if (!userId) return;

  try {
    const { data, error } = await supabaseClient
      .from('lojas')
      .select('status, slug_url, nome_loja, slogan, descricao, email, telefone, nome_razao, nome_fantasia, inscricao_estadual, documento, regime_tributario, complemento, endereco, numero, cidade, estado, cep')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar status da loja:", error);
      renderStoreState('pendente', '');
      return;
    }
    
    if (data) {
      renderStoreState(data.status, data.slug_url, data);
    } else {
      renderStoreState('pendente', '');
    }
  } catch (err) {
    console.error("Erro inesperado ao carregar loja:", err);
    renderStoreState('pendente', '');
  }
}

function subscribeToStoreStatus() {
  if (!userId) return;

  supabaseClient
    .channel('store-status-channel')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'lojas',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const novoStatus = payload.new.status;
        const slug = payload.new.slug_url;
        renderStoreState(novoStatus, slug, payload.new);
        
        if (novoStatus === 'ativa' || novoStatus === 'active') {
          toast('Sua loja foi ativada e já está no ar! 🎉', 'ok');
        }
      }
    )
    .subscribe();
}

async function saveConfig() {
  event.preventDefault();

  if (!userId) {
    console.error("Usuário não autenticado.");
    return;
  }

  const safeStoreName = sanitizeInput(cfgStoreName.value);
  const safeStoreSlogan = sanitizeInput(cfgStoreSlogan.value);
  const safeStoreDesc = sanitizeInput(cfgStoreDesc.value);
  const safeStoreEmail = sanitizeInput(cfgStoreEmail.value);
  const safeStorePhone = sanitizeInput(cfgStorePhone.value);

  const safeCnpjCpf = sanitizeInput(document.getElementById('store-cnpj-cpf').value);
  const safeLegalName = sanitizeInput(document.getElementById('store-legal-name').value);
  const safeTradeName = sanitizeInput(document.getElementById('store-trade-name').value);
  const safeIE = sanitizeInput(document.getElementById('store-ie').value);
  
  const cfgStoreNameOK = safeStoreName.length >= 3;
  const cfgStoreDescOK = safeStoreDesc.length >= 10;
  const cfgStoreEmailOK = safeStoreEmail.length >= 3;
  const cfgStorePhoneOK = safeStorePhone.length >= 10;

  const storeCnpjCpfOK = safeCnpjCpf.length >= 11;
  const storeLegalNameOK = safeLegalName.length >= 3;
  const storeTradeNameOK = safeTradeName.length >= 3;
  const storeIEOK = safeIE.length >= 8;
  
  if (!cfgStoreNameOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar. Complete o campo Nome da Loja.");
    return;
  }

  if (!cfgStoreDescOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar. Complete o campo Descrição da Loja.");
    return;
  }

  if (!cfgStoreEmailOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar. Complete o campo E-mail de Contato.");
    return;
  }

  if (!cfgStorePhoneOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar. Complete o campo WhatsApp / Telefone.");
    return;
  }

  /* ------------------------------------------------------------ */
      
  if (!storeCnpjCpfOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar.");
    return;
  }

  if (!storeLegalNameOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar.");
    return;
  }

  if (!storeTradeNameOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar.");
    return;
  }

  if (!storeIEOK) {
    showAlert('Para salvar e atualizar as informações da sua loja, complete todos os campos marcados com * (asterisco).', 'Complete os campos obrigatórios.', 'ℹ️')
    console.error("Erro ao salvar.");
    return;
  }

  const documentRegex = /^[\d\.\-\/]+$/;
  if (!documentRegex.test(safeCnpjCpf)) {
    showAlert('Formato de documento inválido.', 'Revise o CNPJ/CPF.', '🚫');
    return;
  }

  if (!documentRegex.test(safeStorePhone)) {
    showAlert('Formato de documento inválido.', 'Revise o Número de Telefone.', '🚫');
    return;
  }
  
  const btnSalvar = document.getElementById('btn-save-config');
  const textoOriginal = btnSalvar.innerText;
  
  if (btnSalvar) {
    btnSalvar.innerText = 'Salvando...';
    btnSalvar.disabled = true;
  }
  
  try {
    const dadosParaSalvar = {
      nome_loja: cfgStoreName.value,
      slogan: cfgStoreSlogan.value,
      descricao: cfgStoreDesc.value,
      email: cfgStoreEmail.value,
      telefone: cfgStorePhone.value,

      documento: safeCnpjCpf.value,
      nome_razao: safeLegalName.value,
      nome_fantasia: safeTradeName.value,
      regime_tributario: document.getElementById('store-tax-regime').value,
      inscricao_estadual: safeIE.value,
      
      // Exemplos de campos que você pode adicionar futuramente:
      // cor_primaria: document.getElementById('input-cor-tema').value,
      // cep_origem: document.getElementById('input-cep').value
    };
    
    const { data, error } = await supabaseClient
      .from('lojas')
      .update(dadosParaSalvar)
      .eq('user_id', userId)
      .select();

    if (error) {
      throw error;
    }
    console.log("Configurações salvas com sucesso!", data);
    toast("As configurações foram salvas com sucesso!");
    
    renderStoreState(data[0].status, data[0].slug_url, data[0]);

  } catch (err) {
    console.error("Erro ao salvar configurações:", err.message);
    toast("Ocorreu um erro ao salvar. Verifique sua conexão e tente novamente.");
  } finally {

    if (btnSalvar) {
      btnSalvar.innerText = textoOriginal;
      btnSalvar.disabled = false;
    }
  }
}
    
// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
    .modal-alert-container {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      /*background: rgba(0, 0, 0, 0.6);*/
      backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .modal-alert-container.active {
      opacity: 1; pointer-events: auto;
    }
    .modal-alert-content {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      padding: 30px;
      border-radius: 36px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transform: scale(0.8);
      transition: transform 0.3s ease;
    }
    .modal-alert-container.active .modal-alert-content {
      transform: scale(1);
    }
    .modal-alert-icon {
      font-size: 44px;
      margin-bottom: 15px;
    }
    .modal-alert-content h3 {
      margin: 0 0 10px 0;
      font-family: 'Sora', 'Poppins', sans-serif;
      color: #10161a;
      font-size: 20px;
      font-weight: 700;
    }
    .modal-alert-content p {
      color: #707c8a;
      font-size: 14.5px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .modal-alert-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-alert-confirm {
      background: #2563EB;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }
    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
      border: none;
      padding: 11px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-cancel:hover {
      background: #d1d5db;
    }
  `;
  document.head.appendChild(style);
}

// ── POP-UP WARNING ──
async function showAlert(message, title, icon) {
  injectModalStyles();
  
  let alertModal = document.getElementById('alertModal');
  
  if (!alertModal) {
    alertModal = document.createElement('div');
    alertModal.id = 'alertModal';
    alertModal.className = 'modal-alert-container';
    alertModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="alertIcon">${icon}</div>
        <h3 id="alertTitle">${title}</h3>
        <p id="alertMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-confirm" onclick="closeAlert()">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(alertModal);
  } else {

    document.getElementById('alertMsg').textContent = message;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertIcon').textContent = icon;
  }
  
  alertModal.offsetHeight;
  alertModal.classList.add('active');
}

function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

/* ─── ACC SIDEBAR ────────────────────────────────────────────────── */
function openAcc() {
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.add('on');
  if (ov) ov.classList.add('on');
  document.body.classList.add("nobodyscroll");
}

function closeAcc() {
  const sb = document.getElementById('accSidebar');
  const ov = document.getElementById('accOverlay');
  if (sb) sb.classList.remove('on');
  if (ov) ov.classList.remove('on');
  document.body.classList.remove("nobodyscroll");
}

fetchInitialStoreStatus()

// LOGOUT
async function doLogout() {
  toast2('Saindo da conta... 👋', 'info');
  await supabaseClient.auth.signOut();
  closeAcc();
  location.reload();
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
