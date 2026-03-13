const { app, BrowserWindow, ipcMain, clipboard, Tray, Menu, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep references to prevent GC
let mainWindow = null;
let tray = null;

// Data file paths
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
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files with defaults if they don't exist
function initDataFiles() {
  const defaults = {
    clipboard: [],
    tasks: [],
    notes: [],
    bookmarks: [
      { id: 1, name: 'VS Code', type: 'app', path: '', icon: '💻', category: 'Dev' },
      { id: 2, name: 'Figma', type: 'web', url: 'https://figma.com', icon: '🎨', category: 'Design' },
    ],
    templates: [],
    reminders: [],
    'weather-config': {},
    'files-config': {folders:[]},
    'clocks-config': [],
    'recent-folders': [],
    calendar: [],
    launcher: [
      { alias: 'gh', url: 'https://github.com', name: 'GitHub' },
      { alias: 'mail', url: 'https://mail.google.com', name: 'Gmail' },
      { alias: 'yt', url: 'https://youtube.com', name: 'YouTube' },
      { alias: 'gpt', url: 'https://chatgpt.com', name: 'ChatGPT' },
      { alias: 'maps', url: 'https://maps.google.com', name: 'Google Maps' },
    ],
  };

  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (!fs.existsSync(FILES[key])) {
      fs.writeFileSync(FILES[key], JSON.stringify(defaultVal, null, 2));
    }
  }
}

// Read/write helpers
function readData(key) {
  try {
    return JSON.parse(fs.readFileSync(FILES[key], 'utf8'));
  } catch {
    return [];
  }
}

function writeData(key, data) {
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
}

// Clipboard polling
let lastClipboard = '';
let clipboardInterval = null;

function startClipboardWatcher() {
  clipboardInterval = setInterval(() => {
    try {
      const current = clipboard.readText();
      if (current && current !== lastClipboard && current.trim().length > 0) {
        lastClipboard = current;
        const history = readData('clipboard');
        // Remove duplicate if exists
        const filtered = history.filter(item => item.text !== current);
        filtered.unshift({
          id: Date.now(),
          text: current,
          timestamp: new Date().toISOString(),
          pinned: false,
        });
        // Keep max 50 items (pinned always kept)
        const pinned = filtered.filter(i => i.pinned);
        const unpinned = filtered.filter(i => !i.pinned).slice(0, 50 - pinned.length);
        writeData('clipboard', [...pinned, ...unpinned]);
        // Notify renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard-updated');
        }
      }
    } catch (e) {
      // Clipboard read errors are non-fatal
    }
  }, 1000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Dev tools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // Use a simple fallback if no icon file
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  
  try {
    tray = new Tray(iconPath);
  } catch {
    // If icon missing, skip tray (non-fatal)
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Command',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip('Command');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC Handlers
function registerIPC() {
  // Window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window-close', () => mainWindow?.hide());
  ipcMain.on('window-quit', () => app.quit());

  // Generic data CRUD
  ipcMain.handle('data-get', (_, key) => readData(key));
  ipcMain.handle('data-set', (_, key, data) => {
    writeData(key, data);
    return true;
  });

  // Clipboard specific
  ipcMain.handle('clipboard-write', (_, text) => {
    clipboard.writeText(text);
    lastClipboard = text;
    return true;
  });

  // Open external URL
  ipcMain.on('open-url', (_, url) => {
    shell.openExternal(url);
  });

  // Open app/file/folder & track recent folders
  ipcMain.on('open-path', (_, filePath) => {
    shell.openPath(filePath);
    try {
      const stat = fs.statSync(filePath);
      const dirPath = stat.isDirectory() ? filePath : path.dirname(filePath);
      
      let folders = readData('recent-folders');
      folders = folders.filter(f => f.path !== dirPath); // Remove if exists
      folders.unshift({ path: dirPath, name: path.basename(dirPath), lastOpened: new Date().toISOString() });
      
      writeData('recent-folders', folders.slice(0, 30)); // Keep top 30
    } catch (e) {
      // Ignore errors if file doesn't exist or isn't accessible
    }
  });

  // Get app version
  ipcMain.handle('get-version', () => app.getVersion());

  // System info
  ipcMain.handle('get-sys-info', async () => {
    const os = require('os');
    const cpus = os.cpus();
    // CPU usage via two samples
    const cpuUsage = () => {
      const cpus = os.cpus();
      let idle = 0, total = 0;
      for (const cpu of cpus) {
        for (const type of Object.values(cpu.times)) total += type;
        idle += cpu.times.idle;
      }
      return { idle, total };
    };
    const s1 = cpuUsage();
    await new Promise(r => setTimeout(r, 200));
    const s2 = cpuUsage();
    const cpu = Math.round((1 - (s2.idle - s1.idle) / (s2.total - s1.total)) * 100);

    return {
      cpu,
      ramTotal: os.totalmem(),
      ramUsed: os.totalmem() - os.freemem(),
      uptime: os.uptime(),
      platform: os.platform() + ' ' + os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpuModel: cpus[0]?.model?.trim() || '',
      cpuCount: cpus.length,
      nodeVersion: process.version,
    };
  });

  // Recent files (monitored folders)
  ipcMain.handle('get-recent-files', async () => {
    try {
      const config = (() => {
        try { return JSON.parse(fs.readFileSync(FILES['files-config'] || path.join(DATA_DIR,'files-config.json'), 'utf8')); } catch { return {folders:[]}; }
      })();
      if (!config.folders?.length) return [];

      const results = [];
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const folder of config.folders) {
        try {
          const entries = fs.readdirSync(folder);
          for (const entry of entries) {
            try {
              const full = path.join(folder, entry);
              const stat = fs.statSync(full);
              if (stat.isFile() && stat.mtimeMs > cutoff) {
                results.push({ path: full, mtime: stat.mtime.toISOString() });
              }
            } catch {}
          }
        } catch {}
      }
      return results.sort((a,b) => new Date(b.mtime)-new Date(a.mtime)).slice(0, 50);
    } catch { return []; }
  });
}

app.whenReady().then(() => {
  initDataFiles();
  registerIPC();
  createWindow();
  createTray();
  startClipboardWatcher();

  // Global shortcut to show/hide
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Ctrl+Space = open launcher overlay (app must be focused)
  globalShortcut.register('CommandOrControl+Space', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('open-launcher-overlay');
    }
  });

  // Auto-launch on startup — wrapped in try/catch (can fail in dev/portable mode)
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
    });
  } catch (e) {
    // Non-fatal — startup registration not critical during development
  }
});

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms — do NOT quit
  // User must Quit from tray context menu to fully exit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (clipboardInterval) clearInterval(clipboardInterval);
});