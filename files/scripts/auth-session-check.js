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
  remoteLogoutHandled = true;
  clearInterval(sessionCheckTimer);
  sessionCheckTimer = null;
  localStorage.removeItem('local_session_id');
  await supabaseClient.auth.signOut({scope: 'local'});
  alert('Sua conta foi desconectada neste dispositivo porque a sessão foi encerrada em outro dispositivo.');
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
