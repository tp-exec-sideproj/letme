import { useState, useEffect, useCallback } from 'react'
import type { Settings } from '../types'

const defaultSettings: Settings = {
  azureAiEndpoint: '',
  azureAiKey: '',
  azureAiModel: 'claude-sonnet-4-5',
  azureSpeechKey: '',
  azureSpeechRegion: 'eastus',
  hotkeyToggle: 'CommandOrControl+\\',
  hotkeyAskAI: 'CommandOrControl+Return',
  hotkeyScreenshot: 'CommandOrControl+Shift+Return',
  hotkeySaveNote: 'CommandOrControl+Shift+N',
  hotkeyQuit: 'CommandOrControl+Shift+Escape',
  overlayOpacity: 0.88,
  autoSaveNotes: true
}

interface UseSettingsReturn {
  settings: Settings
  loading: boolean
  updateSettings: (partial: Partial<Settings>) => Promise<void>
  isConfigured: boolean
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api
      .getSettings()
      .then((s) => {
        setSettings(s)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    await window.api.saveSettings(partial)
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  const isConfigured =
    Boolean(settings.azureAiEndpoint) && Boolean(settings.azureAiKey)

  return { settings, loading, updateSettings, isConfigured }
}
