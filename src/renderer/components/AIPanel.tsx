import { useRef, useEffect } from 'react'

interface AIPanelProps {
  aiResponse: string
  aiLoading: boolean
  prompt: string
  setPrompt: (p: string) => void
  onAskAI: () => void
  onCaptureScreen: () => void
}

export default function AIPanel({
  aiResponse,
  aiLoading,
  prompt,
  setPrompt,
  onAskAI,
  onCaptureScreen
}: AIPanelProps) {
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [aiResponse])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAskAI()
    }
  }

  const isQuizResponse = aiResponse.startsWith('[Quiz / Exam Detected]')

  return (
    <div className="ai-panel">
      <div className={`ai-response-area${isQuizResponse ? ' quiz-response' : ''}`} ref={responseRef}>
        {!aiResponse && !aiLoading ? (
          <div className="empty-state">
            <p>AI Assistant</p>
            <p className="hint">
              Ask a question or press Ctrl+Enter to summarize the meeting
            </p>
            <p className="hint">
              Ctrl+Shift+Enter to capture and analyze screen
            </p>
          </div>
        ) : (
          <>
            {isQuizResponse && (
              <div className="quiz-banner">Quiz / Exam — Auto Answers</div>
            )}
            <div className="ai-response-text">
              {isQuizResponse ? aiResponse.replace('[Quiz / Exam Detected]\n\n', '') : aiResponse}
              {aiLoading && <span className="typing-cursor">▊</span>}
            </div>
          </>
        )}
      </div>

      <div className="ai-input-area">
        <textarea
          className="ai-input"
          placeholder="Ask AI about the meeting..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={aiLoading}
        />
        <div className="ai-actions">
          <button
            className="action-btn primary"
            onClick={onAskAI}
            disabled={aiLoading}
            title="Ask AI (Ctrl+Enter)"
          >
            {aiLoading ? (
              <span className="spinner-small" />
            ) : (
              '-> Ask'
            )}
          </button>
          <button
            className="action-btn"
            onClick={onCaptureScreen}
            disabled={aiLoading}
            title="Capture Screen (Ctrl+Shift+Enter)"
          >
            Screen
          </button>
        </div>
      </div>
    </div>
  )
}
