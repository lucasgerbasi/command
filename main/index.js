const { app, BrowserWindow, ipcMain, clipboard, Tray, Menu, globalShortcut, shell, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const FILES = {
  clipboard: path.join(DATA_DIR, 'clipboard.json'),
  tasks: path.join(DATA_DIR, 'tasks.json'),
  notes: path.join(DATA_DIR, 'notes.json'),
  bookmarks: path.join(DATA_DIR, 'bookmarks.json'),
  calendar: path.join(DATA_DIR, 'calendar.json'),
  launcher: path.join(DATA_DIR, 'launcher.json'),
  templates: path.join(DATA_DIR, 'templates.json'),
  reminders: path.join(DATA_DIR, 'reminders.json'),
  'weather-config': path.join(DATA_DIR, 'weather-config.json'),
  'files-config': path.join(DATA_DIR, 'files-config.json'),
  'clocks-config': path.join(DATA_DIR, 'clocks-config.json'),
  'recent-folders': path.join(DATA_DIR, 'recent-folders.json'),
  'pomo-config': path.join(DATA_DIR, 'pomo-config.json'),
  habits: path.join(DATA_DIR, 'habits.json'),
  moods: path.join(DATA_DIR, 'moods.json'),
  'dashboard-config': path.join(DATA_DIR, 'dashboard-config.json'),
  'dashboard-templates': path.join(DATA_DIR, 'dashboard-templates.json'),
  'sidebar-order': path.join(DATA_DIR, 'sidebar-order.json'),
  'task-groups': path.join(DATA_DIR, 'task-groups.json'),
  'habit-groups': path.join(DATA_DIR, 'habit-groups.json'),
  'chronicle': path.join(DATA_DIR, 'chronicle.json'),
  'disabled-modules': path.join(DATA_DIR, 'disabled-modules.json'),
  'queue': path.join(DATA_DIR, 'queue.json'),
  'library': path.join(DATA_DIR, 'library.json'),
  'theme-config': path.join(DATA_DIR, 'theme-config.json'),
  'profile-config': path.join(DATA_DIR, 'profile-config.json'),
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function initDataFiles() {
  const defaults = {
    clipboard: [], tasks: [], notes: [],
    bookmarks: [
      { id: 1, name: 'VS Code', type: 'app', path: '', icon: '💻', category: 'Dev' },
      { id: 2, name: 'Figma', type: 'web', url: 'https://figma.com', icon: '🎨', category: 'Design' },
    ],
    templates: [], reminders: [], 'weather-config': {}, 'files-config': {folders:[]},
    'clocks-config': [], 'recent-folders': [], calendar: [], habits: [], moods: {}, 'pomo-config': {work: 25, break: 5},
    'dashboard-config': ['tasks','calendar','files','weather','clipboard','notes','bookmarks'],
    'dashboard-templates': [],
    'sidebar-order': [],
    'task-groups': [],
    'habit-groups': [],
    'chronicle': {},
    'disabled-modules': [],
    'queue': [],
    'library': { watch: [], read: [], play: [] },
    'theme-config': {},
    'profile-config': { name: 'User', bio: '', accent: '#fbbf24', banner: '', avatar: '' },
    launcher: [
      { alias: 'gh', url: 'https://github.com', name: 'GitHub' },
      { alias: 'mail', url: 'https://mail.google.com', name: 'Gmail' },
      { alias: 'yt', url: 'https://youtube.com', name: 'YouTube' },
    ],
  };

  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (!fs.existsSync(FILES[key])) fs.writeFileSync(FILES[key], JSON.stringify(defaultVal, null, 2));
  }
}

function readData(key) {
  try {
    return JSON.parse(fs.readFileSync(FILES[key], 'utf8'));
  } catch { return []; }
}
function writeData(key, data) {
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
}

let lastClipboard = '';
let clipboardInterval = null;

function startClipboardWatcher() {
  clipboardInterval = setInterval(() => {
    try {
      const current = clipboard.readText();
      if (current && current !== lastClipboard && current.trim().length > 0) {
        lastClipboard = current;
        const history = readData('clipboard');
        const filtered = history.filter(item => item.text !== current);
        filtered.unshift({ id: Date.now(), text: current, timestamp: new Date().toISOString(), pinned: false });
        const pinned = filtered.filter(i => i.pinned);
        const unpinned = filtered.filter(i => !i.pinned).slice(0, 50 - pinned.length);
        writeData('clipboard', [...pinned, ...unpinned]);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('clipboard-updated');
      }
    } catch (e) {}
  }, 1500);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 700,
    frame: false, transparent: false, backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.frankfurter.app; " +
          "img-src 'self' data:; " +
          "object-src 'none';"
        ]
      }
    });
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => mainWindow = null);
}

