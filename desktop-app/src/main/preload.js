const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanSerialPorts: () => ipcRenderer.invoke('serial:scan'),
  connectSerial: (portPath) => ipcRenderer.invoke('serial:connect', portPath),
  disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
  startStreaming: () => ipcRenderer.invoke('serial:start'),
  stopStreaming: () => ipcRenderer.invoke('serial:stop'),
  sendWsMessage: (message) => ipcRenderer.invoke('ws:send', message),
  apiRequest: (options) => ipcRenderer.invoke('api:request', options),

  onSerialData: (callback) => {
    ipcRenderer.on('serial:data', (event, data) => callback(data));
  },
  onSerialPorts: (callback) => {
    ipcRenderer.on('serial:ports', (event, ports) => callback(ports));
  },
  onSerialError: (callback) => {
    ipcRenderer.on('serial:error', (event, error) => callback(error));
  },
  onSerialClosed: (callback) => {
    ipcRenderer.on('serial:closed', () => callback());
  },
  onWsMessage: (callback) => {
    ipcRenderer.on('ws:message', (event, data) => callback(data));
  },
  onWsConnected: (callback) => {
    ipcRenderer.on('ws:connected', () => callback());
  },
  onWsDisconnected: (callback) => {
    ipcRenderer.on('ws:disconnected', () => callback());
  },
  onServerLog: (callback) => {
    ipcRenderer.on('server:log', (event, data) => callback(data));
  },
  onServerReady: (callback) => {
    ipcRenderer.on('server:ready', () => callback());
  }
});