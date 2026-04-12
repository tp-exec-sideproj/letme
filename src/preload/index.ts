import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Speech
  startSpeech: () => ipcRenderer.invoke('start-speech'),
  stopSpeech: () => ipcRenderer.invoke('stop-speech'),

  // AI
  askAI: (prompt: string, imageBase64?: string) =>
    ipcRenderer.invoke('ask-ai', prompt, imageBase64),

  askAIStream: (prompt: string, onChunk: (text: string) => void) => {
    const chunkHandler = (_event: Electron.IpcRendererEvent, chunk: string) => {
      onChunk(chunk)
    }
    ipcRenderer.on('ai-stream-chunk', chunkHandler)

    return ipcRenderer.invoke('ask-ai-stream', prompt).finally(() => {
      ipcRenderer.removeListener('ai-stream-chunk', chunkHandler)
    })
  },

  captureAndAnalyze: () => ipcRenderer.invoke('capture-and-analyze'),

  // Notes
  saveNote: (content: string, tag?: string) =>
    ipcRenderer.invoke('save-note', content, tag),
  listNotes: () => ipcRenderer.invoke('list-notes'),
  loadNote: (filename: string) => ipcRenderer.invoke('load-note', filename),
  openNotesFolder: () => ipcRenderer.invoke('open-notes-folder'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Window control
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // Events from main
  onTranscript: (cb: (data: { text: string; final: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { text: string; final: boolean }) => {
      cb(data)
    }
    ipcRenderer.on('transcript-update', handler)
    return () => {
      ipcRenderer.removeListener('transcript-update', handler)
    }
  },

  onHotkey: (cb: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => {
      cb(action)
    }
    ipcRenderer.on('hotkey-action', handler)
    return () => {
      ipcRenderer.removeListener('hotkey-action', handler)
    }
  },

  onScreenAnalysis: (cb: (result: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: string) => {
      cb(result)
    }
    ipcRenderer.on('screen-analysis', handler)
    return () => {
      ipcRenderer.removeListener('screen-analysis', handler)
    }
  },

  // Screen Watch
  startScreenWatch: () => ipcRenderer.invoke('start-screen-watch'),
  stopScreenWatch: () => ipcRenderer.invoke('stop-screen-watch'),
  getScreenWatchStatus: () => ipcRenderer.invoke('get-screen-watch-status'),

  onScreenWatchEvent: (cb: (event: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => cb(data)
    ipcRenderer.on('screen-watch-event', handler)
    return () => ipcRenderer.removeListener('screen-watch-event', handler)
  },

  onAIStreamDone: (cb: (fullText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, fullText: string) => {
      cb(fullText)
    }
    ipcRenderer.on('ai-stream-done', handler)
    return () => {
      ipcRenderer.removeListener('ai-stream-done', handler)
    }
  },

  onAIStreamError: (cb: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => {
      cb(error)
    }
    ipcRenderer.on('ai-stream-error', handler)
    return () => {
      ipcRenderer.removeListener('ai-stream-error', handler)
    }
  }
})
