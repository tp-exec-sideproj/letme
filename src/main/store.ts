import Store from 'electron-store'
import {
  AI_ENDPOINT,
  AI_KEY,
  AI_MODEL,
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION
} from './env-config'

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

const defaults: Settings = {
  aiEndpoint: AI_ENDPOINT,
  aiKey: AI_KEY,
  aiModel: AI_MODEL,
  azureSpeechKey: AZURE_SPEECH_KEY,
  azureSpeechRegion: AZURE_SPEECH_REGION,
  hotkeyToggle: 'CommandOrControl+\\',
  hotkeyAskAI: 'CommandOrControl+Return',
  hotkeyScreenshot: 'CommandOrControl+Shift+Return',
  hotkeySaveNote: 'CommandOrControl+Shift+N',
  hotkeyQuit: 'CommandOrControl+Shift+Escape',
  overlayOpacity: 0.88,
  autoSaveNotes: true,
  screenWatchEnabled: false,
  activeKnowledgeBase: 'general',
  personalKBContent: '',
  personalKBSource: '',
  personalKBSummary: ''
}

let store: Store<Settings> | null = null

function getStore(): Store<Settings> {
  if (!store) {
    store = new Store<Settings>({
      name: 'config',
      encryptionKey: 'letme-v1',
      defaults
    })
  }
  return store
}

export function getSettings(): Settings {
  const s = getStore()
  return {
    // For credential fields, fall back to baked-in env defaults if the stored value is empty
    aiEndpoint: s.get('aiEndpoint') || defaults.aiEndpoint,
    aiKey: s.get('aiKey') || defaults.aiKey,
    aiModel: s.get('aiModel') || defaults.aiModel,
    azureSpeechKey: s.get('azureSpeechKey') || defaults.azureSpeechKey,
    azureSpeechRegion: s.get('azureSpeechRegion') || defaults.azureSpeechRegion,
    hotkeyToggle: s.get('hotkeyToggle', defaults.hotkeyToggle),
    hotkeyAskAI: s.get('hotkeyAskAI', defaults.hotkeyAskAI),
    hotkeyScreenshot: s.get('hotkeyScreenshot', defaults.hotkeyScreenshot),
    hotkeySaveNote: s.get('hotkeySaveNote', defaults.hotkeySaveNote),
    hotkeyQuit: s.get('hotkeyQuit', defaults.hotkeyQuit),
    overlayOpacity: s.get('overlayOpacity', defaults.overlayOpacity),
    autoSaveNotes: s.get('autoSaveNotes', defaults.autoSaveNotes),
    screenWatchEnabled: s.get('screenWatchEnabled', defaults.screenWatchEnabled),
    activeKnowledgeBase: s.get('activeKnowledgeBase', defaults.activeKnowledgeBase),
    personalKBContent: s.get('personalKBContent', defaults.personalKBContent),
    personalKBSource: s.get('personalKBSource', defaults.personalKBSource),
    personalKBSummary: s.get('personalKBSummary', defaults.personalKBSummary)
  }
}

export function saveSettings(partial: Partial<Settings>): void {
  const s = getStore()
  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      s.set(key as keyof Settings, value as any)
    }
  }
}
