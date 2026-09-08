function injectEcommeUI() {
  if (document.getElementById('cartSidebar')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <!-- CART -->
    <div class="overlay" id="cartOverlay"></div>

    <div class="cart-sb" id="cartSidebar">
      ...
    </div>

    <!-- FAVORITOS -->
    <div class="overlay" id="favOverlay"></div>

    <div class="fav-sb" id="favSidebar">
      ...
    </div>

    <!-- MORE -->
    <div class="overlay" id="moreOverlay"></div>

    <div class="more-sb" id="moreSidebar">
      ...
    </div>

    <!-- NOTIF -->
    ...

    <!-- ACCOUNT -->
    ...
  `);
}

function initEcommeUI() {
  injectEcommeUI();

  updateCart();
  updateFav();

  // outros módulos...
}
initEcommeUI()
