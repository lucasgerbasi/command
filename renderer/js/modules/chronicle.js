Modules.chronicle = {
  view: 'calendar',    // 'calendar' | 'list' | 'stats' | 'review'
  calYear:  new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  expandedDay: null,
  reviewYear:  new Date().getFullYear(),
  reviewMonth: new Date().getMonth(),
  reviewMode:  'month', // 'month' | 'year'

  async render(container) {
    // Sync moods into snapshots on every render — fixes the mood-not-attached bug
    await window.api.chronicleSyncMoods().catch(() => {});

    const [chronicle, isEnabled] = await Promise.all([
      window.api.chronicleGet().catch(() => ({})),
      window.api.chronicleIsEnabled().catch(() => true),
    ]);

    const MOOD_EMOJI = ['', '😢', '😕', '😐', '🙂', '😁'];
    const MOOD_LABEL = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great'];
    const MOOD_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    const MOOD_BG    = ['', 'rgba(239,68,68,.15)', 'rgba(249,115,22,.15)', 'rgba(234,179,8,.15)', 'rgba(34,197,94,.15)', 'rgba(59,130,246,.15)'];

    const todayKey = (() => {
      const n = new Date();
      if (n.getHours() < 8) n.setDate(n.getDate() - 1);
      return n.toISOString().slice(0, 10);
    })();

    const allDates  = Object.keys(chronicle).filter(k => !k.startsWith('_')).sort((a,b) => b.localeCompare(a));
    const snapDates = allDates.filter(d => chronicle[d]?.snapshot);
    const moods     = await window.api.getData('moods').catch(() => ({})) || {};
    const todayMoodLogged = !!moods[todayKey];

    const totalDays  = snapDates.length;
    const moodScores = snapDates.map(d => chronicle[d].snapshot?.mood?.score).filter(Number.isFinite);
    const avgMood    = moodScores.length ? (moodScores.reduce((a,b)=>a+b)/moodScores.length).toFixed(1) : null;
    const appTally   = {};
    allDates.forEach(d => Object.entries(chronicle[d]?.windows||{}).forEach(([t,n]) => { appTally[t]=(appTally[t]||0)+n; }));
    const isTracking = chronicle[todayKey]?.windows && Object.keys(chronicle[todayKey].windows).length > 0;

    container.innerHTML = `
      <style>
        .chr-tab{background:none;border:none;color:var(--text-muted);font-family:var(--font);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:6px 14px;cursor:pointer;border-bottom:2px solid transparent;transition:color .1s,border-color .1s}
        .chr-tab.active{color:var(--gold);border-bottom-color:var(--gold)}
        .chr-cal-cell{aspect-ratio:1;min-height:52px;background:var(--bg-2);border:1px solid var(--border);cursor:pointer;padding:4px 6px;transition:border-color .12s,background .12s;position:relative;display:flex;flex-direction:column;gap:2px}
        .chr-cal-cell:hover{border-color:var(--border-2);background:var(--bg-3)}
        .chr-cal-cell.has-snap{border-color:var(--border-2)}
        .chr-cal-cell.today-cell{border-color:var(--gold-line)!important;background:var(--gold-glow)!important}
        .chr-cal-cell.empty{background:transparent!important;border-color:transparent!important;cursor:default}
        .chr-cal-date{font-family:var(--mono);font-size:10px;color:var(--text-muted)}
        .chr-cal-mood{font-size:14px;line-height:1}
        .chr-cal-bar{height:3px;border-radius:1px;margin-top:auto}
        .chr-day-panel{background:var(--bg-1);border:1px solid var(--border-2);padding:20px 24px;margin-top:12px}
        .chr-win-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}
        .chr-win-title{font-size:11px;color:var(--text);flex:1;min-width:0;word-break:break-word;line-height:1.4}
        .chr-win-bar-wrap{flex-shrink:0;width:90px;height:5px;background:var(--bg-3);border:1px solid var(--border);margin-top:4px}
        .chr-win-bar{height:100%;background:var(--gold)}
        .chr-win-ticks{font-family:var(--mono);font-size:9px;color:var(--text-muted);white-space:nowrap;min-width:30px;text-align:right;padding-top:2px}
        .chr-clip{font-family:var(--mono);font-size:10px;color:var(--text-dim);background:var(--bg-3);border:1px solid var(--border);padding:8px 10px;margin-bottom:6px;line-height:1.5;word-break:break-word;white-space:pre-wrap;max-height:90px;overflow-y:auto}
        .chr-mood-pick-btn{font-size:24px;padding:8px 12px;background:transparent;border:2px solid var(--border);cursor:pointer;transition:all .1s}
        .chr-mood-pick-btn.selected{background:var(--bg-3);border-color:var(--gold)}
        .chr-snap-card{background:var(--bg-2);border:1px solid var(--border);margin-bottom:8px}
      </style>
      ${Utils.modHead('Chronicle', 'The Chronicle', 'Your daily activity log')}

      <div style="display:flex;align-items:center;gap:0;margin-bottom:0;flex-wrap:wrap;border-bottom:1px solid var(--border)">
        <button class="chr-tab ${this.view==='calendar'?'active':''}" data-view="calendar">Calendar</button>
        <button class="chr-tab ${this.view==='list'?'active':''}" data-view="list">Timeline</button>
        <button class="chr-tab ${this.view==='stats'?'active':''}" data-view="stats">Stats</button>
        <button class="chr-tab ${this.view==='review'?'active':''}" data-view="review">In Review</button>
        <div style="margin-left:auto;display:flex;align-items:center;gap:10px;padding:4px 0">
          <label style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text-muted);cursor:pointer;letter-spacing:.06em;text-transform:uppercase" title="Toggle window tracking">
            Track <input type="checkbox" id="chr-enabled-toggle" ${isEnabled?'checked':''} style="accent-color:var(--gold);cursor:pointer"/>
          </label>
          <button id="btn-recover-data" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:2px 8px;font-size:10px;cursor:pointer">↺ Recover</button>
          <button id="btn-wipe-chronicle" style="background:transparent;border:1px solid var(--red);color:var(--red);padding:2px 8px;font-size:10px;cursor:pointer">Wipe</button>
        </div>
      </div>

      <!-- Status bar -->
      <div style="display:flex;gap:16px;align-items:center;padding:8px 0 16px;flex-wrap:wrap;border-bottom:1px solid var(--border);margin-bottom:20px">
        <div style="font-family:var(--mono);font-size:11px">
          ${isEnabled
            ? (isTracking
                ? `<span style="color:var(--green)">● Recording</span> <span style="color:var(--text-muted)">${Object.keys(chronicle[todayKey]?.windows||{}).length} windows today</span>`
                : `<span style="color:var(--gold-text)">◎ Waiting</span>`)
            : `<span style="color:var(--text-muted)">⊘ Disabled</span>`}
        </div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">${totalDays} day${totalDays!==1?'s':''} recorded</div>
        <div style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--text-muted)">
          ${avgMood ? `${MOOD_EMOJI[Math.round(+avgMood)]} avg ${avgMood}/5 ·` : ''}
          <span style="color:${todayMoodLogged?'var(--green)':'var(--text-muted)'}" title="${todayMoodLogged?'Mood logged today':'No mood logged yet today'}">${todayMoodLogged?'✓':'○'} today</span>
        </div>
      </div>

      <div id="chr-main"></div>
    `;

    container.querySelectorAll('.chr-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        this.expandedDay = null;
        this.render(container);
      });
    });
    container.querySelector('#chr-enabled-toggle').addEventListener('change', async e => {
      await window.api.chronicleSetEnabled(e.target.checked);
    });
    document.getElementById('btn-recover-data')?.addEventListener('click', async () => {
      await window.api.chronicleBuildSnapshot();
      App.toast('Snapshots recovered', 'success');
      this.render(container);
    });
    document.getElementById('btn-wipe-chronicle')?.addEventListener('click', async () => {
      const ok = await App.confirm('Permanently delete all Chronicle data?', { danger: true, icon: '⚠' });
      if (ok) {
        await window.api.chronicleDeleteAll();
        App.toast('Chronicle wiped');
        this.render(container);
      }
    });

    const main = container.querySelector('#chr-main');
    const C = { chronicle, todayKey, moods, MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR, MOOD_BG, snapDates, allDates, appTally, moodScores, avgMood };

    if (this.view === 'calendar') this.renderCalendar(main, C, container);
    else if (this.view === 'list') this.renderTimeline(main, C, container);
    else if (this.view === 'stats') this.renderStats(main, C);
    else this.renderReview(main, C, container);
  },

  // ── Calendar View ─────────────────────────────────────────────────────────
  renderCalendar(el, C, rootContainer) {
    const { chronicle, todayKey, MOOD_EMOJI, MOOD_COLOR, snapDates } = C;
    const year = this.calYear, month = this.calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(`<div class="chr-cal-cell empty"></div>`);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayData = chronicle[iso];
      const snap = dayData?.snapshot;
      const moodScore = snap?.mood?.score;
      const isToday = iso === todayKey;
      const ticks = snap?.totalPolls || Object.values(dayData?.windows||{}).reduce((a,b)=>a+b,0);
      cells.push(`
        <div class="chr-cal-cell ${snap?'has-snap':''} ${isToday?'today-cell':''}" data-iso="${iso}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <span class="chr-cal-date" style="color:${isToday?'var(--gold)':''}">${d}</span>
            ${moodScore ? `<span class="chr-cal-mood">${MOOD_EMOJI[moodScore]}</span>` : ''}
          </div>
          ${ticks > 0 ? `<div class="chr-cal-bar" style="background:${moodScore?MOOD_COLOR[moodScore]:'var(--gold-dim, #92400e)'};width:${Math.min(100,Math.round(ticks/48*100))}%"></div>` : ''}
        </div>`);
    }

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <button class="btn-icon" id="cal-prev">‹</button>
        <span style="font-weight:700;font-size:14px;letter-spacing:.04em;flex:1;text-align:center">${monthName}</span>
        <button class="btn-icon" id="cal-next">›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px">
        ${['S','M','T','W','T','F','S'].map(d=>`<div style="font-size:9px;text-align:center;color:var(--text-muted);letter-spacing:.1em;padding:3px 0">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">${cells.join('')}</div>
      <div id="chr-day-detail"></div>`;

    el.querySelector('#cal-prev').addEventListener('click', () => {
      this.calMonth--; if (this.calMonth < 0) { this.calMonth=11; this.calYear--; }
      this.expandedDay = null; this.renderCalendar(el, C, rootContainer);
    });
    el.querySelector('#cal-next').addEventListener('click', () => {
      this.calMonth++; if (this.calMonth > 11) { this.calMonth=0; this.calYear++; }
      this.expandedDay = null; this.renderCalendar(el, C, rootContainer);
    });
    el.querySelectorAll('.chr-cal-cell[data-iso]').forEach(cell => {
      cell.addEventListener('click', () => {
        const iso = cell.dataset.iso;
        this.expandedDay = this.expandedDay === iso ? null : iso;
        this.renderCalendar(el, C, rootContainer);
      });
    });

    if (this.expandedDay) {
      const detail = el.querySelector('#chr-day-detail');
      this.renderDayDetail(detail, this.expandedDay, C, rootContainer);
    }
  },

  renderDayDetail(el, iso, C, rootContainer) {
    const { chronicle, MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR } = C;
    const dayData = chronicle[iso];
    const snap = dayData?.snapshot;
    const windows = dayData?.windows || {};
    const dateLabel = new Date(iso+'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    const moodScore = snap?.mood?.score;

    if (!snap && Object.keys(windows).length === 0) {
      el.innerHTML = `<div class="chr-day-panel"><span style="color:var(--text-muted);font-size:12px">No data for ${dateLabel}</span></div>`;
      return;
    }

    el.innerHTML = `
      <div class="chr-day-panel">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${dateLabel}</div>
            <div style="font-size:10px;color:var(--text-muted);font-family:var(--mono);margin-top:2px">${snap?.totalPolls||0} ticks · ${snap?.top10?.length||Object.keys(windows).length} apps</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${moodScore
              ? `<div style="text-align:center"><div style="font-size:28px">${MOOD_EMOJI[moodScore]}</div><div style="font-size:9px;color:${MOOD_COLOR[moodScore]};text-transform:uppercase;letter-spacing:.08em">${MOOD_LABEL[moodScore]}</div></div>`
              : `<button id="attach-mood-btn" data-date="${iso}" style="background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted);padding:4px 10px;font-size:10px;cursor:pointer">+ Attach Mood</button>`}
            <button class="btn-icon chronicle-del-btn" data-date="${iso}" style="color:var(--text-muted);font-size:12px" title="Delete snapshot">🗑</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 240px;gap:16px">
          <div>
            <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Windows</div>
            ${this.winBars(snap?.top10?.length ? Object.fromEntries(snap.top10.map(w=>[w.title,w.ticks||0])) : windows, 10, iso)}
          </div>
          <div>
            <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Keywords of the Day</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px" id="kw-chips">
              ${(snap?.keywords||[]).length
                ? snap.keywords.map(kw => `<span class="kw-chip ${snap.userKeyword===kw?'user-kw':''}">${kw.replace(/</g,'&lt;')}</span>`).join('')
                : `<span style="font-size:11px;color:var(--text-muted);font-style:italic">No clipboard activity</span>`}
            </div>
            <div style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:5px">Your keyword</div>
            <div style="display:flex;gap:6px">
              <input class="input input-mono" id="user-kw-input" placeholder="one word…" value="${(snap?.userKeyword||'').replace(/"/g,'&quot;')}"
                style="font-size:11px;padding:5px 8px;flex:1" />
              <button class="btn" id="user-kw-save" style="font-size:10px;padding:5px 10px">Set</button>
            </div>
            ${snap?.milestones?.length ? `
              <div style="margin-top:12px">
                <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Milestones</div>
                ${snap.milestones.map(m=>`<div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">🏆 ${m.event}: ${m.title.replace(/</g,'&lt;')}</div>`).join('')}
              </div>` : ''}
          </div>
        </div>
      </div>`;

    el.querySelector('#attach-mood-btn')?.addEventListener('click', () => this.openMoodPicker(iso, C, rootContainer));
    el.querySelector('.chronicle-del-btn')?.addEventListener('click', async () => {
      const ok = await App.confirm('Delete this snapshot?', { danger: true });
      if (ok) {
        await window.api.chronicleDeleteSnapshot(iso);
        this.expandedDay = null; App.toast('Snapshot deleted'); this.render(rootContainer);
      }
    });
    el.querySelector('#user-kw-save')?.addEventListener('click', async () => {
      const kw = el.querySelector('#user-kw-input').value.trim().toLowerCase().split(/\s+/)[0] || '';
      await window.api.chronicleSetUserKeyword(iso, kw);
      // Rebuild snapshot for this day
      await window.api.chronicleBuildSnapshot();
      App.toast(kw ? `Keyword "${kw}" added` : 'Keyword cleared', 'success');
      this.render(rootContainer);
    });
    el.querySelectorAll('.chr-del-app').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.api.chronicleDeleteApp(btn.dataset.date, btn.dataset.app);
        this.render(rootContainer);
      });
    });
  },

  openMoodPicker(date, C, rootContainer) {
    const { MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR } = C;
    const dateLabel = new Date(date+'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    App.openModal(`Attach Mood — ${dateLabel}`, `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">How was this day?</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px">
        ${MOOD_EMOJI.slice(1).map((e,i)=>`<button class="chr-mood-pick-btn" data-score="${i+1}" style="border-color:${MOOD_COLOR[i+1]}">${e}<div style="font-size:9px;color:${MOOD_COLOR[i+1]};margin-top:2px">${MOOD_LABEL[i+1]}</div></button>`).join('')}
      </div>
      <input class="input" id="attach-mood-note" placeholder="Note (optional)…" style="width:100%;margin-bottom:14px"/>
      <button class="btn btn-gold" id="attach-mood-save" style="width:100%">Save</button>
    `);
    let selectedScore = null;
    document.querySelectorAll('.chr-mood-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedScore = +btn.dataset.score;
        document.querySelectorAll('.chr-mood-pick-btn').forEach(b => b.classList.toggle('selected', +b.dataset.score === selectedScore));
      });
    });
    document.getElementById('attach-mood-save').addEventListener('click', async () => {
      if (!selectedScore) { App.toast('Pick a mood first', 'error'); return; }
      const note = document.getElementById('attach-mood-note').value.trim();
      const moodData = { score: selectedScore, note, time: new Date().toISOString() };
      // Save to moods.json too so it shows up in the mood module
      const moods = await window.api.getData('moods').catch(()=>({})) || {};
      moods[date] = moodData;
      await window.api.setData('moods', moods);
      // Attach to snapshot
      await window.api.chronicleSetSnapshotMood(date, moodData);
      App.closeModal();
      App.toast('Mood attached', 'success');
      this.expandedDay = date;
      this.render(rootContainer);
    });
  },

  // ── Timeline View ─────────────────────────────────────────────────────────
  renderTimeline(el, C, rootContainer) {
    const { chronicle, snapDates, todayKey, MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR } = C;

    // Today so far (if tracking and not yet snapshotted)
    const todayWindows = chronicle[todayKey]?.windows || {};
    const todayHasData = Object.keys(todayWindows).length > 0;
    const todaySnapped = !!chronicle[todayKey]?.snapshot;

    let html = '';
    if (todayHasData && !todaySnapped) {
      html += `
        <div style="margin-bottom:24px">
          <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--green);margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span>Today so far
          </div>
          <div class="chr-snap-card" style="border-color:var(--border-2)">
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-1);display:flex;align-items:center;gap:10px">
              <span style="font-size:13px;font-weight:700;color:var(--text);flex:1">Today — ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</span>
              <span style="font-size:10px;color:var(--text-muted);font-family:var(--mono)">${Object.values(todayWindows).reduce((a,b)=>a+b,0)} ticks · ${Object.keys(todayWindows).length} apps</span>
            </div>
            <div style="padding:12px 16px">${this.winBars(todayWindows, 8, null)}</div>
          </div>
        </div>`;
    }

    if (!snapDates.length) {
      html += `<div class="empty-state"><div class="empty-icon">📖</div><div class="empty-text">No snapshots yet</div><div class="empty-hint">Snapshots build automatically at 8am.</div></div>`;
      el.innerHTML = html; return;
    }

    // Group by year-month
    const byMonth = {};
    snapDates.forEach(d => { const ym=d.slice(0,7); if(!byMonth[ym]) byMonth[ym]=[]; byMonth[ym].push(d); });
    const months = Object.keys(byMonth).sort((a,b)=>b.localeCompare(a));

    html += months.map(ym => {
      const [y,m] = ym.split('-');
      const label = new Date(+y,+m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
      return `<div style="margin-bottom:28px">
        <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${label}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${byMonth[ym].map(d => this.timelineCard(d, chronicle[d].snapshot, C, rootContainer)).join('')}
        </div>
      </div>`;
    }).join('');

    el.innerHTML = html;

    el.querySelectorAll('.chronicle-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this snapshot?')) {
          await window.api.chronicleDeleteSnapshot(btn.dataset.date);
          App.toast('Snapshot deleted'); this.render(rootContainer);
        }
      });
    });
    el.querySelectorAll('.chr-del-app').forEach(btn => {
      btn.addEventListener('click', async () => {
        await window.api.chronicleDeleteApp(btn.dataset.date, btn.dataset.app);
        this.render(rootContainer);
      });
    });
    el.querySelectorAll('.chr-attach-mood').forEach(btn => {
      btn.addEventListener('click', () => {
        this.expandedDay = btn.dataset.date;
        this.openMoodPicker(btn.dataset.date, C, rootContainer);
      });
    });
  },

  timelineCard(date, snap, C, rootContainer) {
    if (!snap) return '';
    const { MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR } = C;
    const dateLabel = new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    const moodScore = snap.mood?.score;
    return `
      <div class="chr-snap-card">
        <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-1)">
          <div style="font-size:13px;font-weight:700;color:var(--text);flex:1">${dateLabel}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--mono)">${snap.totalPolls||0} ticks · ${snap.top10?.length||0} apps</div>
          ${moodScore
            ? `<span style="font-size:20px" title="${MOOD_LABEL[moodScore]}">${MOOD_EMOJI[moodScore]}</span>`
            : `<button class="chr-attach-mood" data-date="${date}" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:2px 7px;font-size:9px;cursor:pointer;letter-spacing:.04em">+ mood</button>`}
          <button class="btn-icon chronicle-del-btn" data-date="${date}" style="color:var(--text-muted);font-size:12px" title="Delete">🗑</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr ${snap.clips?.length?'220px':''};gap:0">
          <div style="padding:12px 16px;${snap.clips?.length?'border-right:1px solid var(--border)':''}">
            ${this.winBars(snap.top10?.length ? Object.fromEntries(snap.top10.map(w=>[w.title,w.ticks||0])) : {}, 8, date)}
          </div>
          ${snap.clips?.length ? `<div style="padding:12px 16px">
            ${snap.clips.map(c=>`<div class="chr-clip">${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>`;
  },

  // ── Stats View ─────────────────────────────────────────────────────────────
  renderStats(el, C) {
    const { appTally, moodScores, MOOD_EMOJI, MOOD_COLOR, MOOD_LABEL, avgMood, allDates, chronicle } = C;
    const top10Apps = Object.entries(appTally).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const maxTicks  = top10Apps[0]?.[1]||1;
    const moodDist  = [0,0,0,0,0,0];
    moodScores.forEach(s => { if(s>=1&&s<=5) moodDist[s]++; });
    const maxDist = Math.max(...moodDist.slice(1),1);
    const dowTally = [0,0,0,0,0,0,0];
    allDates.forEach(d => {
      const dow = new Date(d+'T12:00:00').getDay();
      const t = Object.values(chronicle[d]?.windows||{}).reduce((a,b)=>a+b,0);
      dowTally[dow]+=t;
    });
    const maxDow = Math.max(...dowTally,1);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card" style="padding:20px 24px">
          <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px">Top Apps — All Time</div>
          ${top10Apps.length ? top10Apps.map(([title,ticks])=>`
            <div class="chr-win-row">
              <div class="chr-win-title">${title.replace(/</g,'&lt;')}</div>
              <div class="chr-win-bar-wrap"><div class="chr-win-bar" style="width:${Math.round(ticks/maxTicks*100)}%"></div></div>
              <div class="chr-win-ticks">${ticks}t</div>
            </div>`).join('') : `<span style="color:var(--text-muted);font-size:12px">No data yet</span>`}
        </div>
        <div class="card" style="padding:20px 24px">
          <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px">Mood Distribution</div>
          ${[1,2,3,4,5].map(s=>`
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
              <span style="font-size:16px;width:20px">${MOOD_EMOJI[s]}</span>
              <div style="flex:1;height:14px;background:var(--bg-3);border:1px solid var(--border);position:relative">
                <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.round(moodDist[s]/maxDist*100)}%;background:${MOOD_COLOR[s]};opacity:.7"></div>
              </div>
              <span style="font-family:var(--mono);font-size:10px;color:var(--text-muted);min-width:20px;text-align:right">${moodDist[s]}</span>
            </div>`).join('')}
          ${avgMood?`<div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--text-muted)">Average: ${MOOD_EMOJI[Math.round(+avgMood)]} ${avgMood}/5</div>`:''}
        </div>
        <div class="card" style="padding:20px 24px">
          <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px">Activity by Day of Week</div>
          <div style="display:flex;align-items:flex-end;gap:6px;height:80px">
            ${dowTally.map((t,i)=>`
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%">
                <div style="flex:1;width:100%;display:flex;align-items:flex-end">
                  <div style="width:100%;background:var(--gold);opacity:.7;height:${Math.round(t/maxDow*100)}%"></div>
                </div>
                <div style="font-size:8px;color:var(--text-muted)">${DOW[i]}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px">
          <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px">Summary</div>
          ${[['Days Recorded',C.snapDates.length],['Total Ticks',Object.values(appTally).reduce((a,b)=>a+b,0)],['Moods Logged',moodScores.length],['Unique Apps',Object.keys(appTally).length]]
            .map(([label,val])=>`
              <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:8px">
                <span style="font-size:12px;color:var(--text-muted)">${label}</span>
                <span style="font-family:var(--mono);font-size:20px;font-weight:200;color:var(--gold)">${val}</span>
              </div>`).join('')}
        </div>
      </div>`;
  },

  // ── In Review ──────────────────────────────────────────────────────────────
  renderReview(el, C, rootContainer) {
    const { chronicle, moods, MOOD_EMOJI, MOOD_LABEL, MOOD_COLOR, snapDates } = C;
    const isYear = this.reviewMode === 'year';
    const year   = this.reviewYear;
    const month  = this.reviewMonth;

    // Filter dates to selected period
    const periodDates = snapDates.filter(d => {
      if (isYear) return d.startsWith(`${year}`);
      const ym = `${year}-${String(month+1).padStart(2,'0')}`;
      return d.startsWith(ym);
    });

    // Mood data for period
    const periodMoodEntries = Object.entries(moods).filter(([d]) => {
      if (isYear) return d.startsWith(`${year}`);
      const ym = `${year}-${String(month+1).padStart(2,'0')}`;
      return d.startsWith(ym);
    });
    const periodScores = periodMoodEntries.map(([,v]) => (typeof v === 'object' ? v.score : v)).filter(Number.isFinite);
    const periodAvg    = periodScores.length ? (periodScores.reduce((a,b)=>a+b)/periodScores.length).toFixed(1) : null;
    const moodDist     = [0,0,0,0,0,0];
    periodScores.forEach(s => { if(s>=1&&s<=5) moodDist[s]++; });

    // App usage for period
    const appTally = {};
    periodDates.forEach(d => {
      Object.entries(chronicle[d]?.snapshot?.top10||[]).forEach(w => { appTally[w.title]=(appTally[w.title]||0)+(w.ticks||0); });
    });
    const topApps = Object.entries(appTally).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxTicks = topApps[0]?.[1]||1;

    // Best / worst mood days
    const moodSorted = periodMoodEntries
      .map(([d,v]) => ({ d, score: typeof v==='object' ? v.score : v }))
      .filter(x => Number.isFinite(x.score))
      .sort((a,b) => b.score-a.score);
    const bestDay  = moodSorted[0];
    const worstDay = moodSorted[moodSorted.length-1];

    // Streak within period
    let longestStreak = 0, curStreak = 0;
    const moodSet = new Set(periodMoodEntries.map(([d])=>d));
    const pStart = isYear ? new Date(year,0,1) : new Date(year,month,1);
    const pEnd   = isYear ? new Date(year,11,31) : new Date(year,month+1,0);
    for (let dt=new Date(pStart); dt<=pEnd; dt.setDate(dt.getDate()+1)) {
      const iso = dt.toISOString().slice(0,10);
      if (moodSet.has(iso)) { curStreak++; longestStreak = Math.max(longestStreak,curStreak); }
      else curStreak = 0;
    }

    // Mood trend: plot scores by day (for month) or by week (for year)
    const trendPoints = isYear
      ? (() => {
          const weekly = {};
          periodMoodEntries.forEach(([d,v]) => {
            const dt = new Date(d+'T12:00:00');
            const wk = `${dt.getFullYear()}-W${String(Math.ceil((dt.getDate()+new Date(dt.getFullYear(),dt.getMonth(),0).getDay()-1)/7)).padStart(2,'0')}-${dt.getMonth()}`;
            const s = typeof v==='object'?v.score:v;
            if(!weekly[wk]) weekly[wk]={sum:0,n:0};
            weekly[wk].sum+=s; weekly[wk].n++;
          });
          return Object.values(weekly).map(w => w.sum/w.n);
        })()
      : periodMoodEntries.sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>typeof v==='object'?v.score:v);

    const trendMax = 5, trendMin = 1;
    const trendW = 400, trendH = 60;
    const trendPath = trendPoints.length > 1 ? trendPoints.map((s,i) => {
      const x = Math.round(i/(trendPoints.length-1)*trendW);
      const y = Math.round((1-(s-trendMin)/(trendMax-trendMin))*trendH);
      return `${i===0?'M':'L'}${x},${y}`;
    }).join(' ') : '';

    const periodLabel = isYear ? `${year}` : new Date(year,month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

    el.innerHTML = `
      <!-- Period selector -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <div style="display:flex;gap:0;border:1px solid var(--border)">
          <button id="review-mode-month" style="padding:4px 12px;font-size:11px;background:${!isYear?'var(--gold)':'transparent'};color:${!isYear?'#000':'var(--text-muted)'};border:none;cursor:pointer">Month</button>
          <button id="review-mode-year" style="padding:4px 12px;font-size:11px;background:${isYear?'var(--gold)':'transparent'};color:${isYear?'#000':'var(--text-muted)'};border:none;cursor:pointer">Year</button>
        </div>
        <button class="btn-icon" id="review-prev">‹</button>
        <span style="font-weight:700;font-size:15px;letter-spacing:.02em;min-width:160px;text-align:center">${periodLabel}</span>
        <button class="btn-icon" id="review-next">›</button>
        ${periodDates.length === 0 ? `<span style="color:var(--text-muted);font-size:11px">No data for this period</span>` : ''}
      </div>

      ${periodDates.length === 0 ? `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No Chronicle data for ${periodLabel}</div></div>` : `
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Days Tracked</div>
          <div style="font-family:var(--mono);font-size:32px;font-weight:200;color:var(--gold)">${periodDates.length}</div>
        </div>
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Avg Mood</div>
          ${periodAvg ? `<div style="font-size:28px">${MOOD_EMOJI[Math.round(+periodAvg)]}</div><div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin-top:2px">${periodAvg}/5</div>` : '<div style="color:var(--text-muted);font-size:12px">—</div>'}
        </div>
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Moods Logged</div>
          <div style="font-family:var(--mono);font-size:32px;font-weight:200;color:var(--gold)">${periodScores.length}</div>
        </div>
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Longest Streak</div>
          <div style="font-size:24px">${longestStreak > 0 ? '🔥' : '—'}</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin-top:2px">${longestStreak > 0 ? `${longestStreak}d` : ''}</div>
        </div>
        ${bestDay ? `<div class="card" style="padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Best Day</div>
          <div style="font-size:20px">${MOOD_EMOJI[bestDay.score]}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--mono);margin-top:4px">${new Date(bestDay.d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        </div>` : ''}
        ${worstDay && worstDay.d !== bestDay?.d ? `<div class="card" style="padding:16px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Hardest Day</div>
          <div style="font-size:20px">${MOOD_EMOJI[worstDay.score]}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--mono);margin-top:4px">${new Date(worstDay.d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        </div>` : ''}
      </div>

      <!-- Mood trend line -->
      ${trendPath ? `
      <div class="card" style="padding:16px 20px;margin-bottom:16px">
        <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Mood Trend</div>
        <svg viewBox="0 0 ${trendW} ${trendH}" width="100%" height="${trendH}" style="display:block">
          <path d="${trendPath}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${trendPoints.map((s,i)=>`<circle cx="${Math.round(i/(trendPoints.length-1||1)*trendW)}" cy="${Math.round((1-(s-1)/4)*trendH)}" r="3" fill="var(--gold)"/>`).join('')}
        </svg>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;color:var(--text-muted);margin-top:4px">
          <span>${isYear?'Jan':'Day 1'}</span><span>${isYear?'Dec':'Day '+new Date(year,month+1,0).getDate()}</span>
        </div>
      </div>` : ''}

      <!-- App usage + mood dist side by side -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card" style="padding:16px 20px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Top Apps This ${isYear?'Year':'Month'}</div>
          ${topApps.length ? topApps.map(([title,ticks])=>`
            <div class="chr-win-row">
              <div class="chr-win-title">${title.replace(/</g,'&lt;')}</div>
              <div class="chr-win-bar-wrap"><div class="chr-win-bar" style="width:${Math.round(ticks/maxTicks*100)}%"></div></div>
              <div class="chr-win-ticks">${ticks}t</div>
            </div>`).join('') : `<span style="font-size:11px;color:var(--text-muted)">No app data</span>`}
        </div>
        <div class="card" style="padding:16px 20px">
          <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Mood Distribution</div>
          ${[1,2,3,4,5].map(s=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:14px;width:18px">${MOOD_EMOJI[s]}</span>
              <div style="flex:1;height:12px;background:var(--bg-3);border:1px solid var(--border);position:relative">
                <div style="position:absolute;left:0;top:0;bottom:0;width:${moodDist[s]>0?Math.round(moodDist[s]/Math.max(...moodDist.slice(1))*100):0}%;background:${MOOD_COLOR[s]};opacity:.75"></div>
              </div>
              <span style="font-family:var(--mono);font-size:10px;color:var(--text-muted);min-width:18px;text-align:right">${moodDist[s]}</span>
            </div>`).join('')}
        </div>
      </div>
      `}
    `;

    el.querySelector('#review-mode-month').addEventListener('click', () => { this.reviewMode='month'; this.renderReview(el,C,rootContainer); });
    el.querySelector('#review-mode-year').addEventListener('click',  () => { this.reviewMode='year';  this.renderReview(el,C,rootContainer); });
    el.querySelector('#review-prev').addEventListener('click', () => {
      if (isYear) this.reviewYear--;
      else { this.reviewMonth--; if(this.reviewMonth<0){this.reviewMonth=11;this.reviewYear--;} }
      this.renderReview(el,C,rootContainer);
    });
    el.querySelector('#review-next').addEventListener('click', () => {
      if (isYear) this.reviewYear++;
      else { this.reviewMonth++; if(this.reviewMonth>11){this.reviewMonth=0;this.reviewYear++;} }
      this.renderReview(el,C,rootContainer);
    });
  },

  // ── Shared helpers ─────────────────────────────────────────────────────────
  winBars(windows, limit=10, dateKey=null) {
    const entries = Object.entries(windows).sort((a,b)=>b[1]-a[1]).slice(0,limit);
    if (!entries.length) return `<span style="font-size:11px;color:var(--text-muted)">No data</span>`;
    const max = entries[0][1]||1;
    return entries.map(([title,ticks])=>{
      const safe = title.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      return `<div class="chr-win-row">
        <div class="chr-win-title">${safe}</div>
        <div class="chr-win-bar-wrap"><div class="chr-win-bar" style="width:${Math.round(ticks/max*100)}%"></div></div>
        <div class="chr-win-ticks">${ticks}t</div>
        ${dateKey?`<button class="chr-del-app" data-date="${dateKey}" data-app="${safe}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px;padding:0 2px;opacity:.3" title="Remove">✕</button>`:''}
      </div>`;
    }).join('');
  },
};
