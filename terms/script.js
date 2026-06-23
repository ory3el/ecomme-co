  const $ = id => document.getElementById(id);
  let wishlist = [];

  function openCart()  { $('cartSidebar').classList.add('on'); $('cartOverlay').classList.add('on'); }
  function closeCart() { $('cartSidebar').classList.remove('on'); $('cartOverlay').classList.remove('on'); }
  function checkout() {
    showToast('Seu carrinho está vazio. Explore os produtos! 🛍️');
    setTimeout(closeCart, 1200);
  }
  function alertWish() { showToast(`Lista de favoritos: ${wishlist.length} produto(s)`); }

  function showToast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('on');
    setTimeout(() => $('toast').classList.remove('on'), 2800);
  }

  window.addEventListener('scroll', () => {
    $('btt').classList.toggle('on', window.scrollY > 300);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  /* ── SCROLLSPY: highlight active TOC link / chip ─────────────────── */
  const sections = Array.from(document.querySelectorAll('.lsec'));
  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  const chips    = Array.from(document.querySelectorAll('.toc-chip'));

  function setActive(id) {
    tocLinks.forEach(l => l.classList.toggle('active', l.dataset.target === id));
    chips.forEach(c => {
      const on = c.getAttribute('href') === '#' + id;
      c.classList.toggle('active', on);
      if (on) c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  sections.forEach(sec => observer.observe(sec));
