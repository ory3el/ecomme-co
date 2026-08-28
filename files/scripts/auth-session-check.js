const SESSION_CHECK_INTERVAL = 5_000;
let sessionCheckTimer = null;
let sessionCheckRunning = false;
let remoteLogoutHandled = false;

/*function goToLogin() {
  const currentPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(currentPage);
}*/

async function checkCurrentSession() {
  if (sessionCheckRunning || remoteLogoutHandled) return;
  sessionCheckRunning = true;

  try {
    const {data: { session }, error: authError} = await supabaseClient.auth.getSession();
    if (authError) {
      console.error('Erro ao verificar sessão do Supabase:', authError);
      return;
    }
    
    if (!session) {
      await handleRemoteLogout();
      return;
    }
    const localSessionId = localStorage.getItem('local_session_id');
    if (!localSessionId) {
      await handleRemoteLogout();
      return;
    }

    const { data, error } = await supabaseClient
      .from('user_sessions')
      .select('id')
      .eq('id', localSessionId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return;
    }

    if (!data) {await handleRemoteLogout();}
  } catch (error) {
    console.error('Erro na verificação da sessão:', error);
  } finally {sessionCheckRunning = false;}
}

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
