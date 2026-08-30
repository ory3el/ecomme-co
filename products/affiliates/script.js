/* ── THEME ───────────────────────────────────────────────────────── */
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effectiveTheme(pref) {
  return pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

function updateThemeSwitchUI(pref) {
  document.querySelectorAll('.theme-opt').forEach(function (btn) {
    var isActive = btn.dataset.themeChoice === pref;
    btn.setAttribute('aria-checked', String(isActive));
  });
}

function applyTheme(pref, opts) {
  opts = opts || {};
  try { localStorage.setItem('ecomme-theme', pref); } catch (e) {}
  var root = document.documentElement;
  if (!opts.silent) root.classList.add('theme-transition');
  root.setAttribute('data-theme', effectiveTheme(pref));
  root.setAttribute('data-theme-pref', pref);
  updateThemeSwitchUI(pref);
  if (!opts.silent) {
    window.setTimeout(function () { root.classList.remove('theme-transition'); }, 420);
  }
}

function initTheme() {
  var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
  updateThemeSwitchUI(pref);

  // Live-follow the OS theme while the user's preference is "auto"
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      var currentPref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      if (currentPref === 'auto') applyTheme('auto', { silent: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
}

function initThemeToggle() {
  var wrap = document.getElementById('themeSwitch');
  if (!wrap) return;
  wrap.querySelectorAll('.theme-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.themeChoice);
    });
  });
}

/* ── SCROLL REVEAL ───────────────────────────────────────────────── */
function initScrollAnimations() {
  var targets = document.querySelectorAll('.io-reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
}

/* ── FAQ ACCORDION ───────────────────────────────────────────────── */
function initFaq() {
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      items.forEach(function (other) {
        other.classList.remove('open');
        var otherBtn = other.querySelector('.faq-q');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ── HEADER / BACK-TO-TOP ────────────────────────────────────────── */
function initHeader() {
  var backTop = document.getElementById('backTop');
  if (!backTop) return;
  var onScroll = function () {
    backTop.classList.toggle('visible', window.scrollY > 420);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── AFFILIATE CTA ───────────────────────────────────────────────── */
function startAffiliateRegistration() {
  var target = '/affiliate/register';
  if (window.userId) {
    window.location.href = target;
  } else if (typeof window.goToLogin === 'function') {
    window.goToLogin(target);
  } else {
    window.location.href = '/login?redirect=' + encodeURIComponent(target);
  }
}

function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initAffiliateCTA() {
  window.startAffiliateRegistration = startAffiliateRegistration;
  window.scrollToSection = scrollToSection;
}

/* ── GLOBAL COMPONENT SHIMS ──────────────────────────────────────────
   The Ecomme header/cart/fav/notification/more/account components are
   shared across every page. If the site's global script (e.g. a
   shared script.js / auth-session-check.js) already defines these
   functions, we leave them untouched. Otherwise, this page defines a
   lightweight local version so the shared markup remains functional
   standalone. */
function defineFallback(name, fn) {
  if (typeof window[name] !== 'function') window[name] = fn;
}

var SIDEBAR_IDS = {
  cart:  ['cartSidebar', 'cartOverlay'],
  fav:   ['favSidebar', 'favOverlay'],
  notif: ['notifSidebar', 'notifOverlay'],
  more:  ['moreSidebar', 'moreOverlay'],
  acc:   ['accSidebar', 'accOverlay']
};

function closeAllSidebars() {
  Object.keys(SIDEBAR_IDS).forEach(function (key) {
    var ids = SIDEBAR_IDS[key];
    var sb = document.getElementById(ids[0]);
    var ov = document.getElementById(ids[1]);
    if (sb) { sb.classList.remove('on'); sb.setAttribute('aria-hidden', 'true'); }
    if (ov) ov.classList.remove('on');
  });
}

function openSidebar(key) {
  var ids = SIDEBAR_IDS[key];
  if (!ids) return;
  closeAllSidebars();
  var sb = document.getElementById(ids[0]);
  var ov = document.getElementById(ids[1]);
  if (sb) { sb.classList.add('on'); sb.setAttribute('aria-hidden', 'false'); }
  if (ov) ov.classList.add('on');
  document.body.classList.add('nobodyscroll');
}

function closeSidebar(key) {
  var ids = SIDEBAR_IDS[key];
  if (!ids) return;
  var sb = document.getElementById(ids[0]);
  var ov = document.getElementById(ids[1]);
  if (sb) { sb.classList.remove('on'); sb.setAttribute('aria-hidden', 'true'); }
  if (ov) ov.classList.remove('on');
  document.body.classList.remove('nobodyscroll');
}

function initGlobalShims() {
  defineFallback('openCart',  function () { openSidebar('cart'); });
  defineFallback('closeCart', function () { closeSidebar('cart'); });
  defineFallback('openFav',   function () { openSidebar('fav'); });
  defineFallback('closeFav',  function () { closeSidebar('fav'); });
  defineFallback('openNotif', function () { openSidebar('notif'); });
  defineFallback('closeNotif',function () { closeSidebar('notif'); });
  defineFallback('openMore',  function () { openSidebar('more'); });
  defineFallback('closeMore', function () { closeSidebar('more'); });
  defineFallback('openAcc',   function () { openSidebar('acc'); });
  defineFallback('closeAcc',  function () { closeSidebar('acc'); });

  defineFallback('goToLogin', function (redirect) {
    var path = redirect || window.location.pathname;
    window.location.href = '/login?redirect=' + encodeURIComponent(path);
  });
  defineFallback('buttonLink', function (path) {
    closeAllSidebars();
    document.body.classList.remove('nobodyscroll');
    window.location.href = path;
  });
  defineFallback('openConfirmLogout', function () {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.signOut().finally(function () { window.location.href = '/'; });
      } else {
        window.location.href = '/logout';
      }
    }
  });
  defineFallback('checkout', function () { window.location.href = '/checkout'; });
  defineFallback('addAllFavToCart', function () {});

  defineFallback('closeModal', function () {
    var ov = document.getElementById('modalOverlay');
    if (ov) ov.classList.remove('on');
    document.body.classList.remove('nobodyscroll');
  });
  defineFallback('handleModalClick', function (event) {
    if (event.target && event.target.id === 'modalOverlay') window.closeModal();
  });
  defineFallback('addFromModal', function () { window.closeModal(); });
  defineFallback('addFromModal2', function () {});
  defineFallback('chgQty', function (delta) {
    ['mQty', 'mQty2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var next = Math.max(1, (parseInt(el.textContent, 10) || 1) + delta);
      el.textContent = next;
    });
  });

  // Escape closes whichever sidebar/modal is open
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    Object.keys(SIDEBAR_IDS).forEach(function (key) {
      var sb = document.getElementById(SIDEBAR_IDS[key][0]);
      if (sb && sb.classList.contains('on')) closeSidebar(key);
    });
    var modal = document.getElementById('modalOverlay');
    if (modal && modal.classList.contains('on') && typeof window.closeModal === 'function') window.closeModal();
  });
}

/* ── BOOTSTRAP ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initGlobalShims();
  initTheme();
  initThemeToggle();
  initScrollAnimations();
  initFaq();
  initHeader();
  initAffiliateCTA();
});
