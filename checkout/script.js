// ── STATE ──────────────────────────────────────────────
let cartItems = [
  {id:0,name:'Smartwatch Pro X7',cat:'Eletrônicos',price:189.90,em:'⌚',qty:1},
  {id:1,name:'Fone Bluetooth ANC Pro',cat:'Eletrônicos',price:119.90,em:'🎧',qty:1},
  {id:3,name:'Kit LED Smart RGB 10m',cat:'Casa',price:79.90,em:'💡',qty:2},
];
let discount = 0;
let couponCode = '';
let shipping = 0;
let currentStep = 1;
let payMethod = 'pix';
let installSel = 1;
let pixInterval;
let pixSeconds = 1799;

// ── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  renderCart();
  renderSummary();
  buildInstallOpts();
  buildQR();
  buildBarcode();
  startPixTimer();
});

// ── CART ───────────────────────────────────────────────
function renderCart(){
  const list = document.getElementById('cartList');
  if(!cartItems.length){list.innerHTML='<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">🛒 Carrinho vazio</div>';return;}
  list.innerHTML = cartItems.map(it => `
    <div class="ci" id="ci-${it.id}">
      <div class="ci-em">${it.em}</div>
      <div style="flex:1;min-width:0">
        <div class="ci-name">${it.name}</div>
        <div class="ci-meta">${it.cat}</div>
        <div class="qty-ctrl">
          <button class="qbtn" onclick="chgQty(${it.id},-1)">−</button>
          <span class="qn" id="q-${it.id}">${it.qty}</span>
          <button class="qbtn" onclick="chgQty(${it.id},1)">+</button>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="ci-price" id="p-${it.id}">${fp(it.price*it.qty)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${fp(it.price)} un.</div>
      </div>
      <button class="rm-btn" onclick="rmItem(${it.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
    </div>`).join('');
}

function chgQty(id, d){
  const it = cartItems.find(x=>x.id===id);
  if(it){ it.qty = Math.max(1, it.qty+d); document.getElementById('q-'+id).textContent=it.qty; document.getElementById('p-'+id).textContent=fp(it.price*it.qty); renderSummary(); }
}

function rmItem(id){
  const el = document.getElementById('ci-'+id);
  if(el){ el.style.transition='all .3s'; el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>{ cartItems=cartItems.filter(x=>x.id!==id); renderCart(); renderSummary(); },300); }
}

// ── COUPON ─────────────────────────────────────────────
const COUPONS = {SAVE10:.10, SAVE20:.20, BLUE15:.15, SHOP25:.25};
function applyCoupon(){
  const v = document.getElementById('couponInp').value.trim().toUpperCase();
  const fb = document.getElementById('couponFb');
  fb.className = 'coupon-feedback';
  if(COUPONS[v]){ discount=COUPONS[v]; couponCode=v; fb.className='coupon-feedback ok'; fb.textContent=`✓ Cupom ${v} aplicado! ${discount*100}% de desconto`; renderSummary(); toast(`Cupom ${v}: ${discount*100}% OFF aplicado 🎉`,'ok'); }
  else{ fb.className='coupon-feedback err'; fb.textContent='Cupom inválido ou expirado. Tente: SAVE10, SAVE20, BLUE15'; }
}

// ── SUMMARY ────────────────────────────────────────────
function renderSummary(){
  const raw = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const dis = raw * discount;
  const pixDis = payMethod==='pix' ? (raw-dis)*0.05 : 0;
  const total = raw - dis - pixDis + shipping;

  document.getElementById('sumCount').textContent = `(${cartItems.reduce((s,i)=>s+i.qty,0)} itens)`;
  document.getElementById('sumSub').textContent = fp(raw);
  document.getElementById('sumShip').textContent = shipping===0 ? '🎉 Grátis' : fp(shipping);
  document.getElementById('sumShip').style.color = shipping===0 ? 'var(--green)' : 'var(--text)';
  document.getElementById('sumTotal').textContent = fp(total);
  document.getElementById('boletoVal').textContent = fp(total);

  const dr = document.getElementById('discRow');
  if(dis>0){ dr.style.display='flex'; document.getElementById('discTag').textContent=couponCode; document.getElementById('sumDisc').textContent='-'+fp(dis); }
  else dr.style.display='none';

  const pr = document.getElementById('pixDiscRow');
  if(pixDis>0){ pr.style.display='flex'; document.getElementById('sumPixDisc').textContent='-'+fp(pixDis); }
  else pr.style.display='none';

  const note = document.getElementById('installNote');
  if(payMethod==='card' && installSel>1) note.textContent=`${installSel}× de ${fp(total/installSel)} sem juros`;
  else note.textContent='';

  document.getElementById('sumItems').innerHTML = cartItems.map(it => `
    <div class="sum-item">
      <div class="sum-item-em">${it.em}<div class="sum-item-qty">${it.qty}</div></div>
      <div style="flex:1;min-width:0"><div class="sum-item-name">${it.name}</div><div class="sum-item-cat">${it.cat}</div></div>
      <div class="sum-item-price">${fp(it.price*it.qty)}</div>
    </div>`).join('');
}

