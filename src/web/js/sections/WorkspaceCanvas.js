export class WorkspaceCanvas {
  constructor(config) {
    this.config = config;
  }

  render() {
    const modules = this.config.modules || [];

    return `
      <main class="engine-workspace" id="engineWorkspace">
        ${
          modules.length === 0
            ? `
              <div class="workspace-empty-stage">
                <h2>System Workspace Active</h2>
                <p>Liquid Glass modular engine online. Ready for domain modules.</p>
              </div>
            `
            : `
              <div class="module-card-grid">
                ${modules.map(mod => `
                  <div class="liquid-module-card" data-module-id="${mod.id}" data-route="${mod.route}">
                    <h3>${mod.name}</h3>
                    <p>Status: ${mod.status}</p>
                  </div>
                `).join('')}
              </div>
            `
        }
      </main>
    `;
  }

  bindEvents() {
    const cards = document.querySelectorAll('.liquid-module-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const route = card.getAttribute('data-route');
        if (route) window.location.href = route;
      });
    });
  }
}