export class BodySection {
  constructor(config) {
    this.config = config;
  }

  render() {
    const pName = this.config.system?.projectName || 'Sandbox';
    return `
      <main class="section-body-workspace" id="bodyWorkspace">
        <div class="atom-workspace-stage">
          <h2>${pName} Active</h2>
          <p>Atomic Component Engine online. No redundant hardcoded values.</p>
        </div>
      </main>
    `;
  }

  bind() {}
}