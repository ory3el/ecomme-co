import { showConsoleWarning } from '/files/scripts/console-warning.js';
showConsoleWarning();

// ── NAV LINKS ──────────────────────────────────────
function buttonLink(url) {
  window.location.href = url;
}

function goToLogin() {
  const atualPage = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(atualPage);
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
    goToLogin()
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

    const securityEmail = document.getElementById('securityEmail');
    if (securityEmail) securityEmail.textContent = email;
  
    if (inputPhone) { inputPhone.value = phone; if (typeof maskPhone === 'function') maskPhone(inputPhone); }
    if (inputCPF) { inputCPF.value = cpf; if (typeof maskCPF === 'function') maskCPF(inputCPF); }
    if (inputBirth) inputBirth.value = birthDate;
    if (inputGender) inputGender.value = gender;
    if (inputLang) inputLang.value = language;
    if (inputBio) inputBio.value = bio;
    fetchAddresses();

    const sessionStillValid = await verifySessionOnLoad();
    if (!sessionStillValid) {
    return;
    }
    await registerCurrentSession();
    await fetchSessions();
    subscribeToSessionChanges();
    startSessionCheck();
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
  toast('Carregando imagem... ⏳', 'info');

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
      const sidebarImage = document.getElementById('sidebarAvatar');
      const headerImage = document.getElementById('headerAvatar');
      
      if (avatarImage) {
        avatarImage.src = publicPhotoUrl;
        avatarImage.style.filter = "none";
        avatarImage.style.width = "100%";
        avatarImage.style.height = "100%";
        avatarImage.style.borderRadius = "100%";
        avatarImage.style.objectFit = "cover";
      }
      if (sidebarImage) {
        sidebarImage.src = publicPhotoUrl;
        sidebarImage.style.filter = "none";
        sidebarImage.style.width = "100%";
        sidebarImage.style.height = "100%";
        sidebarImage.style.borderRadius = "100%";
        sidebarImage.style.objectFit = "cover";
      }
      if (headerImage) {
        headerImage.src = publicPhotoUrl;
        headerImage.style.filter = "none";
        headerImage.style.width = "100%";
        headerImage.style.height = "100%";
        headerImage.style.borderRadius = "100%";
        headerImage.style.objectFit = "cover";
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

  toast('Salvando alterações...', 'info');

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
    toast('Perfil salvo com sucesso! ✓', 'ok');
    
    const sidebarName = document.getElementById('sidebarName');
    if (sidebarName) sidebarName.textContent = fullName;
  }
}

// ── FUNÇÃO PARA REMOVER FOTO (E APAGAR DO SERVIDOR) ──────────
async function removePhoto(event) {
  event.stopPropagation();
  
  if (!userId) return;
  toast('Removendo foto... ⏳', 'info');

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
        toast('Algo não está certo.', 'err');
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

// ── SUPABASE: ADDRESSES ───────────────────────────
let currentAddressCount = 0;

async function fetchAddresses() {
  if (!userId) return;

  const { data, error } = await supabaseClient
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar endereços:", error.message);
    return;
  }

  renderAddresses(data);
}

