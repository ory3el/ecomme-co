const $ = id => document.getElementById(id);

/* ============================================================ AMBIENT DOTS */
(function spawnDots(){
  const wrap = $('bgDots');
  for(let i=0;i<16;i++){
    const d = document.createElement('div');
    d.className='dot';
    d.style.left = Math.random()*100+'%';
    d.style.top = Math.random()*100+'%';
    d.style.setProperty('--dx',(Math.random()*24-12)+'px');
    d.style.setProperty('--dy',(Math.random()*24-12)+'px');
    d.style.setProperty('--dur',(5+Math.random()*7)+'s');
    d.style.animationDelay = (Math.random()*4)+'s';
    wrap.appendChild(d);
  }
})();

/* ============================================================ TOAST */
function showToast(type,msg){
  const stack=$('toastStack');
  const el=document.createElement('div');
  el.className='toast '+type;
  const icon = type==='success'
    ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  el.innerHTML = `<div class="t-ico">${icon}</div><span>${msg}</span>`;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),300); },3000);
}

/* ============================================================ AUTH GATE FLOW */
let isLoggedIn = false;
const ACCOUNT_EMAIL = 'myemail@example.com';
const ACCOUNT_NAME = 'User';

function bootAuth(){
  setTimeout(()=>{
    if(isLoggedIn){ closeAuthGate(); return; }
    $('gateChecking').style.display='none';
    $('gateLogin').style.display='block';
  }, 750);
}
function handleLogin(){
  const email=$('loginEmail').value.trim();
  const pass=$('loginPassword').value.trim();
  if(!email || !pass){ showToast('error','Preencha e-mail e senha para continuar.'); return; }
  const btn=$('btnLogin');
  btn.classList.add('loading');
  btn.innerHTML='<div class="spinner-sm" style="border-color:rgba(255,255,255,.35);border-top-color:#fff"></div> Entrando...';
  setTimeout(()=>{
    isLoggedIn = true;
    closeAuthGate();
    showToast('success', `Bem-vinda de volta, ${ACCOUNT_NAME.split(' ')[0]}! Retomando seu cadastro...`);
  }, 1000);
}
function closeAuthGate(){
  const email=$('loginEmail').value.trim();
  const pass=$('loginPassword').value.trim();
  if(!email || !pass){ showToast('error','Preencha e-mail e senha para continuar.'); return; }
  
  $('fldEmail').value = ACCOUNT_EMAIL;
  $('authGate').classList.add('hidden');
  $('appShell').classList.remove('inert');
  setTimeout(()=>{ $('authGate').style.display='none'; }, 550);
}
bootAuth();

/* ============================================================ MASK HELPERS */
const onlyDigits = v => v.replace(/\D/g,'');

function maskCPF(v){
  v=onlyDigits(v).slice(0,11);
  v=v.replace(/(\d{3})(\d)/,'$1.$2');
  v=v.replace(/(\d{3})(\d)/,'$1.$2');
  v=v.replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  return v;
}
function maskCNPJ(v){
  v=onlyDigits(v).slice(0,14);
  v=v.replace(/(\d{2})(\d)/,'$1.$2');
  v=v.replace(/(\d{3})(\d)/,'$1.$2');
  v=v.replace(/(\d{3})(\d)/,'$1/$2');
  v=v.replace(/(\d{4})(\d{1,2})$/,'$1-$2');
  return v;
}
function maskPhone(v){
  v=onlyDigits(v).slice(0,11);
  if(v.length>10) v=v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
  else if(v.length>6) v=v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
  else if(v.length>2) v=v.replace(/(\d{2})(\d{0,5})/,'($1) $2');
  else if(v.length>0) v=v.replace(/(\d{0,2})/,'($1');
  return v.trim();
}
function maskCEP(v){
  v=onlyDigits(v).slice(0,8);
  v=v.replace(/(\d{5})(\d{1,3})/,'$1-$2');
  return v;
}
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ============================================================ STATUS ICON HELPERS */
function setStatus(el, state){ /* state: '', 'ok', 'bad', 'loading' */
  if(!el) return;
  if(state==='ok'){ el.className='input-status ok'; el.innerHTML='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'; }
  else if(state==='bad'){ el.className='input-status bad'; el.innerHTML='<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'; }
  else if(state==='loading'){ el.className='input-status'; el.innerHTML='<div class="spinner-sm"></div>'; }
  else { el.className='input-status'; el.innerHTML=''; }
}
function setFieldClass(input, ok){
  input.classList.remove('valid','invalid');
  if(ok===true) input.classList.add('valid');
  else if(ok===false) input.classList.add('invalid');
}

