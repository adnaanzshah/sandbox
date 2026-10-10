export class BottomFooter {
  constructor(config) {
    this.config = config;
  }

  render() {
    const user = this.config.user || {};
    const sys = this.config.system || {};
    const displayName = user.displayName || 'Adnaan Shah';
    const footerCredit = user.footerCredit || 'Engineered & Crafted by';
    const versionNum = sys.version || '2.0.16';

    return `
      <footer class="engine-footer" id="mainFooter">
        <div class="footer-left">
          <span class="footer-credit-text">${footerCredit}</span>
          <span class="compact-author">${displayName}</span>
          <span class="telemetry-compact">v${versionNum}</span>
        </div>
        <div class="footer-right">
          <a href="${user.github || 'https://github.com/adnaanzshah'}" target="_blank" rel="noopener noreferrer" class="social-compact-btn" aria-label="GitHub">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <a href="${user.linkedin || 'https://linkedin.com/in/adnaanzshah'}" target="_blank" rel="noopener noreferrer" class="social-compact-btn" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 0 0 1.64-1.64 1.64 1.64 0 1 0-1.64 1.64m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
            </svg>
          </a>
          <a href="mailto:${user.email || 'adnaan.shah.work@gmail.com'}" class="social-compact-btn" aria-label="Email">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </a>
        </div>
      </footer>
    `;
  }

  bindEvents() {}
}