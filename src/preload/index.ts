import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Auth
  auth: {
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    onSignedOut: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('auth:signed-out', handler)
      return () => { ipcRenderer.removeListener('auth:signed-out', handler) }
    },
  },

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

  // Knowledge Base
  listKnowledgeBases: () => ipcRenderer.invoke('list-knowledge-bases'),
  getActiveKnowledgeBase: () => ipcRenderer.invoke('get-active-knowledge-base'),
  getPersonalKBStatus: () => ipcRenderer.invoke('get-personal-kb-status'),
  openFileForKB: () => ipcRenderer.invoke('open-file-for-kb'),
  buildKBFromFile: (filePath: string) => ipcRenderer.invoke('build-kb-from-file', filePath),
  buildKBFromURL: (url: string) => ipcRenderer.invoke('build-kb-from-url', url),

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
  },

  onSpeechError: (cb: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => cb(message)
    ipcRenderer.on('speech-error', handler)
    return () => ipcRenderer.removeListener('speech-error', handler)
  },

  // Answer overlay (floating right-side panel)
  onAnswerNewBlock: (cb: (question: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, question: string) => cb(question)
    ipcRenderer.on('answer-new-block', handler)
    return () => ipcRenderer.removeListener('answer-new-block', handler)
  },

  onAnswerChunk: (cb: (chunk: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string) => cb(chunk)
    ipcRenderer.on('answer-chunk', handler)
    return () => ipcRenderer.removeListener('answer-chunk', handler)
  },

  onAnswerFinalize: (cb: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on('answer-finalize', handler)
    return () => ipcRenderer.removeListener('answer-finalize', handler)
  },

  onAnswerBegin: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('answer-begin', handler)
    return () => ipcRenderer.removeListener('answer-begin', handler)
  },

  onAnswer: (cb: (payload: { text: string; category: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { text: string; category: string }) => {
      cb(payload)
    }
    ipcRenderer.on('answer-update', handler)
    return () => ipcRenderer.removeListener('answer-update', handler)
  },

  // Audio chunk from renderer mic capture → main process push stream
  sendAudioChunk: (buffer: ArrayBuffer) => {
    ipcRenderer.send('audio-chunk', Buffer.from(buffer))
  },

  dismissAnswer: () => ipcRenderer.send('hide-answer'),

  // Auto-updater
  onUpdateAvailable: (cb: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },

  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },

  installUpdate: () => ipcRenderer.send('install-update')
})
