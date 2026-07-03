const products = [
  { id:0, name:'Smartwatch Pro X7', cat:['Eletrônicos', 'Acessórios'], price:189.90, old:299, discount:36, emoji:'⌚', badge:'hot', rating:4.9, reviews:2847, shipping:true, desc:'Smartwatch com monitor cardíaco, SpO2, GPS integrado e resistência à água. Bateria de 14 dias. Compatível com Android e iOS.', features:['Monitor cardíaco e SpO2','GPS integrado','Resistência 5ATM','Bateria 14 dias','Compatível Android/iOS'] },
  { id:1, name:'Fone Bluetooth ANC Pro', cat:'Eletrônicos', price:119.90, old:199, discount:39, emoji:'🎧', badge:'new', rating:4.8, reviews:1523, shipping:true, desc:'Fone de ouvido com cancelamento ativo de ruído, driver 40mm, autonomia de 30h e conexão multidevice.', features:['Cancelamento ativo de ruído','30 horas de autonomia','Driver 40mm premium','Conexão multidevice','Estojo de carregamento'] },
  { id:2, name:'Câmera de Segurança WiFi', cat:'Eletrônicos', price:149.90, old:220, discount:31, emoji:'📷', badge:'sale', rating:4.7, reviews:892, shipping:false, desc:'Câmera IP 2K com visão noturna colorida, detecção de movimento e armazenamento na nuvem.', features:['Resolução 2K Super HD','Visão noturna colorida','Detecção inteligente de movimento','Armazenamento em nuvem','Fácil instalação'] },
  { id:3, name:'Kit Luzes LED Smart RGB', cat:'Casa', price:79.90, old:130, discount:38, emoji:'💡', badge:'hot', rating:4.6, reviews:3102, shipping:true, desc:'Fita LED inteligente de 10m com app, controle por voz (Alexa/Google) e 16 milhões de cores.', features:['10 metros de comprimento','16 milhões de cores','Controle por voz','Compatível Alexa e Google','Instalação simples'] },
  { id:4, name:'Tapete Antiderrapante Premium', cat:'Casa', price:89.90, old:149, discount:39, emoji:'🏠', badge:'new', rating:4.5, reviews:445, shipping:true, desc:'Tapete ecológico antiderrapante com design escandinavo. Lavável à máquina, resistente e macio.', features:['Material ecológico','Base antiderrapante','Lavável à máquina','Design escandinavo','Alta durabilidade'] },
  { id:5, name:'Mini Massageador Portátil', cat:'Fitness', price:129.90, old:210, discount:38, emoji:'💆', badge:'sale', rating:4.9, reviews:2231, shipping:true, desc:'Pistola de massagem percussiva com 6 cabeças intercambiáveis, 30 níveis de intensidade e bateria de 5h.', features:['6 cabeças intercambiáveis','30 níveis de intensidade','Bateria de 5 horas','Motor silencioso','Estojo de transporte'] },
  { id:6, name:'Tênis Running Ultralight', cat:'Moda', price:199.90, old:320, discount:37, emoji:'👟', badge:'hot', rating:4.7, reviews:1876, shipping:true, desc:'Tênis de corrida ultra leve com sola de borracha, tecnologia de amortecimento e palmilha ortopédica removível.', features:['Cabedal em mesh respirável','Amortecimento por gel','Palmilha ortopédica','Solado antiderrapante','Disponível em 8 cores'] },
  { id:7, name:'Mochila Anti-Furto Executiva', cat:['Moda', 'Acessórios'], price:159.90, old:250, discount:36, emoji:'🎒', badge:'new', rating:4.8, reviews:987, shipping:false, desc:'Mochila com compartimento USB, bolso anti-RFID, material impermeável e capacidade de 28L.', features:['Porta USB embutida','Proteção RFID','Impermeável','28 litros de capacidade','Compartimento para notebook'] },
  { id:8, name:'Secador de Cabelo Íon Pro', cat:['Beleza', 'Eletrônicos'], price:149.90, old:249, discount:39, emoji:'💇', badge:'sale', rating:4.6, reviews:654, shipping:true, desc:'Secador 2200W com tecnologia iônica, diffusor incluso e 3 velocidades para cabelos mais lisos e brilhosos.', features:['2200W de potência','Tecnologia iônica','Diffusor incluso','3 velocidades','Cabo giratório 360°'] },
  { id:9, name:'Kit Skincare Vitamina C', cat:'Beleza', price:99.90, old:160, discount:37, emoji:'✨', badge:'hot', rating:4.9, reviews:4521, shipping:true, desc:'Kit completo com sérum, hidratante e protetor solar com vitamina C. Pele radiante em 30 dias.', features:['Sérum vitamina C 30ml','Hidratante FPS 30','Protetor solar facial','Dermatologicamente testado','Vegano e cruelty-free'] },
  { id:10, name:'Raçao Premium para Cães', cat:'Pets', price:89.90, old:140, discount:35, emoji:'🐕', badge:'new', rating:4.8, reviews:1234, shipping:true, desc:'Ração super premium com proteína animal real, sem corantes artificiais e enriquecida com ômega-3.', features:['Proteína animal real','Sem corantes artificiais','Ômega-3 adicionado','Sem transgênicos','Veterinário aprovado'] },
  { id:11, name:'Garrafa Térmica 1L Inox', cat:'Fitness', price:69.90, old:110, discount:36, emoji:'🍶', badge:'sale', rating:4.7, reviews:3876, shipping:true, desc:'Garrafa em aço inox 18/8 que mantém bebidas geladas por 24h e quentes por 12h. Tampa hermética.', features:['Aço inox 18/8 premium','Gelado 24h / Quente 12h','Tampa hermética','BPA Free','1 litro de capacidade'] },
];

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
