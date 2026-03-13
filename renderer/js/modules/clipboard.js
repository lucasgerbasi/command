Modules.clipboard = {
  async render(container) {
    const all = await window.api.getData('clipboard');
    container.innerHTML = `
      ${Utils.modHead('01 / Clipboard', 'History', `${all.length} / 50 items`, `<button class="btn" id="clip-clear">Clear unpinned</button>`)}
      <div class="clip-search-row">
        <input class="input input-mono" id="clip-search" placeholder="Search…" style="flex:1" />
      </div>
      <div class="clip-list" id="clip-list"></div>`;

    const render = (items) => {
      const el = document.getElementById('clip-list');
      if (!items.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⎘</div><div class="empty-text">Nothing here yet</div><div class="empty-hint">Copy something to get started</div></div>`; return; }
      el.innerHTML = items.map(item => `
        <div class="clip-item ${item.pinned?'pinned':''}" data-id="${item.id}">
          <div class="clip-text" title="${(item.text||'').replace(/"/g,'&quot;')}">${Utils.truncate(item.text,130)}</div>
          <div class="clip-meta">${Utils.timeAgo(item.timestamp)}</div>
          <div class="clip-actions">
            <button class="btn-icon pin-btn ${item.pinned?'pin-active':''}" title="Pin" data-id="${item.id}">📌</button>
            <button class="btn-icon copy-btn" title="Copy" data-id="${item.id}">⎘</button>
            <button class="btn-icon danger delete-btn" title="Delete" data-id="${item.id}">✕</button>
          </div>
        </div>`).join('');
    };

    render(all);

    document.getElementById('clip-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      render(q ? all.filter(i => i.text.toLowerCase().includes(q)) : all);
    });
    document.getElementById('clip-clear').addEventListener('click', async () => {
      await window.api.setData('clipboard', all.filter(i => i.pinned));
      App.toast('Cleared'); App.navigate('clipboard');
    });
    document.getElementById('clip-list').addEventListener('click', async e => {
      const btn = e.target.closest('button'); if (!btn) return;
      const id = +btn.dataset.id;
      const item = all.find(i => i.id === id); if (!item) return;
      if (btn.classList.contains('copy-btn')) { await window.api.writeClipboard(item.text); App.toast('Copied', 'success'); }
      if (btn.classList.contains('pin-btn')) { item.pinned = !item.pinned; await window.api.setData('clipboard', all); App.navigate('clipboard'); }
      if (btn.classList.contains('delete-btn')) { all.splice(all.indexOf(item),1); await window.api.setData('clipboard', all); App.navigate('clipboard'); }
    });
  },
};
