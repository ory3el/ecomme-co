/* ── THEME ───────────────────────────────────────────────────────── */
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effectiveTheme(pref) {
  return pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

function updateThemeSwitchUI(pref) {
  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    var isActive = btn.dataset.themeChoice === pref;
    btn.setAttribute('aria-checked', String(isActive));
  });
}

function updateLoginFavicon() {
  const faviconEl = document.getElementById('favicon');
  if (!faviconEl) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  faviconEl.href = isDark ? '/images/favicon.png' : '/images/favicon.png';
}

function applyTheme(pref, opts) {
  opts = opts || {};
  try { localStorage.setItem('ecomme-theme', pref); } catch (e) {}
  var root = document.documentElement;
  if (!opts.silent) root.classList.add('theme-transition');
  root.setAttribute('data-theme', effectiveTheme(pref));
  root.setAttribute('data-theme-pref', pref);
  updateThemeSwitchUI(pref);
  updateLoginFavicon();
  if (!opts.silent) {
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 420);
  }
}

function initTheme() {
  var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
  updateThemeSwitchUI(pref);
  updateLoginFavicon();

  // Live-follow the OS theme while the user's preference is "auto"
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var currentPref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      if (currentPref === 'auto') applyTheme('auto', { silent: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeChoice);
    });
  });
}

// O cliente Supabase é inicializado uma única vez no HTML, antes deste arquivo.
const OAUTH_REDIRECT_PENDING_KEY = 'ecomme_oauth_redirect_pending';

function markOAuthRedirectPending(provider) {
  try { sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, provider || 'social'); }
  catch (error) { console.warn('Não foi possível registrar o redirecionamento OAuth:', error); }
}

function clearOAuthRedirectPending() {
  try { sessionStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY); } catch (error) {}
}

function readOAuthCallbackFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const error = query.get('error_description') || query.get('error') ||
    query.get('error_code') || hash.get('error_description') || hash.get('error');
  const hasCallback = Boolean(
    query.has('code') || query.has('error') || query.has('error_code') ||
    query.has('error_description') || hash.has('access_token') ||
    hash.has('refresh_token') || hash.has('error') || hash.has('error_description')
  );
  return { hasCallback, error };
}

const oauthCallbackInfo = readOAuthCallbackFromUrl();
let oauthReturnPending = false;
try {
  oauthReturnPending = Boolean(
    sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) && oauthCallbackInfo.hasCallback
  );
} catch (error) {}

// Exibe o modal no primeiro carregamento de retorno do provedor, antes de consultar a sessão.
if (oauthReturnPending) {
  showLoadingModal('Concluindo login...', 'Estamos verificando sua conta e preparando seu acesso.');
}

const initialRedirect = new URLSearchParams(window.location.search).get('redirect');
if (initialRedirect) {
  try { localStorage.setItem('ecomme_redirect_url', normalizeInternalRedirect(initialRedirect)); } catch (error) {}
}

// ── NAV ──
function buttonLink(url) {
  window.location.href = url;
}

// ── CAPTCHA COMPARTILHADO (LOGIN + CADASTRO + RECUPERAÇÃO) ─────────
function setAuthCaptchaVisible(visible) {
  const wrap = document.getElementById('authCaptchaWrap');
  if (wrap) wrap.classList.toggle('on', Boolean(visible));
}

function getAuthCaptchaToken() {
  if (typeof hcaptcha === 'undefined' || typeof hcaptcha.getResponse !== 'function') return '';
  try { return hcaptcha.getResponse() || ''; }
  catch (error) {
    console.warn('Não foi possível obter o token do hCaptcha:', error);
    return '';
  }
}

function resetAuthCaptcha() {
  if (typeof hcaptcha === 'undefined' || typeof hcaptcha.reset !== 'function') return;
  try { hcaptcha.reset(); }
  catch (error) { console.warn('Não foi possível resetar o hCaptcha:', error); }
}

// ── TAB SWITCH ─────────────────────────────────────────────
function showTab(tab){
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('on', isLogin);
  document.getElementById('tabReg').classList.toggle('on', !isLogin);
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formReg').classList.toggle('hidden', isLogin);
  // O Supabase pode exigir CAPTCHA também no login por senha.
  setAuthCaptchaVisible(true);
  if(isLogin) toggleForgot(false);
}

// ── GOOGLE SIGN-IN ───────────────────────────────────────────
const GOOGLE_CLIENT_ID = '394176278495-nrt3cm60njrv670sjue1idhatqfrjlea.apps.googleusercontent.com';
let googleCredentialPending = null;
let googleAccountPending = null;
let googleModalResolver = null;

// -------------------------------

let currentNonce = '';
function generateNonce() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, c => c.toString(16).padStart(2, '0')).join('');
}

// -------------------------------

let googleReady = false;
let isInitializingGoogle = false;

async function initGoogleIdentity() {
  if (
    typeof google === 'undefined' ||
    !google.accounts ||
    !google.accounts.id
  ) {
    return false;
  }
  if (googleReady) return true;
  if (isInitializingGoogle) return false;
  
  isInitializingGoogle = true;

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      use_fedcm_for_prompt: true
    });
    
    googleReady = true;
    return true;
  } finally {
    isInitializingGoogle = false;
  }
}

// -------------------------------

const selectWait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function startGoogleLogin() {
  try {
    let ready = await initGoogleIdentity();
    if (!ready) ready = await waitForGoogleIdentity();
    if (!ready) {
      toast('Não foi possível carregar o login do Google. Tente novamente.', 'err');
      return false;
    }

    google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        const reason = notification.getNotDisplayedReason?.() || notification.getSkippedReason?.();
        console.warn('One Tap não exibido pelo motivo:', reason);
      }
    });
    return true;
  } catch (error) {
    console.error('Erro ao iniciar o login do Google:', error);
    toast('Não foi possível iniciar o login do Google.', 'err');
    return false;
  }
}

