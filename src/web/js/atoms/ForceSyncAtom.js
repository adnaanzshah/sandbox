export class ForceSyncAtom {
  static render() {
    return `
      <button id="atomForceSyncBtn" class="atom-update-pill" style="width: 100%; justify-content: center; animation: none;">
        <span class="atom-pill-sparkle"></span>
        <span class="atom-pill-label">Force Sync Remote Now</span>
      </button>
    `;
  }

  static bind() {
    const btn = document.getElementById('atomForceSyncBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.innerText = 'Syncing from GitHub...';
      try {
        const res = await fetch('/api/update/apply', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          btn.innerText = 'Success! Reloading...';
          setTimeout(() => window.location.reload(), 600);
        } else {
          alert('Sync failed: ' + data.error);
          btn.innerText = 'Force Sync Remote Now';
        }
      } catch {
        alert('Network error while forcing sync.');
        btn.innerText = 'Force Sync Remote Now';
      }
    });
  }
}