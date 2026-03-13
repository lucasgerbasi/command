Modules.notes = {
  activeId: null, saveTimeout: null,
  async render(container) {
    const notes = await window.api.getData('notes');
    container.innerHTML = `
      ${Utils.modHead('05 / Notes', 'Quick Notes', '')}
      <div class="notes-grid">
        <div class="notes-list">
          <div class="notes-list-hdr"><span>Notes (${notes.length})</span><button class="btn-icon" id="new-note" style="font-size:16px">+</button></div>
          <div id="note-items"></div>
        </div>
        <div class="notes-editor">
          <div class="notes-empty" id="notes-empty">
            <div style="font-size:28px;opacity:.2">✎</div>
            <div style="font-size:12px">Select or create a note</div>
            <button class="btn btn-gold" id="notes-empty-new" style="margin-top:10px">New Note</button>
          </div>
          <div id="note-edit" style="display:none;flex-direction:column;height:100%">
            <div class="notes-editor-hdr">
              <input class="notes-editor-title" id="note-title" placeholder="Untitled…" />
              <button class="btn-icon danger" id="del-note">🗑</button>
            </div>
            <textarea class="notes-editor-body" id="note-body" placeholder="Start writing…"></textarea>
          </div>
        </div>
      </div>`;

    let cur = [...notes];
    const renderList = () => {
      const el = document.getElementById('note-items');
      if (!cur.length) { el.innerHTML=`<div class="empty-state" style="padding:16px"><div class="empty-text">No notes</div></div>`; return; }
      el.innerHTML = cur.map(n=>`
        <div class="note-item ${n.id===this.activeId?'active':''}" data-id="${n.id}">
          <div class="note-item-title">${n.title||'Untitled'}</div>
          <div class="note-item-preview">${Utils.truncate(n.body||'',58)}</div>
          <div class="note-item-date">${Utils.timeAgo(n.updatedAt||n.createdAt)}</div>
        </div>`).join('');
    };
    const open = (id) => {
      this.activeId = id;
      const n = cur.find(n=>n.id===id); if (!n) return;
      document.getElementById('notes-empty').style.display='none';
      const e=document.getElementById('note-edit'); e.style.display='flex';
      document.getElementById('note-title').value=n.title||'';
      document.getElementById('note-body').value=n.body||'';
      renderList(); document.getElementById('note-body').focus();
    };
    const newNote = async () => {
      const n={id:Utils.uid(),title:'',body:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      cur.unshift(n); await window.api.setData('notes',cur); renderList(); open(n.id);
    };
    const save = async () => {
      if (!this.activeId) return;
      const idx=cur.findIndex(n=>n.id===this.activeId); if(idx===-1) return;
      cur[idx].title=document.getElementById('note-title').value;
      cur[idx].body=document.getElementById('note-body').value;
      cur[idx].updatedAt=new Date().toISOString();
      await window.api.setData('notes',cur); renderList();
    };

    renderList();
    document.getElementById('new-note').addEventListener('click', newNote);
    document.getElementById('notes-empty-new')?.addEventListener('click', newNote);
    document.getElementById('note-items').addEventListener('click', e=>{ const i=e.target.closest('.note-item'); if(i) open(i.dataset.id); });
    const autoSave=()=>{ clearTimeout(this.saveTimeout); this.saveTimeout=setTimeout(save,500); };
    document.getElementById('note-title').addEventListener('input', autoSave);
    document.getElementById('note-body').addEventListener('input', autoSave);
    document.getElementById('del-note').addEventListener('click', async ()=>{
      if(!this.activeId) return;
      cur=cur.filter(n=>n.id!==this.activeId); await window.api.setData('notes',cur);
      this.activeId=null;
      document.getElementById('notes-empty').style.display='flex';
      document.getElementById('note-edit').style.display='none';
      renderList(); App.toast('Deleted');
    });
  },
};
