import type { PanelTab } from '../types'

interface HeaderProps {
  activeTab: PanelTab
  setActiveTab: (tab: PanelTab) => void
  isRecording: boolean
  isConfigured: boolean
  isWatching: boolean
}

const tabs: Array<{ id: PanelTab; label: string; icon: string }> = [
  { id: 'transcript', label: 'Transcript', icon: '🎙' },
  { id: 'ai', label: 'AI', icon: '✨' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

export default function Header({ activeTab, setActiveTab, isRecording, isConfigured, isWatching }: HeaderProps) {
  return (
    <div className="header">
      <div className="drag-handle">
        <div className="drag-grip" />
        <div className="header-status">
          {isRecording && <span className="recording-dot" title="Recording" />}
          {isWatching && <span className="watch-dot" title="Screen watch active" />}
          {!isConfigured && <span className="config-warning" title="API keys not configured">⚠️</span>}
        </div>
        <button
          className="close-btn"
          onClick={() => window.api.hideOverlay()}
          title="Hide (Ctrl+\)"
        >
          ×
        </button>
      </div>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
