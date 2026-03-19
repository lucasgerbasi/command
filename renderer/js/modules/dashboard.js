Modules.dashboard = {

  // config format: [ { key, span } ]  span = "2x1" etc, default "1x1"
  // All available panel definitions — every module represented
  PANEL_DEFS: {
    tasks: {
      label: 'Tasks', icon: '✓', nav: 'tasks',
      async load() { return window.api.getData('tasks'); },
      render(data, span) {
        const PDOT = { high:'#ef4444', medium:'#eab308', low:'#3b82f6', '':null };
        const active = data.filter(t => !t.done)
          .sort((a,b) => ({ high:0,medium:1,low:2,'':3 }[a.priority||''] - { high:0,medium:1,low:2,'':3 }[b.priority||'']));
        const limit = span?.includes('x2') ? 10 : 5;
        return {
          body: active.length === 0
            ? `<div class="dash-empty-msg">All clear ✓</div>`
            : active.slice(0, limit).map(t => {
                const dot = PDOT[t.priority||''];
                return `<div class="dash-row dash-interactive" data-action="check-task" data-id="${t.id}" style="cursor:pointer;border-left:3px solid ${dot||'transparent'}" title="Click to complete">
                  ${dot ? `<span style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0"></span>` : `<div class="dash-dot"></div>`}
                  <span class="dash-row-text">${t.text}</span>
                  <span class="dash-row-meta" style="opacity:.3">✓</span>
                </div>`;
              }).join(''),
          stat: `${active.length} active · ${data.filter(t=>t.done).length} done`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="check-task"]');
            if (!row) return false;
            const tasks = await window.api.getData('tasks').catch(()=>[]);
            const t = tasks.find(t => String(t.id) === row.dataset.id);
            if (t) { t.done = true; await window.api.setData('tasks', tasks); App.toast(`✓ Done: ${t.text}`, 'success'); return true; }
            return false;
          }
        };
      }
    },
    notes: {
      label: 'Notes', icon: '✎', nav: 'notes',
      async load() { return window.api.getData('notes'); },
      render(data, span) {
        const big = span === '2x2' || span === '3x2' || span === '4x2' || span === '1x2';
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No notes written</div>`
            : big
              ? data.slice(0, 4).map(n => `
                  <div class="dash-row dash-interactive" data-action="open-note" data-id="${n.id}" style="cursor:pointer" title="${n.title}">
                    <div class="dash-dot"></div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.title || 'Untitled'}</div>
                      <div style="font-size:11px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.truncate(n.body || '', 70)}</div>
                    </div>
                    <span class="dash-row-meta">${Utils.timeAgo(n.updatedAt)}</span>
                  </div>`).join('')
              : `<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">${data[0].title || 'Untitled'}</div>
                 <div style="font-size:12px;color:var(--text-dim);font-family:var(--mono);line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${data[0].body || ''}</div>`,
          stat: `${data.length} notes total`
        };
      }
    },
    calendar: {
      label: 'Calendar', icon: '▦', nav: 'calendar',
      async load() { return window.api.getData('calendar'); },
      render(data, span) {
        const todayStr = new Date().toDateString();
        const todayEvts = data.filter(e => e.date === todayStr);
        const future = data.filter(e => new Date(e.date) > new Date() || e.date === todayStr)
          .sort((a,b) => new Date(a.date) - new Date(b.date));
        const next = future.find(e => e.date !== todayStr);
        const nextLabel = next ? (() => {
          const d = new Date(next.date);
          const diff = Math.round((d - new Date(todayStr)) / 86400000);
          const when = diff === 1 ? 'Tomorrow' : diff <= 6
            ? d.toLocaleDateString('en-US', { weekday:'long' })
            : d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
          return `${when}: ${next.title}`;
        })() : null;
        const big = span === '2x2' || span === '3x2' || span === '4x2' || span === '1x2';
        const limit = big ? 8 : 4;
        return {
          body: (todayEvts.length === 0 ? `<div class="dash-empty-msg">No events today</div>` :
            todayEvts.slice(0, limit).map(e => `<div class="dash-row"><div class="dash-dot"></div><span class="dash-row-text">${e.title}</span></div>`).join('')) +
            (nextLabel ? `<div class="dash-row" style="margin-top:4px;opacity:.6"><div class="dash-dot" style="background:var(--gold-dim)"></div><span class="dash-row-text" style="font-size:11px">${nextLabel}</span></div>` : ''),
          stat: todayEvts.length ? `${todayEvts.length} event${todayEvts.length!==1?'s':''} today` : nextLabel ? 'Nothing today' : 'No upcoming events'
        };
      }
    },
    reminders: {
      label: 'Reminders', icon: '◎', nav: 'reminders',
      async load() { return window.api.getData('reminders'); },
      render(data, span) {
        const upcoming = data.filter(r => !r.fired && r.time && new Date(r.time) > new Date())
          .sort((a,b) => new Date(a.time) - new Date(b.time));
        const limit = span?.includes('x2') ? 8 : 4;
        return {
          body: upcoming.length === 0
            ? `<div class="dash-empty-msg">No upcoming reminders</div>`
            : upcoming.slice(0, limit).map(r => {
                const diff = new Date(r.time) - Date.now();
                const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
                const when = d>0 ? `in ${d}d` : h>0 ? `in ${h}h` : `in ${m}m`;
                return `<div class="dash-row">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text">${r.text}</span>
                  <span class="dash-row-meta">${when}</span>
                </div>`;
              }).join(''),
          stat: `${upcoming.length} upcoming`
        };
      }
    },
    habits: {
      label: 'Habits', icon: '↻', nav: 'habits',
      async load() { return window.api.getData('habits'); },
      render(data, span) {
        const PDOT = { high:'#ef4444', medium:'#eab308', low:'#3b82f6', '':null };
        // 8am-aware today — matches the habits module reset logic
        const _dn = new Date(); if (_dn.getHours() < 8) _dn.setDate(_dn.getDate() - 1);
        const today = _dn.toDateString();
        const todayDone = data.filter(h => h.doneDate === today).length;
        const limit = span?.includes('x2') ? 10 : 5;
        const sorted = [...data].sort((a,b) => ({high:0,medium:1,low:2,'':3}[a.priority||''] - {high:0,medium:1,low:2,'':3}[b.priority||'']));
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No habits tracked</div>`
            : sorted.slice(0, limit).map((h) => {
                const done = h.doneDate === today;
                const idx = data.indexOf(h);
                const dot = PDOT[h.priority||''];
                return `<div class="dash-row dash-interactive" data-action="toggle-habit" data-idx="${idx}" style="cursor:pointer;border-left:3px solid ${dot||'transparent'}" title="Click to toggle">
                  ${dot ? `<span style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0;opacity:${done ? 0.4 : 1}"></span>` : `<div class="dash-dot" style="${done?'background:var(--gold)':''}"></div>`}
                  <span class="dash-row-text" style="${done ? 'text-decoration:line-through;opacity:.45' : ''}">${h.name}</span>
                  <span class="dash-row-meta" style="opacity:.5">${done ? '✓' : '○'}</span>
                </div>`;
              }).join(''),
          stat: `${todayDone}/${data.length} done today`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="toggle-habit"]');
            if (!row) return false;
            const habits = await window.api.getData('habits').catch(()=>[]);
            const _dn2 = new Date(); if (_dn2.getHours() < 8) _dn2.setDate(_dn2.getDate() - 1);
            const today2 = _dn2.toDateString();
            const h = habits[+row.dataset.idx];
            if (h) {
              h.doneDate = h.doneDate === today2 ? null : today2;
              await window.api.setData('habits', habits);
              return true;
            }
            return false;
          }
        };
      }
    },
    clipboard: {
      label: 'Clipboard', icon: '⎘', nav: 'clipboard',
      async load() { return window.api.getData('clipboard'); },
      render(data, span) {
        const limit = span?.includes('x2') ? 8 : 4;
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">Nothing copied yet</div>`
            : data.slice(0, limit).map(c => `
                <div class="dash-row dash-interactive" data-action="copy-clip" data-text="${encodeURIComponent(c.text)}" style="cursor:pointer" title="Click to copy">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text" style="font-family:var(--mono);font-size:11px">${Utils.truncate(c.text, 60)}</span>
                  <span class="dash-row-meta" style="opacity:.4">⎘</span>
                </div>`).join(''),
          stat: `${data.length}/50 tracked`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="copy-clip"]');
            if (!row) return false;
            await window.api.writeClipboard(decodeURIComponent(row.dataset.text));
            App.toast('⎘ Copied', 'success');
            return false; // don't re-render
          }
        };
      }
    },
    bookmarks: {
      label: 'Bookmarks', icon: '◉', nav: 'bookmarks',
      async load() { return window.api.getData('bookmarks'); },
      render(data, span) {
        const big = span === '2x1' || span === '3x1' || span === '4x1' || span?.includes('x2');
        const limit = big ? 20 : 8;
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No bookmarks</div>`
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
                ${data.slice(0, limit).map(b => `
                  <div class="bm-quick" data-type="${b.type}" data-url="${b.url || ''}" data-path="${b.path || ''}">
                    <span>${b.icon || '📎'}</span><span>${b.name}</span>
                  </div>`).join('')}
               </div>`,
          stat: null
        };
      }
    },
    weather: {
      label: 'Weather', icon: '◌', nav: 'weather',
      async load() { return window.api.getData('weather-config'); },
      render(data) {
        return {
          body: !data?.city
            ? `<div class="dash-empty-msg">Weather not configured</div>`
            : `<div style="font-size:22px;color:var(--text);margin-bottom:4px">${data.city}</div>
               <div style="font-size:12px;color:var(--text-dim)">Click to view forecast</div>`,
          stat: `Sky & conditions`
        };
      }
    },
    files: {
      label: 'Folders', icon: '◫', nav: 'files',
      async load() { return window.api.getData('recent-folders'); },
      render(data, span) {
        const limit = span?.includes('x2') ? 10 : 5;
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No folders opened yet</div>`
            : data.slice(0, limit).map(f => `
                <div class="dash-row dash-interactive" data-action="open-folder" data-path="${encodeURIComponent(f.path)}" style="cursor:pointer" title="${f.path}">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text">${f.name}</span>
                  <span class="dash-row-meta">${Utils.timeAgo(f.lastOpened)}</span>
                </div>`).join(''),
          stat: `From OS activity`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="open-folder"]');
            if (!row) return false;
            window.api.openPath(decodeURIComponent(row.dataset.path));
            return false;
          }
        };
      }
    },
    launcher: {
      label: 'Launcher', icon: '⚡', nav: 'launcher',
      async load() { return window.api.getData('launcher'); },
      render(data, span) {
        const limit = span?.includes('x2') ? 10 : 5;
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No aliases set</div>`
            : data.slice(0, limit).map(a => `
                <div class="dash-row dash-interactive" data-action="open-alias" data-url="${a.url||''}" data-path="${a.path||''}" data-type="${a.type||'web'}" style="cursor:pointer" title="${a.url||a.path||''}" >
                  <span style="font-family:var(--mono);font-size:11px;color:var(--gold);min-width:48px">${a.alias}</span>
                  <span class="dash-row-text">${a.name}</span>
                  <span class="dash-row-meta" style="opacity:.4">${a.type==='app'?'APP':'→'}</span>
                </div>`).join(''),
          stat: `${data.length} aliases`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="open-alias"]');
            if (!row) return false;
            if (row.dataset.type === 'app' && row.dataset.path) window.api.openPath(row.dataset.path);
            else if (row.dataset.url) window.api.openURL(row.dataset.url);
            App.toast('Opening…');
            return false;
          }
        };
      }
    },
    templates: {
      label: 'Templates', icon: '⊟', nav: 'templates',
      async load() { return window.api.getData('templates'); },
      render(data, span) {
        const limit = span?.includes('x2') ? 8 : 4;
        return {
          body: data.length === 0
            ? `<div class="dash-empty-msg">No templates</div>`
            : data.slice(0, limit).map(t => `
                <div class="dash-row dash-interactive" data-action="copy-tmpl" data-text="${encodeURIComponent(t.body || '')}" style="cursor:pointer" title="Click to copy">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text">${t.title || 'Untitled'}</span>
                  <span class="dash-row-meta" style="opacity:.4">⎘</span>
                </div>`).join(''),
          stat: `${data.length} templates`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="copy-tmpl"]');
            if (!row) return false;
            await window.api.writeClipboard(decodeURIComponent(row.dataset.text));
            App.toast('Template copied', 'success');
            return false;
          }
        };
      }
    },
    moods: {
      label: 'Mood', icon: '🙂', nav: 'moods',
      async load() { return window.api.getData('moods'); },
      render(data) {
        const EMOJIS = ['😢','😕','😐','🙂','😁'];
        const LABELS = ['Awful','Bad','Okay','Good','Great'];
        const todayKey = Utils.moodDate();
        const entry = data[todayKey];
        const score = typeof entry === 'object' ? entry?.score : entry;
        const note  = typeof entry === 'object' ? entry?.note  : '';
        const entries = Object.entries(data);
        const recentScores = entries.slice(-7).map(([,v]) => typeof v==='object'?v.score:v).filter(Number.isFinite);
        const avg = recentScores.length ? Math.round(recentScores.reduce((a,b)=>a+b)/recentScores.length) : null;
        return {
          body: `
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
              <div style="font-size:42px;line-height:1">${score != null ? EMOJIS[score-1] : '—'}</div>
              <div>
                <div style="font-size:13px;font-weight:600">${score != null ? LABELS[score-1] : 'Not logged today'}</div>
                ${note ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;font-style:italic">"${note}"</div>` : ''}
                ${avg != null ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px">7-day avg: ${EMOJIS[avg-1]} ${LABELS[avg-1]}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:8px">
              ${EMOJIS.map((e,i) => `<button class="dash-interactive" data-action="log-mood" data-score="${i+1}" style="font-size:20px;background:${score===i+1?'var(--gold-glow)':'transparent'};border:1px solid ${score===i+1?'var(--gold-line)':'transparent'};padding:4px 6px;cursor:pointer;transition:all .1s" title="${LABELS[i]}">${e}</button>`).join('')}
            </div>`,
          stat: `${entries.length} days logged`,
          onInteract: async (e) => {
            const btn = e.target.closest('[data-action="log-mood"]');
            if (!btn) return false;
            const moods = await window.api.getData('moods').catch(()=>({}));
            const key = Utils.moodDate();
            moods[key] = { score: +btn.dataset.score, note: moods[key]?.note || '', time: new Date().toISOString() };
            await window.api.setData('moods', moods);
            App.toast(`${EMOJIS[+btn.dataset.score-1]} Mood logged`, 'success');
            return true;
          }
        };
      }
    },
    pomodoro: {
      label: 'Pomodoro', icon: '🍅', nav: 'pomodoro',
      async load() { return window.api.getData('pomo-config'); },
      render(data) {
        const pomo = Modules.pomodoro;
        const running = pomo?.isRunning;
        const tl = pomo?.timeLeft ?? (data?.work ?? 25) * 60;
        const m = String(Math.floor(tl/60)).padStart(2,'0');
        const s = String(tl%60).padStart(2,'0');
        const mode = pomo?.mode || 'work';
        const workMins  = data?.work  || 25;
        const breakMins = data?.break || 5;
        return {
          body: `
            <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px">
              <button class="dash-interactive btn ${mode==='work'?'btn-gold':''}" data-action="pomo-work" style="font-size:10px;padding:3px 12px">Work ${workMins}m</button>
              <button class="dash-interactive btn ${mode==='break'?'btn-gold':''}" data-action="pomo-break" style="font-size:10px;padding:3px 12px">Break ${breakMins}m</button>
            </div>
            <div style="font-family:var(--mono);font-size:48px;font-weight:200;color:var(--text);text-align:center;margin:0 0 10px">${m}:${s}</div>
            <div style="display:flex;gap:8px;justify-content:center">
              <button class="btn btn-gold dash-interactive" data-action="pomo-toggle" style="min-width:80px">${running ? 'Pause' : 'Start'}</button>
              <button class="btn dash-interactive" data-action="pomo-reset">Reset</button>
            </div>`,
          stat: `${mode === 'work' ? 'Focus' : 'Break'} · ${workMins}m / ${breakMins}m`,
          onInteract: async (e) => {
            if (e.target.closest('[data-action="pomo-toggle"]')) { Modules.pomodoro.toggle?.(); return true; }
            if (e.target.closest('[data-action="pomo-reset"]'))  { Modules.pomodoro.setMode?.(Modules.pomodoro.mode); return true; }
            if (e.target.closest('[data-action="pomo-work"]'))   { Modules.pomodoro.setMode?.('work'); return true; }
            if (e.target.closest('[data-action="pomo-break"]'))  { Modules.pomodoro.setMode?.('break'); return true; }
            return false;
          }
        };
      }
    },
    timers: {
      label: 'Timers', icon: '⏱', nav: 'timers',
      _view: 'stopwatch', // 'stopwatch' | 'countdown'
      async load() { return {}; },
      render(data, span) {
        const t = Modules.timers;
        const swRunning = !!t?.stopwatchTimer;
        const swTime = t?.stopwatchTime || 0;
        const cdTime = t?.countdownTime || 0;
        const cdRunning = !!t?.countdownTimer;
        const fmtSW = ms => new Date(ms).toISOString().slice(11,19);
        const fmtCD = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
        // Auto-switch to countdown view if it's active
        const view = cdRunning ? 'countdown' : (this._view || 'stopwatch');
        return {
          body: `
            <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px">
              <button class="dash-interactive btn ${view==='stopwatch'?'btn-gold':''}" data-action="timer-view-sw" style="font-size:10px;padding:3px 12px">Stopwatch</button>
              <button class="dash-interactive btn ${view==='countdown'?'btn-gold':''}" data-action="timer-view-cd" style="font-size:10px;padding:3px 12px">Countdown</button>
            </div>
            ${view === 'stopwatch' ? `
              <div style="font-family:var(--mono);font-size:36px;font-weight:200;color:var(--text);text-align:center;margin-bottom:10px">${fmtSW(swTime)}</div>
              <div style="display:flex;gap:8px;justify-content:center">
                <button class="dash-interactive btn ${swRunning?'btn-gold':''}" data-action="sw-toggle" style="font-size:11px">${swRunning ? 'Stop' : 'Start'}</button>
                <button class="dash-interactive btn" data-action="sw-reset" style="font-size:11px">Reset</button>
              </div>` : `
              <div style="font-family:var(--mono);font-size:36px;font-weight:200;color:var(--text);text-align:center;margin-bottom:10px">${fmtCD(cdTime)}</div>
              <div style="display:flex;gap:8px;justify-content:center">
                ${cdRunning || cdTime > 0
                  ? `<button class="dash-interactive btn ${cdRunning?'btn-gold':''}" data-action="cd-toggle" style="font-size:11px">${cdRunning?'Pause':'Resume'}</button>`
                  : `<span style="font-size:11px;color:var(--text-muted)">Start a countdown in the Timers module</span>`}
              </div>`}`,
          stat: swRunning ? 'Stopwatch running' : cdRunning ? 'Countdown running' : 'Idle',
          onInteract: async (e) => {
            if (e.target.closest('[data-action="timer-view-sw"]')) { this._view = 'stopwatch'; return true; }
            if (e.target.closest('[data-action="timer-view-cd"]')) { this._view = 'countdown'; return true; }
            if (e.target.closest('[data-action="sw-toggle"]')) {
              const t = Modules.timers;
              if (t.stopwatchTimer) { clearInterval(t.stopwatchTimer); t.stopwatchTimer = null; }
              else { const start = Date.now() - t.stopwatchTime; t.stopwatchTimer = setInterval(() => t.stopwatchTime = Date.now()-start, 100); }
              return true;
            }
            if (e.target.closest('[data-action="sw-reset"]')) {
              const t = Modules.timers;
              clearInterval(t.stopwatchTimer); t.stopwatchTimer = null; t.stopwatchTime = 0;
              return true;
            }
            if (e.target.closest('[data-action="cd-toggle"]')) {
              const t = Modules.timers;
              if (t.countdownTimer) { clearInterval(t.countdownTimer); t.countdownTimer = null; }
              return true;
            }
            return false;
          }
        };
      }
    },
    sysmon: {
      label: 'System', icon: '⊡', nav: 'sysmon',
      async load() { return window.api.getSysInfo().catch(()=>({})); },
      render(data) {
        const ramPct = data.ramTotal ? Math.round(data.ramUsed/data.ramTotal*100) : 0;
        const ramGB = data.ramUsed ? (data.ramUsed/1e9).toFixed(1) : '?';
        const totalGB = data.ramTotal ? (data.ramTotal/1e9).toFixed(0) : '?';
        const up = data.uptime ? (() => { const h=Math.floor(data.uptime/3600),m=Math.floor((data.uptime%3600)/60); return `${h}h ${m}m`; })() : '?';
        return {
          body: `
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)">CPU</div>
                <div style="font-family:var(--mono);font-size:28px;font-weight:200;color:var(--text)">${data.cpu ?? '?'}%</div></div>
              <div><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)">RAM</div>
                <div style="font-family:var(--mono);font-size:28px;font-weight:200;color:var(--text)">${ramPct}%</div>
                <div style="font-size:10px;color:var(--text-muted);font-family:var(--mono)">${ramGB}/${totalGB}GB</div></div>
              <div><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)">Uptime</div>
                <div style="font-family:var(--mono);font-size:20px;font-weight:200;color:var(--text);margin-top:4px">${up}</div></div>
            </div>`,
          stat: data.cpuModel ? Utils.truncate(data.cpuModel, 40) : 'System info'
        };
      }
    },
    clocks: {
      label: 'World Clocks', icon: '◷', nav: 'clocks',
      async load() { return window.api.getData('clocks-config'); },
      render(data) {
        const local = new Date();
        const localStr = local.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const zones = Array.isArray(data) && data.length ? data : [];
        return {
          body: `
            <div class="dash-row"><div class="dash-dot" style="background:var(--gold)"></div>
              <span class="dash-row-text" style="font-weight:600">Local</span>
              <span class="dash-row-meta" style="font-family:var(--mono);font-size:13px">${localStr}</span>
            </div>
            ${zones.slice(0, 4).map(z => {
              const t = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone: z.tz || z });
              return `<div class="dash-row"><div class="dash-dot"></div>
                <span class="dash-row-text">${z.label || z.tz || z}</span>
                <span class="dash-row-meta" style="font-family:var(--mono);font-size:13px">${t}</span>
              </div>`;
            }).join('')}`,
          stat: zones.length ? `${zones.length} zones configured` : 'Add clocks in World Clocks'
        };
      }
    },
    random: {
      label: 'Random', icon: '⚄', nav: 'random',
      async load() { return {}; },
      render() {
        return {
          body: `
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${[4,6,8,10,12,20].map(n => `<button class="dash-interactive btn" data-action="roll" data-sides="${n}" style="font-size:11px;padding:5px 10px">d${n}</button>`).join('')}
            </div>
            <div id="dash-dice-result" style="font-family:var(--mono);font-size:36px;font-weight:200;color:var(--gold);margin-top:12px;min-height:44px;text-align:center"></div>`,
          stat: 'Click a die to roll',
          onInteract: async (e, panelEl) => {
            const btn = e.target.closest('[data-action="roll"]');
            if (!btn) return false;
            const sides = +btn.dataset.sides;
            const result = Math.floor(Math.random() * sides) + 1;
            const el = panelEl.querySelector('#dash-dice-result');
            if (el) { el.textContent = `d${sides}: ${result}`; el.classList.add('spin-in'); setTimeout(()=>el.classList.remove('spin-in'),300); }
            return false;
          }
        };
      }
    },
    converter: {
      label: 'Converter', icon: '⚖', nav: 'converter',
      async load() { return {}; },
      render() {
        return {
          body: `
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input class="input dash-interactive" id="dash-conv-val" type="number" value="1" style="width:70px;padding:6px 8px" data-action="convert" />
              <select class="input dash-interactive" id="dash-conv-from" data-action="convert" style="padding:6px 8px">
                <option value="km">km</option><option value="m">m</option><option value="mi" selected>mi</option><option value="ft">ft</option>
                <option value="kg" >kg</option><option value="lb">lb</option><option value="°C">°C</option><option value="°F">°F</option>
              </select>
              <span style="color:var(--text-muted)">→</span>
              <select class="input dash-interactive" id="dash-conv-to" data-action="convert" style="padding:6px 8px">
                <option value="km" selected>km</option><option value="m">m</option><option value="mi">mi</option><option value="ft">ft</option>
                <option value="kg">kg</option><option value="lb" >lb</option><option value="°C">°C</option><option value="°F">°F</option>
              </select>
            </div>
            <div id="dash-conv-result" style="font-family:var(--mono);font-size:28px;font-weight:200;color:var(--gold);margin-top:10px">—</div>`,
          stat: 'Quick unit converter',
          onInteract: async (e, panelEl) => {
            const val = parseFloat(panelEl.querySelector('#dash-conv-val')?.value) || 0;
            const from = panelEl.querySelector('#dash-conv-from')?.value;
            const to = panelEl.querySelector('#dash-conv-to')?.value;
            const toBase = { km:1000,m:1,mi:1609.344,ft:0.3048,kg:1,lb:0.453592,'°C':1,'°F':1 };
            let result;
            if (from === '°C' && to === '°F') result = val*9/5+32;
            else if (from === '°F' && to === '°C') result = (val-32)*5/9;
            else if (toBase[from] && toBase[to] && (from[0]===to[0] || (toBase[from]<2&&toBase[to]<2))) result = val*toBase[from]/toBase[to];
            else result = null;
            const el = panelEl.querySelector('#dash-conv-result');
            if (el) el.textContent = result != null ? `${parseFloat(result.toFixed(6))} ${to}` : '—';
            return false;
          }
        };
      }
    },
    calculator: {
      label: 'Calculator', icon: '🧮', nav: 'calculator',
      async load() { return {}; },
      render() {
        return {
          body: `
            <input class="input dash-interactive" id="dash-calc-input" placeholder="e.g. (150*12)/4.5" data-action="calc" style="font-family:var(--mono);font-size:15px;padding:10px 14px;width:100%" autocomplete="off" />
            <div id="dash-calc-result" style="font-family:var(--mono);font-size:32px;font-weight:200;color:var(--gold);margin-top:10px;min-height:40px"></div>`,
          stat: 'Type expression + Enter',
          onInteract: async (e, panelEl) => {
            if (e.type === 'keydown' && e.key === 'Enter') {
              const inp = panelEl.querySelector('#dash-calc-input');
              if (!inp) return false;
              const res = await window.api.calcEval(inp.value.trim()).catch(()=>({error:'err'}));
              const el = panelEl.querySelector('#dash-calc-result');
              if (el) {
                if (res.error) { el.style.color='var(--red)'; el.textContent=res.error; setTimeout(()=>el.style.color='var(--gold)',800); }
                else {
                  const d = Number.isInteger(res.result) ? res.result : parseFloat(res.result.toFixed(8));
                  el.style.color='var(--gold)'; el.textContent=`= ${d}`;
                  await window.api.writeClipboard(String(d));
                }
              }
              return false;
            }
            return false;
          },
          extraEvents: ['keydown']
        };
      }
    },
    sync: {
      label: 'Sync', icon: '⇄', nav: 'sync',
      async load() { return {}; },
      render() {
        return {
          body: `
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-gold dash-interactive" data-action="sync-export" style="flex:1">Export…</button>
              <button class="btn dash-interactive" data-action="sync-import" style="flex:1">Import…</button>
            </div>
            <div id="dash-sync-status" style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-top:10px"></div>`,
          stat: 'Transfer data between machines',
          onInteract: async (e, panelEl) => {
            const statusEl = panelEl.querySelector('#dash-sync-status');
            if (e.target.closest('[data-action="sync-export"]')) {
              const p = await window.api.syncDialog('save');
              if (!p) return false;
              const r = await window.api.syncExport(p);
              if (statusEl) statusEl.textContent = r.ok ? `✓ Exported to ${p.split(/[\\/]/).pop()}` : `✗ ${r.error}`;
              App.toast(r.ok ? 'Exported' : 'Export failed', r.ok ? 'success' : 'error');
              return false;
            }
            if (e.target.closest('[data-action="sync-import"]')) {
              const p = await window.api.syncDialog('open');
              if (!p) return false;
              const r = await window.api.syncImport(p, 'merge');
              if (statusEl) statusEl.textContent = r.ok ? `✓ Imported ${r.imported} types` : `✗ ${r.error}`;
              App.toast(r.ok ? 'Imported' : 'Import failed', r.ok ? 'success' : 'error');
              return false;
            }
            return false;
          }
        };
      }
    },
    library: {
      label: 'Library', icon: '📚', nav: 'library',
      async load() { return window.api.getData('library').catch(()=>({watch:[],read:[],play:[]})); },
      render(data, span) {
        const active = [
          ...(data.watch||[]).filter(e=>e.status==='watching').map(e=>({...e,_type:'watch',_icon:'🎬',_unit:'Ep'})),
          ...(data.read ||[]).filter(e=>e.status==='watching').map(e=>({...e,_type:'read', _icon:'📖',_unit:'Ch'})),
          ...(data.play ||[]).filter(e=>e.status==='watching').map(e=>({...e,_type:'play', _icon:'🎮',_unit:'Hr'})),
        ];
        const limit = span?.includes('x2') ? 8 : 4;
        const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return {
          body: active.length === 0
            ? `<div class="dash-empty-msg">Nothing active in Library</div>`
            : active.slice(0, limit).map(e => `
                <div class="lib-active-item">
                  <span style="font-size:12px;flex-shrink:0">${e._icon}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.title)}</div>
                    <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted)">${e._unit} ${e.progress||0}${e.stars?'  '+'★'.repeat(e.stars):''}</div>
                  </div>
                  <button class="lib-progress-bump" data-action="lib-bump" data-tab="${e._type}" data-id="${e.id}" title="+1">+</button>
                </div>`).join(''),
          stat: `${active.length} active · ${(data.watch||[]).filter(e=>e.status==='completed').length} completed`,
          onInteract: async (e) => {
            const btn = e.target.closest('[data-action="lib-bump"]');
            if (!btn) return false;
            const lib = await window.api.getData('library').catch(()=>({watch:[],read:[],play:[]}));
            const entry = (lib[btn.dataset.tab]||[]).find(x => x.id === btn.dataset.id);
            if (entry) { entry.progress = (entry.progress||0)+1; await window.api.setData('library',lib); App.toast(`+1: ${entry.title}`,'success'); }
            return true;
          }
        };
      }
    },
    queue: {
      label: 'Queue', icon: '🎬', nav: 'queue',
      async load() { return window.api.getData('queue').catch(()=>[]); },
      render(data, span) {
        const waiting = (data||[]).filter(i=>!i.done);
        const limit = span?.includes('x2') ? 8 : 4;
        const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        return {
          body: waiting.length === 0
            ? `<div class="dash-empty-msg">Queue is empty</div>`
            : waiting.slice(0, limit).map(item => `
                <div class="dash-row dash-interactive" data-action="open-queue" data-url="${encodeURIComponent(item.url)}" data-id="${item.id}" style="cursor:pointer">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text">${esc(item.title||item.url)}</span>
                  <span class="dash-row-meta" style="opacity:.4">${item.type==='video'?'▶':'📄'}</span>
                </div>`).join(''),
          stat: `${waiting.length} waiting · ${(data||[]).filter(i=>i.done).length} done`,
          onInteract: async (e) => {
            const row = e.target.closest('[data-action="open-queue"]');
            if (!row) return false;
            const url = decodeURIComponent(row.dataset.url);
            const id  = row.dataset.id;
            window.api.openURL(url);
            const items = await window.api.getData('queue').catch(()=>[]);
            const item = items.find(i=>i.id===id);
            if (item) { item.done = true; await window.api.setData('queue',items); }
            return true;
          }
        };
      }
    },
  },
  _liveInterval: null,
  cleanup() {
    if (this._liveInterval) { clearInterval(this._liveInterval); this._liveInterval = null; }
  },

  async render(container) {
    let config = await window.api.getData('dashboard-config').catch(() => null);
    // Migrate old string-array format to object array
    if (!Array.isArray(config) || !config.length) {
      config = ['tasks','calendar','reminders','weather','clipboard','notes','bookmarks'].map(k => ({ key: k, span: '1x1' }));
    } else if (typeof config[0] === 'string') {
      config = config.map(k => ({ key: k, span: k === 'bookmarks' ? '2x1' : '1x1' }));
    }

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    container.innerHTML = `
      <div class="dash-greeting">
        <div class="dash-greeting-name">${greeting}</div>
        <div class="dash-greeting-sub">
          ${now.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'})}
          &nbsp;·&nbsp;<span class="dash-shortcut-hint">Ctrl+Space</span>&nbsp;to launch
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-gold" id="dash-manage-btn" style="font-size:10px">⊞ Manage Panels</button>
          <button class="btn" id="dash-edit-btn" style="font-size:10px">✎ Resize &amp; Reorder</button>
          <button class="btn" id="dash-templates-btn" style="font-size:10px">◫ Templates</button>
        </div>
      </div>
      <div class="dash-grid" id="dash-grid"></div>
    `;

    const grid = document.getElementById('dash-grid');
    this.renderGrid(grid, config);

    // Allow grid container to act as a drop zone so panels can be dragged directly into open gaps
    grid.addEventListener('dragover', e => {
      if (grid.classList.contains('edit-mode')) e.preventDefault();
    });

    // Live tick — re-renders timer/pomodoro panel bodies every second without full re-render
    if (this._liveInterval) clearInterval(this._liveInterval);
    this._liveInterval = setInterval(() => {
      const LIVE_KEYS = ['timers', 'pomodoro'];
      LIVE_KEYS.forEach(key => {
        const panelEl = grid.querySelector(`.dash-panel[data-key="${key}"]`);
        if (!panelEl) return;
        const def = this.PANEL_DEFS[key];
        if (!def) return;
        const span = panelEl.dataset.span || '1x1';
        def.load().then(data => {
          const { body, stat } = def.render(data, span);
          const bodyEl = panelEl.querySelector('.dash-panel-body');
          const statEl = panelEl.querySelector('.dash-stat');
          if (bodyEl) bodyEl.innerHTML = body;
          if (statEl && stat !== null) statEl.textContent = stat;
        }).catch(() => {});
      });
    }, 1000);

    document.getElementById('dash-manage-btn').addEventListener('click', () => {
      this.openEditModal(config);
    });

    document.getElementById('dash-templates-btn').addEventListener('click', () => {
      this.openTemplatesModal(config, grid);
    });

    document.getElementById('dash-edit-btn').addEventListener('click', () => {
      this.editMode = !this.editMode;
      document.getElementById('dash-edit-btn').classList.toggle('dash-edit-active', this.editMode);
      document.getElementById('dash-edit-btn').textContent = this.editMode ? '✓ Done' : '✎ Resize & Reorder';
      grid.classList.toggle('edit-mode', this.editMode);
      if (!this.editMode) this.saveConfig(config);
    });
  },

  async renderGrid(grid, config) {
    const loadResults = await Promise.all(
      config.map(({ key, span }) => {
        const def = this.PANEL_DEFS[key];
        if (!def) return Promise.resolve(null);
        return def.load().then(data => ({ key, span, def, data })).catch(() => ({ key, span, def, data: [] }));
      })
    );

    grid.innerHTML = '';
    loadResults.filter(Boolean).forEach(({ key, span, def, data }, idx) => {
      const { body, stat, onInteract, extraEvents } = def.render(data, span || '1x1');
      const panel = document.createElement('div');
      panel.className = 'dash-panel';
      panel.dataset.key = key;
      panel.dataset.span = span || '1x1';
      panel.dataset.nav = def.nav;
      panel.dataset.idx = idx;
      panel.innerHTML = `
        <div class="dash-panel-controls">
          <span style="font-size:9px;color:var(--text-muted);letter-spacing:.06em;margin-right:2px">SIZE</span>
          ${['1x1','2x1','3x1','1x2','2x2'].map(s => `<button class="dash-ctrl-btn ${(span||'1x1')===s?'active':''}" data-span="${s}">${s}</button>`).join('')}
          <span style="margin-left:6px;font-size:13px;cursor:grab;color:var(--text-muted);padding:0 4px" title="Drag to reorder">⠿</span>
        </div>
        <div class="dash-panel-eyebrow">
          <span class="dash-panel-eyebrow-dot">${def.icon}</span> ${def.label}
        </div>
        <div class="dash-panel-body">${body}</div>
        ${stat !== null ? `<div class="dash-stat">${stat}</div>` : ''}
      `;

      // Size buttons
      panel.querySelectorAll('.dash-ctrl-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const s = btn.dataset.span;
          config[idx].span = s;
          panel.dataset.span = s;
          panel.querySelectorAll('.dash-ctrl-btn').forEach(b => b.classList.toggle('active', b.dataset.span === s));
        });
      });

      // Interactive elements — click without navigating
      const handleInteract = async (e) => {
        if (grid.classList.contains('edit-mode')) return;
        if (e.target.closest('.dash-panel-controls')) return;
        const interactive = e.target.closest('.dash-interactive');
        if (interactive && onInteract) {
          e.stopPropagation();
          const rerender = await onInteract(e, panel);
          if (rerender) {
            // Re-render just this panel's body
            const fresh = await def.load().catch(() => data);
            const { body: newBody, stat: newStat } = def.render(fresh, config[idx].span);
            panel.querySelector('.dash-panel-body').innerHTML = newBody;
            if (newStat !== null && panel.querySelector('.dash-stat')) panel.querySelector('.dash-stat').textContent = newStat;
          }
          return;
        }
        // Non-interactive click → navigate
        if (!e.target.closest('.dash-interactive') && !e.target.closest('.dash-panel-controls')) {
          App.navigate(def.nav);
        }
      };

      panel.addEventListener('click', handleInteract);
      if (extraEvents) extraEvents.forEach(ev => panel.addEventListener(ev, handleInteract));

      // Bookmark quick-launch
      panel.querySelectorAll('.bm-quick').forEach(el =>
        el.addEventListener('click', e => {
          e.stopPropagation();
          if (grid.classList.contains('edit-mode')) return;
          if (el.dataset.type === 'web') window.api.openURL(el.dataset.url);
          else if (el.dataset.path) window.api.openPath(el.dataset.path);
        })
      );

      // Drag-to-reorder panels (only in edit mode)
      panel.setAttribute('draggable', 'true');
      panel.addEventListener('dragstart', e => {
        if (!grid.classList.contains('edit-mode')) { e.preventDefault(); return; }
        
        // CRITICAL for HTML5 Drag APIs: setData is required otherwise Chrome cancels the drag
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key); 
        
        App.setDragGhost(e, def.label); // Uses your custom stylized drag ghost label
        
        panel.classList.add('dragging');
        this._draggingPanel = panel;
      });
      
      panel.addEventListener('dragend', () => {
        panel.classList.remove('dragging');
        this._draggingPanel = null;
        
        // Save new order from DOM elements dynamically instead of indices
        const newConfig = [];
        grid.querySelectorAll('.dash-panel').forEach(p => {
          const k = p.dataset.key;
          const c = config.find(x => x.key === k);
          if (c) newConfig.push(c);
        });
        config.length = 0;
        newConfig.forEach(c => config.push(c));
        this.saveConfig(config);
      });
      
      panel.addEventListener('dragover', e => {
        // Chromium needs preventDefault here for drop to be enabled and to allow reordering
        e.preventDefault();
        
        if (!grid.classList.contains('edit-mode') || !this._draggingPanel || this._draggingPanel === panel) return;
        
        const allPanels = [...grid.querySelectorAll('.dash-panel')];
        const draggedIdx = allPanels.indexOf(this._draggingPanel);
        const targetIdx = allPanels.indexOf(panel);
        
        // Live ghost preview moving via DOM insertion
        // Since we physically shift the node, CSS Grid automatically reflows and pushes other elements
        if (draggedIdx < targetIdx) {
          panel.parentNode.insertBefore(this._draggingPanel, panel.nextSibling);
        } else {
          panel.parentNode.insertBefore(this._draggingPanel, panel);
        }
      });
      
      panel.addEventListener('drop', e => {
        e.preventDefault(); // handled by dragend instead
      });

      grid.appendChild(panel);
    });
  },

  async saveConfig(config) {
    await window.api.setData('dashboard-config', config);
  },

  async openTemplatesModal(config, grid) {
    let templates = await window.api.getData('dashboard-templates').catch(() => []) || [];

    const refresh = () => {
      const list = document.getElementById('tmpl-list');
      if (!list) return;
      if (!templates.length) {
        list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:12px 0">No saved templates yet. Save your current layout to get started.</div>`;
        return;
      }
      list.innerHTML = templates.map((t, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-2);border:1px solid var(--border);margin-bottom:4px">
          <span style="flex:1;font-size:13px;font-weight:600">${t.name}</span>
          <span style="font-size:10px;color:var(--text-muted);font-family:var(--mono)">${t.panels?.length || 0} panels</span>
          <button class="btn" data-load="${i}" style="font-size:10px;padding:3px 10px">Load</button>
          <button class="btn-icon danger" data-del="${i}" style="font-size:11px">✕</button>
        </div>`).join('');

      list.querySelectorAll('[data-load]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const tmpl = templates[+btn.dataset.load];
          if (!tmpl) return;
          config.length = 0;
          tmpl.panels.forEach(p => config.push(p));
          await this.saveConfig(config);
          App.closeModal();
          if (grid) await this.renderGrid(grid, config);
          App.toast(`Template "${tmpl.name}" loaded`, 'success');
        });
      });

      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          templates.splice(+btn.dataset.del, 1);
          await window.api.setData('dashboard-templates', templates);
          refresh();
          App.toast('Template deleted');
        });
      });
    };

    App.openModal('Dashboard Templates', `
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;line-height:1.6">
        Save your current panel layout as a named template, then swap between them instantly.
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input class="input" id="tmpl-name" placeholder="Template name (e.g. Work, Morning, Focus…)" style="flex:1"/>
        <button class="btn btn-gold" id="tmpl-save">Save Current</button>
      </div>

      <div class="section-label" style="margin-bottom:8px">Saved Templates</div>
      <div id="tmpl-list"></div>

      <div style="margin-top:16px;padding:12px;background:var(--bg-2);border:1px solid var(--border)">
        <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Quick Presets</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[
            { name:'Work', panels:['tasks','pomodoro','reminders','calendar','files','notes'] },
            { name:'Morning', panels:['habits','moods','reminders','weather','calendar','tasks'] },
            { name:'Focus', panels:['pomodoro','tasks','timers','notes'] },
            { name:'Overview', panels:['dashboard','tasks','calendar','reminders','habits','clipboard','notes','bookmarks'] },
          ].map(p => `<button class="btn" data-preset='${JSON.stringify(p.panels)}' style="font-size:10px">${p.name}</button>`).join('')}
        </div>
      </div>
    `);

    refresh();

    document.getElementById('tmpl-save').addEventListener('click', async () => {
      const name = document.getElementById('tmpl-name').value.trim();
      if (!name) return App.toast('Enter a template name', 'error');
      // Check for duplicate name — update instead of adding
      const existing = templates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
      const entry = { name, panels: config.map(p => ({...p})), savedAt: new Date().toISOString() };
      if (existing > -1) templates[existing] = entry;
      else templates.push(entry);
      await window.api.setData('dashboard-templates', templates);
      document.getElementById('tmpl-name').value = '';
      refresh();
      App.toast(`Template "${name}" saved`, 'success');
    });

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const panelKeys = JSON.parse(btn.dataset.preset);
        const newConfig = panelKeys
          .filter(k => this.PANEL_DEFS[k])
          .map(k => ({ key: k, span: '1x1' }));
        config.length = 0;
        newConfig.forEach(c => config.push(c));
        await this.saveConfig(config);
        App.closeModal();
        if (grid) await this.renderGrid(grid, config);
        App.toast(`Preset "${btn.textContent}" loaded`, 'success');
      });
    });
  },

  async openEditModal(config) {
    const all = Object.entries(this.PANEL_DEFS);
    App.openModal('Manage Dashboard Panels', `
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;line-height:1.6">
        Toggle which panels appear. Drag rows to set order. Use <strong style="color:var(--text)">Resize &amp; Reorder</strong> on the dashboard to resize panels.
      </div>
      <div id="dash-panel-list" style="display:flex;flex-direction:column;gap:4px;max-height:420px;overflow-y:auto">
        ${all.map(([key, def]) => {
          const inConfig = config.find(c => c.key === key);
          return `<div class="dash-edit-row ${inConfig ? 'enabled' : ''}" data-key="${key}" draggable="true">
            <span class="dash-edit-drag">⠿</span>
            <span class="dash-edit-icon">${def.icon}</span>
            <span class="dash-edit-label">${def.label}</span>
            <label class="dash-edit-toggle">
              <input type="checkbox" value="${key}" ${inConfig ? 'checked' : ''} />
              <span class="dash-toggle-track"><span class="dash-toggle-thumb"></span></span>
            </label>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-gold" id="dash-save-config" style="width:100%;margin-top:14px">Save</button>
    `);

    let draggingEl = null;
    const list = document.getElementById('dash-panel-list');
    list.querySelectorAll('.dash-edit-row').forEach(row => {
      row.addEventListener('dragstart', e => { draggingEl = row; e.dataTransfer.effectAllowed='move'; setTimeout(()=>row.style.opacity='0.4',0); });
      row.addEventListener('dragend', () => { row.style.opacity=''; draggingEl=null; });
      row.addEventListener('dragover', e => {
        e.preventDefault(); if (!draggingEl||draggingEl===row) return;
        const rect=row.getBoundingClientRect(), mid=rect.top+rect.height/2;
        if (e.clientY<mid) list.insertBefore(draggingEl,row); else list.insertBefore(draggingEl,row.nextSibling);
      });
    });

    document.getElementById('dash-save-config').addEventListener('click', async () => {
      const rows = list.querySelectorAll('.dash-edit-row');
      const newConfig = [];
      rows.forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb?.checked) {
          const existing = config.find(c => c.key === row.dataset.key);
          newConfig.push({ key: row.dataset.key, span: existing?.span || '1x1' });
        }
      });
      // Mutate the live config array so the grid reference stays valid
      config.length = 0;
      newConfig.forEach(c => config.push(c));
      await this.saveConfig(config);
      App.closeModal();
      // Re-render the grid in place
      const grid = document.getElementById('dash-grid');
      if (grid) await this.renderGrid(grid, config);
    });
  }
};