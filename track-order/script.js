const $ = id => document.getElementById(id);

  /* ─── TRACK FORM ─────────────────────────────────────────────────── */
  function fillDemo() {
    $('orderNum').value = 'EC2026-48271';
    $('orderEmail').value = 'mariana.ferreira@exemplo.com';
    handleTrack();
  }

  function handleTrack(e) {
    if (e) e.preventDefault();
    const num   = $('orderNum').value.trim();
    const email = $('orderEmail').value.trim();
    if (!num || !email) { showToast('Preencha o número do pedido e o e-mail.'); return; }

    $('resOrderNum').textContent   = `Pedido #${num.toUpperCase()}`;
    $('resOrderEmail').textContent = email;

    $('hintSection').style.display = 'none';
    $('resultSection').classList.add('show');
    showToast('Pedido encontrado! 📦');

    setTimeout(() => {
      $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  /* ─── FAQ ACCORDION ──────────────────────────────────────────────── */
  function toggleFaq(btn) {
    const item = btn.closest('.faq-item');
    const ans  = item.querySelector('.faq-a');
    const wasOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = null;
    });

    if (!wasOpen) {
      item.classList.add('open');
      ans.style.maxHeight = ans.scrollHeight + 'px';
    }
  }
