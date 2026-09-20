function showConsoleWarning() {
  /*console.log(
    '%cAVISO',
    'background: var(--white); color: yellow; font-size: 20px; font-weight: bold; padding: 2px 4px; border-radius: 5px;'
  );
  console.log(
    '%cO uso deste console pode permitir que invasores falsifiquem sua identidade para roubar informações por meio de um ataque chamado Self-XSS.\nNão insira nem cole códigos que você não conheça.',
    'color: white; background: var(--glass-border); font-size: 18px; line-height: 1.5; padding: 2px; font-weight: 600; border-radius: 5px; '
  );*/

  console.log(
    "%cPERIGO!", 
    "color: #ff0000; font-size: 40px; font-weight: bold; font-family: sans-serif; text-shadow: 2px 2px 0px #000;"
  );
  console.log(
    "%cEste é um recurso de navegador voltado exclusivamente para desenvolvedores.", 
    "font-size: 16px; font-weight: bold; font-family: sans-serif; margin-top: 10px;"
  );
  console.log(
    "%cSe alguém disse para você copiar e colar um código aqui para ativar um recurso, ganhar descontos ou 'hackear' o sistema, é um golpe (ataque Self-XSS).", 
    "font-size: 16px; font-weight: bold; color: #ffcc00; font-family: sans-serif; margin-top: 10px;"
  );
  console.log(
    "%cColar qualquer código aqui dará aos invasores acesso total à sua conta, permitindo o roubo de dados pessoais, compras indevidas e acesso aos seus pagamentos.", 
    "font-size: 16px; font-weight: bold; color: #ff5555; font-family: sans-serif; margin-top: 10px;"
  );
}
showConsoleWarning();
