import { CircadianGreeting } from '../engine/CircadianGreeting.js';
import { LiveUpdateClient } from '../engine/LiveUpdateClient.js';

export class TopNavbar {
  constructor(config, themeDirector) {
    this.config = config;
    this.themeDirector = themeDirector;
    this.updateClient = null;
  }

  render() {
    const user = this.config.user || {};
    const greeting = CircadianGreeting.getGreeting();
    const displayName = user.displayName || 'Adnaan Shah';

    return `
      <header class="engine-header" id="mainHeader">
        <div class="user-identity-plane">
          <span class="greeting-circadian">${greeting}</span>
          <h1 class="greeting-name">${displayName}</h1>
        </div>

        <!-- Floating Live Update Pill -->
        <button id="engineUpdatePill" class="liquid-update-pill is-hidden" aria-label="Update available">
          <span class="pill-sparkle"></span>
          <span class="pill-text">Update Available</span>
        </button>

        <div class="header-action-cluster">
          <!-- Refined SF Symbols Preferences Cog -->
          <button id="engineSettingsBtn" class="glass-icon-btn settings-btn" aria-label="Settings">
            <svg class="ui-icon icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3.2" stroke-width="1.75" />
              <path stroke-width="1.75" d="M19.3 15.15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21.1a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2.9a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V2.9a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1h.09a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.15z" />
            </svg>
          </button>

          <!-- Theme Mode Switcher -->
          <button id="engineThemeBtn" class="glass-icon-btn" aria-label="Toggle Theme">
            <svg class="theme-icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
            <svg class="theme-icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          </button>
        </div>
      </header>
    `;
  }

  bindEvents() {
    this.updateClient = new LiveUpdateClient();

    const themeBtn = document.getElementById('engineThemeBtn');
    if (themeBtn && this.themeDirector) {
      themeBtn.addEventListener('click', () => this.themeDirector.toggle());
    }
  }
}