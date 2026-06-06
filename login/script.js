function buttonLink(url) {
  window.location.href = url;
}

// ── 1. INICIALIZAR O SUPABASE ──────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let googleLoginRendered = false;
let googleRegRendered = false;
let googleInitialized = false;

// ── TAB SWITCH ─────────────────────────────────────────────
function showTab(tab){
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('on', isLogin);
  document.getElementById('tabReg').classList.toggle('on', !isLogin);
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formReg').classList.toggle('hidden', isLogin);
  if(isLogin) toggleForgot(false);

  verificarERenderizarBotoes();
}

window.onGoogleLibraryLoad = function () {
  inicializarEConfigurarGoogle();
};

// ── CONFIGURAÇÃO SEGURA DO GOOGLE ───────────────────────────
function inicializarEConfigurarGoogle() {
  if (typeof google !== 'undefined' && google.accounts) {
    
    if (!googleInitialized) {
      google.accounts.id.initialize({
        client_id: "713059185567-mf4f30n7qrmgt474gjhon9ltc2s895rb.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        auto_prompt: false,
        context: "signin"
      });
      googleInitialized = true;
    }

    verificarERenderizarBotoes();
  }
}

function verificarERenderizarBotoes() {
  if (typeof google === 'undefined' || !google.accounts) return;

  const opcoesEstilo = {
    type: "standard",
    size: "large",
    theme: "outline", 
    text: "signin", 
    shape: "rectangular",
    logo_alignment: "left",
    width: "210"
  };

  // Botão de Login
  const elLogin = document.getElementById('google-btn-login');
  const formLoginEscondido = document.getElementById('formLogin').classList.contains('hidden');
  
  if (elLogin && !formLoginEscondido && !googleLoginRendered) {
    google.accounts.id.renderButton(elLogin, opcoesEstilo);
    googleLoginRendered = true;
  }

  // Botão de Cadastro
  const elReg = document.getElementById('google-btn-reg');
  const formRegEscondido = document.getElementById('formReg').classList.contains('hidden');
  
  if (elReg && !formRegEscondido && !googleRegRendered) {
    google.accounts.id.renderButton(elReg, opcoesEstilo);
    googleRegRendered = true;
  }
}

// Monitor de segurança ao carregar a página
window.addEventListener('load', () => {
  inicializarEConfigurarGoogle();
  verificarSessao();
});

// ── RETORNO DO GOOGLE COM SUPABASE ──────────────────────────
async function handleCredentialResponse(response) {
  toast('Autenticando com o Google... 🔐');
  
  const { data, error } = await supabaseClient.auth.signInWithIdToken({
    provider: 'google',
    token: response.credential,
  });

  if (error) {
    console.error(error);
    toast('Erro ao autenticar com o Google.', 'err');
  } else {
    toast(`Bem-vindo, ${data.user.user_metadata.full_name || 'ao Sellerium'}! 🎉`);
    setTimeout(() => window.location.href = '../', 1200);
  }
}

// ── LOGIN COM E-MAIL E SENHA REAL (SUPABASE) ────────────────
async function doLogin(){
  let valid = true;
  const email = document.getElementById('loginEmail');
  const pwd   = document.getElementById('loginPwd');

  if(!validateEmail(email.value.trim())){
    showFieldErr(email,'loginEmailErr'); valid = false;
  }
  if(!pwd.value){
    showFieldErr(pwd,'loginPwdErr'); valid = false;
  }
  if(!valid){ toast('Preencha os campos obrigatórios','err'); return; }

const btn = document.getElementById('btnLogin');
  btn.classList.add('loading');

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email.value.trim(),
    password: pwd.value,
  });

  btn.classList.remove('loading');

  if (error) {
    toast('E-mail ou senha incorretos.', 'err');
  } else {
    toast('Login realizado com sucesso! 🎉');
    setTimeout(() => window.location.href = '../', 1200);
  }
}

// ── CADASTRO COM E-MAIL E SENHA REAL (SUPABASE) ─────────────
async function doRegister(){
  let valid = true;
  const name  = document.getElementById('regName');
  const email = document.getElementById('regEmail');
  const phone = document.getElementById('regPhone');
  const pwd   = document.getElementById('regPwd');
  
  const termsAge = document.getElementById('acceptAge');
  const termsDoc = document.getElementById('acceptTerms');

  if(!name.value.trim()){ showFieldErr(name,'regNameErr'); valid = false; }
  if(!validateEmail(email.value.trim())){ showFieldErr(email,'regEmailErr'); valid = false; }
  
  const phoneValue = phone.value.replace(/\D/g, '');
  if(phoneValue.length < 11){ showFieldErr(phone, 'regPhoneErr'); valid = false; }
  if(pwd.value.length < 8){ showFieldErr(pwd,'regPwdErr'); valid = false; }
  
  if(termsAge && !termsAge.checked){ toast('Precisa de ter 18 anos ou mais','err'); return; }
  if(termsDoc && !termsDoc.checked){ toast('Aceite os termos para continuar','err'); return; }
  
  if(!valid) return;

  const btn = document.getElementById('btnReg');
  btn.classList.add('loading');

  const { data, error } = await supabaseClient.auth.signUp({
    email: email.value.trim(),
    password: pwd.value,
    options: {
      data: {
        full_name: name.value.trim(),
        phone: phoneValue
      }
    }
  });

  btn.classList.remove('loading');

  if (error) {
    console.error(error);
    toast(error.message, 'err');
  } else {
    toast('Conta criada! Verifique o seu e-mail para confirmar o cadastro. 🚀');
  }
}

