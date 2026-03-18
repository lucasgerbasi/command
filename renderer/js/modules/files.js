Modules.files = {
  async render(container) {
    container.innerHTML = `
      ${Utils.modHead('Folders', 'Recent Folders', 'Last 40 active folders across your entire system')}
      <div class="folder-grid" id="history-grid">
        <div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><div class="empty-text">Scanning OS Activity...</div></div>
      </div>
    `;

    const el = document.getElementById('history-grid');
    
    // Fetch global folders directly from the OS-level hook we built
    const recentFolders = await window.api.getOSFolders().catch(()=>[]);
    
    if (!recentFolders.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><div class="empty-text">No recent OS activity found.</div></div>`;
      return;
    }
    
    el.innerHTML = recentFolders.map(f => `
      <div class="folder-card" data-path="${f.path}">
        <div class="folder-icon">📁</div>
        <div class="folder-info">
          <div class="folder-name">${f.name}</div>
          <div class="folder-path">${f.path}</div>
        </div>
      </div>
    `).join('');

    container.addEventListener('click', e => {
      const card = e.target.closest('.folder-card');
      if (card) window.api.openPath(card.dataset.path);
    });
  }
};