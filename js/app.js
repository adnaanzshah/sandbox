import { SandboxEngine } from './engine/SandboxEngine.js';

document.addEventListener('DOMContentLoaded', async () => {
  const engine = new SandboxEngine();
  await engine.bootstrap();
});