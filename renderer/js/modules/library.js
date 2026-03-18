// ── Library Module ────────────────────────────────────────────────────────────
// Media database: watch / read / play tables
// Ratings, status, progress, amnesia mechanic, chronicle milestones

Modules.library = {
  tab: 'watch',    // 'watch' | 'read' | 'play'
  filter: 'all',   // status filter
  sort: 'title',
  sortDir: 1,

  STATUS_LIST: ['watching','completed','paused','dropped','plantowatch','watched2x','amnesia'],
  STATUS_LABEL: {
    watching:    'Watching',
    completed:   'Completed',
    paused:      'Paused',
    dropped:     'Dropped',
    plantowatch: 'Plan to Watch',
    watched2x:   'Watched 2×',
    amnesia:     '? Amnesia',
  },
  // Per-tab labels
  TAB_META: {
    watch: { label: 'Watch', icon: '🎬', progress: 'Episode', statusLabel: { watching:'Watching', plantowatch:'Plan to Watch', watched2x:'Watched 2×', completed:'Completed' } },
    read:  { label: 'Read',  icon: '📖', progress: 'Chapter', statusLabel: { watching:'Reading', plantowatch:'Plan to Read', watched2x:'Read 2×', completed:'Completed' } },
    play:  { label: 'Play',  icon: '🎮', progress: 'Hour',    statusLabel: { watching:'Playing', plantowatch:'Plan to Play', watched2x:'Played 2×', completed:'Completed' } },
  },

  async render(container) {
    let lib = await window.api.getData('library').catch(() => ({ watch:[], read:[], play:[] })) || {};
    if (!lib.watch) lib.watch = [];
    if (!lib.read)  lib.read  = [];
    if (!lib.play)  lib.play  = [];

    const save = async () => { await window.api.setData('library', lib); };

    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tabMeta = this.TAB_META[this.tab];

    // Build status label respecting tab
    const statusLabel = (status, tab) => {
      const tm = this.TAB_META[tab || this.tab];
      return tm.statusLabel[status] || this.STATUS_LABEL[status] || status;
    };

    // Chronicle milestone logging
    const logMilestone = async (entry, event) => {
      try {
        const chronicle = await window.api.chronicleGet().catch(() => ({}));
        const todayKey = (() => {
          const n = new Date(); if (n.getHours() < 8) n.setDate(n.getDate()-1);
          return n.toISOString().slice(0,10);
        })();
        if (!chronicle[todayKey]) chronicle[todayKey] = { windows:{}, snapshot:null };
        if (!chronicle[todayKey].milestones) chronicle[todayKey].milestones = [];
        chronicle[todayKey].milestones.push({ title: entry.title, event, time: new Date().toISOString() });
        await window.api.setData('chronicle', chronicle);
      } catch {}
    };

    const render = () => {
      const entries = lib[this.tab] || [];
      const allStatuses = ['all', ...new Set(entries.map(e => e.status || 'watching'))];

      let filtered = this.filter === 'all' ? [...entries] : entries.filter(e => (e.status||'watching') === this.filter);
      // Sort
      filtered.sort((a, b) => {
        let av, bv;
        if (this.sort === 'title')  { av = a.title||''; bv = b.title||''; }
        else if (this.sort === 'rating') { av = a.rating10||0; bv = b.rating10||0; }
        else if (this.sort === 'stars')  { av = a.stars||0;    bv = b.stars||0; }
        else if (this.sort === 'progress') { av = a.progress||0; bv = b.progress||0; }
        else { av = a.title||''; bv = b.title||''; }
        if (av < bv) return -this.sortDir;
        if (av > bv) return  this.sortDir;
        return 0;
      });

      const sortArrow = col => this.sort === col ? (this.sortDir === 1 ? ' ↑' : ' ↓') : '';

      container.innerHTML = `
        <style>
          .lib-table tr { transition: opacity .15s; }
          .lib-table tr.amnesia-row td { filter: grayscale(.5); opacity: .38; }
        </style>
        ${Utils.modHead('Library', 'The Library', `${lib.watch.length} shows · ${lib.read.length} manga · ${lib.play.length} games`, `
          <button class="btn btn-gold" id="lib-add-btn">+ Add Entry</button>
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
            return `<button class="lib-filter-pill ${this.filter===s?'active':''}" data-filter="${s}">${statusLabel(s)} (${count})</button>`;
          }).join('')}
        </div>

        ${filtered.length === 0
          ? `<div class="empty-state"><div class="empty-icon">${tabMeta.icon}</div>
             <div class="empty-text">No entries${this.filter!=='all'?' with this status':''}</div>
             <div class="empty-hint">Use + Add Entry or the launcher: <code style="font-family:var(--mono);color:var(--gold)">plantowatch Title</code></div></div>`
          : `<div style="overflow-x:auto">
          <table class="lib-table" id="lib-table">
            <thead><tr>
              <th data-sort="title" style="min-width:180px">Title${sortArrow('title')}</th>
              <th>Status</th>
              <th data-sort="progress">${tabMeta.progress}${sortArrow('progress')}</th>
              <th data-sort="stars">Stars${sortArrow('stars')}</th>
              <th data-sort="rating">/10${sortArrow('rating')}</th>
              <th>Summary</th>
              <th style="width:80px"></th>
            </tr></thead>
            <tbody>
              ${filtered.map(e => {
                const isAmnesia = e.status === 'amnesia';
                const stars = e.stars || 0;
                return `<tr class="${isAmnesia?'amnesia-row':''}" data-id="${e.id}">
                  <td>
                    <div class="lib-entry-title" style="${isAmnesia?'opacity:.5':''}">
                      ${isAmnesia?'<span class="lib-amnesia-badge">?</span> ':''}${esc(e.title)}
                    </div>
                  </td>
                  <td>
                    <select class="lib-status-select input" data-id="${e.id}" style="font-size:10px;padding:3px 6px;width:120px;${isAmnesia?'opacity:.5':''}">
                      ${this.STATUS_LIST.map(s => `<option value="${s}" ${(e.status||'watching')===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <div class="lib-progress" style="${isAmnesia?'opacity:.4':''}">
                      <button class="lib-progress-bump" data-id="${e.id}" data-action="bump" title="+1 ${tabMeta.progress}">+</button>
                      <span style="min-width:28px;text-align:center">${e.progress||0}</span>
                    </div>
                  </td>
                  <td>
                    <div class="star-rating" data-id="${e.id}" style="${isAmnesia?'pointer-events:none;opacity:.3':''}">
                      ${[1,2,3,4,5].map(n => `<span class="star ${stars>=n?'filled':''}" data-star="${n}" data-id="${e.id}">★</span>`).join('')}
                    </div>
                  </td>
                  <td>
                    <input class="lib-score-input" type="number" min="0" max="10" step=".1"
                      value="${e.rating10||''}" placeholder="—" data-id="${e.id}" data-action="score"
                      style="${isAmnesia?'opacity:.3;pointer-events:none':''}"/>
                  </td>
                  <td style="max-width:200px">
                    <input class="input" style="font-size:10px;padding:3px 8px;font-family:var(--mono);font-style:italic;width:100%;background:none;border-color:transparent"
                      placeholder="One sentence summary…" value="${esc(e.summary||'')}" data-id="${e.id}" data-action="summary"
                      title="Write one strict sentence to force memory rehearsal" />
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
        App.openModal(`Add to ${tabMeta.label} Library`, `
          <div class="form-row"><label class="form-label">Title</label>
            <input class="input" id="lib-add-title" placeholder="Title…"/></div>
          <div class="form-row" style="margin-top:10px"><label class="form-label">Status</label>
            <select class="input" id="lib-add-status">
              ${this.STATUS_LIST.map(s=>`<option value="${s}">${statusLabel(s)}</option>`).join('')}
            </select></div>
          <button class="btn btn-gold" id="lib-add-save" style="width:100%;margin-top:14px">Add</button>`);
        setTimeout(() => document.getElementById('lib-add-title')?.focus(), 50);
        document.getElementById('lib-add-save').addEventListener('click', async () => {
          const title = document.getElementById('lib-add-title').value.trim();
          const status = document.getElementById('lib-add-status').value;
          if (!title) { App.toast('Title required', 'error'); return; }
          lib[this.tab].unshift({ id: Utils.uid(), title, status, progress:0, stars:0, rating10:null, summary:'', addedAt: new Date().toISOString() });
          await save(); App.closeModal(); render(); App.toast(`Added: ${title}`, 'success');
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

      // Event delegation for table interactions
      const table = container.querySelector('#lib-table');
      if (!table) return;

      // Status change
      table.addEventListener('change', async e => {
        const sel = e.target.closest('.lib-status-select');
        if (!sel) return;
        const id = sel.dataset.id;
        const entry = lib[this.tab].find(x => x.id === id);
        if (!entry) return;
        const oldStatus = entry.status;
        entry.status = sel.value;
        // Chronicle milestone for completed / dropped / 5-star
        if (['completed','dropped'].includes(sel.value) && sel.value !== oldStatus) {
          await logMilestone(entry, sel.value === 'completed' ? 'Completed' : 'Dropped');
        }
        // Amnesia: clear rating display (already done by re-render)
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

      // Summary
      table.addEventListener('change', async e => {
        const inp = e.target.closest('[data-action="summary"]');
        if (!inp) return;
        const entry = lib[this.tab].find(x => x.id === inp.dataset.id);
        if (!entry) return;
        // Enforce one sentence (strip after first . ? ! if there's a space after)
        let text = inp.value.trim();
        const m = text.match(/^[^.?!]*[.?!]/);
        if (m && m[0] !== text) { text = m[0]; inp.value = text; App.toast('Summary trimmed to one sentence'); }
        entry.summary = text;
        await save();
      });

      // Progress bump
      table.addEventListener('click', async e => {
        const bump = e.target.closest('[data-action="bump"]');
        if (!bump) return;
        const entry = lib[this.tab].find(x => x.id === bump.dataset.id);
        if (!entry) return;
        entry.progress = (entry.progress || 0) + 1;
        await save(); render();
        // Update display without full re-render for performance
      });

      // Star rating
      table.addEventListener('click', async e => {
        const star = e.target.closest('.star[data-star]');
        if (!star) return;
        const entry = lib[this.tab].find(x => x.id === star.dataset.id);
        if (!entry || entry.status === 'amnesia') return;
        const n = +star.dataset.star;
        entry.stars = entry.stars === n ? 0 : n; // toggle off if clicking same
        if (entry.stars === 5) {
          await logMilestone(entry, '5 Stars');
          App.toast(`⭐⭐⭐⭐⭐ ${entry.title}`, 'success');
        }
        await save(); render();
      });

      // Remove
      table.addEventListener('click', async e => {
        const btn = e.target.closest('[data-action="remove"]');
        if (!btn) return;
        const entry = lib[this.tab].find(x => x.id === btn.dataset.id);
        if (!entry) return;
        const ok = await App.confirm(`Remove "${entry.title}" from library?`, { danger: true });
        if (!ok) return;
        lib[this.tab] = lib[this.tab].filter(x => x.id !== btn.dataset.id);
        await save(); render();
      });
    };

    render();
  },
};