// ── VERIFICADOR DE SESSÃO ATIVA ─────────────────────────────
async function verificarSessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && window.location.pathname.includes('index.html')) {

    window.location.href = '../';
  }
}

// ── FORGOT PASSWORD ────────────────────────────────────────
function toggleForgot(show){
  document.getElementById('forgotPanel').classList.toggle('on', show);
  document.getElementById('loginMain').style.display = show ? 'none' : 'block';
}

function sendForgot(){
  const v = document.getElementById('forgotEmail').value.trim();
  if(!v || !v.includes('@')){ toast('Digite um e-mail válido','err'); return; }
  
  simulateLoad('btnLogin', () => {
    toast('Link enviado para ' + v + ' ✉️');
    toggleForgot(false);
  });
}

// ── TOGGLE PASSWORD ────────────────────────────────────────
function togglePwd(id, btn){
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

// ── FIELD VALIDATION ───────────────────────────────────────
function showFieldErr(inp, msgId){
  inp.classList.add('err');
  const el = document.getElementById(msgId);
  if(el){ el.style.display = 'block'; }
}
function clearFieldErr(inp){
  inp.classList.remove('err');
  const siblings = inp.parentElement.querySelectorAll('.field-err');
  siblings.forEach(s => s.style.display = 'none');
  if(inp.value.length > 0) inp.classList.add('ok'); else inp.classList.remove('ok');
}
function validateEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

// ── MASKS ──────────────────────────────────────────────────
function maskCPF(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 9) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
  else if(v.length > 6) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
  else if(v.length > 3) v = v.slice(0,3)+'.'+v.slice(3);
  inp.value = v;
}
function maskPhone(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 6) v = '('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
  else if(v.length > 2) v = '('+v.slice(0,2)+') '+v.slice(2);
  inp.value = v;
}

// ── PASSWORD STRENGTH ──────────────────────────────────────
function checkPwd(v){
  const wrap = document.getElementById('pwdStrength');
  wrap.style.display = v ? 'block' : 'none';
  const r1 = v.length >= 8;
  const r2 = /[A-Z]/.test(v);
  const r3 = /[0-9]/.test(v);
  const r4 = /[^A-Za-z0-9]/.test(v);
  document.getElementById('r1').classList.toggle('ok', r1);
  document.getElementById('r2').classList.toggle('ok', r2);
  document.getElementById('r3').classList.toggle('ok', r3);
  document.getElementById('r4').classList.toggle('ok', r4);
  const score = [r1,r2,r3,r4].filter(Boolean).length;
  const bars = ['pb1','pb2','pb3','pb4'];
  const cls = ['s1','s2','s3','s4'];
  const lbls = ['Muito fraca','Fraca','Moderada','Forte'];
  bars.forEach((id,i) => {
    const b = document.getElementById(id);
    b.className = 'pwd-bar ' + (i < score ? cls[score-1] : '');
  });
  const lbl = document.getElementById('pwdLbl');
  lbl.textContent = score ? lbls[score-1] : 'Muito fraca';
  lbl.className = 'pwd-label ' + (score ? cls[score-1] : 's1');
}

// ── SIMULATE LOADING (Mantido para recuperar senha) ────────
function simulateLoad(btnId, cb, delay=1400){
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('loading');
  setTimeout(() => { if(btn) btn.classList.remove('loading'); cb(); }, delay);
}

// ── INICIALIZAÇÃO ASSÍNCRONA DO SDK DO FACEBOOK ─────────────
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "https://connect.facebook.net/pt_BR/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

window.fbAsyncInit = function() {
  if (typeof FB !== 'undefined') {
    FB.init({
      appId      : 'SEU_APP_ID_AQUI', // ⚠️ OBRIGATÓRIO SUBSTITUIR
      cookie     : true,
      xfbml      : true,
      version    : 'v18.0'
    });
  }
};

// ── SOCIAL LOGIN ───────────────────────────────────────────
function socialLogin(prov){
  if (prov === 'Facebook') {
    if (typeof FB === 'undefined') {
      toast('O serviço do Facebook está carregando. Aguarde um instante.', 'err');
      return;
    }
    
    toast('Conectando com Facebook...');
    
    FB.login(function(response) {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        console.log("Token do Facebook recebido com sucesso:", accessToken);
        
        toast('Login com Facebook efetuado! Redirecionando... 🎉');
        setTimeout(() => window.location.href = '../', 1200);
      } else {
        toast('Autenticação cancelada ou recusada.', 'err');
      }
    }, { scope: 'public_profile,email' });
  }
}
  
// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='ok'){
  const t  = document.getElementById('toast1');
  const ic = document.getElementById('toastIco');
  const tx = document.getElementById('toastMsg');
  if(!t || !ic || !tx) return;
  tx.textContent = msg;
  ic.className = 'toast-ico ' + type;
  ic.textContent = type === 'ok' ? '✓' : '!';
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), 3000);
}

// ── KEYBOARD SUBMIT ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter') return;
  const active = document.activeElement;
  if(document.getElementById('formLogin').classList.contains('hidden')) doRegister();
  else doLogin();
});
