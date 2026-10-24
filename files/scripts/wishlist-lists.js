(function () {
  'use strict';

  const DEFAULT_LIST = { name: 'Favoritos', emoji: '❤️' };
  const EMOJIS = ['❤️', '🎁', '🏠', '⭐', '🛍️', '✈️', '🎮', '📚', '💄', '👟', '🌿', '☕', '🐾', '💻', '🎨', '🎧'];
  const state = {
    client: null,
    user: null,
    lists: [],
    items: [],
    products: new Map(),
    activeSidebarListId: null,
    settingsListId: null,
    modalProductId: null,
    modalFormMode: null,
    modalEditListId: null,
    modalFormName: '',
    modalBusy: false,
    selectedEmoji: DEFAULT_LIST.emoji,
    schemaError: null,
    initialized: false,
    loadRequest: 0
  };

  function db() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    } catch (_) {}
    return window.ecommeSupabaseClient || window.supabaseClient || state.client || null;
  }

  let supabaseSdkPromise = null;
  async function ensureClient() {
    const existing = db();
    if (existing) { state.client = existing; return existing; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      if (!supabaseSdkPromise) {
        supabaseSdkPromise = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.dataset.ecommeWishlistSupabase = 'true';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Não foi possível carregar o SDK do Supabase.'));
          document.head.appendChild(script);
        });
      }
      await supabaseSdkPromise;
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('O SDK do Supabase não está disponível.');
    }
    const client = window.supabase.createClient(
      'https://cedrpcezoaqaeivrfuxn.supabase.co',
      'sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0'
    );
    window.ecommeSupabaseClient = client;
    window.supabaseClient = window.supabaseClient || client;
    state.client = client;
    return client;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function safeId(value) {
    return String(value == null ? '' : value).trim();
  }

  function notify(message, type) {
    try {
      if (typeof showToast === 'function') return showToast(message, type || 'info');
      if (typeof toast === 'function') return toast(message, type || 'info');
      if (typeof toastMsg === 'function') return toastMsg(message);
    } catch (_) {}
    console.info('[Ecomme listas de desejos]', message);
  }

  function productName(product) {
    return String(product && (product.name || product.title || product.nome) || 'Produto');
  }

  function productPrice(product) {
    return Number(product && (product.price != null ? product.price : product.preco)) || 0;
  }

  function formatPrice(value) {
    try {
      if (typeof window.ecommeFormatPrice === 'function') return window.ecommeFormatPrice(value);
      if (typeof formatEcommePrice === 'function') return formatEcommePrice(value);
      if (typeof fmt === 'function') return fmt(value);
    } catch (_) {}
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function productImage(product) {
    if (!product) return '';
    let images = product.images;
    if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch (_) { images = [images]; }
    }
    if (!Array.isArray(images)) images = [];
    const value = product.image_url || product.image || product.main_image || product.thumbnail || product.image1 || images[0] || product.gallery_urls;
    if (Array.isArray(value)) return String(value[0] || '');
    if (typeof value === 'string' && value.trim().startsWith('[')) {
      try { const parsed = JSON.parse(value); return String(parsed[0] || ''); } catch (_) {}
    }
    return typeof value === 'string' ? value : '';
  }

  function localProducts() {
    const map = new Map();
    const names = ['products', 'offers', 'shuffled', 'PRODUCTS', 'RELATED_PRODS'];
    names.forEach(name => {
      try {
        let value = window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : null);
        if (!Array.isArray(value)) {
          try { if (name === 'products' && typeof products !== 'undefined') value = products; } catch (_) {}
          try { if (name === 'offers' && typeof offers !== 'undefined') value = offers; } catch (_) {}
          try { if (name === 'shuffled' && typeof shuffled !== 'undefined') value = shuffled; } catch (_) {}
          try { if (name === 'PRODUCTS' && typeof PRODUCTS !== 'undefined') value = PRODUCTS; } catch (_) {}
          try { if (name === 'RELATED_PRODS' && typeof RELATED_PRODS !== 'undefined') value = RELATED_PRODS; } catch (_) {}
        }
        if (Array.isArray(value)) value.forEach(p => {
          if (p && p.id != null) map.set(String(p.id), p);
        });
      } catch (_) {}
    });
    try {
      if (typeof currentProduct !== 'undefined' && currentProduct && currentProduct.id != null) {
        map.set(String(currentProduct.id), currentProduct);
      }
    } catch (_) {}
    return map;
  }

  async function resolveUser() {
    const client = db();
    if (!client || !client.auth || typeof client.auth.getUser !== 'function') return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data && data.user ? data.user : null;
  }

  function defaultListId() {
    const match = state.lists.find(list => list.is_default) || state.lists[0];
    return match ? String(match.id) : null;
  }

  function listItems(listId) {
    return state.items.filter(item => String(item.list_id) === String(listId));
  }

  function productIdsForAllLists() {
    return Array.from(new Set(state.items.map(item => String(item.product_id)).filter(Boolean)));
  }

  async function ensureDefaultList() {
    const client = db();
    if (!client || !state.user) return;
    const { data: existing, error: readError } = await client
      .from('wishlist_lists')
      .select('id')
      .eq('user_id', state.user.id)
      .limit(1);
    if (readError) throw readError;
    if (existing && existing.length) return;

    const { error } = await client.from('wishlist_lists').insert({
      user_id: state.user.id,
      name: DEFAULT_LIST.name,
      emoji: DEFAULT_LIST.emoji,
      is_default: true
    });
    if (error && error.code !== '23505') throw error;
  }

  async function hydrateProducts(ids) {
    const local = localProducts();
    local.forEach((value, key) => state.products.set(key, value));
    const missing = ids.map(String).filter(id => !state.products.has(id));
    if (!missing.length) return;
    const client = db();
    if (!client) return;
    for (let i = 0; i < missing.length; i += 100) {
      const batch = missing.slice(i, i + 100);
      const { data, error } = await client.from('products').select('*').in('id', batch);
      if (error) {
        console.warn('[Ecomme listas de desejos] Não foi possível carregar alguns produtos:', error.message);
        continue;
      }
      (data || []).forEach(product => state.products.set(String(product.id), product));
    }
  }

  async function refreshState(options) {
    options = options || {};
    const requestId = ++state.loadRequest;
    const client = db();
    state.client = client;
    if (!client) {
      state.schemaError = new Error('O cliente Supabase não está disponível nesta página.');
      renderSidebar();
      renderSettingsManager();
      return false;
    }

    try {
      state.user = options.user !== undefined ? options.user : await resolveUser();
      if (!state.user) {
        state.lists = [];
        state.items = [];
        state.schemaError = null;
        state.activeSidebarListId = null;
        state.settingsListId = null;
        try { fav = []; } catch (_) { window.fav = []; }
        try { wishlist = []; } catch (_) {}
        renderSidebar();
        renderSettingsManager();
        syncFavoriteUI();
        return false;
      }

      let { data: lists, error: listsError } = await client
        .from('wishlist_lists')
        .select('id,user_id,name,emoji,is_default,created_at,updated_at')
        .eq('user_id', state.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (listsError) throw listsError;

      if (!lists || !lists.length) {
        await ensureDefaultList();
        const result = await client
          .from('wishlist_lists')
          .select('id,user_id,name,emoji,is_default,created_at,updated_at')
          .eq('user_id', state.user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true });
        if (result.error) throw result.error;
        lists = result.data || [];
      }
      if (requestId !== state.loadRequest) return false;
      state.lists = lists || [];
      state.schemaError = null;

      if (!state.lists.some(list => String(list.id) === String(state.activeSidebarListId))) {
        const saved = safeStorageGet('ecomme:wishlist:sidebar:' + state.user.id);
        state.activeSidebarListId = state.lists.some(list => String(list.id) === saved) ? saved : defaultListId();
      }
      if (!state.lists.some(list => String(list.id) === String(state.settingsListId))) {
        const saved = safeStorageGet('ecomme:wishlist:settings:' + state.user.id);
        state.settingsListId = state.lists.some(list => String(list.id) === saved) ? saved : defaultListId();
      }

      const ids = state.lists.map(list => list.id);
      if (ids.length) {
        const { data: items, error: itemsError } = await client
          .from('wishlist_items')
          .select('id,list_id,product_id,created_at')
          .in('list_id', ids)
          .order('created_at', { ascending: false });
        if (itemsError) throw itemsError;
        state.items = (items || []).map(item => ({ ...item, product_id: String(item.product_id) }));
      } else state.items = [];

      await hydrateProducts(productIdsForAllLists());
      if (requestId !== state.loadRequest) return false;
      syncLegacyFavoriteCache();
      renderSidebar();
      renderSettingsManager();
      syncFavoriteUI();
      return true;
    } catch (error) {
      state.schemaError = error;
      if (!state.initialized || options.showError) console.error('[Ecomme listas de desejos] Falha ao carregar listas. Execute a migração SQL fornecida.', error);
      renderSidebar();
      renderSettingsManager();
      return false;
    }
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function syncLegacyFavoriteCache() {
    const uniqueIds = productIdsForAllLists();
    const combined = uniqueIds.map(id => {
      const product = state.products.get(id) || { id, name: 'Produto', price: 0, emoji: '📦' };
      return { ...product, id: String(id), qty: 1 };
    });
    try { fav = combined; } catch (_) { window.fav = combined; }
    try { wishlist = uniqueIds; } catch (_) {}
  }

  function isSavedInList(listId, productId) {
    return state.items.some(item => String(item.list_id) === String(listId) && String(item.product_id) === String(productId));
  }

  function isSavedAnywhere(productId) {
    return state.items.some(item => String(item.product_id) === String(productId));
  }

  function syncFavoriteUI() {
    const uniqueCount = productIdsForAllLists().length;
    const badge = document.getElementById('wishBadge') || document.getElementById('sWishlistBadge');
    if (badge) {
      badge.textContent = String(uniqueCount);
      badge.style.display = uniqueCount ? 'flex' : 'none';
    }

    document.querySelectorAll('#mWish,#mWish1,.product-wishlist,.oc-wish,.cart-item-towish,.pcard-wish,.qv-wish-btn,[data-related-fav]').forEach(button => {
      let id = button.dataset.relatedFav || button.dataset.productId || '';
      if (!id && button.getAttribute('onclick')) {
        const match = button.getAttribute('onclick').match(/(?:toggleFav|toggleWish)\s*\(\s*(?:String\s*\(\s*)?['"]?([^'"),]+)['"]?/i);
        if (match) id = match[1].trim();
      }
      if (!id && button.id === 'mWish' || !id && button.id === 'mWish1') {
        try { if (typeof curId !== 'undefined') id = String(curId || ''); } catch (_) {}
      }
      if (!id) return;
      const active = isSavedAnywhere(id);
      button.classList.toggle('on', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      if (button.classList.contains('cart-item-towish')) button.title = active ? 'Salvo em uma lista de desejos' : 'Adicionar a uma lista de desejos';
    });
  }

/*  function ensureStyles() {
    if (document.getElementById('ecomme-wishlist-lists-styles')) return;
    const style = document.createElement('style');
    style.id = 'ecomme-wishlist-lists-styles';
    style.textContent = `
      .ewl-overlay{position:fixed;inset:0;z-index:999990;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,15,31,.52);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .24s ease,visibility .24s ease}
      .ewl-overlay.open{opacity:1;visibility:visible;pointer-events:auto}.ewl-modal{width:min(560px,100%);max-height:min(84vh,780px);overflow:auto;color:var(--text,#111827);background:var(--card,#fff);border:1px solid color-mix(in srgb,var(--border,#dbe4f0) 75%,transparent);border-radius:24px;box-shadow:0 28px 90px rgba(0,0,0,.26);padding:22px;opacity:0;transform:translateY(14px) scale(.975);transition:opacity .22s ease,transform .28s cubic-bezier(.2,.8,.2,1);will-change:opacity,transform}
      .ewl-overlay.open .ewl-modal{opacity:1;transform:translateY(0) scale(1)}
      .ewl-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.ewl-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.5px;color:var(--blue,#2563eb);text-transform:uppercase}.ewl-modal h2{font-size:22px;line-height:1.25;margin:5px 0 6px;font-weight:800}.ewl-modal p{margin:0;color:var(--muted,#64748b);font-size:13px;line-height:1.55}.ewl-close{border:0;background:var(--bg2,#eef3fb);color:var(--text,#111827);height:36px;width:36px;border-radius:12px;font-size:22px;cursor:pointer;flex-shrink:0}
      .ewl-list-stack{display:grid;gap:9px}.ewl-choice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border,#dbe4f0);border-radius:16px;background:var(--card,#fff);transition:border-color .16s,transform .16s}.ewl-choice:hover{border-color:var(--blue,#2563eb);transform:translateY(-1px)}.ewl-choice-main{display:flex;align-items:center;gap:12px;min-width:0}.ewl-emoji{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:44px;height:44px;border-radius:13px;background:var(--bg2,#f1f5fb);font-size:23px}.ewl-choice-title{font-weight:750;font-size:14px;overflow-wrap:anywhere}.ewl-choice-meta{font-size:11px;color:var(--muted,#64748b);margin-top:3px}.ewl-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--border,#dbe4f0);border-radius:12px;padding:9px 12px;font-weight:750;font-size:12px;background:var(--card,#fff);color:var(--text,#111827);cursor:pointer;white-space:nowrap}.ewl-btn-primary{background:var(--blue,#2563eb);color:white;border-color:var(--blue,#2563eb)}.ewl-btn-danger{color:#dc2626;border-color:#fecaca}.ewl-btn:disabled{opacity:.45;cursor:not-allowed}.ewl-full{width:100%;margin-top:13px}.ewl-form{display:grid;gap:13px;padding:14px;border:1px solid var(--border,#dbe4f0);background:var(--bg,#f8fbff);border-radius:16px;margin:12px 0}.ewl-label{font-size:12px;font-weight:750;display:block;margin-bottom:6px}.ewl-input{width:100%;min-height:43px;border:1px solid var(--border,#dbe4f0);border-radius:11px;padding:10px 12px;background:var(--card,#fff);color:var(--text,#111827);font:inherit;font-size:13px;box-sizing:border-box}.ewl-emoji-grid{display:flex;flex-wrap:wrap;gap:7px}.ewl-emoji-option{width:38px;height:38px;border-radius:11px;border:1px solid var(--border,#dbe4f0);background:var(--card,#fff);font-size:19px;cursor:pointer}.ewl-emoji-option.selected{border-color:var(--blue,#2563eb);box-shadow:0 0 0 2px color-mix(in srgb,var(--blue,#2563eb) 25%,transparent);background:var(--bg,#f8fbff)}.ewl-form-actions{display:flex;gap:8px;justify-content:flex-end}.ewl-error{padding:12px;border-radius:12px;background:rgba(220,38,38,.08);color:#b91c1c;font-size:12px;line-height:1.5;margin-bottom:12px}.ewl-muted{font-size:12px;color:var(--muted,#64748b);line-height:1.5}
      .ewl-loading{display:grid;gap:11px}.ewl-skeleton-stack{display:grid;gap:9px}.ewl-skeleton-choice{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border,#dbe4f0);border-radius:16px;background:var(--card,#fff)}.ewl-skeleton-main{display:grid;gap:8px;flex:1;min-width:0}.ewl-skeleton{position:relative;display:block;overflow:hidden;background:color-mix(in srgb,var(--muted,#94a3b8) 13%,var(--card,#fff));border-radius:9px}.ewl-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(148,163,184,.22),transparent);animation:ewl-skeleton-shimmer 1.25s ease-in-out infinite}.ewl-skeleton-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:13px}.ewl-skeleton-line{height:10px;width:70%}.ewl-skeleton-line.wide{width:88%}.ewl-skeleton-line.short{width:44%;height:8px}.ewl-skeleton-button{width:76px;height:32px;border-radius:11px;flex:0 0 76px}.ewl-skeleton-product{height:46px;width:100%;border-radius:13px;margin-bottom:2px}.ewl-skeleton-create{height:40px;width:100%;border-radius:12px;margin-top:2px}.ewl-skeleton-message{font-size:12px;color:var(--muted,#64748b);text-align:center;padding:2px 0 0}.ewl-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes ewl-skeleton-shimmer{100%{transform:translateX(100%)}}.ewl-modal[aria-busy="true"]{cursor:progress}.ewl-btn.is-busy{position:relative;overflow:hidden;pointer-events:none;opacity:.8}.ewl-btn.is-busy::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);animation:ewl-skeleton-shimmer 1.1s ease-in-out infinite}
      .ewl-sidebar-tools{display:flex;align-items:center;gap:8px;padding:10px 10px 13px;border-bottom:1px solid var(--border,#dbe4f0);margin-bottom:10px}.ewl-sidebar-tools select{min-width:0;flex:1;background:var(--card,#fff);color:var(--text,#111827);border:1px solid var(--border,#dbe4f0);border-radius:11px;padding:9px 8px;font:inherit;font-size:12px}.ewl-sidebar-tools .ewl-btn{padding:8px 10px}.ewl-side-product{display:flex;align-items:center;gap:10px;padding:11px 9px;border-bottom:1px solid var(--border,#dbe4f0)}.ewl-side-img{width:58px;height:58px;flex-shrink:0;border-radius:12px;overflow:hidden;background:var(--bg2,#f1f5fb);display:flex;align-items:center;justify-content:center}.ewl-side-img img{width:100%;height:100%;object-fit:cover}.ewl-side-info{min-width:0;flex:1}.ewl-side-name{font-size:12px;font-weight:750;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.ewl-side-price{font-size:12px;font-weight:800;margin-top:4px}.ewl-side-actions{display:flex;flex-direction:column;gap:6px}.ewl-icon-btn{border:1px solid var(--border,#dbe4f0);border-radius:9px;width:30px;height:30px;background:var(--card,#fff);color:var(--text,#111827);cursor:pointer}.ewl-empty{padding:32px 14px;text-align:center;color:var(--muted,#64748b);font-size:13px;line-height:1.6}.ewl-empty span{font-size:31px;display:block;margin-bottom:8px}
      .ewl-settings-toolbar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;justify-content:space-between;margin:0 0 16px}.ewl-settings-lists{display:flex;flex-wrap:wrap;gap:8px;min-width:0}.ewl-list-chip{display:flex;align-items:center;gap:7px;max-width:100%;border:1px solid var(--border,#dbe4f0);border-radius:13px;padding:8px 11px;background:var(--card,#fff);color:var(--text,#111827);cursor:pointer;font-size:12px;font-weight:750}.ewl-list-chip.selected{border-color:var(--blue,#2563eb);background:color-mix(in srgb,var(--blue,#2563eb) 8%,var(--card,#fff));box-shadow:0 0 0 1px var(--blue,#2563eb) inset}.ewl-list-chip span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ewl-settings-detail{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:12px 14px;border:1px solid var(--border,#dbe4f0);border-radius:14px;background:var(--bg,#f8fbff)}.ewl-settings-detail .ewl-emoji{width:40px;height:40px}.ewl-settings-detail-main{flex:1;min-width:150px}.ewl-settings-detail-main strong{display:block;font-size:14px}.ewl-settings-detail-main small{color:var(--muted,#64748b);font-size:11px}.ewl-settings-actions{display:flex;gap:7px;flex-wrap:wrap}.ewl-settings-product-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}.ewl-settings-product-actions .ewl-btn{padding:7px 9px}
      @media(prefers-reduced-motion:reduce){.ewl-overlay,.ewl-modal{transition-duration:.01ms!important}.ewl-skeleton::after,.ewl-btn.is-busy::after{animation-duration:2.8s}}
      @media(max-width:520px){.ewl-modal{padding:17px;border-radius:20px}.ewl-choice{align-items:flex-start}.ewl-choice .ewl-btn{padding:8px 9px}.ewl-settings-toolbar{align-items:stretch}.ewl-settings-toolbar>.ewl-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }*/

  function ensureModal() {
    //ensureStyles();
    if (document.getElementById('ecommeWishlistModal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'ewl-overlay';
    overlay.id = 'ecommeWishlistModal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="ewl-modal" role="dialog" aria-modal="true" aria-labelledby="ewlModalTitle">
        <div class="ewl-modal-head">
          <div><div class="ewl-eyebrow">Ecomme · listas de desejos</div><h2 id="ewlModalTitle">Adicionar aos favoritos</h2><p id="ewlModalSubtitle">Escolha onde quer guardar este produto.</p></div>
          <button type="button" class="ewl-close" data-ewl-action="close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="ewlModalContent"></div>
      </section>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-ewl-action="close"]')) closeModal();
      const actionButton = event.target.closest('[data-ewl-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.ewlAction;
      if (state.modalBusy && action !== 'close') return;
      if (action === 'create-toggle') { state.modalFormMode = 'create'; state.modalEditListId = null; state.modalFormName = ''; state.selectedEmoji = '❤️'; renderModal(); }
      else if (action === 'edit-list') { state.modalFormMode = 'edit'; state.modalEditListId = actionButton.dataset.listId; const list = state.lists.find(x => String(x.id) === String(state.modalEditListId)); state.modalFormName = list ? list.name : ''; state.selectedEmoji = list ? list.emoji : '❤️'; renderModal(); }
      else if (action === 'cancel-form') { state.modalFormMode = null; state.modalEditListId = null; state.modalFormName = ''; renderModal(); }
      else if (action === 'choose-list') chooseList(actionButton.dataset.listId);
      else if (action === 'remove-item') removeItem(actionButton.dataset.listId, actionButton.dataset.productId);
      else if (action === 'save-list') saveListForm();
      else if (action === 'delete-list') deleteList(actionButton.dataset.listId);
      else if (action === 'emoji') {
        state.selectedEmoji = actionButton.dataset.emoji;
        overlay.querySelectorAll('.ewl-emoji-option').forEach(button => {
          const selected = button.dataset.emoji === state.selectedEmoji;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      }
    });
    overlay.addEventListener('submit', event => {
      if (event.target && event.target.id === 'ewlListForm') { event.preventDefault(); saveListForm(); }
    });
    document.body.appendChild(overlay);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  }

  function openModal() {
    ensureModal();
    const modal = document.getElementById('ecommeWishlistModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('open');
    window.requestAnimationFrame(() => {
      if (document.getElementById('ecommeWishlistModal') === modal && modal.getAttribute('aria-hidden') === 'false') modal.classList.add('open');
    });
  }

  function closeModal() {
    const modal = document.getElementById('ecommeWishlistModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    state.modalBusy = false;
    state.modalFormMode = null;
    state.modalEditListId = null;
    state.modalFormName = '';
  }

  async function openPicker(productId) {
    const id = safeId(productId);
    if (!id) return;

    state.modalProductId = id;
    state.modalFormMode = null;
    state.modalEditListId = null;
    state.modalFormName = '';
    state.modalBusy = false;
    state.schemaError = null;
    openModal();
    const title = document.getElementById('ewlModalTitle');
    const subtitle = document.getElementById('ewlModalSubtitle');
    if (title) title.textContent = 'Adicionar aos favoritos';
    if (subtitle) subtitle.textContent = 'Escolha a lista onde deseja guardar este produto. Você pode salvar o mesmo produto em listas diferentes.';
    renderModal(true, 'Carregando suas listas...');

    try {
      await ensureClient();
      state.user = await resolveUser();
    } catch (error) {
      state.schemaError = error;
      console.error('[Ecomme listas de desejos] Falha ao carregar a sessão ou o Supabase:', error);
      renderModal(false);
      notify('Não foi possível conectar ao Supabase nesta página.', 'err');
      return;
    }

    if (!state.user) {
      closeModal();
      try {
        if (typeof showAuth === 'function') {
          showAuth('Entre na sua conta para salvar produtos em listas de desejos.', 'Conta necessária', '🔒');
        } else {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
      } catch (_) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      }
      return;
    }

    await refreshState({ user: state.user, showError: true });
    await hydrateProducts([id]);
    if (state.modalProductId !== id) return;
    renderModal();
  }

  async function openSidebarListSelector() {
    state.modalProductId = null;
    state.modalFormMode = null;
    state.modalEditListId = null;
    state.modalFormName = '';
    state.modalBusy = false;
    state.schemaError = null;
    openModal();

    const title = document.getElementById('ewlModalTitle');
    const subtitle = document.getElementById('ewlModalSubtitle');
    if (title) title.textContent = 'Escolher lista de desejos';
    if (subtitle) subtitle.textContent = 'Selecione qual lista deseja visualizar no sidebar.';
    renderModal(true, 'Carregando suas listas...');

    try {
      await ensureClient();
      const user = await resolveUser();
      await refreshState({ user, showError: true });
    } catch (error) {
      state.schemaError = error;
      console.error('[Ecomme listas de desejos] Não foi possível abrir o seletor de listas:', error);
    }

    if (title) title.textContent = 'Escolher lista de desejos';
    if (subtitle) subtitle.textContent = 'Selecione qual lista deseja visualizar no sidebar.';
    renderModal();
  }

  function openListCreator() {
    state.modalProductId = null;
    state.modalFormMode = 'create';
    state.modalEditListId = null;
    state.modalFormName = '';
    state.modalBusy = false;
    state.selectedEmoji = '❤️';
    openModal();
    const title = document.getElementById('ewlModalTitle');
    const subtitle = document.getElementById('ewlModalSubtitle');
    if (title) title.textContent = 'Criar uma lista';
    if (subtitle) subtitle.textContent = 'Escolha um nome e um emoji para organizar seus produtos.';
    renderModal();
  }

  function modalSkeletonMarkup(message) {
    const product = state.modalProductId
      ? '<div class="ewl-skeleton ewl-skeleton-product" aria-hidden="true"></div>'
      : '';
    const rows = [0, 1, 2].map((index) => `
      <div class="ewl-skeleton-choice" aria-hidden="true">
        <span class="ewl-skeleton ewl-skeleton-avatar"></span>
        <div class="ewl-skeleton-main">
          <span class="ewl-skeleton ewl-skeleton-line ${index === 1 ? '' : 'wide'}"></span>
          <span class="ewl-skeleton ewl-skeleton-line short"></span>
        </div>
        <span class="ewl-skeleton ewl-skeleton-button"></span>
      </div>`).join('');
    return `<div class="ewl-loading" role="status" aria-live="polite"><span class="ewl-sr-only">${escapeHtml(message || 'Carregando...')}</span>${product}<div class="ewl-skeleton-stack">${rows}</div><span class="ewl-skeleton ewl-skeleton-create" aria-hidden="true"></span><div class="ewl-skeleton-message">${escapeHtml(message || 'Carregando...')}</div></div>`;
  }

  function renderModal(loading, loadingMessage) {
    const overlay = document.getElementById('ecommeWishlistModal');
    const content = document.getElementById('ewlModalContent');
    const title = document.getElementById('ewlModalTitle');
    const subtitle = document.getElementById('ewlModalSubtitle');
    if (!overlay || !content) return;
    if (state.modalProductId) {
      if (title) title.textContent = 'Adicionar aos favoritos';
      if (subtitle) subtitle.textContent = 'Escolha a lista onde deseja guardar este produto.';
    }
    if (loading) {
      overlay.setAttribute('aria-busy', 'true');
      content.setAttribute('aria-busy', 'true');
      content.innerHTML = modalSkeletonMarkup(loadingMessage || 'Carregando suas listas...');
      return;
    }
    overlay.setAttribute('aria-busy', 'false');
    content.removeAttribute('aria-busy');
    if (state.schemaError) {
      content.innerHTML = `<div class="ewl-error">As listas de desejos ainda não estão disponíveis no banco. Execute o arquivo <strong>supabase/migrations/20261024_multi_wishlist_lists.sql</strong> no SQL Editor do Supabase e recarregue a página.</div>`;
      return;
    }
    if (!state.user) {
      content.innerHTML = '<div class="ewl-empty">Entre na sua conta para gerenciar suas listas.</div>';
      return;
    }

    let formHtml = '';
    if (state.modalFormMode === 'create' || state.modalFormMode === 'edit') {
      const editing = state.modalFormMode === 'edit';
      const list = editing ? state.lists.find(x => String(x.id) === String(state.modalEditListId)) : null;
      const name = state.modalFormName || (editing && list ? list.name : '');
      const emoji = editing && list ? list.emoji : state.selectedEmoji;
      formHtml = `
        <form class="ewl-form" id="ewlListForm">
          <div><label class="ewl-label" for="ewlListName">Nome da lista</label><input class="ewl-input" id="ewlListName" maxlength="50" minlength="2" required value="${escapeHtml(name)}" placeholder="Ex.: Casa nova, Presentes, Viagem"></div>
          <div><span class="ewl-label">Escolha um emoji</span><div class="ewl-emoji-grid">${EMOJIS.map(item => `<button type="button" class="ewl-emoji-option ${item === emoji ? 'selected' : ''}" data-ewl-action="emoji" data-emoji="${escapeHtml(item)}" aria-pressed="${item === emoji}">${item}</button>`).join('')}</div></div>
          <div class="ewl-form-actions"><button type="button" class="ewl-btn" data-ewl-action="cancel-form">Cancelar</button><button type="submit" class="ewl-btn ewl-btn-primary">${editing ? 'Salvar alterações' : 'Criar lista'}</button></div>
        </form>`;
    }

    const product = state.modalProductId ? state.products.get(String(state.modalProductId)) : null;
    const productLine = state.modalProductId ? `<div class="ewl-muted" style="margin:0 0 12px">Produto selecionado: <strong>${escapeHtml(productName(product))}</strong></div>` : '';
    const listsHtml = state.lists.map(list => {
      const items = listItems(list.id);
      const already = state.modalProductId && isSavedInList(list.id, state.modalProductId);
      const action = state.modalProductId ? (already ? 'remove-item' : 'choose-list') : 'choose-list';
      const buttonText = state.modalProductId ? (already ? 'Remover' : 'Adicionar') : 'Abrir lista';
      const listItemsSummary = `${items.length} ${items.length === 1 ? 'produto' : 'produtos'}`;
      return `<div class="ewl-choice"><div class="ewl-choice-main"><span class="ewl-emoji">${escapeHtml(list.emoji || '❤️')}</span><div style="min-width:0"><div class="ewl-choice-title">${escapeHtml(list.name)}</div><div class="ewl-choice-meta">${listItemsSummary}${already ? ' · Este produto já está salvo aqui' : ''}${list.is_default ? ' · Lista padrão' : ''}</div></div></div><button type="button" class="ewl-btn ${already ? 'ewl-btn-danger' : 'ewl-btn-primary'}" data-ewl-action="${action}" data-list-id="${escapeHtml(list.id)}" ${state.modalFormMode ? 'disabled' : ''}>${buttonText}</button></div>`;
    }).join('');

    content.innerHTML = `${productLine}${formHtml}${state.lists.length ? `<div class="ewl-list-stack">${listsHtml}</div>` : '<div class="ewl-empty">Nenhuma lista encontrada.</div>'}${state.modalFormMode ? '' : '<div class="chBottom"><button type="button" class="ewl-btn ewl-full" data-ewl-action="create-toggle"><span style="font-size:16px">＋</span> Criar nova lista</button></div>'}`;
    const nameInput = document.getElementById('ewlListName');
    if (nameInput && state.modalFormMode) nameInput.focus({ preventScroll: true });
  }

  async function chooseList(listId) {
    if (!state.modalProductId) {
      state.settingsListId = String(listId);
      state.activeSidebarListId = String(listId);
      if (state.user) {
        safeStorageSet('ecomme:wishlist:settings:' + state.user.id, state.settingsListId);
        safeStorageSet('ecomme:wishlist:sidebar:' + state.user.id, state.activeSidebarListId);
      }
      closeModal();
      renderSettingsManager();
      renderSidebar();
      return;
    }
    await addItem(listId, state.modalProductId);
  }

  async function addItem(listId, productId) {
    const client = db();
    const id = safeId(productId);
    if (!client || !state.user || !id) return;
    if (isSavedInList(listId, id)) {
      notify('Este produto já está nessa lista.', 'info');
      return;
    }

    state.modalBusy = true;
    renderModal(true, 'Adicionando produto à lista...');
    try {
      const { error } = await client.from('wishlist_items').insert({ list_id: listId, product_id: id });
      if (error) {
        if (error.code === '23505') notify('Este produto já está nessa lista.', 'info');
        else {
          console.error('[Ecomme listas de desejos] Erro ao adicionar produto:', error);
          notify('Não foi possível adicionar o produto. Verifique as permissões do Supabase.', 'err');
        }
        state.modalBusy = false;
        renderModal();
        return;
      }
      await refreshState({ user: state.user });
      state.activeSidebarListId = String(listId);
      safeStorageSet('ecomme:wishlist:sidebar:' + state.user.id, listId);
      state.modalBusy = false;
      notify(`${productName(state.products.get(id))} adicionado à lista ${getListName(listId)}.`, 'ok');
      closeModal();
    } catch (error) {
      state.modalBusy = false;
      console.error('[Ecomme listas de desejos] Erro inesperado ao adicionar produto:', error);
      renderModal();
      notify('Não foi possível adicionar o produto agora.', 'err');
    }
  }

  function getListName(listId) {
    const list = state.lists.find(item => String(item.id) === String(listId));
    return list ? list.name : 'de desejos';
  }

  async function removeItem(listId, productId) {
    const client = db();
    if (!client || !state.user) return;
    const { error } = await client.from('wishlist_items').delete().eq('list_id', listId).eq('product_id', String(productId));
    if (error) {
      console.error('[Ecomme listas de desejos] Erro ao remover produto:', error);
      notify('Não foi possível remover o produto desta lista.', 'err');
      return;
    }
    await refreshState({ user: state.user });
    if (state.modalProductId) renderModal();
    notify('Produto removido da lista.', 'ok');
  }

  async function saveListForm() {
    if (state.modalBusy) return;
    const input = document.getElementById('ewlListName');
    const name = String(input && input.value || state.modalFormName || '').trim().replace(/\s+/g, ' ');
    state.modalFormName = name;
    if (name.length < 2 || name.length > 50) {
      notify('Digite um nome de 2 a 50 caracteres.', 'err');
      if (input) input.focus();
      return;
    }
    if (!EMOJIS.includes(state.selectedEmoji)) state.selectedEmoji = '❤️';
    const client = db();
    if (!client || !state.user) return;

    state.modalBusy = true;
    renderModal(true, state.modalFormMode === 'edit' ? 'Salvando alterações...' : 'Criando sua lista...');
    try {
      if (state.modalFormMode === 'edit') {
        const listId = state.modalEditListId;
        const { error } = await client.from('wishlist_lists').update({ name, emoji: state.selectedEmoji }).eq('id', listId).eq('user_id', state.user.id);
        if (error) throw error;
        await refreshState({ user: state.user });
        state.modalBusy = false;
        state.modalFormMode = null;
        state.modalEditListId = null;
        state.modalFormName = '';
        renderModal();
        notify('Lista atualizada.', 'ok');
        return;
      }

      if (state.lists.length >= 30) {
        state.modalBusy = false;
        renderModal();
        notify('Você atingiu o limite de 30 listas de desejos.', 'err');
        return;
      }
      const { data, error } = await client.from('wishlist_lists').insert({ user_id: state.user.id, name, emoji: state.selectedEmoji, is_default: false }).select('id,name,emoji,is_default').single();
      if (error) throw error;
      const newListId = data.id;
      await refreshState({ user: state.user });
      state.modalBusy = false;
      if (state.modalProductId) {
        state.modalFormMode = null;
        state.modalFormName = '';
        await addItem(newListId, state.modalProductId);
        return;
      }
      state.settingsListId = String(newListId);
      state.activeSidebarListId = String(newListId);
      safeStorageSet('ecomme:wishlist:settings:' + state.user.id, newListId);
      safeStorageSet('ecomme:wishlist:sidebar:' + state.user.id, newListId);
      state.modalFormMode = null;
      state.modalFormName = '';
      closeModal();
      renderSettingsManager();
      renderSidebar();
      notify(`Lista “${name}” criada.`, 'ok');
    } catch (error) {
      state.modalBusy = false;
      console.error('[Ecomme listas de desejos] Erro ao salvar lista:', error);
      renderModal();
      notify(error && error.code === '23505' ? 'Você já tem uma lista com esse nome.' : (state.modalFormMode === 'edit' ? 'Não foi possível atualizar a lista.' : 'Não foi possível criar a lista.'), 'err');
    }
  }

  async function deleteList(listId) {
    const list = state.lists.find(item => String(item.id) === String(listId));
    if (!list || list.is_default) {
      notify('A lista padrão não pode ser excluída.', 'err');
      return;
    }
    const itemCount = listItems(listId).length;
    const confirmed = window.confirm(`Excluir a lista “${list.name}”?${itemCount ? ` Os ${itemCount} produtos serão removidos somente desta lista.` : ''} Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    const client = db();
    const { error } = await client.from('wishlist_lists').delete().eq('id', listId).eq('user_id', state.user.id);
    if (error) {
      console.error('[Ecomme listas de desejos] Erro ao excluir lista:', error);
      notify('Não foi possível excluir a lista.', 'err');
      return;
    }
    if (state.modalEditListId === String(listId)) closeModal();
    await refreshState({ user: state.user });
    notify('Lista excluída.', 'ok');
  }

  function updateSidebarListTitle() {
    const title = document.getElementById('favListTitle');
    if (!title) return;
    const selectedList = state.lists.find(item => String(item.id) === String(state.activeSidebarListId))
      || state.lists.find(item => item.is_default)
      || state.lists[0];
    title.textContent = state.user && selectedList
      ? `${selectedList.emoji || '❤️'} ${selectedList.name || 'Lista de Desejos'}`
      : 'Lista de Desejos';
  }

  function renderSidebar() {
    const el = document.getElementById('favItems');
    if (!el || !document.getElementById('favSidebar')) return;
    updateSidebarListTitle();
    if (state.schemaError) {
      el.innerHTML = `<div class="ewl-empty"><span>🗂️</span>Para usar várias listas de desejos, execute a migração SQL do projeto no Supabase.</div>`;
      return;
    }
    if (!state.user) {
      el.innerHTML = `<div class="ewl-empty"><span>🔒</span>Entre na sua conta para acessar suas listas de desejos.</div>`;
      return;
    }
    if (!state.lists.length) {
      el.innerHTML = '<div class="ewl-empty"><span>❤️</span>Carregando suas listas...</div>';
      return;
    }
    if (!state.lists.some(list => String(list.id) === String(state.activeSidebarListId))) state.activeSidebarListId = defaultListId();
    const list = state.lists.find(item => String(item.id) === String(state.activeSidebarListId));
    updateSidebarListTitle();
    const items = listItems(state.activeSidebarListId);
    const selects = state.lists.map(item => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(state.activeSidebarListId) ? 'selected' : ''}>${escapeHtml(item.emoji || '❤️')} ${escapeHtml(item.name)} (${listItems(item.id).length})</option>`).join('');
    const toolbar = `<div class="ewl-sidebar-tools"><select aria-label="Selecionar lista de desejos" data-ewl-sidebar-select>${selects}</select><button type="button" class="ewl-btn" data-ewl-action="sidebar-create" title="Criar lista" aria-label="Criar lista">＋</button></div>`;
    const content = items.map(item => {
      const product = state.products.get(String(item.product_id)) || { id: item.product_id, name: 'Produto indisponível', price: 0, emoji: '📦' };
      const image = productImage(product);
      const unavailable = typeof isProductUnavailable === 'function' ? isProductUnavailable(product) : false;
      return `<article class="ewl-side-product"><a class="ewl-side-img" href="/product/${encodeURIComponent(item.product_id)}/" aria-label="Ver ${escapeHtml(productName(product))}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : `<span>${escapeHtml(product.emoji || '📦')}</span>`}</a><div class="ewl-side-info"><div class="ewl-side-name">${escapeHtml(productName(product))}</div><div class="ewl-side-price">${formatPrice(productPrice(product))}</div>${unavailable ? '<div class="ewl-muted">Indisponível</div>' : `<button type="button" class="ewl-btn" style="margin-top:6px;padding:6px 8px" data-ewl-action="sidebar-cart" data-product-id="${escapeHtml(item.product_id)}">Adicionar ao carrinho</button>`}</div><div class="ewl-side-actions"><button type="button" class="ewl-icon-btn" data-ewl-action="sidebar-remove" data-product-id="${escapeHtml(item.product_id)}" title="Remover desta lista" aria-label="Remover desta lista">×</button></div></article>`;
    }).join('');
    el.innerHTML = toolbar + (content || `<div class="ewl-empty"><span>${escapeHtml(list ? list.emoji : '❤️')}</span>${list ? `Sua lista “${escapeHtml(list.name)}” ainda está vazia.` : 'Sua lista está vazia.'}<br><span style="font-size:12px">Clique no coração de um produto para adicioná-lo.</span></div>`);

    const activeCount = items.length;
    const total = items.reduce((sum, item) => sum + productPrice(state.products.get(String(item.product_id))), 0);
    const countEl = document.getElementById('favCount');
    const totalEl = document.getElementById('favTotal');
    if (countEl) countEl.textContent = `(${activeCount})`;
    if (totalEl) totalEl.textContent = formatPrice(total);
    const badge = document.getElementById('wishBadge');
    if (badge) { badge.textContent = String(productIdsForAllLists().length); badge.style.display = productIdsForAllLists().length ? 'flex' : 'none'; }
  }

  function renderSettingsManager() {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;
    const parent = grid.parentElement;
    if (!parent) return;
    let toolbar = document.getElementById('ewlSettingsToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'ewlSettingsToolbar';
      toolbar.className = 'ewl-settings-toolbar';
      parent.insertBefore(toolbar, grid);
    }
    if (state.schemaError) {
      toolbar.innerHTML = '<div class="ewl-error">Execute a migração <strong>supabase/migrations/20261024_multi_wishlist_lists.sql</strong> no SQL Editor do Supabase para ativar as listas múltiplas.</div>';
      grid.innerHTML = '';
      return;
    }
    if (!state.user) {
      toolbar.innerHTML = '';
      grid.innerHTML = '<div class="ewl-empty"><span>🔒</span>Entre na sua conta para ver suas listas de desejos.</div>';
      return;
    }
    if (!state.lists.length) {
      toolbar.innerHTML = '';
      grid.innerHTML = '<div class="ewl-empty"><span>⏳</span>Carregando listas...</div>';
      return;
    }
    if (!state.lists.some(list => String(list.id) === String(state.settingsListId))) state.settingsListId = defaultListId();
    const selected = state.lists.find(list => String(list.id) === String(state.settingsListId));
    const items = listItems(state.settingsListId);
    toolbar.innerHTML = `<div class="ewl-settings-lists">${state.lists.map(list => `<button type="button" class="ewl-list-chip ${String(list.id) === String(state.settingsListId) ? 'selected' : ''}" data-ewl-action="settings-select-list" data-list-id="${escapeHtml(list.id)}"><span>${escapeHtml(list.emoji || '❤️')}</span><span>${escapeHtml(list.name)}</span><small>${listItems(list.id).length}</small></button>`).join('')}</div><button type="button" class="ewl-btn ewl-btn-primary" data-ewl-action="settings-create"><span>＋</span> Criar lista</button>`;
    const detail = document.createElement('div');
    detail.className = 'ewl-settings-detail';
    detail.innerHTML = `<span class="ewl-emoji">${escapeHtml(selected.emoji || '❤️')}</span><div class="ewl-settings-detail-main"><strong>${escapeHtml(selected.name)}</strong><small>${items.length} ${items.length === 1 ? 'produto salvo' : 'produtos salvos'}${selected.is_default ? ' · Lista padrão' : ''}</small></div><div class="ewl-settings-actions"><button type="button" class="ewl-btn" data-ewl-action="settings-edit-list" data-list-id="${escapeHtml(selected.id)}">Renomear / emoji</button>${selected.is_default ? '' : `<button type="button" class="ewl-btn ewl-btn-danger" data-ewl-action="settings-delete-list" data-list-id="${escapeHtml(selected.id)}">Excluir lista</button>`}</div>`;
    const oldDetail = document.getElementById('ewlSettingsDetail');
    if (oldDetail) oldDetail.remove();
    detail.id = 'ewlSettingsDetail';
    toolbar.insertAdjacentElement('afterend', detail);

    if (!items.length) {
      grid.innerHTML = `<div class="ewl-empty" style="grid-column:1/-1"><span>${escapeHtml(selected.emoji || '❤️')}</span>A lista “${escapeHtml(selected.name)}” ainda está vazia.<br><span style="font-size:12px">Explore os produtos e toque no coração para adicioná-los a uma das suas listas.</span><br><a class="ewl-btn ewl-btn-primary" style="margin-top:12px;text-decoration:none" href="/products">Explorar produtos</a></div>`;
    } else {
      grid.innerHTML = items.map(item => {
        const product = state.products.get(String(item.product_id)) || { id: item.product_id, name: 'Produto indisponível', price: 0, emoji: '📦' };
        const img = productImage(product);
        const price = productPrice(product);
        const oldPrice = Number(product.old_price || product.old || product.original_price || 0);
        const category = product.category || product.category_name || product.cat || product.categoria || 'Produto';
        return `<article class="wcard" data-product-id="${escapeHtml(item.product_id)}"><a class="wcard-img" href="/product/${encodeURIComponent(item.product_id)}/" style="display:flex;align-items:center;justify-content:center;text-decoration:none">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(productName(product))}" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : `<span>${escapeHtml(product.emoji || '📦')}</span>`}<button type="button" class="wcard-rm" data-ewl-action="settings-remove-item" data-product-id="${escapeHtml(item.product_id)}" title="Remover desta lista" aria-label="Remover ${escapeHtml(productName(product))}">×</button></a><div class="wcard-info"><div class="wcard-cat">${escapeHtml(Array.isArray(category) ? category.join(', ') : category)}</div><div class="wcard-name">${escapeHtml(productName(product))}</div><div><span class="wcard-price">${formatPrice(price)}</span>${oldPrice > price ? `<span class="wcard-old">${formatPrice(oldPrice)}</span>` : ''}</div><div class="ewl-settings-product-actions"><button type="button" class="ewl-btn" data-ewl-action="settings-remove-item" data-product-id="${escapeHtml(item.product_id)}">Remover</button><button type="button" class="ewl-btn ewl-btn-primary" data-ewl-action="settings-add-cart" data-product-id="${escapeHtml(item.product_id)}">Adicionar ao carrinho</button></div></div></article>`;
      }).join('');
    }
    const countEl = document.getElementById('wishlistCount');
    if (countEl) countEl.textContent = `${items.length} ${items.length === 1 ? 'produto salvo' : 'produtos salvos'}`;
    const sideBadge = document.getElementById('sWishlistBadge');
    if (sideBadge) { sideBadge.textContent = String(productIdsForAllLists().length); sideBadge.style.display = productIdsForAllLists().length ? 'block' : 'none'; }
    const topButton = document.getElementById('wishTopButton');
    if (topButton) topButton.onclick = () => addSelectedListToCart(state.settingsListId);
  }

  async function addSelectedListToCart(listId) {
    const items = listItems(listId);
    if (!items.length) { notify('Esta lista está vazia.', 'info'); return; }
    let count = 0;
    for (const item of items) {
      const product = state.products.get(String(item.product_id));
      const unavailable = product && typeof isProductUnavailable === 'function' ? isProductUnavailable(product) : false;
      if (unavailable) continue;
      try {
        if (typeof addToCart === 'function') { addToCart(String(item.product_id), 1); count++; }
      } catch (error) { console.error(error); }
    }
    if (count) notify(`${count} produto(s) adicionados ao carrinho.`, 'ok');
    else notify('Nenhum produto disponível para adicionar ao carrinho.', 'info');
  }

  async function removeFromActiveList(productId) {
    const listId = state.activeSidebarListId || defaultListId();
    if (!listId) return openPicker(productId);
    await removeItem(listId, productId);
  }

  function openFavSidebar() {
    try { if (typeof closeMore === 'function') closeMore(); } catch (_) {}
    try { if (typeof closeCart === 'function') closeCart(); } catch (_) {}
    try { if (typeof closeNotif === 'function') closeNotif(); } catch (_) {}
    try { if (typeof closeAcc === 'function') closeAcc(); } catch (_) {}
    const sidebar = document.getElementById('favSidebar');
    const overlay = document.getElementById('favOverlay');
    if (sidebar) sidebar.classList.add('on');
    if (overlay) overlay.classList.add('on');
    document.body.classList.add('nobodyscroll');
    renderSidebar();
    if (!state.user || !state.lists.length) refreshState();
  }

  function closeFavSidebar() {
    const sidebar = document.getElementById('favSidebar');
    const overlay = document.getElementById('favOverlay');
    if (sidebar) sidebar.classList.remove('on');
    if (overlay) overlay.classList.remove('on');
    document.body.classList.remove('nobodyscroll');
  }

  function handleGlobalClick(event) {
    const actionButton = event.target.closest('[data-ewl-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.ewlAction;
    if (action === 'sidebar-create' || action === 'settings-create') { event.preventDefault(); openListCreator(); }
    else if (action === 'sidebar-remove') { event.preventDefault(); removeFromActiveList(actionButton.dataset.productId); }
    else if (action === 'sidebar-cart' || action === 'settings-add-cart') {
      event.preventDefault();
      const id = actionButton.dataset.productId;
      try { if (typeof addToCart === 'function') addToCart(String(id), 1); else notify('O carrinho não está disponível nesta página.', 'err'); }
      catch (error) { console.error(error); }
    }
    else if (action === 'settings-select-list') {
      event.preventDefault();
      state.settingsListId = String(actionButton.dataset.listId);
      if (state.user) safeStorageSet('ecomme:wishlist:settings:' + state.user.id, state.settingsListId);
      renderSettingsManager();
    }
    else if (action === 'settings-edit-list') { event.preventDefault(); state.modalProductId = null; state.modalFormMode = 'edit'; state.modalEditListId = actionButton.dataset.listId; const list = state.lists.find(x => String(x.id) === String(state.modalEditListId)); state.modalFormName = list ? list.name : ''; state.modalBusy = false; state.selectedEmoji = list ? list.emoji : '❤️'; openModal(); const title = document.getElementById('ewlModalTitle'); const subtitle = document.getElementById('ewlModalSubtitle'); if (title) title.textContent = 'Editar lista'; if (subtitle) subtitle.textContent = 'Altere o nome ou o emoji da sua lista.'; renderModal(); }
    else if (action === 'settings-delete-list') { event.preventDefault(); deleteList(actionButton.dataset.listId); }
    else if (action === 'settings-remove-item') { event.preventDefault(); removeItem(state.settingsListId, actionButton.dataset.productId).then(() => renderSettingsManager()); }
  }

  function handleGlobalChange(event) {
    const select = event.target.closest('[data-ewl-sidebar-select]');
    if (!select) return;
    state.activeSidebarListId = String(select.value);
    if (state.user) safeStorageSet('ecomme:wishlist:sidebar:' + state.user.id, state.activeSidebarListId);
    renderSidebar();
  }

  async function syncCartToSupabase() {
    const client = db();
    if (!client || !state.user) return;
    try {
      let cartToSave = [];
      try { if (typeof cart !== 'undefined' && Array.isArray(cart)) cartToSave = cart.map(item => ({ id: String(item.id), qty: Number(item.qty) || 1 })); } catch (_) {}
      const { error } = await client.from('profiles').update({ cart: cartToSave }).eq('id', state.user.id);
      if (error) console.error('[Ecomme] Não foi possível sincronizar o carrinho:', error);
    } catch (error) { console.error('[Ecomme] Erro ao sincronizar o carrinho:', error); }
  }

  function installOverrides() {
    window.EcommeWishlists = {
      refresh: refreshState,
      openPicker,
      openListSelector: openSidebarListSelector,
      createList: openListCreator,
      selectSidebarList: id => {
        state.activeSidebarListId = String(id);
        if (state.user) safeStorageSet('ecomme:wishlist:sidebar:' + state.user.id, state.activeSidebarListId);
        renderSidebar();
      },
      getLists: () => state.lists.slice(),
      getItems: () => state.items.slice(),
      removeFromActiveList,
      openFav: openFavSidebar,
      closeFav: closeFavSidebar,
      addAllToCart: () => addSelectedListToCart(state.activeSidebarListId || defaultListId()),
      updateSidebar: () => { syncLegacyFavoriteCache(); renderSidebar(); syncFavoriteUI(); },
      syncToSupabase: syncCartToSupabase
    };
    window.toggleFav = function (id) { return openPicker(id); };
    window.addToFav = function (id) { return openPicker(id); };
    window.removeFromFav = function (id) { return removeFromActiveList(id); };
    window.changeFavQty = function () { notify('A quantidade não se aplica a listas de desejos; o produto pode estar em várias listas.', 'info'); };
    window.updateFav = function () { syncLegacyFavoriteCache(); renderSidebar(); syncFavoriteUI(); };
    window.updateCartWishButtons = syncFavoriteUI;
    window.openFav = openFavSidebar;
    window.closeFav = closeFavSidebar;
    window.openToggleFav = openSidebarListSelector;
    window.addAllFavToCart = function () { return addSelectedListToCart(state.activeSidebarListId || defaultListId()); };
    window.loadWishlist = async function () { await refreshState(); renderSettingsManager(); };
    window.removeWishlistProduct = function (productId, productNameValue) {
      const listId = state.settingsListId || defaultListId();
      return removeItem(listId, productId).then(() => {
        renderSettingsManager();
        notify(`${productNameValue || 'Produto'} removido desta lista.`, 'ok');
      });
    };
    window.syncToSupabase = syncCartToSupabase;
    window.toggleWishlist = function (id) { return openPicker(id); };
    window.toggleWish = function (id) { return openPicker(id); };
  }

  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    //ensureStyles();
    installOverrides();
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);

    try {
      await ensureClient();
      await refreshState();
    } catch (error) {
      state.schemaError = error;
      console.error('[Ecomme listas de desejos] Não foi possível iniciar o sistema:', error);
      renderSidebar();
      renderSettingsManager();
    }
    const client = db();
    let realtimeChannel = null;
    const connectRealtime = user => {
      if (!client || typeof client.channel !== 'function') return;
      if (realtimeChannel) { try { client.removeChannel(realtimeChannel); } catch (_) {} realtimeChannel = null; }
      if (!user) return;
      realtimeChannel = client.channel('ecomme-wishlist-' + user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_lists', filter: 'user_id=eq.' + user.id }, () => refreshState({ user: state.user }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items' }, () => refreshState({ user: state.user }))
        .subscribe();
    };
    if (client && client.auth && typeof client.auth.onAuthStateChange === 'function') {
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          const user = session && session.user ? session.user : null;
          refreshState({ user }).then(() => connectRealtime(user));
        }
      });
    }
    connectRealtime(state.user);
    state.initialized = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
