const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  quit: () => ipcRenderer.send('window-quit'),

  getData: (key) => ipcRenderer.invoke('data-get', key),
  setData: (key, data) => ipcRenderer.invoke('data-set', key, data),

  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  onClipboardUpdated: (cb) => ipcRenderer.on('clipboard-updated', cb),
  onOpenLauncherOverlay: (cb) => ipcRenderer.on('open-launcher-overlay', cb),

  openURL: (url) => ipcRenderer.send('open-url', url),
  openPath: (path) => ipcRenderer.send('open-path', path),
  
  // New Native Drag-Out integration
  startDrag: (path) => ipcRenderer.send('start-drag', path),

  getVersion: () => ipcRenderer.invoke('get-version'),
  getSysInfo: () => ipcRenderer.invoke('get-sys-info'),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  
  // Global OS Folder tracking
  getOSFolders: () => ipcRenderer.invoke('get-os-folders'),

  // Safe server-side math eval (sandbox-compatible)
  calcEval: (expr) => ipcRenderer.invoke('calc-eval', expr),

  // Sync / backup
  // Chronicle
  chronicleGet: () => ipcRenderer.invoke('chronicle-get'),
  chronicleBuildSnapshot: () => ipcRenderer.invoke('chronicle-build-snapshot'),
  chronicleSetEnabled: (val) => ipcRenderer.invoke('chronicle-set-enabled', val),
  chronicleIsEnabled: () => ipcRenderer.invoke('chronicle-is-enabled'),
  chronicleSetSnapshotMood: (date, mood) => ipcRenderer.invoke('chronicle-set-snapshot-mood', date, mood),
  chronicleSyncMoods: () => ipcRenderer.invoke('chronicle-sync-moods'),
  onChronicleUpdated: (cb) => ipcRenderer.on('chronicle-updated', cb),
  chronicleDeleteSnapshot: (date) => ipcRenderer.invoke('chronicle-delete-snapshot', date),
  chronicleDeleteAll: () => ipcRenderer.invoke('chronicle-delete-all'),
  chronicleDeleteApp: (date, appTitle) => ipcRenderer.invoke('chronicle-delete-app', date, appTitle),

  syncExport: (destPath) => ipcRenderer.invoke('sync-export', destPath),
  syncImport: (srcPath, mode) => ipcRenderer.invoke('sync-import', srcPath, mode),
  syncDialog: (type) => ipcRenderer.invoke('sync-dialog', type),

  // Script execution
  runScript: (path) => ipcRenderer.invoke('run-script', path),
  pickScript: () => ipcRenderer.invoke('pick-script'),

  // Chronicle extras
  chronicleSetUserKeyword: (date, kw) => ipcRenderer.invoke('chronicle-set-user-keyword', date, kw),
});