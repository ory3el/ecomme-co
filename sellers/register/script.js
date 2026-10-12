function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
}

// const $ = id => document.getElementById(id);
let personType = 'pf';
let isSubmitting = false;     // declarado aqui para existir antes de qualquer validação

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
  const ico=document.createElement('div');
  ico.className='t-ico';
  ico.innerHTML = type==='success'
    ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  const txt=document.createElement('span');
  txt.textContent=msg;               // textContent: mensagens vindas do banco nunca viram HTML
  el.append(ico, txt);
  stack.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),300); },3500);
}

/* ============================================================ AUTH GATE */
const GATE_PANES = { checking:'gateChecking', login:'gateLogin', hasStore:'gateHasStore', error:'gateError' };

function showGate(which){
  const gate = $('authGate'), shell = $('appShell');
  Object.values(GATE_PANES).forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  if (which === 'app') {
    gate.classList.add('hidden');
    shell.classList.remove('inert');
    setTimeout(() => { if (gate.classList.contains('hidden')) gate.style.display = 'none'; }, 550);
    return;
  }
  const pane = $(GATE_PANES[which]);
  if (pane) pane.style.display = 'block';
  $('gateChecking').style.display = 'flex';
  gate.style.display = 'flex';
  gate.classList.remove('hidden');
  shell.classList.add('inert');
}

const isNetworkError = err => {
  if (!err) return false;
  const m = String(err.message || err).toLowerCase();
  return err.name === 'AuthRetryableFetchError' || err.name === 'TypeError' || /failed to fetch|network|load failed|timeout/.test(m);
};

/* Fluxo: sessão → loja existente? → formulário. Falha de rede/consulta NUNCA abre o formulário. */
async function bootRegister(){
  showGate('checking');
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError && isNetworkError(userError)) { showGate('error'); return; }
    if (!user || userError) { showGate('login'); return; }
    userId = user.id;

    const { data: loja, error: lojaError } = await supabaseClient
      .from('lojas').select('id').eq('user_id', userId).maybeSingle();

    if (lojaError) {
      // PGRST116 = mais de uma linha para o mesmo usuário: ele já possui loja.
      if (lojaError.code === 'PGRST116') { showGate('hasStore'); return; }
      console.error('Erro ao verificar loja existente:', lojaError);
      showGate('error');
      return;
    }
    if (loja) { showGate('hasStore'); return; }

    showGate('app');
    await prefillFromProfile(user);
  } catch (err) {
    console.error('Falha ao iniciar o cadastro:', err);
    showGate('error');
  }
}

/* Preenche somente campos vazios; nunca grava nada em "profiles". */
async function prefillFromProfile(user){
  if (user.email) $('fldEmail').value = user.email;
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (profile) {
      if (!$('fldNome').value.trim() && profile.full_name) $('fldNome').value = profile.full_name;
      if (!$('fldTelefone').value.trim() && profile.phone) { $('fldTelefone').value = profile.phone; maskPhone.updateValue(); }
      if (personType === 'pf' && !onlyDigits($('fldDoc').value) && profile.cpf) { $('fldDoc').value = profile.cpf; maskDoc.updateValue(); }
      if (profile.avatar_url) {
        ['sidebarAvatar','headerAvatar'].forEach(id => {
          const img = $(id);
          if (!img) return;
          img.src = profile.avatar_url;
          Object.assign(img.style, { filter:'none', width:'100%', height:'100%', borderRadius:'100%', objectFit:'cover' });
        });
      }
    }
  } catch (err) {
    console.warn('Perfil não carregado (o formulário segue manual):', err);
  }
  validateStep1();
}

$('gateChecking').style.display = 'none';
window.addEventListener('DOMContentLoaded', bootRegister);

/* ============================================================ MASK HELPERS */
const onlyDigits = v => v.replace(/\D/g,'');

