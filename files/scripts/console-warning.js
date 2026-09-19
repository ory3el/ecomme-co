function showConsoleWarning() {
  console.log(
    '%cAVISO',
    'background: var(--white); color: yellow; font-size: 20px; font-weight: bold; padding: 2px 4px; border-radius: 5px;'
  );
  console.log(
    '%cO uso deste console pode permitir que invasores falsifiquem sua identidade para roubar informações por meio de um ataque chamado Self-XSS.\nNão insira nem cole códigos que você não conheça.',
    'color: white; background: var(--glass-border); font-size: 18px; line-height: 1.5; padding: 2px; font-weight: 600; border-radius: 5px; '
  );
}
showConsoleWarning();
