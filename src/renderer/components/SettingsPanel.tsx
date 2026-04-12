import { useState, useEffect } from 'react'
import type { Settings } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>
  isConfigured: boolean
}

type KBBuildStatus = 'idle' | 'building' | 'done' | 'error'

export default function SettingsPanel({
  settings,
  onUpdateSettings
}: SettingsPanelProps) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState<Settings>({ ...settings })
  const [kbStatus, setKbStatus] = useState<KBBuildStatus>('idle')
  const [kbError, setKbError] = useState('')
  const [kbSource, setKbSource] = useState(settings.personalKBSource || '')
  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    setLocal({ ...settings })
    setKbSource(settings.personalKBSource || '')
  }, [settings])

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

  const handlePickFile = async () => {
    setKbStatus('building')
    setKbError('')
    try {
      const filePath = await (window.api as any).openFileForKB()
      if (!filePath) { setKbStatus('idle'); return }
      const result = await (window.api as any).buildKBFromFile(filePath)
      setKbSource(result.source)
      setLocal((prev) => ({ ...prev, activeKnowledgeBase: 'personal' }))
      setKbStatus('done')
    } catch (err: any) {
      setKbError(err.message || 'Failed to process file')
      setKbStatus('error')
    }
  }

  const handleBuildFromURL = async () => {
    if (!urlInput.trim()) return
    setKbStatus('building')
    setKbError('')
    try {
      const result = await (window.api as any).buildKBFromURL(urlInput.trim())
      setKbSource(result.source)
      setLocal((prev) => ({ ...prev, activeKnowledgeBase: 'personal' }))
      setKbStatus('done')
    } catch (err: any) {
      setKbError(err.message || 'Failed to fetch URL')
      setKbStatus('error')
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h4>Personal Knowledge Base</h4>
        <p className="settings-hint">
          Upload your resume or link your website so the AI can give answers tailored to your background.
        </p>

        {kbSource && local.activeKnowledgeBase === 'personal' && (
          <div className="kb-active-badge">
            Active: {kbSource}
          </div>
        )}

        <div className="kb-builder">
          <button
            className="action-btn kb-upload-btn"
            onClick={handlePickFile}
            disabled={kbStatus === 'building'}
          >
            {kbStatus === 'building' ? 'Processing...' : 'Upload Resume / PDF / Markdown'}
          </button>

          <div className="kb-url-row">
            <input
              className="settings-input"
              type="text"
              placeholder="https://yourportfolio.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuildFromURL()}
              disabled={kbStatus === 'building'}
            />
            <button
              className="action-btn"
              onClick={handleBuildFromURL}
              disabled={kbStatus === 'building' || !urlInput.trim()}
            >
              Import
            </button>
          </div>

          {kbStatus === 'done' && (
            <p className="kb-success">Knowledge base built from {kbSource}. AI will now use your profile.</p>
          )}
          {kbStatus === 'error' && (
            <p className="kb-error">{kbError}</p>
          )}
        </div>

        <div className="kb-mode-row">
          <label className="setting-row checkbox">
            <input
              type="radio"
              name="kbMode"
              checked={local.activeKnowledgeBase === 'personal'}
              onChange={() => handleChange('activeKnowledgeBase', 'personal')}
              disabled={!kbSource}
            />
            <span>Personal Profile {!kbSource && <small>(upload first)</small>}</span>
          </label>
          <label className="setting-row checkbox">
            <input
              type="radio"
              name="kbMode"
              checked={local.activeKnowledgeBase === 'interview'}
              onChange={() => handleChange('activeKnowledgeBase', 'interview')}
            />
            <span>General Interview</span>
          </label>
          <label className="setting-row checkbox">
            <input
              type="radio"
              name="kbMode"
              checked={local.activeKnowledgeBase === 'meeting'}
              onChange={() => handleChange('activeKnowledgeBase', 'meeting')}
            />
            <span>Business Meeting</span>
          </label>
          <label className="setting-row checkbox">
            <input
              type="radio"
              name="kbMode"
              checked={local.activeKnowledgeBase === 'general'}
              onChange={() => handleChange('activeKnowledgeBase', 'general')}
            />
            <span>General</span>
          </label>
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
