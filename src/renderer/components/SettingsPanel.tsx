import { useState, useEffect } from 'react'
import type { Settings, KnowledgeBaseInfo } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>
  isConfigured: boolean
}

export default function SettingsPanel({
  settings,
  onUpdateSettings
}: SettingsPanelProps) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState<Settings>({ ...settings })
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseInfo[]>([])

  useEffect(() => {
    window.api.listKnowledgeBases().then(setKnowledgeBases).catch(() => {})
  }, [])

  const handleChange = (key: keyof Settings, value: string | number | boolean) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdateSettings(local)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h4>Knowledge Base</h4>
        <p style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>
          Select the context that matches your current session for better AI responses.
        </p>
        <div className="kb-list">
          {knowledgeBases.map((kb) => (
            <label key={kb.id} className="kb-item">
              <input
                type="radio"
                name="knowledgeBase"
                value={kb.id}
                checked={local.activeKnowledgeBase === kb.id}
                onChange={() => handleChange('activeKnowledgeBase', kb.id)}
              />
              <div className="kb-info">
                <span className="kb-name">{kb.name}</span>
                <span className="kb-desc">{kb.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h4>Preferences</h4>
        <label className="setting-row">
          <span>Overlay Opacity</span>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.05"
            value={local.overlayOpacity}
            onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))}
          />
          <span className="opacity-value">{Math.round(local.overlayOpacity * 100)}%</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={local.autoSaveNotes}
            onChange={(e) => handleChange('autoSaveNotes', e.target.checked)}
          />
          <span>Auto-save AI responses as notes</span>
        </label>
        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={local.screenWatchEnabled}
            onChange={(e) => handleChange('screenWatchEnabled', e.target.checked)}
          />
          <span>
            Continuous screen watch
            <small style={{ display: 'block', opacity: 0.6, fontSize: '11px', marginTop: '2px' }}>
              Auto-detect and note quizzes, slides, graphs, code every 10s
            </small>
          </span>
        </label>
      </div>

      <div className="settings-section">
        <h4>Hotkeys</h4>
        <div className="hotkey-list">
          <div className="hotkey-item">
            <span>Toggle Overlay</span>
            <code>{settings.hotkeyToggle}</code>
          </div>
          <div className="hotkey-item">
            <span>Ask AI</span>
            <code>{settings.hotkeyAskAI}</code>
          </div>
          <div className="hotkey-item">
            <span>Screen Capture</span>
            <code>{settings.hotkeyScreenshot}</code>
          </div>
          <div className="hotkey-item">
            <span>Save Note</span>
            <code>{settings.hotkeySaveNote}</code>
          </div>
          <div className="hotkey-item">
            <span>Emergency Quit</span>
            <code>{settings.hotkeyQuit}</code>
          </div>
        </div>
      </div>

      <button
        className="action-btn primary save-settings-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
