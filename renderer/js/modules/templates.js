Modules.templates = {
  activeId: null,
  saveTimeout: null,

  async render(container) {
    const templates = await window.api.getData('templates') || [];
    container.innerHTML = `
      ${Utils.modHead('02 / Templates', 'Clipboard Templates', 'One-click copy for frequently used text')}
      <div class="tmpl-grid">
        <div class="tmpl-list">
          <div class="tmpl-list-hdr">
            <span>Templates (${templates.length})</span>
            <button class="btn-icon" id="new-tmpl-btn" style="font-size:16px">+</button>
          </div>
          <div id="tmpl-list-items"></div>
        </div>
        <div class="tmpl-editor" id="tmpl-editor">
          <div class="empty-state" id="tmpl-empty" style="height:100%">
            <div class="empty-icon">⊟</div>
            <div class="empty-text">Select or create a template</div>
            <button class="btn btn-gold" id="tmpl-empty-new" style="margin-top:10px">New Template</button>
          </div>
          <div id="tmpl-edit-area" style="display:none;flex-direction:column;height:100%">
            <div class="tmpl-editor-hdr">
              <input class="tmpl-editor-title" id="tmpl-title-input" placeholder="Template name…" />
              <button class="btn-icon danger" id="del-tmpl-btn">🗑</button>
            </div>
            <div class="tmpl-editor-meta">
              <input class="tmpl-tag-input" id="tmpl-tag-input" placeholder="Tag (e.g. Email, Code)" />
            </div>
            <textarea class="tmpl-editor-body" id="tmpl-body-input" placeholder="Your template content…"></textarea>
            <button class="tmpl-copy-big" id="tmpl-copy-btn">⎘  Copy to Clipboard</button>
          </div>
        </div>
      </div>`;

    let current = [...templates];

    const renderList = () => {
      const el = document.getElementById('tmpl-list-items');
      if (!current.length) { el.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-text">No templates yet</div></div>`; return; }
      el.innerHTML = current.map(t => `
        <div class="tmpl-item ${t.id===this.activeId?'active':''}" data-id="${t.id}">
          <div class="tmpl-item-title">${t.title||'Untitled'}</div>
          <div class="tmpl-item-preview">${Utils.truncate(t.body||'',60)}</div>
          ${t.tag ? `<div class="tmpl-item-tag">${t.tag}</div>` : ''}
        </div>`).join('');
    };

    const openTemplate = (id) => {
      this.activeId = id;
      const t = current.find(t => t.id===id); if (!t) return;
      document.getElementById('tmpl-empty').style.display = 'none';
      const area = document.getElementById('tmpl-edit-area');
      area.style.display = 'flex';
      document.getElementById('tmpl-title-input').value = t.title||'';
      document.getElementById('tmpl-tag-input').value = t.tag||'';
      document.getElementById('tmpl-body-input').value = t.body||'';
      renderList();
    };

    const newTemplate = async () => {
      const t = { id: Utils.uid(), title:'', tag:'', body:'', createdAt: new Date().toISOString() };
      current.unshift(t);
      await window.api.setData('templates', current);
      renderList();
      openTemplate(t.id);
    };

    const save = async () => {
      if (!this.activeId) return;
      const idx = current.findIndex(t => t.id===this.activeId); if (idx===-1) return;
      current[idx].title = document.getElementById('tmpl-title-input').value;
      current[idx].tag   = document.getElementById('tmpl-tag-input').value;
      current[idx].body  = document.getElementById('tmpl-body-input').value;
      await window.api.setData('templates', current);
      renderList();
    };

    renderList();

    document.getElementById('new-tmpl-btn').addEventListener('click', newTemplate);
    document.getElementById('tmpl-empty-new')?.addEventListener('click', newTemplate);
    document.getElementById('tmpl-list-items').addEventListener('click', e => {
      const item = e.target.closest('.tmpl-item'); if (item) openTemplate(item.dataset.id);
    });

    const autoSave = () => { clearTimeout(this.saveTimeout); this.saveTimeout = setTimeout(save, 500); };
    document.getElementById('tmpl-title-input').addEventListener('input', autoSave);
    document.getElementById('tmpl-tag-input').addEventListener('input', autoSave);
    document.getElementById('tmpl-body-input').addEventListener('input', autoSave);

    document.getElementById('tmpl-copy-btn').addEventListener('click', async () => {
      const body = document.getElementById('tmpl-body-input').value;
      if (!body) return App.toast('Nothing to copy', 'error');
      await window.api.writeClipboard(body);
      App.toast('Copied to clipboard', 'success');
    });

    document.getElementById('del-tmpl-btn').addEventListener('click', async () => {
      if (!this.activeId) return;
      current = current.filter(t => t.id !== this.activeId);
      await window.api.setData('templates', current);
      this.activeId = null;
      document.getElementById('tmpl-empty').style.display = 'flex';
      document.getElementById('tmpl-edit-area').style.display = 'none';
      renderList();
      App.toast('Template deleted');
    });
  },
};
