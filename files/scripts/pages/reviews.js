/* ECOMME — Minhas Avaliações ligadas ao Supabase */
(() => {
const $ = id => document.getElementById(id);

let reviews = [];
let currentStarFilter = 0;
let editingId = null;
let editingRatingValue = 0;
let deletingId = null;
let expandedComments = new Set();
let reviewsLoadError = null;

const monthNames = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro'
];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, '&#96;');
}
function formatDate(iso) {
  if (!iso) return 'Data não informada';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return 'Data não informada';
  return `${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
}
function starsSVG(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<svg class="${i <= rating ? 'on' : 'off'}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  }
  return html;
}
function emojiForCategory(category) {
  const c = String(category || '').toLowerCase();
  if (/eletr|comput|tech|celular/.test(c)) return '⌚';
  if (/moda|roup|calçado|tênis/.test(c)) return '👟';
  if (/beleza|skin|cosm/.test(c)) return '✨';
  if (/casa|decora|cozinha/.test(c)) return '🏡';
  if (/fitness|esport|academ/.test(c)) return '🏃';
  return '🛍️';
}
function mapReview(row) {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    product: row.product_name || 'Produto',
    category: row.product_category || 'Produto',
    emoji: emojiForCategory(row.product_category),
    productImage: row.product_image || '',
    rating: Number(row.rating) || 0,
    dateISO: row.created_at || row.updated_at || '',
    title: row.title || '',
    comment: row.comment || '',
    photos: 0,
    link: `/product/${encodeURIComponent(String(row.product_id))}/`
  };
}
function computeStats() {
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentCount = reviews.filter(r => {
    const d = new Date(r.dateISO);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  }).length;
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[5 - r.rating]++; });
  return { total, avg, recentCount, dist };
}
function countUp(el, target, decimals = 0, duration = 500) {
  if (!el) return;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent = decimals ? val.toFixed(decimals).replace('.', ',') : String(Math.round(val));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = decimals ? target.toFixed(decimals).replace('.', ',') : String(target);
  }
  requestAnimationFrame(tick);
}
function renderHeroStats() {
  const s = computeStats();
  countUp($('statTotal'), s.total);
  countUp($('statAvg'), s.avg, 1, 550);
  countUp($('statMonth'), s.recentCount);
  const distWrap = $('distWrap');
  if (!distWrap) return;
  distWrap.innerHTML = [5, 4, 3, 2, 1].map((star, i) => {
    const count = s.dist[i];
    const pct = s.total ? Math.round(count / s.total * 100) : 0;
    return `<div class="dist-row">
      <span class="dist-label">${star} <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
      <div class="dist-track"><div class="dist-fill" style="--w:${pct}%;animation-delay:${.12 + i * .05}s"></div></div>
      <span class="dist-count">${count}</span>
    </div>`;
  }).join('');
}
function renderStarFilters() {
  const stats = computeStats();
  const counts = { 0: stats.total, 5: stats.dist[0], 4: stats.dist[1], 3: stats.dist[2], 2: stats.dist[3], 1: stats.dist[4] };
  const wrap = $('starFilters');
  const pill = $('sfPillBg');
  if (!wrap || !pill) return;

  wrap.querySelectorAll('.sf-btn').forEach(button => button.remove());
  [{v:0,label:'Todas'},{v:5,label:'5'},{v:4,label:'4'},{v:3,label:'3'},{v:2,label:'2'},{v:1,label:'1'}].forEach(def => {
    const button = document.createElement('button');
    button.className = 'sf-btn' + (currentStarFilter === def.v ? ' active' : '');
    button.dataset.v = String(def.v);
    button.innerHTML = def.v === 0
      ? `Todas <span class="cnt">(${counts[0]})</span>`
      : `${def.label}<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="cnt">${counts[def.v]}</span>`;
    button.onclick = () => {
      currentStarFilter = def.v;
      renderStarFilters();
      renderReviews();
    };
    wrap.appendChild(button);
  });

  requestAnimationFrame(() => {
    const active = wrap.querySelector('.sf-btn.active');
    if (!active) return;
    const wrapRect = wrap.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    pill.style.left = `${rect.left - wrapRect.left}px`;
    pill.style.width = `${rect.width}px`;
  });
}
window.addEventListener('resize', () => {
  const wrap = $('starFilters');
  const active = wrap?.querySelector('.sf-btn.active');
  const pill = $('sfPillBg');
  if (!wrap || !active || !pill) return;
  const wrapRect = wrap.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  pill.style.left = `${rect.left - wrapRect.left}px`;
  pill.style.width = `${rect.width}px`;
});

function getFilteredSorted() {
  const q = ($('searchInput')?.value || '').toLowerCase().trim();
  const sort = $('sortSelect')?.value || 'recent';
  const list = reviews.filter(r => {
    const product = String(r.product || '').toLowerCase();
    const comment = String(r.comment || '').toLowerCase();
    const title = String(r.title || '').toLowerCase();
    const matchesQuery = !q || product.includes(q) || comment.includes(q) || title.includes(q);
    const matchesStars = currentStarFilter === 0 || r.rating === currentStarFilter;
    return matchesQuery && matchesStars;
  });

  if (sort === 'recent') list.sort((a,b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  else if (sort === 'oldest') list.sort((a,b) => String(a.dateISO).localeCompare(String(b.dateISO)));
  else if (sort === 'highest') list.sort((a,b) => b.rating - a.rating || String(b.dateISO).localeCompare(String(a.dateISO)));
  else if (sort === 'lowest') list.sort((a,b) => a.rating - b.rating || String(b.dateISO).localeCompare(String(a.dateISO)));
  return list;
}
function renderReviews() {
  const list = getFilteredSorted();
  const results = $('resultsCount');
  const grid = $('reviewsGrid');
  if (!grid || !results) return;

  results.innerHTML = `<strong>${list.length}</strong> avaliaç${list.length === 1 ? 'ão' : 'ões'} encontrada${list.length === 1 ? '' : 's'}`;

  if (reviewsLoadError) {
    grid.innerHTML = `<div class="empty-state"><h3>Não foi possível carregar suas avaliações</h3><p>${escapeHTML(reviewsLoadError)}</p><a class="btn-empty-cta" href="/products">Voltar aos produtos</a></div>`;
    return;
  }
  if (!reviews.length) {
    grid.innerHTML = emptyStateNoReviews();
    return;
  }
  if (!list.length) {
    grid.innerHTML = emptyStateNoResults();
    return;
  }

  grid.innerHTML = list.map((r, i) => {
    const long = r.comment.length > 160;
    const expanded = expandedComments.has(r.id);
    const comment = long && !expanded ? `${r.comment.slice(0,160).trim()}…` : r.comment;
    const more = long
      ? `<button type="button" class="more-btn" onclick="toggleComment('${escapeAttr(r.id)}')">${expanded ? 'ver menos' : 'ver mais'}</button>`
      : '';
    const titleHtml = r.title ? `<div class="rc-title">${escapeHTML(r.title)}</div>` : '';
    const thumb = r.productImage
      ? `<img src="${escapeAttr(r.productImage)}" alt="" loading="lazy" decoding="async">`
      : escapeHTML(r.emoji);
    const id = escapeAttr(r.id);

    return `<article class="rcard" id="rcard-${id}" style="animation-delay:${Math.min(i,8)*0.04}s">
      <div class="rc-top">
        <div class="rc-thumb">${thumb}</div>
        <div class="rc-head">
          <div class="rc-name">${escapeHTML(r.product)}</div>
          <span class="rc-cat">${escapeHTML(r.category)}</span>
        </div>
        <span class="rc-date">${escapeHTML(formatDate(r.dateISO))}</span>
      </div>
      <div class="rc-stars" aria-label="${r.rating} de 5 estrelas">${starsSVG(r.rating)}</div>
      ${titleHtml}
      <div class="rc-comment">${escapeHTML(comment)} ${more}</div>
      <hr class="rc-divider">
      <div class="rc-foot">
        <a class="rc-view-link" href="${escapeAttr(r.link)}">
          Ver produto
          <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
        </a>
        <div class="rc-actions">
          <button type="button" class="rc-act-btn edit" title="Editar avaliação" aria-label="Editar avaliação" onclick="openEditModal('${id}')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="rc-act-btn del" title="Excluir avaliação" aria-label="Excluir avaliação" onclick="openDeleteModal('${id}')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
}
function toggleComment(id) {
  if (expandedComments.has(String(id))) expandedComments.delete(String(id));
  else expandedComments.add(String(id));
  renderReviews();
}
function emptyStateNoReviews() {
  return `<div class="empty-state">
    <div class="empty-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
    <h3>Você ainda não avaliou nenhum produto</h3>
    <p>Compartilhe sua experiência em uma página de produto. Depois, você poderá editar ou excluir a avaliação por aqui.</p>
    <a class="btn-empty-cta" href="/products">Explorar produtos</a>
  </div>`;
}
function emptyStateNoResults() {
  return `<div class="empty-state">
    <div class="empty-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
    <h3>Nenhuma avaliação encontrada</h3>
    <p>Não encontramos avaliações com esses filtros. Tente ajustar a busca ou o filtro de estrelas.</p>
    <button class="btn-empty-cta" onclick="clearAllFilters()">Limpar filtros</button>
  </div>`;
}
function clearAllFilters() {
  $('searchInput').value = '';
  currentStarFilter = 0;
  $('sortSelect').value = 'recent';
  renderStarFilters();
  renderReviews();
}
function renderSkeleton() {
  const grid = $('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = Array.from({length:6}, () => `<div class="skel-card">
    <div class="skel-thumb"></div><div class="skel-lines">
      <div class="skel-line w40"></div><div class="skel-line w90"></div>
      <div class="skel-line w70"></div><div class="skel-line w60"></div>
    </div>
  </div>`).join('');
}

/* Editor */
function openEditModal(id) {
  const review = reviews.find(row => String(row.id) === String(id));
  if (!review) return;
  editingId = String(review.id);
  editingRatingValue = review.rating;
  $('editModalTitle').textContent = review.product;
  $('editTextarea').value = review.comment;
  renderStarPicker();
  $('editModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeEditModal() {
  $('editModal').classList.remove('on');
  document.body.style.overflow = '';
}
function renderStarPicker() {
  const wrap = $('starPicker');
  wrap.replaceChildren();
  for (let i=1; i<=5; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sp-star' + (i <= editingRatingValue ? ' on' : '');
    button.setAttribute('aria-label', `${i} estrelas`);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    button.onclick = () => {
      editingRatingValue = i;
      renderStarPicker();
    };
    wrap.appendChild(button);
  }
}
async function saveEdit() {
  const comment = $('editTextarea').value.trim();
  if (comment.length < 5) {
    showToast('error', 'Escreva um comentário com pelo menos 5 caracteres.');
    return;
  }
  if (editingRatingValue < 1) {
    showToast('error', 'Selecione ao menos 1 estrela.');
    return;
  }
  const review = reviews.find(row => String(row.id) === String(editingId));
  if (!review || !userId) return;

  const saveButton = document.querySelector('#editModal .btn-modal-save');
  if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Salvando…'; }

  const { error } = await supabaseClient
    .from('product_reviews')
    .update({ comment, rating: editingRatingValue })
    .eq('id', editingId)
    .eq('user_id', userId);

  if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Salvar Alterações'; }
  if (error) {
    console.error('Erro ao editar avaliação:', error);
    showToast('error', 'Não foi possível salvar as alterações.');
    return;
  }

  review.comment = comment;
  review.rating = editingRatingValue;
  review.dateISO = new Date().toISOString();
  closeEditModal();
  renderHeroStats();
  renderStarFilters();
  renderReviews();
  showToast('success', 'Avaliação atualizada com sucesso!');
}

/* Excluir */
function openDeleteModal(id) {
  const review = reviews.find(row => String(row.id) === String(id));
  if (!review) return;
  deletingId = String(review.id);
  $('deleteProductName').textContent = review.product;
  $('deleteModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeDeleteModal() {
  $('deleteModal').classList.remove('on');
  document.body.style.overflow = '';
}
async function confirmDelete() {
  const id = deletingId;
  if (!id || !userId) return;

  const button = document.querySelector('#deleteModal .btn-modal-delete');
  if (button) { button.disabled = true; button.textContent = 'Excluindo…'; }

  const { error } = await supabaseClient
    .from('product_reviews')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (button) { button.disabled = false; button.textContent = 'Excluir'; }
  if (error) {
    console.error('Erro ao excluir avaliação:', error);
    showToast('error', 'Não foi possível excluir a avaliação.');
    return;
  }

  reviews = reviews.filter(row => String(row.id) !== id);
  expandedComments.delete(id);
  closeDeleteModal();
  renderHeroStats();
  renderStarFilters();
  renderReviews();
  showToast('success', 'Avaliação removida.');
}

/* Toasts */
function showToast(type, msg) {
  const stack = $('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type === 'success'
    ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  const span = document.createElement('span');
  span.textContent = msg;
  const iconWrap = document.createElement('div');
  iconWrap.className = 't-ico';
  iconWrap.innerHTML = icon;
  const bar = document.createElement('div');
  bar.className = 't-bar';
  el.append(iconWrap, span, bar);
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px) scale(.95)';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}
function openLightbox() { $('lightboxOv')?.classList.add('on'); }
function closeLightbox() { $('lightboxOv')?.classList.remove('on'); }

/* Initialization */
async function loadMyReviews() {
  renderSkeleton();

  const { data: { user } = {}, error: authError } = await supabaseClient.auth.getUser();
  if (authError) console.warn('Não foi possível confirmar a sessão:', authError);
  if (!user) {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/login?redirect=${encodeURIComponent(next)}`);
    return;
  }
  userId = user.id;

  const { data, error } = await supabaseClient
    .from('product_reviews')
    .select('id,product_id,product_name,product_category,product_image,rating,title,comment,created_at,updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar avaliações do usuário:', error);
    reviewsLoadError = /product_reviews/i.test(error.message || '')
      ? 'A tabela de avaliações ainda não está configurada. Execute o arquivo supabase/product-reviews.sql no SQL Editor do Supabase.'
      : 'Confira a conexão e as políticas de segurança (RLS) da tabela de avaliações.';
    reviews = [];
  } else {
    reviewsLoadError = null;
    reviews = (Array.isArray(data) ? data : []).map(mapReview);
  }

  renderHeroStats();
  renderStarFilters();
  renderReviews();
}

Object.assign(window, {
  renderReviews,
  toggleComment,
  clearAllFilters,
  openEditModal,
  closeEditModal,
  saveEdit,
  openDeleteModal,
  closeDeleteModal,
  confirmDelete,
  openLightbox,
  closeLightbox
});

window.addEventListener('DOMContentLoaded', () => {
  const hero = $('heroSection');
  if (hero) {
    hero.addEventListener('mousemove', event => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - .5;
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - .5;
      if ($('orb1')) $('orb1').style.transform = `translate(${x*18}px, ${y*14}px)`;
      if ($('orb2')) $('orb2').style.transform = `translate(${x*-14}px, ${y*-10}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      if ($('orb1')) $('orb1').style.transform = '';
      if ($('orb2')) $('orb2').style.transform = '';
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
      closeLightbox();
    }
  });
  window.addEventListener('scroll', () => $('btt')?.classList.toggle('on', window.scrollY > 320), { passive: true });
  loadMyReviews();
});
})();
