export class GreetingAtom {
  static resolve() {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 22) return 'Good evening';
    return 'Good night';
  }

  static render(name) {
    return `
      <div class="atom-greeting">
        <span class="atom-greeting-circadian">${this.resolve()}</span>
        <h1 class="atom-greeting-name">${name}</h1>
      </div>
    `;
  }
}