import { AuthBus } from '../engine/AuthBus.js';

export class AccountModalAtom {
  constructor() {
    this.authBus = new AuthBus();
  }

  render() {
    const user = this.authBus.getUser() || { displayName: 'Adnaan Shah', username: 'adnaanzshah', role: 'OWNER' };

    return `
      <div id="atomAccountBackdrop" class="atom-modal-backdrop is-hidden">
        <div class="atom-modal-sheet" style="max-width: 420px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Account & Identity</h3>
            <button id="atomAccountCloseBtn" class="glass-close-btn" aria-label="Close">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 22px;">
            <div class="auth-glyph-orb" style="margin-bottom: 12px; width: 62px; height: 62px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h4 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${user.displayName}</h4>
            <span style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">@${user.username || 'adnaanzshah'}</span>
            <span class="auth-brand-badge" style="margin-bottom: 0;">
              <span class="auth-badge-dot"></span>
              <span class="auth-badge-text">${user.role} • Unrestricted Access</span>
            </span>
          </div>

          <div class="settings-group" style="margin-bottom: 20px;">
            <span class="group-label">Vault Permissions</span>
            <div class="settings-cell">
              <span class="cell-title">Privileges</span>
              <span class="cell-value" style="color: var(--accent-green); font-weight: 600;">Full System Owner (*)</span>
            </div>
            <div class="settings-cell">
              <span class="cell-title">Session State</span>
              <span class="cell-value">Active (6h Sliding Expiry)</span>
            </div>
          </div>

          <button id="accountModalLogoutBtn" class="atom-action-btn" style="background: rgba(255, 69, 58, 0.15); color: #ff453a; border: 1px solid rgba(255, 69, 58, 0.35); box-shadow: none;">
            Log Out of Sandbox
          </button>
        </div>
      </div>
    `;
  }

  bind() {
    const backdrop = document.getElementById('atomAccountBackdrop');
    const closeBtn = document.getElementById('atomAccountCloseBtn');
    const logoutBtn = document.getElementById('accountModalLogoutBtn');

    closeBtn?.addEventListener('click', () => backdrop?.classList.add('is-hidden'));
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.add('is-hidden');
    });

    logoutBtn?.addEventListener('click', async () => {
      logoutBtn.textContent = 'Logging out...';
      await this.authBus.logout();
    });
  }

  static open() {
    const backdrop = document.getElementById('atomAccountBackdrop');
    if (backdrop) backdrop.classList.remove('is-hidden');
  }
}