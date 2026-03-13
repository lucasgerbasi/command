Modules.links = {
  async render(container) {
    const links = await window.api.getData('links');
    container.innerHTML = `
      ${Utils.modHead('06 / Links', 'Quick Links', 'Click to open in browser', `<button class="btn btn-gold" id="link-add">+ Add Link</button>`)}
      <div class="links-wrap">
        <div class="links-list" id="links-list"></div>
      </div>`;

    const render = () => {
      const el = document.getElementById('links-list');
      el.innerHTML = links.map(l=>`
        <div class="link-row" data-id="${l.id}">
          <span class="link-row-icon">${l.icon||'🔗'}</span>
          <span class="link-row-name">${l.name}</span>
          <span class="link-row-url">${Utils.truncate(l.url,60)}</span>
          <button class="link-row-remove btn-icon danger" data-id="${l.id}">✕</button>
        </div>`).join('') +
        `<div class="link-add-row" id="link-add-inline"><span style="font-size:14px">+</span> Add link</div>`;
    };
    render();

    const addLink = () => {
      App.openModal('Add Quick Link', `
        <div class="form-row"><label class="form-label">Name</label><input class="input" id="m-name" placeholder="GitHub" /></div>
        <div class="form-row"><label class="form-label">URL</label><input class="input input-mono" id="m-url" placeholder="https://…" /></div>
        <div class="form-row"><label class="form-label">Icon (emoji)</label><input class="input" id="m-icon" placeholder="🔗" maxlength="2" style="width:80px" /></div>
        <button class="btn btn-gold" id="m-save" style="width:100%;margin-top:4px">Add</button>`);
      document.getElementById('m-save').addEventListener('click', async ()=>{
        const name=document.getElementById('m-name').value.trim();
        const url=document.getElementById('m-url').value.trim();
        const icon=document.getElementById('m-icon').value.trim()||'🔗';
        if(!name||!url) return App.toast('Name and URL required','error');
        links.push({id:Date.now(),name,url,icon});
        await window.api.setData('links',links);
        App.closeModal(); render(); App.toast('Added');
      });
    };

    document.getElementById('link-add').addEventListener('click', addLink);
    document.getElementById('links-list').addEventListener('click', async e=>{
      if (e.target.closest('.link-row-remove')) {
        const id=+e.target.closest('.link-row-remove').dataset.id;
        links.splice(links.findIndex(l=>l.id===id),1);
        await window.api.setData('links',links); render(); return;
      }
      if (e.target.closest('#link-add-inline')) { addLink(); return; }
      const row=e.target.closest('.link-row[data-id]');
      if (row) window.api.openURL(links.find(l=>l.id===+row.dataset.id)?.url);
    });
  },
};
