import { contextBridge, ipcRenderer } from 'electron';
import type { TypelessBridge, AppSnapshot, CaptureCommand } from '../src/shared/contracts';
const bridge: TypelessBridge = {
  getSnapshot: () => ipcRenderer.invoke('typeless:snapshot'),
  dispatch: action => ipcRenderer.invoke('typeless:action', action),
  subscribe(listener) {
    const wrapped = (_event: unknown, snapshot: AppSnapshot) => listener(snapshot);
    ipcRenderer.on('typeless:snapshot', wrapped);
    return () => ipcRenderer.removeListener('typeless:snapshot', wrapped);
  },
  onCaptureCommand(listener) {
    const wrapped = (_event: unknown, command: CaptureCommand) => listener(command);
    ipcRenderer.on('typeless:capture', wrapped);
    return () => ipcRenderer.removeListener('typeless:capture', wrapped);
  },
  reportCapture: event => ipcRenderer.send('typeless:capture-event', event),
};
contextBridge.exposeInMainWorld('typeless', bridge);
