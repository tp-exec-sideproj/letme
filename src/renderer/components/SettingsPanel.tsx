import { useState } from 'react'
import type { Settings } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>
  isConfigured: boolean
}

export default function SettingsPanel({
  settings,
  onUpdateSettings,
  isConfigured
}: SettingsPanelProps) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState<Settings>({ ...settings })

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
      {!isConfigured && (
        <div className="config-banner">
          ⚠️ Please configure your API keys to enable AI features
        </div>
      )}

      <div className="settings-section">
        <h4>AI Provider</h4>
        <label className="setting-row">
          <span>Endpoint</span>
          <input
            type="text"
            value={local.aiEndpoint}
            onChange={(e) => handleChange('aiEndpoint', e.target.value)}
            placeholder="https://your-api-endpoint/v1"
          />
        </label>
        <label className="setting-row">
          <span>API Key</span>
          <input
            type="password"
            value={local.aiKey}
            onChange={(e) => handleChange('aiKey', e.target.value)}
            placeholder="Your API key"
          />
        </label>
        <label className="setting-row">
          <span>Model</span>
          <input
            type="text"
            value={local.aiModel}
            onChange={(e) => handleChange('aiModel', e.target.value)}
            placeholder="e.g. gpt-4o, claude-3-5-sonnet"
          />
        </label>
      </div>

      <div className="settings-section">
        <h4>Azure Speech</h4>
        <label className="setting-row">
          <span>Speech Key</span>
          <input
            type="password"
            value={local.azureSpeechKey}
            onChange={(e) => handleChange('azureSpeechKey', e.target.value)}
            placeholder="Your Azure Speech key"
          />
        </label>
        <label className="setting-row">
          <span>Region</span>
          <input
            type="text"
            value={local.azureSpeechRegion}
            onChange={(e) => handleChange('azureSpeechRegion', e.target.value)}
            placeholder="eastus"
          />
        </label>
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
              Auto-detect &amp; note quizzes, slides, graphs, code every 10s
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
        {saving ? 'Saving...' : '💾 Save Settings'}
      </button>
    </div>
  )
}
