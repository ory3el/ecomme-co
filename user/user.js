/* ============================================================================
   Ecomme — /user profile page logic
   Pure Vanilla JS. No frameworks, no bundler required.

   WHAT THIS FILE DOES, IN ORDER:
   1. Reads the current URL to figure out whether we're looking at
      "/user"            -> the logged-in visitor's OWN profile
      "/user/@someone"   -> a PUBLIC profile, looked up by username
   2. Queries Supabase's `profiles` table for that username.
   3. Renders one of four states: loading (skeleton), profile, not-found,
      or a connection/timeout error — never an uncaught console error.
   4. Wires up the interactive bits (follow, share, copy link, report).

   HOW TO GO FROM "DEMO" TO "PRODUCTION":
   Search this file for "DEMO MODE" — every block tagged that way exists
   only because this file is being previewed without a real Supabase
   project attached. Delete those blocks (instructions are inline) once
   you plug in your real SUPABASE_URL / SUPABASE_ANON_KEY below. The real
   query logic (fetchProfileByUsername) is production-ready as-is.
   ============================================================================ */


/* ============================================================================
   1. CONFIG
   ---------------------------------------------------------------------------
   Replace these two constants with the values from your Supabase project
   settings (Project Settings -> API). The anon/public key is safe to expose
   in client-side code by design — it only grants what your Row Level
   Security (RLS) policies allow.
   ============================================================================ */
const SUPABASE_URL = 'https://YOUR-PROJECT-ref.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-PUBLIC-ANON-KEY';

// DEMO MODE: true while the placeholders above haven't been replaced.
// This is what lets this exact file render a working preview right now,
// and automatically "turns itself off" the moment you add real credentials.
const DEMO_MODE = SUPABASE_URL.includes('YOUR-PROJECT-ref');

// How long we wait for Supabase before giving up and showing a timeout
// state instead of leaving the visitor staring at a skeleton forever.
const QUERY_TIMEOUT_MS = 8000;


/* ============================================================================
   2. SUPABASE CLIENT
   ---------------------------------------------------------------------------
   Uses the UMD build loaded via <script> in index.html, which exposes a
   global `supabase` factory (window.supabase.createClient). This is the
   simplest, most compatible way to use the Supabase SDK from plain HTML —
   no bundler, no ES module CORS quirks, works from any static host.
   ============================================================================ */
