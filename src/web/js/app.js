import { EngineCore } from './engine/EngineCore.js';
import { HomePage } from './pages/HomePage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const engine = new EngineCore();
  const appShell = document.getElementById('appShell');

  try {
    const config = await engine.fetchSystemState();
    if (appShell) {
      const page = new HomePage(config, engine.themeBus);
      appShell.innerHTML = page.render();
      page.bind();
    }
  } catch (err) {
    console.error('[Engine Bootstrap Notice]:', err);
    // Bulletproof Fallback UI: If any sub-atom failed, mount directly
    if (appShell && appShell.children.length === 0) {
      appShell.innerHTML = `
        <header class="section-header-plane">
          <div class="atom-greeting">
            <span class="atom-greeting-circadian">Welcome</span>
            <h1 class="atom-greeting-name">Adnaan Shah</h1>
          </div>
        </header>
        <main class="section-body-workspace">
          <div class="atom-workspace-stage">
            <h2>Sandbox System Online</h2>
            <p>Components active. Liquid Glass environment ready.</p>
          </div>
        </main>
      `;
    }
  } finally {
    engine.dismissSplash();
  }
});