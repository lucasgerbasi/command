Modules.launcher = {
  async render(container) {
    const aliases = await window.api.getData('launcher');
    container.innerHTML = `
      ${Utils.modHead('Launcher', 'Quick Launch', 'Type an alias · press Enter', `<button class="btn btn-gold" id="add-alias-btn">+ Add Alias</button>`)}
      <div class="launcher-wrap">
        <div class="launch-input-wrap">
          <span class="launch-prompt">›</span>
          <input class="launch-input" id="launch-input" placeholder="Type an alias (e.g. gh, star)…" autocomplete="off" spellcheck="false" />
        </div>
        <div class="launch-suggest" id="launch-suggest"></div>
        <div class="section-label">Configured Aliases</div>
        <div class="aliases-list" id="aliases-list"></div>
      </div>`;

    const open = (a) => {
      if (a.type === 'script' && a.path) {
        window.api.runScript(a.path).then(r => {
          if (r?.ok) App.toast(`▶ Running: ${a.name}`);
          else App.toast(`Script error: ${r?.error || 'unknown'}`, 'error');
        });
      } else if (a.type === 'app' && a.path) { window.api.openPath(a.path); App.toast(`Launching ${a.name}…`); }
      else if (a.url) { window.api.openURL(a.url); App.toast(`Opening ${a.name}…`); }
    };

    const renderAliases = (list) => {
      const el = document.getElementById('aliases-list');
      if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚡</div><div class="empty-text">No aliases yet</div></div>`; return; }
      el.innerHTML = list.map((a, i) => `
        <div class="alias-row" data-alias-idx="${i}">
          <span class="drag-handle">⠿</span>
          <span class="alias-key">${a.alias}</span>
          ${a.type === 'app' ? `<span style="font-size:9px;padding:1px 5px;background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);flex-shrink:0">APP</span>` : ''}
          ${a.type === 'script' ? `<span style="font-size:9px;padding:1px 5px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);color:#60a5fa;font-family:var(--mono);flex-shrink:0">SCRIPT</span>` : ''}
          <span class="alias-name">${a.name}</span>
          <span class="alias-url">${Utils.truncate(a.url || a.path || '', 48)}</span>
          <button class="btn-icon danger" data-index="${i}" data-action="remove">✕</button>
        </div>`).join('');

      // Inline drag — never passes the live array to a utility, works purely on indices
      let dragFrom = null;
      el.querySelectorAll('.alias-row').forEach(row => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', e => {
          dragFrom = +row.dataset.aliasIdx;
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => row.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          el.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
          dragFrom = null;
        });
        row.addEventListener('dragover', e => {
          e.preventDefault();
          if (dragFrom === null || dragFrom === +row.dataset.aliasIdx) return;
          el.querySelectorAll('.drag-over').forEach(r => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', async e => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const from = dragFrom;
          const to   = +row.dataset.aliasIdx;
          if (from === null || from === to) return;
          // Reorder: remove from old position, insert at new position
          const copy = [...aliases];
          const [item] = copy.splice(from, 1);
          copy.splice(to, 0, item);
          // Mutate aliases in place to keep all other references valid
          aliases.length = 0;
          copy.forEach(a => aliases.push(a));
          await window.api.setData('launcher', aliases);
          renderAliases(aliases);
        });
      });
    };
    renderAliases(aliases);

    const input = document.getElementById('launch-input');
    const suggest = document.getElementById('launch-suggest');
    let matches = [], selectedIdx = 0;

    const showSuggest = (val) => {
      if (!val.trim()) { suggest.classList.remove('visible'); return; }
      const q = val.toLowerCase();
      matches = aliases.filter(a => a.alias.startsWith(q) || a.name.toLowerCase().includes(q));
      if (!matches.length) { suggest.classList.remove('visible'); return; }
      selectedIdx = 0;
      suggest.classList.add('visible');
      suggest.innerHTML = matches.map((m, i) => `
        <div class="launch-match ${i===0?'selected':''}" data-index="${i}">
          <span class="launch-alias">${m.alias}</span>
          ${m.type === 'app' ? `<span style="font-size:9px;color:var(--text-muted);font-family:var(--mono);margin-right:4px">APP</span>` : ''}
          <span class="launch-name">${m.name}</span>
          <span class="launch-url">${Utils.truncate(m.url || m.path || '', 40)}</span>
        </div>`).join('');
      suggest.querySelectorAll('.launch-match').forEach(el => {
        el.addEventListener('click', () => { open(matches[+el.dataset.index]); input.value=''; suggest.classList.remove('visible'); });
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
        if (t) { open(t); input.value=''; suggest.classList.remove('visible'); }
      } else if (e.key==='Escape') { input.value=''; suggest.classList.remove('visible'); }
    });
    input.focus();

    // Add Alias modal — supports URL, App, and Script
    document.getElementById('add-alias-btn').addEventListener('click', () => {
      App.openModal('Add Alias', `
        <div class="form-row"><label class="form-label">Alias</label>
          <input class="input input-mono" id="m-alias" placeholder="star, vscode, deploy…" /></div>
        <div class="form-row" style="margin-top:10px"><label class="form-label">Name</label>
          <input class="input" id="m-name" placeholder="Stardew Valley, VS Code, Deploy Script…" /></div>
        <div class="form-row" style="margin-top:10px"><label class="form-label">Type</label>
          <div style="display:flex;gap:12px;font-size:13px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="alias-type" value="web" checked /> Website</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="alias-type" value="app" /> App / File</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="alias-type" value="script" /> Script (.bat/.ps1/.sh)</label>
          </div></div>
        <div id="alias-url-row" class="form-row" style="margin-top:10px">
          <label class="form-label">URL</label>
          <input class="input input-mono" id="m-url" placeholder="https://…" /></div>
        <div id="alias-path-row" class="form-row" style="margin-top:10px;display:none">
          <label class="form-label">Path</label>
          <input class="input input-mono" id="m-path" placeholder="C:\\path\\to\\file.exe or script.bat" />
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn" id="browse-script-btn" style="font-size:10px;display:none">Browse Script…</button>
          </div>
          <div style="font-size:9px;color:var(--text-muted);margin-top:3px;font-family:var(--mono)">Full path · supports %ENV% variables</div>
        </div>
        <button class="btn btn-gold" id="m-save" style="width:100%;margin-top:14px">Save Alias</button>`);

      const typeRadios = document.querySelectorAll('[name="alias-type"]');
      const updateTypeUI = () => {
        const type = document.querySelector('[name="alias-type"]:checked').value;
        document.getElementById('alias-url-row').style.display  = type === 'web' ? '' : 'none';
        document.getElementById('alias-path-row').style.display = type !== 'web' ? '' : 'none';
        document.getElementById('browse-script-btn').style.display = type === 'script' ? '' : 'none';
      };
      typeRadios.forEach(r => r.addEventListener('change', updateTypeUI));

      document.getElementById('browse-script-btn').addEventListener('click', async () => {
        const picked = await window.api.pickScript();
        if (picked) document.getElementById('m-path').value = picked;
      });

      document.getElementById('m-save').addEventListener('click', async () => {
        const alias = document.getElementById('m-alias').value.trim().toLowerCase();
        const name  = document.getElementById('m-name').value.trim();
        const type  = document.querySelector('[name="alias-type"]:checked').value;
        const url   = document.getElementById('m-url').value.trim();
        const fpath = document.getElementById('m-path').value.trim();
        if (!alias) return App.toast('Alias required', 'error');
        if (type === 'web'    && !url)   return App.toast('URL required', 'error');
        if (type !== 'web'   && !fpath)  return App.toast('Path required', 'error');
        let entry;
        if (type === 'script') entry = { alias, name: name || alias, type: 'script', path: fpath };
        else if (type === 'app') entry = { alias, name: name || alias, type: 'app', path: fpath };
        else entry = { alias, name: name || url, url };
        aliases.push(entry);
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
