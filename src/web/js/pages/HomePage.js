import { TopSection } from '../sections/TopSection.js';
import { BodySection } from '../sections/BodySection.js';
import { BottomSection } from '../sections/BottomSection.js';
import { SettingsModalSection } from '../sections/SettingsModalSection.js';
import { AccountModalAtom } from '../atoms/AccountModalAtom.js';

export class HomePage {
  constructor(config, themeBus) {
    this.config = config;
    this.topSection = new TopSection(config, themeBus, () => this.openSettings());
    this.bodySection = new BodySection(config);
    this.bottomSection = new BottomSection(config);
    this.settingsModal = new SettingsModalSection(config);
    this.accountModal = new AccountModalAtom();
  }

  render() {
    return `
      ${this.topSection.render()}
      ${this.bodySection.render()}
      ${this.bottomSection.render()}
      ${this.settingsModal.render()}
      ${this.accountModal.render()}
    `;
  }

  bind() {
    this.topSection.bind();
    this.bodySection.bind();
    this.bottomSection.bind();
    this.settingsModal.bind();
    this.accountModal.bind();
  }

  openSettings() {
    const backdrop = document.getElementById('atomModalBackdrop');
    if (backdrop) backdrop.classList.remove('is-hidden');
  }
}