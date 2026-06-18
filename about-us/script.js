function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '../images/favicon-light.png';
  } else {
    favicon.href = '../images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);


let cart = [];
let wishlist = [];
const $ = id => document.getElementById(id);

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
