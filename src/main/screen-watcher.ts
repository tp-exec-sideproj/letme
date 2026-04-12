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
  type: 'classified' | 'analyzed' | 'skipped' | 'error'
  category?: ContentCategory
  worthy?: boolean
  confidence?: number
  reason?: string
  analysis?: string
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
- QUIZ: quiz, exam, test questions, multiple choice, fill-in-the-blank
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

    // Step 2: Full analysis of noteworthy content
    const analysis = await analyzeScreenshot(imageBase64)

    // Add to transcript context and auto-save note
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
