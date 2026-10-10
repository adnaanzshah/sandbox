import { EngineCore } from './engine/EngineCore.js';
import { HomePage } from './pages/HomePage.js';
import { AuthBus } from './engine/AuthBus.js';

document.addEventListener('DOMContentLoaded', async () => {
  const engine = new EngineCore();
  const authBus = new AuthBus();
  const isAuthed = await authBus.verifySession();

  const authOverlay = document.getElementById('authOverlay');
  const appShell = document.getElementById('appShell');

  if (!isAuthed) {
    if (authOverlay) authOverlay.classList.remove('is-hidden');
    bindLoginEvents(authBus);
    engine.dismissSplash();
    return;
  }

  if (authOverlay) authOverlay.classList.add('is-hidden');

  try {
    const config = await engine.fetchSystemState();
    if (appShell) {
      const page = new HomePage(config, engine.themeBus);
      appShell.innerHTML = page.render();
      page.bind();
    }
  } catch (err) {
    console.error('[Engine Mount Error]:', err);
  } finally {
    engine.dismissSplash();
  }
});

function bindLoginEvents(authBus) {
  const form = document.getElementById('authForm');
  const errorMsg = document.getElementById('authErrorMsg');
  const submitBtn = document.getElementById('authSubmitBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('authUsername').value.trim();
    const p = document.getElementById('authPassword').value;

    if (submitBtn) {
      submitBtn.textContent = 'Verifying...';
      submitBtn.style.opacity = '0.7';
    }

    const res = await authBus.login(u, p);
    if (res.success) {
      window.location.reload();
    } else {
      if (submitBtn) {
        submitBtn.textContent = 'Unlock Session';
        submitBtn.style.opacity = '1';
      }
      if (errorMsg) {
        errorMsg.textContent = res.error || 'Invalid credentials';
        errorMsg.style.display = 'block';
      }
    }
  });
}