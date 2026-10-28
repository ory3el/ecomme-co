  async function loadComponents() {
    try {
      const [topbarRes, headerRes, footerRes, sidebarsRes] = await Promise.all([
        fetch('/files/no-login/index-files/topbar.html'),
        fetch('/files/login-on/index-files/header.html'),
        fetch('/files/no-login/index-files/footer.html'),
        fetch('/files/no-login/index-files/sidebars.html')
      ]);

      const topbarHTML = await topbarRes.text();
      const headerHTML = await headerRes.text();
      const footerHTML = await footerRes.text();
      const sidebarsHTML = await sidebarsRes.text();

      document.getElementById('index-topbar').innerHTML = topbarHTML;
      document.getElementById('index-header').innerHTML = headerHTML;
      document.getElementById('index-footer').innerHTML = footerHTML;
      document.getElementById('index-sidebars').innerHTML = sidebarsHTML;

      const sidebarScript = document.createElement('script');
      sidebarScript.src = '/files/no-login/scripts/script.js';
      document.body.appendChild(sidebarScript);

      window.dispatchEvent(new CustomEvent('ecomme:sidebars-ready'));
      if (window.EcommeNotifications && typeof window.EcommeNotifications.init === 'function') {
        window.EcommeNotifications.init();
      }

    } catch (error) {
      console.error("Erro no carregamento dos componentes:", error);
      document.getElementById('index-header').innerHTML = "<h1>Erro ao carregar a interface. Verifique o console.</h1>";
    }
  }
  loadComponents();
