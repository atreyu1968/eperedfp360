'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const allowed={
  catalog:()=>ipcRenderer.invoke('catalog'),
  launch:payload=>ipcRenderer.invoke('launch',payload),
  summary:studentId=>ipcRenderer.invoke('summary',studentId)
};
contextBridge.exposeInMainWorld('epe',Object.freeze(allowed));
