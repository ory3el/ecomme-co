// ── STYLES INJECTOR ──
function injectConfirmModalStyles() {
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
      /*background: rgba(255, 255, 255, 0.8);*/
      background: var(--white);
      backdrop-filter: blur(12px);
      padding: 30px;
      border-radius: 36px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 0 100px rgba(25,100,255,0.5);
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
      color: var(--text);
      font-size: 20px;
      font-weight: 700;
    }
    .modal-alert-content p {
      color: var(--muted);
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
      transition: transform 0.25s, background 0.25s;
    }
    .btn-alert-confirm:hover {
      background: var(--blue2);
      transform: scale(1.05);
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
      transition: background 0.25s;
    }
    .btn-alert-confirm-red:hover {
      background: #d81d1d;
    }
    .btn-alert-cancel {
      background: var(--white);
      border: 1px solid var(--muted2);
      color: var(--black);
      padding: 11px 24px;
      border-radius: 250px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.25s, border-color 0.25s;
    }
    .btn-alert-cancel:hover {
      background: var(--surface);
      border-color: var(--text1);
    }
  `;
  document.head.appendChild(style);
}

// ── POP-UP WARNING ──
async function showAlert(message, title, icon) {
  injectConfirmModalStyles();
  
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

// ── POP-UP CONFIRM ──
let confirmTimerId = null;

async function showConfirm(message, title, icon) { 
  injectConfirmModalStyles();
  
  let confirmModal = document.getElementById('confirmModal');
  if (!confirmModal) {
    confirmModal = document.createElement('div');
    confirmModal.id = 'confirmModal';
    confirmModal.className = 'modal-alert-container';
    confirmModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="confirmIcon">${icon}</div>
        <h3 id="confirmTitle">${title}</h3>
        <p id="confirmMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeConfirm()">Cancelar</button>
          <button class="btn-alert-confirm" id="btnConfirmRemove" onclick="confirmRemove()">Remover Produto</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal); 
  } else {
    document.getElementById('confirmMsg').innerHTML = message;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmIcon').innerHTML = icon; 
  }
  
  // ── LOGIC 1s ──
  const confirmBtn = document.getElementById('btnConfirmRemove');
  let timeLeft = 1;
  
  confirmBtn.disabled = true;
  confirmBtn.style.opacity = '0.5';
  confirmBtn.style.cursor = 'not-allowed';
  confirmBtn.style.transition = 'all 0.3s ease';
  confirmBtn.textContent = `Remover Produto (${timeLeft}s)`;
  
  if (confirmTimerId) clearInterval(confirmTimerId);
  
  confirmTimerId = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      confirmBtn.textContent = `Remover Produto (${timeLeft}s)`;
    } else {
      clearInterval(confirmTimerId);
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
      confirmBtn.textContent = 'Remover Produto';
    }
  }, 1000);
  
  confirmModal.offsetHeight;
  confirmModal.classList.add('active');
}
  
function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

function confirmRemove() {
  const confirmModal = document.getElementById('confirmModal');
  
  if (!cartItemPendingDelete) return;
  removeFromCart(cartItemPendingDelete);
  cartItemPendingDelete = null;
  
  if (confirmModal) {
    confirmModal.classList.remove('active');
  }
}

function closeConfirm() {
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal) {
    confirmModal.classList.remove('active');
  }
  if (confirmTimerId) clearInterval(confirmTimerId);
}

// ── POP-UP LOGOUT ──
let confirmRedTimerId = null;

async function showConfirmRed(message, title, icon) { 
  injectConfirmModalStyles();
  
  let confirmRedModal = document.getElementById('confirmRedModal');
  
  if (!confirmRedModal) {
    confirmRedModal = document.createElement('div');
    confirmRedModal.id = 'confirmRedModal';
    confirmRedModal.className = 'modal-alert-container';
    confirmRedModal.innerHTML = `
      <div class="modal-alert-content">
        <div class="modal-alert-icon" id="confirmRedIcon">${icon}</div>
        <h3 id="confirmRedTitle">${title}</h3>
        <p id="confirmRedMsg">${message}</p>
        <div class="modal-alert-buttons">
          <button class="btn-alert-cancel" onclick="closeConfirmRed()">Voltar</button>
          <button class="btn-alert-confirm-red" id="btnConfirmLogout" onclick="confirmLogout()">Sair da conta</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmRedModal); 
  } else {
    document.getElementById('confirmRedMsg').innerHTML = message;
    document.getElementById('confirmRedTitle').textContent = title;
    document.getElementById('confirmRedIcon').innerHTML = icon; 
  }
  
  // ── LOGIC 3s ──
  const confirmRedBtn = document.getElementById('btnConfirmLogout');
  let timeLeft = 3;
  
  confirmRedBtn.disabled = true;
  confirmRedBtn.style.opacity = '0.5';
  confirmRedBtn.style.cursor = 'not-allowed';
  confirmRedBtn.style.transition = 'all 0.3s ease';
  confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
  
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
  
  confirmRedTimerId = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      confirmRedBtn.textContent = `Sair da conta (${timeLeft}s)`;
    } else {
      clearInterval(confirmRedTimerId);
      confirmRedBtn.disabled = false;
      confirmRedBtn.style.opacity = '1';
      confirmRedBtn.style.cursor = 'pointer';
      confirmRedBtn.textContent = 'Sair da conta';
    }
  }, 1000);
  
  confirmRedModal.offsetHeight;
  confirmRedModal.classList.add('active');
}
  
function closeAlert() {
  const alertModal = document.getElementById('alertModal');
  if (alertModal) {
    alertModal.classList.remove('active');
  }
}

function confirmLogout() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  doLogout();
  
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
}

function closeConfirmRed() {
  const confirmRedModal = document.getElementById('confirmRedModal');
  if (confirmRedModal) {
    confirmRedModal.classList.remove('active');
  }
  if (confirmRedTimerId) clearInterval(confirmRedTimerId);
}