function renderAddresses(addresses) {
  currentAddressCount = addresses.length;
  
  const grid = document.querySelector('.addr-grid');
  if (!grid) return;

  const addCardHtml = `
    <div class="add-card" onclick="openAddressModal()">
      <div class="add-card-ico">📍</div>
      <span>Adicionar novo endereço</span>
    </div>
  `;
  let html = '';

  addresses.forEach(addr => {
    const defaultBadge = addr.is_default ? `<div class="addr-default-badge">🏠 Principal</div>` : '';
    const cardClass = addr.is_default ? 'addr-card default' : 'addr-card';
    const defaultBtn = !addr.is_default ? `<button class="btn-xs blue" onclick="setDefaultAddress('${addr.id}')">⭐ Principal</button>` : '';

    html += `
      <div class="${cardClass}">
        ${defaultBadge}
        <div class="addr-type">${addr.type || 'Casa'}</div>
        <div class="addr-name">${addr.recipient_name}</div>
        <div class="addr-street">
          ${addr.street}, ${addr.number} ${addr.complement ? '- ' + addr.complement : ''}<br>
          ${addr.neighborhood} — ${addr.city}, ${addr.state}<br>
          CEP: ${addr.zip_code}
        </div>
        <div class="addr-actions">
          <button class="btn-xs blue" onclick="editAddress('${addr.id}')">✏️ Editar</button>
          ${defaultBtn}
          <button class="btn-xs gray" onclick="deleteAddress('${addr.id}')">🗑 Excluir</button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html + addCardHtml;
}

async function setDefaultAddress(addressId) {
  toast('Atualizando...', 'info');

  await supabaseClient
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);

  const { error } = await supabaseClient
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId);

  if (error) {
    toast('Erro ao atualizar: ' + error.message, 'err');
  } else {
    toast('Definido como principal! ✓', 'ok');
    fetchAddresses();
  }
}

function openAddressModal() {
  if (currentAddressCount >= 5) {
    toast('Limite atingido: Você pode salvar no máximo 5 endereços. ⚠️', 'err');
    return;
  }
  const inputs = ['recipientInp', 'cepInp', 'streetInp', 'numInp', 'compInp', 'neighInp', 'cityInp', 'stateInp'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const modal = document.getElementById('newAddrModal');
  if (modal) modal.classList.add('on');
}

function closeAddressModal() {
  const modal = document.getElementById('newAddrModal');
  if (modal) modal.classList.remove('on');
}
async function fetchCep() {
  const cep = document.getElementById('cepInp').value.replace(/\D/g, '');
  if (cep.length === 8) {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        document.getElementById('streetInp').value = data.logradouro;
        document.getElementById('neighInp').value = data.bairro;
        document.getElementById('cityInp').value = data.localidade;
        document.getElementById('stateInp').value = data.uf;
        document.getElementById('numInp').focus();
      }
    } catch (err) {
      console.log('Erro ao buscar CEP', err);
    }
  }
}

async function deleteAddress(addressId) {
  if (!confirm('Tem certeza que deseja excluir este endereço?')) return;

  const { error } = await supabaseClient
    .from('addresses')
    .delete()
    .eq('id', addressId);

  if (error) {
    toast('Erro ao excluir: ' + error.message, 'err');
  } else {
    toast('Endereço excluído', 'ok');
    fetchAddresses();
  }
}

async function submitNewAddress() {
  if (currentAddressCount >= 5) {
    toast('Você já possui 5 endereços cadastrados.', 'err');
    return;
  }

  if (!userId) {
    toast('Sessão expirada. Faça login novamente.', 'err');
    return;
  }

  const cep = document.getElementById('cepInp').value.replace(/\D/g, '');
  const street = document.getElementById('streetInp').value;
  const num = document.getElementById('numInp').value;
  const neigh = document.getElementById('neighInp').value;
  const city = document.getElementById('cityInp').value;
  const state = document.getElementById('stateInp').value;
  
  const recipientName = document.getElementById('recipientInp')?.value || 'Meu Endereço';
  const type = document.getElementById('typeInp')?.value || 'Casa';

  if (!cep || !street || !num || !city) {
    toast('Preencha todos os campos obrigatórios.', 'err');
    return;
  }

  toast('Salvando endereço... ⏳', 'info');

  const { error } = await supabaseClient
    .from('addresses')
    .insert([
      { 
        user_id: userId, 
        type: type,
        recipient_name: recipientName,
        street: street,
        number: num,
        neighborhood: neigh,
        city: city,
        state: state,
        zip_code: cep,
        is_default: currentAddressCount === 0 
      }
    ]);

  if (error) {
    console.error("Erro no insert:", error);
    toast('Erro ao salvar endereço.', 'err');
  } else {
    toast('Endereço salvo com sucesso! 📍', 'ok');

    const formDiv = document.getElementById('newAddrForm');
    if (formDiv) formDiv.classList.remove('on');
    
    fetchAddresses(); 
    closeAddressModal()
  }
}

// SECURITY SECTION
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

async function registerCurrentSession() {
  if (!userId) return;
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();
  
  if (sessionError || !sessionData.session) {
    console.error('Sessão Auth indisponível:', sessionError);
    return false;
  }

  const session = sessionData.session;
  const { browser, os } = getDeviceInfo();
  let ip = "Desconhecido";

  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      ip = data.ip || "Desconhecido";
    }
  } catch (e) {
    console.warn("Não foi possível capturar o IP.");
  }

  let localSessionId = localStorage.getItem('local_session_id');
  if (localSessionId) {
    const { data: existingLocal, error: localError } =
      await supabaseClient
        .from('user_sessions')
        .select('id')
        .eq('id', localSessionId)
        .eq('user_id', userId)
        .maybeSingle();
    
    if (localError || !existingLocal) {
      localStorage.removeItem('local_session_id');
      localSessionId = null;
    }
  }
  if (localSessionId) {
    const { error } = await supabaseClient
      .from('user_sessions')
      .update({
        browser,
        os,
        ip_address: ip,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', localSessionId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      return false;
    }
    return true;
  }
  const { data, error } = await supabaseClient
    .from('user_sessions')
    .insert([{
      user_id: userId,
      browser,
      os,
      ip_address: ip,
      last_seen_at: new Date().toISOString()
    }])
    .select('id')
    .single();
  
  if (error) {
    console.error('🚨 ERRO AO SALVAR SESSÃO:', error.message);
    return false;
  }
  if (data?.id) {
    localStorage.setItem('local_session_id', data.id);
  }
  return true;
}

async function fetchSessions() {
  if (!userId) return;
  
  const { data: sessions, error } = await supabaseClient
    .from('user_sessions')
    .select(`
      id,
      user_id,
      browser,
      os,
      ip_address,
      created_at,
      last_seen_at
    `)
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar sessões:", error);
    return;
  }

  const container = document.getElementById('sessionsList');
  if (!container) return;

  const localSessionId = localStorage.getItem('local_session_id');
  let currentSessionHtml = '';
  let otherSessionsHtml = '';

  sessions.forEach(session => {
    const isCurrent = session.id === localSessionId;
    let icon = '💻'; 
    if (session.os.includes('Android') || session.os.includes('iOS')) icon = '📱';
    else if (session.os.includes('macOS')) icon = '🖥️';
    
    const dateSource = session.last_seen_at || session.created_at;
    const dateObj = new Date(dateSource);
    const dateStr =
      dateObj.toLocaleDateString('pt-BR') +
      ' às ' +
      dateObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

    if (isCurrent) {
      currentSessionHtml += `
        <div class="session-card">
          <div class="session-device">${icon}</div>
          <div class="session-info">
            <strong>${session.browser} · ${session.os}</strong>
            <small>Logado em: ${dateStr} · IP ${session.ip_address || 'Desconhecido'}</small>
          </div>
          <span class="session-curr">Sessão atual</span>
        </div>
      `;
    } 
    else {
      otherSessionsHtml += `
        <div class="session-card">
          <div class="session-device">${icon}</div>
          <div class="session-info">
            <strong>${session.browser} · ${session.os}</strong>
            <small>Logado em: ${dateStr} · IP ${session.ip_address || 'Desconhecido'}</small>
          </div>
          <button class="btn-xs gray" onclick="removeSession('${session.id}')">Encerrar</button>
        </div>
      `;
    }
  });

  if(sessions.length === 0) {
      container.innerHTML = '<div style="font-size: 13px; color: #64748b;">Nenhuma sessão ativa encontrada.</div>';
  } else {
      container.innerHTML = currentSessionHtml + otherSessionsHtml;
  }
}

async function removeSession(sessionId) {
  if (!userId || !sessionId) return;

  const currentSessionId = localStorage.getItem('local_session_id');
  if (sessionId === currentSessionId) {
    toast('Esta é a sessão atual.', 'info');
    return;
  }
  const confirmed = confirm('Tem certeza que deseja encerrar esta sessão?');

  if (!confirmed) return;
  toast('Encerrando sessão...', 'info');
  const { error } = await supabaseClient
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erro ao encerrar sessão:', error);
    toast('Erro ao encerrar sessão.', 'err');
    return;
  }
  toast('Sessão encerrada com sucesso.', 'ok');
  await fetchSessions();
}

async function verifySessionOnLoad() {
  const localSessionId = localStorage.getItem('local_session_id');
  if (!localSessionId || !userId) {
    return true;
  }

  const { data, error } = await supabaseClient
    .from('user_sessions')
    .select('id')
    .eq('id', localSessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao verificar sessão:', error);
    return true;
  }
  if (!data) {
    await forceLocalLogout();
    return false;
  }
  return true;
}

let sessionCheckInterval = null;
let sessionCheckRunning = false;
function startSessionCheck() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  sessionCheckInterval = setInterval(async () => {
    if (sessionCheckRunning) return;
    sessionCheckRunning = true;
    try {
      const valid = await verifySessionOnLoad();
      if (!valid) {
        stopSessionCheck();
      }
    } catch (error) {
      console.error(
        'Erro na verificação automática da sessão:',
        error
      );
    } finally {
      sessionCheckRunning = false;
    }
  }, 5_000);
}
function stopSessionCheck() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

const waitt2 = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function forceLocalLogout() {
  localStorage.removeItem('local_session_id');
  const { error } = await supabaseClient.auth.signOut({
    scope: 'local'
  });

  if (error) {
    console.error('Erro ao encerrar sessão local:', error);
  }

  alert('Sua sessão foi encerrada remotamente por outro dispositivo.');
  await waitt2(1000);
  goToLogin();
}

let intentionalLocalLogout = false;
function subscribeToSessionChanges() {
  if (!userId) return;
  if (sessionsChannel) {
    supabaseClient.removeChannel(sessionsChannel);
    sessionsChannel = null;
  }
  sessionsChannel = supabaseClient
    .channel(`user-sessions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_sessions',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        if (intentionalLocalLogout) {
          return;
        }
        const localSessionId = localStorage.getItem('local_session_id');
        if (
          payload.eventType === 'DELETE' &&
          payload.old?.id === localSessionId
        ) {
          await forceLocalLogout();
          return;
        }
        await fetchSessions();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime de sessões conectado.');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(
          '❌ Erro no Realtime de sessões.'
        );
      }
    });
}

