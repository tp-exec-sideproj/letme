import type { PanelTab } from '../types'

interface HeaderProps {
  activeTab: PanelTab
  setActiveTab: (tab: PanelTab) => void
  isRecording: boolean
  isConfigured: boolean
  isWatching: boolean
}

const tabs: Array<{ id: PanelTab; label: string }> = [
  { id: 'transcript', label: 'Live' },
  { id: 'ai', label: 'AI' },
  { id: 'notes', label: 'Notes' },
  { id: 'settings', label: 'Settings' }
]

export default function Header({ activeTab, setActiveTab, isRecording, isConfigured, isWatching }: HeaderProps) {
  return (
    <div className="header">
      <div className="drag-handle">
        <div className="drag-grip" />
        <div className="header-status">
          {isRecording && <span className="recording-dot" title="Recording" />}
          {isWatching && <span className="watch-dot" title="Screen watch active" />}
          {!isConfigured && <span className="config-warning" title="API not configured">!</span>}
        </div>
        <button
          className="close-btn"
          onClick={() => window.api.hideOverlay()}
          title="Hide (Ctrl+\)"
        >
          x
        </button>
      </div>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
