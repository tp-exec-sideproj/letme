import { createHash } from 'crypto'
import { captureScreen } from './screenshot'
import { askAI, analyzeScreenshot } from './ai-client'
import { saveNote } from './notes'
import { addToTranscript } from './shared-state'

export type ContentCategory =
  | 'QUIZ'
  | 'PRESENTATION'
  | 'WHITEBOARD'
  | 'DOCUMENT'
  | 'CODE'
  | 'GRAPH'
  | 'FORM'
  | 'DESKTOP'
  | 'VIDEO'
  | 'CHAT'
  | 'OTHER'

export interface ContentClassification {
  worthy: boolean
  category: ContentCategory
  confidence: number
  reason: string
}

export interface WatchEvent {
  type: 'classified' | 'analyzed' | 'skipped' | 'error' | 'quiz-answered'
  category?: ContentCategory
  worthy?: boolean
  confidence?: number
  reason?: string
  analysis?: string
  answer?: string
  error?: string
}

const WORTHY_CATEGORIES: ContentCategory[] = [
  'QUIZ',
  'PRESENTATION',
  'WHITEBOARD',
  'DOCUMENT',
  'CODE',
  'GRAPH',
  'FORM'
]

const MIN_CONFIDENCE = 60

const CLASSIFIER_SYSTEM_PROMPT = `You are a screen content classifier for a meeting assistant.
Analyze the screenshot and determine if it contains noteworthy meeting content worth taking notes about.

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text):
{"worthy":true/false,"category":"CATEGORY","confidence":0-100,"reason":"one sentence"}

Categories to use:
- QUIZ: quiz, exam, test questions, multiple choice, fill-in-the-blank, coding challenge, assessment
- PRESENTATION: PowerPoint, Google Slides, Keynote, slide decks being presented
- WHITEBOARD: whiteboard, drawing board, freehand diagrams or notes
- DOCUMENT: important documents, reports, articles, specs being reviewed
- CODE: code editor, terminal output, code being reviewed or debugged
- GRAPH: charts, graphs, dashboards, data visualizations, analytics
- FORM: forms, surveys, structured data entry screens
- DESKTOP: regular desktop, file explorer, taskbar, idle screen
- VIDEO: webcam/video feed of people, no meeting content
- CHAT: messaging apps, email, chat without meeting-relevant content
- OTHER: anything else not meeting-relevant

TAKE NOTES (worthy: true) for: QUIZ, PRESENTATION, WHITEBOARD, DOCUMENT, CODE, GRAPH, FORM
SKIP (worthy: false) for: DESKTOP, VIDEO, CHAT, OTHER`

const QUIZ_ANSWER_SYSTEM_PROMPT = `You are an expert assistant helping answer quiz and exam questions in real time.

The screenshot shows a quiz, exam, assessment, or test. Your job:
1. Read ALL visible questions carefully
2. For each question, provide the correct answer with a brief explanation
3. For multiple choice questions, identify the correct option letter AND explain why
4. For coding challenges, provide working code with comments
5. For math or logic problems, show the solution steps
6. Be accurate and direct — the user needs correct answers immediately

Format your response as:
Q1: [question text if visible]
Answer: [correct answer]
Reason: [brief explanation why this is correct]

Q2: [question text if visible]
Answer: [correct answer]
Reason: [brief explanation]

If the question has already been answered on screen, confirm if the answer shown is correct or provide the correct one.
Do not hedge or add disclaimers — just answer correctly and concisely.`

let watchInterval: ReturnType<typeof setInterval> | null = null
let lastCaptureHash = ''
let lastWorthyHash = ''
let sendEvent: ((event: WatchEvent) => void) | null = null

export function startScreenWatch(onEvent: (event: WatchEvent) => void): void {
  if (watchInterval) return
  sendEvent = onEvent
  lastCaptureHash = ''
  lastWorthyHash = ''

  // Immediate first check, then every 10 seconds
  runCheck()
  watchInterval = setInterval(runCheck, 10_000)
}

export function stopScreenWatch(): void {
  if (watchInterval) {
    clearInterval(watchInterval)
    watchInterval = null
  }
  sendEvent = null
}

export function isWatching(): boolean {
  return watchInterval !== null
}

async function runCheck(): Promise<void> {
  if (!sendEvent) return

  try {
    const imageBase64 = await captureScreen()

    // Hash first ~8KB of image data for change detection (fast, not full image)
    const hash = createHash('md5').update(imageBase64.slice(0, 8000)).digest('hex')
    if (hash === lastCaptureHash) {
      // Screen unchanged — no need to classify
      return
    }
    lastCaptureHash = hash

    // Step 1: Classify content — is it worth analyzing?
    const classification = await classifyContent(imageBase64)

    sendEvent({
      type: 'classified',
      category: classification.category,
      worthy: classification.worthy,
      confidence: classification.confidence,
      reason: classification.reason
    })

    if (!classification.worthy || classification.confidence < MIN_CONFIDENCE) {
      sendEvent({
        type: 'skipped',
        category: classification.category,
        reason: `Not noteworthy (${classification.category}, confidence ${classification.confidence}%)`
      })
      return
    }

    // Skip if same worthy content as last analysis (same slide, same code, etc.)
    if (hash === lastWorthyHash) {
      return
    }
    lastWorthyHash = hash

    // Step 2: QUIZ gets automatic answer generation; everything else gets notes
    if (classification.category === 'QUIZ') {
      const answers = await answerQuiz(imageBase64)

      addToTranscript(`[Quiz Detected] ${answers}`)
      try {
        saveNote(answers, 'Quiz Answers')
      } catch (err) {
        console.error('[ScreenWatcher] Failed to save quiz note:', err)
      }

      sendEvent({
        type: 'quiz-answered',
        category: 'QUIZ',
        analysis: answers
      })
    } else {
      // Step 2b: Full analysis of noteworthy non-quiz content
      const analysis = await analyzeScreenshot(imageBase64)

      addToTranscript(`[Screen: ${classification.category}] ${analysis}`)
      try {
        saveNote(analysis, `Auto-Detected: ${classification.category}`)
      } catch (err) {
        console.error('[ScreenWatcher] Failed to save note:', err)
      }

      sendEvent({
        type: 'analyzed',
        category: classification.category,
        analysis
      })
    }
  } catch (err: any) {
    // Silently handle missing API keys (expected when not configured)
    const msg: string = err?.message || String(err)
    if (!msg.includes('not configured')) {
      console.error('[ScreenWatcher] Error during check:', msg)
    }
    if (sendEvent) {
      sendEvent({ type: 'error', error: msg })
    }
  }
}

async function classifyContent(imageBase64: string): Promise<ContentClassification> {
  const messages = [
    { role: 'system' as const, content: CLASSIFIER_SYSTEM_PROMPT },
    { role: 'user' as const, content: 'Classify this screenshot:' }
  ]

  const raw = await askAI(messages, imageBase64)
  return parseClassification(raw)
}

async function answerQuiz(imageBase64: string): Promise<string> {
  const messages = [
    { role: 'system' as const, content: QUIZ_ANSWER_SYSTEM_PROMPT },
    { role: 'user' as const, content: 'Answer the questions in this screenshot:' }
  ]
  return askAI(messages, imageBase64)
}

function parseClassification(raw: string): ContentClassification {
  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      worthy: Boolean(parsed.worthy),
      category: (parsed.category as ContentCategory) || 'OTHER',
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || '')
    }
  } catch {
    // If parsing fails, default to not worthy
    return { worthy: false, category: 'OTHER', confidence: 0, reason: 'Failed to parse classification' }
  }
}

export { WORTHY_CATEGORIES }
