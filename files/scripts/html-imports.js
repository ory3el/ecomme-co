async function loadComponents() {
  try {
    const paths = [
      '/files/no-login/index-files/topbar.html',
      '/files/login-on/index-files/header.html',
      '/files/no-login/index-files/footer.html',
      '/files/no-login/index-files/sidebars.html'
    ];

    const responses = await Promise.all(paths.map(url => fetch(url)));
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`Falha ao carregar componente: ${failed.url} (${failed.status})`);

    const [topbarHTML, headerHTML, footerHTML, sidebarsHTML] = await Promise.all(
      responses.map(response => response.text())
    );

    document.body.insertAdjacentHTML('afterbegin', `${topbarHTML}\n${headerHTML}`);
    document.body.insertAdjacentHTML('beforeend', `${footerHTML}\n${sidebarsHTML}`);

    /*await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/files/no-login/scripts/script.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Não foi possível carregar o script dos sidebars.'));
      document.body.appendChild(script);
    });*/

    window.dispatchEvent(new CustomEvent('ecomme:sidebars-ready'));
    if (window.EcommeNotifications && typeof window.EcommeNotifications.init === 'function') {
      window.EcommeNotifications.init();
    }
  } catch (error) {
    console.error('[Ecomme] Erro ao carregar os componentes:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadComponents, { once: true });
} else {
  loadComponents();
}