// ---------------------------------------

function triggerGooglePopupFallback() {
  markOAuthRedirectPending('google');
  showLoadingModal('Redirecionando...', 'Conectando sua conta Google com segurança.');
  supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname + window.location.search,
      queryParams: {
        prompt: 'select_account'
      }
    }
  }).then(({ error }) => {
    if (error) throw error;
  }).catch(error => {
    clearOAuthRedirectPending();
    hideLoadingModal();
    console.error('Erro no redirecionamento Google:', error);
    toast('Não foi possível conectar com o Google.', 'err');
  });
}

// -------------------------------

async function waitForGoogleIdentity(maxAttempts = 100, interval = 100) {
  for (let tries = 0; tries < maxAttempts; tries++) {
    if (
      typeof google !== 'undefined' &&
      google.accounts?.id
    ) {
      const ready = await initGoogleIdentity();
      if (ready) return true;
    }
    await selectWait(interval);
  }
  return false;
}

// ------------------------------------------------

async function handleGoogleCredential(response) {
  if (!response?.credential) {
    toast('Não foi possível obter a conta do Google.', 'err');
    return;
  }
  try {
    hideLoadingModal();
    showLoadingModal('Verificando conta...', 'Estamos verificando sua conta do Google');
    const result = await verifyGoogleAccount(response.credential);
    hideLoadingModal();
    if (!result) return;
    if (result.exists) {
      await loginExistingGoogleAccount(
        response.credential
      );
      return;
    }

    googleCredentialPending = response.credential;
    googleAccountPending = result.account;
    await showGoogleAccountConfirmation(
      result.account
    );

  } catch (error) {
    console.error('Erro no Google Login:', error);
    hideLoadingModal();
    toast(error.message || 'Não foi possível verificar a conta do Google.', 'err');
  }
}

// ------------------------------------------------

async function verifyGoogleAccount(credential) {
  const {
    data,
    error
  } = await supabaseClient.functions.invoke('google-account-check',
    {
      body: {
        credential
      }
    }
  );

  if (error) {
    console.error('Erro ao verificar Google:', error);
    let message = error.message;
    if (error.context) {
      try {
        const body = await error.context.json();
        console.error('Resposta da Edge Function:', body
        );
        message = body?.error || body?.message || message;
      } catch {}

    }
    throw new Error(message);
  }
  if (!data?.success) {
    throw new Error(data?.error || 'Não foi possível verificar a conta.');
  }
  return data;
}

// ----------------------------------------------

function showGoogleAccountConfirmation(account) {
  createGoogleConfirmModal();
  const overlay = document.getElementById('googleConfirmOverlay');
  const avatar = document.getElementById('googleConfirmAvatar');
  const name = document.getElementById('googleConfirmName');
  const surname = document.getElementById('googleConfirmSurname');
  const email = document.getElementById('googleConfirmEmail');
  const phone = document.getElementById('googleConfirmPhone');
  const birth = document.getElementById('googleConfirmBirth');
  const gender = document.getElementById('googleConfirmGender');
  account = account || {};
  avatar.src = account.picture || '/images/icons/full/user.webp';
  name.value = account.given_name || '';
  surname.value = account.family_name || '';
  email.value = account.email || '';
  phone.value = account.phone_number || '';
  birth.value = '';
  gender.value = '';
  overlay.classList.add('active');
  return new Promise(resolve => {
    googleModalResolver = resolve;
  });
}

// ------------------------------------------------

