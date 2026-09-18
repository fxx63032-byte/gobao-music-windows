const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goBaoDesktop', {
  chooseMusic: () => ipcRenderer.invoke('music:choose'),
  prepareMusicPath: (sourcePath) => ipcRenderer.invoke('music:prepare-path', sourcePath),
  chooseMusicFolder: () => ipcRenderer.invoke('music:choose-folder'),
  chooseLyrics: () => ipcRenderer.invoke('lyrics:choose'),
  chooseWallpaperFolder: () => ipcRenderer.invoke('wallpaper:choose-folder'),
  toggleDesktopMode: () => ipcRenderer.invoke('app:desktop-mode'),
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen')
});
