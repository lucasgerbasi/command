Modules.dashboard = {
  async render(container) {
    const [clipboard, tasks, notes, events, bookmarks, folders, weatherConfig] = await Promise.all([
      window.api.getData('clipboard'),
      window.api.getData('tasks'),
      window.api.getData('notes'),
      window.api.getData('calendar'),
      window.api.getData('bookmarks'),
      window.api.getData('recent-folders'),
      window.api.getData('weather-config'),
    ]);

    const today = new Date().toDateString();
    const todayEvents = events.filter(e=>e.date===today);
    const activeTasks = tasks.filter(t=>!t.done);
    const now = new Date();
    const greeting = now.getHours()<12 ? 'Good morning' : now.getHours()<17 ? 'Good afternoon' : 'Good evening';

    const rows = (items, key, isDate) => items.slice(0,5).map(i=>`
      <div class="dash-row">
        <div class="dash-dot"></div>
        <span class="dash-row-text">${i[key]||''}</span>
        ${isDate && i.lastOpened ? `<span class="dash-row-meta">${Utils.timeAgo(i.lastOpened)}</span>` : ''}
      </div>`).join('');

    container.innerHTML = `
      <div class="dash-greeting">
        <div class="dash-greeting-name">${greeting}</div>
        <div class="dash-greeting-sub">
          ${now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
          &nbsp;·&nbsp;
          <span class="dash-shortcut-hint">Ctrl+Space</span>
          &nbsp;to launch
        </div>
      </div>

      <div class="dash-grid">

        <div class="dash-panel" data-nav="tasks">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">✓</span> Tasks</div>
          ${activeTasks.length === 0
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">All clear ✓</div>`
            : rows(activeTasks,'text')}
          <div class="dash-stat">${activeTasks.length} active · ${tasks.filter(t=>t.done).length} done</div>
        </div>

        <div class="dash-panel" data-nav="calendar">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">▦</span> Today's Events</div>
          ${todayEvents.length===0
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">No events today</div>`
            : rows(todayEvents,'title')}
          <div class="dash-stat">Calendar overview</div>
        </div>
        
        <div class="dash-panel" data-nav="files">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">◫</span> Recent Folders</div>
          ${folders.length===0
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">No folders opened yet</div>`
            : rows(folders,'name', true)}
          <div class="dash-stat">Tracked from app launches</div>
        </div>

        <div class="dash-panel" data-nav="weather">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">◌</span> Weather Status</div>
          ${!weatherConfig?.city 
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">Weather not configured</div>` 
            : `<div style="font-size:24px;color:var(--text);margin-bottom:4px">${weatherConfig.city}</div>
               <div style="font-size:13px;color:var(--text-dim)">Click to view full forecast</div>`}
          <div class="dash-stat">Sky & Conditions</div>
        </div>

        <div class="dash-panel" data-nav="clipboard">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">⎘</span> Clipboard</div>
          ${clipboard.length===0
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">Nothing copied yet</div>`
            : clipboard.slice(0,4).map(c=>`
                <div class="dash-row">
                  <div class="dash-dot"></div>
                  <span class="dash-row-text" style="font-family:var(--mono);font-size:11px">${Utils.truncate(c.text,55)}</span>
                </div>`).join('')}
          <div class="dash-stat">${clipboard.length}/50 items tracked</div>
        </div>

        <div class="dash-panel" data-nav="notes">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">✎</span> Latest Note</div>
          ${notes.length===0
            ? `<div style="font-size:13px;color:var(--text-muted);margin:auto 0">No notes written</div>`
            : `<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">${notes[0].title||'Untitled'}</div>
               <div style="font-size:12px;color:var(--text-dim);font-family:var(--mono);line-height:1.6;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${notes[0].body||''}</div>`}
          <div class="dash-stat">${notes.length} notes total</div>
        </div>

        <div class="dash-panel" data-nav="bookmarks" style="grid-column: 1 / -1;">
          <div class="dash-panel-eyebrow"><span class="dash-panel-eyebrow-dot">◉</span> Quick Bookmarks</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${bookmarks.length===0
              ? `<div style="font-size:13px;color:var(--text-muted)">No bookmarks</div>`
              : bookmarks.slice(0,16).map(b=>`
                  <div class="bm-quick" data-type="${b.type}" data-url="${b.url||''}" data-path="${b.path||''}">
                    <span>${b.icon||'📎'}</span><span>${b.name}</span>
                  </div>`).join('')}
          </div>
        </div>

      </div>`;

    container.querySelectorAll('.dash-panel[data-nav]').forEach(p =>
      p.addEventListener('click', e => { if(!e.target.closest('.bm-quick')) App.navigate(p.dataset.nav); })
    );
    container.querySelectorAll('.bm-quick').forEach(el =>
      el.addEventListener('click', e => {
        e.stopPropagation();
        if(el.dataset.type==='web') window.api.openURL(el.dataset.url);
        else window.api.openPath(el.dataset.path);
      })
    );
  },
};