function createGoogleConfirmModal() {
  if (document.getElementById('googleConfirmOverlay')
  ) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'googleConfirmOverlay';
  overlay.className = 'google-confirm-overlay';
  overlay.innerHTML = `
    <div class="google-confirm-modal">
      <div class="google-confirm-head">
        <div class="google-confirm-avatar">
          <img
            id="googleConfirmAvatar"
            src="/images/icons/full/user.webp"
            alt="Foto da conta Google"
          >
        </div>
        <h3>
          Confirme sua conta
        </h3>
        <p>
          Verifique os dados da conta Google
          antes de criar sua conta na Ecomme.
        </p>
      </div>
      <div class="google-confirm-grid">
        <div class="google-confirm-field">
          <label>
            Nome
            <span class="google-confirm-required">*</span>
          </label>
          <input
            id="googleConfirmName"
            class="google-confirm-input"
            type="text"
            maxlength="100"
            autocomplete="given-name"
          >
        </div>
        <div class="google-confirm-field">
          <label>
            Sobrenome
          </label>
          <input
            id="googleConfirmSurname"
            class="google-confirm-input"
            type="text"
            maxlength="100"
            autocomplete="family-name"
          >
        </div>
        <div class="google-confirm-field full">
          <label>
            E-mail
          </label>
          <input
            id="googleConfirmEmail"
            class="google-confirm-input"
            type="email"
            readonly
            tabindex="-1"
          >
        </div>
        <div class="google-confirm-field full">
          <label>
            Telefone
          </label>
          <input
            id="googleConfirmPhone"
            class="google-confirm-input"
            type="tel"
            placeholder="(00) 00000-0000"
            maxlength="15"
            oninput="maskPhone(this)"
          >
        </div>
        <div class="google-confirm-field">
          <label>
            Data de nascimento
          </label>
          <input
            id="googleConfirmBirth"
            class="google-confirm-input"
            type="date"
          >

        </div>
        <div class="google-confirm-field">
          <label>
            Gênero
          </label>
          <select
            id="googleConfirmGender"
            class="google-confirm-input"
          >
            <option value="">
              Prefiro não informar
            </option>
            <option value="Masculino">
              Masculino
            </option>
            <option value="Feminino">
              Feminino
            </option>
            <option value="Outro">
              Outro
            </option>
          </select>
        </div>
      </div>
      <div class="google-confirm-actions">
        <button
          type="button"
          class="google-confirm-btn google-confirm-cancel"
          onclick="cancelGoogleAccountCreation()"
        >
          Cancelar
        </button>
        
        <button
          type="button"
          id="googleConfirmContinue"
          class="google-confirm-btn google-confirm-continue"
          onclick="confirmGoogleAccountCreation()"
        >
          Continuar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// --------------------------------------

function cancelGoogleAccountCreation() {
  googleCredentialPending = null;
  googleAccountPending = null;
  sessionStorage.removeItem('ecomme_google_signup_pending');
  const overlay = document.getElementById('googleConfirmOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  if (googleModalResolver) {
    googleModalResolver(false);
    googleModalResolver = null;
  }
}

// -----------------------------------------------

async function confirmGoogleAccountCreation() {
  if (!googleCredentialPending) {
    toast('A sessão do Google expirou. Tente novamente.', 'err'
    );
    return;
  }
  const nameInput = document.getElementById('googleConfirmName');
  const surnameInput = document.getElementById('googleConfirmSurname');
  const phoneInput = document.getElementById('googleConfirmPhone');
  const birthInput = document.getElementById('googleConfirmBirth');
  const genderInput = document.getElementById('googleConfirmGender');
  const btn = document.getElementById('googleConfirmContinue');
  const name = nameInput.value.trim();
  const surname = surnameInput.value.trim();
  const phone = phoneInput.value.replace(/\D/g, '');
  const birthDate = birthInput.value || null;
  const gender = genderInput.value || null;
  if (!name) {
    nameInput.focus();
    toast('Digite seu nome para continuar.', 'err');
    return;
  }

  btn.classList.add('loading');
  btn.textContent = 'Criando conta...';

  try {
    sessionStorage.setItem('ecomme_google_signup_pending', '1');
    const { data, error } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token: googleCredentialPending
    });
    
    if (error) {
      throw error;
    }
    if (!data?.user) {
      throw new Error('Não foi possível criar sua conta.');
    }
    const fullName = `${name} ${surname}`.trim();

    console.log('Dados que serão salvos no perfil:', {
      userId: data.user.id,
      full_name: fullName,
      phone: phone || null,
      birth_date: birthDate,
      gender: gender
    });
    
    const { error: profileError } =
      await supabaseClient
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          birth_date: birthDate,
          gender: gender
        })
        .eq('id', data.user.id);

    if (profileError) {
      console.error('Erro real ao salvar profiles:', profileError);
      throw new Error(`A conta foi criada, mas os dados não foram salvos: ${profileError.message}`);
    }
    
    googleCredentialPending = null;
    googleAccountPending = null;

    const overlay = document.getElementById('googleConfirmOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }

    if (googleModalResolver) {
      googleModalResolver(true);
      googleModalResolver = null;
    }

    sessionStorage.removeItem('ecomme_google_signup_pending');
    sessionStorage.removeItem('remote_logout_notice_shown');
    toast('Conta criada com sucesso!', 'ok');
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData?.session) {
      setTimeout(() => processAuthenticatedSession('SIGNED_IN', sessionData.session), 0);
    } else {
      setTimeout(() => { window.location.href = getTargetUrl(); }, 1000);
    }
  } catch (error) {
    sessionStorage.removeItem('ecomme_google_signup_pending');
    console.error('Erro ao criar conta Google:', error);
    toast(error.message || 'Não foi possível criar a conta.', 'err');
    btn.classList.remove('loading');
    btn.textContent = 'Continuar';
  }
}

// ---------------------------------------

async function loginExistingGoogleAccount(credential, account) {
  hideLoadingModal();
  showLoadingModal('Entrando...', 'Verificando sua conta');
  try {
    sessionStorage.setItem('ecomme_google_onetap_login', '1');
    const { data, error } = await supabaseClient.auth.signInWithIdToken({
      provider: 'google',
      token: credential
    });

    if (!error && data?.session) return;
    sessionStorage.removeItem('ecomme_google_onetap_login');
    
    console.error('Erro no signInWithIdToken:', error);
    if (
      error &&
      (
        error.code === 'user_already_exists' ||
        error.code === 'email_exists' ||
        error.message ?.toLowerCase().includes('already exists')
      )
    ) {
      markOAuthRedirectPending('google');
      showLoadingModal('Redirecionando...', 'Conectando sua conta Google com segurança.');
      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({provider: 'google', options: {
        redirectTo: window.location.origin + window.location.pathname + window.location.search,
        queryParams: {login_hint: account?.email || ''}
        }
      });
      if (oauthError) {
        clearOAuthRedirectPending();
        throw oauthError;
      }
      return;
    }
    throw error;
  } catch (error) {
    clearOAuthRedirectPending();
    hideLoadingModal();
    console.error('Erro no login Google:', error);

    let message = error?.message || 'Não foi possível entrar com o Google.';
    if (error?.code === 'identity_already_exists') {
      message = 'Essa conta Google já está vinculada a outro usuário Ecomme.';
    }
    else if (error?.code === 'email_not_confirmed') {
      message = 'O e-mail dessa conta ainda não foi confirmado.';
    }
    else if (error?.code === 'user_already_exists') {
      message = 'Já existe uma conta Ecomme com esse e-mail.';
    }
    toast(message, 'err');
  }
}

// ── SOCIAL LOGIN (GOOGLE & FACEBOOK - SUPABASE) ──────────
async function socialLogin(provider) {
  if (!['google', 'facebook'].includes(provider)) {
    toast('Provedor de login inválido.', 'err');
    return;
  }

  toast(`Redirecionando para o ${provider}...`, 'info');
  showLoadingModal('Redirecionando...', `Carregando o login com o ${provider}`);

  const options = {
    redirectTo: window.location.origin + window.location.pathname + window.location.search
  };
  if (provider === 'google') options.queryParams = { prompt: 'select_account' };

  try {
    markOAuthRedirectPending(provider);
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider, options });
    if (error) throw error;
  } catch (error) {
    clearOAuthRedirectPending();
    console.error('Erro no login social:', error);
    hideLoadingModal();
    toast(`Erro ao conectar com ${provider}.`, 'err');
  }
}

// ── PAUSED ACCOUNT ─────────────────────────────────────────────
let pausedAccountModalOpen = false;
let pausedAccountChecking = false;

function createPausedAccountModal() {
  if (document.getElementById('pausedAccountOverlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'pausedAccountOverlay';
  overlay.className = 'paused-account-overlay';
  overlay.innerHTML = `
    <div class="paused-account-modal">
      <div class="paused-account-icon">
        <i class="fa-solid fa-pause"></i>
      </div>
      <h3>Conta pausada</h3>
      <p>
        Sua conta atualmente está desativada.
        Deseja reativá-la agora para continuar
        acessando sua conta?
      </p>
      <div class="paused-account-actions">

        <button
          type="button"
          class="paused-account-btn secondary"
          id="btnKeepPaused"
          onclick="keepAccountPaused()"
        >
          Manter desativada
        </button>

        <button
          type="button"
          class="paused-account-btn primary"
          id="btnReactivateAccount"
          onclick="reactivateAccount()"
        >
          Reativar conta
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showPausedAccountModal() {
  createPausedAccountModal();
  const overlay = document.getElementById('pausedAccountOverlay');
  if (!overlay) {
    return Promise.resolve(false);
  }
  pausedAccountModalOpen = true;
  overlay.classList.add('active');
  return new Promise(resolve => {
    overlay._resolveDecision = resolve;
  });
}

function closePausedAccountModal() {
  const overlay = document.getElementById('pausedAccountOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  pausedAccountModalOpen = false;
}

async function keepAccountPaused() {
  const overlay = document.getElementById('pausedAccountOverlay');
  const resolve = overlay?._resolveDecision;
  closePausedAccountModal();
  if (resolve) {
    overlay._resolveDecision = null;
    resolve(false);
  }
}

async function reactivateAccount() {
  if (pausedAccountChecking) return;
  pausedAccountChecking = true;
  const btn = document.getElementById('btnReactivateAccount');
  const otherBtn = document.getElementById('btnKeepPaused');

  if (btn) {
    btn.classList.add('loading');
    btn.textContent = 'Reativando...';
  }
  if (otherBtn) {
    otherBtn.disabled = true;
  }

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();
    if (sessionError || !session?.user?.id) {
      throw new Error( 'Sua sessão expirou. Faça login novamente.');
    }

    const { error } =
      await supabaseClient
        .from('profiles')
        .update({
          account_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

    if (error) {
      console.error('Erro ao reativar conta:', error
      );
      throw new Error('Não foi possível reativar sua conta.'
      );
    }

    const overlay = document.getElementById('pausedAccountOverlay');
    const resolve = overlay?._resolveDecision;
    closePausedAccountModal();
    if (resolve) {
      overlay._resolveDecision = null;
      resolve(true);
    }
    pausedAccountChecking = false;
  } catch (error) {
    console.error('Erro ao reativar conta:', error);
    toast(error.message || 'Não foi possível reativar sua conta.', 'err');

    if (btn) {
      btn.classList.remove('loading');
      btn.textContent = 'Reativar conta';
    }
    if (otherBtn) {
      otherBtn.disabled = false;
    }
    pausedAccountChecking = false;
    return false;
  }
}


async function checkPausedAccount(user) {
  if (!user?.id) {
    return false;
  }
  try {
    const {
      data: profile,
      error
    } = await supabaseClient
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar status da conta:', error);
      toast('Não foi possível verificar o status da sua conta. Tente novamente.', 'err');
      return false;
    }
    const status = profile?.account_status || 'active';
    if (status !== 'paused') {
      return true;
    }

    const shouldReactivate = await showPausedAccountModal();
    if (!shouldReactivate) {
      await supabaseClient.auth.signOut({
        scope: 'local'
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao verificar conta pausada:', error);
    toast('Não foi possível verificar o status da sua conta.', 'err');
    return false;
  }
}

// ── LOGIN E-MAIL & PWD (SUPABASE) ────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail');
  const pwd = document.getElementById('loginPwd');
  let valid = true;

  if (!validateEmail(email.value.trim())) {
    showFieldErr(email, 'loginEmailErr');
    valid = false;
  }
  if (!pwd.value) {
    showFieldErr(pwd, 'loginPwdErr');
    valid = false;
  }
  if (!valid) {
    toast('Preencha os campos obrigatórios.', 'err');
    return;
  }

  if (typeof hcaptcha === 'undefined' || typeof hcaptcha.getResponse !== 'function') {
    toast('A verificação de segurança ainda está carregando. Tente novamente.', 'err');
    return;
  }
  const captchaToken = getAuthCaptchaToken();
  if (!captchaToken) {
    toast('Confirme a verificação de segurança antes de entrar.', 'err');
    return;
  }

  const btn = document.getElementById('btnLogin');
  btn.classList.add('loading');
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.value.trim().toLowerCase(),
      password: pwd.value,
      options: { captchaToken }
    });
    if (error) throw error;
  } catch (error) {
    console.error('Erro no login:', error);
    const code = String(error.code || '').toLowerCase();
    const message = String(error.message || '').toLowerCase();

    if (code.includes('captcha') || message.includes('captcha')) {
      toast('A verificação de segurança falhou. Resolva o hCaptcha e tente novamente.', 'err');
    } else if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      toast('Confirme seu e-mail pelo link enviado antes de entrar. Verifique também a caixa de spam.', 'err');
    } else if (code === 'invalid_credentials' || code === 'invalid_grant' || message.includes('invalid login credentials')) {
      toast('E-mail ou senha incorretos.', 'err');
    } else {
      toast(error.message || 'Não foi possível entrar. Tente novamente.', 'err');
    }
  } finally {
    resetAuthCaptcha();
    btn.classList.remove('loading');
  }
}

