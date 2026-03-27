const App = {
  currentModule: 'dashboard',

  async init() {
    this.setupTitlebar();
    this.setupClock();
    this.setupModal();
    this.setupClipboardListener();
    this.setupLauncherOverlay();
    this.setupReminderChecker();
    this.setupDragGhost();
    await this.loadTheme();

    // Prevent Electron from replacing the app UI when files are dragged over it
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    // Nav setup is async (loads saved order) — await it so active class is correct
    await this._applyNavOrder();

    try {
      const ver = await window.api.getVersion();
      document.getElementById('app-version').textContent = `v${ver}`;
    } catch {}
    this.navigate('dashboard');
  },

  setupTitlebar() {
    document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
    document.getElementById('btn-maximize').addEventListener('click', () => window.api.maximize());
    document.getElementById('btn-close').addEventListener('click', () => window.api.close());
  },

  // ── Theme system ──────────────────────────────────────────
  async loadTheme() {
    try {
      const cfg = await window.api.getData('theme-config').catch(() => ({})) || {};
      this.applyTheme(cfg);
    } catch {}
  },

  applyTheme(cfg) {
    const r = document.documentElement;
    // Accent colour cascade (replaces --gold-* too for compatibility)
    const accent = cfg.accent || '#fbbf24';
    const hex2rgb = h => { const n=parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
    try {
      const [rv,gv,bv] = hex2rgb(accent);
      r.style.setProperty('--accent',        accent);
      r.style.setProperty('--accent-dim',    `rgba(${rv},${gv},${bv},0.45)`);
      r.style.setProperty('--accent-glow',   `rgba(${rv},${gv},${bv},0.06)`);
      r.style.setProperty('--accent-line',   `rgba(${rv},${gv},${bv},0.25)`);
      r.style.setProperty('--accent-text',   accent);
      // Keep legacy --gold-* in sync so existing modules pick it up
      r.style.setProperty('--gold',          accent);
      r.style.setProperty('--gold-dim',      `rgba(${rv},${gv},${bv},0.45)`);
      r.style.setProperty('--gold-glow',     `rgba(${rv},${gv},${bv},0.06)`);
      r.style.setProperty('--gold-line',     `rgba(${rv},${gv},${bv},0.25)`);
      r.style.setProperty('--gold-text',     accent);
    } catch {}
    // Background
    if (cfg.bg) {
      r.style.setProperty('--bg',       cfg.bg);
      r.style.setProperty('--bg-1',     cfg.bg1 || cfg.bg);
      r.style.setProperty('--bg-2',     cfg.bg2 || cfg.bg);
      r.style.setProperty('--bg-3',     cfg.bg3 || cfg.bg);
      r.style.setProperty('--bg-hover', cfg.bgHover || cfg.bg);
    }
    // Font color — fixes invisible text on bright backgrounds
    if (cfg.textColor) {
      const hex2rgb = h => { const n=parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
      try {
        const [tr,tg,tb] = hex2rgb(cfg.textColor);
        r.style.setProperty('--text',       cfg.textColor);
        if (cfg.textColorAuto !== false) {
          r.style.setProperty('--text-dim',   `rgba(${tr},${tg},${tb},0.50)`);
          r.style.setProperty('--text-muted', `rgba(${tr},${tg},${tb},0.30)`);
        }
      } catch {}
    } else {
      // Reset to defaults
      r.style.setProperty('--text',       'rgba(255,255,255,0.85)');
      r.style.setProperty('--text-dim',   'rgba(255,255,255,0.40)');
      r.style.setProperty('--text-muted', 'rgba(255,255,255,0.18)');
    }
    // Font
    if (cfg.font === 'mono') {
      r.style.setProperty('--font', "'JetBrains Mono', monospace");
    } else if (cfg.font === 'inter') {
      r.style.setProperty('--font', "'Inter', sans-serif");
    } else {
      r.style.setProperty('--font', "'Syne', sans-serif");
    }
    // Radius
    if (cfg.rounded) {
      document.body.classList.add('theme-rounded');
    } else {
      document.body.classList.remove('theme-rounded');
    }
    // Glass
    if (cfg.glass) {
      document.body.classList.add('theme-glass');
    } else {
      document.body.classList.remove('theme-glass');
    }
  },

  // ── Drag ghost ────────────────────────────────────────────
  setupDragGhost() {
    let ghost = document.getElementById('drag-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      document.body.appendChild(ghost);
    }
    this._dragGhost = ghost;
  },

  // Call this from dragstart handlers: App.setDragGhost(e, labelText)
  setDragGhost(e, label) {
    const ghost = this._dragGhost;
    if (!ghost) return;
    ghost.textContent = label || '';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    document.body.appendChild(ghost);
    try { e.dataTransfer.setDragImage(ghost, 0, 12); } catch {}
  },

  // ── Styled confirm dialog (replaces window.confirm) ───────
  confirm(msg, { title = 'Confirm', icon = '⚠', danger = false } = {}) {
    return new Promise(resolve => {
      // Remove any existing
      document.getElementById('confirm-overlay')?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'confirm-overlay';
      overlay.innerHTML = `
        <div id="confirm-box">
          <div style="padding:24px 24px 20px;text-align:center">
            <div id="confirm-icon">${icon}</div>
            ${title ? `<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;font-weight:700">${title}</div>` : ''}
            <div id="confirm-msg">${msg}</div>
            <div class="confirm-btn-row">
              <button class="btn" id="confirm-cancel">Cancel</button>
              <button class="btn ${danger ? '' : 'btn-gold'}" id="confirm-ok"
                style="${danger ? 'border-color:var(--red);color:var(--red)' : ''}">
                Confirm
              </button>
            </div>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.getElementById('confirm-ok').focus();

      const done = (val) => { overlay.remove(); resolve(val); };
      document.getElementById('confirm-ok').addEventListener('click', () => done(true));
      document.getElementById('confirm-cancel').addEventListener('click', () => done(false));
      overlay.addEventListener('click', e => { if (e.target === overlay) done(false); });
      const kd = e => { if (e.key === 'Escape') { done(false); document.removeEventListener('keydown', kd); } if (e.key === 'Enter') { done(true); document.removeEventListener('keydown', kd); } };
      document.addEventListener('keydown', kd);
    });
  },

  setupNav() {
    this._applyNavOrder();
  },

  async _applyNavOrder() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const [saved, disabled] = await Promise.all([
      window.api.getData('sidebar-order').catch(() => []),
      window.api.getData('disabled-modules').catch(() => []),
    ]);
    this._disabledModules = new Set(Array.isArray(disabled) ? disabled : []);

    const buttons = Array.from(nav.querySelectorAll('.nav-btn'));
    const map = {};
    buttons.forEach(b => { map[b.dataset.module] = b; });

    // Apply order
    if (Array.isArray(saved) && saved.length) {
      const reordered = [
        ...saved.filter(k => map[k]).map(k => map[k]),
        ...buttons.filter(b => !saved.includes(b.dataset.module))
      ];
      reordered.forEach(b => nav.appendChild(b));
    }

    // Show/hide based on disabled list (dashboard always visible)
    nav.querySelectorAll('.nav-btn').forEach(btn => {
      const mod = btn.dataset.module;
      if (mod !== 'dashboard' && this._disabledModules.has(mod)) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    });

    // Wire click
    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn._suppressNextClick) return;
        this.navigate(btn.dataset.module);
      });
    });

    // Wire the sidebar module manager button
    const manageBtn = document.getElementById('manage-modules-btn');
    if (manageBtn && !manageBtn._wired) {
      manageBtn._wired = true;
      manageBtn.addEventListener('click', () => this.openModuleManager());
    }

    // Wire sidebar settings button
    const settingsBtn = document.getElementById('sidebar-settings-btn');
    if (settingsBtn && !settingsBtn._wired) {
      settingsBtn._wired = true;
      settingsBtn.addEventListener('click', () => this.navigate('settings'));
    }

    this._setupNavDrag(nav);
  },

  // Open the module manager modal
  openModuleManager() {
    const nav = document.querySelector('.sidebar-nav');
    const allBtns = Array.from(nav.querySelectorAll('.nav-btn'));
    const disabled = this._disabledModules || new Set();

    App.openModal('Manage Modules', `
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;line-height:1.6">
        Toggle modules on or off. Disabled modules are hidden from the sidebar.
        Dashboard cannot be disabled.
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:420px;overflow-y:auto" id="module-toggle-list">
        ${allBtns.map(btn => {
          const mod = btn.dataset.module;
          const label = btn.querySelector('.nav-label')?.textContent || mod;
          const icon  = btn.querySelector('.nav-icon')?.textContent || '';
          const isDashboard = mod === 'dashboard';
          const isOn = !disabled.has(mod);
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-2);border:1px solid var(--border)">
            <span style="font-size:14px;width:22px;text-align:center">${icon}</span>
            <span style="flex:1;font-size:13px;font-weight:500">${label}</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:${isDashboard?'not-allowed':'pointer'}">
              <input type="checkbox" data-module="${mod}" ${isOn?'checked':''} ${isDashboard?'disabled':''} style="accent-color:var(--gold);width:14px;height:14px" />
            </label>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-gold" id="module-manager-save" style="width:100%;margin-top:14px">Save</button>
    `);

    document.getElementById('module-manager-save').addEventListener('click', async () => {
      const newDisabled = [];
      document.querySelectorAll('#module-toggle-list input[type="checkbox"]').forEach(cb => {
        if (!cb.checked && cb.dataset.module !== 'dashboard') newDisabled.push(cb.dataset.module);
      });
      await window.api.setData('disabled-modules', newDisabled);
      App.closeModal();
      await this._applyNavOrder();
      // If current module was just disabled, navigate to dashboard
      if (newDisabled.includes(this.currentModule)) this.navigate('dashboard');
      App.toast('Modules updated', 'success');
    });
  },

  _setupNavDrag(nav) {
    // Inject a drag handle into each button
    nav.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.querySelector('.nav-drag-handle')) return;
      const handle = document.createElement('span');
      handle.className = 'nav-drag-handle';
      handle.textContent = String.fromCodePoint(0x2807); // ⠷ braille drag dots
      handle.title = 'Drag to reorder';
      btn.appendChild(handle);
    });

    let dragSrc = null;

    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.setAttribute('draggable', 'true');

      btn.addEventListener('dragstart', e => {
        dragSrc = btn;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', btn.dataset.module);
        const label = btn.querySelector('.nav-label')?.textContent || btn.dataset.module;
        App.setDragGhost(e, label);
        setTimeout(() => btn.classList.add('nav-dragging'), 0);
      });

      btn.addEventListener('dragend', () => {
        btn.classList.remove('nav-dragging');
        dragSrc = null;
        this._saveNavOrder(nav);
        // Suppress the click that fires immediately after dragend
        btn._suppressNextClick = true;
        setTimeout(() => { btn._suppressNextClick = false; }, 200);
      });

      btn.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragSrc || dragSrc === btn) return;
        
        const allBtns = [...nav.querySelectorAll('.nav-btn')];
        const draggedIdx = allBtns.indexOf(dragSrc);
        const targetIdx = allBtns.indexOf(btn);
        
        // Live ghost preview moving via DOM insertion
        if (draggedIdx < targetIdx) {
          nav.insertBefore(dragSrc, btn.nextSibling);
        } else {
          nav.insertBefore(dragSrc, btn);
        }
      });

      btn.addEventListener('drop', e => {
        e.preventDefault(); // reordering handled by DOM sync on dragend
      });
    });
  },

  async _saveNavOrder(nav) {
    const order = Array.from(nav.querySelectorAll('.nav-btn')).map(b => b.dataset.module);
    await window.api.setData('sidebar-order', order).catch(() => {});
  },

  navigate(module) {
    // Call cleanup on previous module if it registered one (stops intervals, etc.)
    const prev = Modules[this.currentModule];
    if (prev && typeof prev.cleanup === 'function') {
      try { prev.cleanup(); } catch {}
    }

    this.currentModule = module;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === module));

    const labels = {
      dashboard:'Dashboard', clipboard:'Clipboard', templates:'Templates',
      launcher:'Quick Launcher', tasks:'Tasks', notes:'Notes',
      bookmarks:'Bookmarks', calendar:'Calendar', weather:'Weather',
      sysmon:'System Monitor', files:'Folders',
      clocks:'World Clocks', reminders:'Reminders', random:'Random',
      pomodoro:'Pomodoro Timer', calculator:'Calculator',
      converter:'Unit Converter', habits:'Daily Habits', timers:'Timers', moods:'Mood Tracker',
      sync:'Sync',
      chronicle:'Chronicle',
      queue:'Queue',
      library:'Library',
      settings:'Settings',
    };
    const el = document.getElementById('tb-section');
    if (el) el.textContent = labels[module] || module;

    const content = document.getElementById('content');
    content.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'fade-in';
    content.appendChild(wrap);

    const m = Modules[module];
    if (m) m.render(wrap);
  },

  setupClock() {
    const el = document.getElementById('titlebar-time');
    const update = () => {
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-US', {
        weekday:'short', month:'short', day:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    };
    update();
    setInterval(update, 10000);
  },

  setupModal() {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeModal(); });
  },

  openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => {
      const first = document.querySelector('#modal-body input, #modal-body textarea, #modal-body select');
      if (first) first.focus();
    }, 50);
  },

  // Called when user clicks a find result — navigates and highlights the search term
  findNavigate(moduleKey, query, targetId) {
    // Store for the module to pick up after render
    this._findQuery  = query;
    this._findTarget = targetId || null;
    this.navigate(moduleKey);
    // After navigation settles, apply highlight
    setTimeout(() => this._applyFindHighlight(query, targetId), 120);
  },

  _applyFindHighlight(query, targetId) {
    if (!query) return;
    const content = document.getElementById('content');
    if (!content) return;

    // If a specific note targetId was given, open that note first
    if (targetId && Modules.notes?.activeId !== targetId) {
      const noteItems = content.querySelectorAll('.note-item[data-id]');
      noteItems.forEach(el => {
        if (el.dataset.id === targetId) el.click();
      });
      // Re-apply highlight after note opens
      setTimeout(() => this._highlightInContent(content, query), 80);
      return;
    }
    this._highlightInContent(content, query);
  },

  _highlightInContent(root, query) {
    if (!query) return;
    const q = query.toLowerCase();

    // Handle textareas specially — can't inject DOM nodes, scroll to position instead
    root.querySelectorAll('textarea').forEach(ta => {
      const idx = ta.value.toLowerCase().indexOf(q);
      if (idx === -1) return;
      // Select the match so it's visible
      ta.focus();
      ta.setSelectionRange(idx, idx + query.length);
      // Scroll the textarea to show the match
      const lines = ta.value.slice(0, idx).split('\n');
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, (lines.length - 3) * lineHeight);
      // Add a visible banner above the textarea
      const existing = ta.parentNode.querySelector('.find-in-textarea-banner');
      if (existing) existing.remove();
      const banner = document.createElement('div');
      banner.className = 'find-in-textarea-banner';
      banner.style.cssText = 'background:rgba(251,191,36,0.15);border:1px solid var(--gold-line);color:var(--gold-text);font-family:var(--mono);font-size:10px;padding:4px 12px;letter-spacing:.05em;flex-shrink:0;';
      banner.textContent = `"${query}" found at line ${lines.length} — selected above`;
      ta.parentNode.insertBefore(banner, ta);
      // Auto-remove after 4s
      setTimeout(() => banner.remove(), 4000);
    });

    // For regular DOM text nodes
    const SKIP = new Set(['SCRIPT','STYLE','INPUT','TEXTAREA','SELECT','BUTTON']);
    const walk = (node) => {
      if (node.nodeType === 3) {
        const idx = node.textContent.toLowerCase().indexOf(q);
        if (idx === -1) return;
        try {
          const mark = document.createElement('mark');
          mark.className = 'find-highlight';
          mark.style.cssText = 'background:rgba(251,191,36,0.35);color:var(--gold);border-radius:2px;padding:0 2px;';
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + query.length);
          range.surroundContents(mark);
        } catch {}
        return;
      }
      if (node.nodeType !== 1 || SKIP.has(node.tagName)) return;
      [...node.childNodes].forEach(walk);
    };
    try { walk(root); } catch {}
    const first = root.querySelector('.find-highlight');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  },

  setupClipboardListener() {
    window.api.onClipboardUpdated(() => {
      if (this.currentModule === 'clipboard' || this.currentModule === 'dashboard') {
        this.navigate(this.currentModule);
      }
    });
    // Auto-refresh Chronicle when a new snapshot is built in the background
    window.api.onChronicleUpdated?.(() => {
      if (this.currentModule === 'chronicle') {
        this.navigate('chronicle');
      }
    });
  },

  setupLauncherOverlay() {
    const overlay = document.getElementById('launcher-overlay');
    const input   = document.getElementById('launcher-overlay-input');
    const results = document.getElementById('launcher-overlay-results');
    let aliases = [];
    let matches = [];
    let selectedIdx = 0;

    // ── Multi-step state ────────────────────────────────────
    // Each command can define `steps: [ {key, prompt, placeholder, validate?} ]`
    // When a command is selected, we walk through steps collecting values,
    // showing the accumulated prompt as a breadcrumb in the input prefix.
    let activeCmd = null;   // command key currently being stepped through
    let stepIdx   = 0;      // which step we're on
    let stepData  = {};     // collected values so far

    window.api.getData('launcher').then(d => { aliases = Array.isArray(d) ? d : []; });

    const hintEl = () => document.getElementById('lov-hint-bar');

    const open = () => {
      window.api.getData('launcher').then(d => { aliases = Array.isArray(d) ? d : []; });
      overlay.classList.add('open');
      resetState();
      input.focus();
    };

    const resetState = () => {
      activeCmd = null; stepIdx = 0; stepData = {};
      input.value = '';
      input.placeholder = 'task · note · remind · calc · timer · find · open · focus · copy · mood · habit · clear · go · queue · ep · rate · planto…';
      input.style.paddingLeft = '';
      const prefix = document.getElementById('lov-input-prefix');
      if (prefix) prefix.remove();
      results.innerHTML = '';
      renderDefaultHint();
    };

    const close = () => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.classList.remove('open');
        overlay.classList.remove('closing');
        resetState();
      }, 130);
    };

    const updateSelected = () =>
      results.querySelectorAll('.lov-match').forEach((el, i) =>
        el.classList.toggle('selected', i === selectedIdx));

    // ── Command definitions ──────────────────────────────────
    const COMMANDS = {
      task: {
        icon: '✓', color: 'var(--green)',
        steps: [
          { key: 'text', prompt: 'task', placeholder: 'What needs to be done?' }
        ],
        run: async d => {
          const tasks = await window.api.getData('tasks').catch(()=>[]);
          tasks.unshift({ text: d.text, done: false, id: Date.now() });
          await window.api.setData('tasks', tasks);
          App.toast(`✓ Task added: ${d.text}`, 'success');
          if (App.currentModule === 'tasks') App.navigate('tasks');
        }
      },
      note: {
        icon: '✎', color: 'var(--gold)',
        steps: [
          { key: 'title', prompt: 'note', placeholder: 'Note title or quick thought…' }
        ],
        run: async d => {
          const notes = await window.api.getData('notes').catch(()=>[]);
          notes.unshift({ id: Utils.uid(), title: d.title, body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          await window.api.setData('notes', notes);
          App.toast(`✎ Note created: ${d.title}`, 'success');
          if (App.currentModule === 'notes') App.navigate('notes');
        }
      },
      remind: {
        icon: '◎', color: '#a78bfa',
        steps: [
          { key: 'when', prompt: 'remind', placeholder: 'When? (e.g. in 15m, at 3pm, tomorrow)', hint: 'in 15m · in 2h · at 3pm · at 14:30 · tomorrow' },
          { key: 'text', prompt: null, placeholder: 'Reminder text…' }
        ],
        run: async d => {
          const v = d.when.trim();
          const inMatch  = v.match(/^in\s+(\d+)\s*(s|sec|m|min|h|hr|d|day)s?$/i);
          const atMatch  = v.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
          const tomMatch = /^tomorrow$/i.test(v);
          let time;
          if (inMatch) {
            const n = +inMatch[1], unit = inMatch[2].toLowerCase();
            const ms = unit.startsWith('d') ? n*86400000 : unit.startsWith('h') ? n*3600000 : unit.startsWith('s') ? n*1000 : n*60000;
            time = new Date(Date.now() + ms).toISOString();
          } else if (atMatch) {
            let h = +atMatch[1], m = +(atMatch[2]||0), ap = (atMatch[3]||'').toLowerCase();
            if (ap === 'pm' && h < 12) h += 12;
            if (ap === 'am' && h === 12) h = 0;
            const dt = new Date(); dt.setHours(h, m, 0, 0);
            if (dt < new Date()) dt.setDate(dt.getDate()+1);
            time = dt.toISOString();
          } else if (tomMatch) {
            const dt = new Date(); dt.setDate(dt.getDate()+1); dt.setHours(9,0,0,0);
            time = dt.toISOString();
          } else {
            time = new Date(Date.now() + 3600000).toISOString();
          }
          const reminders = await window.api.getData('reminders').catch(()=>[]);
          reminders.push({ id: Utils.uid(), text: d.text, time, fired: false });
          await window.api.setData('reminders', reminders);
          const when = new Date(time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
          App.toast(`◎ Reminder set for ${when}`, 'success');
          if (App.currentModule === 'reminders') App.navigate('reminders');
        }
      },
      calc: {
        icon: '=', color: 'var(--gold)',
        steps: [
          { key: 'expr', prompt: 'calc', placeholder: 'e.g. (150 * 12) / 4.5  or  2^10', hint: 'operators: + − * / % ^  ·  ↵ to evaluate and copy' }
        ],
        previewStep: async (key, val) => {
          if (key !== 'expr' || !val) return null;
          const res = await window.api.calcEval(val).catch(() => null);
          if (res?.result !== undefined) return `= ${Number.isInteger(res.result) ? res.result : parseFloat(res.result.toFixed(8))}`;
          return null;
        },
        run: async d => {
          const res = await window.api.calcEval(d.expr).catch(() => ({ error: 'IPC error' }));
          if (res.error) { App.toast(res.error, 'error'); return; }
          const display = Number.isInteger(res.result) ? res.result : parseFloat(res.result.toFixed(8));
          await window.api.writeClipboard(String(display));
          App.toast(`= ${display}  (copied)`, 'success');
        }
      },
      timer: {
        icon: '⏱', color: '#60a5fa',
        steps: [
          { key: 'duration', prompt: 'timer', placeholder: 'Duration: 10m · 1h30m · 45s', hint: '10m · 1h · 1h30m · 45s' }
        ],
        run: async d => {
          const match = d.duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
          const h = +(match?.[1]||0), m = +(match?.[2]||0), s = +(match?.[3]||0);
          const totalMs = (h*3600 + m*60 + s) * 1000;
          if (totalMs <= 0) { App.toast('Invalid duration — try 10m or 1h30m','error'); return; }
          const endTime = Date.now() + totalMs;
          App.toast(`⏱ Timer started: ${d.duration}`);
          const reminders = await window.api.getData('reminders').catch(()=>[]);
          reminders.push({ id: Utils.uid(), text: `Timer: ${d.duration}`, time: new Date(endTime).toISOString(), fired: false });
          await window.api.setData('reminders', reminders);
          if (App.currentModule === 'reminders') App.navigate('reminders');
        }
      },
      go: {
        icon: '→', color: 'var(--text-dim)',
        steps: [
          { key: 'module', prompt: 'go', placeholder: 'dashboard · tasks · notes · calendar · queue · library · settings...', hint: 'dashboard · tasks · notes · calendar · bookmarks · clipboard · weather · sysmon · clocks · reminders · random · pomodoro · converter · habits · timers · moods · sync · launcher · templates · folders · queue · library · settings' }
        ],
        run: async d => {
          const map = {
            dashboard:'dashboard', tasks:'tasks', notes:'notes', calendar:'calendar',
            bookmarks:'bookmarks', clipboard:'clipboard', weather:'weather',
            sysmon:'sysmon', system:'sysmon', clocks:'clocks', reminders:'reminders',
            random:'random', pomodoro:'pomodoro', pomo:'pomodoro', converter:'converter',
            habits:'habits', timers:'timers', moods:'moods', launcher:'launcher',
            templates:'templates', files:'files', folders:'files', sync:'sync',
            queue:'queue', library:'library', lib:'library',
            settings:'settings', theme:'settings',
          };
          const key = map[d.module?.toLowerCase().trim()];
          if (key) { App.navigate(key); }
          else App.toast(`Unknown module: "${d.module}"`, 'error');
        }
      },
      queue: {
        icon: '🎬', color: '#f87171',
        steps: [
          { key: 'url', prompt: 'queue', placeholder: 'Paste a URL to queue…' }
        ],
        run: async d => {
          let url = d.url.trim();
          if (!url) { App.toast('URL required', 'error'); return; }
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          const detectType = u => {
            if (u.includes('youtube.com')||u.includes('youtu.be')||u.includes('vimeo.com')) return 'video';
            if (u.includes('medium.com')||u.includes('substack.com')||u.includes('dev.to')) return 'article';
            return 'other';
          };
          let title = url;
          try { const u = new URL(url); title = u.pathname.split('/').filter(Boolean).pop() || u.hostname; title = title.replace(/[-_]/g,' ').replace(/\.[a-z]{2,4}$/i,''); } catch {}
          const items = await window.api.getData('queue').catch(()=>[]) || [];
          items.unshift({ id: Utils.uid(), url, title, type: detectType(url), done:false, addedAt: new Date().toISOString() });
          await window.api.setData('queue', items);
          App.toast(`🎬 Queued: ${title}`, 'success');
          if (App.currentModule === 'queue') App.navigate('queue');
        }
      },
      ep: {
        icon: '▶', color: '#60a5fa',
        steps: [
          { key: 'title', prompt: 'ep', placeholder: 'Title (fuzzy match)…' },
          { key: 'num',   prompt: null, placeholder: 'Episode/chapter number (or ↵ to +1)', optional: true }
        ],
        run: async d => {
          const lib = await window.api.getData('library').catch(()=>({watch:[],read:[],play:[]}));
          const q = d.title.toLowerCase();
          let found = null, foundTab = null;
          for (const tab of ['watch','read','play']) {
            const m = (lib[tab]||[]).find(e => e.title.toLowerCase().includes(q));
            if (m) { found = m; foundTab = tab; break; }
          }
          if (!found) { App.toast(`No library entry matching "${d.title}"`, 'error'); return; }
          if (d.num) found.progress = parseInt(d.num) || (found.progress||0) + 1;
          else found.progress = (found.progress||0) + 1;
          await window.api.setData('library', lib);
          App.toast(`▶ ${found.title}: ${foundTab==='read'?'Ch':'Ep'} ${found.progress}`, 'success');
          if (App.currentModule === 'library') App.navigate('library');
        }
      },
      rate: {
        icon: '★', color: '#fbbf24',
        steps: [
          { key: 'title',  prompt: 'rate', placeholder: 'Title (fuzzy match)…' },
          { key: 'score',  prompt: null,   placeholder: 'Score (e.g. 9.3 or 5 for stars 1-5)', hint: 'Enter /10 decimal or 1-5 for stars' }
        ],
        run: async d => {
          const lib = await window.api.getData('library').catch(()=>({watch:[],read:[],play:[]}));
          const q = d.title.toLowerCase();
          let found = null, foundTab = null;
          for (const tab of ['watch','read','play']) {
            const m = (lib[tab]||[]).find(e => e.title.toLowerCase().includes(q));
            if (m) { found = m; foundTab = tab; break; }
          }
          if (!found) { App.toast(`No entry matching "${d.title}"`, 'error'); return; }
          const n = parseFloat(d.score);
          if (isNaN(n)) { App.toast('Invalid score', 'error'); return; }
          if (n >= 1 && n <= 5 && Number.isInteger(n)) { found.stars = n; }
          else { found.rating10 = Math.min(10, Math.max(0, n)); }
          await window.api.setData('library', lib);
          App.toast(`★ Rated ${found.title}: ${d.score}`, 'success');
          if (App.currentModule === 'library') App.navigate('library');
        }
      },
      planto: {
        icon: '📋', color: '#a78bfa',
        steps: [
          { key: 'title', prompt: 'planto', placeholder: 'Title to add to backlog…' },
          { key: 'tab',   prompt: null, placeholder: 'watch / read / play (↵ = watch)', optional: true, hint: 'watch · read · play' }
        ],
        run: async d => {
          const lib = await window.api.getData('library').catch(()=>({watch:[],read:[],play:[]}));
          const tab = ['watch','read','play'].includes(d.tab?.trim()) ? d.tab.trim() : 'watch';
          if (!lib[tab]) lib[tab] = [];
          lib[tab].unshift({ id: Utils.uid(), title: d.title, status:'plantowatch', progress:0, stars:0, rating10:null, summary:'', addedAt: new Date().toISOString() });
          await window.api.setData('library', lib);
          App.toast(`📋 Added to ${tab} backlog: ${d.title}`, 'success');
          if (App.currentModule === 'library') App.navigate('library');
        }
      },
      copy: {
        icon: '⎘', color: '#60a5fa',
        steps: [
          { key: 'text', prompt: 'copy', placeholder: 'Text to copy to clipboard…' }
        ],
        run: async d => {
          await window.api.writeClipboard(d.text);
          App.toast(`⎘ Copied to clipboard`, 'success');
        }
      },
      habit: {
        icon: '↻', color: '#34d399',
        steps: [
          { key: 'name', prompt: 'habit', placeholder: 'Habit name (fuzzy match)…' }
        ],
        run: async d => {
          const habits = await window.api.getData('habits').catch(() => []);
          const today = new Date().toISOString().slice(0, 10);
          const match = habits.find(h => h.name.toLowerCase().includes(d.name.toLowerCase().trim()));
          if (!match) { App.toast(`No habit matching "${d.name}" — add it in Habits first`, 'error'); return; }
          if (!Array.isArray(match.log)) match.log = [];
          if (match.log.includes(today)) { App.toast(`"${match.name}" already logged today`); return; }
          match.log.push(today);
          await window.api.setData('habits', habits);
          App.toast(`↻ Habit logged: ${match.name}`, 'success');
          if (App.currentModule === 'habits') App.navigate('habits');
        }
      },
      mood: {
        icon: '🙂', color: '#f472b6',
        steps: [
          { key: 'score', prompt: 'mood', placeholder: 'Score 1–5  (1=awful · 3=okay · 5=great)', hint: '1 = Awful · 2 = Bad · 3 = Okay · 4 = Good · 5 = Great' },
          { key: 'note', prompt: null, placeholder: 'Optional note… (or ↵ to skip)', optional: true }
        ],
        run: async d => {
          const n = +d.score;
          if (!n || n < 1 || n > 5) { App.toast('Mood score must be 1–5', 'error'); return; }
          const moods = await window.api.getData('moods').catch(() => ({}));
          const logDate = Utils.moodDate();
          const labels = {1:'😞 Awful',2:'😕 Bad',3:'😐 Okay',4:'🙂 Good',5:'😄 Great'};
          moods[logDate] = { score: n, note: d.note || '', time: new Date().toISOString() };
          await window.api.setData('moods', moods);
          App.toast(`${labels[n]} logged`, 'success');
          if (App.currentModule === 'moods') App.navigate('moods');
        }
      },
      find: {
        icon: '🔍', color: '#fb923c',
        steps: [
          { key: 'query', prompt: 'find', placeholder: 'Search tasks, notes, bookmarks, clipboard, templates…' }
        ],
        run: async d => {
          const q = d.query.toLowerCase();
          const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

          // Returns a highlighted snippet centered on the first match
          const snippet = (text, query, radius = 80) => {
            if (!text) return '';
            const lo = text.toLowerCase();
            const idx = lo.indexOf(query);
            if (idx === -1) return esc(Utils.truncate(text, radius * 2));
            const start = Math.max(0, idx - radius);
            const end   = Math.min(text.length, idx + query.length + radius);
            const pre  = start > 0 ? '…' : '';
            const post = end < text.length ? '…' : '';
            const before = esc(text.slice(start, idx));
            const match  = esc(text.slice(idx, idx + query.length));
            const after  = esc(text.slice(idx + query.length, end));
            return `${pre}${before}<mark style="background:rgba(251,191,36,0.3);color:var(--gold);border-radius:2px;padding:0 2px">${match}</mark>${after}${post}`;
          };

          const [tasks, notes, bookmarks, clips, templates] = await Promise.all([
            window.api.getData('tasks').catch(() => []),
            window.api.getData('notes').catch(() => []),
            window.api.getData('bookmarks').catch(() => []),
            window.api.getData('clipboard').catch(() => []),
            window.api.getData('templates').catch(() => []),
          ]);

          const res = [];

          tasks.filter(t => t.text?.toLowerCase().includes(q)).forEach(t => {
            const PDOT = { high:'#ef4444', medium:'#eab308', low:'#3b82f6' };
            const dot = t.priority ? `<span style="width:7px;height:7px;border-radius:50%;background:${PDOT[t.priority]};display:inline-block;margin-right:4px;flex-shrink:0"></span>` : '';
            res.push({
              type: 'Task', nav: 'tasks',
              title: snippet(t.text, q),
              meta: t.done ? 'Done' : t.priority || 'Active',
              extra: dot,
            });
          });

          notes.forEach(n => {
            const inTitle = n.title?.toLowerCase().includes(q);
            const inBody  = n.body?.toLowerCase().includes(q);
            if (!inTitle && !inBody) return;
            // Store note id so findNavigate can open the specific note
            // Find all body occurrences for context
            const contexts = [];
            if (inBody && n.body) {
              let lo = n.body.toLowerCase(), start = 0;
              while (true) {
                const i = lo.indexOf(q, start);
                if (i === -1 || contexts.length >= 3) break;
                // Get line context
                const lineStart = n.body.lastIndexOf('\n', i) + 1;
                const lineEnd   = n.body.indexOf('\n', i + q.length);
                const line = n.body.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
                contexts.push(snippet(line, q, 60));
                start = i + q.length;
              }
            }
            res.push({
              type: 'Note', nav: 'notes',
              title: `<strong>${esc(n.title || 'Untitled')}</strong>`,
              meta: Utils.timeAgo(n.updatedAt),
              contexts,
              targetId: n.id,
            });
          });

          bookmarks.filter(b => b.name?.toLowerCase().includes(q) || b.url?.toLowerCase().includes(q)).forEach(b => {
            res.push({
              type: 'Bookmark', nav: 'bookmarks',
              title: esc(b.name),
              meta: b.category || (b.type === 'app' ? 'App' : 'Web'),
              extra: `<span style="font-family:var(--mono);font-size:10px;color:var(--text-muted)">${snippet(b.url || b.path || '', q, 40)}</span>`,
            });
          });

          clips.slice(0, 50).filter(c => c.text?.toLowerCase().includes(q)).forEach(c => {
            res.push({
              type: 'Clip', nav: 'clipboard',
              title: snippet(c.text, q, 100),
              meta: Utils.timeAgo(c.timestamp),
            });
          });

          templates.filter(t => t.title?.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q)).forEach(t => {
            res.push({
              type: 'Template', nav: 'templates',
              title: esc(t.title || 'Untitled'),
              meta: '',
              contexts: t.body?.toLowerCase().includes(q) ? [snippet(t.body, q, 60)] : [],
            });
          });

          if (!res.length) { App.toast(`No results for "${d.query}"`, 'error'); return; }

          const TYPE_COLOR = { Task:'var(--green)', Note:'var(--gold)', Bookmark:'#a78bfa', Clip:'#60a5fa', Template:'#fb923c' };

          App.openModal(`🔍 "${d.query}" — ${res.length} result${res.length!==1?'s':''}`,
            `<div id="find-results" style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto;padding-right:4px">` +
            res.map((r, ri) => `
              <div class="find-result-row" data-ri="${ri}" style="padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);cursor:pointer;border-left:3px solid ${TYPE_COLOR[r.type]||'var(--border)'}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:${r.contexts?.length?'6px':'0'}">
                  <span style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${TYPE_COLOR[r.type]};min-width:60px;font-weight:700">${r.type}</span>
                  ${r.extra||''}
                  <span style="flex:1;font-size:13px;line-height:1.4">${r.title}</span>
                  ${r.meta ? `<span style="font-size:10px;color:var(--text-muted);white-space:nowrap;font-family:var(--mono)">${r.meta}</span>` : ''}
                </div>
                ${r.contexts?.length ? r.contexts.map(ctx =>
                  `<div style="font-size:11px;color:var(--text-dim);font-family:var(--mono);line-height:1.5;padding:3px 0 0 68px;border-top:1px solid var(--border);margin-top:4px">${ctx}</div>`
                ).join('') : ''}
              </div>`).join('') +
            `</div>`
          );
          // Wire clicks via delegation AFTER modal DOM is inserted
          setTimeout(() => {
            const container = document.getElementById('find-results');
            if (!container) return;
            container.addEventListener('click', e => {
              const row = e.target.closest('.find-result-row');
              if (!row) return;
              const r = res[+row.dataset.ri];
              if (!r) return;
              App.findNavigate(r.nav, d.query, r.targetId || '');
              App.closeModal();
            });
          }, 0);
        }
      },
      clear: {
        icon: '✕', color: '#ef4444',
        steps: [
          { key: 'target', prompt: 'clear', placeholder: 'tasks · done · clipboard', hint: 'tasks = all tasks · done = completed tasks · clipboard = clipboard history' }
        ],
        run: async d => {
          const t = d.target?.toLowerCase().trim();
          if (t === 'tasks') {
            await window.api.setData('tasks', []);
            App.toast('✕ All tasks cleared');
            if (App.currentModule === 'tasks') App.navigate('tasks');
          } else if (t === 'done') {
            const tasks = await window.api.getData('tasks').catch(() => []);
            await window.api.setData('tasks', tasks.filter(t => !t.done));
            App.toast('✕ Completed tasks cleared', 'success');
            if (App.currentModule === 'tasks') App.navigate('tasks');
          } else if (t === 'clipboard') {
            await window.api.setData('clipboard', []);
            App.toast('✕ Clipboard history cleared');
            if (App.currentModule === 'clipboard') App.navigate('clipboard');
          } else {
            App.toast('Usage: tasks / done / clipboard', 'error');
          }
        }
      },
      open: {
        icon: '⊡', color: '#a78bfa',
        steps: [
          { key: 'name', prompt: 'open', placeholder: 'Bookmark name (fuzzy match)…' }
        ],
        run: async d => {
          const q = d.name.toLowerCase();
          const bookmarks = await window.api.getData('bookmarks').catch(() => []);
          const match = bookmarks.find(b => b.name?.toLowerCase() === q)
            || bookmarks.find(b => b.name?.toLowerCase().startsWith(q))
            || bookmarks.find(b => b.name?.toLowerCase().includes(q));
          if (!match) { App.toast(`No bookmark matching "${d.name}"`, 'error'); return; }
          if (match.type === 'app' && match.path) {
            window.api.openPath(match.path);
            App.toast(`⊡ Launching ${match.name}…`);
          } else if (match.url) {
            window.api.openURL(match.url);
            App.toast(`⊡ Opening ${match.name}…`);
          } else {
            App.toast(`"${match.name}" has no URL or path`, 'error');
          }
        }
      },
      focus: {
        icon: '🍅', color: '#f87171',
        steps: [
          { key: 'mins', prompt: 'focus', placeholder: `Minutes (↵ for default ${25}m)`, optional: true, hint: 'Leave blank for your configured pomodoro duration' }
        ],
        run: async d => {
          const mins = parseInt(d.mins) || null;
          if (mins) Modules.pomodoro.config = { ...(Modules.pomodoro.config || {}), work: mins };
          Modules.pomodoro.setMode('work');
          App.navigate('pomodoro');
          setTimeout(() => Modules.pomodoro.toggle(), 80);
          App.toast(`🍅 Focus session started${mins ? ` (${mins}m)` : ''}`, 'success');
        }
      },
    };

    // ── Hint bar rendering ───────────────────────────────────
    const renderDefaultHint = () => {
      const el = hintEl();
      if (!el) return;
      el.innerHTML = Object.entries(COMMANDS)
        .map(([k,c]) => `<span class="lov-cmd-chip" style="color:${c.color}">${k}</span>`).join('');
    };

    const renderStepHint = (cmd, step) => {
      const el = hintEl();
      if (!el) return;
      const def = COMMANDS[cmd];
      const hint = step.hint || '';
      el.innerHTML = `<span style="color:${def.color}">${def.icon} ${cmd}</span>` +
        (hint ? `<span style="color:var(--text-muted);margin-left:10px">${hint}</span>` : '');
    };

    // ── Breadcrumb prefix shown inside the input row ─────────
    const setPrefix = (text) => {
      let prefix = document.getElementById('lov-input-prefix');
      if (!text) { if (prefix) prefix.remove(); return; }
      if (!prefix) {
        prefix = document.createElement('span');
        prefix.id = 'lov-input-prefix';
        prefix.style.cssText = 'font-family:var(--mono);font-size:13px;color:var(--text-muted);white-space:nowrap;padding-right:6px;pointer-events:none;user-select:none;';
        input.parentNode.insertBefore(prefix, input);
      }
      prefix.textContent = text;
    };

    // ── Enter a step-through command ─────────────────────────
    const enterCommand = (cmdKey) => {
      activeCmd = cmdKey;
      stepIdx = 0;
      stepData = {};
      advanceStep();
    };

    const advanceStep = async () => {
      const def = COMMANDS[activeCmd];
      const step = def.steps[stepIdx];
      const breadcrumb = buildBreadcrumb();
      setPrefix(breadcrumb);
      input.value = '';
      input.placeholder = step.placeholder;
      results.innerHTML = '';
      renderStepHint(activeCmd, step);

      // For calc: show live result preview
      if (def.previewStep) {
        input.oninput = async () => {
          const preview = await def.previewStep(step.key, input.value.trim());
          results.innerHTML = preview
            ? `<div class="lov-match selected" style="font-family:var(--mono);color:var(--gold);font-size:18px;">${preview}</div>`
            : '';
        };
      } else {
        input.oninput = null;
      }
    };

    const buildBreadcrumb = () => {
      const def = COMMANDS[activeCmd];
      let parts = [def.icon + ' ' + activeCmd];
      for (let i = 0; i < stepIdx; i++) {
        const s = def.steps[i];
        const val = stepData[s.key];
        if (val) parts.push(`${s.prompt || s.key}: ${val}`);
      }
      const currentStep = def.steps[stepIdx];
      if (currentStep.prompt !== null) parts.push(`${currentStep.prompt || currentStep.key}:`);
      return parts.join(' › ') + ' ';
    };

    const commitStep = async () => {
      const def = COMMANDS[activeCmd];
      const step = def.steps[stepIdx];
      const val = input.value.trim();

      // Optional steps can be skipped with empty Enter
      if (!val && !step.optional) return;

      stepData[step.key] = val;

      if (stepIdx + 1 < def.steps.length) {
        // More steps to go
        stepIdx++;
        advanceStep();
      } else {
        // All steps done — run the command
        input.oninput = null;
        await def.run(stepData);
        close();
      }
    };

    // ── Free-text search (no active command) ─────────────────
    const showResults = (val) => {
      if (activeCmd) return; // step mode handles its own display
      results.innerHTML = '';
      matches = [];
      selectedIdx = 0;

      const el = hintEl();
      if (!val.trim()) { renderDefaultHint(); return; }

      const parts = val.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();

      // Command chip matched → show it as a selectable row + step preview
      if (COMMANDS[cmd]) {
        const def = COMMANDS[cmd];
        const rest = parts.slice(1).join(' ');
        const firstStep = def.steps[0];
        const previewText = rest ? `${firstStep.prompt || firstStep.key}: ${rest}` : firstStep.placeholder;
        if (el) el.innerHTML = `<span style="color:${def.color}">${def.icon} ${cmd}</span><span style="color:var(--text-muted);margin-left:10px">${firstStep.hint || firstStep.placeholder}</span>`;
        results.innerHTML = `
          <div class="lov-match selected lov-cmd-row" data-cmd="${cmd}">
            <span class="lov-alias" style="color:${def.color}">${def.icon} ${cmd}</span>
            <span class="lov-name">${previewText}</span>
            <span class="lov-url">↵ to start</span>
          </div>`;
        matches = [{ _cmd: cmd }];
        results.querySelector('.lov-cmd-row').addEventListener('click', () => enterCommand(cmd));
        return;
      }

      if (el) renderDefaultHint();

      // Alias fuzzy search
      matches = aliases.filter(a =>
        a.alias.startsWith(cmd) ||
        a.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 7);
      if (!matches.length) return;
      results.innerHTML = matches.map((m, i) => `
        <div class="lov-match ${i===0?'selected':''}" data-index="${i}">
          <span class="lov-alias">${m.alias}</span>
          <span class="lov-name">${m.name}</span>
          <span class="lov-url">${Utils.truncate(m.url, 44)}</span>
        </div>`).join('');
      results.querySelectorAll('.lov-match').forEach(el => {
        el.addEventListener('click', () => {
          const m = matches[+el.dataset.index];
          if (m.url) { window.api.openURL(m.url); }
          else if (m.path) { window.api.openPath(m.path); }
          close();
        });
        el.addEventListener('mouseenter', () => { selectedIdx = +el.dataset.index; updateSelected(); });
      });
    };

    input.addEventListener('input', e => {
      if (activeCmd) return; // step-mode live calc preview is set inside advanceStep via input.oninput
      const val = e.target.value;
      // Space-trigger: if user typed "command " (with trailing space), auto-enter that command
      if (val.endsWith(' ') && !val.trim().includes(' ')) {
        const cmd = val.trim().toLowerCase();
        if (COMMANDS[cmd]) {
          e.target.value = '';
          enterCommand(cmd);
          return;
        }
      }
      showResults(val);
    });

    input.addEventListener('keydown', async e => {
      if (e.key === 'Escape') {
        if (activeCmd && stepIdx > 0) {
          // Back one step
          stepIdx--;
          delete stepData[COMMANDS[activeCmd].steps[stepIdx].key];
          advanceStep();
        } else if (activeCmd) {
          resetState();
        } else {
          close();
        }
        return;
      }
      if (e.key === 'Backspace' && activeCmd && input.value === '') {
        // Backspace on empty → go back a step
        if (stepIdx > 0) {
          stepIdx--;
          delete stepData[COMMANDS[activeCmd].steps[stepIdx].key];
          advanceStep();
        } else {
          resetState();
        }
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx+1, Math.max(0,matches.length-1)); updateSelected(); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(selectedIdx-1, 0); updateSelected(); return; }
      if (e.key === 'Enter') {
        if (activeCmd) {
          await commitStep();
          return;
        }
        const val = input.value.trim();
        const cmd = val.split(/\s+/)[0].toLowerCase();
        if (COMMANDS[cmd]) { enterCommand(cmd); return; }
        const t = matches[selectedIdx] || aliases.find(a => a.alias === cmd);
        if (t) {
          if (t.url) { window.api.openURL(t.url); close(); App.toast(`Opening ${t.name}…`); }
          else if (t.path) { window.api.openPath(t.path); close(); App.toast(`Launching ${t.name}…`); }
        }
      }
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    window.api.onOpenLauncherOverlay?.(() => open());
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        overlay.classList.contains('open') ? close() : open();
      }
    });
  },

  setupReminderChecker() {
    // Track last-seen time for inactivity reminders
    let lastActiveTime = Date.now();
    document.addEventListener('click', () => { lastActiveTime = Date.now(); });
    document.addEventListener('keydown', () => { lastActiveTime = Date.now(); });

    setInterval(async () => {
      const reminders = await window.api.getData('reminders').catch(() => []);
      const now = Date.now();
      let changed = false;

      for (const r of reminders) {
        if (r.fired) continue;
        if (!r.time) continue;
        const fireTime = new Date(r.time).getTime();
        if (fireTime > now) continue;

        // --- Inactivity: only fire if user was actually away ---
        if (r.condType === 'inactivity') {
          const idleMs = now - lastActiveTime;
          const thresholdMs = (r.condValue || 8) * 3600000;
          if (idleMs < thresholdMs) {
            // Not idle enough yet — push reminder forward
            r.time = new Date(now + thresholdMs).toISOString();
            changed = true;
            continue;
          }
        }

        // Fire it
        r.fired = true;
        changed = true;
        this.toast(`🔔 ${r.text}`, 'success');
        try { new Notification('Command Reminder', { body: r.text }); } catch {}

        // --- Recurring: re-arm for next occurrence ---
        if (r.recur && r.recur !== 'inactivity') {
          const next = new Date(r.time);
          if (r.recur === 'daily')    next.setDate(next.getDate() + 1);
          else if (r.recur === 'weekdays') {
            next.setDate(next.getDate() + 1);
            while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
          }
          else if (r.recur === 'weekly')  next.setDate(next.getDate() + 7);
          else if (r.recur === 'monthly') next.setMonth(next.getMonth() + 1);
          // Push a fresh copy for next occurrence
          reminders.push({
            id: Utils.uid(),
            text: r.text,
            time: next.toISOString(),
            fired: false,
            recur: r.recur,
            condType: r.condType,
            condValue: r.condValue,
          });
        }

        // --- Inactivity recurring: re-arm ---
        if (r.condType === 'inactivity') {
          reminders.push({
            id: Utils.uid(),
            text: r.text,
            time: new Date(now + (r.condValue || 8) * 3600000).toISOString(),
            fired: false,
            condType: 'inactivity',
            condValue: r.condValue,
            recur: 'inactivity',
          });
        }
      }

      if (changed) await window.api.setData('reminders', reminders);
    }, 10000);
  },

  toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.2s';
      setTimeout(() => el.remove(), 200);
    }, 2400);
  },
};

