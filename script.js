/* ─── SUPABASE ──────────────────────────────────────────────────────── */
/* document.addEventListener("DOMContentLoaded", () => {
  const modalPerfo = document.getElementById('performanceModal');
  const btnClosePerfo = document.getElementById('btnCloseModal');
  const chkNeverShow = document.getElementById('chkNeverShowAgain');
  
  const hideWarning = localStorage.getItem('hidePerformanceWarning');
  
  if (hideWarning === 'true') {
    return;
  }

  function showModalPerfo() {
    modalPerfo.classList.add('show');
  }

  function closeModalPerfo() {
    modalPerfo.classList.remove('show');
    if (chkNeverShow.checked) {
      localStorage.setItem('hidePerformanceWarning', 'true');
    }
  }
  btnClosePerfo.addEventListener('click', closeModalPerfo);

  let lastTick = performance.now();
  let lagCount = 0;

  const performanceMonitor = setInterval(() => {
    const currentTick = performance.now();
    const delta = currentTick - lastTick;
    lastTick = currentTick;

    if (delta > 1500) {
      lagCount++;
      
      if (lagCount >= 2) {
        showModalPerfo();
        clearInterval(performanceMonitor); 
      }
    }
  }, 1000);
});*/

/* ─── PARTICLES ──────────────────────────────────────────────────────── */
(function spawnParticles() {
  const wrap = $('particles');
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'sb-p';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${3+Math.random()*5}s;--dl:${Math.random()*3}s;opacity:${.3+Math.random()*.6}`;
    wrap.appendChild(p);
  }
})();

// NEWSLETTER
function handleSubscribe() {
  showToast('Inscrito! Você receberá descontos exclusivos 🎉');
}

// COUNTDOWN
function updateCountdown() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  const diff = end - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cdH').textContent = String(h).padStart(2,'0');
  document.getElementById('cdM').textContent = String(m).padStart(2,'0');
  document.getElementById('cdS').textContent = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

// PRELOADER
document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  let loadedImages = 0;
  let totalImages = document.images.length;

  function updateProgress(percent) {
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressText) progressText.innerText = percent + "%";
  }

  if (totalImages === 0) {
    updateProgress(100);
  } else {
    for (let i = 0; i < totalImages; i++) {
      let img = new Image();
      
      img.onload = img.onerror = function() {
        loadedImages++;
        let percent = Math.floor((loadedImages / totalImages) * 100);
        updateProgress(percent);
      };
      img.src = document.images[i].src;
    }
  }
});

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  
  if (progressBar) progressBar.style.width = "100%";
  if (progressText) progressText.innerText = "100%";
  
  setTimeout(() => {
    preloader.classList.add('fade-out');
    document.body.classList.remove('loading');
    document.body.classList.remove("noscroll");
    
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
    
  }, 600); 
});

/*
const lagBadge = document.getElementById('lagCounterBadge');

let lastTick;
let lagCount = 0;
let performanceMonitor;

function startMonitor() {
  lastTick = performance.now(); 
    
  performanceMonitor = setInterval(() => {
    const currentTick = performance.now();
    const delta = currentTick - lastTick;
    lastTick = currentTick;

    if (delta > 1500) {
      if (delta > 4000) {
        lagCount += 2; 
      } else {
        lagCount++;
      }

      if (lagBadge) {
        lagBadge.innerText = lagCount;
      }
        
      if (lagCount >= 2) {
        showModalPerfo();
        stopMonitor(); 
      }
    }
  }, 1000);
}

function stopMonitor() {
  clearInterval(performanceMonitor);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMonitor(); 
  } else {
    if (lagCount < 2) {
      setTimeout(() => {
        if (!document.hidden) {
          startMonitor(); 
        }
      }, 2500); 
    }
  }
});
*/
