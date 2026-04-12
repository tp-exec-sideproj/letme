import Store from 'electron-store'

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

const defaults: Settings = {
  azureAiEndpoint: process.env.AZURE_AI_ENDPOINT || '',
  azureAiKey: process.env.AZURE_AI_KEY || '',
  azureAiModel: process.env.AZURE_AI_MODEL || 'claude-sonnet-4-5',
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
  hotkeyToggle: 'CommandOrControl+\\',
  hotkeyAskAI: 'CommandOrControl+Return',
  hotkeyScreenshot: 'CommandOrControl+Shift+Return',
  hotkeySaveNote: 'CommandOrControl+Shift+N',
  hotkeyQuit: 'CommandOrControl+Shift+Escape',
  overlayOpacity: 0.88,
  autoSaveNotes: true
}

let store: Store<Settings> | null = null

function getStore(): Store<Settings> {
  if (!store) {
    store = new Store<Settings>({
      name: 'config',
      encryptionKey: 'phantom-ai-v1',
      defaults
    })
  }
  return store
}

export function getSettings(): Settings {
  const s = getStore()
  return {
    azureAiEndpoint: s.get('azureAiEndpoint', defaults.azureAiEndpoint),
    azureAiKey: s.get('azureAiKey', defaults.azureAiKey),
    azureAiModel: s.get('azureAiModel', defaults.azureAiModel),
    azureSpeechKey: s.get('azureSpeechKey', defaults.azureSpeechKey),
    azureSpeechRegion: s.get('azureSpeechRegion', defaults.azureSpeechRegion),
    hotkeyToggle: s.get('hotkeyToggle', defaults.hotkeyToggle),
    hotkeyAskAI: s.get('hotkeyAskAI', defaults.hotkeyAskAI),
    hotkeyScreenshot: s.get('hotkeyScreenshot', defaults.hotkeyScreenshot),
    hotkeySaveNote: s.get('hotkeySaveNote', defaults.hotkeySaveNote),
    hotkeyQuit: s.get('hotkeyQuit', defaults.hotkeyQuit),
    overlayOpacity: s.get('overlayOpacity', defaults.overlayOpacity),
    autoSaveNotes: s.get('autoSaveNotes', defaults.autoSaveNotes)
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
