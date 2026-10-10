export class LiveUpdateClient {
  constructor(pillId = 'engineUpdatePill') {
    this.pill = document.getElementById(pillId);
    this.pollInterval = 15000;
    this.isUpdating = false;

    if (this.pill) {
      this.pill.addEventListener('click', () => this.apply());
      this.check();
      setInterval(() => this.check(), this.pollInterval);
    }
  }

  async check() {
    if (this.isUpdating) return;
    try {
      const res = await fetch('/api/update/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data.update_available) {
        this.pill.classList.remove('is-hidden');
      } else {
        this.pill.classList.add('is-hidden');
      }
    } catch (e) {}
  }

  async apply() {
    if (this.isUpdating) return;
    this.isUpdating = true;
    this.pill.innerHTML = `<span class="pill-sparkle"></span><span class="pill-text">Updating...</span>`;
    try {
      const res = await fetch('/api/update/apply', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.pill.innerHTML = `<span class="pill-sparkle"></span><span class="pill-text">Done! Reloading</span>`;
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert('Update error: ' + data.error);
        this.isUpdating = false;
        this.check();
      }
    } catch (err) {
      alert('Network failure');
      this.isUpdating = false;
    }
  }
}