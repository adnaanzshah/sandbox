import { SandboxEngine } from './SandboxEngine.js';
import { TopNavbar } from '../sections/TopNavbar.js';
import { WorkspaceCanvas } from '../sections/WorkspaceCanvas.js';
import { BottomFooter } from '../sections/BottomFooter.js';
import { SettingsModal } from '../sections/SettingsModal.js';

export class SandboxApp {
  constructor() {
    this.engine = new SandboxEngine();
    this.topNavbar = null;
    this.workspace = null;
    this.bottomFooter = null;
    this.settingsModal = null;
  }

  async launch() {
    // 1. Fetch dynamic config and initialize engine lifecycle
    const config = await this.engine.init();

    // 2. Instantiate isolated section controllers
    this.topNavbar = new TopNavbar(config, this.engine.themeDirector);
    this.workspace = new WorkspaceCanvas(config);
    this.bottomFooter = new BottomFooter(config);
    this.settingsModal = new SettingsModal(config);

    // 3. Assemble document layout
    const appRoot = document.getElementById('appRoot');
    if (appRoot) {
      appRoot.innerHTML = `
        ${this.topNavbar.render()}
        ${this.workspace.render()}
        ${this.bottomFooter.render()}
        ${this.settingsModal.render()}
      `;

      // 4. Bind event listeners per section
      this.topNavbar.bindEvents();
      this.workspace.bindEvents();
      this.bottomFooter.bindEvents();
      this.settingsModal.bindEvents();
    }

    // 5. Complete splash transition sequence
    this.engine.completeBoot();
  }
}