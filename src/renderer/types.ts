export interface Settings {
  azureAiEndpoint: string
  azureAiKey: string
  azureAiModel: string
  azureSpeechKey: string
  azureSpeechRegion: string
  hotkeyToggle: string
  hotkeyAskAI: string
  hotkeyScreenshot: string
  hotkeySaveNote: string
  hotkeyQuit: string
  overlayOpacity: number
  autoSaveNotes: boolean
}

export interface TranscriptEntry {
  id: number
  text: string
  final: boolean
  timestamp: Date
}

export type PanelTab = 'transcript' | 'ai' | 'notes' | 'settings'

export interface PhantomAPI {
  startSpeech: () => Promise<void>
  stopSpeech: () => Promise<void>

  askAI: (prompt: string, imageBase64?: string) => Promise<string>
  askAIStream: (prompt: string, onChunk: (text: string) => void) => Promise<void>
  captureAndAnalyze: () => Promise<string>

  saveNote: (content: string, tag?: string) => Promise<void>
  listNotes: () => Promise<string[]>
  loadNote: (filename: string) => Promise<string>
  openNotesFolder: () => Promise<void>

  getSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<void>

  setIgnoreMouseEvents: (ignore: boolean) => void
  hideOverlay: () => void
  quitApp: () => void

  onTranscript: (cb: (data: { text: string; final: boolean }) => void) => () => void
  onHotkey: (cb: (action: string) => void) => () => void
  onScreenAnalysis: (cb: (result: string) => void) => () => void
  onAIStreamDone: (cb: (fullText: string) => void) => () => void
  onAIStreamError: (cb: (error: string) => void) => () => void
}

declare global {
  interface Window {
    api: PhantomAPI
  }
}
