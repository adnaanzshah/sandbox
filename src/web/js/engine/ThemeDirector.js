export class ThemeDirector {
  constructor(storageKey = 'sb_theme_preference') {
    this.storageKey = storageKey;
    this.root = document.documentElement;
    this.currentTheme = this.resolveTheme();
    this.apply(this.currentTheme);
  }

  resolveTheme() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  apply(theme) {
    this.currentTheme = theme;
    this.root.setAttribute('data-theme', theme);
    localStorage.setItem(this.storageKey, theme);
  }

  toggle() {
    this.apply(this.currentTheme === 'dark' ? 'light' : 'dark');
  }
}