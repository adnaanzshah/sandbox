import { GreetingAtom } from '../atoms/GreetingAtom.js';
import { UpdatePillAtom } from '../atoms/UpdatePillAtom.js';
import { SettingsButtonAtom } from '../atoms/SettingsButtonAtom.js';
import { ThemeToggleAtom } from '../atoms/ThemeToggleAtom.js';

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
          ${SettingsButtonAtom.render()}
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

    SettingsButtonAtom.bind(this.onOpenSettings);
    ThemeToggleAtom.bind(() => this.themeBus.toggle());
  }
}