const maskDoc = IMask($('fldDoc'), {
  mask: [
    { mask: '000.000.000-00', maxLength: 11 },
    { mask: '00.000.000/0000-00', maxLength: 14 }
  ],
  dispatch: function (appended, dynamicMasked) {
    return personType === 'pf' ? dynamicMasked.compiledMasks[0] : dynamicMasked.compiledMasks[1];
  }
});
maskDoc.on('accept', () => validateStep1());

const maskPhone = IMask($('fldTelefone'), {
  mask: [
    { mask: '(00) 0000-0000' },
    { mask: '(00) 00000-0000' }
  ]
});
maskPhone.on('accept', () => validateStep1());

const maskIEMask = IMask($('fldIE'), { mask: '000.000.000.000' });
maskIEMask.on('accept', () => validateStep1());

/* ---- CEP: timeout, cancelamento da consulta anterior, tratamento de erro e nova tentativa ---- */
const maskCep = IMask($('fldCep'), { mask: '00000-000' });
let cepSeq = 0, cepAbort = null, lastCepOk = '';

function showCepRetry(show){ const b = $('btnCepRetry'); if (b) b.hidden = !show; }

maskCep.on('accept', () => {
  const digits = maskCep.unmaskedValue;
  if (digits.length < 8) {
    cepSeq++; if (cepAbort) cepAbort.abort();
    lastCepOk = '';
    setStatus($('statCep'), ''); showCepRetry(false);
    $('cepLoaderOv').classList.remove('on');
    validateStep1();
    return;
  }
  if (digits === lastCepOk) return;           // mesmo CEP já resolvido
  lookupCep(digits);
});

function retryCep(){
  const digits = maskCep.unmaskedValue;
  if (digits.length === 8) { lastCepOk = ''; lookupCep(digits); }
}

