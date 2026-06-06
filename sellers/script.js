function buttonLink(url) {
  window.location.href = url;
}

// ══ DATA ════════════════════════════════════════════════
const revData = [12.4,18.2,15.6,21.8,19.2,23.4,26.8,22.1,28.4,24.6,31.2,38.8];
const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PRODS = [
  {em:'⌚',name:'Smartwatch Pro X7',sku:'TL-001',cat:'Eletrônicos',price:'R$ 189,90',stock:42,sold:94,status:'active'},
  {em:'🎧',name:'Fone BT ANC Pro',sku:'TL-002',cat:'Eletrônicos',price:'R$ 119,90',stock:28,sold:72,status:'active'},
  {em:'📷',name:'Câmera Segurança WiFi 2K',sku:'TL-003',cat:'Eletrônicos',price:'R$ 149,90',stock:4,sold:31,status:'active'},
  {em:'💡',name:'Kit LED Smart RGB 10m',sku:'TL-004',cat:'Casa',price:'R$ 79,90',stock:67,sold:64,status:'active'},
  {em:'🍶',name:'Garrafa Térmica Inox 1L',sku:'TL-005',cat:'Fitness',price:'R$ 69,90',stock:23,sold:23,status:'active'},
  {em:'🎒',name:'Mochila Anti-Furto Exec.',sku:'TL-006',cat:'Moda',price:'R$ 159,90',stock:2,sold:18,status:'active'},
  {em:'💆',name:'Pistola Massagem Percuss.',sku:'TL-007',cat:'Fitness',price:'R$ 129,90',stock:15,sold:41,status:'paused'},
  {em:'✨',name:'Kit Skincare Vitamina C',sku:'TL-008',cat:'Beleza',price:'R$ 99,90',stock:31,sold:55,status:'active'},
];
const ORDERS = [
  {id:'DS-0042',client:'Ana Carolina',items:[{em:'⌚',name:'Smartwatch Pro X7',var:'Preto P',qty:1}],total:'R$ 189,90',status:'pending',date:'Hoje 14:32',city:'São Paulo, SP'},
  {id:'DS-0041',client:'Pedro Martins',items:[{em:'💡',name:'Kit LED Smart RGB',var:'10m',qty:2},{em:'🎧',name:'Fone BT ANC',var:'Azul',qty:1}],total:'R$ 319,70',status:'pending',date:'Hoje 11:18',city:'Rio de Janeiro, RJ'},
  {id:'DS-0040',client:'Carla Souza',items:[{em:'👟',name:'Tênis Running UltraLight',var:'Azul 38',qty:1}],total:'R$ 199,90',status:'transit',date:'Ontem 09:45',city:'Belo Horizonte, MG'},
  {id:'DS-0039',client:'Lucas Ferreira',items:[{em:'🎒',name:'Mochila Executiva',var:'Preta',qty:1}],total:'R$ 159,90',status:'delivered',date:'10/01',city:'Curitiba, PR'},
  {id:'DS-0038',client:'Marina Costa',items:[{em:'✨',name:'Kit Skincare Vit. C',var:'Kit completo',qty:1}],total:'R$ 99,90',status:'returned',date:'08/01',city:'Porto Alegre, RS'},
];
const EXTRACT = [
  {ico:'💰',type:'Venda',order:'DS-0042',gross:'R$ 189,90',comm:'R$ 17,09',net:'R$ 172,81',status:'pending',date:'Hoje'},
  {ico:'💰',type:'Venda',order:'DS-0041',gross:'R$ 319,70',comm:'R$ 28,77',net:'R$ 290,93',status:'pending',date:'Hoje'},
  {ico:'💰',type:'Venda',order:'DS-0040',gross:'R$ 199,90',comm:'R$ 17,99',net:'R$ 181,91',status:'available',date:'Ontem'},
  {ico:'💸',type:'Saque',order:'—',gross:'R$ 3.200,00',comm:'—',net:'- R$ 3.200,00',status:'done',date:'10/01'},
  {ico:'💰',type:'Venda',order:'DS-0039',gross:'R$ 159,90',comm:'R$ 14,39',net:'R$ 145,51',status:'available',date:'09/01'},
  {ico:'↩️',type:'Devolução',order:'DS-0038',gross:'R$ 99,90',comm:'R$ 0,00',net:'- R$ 99,90',status:'done',date:'09/01'},
  {ico:'💰',type:'Venda',order:'DS-0037',gross:'R$ 389,80',comm:'R$ 35,08',net:'R$ 354,72',status:'available',date:'08/01'},
  {ico:'💸',type:'Saque',order:'—',gross:'R$ 5.000,00',comm:'—',net:'- R$ 5.000,00',status:'done',date:'05/01'},
];

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
  const labels={dashboard:'Dashboard','novo-produto':'Novo Produto',produtos:'Meus Produtos',pedidos:'Pedidos',financas:'Financeiro',config:'Configurações'};
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
        <div class="action-dots" onclick="toggleMenu(this)">⋯
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
function toggleMenu(el){ const m=el.querySelector('.action-menu'); document.querySelectorAll('.action-menu.on').forEach(x=>{if(x!==m)x.classList.remove('on')}); m.classList.toggle('on'); event.stopPropagation(); }
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
            <button class="btn btn-green btn-xs" onclick="dispatch('${o.id}')">🚚 Marcar como Despachado</button>
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
function saveConfig(){ toast('Configurações salvas com sucesso! ✓'); }

// ══ LANDING ══════════════════════════════════════════════
function toggleFAQ(el){ el.closest('.faq-item').classList.toggle('open'); }
function doSellerRegister(){ const v=document.getElementById('ctaEmail')?.value; if(!v||!v.includes('@')){toast('Digite um e-mail válido','err');return;} toast('Conta criada! Redirecionando para o painel... 🚀'); setTimeout(enterPanel,1400); }

// ══ FINANCES ════════════════════════════════════════════
function formatSaque(inp){ let v=inp.value.replace(/\D/g,''); if(v) inp.value='R$ '+parseInt(v).toLocaleString('pt-BR'); }
function doSaque(){ const v=document.getElementById('sacqueVal')?.value; if(!v||v==='R$ 0,00'){toast('Digite o valor do saque','err');return;} toast(`Saque de ${v} solicitado! Processamento em 1 dia útil 💸`); if(document.getElementById('sacqueVal'))document.getElementById('sacqueVal').value=''; }

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

  // hash routing
  const hash = location.hash.replace('#/seller/','') || 'cadastro';
  if(hash==='cadastro'||hash==='') showLanding();
  else { enterPanel(); const pageMap={'painel':'dashboard','produtos':'produtos','produtos/novo':'novo-produto','pedidos':'pedidos','financas':'financas','saque':'financas','configuracoes':'config'}; navigate(pageMap[hash]||'dashboard'); }
});

// hash change listener
window.addEventListener('hashchange',()=>{
  const hash=location.hash.replace('#/seller/','');
  if(hash==='cadastro'){showLanding();return;}
  if(document.getElementById('appShell').style.display==='none') enterPanel();
  const pm={'painel':'dashboard','produtos':'produtos','produtos/novo':'novo-produto','pedidos':'pedidos','financas':'financas','saque':'financas','configuracoes':'config'};
  navigate(pm[hash]||'dashboard');
});
