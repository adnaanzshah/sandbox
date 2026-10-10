import { SandboxApp } from './core/SandboxApp.js';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new SandboxApp();
  await app.launch();
});