/* ============================================================ STEP 1 — PERSON TYPE TOGGLE */
let personType='pf';
function setPersonType(type){
  personType=type;
  document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  $('segPillBg').style.left = type==='pf' ? '4px' : 'calc(50% + 2px)';
  $('lblNome').innerHTML = type==='pf' ? 'Nome completo <span class="req">*</span>' : 'Razão social <span class="req">*</span>';
  $('lblDoc').innerHTML = type==='pf' ? 'CPF <span class="req">*</span>' : 'CNPJ <span class="req">*</span>';
  $('fldDoc').placeholder = type==='pf' ? '000.000.000-00' : '00.000.000/0000-00';
  $('fldDoc').value='';
  setStatus($('statDoc'),''); $('msgDoc').classList.remove('show');
  $('wrapFantasia').style.display = type==='pj' ? 'flex' : 'none';
  validateStep1();
}
function onDocInput(input){
  input.value = personType==='pf' ? maskCPF(input.value) : maskCNPJ(input.value);
  validateStep1();
}
function onPhoneInput(input){ input.value = maskPhone(input.value); validateStep1(); }

/* ============================================================ CEP LOOKUP (simulated) */
const CEP_DB = {
  '80530000': { logradouro:'Rua das Araucárias', bairro:'Centro Cívico', cidade:'Curitiba', uf:'PR' },
  '01310000': { logradouro:'Avenida Paulista', bairro:'Bela Vista', cidade:'São Paulo', uf:'SP' },
  '20040000': { logradouro:'Avenida Rio Branco', bairro:'Centro', cidade:'Rio de Janeiro', uf:'RJ' },
};
let cepTimer=null;
function onCepInput(input){
  input.value = maskCEP(input.value);
  clearTimeout(cepTimer);
  const digits = onlyDigits(input.value);
  if(digits.length < 8){ setStatus($('statCep'),''); validateStep1(); return; }
  setStatus($('statCep'),'loading');
  cepTimer = setTimeout(()=>{
    const data = CEP_DB[digits] || { logradouro:'Avenida Brasil', bairro:'Centro', cidade:'São Paulo', uf:'SP' };
    $('fldEndereco').value = data.logradouro + ', ' + data.bairro;
    $('fldCidade').value = data.cidade;
    $('fldEstado').value = data.uf;
    setStatus($('statCep'),'ok');
    validateStep1();
    document.getElementById('fldNumero').focus();
  }, 650);
}

/* ============================================================ STEP 1 VALIDATION */
function validateStep1(){
  const nome = $('fldNome').value.trim();
  const nomeOk = nome.length>=3;
  setFieldClass($('fldNome'), nome.length? nomeOk : null);
  setStatus($('statNome'), nome.length? (nomeOk?'ok':'bad') : '');

  const docDigits = onlyDigits($('fldDoc').value);
  const docLen = personType==='pf' ? 11 : 14;
  const docOk = docDigits.length===docLen;
  setFieldClass($('fldDoc'), docDigits.length? docOk : null);
  setStatus($('statDoc'), docDigits.length? (docOk?'ok':'bad') : '');
  $('msgDoc').classList.toggle('show', docDigits.length>0 && !docOk);

  let fantasiaOk = true;
  if(personType==='pj'){ fantasiaOk = $('fldFantasia').value.trim().length>=2; }

  const phoneDigits = onlyDigits($('fldTelefone').value);
  const phoneOk = phoneDigits.length>=10;
  setStatus($('statTelefone'), phoneDigits.length? (phoneOk?'ok':'bad') : '');

  const email = $('fldEmail').value.trim();
  const emailOk = isValidEmail(email);
  setFieldClass($('fldEmail'), email.length? emailOk : null);
  setStatus($('statEmail'), email.length? (emailOk?'ok':'bad') : '');

  const cepOk = onlyDigits($('fldCep').value).length===8;
  const enderecoOk = $('fldEndereco').value.trim().length>=3;
  const numeroOk = $('fldNumero').value.trim().length>=1;
  const cidadeOk = $('fldCidade').value.trim().length>=2;
  const estadoOk = $('fldEstado').value!=='';

  const identityDone = nomeOk && docOk && fantasiaOk;
  const addressDone = phoneOk && emailOk && cepOk && enderecoOk && numeroOk && cidadeOk && estadoOk;

  $('checkIdentity').classList.toggle('done', identityDone);
  $('checkAddress').classList.toggle('done', addressDone);

  const allOk = identityDone && addressDone;
  $('btnStep1Continue').disabled = !allOk;
  if(window.__s1nextSync) window.__s1nextSync(identityDone);
  return allOk;
}

