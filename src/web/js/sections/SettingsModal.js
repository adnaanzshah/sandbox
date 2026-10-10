export class SettingsModal {
  constructor(config) {
    this.config = config;
    this.debugKey = 'sb_debug_splash_mode';
  }

  render() {
    const sys = this.config.system || {};
    const versionNum = sys.version || '2.0.16';

    return `
      <div id="engineSettingsBackdrop" class="modal-backdrop is-hidden">
        <div class="modal-sheet">
          <div class="modal-header">
            <h3 class="modal-title">Settings</h3>
            <button id="engineCloseSettingsBtn" class="glass-close-btn" aria-label="Close">✕</button>
          </div>
          <div class="modal-content">
            <div class="settings-group">
              <span class="group-label">Visual Diagnostics</span>
              <div class="settings-cell">
                <div class="cell-info">
                  <span class="cell-title">Debug Splash Screen</span>
                  <span class="cell-desc">Replay welcome splash animation on every page refresh</span>
                </div>
                <label class="ios-switch">
                  <input type="checkbox" id="engineSplashDebugSwitch" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-group">
              <span class="group-label">Build Information</span>
              <div class="settings-cell">
                <span class="cell-title">Version</span>
                <span class="cell-value">v${versionNum}</span>
              </div>
              <div class="settings-cell">
                <span class="cell-title">Platform</span>
                <span class="cell-value">${sys.platformName || 'Sandbox'}</span>
              </div>
              <div class="settings-cell" style="justify-content: center;">
                <button id="engineForceUpdateBtn" class="liquid-update-pill" style="width: 100%; justify-content: center; animation: none;">
                  <span class="pill-sparkle"></span>
                  <span class="pill-text">Force Sync Remote Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = document.getElementById('engineSettingsBackdrop');
    const openBtn = document.getElementById('engineSettingsBtn');
    const closeBtn = document.getElementById('engineCloseSettingsBtn');
    const splashSwitch = document.getElementById('engineSplashDebugSwitch');
    const forceBtn = document.getElementById('engineForceUpdateBtn');

    if (openBtn && backdrop) {
      openBtn.addEventListener('click', () => backdrop.classList.remove('is-hidden'));
    }
    if (closeBtn && backdrop) {
      closeBtn.addEventListener('click', () => backdrop.classList.add('is-hidden'));
    }
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('is-hidden');
      });
    }

    if (splashSwitch) {
      splashSwitch.checked = localStorage.getItem(this.debugKey) === 'true';
      splashSwitch.addEventListener('change', (e) => {
        localStorage.setItem(this.debugKey, e.target.checked ? 'true' : 'false');
        if (e.target.checked) sessionStorage.removeItem('sb_splash_shown');
      });
    }

    if (forceBtn) {
      forceBtn.addEventListener('click', async () => {
        forceBtn.innerText = 'Syncing from GitHub...';
        try {
          const res = await fetch('/api/update/apply', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            forceBtn.innerText = 'Success! Reloading...';
            setTimeout(() => window.location.reload(), 600);
          } else {
            alert('Sync failed: ' + data.error);
            forceBtn.innerText = 'Force Sync Remote Now';
          }
        } catch (e) {
          alert('Network error while forcing sync.');
          forceBtn.innerText = 'Force Sync Remote Now';
        }
      });
    }
  }
}