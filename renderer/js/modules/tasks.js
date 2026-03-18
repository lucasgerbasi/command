Modules.tasks = {
  sortMode: 'manual',
  collapsedGroups: {},

  async render(container) {
    const tasks  = await window.api.getData('tasks').catch(()=>[]) || [];
    const groups = await window.api.getData('task-groups').catch(()=>[]) || [];

    const PDOT  = { high:'#ef4444', medium:'#eab308', low:'#3b82f6', '':null };
    const PLABEL = { high:'🔴 High', medium:'🟡 Medium', low:'🔵 Low', '':'None' };
    const PRANK  = { high:0, medium:1, low:2, '':3 };

    container.innerHTML = `
      ${Utils.modHead('Tasks', 'Todo List', '', `
        <div style="display:flex;gap:6px;align-items:center">
          <select class="input" id="task-sort" style="font-size:10px;padding:4px 8px;height:28px">
            <option value="manual">Manual order</option>
            <option value="priority">By priority</option>
            <option value="alpha">Alphabetical</option>
          </select>
          <button class="btn" id="add-group-btn" style="font-size:10px">⊕ Group</button>
          <button class="btn btn-gold" id="clear-done">Clear Done</button>
        </div>
      `)}
      <div class="tasks-wrap">
        <div class="tasks-add-row" style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="input" id="task-input" placeholder="New task… Enter to add" style="flex:1;min-width:160px"/>
          <select class="input" id="task-group-select" style="font-size:11px;padding:4px 8px;width:120px">
            <option value="">No group</option>
          </select>
          <select class="input" id="task-priority-new" style="font-size:11px;padding:4px 8px;width:80px">
            <option value="">—</option>
            <option value="high">🔴</option>
            <option value="medium">🟡</option>
            <option value="low">🔵</option>
          </select>
          <select class="input" id="task-type-new" style="font-size:11px;padding:4px 8px;width:90px">
            <option value="once">Checkbox</option>
            <option value="counter">Counter</option>
          </select>
          <input class="input" id="task-target-new" type="number" value="3" min="2" max="99"
            style="font-size:11px;padding:4px 6px;width:56px;display:none" placeholder="target"/>
        </div>
        <div id="task-body" style="margin-top:8px"></div>
      </div>`;

    const save = async () => { await window.api.setData('tasks', tasks); renderAll(); };

    container.querySelector('#task-type-new').addEventListener('change', e => {
      container.querySelector('#task-target-new').style.display = e.target.value === 'counter' ? '' : 'none';
    });

    const sortArr = (arr) => {
      const mode = document.getElementById('task-sort')?.value || this.sortMode;
      if (mode === 'priority') return [...arr].sort((a,b)=>(PRANK[a.priority||'']??3)-(PRANK[b.priority||'']??3));
      if (mode === 'alpha') return [...arr].sort((a,b)=>a.text.localeCompare(b.text));
      return arr;
    };

    const taskRow = (t, dragIdx) => {
      const dot = PDOT[t.priority||''];
      const isCounter = (t.target||1) > 1;
      const count = t.count || 0;
      const isDone = isCounter ? count >= (t.target||1) : t.done;

      const checkPart = isCounter ? `
        <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
          <button class="task-decrement" data-id="${t.id}" style="font-family:var(--mono);font-size:12px;padding:1px 6px;background:var(--bg-3);border:1px solid var(--border);cursor:pointer;color:var(--text-muted)">−</button>
          <button class="task-increment" data-id="${t.id}" style="font-family:var(--mono);font-size:11px;padding:2px 7px;background:${isDone?'var(--gold)':'var(--bg-3)'};border:1px solid ${isDone?'var(--gold)':'var(--border)'};color:${isDone?'#000':'var(--text)'};cursor:pointer;white-space:nowrap">${count}/${t.target}</button>
        </div>` : `<button class="task-check" data-id="${t.id}">✓</button>`;

      return `<div class="task-item priority-${t.priority||'none'} ${isDone&&!isCounter?'done':''}" data-id="${t.id}" data-group="${t.group||''}" data-drag-idx="${dragIdx}" draggable="true">
        <span class="drag-handle">⠿</span>
        ${checkPart}
        ${dot ? `<span class="task-priority-dot" data-id="${t.id}" style="background:${dot}" title="${PLABEL[t.priority]}"></span>`
               : `<span class="task-priority-dot empty" data-id="${t.id}"></span>`}
        <span class="task-text" style="${isDone&&!isCounter?'text-decoration:line-through;opacity:.38':''}${isDone&&isCounter?'opacity:.45':''}">${t.text}</span>
        <div class="task-actions">
          <select class="task-priority-select" data-id="${t.id}" style="font-size:10px;padding:2px 4px;background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted)">
            <option value="" ${!t.priority?'selected':''}>—</option>
            <option value="high" ${t.priority==='high'?'selected':''}>🔴</option>
            <option value="medium" ${t.priority==='medium'?'selected':''}>🟡</option>
            <option value="low" ${t.priority==='low'?'selected':''}>🔵</option>
          </select>
          <button class="btn-icon danger task-remove" data-id="${t.id}">✕</button>
        </div>
      </div>`;
    };

    // Global drag state so tasks can be dragged across groups
    let dragSrcId = null;

    const makeDropZone = (el, targetGroup) => {
      el.addEventListener('dragover', e => {
        e.preventDefault();
        document.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', e => {
        if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
      });
      el.addEventListener('drop', async e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (!dragSrcId) return;
        const t = tasks.find(t => String(t.id) === dragSrcId);
        if (!t) return;
        // If dropped on specific row, reorder within same group
        const targetRow = e.target.closest('.task-item[data-id]');
        if (targetRow && targetRow.dataset.id !== dragSrcId) {
          t.group = targetGroup;
          const fi = tasks.findIndex(t => String(t.id) === dragSrcId);
          const ti = tasks.findIndex(t => String(t.id) === targetRow.dataset.id);
          if (fi >= 0 && ti >= 0) { const [item] = tasks.splice(fi, 1); tasks.splice(ti, 0, item); }
        } else {
          t.group = targetGroup;
        }
        await window.api.setData('tasks', tasks);
        renderAll();
      });
    };

    // Group header as its own drop zone (drop on header = move to group)
    const makeGroupHeaderDrop = (headerEl, groupName) => {
      headerEl.addEventListener('dragover', e => { e.preventDefault(); headerEl.classList.add('drag-over'); });
      headerEl.addEventListener('dragleave', () => headerEl.classList.remove('drag-over'));
      headerEl.addEventListener('drop', async e => {
        e.preventDefault();
        headerEl.classList.remove('drag-over');
        if (!dragSrcId) return;
        const t = tasks.find(t => String(t.id) === dragSrcId);
        if (t) { t.group = groupName; await window.api.setData('tasks', tasks); renderAll(); }
      });
    };

    const renderAll = () => {
      const body = document.getElementById('task-body'); if (!body) return;

      const groupSel = document.getElementById('task-group-select');
      if (groupSel) groupSel.innerHTML = `<option value="">No group</option>` + groups.map(g=>`<option value="${g}">${g}</option>`).join('');

      const mode = document.getElementById('task-sort')?.value || this.sortMode;
      const active = tasks.filter(t => !t.done && !((t.target||1) > 1 && (t.count||0) >= (t.target||1)));
      const done   = tasks.filter(t =>  t.done ||  ((t.target||1) > 1 && (t.count||0) >= (t.target||1)));

      let html = '';

      // Ungrouped — also a drop zone
      const ungrouped = sortArr(active.filter(t => !t.group));
      html += `<div class="task-list task-drop-zone" id="tl-ungrouped" data-drop-group="" style="min-height:${ungrouped.length?'0':'36px'};${!ungrouped.length?'border:1px dashed var(--border);display:flex;align-items:center;padding:8px 14px;':''}">
        ${ungrouped.length ? ungrouped.map((t,i)=>taskRow(t,i)).join('') : '<span style="font-size:10px;color:var(--text-muted)">Drop tasks here (ungrouped)</span>'}
      </div>`;

      // Groups
      groups.forEach(g => {
        const members = sortArr(active.filter(t => t.group === g));
        const collapsed = this.collapsedGroups[g];
        html += `<div class="task-group" data-group="${g}" style="margin-top:8px">
          <div class="task-group-header task-group-header-drop" data-group-toggle="${g}" data-drop-group="${g}" draggable="true" data-group-drag="${g}">
            <span class="task-group-toggle">${collapsed?'▶':'▼'}</span>
            <span class="drag-handle" style="opacity:.5;margin-right:2px" title="Drag group">⠿</span>
            <span class="task-group-name">${g}</span>
            <span class="task-group-count">${members.length}</span>
            <button class="btn-icon danger task-group-delete" data-group-delete="${g}" title="Delete group (keep tasks)" style="font-size:10px;margin-left:auto">✕</button>
          </div>
          ${collapsed ? '' : `<div class="task-list task-drop-zone task-group-body" id="tl-${g.replace(/\W/g,'_')}" data-drop-group="${g}" style="min-height:36px;border-left:2px solid var(--border-2);">
            ${members.map((t,i)=>taskRow(t,i)).join('')}
            ${members.length===0?`<div style="padding:6px 12px;font-size:10px;color:var(--text-muted);font-style:italic">Drop tasks here or add one above</div>`:''}
          </div>`}
        </div>`;
      });

      // Done
      if (done.length) html += `<div class="section-label" style="margin-top:16px">Done</div><div class="task-list">${done.map((t,i)=>`<div class="task-item done" data-id="${t.id}"><span class="drag-handle" style="opacity:.2">⠿</span><button class="task-check" data-id="${t.id}">✓</button><span class="task-priority-dot" style="background:${PDOT[t.priority||'']||'transparent'};opacity:.3"></span><span class="task-text">${t.text}</span><button class="btn-icon danger task-remove" data-id="${t.id}" style="margin-left:auto">✕</button></div>`).join('')}</div>`;

      if (!html.trim()) html = `<div class="empty-state" style="margin-top:24px"><div class="empty-icon">✓</div><div class="empty-text">All caught up!</div></div>`;
      body.innerHTML = html;

      // Wire drag on task rows
      body.querySelectorAll('.task-item[data-id][draggable]').forEach(row => {
        row.addEventListener('dragstart', e => {
          dragSrcId = row.dataset.id;
          e.dataTransfer.setData('text', dragSrcId);
          e.dataTransfer.effectAllowed = 'move';
          const label = row.querySelector('.task-text')?.textContent || 'Task';
          App.setDragGhost(e, label);
          setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          document.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
          dragSrcId = null;
        });
      });

      // Wire drop zones (group bodies + ungrouped)
      body.querySelectorAll('.task-drop-zone').forEach(zone => {
        makeDropZone(zone, zone.dataset.dropGroup || '');
      });

      // Wire group header drop zones
      body.querySelectorAll('.task-group-header-drop').forEach(header => {
        makeGroupHeaderDrop(header, header.dataset.dropGroup || '');
      });

      // Wire group header drag (reorder groups)
      let dragSrcGroup = null;
      body.querySelectorAll('[data-group-drag]').forEach(header => {
        header.addEventListener('dragstart', e => {
          if (dragSrcId) { e.preventDefault(); return; } // task drag takes priority
          dragSrcGroup = header.dataset.groupDrag;
          e.dataTransfer.setData('group', dragSrcGroup);
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => header.closest('.task-group').style.opacity = '0.4', 0);
        });
        header.addEventListener('dragend', () => {
          const grp = header.closest('.task-group');
          if (grp) grp.style.opacity = '';
          dragSrcGroup = null;
        });
        header.addEventListener('dragover', e => {
          if (!dragSrcGroup || dragSrcGroup === header.dataset.groupDrag) return;
          e.preventDefault();
          header.classList.add('drag-over');
        });
        header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
        header.addEventListener('drop', async e => {
          e.preventDefault();
          header.classList.remove('drag-over');
          if (!dragSrcGroup || dragSrcGroup === header.dataset.groupDrag) return;
          const fi = groups.indexOf(dragSrcGroup);
          const ti = groups.indexOf(header.dataset.groupDrag);
          if (fi < 0 || ti < 0) return;
          const [g] = groups.splice(fi, 1);
          groups.splice(ti, 0, g);
          await window.api.setData('task-groups', groups);
          renderAll();
        });
      });
    };

    renderAll();

    document.getElementById('task-sort').value = this.sortMode;
    document.getElementById('task-sort').addEventListener('change', e => { this.sortMode = e.target.value; renderAll(); });

    container.querySelector('#add-group-btn').addEventListener('click', () => {
      App.openModal('Add Group', `
        <div class="form-row"><label class="form-label">Group Name</label>
          <input class="input" id="group-name-input" placeholder="e.g. Stardew Valley, Work…"/></div>
        <button class="btn btn-gold" id="group-save" style="width:100%;margin-top:12px">Create Group</button>`);
      setTimeout(() => document.getElementById('group-name-input')?.focus(), 50);
      document.getElementById('group-save').addEventListener('click', async () => {
        const name = document.getElementById('group-name-input').value.trim();
        if (!name || groups.includes(name)) { App.toast(name ? 'Group already exists' : 'Enter a name', 'error'); return; }
        groups.push(name);
        await window.api.setData('task-groups', groups);
        App.closeModal(); renderAll();
        App.toast(`Group "${name}" created`, 'success');
      });
    });

    container.querySelector('#task-input').addEventListener('keydown', async e => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return;
      const priority = document.getElementById('task-priority-new').value;
      const group    = document.getElementById('task-group-select').value;
      const type     = document.getElementById('task-type-new').value;
      const target   = type === 'counter' ? Math.max(2, +document.getElementById('task-target-new').value || 3) : 1;
      tasks.unshift({ text: e.target.value.trim(), done: false, id: Date.now(), priority: priority||'', group: group||'', target, count: 0 });
      e.target.value = '';
      await save();
    });

    container.addEventListener('click', async e => {
      const toggle = e.target.closest('[data-group-toggle]');
      if (toggle && !e.target.closest('[data-group-delete]') && !e.target.closest('[data-group-drag]')) {
        const g = toggle.dataset.groupToggle;
        this.collapsedGroups[g] = !this.collapsedGroups[g];
        renderAll(); return;
      }
      const gdel = e.target.closest('[data-group-delete]');
      if (gdel) {
        e.stopPropagation();
        const g = gdel.dataset.groupDelete;
        groups.splice(groups.indexOf(g), 1);
        tasks.forEach(t => { if (t.group === g) t.group = ''; });
        await window.api.setData('task-groups', groups);
        await window.api.setData('tasks', tasks);
        renderAll(); return;
      }
      const check = e.target.closest('.task-check');
      const incr  = e.target.closest('.task-increment');
      const decr  = e.target.closest('.task-decrement');
      const rem   = e.target.closest('.task-remove');
      const dot   = e.target.closest('.task-priority-dot');
      if (check) { const t=tasks.find(t=>String(t.id)===check.dataset.id); if(t){t.done=!t.done;await save();} }
      else if (incr) { const t=tasks.find(t=>String(t.id)===incr.dataset.id); if(t){t.count=Math.min((t.count||0)+1,t.target||1);if(t.count>=(t.target||1))t.done=true;await save();} }
      else if (decr) { const t=tasks.find(t=>String(t.id)===decr.dataset.id); if(t&&(t.count||0)>0){t.count=(t.count||0)-1;t.done=false;await save();} }
      else if (rem) { const idx=tasks.findIndex(t=>String(t.id)===rem.dataset.id); if(idx>-1){tasks.splice(idx,1);await save();App.toast('Task deleted');} }
      else if (dot) { const row=dot.closest('[data-id]');const t=tasks.find(t=>String(t.id)===row?.dataset.id);if(t){const c={'':'high',high:'medium',medium:'low',low:''};t.priority=c[t.priority||''];await save();} }
    });

    container.addEventListener('change', async e => {
      const sel = e.target.closest('.task-priority-select');
      if (sel) { const t=tasks.find(t=>String(t.id)===sel.dataset.id);if(t){t.priority=sel.value;await save();} }
    });

    container.querySelector('#clear-done').addEventListener('click', async () => {
      const kept = tasks.filter(t => !t.done && !((t.target||1)>1 && (t.count||0)>=(t.target||1)));
      tasks.length = 0; tasks.push(...kept);
      await window.api.setData('tasks', tasks); renderAll();
      App.toast('Cleared completed tasks');
    });
  }
};