/* ============================================================ STEP 2 — SLUG */
function slugify(str){
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s-]/g,'')
    .trim().replace(/\s+/g,'-').replace(/-+/g,'-');
}
let slugManuallyEdited=false;
let slugTimer=null;
const RESERVED_SLUGS=['loja','admin','ecomme','shop','store','techprime','minha-loja','app','suporte'];

function onStoreNameInput(){
  const name=$('fldStoreName').value;
  updatePreview();
  if(!slugManuallyEdited){
    $('fldSlug').value = slugify(name);
    checkSlugAvailability();
  }
  validateStep2();
}
function onSlugInput(manual){
  if(manual) slugManuallyEdited=true;
  $('fldSlug').value = slugify($('fldSlug').value);
  checkSlugAvailability();
  updatePreview();
}
function checkSlugAvailability(){
  clearTimeout(slugTimer);
  const val=$('fldSlug').value.trim();
  $('slugPreviewText').textContent = val || 'sua-loja';
  if(!val){ setStatus($('statSlug'),''); $('msgSlug').classList.remove('show'); validateStep2(); return; }
  setStatus($('statSlug'),'loading');
  slugTimer=setTimeout(()=>{
    const taken = RESERVED_SLUGS.includes(val);
    setStatus($('statSlug'), taken?'bad':'ok');
    $('msgSlug').classList.toggle('show', taken);
    window.__slugAvailable = !taken;
    validateStep2();
  }, 550);
}

/* ============================================================ STEP 2 — DESCRIPTION */
function onDescInput(){
  const v=$('fldDescricao').value;
  $('descCount').textContent = v.length+'/140';
  updatePreview();
  validateStep2();
}

/* ============================================================ STEP 2 — CATEGORY / ACCENT COLOR */
function onCategoriaInput(){ updatePreview(); }
let currentAccent = '#4287F5';
function setAccentColor(color, el){
  currentAccent = color;
  document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('on'));
  if(el) el.classList.add('on');
  updatePreview();
}

/* ============================================================ STEP 2 — SHIPPING CHIPS / FRETE ============ */
function toggleChip(btn){
  btn.classList.toggle('on');
  const anyOn = document.querySelectorAll('.chip-opt.on').length>0;
  window.__anyShipping = anyOn;
  validateStep2();
}
function toggleFrete(){
  const sw=$('swFrete');
  sw.classList.toggle('on');
  $('wrapValorMinimo').style.display = sw.classList.contains('on') ? 'grid' : 'none';
  updatePreview();
}

/* ============================================================ FILE UPLOAD (drag & drop + click) */
function handleFile(input, kind){
  const file = input.files[0];
  if(!file) return;
  loadFileIntoZone(file, kind);
}
function loadFileIntoZone(file, kind){
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const zoneId = kind==='logo' ? 'dzLogo' : 'dzCover';
    const zone = $(zoneId);
    zone.classList.add('has-file');
    zone.innerHTML = `<img class="uz-preview" src="${dataUrl}"><button class="uz-remove" onclick="event.stopPropagation();removeUpload('${kind}')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    if(kind==='logo'){ window.__logoData = dataUrl; } else { window.__coverData = dataUrl; }
    updatePreview();
    showToast('success', kind==='logo' ? 'Logotipo enviado!' : 'Imagem de capa enviada!');
  };
  reader.readAsDataURL(file);
}
function removeUpload(kind){
  const zoneId = kind==='logo' ? 'dzLogo' : 'dzCover';
  const zone = $(zoneId);
  zone.classList.remove('has-file');
  zone.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span class="uz-txt">${kind==='logo'?'Logo':'Arraste ou clique para enviar a capa'}</span>`;
  if(kind==='logo') window.__logoData=null; else window.__coverData=null;
  updatePreview();
}
['dzLogo','dzCover'].forEach(id=>{
  const zone = document.getElementById(id);
  zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()=> zone.classList.remove('dragover'));
  zone.addEventListener('drop', e=>{
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if(file) loadFileIntoZone(file, id==='dzLogo'?'logo':'cover');
  });
});

