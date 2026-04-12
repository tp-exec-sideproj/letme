import { useState, useEffect, useRef } from 'react'
import './styles/answer.css'

interface AnswerPayload {
  text: string
  category: string
}

export default function AnswerOverlay() {
  const [answer, setAnswer] = useState<AnswerPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cleanup = (window.api as any).onAnswer((payload: AnswerPayload) => {
      setAnswer(payload)
      setVisible(true)

      // Reset fade timer
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
      fadeTimer.current = setTimeout(() => setVisible(false), 43_000)
    })
    return cleanup
  }, [])

  const dismiss = () => {
    setVisible(false)
    ;(window.api as any).dismissAnswer()
  }

  if (!visible || !answer) return null

  const isQuiz = answer.category === 'QUIZ'

  return (
    <div className={`answer-card ${isQuiz ? 'quiz' : 'interview'}`}>
      <div className="answer-header">
        <span className="answer-label">{isQuiz ? 'Quiz Answer' : 'Interview Assist'}</span>
        <button className="answer-close" onClick={dismiss}>x</button>
      </div>
      <div className="answer-body">
        <pre className="answer-text">{answer.text}</pre>
      </div>
    </div>
  )
}