const supabaseClient = (!DEMO_MODE && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;


/* ============================================================================
   3. SMALL UTILITIES
   ============================================================================ */
const $ = (id) => document.getElementById(id);

/** Pauses execution for `ms` milliseconds. Only used by the demo data path
 *  to simulate real network latency so the skeleton loader is visible. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Formats a large number the way a real product would ("1.2K", "340").
 *  Uses the built-in Intl API instead of hand-rolled string math. */
function formatCompactNumber(n) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Formats an ISO date ("2025-02-14") into "fevereiro de 2025", matching
 *  the tone used across the rest of the Ecomme platform. */
function formatJoinedDate(isoDate) {
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date(isoDate + 'T12:00:00');
  return `Entrou em ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Derives up to two initials from a display name, for the avatar
 *  placeholder when the profile has no avatar_url — e.g. "Gabriel
 *  Nascimento" -> "GN". */
function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/** Animates a number counting up from 0 to `target`, used on the stats
 *  strip so the numbers feel alive rather than just appearing. */
function animateCountUp(el, target, duration = 900) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = formatCompactNumber(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatCompactNumber(target);
  }
  requestAnimationFrame(tick);
}

/** Shows a small, self-dismissing toast at the bottom of the screen. */
function showToast(message) {
  const stack = $('toastStack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="t-ico"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}


/* ============================================================================
   4. ROUTING — reading "@username" straight out of window.location
   ---------------------------------------------------------------------------
   This is the piece that makes "/user/@gabriel" work as a real route on a
   static host: nothing on the server needs to know "@gabriel" exists.
   We simply read window.location.pathname on every page load and decide
   what to render from it, client-side. (See the bottom of this file, and
   the project's `_redirects` file, for how the *request* for that URL
   actually reaches this same index.html in the first place.)
   ============================================================================ */

/** Validates a username using the same rule the Supabase column should
 *  enforce server-side (lowercase letters, numbers, "_" and ".", 2-30
 *  chars). Rejecting obviously-invalid input BEFORE it reaches the network
 *  call is what the brief calls "impedir consultas inválidas". */
function isValidUsername(username) {
  return /^[a-z0-9_.]{2,30}$/i.test(username);
}

/**
 * Reads the current path and returns one of:
 *   { mode: 'own' }                        for "/user" or "/user/"
 *   { mode: 'public', username: 'gabriel'} for "/user/@gabriel"
 *   { mode: 'invalid' }                    for a malformed segment
 *
 * Runs once, synchronously, at boot — before any network request is made.
 */
function resolveRouteFromLocation() {
  // "/user/@gabriel" -> ["user", "@gabriel"]  (filter(Boolean) drops the
  // empty strings that String.split produces around leading/trailing "/")
  const segments = window.location.pathname.split('/').filter(Boolean);

  // "/user" or "/user/" (with or without a trailing slash) -> own profile.
  if (segments.length <= 1) return { mode: 'own' };

  const rawSegment = segments[1]; // e.g. "@gabriel"
  if (!rawSegment.startsWith('@')) return { mode: 'invalid' };

  const username = rawSegment.slice(1).toLowerCase();
  if (!isValidUsername(username)) return { mode: 'invalid' };

  return { mode: 'public', username };
}


/* ============================================================================
   5. DATA LAYER — talking to Supabase
   ============================================================================ */

/**
 * Looks up a single row in `profiles` where `username` matches exactly.
 *
 * Design choices worth explaining:
 *  - We use `.maybeSingle()` instead of `.single()`. `.single()` treats
 *    "0 rows found" as an ERROR, which would force us to inspect error
 *    messages just to tell "not found" apart from "something broke".
 *    `.maybeSingle()` simply resolves `data: null` when nothing matches,
 *    which maps directly onto our "not_found" state.
 *  - We attach an AbortController to the query via `.abortSignal()` and
 *    cancel it after QUERY_TIMEOUT_MS. This is a REAL cancellation (the
 *    in-flight HTTP request is aborted), not just "stop waiting" — the
 *    correct way to implement a timeout with supabase-js v2.
 *  - Every failure path returns a typed `{ data: null, error: { type } }`
 *    object instead of throwing, so the caller never needs a try/catch
 *    and nothing bubbles up to the console as an uncaught error.
 *
 * @param {string} username
 * @returns {Promise<{data: object|null, error: {type:string,message?:string}|null}>}
 */
async function fetchProfileByUsername(username) {
  if (!isValidUsername(username)) {
    return { data: null, error: { type: 'invalid', message: 'Nome de usuário inválido.' } };
  }

  // ---------------------------------------------------------------------
  // DEMO MODE ONLY — remove this whole `if (DEMO_MODE)` block once
  // SUPABASE_URL / SUPABASE_ANON_KEY above point to a real project.
  // It exists purely so this file is testable without a live database.
  // ---------------------------------------------------------------------
  if (DEMO_MODE) {
    await sleep(700 + Math.random() * 400); // simulate real network latency
    const demo = MOCK_PROFILES[username];
    return demo
      ? { data: demo, error: null }
      : { data: null, error: { type: 'not_found' } };
  }
  // ---------------------------------------------------------------------
  // END DEMO MODE BLOCK
  // ---------------------------------------------------------------------

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  // Fail fast and clearly if the browser already knows it's offline,
  // instead of waiting for the request to time out.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    clearTimeout(timeoutId);
    return { data: null, error: { type: 'offline', message: 'Sem conexão com a internet.' } };
  }

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('username', username)
      .abortSignal(controller.signal)
      .maybeSingle();

    clearTimeout(timeoutId);

    if (error) {
      console.error('[Supabase] query returned an error:', error.message);
      return { data: null, error: { type: 'query', message: error.message } };
    }
    if (!data) {
      return { data: null, error: { type: 'not_found' } };
    }
    return { data, error: null };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { data: null, error: { type: 'timeout', message: 'A consulta demorou demais.' } };
    }
    // Typically DNS failure, no internet, or the Supabase project is paused.
    console.error('[Supabase] network error while fetching profile:', err);
    return { data: null, error: { type: 'network', message: 'Não foi possível conectar ao servidor.' } };
  }
}

/**
 * Returns the username of the currently authenticated visitor, used to
 * decide whether we're rendering "own profile" mode. In production this
 * reads the real Supabase auth session; in DEMO_MODE it's hard-coded so
 * the "/user" route has something to display.
 */
async function getCurrentUsername() {
  if (DEMO_MODE) return 'mariana';

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) return null; // visitor isn't logged in

  // The auth user only carries an id/email — we still need their row in
  // `profiles` to know their username, assuming profiles.id references
  // auth.users.id (the standard Supabase pattern).
  const { data } = await supabaseClient
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  return data ? data.username : null;
}


/* ============================================================================
   DEMO MODE — mock dataset
   ---------------------------------------------------------------------------
   Stand-in for real rows in Supabase's `profiles` table. Delete this
   block once DEMO_MODE is off. The shape below is exactly what your real
   table's columns should produce (see the SQL schema shared alongside
   this file for the matching `CREATE TABLE` statement).
   ============================================================================ */
const MOCK_PROFILES = {
  gabriel: {
    id: 'usr_1001',
    username: 'gabriel',
    display_name: 'Gabriel Nascimento',
    avatar_url: null,
    avatar_color: '#4287F5',
    banner_colors: ['#4287F5', '#2E6BDE'],
    bio: 'Apaixonado por tecnologia e minimalismo. Sempre em busca do próximo gadget que vai mudar minha rotina.',
    location: 'São Paulo, SP',
    joined_at: '2025-02-14',
    website: 'gabrielnasc.dev',
    instagram: 'gabriel.nasc',
    twitter: 'gabrielnasc',
    is_verified: true,
    followers_count: 342,
    following_count: 128,
    reviews_count: 27,
    purchased_count: 54,
    favorites_count: 19,
    badges: [
      { label: 'Comprador Verificado', icon: 'shield' },
      { label: 'Top Avaliador', icon: 'star' },
      { label: 'Cliente desde 2025', icon: 'calendar' },
    ],
    favorite_stores: [
      { name: 'TechPrime Store', category: 'Eletrônicos', color: '#4287F5', link: '../seller-profile.html' },
      { name: 'GadgetXpress', category: 'Eletrônicos', color: '#8B5CF6', link: null },
      { name: 'ElectroLab', category: 'Eletrônicos', color: '#1FAA6E', link: null },
    ],
  },
  mariana: {
    id: 'usr_1002',
    username: 'mariana',
    display_name: 'Mariana Ferreira',
    avatar_url: null,
    avatar_color: '#F2637B',
    banner_colors: ['#F2637B', '#F0A93A'],
    bio: 'Curitibana, mãe de dois gatos e sempre em busca da melhor oferta antes de todo mundo.',
    location: 'Curitiba, PR',
    joined_at: '2026-01-08',
    website: null,
    instagram: 'mari.ferreira',
    twitter: null,
    is_verified: false,
    followers_count: 88,
    following_count: 156,
    reviews_count: 8,
    purchased_count: 12,
    favorites_count: 31,
    badges: [
      { label: 'Cliente desde 2026', icon: 'calendar' },
      { label: 'Comprador Frequente', icon: 'zap' },
    ],
    favorite_stores: [
      { name: 'TechPrime Store', category: 'Eletrônicos', color: '#4287F5', link: '../seller-profile.html' },
      { name: 'Beleza Pura', category: 'Beleza', color: '#F0A93A', link: null },
    ],
  },
};


/* ============================================================================
   6. RENDERING
   ============================================================================ */

const BADGE_ICONS = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
};

/** Hides every top-level state section, used before showing exactly one. */
function hideAllStates() {
  $('skeletonState').hidden = true;
  $('profileState').hidden = true;
  $('notFoundState').hidden = true;
  $('errorState').hidden = true;
}

function showSkeleton() {
  hideAllStates();
  $('skeletonState').hidden = false;
}

/** Renders the fully-loaded profile into #profileState and reveals it.
 *  `isOwnProfile` swaps the action buttons between "Seguir" (visiting
 *  someone else) and "Editar perfil" (visiting yourself). */
function renderProfile(profile, isOwnProfile) {
  hideAllStates();

  document.title = `${profile.display_name} (@${profile.username}) · Ecomme`;

  // ---- banner + avatar --------------------------------------------------
  const [c1, c2] = profile.banner_colors || ['#4287F5', '#2E6BDE'];
  $('pBanner').style.background = `linear-gradient(135deg, ${c1}, ${c2})`;

  const avatarEl = $('pAvatar');
  if (profile.avatar_url) {
    avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="${profile.display_name}">`;
  } else {
    avatarEl.style.background = profile.avatar_color || '#4287F5';
    avatarEl.textContent = getInitials(profile.display_name);
  }
  $('pVerified').hidden = !profile.is_verified;

  // ---- identity text ------------------------------------------------------
  $('pName').textContent = profile.display_name;
  $('pUsername').textContent = '@' + profile.username;
  $('pBio').textContent = profile.bio || '';
  $('pBio').hidden = !profile.bio;

  $('pLocation').innerHTML = profile.location
    ? `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${profile.location}`
    : '';
  $('pLocation').hidden = !profile.location;
  $('pJoined').innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatJoinedDate(profile.joined_at)}`;

  // ---- social links ---------------------------------------------------
  const socialWrap = $('pSocial');
  socialWrap.innerHTML = '';
  const socials = [
    profile.website && { key: 'website', url: `https://${profile.website}`, icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
    profile.instagram && { key: 'instagram', url: `https://instagram.com/${profile.instagram}`, icon: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>' },
    profile.twitter && { key: 'twitter', url: `https://x.com/${profile.twitter}`, icon: '<path d="M22 4.01c-.9.4-1.8.7-2.8.9 1-.6 1.8-1.6 2.2-2.7-.9.5-2 .9-3.1 1.1-.9-1-2.2-1.6-3.6-1.6-2.7 0-4.9 2.2-4.9 4.9 0 .4 0 .8.1 1.1-4.1-.2-7.7-2.2-10.1-5.1-.4.7-.7 1.6-.7 2.5 0 1.7.9 3.2 2.2 4.1-.8 0-1.6-.2-2.2-.6v.1c0 2.4 1.7 4.4 3.9 4.8-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 1.9 2.4 3.4 4.6 3.4-1.7 1.3-3.8 2.1-6.1 2.1-.4 0-.8 0-1.2-.1 2.2 1.4 4.7 2.2 7.5 2.2 9 0 13.9-7.4 13.9-13.9v-.6c1-.7 1.8-1.6 2.5-2.6z"/>' },
  ].filter(Boolean);
  socials.forEach(s => {
    const a = document.createElement('a');
    a.className = 'social-btn';
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.innerHTML = `<svg viewBox="0 0 24 24">${s.icon}</svg>`;
    socialWrap.appendChild(a);
  });
  socialWrap.hidden = socials.length === 0;

  // ---- action buttons ---------------------------------------------------
  $('btnFollow').hidden = isOwnProfile;
  $('btnReport').hidden = isOwnProfile;
  $('btnEdit').hidden = !isOwnProfile;
  resetFollowButton(profile.followers_count);

  // ---- stats strip (animated count-up) ----------------------------------
  const stats = [
    { label: 'Seguidores', value: profile.followers_count },
    { label: 'Seguindo', value: profile.following_count },
    { label: 'Avaliações', value: profile.reviews_count },
    { label: 'Comprados', value: profile.purchased_count },
    { label: 'Favoritos', value: profile.favorites_count },
  ];
  const statsWrap = $('pStats');
  statsWrap.innerHTML = stats.map((s, i) => `
    <div class="stat-cell" style="animation-delay:${i * 0.06}s">
      <span class="stat-num" data-target="${s.value}">0</span>
      <span class="stat-lbl">${s.label}</span>
    </div>`).join('');
  statsWrap.querySelectorAll('.stat-num').forEach(el => animateCountUp(el, Number(el.dataset.target)));

  // ---- badges -------------------------------------------------------------
  const badgesWrap = $('pBadges');
  const badges = profile.badges || [];
  badgesWrap.innerHTML = badges.map((b, i) => `
    <div class="badge-pill" style="animation-delay:${i * 0.06}s">
      <span class="badge-ico"><svg viewBox="0 0 24 24">${BADGE_ICONS[b.icon] || BADGE_ICONS.star}</svg></span>
      ${b.label}
    </div>`).join('');
  $('badgesSection').hidden = badges.length === 0;

  // ---- favorite stores ------------------------------------------------
  const stores = profile.favorite_stores || [];
  const storesWrap = $('pStoresGrid');
  storesWrap.innerHTML = stores.map((s, i) => {
    const inner = `
      <div class="store-ava" style="background:${s.color}">${getInitials(s.name)}</div>
      <div><div class="store-name">${s.name}</div><div class="store-cat">${s.category}</div></div>`;
    return s.link
      ? `<a class="store-card" href="${s.link}" style="animation-delay:${i * 0.06}s">${inner}</a>`
      : `<div class="store-card" style="animation-delay:${i * 0.06}s">${inner}</div>`;
  }).join('');
  $('storesSection').hidden = stores.length === 0;

  $('profileState').hidden = false;
}