// ── STEP NAV ───────────────────────────────────────────
function goStep(n){
  const ids=['step1','step2','step3','step4'];
  const sids=['s1','s2','s3','s4'];
  ids.forEach((id,i)=>{ document.getElementById(id).style.display = i+1===n?'block':'none'; });
  sids.forEach((id,i)=>{
    const el=document.getElementById(id);
    el.className='step-item '+(i+1<n?'done':i+1===n?'active':'');
    el.querySelector('.step-dot').textContent = i+1<n?'✓':i+1;
  });
  currentStep=n;
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===4) showConfirm();
}

// ── ADDRESS ────────────────────────────────────────────
function selAddr(el){ document.querySelectorAll('.addr-opt').forEach(a=>a.classList.remove('on')); el.classList.add('on'); }
function toggleNewAddr(){ const f=document.getElementById('newAddrForm'); f.classList.toggle('on'); }
function selShip(el,price){ document.querySelectorAll('.ship-opt').forEach(s=>s.classList.remove('on')); el.classList.add('on'); shipping=price; renderSummary(); }
function maskCEP(inp){ let v=inp.value.replace(/\D/g,'').slice(0,8); if(v.length>5) v=v.slice(0,5)+'-'+v.slice(5); inp.value=v; }
function searchCEP(){
  const v=document.getElementById('cepInp').value.replace(/\D/g,'');
  if(v.length!==8){toast('CEP inválido','err');return;}
  document.getElementById('streetInp').value='Rua Simulada pelo Sistema';
  document.getElementById('neighInp').value='Bairro Exemplo';
  document.getElementById('cityInp').value='São Paulo';
  document.getElementById('stateInp').value='SP';
  toast('CEP encontrado! ✓');
}

// ── PAYMENT TABS ───────────────────────────────────────
function selPayTab(tab, method){
  document.querySelectorAll('.pay-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.pay-panel').forEach(p=>p.classList.remove('on'));
  tab.classList.add('on');
  document.getElementById('pp-'+method).classList.add('on');
  payMethod = method;
  renderSummary();
}

// ── PIX ────────────────────────────────────────────────
function buildQR(){
  const p=[1,1,1,1,1,1,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,1,0,1,0,1,0,1,1,0,0,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1,1,1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1,1,0,0,0,1,0,0,0,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1];
  document.getElementById('qrGrid').innerHTML=p.map(b=>`<div class="qr-c ${b?'b':'w'}"></div>`).join('');
}

