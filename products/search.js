// ── BANCO DE DADOS DE PRODUTOS SIMULADO (Substitua pela sua API ou Banco se houver) ──
const ALL_PRODUCTS = [
  { id: 1, name: 'Smartwatch Pro X7', cat: 'Eletrônicos', price: 189.90, img: 'watch.png' },
  { id: 2, name: 'Fone Bluetooth ANC Pro', cat: 'Eletrônicos', price: 119.90, img: 'phone.png' },
  { id: 3, name: 'Kit LED Smart RGB 10m', cat: 'Casa', price: 79.90, img: 'led.png' },
  { id: 4, name: 'Teclado Mecânico Gamer', cat: 'Informática', price: 249.90, img: 'keyboard.png' }
];

// 1. Captura o parâmetro '?q=' diretamente da URL do navegador
function getQueryParameter() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('q') || ''; // Retorna o texto buscado ou vazio
}

// 2. Executa o filtro e renderiza os elementos na tela
function runSearch() {
  const query = getQueryParameter().toLowerCase().trim();
  const resultsGrid = document.getElementById('searchResults');
  const titleHeader = document.getElementById('searchTitle');

  // Atualiza o input do topo com o termo que já estava na URL (para o usuário ver o que buscou)
  document.getElementById('mainSearchInput').value = query;

  // Atualiza o título da página
  if (query) {
    titleHeader.textContent = `Resultados para: "${query}"`;
  } else {
    titleHeader.textContent = 'Explore todos os nossos produtos';
  }

  // Filtra os produtos pelo Nome ou pela Categoria
  const matchedProducts = ALL_PRODUCTS.filter(product => {
    return product.name.toLowerCase().includes(query) || 
           product.cat.toLowerCase().includes(query);
  });

  // Se a busca não retornar nenhum resultado
  if (matchedProducts.length === 0) {
    resultsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;">
        <span style="font-size: 40px;">🔍</span>
        <p style="margin-top: 16px; font-size: 14px;">Não encontramos nenhum resultado para "${query}".</p>
        <p style="font-size: 12px; color: #94a3b8;">Tente verificar a ortografia ou use termos mais gerais.</p>
      </div>
    `;
    return;
  }

  // Renderiza a lista de cards filtrados
  resultsGrid.innerHTML = matchedProducts.map(prod => `
    <div class="product-card" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fff; transition: transform 0.2s;">
      <div style="height: 150px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
        📦 </div>
      <div style="margin-top: 12px;">
        <span style="font-size: 11px; color: #2563eb; font-weight: 600; text-transform: uppercase;">${prod.cat}</span>
        <h3 style="font-size: 14px; color: #0f1a2e; margin: 4px 0 8px 0; font-weight: 500; height: 40px; overflow: hidden;">${prod.name}</h3>
        <div style="font-size: 16px; font-weight: 700; color: #0f1a2e;">
          R$ ${prod.price.toFixed(2).replace('.', ',')}
        </div>
        <button onclick="addToCart(${prod.id})" style="width: 100%; margin-top: 12px; padding: 8px; background: #0f1a2e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
          Adicionar ao carrinho
        </button>
      </div>
    </div>
  `).join('');
}

// 3. Função ativa para o botão de pesquisa disparar novas buscas
function doSearch() {
  const query = document.getElementById('mainSearchInput').value.trim();
  if (query) {
    // Redireciona mantendo o formato de URL limpa suportada pelo Cloudflare Pages
    window.location.href = `/products-search?q=${encodeURIComponent(query)}`;
  }
}

// Escuta o clique da tecla "Enter" dentro do input de pesquisa
document.getElementById('mainSearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

// Inicializa a busca assim que o HTML carregar na VPS/Cloudflare
window.addEventListener('DOMContentLoaded', runSearch);
