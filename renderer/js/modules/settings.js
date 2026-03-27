// ── Settings Module ───────────────────────────────────────────────────────────
// Full theming: accent colour, backgrounds, fonts, radius, glass effect.

Modules.settings = {
  PRESETS: [
    { name: 'Gold (default)', accent: '#fbbf24', bg: '#0d0d0d', bg1: '#111111', bg2: '#141414', bg3: '#1a1a1a', bgHover: '#1e1e1e' },
    { name: 'Violet',         accent: '#a78bfa', bg: '#0a0a12', bg1: '#10101a', bg2: '#14141f', bg3: '#1a1a26', bgHover: '#1e1e2a' },
    { name: 'Cyan',           accent: '#22d3ee', bg: '#050d10', bg1: '#0a1318', bg2: '#0e1820', bg3: '#141f28', bgHover: '#182430' },
    { name: 'Rose',           accent: '#fb7185', bg: '#100810', bg1: '#160d16', bg2: '#1a111a', bg3: '#201620', bgHover: '#241a24' },
    { name: 'Emerald',        accent: '#34d399', bg: '#060d0a', bg1: '#0c1410', bg2: '#101814', bg3: '#161e1a', bgHover: '#1a2420' },
    { name: 'Slate',          accent: '#94a3b8', bg: '#0a0c0e', bg1: '#101214', bg2: '#141618', bg3: '#1a1c1e', bgHover: '#1e2022' },
    { name: 'Orange',         accent: '#fb923c', bg: '#0d0900', bg1: '#130e00', bg2: '#181200', bg3: '#1e1700', bgHover: '#231c00' },
    { name: 'Pure White',     accent: '#ffffff', bg: '#0a0a0a', bg1: '#0f0f0f', bg2: '#141414', bg3: '#1a1a1a', bgHover: '#1e1e1e' },
  ],

  async render(container) {
    let cfg = await window.api.getData('theme-config').catch(() => ({})) || {};

    const save = async () => {
      await window.api.setData('theme-config', cfg);
      App.applyTheme(cfg);
    };

    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');

    container.innerHTML = `
      <style>
        .settings-preview-box { width:100%;height:60px;border:1px solid var(--border-2);display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;transition:background .2s; }
      </style>
      ${Utils.modHead('Settings', 'Theme & Settings', 'Customise every pixel of Command')}

      <div class="settings-grid">

        <!-- Accent Colour -->
        <div class="settings-section">
          <div class="settings-section-title">Accent Colour</div>
          <div class="settings-row">
            <span class="settings-label">Current accent</span>
            <input type="color" id="accent-picker" value="${cfg.accent||'#fbbf24'}"
              style="width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0" />
            <span id="accent-hex" style="font-family:var(--mono);font-size:11px;color:var(--text-muted);min-width:60px">${cfg.accent||'#fbbf24'}</span>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:10px;color:var(--text-muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">Presets</div>
            <div class="theme-preset-grid">
              ${this.PRESETS.map((p, i) => `
                <div class="theme-preset ${(cfg.accent||'#fbbf24')===p.accent?'active':''}"
                  data-preset="${i}"
                  style="background:${p.accent}"
                  title="${esc(p.name)}"></div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Background -->
        <div class="settings-section">
          <div class="settings-section-title">Background</div>
          <div class="settings-row">
            <span class="settings-label">Base background</span>
            <input type="color" id="bg-picker" value="${cfg.bg||'#0d0d0d'}"
              style="width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0" />
            <span id="bg-hex" style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">${cfg.bg||'#0d0d0d'}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">Auto-derive layers</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
              <input type="checkbox" id="bg-auto" ${cfg.bgAuto!==false?'checked':''} style="accent-color:var(--accent)" />
              <span style="color:var(--text-dim)">Yes (recommended)</span>
            </label>
          </div>
          <div class="settings-preview-box" id="bg-preview" style="background:${cfg.bg||'#0d0d0d'}">
            <span style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase">Preview</span>
            <div style="width:40px;height:16px;background:${cfg.bg1||'#111'};border:1px solid rgba(255,255,255,.08)"></div>
            <div style="width:40px;height:16px;background:${cfg.bg2||'#141414'};border:1px solid rgba(255,255,255,.08)"></div>
          </div>
        </div>

        <!-- Font Color -->
        <div class="settings-section">
          <div class="settings-section-title">Font Color</div>
          <div class="settings-row">
            <span class="settings-label">Text color</span>
            <input type="color" id="text-color-picker" value="${cfg.textColor||'#d9d9d9'}"
              style="width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0" />
            <span id="text-color-hex" style="font-family:var(--mono);font-size:11px;color:var(--text-muted);min-width:60px">${cfg.textColor||'#d9d9d9'}</span>
          </div>
          <div class="settings-row" style="margin-top:6px">
            <span class="settings-label">Auto-derive muted/dim</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
              <input type="checkbox" id="text-color-auto" ${cfg.textColorAuto!==false?'checked':''} style="accent-color:var(--accent)" />
              <span style="color:var(--text-dim)">Yes (recommended)</span>
            </label>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:8px;line-height:1.5">Fixes invisible text on bright backgrounds. Set to dark (e.g. #111) for light themes.</div>
        </div>

        <!-- Typography -->
        <div class="settings-section">
          <div class="settings-section-title">Typography</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
            ${[
              { key:'syne',  label:'Syne (default)',       sample:'The quick fox' },
              { key:'inter', label:'Inter',                sample:'The quick fox' },
              { key:'mono',  label:'JetBrains Mono',       sample:'The quick fox' },
            ].map(f => `
              <div class="font-option ${(cfg.font||'syne')===f.key?'active':''}" data-font="${f.key}"
                style="${f.key==='mono'?'font-family:var(--mono)':''}">
                <strong style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.6">${esc(f.label)}</strong>
                <span style="margin-left:10px;font-size:13px">${esc(f.sample)}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Shape & Effects -->
        <div class="settings-section">
          <div class="settings-section-title">Shape & Effects</div>
          <div class="settings-row">
            <span class="settings-label">Rounded corners</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="rounded-toggle" ${cfg.rounded?'checked':''} style="accent-color:var(--accent)" />
              <span style="font-size:12px;color:var(--text-dim)">Enable (8px radius)</span>
            </label>
          </div>
          <div class="settings-row">
            <span class="settings-label">Glass / blur effect</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="glass-toggle" ${cfg.glass?'checked':''} style="accent-color:var(--accent)" />
              <span style="font-size:12px;color:var(--text-dim)">Enable sidebar blur</span>
            </label>
          </div>
          <div class="settings-row">
            <span class="settings-label">Animations</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="anim-toggle" ${cfg.noAnim?'':'checked'} style="accent-color:var(--accent)" />
              <span style="font-size:12px;color:var(--text-dim)">Enable transitions</span>
            </label>
          </div>
        </div>

      </div>

      <!-- Live preview swatch -->
      <div style="margin-top:20px;background:var(--bg-2);border:1px solid var(--border);padding:16px 20px">
        <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;font-weight:700">Live Preview</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-gold" style="pointer-events:none">Primary Action</button>
          <button class="btn" style="pointer-events:none">Secondary</button>
          <div class="nav-btn active" style="width:160px;pointer-events:none">
            <span class="nav-icon">◈</span><span class="nav-label">Dashboard</span>
          </div>
          <div class="task-item" style="width:200px;pointer-events:none;border-left:3px solid var(--accent)">
            <span class="task-text">Sample task</span>
          </div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--accent);border:1px solid var(--accent-line);padding:3px 8px">accent</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-gold" id="theme-save-btn" style="flex:1">Save Theme</button>
        <button class="btn" id="theme-reset-btn">Reset to Default</button>
      </div>`;

    // Accent picker
    const accentPicker = container.querySelector('#accent-picker');
    const accentHex    = container.querySelector('#accent-hex');
    accentPicker.addEventListener('input', e => {
      cfg.accent = e.target.value;
      accentHex.textContent = e.target.value;
      App.applyTheme(cfg);
    });

    // Preset clicks
    container.querySelectorAll('.theme-preset').forEach(p => {
      p.addEventListener('click', () => {
        const preset = this.PRESETS[+p.dataset.preset];
        cfg = { ...cfg, ...preset };
        accentPicker.value = preset.accent;
        accentHex.textContent = preset.accent;
        document.getElementById('bg-picker').value = preset.bg || '#0d0d0d';
        document.getElementById('bg-hex').textContent = preset.bg || '#0d0d0d';
        App.applyTheme(cfg);
        container.querySelectorAll('.theme-preset').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
      });
    });

    // BG picker
    const bgPicker = container.querySelector('#bg-picker');
    const bgHex    = container.querySelector('#bg-hex');
    bgPicker.addEventListener('input', e => {
      cfg.bg = e.target.value;
      bgHex.textContent = e.target.value;
      // Auto-derive layers by lightening slightly
      if (document.getElementById('bg-auto').checked) {
        const lighten = (hex, amt) => {
          const n = parseInt(hex.slice(1), 16);
          const r = Math.min(255, ((n>>16)&255) + amt);
          const g = Math.min(255, ((n>>8)&255) + amt);
          const b = Math.min(255, (n&255) + amt);
          return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
        };
        cfg.bg1 = lighten(e.target.value, 4);
        cfg.bg2 = lighten(e.target.value, 7);
        cfg.bg3 = lighten(e.target.value, 13);
        cfg.bgHover = lighten(e.target.value, 17);
      }
      App.applyTheme(cfg);
    });

    // Text color picker
    const textColorPicker = container.querySelector('#text-color-picker');
    const textColorHex    = container.querySelector('#text-color-hex');
    if (textColorPicker) {
      textColorPicker.addEventListener('input', e => {
        cfg.textColor = e.target.value;
        textColorHex.textContent = e.target.value;
        App.applyTheme(cfg);
      });
    }

    // Font
    container.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => {
        cfg.font = opt.dataset.font;
        container.querySelectorAll('.font-option').forEach(x => x.classList.remove('active'));
        opt.classList.add('active');
        App.applyTheme(cfg);
      });
    });

    // Toggles
    container.querySelector('#rounded-toggle').addEventListener('change', e => { cfg.rounded = e.target.checked; App.applyTheme(cfg); });
    container.querySelector('#glass-toggle').addEventListener('change',   e => { cfg.glass   = e.target.checked; App.applyTheme(cfg); });
    container.querySelector('#anim-toggle').addEventListener('change',    e => {
      cfg.noAnim = !e.target.checked;
      document.documentElement.style.setProperty('--transition', cfg.noAnim ? '0s' : '');
      if (cfg.noAnim) document.body.classList.add('no-anim');
      else            document.body.classList.remove('no-anim');
    });

    // Save
    container.querySelector('#theme-save-btn').addEventListener('click', async () => {
      cfg.rounded = document.getElementById('rounded-toggle').checked;
      cfg.glass   = document.getElementById('glass-toggle').checked;
      cfg.bgAuto  = document.getElementById('bg-auto').checked;
      cfg.textColorAuto = document.getElementById('text-color-auto')?.checked !== false;
      await save();
      App.toast('Theme saved ✓', 'success');
    });

    // Reset
    container.querySelector('#theme-reset-btn').addEventListener('click', async () => {
      const ok = await App.confirm('Reset theme to default?', { danger: true });
      if (!ok) return;
      cfg = {};
      await window.api.setData('theme-config', cfg);
      App.applyTheme(cfg);
      App.navigate('settings');
      App.toast('Theme reset');
    });
  },
};
