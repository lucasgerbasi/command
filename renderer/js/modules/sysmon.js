// System Monitor — uses Node.js os module via IPC
Modules.sysmon = {
  cleanup() { if (this.interval) { clearInterval(this.interval); this.interval = null; } },
  interval: null,

  async render(container) {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    container.innerHTML = `${Utils.modHead('System', 'System Monitor', '')}
      <div class="sysmon-wrap">
        <div class="sysmon-grid" id="sysmon-grid"></div>
        <div class="section-label">System Info</div>
        <div class="card" style="padding:0">
          <table class="sysmon-table" id="sysmon-table"><tbody></tbody></table>
        </div>
      </div>`;

    const update = async () => {
      try {
        const info = await window.api.getSysInfo().catch(() => null);
        if (!info || !info.platform) return; // Silent fail guard

        const cpuPct = info.cpu || 0;
        const ramPct = info.ramTotal ? Math.round(info.ramUsed / info.ramTotal * 100) : 0;

        const barClass = (pct) => pct > 85 ? 'crit' : pct > 65 ? 'warn' : '';

        const grid = document.getElementById('sysmon-grid');
        if (!grid) return;
        
        grid.innerHTML = `
          <div class="sysmon-card">
            <div class="sysmon-card-label">CPU Usage</div>
            <div class="sysmon-value">${cpuPct}<span class="sysmon-value-unit">%</span></div>
            <div class="sysmon-bar"><div class="sysmon-bar-fill ${barClass(cpuPct)}" style="width:${cpuPct}%"></div></div>
            <div class="sysmon-sub">${info.cpuModel || 'Unknown Processor'}</div>
          </div>
          <div class="sysmon-card">
            <div class="sysmon-card-label">RAM</div>
            <div class="sysmon-value">${info.ramUsed ? (info.ramUsed/1024/1024/1024).toFixed(1) : 0}<span class="sysmon-value-unit"> / ${info.ramTotal ? (info.ramTotal/1024/1024/1024).toFixed(0) : 0} GB</span></div>
            <div class="sysmon-bar"><div class="sysmon-bar-fill ${barClass(ramPct)}" style="width:${ramPct}%"></div></div>
            <div class="sysmon-sub">${ramPct}% used</div>
          </div>
          <div class="sysmon-card">
            <div class="sysmon-card-label">Uptime</div>
            <div class="sysmon-value" style="font-size:24px">${Utils.formatUptime(info.uptime || 0)}</div>
            <div class="sysmon-sub">since last boot</div>
          </div>`;

        const tbody = document.querySelector('#sysmon-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = [
          ['OS', info.platform],
          ['Architecture', info.arch],
          ['Hostname', info.hostname],
          ['Node', info.nodeVersion],
          ['CPUs', info.cpuCount + ' logical cores'],
          ['Total RAM', info.ramTotal ? (info.ramTotal/1024/1024/1024).toFixed(2) + ' GB' : 'N/A'],
        ].map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      } catch (e) {
        // Prevent random unhandled promise rejections on loop
      }
    };

    await update();
    this.interval = setInterval(update, 2000);
  },
};

Utils.formatUptime = (secs) => {
  if (typeof secs !== 'number' || isNaN(secs)) return '0m';
  const d = Math.floor(secs/86400), h = Math.floor((secs%86400)/3600), m = Math.floor((secs%3600)/60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};