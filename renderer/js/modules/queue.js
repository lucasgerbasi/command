// ── Queue Module ──────────────────────────────────────────────────────────────
// A graveyard for things you want to consume once:
// YouTube videos, articles, movie recommendations.
// Paste a link → it gets queued. Or use "command queue [link]" in the launcher.

Modules.queue = {
  filter: 'all', // 'all' | 'unread' | 'done'

  async render(container) {
    let items = await window.api.getData('queue').catch(() => []) || [];

    // Detect type from URL
    const detectType = url => {
      if (!url) return 'other';
      const u = url.toLowerCase();
      if (u.includes('youtube.com') || u.includes('youtu.be') ||
          u.includes('vimeo.com') || u.includes('twitch.tv') ||
          u.includes('dailymotion') || u.includes('tiktok.com')) return 'video';
      if (u.includes('medium.com') || u.includes('substack.com') ||
          u.includes('dev.to') || u.includes('hackernews') || u.includes('hn.') ||
          u.includes('reddit.com') || u.includes('blog') || u.includes('article') ||
          u.match(/\.(com|io|net|org|co)\/(post|article|blog|story|p\/)/)) return 'article';
      return 'other';
    };

    const typeIcon = t => ({ video:'▶', article:'📄', other:'🔗' }[t] || '🔗');
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const save = async () => { await window.api.setData('queue', items); };

    const getFiltered = () => {
      if (this.filter === 'unread') return items.filter(i => !i.done);
      if (this.filter === 'done')   return items.filter(i => i.done);
      return items;
    };

    const render = () => {
      const filtered = getFiltered();
      const unreadCount = items.filter(i => !i.done).length;
      const doneCount   = items.filter(i =>  i.done).length;

      container.innerHTML = `
        <style>
          .queue-item-link { text-decoration:none; color:inherit; }
        </style>
        ${Utils.modHead('Queue', 'The Queue', `${unreadCount} waiting · ${doneCount} done`, `
          <button class="btn btn-gold" id="queue-add-btn">+ Add Link</button>
        `)}

        <div class="queue-tabs">
          <button class="queue-tab ${this.filter==='all'   ?'active':''}" data-filter="all">All (${items.length})</button>
          <button class="queue-tab ${this.filter==='unread'?'active':''}" data-filter="unread">Waiting (${unreadCount})</button>
          <button class="queue-tab ${this.filter==='done'  ?'active':''}" data-filter="done">Done (${doneCount})</button>
        </div>

        <div class="queue-add-row" id="queue-add-row" style="display:none">
          <input class="input input-mono" id="queue-url-input" placeholder="Paste a URL and press Enter…" style="flex:1" />
          <input class="input" id="queue-title-input" placeholder="Custom title (optional)" style="width:220px" />
          <button class="btn btn-gold" id="queue-submit-btn">Add</button>
        </div>

        <div class="queue-list" id="queue-list">
          ${filtered.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🎬</div>
               <div class="empty-text">${this.filter==='done'?'Nothing finished yet':'Queue is empty'}</div>
               <div class="empty-hint">Paste a link above or use <code style="font-family:var(--mono);color:var(--gold)">queue [url]</code> in the launcher</div></div>`
            : filtered.map((item, i) => `
              <div class="queue-item ${item.done?'done':''}" data-drag-idx="${i}" data-id="${item.id}">
                <span class="drag-handle" style="font-size:13px;color:var(--text-muted);opacity:.4;cursor:grab;flex-shrink:0;user-select:none">⠿</span>
                <span class="queue-type-badge queue-type-${item.type}">${typeIcon(item.type)} ${item.type}</span>
                <div style="flex:1;min-width:0">
                  <div class="queue-title">${esc(item.title || item.url)}</div>
                  <div class="queue-url">${esc(item.url)}</div>
                  <div style="display:flex;gap:10px;margin-top:4px;align-items:center">
                    <span class="queue-meta">${Utils.timeAgo(item.addedAt)}</span>
                    ${item.done ? `<span style="font-size:9px;color:var(--green);font-family:var(--mono)">✓ done</span>` : ''}
                  </div>
                </div>
                <div class="queue-actions">
                  <button class="btn-icon" data-action="open" data-id="${item.id}" title="Open link">↗</button>
                  <button class="btn-icon ${item.done?'':'btn-icon'}" data-action="toggle" data-id="${item.id}" title="${item.done?'Mark unread':'Mark done'}" style="color:${item.done?'var(--green)':'var(--text-muted)'}">✓</button>
                  <button class="btn-icon danger" data-action="remove" data-id="${item.id}" title="Remove">✕</button>
                </div>
              </div>`).join('')}
        </div>`;

      // Tab filter
      container.querySelectorAll('.queue-tab').forEach(tab => {
        tab.addEventListener('click', () => { this.filter = tab.dataset.filter; render(); });
      });

      // Add button toggle
      container.querySelector('#queue-add-btn').addEventListener('click', () => {
        const row = container.querySelector('#queue-add-row');
        row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        if (row.style.display !== 'none') container.querySelector('#queue-url-input').focus();
      });

      // Submit
      const submitQueue = async () => {
        const url   = (container.querySelector('#queue-url-input').value || '').trim();
        const title = (container.querySelector('#queue-title-input').value || '').trim();
        if (!url) { App.toast('Paste a URL first', 'error'); return; }
        let finalUrl = url;
        if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
        const type = detectType(finalUrl);
        // Auto-derive title from URL path if not given
        let autoTitle = title;
        if (!autoTitle) {
          try {
            const u = new URL(finalUrl);
            const seg = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
            autoTitle = seg.replace(/[-_]/g,' ').replace(/\.[a-z]{2,4}$/i,'') || finalUrl;
          } catch { autoTitle = finalUrl; }
        }
        items.unshift({ id: Utils.uid(), url: finalUrl, title: autoTitle, type, done: false, addedAt: new Date().toISOString() });
        await save();
        container.querySelector('#queue-url-input').value = '';
        container.querySelector('#queue-title-input').value = '';
        App.toast(`Queued: ${autoTitle}`, 'success');
        render();
      };

      container.querySelector('#queue-submit-btn').addEventListener('click', submitQueue);
      container.querySelector('#queue-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitQueue(); });

      // Actions
      container.querySelector('#queue-list').addEventListener('click', async e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const idx = items.findIndex(i => i.id === id);
        if (idx < 0) return;
        const action = btn.dataset.action;
        if (action === 'open') {
          window.api.openURL(items[idx].url);
          if (!items[idx].done) { items[idx].done = true; await save(); }
          render();
        } else if (action === 'toggle') {
          items[idx].done = !items[idx].done;
          await save(); render();
        } else if (action === 'remove') {
          const ok = await App.confirm(`Remove "${items[idx].title || items[idx].url}" from queue?`, { danger: true });
          if (!ok) return;
          items.splice(idx, 1);
          await save(); render();
        }
      });

      // Drag to reorder
      let dragSrc = null;
      container.querySelectorAll('.queue-item[data-drag-idx]').forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', e => {
          dragSrc = row;
          e.dataTransfer.effectAllowed = 'move';
          const label = row.querySelector('.queue-title')?.textContent || 'Queue item';
          App.setDragGhost(e, label);
          setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          container.querySelectorAll('.drag-over,.drop-indicator').forEach(el =>
            el.classList.contains('drop-indicator') ? el.remove() : el.classList.remove('drag-over'));
          dragSrc = null;
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          if (!dragSrc || dragSrc === row) return;
          container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
          container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
          const rect = row.getBoundingClientRect();
          const ind = document.createElement('div'); ind.className = 'drop-indicator';
          if (e.clientY < rect.top + rect.height / 2) row.parentNode.insertBefore(ind, row);
          else row.parentNode.insertBefore(ind, row.nextSibling);
          row.classList.add('drag-over');
        });
        row.addEventListener('drop', async e => {
          e.preventDefault();
          container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
          if (!dragSrc || dragSrc === row) return;
          const fi = +dragSrc.dataset.dragIdx;
          const ti = +row.dataset.dragIdx;
          // Operate on filtered indices, map back to main array
          const filtered = getFiltered();
          const fromId = filtered[fi]?.id;
          const toId   = filtered[ti]?.id;
          if (!fromId || !toId || fromId === toId) return;
          const fReal = items.findIndex(i => i.id === fromId);
          const tReal = items.findIndex(i => i.id === toId);
          if (fReal < 0 || tReal < 0) return;
          const [moved] = items.splice(fReal, 1);
          items.splice(tReal, 0, moved);
          await save(); render();
        });
      });
    };

    render();
  },
};
