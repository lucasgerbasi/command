Modules.bookmarks = {
  activeCategory: 'All',

  async render(container) {
    const bookmarks = await window.api.getData('bookmarks');
    container.innerHTML = `
      ${Utils.modHead('Bookmarks', 'Bookmarks', 'Apps & websites', `<button class="btn btn-gold" id="bm-add">+ Add</button>`)}
      <div class="bm-toolbar">
        <input class="input" id="bm-search" placeholder="Search…" style="flex:1;max-width:260px" />
      </div>
      <div class="bm-cats" id="bm-cats"></div>
      <div class="bm-grid" id="bm-grid"></div>`;

    let cur = [...bookmarks];
    const cats = () => ['All', ...new Set(cur.map(b => b.category).filter(Boolean))];

    const renderCats = () => {
      document.getElementById('bm-cats').innerHTML = cats().map(c =>
        `<div class="cat-pill ${c === this.activeCategory ? 'active' : ''}" data-cat="${c}">${c}</div>`
      ).join('');
    };

    const renderGrid = () => {
      const filtered = this.activeCategory === 'All' ? cur : cur.filter(b => b.category === this.activeCategory);
      const el = document.getElementById('bm-grid');
      if (!filtered.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">◉</div><div class="empty-text">No bookmarks</div></div>`;
        return;
      }
      el.innerHTML = filtered.map((b, i) => `
        <div class="bm-card" data-id="${b.id}" data-drag-idx="${i}" title="${b.type === 'app' ? (b.path || 'No path set') : (b.url || '')}">
          <div class="bm-card-actions">
            <button class="bm-edit btn-icon" data-id="${b.id}" title="Edit">✎</button>
            <button class="bm-remove btn-icon danger" data-id="${b.id}" title="Remove">✕</button>
          </div>
          <span class="bm-type-badge">${b.type === 'app' ? 'APP' : 'WEB'}</span>
          <div class="bm-card-icon">${b.icon || '📎'}</div>
          <div class="bm-card-name">${b.name}</div>
          ${b.category ? `<div class="bm-card-cat">${b.category}</div>` : ''}
          ${b.type === 'app' && !b.path ? `<div style="font-size:8px;color:var(--red);margin-top:2px">no path set</div>` : ''}
        </div>`).join('') +
        `<div class="bm-add-card" id="bm-add-card">
          <div style="font-size:20px">+</div>
          <div style="font-size:10px;color:var(--text-muted)">Add</div>
        </div>`;
      // Drag reorder: work on a fresh copy of IDs to avoid reference aliasing with cur
      const filteredIds = filtered.map(b => b.id);
      Utils.makeDraggableList(el, filtered.map(b => ({...b})), async (reordered) => {
        // Build new full order: reordered filtered items in their new positions,
        // with non-filtered items staying in their relative slots
        const reorderedIds = reordered.map(b => b.id);
        const newCur = [];
        let ri = 0;
        for (const b of cur) {
          if (filteredIds.includes(b.id)) {
            // Replace with the reordered version
            newCur.push(cur.find(x => x.id === reorderedIds[ri++]));
          } else {
            newCur.push(b);
          }
        }
        cur.length = 0;
        cur.push(...newCur);
        await window.api.setData('bookmarks', cur);
        renderGrid();
      });
    };

    renderCats();
    renderGrid();

    // ---- Search ----
    document.getElementById('bm-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      cur = q ? bookmarks.filter(b => b.name.toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q)) : [...bookmarks];
      renderCats();
      renderGrid();
    });

    // ---- Category pills ----
    document.getElementById('bm-cats').addEventListener('click', e => {
      const p = e.target.closest('.cat-pill');
      if (!p) return;
      this.activeCategory = p.dataset.cat;
      renderCats();
      renderGrid();
    });

    // ---- Shared modal builder for Add + Edit ----
    const openBookmarkModal = (existing) => {
      const isEdit = !!existing;
      const b = existing || {};
      App.openModal(isEdit ? 'Edit Bookmark' : 'Add Bookmark', `
        <div class="form-row"><label class="form-label">Type</label>
          <div style="display:flex;gap:12px;font-size:13px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="bm-type" value="web" ${b.type !== 'app' ? 'checked' : ''} /> Website
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="radio" name="bm-type" value="app" ${b.type === 'app' ? 'checked' : ''} /> App / Executable
            </label>
          </div>
        </div>
        <div class="form-row"><label class="form-label">Name</label>
          <input class="input" id="m-name" value="${b.name || ''}" placeholder="GitHub, VS Code…" />
        </div>
        <div class="form-row" id="m-url-row" style="${b.type === 'app' ? 'display:none' : ''}">
          <label class="form-label">URL</label>
          <input class="input input-mono" id="m-url" value="${b.url || ''}" placeholder="https://…" />
        </div>
        <div class="form-row" id="m-path-row" style="${b.type === 'app' ? '' : 'display:none'}">
          <label class="form-label">App Path (.exe or folder)</label>
          <input class="input input-mono" id="m-path" value="${b.path || ''}" placeholder="C:\\Program Files\\…\\app.exe" />
          <div style="font-size:9px;color:var(--text-muted);margin-top:3px;font-family:var(--mono)">
            Full path to the .exe — e.g. C:\Users\you\AppData\Local\Programs\cursor\Cursor.exe
          </div>
        </div>
        <div class="form-row-h">
          <div class="form-row flex-1"><label class="form-label">Icon (emoji)</label>
            <input class="input" id="m-icon" value="${b.icon || ''}" placeholder="📎" maxlength="2" />
          </div>
          <div class="form-row flex-1"><label class="form-label">Category</label>
            <input class="input" id="m-cat" value="${b.category || ''}" placeholder="Dev, Design…" />
          </div>
        </div>
        <button class="btn btn-gold" id="m-save" style="width:100%;margin-top:4px">
          ${isEdit ? 'Save Changes' : 'Add Bookmark'}
        </button>`);

      // Toggle URL/Path rows when type radio changes
      document.querySelectorAll('[name="bm-type"]').forEach(r => r.addEventListener('change', () => {
        const isApp = document.querySelector('[name="bm-type"]:checked').value === 'app';
        document.getElementById('m-url-row').style.display = isApp ? 'none' : '';
        document.getElementById('m-path-row').style.display = isApp ? '' : 'none';
      }));

      document.getElementById('m-save').addEventListener('click', async () => {
        const type = document.querySelector('[name="bm-type"]:checked').value;
        const name = document.getElementById('m-name').value.trim();
        const url  = document.getElementById('m-url').value.trim();
        const appPath = document.getElementById('m-path').value.trim();
        const icon = document.getElementById('m-icon').value.trim() || '📎';
        const category = document.getElementById('m-cat').value.trim() || 'General';

        if (!name) return App.toast('Name required', 'error');
        if (type === 'web' && !url) return App.toast('URL required', 'error');
        if (type === 'app' && !appPath) return App.toast('App path required', 'error');

        if (isEdit) {
          // Update in-place
          const idx = bookmarks.findIndex(x => x.id === b.id);
          if (idx !== -1) {
            bookmarks[idx] = { ...bookmarks[idx], name, type, icon, category };
            if (type === 'web') { bookmarks[idx].url = url; delete bookmarks[idx].path; }
            else                { bookmarks[idx].path = appPath; delete bookmarks[idx].url; }
          }
        } else {
          const newBm = { id: Date.now(), name, type, icon, category };
          if (type === 'web') newBm.url = url;
          else                newBm.path = appPath;
          bookmarks.push(newBm);
        }

        cur = [...bookmarks];
        await window.api.setData('bookmarks', bookmarks);
        App.closeModal();
        this.activeCategory = 'All';
        renderCats();
        renderGrid();
        App.toast(isEdit ? 'Saved' : 'Added');
      });
    };

    // ---- Add button ----
    document.getElementById('bm-add').addEventListener('click', () => openBookmarkModal(null));

    // ---- Grid click handler ----
    document.getElementById('bm-grid').addEventListener('click', async e => {
      // Remove
      const rem = e.target.closest('.bm-remove');
      if (rem) {
        const id = +rem.dataset.id;
        bookmarks.splice(bookmarks.findIndex(b => b.id === id), 1);
        cur = [...bookmarks];
        await window.api.setData('bookmarks', bookmarks);
        renderCats();
        renderGrid();
        return;
      }

      // Edit
      const edit = e.target.closest('.bm-edit');
      if (edit) {
        const b = bookmarks.find(b => b.id === +edit.dataset.id);
        if (b) openBookmarkModal(b);
        return;
      }

      // Add card
      if (e.target.closest('#bm-add-card')) {
        openBookmarkModal(null);
        return;
      }

      // Open — click anywhere else on the card
      const card = e.target.closest('.bm-card[data-id]');
      if (card) {
        const b = bookmarks.find(b => b.id === +card.dataset.id);
        if (!b) return;
        if (b.type === 'web') {
          if (!b.url) return App.toast('No URL set', 'error');
          window.api.openURL(b.url);
        } else {
          // App: openPath via shell.openPath — works for .exe, folders, any file
          if (!b.path) {
            App.toast('No path set — click ✎ to edit', 'error');
            return;
          }
          window.api.openPath(b.path);
        }
      }
    });
  },
};
