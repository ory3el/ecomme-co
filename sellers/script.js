function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '/images/favicon-light.png';
  } else {
    favicon.href = '/images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

// ══ TOAST ════════════════════════════════════════════════
function toast(msg,type='ok'){
  const t=document.getElementById('toast'),ic=document.getElementById('tIco'),tx=document.getElementById('tMsg');
  tx.textContent=msg;
  ic.className='t-dot '+(type==='ok'?'t-ok':type==='err'?'t-err':'t-inf');
  ic.textContent=type==='ok'?'✓':type==='err'?'!':'ℹ';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}
