import { GreetingAtom } from '../atoms/GreetingAtom.js';
import { UpdatePillAtom } from '../atoms/UpdatePillAtom.js';
import { SettingsButtonAtom } from '../atoms/SettingsButtonAtom.js';
import { ThemeToggleAtom } from '../atoms/ThemeToggleAtom.js';
import { AccountModalAtom } from '../atoms/AccountModalAtom.js';

export class TopSection {
  constructor(config, themeBus, onOpenSettings) {
    this.config = config;
    this.themeBus = themeBus;
    this.onOpenSettings = onOpenSettings;
  }

  render() {
    const user = this.config.user?.displayName || 'Adnaan Shah';
    return `
      <header class="section-header-plane">
        ${GreetingAtom.render(user)}
        ${UpdatePillAtom.render()}
        <div class="section-header-actions">
          <!-- 1-Click User Profile / Account Button -->
          <button id="atomAccountBtn" class="atom-icon-btn" aria-label="Account Details" title="Account Management">
            <svg class="atom-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>

          <!-- Settings Button -->
          ${SettingsButtonAtom.render()}

          <!-- Theme Mode Switcher -->
          ${ThemeToggleAtom.render()}
        </div>
      </header>
    `;
  }

  bind() {
    UpdatePillAtom.bind(async () => {
      const pill = document.getElementById('atomUpdatePill');
      if (pill) pill.innerText = 'Updating...';
      const res = await fetch('/api/update/apply', { method: 'POST' });
      const data = await res.json();
      if (data.success) window.location.reload();
    });

    // 1-Click Account Sheet Open
    document.getElementById('atomAccountBtn')?.addEventListener('click', () => {
      AccountModalAtom.open();
    });

    SettingsButtonAtom.bind(this.onOpenSettings);
    ThemeToggleAtom.bind(() => this.themeBus.toggle());
  }
}