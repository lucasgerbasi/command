Modules.habits = {
  async render(container) {
    const habits = await window.api.getData('habits').catch(()=>[]) || [];
    const groups = await window.api.getData('habit-groups').catch(()=>[]) || [];
    // Use 8am as the day boundary — before 8am still counts as yesterday
    const _habitNow = new Date();
    if (_habitNow.getHours() < 8) _habitNow.setDate(_habitNow.getDate() - 1);
    const today = _habitNow.toDateString();

    let modified = false;
    habits.forEach(h => {
      if (h.doneDate && h.doneDate !== today) {
        // Archive to log before clearing
        if (!Array.isArray(h.log)) h.log = [];
        // Convert doneDate (toDateString) to ISO YYYY-MM-DD for log
        const doneDateObj = new Date(h.doneDate);
        const iso = doneDateObj.toISOString().slice(0, 10);
        if (!h.log.includes(iso)) h.log.push(iso);
        h.doneDate = null;
        if ((h.target||1) > 1) h.count = 0;
        modified = true;
      }
      if (!Array.isArray(h.log)) h.log = [];
    });
    if (modified) await window.api.setData('habits', habits);

    const PDOT  = { high:'#ef4444', medium:'#eab308', low:'#3b82f6', '':null };
    const PRANK = { high:0, medium:1, low:2, '':3 };

    const fmtCountdown = () => {
      // Count to next 8am (the actual reset time)
      const d = new Date();
      if (d.getHours() >= 8) { d.setDate(d.getDate()+1); }
      d.setHours(8,0,0,0);
      const diff = d - Date.now();
      const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };

    container.innerHTML = `
      ${Utils.modHead('Habits', 'Daily Habits', '', `
        <div style="display:flex;gap:6px;align-items:center">
          <select class="input" id="habit-sort" style="font-size:10px;padding:4px 8px;height:28px">
            <option value="manual">Manual order</option>
            <option value="priority">By priority</option>
          </select>
          <button class="btn" id="add-habit-group-btn" style="font-size:10px">⊕ Group</button>
          <button class="btn btn-gold" id="add-habit-btn">+ Add</button>
        </div>
      `)}
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted)" id="habit-progress"></div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-left:auto">
          Resets in <span id="habit-countdown" style="color:var(--gold-text)">${fmtCountdown()}</span>
        </div>
      </div>
      <div id="habit-body"></div>`;

    const countdownEl = container.querySelector('#habit-countdown');
    const ticker = setInterval(() => {
      if (countdownEl && document.contains(countdownEl)) countdownEl.textContent = fmtCountdown();
      else clearInterval(ticker);
    }, 1000);

    const save = async () => { await window.api.setData('habits', habits); renderAll(); };
    const isDone = h => (h.target||1) > 1 ? (h.count||0) >= (h.target||1) : h.doneDate === today;

    let dragSrcIdx = null;

    // Compute current streak: consecutive days done ending on yesterday (or today if done)
    const habitStreak = (h) => {
      const logSet = new Set(Array.isArray(h.log) ? h.log : []);
      // Also include today if done
      const _tn = new Date(); if (_tn.getHours() < 8) _tn.setDate(_tn.getDate() - 1);
      const todayIso = _tn.toISOString().slice(0, 10);
      if (isDone(h)) logSet.add(todayIso);
      let streak = 0;
      const d = new Date(_tn);
      while (true) {
        const iso = d.toISOString().slice(0, 10);
        if (logSet.has(iso)) { streak++; d.setDate(d.getDate() - 1); }
        else break;
        if (streak > 3650) break; // safety
      }
      return streak;
    };

    const habitRow = (h, origIdx) => {
      const done = isDone(h);
      const dot  = PDOT[h.priority||''];
      const isCounter = (h.target||1) > 1;
      const count = h.count || 0;

      const checkPart = isCounter ? `
        <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
          <button class="habit-decrement" data-orig="${origIdx}" style="font-family:var(--mono);font-size:12px;padding:1px 6px;background:var(--bg-3);border:1px solid var(--border);cursor:pointer;color:var(--text-muted)">−</button>
          <button class="habit-increment" data-orig="${origIdx}" style="font-family:var(--mono);font-size:11px;padding:2px 7px;background:${done?'var(--gold)':'var(--bg-3)'};border:1px solid ${done?'var(--gold)':'var(--border)'};color:${done?'#000':'var(--text)'};cursor:pointer;white-space:nowrap">${count}/${h.target}</button>
        </div>` : `<button class="task-check habit-check" data-orig="${origIdx}">✓</button>`;

      return `<div class="task-item ${done&&!isCounter?'done':''} habit-item" data-orig-idx="${origIdx}" data-group="${h.group||''}" draggable="true">
        <span class="drag-handle">⠿</span>
        ${checkPart}
        ${dot ? `<span class="task-priority-dot" data-orig="${origIdx}" style="background:${dot}"></span>`
               : `<span class="task-priority-dot empty" data-orig="${origIdx}"></span>`}
        <span class="task-text" style="${done&&!isCounter?'text-decoration:line-through;opacity:.38':''}${done&&isCounter?'opacity:.45':''}">${h.name}</span>
        ${(() => { const s = habitStreak(h); return s > 1 ? `<span style="font-family:var(--mono);font-size:10px;color:var(--gold-text);opacity:.8;white-space:nowrap;flex-shrink:0" title="${s} day streak">🔥 ${s}</span>` : ''; })()}
        <div class="task-actions">
          <select class="habit-priority-select" data-orig="${origIdx}" style="font-size:10px;padding:2px 4px;background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted)">
            <option value="" ${!h.priority?'selected':''}>—</option>
            <option value="high" ${h.priority==='high'?'selected':''}>🔴</option>
            <option value="medium" ${h.priority==='medium'?'selected':''}>🟡</option>
            <option value="low" ${h.priority==='low'?'selected':''}>🔵</option>
          </select>
          <button class="btn-icon danger habit-remove" data-orig="${origIdx}">✕</button>
        </div>
      </div>`;
    };

    const makeHabitDropZone = (el, targetGroup) => {
      el.addEventListener('dragover', e => {
        if (dragSrcIdx === null) return;
        e.preventDefault();
        document.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
      el.addEventListener('drop', async e => {
        e.preventDefault(); el.classList.remove('drag-over');
        if (dragSrcIdx === null) return;
        const targetRow = e.target.closest('.habit-item[data-orig-idx]');
        habits[dragSrcIdx].group = targetGroup;
        if (targetRow && +targetRow.dataset.origIdx !== dragSrcIdx) {
          const ti = +targetRow.dataset.origIdx;
          const [item] = habits.splice(dragSrcIdx, 1);
          habits.splice(ti > dragSrcIdx ? ti - 1 : ti, 0, item);
        }
        await window.api.setData('habits', habits); renderAll();
      });
    };

    const makeHabitGroupHeaderDrop = (el, groupName) => {
      el.addEventListener('dragover', e => { if (dragSrcIdx !== null) { e.preventDefault(); el.classList.add('drag-over'); } });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', async e => {
        e.preventDefault(); el.classList.remove('drag-over');
        if (dragSrcIdx === null) return;
        habits[dragSrcIdx].group = groupName;
        await window.api.setData('habits', habits); renderAll();
      });
    };

    const renderAll = () => {
      const body = document.getElementById('habit-body'); if (!body) return;
      const progressEl = document.getElementById('habit-progress');
      const doneCount = habits.filter(isDone).length;
      if (progressEl) {
        const pct = habits.length ? Math.round(doneCount / habits.length * 100) : 0;
        progressEl.innerHTML = `<span style="color:var(--gold)">${doneCount}/${habits.length}</span> done today
          <span style="display:inline-block;width:80px;height:4px;background:var(--bg-3);border:1px solid var(--border);margin-left:8px;vertical-align:middle;position:relative">
            <span style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:var(--gold);transition:width .3s"></span>
          </span><span style="margin-left:8px;color:var(--text-muted)">${pct}%</span>`;
      }

      const sortMode = document.getElementById('habit-sort')?.value || 'manual';
      const indices = habits.map((_,i)=>i);
      const sortedIdx = sortMode === 'priority'
        ? [...indices].sort((a,b)=>(PRANK[habits[a].priority||'']??3)-(PRANK[habits[b].priority||'']??3))
        : indices;

      let html = '';
      const ungroupedIdx = sortedIdx.filter(i => !habits[i].group);
      html += `<div class="task-list habit-drop-zone" id="hl-ungrouped" data-drop-group="" style="min-height:${ungroupedIdx.length?'0':'36px'};${!ungroupedIdx.length?'border:1px dashed var(--border);display:flex;align-items:center;padding:8px 14px;':''}">
        ${ungroupedIdx.length ? ungroupedIdx.map(i => habitRow(habits[i], i)).join('') : '<span style="font-size:10px;color:var(--text-muted)">Drop habits here (ungrouped)</span>'}
      </div>`;

      groups.forEach(g => {
        const groupIdx = sortedIdx.filter(i => habits[i].group === g);
        html += `<div class="task-group" style="margin-top:8px">
          <div class="task-group-header habit-group-header-drop" data-habit-group-drop="${g}" data-habit-group-drag="${g}" draggable="true">
            <span class="task-group-toggle">▼</span>
            <span class="drag-handle" style="opacity:.5;margin-right:2px">⠿</span>
            <span class="task-group-name">${g}</span>
            <span class="task-group-count">${groupIdx.length}</span>
            <button class="btn-icon danger habit-group-delete" data-habit-group-delete="${g}" title="Delete group" style="font-size:10px;margin-left:auto">✕</button>
          </div>
          <div class="task-list habit-drop-zone task-group-body" id="hl-${g.replace(/\W/g,'_')}" data-drop-group="${g}" style="min-height:36px;border-left:2px solid var(--border-2);">
            ${groupIdx.map(i => habitRow(habits[i], i)).join('')}
            ${groupIdx.length===0?`<div style="padding:6px 12px;font-size:10px;color:var(--text-muted);font-style:italic">Drop habits here</div>`:''}
          </div>
        </div>`;
      });

      if (!habits.length) html = `<div class="empty-state"><div class="empty-icon">↻</div><div class="empty-text">No habits yet</div></div>`;
      body.innerHTML = html;

      // Wire drag on habit rows
      body.querySelectorAll('.habit-item[data-orig-idx]').forEach(row => {
        row.addEventListener('dragstart', e => {
          dragSrcIdx = +row.dataset.origIdx;
          e.dataTransfer.setData('text', String(dragSrcIdx));
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          document.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
          dragSrcIdx = null;
        });
      });

      // Drop zones
      body.querySelectorAll('.habit-drop-zone').forEach(zone => makeHabitDropZone(zone, zone.dataset.dropGroup || ''));
      body.querySelectorAll('.habit-group-header-drop').forEach(h => makeHabitGroupHeaderDrop(h, h.dataset.habitGroupDrop || ''));

      // Group drag reorder
      let dragSrcGroup = null;
      body.querySelectorAll('[data-habit-group-drag]').forEach(header => {
        header.addEventListener('dragstart', e => {
          if (dragSrcIdx !== null) { e.preventDefault(); return; }
          dragSrcGroup = header.dataset.habitGroupDrag;
          e.dataTransfer.setData('group', dragSrcGroup);
          setTimeout(() => header.closest('.task-group').style.opacity = '0.4', 0);
        });
        header.addEventListener('dragend', () => {
          const grp = header.closest('.task-group'); if (grp) grp.style.opacity = '';
          dragSrcGroup = null;
        });
        header.addEventListener('dragover', e => {
          if (!dragSrcGroup || dragSrcGroup === header.dataset.habitGroupDrag) return;
          e.preventDefault(); header.classList.add('drag-over');
        });
        header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
        header.addEventListener('drop', async e => {
          e.preventDefault(); header.classList.remove('drag-over');
          if (!dragSrcGroup || dragSrcGroup === header.dataset.habitGroupDrag) return;
          const fi = groups.indexOf(dragSrcGroup), ti = groups.indexOf(header.dataset.habitGroupDrag);
          if (fi < 0 || ti < 0) return;
          const [g] = groups.splice(fi, 1); groups.splice(ti, 0, g);
          await window.api.setData('habit-groups', groups); renderAll();
        });
      });
    };

    renderAll();
    document.getElementById('habit-sort').addEventListener('change', renderAll);

    container.querySelector('#add-habit-group-btn').addEventListener('click', () => {
      App.openModal('Add Habit Group', `
        <div class="form-row"><label class="form-label">Group Name</label>
          <input class="input" id="habit-group-name" placeholder="e.g. Morning Routine, Fitness…"/></div>
        <button class="btn btn-gold" id="habit-group-save" style="width:100%;margin-top:12px">Create Group</button>`);
      setTimeout(() => document.getElementById('habit-group-name')?.focus(), 50);
      document.getElementById('habit-group-save').addEventListener('click', async () => {
        const name = document.getElementById('habit-group-name').value.trim();
        if (!name || groups.includes(name)) { App.toast(name?'Already exists':'Enter a name','error'); return; }
        groups.push(name); await window.api.setData('habit-groups', groups);
        App.closeModal(); renderAll(); App.toast(`Group "${name}" created`, 'success');
      });
    });

    container.querySelector('#add-habit-btn').addEventListener('click', () => {
      App.openModal('Add Habit', `
        <div class="form-row"><label class="form-label">Habit Name</label>
          <input class="input" id="h-name" placeholder="e.g. Drink Water"/></div>
        <div class="form-row" style="margin-top:10px"><label class="form-label">Group</label>
          <select class="input" id="h-group-sel">
            <option value="">No group</option>
            ${groups.map(g=>`<option value="${g}">${g}</option>`).join('')}
          </select></div>
        <div class="form-row" style="margin-top:10px"><label class="form-label">Type</label>
          <div style="display:flex;gap:12px;font-size:13px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="h-type" value="once" checked/> Once</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="h-type" value="counter"/> Counter</label>
          </div></div>
        <div id="h-target-row" style="display:none;margin-top:10px"><label class="form-label">Target</label>
          <input class="input" id="h-target" type="number" value="3" min="2" max="99" style="width:80px"/></div>
        <div class="form-row" style="margin-top:10px"><label class="form-label">Priority</label>
          <select class="input" id="h-priority">
            <option value="">No priority</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select></div>
        <button class="btn btn-gold" id="h-save" style="width:100%;margin-top:14px">Add Habit</button>`);
      document.querySelectorAll('[name="h-type"]').forEach(r => r.addEventListener('change', () => {
        document.getElementById('h-target-row').style.display = document.querySelector('[name="h-type"]:checked').value==='counter'?'':'none';
      }));
      document.getElementById('h-save').addEventListener('click', async () => {
        const name = document.getElementById('h-name').value.trim(); if (!name) return;
        const group = document.getElementById('h-group-sel').value;
        const isCounter = document.querySelector('[name="h-type"]:checked').value === 'counter';
        const target = isCounter ? Math.max(2, +document.getElementById('h-target').value||3) : 1;
        const priority = document.getElementById('h-priority').value;
        habits.push({ name, priority:priority||'', group:group||'', doneDate:null, target, count:0 });
        await window.api.setData('habits', habits); App.closeModal(); renderAll();
      });
    });

    container.querySelector('#habit-body').addEventListener('click', async e => {
      const gdel  = e.target.closest('.habit-group-delete');
      const check = e.target.closest('.habit-check');
      const incr  = e.target.closest('.habit-increment');
      const decr  = e.target.closest('.habit-decrement');
      const rem   = e.target.closest('.habit-remove');
      const dot   = e.target.closest('.task-priority-dot');
      if (gdel) {
        e.stopPropagation();
        const g = gdel.dataset.habitGroupDelete;
        groups.splice(groups.indexOf(g), 1);
        habits.forEach(h => { if (h.group === g) h.group = ''; });
        await window.api.setData('habit-groups', groups);
        await window.api.setData('habits', habits); renderAll(); return;
      }
      if (check) { const h=habits[+check.dataset.orig]; if(h){h.doneDate=h.doneDate===today?null:today;await save();} }
      else if (incr) { const h=habits[+incr.dataset.orig]; if(h){h.count=Math.min((h.count||0)+1,h.target||1);if(h.count>=(h.target||1))h.doneDate=today;await save();} }
      else if (decr) { const h=habits[+decr.dataset.orig]; if(h&&(h.count||0)>0){h.count=(h.count||0)-1;h.doneDate=null;await save();} }
      else if (rem)  { habits.splice(+rem.dataset.orig,1); await window.api.setData('habits',habits); renderAll(); }
      else if (dot)  { const h=habits[+dot.dataset.orig]; if(h){const c={'':'high',high:'medium',medium:'low',low:''};h.priority=c[h.priority||''];await save();} }
    });

    container.querySelector('#habit-body').addEventListener('change', async e => {
      const sel = e.target.closest('.habit-priority-select');
      if (sel) { const h=habits[+sel.dataset.orig];if(h){h.priority=sel.value;await save();} }
    });
  }
};
