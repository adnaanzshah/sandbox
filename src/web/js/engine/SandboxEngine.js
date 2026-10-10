import { ThemeDirector } from './ThemeDirector.js';
import { CircadianGreeting } from './CircadianGreeting.js';
import { SettingsSheet } from './SettingsSheet.js';
import { LiveUpdateClient } from './LiveUpdateClient.js';

export class SandboxEngine {
  constructor() {
    this.config = null;
    this.themeDirector = null;
  }

  async bootstrap() {
    try {
      const res = await fetch('/config.json');
      this.config = await res.json();
    } catch (e) {
      this.config = {
        system: { platformName: "Sandbox", version: "2.0.8" },
        user: { displayName: "User", github: "#", linkedin: "#", email: "#" },
        splash: { primaryTitle: "Sandbox", secondarySubtitle: "Workspace", durationMs: 900 }
      };
    }

    this.themeDirector = new ThemeDirector();
    this.renderLayout();
    this.handleSplash();

    new SettingsSheet(this.config);
    new LiveUpdateClient();

    const themeBtn = document.getElementById('engineThemeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.themeDirector.toggle());
    }
  }

  renderLayout() {
    const root = document.getElementById('appRoot');
    if (!root) return;

    const user = this.config.user || {};
    const sys = this.config.system || {};
    const greeting = CircadianGreeting.getGreeting();

    root.innerHTML = `
      <!-- Top Plane -->
      <header class="engine-header">
        <div class="user-identity-plane">
          <span class="greeting-circadian">${greeting}</span>
          <h1 class="greeting-name">${user.displayName || 'Developer'}</h1>
        </div>

        <button id="engineUpdatePill" class="liquid-update-pill is-hidden" aria-label="Update available">
          <span class="pill-sparkle"></span>
          <span class="pill-text">Update Available</span>
        </button>

        <div class="header-action-cluster">
          <button id="engineSettingsBtn" class="glass-icon-btn" aria-label="Settings">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

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

      <!-- Canvas Area -->
      <main class="engine-workspace" id="engineWorkspace">
        <!-- Modular pages inject their content here -->
      </main>

      <!-- Compact Footer -->
      <footer class="engine-footer">
        <div class="footer-left">
          <span class="compact-author">${user.displayName || ''}</span>
          <span class="telemetry-compact">v${sys.version || '2.0.8'}</span>
        </div>
        <div class="footer-right">
          <a href="${user.github || '#'}" target="_blank" rel="noopener noreferrer" class="social-compact-btn" aria-label="GitHub">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <a href="${user.linkedin || '#'}" target="_blank" rel="noopener noreferrer" class="social-compact-btn" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 0 0 1.64-1.64 1.64 1.64 0 1 0-1.64 1.64m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
            </svg>
          </a>
          <a href="mailto:${user.email || '#'}" class="social-compact-btn" aria-label="Email">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </a>
        </div>
      </footer>

      <!-- Settings Sheet -->
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
                <span class="cell-value">v${sys.version || '2.0.8'}</span>
              </div>
              <div class="settings-cell">
                <span class="cell-title">Platform</span>
                <span class="cell-value">${sys.platformName || 'Sandbox'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  handleSplash() {
    const splash = document.getElementById('engineSplash');
    const root = document.getElementById('appRoot');
    const isDebug = localStorage.getItem('sb_debug_splash_mode') === 'true';
    const hasShown = sessionStorage.getItem('sb_splash_shown') === 'true';

    // Populate dynamic text from config
    const brandText = splash ? splash.querySelector('.splash-brand-text') : null;
    const subText = splash ? splash.querySelector('.splash-sub-text') : null;
    if (brandText) brandText.textContent = this.config.splash.primaryTitle || 'Sandbox';
    if (subText) subText.textContent = this.config.splash.secondarySubtitle || 'System Workspace';

    if (hasShown && !isDebug) {
      if (splash) splash.classList.add('is-dismissed');
      if (root) {
        root.classList.remove('is-hidden');
        root.style.opacity = '1';
        root.style.visibility = 'visible';
      }
      return;
    }

    // Play splash animation once, then guarantee transition
    setTimeout(() => {
      if (splash) splash.classList.add('is-dismissed');
      if (root) {
        root.classList.remove('is-hidden');
        root.style.opacity = '1';
        root.style.visibility = 'visible';
      }
      if (!isDebug) sessionStorage.setItem('sb_splash_shown', 'true');
    }, this.config.splash.durationMs || 900);
  }
}