// ── REGISTER E-MAIL & PWD (SUPABASE) ─────────────
async function doRegister() {
  let valid = true;
  const name = document.getElementById('regName');
  const surname = document.getElementById('regSob');
  const email = document.getElementById('regEmail');
  const phone = document.getElementById('regPhone');
  const password = document.getElementById('regPwd');
  const acceptAge = document.getElementById('acceptAge');
  const acceptTerms = document.getElementById('acceptTerms');

  if (!name.value.trim()) {
    showFieldErr(name, 'regNameErr');
    valid = false;
  }
  if (!validateEmail(email.value.trim())) {
    showFieldErr(email, 'regEmailErr');
    valid = false;
  }

  const phoneValue = phone.value.replace(/\D/g, '');
  if (phoneValue.length !== 11) {
    showFieldErr(phone, 'regPhoneErr');
    valid = false;
  }

  const passwordRules = [
    password.value.length >= 8,
    /[A-Z]/.test(password.value),
    /[0-9]/.test(password.value),
    /[^A-Za-z0-9]/.test(password.value)
  ];
  if (!passwordRules.every(Boolean)) {
    showFieldErr(password, 'regPwdErr');
    valid = false;
  }

  if (!valid) {
    toast('Revise os campos destacados antes de continuar.', 'err');
    return;
  }
  if (!acceptAge.checked) {
    toast('É necessário confirmar que você tem 18 anos ou mais.', 'err');
    return;
  }
  if (!acceptTerms.checked) {
    toast('Aceite os Termos de Uso e a Política de Privacidade para continuar.', 'err');
    return;
  }
  if (typeof hcaptcha === 'undefined' || typeof hcaptcha.getResponse !== 'function') {
    toast('A verificação de segurança ainda está carregando. Tente novamente.', 'err');
    return;
  }

  const captchaToken = getAuthCaptchaToken();
  if (!captchaToken) {
    toast('Confirme a verificação de segurança antes de criar sua conta.', 'err');
    return;
  }

  const btn = document.getElementById('btnReg');
  btn.classList.add('loading');
  const fullName = `${name.value.trim()} ${surname.value.trim()}`.trim();
  try {
    const { error } = await supabaseClient.auth.signUp({
      email: email.value.trim().toLowerCase(),
      password: password.value,
      options: {
        captchaToken,
        data: {
          full_name: fullName,
          phone: phoneValue
        }
      }
    });
    if (error) throw error;
    sessionStorage.removeItem('remote_logout_notice_shown');
    toast('Conta criada! Verifique o seu e-mail para confirmar o cadastro. 🚀', 'ok');
  } catch (error) {
    console.error('Erro no cadastro:', error);
    toast(error.message || 'Não foi possível criar sua conta.', 'err');
  } finally {
    resetAuthCaptcha();
    btn.classList.remove('loading');
  }
}

