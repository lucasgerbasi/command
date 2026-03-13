Modules.bookmarks = {
  activeCategory: 'All',
  async render(container) {
    const bookmarks = await window.api.getData('bookmarks');
    container.innerHTML = `
      ${Utils.modHead('07 / Bookmarks', 'Bookmarks', 'Apps & websites', `<button class="btn btn-gold" id="bm-add">+ Add</button>`)}
      <div class="bm-toolbar">
        <input class="input" id="bm-search" placeholder="Search…" style="flex:1;max-width:260px" />
      </div>
      <div class="bm-cats" id="bm-cats"></div>
      <div class="bm-grid" id="bm-grid"></div>`;

    let cur = [...bookmarks];
    const cats = () => ['All', ...new Set(cur.map(b=>b.category).filter(Boolean))];

    const renderCats = () => {
      document.getElementById('bm-cats').innerHTML = cats().map(c=>
        `<div class="cat-pill ${c===this.activeCategory?'active':''}" data-cat="${c}">${c}</div>`
      ).join('');
    };
    const renderGrid = () => {
      const filtered = this.activeCategory==='All' ? cur : cur.filter(b=>b.category===this.activeCategory);
      const el = document.getElementById('bm-grid');
      if (!filtered.length) { el.innerHTML=`<div class="empty-state"><div class="empty-icon">◉</div><div class="empty-text">No bookmarks</div></div>`; return; }
      el.innerHTML = filtered.map(b=>`
        <div class="bm-card" data-id="${b.id}">
          <button class="bm-remove btn-icon danger" data-id="${b.id}">✕</button>
          <span class="bm-type-badge">${b.type==='app'?'APP':'WEB'}</span>
          <div class="bm-card-icon">${b.icon||'📎'}</div>
          <div class="bm-card-name">${b.name}</div>
          ${b.category?`<div class="bm-card-cat">${b.category}</div>`:''}
        </div>`).join('') +
        `<div class="bm-add-card" id="bm-add-card"><div style="font-size:20px">+</div><div style="font-size:10px;color:var(--text-muted)">Add</div></div>`;
    };
    renderCats(); renderGrid();

    document.getElementById('bm-search').addEventListener('input', e=>{
      const q=e.target.value.toLowerCase();
      cur = q ? bookmarks.filter(b=>b.name.toLowerCase().includes(q)||(b.category||'').toLowerCase().includes(q)) : [...bookmarks];
      renderCats(); renderGrid();
    });
    document.getElementById('bm-cats').addEventListener('click', e=>{
      const p=e.target.closest('.cat-pill'); if(!p) return;
      this.activeCategory=p.dataset.cat; renderCats(); renderGrid();
    });

    const openAddModal = () => {
      App.openModal('Add Bookmark', `
        <div class="form-row"><label class="form-label">Type</label>
          <div style="display:flex;gap:12px;font-size:13px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="bm-type" value="web" checked /> Website</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="bm-type" value="app" /> App</label>
          </div></div>
        <div class="form-row"><label class="form-label">Name</label><input class="input" id="m-name" /></div>
        <div class="form-row" id="m-url-row"><label class="form-label">URL</label><input class="input input-mono" id="m-url" placeholder="https://…" /></div>
        <div class="form-row" id="m-path-row" style="display:none"><label class="form-label">App Path</label><input class="input input-mono" id="m-path" /></div>
        <div class="form-row-h">
          <div class="form-row flex-1"><label class="form-label">Icon (emoji)</label><input class="input" id="m-icon" placeholder="📎" maxlength="2" /></div>
          <div class="form-row flex-1"><label class="form-label">Category</label><input class="input" id="m-cat" placeholder="Dev, Design…" /></div>
        </div>
        <button class="btn btn-gold" id="m-save" style="width:100%;margin-top:4px">Add Bookmark</button>`);
      document.querySelectorAll('[name="bm-type"]').forEach(r=>r.addEventListener('change',()=>{
        const isApp=document.querySelector('[name="bm-type"]:checked').value==='app';
        document.getElementById('m-url-row').style.display=isApp?'none':'';
        document.getElementById('m-path-row').style.display=isApp?'':'none';
      }));
      document.getElementById('m-save').addEventListener('click', async ()=>{
        const type=document.querySelector('[name="bm-type"]:checked').value;
        const name=document.getElementById('m-name').value.trim();
        const url=document.getElementById('m-url').value.trim();
        const path=document.getElementById('m-path').value.trim();
        const icon=document.getElementById('m-icon').value.trim()||'📎';
        const category=document.getElementById('m-cat').value.trim()||'General';
        if(!name) return App.toast('Name required','error');
        if(type==='web'&&!url) return App.toast('URL required','error');
        if(type==='app'&&!path) return App.toast('Path required','error');
        const bm={id:Date.now(),name,type,icon,category};
        if(type==='web') bm.url=url; else bm.path=path;
        bookmarks.push(bm); cur=[...bookmarks];
        await window.api.setData('bookmarks',bookmarks);
        App.closeModal(); this.activeCategory='All'; renderCats(); renderGrid(); App.toast('Added');
      });
    };

    document.getElementById('bm-add').addEventListener('click', openAddModal);
    document.getElementById('bm-grid').addEventListener('click', async e=>{
      const rem=e.target.closest('.bm-remove');
      if(rem){ const id=+rem.dataset.id; bookmarks.splice(bookmarks.findIndex(b=>b.id===id),1); cur=[...bookmarks]; await window.api.setData('bookmarks',bookmarks); renderCats(); renderGrid(); return; }
      if(e.target.closest('#bm-add-card')){ openAddModal(); return; }
      const card=e.target.closest('.bm-card[data-id]');
      if(card){ const b=bookmarks.find(b=>b.id===+card.dataset.id); if(!b) return; if(b.type==='web') window.api.openURL(b.url); else window.api.openPath(b.path); }
    });
  },
};