const Modules = {};

const Utils = {
  timeAgo(iso) {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d/60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  },
  
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); },
  
  // FIXED: If it's before 8am, treat it as the previous calendar day (for night owls)
  // Uses local timezone string to prevent UTC drift
  moodDate() {
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
  
  truncate(s, n) { return s && s.length > n ? s.slice(0,n)+'…' : (s||''); },
  
  // Generic drag-to-reorder for a list container.
  // items: the live array, getKey: fn(item)=>id, onReorder: async fn(newArray)
  makeDraggableList(container, items, onReorder) {
    let dragSrc = null;
    container.querySelectorAll('[data-drag-idx]').forEach(row => {
      row.setAttribute('draggable', 'true');
      row.addEventListener('dragstart', e => {
        dragSrc = row;
        e.dataTransfer.effectAllowed = 'move';
        // Use ghost image
        const label = row.querySelector('.task-text, .habit-name, .alias-name, .queue-title, .lib-entry-title')?.textContent
          || row.querySelector('[class*="-text"], [class*="-name"], [class*="-title"]')?.textContent
          || row.textContent?.trim().slice(0, 40)
          || 'Item';
        App.setDragGhost(e, label);
        setTimeout(() => row.classList.add('dragging'), 0);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.drag-over, .drop-indicator').forEach(el => {
          el.classList ? el.classList.remove('drag-over') : el.remove();
        });
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        dragSrc = null;
      });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragSrc || dragSrc === row) return;
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        // Insert drop indicator above or below
        const rect = row.getBoundingClientRect();
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        if (e.clientY < rect.top + rect.height / 2) {
          row.parentNode.insertBefore(indicator, row);
        } else {
          row.parentNode.insertBefore(indicator, row.nextSibling);
        }
        row.classList.add('drag-over');
      });
      row.addEventListener('drop', e => {
        e.preventDefault();
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        if (!dragSrc || dragSrc === row) return;
        const fromIdx = +dragSrc.dataset.dragIdx;
        const toIdx   = +row.dataset.dragIdx;
        const moved = items.splice(fromIdx, 1)[0];
        items.splice(toIdx, 0, moved);
        onReorder(items);
      });
    });
  },
  
  modHead(eyebrow, title, sub, actions='') {
    return `
      <div class="mod-head">
        <div>
          <div class="mod-eyebrow">
            <span class="mod-eyebrow-label">${eyebrow}</span>
            <span class="mod-eyebrow-rule"></span>
          </div>
          <div class="mod-title">${title}</div>
          ${sub ? `<div class="mod-sub">${sub}</div>` : ''}
        </div>
        ${actions ? `<div style="display:flex;gap:6px;align-items:flex-end">${actions}</div>` : ''}
      </div>`;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());