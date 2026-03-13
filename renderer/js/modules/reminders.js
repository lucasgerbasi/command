Modules.reminders = {
  async render(container) {
    const reminders = await window.api.getData('reminders').catch(()=>[]) || [];
    container.innerHTML = `${Utils.modHead('15 / Reminders', 'Reminders', '', `<button class="btn btn-gold" id="add-reminder">+ Add Reminder</button>`)}
      <div class="reminders-wrap">
        <div class="reminder-list" id="reminder-list"></div>
      </div>`;

    const render = () => {
      const el = document.getElementById('reminder-list');
      const sorted = [...reminders].sort((a,b) => new Date(a.time)-new Date(b.time));
      if (!sorted.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-text">No reminders</div><div class="empty-hint">Add one with the button above</div></div>`; return; }
      const now = Date.now();
      el.innerHTML = sorted.map((r,i) => {
        const t = new Date(r.time).getTime();
        const past = t < now;
        const fired = r.fired;
        const diff = t - now;
        let countdown = '';
        if (!past) {
          const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
          if (d>0) countdown = `in ${d}d ${h%24}h`;
          else if (h>0) countdown = `in ${h}h ${m%60}m`;
          else countdown = `in ${m}m`;
        }
        return `<div class="reminder-item ${fired?'fired':''} ${past&&!fired?'past':''}" data-index="${i}">
          <div class="reminder-icon">${fired?'🔔':past?'🔕':'⏰'}</div>
          <div class="reminder-text">${r.text}</div>
          <div class="reminder-time">${new Date(r.time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
          ${countdown ? `<div class="reminder-countdown">${countdown}</div>` : ''}
          <button class="btn-icon danger" data-action="delete" data-index="${i}">✕</button>
        </div>`;
      }).join('');
    };
    render();

    setInterval(render, 30000); // Update countdowns

    document.getElementById('add-reminder').addEventListener('click', () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      const defaultTime = now.toISOString().slice(0,16);
      App.openModal('Add Reminder', `
        <div class="form-row"><label class="form-label">Reminder text</label><input class="input" id="r-text" placeholder="What do you need to remember?" /></div>
        <div class="form-row"><label class="form-label">When</label><input class="input" id="r-time" type="datetime-local" value="${defaultTime}" /></div>
        <button class="btn btn-gold" id="r-save" style="width:100%;margin-top:4px">Set Reminder</button>`);
      document.getElementById('r-save').addEventListener('click', async () => {
        const text = document.getElementById('r-text').value.trim();
        const time = document.getElementById('r-time').value;
        if (!text||!time) return App.toast('Required','error');
        reminders.push({id:Utils.uid(), text, time:new Date(time).toISOString(), fired:false});
        await window.api.setData('reminders', reminders);
        App.closeModal(); render(); App.toast('Reminder set');
      });
    });

    document.getElementById('reminder-list').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action="delete"]'); if(!btn) return;
      reminders.splice(+btn.dataset.index, 1);
      await window.api.setData('reminders', reminders);
      render();
    });
  },
};
