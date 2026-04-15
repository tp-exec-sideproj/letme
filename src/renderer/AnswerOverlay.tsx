import { useState, useEffect, useRef } from 'react'
import { LogoMark } from './components/Logo'
import './styles/answer.css'

interface QABlock {
  id: number
  question: string
  streamText: string
  finalText: string
  streaming: boolean
}

let blockCounter = 0

export default function AnswerOverlay() {
  const [blocks, setBlocks] = useState<QABlock[]>([])
  const [quizPayload, setQuizPayload] = useState<{ text: string; category: string } | null>(null)
  const [visible, setVisible] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever blocks change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [blocks])

  // New Q&A block — question detected
  useEffect(() => {
    const cleanup = window.api.onAnswerNewBlock((question: string) => {
      const id = ++blockCounter
      setBlocks(prev => [...prev, { id, question, streamText: '', finalText: '', streaming: true }])
      setQuizPayload(null)
      setVisible(true)
    })
    return cleanup
  }, [])

  // Streaming chunk — append to last block
  useEffect(() => {
    const cleanup = window.api.onAnswerChunk((chunk: string) => {
      setBlocks(prev => {
        if (!prev.length) return prev
        const next = [...prev]
        const last = { ...next[next.length - 1] }
        last.streamText += chunk
        next[next.length - 1] = last
        return next
      })
    })
    return cleanup
  }, [])

  // Finalize last block
  useEffect(() => {
    const cleanup = window.api.onAnswerFinalize((text: string) => {
      setBlocks(prev => {
        if (!prev.length) return prev
        const next = [...prev]
        const last = { ...next[next.length - 1] }
        last.finalText = text
        last.streaming = false
        next[next.length - 1] = last
        return next
      })
    })
    return cleanup
  }, [])

  // Quiz answer (single-block mode)
  useEffect(() => {
    const cleanup = window.api.onAnswer((payload: { text: string; category: string }) => {
      setQuizPayload(payload)
      setBlocks([])
      setVisible(true)
    })
    return cleanup
  }, [])

  const clearSession = () => {
    setBlocks([])
    setQuizPayload(null)
    setVisible(false)
    window.api.dismissAnswer()
  }

  if (!visible) return null

  return (
    <div className="session-panel">
      {/* Draggable header */}
      <div className="session-header drag-region">
        <div className="session-brand">
          <LogoMark size={20} />
          <span className="session-title">LetMe</span>
        </div>
        <div className="session-actions no-drag">
          <span className="session-count">{blocks.length > 0 ? `${blocks.length} Q` : ''}</span>
          <button className="session-clear" onClick={clearSession} title="Clear session">✕</button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="session-body" ref={scrollRef}>
        {quizPayload && (
          <div className="qa-block quiz-block">
            <div className="qa-question-label">Quiz</div>
            <div className="qa-answer-text quiz-text">{quizPayload.text}</div>
          </div>
        )}

        {blocks.map((block) => (
          <div key={block.id} className={`qa-block ${block.streaming ? 'streaming' : 'done'}`}>
            <div className="qa-question-text">{block.question}</div>
            <div className="qa-divider" />
            <div className="qa-answer-text">
              {block.streaming ? (
                <>
                  {block.streamText}
                  <span className="qa-cursor" />
                </>
              ) : (
                block.finalText
              )}
            </div>
          </div>
        ))}

        {blocks.length === 0 && !quizPayload && (
          <div className="session-empty">Waiting for questions…</div>
        )}
      </div>
    </div>
  )
}
