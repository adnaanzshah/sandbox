import { ThemeBus } from './ThemeBus.js';

export class EngineCore {
  constructor() {
    this.config = null;
    this.themeBus = new ThemeBus();
  }

  async fetchSystemState() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('API config error');
      this.config = await res.json();
    } catch {
      this.config = {
        system: { projectName: "Sandbox", version: "2.1.3", portalBadge: "System Workspace" },
        user: { 
          displayName: "Adnaan Shah", 
          creditTitle: "Engineered & Crafted by",
          githubUrl: "https://github.com/adnaanzshah",
          linkedinUrl: "https://linkedin.com/in/adnaanzshah",
          emailAddress: "adnaan.shah.work@gmail.com"
        },
        splash: { durationMs: 700 }
      };
    }
    return this.config;
  }

  dismissSplash() {
    const splash = document.getElementById('engineSplash');
    const isDebug = localStorage.getItem('sb_debug_splash') === 'true';
    const seen = sessionStorage.getItem('sb_splash_seen') === 'true';

    if (seen && !isDebug) {
      if (splash) {
        splash.classList.add('is-dismissed');
        splash.style.display = 'none';
      }
      return;
    }

    const duration = this.config?.splash?.durationMs || 700;
    setTimeout(() => {
      if (splash) {
        splash.classList.add('is-dismissed');
        splash.style.display = 'none';
      }
    }, duration);
  }
}