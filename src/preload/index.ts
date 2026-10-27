import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DesktopAPI } from '../shared/model'
const api: DesktopAPI = {
  load: () => ipcRenderer.invoke(IPC.load),
  saveStudent: (value) => ipcRenderer.invoke(IPC.student, value),
  saveSession: (value) => ipcRenderer.invoke(IPC.session, value),
  saveDrawing: (value) => ipcRenderer.invoke(IPC.drawing, value),
  saveSettings: (value) => ipcRenderer.invoke(IPC.settings, value),
  exportFile: (kind, filter) => ipcRenderer.invoke(IPC.export, kind, filter),
  selectBackup: () => ipcRenderer.invoke(IPC.selectBackup),
  restoreBackup: () => ipcRenderer.invoke(IPC.restoreBackup)
}
contextBridge.exposeInMainWorld('api', api)
