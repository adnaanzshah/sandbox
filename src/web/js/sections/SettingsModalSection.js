import { ForceSyncAtom } from '../atoms/ForceSyncAtom.js';
import { AuthBus } from '../engine/AuthBus.js';

export class SettingsModalSection {
  constructor(config) {
    this.config = config;
    this.isRestarting = false;
    this.authBus = new AuthBus();
  }

  render() {
    const sys = this.config.system || {};
    const currentUser = this.authBus.getUser() || { displayName: 'Adnaan Shah', role: 'OWNER' };

    return `
      <div id="atomModalBackdrop" class="atom-modal-backdrop is-hidden">
        <div class="atom-modal-sheet" style="max-height: 85vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Settings</h3>
            <button id="atomModalCloseBtn" class="glass-close-btn" aria-label="Close">✕</button>
          </div>

          <!-- 1. Authenticated Identity & Logout Section -->
          <div style="margin-bottom: 16px;">
            <span class="group-label">Active Session</span>
            <div class="settings-cell">
              <div class="cell-info">
                <span class="cell-title">${currentUser.displayName}</span>
                <span class="cell-desc">Role: ${currentUser.role} (Unrestricted)</span>
              </div>
              <button id="guiLogoutBtn" class="atom-update-pill" style="border-color: rgba(255, 69, 58, 0.45); color: #ff453a; animation: none;">
                <span class="pill-sparkle" style="background-color: #ff453a; box-shadow: 0 0 6px #ff453a;"></span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
          
          <!-- 2. Services Control Center -->
          <div style="margin-bottom: 16px;">
            <span class="group-label">Services Control Center</span>
            <div style="padding: 12px 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--text-primary);">Web Server</span>
                <span id="svcWebBadge" style="color: var(--accent-green); font-weight: 600;">Active (3000)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--text-primary);">Updater Daemon</span>
                <span id="svcUpdaterBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--text-primary);">Doctor Daemon</span>
                <span id="svcDoctorBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: var(--text-primary);">Database Engine</span>
                <span id="svcDbBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="margin-top: 6px;">
                <button id="guiRestartServicesBtn" class="atom-icon-btn" style="width: 100%; border-radius: var(--radius-cell); font-size: 0.85rem; font-weight: 600; padding: 12px 0;">
                  ↻ Restart Services
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Visual Diagnostics -->
          <div style="margin-bottom: 16px;">
            <span class="group-label">Visuals & Preferences</span>
            <div class="settings-cell">
              <div class="cell-info">
                <span class="cell-title">Debug Splash Screen</span>
                <span class="cell-desc">Replay splash on refresh</span>
              </div>
              <label class="atom-ios-switch">
                <input type="checkbox" id="atomSplashDebugToggle" />
                <span class="atom-ios-slider"></span>
              </label>
            </div>
          </div>

          <!-- 4. System Registry & Git Pull -->
          <div>
            <span class="group-label">System Registry</span>
            <div style="padding: 12px 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="color: var(--text-secondary);">Project</span>
                <span style="font-weight: 600; color: var(--text-primary);">${sys.projectName || 'Sandbox'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="color: var(--text-secondary);">Version</span>
                <span style="font-weight: 600; color: var(--text-primary);">v${sys.version || '2.3.6'}</span>
              </div>
              <div style="margin-top: 6px;">
                ${ForceSyncAtom.render()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async refreshServiceStatus() {
    try {
      const res = await fetch('/api/services/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const uEl = document.getElementById('svcUpdaterBadge');
        const dEl = document.getElementById('svcDoctorBadge');
        if (uEl) uEl.innerHTML = data.updater?.pid ? `<span style="color: var(--accent-green);">Running (${data.updater.pid})</span>` : '<span style="color: #ff3b30;">Stopped</span>';
        if (dEl) dEl.innerHTML = data.doctor?.pid ? `<span style="color: var(--accent-green);">Running (${data.doctor.pid})</span>` : '<span style="color: #ff3b30;">Stopped</span>';
      }
    } catch {}

    try {
      const dbRes = await fetch('/api/db/health', { cache: 'no-store' });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        const dbEl = document.getElementById('svcDbBadge');
        if (dbEl) {
          dbEl.innerHTML = dbData.status === 'healthy'
            ? `<span style="color: var(--accent-green);">Live (${dbData.engine || '5432'})</span>`
            : `<span style="color: #ff9500;">Standby</span>`;
        }
      }
    } catch {}
  }

  bind() {
    const backdrop = document.getElementById('atomModalBackdrop');
    const closeBtn = document.getElementById('atomModalCloseBtn');
    const toggle = document.getElementById('atomSplashDebugToggle');
    const restartBtn = document.getElementById('guiRestartServicesBtn');
    const logoutBtn = document.getElementById('guiLogoutBtn');

    closeBtn?.addEventListener('click', () => backdrop?.classList.add('is-hidden'));
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.add('is-hidden');
    });

    logoutBtn?.addEventListener('click', async () => {
      logoutBtn.innerText = 'Logging out...';
      await this.authBus.logout();
    });

    if (toggle) {
      toggle.checked = localStorage.getItem('sb_debug_splash') === 'true';
      toggle.addEventListener('change', (e) => {
        localStorage.setItem('sb_debug_splash', e.target.checked ? 'true' : 'false');
        if (e.target.checked) sessionStorage.removeItem('sb_splash_seen');
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', async () => {
        if (this.isRestarting) return;
        this.isRestarting = true;
        restartBtn.disabled = true;
        restartBtn.style.opacity = '0.6';
        restartBtn.innerText = '↻ Restarting Stack...';

        try {
          await fetch('/api/services/restart', { method: 'POST' });
        } catch {}

        // Active resilient polling loop
        let attempts = 0;
        const maxAttempts = 25;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const check = await fetch('/api/services/status', { cache: 'no-store' });
            if (check.ok) {
              clearInterval(pollInterval);
              restartBtn.innerText = '✓ Stack Restored!';
              await this.refreshServiceStatus();
              setTimeout(() => {
                restartBtn.disabled = false;
                restartBtn.style.opacity = '1';
                restartBtn.innerText = '↻ Restart Services';
                this.isRestarting = false;
              }, 1200);
            }
          } catch {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              restartBtn.disabled = false;
              restartBtn.style.opacity = '1';
              restartBtn.innerText = '↻ Restart Services';
              this.isRestarting = false;
            }
          }
        }, 600);
      });
    }

    ForceSyncAtom.bind();
    this.refreshServiceStatus();
  }
}