// ── LOCK VARIABLE ──
let redirectionInProgress = false;

// ── DEVICE REGISTER ──────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "Desconhecido";
  let os = "Desconhecido";

  // Browser
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/Chrome\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
    browser = "Safari";
  }

  // OS
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  return { browser, os };
}

async function registerNewSession(userId) {
  if (!userId) return;

  let localSessionId = null;
  try { localSessionId = localStorage.getItem('local_session_id'); } catch (error) {}

  if (localSessionId) {
    const { data: existingSession, error } = await supabaseClient
      .from('user_sessions')
      .select('id')
      .eq('id', localSessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!existingSession || error) {
      try { localStorage.removeItem('local_session_id'); } catch (storageError) {}
      localSessionId = null;
    }
  }

  const { browser, os } = getDeviceInfo();
  let ip = 'Desconhecido';
  let ipTimeoutId = null;
  try {
    const controller = new AbortController();
    ipTimeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    if (response.ok) {
      const result = await response.json();
      ip = result.ip || ip;
    }
  } catch (error) {
    console.warn('Não foi possível capturar o IP da sessão.');
  } finally {
    if (ipTimeoutId) clearTimeout(ipTimeoutId);
  }

  const sessionData = {
    browser,
    os,
    ip_address: ip,
    last_seen_at: new Date().toISOString()
  };

  if (localSessionId) {
    const { error } = await supabaseClient
      .from('user_sessions')
      .update(sessionData)
      .eq('id', localSessionId)
      .eq('user_id', userId);
    if (!error) return;
    console.error('Erro ao atualizar sessão; uma nova será criada:', error);
    try { localStorage.removeItem('local_session_id'); } catch (storageError) {}
  }

  const { data, error } = await supabaseClient
    .from('user_sessions')
    .insert([{ user_id: userId, ...sessionData }])
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao salvar sessão:', error.message);
    return;
  }
  if (data?.id) {
    try { localStorage.setItem('local_session_id', data.id); } catch (storageError) {}
  }
}

