Modules.files = {
  async render(container) {
    const config = await window.api.getData('files-config').catch(()=>null) || {folders:[]};
    const recentFolders = await window.api.getData('recent-folders').catch(()=>[]) || [];
    
    container.innerHTML = `${Utils.modHead('13 / Files', 'Folders & Files', 'Recently accessed folders and monitored files', `<button class="btn" id="files-config-btn">Configure Monitored Folders</button>`)}
      <div>
        <div class="section-label">Recently Opened Folders</div>
        <div class="folder-grid" id="folder-grid"></div>

        <div class="section-label" style="margin-top:32px">Monitored Recent Files</div>
        <div class="files-toolbar">
          <input class="input" id="files-search" placeholder="Filter files…" style="flex:1;max-width:400px" />
        </div>
        <div class="files-list" id="files-list">
          <div class="empty-state"><div class="empty-icon">⊟</div><div class="empty-text">Loading…</div></div>
        </div>
      </div>`;

    const renderFolders = (list) => {
      const el = document.getElementById('folder-grid');
      if (!list.length) { el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;grid-column:1/-1;">No folders opened through the app yet.</div>`; return; }
      el.innerHTML = list.slice(0, 10).map(f => `
        <div class="folder-card" data-path="${f.path}">
          <div class="folder-icon">📁</div>
          <div class="folder-info">
            <div class="folder-name">${f.name}</div>
            <div class="folder-path">${f.path}</div>
          </div>
        </div>`).join('');
    };

    const renderFiles = (files) => {
      const el = document.getElementById('files-list');
      if (!files.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon">⊟</div><div class="empty-text">No recent files found</div><div class="empty-hint">Configure folders to monitor specific files</div></div>`; return; }
      el.innerHTML = files.map(f => {
        const parts = f.path.replace(/\\/g,'/').split('/');
        const name = parts.pop();
        const dir = parts.join('/');
        const ext = name.includes('.') ? name.split('.').pop().toUpperCase() : '—';
        return `<div class="file-row" data-path="${f.path}">
          <span class="file-ext">${ext}</span>
          <span class="file-name">${name}</span>
          <span class="file-path">${dir}</span>
          <span class="file-time">${Utils.timeAgo(f.mtime)}</span>
        </div>`;
      }).join('');
    };

    renderFolders(recentFolders);

    // Load files
    const loadFiles = async () => {
      try {
        const files = await window.api.getRecentFiles();
        renderFiles(files || []);
      } catch { renderFiles([]); }
    };
    loadFiles();

    document.getElementById('files-search').addEventListener('input', async e => {
      const q = e.target.value.toLowerCase();
      const files = await window.api.getRecentFiles().catch(()=>[]);
      renderFiles(q ? (files||[]).filter(f => f.path.toLowerCase().includes(q)) : (files||[]));
    });

    // Delegate clicks for both folders and files
    document.addEventListener('click', e => {
      const folderCard = e.target.closest('.folder-card');
      const fileRow = e.target.closest('.file-row');
      if (folderCard && document.getElementById('folder-grid').contains(folderCard)) {
        window.api.openPath(folderCard.dataset.path);
      } else if (fileRow && document.getElementById('files-list').contains(fileRow)) {
        window.api.openPath(fileRow.dataset.path);
      }
    });

    document.getElementById('files-config-btn').addEventListener('click', () => {
      App.openModal('Configure Folders', `
        <div style="color:var(--text-dim);font-size:12px;line-height:1.7;margin-bottom:16px">
          Add specific folder paths to monitor for recent file activity. The app will scan and show files modified in the last 7 days.
        </div>
        <div id="folder-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${(config.folders||[]).map((f,i)=>`
            <div style="display:flex;gap:10px;align-items:center">
              <input class="input input-mono" value="${f}" data-index="${i}" style="flex:1" />
              <button class="btn-icon danger" data-remove="${i}">✕</button>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:10px">
          <input class="input input-mono" id="new-folder" placeholder="C:\\Users\\…" style="flex:1" />
          <button class="btn" id="add-folder">Add</button>
        </div>
        <button class="btn btn-gold" id="save-folders" style="width:100%;margin-top:16px">Save</button>`);

      document.getElementById('add-folder').addEventListener('click', () => {
        const val = document.getElementById('new-folder').value.trim(); if (!val) return;
        config.folders = [...(config.folders||[]), val];
        App.closeModal();
        window.api.setData('files-config', config);
        App.navigate('files');
      });
      document.getElementById('save-folders').addEventListener('click', async () => {
        const inputs = document.querySelectorAll('#folder-list input[data-index]');
        config.folders = Array.from(inputs).map(i=>i.value.trim()).filter(Boolean);
        await window.api.setData('files-config', config);
        App.closeModal(); App.navigate('files');
      });
    });
  },
};