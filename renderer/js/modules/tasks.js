Modules.tasks = {
  async render(container) {
    const tasks = await window.api.getData('tasks');
    container.innerHTML = `
      ${Utils.modHead('04 / Tasks', 'Tasks', `${tasks.filter(t=>!t.done).length} active`)}
      <div class="tasks-wrap">
        <div class="tasks-add-row">
          <input class="input" id="task-input" placeholder="Add a task…" style="flex:1" />
          <button class="btn btn-gold" id="task-add">Add</button>
        </div>
        <div class="task-list" id="task-list"></div>
      </div>`;

    const render = () => {
      const active = tasks.filter(t=>!t.done);
      const done   = tasks.filter(t=>t.done);
      const el = document.getElementById('task-list');
      if (!tasks.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon">✓</div><div class="empty-text">No tasks</div></div>`; return; }
      const row = t => `
        <div class="task-item ${t.done?'done':''}" data-id="${t.id}">
          <button class="task-check" data-action="toggle" data-id="${t.id}">${t.done?'✓':''}</button>
          <span class="task-text">${t.text}</span>
          ${t.done?`<button class="btn-icon danger" data-action="delete" data-id="${t.id}">✕</button>`:''}
        </div>`;
      let html = active.map(row).join('');
      if (done.length) html += `<div class="section-label">Done (${done.length})</div>` + done.map(row).join('');
      el.innerHTML = html;
    };
    render();

    const add = async () => {
      const input = document.getElementById('task-input');
      const text = input.value.trim(); if (!text) return;
      tasks.unshift({id:Utils.uid(), text, done:false, created:new Date().toISOString()});
      await window.api.setData('tasks', tasks);
      input.value = ''; render();
    };
    document.getElementById('task-add').addEventListener('click', add);
    document.getElementById('task-input').addEventListener('keydown', e => { if(e.key==='Enter') add(); });
    document.getElementById('task-list').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      const id = btn.dataset.id;
      const idx = tasks.findIndex(t=>t.id===id); if (idx===-1) return;
      if (btn.dataset.action==='toggle') { tasks[idx].done=!tasks[idx].done; await window.api.setData('tasks',tasks); render(); }
      if (btn.dataset.action==='delete') { tasks.splice(idx,1); await window.api.setData('tasks',tasks); render(); }
    });
  },
};
