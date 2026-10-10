export class SettingsSheet {
  constructor(config) {
    this.config = config;
    this.backdrop = document.getElementById('engineSettingsBackdrop');
    this.openBtn = document.getElementById('engineSettingsBtn');
    this.closeBtn = document.getElementById('engineCloseSettingsBtn');
    this.splashSwitch = document.getElementById('engineSplashDebugSwitch');
    this.debugKey = 'sb_debug_splash_mode';

    this.bind();
  }

  bind() {
    if (!this.backdrop || !this.openBtn || !this.closeBtn) return;
    if (this.splashSwitch) {
      this.splashSwitch.checked = localStorage.getItem(this.debugKey) === 'true';
      this.splashSwitch.addEventListener('change', (e) => {
        localStorage.setItem(this.debugKey, e.target.checked ? 'true' : 'false');
        if (e.target.checked) sessionStorage.removeItem('sb_splash_shown');
      });
    }

    this.openBtn.addEventListener('click', () => this.backdrop.classList.remove('is-hidden'));
    this.closeBtn.addEventListener('click', () => this.backdrop.classList.add('is-hidden'));
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.backdrop.classList.add('is-hidden');
    });
  }
}