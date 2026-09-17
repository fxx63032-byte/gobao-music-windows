const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goBaoDesktop', {
  chooseMusic: () => ipcRenderer.invoke('music:choose'),
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen')
});
