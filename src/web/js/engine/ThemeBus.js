export class ThemeBus {
  constructor(key = 'sb_theme_preference') {
    this.key = key;
    this.root = document.documentElement;
    this.currentMode = localStorage.getItem(this.key) || 'auto';
    this.apply(this.resolveTheme(this.currentMode));

    // Watch system changes if on auto
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentMode === 'auto') {
        this.apply(this.resolveTheme('auto'));
      }
    });
  }

  resolveTheme(mode) {
    if (mode === 'dark' || mode === 'light') return mode;

    // Circadian Logic: 06:00 to 18:00 is light, otherwise dark
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      return 'light';
    }
    return 'dark';
  }

  apply(theme) {
    this.root.setAttribute('data-theme', theme);
  }

  toggle() {
    const currentApplied = this.root.getAttribute('data-theme');
    const next = currentApplied === 'dark' ? 'light' : 'dark';
    this.currentMode = next;
    localStorage.setItem(this.key, next);
    this.apply(next);
  }

  resetToAuto() {
    this.currentMode = 'auto';
    localStorage.removeItem(this.key);
    this.apply(this.resolveTheme('auto'));
  }
}