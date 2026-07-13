// ── NAV LINKS ──────────────────────────────────────
function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
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

// ── SUPABASE: INICIALIZAÇÃO REAL ───────────────────────────
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// ESCUTADOR DE SESSÃO COM BANCO DE DADOS
window.addEventListener('DOMContentLoaded', async () => {
  
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (!user || userError) {
    console.warn("Sessão inválida ou expirada. Redirecionando...");
    window.location.href = '/login/';
    return;
  }

  userId = user.id; 

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();


/* supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (!session) {
      window.location.href = '/login/';
      return;
    }

    const user = session.user;
    userId = user.id;

    // ── NOVIDADE: Buscando os dados direto da tabela 'profiles' ──
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar perfil:", error.message);
      return;
    } */

    const email = user.email || "";
    const fullName = profile.full_name || "Cliente";
    const phone = profile.phone || "";
    
    const cpf = profile.cpf || "";
    const birthDate = profile.birth_date || "";
    const gender = profile.gender || "Selecione uma opção";
    const language = profile.language || "Português (BR)";
    const bio = profile.bio || "";

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    const sidebarName = document.getElementById('sidebarName');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarName) sidebarName.textContent = fullName;
    if (sidebarEmail) sidebarEmail.textContent = email;

    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const inputPhone = document.getElementById('profilePhone');
    const photoUrl = profile.avatar_url || "";
      
    const inputCPF = document.getElementById('profileCPF');
    const inputBirth = document.getElementById('profileBirth');
    const inputGender = document.getElementById('profileGender');
    const inputLang = document.getElementById('profileLang');
    const inputBio = document.getElementById('profileBio');

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;
    
    if (inputPhone) { inputPhone.value = phone; if (typeof maskPhone === 'function') maskPhone(inputPhone); }
    if (inputCPF) { inputCPF.value = cpf; if (typeof maskCPF === 'function') maskCPF(inputCPF); }
    if (inputBirth) inputBirth.value = birthDate;
    if (inputGender) inputGender.value = gender;
    if (inputLang) inputLang.value = language;
    if (inputBio) inputBio.value = bio;
  

  /*if (event === 'SIGNED_OUT') {
    window.location.href = '/login/';
  }*/

  // ── Renderiza a foto do Google se ela existir ──
  if (photoUrl) {
    const avatarImage = document.getElementById('profileAvatar');
    const sidebarImage = document.getElementById('sidebarAvatar');
    const headerImage = document.getElementById('headerAvatar');
    if (avatarImage) {
      avatarImage.src = photoUrl;
      avatarImage.style.filter = "none";
      avatarImage.style.width = "100%";
      avatarImage.style.height = "100%";
      avatarImage.style.borderRadius = "100%";
      avatarImage.style.objectFit = "cover";
    }
    if (sidebarImage) {
      sidebarImage.src = photoUrl;
      sidebarImage.style.filter = "none";
      sidebarImage.style.width = "100%";
      sidebarImage.style.height = "100%";
      sidebarImage.style.borderRadius = "100%";
      sidebarImage.style.objectFit = "cover";
    }
    if (headerImage) {
      headerImage.src = photoUrl;
      headerImage.style.filter = "none";
      headerImage.style.width = "100%";
      headerImage.style.height = "100%";
      headerImage.style.borderRadius = "100%";
      headerImage.style.objectFit = "cover";
    }
  }
});

// ── FUNÇÃO DE UPLOAD DA FOTO DE PERFIL ─────────────────────
let cropperInstance = null;
let originalFileName = "";

function openCropModal(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem deve ter no máximo 5MB ⚠️', 'err');
    event.target.value = '';
    return;
  }

  originalFileName = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgElement = document.getElementById('imageToCrop');
    imgElement.src = e.target.result;
    document.getElementById('cropModal').classList.add('active');

    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = new Cropper(imgElement, {
      aspectRatio: 1,
      viewMode: 2,
      dragMode: 'move',
      autoCropArea: 0.9,
      background: false,
    });
  };
  
  reader.readAsDataURL(file);
  event.target.value = '';
}

function closeCropModal() {
  document.getElementById('cropModal').classList.remove('active');
  
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
}

