Modules.launcher = {
  async render(container) {
    const aliases = await window.api.getData('launcher');
    container.innerHTML = `
      ${Utils.modHead('03 / Launcher', 'Quick Launch', 'Type an alias · press Enter', `<button class="btn btn-gold" id="add-alias-btn">+ Add Alias</button>`)}
      <div class="launcher-wrap">
        <div class="launch-input-wrap">
          <span class="launch-prompt">›</span>
          <input class="launch-input" id="launch-input" placeholder="Type an alias (e.g. gh, mail)…" autocomplete="off" spellcheck="false" />
        </div>
        <div class="launch-suggest" id="launch-suggest"></div>
        <div class="section-label">Configured Aliases</div>
        <div class="aliases-list" id="aliases-list"></div>
      </div>`;

    const renderAliases = (list) => {
      const el = document.getElementById('aliases-list');
      if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚡</div><div class="empty-text">No aliases yet</div></div>`; return; }
      el.innerHTML = list.map((a,i) => `
        <div class="alias-row">
          <span class="alias-key">${a.alias}</span>
          <span class="alias-name">${a.name}</span>
          <span class="alias-url">${Utils.truncate(a.url,52)}</span>
          <button class="btn-icon danger" data-index="${i}" data-action="remove">✕</button>
        </div>`).join('');
    };
    renderAliases(aliases);

    const input = document.getElementById('launch-input');
    const suggest = document.getElementById('launch-suggest');
    let matches = [], selectedIdx = 0;

    const showSuggest = (val) => {
      if (!val.trim()) { suggest.classList.remove('visible'); return; }
      matches = aliases.filter(a => a.alias.startsWith(val.toLowerCase()) || a.name.toLowerCase().includes(val.toLowerCase()));
      if (!matches.length) { suggest.classList.remove('visible'); return; }
      selectedIdx = 0;
      suggest.classList.add('visible');
      suggest.innerHTML = matches.map((m,i) => `
        <div class="launch-match ${i===0?'selected':''}" data-index="${i}">
          <span class="launch-alias">${m.alias}</span>
          <span class="launch-name">${m.name}</span>
          <span class="launch-url">${Utils.truncate(m.url,44)}</span>
        </div>`).join('');
      suggest.querySelectorAll('.launch-match').forEach(el => {
        el.addEventListener('click', () => { window.api.openURL(matches[+el.dataset.index].url); input.value=''; suggest.classList.remove('visible'); });
        el.addEventListener('mouseenter', () => { selectedIdx=+el.dataset.index; updateSel(); });
      });
    };
    const updateSel = () => suggest.querySelectorAll('.launch-match').forEach((el,i) => el.classList.toggle('selected',i===selectedIdx));

    input.addEventListener('input', e => showSuggest(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key==='ArrowDown') { e.preventDefault(); selectedIdx=Math.min(selectedIdx+1,matches.length-1); updateSel(); }
      else if (e.key==='ArrowUp') { e.preventDefault(); selectedIdx=Math.max(selectedIdx-1,0); updateSel(); }
      else if (e.key==='Enter') {
        const t = matches[selectedIdx] || aliases.find(a=>a.alias===input.value.trim().toLowerCase());
        if (t) { window.api.openURL(t.url); input.value=''; suggest.classList.remove('visible'); App.toast(`Opening ${t.name}…`); }
      } else if (e.key==='Escape') { input.value=''; suggest.classList.remove('visible'); }
    });
    input.focus();

    document.getElementById('add-alias-btn').addEventListener('click', () => {
      App.openModal('Add Alias', `
        <div class="form-row"><label class="form-label">Alias</label><input class="input input-mono" id="m-alias" placeholder="gh" /></div>
        <div class="form-row"><label class="form-label">Name</label><input class="input" id="m-name" placeholder="GitHub" /></div>
        <div class="form-row"><label class="form-label">URL</label><input class="input input-mono" id="m-url" placeholder="https://…" /></div>
        <button class="btn btn-gold" id="m-save" style="width:100%;margin-top:4px">Save</button>`);
      document.getElementById('m-save').addEventListener('click', async () => {
        const alias = document.getElementById('m-alias').value.trim().toLowerCase();
        const name  = document.getElementById('m-name').value.trim();
        const url   = document.getElementById('m-url').value.trim();
        if (!alias||!url) return App.toast('Alias and URL required','error');
        aliases.push({alias, name:name||url, url});
        await window.api.setData('launcher', aliases);
        App.closeModal(); App.toast('Alias saved'); renderAliases(aliases);
      });
    });

    document.getElementById('aliases-list').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action="remove"]'); if (!btn) return;
      aliases.splice(+btn.dataset.index, 1);
      await window.api.setData('launcher', aliases);
      renderAliases(aliases); App.toast('Removed');
    });
  },
};
