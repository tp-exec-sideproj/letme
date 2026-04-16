import { useState, useEffect, useCallback, useRef } from 'react'
import type { PanelTab, TranscriptEntry, WatchEvent } from './types'
import { useSettings } from './hooks/useSettings'
import { useAudio } from './hooks/useAudio'
import Overlay from './components/Overlay'
import AuthGate from './components/AuthGate'

export default function App() {
  const { settings, loading, updateSettings, isConfigured } = useSettings()
  const { isRecording, startRecording, stopRecording, error: audioError } = useAudio()
  const [activeTab, setActiveTab] = useState<PanelTab>(
    'transcript'
  )
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteFiles, setNoteFiles] = useState<string[]>([])
  const [selectedNote, setSelectedNote] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isWatching, setIsWatching] = useState(false)
  const [lastWatchEvent, setLastWatchEvent] = useState<WatchEvent | null>(null)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; ready: boolean } | null>(null)
  const transcriptIdRef = useRef(0)

  // Show settings if not configured
  useEffect(() => {
    if (!loading && !isConfigured) {
      setActiveTab('settings')
    }
  }, [loading, isConfigured])

  // Start/stop screen watch based on settings
  useEffect(() => {
    if (loading) return
    const toggle = async () => {
      if (settings.screenWatchEnabled && isConfigured) {
        await window.api.startScreenWatch()
        setIsWatching(true)
      } else {
        await window.api.stopScreenWatch()
        setIsWatching(false)
      }
    }
    toggle()
    return () => {
      window.api.stopScreenWatch()
    }
  }, [settings.screenWatchEnabled, isConfigured, loading])

  // Listen for screen watch events
  useEffect(() => {
    const cleanup = window.api.onScreenWatchEvent((event: WatchEvent) => {
      setLastWatchEvent(event)
      if (event.type === 'quiz-answered' && event.analysis) {
        // Quiz detected — surface answers immediately and prominently
        setAiResponse(`[Quiz / Exam Detected]\n\n${event.analysis}`)
        setActiveTab('ai')
        setStatusMessage('Quiz detected — answers ready')
        setTimeout(() => setStatusMessage(''), 5000)
        refreshNotes()
      } else if (event.type === 'analyzed' && event.analysis) {
        // Show a brief status toast for auto-detected content
        const label = event.category || 'Content'
        setStatusMessage(`Auto-noted: ${label}`)
        setTimeout(() => setStatusMessage(''), 3000)
        // Surface analysis in the AI panel
        setAiResponse(event.analysis)
        setActiveTab('ai')
        refreshNotes()
      }
    })
    return cleanup
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for transcripts from main process
  useEffect(() => {
    const cleanup = window.api.onTranscript((data) => {
      if (data.final) {
        setTranscripts((prev) => {
          const filtered = prev.filter((t) => t.final)
          const newEntry: TranscriptEntry = {
            id: ++transcriptIdRef.current,
            text: data.text,
            final: true,
            timestamp: new Date()
          }
          const updated = [...filtered, newEntry]
          return updated.slice(-20)
        })
      } else {
        setTranscripts((prev) => {
          const finals = prev.filter((t) => t.final)
          return [
            ...finals,
            {
              id: -1,
              text: data.text,
              final: false,
              timestamp: new Date()
            }
          ]
        })
      }
    })
    return cleanup
  }, [])

  // Listen for hotkey actions
  useEffect(() => {
    const cleanup = window.api.onHotkey((action) => {
      switch (action) {
        case 'ask-ai':
          handleAskAI()
          break
        case 'capture-screenshot':
          handleCaptureScreen()
          break
        case 'save-note':
          handleSaveNote()
          break
      }
    })
    return cleanup
  }, [prompt, aiResponse])

  // Listen for screen analysis results
  useEffect(() => {
    const cleanup = window.api.onScreenAnalysis((result) => {
      setAiResponse(result)
      setAiLoading(false)
      setActiveTab('ai')
    })
    return cleanup
  }, [])

  // Auto-update listeners
  useEffect(() => {
    const c1 = window.api.onUpdateAvailable((info: { version: string }) => {
      setUpdateInfo({ version: info.version, ready: false })
    })
    const c2 = window.api.onUpdateDownloaded((info: { version: string }) => {
      setUpdateInfo({ version: info.version, ready: true })
    })
    return () => { c1(); c2() }
  }, [])

  // Load notes list
  const refreshNotes = useCallback(async () => {
    try {
      const files = await window.api.listNotes()
      setNoteFiles(files)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshNotes()
  }, [refreshNotes])

  const handleAskAI = useCallback(async () => {
    const q = prompt.trim()
    if (!q && transcripts.length === 0) return

    setAiLoading(true)
    setAiResponse('')
    setActiveTab('ai')

    const question = q || 'Summarize the meeting discussion so far and provide key action items.'

    try {
      await window.api.askAIStream(question, (chunk) => {
        setAiResponse((prev) => prev + chunk)
      })
    } catch (err: any) {
      setAiResponse(`Error: ${err.message || 'Failed to get AI response'}`)
    } finally {
      setAiLoading(false)
      setPrompt('')
    }
  }, [prompt, transcripts])

  const handleCaptureScreen = useCallback(async () => {
    setAiLoading(true)
    setActiveTab('ai')
    setAiResponse('Capturing screen...')

    try {
      const analysis = await window.api.captureAndAnalyze()
      setAiResponse(analysis)
    } catch (err: any) {
      setAiResponse(`Error: ${err.message || 'Failed to capture screen'}`)
    } finally {
      setAiLoading(false)
    }
  }, [])

  const handleSaveNote = useCallback(async () => {
    const content = noteText.trim() || aiResponse.trim()
    if (!content) return

    try {
      await window.api.saveNote(content, noteText.trim() ? 'Manual Note' : 'AI Insight')
      setNoteText('')
      setStatusMessage('Note saved!')
      setTimeout(() => setStatusMessage(''), 2000)
      refreshNotes()
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }, [noteText, aiResponse, refreshNotes])

  const handleLoadNote = useCallback(async (filename: string) => {
    try {
      const content = await window.api.loadNote(filename)
      setSelectedNote(filename)
      setNoteContent(content)
    } catch {
      setNoteContent('Failed to load note')
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <AuthGate>
    <Overlay
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      transcripts={transcripts}
      isRecording={isRecording}
      startRecording={startRecording}
      stopRecording={stopRecording}
      audioError={audioError}
      aiResponse={aiResponse}
      aiLoading={aiLoading}
      prompt={prompt}
      setPrompt={setPrompt}
      onAskAI={handleAskAI}
      onCaptureScreen={handleCaptureScreen}
      noteText={noteText}
      setNoteText={setNoteText}
      noteFiles={noteFiles}
      selectedNote={selectedNote}
      noteContent={noteContent}
      onSaveNote={handleSaveNote}
      onLoadNote={handleLoadNote}
      onOpenNotesFolder={() => window.api.openNotesFolder()}
      onRefreshNotes={refreshNotes}
      settings={settings}
      onUpdateSettings={updateSettings}
      isConfigured={isConfigured}
      statusMessage={statusMessage}
      opacity={settings.overlayOpacity}
      isWatching={isWatching}
      updateInfo={updateInfo}
      onInstallUpdate={() => window.api.installUpdate()}
    />
    </AuthGate>
  )
}