// ── ACTIVE SESSION & URL CLEAR ───────────────────────────────────────
async function processAuthenticatedSession(event, session) {
  if (!session?.user?.id || redirectionInProgress) return;
  if (sessionStorage.getItem('ecomme_google_signup_pending') === '1') return;

  const isOAuthCallback = oauthReturnPending && Boolean(sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY));
  if (isOAuthCallback) {
    showLoadingModal('Verificando conta...', 'Estamos finalizando sua autenticação com segurança.');
  }

  redirectionInProgress = true;
  try {
    const canContinue = await checkPausedAccount(session.user);
    if (!canContinue) {
      redirectionInProgress = false;
      if (isOAuthCallback) clearOAuthRedirectPending();
      document.getElementById('btnLogin')?.classList.remove('loading');
      hideLoadingModal();
      return;
    }

    sessionStorage.removeItem('remote_logout_notice_shown');
    try {
      await Promise.race([
        registerNewSession(session.user.id),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);
    } catch (error) {
      console.error('Não foi possível registrar a sessão:', error);
    }

    const finalDestination = getTargetUrl();
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    try { localStorage.removeItem('ecomme_redirect_url'); } catch (storageError) {}

    const isGoogleOneTapLogin = event === 'SIGNED_IN' &&
      sessionStorage.getItem('ecomme_google_onetap_login') === '1';
    if (isGoogleOneTapLogin) {
      sessionStorage.removeItem('ecomme_google_onetap_login');
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
      if (currentPath !== '/login') {
        window.location.reload();
        return;
      }
    }

    if (document.getElementById('formLogin')) {
      if (isOAuthCallback) {
        clearOAuthRedirectPending();
        showLoadingModal('Tudo pronto!', 'Login realizado. Redirecionando para a Ecomme...');
        setTimeout(() => { window.location.href = finalDestination; }, 500);
      } else {
        requestAnimationFrame(() => setTimeout(hideLoadingModal, 180));
        toast('Sessão ativa! Redirecionando...', 'ok');
        setTimeout(() => { window.location.href = finalDestination; }, 900);
      }
    }
  } catch (error) {
    console.error('Erro após autenticação:', error);
    redirectionInProgress = false;
    if (isOAuthCallback) clearOAuthRedirectPending();
    hideLoadingModal();
    toast('Não foi possível concluir o login. Tente novamente.', 'err');
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    showPasswordRecoveryPanel();
    return;
  }

  if (oauthReturnPending && event === 'INITIAL_SESSION' && !session) {
    let provider = 'Google';
    try {
      if (sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) === 'facebook') provider = 'Facebook';
    } catch (error) {}
    clearOAuthRedirectPending();
    hideLoadingModal();
    const message = oauthCallbackInfo.error
      ? `${provider} não autorizou o acesso. Tente novamente.`
      : `Não foi possível concluir o login com ${provider}. Tente novamente.`;
    toast(message, 'err');
    return;
  }

  if (!session || !['SIGNED_IN', 'INITIAL_SESSION'].includes(event)) return;
  if (sessionStorage.getItem('ecomme_google_signup_pending') === '1') return;
  // Supabase recomenda não executar consultas assíncronas no callback do auth.
  setTimeout(() => { processAuthenticatedSession(event, session); }, 0);
});

// ── FORGOT PASSWORD / PASSWORD RECOVERY ─────────────────────────────
function toggleForgot(show) {
  const forgotPanel = document.getElementById('forgotPanel');
  const recoveryPanel = document.getElementById('recoveryPanel');
  forgotPanel.classList.toggle('on', show);
  if (recoveryPanel) recoveryPanel.classList.remove('on');
  document.getElementById('loginMain').style.display = show ? 'none' : 'block';
  // Tanto o formulário principal quanto a recuperação exigem CAPTCHA.
  setAuthCaptchaVisible(true);
  if (!show) resetAuthCaptcha();
}

function showPasswordRecoveryPanel() {
  const forgotPanel = document.getElementById('forgotPanel');
  const recoveryPanel = document.getElementById('recoveryPanel');
  const loginMain = document.getElementById('loginMain');
  if (!recoveryPanel) return;
  forgotPanel?.classList.remove('on');
  loginMain.style.display = 'none';
  recoveryPanel.classList.add('on');
  setAuthCaptchaVisible(false);
  resetAuthCaptcha();
  document.getElementById('recoveryPassword')?.focus();
}

