// ============================================================

document.addEventListener('visibilitychange', () => {
    pageIsVisible = document.visibilityState === 'visible';
    if (pageIsVisible) {
      refreshProductsIfNeeded();
    }
  }
);

// ============================================================

// EXECUTE DATABASE
window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initThemeToggle();
    setupModalSwipe();
    setupModalAutoPlay();
    const loginBtn = document.getElementById('authLoginBtn');
    const profileContainer = document.getElementById('headerProfileContainer');
    const headerImage = document.getElementById('headerAvatar');
    const productsLoaded = await loadProductsFromSupabase();
    if (!productsLoaded) {
      return;
    }

    const {data: { user }, error: userError} = await supabaseClient.auth.getUser();
    if (!user || userError) {
      userId = null;
      if (loginBtn) {
        loginBtn.classList.remove(
          'hidden'
        );
      }
      if (profileContainer) {
        profileContainer.classList.add(
          'hidden'
        );
      }
      injectPrefetch('/login');
      loadShuffleAndRender();
      return;
    }

    userId = user.id;
    await loadFromSupabase();
    if (loginBtn) {
      loginBtn.classList.add('hidden');
    }
    if (profileContainer) {
      profileContainer.classList.remove(
        'hidden'
      );
    }

    const {data: profile, error: profileError} = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileError && profile) {
      const fullName =
        profile.full_name ||
        'Cliente';
      const email =
        user.email || '';
      if ($('accSidebarName')) {
        $('accSidebarName').textContent =
          fullName;
      }
      if ($('accSidebarEmail')) {
        $('accSidebarEmail').textContent =
          email;
      }
      if (
        profile.avatar_url &&
        $('accSidebarAvatar')
      ) {
        $('accSidebarAvatar').src =
          profile.avatar_url;
      }
      
      const photoUrl =
        profile.avatar_url || '';
      if (photoUrl && headerImage) {
        headerImage.src = photoUrl;
        headerImage.style.filter = 'none';
        headerImage.style.width = '100%';
        headerImage.style.height = '100%';
        headerImage.style.borderRadius = '100%';
        headerImage.style.objectFit = 'cover';
      }
    }
    loadShuffleAndRender();
    startProductsRealtime();
    startProductRefresh();
  }
);

// ============================================================

// TOAST
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function toast(msg) {
  showToast(msg);
}

// ── STYLES INJECTOR ──
function injectModalStyles() {
  if (document.getElementById('modal-alert-styles')) return;

  const style = document.createElement('style');
  style.id = 'modal-alert-styles';
  style.textContent = `
    .modal-alert-container {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      /*background: rgba(0, 0, 0, 0.6);*/
      backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      z-index: 500000;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .modal-alert-container.active {
      opacity: 1; pointer-events: auto;
    }
    .modal-alert-content {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      padding: 30px;
      border-radius: 36px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transform: scale(0.8);
      transition: transform 0.3s ease;
    }
    .modal-alert-container.active .modal-alert-content {
      transform: scale(1);
    }
    .modal-alert-icon {
      font-size: 44px;
      margin-bottom: 15px;
    }
    .modal-alert-content h3 {
      margin: 0 0 10px 0;
      font-family: 'Sora', 'Poppins', sans-serif;
      color: #10161a;
      font-size: 20px;
      font-weight: 700;
    }
    .modal-alert-content p {
      color: #707c8a;
      font-size: 14.5px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .modal-alert-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-alert-confirm {
      background: #2563EB;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #1d4ed8;
    }
    .btn-alert-confirm-red {
      background: #eb2525;
      color: #fff;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-confirm:hover {
      background: #d81d1d;
    }
    .btn-alert-cancel {
      background: #e8ebf0;
      color: #10161a;
      border: none;
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-alert-cancel:hover {
      background: #d1d5db;
    }
  `;
  document.head.appendChild(style);
}

// ── POP-UP WARNING ──
async function showAlert(message, title, icon) {
  injectModalStyles();

  let alertModal = document.getElementById('alertModal');
  if (!alertModal) {
    alertModal = document.createElement('div');
    alertModal.id = 'alertModal';
    alertModal.className = 'modal-alert-container';
    alertModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="alertIcon">${icon}</div>
        <h3 id="alertTitle">${title}</h3>
        <p id="alertMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-confirm" onclick="closeAlert()">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(alertModal);
  } else {
    document.getElementById('alertMsg').textContent = message;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertIcon').textContent = icon;
  }

  alertModal.offsetHeight;
  alertModal.classList.add('active');
}

// ── POP-UP AUTH ──
async function showAuth(message, title, icon) {
  injectModalStyles();

  let authModal = document.getElementById('authModal');

  if (!authModal) {
    authModal = document.createElement('div');
    authModal.id = 'authModal';
    authModal.className = 'modal-alert-container';
    authModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="authIcon">${icon}</div>
        <h3 id="authTitle">${title}</h3>
        <p id="authMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeAuth()">Cancelar</button>
          <button class="btn-alert-confirm" onclick="buttonLink('/login')">Fazer Login</button>
        </div>
      </div>
    `;
    document.body.appendChild(authModal);
  } else {
    document.getElementById('authMsg').textContent = message;
    document.getElementById('authTitle').textContent = title;
    document.getElementById('authIcon').textContent = icon;
  }

  authModal.offsetHeight;
  authModal.classList.add('active');
}

function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

function closeAuth() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.classList.remove('active');
  }
}
