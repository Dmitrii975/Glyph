import { contextBridge, ipcRenderer } from 'electron'

const menuChannels = ['menu:new', 'menu:open', 'menu:save', 'menu:save-as', 'menu:close', 'menu:undo', 'menu:redo', 'app:close-requested']

function subscribe(channel, handler) {
  const listener = (_event, payload) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('files', {
  open: () => ipcRenderer.invoke('file:open'),
  save: (payload) => ipcRenderer.invoke('file:save', payload),
  saveAs: (payload) => ipcRenderer.invoke('file:save-as', payload),
  askSave: (payload) => ipcRenderer.invoke('file:ask-save', payload),
  openContext: () => ipcRenderer.invoke('file:open-context'),
  readText: (filePath) => ipcRenderer.invoke('file:read-text', filePath),
  confirmClose: (shouldClose) => ipcRenderer.send('app:close-decision', Boolean(shouldClose)),
  ready: () => ipcRenderer.send('app:ready'),
  on: (channel, handler) => {
    if (!menuChannels.includes(channel)) throw new Error(`Unknown channel: ${channel}`)
    return subscribe(channel, () => handler())
  },
})

contextBridge.exposeInMainWorld('ai', {
  config: () => ipcRenderer.invoke('ai:config'),
  start: (payload) => ipcRenderer.invoke('ai:start', payload),
  abort: (requestId) => ipcRenderer.send('ai:abort', requestId),
  onEvent: (handler) => subscribe('ai:event', handler),
})
