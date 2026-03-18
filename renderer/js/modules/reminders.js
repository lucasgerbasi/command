Modules.reminders = {
  _interval: null,
  cleanup() { if (this._interval) { clearInterval(this._interval); this._interval = null; } },

  async render(container) {
    const reminders = await window.api.getData('reminders').catch(()=>[]) || [];

    container.innerHTML = `${Utils.modHead('Reminders', 'Reminders', 'Time-based · recurring · smart conditions', `<button class="btn btn-gold" id="add-reminder">+ Add Reminder</button>`)}
      <div class="reminders-wrap">
        <div class="reminder-list" id="reminder-list"></div>
      </div>`;

    const render = () => {
      const el = document.getElementById('reminder-list');
      if (!el) return;
      const upcoming = reminders.filter(r => !r.fired).sort((a,b) => new Date(a.time)-new Date(b.time));
      const fired = reminders.filter(r => r.fired);
      const displayList = [...upcoming, ...fired];
      if (!displayList.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-text">No reminders</div><div class="empty-hint">Add one with the button above</div></div>`;
        return;
      }
      const now = Date.now();
      el.innerHTML = displayList.map((r, i) => {
        const t = new Date(r.time).getTime();
        const past = t < now;
        const firedFlag = r.fired;
        const diff = t - now;
        let countdown = '';
        if (!past) {
          const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
          countdown = d>0 ? `in ${d}d ${h%24}h` : h>0 ? `in ${h}h ${m%60}m` : m>0 ? `in ${m}m` : 'soon';
        }
        // Smart condition badge
        const condBadge = r.condType ? `<span style="font-size:9px;padding:2px 6px;background:var(--bg-3);border:1px solid var(--border);color:var(--gold-text);font-family:var(--mono);letter-spacing:.05em;flex-shrink:0">${this._condLabel(r)}</span>` : '';
        const recurBadge = r.recur ? `<span style="font-size:9px;padding:2px 6px;background:var(--bg-3);border:1px solid var(--border);color:#a78bfa;font-family:var(--mono);flex-shrink:0">↻ ${r.recur}</span>` : '';
        return `<div class="reminder-item ${firedFlag?'fired':''} ${past&&!firedFlag?'past':''}" data-drag-idx="${i}" data-id="${r.id}">
          <span class="drag-handle">⠿</span>
          <div class="reminder-icon">${firedFlag?'🔔':past?'🔕':'⏰'}</div>
          <div style="flex:1;min-width:0">
            <div class="reminder-text">${r.text}</div>
            <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;align-items:center">
              <span class="reminder-time">${new Date(r.time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              ${condBadge}${recurBadge}
              ${countdown ? `<span class="reminder-countdown">${countdown}</span>` : ''}
            </div>
          </div>
          <button class="btn-icon danger" data-action="delete" data-id="${r.id}">✕</button>
        </div>`;
      }).join('');

      Utils.makeDraggableList(el, displayList, async (reordered) => {
        reminders.length = 0; reminders.push(...reordered);
        await window.api.setData('reminders', reminders);
        render();
      });
    };
    render();

    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(render, 30000);

    document.getElementById('add-reminder').addEventListener('click', () => this._openAddModal(reminders, render));

    document.getElementById('reminder-list').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      const idx = reminders.findIndex(r => r.id === btn.dataset.id);
      if (idx > -1) { reminders.splice(idx, 1); await window.api.setData('reminders', reminders); render(); }
    });
  },

  _condLabel(r) {
    if (!r.condType) return '';
    if (r.condType === 'deadline') return `⚑ deadline -${r.condValue}m`;
    if (r.condType === 'inactivity') return `⊘ if idle ${r.condValue}h`;
    return r.condType;
  },

  _openAddModal(reminders, render) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const defaultTime = now.toISOString().slice(0, 16);

    App.openModal('Add Reminder', `
      <div class="form-row">
        <label class="form-label">Reminder text</label>
        <input class="input" id="r-text" placeholder="What do you need to remember?" />
      </div>

      <div class="form-row" style="margin-top:12px">
        <label class="form-label">Type</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
            <input type="radio" name="r-type" value="fixed" checked /> Fixed time
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
            <input type="radio" name="r-type" value="recurring" /> Recurring
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
            <input type="radio" name="r-type" value="deadline" /> Deadline warning
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
            <input type="radio" name="r-type" value="inactivity" /> Inactivity
          </label>
        </div>
      </div>

      <!-- Fixed time -->
      <div id="r-section-fixed" class="form-row" style="margin-top:12px">
        <label class="form-label">When</label>
        <input class="input" id="r-time" type="datetime-local" value="${defaultTime}" />
      </div>

      <!-- Recurring -->
      <div id="r-section-recurring" style="display:none;margin-top:12px">
        <div class="form-row">
          <label class="form-label">Start time</label>
          <input class="input" id="r-recur-start" type="datetime-local" value="${defaultTime}" />
        </div>
        <div class="form-row" style="margin-top:8px">
          <label class="form-label">Repeat</label>
          <select class="input" id="r-recur-freq">
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays (Mon–Fri)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <!-- Deadline warning -->
      <div id="r-section-deadline" style="display:none;margin-top:12px">
        <div class="form-row">
          <label class="form-label">Deadline (the actual due time)</label>
          <input class="input" id="r-deadline-time" type="datetime-local" value="${new Date(Date.now()+3600000).toISOString().slice(0,16)}" />
        </div>
        <div class="form-row" style="margin-top:8px">
          <label class="form-label">Warn me this many minutes before</label>
          <select class="input" id="r-deadline-warn">
            <option value="15">15 minutes before</option>
            <option value="30" selected>30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="120">2 hours before</option>
            <option value="1440">1 day before</option>
          </select>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-family:var(--mono)">
          The reminder fires at: deadline − warn time
        </div>
      </div>

      <!-- Inactivity -->
      <div id="r-section-inactivity" style="display:none;margin-top:12px">
        <div class="form-row">
          <label class="form-label">Remind if I haven't opened the app in…</label>
          <select class="input" id="r-inactivity-hours">
            <option value="2">2 hours</option>
            <option value="4">4 hours</option>
            <option value="8" selected>8 hours</option>
            <option value="24">1 day</option>
            <option value="48">2 days</option>
          </select>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-family:var(--mono)">
          Fires when you open the app after being away for this long.
        </div>
      </div>

      <button class="btn btn-gold" id="r-save" style="width:100%;margin-top:16px">Set Reminder</button>
    `);

    // Show/hide sections on type change
    const sections = { fixed: 'r-section-fixed', recurring: 'r-section-recurring', deadline: 'r-section-deadline', inactivity: 'r-section-inactivity' };
    document.querySelectorAll('[name="r-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        Object.entries(sections).forEach(([k, id]) => {
          const el = document.getElementById(id);
          if (el) el.style.display = k === radio.value ? '' : 'none';
        });
      });
    });

    document.getElementById('r-save').addEventListener('click', async () => {
      const text = document.getElementById('r-text').value.trim();
      if (!text) return App.toast('Reminder text required', 'error');
      const type = document.querySelector('[name="r-type"]:checked')?.value || 'fixed';
      let reminder = { id: Utils.uid(), text, fired: false };

      if (type === 'fixed') {
        const timeVal = document.getElementById('r-time').value;
        if (!timeVal) return App.toast('Time required', 'error');
        reminder.time = new Date(timeVal).toISOString();

      } else if (type === 'recurring') {
        const startVal = document.getElementById('r-recur-start').value;
        if (!startVal) return App.toast('Start time required', 'error');
        reminder.time = new Date(startVal).toISOString();
        reminder.recur = document.getElementById('r-recur-freq').value;

      } else if (type === 'deadline') {
        const deadlineVal = document.getElementById('r-deadline-time').value;
        if (!deadlineVal) return App.toast('Deadline time required', 'error');
        const warnMins = +document.getElementById('r-deadline-warn').value;
        const deadlineMs = new Date(deadlineVal).getTime();
        reminder.time = new Date(deadlineMs - warnMins * 60000).toISOString();
        reminder.condType = 'deadline';
        reminder.condValue = warnMins;
        reminder.deadline = new Date(deadlineVal).toISOString();

      } else if (type === 'inactivity') {
        const hours = +document.getElementById('r-inactivity-hours').value;
        // Fire the first time after `hours` hours of inactivity — store as a special flag
        reminder.time = new Date(Date.now() + hours * 3600000).toISOString();
        reminder.condType = 'inactivity';
        reminder.condValue = hours;
        reminder.recur = 'inactivity'; // so checker re-arms it
      }

      reminders.push(reminder);
      await window.api.setData('reminders', reminders);
      App.closeModal();
      render();
      App.toast('Reminder set', 'success');
    });
  },
};
