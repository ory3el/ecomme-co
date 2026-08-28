const SESSION_CHECK_INTERVAL = 5_000;

let sessionCheckTimer = null;
let sessionCheckRunning = false;
let remoteLogoutHandled = false;

/*function goToLogin() {
  const currentPage =
    window.location.pathname +
    window.location.search;

  window.location.href =
    '/login?redirect=' +
    encodeURIComponent(currentPage);
}*/

async function checkCurrentSession() {
  if (
    sessionCheckRunning ||
    remoteLogoutHandled
  ) {
    return;
  }

  sessionCheckRunning = true;

  try {

    const {
      data: { session },
      error: authError
    } = await supabaseClient.auth.getSession();

    if (authError) {
      console.error(
        'Erro ao verificar sessão do Supabase:',
        authError
      );
      return;
    }

    if (!session) {
      await handleRemoteLogout();
      return;
    }

    const localSessionId =
      localStorage.getItem('local_session_id');

    if (!localSessionId) {
      await handleRemoteLogout();
      return;
    }

    const { data, error } =
      await supabaseClient
        .from('user_sessions')
        .select('id')
        .eq('id', localSessionId)
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (error) {
      console.error(
        'Erro ao verificar sessão:',
        error
      );
      return;
    }

    if (!data) {
      await handleRemoteLogout();
    }

  } catch (error) {
    console.error(
      'Erro na verificação da sessão:',
      error
    );

  } finally {
    sessionCheckRunning = false;
  }
}


async function handleRemoteLogout() {

  // Impede múltiplas execuções simultâneas
  if (remoteLogoutHandled) {
    return;
  }

  // Verifica se o aviso já foi mostrado nesta aba
  const noticeAlreadyShown =
    sessionStorage.getItem(
      'remote_logout_notice_shown'
    );

  if (noticeAlreadyShown === 'true') {
    return;
  }

  remoteLogoutHandled = true;

  // IMPORTANTE:
  // salvar antes do alert e antes do reload
  sessionStorage.setItem(
    'remote_logout_notice_shown',
    'true'
  );

  // Para o verificador
  if (sessionCheckTimer) {
    clearInterval(sessionCheckTimer);
    sessionCheckTimer = null;
  }

  // Remove identificador local
  localStorage.removeItem(
    'local_session_id'
  );

  try {

    // Logout SOMENTE neste dispositivo
    await supabaseClient.auth.signOut({
      scope: 'local'
    });

  } catch (error) {

    console.error(
      'Erro ao encerrar sessão local:',
      error
    );
  }

  // O JavaScript fica parado aqui até o usuário
  // clicar em OK.
  alert(
    'Sua sessão foi encerrada remotamente por outro dispositivo.'
  );

  // Só executa depois do OK
  window.location.reload();
}


function startSessionCheck() {

  if (sessionCheckTimer) {
    clearInterval(sessionCheckTimer);
  }

  // Verificação imediata
  checkCurrentSession();

  // Depois, a cada 5 segundos
  sessionCheckTimer = setInterval(
    checkCurrentSession,
    SESSION_CHECK_INTERVAL
  );
}


document.addEventListener(
  'DOMContentLoaded',
  () => {
    startSessionCheck();
  }
);