async function executeCrop() {
  if (!cropperInstance) {
    toast('Erro: O recortador de imagem não foi inicializado corretamente. ⚠️', 'err');
    return;
  }
  toast('A preparar imagem... ⏳', 'info');

  cropperInstance.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingQuality: 'high'
  }).toBlob(async (blob) => {
    
    if (!blob) {
      toast('Erro ao processar o recorte da imagem.', 'err');
      closeCropModal();
      return;
    }
    closeCropModal();

    try {
      const { data: currentProfile, error: fetchError } = await supabaseClient
        .from('profiles').select('avatar_url').eq('id', userId).single();

      let oldUrl = (!fetchError && currentProfile) ? currentProfile.avatar_url : null;

      const fileExt = originalFileName.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
      const publicPhotoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: publicPhotoUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      if (oldUrl && oldUrl.includes('/avatars/')) {
        const urlParts = oldUrl.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        await supabaseClient.storage.from('avatars').remove([oldFileName]);
      }

      const avatarImage = document.getElementById('profileAvatar');
      if (avatarImage) {
        avatarImage.src = publicPhotoUrl;
        avatarImage.style.filter = "none";
        avatarImage.style.width = "100%";
        avatarImage.style.height = "100%";
        avatarImage.style.objectFit = "cover";
      }

      toast('Foto atualizada com sucesso! 🎉', 'ok');

    } catch (error) {
      console.error('Erro no upload:', error.message);
      toast('Erro ao enviar a foto.', 'err');
    }

  }, 'image/jpeg', 0.85);
}
        
// FUNÇÃO SALVAR ATUALIZADA: Faz um UPDATE na tabela 'profiles'
async function saveProfile() {
  if (!userId) return;

  const inputFirstName = document.getElementById('profileFirstName');
  const inputLastName = document.getElementById('profileLastName');
  const inputPhone = document.getElementById('profilePhone');
  
  const inputCPF = document.getElementById('profileCPF');
  const inputBirth = document.getElementById('profileBirth');
  const inputGender = document.getElementById('profileGender');
  const inputLang = document.getElementById('profileLang');
  const inputBio = document.getElementById('profileBio');

  if (!inputFirstName || !inputFirstName.value.trim()) {
    toast('O primeiro nome é obrigatório', 'err');
    return;
  }

  const firstName = inputFirstName.value.trim();
  const lastName = inputLastName ? inputLastName.value.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  
  const phoneRaw = inputPhone ? inputPhone.value.replace(/\D/g, '') : "";
  const cpfRaw = inputCPF ? inputCPF.value.replace(/\D/g, '') : "";
  const birthDate = inputBirth ? inputBirth.value : null;
  const gender = inputGender ? inputGender.value : "";
  const language = inputLang ? inputLang.value : "";
  const bio = inputBio ? inputBio.value.trim() : "";

  toast('A guardar alterações...', 'info');

  // ── ATUALIZANDO NA TABELA 'PROFILES' VIA SQL/API ──
  const { error } = await supabaseClient
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phoneRaw,
      cpf: cpfRaw,
      birth_date: birthDate ? birthDate : null,
      gender: gender,
      language: language,
      bio: bio
    })
    .eq('id', userId);

  if (error) {
    console.error(error);
    toast('Erro ao salvar: ' + error.message, 'err');
  } else {
    toast('Perfil guardado com sucesso! ✓', 'ok');
    
    const sidebarName = document.getElementById('sidebarName');
    if (sidebarName) sidebarName.textContent = fullName;
  }
}

// ── FUNÇÃO PARA REMOVER FOTO (E APAGAR DO SERVIDOR) ──────────
async function removePhoto(event) {
  event.stopPropagation();
  
  if (!userId) return;
  toast('A remover foto... ⏳', 'info');

  try {
    const { data: profile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    const oldUrl = profile.avatar_url;

    if (oldUrl) {
      const urlParts = oldUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: removeError } = await supabaseClient.storage
        .from('avatars')
        .remove([fileName]);

      if (removeError) {
        console.warn("Aviso: Não foi possível apagar o ficheiro do Storage.", removeError.message);
      }
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) throw updateError;

    const avatarImage = document.getElementById('profileAvatar');
    const sidebarImage = document.getElementById('sidebarAvatar');
    const headerImage = document.getElementById('headerAvatar');
    if (avatarImage) {
      avatarImage.src = "/images/icons/full/user.webp";
      avatarImage.style.filter = "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,.5))";
      avatarImage.style.width = "75%";
      avatarImage.style.height = "auto";
    }
    if (sidebarImage) {
      sidebarImage.src = "/images/icons/full/user.webp";
      sidebarImage.style.filter = "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,.5))";
      sidebarImage.style.width = "75%";
      sidebarImage.style.height = "auto";
    }
    if (headerImage) {
      headerImage.src = "/images/icons/full/user.webp";
      headerImage.style.filter = "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,.5))";
      headerImage.style.width = "75%";
      headerImage.style.height = "auto";
    }
    toast('Foto de perfil removida com sucesso! 🗑️', 'ok');

  } catch (erro) {
    console.error('Erro ao remover foto:', erro.message);
    toast('Ocorreu um erro ao remover a foto.', 'err');
  }
}

// FUNÇÃO DE LOGOUT
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut();
  buttonLink('/login')
}