function startPixTimer(){
  pixInterval=setInterval(()=>{ if(pixSeconds<=0){clearInterval(pixInterval);document.getElementById('pixTimer').textContent='EXPIRADO';return;} pixSeconds--; const m=Math.floor(pixSeconds/60),s=pixSeconds%60; document.getElementById('pixTimer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); },1000);
}

function copyPIX(){
  navigator.clipboard?.writeText('00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000');
  const b=document.getElementById('copyPixBtn'); b.textContent='✓ Copiado!'; b.className='btn-copy copied';
  setTimeout(()=>{ b.textContent='📋 Copiar'; b.className='btn-copy'; },3000);
  toast('Chave PIX copiada! 📋');
}

// ── CARD ───────────────────────────────────────────────
let cardFlipped=false;
function flipCard(f){ cardFlipped=f; document.getElementById('card3d').classList.toggle('flipped',f); }
function toggleCardFlip(){ cardFlipped=!cardFlipped; document.getElementById('card3d').classList.toggle('flipped',cardFlipped); }

function onCardNum(inp){
  let v=inp.value.replace(/\D/g,'').slice(0,16);
  inp.value=v.replace(/(.{4})/g,'$1 ').trim();
  const disp=v.padEnd(16,'•').replace(/(.{4})/g,'$1 ').trim();
  document.getElementById('cardNumDisp').textContent=disp;
  document.getElementById('cardNumBack').textContent=disp;
  // brand detection
  const brands={visa:/^4/,master:/^5[1-5]/,amex:/^3[47]/,elo:/^(636368|636369)/};
  let brand='VISA';
  for(const [name,re] of Object.entries(brands)) if(re.test(v)){brand=name.toUpperCase();break;}
  document.getElementById('cardBrandDisp').textContent=brand;
  document.querySelectorAll('.brand-ico').forEach(b=>b.classList.remove('on'));
  const bi=document.getElementById('bi-'+brand.toLowerCase());
  if(bi) bi.classList.add('on');
}
function onCardName(inp){ document.getElementById('cardNameDisp').textContent=inp.value.toUpperCase()||'SEU NOME'; }
function onCardExp(inp){ let v=inp.value.replace(/\D/g,'').slice(0,4); if(v.length>2)v=v.slice(0,2)+'/'+v.slice(2); inp.value=v; document.getElementById('cardExpDisp').textContent=v||'MM/AA'; }
function onCvv(inp){ document.getElementById('cvvDisp').textContent=inp.value||'•••'; }

function buildInstallOpts(){
  const total=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const opts=[1,2,3,4,5,6];
  document.getElementById('installOpts').innerHTML=opts.map(n=>`
    <div class="inst-btn ${n===1?'on':''}" onclick="selInstall(this,${n})">
      <span class="inst-n">${n}×</span>
      <div class="inst-val">${fp(total/n)}</div>
      ${n===1?'<span class="inst-badge">À vista</span>':n<=3?'<span class="inst-badge">Sem juros</span>':''}
    </div>`).join('');
}

function selInstall(btn,n){ document.querySelectorAll('.inst-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); installSel=n; renderSummary(); }

// ── BOLETO ─────────────────────────────────────────────
function buildBarcode(){
  const stripes=document.getElementById('barcodeStripes');
  const widths=[1,2,1,3,1,2,2,1,3,1,1,2,3,1,2,1,3,2,1,1,2,3,1,2,1,2,3,1,1,2,3,1,2,2,1,3,2,1,1,2,1,3];
  stripes.innerHTML=widths.map((w,i)=>`<div class="bs" style="width:${w*3}px;background:${i%2===0?'#0f1a2e':'#fff'}"></div>`).join('');
}
function copyBoleto(){ navigator.clipboard?.writeText('1234.56789 01234.567890 12345.678901 1 00000001'); toast('Código do boleto copiado! 📄'); }

// ── PLACE ORDER ─────────────────────────────────────────
function placeOrder(){
  const btn=document.getElementById('payBtn');
  btn.classList.add('loading');
  btn.querySelector('svg').style.display='none';
  setTimeout(()=>{ btn.classList.remove('loading'); goStep(4); },2000);
}

// ── CONFIRMATION ────────────────────────────────────────
function showConfirm(){
  const code='DS-2025-'+String(Math.floor(Math.random()*9000)+1000);
  document.getElementById('orderCode').textContent=code;
  const today=new Date();
  const transit=new Date(today); transit.setDate(today.getDate()+3);
  const delivery=new Date(today); delivery.setDate(today.getDate()+(shipping===29.9?4:shipping===15.9?10:15));
  document.getElementById('otlTransit').textContent=transit.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  document.getElementById('otlDelivery').textContent=delivery.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  spawnConfetti();
  clearInterval(pixInterval);
}

function spawnConfetti(){
  const el=document.getElementById('confetti');
  const colors=['#2563eb','#16a34a','#f97316','#eab308','#7c3aed','#ec4899'];
  el.innerHTML=Array.from({length:16},(_,i)=>{
    const c=colors[i%colors.length];
    const tx=(Math.random()*160-80)+'px';
    const ty=(Math.random()*-120-40)+'px';
    const r=(Math.random()*360)+'deg';
    const delay=(Math.random()*.4)+'s';
    return `<div class="cf" style="background:${c};left:${50+Math.random()*20-10}%;top:50%;--tx:${tx};--ty:${ty};--r:${r};animation-delay:${delay}"></div>`;
  }).join('');
}

// ── HELPERS ─────────────────────────────────────────────
function fp(p){return 'R$ '+p.toFixed(2).replace('.',',')}

function toast(msg,type='ok'){
  const t=document.getElementById('toast');
  const ic=document.getElementById('tIco');
  document.getElementById('tMsg').textContent=msg;
  ic.className='t-ico '+(type==='ok'?'ok':type==='inf'?'inf':'err-t');
  ic.textContent=type==='ok'?'✓':type==='inf'?'ℹ':'!';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}

window.addEventListener('keydown',e=>{ if(e.key==='Escape') flipCard(false); });
