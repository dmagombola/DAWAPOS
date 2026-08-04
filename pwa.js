// DawaPOS PWA: service worker registration + install prompt
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('SW registration failed:', err));
  });
}

let deferredInstallPrompt = null;

function isIosDevice() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandaloneMode() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => { dismissInstallBanner(); deferredInstallPrompt = null; });

function showInstallBanner() {
  if (isStandaloneMode() || localStorage.getItem('pwaInstallDismissed')) return;
  const banner = document.getElementById('installBanner');
  if (!banner) return;
  const btn = document.getElementById('installBannerBtn');
  const txt = document.getElementById('installBannerText');
  if (isIosDevice()) {
    if (btn) btn.style.display = 'none';
    if (txt) txt.innerHTML = 'Install DawaPOS: tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>';
  } else {
    if (btn) btn.style.display = deferredInstallPrompt ? 'block' : 'none';
  }
  banner.style.display = 'flex';
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  try {
    const res = await deferredInstallPrompt.userChoice;
    if (res.outcome === 'accepted') dismissInstallBanner();
  } catch (e) {}
  deferredInstallPrompt = null;
}

function dismissInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  localStorage.setItem('pwaInstallDismissed', '1');
}

// iOS never fires beforeinstallprompt - show instructions banner once per device
window.addEventListener('load', () => {
  if (isIosDevice()) setTimeout(showInstallBanner, 4000);
});