/* ============================================================ LIVE PREVIEW */
function initials(name){
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'SL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function updatePreview(){
  const name = $('fldStoreName').value.trim() || 'Sua Loja';
  const desc = $('fldDescricao').value.trim() || 'Sua descrição aparecerá aqui.';
  const cat = $('fldCategoria').value || 'Eletrônicos';
  const slug = $('fldSlug').value.trim() || 'sua-loja';
  const prazo = $('fldPrazo').value;
  const freteOn = $('swFrete').classList.contains('on');
  const valorMin = $('fldValorMinimo').value.trim();

  $('pfName').textContent = name;
  $('pfDesc').textContent = desc;
  $('pfCat').textContent = cat;
  $('pfUrlSlug').textContent = slug;
  $('successStoreName').textContent = name;

  $('pfCat').style.background = currentAccent;
  $('pfFollowBtn').style.background = currentAccent;
  $('pfCover').style.background = currentAccent;

  if(window.__logoData){
    $('pfAvatar').innerHTML = `<img src="${window.__logoData}">`;
  } else {
    $('pfAvatar').innerHTML = initials(name);
    $('pfAvatar').style.background = currentAccent;
  }
  if(window.__coverData){
    $('pfCover').innerHTML = `<img src="${window.__coverData}">`;
  } else if(!window.__logoData){
    $('pfCover').innerHTML = '';
  } else {
    $('pfCover').innerHTML = '';
  }

  $('pfBadgePrazo').textContent = '🚚 ' + prazo;
  const badgeFrete = $('pfBadgeFrete');
  if(freteOn){
    badgeFrete.textContent = '✨ Frete grátis acima de ' + (valorMin || 'R$199');
    badgeFrete.classList.add('show');
  } else {
    badgeFrete.classList.remove('show');
  }
}

/* ============================================================ STEP 2 VALIDATION */
function validateStep2(){
  const nameOk = $('fldStoreName').value.trim().length>=3;
  const slugOk = $('fldSlug').value.trim().length>=3 && window.__slugAvailable!==false;
  const descOk = $('fldDescricao').value.trim().length>=10;
  const privacyOk = $('chkPrivacy').checked;

  setFieldClass($('fldStoreName'), $('fldStoreName').value.length? nameOk : null);

  const allOk = nameOk && slugOk && descOk && privacyOk;
  $('btnCreateStore').disabled = !allOk;
  if(window.__s2nextSync) window.__s2nextSync(nameOk && slugOk && descOk);
  return allOk;
}
window.__anyShipping = true;
window.__slugAvailable = true;

/* ============================================================ STEP NAVIGATION (main 1↔2) */
function goToStep(step){
  if(step===2 && $('btnStep1Continue').disabled) return;
  $('stepsViewport').setAttribute('data-step', String(step));
  $('pill1').classList.toggle('active', step===1);
  $('pill1').classList.toggle('done', step===2);
  $('pill2').classList.toggle('active', step===2);
  $('connector1').classList.toggle('done', step===2);
  if(step===2){ updatePreview(); }
}

/* ============================================================ MOBILE SUBSTEPS — STEP 1 */
let s1Sub = 0;
function s1GoTo(i){
  s1Sub = i;
  $('sg1-identity').classList.toggle('hide-mobile', i!==0);
  $('sg1-address').classList.toggle('hide-mobile', i!==1);
  document.querySelectorAll('#s1Dots .d').forEach((d,idx)=>d.classList.toggle('on', idx===i));
  $('s1Back').style.visibility = i===0 ? 'hidden' : 'visible';
  $('s1Next').style.display = i===0 ? 'flex' : 'none';
  document.getElementById('step1Actions').style.display = i===1 ? 'block' : 'none';
  if(window.innerWidth>820){ document.getElementById('step1Actions').style.display='block'; }
}
window.__s1nextSync = function(identityDone){
  $('s1Next').disabled = !identityDone;
};

