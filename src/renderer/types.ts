export interface Settings {
  aiEndpoint: string
  aiKey: string
  aiModel: string
  azureSpeechKey: string
  azureSpeechRegion: string
  hotkeyToggle: string
  hotkeyAskAI: string
  hotkeyScreenshot: string
  hotkeySaveNote: string
  hotkeyQuit: string
  overlayOpacity: number
  autoSaveNotes: boolean
  screenWatchEnabled: boolean
  activeKnowledgeBase: string
  personalKBContent: string
  personalKBSource: string
  personalKBSummary: string
}

export interface KnowledgeBaseInfo {
  id: string
  name: string
  description: string
}

export interface TranscriptEntry {
  id: number
  text: string
  final: boolean
  timestamp: Date
}

export type PanelTab = 'transcript' | 'ai' | 'notes' | 'settings'

export type ContentCategory =
  | 'QUIZ' | 'PRESENTATION' | 'WHITEBOARD' | 'DOCUMENT'
  | 'CODE' | 'GRAPH' | 'FORM' | 'DESKTOP' | 'VIDEO' | 'CHAT' | 'OTHER'

export interface WatchEvent {
  type: 'classified' | 'analyzed' | 'skipped' | 'error' | 'quiz-answered'
  category?: ContentCategory
  worthy?: boolean
  confidence?: number
  reason?: string
  analysis?: string
  error?: string
}

export interface AuthUser {
  email: string
  name: string
  picture?: string
}

export interface LetMeAPI {
  auth: {
    getSession: () => Promise<AuthUser | null>
    login: () => Promise<AuthUser>
    logout: () => Promise<void>
    onSignedOut: (cb: () => void) => () => void
  }

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

  listKnowledgeBases: () => Promise<KnowledgeBaseInfo[]>
  getActiveKnowledgeBase: () => Promise<string>
  getPersonalKBStatus: () => Promise<{ source: string; hasSummary: boolean }>
  openFileForKB: () => Promise<string | null>
  buildKBFromFile: (filePath: string) => Promise<{ source: string; summary: string }>
  buildKBFromURL: (url: string) => Promise<{ source: string; summary: string }>

  startScreenWatch: () => Promise<void>
  stopScreenWatch: () => Promise<void>
  getScreenWatchStatus: () => Promise<boolean>
  onScreenWatchEvent: (cb: (event: WatchEvent) => void) => () => void

  onTranscript: (cb: (data: { text: string; final: boolean }) => void) => () => void
  onHotkey: (cb: (action: string) => void) => () => void
  onScreenAnalysis: (cb: (result: string) => void) => () => void
  onAIStreamDone: (cb: (fullText: string) => void) => () => void
  onAIStreamError: (cb: (error: string) => void) => () => void
  onSpeechError: (cb: (message: string) => void) => () => void

  onAnswerNewBlock: (cb: (question: string) => void) => () => void
  onAnswerChunk: (cb: (chunk: string) => void) => () => void
  onAnswerFinalize: (cb: (text: string) => void) => () => void
  onAnswerBegin: (cb: () => void) => () => void
  onAnswer: (cb: (payload: { text: string; category: string }) => void) => () => void
  dismissAnswer: () => void
  sendAudioChunk: (buffer: ArrayBuffer) => void

  onUpdateAvailable: (cb: (info: { version: string }) => void) => () => void
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void
  installUpdate: () => void
}

declare global {
  interface Window {
    api: LetMeAPI
  }
}
