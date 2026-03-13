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

  getVersion: () => ipcRenderer.invoke('get-version'),
  getSysInfo: () => ipcRenderer.invoke('get-sys-info'),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
});