async function sendForgot() {
  const emailInput = document.getElementById('forgotEmail');
  const email = emailInput.value.trim().toLowerCase();
  const btn = document.getElementById('btnForgot');
  if (!validateEmail(email)) {
    toast('Digite um e-mail válido.', 'err');
    emailInput.focus();
    return;
  }

  if (typeof hcaptcha === 'undefined' || typeof hcaptcha.getResponse !== 'function') {
    toast('A verificação de segurança ainda está carregando. Tente novamente.', 'err');
    return;
  }
  const captchaToken = getAuthCaptchaToken();
  if (!captchaToken) {
    toast('Confirme a verificação de segurança antes de solicitar a recuperação.', 'err');
    return;
  }

  btn.classList.add('loading');
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?recovery=1`,
      captchaToken
    });
    if (error) throw error;
    toast('Se houver uma conta com esse e-mail, enviaremos um link de recuperação.', 'ok');
    toggleForgot(false);
  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha:', error);
    toast(error.message || 'Não foi possível enviar o link. Tente novamente.', 'err');
  } finally {
    resetAuthCaptcha();
    btn.classList.remove('loading');
  }
}

async function submitPasswordRecovery() {
  const passwordInput = document.getElementById('recoveryPassword');
  const confirmInput = document.getElementById('recoveryPasswordConfirm');
  const btn = document.getElementById('btnRecovery');
  const password = passwordInput.value;

  const strong = password.length >= 8 && /[A-Z]/.test(password) &&
    /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
  if (!strong) {
    toast('Use 8+ caracteres, letra maiúscula, número e caractere especial.', 'err');
    passwordInput.focus();
    return;
  }
  if (password !== confirmInput.value) {
    toast('As senhas não coincidem.', 'err');
    confirmInput.focus();
    return;
  }

  btn.classList.add('loading');
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    const destination = getTargetUrl();
    try { localStorage.removeItem('ecomme_redirect_url'); } catch (storageError) {}
    window.history.replaceState({}, document.title, window.location.pathname);
    toast('Senha atualizada com sucesso!', 'ok');
    setTimeout(() => { window.location.href = destination; }, 900);
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    toast(error.message || 'Não foi possível atualizar a senha. Solicite um novo link.', 'err');
    btn.classList.remove('loading');
  }
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
function clearFieldErr(inp) {
  inp.classList.remove('err');
  const fieldError = document.getElementById(`${inp.id}Err`);
  if (fieldError) fieldError.style.display = 'none';
  if (inp.value.length > 0) inp.classList.add('ok');
  else inp.classList.remove('ok');
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
function maskPhone(inp) {
  const digits = inp.value.replace(/\D/g, '').slice(0, 11);
  let formatted = digits;
  if (digits.length > 6) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  else if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  inp.value = formatted;

  if (digits.length === 11) {
    inp.classList.remove('err');
    const fieldError = document.getElementById(`${inp.id}Err`);
    if (fieldError) fieldError.style.display = 'none';
  }
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

  const passwordInput = document.getElementById('regPwd');
  const passwordError = document.getElementById('regPwdErr');
  if (score === 4) {
    passwordInput.classList.remove('err');
    if (passwordError) passwordError.style.display = 'none';
  }
}


// TOAST
function showToast(msg, type) {
  const t = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = t?.querySelector('.toast-icon');
  if (!t) return;
  if (toastMsg) toastMsg.textContent = msg;
  if (toastIcon) {
    toastIcon.className = `toast-icon ${type}`;
    toastIcon.innerHTML = type === 'ok' ? '<i class="fa-solid fa-check"></i>' : type === 'err' ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-info"></i>';
  }
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.classList.remove('show');
  }, 5000);
}

function toast(msg, type) {
  showToast(msg, type);
}

// ── KEYBOARD SUBMIT ─────────────────────────────────────────────────
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  const active = document.activeElement;
  if (active?.tagName === 'BUTTON') return;

  const recoveryPanel = document.getElementById('recoveryPanel');
  const forgotPanel = document.getElementById('forgotPanel');
  const isRegister = !document.getElementById('formReg').classList.contains('hidden');
  if (recoveryPanel?.classList.contains('on')) {
    event.preventDefault();
    submitPasswordRecovery();
  } else if (forgotPanel.classList.contains('on')) {
    event.preventDefault();
    sendForgot();
  } else if (isRegister) {
    event.preventDefault();
    doRegister();
  } else {
    event.preventDefault();
    doLogin();
  }
});

// ── REDIRECT FUNCTION ───────────────────────────────────────────────
function normalizeInternalRedirect(value) {
  if (typeof value !== 'string' || !value.trim()) return '/';
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return '/';
    if (url.pathname.startsWith('//') || url.pathname.startsWith('/\\')) return '/';
    if (url.pathname.replace(/\/+$/, '') === '/login') return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return '/';
  }
}

function getTargetUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlRedirect = urlParams.get('redirect');
  if (urlRedirect) return normalizeInternalRedirect(urlRedirect);
  let storedRedirect = null;
  try { storedRedirect = localStorage.getItem('ecomme_redirect_url'); } catch (error) {}
  return storedRedirect ? normalizeInternalRedirect(storedRedirect) : '/';
}

// LOGOUT
/*const waitt = ms => new Promise(resolve => setTimeout(resolve, ms));
async function doLogout() {
  toast('Saindo da conta... 👋', 'info');
  const localSessionId = localStorage.getItem('local_session_id');
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (localSessionId && user) {
      const { error } = await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('id', localSessionId)
        .eq('user_id', user.id);
      if (error) console.error('Erro ao remover sessão do banco:', error);
    }
    sessionStorage.setItem('remote_logout_notice_shown', 'true');
    localStorage.removeItem('local_session_id');
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) throw error;
    toast('Você saiu da conta.', 'info');
    await waitt(700);
    window.location.reload();
  } catch (error) {
    console.error('Erro ao sair da conta:', error);
    toast(error.message || 'Não foi possível sair da conta.', 'err');
  }
}*/

  
/* ----------------------------------------------------- */
function openConfirmLogout() {
  closeAcc();
  showConfirmRed('Tem certeza que quer sair? <br>Suas informações não serão perdidas.', 'Sair da Conta', '<i class="fa-solid fa-right-from-bracket"></i>');
}

window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initThemeToggle();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('recovery') === '1') {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (session) {
      showPasswordRecoveryPanel();
    } else {
      if (sessionError) console.warn('Não foi possível validar o link de recuperação:', sessionError);
      toast('O link de recuperação é inválido ou expirou. Solicite um novo link.', 'err');
      toggleForgot(true);
    }
    return;
  }

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) console.warn('Não foi possível consultar a sessão atual:', error);
  if (!user && !oauthReturnPending) await startGoogleLogin();
});


function injectLoginModalStyles() {
  if (document.getElementById('modal-aboutAcc-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-aboutAcc-styles';
  style.textContent = `

  /* ── MODAL PAUSED ACCOUNT ───────────────────────────────────── */
  .paused-account-overlay {
    position: fixed;
    inset: 0;
    z-index: 500000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  
    background: rgba(15, 23, 42, 0.28);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  
    opacity: 0;
    pointer-events: none;
    transition: opacity .28s ease;
  }
  
  .paused-account-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }
  
  .paused-account-modal {
    width: min(440px, 100%);
    background: var(--white);
    border: 1px solid rgba(37, 99, 235, .12);
    border-radius: 28px;
    padding: 30px;
  
    box-shadow:
      0 30px 80px rgba(15, 23, 42, .20),
      0 0 0 1px rgba(37, 99, 235, .05);
  
    transform: translateY(18px) scale(.96);
    transition: transform .28s cubic-bezier(.4,0,.2,1);
  }
  
  .paused-account-overlay.active .paused-account-modal {
    transform: translateY(0) scale(1);
  }
  
  .paused-account-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 18px;
  
    display: flex;
    align-items: center;
    justify-content: center;
  
    border-radius: 20px;
    background: rgba(37, 99, 235, .08);
    color: var(--blue);
    font-size: 29px;
  }
  
  .paused-account-modal h3 {
    margin: 0 0 10px;
    text-align: center;
  
    font-family: 'Sora', sans-serif;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -.3px;
    color: var(--text);
  }
  
  .paused-account-modal p {
    margin: 0 auto 24px;
    max-width: 350px;
  
    text-align: center;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--muted);
  }
  
  .paused-account-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .paused-account-btn {
    min-height: 46px;
    border: none;
    border-radius: 100px;
    padding: 0 18px;
  
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
  
    cursor: pointer;
    transition:
      transform .2s ease,
      background .2s ease,
      box-shadow .2s ease,
      opacity .2s ease;
  }
  
  .paused-account-btn:hover {
    transform: translateY(-1px);
  }
  
  .paused-account-btn:active {
    transform: translateY(0);
  }
  
  .paused-account-btn.primary {
    background: #2563eb;
    color: #fff;
    box-shadow: 0 8px 22px rgba(37,99,235,.22);
  }
  
  .paused-account-btn.primary:hover {
    background: #1d4ed8;
  }
  
  .paused-account-btn.secondary {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
  
  .paused-account-btn.secondary:hover {
    background: var(--bg3);
  }
  
  .paused-account-btn.loading {
    pointer-events: none;
    opacity: .65;
  }
  
  @media (max-width: 500px) {
    .paused-account-modal {
      border-radius: 24px;
      padding: 24px 20px;
    }
  
    .paused-account-actions {
      grid-template-columns: 1fr;
    }
  }
  
  /* ── GOOGLE ACCOUNT CONFIRM MODAL ───────────────────────── */
  .google-confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, .30);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .28s ease;
  }
  .google-confirm-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }
  .google-confirm-modal {
    width: min(500px, 100%);
    background: var(--white);
    border: 1px solid rgba(37,99,235,.12);
    border-radius: 30px;
    padding: 28px;
    box-shadow: 0 35px 90px rgba(15,23,42,.22), 0 0 0 1px rgba(37,99,235,.05);
    transform: translateY(20px) scale(.96);
    transition:
      transform .30s cubic-bezier(.4,0,.2,1);
  }
  .google-confirm-overlay.active .google-confirm-modal {
    transform: translateY(0) scale(1);
  }
  .google-confirm-head {
    text-align: center;
    margin-bottom: 22px;
  }
  .google-confirm-avatar {
    width: 74px;
    height: 74px;
    margin: 0 auto 14px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--bg3);
    border: 3px solid #fff;
    box-shadow:
      0 8px 28px rgba(37,99,235,.16);
  }
  .google-confirm-avatar img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .google-confirm-head h3 {
    margin: 0 0 6px;
    font-family: 'Sora', sans-serif;
    font-size: 21px;
    font-weight: 700;
    color: var(--text);
  }
  .google-confirm-head p {
    margin: 0;
    font-size: 12.5px;
    color: var(--muted);
  }
  .google-confirm-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;
  }
  .google-confirm-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .google-confirm-field.full {
    grid-column: 1 / -1;
  }
  .google-confirm-field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .google-confirm-input {
    width: 100%;
    padding: 11px 13px;
    border-radius: 11px;
    border: 1.5px solid var(--border);
    background: var(--white);
    color: var(--text);
    outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    transition: .2s;
  }
  .google-confirm-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,.08);
  }
  .google-confirm-input[readonly] {
    background: var(--bg);
    color: var(--muted);
    cursor: not-allowed;
  }
  .google-confirm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 22px;
  }
  .google-confirm-btn {
    height: 45px;
    border: none;
    border-radius: 100px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s ease;
  }
  .google-confirm-btn:hover {
    transform: translateY(-1px);
  }
  .google-confirm-cancel {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .google-confirm-continue {
    background: #2563eb;
    color: #fff;
    box-shadow: 0 8px 22px rgba(37,99,235,.20);
  }
  .google-confirm-continue:hover {
    background: #1d4ed8;
  }
  .google-confirm-btn.loading {
    opacity: .6;
    pointer-events: none;
  }
  .google-confirm-required {
    color: #ef4444;
  }

  @media (max-width: 520px) {
    .google-confirm-modal {
      padding: 22px 18px;
      border-radius: 24px;
    }
    .google-confirm-grid {
      grid-template-columns: 1fr;
    }
    .google-confirm-field.full {
      grid-column: auto;
    }
    .google-confirm-actions {
      grid-template-columns: 1fr;
    }
  }

  .google-login-render {
    width: 100%;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 15px;
  }
  .google-login-render > div,
  .google-login-render iframe {
    max-width: 100%;
  }

  `;
  document.head.appendChild(style);
}
