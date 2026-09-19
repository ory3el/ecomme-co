const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;


const SESSION_CHECK_INTERVAL = 5_000;
let sessionCheckTimer = null;
let sessionCheckRunning = false;
let remoteLogoutHandled = false;

/*function goToLogin() {
  const currentPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(currentPage);
}*/

/* ─── UTILS ─────────────────────────────────────────────────────────── */
const fmt = p => p != null ? 'R$ ' + Number(p).toFixed(2).replace('.', ',') : '';
const $ = id => document.getElementById(id);

function starsHtml(r) {
  let s = '';
  const f = Math.floor(r);
  for (let i = 0; i < f; i++) s += '★';
  for (let i = f; i < 5; i++) s += '☆';
  return s;
}

function fishYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------

async function checkCurrentSession() {
  if (sessionCheckRunning || remoteLogoutHandled) return;
  sessionCheckRunning = true;
  try {
    const {
      data: { session },
      error: authError
    } = await supabaseClient.auth.getSession();

    if (authError) {
      console.error('Erro ao verificar sessão do Supabase:', authError);
      return;
    }

    if (!session) {
      return;
    }
    const localSessionId = localStorage.getItem('local_session_id');
    if (!localSessionId) {
      return;
    }

    const {data, error} = await supabaseClient
      .from('user_sessions')
      .select('id')
      .eq('id', localSessionId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return;
    }
    if (!data) {
      await handleRemoteLogout();
    }
  } catch (error) {
    console.error('Erro na verificação da sessão:', error);
  } finally {
    sessionCheckRunning = false;
  }
}

// --------------------------------------

async function handleRemoteLogout() {
  if (remoteLogoutHandled) return;
  const noticeAlreadyShown = sessionStorage.getItem('remote_logout_notice_shown');
  if (noticeAlreadyShown === 'true') {return;}
  remoteLogoutHandled = true;
  sessionStorage.setItem('remote_logout_notice_shown', 'true');
  clearInterval(sessionCheckTimer);
  sessionCheckTimer = null;
  localStorage.removeItem('local_session_id');
  try {await supabaseClient.auth.signOut({scope: 'local'});} catch (error) {console.error('Erro ao encerrar sessão local:', error);}
  alert('Sua sessão foi encerrada remotamente por outro dispositivo.');
  window.location.reload();
}

// ------------------------------

function startSessionCheck() {
  if (sessionCheckTimer) {
    clearInterval(sessionCheckTimer);
  }

  checkCurrentSession();
  sessionCheckTimer = setInterval(
    checkCurrentSession,
    SESSION_CHECK_INTERVAL
  );
}

document.addEventListener('DOMContentLoaded', () => {
  startSessionCheck();
});
