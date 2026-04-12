import type { PanelTab, TranscriptEntry, Settings } from '../types'
import Header from './Header'
import TranscriptPanel from './TranscriptPanel'
import AIPanel from './AIPanel'
import NotesPanel from './NotesPanel'
import SettingsPanel from './SettingsPanel'

interface OverlayProps {
  activeTab: PanelTab
  setActiveTab: (tab: PanelTab) => void
  transcripts: TranscriptEntry[]
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  audioError: string | null
  aiResponse: string
  aiLoading: boolean
  prompt: string
  setPrompt: (p: string) => void
  onAskAI: () => void
  onCaptureScreen: () => void
  noteText: string
  setNoteText: (t: string) => void
  noteFiles: string[]
  selectedNote: string
  noteContent: string
  onSaveNote: () => void
  onLoadNote: (filename: string) => void
  onOpenNotesFolder: () => void
  onRefreshNotes: () => void
  settings: Settings
  onUpdateSettings: (partial: Partial<Settings>) => Promise<void>
  isConfigured: boolean
  statusMessage: string
  opacity: number
  isWatching: boolean
  updateInfo: { version: string; ready: boolean } | null
  onInstallUpdate: () => void
}

export default function Overlay(props: OverlayProps) {
  const handleMouseEnter = () => {
    window.api.setIgnoreMouseEvents(false)
  }

  const handleMouseLeave = () => {
    window.api.setIgnoreMouseEvents(true)
  }

  return (
    <div className="overlay-root">
      <div
        className="overlay-panel"
        style={{ opacity: props.opacity }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Header
          activeTab={props.activeTab}
          setActiveTab={props.setActiveTab}
          isRecording={props.isRecording}
          isConfigured={props.isConfigured}
          isWatching={props.isWatching}
        />

        <div className="panel-content">
          {props.activeTab === 'transcript' && (
            <TranscriptPanel
              transcripts={props.transcripts}
              isRecording={props.isRecording}
              startRecording={props.startRecording}
              stopRecording={props.stopRecording}
              audioError={props.audioError}
            />
          )}

          {props.activeTab === 'ai' && (
            <AIPanel
              aiResponse={props.aiResponse}
              aiLoading={props.aiLoading}
              prompt={props.prompt}
              setPrompt={props.setPrompt}
              onAskAI={props.onAskAI}
              onCaptureScreen={props.onCaptureScreen}
            />
          )}

          {props.activeTab === 'notes' && (
            <NotesPanel
              noteText={props.noteText}
              setNoteText={props.setNoteText}
              noteFiles={props.noteFiles}
              selectedNote={props.selectedNote}
              noteContent={props.noteContent}
              onSaveNote={props.onSaveNote}
              onLoadNote={props.onLoadNote}
              onOpenNotesFolder={props.onOpenNotesFolder}
              onRefreshNotes={props.onRefreshNotes}
            />
          )}

          {props.activeTab === 'settings' && (
            <SettingsPanel
              settings={props.settings}
              onUpdateSettings={props.onUpdateSettings}
              isConfigured={props.isConfigured}
            />
          )}
        </div>

        {props.statusMessage && (
          <div className="status-toast">{props.statusMessage}</div>
        )}

        {props.updateInfo && (
          <div className="update-banner">
            {props.updateInfo.ready ? (
              <>
                Update v{props.updateInfo.version} ready
                <button className="update-btn" onClick={props.onInstallUpdate}>Restart</button>
              </>
            ) : (
              <>Downloading update v{props.updateInfo.version}...</>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
