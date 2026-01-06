import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('metViewer', {
  saveImage: (url: string, defaultName?: string) =>
    ipcRenderer.invoke('save-image', { url, defaultName }),
});