/* ============================================================ MOBILE SUBSTEPS — STEP 2 */
let s2Sub = 0;
function s2GoTo(i){
  s2Sub = i;
  $('sg2-branding').classList.toggle('hide-mobile', i!==0);
  $('sg2-settings').classList.toggle('hide-mobile', i!==1);
  document.querySelectorAll('#s2Dots .d').forEach((d,idx)=>d.classList.toggle('on', idx===i));
  $('s2Nav').style.display = window.innerWidth<=820 ? 'flex' : 'none';
  document.getElementById('step2Actions').style.display = (window.innerWidth<=820 && i===0) ? 'none' : 'block';
}
window.__s2nextSync = function(brandingDone){ /* reserved for future gating between sub-steps */ };

function handleResize(){
  const mobile = window.innerWidth<=820;
  $('s1Nav').style.display = mobile ? 'flex' : 'none';
  document.getElementById('step1Actions').style.display = mobile ? (s1Sub===1?'block':'none') : 'block';
  if(!mobile){ $('sg1-identity').classList.remove('hide-mobile'); $('sg1-address').classList.remove('hide-mobile'); }
  else { s1GoTo(s1Sub); }

  $('s2Nav').style.display = mobile ? 'flex' : 'none';
  document.getElementById('step2Actions').style.display = mobile ? (s2Sub===1?'block':'none') : 'block';
  if(!mobile){ $('sg2-branding').classList.remove('hide-mobile'); $('sg2-settings').classList.remove('hide-mobile'); }
  else { s2GoTo(s2Sub); }
}
window.addEventListener('resize', handleResize);
handleResize();

/* ============================================================ MOBILE PREVIEW SHEET */
function togglePreviewSheet(open){
  $('previewPanel').classList.toggle('open', open);
  $('previewSheetOv').classList.toggle('on', open);
}

/* ============================================================ EXIT CONFIRM */
function openExitConfirm(){ $('exitConfirm').classList.add('on'); }
function closeExitConfirm(){ $('exitConfirm').classList.remove('on'); }

/* ============================================================ FINAL SUBMIT */
function createStore(){
  if(!validateStep2()) { showToast('error','Preencha os campos obrigatórios antes de continuar.'); return; }
  const btn=$('btnCreateStore');
  btn.disabled=true;
  btn.innerHTML='<div class="spinner-sm" style="border-color:rgba(255,255,255,.35);border-top-color:#fff"></div> Criando sua loja...';
  setTimeout(()=>{
    launchSuccess();
  }, 1200);
}
function launchSuccess(){
  if(!validateStep2()) { showToast('error','Preencha os campos obrigatórios antes de continuar.'); return; }
  const screen=$('successScreen');
  screen.classList.add('on');
  const colors=['#4287F5','#1FAA6E','#F0A93A','#F2637B','#8B5CF6'];
  for(let i=0;i<26;i++){
    const p=document.createElement('div');
    p.className='confetti-piece';
    const angle=Math.random()*Math.PI*2;
    const dist=80+Math.random()*160;
    p.style.setProperty('--cx',(Math.cos(angle)*dist)+'px');
    p.style.setProperty('--cy',(Math.sin(angle)*dist - 40)+'px');
    p.style.background=colors[i%colors.length];
    p.style.animationDelay=(Math.random()*.15)+'s';
    p.style.borderRadius = Math.random()>.5 ? '50%' : '2px';
    $('successCheckWrap').appendChild(p);
  }
}

function togglePessoaJuridica() {
  const tipoPessoa = document.getElementById('tipoPessoa').value;
  const camposPJ = document.getElementById('camposPJ');
  const camposPF = document.getElementById('camposPF');

  if (tipoPessoa === 'PJ') {
    camposPJ.style.display = 'flex'; 
    camposPF.style.display = 'none';
  } else {
    camposPJ.style.display = 'none';
    camposPF.style.display = 'flex'; 
  }
}

document.addEventListener('DOMContentLoaded', () => {
  togglePessoaJuridica();
});

/* ============================================================ KEYBOARD */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeExitConfirm(); togglePreviewSheet(false); }
});

/* ============================================================ INIT */
setPersonType('pf');
updatePreview();
validateStep1();
validateStep2();
