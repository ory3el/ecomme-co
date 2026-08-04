const $ = id => document.getElementById(id);
const fmt = p => 'R$ ' + p.toFixed(2).replace('.', ',');

/* ─── SUPABASE ──────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userId = null;

// EXECUTE DATABASE
(async function initStore() {
  let pathname = window.location.pathname;

  if (pathname.endsWith('/') && pathname !== '/store/' && pathname !== '/store') {
    pathname = pathname.slice(0, -1);
    window.history.replaceState(null, '', pathname + window.location.search);
  }
  
  const segments = pathname.split('/').filter(Boolean);
  let storeSlug = segments[segments.length - 1];
  
  if (storeSlug) {
    storeSlug = storeSlug.replace('@', '');
  }

  if (!storeSlug || storeSlug === 'store' || storeSlug === 'seller') {
    console.error("Nenhuma loja especificada na URL.");
    document.body.innerHTML = '<h1>Loja não especificada na URL.</h1>';
    return;
  }

  await loadStoreData(storeSlug);
})();

async function loadStoreData(slug) {
  try {
    const { data: loja, error } = await supabaseClient
      .from('lojas')
      .select('*')
      .eq('slug_url', slug)
      .single();

    if (error || !loja) {
      console.error("Loja não encontrada!", error);
      document.body.innerHTML = '<h1>Loja não encontrada</h1>';
      return;
    }

    console.log("Loja carregada:", loja);
    document.title = `${loja.nome} | Ecomme`;

  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

/* ─── PARTICLES ──────────────────────────────────────────────────────── */
(function spawnParticles() {
  const wrap = $('particles');
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'sb-p';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${3+Math.random()*5}s;--dl:${Math.random()*3}s;opacity:${.3+Math.random()*.6}`;
    wrap.appendChild(p);
  }
})();

/* ─── LIVE VIEWERS ANIMATION ─────────────────────────────────────────── */
let viewers = 148;
setInterval(() => {
  viewers = Math.max(100, Math.min(210, viewers + (Math.random() > .45 ? 1 : -1) * Math.ceil(Math.random() * 3)));
  const el = $('liveViewers'); if (el) el.textContent = viewers;
}, 2800);

/* ─── PRODUCTS DATA ──────────────────────────────────────────────────── */
const products = [
  { id:0, name:'Smartwatch Pro X7', emoji:'⌚', price:189.90, old:299, discount:36, rating:4.9, reviews:2847, badge:'hot', shipping:true },
  { id:1, name:'Fone Bluetooth ANC Pro', emoji:'🎧', price:119.90, old:199, discount:39, rating:4.8, reviews:1523, badge:'new', shipping:true },
  { id:2, name:'Câmera de Segurança WiFi', emoji:'📷', price:149.90, old:220, discount:31, rating:4.7, reviews:892, badge:'sale', shipping:false },
  { id:3, name:'Kit Luzes LED Smart RGB', emoji:'💡', price:79.90, old:130, discount:38, rating:4.6, reviews:3102, badge:'hot', shipping:true },
  { id:4, name:'Fone Gamer RGB Pro', emoji:'🎮', price:99.90, old:160, discount:37, rating:4.7, reviews:745, badge:'new', shipping:true },
  { id:5, name:'Hub USB-C 7 em 1', emoji:'🔌', price:69.90, old:110, discount:36, rating:4.8, reviews:1230, badge:'hot', shipping:true },
  { id:6, name:'Mesa Digitalizadora Pro', emoji:'🖊️', price:229.90, old:360, discount:36, rating:4.9, reviews:432, badge:'new', shipping:false },
  { id:7, name:'Teclado Mecânico RGB', emoji:'⌨️', price:179.90, old:280, discount:35, rating:4.8, reviews:987, badge:'sale', shipping:true },
  { id:8, name:'Mouse Gamer 16K DPI', emoji:'🖱️', price:139.90, old:210, discount:33, rating:4.7, reviews:654, badge:'hot', shipping:true },
];

/* ─── STATE ─────────────────────────────────────────────────────────── */
let cart = [];
let fav = [];
let curId = null;
let mQtyVal = 1;
let view = 'grid';
let shuffled = [...products];

function renderProds(list) {
  const grid = $('prodGrid');
  const stars = r => '★'.repeat(Math.floor(r)) + '☆'.repeat(5-Math.floor(r));
  const badgeHtml = p => p.badge==='hot' ? `<span class="pbadge ph">🔥 Hot</span>` : p.badge==='new' ? `<span class="pbadge pn">Novo</span>` : `<span class="pbadge ps">-${p.discount}%</span>`;
  grid.innerHTML = list.map((p,i) => {
    const inW = fav.includes(p.id);
    return `<div class="pcard" style="animation:fadeInUp .4s var(--ease) ${i*.05}s backwards" onclick="openProductModal(${p.id})">
      <div class="pc-img-wrap">
        <div class="pc-img">${p.emoji}</div>
        <div class="pc-badges">${badgeHtml(p)}</div>
        <button class="pc-wish ${inW?'on':''}" onclick="event.stopPropagation();toggleWish(${p.id},this)" title="Favoritar">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="pc-actions">
          <button class="btn-pcart" onclick="event.stopPropagation();addToCart(${p.id})">
            <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Carrinho
          </button>
        </div>
      </div>
      <div class="pc-info">
        <div class="pc-name">${p.name}</div>
        <div class="pc-rating"><span class="pc-stars">${stars(p.rating)}</span><span class="pc-rcount">(${p.reviews.toLocaleString('pt-BR')})</span></div>
        <div class="pc-price-row">
          <span class="pc-price">${fmt(p.price)}</span>
          <span class="pc-old">${fmt(p.old)}</span>
          <span class="pc-disc">-${p.discount}%</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProds() {
  const q = $('prodSearch').value.toLowerCase();
  const sort = $('prodSort').value;
  let list = products.filter(p => !q || p.name.toLowerCase().includes(q));
  if (sort==='price_asc') list.sort((a,b)=>a.price-b.price);
  else if (sort==='price_desc') list.sort((a,b)=>b.price-a.price);
  else if (sort==='rating') list.sort((a,b)=>b.rating-a.rating);
  else if (sort==='new') list.sort((a,b)=>b.id-a.id);
  renderProds(list);
}
filterProds();

/* ─── FOLLOW ─────────────────────────────────────────────────────────── */
let isFollowing = false;
let followCount = 4820;
function handleFollow() {
  const btn = $('followBtn');
  const lbl = $('followLabel');
  const statEl = $('statFollowers');
  if (btn.classList.contains('loading')) return;
  btn.classList.add('loading');
  btn.style.animation = 'followPop .45s var(--ease)';
  setTimeout(() => { btn.style.animation = ''; }, 450);
  setTimeout(() => {
    btn.classList.remove('loading');
    isFollowing = !isFollowing;
    if (isFollowing) {
      btn.classList.add('following');
      lbl.textContent = 'Seguindo';
      followCount++;
      statEl.textContent = followCount.toLocaleString('pt-BR');
      statEl.style.animation = 'countUp .4s var(--ease)';
      setTimeout(() => statEl.style.animation = '', 400);
      showToast('Agora você segue TechPrime Store! 🎉');
      if ($('bellBtn') && !$('bellBtn').classList.contains('active')) {
        setTimeout(() => { showToast('💡 Ative o sino para receber notificações deste vendedor.'); }, 1400);
      }
    } else {
      btn.classList.remove('following');
      lbl.textContent = 'Seguir';
      followCount--;
      statEl.textContent = followCount.toLocaleString('pt-BR');
    }
  }, 900);
}

/* ─── BELL / NOTIFICATIONS ───────────────────────────────────────────── */
let bellActive = false;
let bellPillTimer;
function toggleBell() {
  const btn = $('bellBtn');
  const tooltip = $('bellTooltip');
  const pill = $('bellPill');
  const pillText = $('bellPillText');
  bellActive = !bellActive;
  if (bellActive) {
    btn.classList.add('active','ringing');
    btn.classList.remove('silencing');
    tooltip.textContent = 'Desativar notificações';
    pillText.textContent = '🔔 Notificações ativadas para TechPrime Store';
    pill.className = 'bell-pill notif-on show';
    setTimeout(() => btn.classList.remove('ringing'), 1000);
    showToast('Você será notificado sobre novidades da TechPrime Store 🔔');
  } else {
    btn.classList.remove('active','ringing');
    btn.classList.add('silencing');
    tooltip.textContent = 'Ativar notificações';
    pillText.textContent = '🔕 Notificações desativadas';
    pill.className = 'bell-pill notif-off show';
    setTimeout(() => btn.classList.remove('silencing'), 500);
    showToast('Notificações da TechPrime Store desativadas.');
  }
  clearTimeout(bellPillTimer);
  bellPillTimer = setTimeout(() => { pill.classList.remove('show'); }, 3200);
}

/* ─── SHARE ──────────────────────────────────────────────────────────── */
function handleShare() {
  showToast('Link do vendedor copiado! 🔗');
}

/* ─── TABS ───────────────────────────────────────────────────────────── */
function switchTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  $('panel-' + tab).classList.add('on');
  movePill(btn);
  if (tab === 'reviews') {
    setTimeout(() => {
      document.querySelectorAll('.rs-bar-fill').forEach(b => { b.style.transition = 'width 1.4s var(--ease)'; b.style.width = (b.dataset.w||0)+'%'; });
    }, 100);
  }
}
function movePill(btn) {
  const bg = $('tabPill');
  const barRect = $('tabBar').getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  bg.style.left = (btnRect.left - barRect.left) + 'px';
  bg.style.width = btnRect.width + 'px';
}
window.addEventListener('resize', () => { const a = document.querySelector('.tab-btn.on'); if(a) movePill(a); });

/* ─── SCROLL REVEAL ──────────────────────────────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ─── REVIEW BARS ANIMATE (lazy) ────────────────────────────────────── */
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.rs-bar-fill').forEach(b => { b.style.transition='width 1.4s var(--ease)'; b.style.width=(b.dataset.w||0)+'%'; });
      barObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.rev-summary').forEach(el => {
  el.querySelectorAll('.rs-bar-fill').forEach(b => { b.style.width='0'; });
  barObs.observe(el);
});

/* ─── INIT PILL POSITION ─────────────────────────────────────────────── */
requestAnimationFrame(() => { const a = document.querySelector('.tab-btn.on'); if(a) movePill(a); });

/* ─── STATS ENTRANCE ANIMATION ───────────────────────────────────────── */
document.querySelectorAll('.pi-stat-val').forEach((el, i) => {
  el.style.animationDelay = (i * 0.08) + 's';
});
