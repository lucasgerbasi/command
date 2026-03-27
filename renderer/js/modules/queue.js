// ── Queue Module ──────────────────────────────────────────────────────────────
// A graveyard for things you want to consume once.
// Paste a link → it gets queued. Or use "queue [link]" in the launcher.
// Now supports groups (like tasks), editable titles/links, and auto-title fetch.

Modules.queue = {
  filter: 'all', // 'all' | 'unread' | 'done'

  async render(container) {
    let items = await window.api.getData('queue').catch(() => []) || [];
    // items can be flat entries OR group objects { isGroup, name, id, collapsed, items:[] }

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

    // Auto-fetch title from URL (YouTube via oEmbed, generic via og:title via main process)
    const fetchTitle = async (url) => {
      try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (res.ok) { const d = await res.json(); if (d.title) return d.title; }
        }
        // Generic: try to fetch og:title via main process if available
        if (window.api.fetchPageTitle) {
          const t = await window.api.fetchPageTitle(url).catch(() => null);
          if (t) return t;
        }
      } catch {}
      // Fallback: derive from URL path
      try {
        const u = new URL(url);
        const seg = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
        return seg.replace(/[-_]/g,' ').replace(/\.[a-z]{2,4}$/i,'') || url;
      } catch { return url; }
    };

    // Flatten items for filter counts (traverse groups)
    const flatItems = () => {
      const out = [];
      for (const item of items) {
        if (item.isGroup) { for (const sub of (item.items||[])) out.push(sub); }
        else out.push(item);
      }
      return out;
    };

    const getFiltered = () => {
      if (this.filter === 'all') return items;
      // Filter within groups
      return items.map(item => {
        if (item.isGroup) {
          const filteredSubs = (item.items||[]).filter(i => this.filter === 'unread' ? !i.done : i.done);
          return { ...item, items: filteredSubs };
        }
        const keep = this.filter === 'unread' ? !item.done : item.done;
        return keep ? item : null;
      }).filter(Boolean);
    };

    const render = () => {
      const flat = flatItems();
      const unreadCount = flat.filter(i => !i.done).length;
      const doneCount   = flat.filter(i =>  i.done).length;
      const filtered = getFiltered();

      container.innerHTML = `
        <style>
          .queue-item-link { text-decoration:none; color:inherit; }
          .queue-group { margin-bottom:12px; }
          .queue-group-header { display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2);border:1px solid var(--border);cursor:pointer;user-select:none; }
          .queue-group-header:hover { background:var(--bg-3); }
          .queue-group-name { font-weight:700;font-size:12px;flex:1; }
          .queue-group-count { font-family:var(--mono);font-size:10px;color:var(--text-muted); }
          .queue-group-body { border:1px solid var(--border);border-top:none;padding:0; }
          .queue-group-del { background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px; }
          .queue-group-del:hover { color:var(--red,#ef4444); }
          .queue-edit-input { background:none;border:none;border-bottom:1px solid var(--border-2);color:var(--text);font-size:13px;font-weight:600;outline:none;flex:1;min-width:0;padding:0 2px; }
          .queue-edit-input:focus { border-color:var(--accent-dim); }
          .queue-url-edit { background:none;border:none;border-bottom:1px solid var(--border-2);color:var(--text-muted);font-family:var(--mono);font-size:10px;outline:none;width:100%;padding:0 2px;margin-top:2px; }
          .queue-url-edit:focus { border-color:var(--accent-dim); }
        </style>
        ${Utils.modHead('Queue', 'The Queue', `${unreadCount} waiting · ${doneCount} done`, `
          <button class="btn btn-gold" id="queue-add-btn">+ Add Link</button>
          <button class="btn" id="queue-add-group-btn" style="margin-left:6px">+ Group</button>
        `)}

        <div class="queue-tabs">
          <button class="queue-tab ${this.filter==='all'   ?'active':''}" data-filter="all">All (${flat.length})</button>
          <button class="queue-tab ${this.filter==='unread'?'active':''}" data-filter="unread">Waiting (${unreadCount})</button>
          <button class="queue-tab ${this.filter==='done'  ?'active':''}" data-filter="done">Done (${doneCount})</button>
        </div>

        <div class="queue-add-row" id="queue-add-row" style="display:none">
          <input class="input input-mono" id="queue-url-input" placeholder="Paste a URL… title will be fetched automatically" style="flex:1" />
          <input class="input" id="queue-title-input" placeholder="Override title (optional)" style="width:200px" />
          <button class="btn btn-gold" id="queue-submit-btn">Add</button>
        </div>

        <div class="queue-list" id="queue-list">
          ${filtered.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🎬</div>
               <div class="empty-text">${this.filter==='done'?'Nothing finished yet':'Queue is empty'}</div>
               <div class="empty-hint">Paste a link above or use <code style="font-family:var(--mono);color:var(--gold)">queue [url]</code> in the launcher</div></div>`
            : filtered.map((item, i) => item.isGroup ? renderGroup(item, i) : renderItem(item, i, null)).join('')}
        </div>`;

      // Tabs
      container.querySelectorAll('.queue-tab').forEach(tab => {
        tab.addEventListener('click', () => { this.filter = tab.dataset.filter; render(); });
      });

      // Add link button
      container.querySelector('#queue-add-btn').addEventListener('click', () => {
        const row = container.querySelector('#queue-add-row');
        row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        if (row.style.display !== 'none') container.querySelector('#queue-url-input').focus();
      });

      // Add group button
      container.querySelector('#queue-add-group-btn').addEventListener('click', () => {
        App.openModal('New Queue Group', `
          <div class="form-row"><label class="form-label">Group Name</label>
            <input class="input" id="qgrp-name-input" placeholder="e.g. Tutorials, Weekend Watch…" /></div>
          <button class="btn btn-gold" id="qgrp-save" style="width:100%;margin-top:14px">Create Group</button>`);
        setTimeout(() => document.getElementById('qgrp-name-input')?.focus(), 50);
        document.getElementById('qgrp-save').addEventListener('click', async () => {
          const name = document.getElementById('qgrp-name-input').value.trim();
          if (!name) { App.toast('Name required','error'); return; }
          items.unshift({ isGroup: true, id: Utils.uid(), name, collapsed: false, items: [] });
          await save(); App.closeModal(); render(); App.toast(`Group "${name}" created`,'success');
        });
      });

      // Submit link
      const submitQueue = async () => {
        const url   = (container.querySelector('#queue-url-input').value || '').trim();
        const title = (container.querySelector('#queue-title-input').value || '').trim();
        if (!url) { App.toast('Paste a URL first', 'error'); return; }
        let finalUrl = url;
        if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
        const type = detectType(finalUrl);

        App.toast('Fetching title…');
        const autoTitle = title || await fetchTitle(finalUrl);

        items.unshift({ id: Utils.uid(), url: finalUrl, title: autoTitle, type, done: false, addedAt: new Date().toISOString() });
        await save();
        container.querySelector('#queue-url-input').value = '';
        container.querySelector('#queue-title-input').value = '';
        App.toast(`Queued: ${autoTitle}`, 'success');
        render();
      };

      container.querySelector('#queue-submit-btn').addEventListener('click', submitQueue);
      container.querySelector('#queue-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitQueue(); });

      // List actions (delegated)
      setupListActions(container.querySelector('#queue-list'));

      // Drag reorder
      setupDrag(container.querySelector('#queue-list'));
    };

    const renderItem = (item, i, groupId) => `
      <div class="queue-item ${item.done?'done':''}" data-id="${item.id}" data-group="${groupId||''}" data-drag-idx="${i}">
        <span class="drag-handle" style="font-size:13px;color:var(--text-muted);opacity:.4;cursor:grab;flex-shrink:0;user-select:none">⠿</span>
        <span class="queue-type-badge queue-type-${item.type}">${typeIcon(item.type)} ${item.type}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:4px">
            <input class="queue-edit-input" value="${esc(item.title||item.url)}" data-id="${item.id}" data-field="title" placeholder="Title…" title="Click to edit title" />
          </div>
          <input class="queue-url-edit" value="${esc(item.url)}" data-id="${item.id}" data-field="url" placeholder="URL…" title="Click to edit URL" />
          <div style="display:flex;gap:10px;margin-top:4px;align-items:center">
            <span class="queue-meta">${Utils.timeAgo(item.addedAt)}</span>
            ${item.done ? `<span style="font-size:9px;color:var(--green);font-family:var(--mono)">✓ done</span>` : ''}
          </div>
        </div>
        <div class="queue-actions">
          <button class="btn-icon" data-action="open" data-id="${item.id}" title="Open link">↗</button>
          <button class="btn-icon" data-action="toggle" data-id="${item.id}" title="${item.done?'Mark unread':'Mark done'}" style="color:${item.done?'var(--green)':'var(--text-muted)'}">✓</button>
          <button class="btn-icon danger" data-action="remove" data-id="${item.id}" data-group="${groupId||''}" title="Remove">✕</button>
        </div>
      </div>`;

    const renderGroup = (group, gi) => `
      <div class="queue-group" data-group-id="${group.id}">
        <div class="queue-group-header" data-gaction="toggle-collapse" data-id="${group.id}">
          <span style="font-size:11px;color:var(--text-muted)">${group.collapsed?'▶':'▼'}</span>
          <span class="queue-group-name">${esc(group.name)}</span>
          <span class="queue-group-count">${(group.items||[]).filter(i=>!i.done).length} waiting · ${(group.items||[]).filter(i=>i.done).length} done</span>
          <button class="btn-icon" data-gaction="add-to-group" data-id="${group.id}" title="Add link to group" style="font-size:11px">+ link</button>
          <button class="queue-group-del" data-gaction="del-group" data-id="${group.id}" title="Delete group">✕</button>
        </div>
        ${!group.collapsed ? `<div class="queue-group-body">
          ${(group.items||[]).length === 0 ? `<div style="padding:12px 16px;color:var(--text-muted);font-size:12px">No items — click "+ link" to add</div>` : ''}
          ${(group.items||[]).map((item, i) => renderItem(item, i, group.id)).join('')}
        </div>` : ''}
      </div>`;

    const findItem = (id) => {
      for (const item of items) {
        if (item.id === id) return { item, arr: items, groupId: null };
        if (item.isGroup) {
          const sub = (item.items||[]).find(x => x.id === id);
          if (sub) return { item: sub, arr: item.items, groupId: item.id };
        }
      }
      return null;
    };

    const setupListActions = (list) => {
      if (!list) return;

      // Editable title/url inline
      list.addEventListener('change', async e => {
        const inp = e.target.closest('[data-field]');
        if (!inp) return;
        const found = findItem(inp.dataset.id);
        if (!found) return;
        const field = inp.dataset.field;
        if (field === 'title') found.item.title = inp.value.trim() || found.item.url;
        else if (field === 'url') {
          let url = inp.value.trim();
          if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
          found.item.url = url;
          found.item.type = detectType(url);
        }
        await save();
      });

      // Group header actions
      list.addEventListener('click', async e => {
        const gBtn = e.target.closest('[data-gaction]');
        if (gBtn) {
          const gaction = gBtn.dataset.gaction;
          const gid = gBtn.dataset.id;
          const grp = items.find(i => i.isGroup && i.id === gid);
          if (!grp) return;

          if (gaction === 'toggle-collapse') {
            if (e.target.closest('[data-gaction="add-to-group"]') || e.target.closest('[data-gaction="del-group"]')) return;
            grp.collapsed = !grp.collapsed;
            await save(); render(); return;
          }
          if (gaction === 'add-to-group') {
            App.openModal(`Add Link to "${grp.name}"`, `
              <div class="form-row"><label class="form-label">URL</label>
                <input class="input input-mono" id="qgrp-url" placeholder="Paste URL…" /></div>
              <div class="form-row" style="margin-top:8px"><label class="form-label">Title (optional)</label>
                <input class="input" id="qgrp-title" placeholder="Auto-fetched if blank" /></div>
              <button class="btn btn-gold" id="qgrp-add-save" style="width:100%;margin-top:14px">Add</button>`);
            setTimeout(() => document.getElementById('qgrp-url')?.focus(), 50);
            document.getElementById('qgrp-add-save').addEventListener('click', async () => {
              const url = document.getElementById('qgrp-url').value.trim();
              if (!url) { App.toast('URL required','error'); return; }
              const finalUrl = /^https?:\/\//i.test(url) ? url : 'https://'+url;
              const titleOverride = document.getElementById('qgrp-title').value.trim();
              App.toast('Fetching title…');
              const autoTitle = titleOverride || await fetchTitle(finalUrl);
              if (!grp.items) grp.items = [];
              grp.items.unshift({ id: Utils.uid(), url: finalUrl, title: autoTitle, type: detectType(finalUrl), done: false, addedAt: new Date().toISOString() });
              await save(); App.closeModal(); render(); App.toast(`Added: ${autoTitle}`,'success');
            });
            return;
          }
          if (gaction === 'del-group') {
            const ok = await App.confirm(`Delete group "${grp.name}" and all its items?`, { danger: true });
            if (!ok) return;
            const idx = items.findIndex(i => i.id === gid);
            if (idx >= 0) items.splice(idx, 1);
            await save(); render(); return;
          }
          return;
        }

        // Item actions
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const found = findItem(id);
        if (!found) return;
        const { item, arr } = found;
        const action = btn.dataset.action;

        if (action === 'open') {
          window.api.openURL(item.url);
          if (!item.done) { item.done = true; await save(); }
          render();
        } else if (action === 'toggle') {
          item.done = !item.done;
          await save(); render();
        } else if (action === 'remove') {
          const ok = await App.confirm(`Remove "${item.title || item.url}" from queue?`, { danger: true });
          if (!ok) return;
          const idx = arr.findIndex(i => i.id === id);
          if (idx >= 0) arr.splice(idx, 1);
          await save(); render();
        }
      });
    };

    const setupDrag = (list) => {
      if (!list) return;
      let dragSrc = null;
      list.querySelectorAll('.queue-item[data-drag-idx]').forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', e => {
          dragSrc = row;
          e.dataTransfer.effectAllowed = 'move';
          const label = row.querySelector('.queue-edit-input')?.value || 'Queue item';
          App.setDragGhost(e, label);
          setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          list.querySelectorAll('.drag-over,.drop-indicator').forEach(el =>
            el.classList.contains('drop-indicator') ? el.remove() : el.classList.remove('drag-over'));
          dragSrc = null;
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          if (!dragSrc || dragSrc === row) return;
          list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
          list.querySelectorAll('.drop-indicator').forEach(el => el.remove());
          const rect = row.getBoundingClientRect();
          const ind = document.createElement('div'); ind.className = 'drop-indicator';
          if (e.clientY < rect.top + rect.height / 2) row.parentNode.insertBefore(ind, row);
          else row.parentNode.insertBefore(ind, row.nextSibling);
          row.classList.add('drag-over');
        });
        row.addEventListener('drop', async e => {
          e.preventDefault();
          list.querySelectorAll('.drop-indicator').forEach(el => el.remove());
          if (!dragSrc || dragSrc === row) return;
          const fromId = dragSrc.dataset.id;
          const toId   = row.dataset.id;
          const fromGid = dragSrc.dataset.group || null;
          const toGid   = row.dataset.group || null;
          if (fromId === toId) return;

          // Find source and target in the same array
          const srcArr  = fromGid ? (items.find(i=>i.id===fromGid)?.items || items) : items;
          const tgtArr  = toGid   ? (items.find(i=>i.id===toGid)?.items   || items) : items;
          const fIdx = srcArr.findIndex(i => i.id === fromId);
          const tIdx = tgtArr.findIndex(i => i.id === toId);
          if (fIdx < 0 || tIdx < 0) return;
          const [moved] = srcArr.splice(fIdx, 1);
          tgtArr.splice(tIdx, 0, moved);
          await save(); render();
        });
      });
    };

    render();
  },
};