let sessionHeartbeat = null;
async function updateSessionHeartbeat() {
  if (!userId) return;
  const localSessionId = localStorage.getItem('local_session_id');
  if (!localSessionId) return;
  const { error } = await supabaseClient
    .from('user_sessions')
    .update({
      last_seen_at: new Date().toISOString()
    })
    .eq('id', localSessionId)
    .eq('user_id', userId);
  if (error) {
    console.warn(
      'Falha ao atualizar atividade da sessão:',
      error.message
    );
  }
}

function startSessionHeartbeat() {
  if (sessionHeartbeat) {
    clearInterval(sessionHeartbeat);
  }
  updateSessionHeartbeat();
  sessionHeartbeat = setInterval(
    updateSessionHeartbeat,
    60 * 1000
  );
}

// LOGOUT
const waitt = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let sessionsChannel = null;

async function doLogout() {
  if (intentionalLocalLogout) return;
  intentionalLocalLogout = true;
  toast('Saindo da conta... 👋', 'info');
  
  const localSessionId = localStorage.getItem('local_session_id');
  if (localSessionId && userId) {
    const { error } = await supabaseClient
      .from('user_sessions')
      .delete()
      .eq('id', localSessionId)
      .eq('user_id', userId);

    if (error) {
      console.warn(
        'Não foi possível remover o registro da sessão:',
        error.message
      );
    }
  }

  localStorage.removeItem('local_session_id');
  const { error: signOutError } =
    await supabaseClient.auth.signOut({
      scope: 'local'
    });
  
  if (signOutError) {
    console.error(
      'Erro ao fazer logout:',
      signOutError
    );
  }
  toast('Você saiu da conta.', 'info');
  await waitt(700);
  window.location.reload();
}

// LOGOUT OTHERS DEVICES
async function doOthersLogout() {
  if (!userId) return;
  const confirmed = confirm(
    'Isso encerrará a conta em todos os outros dispositivos. Continuar?'
  );
  
  if (!confirmed) return;
  toast(
    'Saindo da conta em outros dispositivos...',
    'info'
  );

  const { error: authError } =
    await supabaseClient.auth.signOut({
      scope: 'others'
    });
  if (authError) {
    console.error(
      'Erro no logout dos outros dispositivos:',
      authError
    );
    toast(
      'Erro ao sair de outros dispositivos.',
      'err'
    );
    return;
  }

  const localSessionId = localStorage.getItem('local_session_id');
  if (localSessionId) {
    const { error: dbError } =
      await supabaseClient
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .neq('id', localSessionId);

    if (dbError) {
      console.error(
        'Erro ao sincronizar user_sessions:',
        dbError
      );

      toast(
        'As sessões foram encerradas, mas houve erro ao atualizar a lista.', 'err'
      );
      await fetchSessions();
      return;
    }
  }
  toast(
    'Logout em outros dispositivos realizado com sucesso!', 'ok'
  );
  await fetchSessions();
}
