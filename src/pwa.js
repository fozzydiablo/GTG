// PWA wiring: register service worker, surface install prompt,
// notify when an update is ready.
import { registerSW } from 'virtual:pwa-register';

export function initPWA() {
  // ---- Service worker registration with update toast ----
  const updateToast = document.getElementById('update-toast');
  const updateBtn = document.getElementById('update-btn');

  const updateSW = registerSW({
    onNeedRefresh() {
      if (updateToast) updateToast.hidden = false;
    },
    onOfflineReady() {
      // Optional: surface a one-shot "ready offline" hint.
      console.info('[GTG] Ready to work offline.');
    },
  });

  updateBtn?.addEventListener('click', () => {
    updateToast.hidden = true;
    updateSW(true);
  });

  // ---- Installable: capture beforeinstallprompt and show button ----
  const installBtn = document.getElementById('install-btn');
  let deferredPrompt = null;

  // If already installed (standalone display mode), keep the button hidden.
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    if (isStandalone) return;
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') installBtn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    deferredPrompt = null;
  });
}
