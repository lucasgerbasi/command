const App = {
  currentModule: 'dashboard',

  async init() {
    this.setupTitlebar();
    this.setupNav();
    this.setupClock();
    this.setupModal();
    this.setupClipboardListener();
    this.setupLauncherOverlay();
    this.setupReminderChecker();
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

  setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.module));
    });
  },

  navigate(module) {
    this.currentModule = module;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === module));

    // Update titlebar section label
    const labels = {
      dashboard:'Dashboard', clipboard:'Clipboard', templates:'Templates',
      launcher:'Quick Launcher', tasks:'Tasks', notes:'Notes',
      bookmarks:'Bookmarks', calendar:'Calendar', weather:'Weather',
      sysmon:'System Monitor', files:'Folders & Files',
      clocks:'World Clocks', reminders:'Reminders', random:'Random'
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

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  },

  setupClipboardListener() {
    window.api.onClipboardUpdated(() => {
      if (this.currentModule === 'clipboard' || this.currentModule === 'dashboard') {
        this.navigate(this.currentModule);
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

    window.api.getData('launcher').then(d => { aliases = d; });

    const open = () => {
      window.api.getData('launcher').then(d => { aliases = d; });
      overlay.classList.add('open');
      input.value = '';
      results.innerHTML = '';
      input.focus();
    };
    const close = () => {
      overlay.classList.remove('open');
      input.value = '';
      results.innerHTML = '';
    };
    const updateSelected = () => {
      results.querySelectorAll('.lov-match').forEach((el, i) =>
        el.classList.toggle('selected', i === selectedIdx)
      );
    };
    const showResults = (val) => {
      if (!val.trim()) { results.innerHTML = ''; return; }
      matches = aliases.filter(a =>
        a.alias.startsWith(val.toLowerCase()) ||
        a.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 7);
      selectedIdx = 0;
      results.innerHTML = matches.map((m, i) => `
        <div class="lov-match ${i===0?'selected':''}" data-index="${i}">
          <span class="lov-alias">${m.alias}</span>
          <span class="lov-name">${m.name}</span>
          <span class="lov-url">${Utils.truncate(m.url, 44)}</span>
        </div>`).join('');
      results.querySelectorAll('.lov-match').forEach(el => {
        el.addEventListener('click', () => { window.api.openURL(matches[+el.dataset.index].url); close(); });
        el.addEventListener('mouseenter', () => { selectedIdx = +el.dataset.index; updateSelected(); });
      });
    };

    input.addEventListener('input', e => showResults(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key==='Escape') { close(); return; }
      if (e.key==='ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx+1,matches.length-1); updateSelected(); return; }
      if (e.key==='ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(selectedIdx-1,0); updateSelected(); return; }
      if (e.key==='Enter') {
        const t = matches[selectedIdx] || aliases.find(a => a.alias===input.value.trim().toLowerCase());
        if (t) { window.api.openURL(t.url); close(); App.toast(`Opening ${t.name}…`); }
      }
    });
    overlay.addEventListener('click', e => { if (e.target===overlay) close(); });
    window.api.onOpenLauncherOverlay?.(() => open());
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.code==='Space') {
        e.preventDefault();
        overlay.classList.contains('open') ? close() : open();
      }
    });
  },

  setupReminderChecker() {
    setInterval(async () => {
      const reminders = await window.api.getData('reminders').catch(() => []);
      const now = Date.now();
      let changed = false;
      for (const r of reminders) {
        if (!r.fired && r.time && new Date(r.time).getTime() <= now) {
          r.fired = true;
          changed = true;
          this.toast(`🔔 ${r.text}`, 'success');
          // Native notification via title bar flash (Electron handles it)
          try {
            new Notification('Command Reminder', { body: r.text });
          } catch {}
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
  truncate(s, n) { return s && s.length > n ? s.slice(0,n)+'…' : (s||''); },
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