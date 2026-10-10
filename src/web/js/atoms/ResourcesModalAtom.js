export class ResourcesModalAtom {
  constructor() {
    this.pollTimer = null;
  }

  render() {
    return `
      <div id="atomResourcesBackdrop" class="atom-modal-backdrop is-hidden">
        <div class="atom-modal-sheet" style="max-width: 460px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="auth-badge-dot" style="background: var(--accent-green);"></span>
              <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">System Resources</h3>
            </div>
            <button id="atomResourcesCloseBtn" class="glass-close-btn" aria-label="Close">✕</button>
          </div>

          <!-- Memory Gauge -->
          <div style="padding: 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 4px;">
              <span style="color: var(--text-secondary); font-weight: 600;">RAM Usage</span>
              <span id="resMemText" style="color: var(--text-primary); font-weight: 700;">Loading...</span>
            </div>
            <div class="metric-progress-track">
              <div id="resMemFill" class="metric-progress-fill" style="width: 0%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-tertiary); margin-top: 6px;">
              <span id="resMemUsed">0 MB Used</span>
              <span id="resMemTotal">0 MB Total</span>
            </div>
          </div>

          <!-- CPU Telemetry -->
          <div style="padding: 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 6px;">
              <span style="color: var(--text-secondary); font-weight: 600;">CPU Topology</span>
              <span id="resCpuCores" style="color: var(--accent-green); font-weight: 700;">-- Cores</span>
            </div>
            <p id="resCpuModel" style="font-size: 0.76rem; color: var(--text-primary); margin-bottom: 8px; line-height: 1.3;">Scanning...</p>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
              <span>Load Average:</span>
              <span id="resCpuLoad" style="font-weight: 600; color: var(--text-primary);">--</span>
            </div>
          </div>

          <!-- Sandbox Runtime Process Footprint -->
          <div style="padding: 14px; background: var(--glass-fill); border: 1px solid var(--glass-border); border-radius: var(--radius-cell); margin-bottom: 10px;">
            <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); display: block; margin-bottom: 8px;">Node.js Sandbox Process</span>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
              <span style="color: var(--text-secondary);">PID</span>
              <span id="resProcPid" style="font-weight: 600; color: var(--text-primary);">--</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
              <span style="color: var(--text-secondary);">Heap Allocation</span>
              <span id="resProcHeap" style="font-weight: 600; color: var(--text-primary);">--</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span style="color: var(--text-secondary);">Process RSS</span>
              <span id="resProcRss" style="font-weight: 600; color: var(--text-primary);">--</span>
            </div>
          </div>

          <!-- Host Device Platform Metadata -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-tertiary); padding: 4px 6px;">
            <span id="resHostPlatform">Host: --</span>
            <span id="resHostUptime">Uptime: --</span>
          </div>
        </div>
      </div>
    `;
  }

  async fetchMetrics() {
    try {
      const res = await fetch("/api/system/metrics", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      const memPct = data.memory.usagePercent;
      const memFill = document.getElementById("resMemFill");
      const memText = document.getElementById("resMemText");
      const memUsed = document.getElementById("resMemUsed");
      const memTotal = document.getElementById("resMemTotal");

      if (memFill) memFill.style.width = `${memPct}%`;
      if (memText) memText.textContent = `${memPct}%`;
      if (memUsed) memUsed.textContent = `${data.memory.usedMb} MB Used`;
      if (memTotal) memTotal.textContent = `${data.memory.totalMb} MB Total`;

      const cpuCores = document.getElementById("resCpuCores");
      const cpuModel = document.getElementById("resCpuModel");
      const cpuLoad = document.getElementById("resCpuLoad");
      if (cpuCores) cpuCores.textContent = `${data.cpu.cores} Cores`;
      if (cpuModel) cpuModel.textContent = data.cpu.model;
      if (cpuLoad)
        cpuLoad.textContent = `1m: ${data.cpu.load1m} | 5m: ${data.cpu.load5m} | 15m: ${data.cpu.load15m}`;

      const procPid = document.getElementById("resProcPid");
      const procHeap = document.getElementById("resProcHeap");
      const procRss = document.getElementById("resProcRss");
      if (procPid) procPid.textContent = `${data.process.pid}`;
      if (procHeap) procHeap.textContent = `${data.process.heapUsedMb} MB`;
      if (procRss) procRss.textContent = `${data.process.rssMb} MB`;

      const hostPlatform = document.getElementById("resHostPlatform");
      const hostUptime = document.getElementById("resHostUptime");
      if (hostPlatform)
        hostPlatform.textContent = `${data.hostname} (${data.platform})`;
      if (hostUptime) hostUptime.textContent = `Up: ${data.uptime}`;
    } catch {}
  }

  bind() {
    const backdrop = document.getElementById("atomResourcesBackdrop");
    const closeBtn = document.getElementById("atomResourcesCloseBtn");

    closeBtn?.addEventListener("click", () => this.close());
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) this.close();
    });
  }

  open() {
    const backdrop = document.getElementById("atomResourcesBackdrop");
    if (backdrop) backdrop.classList.remove("is-hidden");
    this.fetchMetrics();
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => this.fetchMetrics(), 2500);
    }
  }

  close() {
    const backdrop = document.getElementById("atomResourcesBackdrop");
    if (backdrop) backdrop.classList.add("is-hidden");
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
