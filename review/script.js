/* ECOMME — criar/editar avaliação em /review/?product_id=... */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const productId = String(params.get('product_id') || '').trim();

  let currentUser = null;
  let product = null;
  let existingReview = null;
  let selectedRating = 0;
  let saving = false;

  const form = $('reviewForm');
  const submitButton = $('submitReview');
  const submitLabel = $('submitLabel');
  const starButtons = Array.from(document.querySelectorAll('.rate-star'));

  function setStatus(message, type = 'info') {
    const status = $('reviewStatus');
    status.textContent = message;
    status.className = `review-status ${type}`;
    status.hidden = !message;
  }

  function setBusy(busy, label) {
    submitButton.disabled = busy;
    submitLabel.textContent = label;
  }

  function escapeRedirect(url) {
    return `/login?redirect=${encodeURIComponent(url)}`;
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getProductImage(item) {
    const candidates = [];
    if (item?.image_url) candidates.push(item.image_url);

    let gallery = item?.gallery_urls;
    if (typeof gallery === 'string') {
      try { gallery = JSON.parse(gallery); } catch (_) { gallery = []; }
    }
    if (Array.isArray(gallery)) candidates.push(...gallery);

    for (const value of candidates) {
      if (typeof value !== 'string' || !value.trim()) continue;
      try {
        const url = new URL(value.trim(), window.location.origin);
        if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
      } catch (_) {}
    }
    return '';
  }

  function renderProduct(item) {
    $('reviewProductName').textContent = item.name || 'Produto';
    $('reviewProductCategory').textContent = item.cat || item.category || 'Categoria não informada';
    $('reviewProductPrice').textContent = item.price == null ? '' : formatPrice(item.price);

    const imageUrl = getProductImage(item);
    const image = $('reviewProductImage');
    const fallback = $('reviewProductFallback');

    if (imageUrl) {
      image.src = imageUrl;
      image.hidden = false;
      fallback.hidden = true;
      image.addEventListener('error', () => {
        image.hidden = true;
        fallback.hidden = false;
      }, { once: true });
    } else {
      image.hidden = true;
      fallback.hidden = false;
    }

    const productUrl = `/product/${encodeURIComponent(String(item.id))}/`;
    $('backProductLink').href = productUrl;
    $('cancelReview').href = productUrl;
    document.title = `Avaliar ${item.name || 'produto'} | Ecomme`;
  }

  function renderRating() {
    starButtons.forEach(button => {
      const value = Number(button.dataset.rating);
      const active = value <= selectedRating;
      button.classList.toggle('on', active);
      button.setAttribute('aria-checked', String(value === selectedRating));
      button.tabIndex = value === selectedRating || (!selectedRating && value === 1) ? 0 : -1;
    });

    const hints = {
      0: 'Selecione de 1 a 5 estrelas.',
      1: 'Muito ruim',
      2: 'Não gostei',
      3: 'Regular',
      4: 'Gostei',
      5: 'Adorei!'
    };
    $('ratingHint').textContent = hints[selectedRating];
  }

  function updateCounters() {
    $('titleCount').textContent = `${$('reviewTitle').value.length}/120`;
    $('commentCount').textContent = `${$('reviewComment').value.length}/3000`;
  }

  function safeProductId() {
    return product && String(product.id) === productId;
  }

  async function loadProduct() {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('O produto não foi encontrado. Verifique o link e tente novamente.');

    product = data;
    renderProduct(data);
  }

  async function loadCurrentReview() {
    const { data, error } = await supabaseClient
      .from('product_reviews')
      .select('id,product_id,user_id,rating,title,comment,created_at')
      .eq('product_id', productId)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) throw error;
    existingReview = data || null;

    if (existingReview) {
      selectedRating = Number(existingReview.rating) || 0;
      $('reviewTitle').value = existingReview.title || '';
      $('reviewComment').value = existingReview.comment || '';
      $('pageTitle').textContent = 'Edite sua avaliação';
      $('reviewMode').textContent = 'Editar avaliação';
      submitLabel.textContent = 'Salvar alterações';
    } else {
      selectedRating = 0;
      $('pageTitle').textContent = 'Avalie sua experiência';
      $('reviewMode').textContent = 'Nova avaliação';
      submitLabel.textContent = 'Publicar avaliação';
    }

    renderRating();
    updateCounters();
    setBusy(false, existingReview ? 'Salvar alterações' : 'Publicar avaliação');
  }

  async function initialize() {
    if (!productId) {
      setBusy(true, 'Produto não informado');
      setStatus('Abra esta página pelo botão “Escrever avaliação” de uma página de produto.', 'error');
      $('reviewProductName').textContent = 'Nenhum produto selecionado';
      return;
    }

    setBusy(true, 'Verificando conta…');

    const { data, error } = await supabaseClient.auth.getUser();
    if (error) console.warn('Não foi possível confirmar a sessão Supabase:', error);

    currentUser = data?.user || null;
    if (!currentUser) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(escapeRedirect(next));
      return;
    }

    try {
      await loadProduct();
      await loadCurrentReview();
    } catch (error) {
      console.error('Erro ao preparar a avaliação:', error);
      setBusy(true, 'Não foi possível carregar');
      setStatus(
        error?.message?.includes('product_reviews')
          ? 'A tabela de avaliações ainda não está configurada no Supabase. Aplique o arquivo supabase/product-reviews.sql.'
          : (error.message || 'Não foi possível preparar esta avaliação. Tente novamente.'),
        'error'
      );
    }
  }

  starButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedRating = Number(button.dataset.rating) || 0;
      renderRating();
    });
  });

  $('ratingStars').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') selectedRating = 1;
    else if (event.key === 'End') selectedRating = 5;
    else if (event.key === 'ArrowRight') selectedRating = Math.min(5, Math.max(1, selectedRating + 1));
    else selectedRating = Math.max(1, selectedRating - 1);
    renderRating();
    starButtons.find(button => Number(button.dataset.rating) === selectedRating)?.focus();
  });

  $('reviewTitle').addEventListener('input', updateCounters);
  $('reviewComment').addEventListener('input', updateCounters);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;

    if (!currentUser || !safeProductId()) {
      setStatus('Sua sessão expirou ou o produto não está disponível. Atualize a página e tente novamente.', 'error');
      return;
    }

    const title = $('reviewTitle').value.trim();
    const comment = $('reviewComment').value.trim();

    if (selectedRating < 1 || selectedRating > 5) {
      setStatus('Selecione uma nota de 1 a 5 estrelas.', 'error');
      return;
    }
    if (comment.length < 5) {
      setStatus('Escreva um comentário com pelo menos 5 caracteres.', 'error');
      $('reviewComment').focus();
      return;
    }
    if (title.length > 120 || comment.length > 3000) {
      setStatus('O título ou comentário ultrapassou o limite permitido.', 'error');
      return;
    }

    saving = true;
    setBusy(true, 'Salvando…');
    setStatus('');

    const payload = {
      product_id: productId,
      user_id: currentUser.id,
      rating: selectedRating,
      title,
      comment
    };

    try {
      let result;
      if (existingReview) {
        result = await supabaseClient
          .from('product_reviews')
          .update({
            rating: payload.rating,
            title: payload.title,
            comment: payload.comment
          })
          .eq('id', existingReview.id)
          .eq('user_id', currentUser.id)
          .select('id')
          .single();
      } else {
        result = await supabaseClient
          .from('product_reviews')
          .insert(payload)
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      setStatus('Sua avaliação foi salva! Voltando ao produto…', 'success');
      submitLabel.textContent = 'Salvo ✓';

      const target = `/product/${encodeURIComponent(productId)}/#tab-reviews`;
      setTimeout(() => { window.location.href = target; }, 650);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      if (error?.code === '23505') {
        setStatus('Você já avaliou este produto. Atualize a página para editar sua avaliação.', 'error');
      } else if (error?.code === '42P01' || /product_reviews/i.test(error?.message || '')) {
        setStatus('A tabela de avaliações ainda não está configurada. Execute supabase/product-reviews.sql no SQL Editor do Supabase.', 'error');
      } else if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message || '')) {
        setStatus('O Supabase bloqueou esta ação pelas políticas de segurança. Confira as políticas RLS do arquivo SQL.', 'error');
      } else {
        setStatus(error?.message || 'Não foi possível salvar sua avaliação. Tente novamente.', 'error');
      }
    } finally {
      saving = false;
      if (!submitLabel.textContent.includes('Salvo')) {
        setBusy(false, existingReview ? 'Salvar alterações' : 'Publicar avaliação');
      }
    }
  });

  initialize();
})();
