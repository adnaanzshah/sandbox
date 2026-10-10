import { ForceSyncAtom } from '../atoms/ForceSyncAtom.js';

export class SettingsModalSection {
  constructor(config) {
    this.config = config;
  }

  render() {
    const sys = this.config.system || {};
    return `
      <div id="atomModalBackdrop" class="atom-modal-backdrop is-hidden">
        <div class="atom-modal-sheet" style="max-height: 85vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.15rem; font-weight: 700;">Settings & Control Center</h3>
            <button id="atomModalCloseBtn" style="background: none; border: none; font-size: 1.1rem; color: var(--text-primary); cursor: pointer;">✕</button>
          </div>
          
          <!-- 1. Process & Services Manager GUI -->
          <div style="margin-bottom: 16px;">
            <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">Services Control Center</span>
            <div style="padding: 12px 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span>Web Server</span>
                <span id="svcWebBadge" style="color: #34c759; font-weight: 600;">Active (3000)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span>Updater Daemon</span>
                <span id="svcUpdaterBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span>Doctor Daemon</span>
                <span id="svcDoctorBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span>Database (PostgreSQL)</span>
                <span id="svcDbBadge" style="font-weight: 600;">Inspecting...</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button id="guiRestartServicesBtn" class="atom-icon-btn" style="width: 100%; border-radius: var(--radius-cell); font-size: 0.8rem; font-weight: 600; gap: 6px;">
                  ↻ Restart Services
                </button>
              </div>
            </div>
          </div>

          <!-- 2. System Diagnostics -->
          <div style="margin-bottom: 16px;">
            <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">Visuals & Preferences</span>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-top: 6px;">
              <div>
                <span style="font-size: 0.9rem; font-weight: 600; display: block;">Debug Splash Screen</span>
                <span style="font-size: 0.76rem; color: var(--text-secondary);">Replay splash on every refresh (Default: Off)</span>
              </div>
              <label class="atom-ios-switch">
                <input type="checkbox" id="atomSplashDebugToggle" />
                <span class="atom-ios-slider"></span>
              </label>
            </div>
          </div>

          <!-- 3. Remote Sync & Doctor Logs -->
          <div>
            <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">Registry & Git Sync</span>
            <div style="padding: 12px 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="color: var(--text-secondary);">Project</span>
                <span style="font-weight: 600;">${sys.projectName || 'Sandbox'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="color: var(--text-secondary);">Version</span>
                <span style="font-weight: 600;">v${sys.version || '2.2.0'}</span>
              </div>
              <div style="margin-top: 4px;">
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
      const res = await fetch('/api/services/status');
      const data = await res.json();
      const uEl = document.getElementById('svcUpdaterBadge');
      const dEl = document.getElementById('svcDoctorBadge');
      if (uEl) uEl.innerHTML = data.updater?.pid ? `<span style="color: #34c759;">Running (${data.updater.pid})</span>` : '<span style="color: #ff3b30;">Stopped</span>';
      if (dEl) dEl.innerHTML = data.doctor?.pid ? `<span style="color: #34c759;">Running (${data.doctor.pid})</span>` : '<span style="color: #ff3b30;">Stopped</span>';
    } catch (e) {}

    try {
      const dbRes = await fetch('/api/db/health');
      const dbData = await dbRes.json();
      const dbEl = document.getElementById('svcDbBadge');
      if (dbEl) {
        dbEl.innerHTML = dbData.status === 'healthy' || dbData.status === 'connected'
          ? `<span style="color: #34c759;">Live (5432)</span>`
          : `<span style="color: #ff9500;" title="${dbData.details || ''}">Standby</span>`;
      }
    } catch (e) {}
  }

  bind() {
    const backdrop = document.getElementById('atomModalBackdrop');
    const closeBtn = document.getElementById('atomModalCloseBtn');
    const toggle = document.getElementById('atomSplashDebugToggle');
    const restartBtn = document.getElementById('guiRestartServicesBtn');

    closeBtn?.addEventListener('click', () => backdrop?.classList.add('is-hidden'));
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.add('is-hidden');
    });

    if (toggle) {
      // Default is False (Off)
      toggle.checked = localStorage.getItem('sb_debug_splash') === 'true';
      toggle.addEventListener('change', (e) => {
        localStorage.setItem('sb_debug_splash', e.target.checked ? 'true' : 'false');
        if (e.target.checked) sessionStorage.removeItem('sb_splash_seen');
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', async () => {
        restartBtn.innerText = 'Restarting...';
        await fetch('/api/services/restart', { method: 'POST' });
        setTimeout(() => window.location.reload(), 1400);
      });
    }

    ForceSyncAtom.bind();
    this.refreshServiceStatus();
  }
}