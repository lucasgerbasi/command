Modules.moods = {
  async render(container) {
    const moods = await window.api.getData('moods').catch(() => ({})) || {};
    const EMOJIS = ['😢', '😕', '😐', '🙂', '😁'];
    const LABELS = ['Awful', 'Bad', 'Okay', 'Good', 'Great'];
    const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];

    // Today key respects the 8am rule
    const todayKey = Utils.moodDate();
    const todayEntry = moods[todayKey];

    // Mood streak: consecutive days logged ending today/yesterday
    const moodStreak = (() => {
      let streak = 0;
      const d = new Date();
      if (d.getHours() < 8) d.setDate(d.getDate() - 1);
      while (true) {
        const iso = d.toISOString().slice(0, 10);
        if (moods[iso] !== undefined) { streak++; d.setDate(d.getDate() - 1); }
        else break;
        if (streak > 3650) break;
      }
      return streak;
    })();

    // Stats
    const entries = Object.entries(moods).sort((a, b) => b[0].localeCompare(a[0]));
    const currMonth = new Date().toISOString().slice(0, 7);
    const monthScores = entries
      .filter(([d]) => d.startsWith(currMonth))
      .map(([, v]) => typeof v === 'object' ? v.score : v)
      .filter(n => Number.isFinite(n));
    const avgScore = monthScores.length
      ? monthScores.reduce((a, b) => a + b, 0) / monthScores.length
      : null;
    const avgIdx = avgScore !== null ? Math.round(avgScore) - 1 : null;

    const todayScore = todayEntry !== undefined
      ? (typeof todayEntry === 'object' ? todayEntry.score : todayEntry)
      : null;

    container.innerHTML = `
      ${Utils.modHead('Moods', 'Mood Tracker', 'Track how you feel each day')}

      <div style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;">
        <div class="card" style="flex:1; min-width:160px; display:flex; flex-direction:column; align-items:center; padding:20px;">
          <div class="section-label" style="margin-top:0;">Today</div>
          <div style="font-size:48px; margin:8px 0; line-height:1;">${todayScore !== null ? EMOJIS[todayScore - 1] : '—'}</div>
          <div style="font-size:11px; color:var(--text-muted);">${todayScore !== null ? LABELS[todayScore - 1] : 'Not logged yet'}</div>
          ${todayEntry?.note ? `<div style="font-size:11px;color:var(--text-dim);margin-top:6px;font-style:italic;">"${todayEntry.note}"</div>` : ''}
        </div>
        <div class="card" style="flex:1; min-width:160px; display:flex; flex-direction:column; align-items:center; padding:20px;">
          <div class="section-label" style="margin-top:0;">This Month Avg</div>
          <div style="font-size:48px; margin:8px 0; line-height:1;">${avgIdx !== null ? EMOJIS[avgIdx] : '—'}</div>
          <div style="font-size:11px; color:var(--text-muted);">${avgIdx !== null ? LABELS[avgIdx] : 'No data'} · ${monthScores.length} day${monthScores.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="card" style="flex:1; min-width:160px; display:flex; flex-direction:column; align-items:center; padding:20px;">
          <div class="section-label" style="margin-top:0;">All-time</div>
          <div style="font-family:var(--mono); font-size:48px; color:var(--gold); margin:8px 0; line-height:1; font-weight:200;">${entries.length}</div>
          <div style="font-size:11px; color:var(--text-muted);">Days logged</div>
        </div>
        <div class="card" style="flex:1; min-width:160px; display:flex; flex-direction:column; align-items:center; padding:20px;">
          <div class="section-label" style="margin-top:0;">Current Streak</div>
          <div style="font-size:36px; margin:8px 0; line-height:1;">${moodStreak > 0 ? '🔥' : '—'}</div>
          <div style="font-family:var(--mono); font-size:13px; color:${moodStreak>0?'var(--gold-text)':'var(--text-muted)'}; margin-top:4px;">${moodStreak > 0 ? `${moodStreak} day${moodStreak!==1?'s':''}` : 'No streak'}</div>
        </div>
      </div>

      <!-- Reset countdown -->
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-bottom:16px;text-align:right">
        Resets at 8am — in <span id="mood-countdown" style="color:var(--gold-text)">--:--:--</span>
      </div>
      <!-- Log today -->
      <div class="card" style="margin-bottom:24px; padding:24px;">
        <div class="section-label" style="margin-top:0; margin-bottom:16px;">Log — ${todayKey === new Date().toISOString().slice(0,10) ? 'Today' : 'Yesterday (before 8am)'}</div>
        <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-bottom:16px;">
          ${EMOJIS.map((e, i) => {
            const score = i + 1;
            const active = todayScore === score;
            return `<button class="mood-btn" data-score="${score}" title="${LABELS[i]}" style="
              font-size:40px; padding:12px 16px; border:2px solid ${active ? COLORS[i] : 'var(--border)'};
              background:${active ? 'var(--bg-3)' : 'transparent'}; cursor:pointer;
              transition:all 0.12s; position:relative;">
              ${e}
              ${active ? `<div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:9px;color:${COLORS[i]};white-space:nowrap;letter-spacing:.05em;text-transform:uppercase;">${LABELS[i]}</div>` : ''}
            </button>`;
          }).join('')}
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <input class="input" id="mood-note" placeholder="Optional note for today…" style="flex:1;" value="${todayEntry?.note || ''}" />
          <button class="btn btn-gold" id="mood-save">Save</button>
        </div>
      </div>

      <!-- History grid with click-to-edit -->
      <div class="section-label" style="margin-bottom:12px;">History — click any day to edit</div>
      <div style="display:flex; flex-wrap:wrap; gap:10px;" id="mood-history"></div>
    `;

    let selectedScore = todayScore;

    // Countdown ticker — in render scope so it runs once
    const fmtMoodCountdown = () => {
      // Count to next 8am (the actual reset time)
      const next8 = new Date();
      if (next8.getHours() >= 8) next8.setDate(next8.getDate() + 1);
      next8.setHours(8, 0, 0, 0);
      const diff = next8 - Date.now();
      const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    const moodCountEl = container.querySelector('#mood-countdown');
    if (moodCountEl) {
      moodCountEl.textContent = fmtMoodCountdown();
      const moodTicker = setInterval(() => {
        if (moodCountEl && document.contains(moodCountEl)) moodCountEl.textContent = fmtMoodCountdown();
        else clearInterval(moodTicker);
      }, 1000);
    }

    // Emoji button selection
    const updateButtons = () => {
    container.querySelectorAll('.mood-btn').forEach(btn => {
        const s = +btn.dataset.score;
        const active = selectedScore === s;
        btn.style.borderColor = active ? COLORS[s-1] : 'var(--border)';
        btn.style.background = active ? 'var(--bg-3)' : 'transparent';
        btn.innerHTML = EMOJIS[s-1] + (active
          ? `<div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:9px;color:${COLORS[s-1]};white-space:nowrap;letter-spacing:.05em;text-transform:uppercase;">${LABELS[s-1]}</div>`
          : '');
      });
    };

    container.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedScore = +btn.dataset.score;
        updateButtons();
      });
    });

    container.querySelector('#mood-save').addEventListener('click', async () => {
      if (!selectedScore) { App.toast('Pick a mood first', 'error'); return; }
      const note = container.querySelector('#mood-note').value.trim();
      moods[todayKey] = { score: selectedScore, note, time: new Date().toISOString() };
      await window.api.setData('moods', moods);
      App.toast(`${EMOJIS[selectedScore-1]} Mood logged`, 'success');
      this.render(container);
    });

    // History — clickable cards open edit modal
    const historyEl = container.querySelector('#mood-history');
    if (entries.length === 0) {
      historyEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">No entries yet — log your first mood above.</div>`;
    } else {
      historyEl.innerHTML = entries.slice(0, 60).map(([date, val]) => {
        const score = typeof val === 'object' ? val.score : val;
        const note  = typeof val === 'object' ? val.note  : '';
        const label = LABELS[score - 1] || '?';
        const emoji = EMOJIS[score - 1] || '?';
        const color = COLORS[score - 1] || 'var(--text-muted)';
        const isToday = date === todayKey;
        const dateLabel = (() => {
          const d = new Date(date + 'T12:00:00'); // noon to avoid TZ edge
          return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
        })();
        return `
          <div class="mood-history-card" data-date="${date}" title="${note || label}" style="
            display:flex; flex-direction:column; align-items:center; padding:12px 10px;
            background:var(--bg-2); border:1px solid ${isToday ? color : 'var(--border)'};
            cursor:pointer; transition:border-color 0.12s, background 0.12s; min-width:72px;">
            <div style="font-size:28px; margin-bottom:6px;">${emoji}</div>
            <div style="font-family:var(--mono); font-size:9px; color:var(--text-muted); text-align:center; line-height:1.4;">${dateLabel}</div>
            ${isToday ? `<div style="font-size:8px;color:${color};letter-spacing:.08em;text-transform:uppercase;margin-top:3px;">today</div>` : ''}
          </div>`;
      }).join('');

      historyEl.querySelectorAll('.mood-history-card').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.borderColor = COLORS[(typeof moods[card.dataset.date] === 'object' ? moods[card.dataset.date].score : moods[card.dataset.date]) - 1] || 'var(--border-2)'; });
        card.addEventListener('mouseleave', () => {
          const d = card.dataset.date;
          card.style.borderColor = d === todayKey
            ? COLORS[(typeof moods[d] === 'object' ? moods[d].score : moods[d]) - 1]
            : 'var(--border)';
        });
        card.addEventListener('click', () => this.openEditModal(card.dataset.date, moods, container, EMOJIS, LABELS, COLORS));
      });
    }
  },

  openEditModal(date, moods, container, EMOJIS, LABELS, COLORS) {
    const entry = moods[date];
    const score = typeof entry === 'object' ? entry?.score : entry;
    const note  = typeof entry === 'object' ? entry?.note  : '';
    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

    App.openModal(`Edit Mood — ${dateLabel}`, `
      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:16px; flex-wrap:wrap;">
        ${EMOJIS.map((e, i) => {
          const s = i + 1;
          const active = score === s;
          return `<button class="mood-edit-btn" data-score="${s}" style="
            font-size:36px; padding:10px 14px; border:2px solid ${active ? COLORS[i] : 'var(--border)'};
            background:${active ? 'var(--bg-3)' : 'transparent'}; cursor:pointer; transition:all 0.1s;">
            ${e}</button>`;
        }).join('')}
      </div>
      <div class="form-row" style="margin-bottom:10px">
        <label class="form-label">Date</label>
        <input class="input" id="edit-mood-date" type="date" value="${date}" style="width:100%" />
      </div>
      <input class="input" id="edit-mood-note" placeholder="Note (optional)…" value="${note || ''}" style="width:100%; margin-bottom:14px;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-gold" id="edit-mood-save" style="flex:1;">Save</button>
        <button class="btn" id="edit-mood-delete" style="color:var(--red);">Delete entry</button>
      </div>
    `);

    let editScore = score || null;
    const updateEditBtns = () => {
      document.querySelectorAll('.mood-edit-btn').forEach(btn => {
        const s = +btn.dataset.score;
        btn.style.borderColor = editScore === s ? COLORS[s-1] : 'var(--border)';
        btn.style.background  = editScore === s ? 'var(--bg-3)' : 'transparent';
      });
    };
    document.querySelectorAll('.mood-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => { editScore = +btn.dataset.score; updateEditBtns(); });
    });

    document.getElementById('edit-mood-save').addEventListener('click', async () => {
      if (!editScore) { App.toast('Pick a mood', 'error'); return; }
      const newNote = document.getElementById('edit-mood-note').value.trim();
      const newDate = document.getElementById('edit-mood-date').value || date;
      if (newDate !== date) delete moods[date];
      moods[newDate] = { score: editScore, note: newNote, time: moods[date]?.time || new Date().toISOString() };
      await window.api.setData('moods', moods);
      App.closeModal();
      App.toast('Mood updated', 'success');
      this.render(container);
    });

    document.getElementById('edit-mood-delete').addEventListener('click', async () => {
      delete moods[date];
      await window.api.setData('moods', moods);
      App.closeModal();
      App.toast('Entry deleted');
      this.render(container);
    });
  }
};