function createTray() {
  try { tray = new Tray(path.join(__dirname, '..', 'assets', 'tray-icon.png')); } catch { return; }
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Command', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('Command');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

function registerIPC() {
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.on('window-close', () => mainWindow?.hide());
  ipcMain.on('window-quit', () => app.quit());

  const VALID_KEYS = new Set([
    'clipboard','tasks','notes','bookmarks','calendar','launcher','templates',
    'reminders','weather-config','files-config','clocks-config','recent-folders',
    'pomo-config','habits','moods','dashboard-config','dashboard-templates','sidebar-order','task-groups','habit-groups','chronicle','disabled-modules',
    'queue','library','theme-config','profile-config',
  ]);

  ipcMain.handle('data-get', (_, key) => {
    if (!VALID_KEYS.has(key)) { console.warn('IPC: invalid data key', key); return null; }
    return readData(key);
  });
  ipcMain.handle('data-set', (_, key, data) => {
    if (!VALID_KEYS.has(key)) { console.warn('IPC: invalid data key', key); return false; }
    const str = JSON.stringify(data);
    if (str.length > 5 * 1024 * 1024) { console.warn('IPC: data-set payload too large'); return false; }
    writeData(key, data);
    return true;
  });

  ipcMain.handle('clipboard-write', (_, text) => {
    if (typeof text !== 'string') return false;
    clipboard.writeText(text.slice(0, 100000));
    lastClipboard = text;
    return true;
  });

  ipcMain.on('open-url', (_, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch { console.warn('IPC: invalid URL', url); }
  });

  ipcMain.on('open-path', (_, filePath) => {
    if (typeof filePath !== 'string' || !filePath.trim()) return;

    let resolvedPath = filePath;
    if (process.platform === 'win32') {
      resolvedPath = filePath.replace(/%([^%]+)%/g, (_, key) => process.env[key] || `%${key}%`);
    }

    const normalized = path.normalize(resolvedPath);
    const BLOCKED = ['/etc', '/bin', '/sbin', 'C:\\Windows\\System32\\drivers'];
    if (BLOCKED.some(b => normalized.toLowerCase().startsWith(b.toLowerCase()))) {
      if (!normalized.match(/\.(exe|lnk)$/i)) {
        console.warn('IPC: blocked path', normalized);
        return;
      }
    }

    if (normalized.toLowerCase().endsWith('.exe')) {
      const { spawn } = require('child_process');
      try {
        spawn(normalized, [], { detached: true, stdio: 'ignore' }).unref();
      } catch (e) { console.warn('IPC: spawn failed', e.message); }
    } else {
      shell.openPath(normalized);
    }

    try {
      const stat = fs.statSync(normalized);
      const dirPath = stat.isDirectory() ? normalized : path.dirname(normalized);
      let folders = readData('recent-folders');
      folders = folders.filter(f => f.path !== dirPath);
      folders.unshift({ path: dirPath, name: path.basename(dirPath), lastOpened: new Date().toISOString() });
      writeData('recent-folders', folders.slice(0, 30));
    } catch {}
  });

  ipcMain.on('start-drag', (event, filePath) => {
    if (typeof filePath !== 'string') return;
    const normalized = path.normalize(filePath);
    if (!fs.existsSync(normalized)) return;
    const emptyIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    event.sender.startDrag({ file: normalized, icon: emptyIcon });
  });

  ipcMain.handle('get-version', () => app.getVersion());

  // Execute a script file (.bat, .ps1, .sh)
  ipcMain.handle('run-script', (_, scriptPath) => {
    if (typeof scriptPath !== 'string') return { ok: false, error: 'Invalid path' };
    const normalized = path.normalize(scriptPath);
    if (!fs.existsSync(normalized)) return { ok: false, error: 'File not found' };
    const ext = path.extname(normalized).toLowerCase();
    let cmd, args;
    if (ext === '.bat' || ext === '.cmd') {
      cmd = 'cmd.exe'; args = ['/c', normalized];
    } else if (ext === '.ps1') {
      cmd = 'powershell.exe'; args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', normalized];
    } else if (ext === '.sh') {
      cmd = process.env.SHELL || 'bash'; args = [normalized];
    } else {
      return { ok: false, error: 'Unsupported script type' };
    }
    try {
      const { spawn } = require('child_process');
      spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Pick a script file via dialog
  ipcMain.handle('pick-script', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Script',
      filters: [
        { name: 'Scripts', extensions: ['bat','cmd','ps1','sh'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('get-sys-info', async () => {
    const os = require('os');
    const cpuSample = () => {
      const cpus = os.cpus();
      let idle = 0, total = 0;
      for (const cpu of cpus) {
        for (const type in cpu.times) total += cpu.times[type];
        idle += cpu.times.idle;
      }
      return { idle, total };
    };
    const s1 = cpuSample();
    await new Promise(r => setTimeout(r, 200));
    const s2 = cpuSample();
    const idleDiff = s2.idle - s1.idle;
    const totalDiff = s2.total - s1.total;
    const cpuPct = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    return {
      cpu: cpuPct,
      cpuModel: cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'Unknown',
      cpuCount: cpus.length,
      ramTotal: totalMem,
      ramUsed: totalMem - freeMem,
      uptime: os.uptime(),
      platform: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
    };
  });

  ipcMain.handle('get-os-folders', async () => {
    try {
      const results = new Map(); 
      
      const appRecent = readData('recent-folders');
      appRecent.forEach(f => results.set(f.path, new Date(f.lastOpened).getTime()));

      if (process.platform === 'win32') {
        const recentPath = app.getPath('recent');
        if (fs.existsSync(recentPath)) {
          const files = fs.readdirSync(recentPath);
          for (const file of files) {
            if (file.endsWith('.lnk')) {
              try {
                const fullPath = path.join(recentPath, file);
                const stat = fs.statSync(fullPath);
                const target = shell.readShortcutLink(fullPath).target;
                if (target && fs.existsSync(target)) {
                  if (fs.statSync(target).isDirectory()) {
                    results.set(target, Math.max(results.get(target) || 0, stat.mtimeMs));
                  } else {
                    const parent = path.dirname(target);
                    results.set(parent, Math.max(results.get(parent) || 0, stat.mtimeMs));
                  }
                }
              } catch (e) {} 
            }
          }
        }
      }

      const sorted = Array.from(results.entries())
        .sort((a,b) => b[1] - a[1])
        .slice(0, 40)
        .map(([p, time]) => ({
          path: p,
          name: path.basename(p),
          lastOpened: new Date(time).toISOString()
        }));
        
      return sorted;
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('calc-eval', (_, expr) => {
    if (typeof expr !== 'string') return { error: 'Invalid input' };
    if (!/^[\d\s+\-*/%^().]+$/.test(expr)) return { error: 'Invalid characters' };
    if (expr.length > 200) return { error: 'Expression too long' };
    try {
      const safe = expr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safe})`)();
      if (!Number.isFinite(result)) return { error: 'Result is not finite' };
      return { result };
    } catch (e) {
      return { error: 'Syntax error' };
    }
  });

  ipcMain.handle('sync-export', (_, destPath) => {
    try {
      const bundle = { _version: 1, _exported: new Date().toISOString(), data: {} };
      const SYNC_KEYS = [
        'tasks','notes','bookmarks','calendar','launcher','templates',
        'reminders','clocks-config','pomo-config','habits','moods','dashboard-config','dashboard-templates','sidebar-order','task-groups','habit-groups','chronicle','disabled-modules','dashboard-templates',
      ];
      for (const key of SYNC_KEYS) {
        try { bundle.data[key] = JSON.parse(fs.readFileSync(FILES[key], 'utf8')); } catch {}
      }
      const normalized = path.normalize(destPath);
      fs.writeFileSync(normalized, JSON.stringify(bundle, null, 2), 'utf8');
      return { ok: true, path: normalized, keys: SYNC_KEYS.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('sync-import', (_, srcPath, mode) => {
    try {
      const normalized = path.normalize(srcPath);
      if (!fs.existsSync(normalized)) return { ok: false, error: 'File not found' };
      const raw = fs.readFileSync(normalized, 'utf8');
      const bundle = JSON.parse(raw);
      if (!bundle._version || !bundle.data) return { ok: false, error: 'Invalid bundle format' };

      const SYNC_KEYS = new Set([
        'tasks','notes','bookmarks','calendar','launcher','templates',
        'reminders','clocks-config','pomo-config','habits','moods','dashboard-config','dashboard-templates','sidebar-order','task-groups','habit-groups','chronicle','disabled-modules','dashboard-templates',
      ]);

      let imported = 0;
      for (const [key, val] of Object.entries(bundle.data)) {
        if (!SYNC_KEYS.has(key)) continue; 
        if (mode === 'merge') {
          const existing = (() => { try { return JSON.parse(fs.readFileSync(FILES[key], 'utf8')); } catch { return null; } })();
          if (Array.isArray(existing) && Array.isArray(val)) {
            const existingIds = new Set(existing.map(i => i.id || i.text || JSON.stringify(i)));
            const newItems = val.filter(i => !existingIds.has(i.id || i.text || JSON.stringify(i)));
            writeData(key, [...existing, ...newItems]);
          } else if (existing && typeof existing === 'object' && typeof val === 'object' && !Array.isArray(val)) {
            writeData(key, { ...existing, ...val });
          } else {
            writeData(key, val); 
          }
        } else {
          writeData(key, val); 
        }
        imported++;
      }
      return { ok: true, imported, exported: bundle._exported };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('sync-dialog', async (_, type) => {
    const { dialog } = require('electron');
    if (type === 'save') {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Command Data',
        defaultPath: path.join(app.getPath('desktop'), `command-sync-${new Date().toISOString().slice(0,10)}.json`),
        filters: [{ name: 'Command Sync', extensions: ['json'] }],
      });
      return result.canceled ? null : result.filePath;
    } else {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Command Data',
        filters: [{ name: 'Command Sync', extensions: ['json'] }],
        properties: ['openFile'],
      });
      return result.canceled ? null : result.filePaths[0];
    }
  });

  ipcMain.handle('chronicle-delete-snapshot', (_, date) => {
    const chronicle = readChronicle();
    if (chronicle[date] && chronicle[date].snapshot) {
      chronicle[date].snapshot = null;
      writeChronicle(chronicle);
      return true;
    }
    return false;
  });

  ipcMain.handle('chronicle-delete-all', () => {
    writeChronicle({});
    return true;
  });

  ipcMain.handle('chronicle-delete-app', (_, date, appTitle) => {
    const chronicle = readChronicle();
    const dayData = chronicle[date];
    if (!dayData) return false;

    let changed = false;

    // Remove from active "Today" tracking pool
    if (dayData.windows && dayData.windows[appTitle] !== undefined) {
      delete dayData.windows[appTitle];
      changed = true;
    }

    // Remove from a completed snapshot
    if (dayData.snapshot && dayData.snapshot.top10) {
      const removedApp = dayData.snapshot.top10.find(w => w.title === appTitle);
      if (removedApp) {
        dayData.snapshot.top10 = dayData.snapshot.top10.filter(w => w.title !== appTitle);
        // Deduct the ticks so the total checks tally stays mathematically accurate
        dayData.snapshot.totalPolls = Math.max(0, (dayData.snapshot.totalPolls || 0) - (removedApp.ticks || 0));
        changed = true;
      }
    }

    if (changed) writeChronicle(chronicle);
    return changed;
  });
}

// ─── Chronicle Engine ────────────────────────────────────────────────────────

const CHRONICLE_PATH = path.join(DATA_DIR, 'chronicle.json');

const WINDOW_EXCLUDE_PATTERNS = [
  /^$/,
  /spotify/i, /discord/i, /steam/i, /file explorer/i, /windows explorer/i,
  /notepad/i, /task manager/i, /settings/i, /control panel/i,
  /system tray/i, /program manager/i, /desktop/i,
];

function isExcluded(title) {
  return !title || WINDOW_EXCLUDE_PATTERNS.some(p => p.test(title));
}

function chronicleDate() {
  const now = new Date();
  if (now.getHours() < 8) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getActiveWindowTitle() {
  if (process.platform !== 'win32') return null;
  return new Promise(resolve => {
    const { exec } = require('child_process');
    const psCmd = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class W32 { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int c); }'; $h = [W32]::GetForegroundWindow(); $s = New-Object System.Text.StringBuilder 256; [W32]::GetWindowText($h, $s, 256) | Out-Null; $s.ToString()`;
    exec(`powershell -NoProfile -NonInteractive -Command "${psCmd.replace(/"/g, '\\"')}"`, { timeout: 3000 }, (err, stdout) => resolve(err ? null : (stdout || '').trim() || null));
  });
}

function readChronicle() {
  try { return JSON.parse(fs.readFileSync(CHRONICLE_PATH, 'utf8')); } catch { return {}; }
}
function writeChronicle(data) {
  fs.writeFileSync(CHRONICLE_PATH, JSON.stringify(data, null, 2));
}

let chronicleEnabled = true; // runtime flag, synced with _enabled in chronicle.json
let chronicleRetryTimer = null; // 2-min retry timer handle

// Titles that mean "Command itself is focused" — don't log these
const COMMAND_SELF_PATTERNS = [
  /^command$/i,
  /^command\s*[-–—]/i,
  /[-–—]\s*command$/i,
];
function isCommandSelf(title) {
  return !title || COMMAND_SELF_PATTERNS.some(p => p.test(title));
}

async function chroniclePoll() {
  if (!chronicleEnabled) return;

  const title = await getActiveWindowTitle();

  // Command is in the foreground — schedule a 2-min retry instead of waiting 15
  if (isCommandSelf(title)) {
    if (!chronicleRetryTimer) {
      chronicleRetryTimer = setTimeout(() => {
        chronicleRetryTimer = null;
        chroniclePoll();
      }, 2 * 60 * 1000);
    }
    return;
  }

  if (!title || isExcluded(title)) {
    // Also retry in 2 min if window is excluded (e.g. desktop, taskbar)
    if (!chronicleRetryTimer) {
      chronicleRetryTimer = setTimeout(() => {
        chronicleRetryTimer = null;
        chroniclePoll();
      }, 2 * 60 * 1000);
    }
    return;
  }

  // Successful tick — cancel any pending retry (the 15-min interval takes over)
  if (chronicleRetryTimer) { clearTimeout(chronicleRetryTimer); chronicleRetryTimer = null; }

  const date = chronicleDate();
  const chronicle = readChronicle();
  if (!chronicle[date]) chronicle[date] = { windows: {}, snapshot: null };
  if (!chronicle[date].windows) chronicle[date].windows = {};

  chronicle[date].windows[title] = (chronicle[date].windows[title] || 0) + 1;
  writeChronicle(chronicle);
}

function titleSimilarity(a, b) {
  const digitWord = /\b\d+\b/g;
  const digA = (a.match(digitWord) || []).join('|');
  const digB = (b.match(digitWord) || []).join('|');
  if (digA !== digB) return 0;

  const clean = s => s
    .replace(/\d+\.\d+[\d.]*\b/g, '')
    .replace(/smapi\s+[\d.]+/gi, '')
    .replace(/with\s+\d+\s+mods?/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();

  const sa = clean(a), sb = clean(b);
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;

  
  const la = sa.length, lb = sb.length;
  if (Math.abs(la - lb) > Math.max(la, lb) * 0.5) return 0;
  const dp = Array.from({ length: la + 1 }, (_, i) => Array.from({ length: lb + 1 }, (_, j) => i || j));
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = sa[i-1] === sb[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  const dist = dp[la][lb];
  const maxLen = Math.max(la, lb);
  return 1 - dist / maxLen;
}

function mergeSimilarTitles(windows) {
  const entries = Object.entries(windows);
  const merged = {};
  const used = new Set();

  for (let i = 0; i < entries.length; i++) {
    if (used.has(i)) continue;
    let [canonTitle, canonTicks] = entries[i];
    const group = [[canonTitle, canonTicks]];

    for (let j = i + 1; j < entries.length; j++) {
      if (used.has(j)) continue;
      const [t2, n2] = entries[j];
      if (titleSimilarity(canonTitle, t2) >= 0.72) {
        group.push([t2, n2]);
        used.add(j);
      }
    }
    used.add(i);

    const totalTicks = group.reduce((s, [, n]) => s + n, 0);
    const best = group.sort((a, b) => b[1] - a[1])[0][0];
    merged[best] = totalTicks;
  }
  return merged;
}

// ── Clipboard keyword extractor ───────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','up','about','into','through','during','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','need','dare','ought','used','it','its',
  'this','that','these','those','i','me','my','we','our','you','your','he','she',
  'they','them','their','what','which','who','how','when','where','why','all',
  'each','every','both','few','more','most','other','some','such','no','not',
  'only','same','so','than','too','very','just','as','if','then','else','also',
  'http','https','www','com','org','net','io','co','html','css','js','json',
  'true','false','null','undefined','new','var','let','const','function','return',
]);

function extractKeywords(clipboardItems, userKeyword) {
  // Count per-clip occurrences (spam resistance: same word in 1 clip = 1 count)
  const wordClipCounts = {};

  for (const clip of clipboardItems) {
    const text = (clip.text || '').slice(0, 5000);
    // Tokenize: grab words 3+ chars, ignore pure numbers
    const seen = new Set();
    const tokens = text.match(/[a-zA-Z_][a-zA-Z0-9_'-]{2,}/g) || [];
    for (const tok of tokens) {
      const w = tok.toLowerCase().replace(/^'+|'+$/g, '');
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      if (!seen.has(w)) {
        seen.add(w);
        wordClipCounts[w] = (wordClipCounts[w] || 0) + 1;
      }
    }
  }

  // Sort by clip-count descending, take top 10 unique
  const sorted = Object.entries(wordClipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  // Prepend user keyword if provided (unique)
  if (userKeyword && userKeyword.trim()) {
    const uk = userKeyword.trim();
    const filtered = sorted.filter(w => w.toLowerCase() !== uk.toLowerCase());
    return [uk, ...filtered].slice(0, 10);
  }
  return sorted;
}

// CATCH-UP LOGIC: Scans history to find any day with data but no snapshot
async function buildDailySnapshot() {
  const chronicle = readChronicle();
  const todayKey = chronicleDate();
  
  const missedDays = Object.keys(chronicle).filter(date => date !== todayKey && !chronicle[date].snapshot);

  for (const dateKey of missedDays) {
    const dayData = chronicle[dateKey];
    const rawWindows = dayData.windows || {};
    if (Object.keys(rawWindows).length === 0) continue;

    // Merge similar titles before ranking
    const windows = mergeSimilarTitles(rawWindows);

    const sortedWindows = Object.entries(windows)
      .filter(([title]) => !isExcluded(title))
      .sort((a, b) => b[1] - a[1])
      .map(([title, polls]) => ({ title, ticks: polls }));

    const top8 = sortedWindows.slice(0, 8);
    const remaining = sortedWindows.slice(8);
    const random2 = remaining.sort(() => Math.random() - 0.5).slice(0, 2);
    const finalWindows = [...top8, ...random2];

    let mood = null;
    try {
      const moods = JSON.parse(fs.readFileSync(FILES.moods, 'utf8'));
      const entry = moods[dateKey];
      if (entry) mood = typeof entry === 'object' ? entry : { score: entry };
    } catch {}

    // Extract keywords from clipboard items of that day
    let keywords = [];
    try {
      const clipHistory = JSON.parse(fs.readFileSync(FILES.clipboard, 'utf8'));
      const dayClips = clipHistory.filter(c => c.timestamp && c.timestamp.slice(0, 10) === dateKey);
      const userKw = dayData.userKeyword || null;
      keywords = extractKeywords(dayClips, userKw);
    } catch {}

    dayData.snapshot = {
      date: dateKey,
      builtAt: new Date().toISOString(),
      top10: finalWindows,
      mood,
      keywords,
      totalPolls: Object.values(windows).reduce((a, b) => a + b, 0),
    };
  }

  // Re-attach moods to any snapshot where mood is null but moods.json now has data
  const moods = (() => { try { return JSON.parse(fs.readFileSync(FILES.moods, 'utf8')); } catch { return {}; } })();
  Object.keys(chronicle).forEach(dateKey => {
    const snap = chronicle[dateKey]?.snapshot;
    if (snap && !snap.mood && moods[dateKey]) {
      snap.mood = typeof moods[dateKey] === 'object' ? moods[dateKey] : { score: moods[dateKey] };
    }
  });

  writeChronicle(chronicle);
}

// Set a user keyword for a specific day's snapshot
ipcMain.handle('chronicle-set-user-keyword', (_, date, keyword) => {
  const c = readChronicle();
  if (c[date]) {
    c[date].userKeyword = keyword || '';
    // Clear snapshot so it gets rebuilt with new keyword
    if (c[date].snapshot) c[date].snapshot.userKeyword = keyword || '';
    writeChronicle(c);
  }
});

function startChronicle() {
  // Load enabled state from stored data
  const _c = readChronicle();
  chronicleEnabled = _c._enabled !== false; // default true

  chroniclePoll().catch(e => console.warn('Chronicle poll error:', e));
  
  setInterval(() => chroniclePoll().catch(e => console.warn('Chronicle poll error:', e)), 15 * 60 * 1000);

  const catchUpCheck = async () => {
    await buildDailySnapshot();
    // Notify renderer so it can auto-refresh if Chronicle is open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chronicle-updated');
    }
  };

  powerMonitor.on('resume', () => {
    setTimeout(() => catchUpCheck().catch(e => console.warn('Chronicle catch-up error:', e)), 5000);
  });

  catchUpCheck().catch(e => console.warn('Chronicle catch-up error:', e));
  setInterval(() => catchUpCheck().catch(e => console.warn('Chronicle catch-up error:', e)), 60 * 60 * 1000);
}

ipcMain.handle('chronicle-get', () => readChronicle());
ipcMain.handle('chronicle-build-snapshot', () => buildDailySnapshot());

// Retroactively attach/update a mood on an existing snapshot
ipcMain.handle('chronicle-set-snapshot-mood', (_, date, moodData) => {
  const chronicle = readChronicle();
  if (!chronicle[date]) return;
  if (!chronicle[date].snapshot) {
    // Create a minimal snapshot shell so the mood is attached
    chronicle[date].snapshot = {
      date,
      builtAt: new Date().toISOString(),
      top10: [],
      mood: moodData,
      clips: [],
      totalPolls: Object.values(chronicle[date].windows || {}).reduce((a,b)=>a+b,0),
    };
  } else {
    chronicle[date].snapshot.mood = moodData;
  }
  writeChronicle(chronicle);
});

// Re-sync: pull latest mood from moods.json into all snapshots
ipcMain.handle('chronicle-sync-moods', () => {
  const chronicle = readChronicle();
  const moods = (() => { try { return JSON.parse(fs.readFileSync(FILES.moods, 'utf8')); } catch { return {}; } })();
  Object.keys(chronicle).forEach(dateKey => {
    const snap = chronicle[dateKey]?.snapshot;
    if (snap && moods[dateKey]) {
      snap.mood = typeof moods[dateKey] === 'object' ? moods[dateKey] : { score: moods[dateKey] };
    }
  });
  writeChronicle(chronicle);
  return true;
});
ipcMain.handle('chronicle-get-excluded', () => WINDOW_EXCLUDE_PATTERNS.filter(p => p instanceof RegExp && p.source !== '^$').map(p => p.source));

// Privacy toggle
ipcMain.handle('chronicle-set-enabled', (_, val) => {
  const c = readChronicle(); c._enabled = !!val; writeChronicle(c);
  chronicleEnabled = !!val;
});
ipcMain.handle('chronicle-is-enabled', () => {
  const c = readChronicle(); return c._enabled !== false; // default on
});

app.whenReady().then(() => {
  initDataFiles(); registerIPC(); createWindow(); createTray(); startClipboardWatcher(); startChronicle();
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) mainWindow.isVisible() && mainWindow.isFocused() ? mainWindow.hide() : (mainWindow.show(), mainWindow.focus());
  });
  globalShortcut.register('CommandOrControl+Space', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('open-launcher-overlay'); }
  });
});

app.on('window-all-closed', () => {});
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (clipboardInterval) clearInterval(clipboardInterval); });