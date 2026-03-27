// ── Library Module ────────────────────────────────────────────────────────────
// Media database: watch / read / play tables
// Ratings, status, progress, remember flag, chronicle milestones

Modules.library = {
  tab: 'watch',
  filter: 'all',
  sort: 'title',
  sortDir: 1,

  STATUS_LIST: ['watching','completed','paused','dropped','plantowatch','rewatching'],
  STATUS_LABEL: {
    watching:    'Watching',
    completed:   'Completed',
    paused:      'Paused',
    dropped:     'Dropped',
    plantowatch: 'Plan to',
    rewatching:  'Rewatching',
  },
  STATUS_COLOR: {
    watching:    '#60a5fa',
    completed:   '#22c55e',
    paused:      '#eab308',
    dropped:     '#ef4444',
    plantowatch: 'var(--text-muted)',
    rewatching:  '#a78bfa',
  },
  TAB_META: {
    watch: { label: 'Watch', icon: '🎬', progress: 'Episode', unit: 'Ep',
      statusLabel: { watching:'Watching', plantowatch:'Plan to Watch', rewatching:'Rewatching', completed:'Completed' },
      types: ['Anime','Show','Movie','Documentary','Other'] },
    read:  { label: 'Read',  icon: '📖', progress: 'Chapter', unit: 'Ch',
      statusLabel: { watching:'Reading', plantowatch:'Plan to Read', rewatching:'Rereading', completed:'Completed' },
      types: ['Manga','Manhwa','Manhua','Book','Novel','Other'] },
    play:  { label: 'Play',  icon: '🎮', progress: 'Hour',    unit: 'Hr',
      statusLabel: { watching:'Playing', plantowatch:'Plan to Play', rewatching:'Replaying', completed:'Completed' },
      types: [] }, // game genre is free-text
  },

  async render(container) {
    let lib = await window.api.getData('library').catch(() => ({ watch:[], read:[], play:[] })) || {};
    if (!lib.watch) lib.watch = [];
    if (!lib.read)  lib.read  = [];
    if (!lib.play)  lib.play  = [];

    const save = async () => { await window.api.setData('library', lib); };
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tabMeta = () => this.TAB_META[this.tab];

    const statusLabel = (status) => {
      const tm = tabMeta();
      return tm.statusLabel[status] || this.STATUS_LABEL[status] || status;
    };

    const logMilestone = async (entry, event) => {
      try {
        const chronicle = await window.api.chronicleGet().catch(() => ({}));
        const todayKey = (() => { const n=new Date(); if(n.getHours()<8) n.setDate(n.getDate()-1); return n.toISOString().slice(0,10); })();
        if (!chronicle[todayKey]) chronicle[todayKey] = { windows:{}, snapshot:null };
        if (!chronicle[todayKey].milestones) chronicle[todayKey].milestones = [];
        chronicle[todayKey].milestones.push({ title: entry.title, event, time: new Date().toISOString() });
        await window.api.setData('chronicle', chronicle);
      } catch {}
    };

    const render = () => {
      const entries = lib[this.tab] || [];
      let filtered = this.filter === 'all' ? [...entries] : entries.filter(e => (e.status||'watching') === this.filter);

      // Sort
      filtered.sort((a, b) => {
        let av, bv;
        if (this.sort === 'title')    { av = a.title||''; bv = b.title||''; }
        else if (this.sort === 'rating')   { av = a.rating10||0; bv = b.rating10||0; }
        else if (this.sort === 'stars')    { av = a.stars||0;    bv = b.stars||0; }
        else if (this.sort === 'progress') { av = a.progress||0; bv = b.progress||0; }
        else if (this.sort === 'status')   { av = a.status||'';  bv = b.status||''; }
        else if (this.sort === 'type')     { av = a.type||'';    bv = b.type||''; }
        else { av = a.title||''; bv = b.title||''; }
        if (av < bv) return -this.sortDir;
        if (av > bv) return  this.sortDir;
        return 0;
      });

      const sortArrow = col => this.sort === col ? (this.sortDir===1 ? ' ↑' : ' ↓') : '';
      const tm = tabMeta();

      container.innerHTML = `
        <style>
          .lib-table tr { transition: opacity .15s; }
          .lib-status-badge { display:inline-block; font-size:9px; padding:2px 7px; border:1px solid; letter-spacing:.04em; font-weight:600; text-transform:uppercase; }
          .lib-times-badge { display:inline-flex;align-items:center;gap:3px;font-family:var(--mono);font-size:11px;color:var(--text-muted); }
          .lib-times-btn { background:none;border:1px solid var(--border);color:var(--text-muted);width:18px;height:18px;font-size:11px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center; }
          .lib-times-btn:hover { border-color:var(--accent-line);color:var(--accent); }
          .lib-notes-expand { background:none;border:none;color:var(--text-muted);font-size:10px;cursor:pointer;padding:0;text-decoration:underline; }
          .lib-notes-area { display:none;width:100%;font-size:10px;padding:3px 8px;font-family:var(--mono);background:none;border:1px solid var(--border-2);color:var(--text);margin-top:4px;resize:vertical; }
          .lib-notes-area.visible { display:block; }
          .lib-progress-input { width:42px;text-align:center;background:none;border:1px solid var(--border-2);color:var(--text);font-family:var(--mono);font-size:11px;padding:1px 2px;outline:none; }
          .lib-progress-input:focus { border-color:var(--accent-dim); }
          .lib-score-arrows input[type=number]::-webkit-inner-spin-button,
          .lib-score-arrows input[type=number]::-webkit-outer-spin-button { display:none; }
          .lib-score-arrows { position:relative;display:inline-flex;align-items:center;gap:2px; }
          .lib-score-arrows-btns { display:flex;flex-direction:column; }
          .lib-score-arrows-btns button { background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;line-height:1;font-size:8px;height:10px; }
          .lib-score-arrows-btns button:hover { color:var(--accent); }
          .lib-group-header { display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-2);border:1px solid var(--border);cursor:pointer;font-weight:700;font-size:12px; }
          .lib-group-header:hover { background:var(--bg-3); }
          .lib-group-body { padding:0 0 0 16px; }
        </style>
        ${Utils.modHead('Library', 'The Library', `${lib.watch.length} shows · ${lib.read.length} manga · ${lib.play.length} games`, `
          <button class="btn btn-gold" id="lib-add-btn">+ Add Entry</button>
          <button class="btn" id="lib-group-btn" style="margin-left:6px">+ Season Group</button>
        `)}

        <div class="lib-tabs">
          ${['watch','read','play'].map(t => `
            <button class="lib-tab ${this.tab===t?'active':''}" data-tab="${t}">
              ${this.TAB_META[t].icon} ${this.TAB_META[t].label} (${(lib[t]||[]).length})
            </button>`).join('')}
        </div>

        <div class="lib-toolbar">
          <input class="input" id="lib-search" placeholder="Search…" style="width:200px;padding:6px 12px;font-size:12px" />
          <span style="font-size:10px;color:var(--text-muted);margin-left:4px">Filter:</span>
          <button class="lib-filter-pill ${this.filter==='all'?'active':''}" data-filter="all">All (${entries.length})</button>
          ${this.STATUS_LIST.map(s => {
            const count = entries.filter(e => (e.status||'watching')===s).length;
            if (!count && this.filter !== s) return '';
            return `<button class="lib-filter-pill ${this.filter===s?'active':''}" data-filter="${s}" style="border-color:${this.STATUS_COLOR[s]}22;color:${this.STATUS_COLOR[s]}">${statusLabel(s)} (${count})</button>`;
          }).join('')}
        </div>

        ${filtered.length === 0
          ? `<div class="empty-state"><div class="empty-icon">${tm.icon}</div>
             <div class="empty-text">No entries${this.filter!=='all'?' with this status':''}</div>
             <div class="empty-hint">Use + Add Entry or the launcher: <code style="font-family:var(--mono);color:var(--gold)">planto Title</code></div></div>`
          : `<div style="overflow-x:auto">
          <table class="lib-table" id="lib-table">
            <thead><tr>
              <th data-sort="title" style="min-width:160px">Title${sortArrow('title')}</th>
              <th data-sort="type" style="min-width:80px">Type${sortArrow('type')}</th>
              <th data-sort="status">Status${sortArrow('status')}</th>
              <th data-sort="progress">${tm.progress}${sortArrow('progress')}</th>
              <th>Times</th>
              <th data-sort="stars">Stars${sortArrow('stars')}</th>
              <th data-sort="rating">/10${sortArrow('rating')}</th>
              <th>Remember?</th>
              <th style="width:120px">Notes</th>
              <th style="width:60px"></th>
            </tr></thead>
            <tbody>
              ${filtered.map(e => {
                const remember = e.remember !== false; // default true
                const stars = e.stars || 0;
                const times = e.times || 1;
                const statusColor = this.STATUS_COLOR[e.status||'watching'] || 'var(--text-muted)';
                return `<tr data-id="${e.id}" class="${!remember?'amnesia-row':''}">
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      <span class="lib-entry-title" style="${!remember?'opacity:.5':''}">${esc(e.title)}</span>
                    </div>
                    <div style="display:flex;gap:4px;margin-top:4px">
                      <button class="lib-times-btn" data-id="${e.id}" data-action="rename" title="Rename entry" style="font-size:9px;width:auto;padding:0 4px">✎</button>
                    </div>
                  </td>
                  <td>
                    ${tm.types.length
                      ? `<select class="input lib-type-select" data-id="${e.id}" style="font-size:10px;padding:2px 4px;width:90px">
                          <option value="">—</option>
                          ${tm.types.map(t => `<option value="${t}" ${e.type===t?'selected':''}>${t}</option>`).join('')}
                        </select>`
                      : `<input class="input lib-type-input" data-id="${e.id}" placeholder="Genre…" value="${esc(e.type||'')}" style="font-size:10px;padding:2px 6px;width:80px">`
                    }
                  </td>
                  <td>
                    <select class="lib-status-select input" data-id="${e.id}" style="font-size:10px;padding:3px 6px;width:110px;color:${statusColor};border-color:${statusColor}44">
                      ${this.STATUS_LIST.map(s => `<option value="${s}" ${(e.status||'watching')===s?'selected':''} style="color:var(--text)">${statusLabel(s)}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <div class="lib-progress" style="${!remember?'opacity:.4':''}">
                      <button class="lib-progress-bump" data-id="${e.id}" data-action="bump" title="+1 ${tm.progress}">+</button>
                      <input class="lib-progress-input" type="number" min="0" value="${e.progress||0}" data-id="${e.id}" data-action="progress-edit" />
                    </div>
                  </td>
                  <td>
                    <div class="lib-times-badge">
                      <button class="lib-times-btn" data-id="${e.id}" data-action="times-dec" title="Decrease count">−</button>
                      <span style="min-width:20px;text-align:center">${times}×</span>
                      <button class="lib-times-btn" data-id="${e.id}" data-action="times-inc" title="Increase count">+</button>
                    </div>
                  </td>
                  <td>
                    <div class="star-rating" data-id="${e.id}">
                      ${[1,2,3,4,5].map(n => `<span class="star ${stars>=n?'filled':''}" data-star="${n}" data-id="${e.id}">★</span>`).join('')}
                    </div>
                  </td>
                  <td>
                    <div class="lib-score-arrows">
                      <input class="lib-score-input" type="number" min="0" max="10" step=".1"
                        value="${e.rating10||''}" placeholder="—" data-id="${e.id}" data-action="score"
                        style="${!remember?'opacity:.3;pointer-events:none':''}"/>
                      <div class="lib-score-arrows-btns">
                        <button data-id="${e.id}" data-action="score-up" tabindex="-1">▲</button>
                        <button data-id="${e.id}" data-action="score-dn" tabindex="-1">▼</button>
                      </div>
                    </div>
                  </td>
                  <td style="text-align:center">
                    <input type="checkbox" class="lib-remember-chk" data-id="${e.id}" ${remember?'checked':''} style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer" title="Remember this? Uncheck to mark as forgotten." />
                  </td>
                  <td>
                    <button class="lib-notes-expand" data-id="${e.id}" data-action="notes-toggle">${e.notes?'📝 notes':'+ notes'}</button>
                    <textarea class="lib-notes-area ${e._notesOpen?'visible':''}" data-id="${e.id}" data-action="notes" rows="2" placeholder="Extra notes…">${esc(e.notes||'')}</textarea>
                  </td>
                  <td>
                    <div style="display:flex;gap:2px;justify-content:flex-end">
                      <button class="btn-icon danger" data-id="${e.id}" data-action="remove" title="Remove">✕</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>`}`;

      // Tab switching
      container.querySelectorAll('.lib-tab').forEach(tab => {
        tab.addEventListener('click', () => { this.tab = tab.dataset.tab; this.filter = 'all'; render(); });
      });

      // Filter pills
      container.querySelectorAll('.lib-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => { this.filter = pill.dataset.filter; render(); });
      });

      // Sort columns
      container.querySelectorAll('.lib-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          if (this.sort === th.dataset.sort) this.sortDir *= -1;
          else { this.sort = th.dataset.sort; this.sortDir = 1; }
          render();
        });
      });

      // Add entry
      container.querySelector('#lib-add-btn')?.addEventListener('click', () => {
        const tm2 = tabMeta();
        const typeOptions = tm2.types.length
          ? `<select class="input" id="lib-add-type" style="margin-top:6px;width:100%"><option value="">— Type —</option>${tm2.types.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>`
          : `<input class="input" id="lib-add-type" placeholder="Genre / Type…" style="margin-top:6px;width:100%" />`;
        App.openModal(`Add to ${tm2.label} Library`, `
          <div class="form-row"><label class="form-label">Title</label>
            <input class="input" id="lib-add-title" placeholder="Title…"/></div>
          <div class="form-row" style="margin-top:10px"><label class="form-label">Type</label>
            ${typeOptions}</div>
          <div class="form-row" style="margin-top:10px"><label class="form-label">Status</label>
            <select class="input" id="lib-add-status">
              ${this.STATUS_LIST.map(s=>`<option value="${s}">${statusLabel(s)}</option>`).join('')}
            </select></div>
          <button class="btn btn-gold" id="lib-add-save" style="width:100%;margin-top:14px">Add</button>`);
        setTimeout(() => document.getElementById('lib-add-title')?.focus(), 50);
        document.getElementById('lib-add-save').addEventListener('click', async () => {
          const title = document.getElementById('lib-add-title').value.trim();
          const status = document.getElementById('lib-add-status').value;
          const type = document.getElementById('lib-add-type').value.trim();
          if (!title) { App.toast('Title required', 'error'); return; }
          lib[this.tab].unshift({ id: Utils.uid(), title, status, type, progress:0, stars:0, rating10:null, times:1, remember:true, notes:'', addedAt: new Date().toISOString() });
          await save(); App.closeModal(); render(); App.toast(`Added: ${title}`, 'success');
        });
      });

      // Season group
      container.querySelector('#lib-group-btn')?.addEventListener('click', () => {
        App.openModal('Create Season Group', `
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Group multiple seasons/entries under one parent. Each entry stays rated individually.</div>
          <div class="form-row"><label class="form-label">Group Name</label>
            <input class="input" id="lib-grp-name" placeholder="e.g. Attack on Titan" /></div>
          <div class="form-row" style="margin-top:10px"><label class="form-label">Entry IDs to group (comma-separated titles or leave blank)</label>
            <input class="input" id="lib-grp-entries" placeholder="Optional — you can drag entries later" /></div>
          <button class="btn btn-gold" id="lib-grp-save" style="width:100%;margin-top:14px">Create Group</button>`);
        document.getElementById('lib-grp-save').addEventListener('click', async () => {
          const name = document.getElementById('lib-grp-name').value.trim();
          if (!name) { App.toast('Group name required','error'); return; }
          if (!lib._groups) lib._groups = {};
          if (!lib._groups[this.tab]) lib._groups[this.tab] = [];
          lib._groups[this.tab].push({ id: Utils.uid(), name, entryIds: [] });
          await save(); App.closeModal(); App.toast(`Group "${name}" created`, 'success');
        });
      });

      // Search live filter
      container.querySelector('#lib-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        container.querySelectorAll('#lib-table tbody tr').forEach(row => {
          const title = row.querySelector('.lib-entry-title')?.textContent?.toLowerCase() || '';
          row.style.display = title.includes(q) ? '' : 'none';
        });
      });

      const table = container.querySelector('#lib-table');
      if (!table) return;

      // Type select/input change
      table.addEventListener('change', async e => {
        const sel = e.target.closest('.lib-type-select, .lib-type-input');
        if (!sel) return;
        const entry = lib[this.tab].find(x => x.id === sel.dataset.id);
        if (!entry) return;
        entry.type = sel.value;
        await save();
      });
      table.addEventListener('blur', async e => {
        const inp = e.target.closest('.lib-type-input');
        if (!inp) return;
        const entry = lib[this.tab].find(x => x.id === inp.dataset.id);
        if (!entry) return;
        entry.type = inp.value.trim();
        await save();
      }, true);

      // Status change
      table.addEventListener('change', async e => {
        const sel = e.target.closest('.lib-status-select');
        if (!sel) return;
        const entry = lib[this.tab].find(x => x.id === sel.dataset.id);
        if (!entry) return;
        const oldStatus = entry.status;
        entry.status = sel.value;
        if (['completed','dropped'].includes(sel.value) && sel.value !== oldStatus) {
          await logMilestone(entry, sel.value === 'completed' ? 'Completed' : 'Dropped');
        }
        await save(); render();
      });

      // Score /10
      table.addEventListener('change', async e => {
        const inp = e.target.closest('[data-action="score"]');
        if (!inp) return;
        const entry = lib[this.tab].find(x => x.id === inp.dataset.id);
        if (!entry) return;
        const val = parseFloat(inp.value);
        entry.rating10 = isNaN(val) ? null : Math.min(10, Math.max(0, val));
        await save();
      });

      // Notes textarea
      table.addEventListener('change', async e => {
        const inp = e.target.closest('[data-action="notes"]');
        if (!inp) return;
        const entry = lib[this.tab].find(x => x.id === inp.dataset.id);
        if (!entry) return;
        entry.notes = inp.value.trim();
        await save();
      });

      // Remember checkbox
      table.addEventListener('change', async e => {
        const chk = e.target.closest('.lib-remember-chk');
        if (!chk) return;
        const entry = lib[this.tab].find(x => x.id === chk.dataset.id);
        if (!entry) return;
        entry.remember = chk.checked;
        await save(); render();
      });

      // Progress inline edit
      table.addEventListener('change', async e => {
        const inp = e.target.closest('[data-action="progress-edit"]');
        if (!inp) return;
        const entry = lib[this.tab].find(x => x.id === inp.dataset.id);
        if (!entry) return;
        const val = parseInt(inp.value);
        if (!isNaN(val) && val >= 0) entry.progress = val;
        await save();
      });

      // Clicks
      table.addEventListener('click', async e => {
        // +1 progress bump
        const bump = e.target.closest('[data-action="bump"]');
        if (bump) {
          const entry = lib[this.tab].find(x => x.id === bump.dataset.id);
          if (!entry) return;
          entry.progress = (entry.progress || 0) + 1;
          // Update just the input value for perf, avoid full re-render
          const inp = bump.closest('tr')?.querySelector('[data-action="progress-edit"]');
          if (inp) inp.value = entry.progress;
          await save();
          return;
        }

        // Score up/down arrows
        const scoreUp = e.target.closest('[data-action="score-up"]');
        const scoreDn = e.target.closest('[data-action="score-dn"]');
        if (scoreUp || scoreDn) {
          const id = (scoreUp || scoreDn).dataset.id;
          const entry = lib[this.tab].find(x => x.id === id);
          if (!entry) return;
          const inp = e.target.closest('td').querySelector('[data-action="score"]');
          let cur = parseFloat(inp?.value) || entry.rating10 || 0;
          cur = Math.min(10, Math.max(0, parseFloat((cur + (scoreUp ? 0.1 : -0.1)).toFixed(1))));
          entry.rating10 = cur;
          if (inp) inp.value = cur;
          await save();
          return;
        }

        // Times inc/dec
        const timesInc = e.target.closest('[data-action="times-inc"]');
        const timesDec = e.target.closest('[data-action="times-dec"]');
        if (timesInc || timesDec) {
          const id = (timesInc || timesDec).dataset.id;
          const entry = lib[this.tab].find(x => x.id === id);
          if (!entry) return;
          entry.times = Math.max(1, (entry.times || 1) + (timesInc ? 1 : -1));
          const span = e.target.closest('.lib-times-badge')?.querySelector('span');
          if (span) span.textContent = `${entry.times}×`;
          await save();
          return;
        }

        // Notes toggle
        const notesToggle = e.target.closest('[data-action="notes-toggle"]');
        if (notesToggle) {
          const id = notesToggle.dataset.id;
          const entry = lib[this.tab].find(x => x.id === id);
          if (!entry) return;
          const area = e.target.closest('td')?.querySelector('.lib-notes-area');
          if (area) {
            const isVisible = area.classList.toggle('visible');
            notesToggle.textContent = isVisible ? '▲ notes' : (entry.notes ? '📝 notes' : '+ notes');
            if (isVisible) area.focus();
          }
          return;
        }

        // Rename entry
        const rename = e.target.closest('[data-action="rename"]');
        if (rename) {
          const id = rename.dataset.id;
          const entry = lib[this.tab].find(x => x.id === id);
          if (!entry) return;
          App.openModal('Rename Entry', `
            <div class="form-row"><label class="form-label">New Title</label>
              <input class="input" id="lib-rename-input" value="${esc(entry.title)}" /></div>
            <button class="btn btn-gold" id="lib-rename-save" style="width:100%;margin-top:14px">Save</button>`);
          setTimeout(() => {
            const inp = document.getElementById('lib-rename-input');
            inp?.focus(); inp?.select();
          }, 50);
          document.getElementById('lib-rename-save').addEventListener('click', async () => {
            const newTitle = document.getElementById('lib-rename-input').value.trim();
            if (!newTitle) { App.toast('Title required','error'); return; }
            entry.title = newTitle;
            await save(); App.closeModal(); render();
          });
          return;
        }

        // Star rating
        const star = e.target.closest('.star[data-star]');
        if (star) {
          const entry = lib[this.tab].find(x => x.id === star.dataset.id);
          if (!entry) return;
          const n = +star.dataset.star;
          entry.stars = entry.stars === n ? 0 : n;
          if (entry.stars === 5) { await logMilestone(entry, '5 Stars'); App.toast(`⭐⭐⭐⭐⭐ ${entry.title}`, 'success'); }
          await save(); render();
          return;
        }

        // Remove
        const removeBtn = e.target.closest('[data-action="remove"]');
        if (removeBtn) {
          const entry = lib[this.tab].find(x => x.id === removeBtn.dataset.id);
          if (!entry) return;
          const ok = await App.confirm(`Remove "${entry.title}" from library?`, { danger: true });
          if (!ok) return;
          lib[this.tab] = lib[this.tab].filter(x => x.id !== removeBtn.dataset.id);
          await save(); render();
        }
      });
    };

    render();
  },
};
