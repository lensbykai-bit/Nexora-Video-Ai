const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexora', {
  pickVideo: () => ipcRenderer.invoke('pick-video'),
  pickSrt: () => ipcRenderer.invoke('pick-srt'),
  saveSrt: (payload) => ipcRenderer.invoke('save-srt', payload),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (payload) => ipcRenderer.invoke('config:set', payload),
  translateGemini: (payload) => ipcRenderer.invoke('translate:gemini', payload)
});
