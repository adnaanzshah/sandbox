import { ThemeDirector } from '../engine/ThemeDirector.js';

export class SandboxEngine {
  constructor() {
    this.config = null;
    this.themeDirector = null;
  }

  async init() {
    try {
      const res = await fetch('/api/config');
      this.config = await res.json();
    } catch (e) {
      this.config = {
        system: { platformName: "Sandbox", version: "2.0.16" },
        user: { 
          displayName: "Adnaan Shah", 
          footerCredit: "Engineered & Crafted by", 
          github: "https://github.com/adnaanzshah", 
          linkedin: "https://linkedin.com/in/adnaanzshah", 
          email: "adnaan.shah.work@gmail.com" 
        },
        splash: { primaryTitle: "Sandbox", secondarySubtitle: "System Workspace", durationMs: 900 }
      };
    }

    this.themeDirector = new ThemeDirector();
    return this.config;
  }

  completeBoot() {
    const splash = document.getElementById('engineSplash');
    const root = document.getElementById('appRoot');
    const isDebug = localStorage.getItem('sb_debug_splash_mode') === 'true';
    const hasShown = sessionStorage.getItem('sb_splash_shown') === 'true';

    const brandText = splash ? splash.querySelector('.splash-brand-text') : null;
    const subText = splash ? splash.querySelector('.splash-sub-text') : null;
    if (brandText) brandText.textContent = this.config.splash?.primaryTitle || 'Sandbox';
    if (subText) subText.textContent = this.config.splash?.secondarySubtitle || 'System Workspace';

    if (hasShown && !isDebug) {
      if (splash) splash.classList.add('is-dismissed');
      if (root) {
        root.classList.remove('is-hidden');
        root.style.opacity = '1';
        root.style.visibility = 'visible';
      }
      return;
    }

    setTimeout(() => {
      if (splash) splash.classList.add('is-dismissed');
      if (root) {
        root.classList.remove('is-hidden');
        root.style.opacity = '1';
        root.style.visibility = 'visible';
      }
      if (!isDebug) sessionStorage.setItem('sb_splash_shown', 'true');
    }, this.config.splash?.durationMs || 900);
  }
}