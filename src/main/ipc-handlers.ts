import { ipcMain, shell, dialog } from 'electron'
import { getOverlayWindow } from './overlay-window'
import { showAnswer, hideAnswerWindow, updateAnswerChunk, startNewBlock, finalizeBlock } from './answer-window'
import { startSpeechRecognizer, stopSpeechRecognizer, pushAudioChunk } from './speech'
import { askAI, askAIStream, analyzeScreenshot, fastAnswerStream } from './ai-client'
import { captureScreen } from './screenshot'
import { saveNote, listNotes, loadNote, getNotesDir } from './notes'
import { getSettings, saveSettings } from './store'
import { reregisterHotkeys } from './hotkeys'
import { transcriptBuffer, addToTranscript } from './shared-state'
import { startScreenWatch, stopScreenWatch, isWatching } from './screen-watcher'
import { getKnowledgeBase, KNOWLEDGE_BASES } from './knowledge-base'
import { buildKBFromFile, buildKBFromURL } from './kb-builder'
import type { WatchEvent } from './screen-watcher'

function sendToRenderer(channel: string, ...args: any[]): void {
  const win = getOverlayWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

export function registerIPCHandlers(): void {
  // ── Session state ────────────────────────────────────────────────────────────
  let autoAnswerTimer: ReturnType<typeof setTimeout> | null = null
  let pendingTranscript = ''
  let isAutoAnswering = false
  /** Conversation history — kept for the entire speech session so follow-ups work */
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

  const AUTO_ANSWER_DEBOUNCE_MS = 800

  // ── Question detection ───────────────────────────────────────────────────────
  function isQuestion(text: string): boolean {
    const t = text.trim().toLowerCase()
    if (t.includes('?')) return true
    const starters = [
      'what ', 'why ', 'how ', 'when ', 'where ', 'who ', 'which ',
      'tell me', 'can you', 'could you', 'would you', 'will you',
      'describe ', 'explain ', 'walk me', 'talk about', 'talk me',
      'give me', 'have you', 'do you', 'are you', 'is there',
      'share ', 'discuss ', 'elaborate', 'help me understand',
      'i want to know', 'what\'s your', 'what is your'
    ]
    return starters.some(s => t.startsWith(s))
  }

  // ── Auto-answer scheduler ────────────────────────────────────────────────────
  function scheduleAutoAnswer(text: string): void {
    // Only accumulate if it looks like it could be a question
    if (!isQuestion(text)) return

    pendingTranscript += (pendingTranscript ? ' ' : '') + text

    if (autoAnswerTimer) clearTimeout(autoAnswerTimer)

    autoAnswerTimer = setTimeout(async () => {
      if (isAutoAnswering || !pendingTranscript.trim()) return
      if (!isQuestion(pendingTranscript)) { pendingTranscript = ''; return }

      const question = pendingTranscript.trim()
      pendingTranscript = ''
      isAutoAnswering = true

      try {
        const settings = getSettings()
        const kb = getKnowledgeBase(settings.activeKnowledgeBase, settings.personalKBSummary)

        const SYSTEM_PROMPT = `You are a real-time interview assistant speaking on behalf of the candidate below.

RULES — follow exactly:
1. ALWAYS ground your answer in the candidate's background from the KB first
2. If the KB lacks a specific example, CREATE a plausible scenario that naturally fits their role and industry — make it sound lived-in and specific, not generic
3. For follow-up questions, naturally refer back to what you said before
4. Answer directly — zero preamble, no "Great question!", no "Sure!"
5. 3-4 sentences max; behavioral: use STAR format compressed into 2 sentences; technical: state the answer then add one practical detail
6. Plain prose — no bullet points, no markdown headers, no bold
7. If the input is NOT actually a question (e.g. filler words, affirmations), respond with exactly: SKIP

CANDIDATE BACKGROUND:
${kb.systemPrompt}`

        // Signal the answer window to open a new block for this question
        startNewBlock(question)

        let fullAnswer = ''
        // Pass last 6 history turns for context (3 Q&A pairs)
        const recentHistory = conversationHistory.slice(-6)
        await fastAnswerStream(question, SYSTEM_PROMPT, recentHistory, (chunk) => {
          fullAnswer += chunk
          updateAnswerChunk(chunk)
        })

        // If model says SKIP (shouldn't happen often since we filter first), discard
        if (fullAnswer.trim() === 'SKIP') {
          finalizeBlock('(Not a question — skipped)')
          isAutoAnswering = false
          return
        }

        // Finalize the block
        finalizeBlock(fullAnswer)

        // Push to conversation history for follow-up context
        conversationHistory.push({ role: 'user', content: question })
        conversationHistory.push({ role: 'assistant', content: fullAnswer })

        if (settings.autoSaveNotes && fullAnswer) {
          try { saveNote(`Q: ${question}\nA: ${fullAnswer}`, 'Auto-Answer') } catch { /* ignore */ }
        }
      } catch (err: any) {
        const msg = err?.message || 'Auto-answer failed'
        finalizeBlock(`Error: ${msg}`)
        if (!msg.includes('not configured')) {
          sendToRenderer('speech-error', `Auto-answer error: ${msg}`)
        }
      } finally {
        isAutoAnswering = false
      }
    }, AUTO_ANSWER_DEBOUNCE_MS)
  }

  // ── Speech handlers ──────────────────────────────────────────────────────────
  ipcMain.handle('start-speech', async () => {
    // Reset session state
    pendingTranscript = ''
    isAutoAnswering = false
    conversationHistory.length = 0
    if (autoAnswerTimer) { clearTimeout(autoAnswerTimer); autoAnswerTimer = null }

    const success = startSpeechRecognizer(
      (text: string, isFinal: boolean) => {
        if (isFinal && text.trim()) {
          addToTranscript(text.trim())
          scheduleAutoAnswer(text.trim())
        }
        sendToRenderer('transcript-update', { text, final: isFinal })
      },
      (errorMsg: string) => {
        sendToRenderer('speech-error', errorMsg)
      }
    )
    if (!success) {
      throw new Error('Failed to start speech recognition. Check Azure Speech credentials in Settings.')
    }
  })

  ipcMain.handle('stop-speech', async () => {
    if (autoAnswerTimer) { clearTimeout(autoAnswerTimer); autoAnswerTimer = null }
    pendingTranscript = ''
    conversationHistory.length = 0
    stopSpeechRecognizer()
  })

  // Renderer sends raw PCM audio chunks here — fed into the push stream
  ipcMain.on('audio-chunk', (_event, buffer: Buffer) => {
    pushAudioChunk(buffer)
  })

  // AI
  ipcMain.handle('ask-ai', async (_event, prompt: string, imageBase64?: string) => {
    const settings = getSettings()
    const kb = getKnowledgeBase(settings.activeKnowledgeBase, settings.personalKBSummary)
    const contextText = transcriptBuffer.length > 0
      ? `\nRecent meeting transcript:\n${transcriptBuffer.join('\n')}\n`
      : ''

    const messages = [
      { role: 'system' as const, content: kb.systemPrompt },
      { role: 'user' as const, content: contextText + '\n' + prompt }
    ]

    const result = await askAI(messages, imageBase64)

    if (settings.autoSaveNotes) {
      try { saveNote(result, 'AI Insight') } catch { /* ignore */ }
    }
    return result
  })

  ipcMain.handle('ask-ai-stream', async (_event, prompt: string) => {
    const settings = getSettings()
    const kb = getKnowledgeBase(settings.activeKnowledgeBase, settings.personalKBSummary)
    const contextText = transcriptBuffer.length > 0
      ? `\nRecent meeting transcript:\n${transcriptBuffer.join('\n')}\n`
      : ''

    const messages = [
      { role: 'system' as const, content: kb.systemPrompt },
      { role: 'user' as const, content: contextText + '\n' + prompt }
    ]

    let fullResponse = ''
    try {
      fullResponse = await askAIStream(messages, (chunk: string) => {
        sendToRenderer('ai-stream-chunk', chunk)
      })
      sendToRenderer('ai-stream-done', fullResponse)
    } catch (err: any) {
      sendToRenderer('ai-stream-error', err.message || 'Unknown AI error')
      throw err
    }

    if (settings.autoSaveNotes && fullResponse) {
      try { saveNote(fullResponse, 'AI Insight') } catch { /* ignore */ }
    }
    return fullResponse
  })

  ipcMain.handle('capture-and-analyze', async () => {
    const imageBase64 = await captureScreen()
    const analysis = await analyzeScreenshot(imageBase64)

    addToTranscript(`[Screen Analysis] ${analysis}`)

    try {
      saveNote(analysis, 'Screen Analysis')
    } catch (err) {
      console.error('[IPC] Failed to save screen analysis note:', err)
    }

    sendToRenderer('screen-analysis', analysis)
    return analysis
  })

  // Knowledge Base
  ipcMain.handle('list-knowledge-bases', async () => {
    return KNOWLEDGE_BASES.map(({ id, name, description }) => ({ id, name, description }))
  })

  ipcMain.handle('get-active-knowledge-base', async () => {
    return getSettings().activeKnowledgeBase
  })

  ipcMain.handle('get-personal-kb-status', async () => {
    const s = getSettings()
    return { source: s.personalKBSource, hasSummary: !!s.personalKBSummary }
  })

  ipcMain.handle('open-file-for-kb', async () => {
    const win = getOverlayWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Resume or Profile Document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'md', 'txt'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('build-kb-from-file', async (_event, filePath: string) => {
    const result = await buildKBFromFile(filePath)
    saveSettings({
      personalKBContent: result.content,
      personalKBSource: result.source,
      personalKBSummary: result.summary,
      activeKnowledgeBase: 'personal'
    })
    return { source: result.source, summary: result.summary }
  })

  ipcMain.handle('build-kb-from-url', async (_event, url: string) => {
    const result = await buildKBFromURL(url)
    saveSettings({
      personalKBContent: result.content,
      personalKBSource: result.source,
      personalKBSummary: result.summary,
      activeKnowledgeBase: 'personal'
    })
    return { source: result.source, summary: result.summary }
  })

  // Screen Watch (continuous smart analysis)
  ipcMain.handle('start-screen-watch', async () => {
    startScreenWatch((event: WatchEvent) => {
      sendToRenderer('screen-watch-event', event)

      // Route quiz answers and interview talking points to the floating answer window
      if (event.type === 'quiz-answered' && event.analysis) {
        showAnswer(event.analysis, 'QUIZ')
      } else if (event.type === 'analyzed' && event.analysis) {
        const kb = getSettings().activeKnowledgeBase
        if (kb === 'interview') {
          showAnswer(event.analysis, 'INTERVIEW')
        }
      }
    })
  })

  ipcMain.handle('stop-screen-watch', async () => {
    stopScreenWatch()
  })

  ipcMain.handle('get-screen-watch-status', async () => {
    return isWatching()
  })

  ipcMain.on('hide-answer', () => {
    hideAnswerWindow()
  })

  // Notes
  ipcMain.handle('save-note', async (_event, content: string, tag?: string) => {
    saveNote(content, tag)
  })

  ipcMain.handle('list-notes', async () => {
    return listNotes()
  })

  ipcMain.handle('load-note', async (_event, filename: string) => {
    return loadNote(filename)
  })

  ipcMain.handle('open-notes-folder', async () => {
    shell.openPath(getNotesDir())
  })

  // Settings
  ipcMain.handle('get-settings', async () => {
    return getSettings()
  })

  ipcMain.handle('save-settings', async (_event, incoming: any) => {
    // Protect KB fields: never overwrite with empty if existing value has content
    const existing = getSettings()
    const KB_FIELDS = ['personalKBContent', 'personalKBSource', 'personalKBSummary'] as const
    for (const field of KB_FIELDS) {
      if (!incoming[field] && existing[field]) {
        incoming[field] = existing[field]
      }
    }
    saveSettings(incoming)
    reregisterHotkeys()
  })

  // Window control
  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean) => {
    const win = getOverlayWindow()
    if (win && !win.isDestroyed()) {
      if (ignore) {
        win.setIgnoreMouseEvents(true, { forward: true })
      } else {
        win.setIgnoreMouseEvents(false)
      }
    }
  })

  ipcMain.on('hide-overlay', () => {
    const win = getOverlayWindow()
    if (win && !win.isDestroyed()) {
      win.hide()
    }
  })

  ipcMain.on('quit-app', () => {
    const { app } = require('electron')
    app.quit()
  })
}
