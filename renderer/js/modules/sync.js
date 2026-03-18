Modules.sync = {
  async render(container) {
    container.innerHTML = `
      ${Utils.modHead('∞ / Sync', 'Data Sync', 'Export and import your data between machines')}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:900px;">

        <!-- EXPORT -->
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div class="section-label" style="margin-top:0;">Export — Back Up Your Data</div>
          <p style="font-size:13px; color:var(--text-dim); line-height:1.6;">
            Saves all your tasks, notes, bookmarks, reminders, habits, calendar, launcher aliases,
            templates, clocks, and settings into a single <span style="font-family:var(--mono); color:var(--gold);">.json</span> file.
            Copy that file to the other machine and import it there.
          </p>
          <div style="font-family:var(--mono); font-size:11px; color:var(--text-muted); background:var(--bg-2); border:1px solid var(--border); padding:12px 14px; line-height:1.8;">
            ✓ Tasks &nbsp; ✓ Notes &nbsp; ✓ Bookmarks<br>
            ✓ Reminders &nbsp; ✓ Calendar &nbsp; ✓ Habits<br>
            ✓ Moods &nbsp; ✓ Launcher aliases &nbsp; ✓ Templates<br>
            ✓ Clocks &nbsp; ✓ Pomodoro config &nbsp; ✓ Dashboard layout<br>
            <span style="color:var(--text-muted); opacity:.6;">✗ Clipboard history &nbsp; ✗ Recent folders</span>
          </div>
          <button class="btn btn-gold" id="btn-export" style="margin-top:auto;">Export Data Bundle…</button>
          <div id="export-status" style="font-family:var(--mono); font-size:11px; min-height:18px;"></div>
        </div>

        <!-- IMPORT -->
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div class="section-label" style="margin-top:0;">Import — Load Data From a Bundle</div>
          <p style="font-size:13px; color:var(--text-dim); line-height:1.6;">
            Load a previously exported bundle. Choose <strong style="color:var(--text);">Merge</strong> to
            add new items without deleting what's already here, or
            <strong style="color:var(--text);">Overwrite</strong> to fully replace each data type with the bundle's version.
          </p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="section-label" style="margin-top:0; margin-bottom:4px;">Import Mode</div>
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px 10px; border:1px solid var(--border); background:var(--bg-2);">
              <input type="radio" name="import-mode" value="merge" checked style="accent-color:var(--gold);"> 
              <span>
                <span style="font-weight:600; font-size:12px;">Merge</span>
                <span style="color:var(--text-muted); font-size:11px; display:block;">Add bundle items, keep existing data</span>
              </span>
            </label>
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px 10px; border:1px solid var(--border); background:var(--bg-2);">
              <input type="radio" name="import-mode" value="overwrite" style="accent-color:var(--gold);">
              <span>
                <span style="font-weight:600; font-size:12px;">Overwrite</span>
                <span style="color:var(--text-muted); font-size:11px; display:block;">Replace local data with bundle</span>
              </span>
            </label>
          </div>
          <button class="btn btn-gold" id="btn-import" style="margin-top:auto;">Import Data Bundle…</button>
          <div id="import-status" style="font-family:var(--mono); font-size:11px; min-height:18px;"></div>
        </div>

      </div>

      <!-- INFO FOOTER -->
      <div style="margin-top:24px; max-width:900px; padding:16px 20px; border:1px solid var(--border); background:var(--bg-2);">
        <div class="section-label" style="margin-top:0; margin-bottom:8px;">How to sync between two machines</div>
        <ol style="font-size:13px; color:var(--text-dim); line-height:2; padding-left:20px;">
          <li>On machine A: click <strong style="color:var(--text);">Export</strong> and save to a USB drive, cloud folder (Dropbox, OneDrive, iCloud), or send via email.</li>
          <li>On machine B: open Command → Sync, click <strong style="color:var(--text);">Import</strong>, pick the file. Use Merge if machine B has its own data.</li>
          <li>Repeat in the opposite direction if you want changes from B to also appear on A.</li>
        </ol>
        <p style="font-size:11px; color:var(--text-muted); margin-top:8px; font-family:var(--mono);">
          Tip: dropping your export file into a Dropbox/OneDrive folder and importing from there on the other machine gives you a simple manual sync workflow with zero servers or accounts.
        </p>
      </div>
    `;

    // Export
    container.querySelector('#btn-export').addEventListener('click', async () => {
      const statusEl = container.querySelector('#export-status');
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = 'Choosing destination…';
      const destPath = await window.api.syncDialog('save');
      if (!destPath) { statusEl.textContent = 'Cancelled.'; return; }
      statusEl.textContent = 'Exporting…';
      const result = await window.api.syncExport(destPath);
      if (result.ok) {
        statusEl.style.color = 'var(--green)';
        statusEl.textContent = `✓ Exported ${result.keys} data types to ${destPath.split(/[\\/]/).pop()}`;
        App.toast('Data exported successfully', 'success');
      } else {
        statusEl.style.color = 'var(--red)';
        statusEl.textContent = `✗ ${result.error}`;
        App.toast('Export failed', 'error');
      }
    });

    // Import
    container.querySelector('#btn-import').addEventListener('click', async () => {
      const statusEl = container.querySelector('#import-status');
      const mode = container.querySelector('input[name="import-mode"]:checked').value;
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = 'Choosing file…';
      const srcPath = await window.api.syncDialog('open');
      if (!srcPath) { statusEl.textContent = 'Cancelled.'; return; }
      statusEl.textContent = 'Importing…';
      const result = await window.api.syncImport(srcPath, mode);
      if (result.ok) {
        statusEl.style.color = 'var(--green)';
        const exportedDate = result.exported ? new Date(result.exported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown date';
        statusEl.textContent = `✓ Imported ${result.imported} types (bundle from ${exportedDate}) — ${mode} mode`;
        App.toast('Data imported — restart or re-open modules to see changes', 'success');
      } else {
        statusEl.style.color = 'var(--red)';
        statusEl.textContent = `✗ ${result.error}`;
        App.toast('Import failed', 'error');
      }
    });
  }
};
