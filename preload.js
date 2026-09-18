const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goBaoDesktop', {
  chooseMusic: () => ipcRenderer.invoke('music:choose'),
  prepareMusicPath: (sourcePath) => ipcRenderer.invoke('music:prepare-path', sourcePath),
  chooseMusicFolder: () => ipcRenderer.invoke('music:choose-folder'),
  chooseLyrics: () => ipcRenderer.invoke('lyrics:choose'),
  chooseCover: () => ipcRenderer.invoke('cover:choose'),
  chooseWallpaperFolder: () => ipcRenderer.invoke('wallpaper:choose-folder'),
  toggleDesktopMode: () => ipcRenderer.invoke('app:desktop-mode'),
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen'),
  providerStatus: () => ipcRenderer.invoke('provider:status'),
  providerSearch: (name, query, options) => ipcRenderer.invoke('provider:search', name, query, options || {}),
  providerLyrics: (name, id, options) => ipcRenderer.invoke('provider:lyrics', name, id, options || {}),
  providerPlayback: (name, id, context) => ipcRenderer.invoke('provider:playback', name, id, context || {})
});
