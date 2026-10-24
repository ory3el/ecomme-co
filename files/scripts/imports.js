// ===============================================

const supabaseSrc = document.createElement('script');
supabaseSrc.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(supabaseSrc);

const authSessionCheck = document.createElement('script');
authSessionCheck.src = '/files/scripts/auth-session-check.js';
document.head.appendChild(authSessionCheck);

const consoleWarning = document.createElement('script');
consoleWarning.src = '/files/scripts/console-warning.js';
document.head.appendChild(consoleWarning);

const confirmModal = document.createElement('script');
confirmModal.src = '/files/scripts/confirm-modal.js';
document.head.appendChild(confirmModal);

const loading = document.createElement('script');
loading.src = '/files/scripts/loading.js';
document.head.appendChild(loading);

const sidebars = document.createElement('script');
sidebars.src = '/files/scripts/sidebars.js';
document.head.appendChild(sidebars);

const wishlistLists = document.createElement('script');
wishlistLists.src = '/files/scripts/wishlist-lists.js';
document.head.appendChild(wishlistLists);

// ===============================================
