async function loadComponents() {
  const components = [
    /*{ url: '/files/no-login/index-files/topbar.html', slot: 'index-topbar' },*/
    { url: '/files/index/header.html', slot: 'index-header' },
    { url: '/files/no-login/index-files/footer.html', slot: 'index-footer' }
  ];
  try {
    const responses = await Promise.all(components.map(component => fetch(component.url)));
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`Falha ao carregar componente: ${failed.url} (${failed.status})`);
    const markup = await Promise.all(responses.map(response => response.text()));
    components.forEach((component, index) => {
      const slot = document.getElementById(component.slot);
      if (slot) slot.outerHTML = markup[index];
      else if (component.slot === 'index-topbar') document.body.insertAdjacentHTML('afterbegin', markup[index]);
      else if (component.slot === 'index-header') {
        const topbar = document.getElementById('topbar');
        if (topbar) topbar.insertAdjacentHTML('afterend', markup[index]);
        else document.body.insertAdjacentHTML('afterbegin', markup[index]);
      } else {
        const settingsOverlay = document.getElementById('settingsOverlay');
        if (settingsOverlay) settingsOverlay.insertAdjacentHTML('beforebegin', markup[index]);
        else document.body.insertAdjacentHTML('beforeend', markup[index]);
      }
    });
    document.getElementById('index-sidebars')?.remove();
    window.dispatchEvent(new CustomEvent('ecomme:components-ready'));
  } catch (error) {
    console.error('[Ecomme] Erro ao carregar os componentes:', error);
    const slot = document.getElementById('index-header');
    const message = document.createElement('div');
    message.className = 'ecomme-components-error';
    message.setAttribute('role', 'alert');
    message.textContent = 'Não foi possível carregar o cabeçalho da Ecomme. Atualize a página e tente novamente.';
    if (slot) slot.replaceWith(message);
    else document.body.prepend(message);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadComponents, { once: true });
else loadComponents();
