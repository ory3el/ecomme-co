function buttonLink(url) {
  window.location.href = url;
}

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
  if(hash==='cadastro'||hash==='')
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