async function lookupCep(digits){
  const seq = ++cepSeq;                        // consultas antigas que terminam depois são ignoradas
  if (cepAbort) cepAbort.abort();
  const ctrl = new AbortController();
  cepAbort = ctrl;
  const timer = setTimeout(() => ctrl.abort(), 8000);

  $('cepLoaderOv').classList.add('on');
  setStatus($('statCep'), 'loading');
  showCepRetry(false);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (seq !== cepSeq) return;

    if (data.erro) {
      lastCepOk = '';
      showToast('error', 'CEP não encontrado. Verifique o número ou preencha o endereço manualmente.');
      setStatus($('statCep'), 'bad');
      $('fldEndereco').value = ''; $('fldCidade').value = ''; $('fldEstado').value = '';
    } else {
      lastCepOk = digits;
      const bairroStr = data.bairro ? ', ' + data.bairro : '';
      $('fldEndereco').value = (data.logradouro || '') + bairroStr;
      $('fldCidade').value = data.localidade || '';
      $('fldEstado').value = data.uf || '';
      setStatus($('statCep'), 'ok');
      $('fldNumero').focus();
    }
  } catch (err) {
    if (seq !== cepSeq) return;                // foi substituída por uma consulta mais nova
    const timedOut = err && err.name === 'AbortError';
    showToast('error', timedOut
      ? 'A consulta do CEP demorou demais. Tente novamente.'
      : 'Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.');
    setStatus($('statCep'), '');
    showCepRetry(true);
  } finally {
    clearTimeout(timer);
    if (seq === cepSeq) { $('cepLoaderOv').classList.remove('on'); validateStep1(); }
  }
}
/* VALIDAÇÃO INSCRIÇÃO ESTADUAL (UF) */
function checkUfForIE() {
  const uf = $('fldEstado').value;
  const msgIE = $('msgIE');
  const inputIE = $('fldIE');
  
  if (!uf) {
    //msgIE.classList.add('show');
    //inputIE.blur(); 
    $('fldEstado').classList.add('invalid');
  } else {
    //msgIE.classList.remove('show');
    $('fldEstado').classList.remove('invalid');
  }
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
function setPersonType(type){
  personType = type;
  document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  $('segPillBg').style.left = type==='pf' ? '4px' : 'calc(50% + 2px)';
  $('lblNome').innerHTML = type==='pf' ? 'Nome completo <span class="req">*</span>' : 'Razão social <span class="req">*</span>';
  $('lblDoc').innerHTML = type==='pf' ? 'CPF <span class="req">*</span>' : 'CNPJ <span class="req">*</span>';
  $('fldDoc').placeholder = type==='pf' ? '000.000.000-00' : '00.000.000/0000-00';
  
  $('fldDoc').value = '';
  maskDoc.updateValue();
  setStatus($('statDoc'),''); $('msgDoc').classList.remove('show');
  
  $('wrapFantasia').style.display = type==='pj' ? 'flex' : 'none';
  $('wrapPJExtra').style.display = type==='pj' ? 'grid' : 'none';
  validateStep1();
}

/* ============================================================ VALIDADORES (documento, telefone, UF) */
const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function isValidCPF(d){
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += +d[i] * (t + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== +d[t]) return false;
  }
  return true;
}
function isValidCNPJ(d){
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const calc = len => {
    const w = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += +d[i] * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}
function isValidPhoneBR(d){
  if (d.length < 10 || d.length > 11) return false;
  const ddd = +d.slice(0, 2);
  if (ddd < 11 || ddd > 99) return false;
  return d.length === 10 || d[2] === '9';       // celular com 9º dígito
}
function parseBRL(str){
  const n = parseFloat(String(str || '').replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/* ============================================================ STEP 1 VALIDATION */
function validateStep1(){
  const nome = $('fldNome').value.trim();
  const words = nome.split(/\s+/).filter(Boolean);
  const nomeOk = personType === 'pf' ? (words.length >= 2 && nome.length >= 5) : nome.length >= 3;
  setFieldClass($('fldNome'), nome.length ? nomeOk : null);
  setStatus($('statNome'), nome.length ? (nomeOk ? 'ok' : 'bad') : '');

  const docDigits = onlyDigits($('fldDoc').value);
  const docLen = personType === 'pf' ? 11 : 14;
  const docComplete = docDigits.length === docLen;
  const docOk = docComplete && (personType === 'pf' ? isValidCPF(docDigits) : isValidCNPJ(docDigits));
  setFieldClass($('fldDoc'), docDigits.length ? docOk : null);
  setStatus($('statDoc'), docDigits.length ? (docOk ? 'ok' : (docComplete ? 'bad' : '')) : '');
  $('msgDoc').textContent = docComplete ? (personType === 'pf' ? 'CPF inválido' : 'CNPJ inválido') : 'Documento incompleto';
  $('msgDoc').classList.toggle('show', docDigits.length > 0 && !docOk);

  let fantasiaOk = true, ieOk = true, regimeOk = true;
  if (personType === 'pj') {
    fantasiaOk = $('fldFantasia').value.trim().length >= 2;
    ieOk = onlyDigits($('fldIE').value).length === 12;
    regimeOk = $('fldRegime').value !== '';
  }

  const phoneDigits = onlyDigits($('fldTelefone').value);
  const phoneOk = isValidPhoneBR(phoneDigits);
  setStatus($('statTelefone'), phoneDigits.length ? (phoneOk ? 'ok' : (phoneDigits.length >= 10 ? 'bad' : '')) : '');

  const email = $('fldEmail').value.trim();
  const emailOk = isValidEmail(email);
  setFieldClass($('fldEmail'), email.length ? emailOk : null);
  setStatus($('statEmail'), email.length ? (emailOk ? 'ok' : 'bad') : '');

  const cepOk = onlyDigits($('fldCep').value).length === 8;
  const enderecoOk = $('fldEndereco').value.trim().length >= 3;
  const numeroOk = $('fldNumero').value.trim().length >= 1;
  const cidadeOk = $('fldCidade').value.trim().length >= 2;

  const estadoOk = UF_LIST.includes($('fldEstado').value);
  if (estadoOk) {
    $('fldEstado').classList.remove('invalid');
    if ($('msgIE')) $('msgIE').classList.remove('show');
  }

  const identityDone = nomeOk && docOk && fantasiaOk && ieOk && regimeOk;
  const addressDone = phoneOk && emailOk && cepOk && enderecoOk && numeroOk && cidadeOk && estadoOk;

  $('checkIdentity').classList.toggle('done', identityDone);
  $('checkAddress').classList.toggle('done', addressDone);

  const allOk = identityDone && addressDone;
  $('btnStep1Continue').disabled = !allOk;
  if (window.__s1nextSync) window.__s1nextSync(identityDone);
  return allOk;
}

/* ============================================================ STEP 2 — SLUG */
function slugify(str){
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s-]/g,'')
    .trim().replace(/\s+/g,'-').replace(/-+/g,'-');
}
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN = 3, SLUG_MAX = 40;
let slugManuallyEdited = false;
let slugTimer = null, slugSeq = 0;
window.__slugState = 'idle';                    // idle | checking | ok | taken | invalid | unknown
/* Rotas/termos da plataforma que nunca podem virar loja. A disponibilidade real vem do banco (rpc slug_available). */
const RESERVED_SLUGS = ['loja','admin','ecomme','shop','store','techprime','minha-loja','app','suporte',
  'api','login','register','sellers','seller','main','dashboard','products','categories','offers','terms','settings','support','affiliates','affiliate'];

const finalSlug = () => $('fldSlug').value.trim().replace(/^-+|-+$/g, '');

function setSlugMsg(text, kind){
  const m = $('msgSlug');
  if (!m) return;
  m.textContent = text || '';
  m.classList.toggle('show', !!text);
  m.classList.toggle('warn', kind === 'warn');
}

function onStoreNameInput(){
  const name = $('fldStoreName').value;
  updatePreview();
  if (!slugManuallyEdited) {
    $('fldSlug').value = slugify(name).slice(0, SLUG_MAX);
    checkSlugAvailability();
  }
  validateStep2();
}
function onSlugInput(manual){
  if (manual) slugManuallyEdited = true;
  $('fldSlug').value = slugify($('fldSlug').value).slice(0, SLUG_MAX);
  checkSlugAvailability();
  updatePreview();
}
function onSlugBlur(){ $('fldSlug').value = finalSlug(); checkSlugAvailability(); }

function checkSlugAvailability(){
  clearTimeout(slugTimer);
  const seq = ++slugSeq;                          // invalida respostas de consultas anteriores
  const val = finalSlug();
  $('slugPreviewText').textContent = val || 'sua-loja';

  if (!val) { window.__slugState = 'idle'; setStatus($('statSlug'), ''); setSlugMsg(''); validateStep2(); return; }
  if (val.length < SLUG_MIN || !SLUG_RE.test(val)) {
    window.__slugState = 'invalid'; setStatus($('statSlug'), 'bad');
    setSlugMsg(val.length < SLUG_MIN ? `Use pelo menos ${SLUG_MIN} caracteres.` : 'Use apenas letras minúsculas, números e hífens.');
    validateStep2(); return;
  }
  if (RESERVED_SLUGS.includes(val)) {
    window.__slugState = 'taken'; setStatus($('statSlug'), 'bad');
    setSlugMsg('Este endereço é reservado pela Ecomme. Escolha outro.');
    validateStep2(); return;
  }

  window.__slugState = 'checking';
  setStatus($('statSlug'), 'loading'); setSlugMsg('');
  validateStep2();

  slugTimer = setTimeout(async () => {
    try {
      const { data, error } = await supabaseClient.rpc('slug_available', { p_slug: val });
      if (seq !== slugSeq) return;
      if (error) throw error;
      if (data === true) {
        window.__slugState = 'ok'; setStatus($('statSlug'), 'ok'); setSlugMsg('');
      } else {
        window.__slugState = 'taken'; setStatus($('statSlug'), 'bad');
        setSlugMsg('Esse endereço já está em uso. Tente outro.');
      }
    } catch (err) {
      if (seq !== slugSeq) return;
      console.warn('Não foi possível verificar o slug:', err);
      // Sem a função no banco ou sem rede: não bloqueia, a restrição única do banco decide ao criar.
      window.__slugState = 'unknown'; setStatus($('statSlug'), '');
      setSlugMsg('Não foi possível verificar agora. Confirmaremos a disponibilidade ao criar a loja.', 'warn');
    }
    validateStep2();
  }, 450);
}
/* ============================================================ STEP 2 — SLOGAN */
function onStoreSloganInput(){
  const v=$('fldStoreSlogan').value;
  $('sloganCount').textContent = v.length+'/50';
  updatePreview();
}

/* ============================================================ STEP 2 — DESCRIPTION */
function onDescInput(){
  const v=$('fldDescricao').value;
  $('descCount').textContent = v.length+'/240';
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
const ALLOWED_IMG_TYPES = ['image/png','image/jpeg','image/webp'];
const IMG_RULES = { logo:{ max: 2*1024*1024, label:'2 MB' }, cover:{ max: 5*1024*1024, label:'5 MB' } };
const STORE_ASSETS_BUCKET = 'store-assets';

function validateImageFile(file, kind){
  if (!ALLOWED_IMG_TYPES.includes(file.type)) return 'Formato não suportado. Use PNG, JPG ou WEBP.';
  if (file.size > IMG_RULES[kind].max) return `A imagem excede o limite de ${IMG_RULES[kind].label}.`;
  return null;
}
function handleFile(input, kind){
  const file = input.files[0];
  input.value = '';                               // permite escolher o mesmo arquivo de novo
  if (file) loadFileIntoZone(file, kind);
}
function loadFileIntoZone(file, kind){
  const problem = validateImageFile(file, kind);
  if (problem) { showToast('error', problem); return; }
  const url = URL.createObjectURL(file);
  const probe = new Image();
  probe.onerror = () => { URL.revokeObjectURL(url); showToast('error', 'Não foi possível ler essa imagem. Tente outro arquivo.'); };
  probe.onload = () => {
    const zone = $(kind === 'logo' ? 'dzLogo' : 'dzCover');
    zone.classList.add('has-file');
    zone.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'uz-preview'; img.src = url; img.alt = '';
    const rm = document.createElement('button');
    rm.className = 'uz-remove'; rm.type = 'button'; rm.setAttribute('aria-label', 'Remover imagem');
    rm.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    rm.addEventListener('click', e => { e.stopPropagation(); removeUpload(kind); });
    zone.append(img, rm);
    if (kind === 'logo') { if (window.__logoPreview) URL.revokeObjectURL(window.__logoPreview); window.__logoFile = file; window.__logoPreview = url; }
    else { if (window.__coverPreview) URL.revokeObjectURL(window.__coverPreview); window.__coverFile = file; window.__coverPreview = url; }
    updatePreview();
    showToast('success', kind === 'logo' ? 'Logotipo selecionado. Ele será enviado ao criar a loja.' : 'Capa selecionada. Ela será enviada ao criar a loja.');
  };
  probe.src = url;
}
function removeUpload(kind){
  const zone = $(kind === 'logo' ? 'dzLogo' : 'dzCover');
  zone.classList.remove('has-file');
  zone.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span class="uz-txt">${kind==='logo'?'Logo':'Arraste ou clique para enviar a capa'}</span>`;
  if (kind === 'logo') { if (window.__logoPreview) URL.revokeObjectURL(window.__logoPreview); window.__logoFile = null; window.__logoPreview = null; }
  else { if (window.__coverPreview) URL.revokeObjectURL(window.__coverPreview); window.__coverFile = null; window.__coverPreview = null; }
  updatePreview();
}
['dzLogo','dzCover'].forEach(id=>{
  const zone = document.getElementById(id);
  zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()=> zone.classList.remove('dragover'));
  zone.addEventListener('drop', e=>{
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadFileIntoZone(file, id==='dzLogo'?'logo':'cover');
  });
});

/* Envia a imagem ao Storage em <uid>/<tipo>-<timestamp>.<ext> e devolve caminho + URL pública. */
async function uploadStoreImage(file, kind, uid){
  const ext = { 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' }[file.type];
  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabaseClient.storage.from(STORE_ASSETS_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(STORE_ASSETS_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/* Máscara simples de moeda para o valor mínimo do frete grátis */
function onValorMinimoInput(){
  const el = $('fldValorMinimo');
  const digits = onlyDigits(el.value).slice(0, 9);
  el.value = digits ? 'R$ ' + (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  updatePreview();
  validateStep2();
}
/* ============================================================ LIVE PREVIEW */
function initials(name){
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'SL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function updatePreview(){
  const name = $('fldStoreName').value.trim() || 'Sua Loja';
  const desc = $('fldDescricao').value.trim() || 'Sua descrição aparecerá aqui.';
  const slogan = $('fldStoreSlogan').value.trim() || 'Seu slogan aparecerá aqui.';
  const cat = $('fldCategoria').value || 'Categoria';
  const slug = $('fldSlug').value.trim() || 'sua-loja';
  const prazo = $('fldPrazo').value;
  const freteOn = $('swFrete').classList.contains('on');
  const valorMin = $('fldValorMinimo').value.trim();

  $('pfName').textContent = name;
  $('pfDesc').textContent = desc;
  $('pfSlogan').textContent = slogan;
  $('pfCat').textContent = cat;
  $('pfUrlSlug').textContent = slug;
  $('successStoreName').textContent = name;

  $('pfCat').style.background = currentAccent;
  $('pfSlogan').style.color = currentAccent;
  $('pfBadgePrazo').style.color = currentAccent;
  $('pfBadgeFrete').style.color = currentAccent;
  $('pfFollowBtn').style.background = currentAccent;
  $('pfCover').style.background = currentAccent;

  if(window.__logoPreview){
    $('pfAvatar').innerHTML = `<img src="${window.__logoPreview}">`;
  } else {
    $('pfAvatar').innerHTML = initials(name);
    $('pfAvatar').style.background = currentAccent;
  }
  if(window.__coverPreview){
    $('pfCover').innerHTML = `<img src="${window.__coverPreview}">`;
  } else if(!window.__logoPreview){
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
  const nameOk = $('fldStoreName').value.trim().length >= 3;
  const slug = finalSlug();
  const slugOk = slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_RE.test(slug)
              && (window.__slugState === 'ok' || window.__slugState === 'unknown');
  const descOk = $('fldDescricao').value.trim().length >= 10;
  const catOk = !!$('fldCategoria').value;
  const shipOk = document.querySelectorAll('.chip-opt.on').length > 0;
  const freteOk = !$('swFrete').classList.contains('on') || parseBRL($('fldValorMinimo').value) > 0;
  const privacyOk = $('chkPrivacy').checked;

  setFieldClass($('fldStoreName'), $('fldStoreName').value.length ? nameOk : null);
  setFieldClass($('fldValorMinimo'), $('swFrete').classList.contains('on') && $('fldValorMinimo').value ? freteOk : null);

  const allOk = nameOk && slugOk && descOk && catOk && shipOk && freteOk && privacyOk;
  $('btnCreateStore').disabled = !allOk || isSubmitting;
  if (window.__s2nextSync) window.__s2nextSync(nameOk && slugOk && descOk);
  return allOk;
}
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
  $('s1Back').style.display = i===0 ? 'none' : 'flex';
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
const CREATE_BTN_HTML = 'Criar minha loja <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function setCreateBtnLoading(text){
  const btn = $('btnCreateStore');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner-sm" style="border-color:rgba(255,255,255,.35);border-top-color:#fff"></div> ${text}`;
}
function resetCreateBtn(){
  const btn = $('btnCreateStore');
  btn.innerHTML = CREATE_BTN_HTML;
  validateStep2();
}

/* Traduz o erro do Supabase/rede em ação para o usuário. */
async function handleCreateError(err){
  console.error('Erro ao criar a loja:', err);
  const code = err && err.code;
  const msg = String((err && (err.message || err.details)) || '').toLowerCase();

  if (code === 'NO_SESSION') {
    showToast('error', 'Sua sessão expirou. Entre novamente para criar a loja.');
    showGate('login'); return;
  }
  if (code === '23505') {
    if (/slug/.test(msg)) {
      window.__slugState = 'taken';
      setStatus($('statSlug'), 'bad');
      setSlugMsg('Esse endereço acabou de ser usado por outra loja. Escolha outro.');
      goToStep(2); $('fldSlug').focus();
      showToast('error', 'Esse endereço de loja já está em uso. Escolha outro.');
    } else {
      showGate('hasStore');           // outra tentativa já criou a loja deste usuário
    }
    return;
  }
  if (code === '42501' || /row-level security|permission denied/.test(msg)) {
    showToast('error', 'Sem permissão para criar a loja. Entre novamente ou contate o suporte.'); return;
  }
  if (code === 'PGRST204' || code === '42703' || /column .* does not exist|could not find the .* column/.test(msg)) {
    showToast('error', 'O banco de dados ainda não está atualizado para este cadastro. Avise o suporte da Ecomme.'); return;
  }
  if (/bucket not found|not found/.test(msg) && /bucket/.test(msg)) {
    showToast('error', 'O armazenamento de imagens ainda não está configurado. Tente sem logo/capa ou avise o suporte.'); return;
  }
  if (isNetworkError(err)) {
    showToast('error', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'); return;
  }
  showToast('error', 'Não foi possível criar sua loja agora. Tente novamente em instantes.');
}

async function createStore() {
  if (isSubmitting) return;                       // bloqueia cliques duplicados
  if (!validateStep1()) { showToast('error', 'Revise os dados pessoais e de endereço.'); goToStep(1); return; }
  if (!validateStep2()) { showToast('error', 'Preencha os campos obrigatórios antes de continuar.'); return; }

  isSubmitting = true;
  setCreateBtnLoading('Criando sua loja...');
  const uploadedPaths = [];                       // para limpar o Storage se algo falhar depois

  try {
    // 0. A sessão e a inexistência de loja são reconfirmadas no momento do envio
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError && isNetworkError(userError)) throw userError;
    if (!user || userError) throw { code: 'NO_SESSION' };
    userId = user.id;

    const { data: existing, error: existingError } = await supabaseClient
      .from('lojas').select('id').eq('user_id', userId).maybeSingle();
    if (existingError && existingError.code !== 'PGRST116') throw existingError;
    if (existing || (existingError && existingError.code === 'PGRST116')) { showGate('hasStore'); return; }

    // 1. Imagens → Storage (URLs, não Base64)
    let logoUrl = null, capaUrl = null;
    if (window.__logoFile) {
      setCreateBtnLoading('Enviando logotipo...');
      const up = await uploadStoreImage(window.__logoFile, 'logo', userId);
      uploadedPaths.push(up.path); logoUrl = up.url;
    }
    if (window.__coverFile) {
      setCreateBtnLoading('Enviando capa...');
      const up = await uploadStoreImage(window.__coverFile, 'capa', userId);
      uploadedPaths.push(up.path); capaUrl = up.url;
    }
    setCreateBtnLoading('Salvando sua loja...');

    // 2. Dados do passo 1 e do passo 2
    const chipsAtivos = document.querySelectorAll('.chip-opt.on');
    const arrayEnvios = Array.from(chipsAtivos).map(chip => chip.getAttribute('data-v'));

    const dadosPasso1 = {
      tipo_pessoa: personType,
      nome_razao: $('fldNome').value.trim(),
      documento: $('fldDoc').value.trim(),
      telefone: $('fldTelefone').value.trim(),
      email: $('fldEmail').value.trim(),
      cep: $('fldCep').value.trim(),
      endereco: $('fldEndereco').value.trim(),
      numero: $('fldNumero').value.trim(),
      complemento: $('fldComplemento') ? $('fldComplemento').value.trim() : '',
      cidade: $('fldCidade').value.trim(),
      estado: $('fldEstado').value.trim(),
      nome_fantasia: $('fldFantasia') ? $('fldFantasia').value.trim() : '',
      inscricao_estadual: $('fldIE') ? $('fldIE').value.trim() : '',
      regime_tributario: $('fldRegime') ? $('fldRegime').value : ''
    };
    const dadosPasso2 = {
      nome_loja: $('fldStoreName').value.trim(),
      slug_url: finalSlug(),
      slogan: $('fldStoreSlogan').value.trim(),
      descricao: $('fldDescricao').value.trim(),
      categoria: $('fldCategoria').value,
      prazo_envio: $('fldPrazo').value,
      politica_devolucao: $('fldPolitica') ? $('fldPolitica').value : '',
      formas_envio: arrayEnvios,
      frete_gratis_ativo: $('swFrete').classList.contains('on'),
      frete_valor_minimo: $('fldValorMinimo').value.trim(),
      cor_destaque: currentAccent
    };
    // Só envia as colunas de imagem quando há imagem (assim o cadastro sem imagens não depende delas)
    if (logoUrl) dadosPasso2.logo_url = logoUrl;
    if (capaUrl) dadosPasso2.capa_url = capaUrl;

    const novaLojaPayload = {
      user_id: userId,
      status: 'pendente',                         // o banco força 'pendente' para usuários comuns
      ...dadosPasso1,
      ...dadosPasso2,
      criado_em: new Date().toISOString()
    };

    // 3. Insere e EXIGE a linha de volta: sem confirmação do banco não há sucesso
    const { data, error } = await supabaseClient
      .from('lojas')
      .insert([novaLojaPayload])
      .select('id, nome_loja, slug_url, status')
      .single();

    if (error) throw error;
    if (!data || data.id === undefined || data.id === null) throw new Error('O banco não confirmou a criação da loja.');

    // 4. Sucesso confirmado
    launchSuccess(data);
  } catch (err) {
    if (uploadedPaths.length) {
      try { await supabaseClient.storage.from(STORE_ASSETS_BUCKET).remove(uploadedPaths); }
      catch (cleanupErr) { console.warn('Não foi possível limpar imagens temporárias:', cleanupErr); }
    }
    await handleCreateError(err);
  } finally {
    isSubmitting = false;
    if (!$('successScreen').classList.contains('on')) resetCreateBtn();
  }
}

let redirectTimer = null;
function startRedirectCountdown(){
  let n = 5;
  const el = $('successCountdown');
  const tick = () => {
    if (el) el.textContent = `Levando você ao painel em ${n}s…`;
    if (n-- <= 0) { window.location.href = '/sellers/main'; return; }
    redirectTimer = setTimeout(tick, 1000);
  };
  tick();
}

/* Chamada SOMENTE depois que o banco confirmou a gravação */
function launchSuccess(store){
  if (store && store.nome_loja) $('successStoreName').textContent = store.nome_loja;
  const screen = $('successScreen');
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
  startRedirectCountdown();
}

window.addEventListener('beforeunload', e => { if (isSubmitting) { e.preventDefault(); e.returnValue = ''; } });
/* ============================================================ KEYBOARD */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeExitConfirm(); togglePreviewSheet(false); }
});

/* ============================================================ INIT */
setPersonType('pf');
updatePreview();

validateStep1();
validateStep2();
