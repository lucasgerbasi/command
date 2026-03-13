Modules.files = {
  async render(container) {
    const config = await window.api.getData('files-config').catch(()=>null) || {folders:[]};
    const recentFolders = await window.api.getData('recent-folders').catch(()=>[]) || [];
    
    container.innerHTML = `${Utils.modHead('13 / Folders', 'Active Folders', 'Tracked workspaces and manually opened directories', `<button class="btn" id="files-config-btn">⚙ Configure Targets</button>`)}
      <div>
        <div class="section-label">Opened via App</div>
        <div class="folder-grid" id="history-grid"></div>

        <div class="section-label" style="margin-top:32px">Auto-Monitored Workspaces</div>
        <div class="files-toolbar">
          <input class="input" id="folders-search" placeholder="Filter folders…" style="flex:1;max-width:400px" />
        </div>
        <div class="folder-grid" id="monitored-grid">
          <div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◫</div><div class="empty-text">Loading workspaces...</div></div>
        </div>
      </div>`;

    const renderGrid = (list, elementId, emptyMsg) => {
      const el = document.getElementById(elementId);
      if (!list || !list.length) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:12px;grid-column:1/-1;padding:12px 0;">${emptyMsg}</div>`;
        return;
      }
      el.innerHTML = list.slice(0, 16).map(f => `
        <div class="folder-card" data-path="${f.path}">
          <div class="folder-icon">📁</div>
          <div class="folder-info">
            <div class="folder-name">${f.name}</div>
            <div class="folder-path">${f.path}</div>
          </div>
        </div>`).join('');
    };

    // Render manual history
    renderGrid(recentFolders, 'history-grid', 'No folders opened through the app yet.');

    // Load active folders (using the file scanner backend)
    const loadMonitored = async () => {
      try {
        const active = await window.api.getRecentFiles(); 
        window._cachedActiveFolders = active || [];
        renderGrid(window._cachedActiveFolders, 'monitored-grid', 'No activity found in monitored paths recently.');
      } catch { renderGrid([], 'monitored-grid', 'Failed to load.'); }
    };
    loadMonitored();

    document.getElementById('folders-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const active = window._cachedActiveFolders || [];
      renderGrid(q ? active.filter(f => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) : active, 'monitored-grid', 'No matches found.');
    });

    // Delegate clicks for both grids
    container.addEventListener('click', e => {
      const card = e.target.closest('.folder-card');
      if (card) window.api.openPath(card.dataset.path);
    });

    document.getElementById('files-config-btn').addEventListener('click', () => {
      App.openModal('Configure Folders', `
        <div style="color:var(--text-dim);font-size:12px;line-height:1.7;margin-bottom:16px">
          Add specific base folder paths (like your Projects directory). The app will automatically surface the exact subfolders where you've been working.
        </div>
        <div id="folder-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${(config.folders||[]).map((f,i)=>`
            <div style="display:flex;gap:10px;align-items:center">
              <input class="input input-mono" value="${f}" data-index="${i}" style="flex:1" />
              <button class="btn-icon danger" data-remove="${i}">✕</button>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:10px">
          <input class="input input-mono" id="new-folder" placeholder="C:\\Users\\YourName\\Documents" style="flex:1" />
          <button class="btn" id="add-folder">Add</button>
        </div>
        <button class="btn btn-gold" id="save-folders" style="width:100%;margin-top:16px">Save Configuration</button>`);

      // Timeouts ensure listeners bind *after* the modal is injected to the DOM
      setTimeout(() => {
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
          App.closeModal(); 
          App.navigate('files');
        });
      }, 50);
    });
  },
};