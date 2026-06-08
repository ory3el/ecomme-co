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

  // 2. Inicializa o banco de dados (Use as suas chaves reais)
  const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3. Executa a busca de dados assim que a página carrega
  window.addEventListener('DOMContentLoaded', async () => {
    // Busca a sessão ativa guardada no navegador
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    // 4. Barreira de Segurança: Se não tiver logado, manda de volta pra tela de login
    if (!session || error) {
      window.location.href = '../perfil/*'; // Ajuste o caminho se necessário
      return;
    }

    // 5. Extrai os dados do utilizador
    const usuario = session.user;
    const nomeCompleto = usuario.user_metadata.full_name || "Utilizador";
    const emailUsuario = usuario.email;

    // 6. Injeta os dados no seu HTML
    // Certifique-se de que os IDs abaixo são os mesmos que você colocou no seu HTML
    const elementoNome = document.getElementById('perfilNome');
    const elementoEmail = document.getElementById('perfilEmail');

    if(elementoNome) elementoNome.textContent = nomeCompleto;
    if(elementoEmail) elementoEmail.textContent = emailUsuario;
  });

  // 7. Função bônus: Botão de Sair (Deslogar)
  async function sairDaConta() {
    await supabaseClient.auth.signOut();
    window.location.href = '../login'; // Volta pra página de login
  }