/** Renders the "soft 404" — a valid route, a valid-looking username, but
 *  no matching row in `profiles`. The HTTP response is still 200 (the
 *  static file loaded fine); this is an *application-level* not-found. */
function renderNotFound(username) {
  hideAllStates();
  document.title = 'Perfil não encontrado · Ecomme';
  $('notFoundUsername').textContent = '@' + username;
  $('notFoundState').hidden = false;
}

/** Renders a connection/timeout/query error, with a retry action — kept
 *  visually and semantically distinct from "not found", since here we
 *  don't actually know yet whether the profile exists. */
function renderErrorState(errorType, onRetry) {
  hideAllStates();
  const messages = {
    offline: ['Você está sem conexão', 'Verifique sua internet e tente novamente.'],
    timeout: ['A busca demorou demais', 'O servidor demorou para responder. Tente novamente.'],
    network: ['Não foi possível conectar', 'Houve um problema para falar com o servidor da Ecomme.'],
    query: ['Algo deu errado', 'Não conseguimos carregar este perfil agora.'],
    invalid: ['Endereço inválido', 'Esse link de perfil não parece válido.'],
  };
  const [title, desc] = messages[errorType] || messages.query;
  $('errorTitle').textContent = title;
  $('errorDesc').textContent = desc;
  $('errorState').hidden = false;
  $('btnRetry').onclick = onRetry;
}


