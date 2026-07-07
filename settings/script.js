// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '../images/favicon-light.png';
  } else {
    favicon.href = '../images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

// ── PANEL NAV ──────────────────────────────────────────────
const labels = {profile:'Meu Perfil',orders:'Meus Pedidos',wishlist:'Lista de Desejos',coupons:'Meus Cupons',addresses:'Endereços',payments:'Pagamentos',notifications:'Notificações',security:'Segurança',reviews:'Avaliações',settings:'Configurações',logout:'Sair da Conta'};

function showPanel(id, btn){
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if(panel) panel.classList.add('active');
  if(btn) btn.classList.add('active');
  else { const nb = document.querySelector(`[data-panel="${id}"]`); if(nb) nb.classList.add('active'); }
  document.getElementById('bcSection').textContent = labels[id] || 'Minha Conta';
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── ACTIONS ────────────────────────────────────────────────
function saveProfile(){ toast('Perfil salvo com sucesso! ✓'); }
function changePwd(){
  const card = document.getElementById('pwdChangeCard');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
  if(card.style.display === 'block') card.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function removeWish(btn, name){
  const card = btn.closest('.wcard');
  card.style.transition = 'all .3s';
  card.style.opacity = '0';
  card.style.transform = 'scale(.9)';
  setTimeout(() => { card.remove(); toast(`${name} removido dos favoritos`); }, 300);
}
function setTheme(btn, theme){ document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); toast(`Tema ${theme==='light'?'claro':theme==='dark'?'escuro':'automático'} ativado`); }
function setAllNotifs(){ document.querySelectorAll('.toggle-inp').forEach(t => t.checked = true); toast('Todas as notificações ativadas! 🔔'); }
function filterOrders(btn, filter){ document.querySelectorAll('.btn-xs.blue, .btn-xs.gray').forEach(b => { if(b.closest('.card') && b.closest('.card').querySelector('.btn-xs')){ b.className = 'btn-xs gray'; } }); btn.className = 'btn-xs blue'; toast(`Filtro aplicado: ${btn.textContent}`,'info'); }
function copyCoupon(code){ navigator.clipboard?.writeText(code); toast(`Cupom ${code} copiado! 📋`); }
function doLogout(){ toast('Saindo da conta... 👋','info'); setTimeout(() => window.location.href = '../', 1200); }

// ── MASKS ──────────────────────────────────────────────────
function maskCPF(inp){ let v=inp.value.replace(/\D/g,'').slice(0,11); if(v.length>9) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9); else if(v.length>6) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6); else if(v.length>3) v=v.slice(0,3)+'.'+v.slice(3); inp.value=v; }
function maskPhone(inp){ let v=inp.value.replace(/\D/g,'').slice(0,11); if(v.length>6) v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7); else if(v.length>2) v='('+v.slice(0,2)+') '+v.slice(2); inp.value=v; }

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='ok'){
  const t=document.getElementById('t1');
  const ic=document.getElementById('tIco');
  const tx=document.getElementById('tMsg');
  tx.textContent=msg;
  ic.className=`t-ico ${type}`;
  ic.textContent=type==='ok'?'✓':type==='err'?'!':'ℹ';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}

// ── SUPABASE: INICIALIZAÇÃO E AUTENTICAÇÃO ─────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Busca a sessão ativa
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  // 2. Proteção de Rota: Se não estiver logado, expulsa para o login
  if (!session) {
    window.location.href = '../login/index.html'; // Ajuste este caminho se necessário
    return;
  }

  // 3. Extrai os dados do usuário
  const user = session.user;
  const meta = user.user_metadata || {};
  
  const email = user.email || "";
  const fullName = meta.full_name || "Cliente";
  const phone = meta.phone || "";

  // Divide o "Nome Completo" em Nome e Sobrenome para preencher os inputs separados
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(' ') || "";

  // 4. Injeta os dados na Barra Lateral (Sidebar)
  const sidebarName = document.getElementById('sidebarName');
  const sidebarEmail = document.getElementById('sidebarEmail');
  if (sidebarName) sidebarName.textContent = fullName;
  if (sidebarEmail) sidebarEmail.textContent = email;

  // 5. Injeta os dados no Formulário de Perfil
  const inputFirstName = document.getElementById('profileFirstName');
  const inputLastName = document.getElementById('profileLastName');
  const inputEmail = document.getElementById('profileEmail');
  const inputPhone = document.getElementById('profilePhone');

  if (inputFirstName) inputFirstName.value = firstName;
  if (inputLastName) inputLastName.value = lastName;
  if (inputEmail) inputEmail.value = email;
  if (inputPhone) {
    inputPhone.value = phone;
    maskPhone(inputPhone); // Aplica a máscara visual no número carregado
  }
});


// ── FUNÇÃO PARA SALVAR OS DADOS NO SUPABASE ─────────────────
// Substitua a sua função vazia 'saveProfile()' por esta:
async function saveProfile() {
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  // Pega o telefone e remove tudo que não for número antes de salvar no banco
  const phoneRaw = document.getElementById('profilePhone').value.replace(/\D/g, ''); 

  if (!firstName) {
    toast('O primeiro nome é obrigatório', 'err');
    return;
  }

  const fullName = `${firstName} ${lastName}`.trim();
  toast('Salvando informações...', 'info');

  // Atualiza os metadados do usuário no banco
  const { data, error } = await supabaseClient.auth.updateUser({
    data: { 
      full_name: fullName,
      phone: phoneRaw
    }
  });

  if (error) {
    console.error(error);
    toast('Erro ao salvar: ' + error.message, 'err');
  } else {
    toast('Perfil salvo com sucesso! ✓', 'ok');
    // Atualiza o nome na sidebar instantaneamente
    document.getElementById('sidebarName').textContent = fullName;
  }
}


// ── FUNÇÃO DE LOGOUT CORRIGIDA ──────────────────────────────
// Substitua a sua função 'doLogout()' do painel de ações por esta:
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut(); // Desloga do banco
  setTimeout(() => window.location.href = '../login/index.html', 1200); // Redireciona
}
