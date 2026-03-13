Modules.clocks = {
  interval: null,

  TIMEZONES: [
    {label:'Eastern Time (EST/EDT)', tz:'America/New_York'},
    {label:'Central Time (CST/CDT)', tz:'America/Chicago'},
    {label:'Mountain Time (MST/MDT)',tz:'America/Denver'},
    {label:'Pacific Time (PST/PDT)', tz:'America/Los_Angeles'},
    {label:'UTC / GMT',             tz:'UTC'},
    {label:'London (GMT/BST)',      tz:'Europe/London'},
    {label:'Paris / Berlin (CET)',  tz:'Europe/Paris'},
    {label:'Dubai (GST)',           tz:'Asia/Dubai'},
    {label:'Mumbai (IST)',          tz:'Asia/Kolkata'},
    {label:'Singapore (SGT)',       tz:'Asia/Singapore'},
    {label:'Tokyo (JST)',           tz:'Asia/Tokyo'},
    {label:'Melbourne / Sydney',    tz:'Australia/Melbourne'},
    {label:'São Paulo (BRT)',       tz:'America/Sao_Paulo'},
  ],

  async render(container) {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    const saved = await window.api.getData('clocks-config').catch(()=>null) || [];
    const clocks = saved.length ? saved : [{city:'Local Time', tz:Intl.DateTimeFormat().resolvedOptions().timeZone, isLocal:true}];

    container.innerHTML = `${Utils.modHead('14 / Clocks', 'World Clocks', '', `<button class="btn btn-gold" id="header-add-clock-btn">+ Add Clock</button>`)}
      <div><div class="clocks-grid" id="clocks-grid"></div></div>`;

    const render = (list) => {
      const el = document.getElementById('clocks-grid');
      el.innerHTML = list.map((c,i) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {timeZone:c.tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true});
        const dateStr = now.toLocaleDateString('en-US', {timeZone:c.tz, weekday:'short', month:'short', day:'numeric'});
        const offset = getOffset(c.tz);
        return `<div class="clock-card ${c.isLocal?'local':''}" data-index="${i}">
          <div class="clock-city">${c.city}${c.isLocal?' · LOCAL':''}</div>
          <div class="clock-time" data-tz="${c.tz}">${timeStr}</div>
          <div class="clock-date" data-tz-date="${c.tz}">${dateStr}</div>
          ${!c.isLocal ? `<div class="clock-offset">${offset}</div>` : ''}
          ${!c.isLocal ? `<button class="clock-remove btn-icon danger" data-index="${i}">✕</button>` : ''}
        </div>`;
      }).join('') + `<div class="clock-add-card" id="clock-add-card"><div style="font-size:32px">+</div><div style="font-size:11px;letter-spacing:.15em;text-transform:uppercase">Add Clock</div></div>`;
    };

    const getOffset = (tz) => {
      try {
        const now = new Date();
        const local = now.toLocaleString('en-US', {timeZone: tz, timeZoneName:'short'});
        return local.split(' ').pop() || '';
      } catch { return ''; }
    };

    render(clocks);

    // Live update
    this.interval = setInterval(() => {
      document.querySelectorAll('[data-tz]').forEach(el => {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-US', {timeZone:el.dataset.tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true});
      });
      document.querySelectorAll('[data-tz-date]').forEach(el => {
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', {timeZone:el.dataset.tzDate, weekday:'short', month:'short', day:'numeric'});
      });
    }, 1000);

    const openAddClockModal = () => {
      App.openModal('Add Clock', `
        <div class="form-row">
          <label class="form-label">Display Name</label>
          <input class="input" id="clock-name" placeholder="e.g. Melbourne, Team HQ, EST" />
        </div>
        <div class="form-row">
          <label class="form-label">Timezone</label>
          <select class="input" id="clock-tz">
            ${this.TIMEZONES.map(t=>`<option value="${t.tz}">${t.label}</option>`).join('')}
            <option value="custom">Enter Custom IANA ID...</option>
          </select>
        </div>
        <div class="form-row" id="custom-tz-row" style="display:none">
          <label class="form-label">IANA Timezone ID</label>
          <input class="input input-mono" id="custom-tz" placeholder="e.g. America/Toronto" />
        </div>
        <button class="btn btn-gold" id="save-clock" style="width:100%;margin-top:12px">Save Clock</button>`);

      // Delay attachment to ensure modal DOM is strictly ready
      setTimeout(() => {
        document.getElementById('clock-tz').addEventListener('change', e => {
          document.getElementById('custom-tz-row').style.display = (e.target.value==='custom') ? '' : 'none';
        });

        document.getElementById('save-clock').addEventListener('click', async () => {
          const city = document.getElementById('clock-name').value.trim();
          const sel = document.getElementById('clock-tz').value;
          const tz = sel === 'custom' ? document.getElementById('custom-tz').value.trim() : sel;
          
          if (!city||!tz) return App.toast('Name and Timezone required','error');
          
          try { Intl.DateTimeFormat(undefined, {timeZone: tz}); } 
          catch { return App.toast('Invalid timezone format', 'error'); }

          clocks.push({city, tz});
          await window.api.setData('clocks-config', clocks);
          App.closeModal(); 
          render(clocks); 
          App.toast(`Added ${city}`);
        });
      }, 50);
    };

    // Strict Element Lookups for Event Assignment
    const headerBtn = container.querySelector('#header-add-clock-btn');
    if (headerBtn) headerBtn.addEventListener('click', openAddClockModal);

    const grid = container.querySelector('#clocks-grid');
    if (grid) {
      grid.addEventListener('click', async e => {
        if (e.target.closest('#clock-add-card')) { 
          openAddClockModal(); 
          return; 
        }
        
        const rem = e.target.closest('.clock-remove');
        if (rem) {
          const idx = +rem.dataset.index;
          clocks.splice(idx, 1);
          await window.api.setData('clocks-config', clocks);
          render(clocks); 
          App.toast('Removed');
        }
      });
    }
  },
};