/* ============================================================================
   7. INTERACTIONS
   ============================================================================ */

/** Resets the follow button to its base "not following" visual state,
 *  called once whenever a profile finishes rendering. */
function resetFollowButton(baseFollowerCount) {
  const btn = $('btnFollow');
  btn.dataset.following = 'false';
  btn.dataset.baseCount = String(baseFollowerCount);
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Seguir`;
  btn.classList.remove('following');
}

/**
 * Toggles the follow state with an optimistic UI update (the button and
 * counter change instantly; we don't block on a network round-trip).
 *
 * PRODUCTION NOTE: replace the two lines under "DEMO toggle" with a real
 * call, e.g.:
 *   isFollowing
 *     ? await supabaseClient.from('follows').delete().match({ follower_id, followee_id })
 *     : await supabaseClient.from('follows').insert({ follower_id, followee_id })
 * and roll the UI back if that call fails.
 */
function handleFollowClick() {
  const btn = $('btnFollow');
  const isFollowing = btn.dataset.following === 'true';
  const base = Number(btn.dataset.baseCount);

  // ---- DEMO toggle (optimistic, local-only) ----
  btn.dataset.following = String(!isFollowing);
  const followersEl = document.querySelector('#pStats .stat-num');
  if (followersEl) followersEl.textContent = formatCompactNumber(base + (isFollowing ? 0 : 1));

  if (isFollowing) {
    btn.classList.remove('following');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Seguir`;
  } else {
    btn.classList.add('following');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Seguindo`;
    showToast('Você agora está seguindo este perfil.');
  }
}

/** Copies the canonical profile URL to the clipboard, with graceful
 *  fallback messaging if the Clipboard API isn't available (e.g. non-
 *  secure context). */
async function handleCopyLink() {
  const btn = $('btnCopyLink');
  try {
    await navigator.clipboard.writeText(window.location.href);
    btn.classList.add('copied');
    showToast('Link do perfil copiado!');
    setTimeout(() => btn.classList.remove('copied'), 1600);
  } catch {
    showToast('Não foi possível copiar automaticamente. Copie o link da barra de endereço.');
  }
}

/** Uses the native share sheet when available (mobile browsers, some
 *  desktop browsers); falls back to a small custom popover otherwise. */
function handleShareClick(profile) {
  const shareData = {
    title: `${profile.display_name} · Ecomme`,
    text: `Veja o perfil de ${profile.display_name} na Ecomme`,
    url: window.location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {}); // user cancelled — not an error
  } else {
    $('sharePop').classList.toggle('on');
  }
}

function openReportModal() { $('reportModal').classList.add('on'); }
function closeReportModal() { $('reportModal').classList.remove('on'); }

/** Submits the report form. This is a UI-only demo: there's no report
 *  endpoint wired up, so we just confirm success. In production this
 *  would insert a row into a `reports` table or call an Edge Function. */
function submitReport(event) {
  event.preventDefault();
  closeReportModal();
  showToast('Denúncia enviada. Nossa equipe vai analisar.');
}


/* ============================================================================
   8. BOOT
   ---------------------------------------------------------------------------
   Runs once the DOM is ready. Orchestrates: resolve route -> fetch data ->
   render exactly one state. This function is intentionally the only place
   that knows about *all* the moving pieces above.
   ============================================================================ */
async function main() {
  showSkeleton();

  const route = resolveRouteFromLocation();

  if (route.mode === 'invalid') {
    renderErrorState('invalid', () => window.location.reload());
    return;
  }

  const viewerUsername = await getCurrentUsername();

  const targetUsername = route.mode === 'own' ? viewerUsername : route.username;
  if (!targetUsername) {
    // "/user" with nobody logged in — in production you'd redirect to
    // /login here. We surface a clear error instead of guessing.
    renderErrorState('query', () => window.location.reload());
    return;
  }

  const { data: profile, error } = await fetchProfileByUsername(targetUsername);

  if (error) {
    if (error.type === 'not_found') {
      renderNotFound(targetUsername);
    } else {
      renderErrorState(error.type, () => main());
    }
    return;
  }

  const isOwnProfile = route.mode === 'own' || targetUsername === viewerUsername;
  renderProfile(profile, isOwnProfile);
}

// ---- wire up static interactions once, then boot -------------------------
document.addEventListener('DOMContentLoaded', () => {
  $('btnFollow').addEventListener('click', handleFollowClick);
  $('btnCopyLink').addEventListener('click', handleCopyLink);
  $('btnReport').addEventListener('click', openReportModal);
  $('reportForm').addEventListener('submit', submitReport);
  $('btnReportCancel').addEventListener('click', closeReportModal);
  $('reportModal').addEventListener('click', (e) => { if (e.target.id === 'reportModal') closeReportModal(); });
  $('btnShare').addEventListener('click', () => {
    const p = MOCK_PROFILES[resolveRouteFromLocation().username] || MOCK_PROFILES.mariana;
    handleShareClick(p);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btnShare') && !e.target.closest('#sharePop')) $('sharePop').classList.remove('on');
  });
  $('shareCopyOpt').addEventListener('click', () => { handleCopyLink(); $('sharePop').classList.remove('on'); });

  main();
});
