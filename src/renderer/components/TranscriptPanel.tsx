import { useEffect, useRef } from 'react'
import type { TranscriptEntry } from '../types'

interface TranscriptPanelProps {
  transcripts: TranscriptEntry[]
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  audioError: string | null
}

export default function TranscriptPanel({
  transcripts,
  isRecording,
  startRecording,
  stopRecording,
  audioError
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts])

  return (
    <div className="transcript-panel">
      <div className="panel-header-row">
        <h3>Live Transcript</h3>
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <>
              <span className="recording-dot" /> Stop
            </>
          ) : (
            '● Start'
          )}
        </button>
      </div>

      {audioError && <div className="error-message">{audioError}</div>}

      <div className="transcript-list" ref={scrollRef}>
        {transcripts.length === 0 ? (
          <div className="empty-state">
            <p>No transcript yet</p>
            <p className="hint">Click Start to begin recording</p>
          </div>
        ) : (
          transcripts.map((entry) => (
            <div
              key={entry.id}
              className={`transcript-entry ${entry.final ? 'final' : 'interim'}`}
            >
              {entry.final && (
                <span className="transcript-time">
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              <span className="transcript-text">{entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
