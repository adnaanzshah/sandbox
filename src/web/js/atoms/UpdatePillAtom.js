export class UpdatePillAtom {
  static render() {
    return `
      <button id="atomUpdatePill" class="atom-update-pill is-hidden" aria-label="Update available">
        <span class="atom-pill-sparkle"></span>
        <span class="atom-pill-label">Update Available</span>
      </button>
    `;
  }

  static bind(onApply) {
    const el = document.getElementById('atomUpdatePill');
    if (!el) return;

    setInterval(async () => {
      try {
        const res = await fetch('/api/update/status');
        const data = await res.json();
        if (data.update_available) el.classList.remove('is-hidden');
        else el.classList.add('is-hidden');
      } catch {}
    }, 15000);

    el.addEventListener('click', async () => {
      el.innerHTML = '<span class="atom-pill-sparkle"></span><span class="atom-pill-label">Updating...</span>';
      el.style.opacity = '0.7';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const res = await fetch('/api/update/apply', { method: 'POST', signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data.success) {
          el.innerHTML = '<span class="atom-pill-sparkle"></span><span class="atom-pill-label">Reloading...</span>';
          setTimeout(() => window.location.reload(), 500);
        } else {
          alert('Update aborted: ' + (data.error || 'Server error'));
          el.innerHTML = '<span class="atom-pill-sparkle"></span><span class="atom-pill-label">Update Available</span>';
          el.style.opacity = '1';
        }
      } catch (err) {
        clearTimeout(timeoutId);
        alert('Update timed out or disconnected.');
        el.innerHTML = '<span class="atom-pill-sparkle"></span><span class="atom-pill-label">Update Available</span>';
        el.style.opacity = '1';
      }
    });
  }
}