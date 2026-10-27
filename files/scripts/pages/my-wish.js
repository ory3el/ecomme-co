(function () {
  'use strict';

  const SUPABASE_URL = 'https://cedrpcezoaqaeivrfuxn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0';
  const $ = id => document.getElementById(id);
  const state = { client: null, token: null, toastTimer: null };
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const sClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  state.token = tokenFromPath();
  
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }
  function text(value, fallback = '') { return String(value == null || value === '' ? fallback : value); }
  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw, window.location.origin);
      return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
    } catch (_) { return ''; }
  }
  function getProductName(product) { return text(product && (product.name || product.title || product.nome), 'Produto'); }
  function getPrice(product) {
    const value = product && (product.price != null ? product.price : product.preco);
    const parsed = Number(String(value == null ? '' : value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function getProductImage(product) {
    if (!product) return '';
    let images = product.images;
    if (typeof images === 'string') { try { images = JSON.parse(images); } catch (_) { images = [images]; } }
    if (!Array.isArray(images)) images = [];
    let candidate = product.image_url || product.image || product.main_image || product.thumbnail || product.image1 || images[0] || product.gallery_urls || '';
    if (Array.isArray(candidate)) candidate = candidate[0] || '';
    if (typeof candidate === 'string' && candidate.trim().startsWith('[')) { try { candidate = JSON.parse(candidate)[0] || ''; } catch (_) {} }
    return safeUrl(candidate);
  }
  function productId(product, item) { return text(product && product.id != null ? product.id : item && item.product_id); }
  function displayName(profile) { return text(profile && (profile.full_name || profile.display_name || profile.name), text(profile && profile.username, 'Usuário Ecomme')); }
  function initials(name) {
    const parts = text(name, 'Ecomme').trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'E').toUpperCase() + (parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '');
  }
  function dateLabel(value) {
    if (!value) return 'Data de publicação indisponível';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data de publicação indisponível';
    return 'Publicada em ' + new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
  function tokenFromPath() {
    const pieces = window.location.pathname.split('/').filter(Boolean);
    if (pieces[0] !== 'my-wish') return null;
    return pieces[1] || null;
  }
  function showToast(message) {
    const el = $('mwToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }
  function setVisible(id) {
    ['loadingState', 'publicState', 'manageState', 'stateMessage'].forEach(key => { const el = $(key); if (el) el.hidden = key !== id; });
  }
  function showMessage(title, description, icon = '♡') {
    $('stateTitle').textContent = title;
    $('stateDescription').textContent = description;
    $('stateIcon').textContent = icon;
    setVisible('stateMessage');
  }
  function renderAvatar(container, profile, name) {
    if (!container) return;
    const url = safeUrl(profile && profile.avatar_url);
    container.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Foto de ${escapeHtml(name)}">` : escapeHtml(initials(name));
  }
  function createToken(length = 12) {
    if (!window.crypto || !window.crypto.getRandomValues) throw new Error('Seu navegador não permite gerar links seguros. Atualize o navegador.');
    let token = '';
    while (token.length < length) {
      const values = new Uint8Array(24);
      window.crypto.getRandomValues(values);
      for (const value of values) {
        if (value >= 248) continue;
        token += ALPHABET[value % ALPHABET.length];
        if (token.length === length) break;
      }
    }
    return token;
  }
  function linkFor(list) { return list && list.share_token ? `${window.location.origin}/my-wish/${encodeURIComponent(list.share_token)}` : ''; }
  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    const textarea = document.createElement('textarea');
    textarea.value = value; textarea.readOnly = true;
    Object.assign(textarea.style, { position: 'fixed', left: '-9999px', top: '0' });
    document.body.appendChild(textarea); textarea.select();
    const ok = document.execCommand('copy'); textarea.remove();
    if (!ok) throw new Error('Não foi possível copiar o link automaticamente.');
  }

  async function loadPublicList(token) {
    if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) {
      showMessage('Link inválido', 'O endereço dessa lista não está no formato esperado. Confira o link recebido.', '🔗');
      return;
    }
    const { data, error } = await sClient.rpc('ecomme_get_shared_wishlist', { p_token: token });
    if (error) {
      console.error('[Ecomme lista pública] Falha ao carregar lista compartilhada:', error);
      showMessage('Não foi possível carregar a lista', 'O compartilhamento pode não estar configurado no Supabase. Execute a migração SQL incluída no pacote e tente novamente.', '⚠');
      return;
    }
    if (!data || !data.id || !data.is_shared) {
      showMessage('Esta lista não está disponível', 'O link pode ter sido desativado pelo proprietário ou estar incorreto. Peça à pessoa que compartilhou para gerar um novo link.', '♡');
      return;
    }
    renderPublicList(data, token);
  }

  function renderPublicList(data, token) {
    const owner = data.owner || {};
    const ownerName = displayName(owner);
    const username = text(owner.username, 'usuário Ecomme');
    const items = Array.isArray(data.items) ? data.items : [];
    $('publicListEmoji').textContent = text(data.emoji, '❤️');
    $('publicListName').textContent = text(data.name, 'Lista de desejos');
    $('publicItemCount').textContent = `${items.length} ${items.length === 1 ? 'produto' : 'produtos'}`;
    $('publicPublishedAt').textContent = dateLabel(data.published_at);
    $('publicOwnerName').textContent = ownerName;
    $('publicOwnerUsername').textContent = username.startsWith('@') ? username : '@' + username;
    renderAvatar($('publicOwnerAvatar'), owner, ownerName);
    const products = $('publicProducts');
    if (!items.length) {
      products.innerHTML = '<div class="mw-state-message mw-inline-empty"><div class="mw-state-icon">♡</div><h1>Esta lista está vazia</h1><p>O proprietário ainda não adicionou produtos a esta lista.</p></div>';
    } else {
      products.innerHTML = items.map(item => {
        const product = item.product || {};
        const id = productId(product, item);
        const name = getProductName(product);
        const image = getProductImage(product);
        const category = text(product.category || product.category_name || product.cat || product.categoria, 'Produto');
        const price = getPrice(product);
        const oldPriceValue = product.old_price || product.old || product.original_price;
        const oldPrice = Number(String(oldPriceValue == null ? '' : oldPriceValue).replace(',', '.')) || 0;
        const imageMarkup = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer">` : '<span aria-hidden="true">📦</span>';
        const productHref = `/product/${encodeURIComponent(id)}/`;
        return `<article class="mw-product-card"><a class="mw-product-image" href="${productHref}" aria-label="Ver ${escapeHtml(name)}">${imageMarkup}</a><div class="mw-product-info"><div class="mw-product-category">${escapeHtml(Array.isArray(category) ? category.join(', ') : category)}</div><h3 class="mw-product-name">${escapeHtml(name)}</h3><div><span class="mw-product-price">${formatPrice(price)}</span>${oldPrice > price ? `<span class="mw-product-old">${formatPrice(oldPrice)}</span>` : ''}</div><a class="mw-product-cta" href="${productHref}">Ver produto <span aria-hidden="true">→</span></a></div></article>`;
      }).join('');
    }
    document.title = /*${text(data.emoji, '❤️')}*/ `${text(data.name, 'Lista de desejos')} | Ecomme`;
    $('copyPublicLink').onclick = async () => {
      try { await copyText(`${window.location.origin}/my-wish/${encodeURIComponent(token)}`); showToast('Link da lista copiado!'); }
      catch (_) { showToast('Copie o endereço desta página para compartilhar.'); }
    };
    setVisible('publicState');
  }

  async function loadMyLists() {
    const { data: authData, error: authError } = await sClient.auth.getUser();
    if (authError) throw authError;
    const user = authData && authData.user;
    if (!user) {
      showMessage('Compartilhe suas listas de desejos', 'Entre na sua conta Ecomme para gerar e gerenciar links compartilháveis das suas listas.', '🔒');
      $('stateMessage').querySelector('.mw-btn').href = '/login?redirect=' + encodeURIComponent('/my-wish');
      $('stateMessage').querySelector('.mw-btn').textContent = 'Entrar na Ecomme';
      return;
    }
    const [profileResult, listResult] = await Promise.all([
      sClient.from('profiles').select('id,username,full_name,avatar_url').eq('id', user.id).maybeSingle(),
      sClient.from('wishlist_lists').select('id,user_id,name,emoji,is_default,created_at,share_token,is_shared,published_at').eq('user_id', user.id).order('created_at', { ascending: true })
    ]);
    if (listResult.error) throw listResult.error;
    const profile = profileResult.data || { id: user.id, username: user.email ? user.email.split('@')[0] : '', full_name: user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name), avatar_url: user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture) };
    const name = displayName(profile);
    renderAvatar($('manageAvatar'), profile, name);
    $('manageName').textContent = name;
    $('manageUsername').textContent = profile.username ? '@' + profile.username : 'Gerencie seus links de compartilhamento';
    renderManageLists(listResult.data || [], user, profile);
    document.title = 'Minhas listas compartilhadas · Ecomme';
    setVisible('manageState');
  }

  function renderManageLists(lists, user, profile) {
    const container = $('manageLists');
    if (!lists.length) {
      container.innerHTML = '<div class="mw-state-message"><div class="mw-state-icon">♡</div><h1>Você ainda não tem listas</h1><p>Crie listas de desejos na Ecomme e volte aqui para compartilhar um link.</p><a class="mw-btn mw-btn-primary" href="/settings">Abrir minhas configurações</a></div>';
      return;
    }
    container.innerHTML = lists.map(list => {
      const url = linkFor(list);
      const shared = Boolean(list.is_shared && list.share_token);
      const published = list.published_at ? dateLabel(list.published_at) : 'Ainda não publicada';
      return `<article class="mw-manage-card"><div class="mw-manage-emoji">${escapeHtml(text(list.emoji, '❤️'))}</div><div class="mw-manage-main"><strong>${escapeHtml(text(list.name, 'Lista de desejos'))}</strong><span>${shared ? escapeHtml(published) + ' · link ativo' : 'Privada · ainda não compartilhada'}</span>${shared ? `<a class="mw-manage-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : ''}</div><div class="mw-manage-actions">${shared ? `<button class="mw-btn mw-btn-outline" data-action="copy" data-list-id="${escapeHtml(list.id)}">Copiar link</button><a class="mw-btn mw-btn-outline" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir página</a><button class="mw-btn mw-btn-outline" data-action="revoke" data-list-id="${escapeHtml(list.id)}">Desativar</button>` : `<button class="mw-btn mw-btn-primary" data-action="share" data-list-id="${escapeHtml(list.id)}">Gerar link público</button>`}</div></article>`;
    }).join('');
    container.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.listId;
        const list = lists.find(item => String(item.id) === String(id));
        if (!list) return;
        if (button.dataset.action === 'copy') {
          try { await copyText(linkFor(list)); showToast('Link copiado!'); } catch (_) { showToast('Não foi possível copiar automaticamente. Selecione o link exibido.'); }
        } else if (button.dataset.action === 'share') {
          await createShareLink(list, user);
        } else if (button.dataset.action === 'revoke') {
          if (!window.confirm(`Desativar o link público de “${list.name}”?`)) return;
          const { error } = await sClient.from('wishlist_lists').update({ is_shared: false, share_token: null, published_at: null }).eq('id', list.id).eq('user_id', user.id);
          if (error) { console.error(error); showToast('Não foi possível desativar o link.'); return; }
          showToast('Link desativado.'); await loadMyLists();
        }
      });
    });
  }

  async function createShareLink(list, user) {
    const button = $('manageLists').querySelector(`[data-action="share"][data-list-id="${CSS.escape(String(list.id))}"]`);
    if (button) { button.disabled = true; button.textContent = 'Gerando…'; }
    try {
      let updated = null;
      let lastError = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const token = createToken(12);
        const { data, error } = await sClient.from('wishlist_lists').update({ share_token: token, is_shared: true, published_at: new Date().toISOString() }).eq('id', list.id).eq('user_id', user.id).select('id,share_token,is_shared,published_at').maybeSingle();
        if (!error && data) { updated = { ...list, ...data }; break; }
        lastError = error || new Error('A lista não foi encontrada.');
        if (error && error.code === '23505') continue;
        throw lastError;
      }
      if (!updated) throw lastError || new Error('Não foi possível gerar um token exclusivo.');
      try { await copyText(linkFor(updated)); showToast('Link gerado e copiado!'); } catch (_) { showToast('Link criado. Copie o endereço exibido no cartão da lista.'); }
      await loadMyLists();
    } catch (error) {
      console.error('[Ecomme my-wish] Erro ao gerar link:', error);
      showToast('Não foi possível gerar o link. Confira a migração SQL e as políticas do Supabase.');
      if (button) { button.disabled = false; button.textContent = 'Gerar link público'; }
    }
  }

  async function initialize() {
    $('footerYear').textContent = String(new Date().getFullYear());
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      showMessage('Serviço temporariamente indisponível', 'Não foi possível inicializar o serviço de listas. Atualize a página e tente novamente.', '⚠'); return;
    }
    
    try {
      if (state.token) await loadPublicList(state.token);
      else await loadMyLists();
      if (!sClient) {
        showMessage('Entre ou crie uma conta', 'Para acessar suas listas de desejos publicadas, é necessário fazer login em uma conta na Ecomme', '⚠');
        return;
      }
    } catch (error) {
      console.error('[Ecomme my-wish] Falha ao carregar a página:', error);
      showMessage('Não foi possível carregar esta página', 'Verifique sua conexão e se a migração SQL de listas compartilhadas foi aplicada no Supabase.', '⚠');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
