import { ipcMain, shell, dialog } from 'electron'
import { getOverlayWindow } from './overlay-window'
import { showAnswer, hideAnswerWindow } from './answer-window'
import { startSpeechRecognizer, stopSpeechRecognizer } from './speech'
import { askAI, askAIStream, analyzeScreenshot } from './ai-client'
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
  // Speech
  ipcMain.handle('start-speech', async () => {
    const success = startSpeechRecognizer((text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        addToTranscript(text.trim())
      }
      sendToRenderer('transcript-update', { text, final: isFinal })
    })
    if (!success) {
      throw new Error('Failed to start speech recognition. Check Azure Speech credentials in Settings.')
    }
  })

  ipcMain.handle('stop-speech', async () => {
    stopSpeechRecognizer()
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

  ipcMain.handle('save-settings', async (_event, settings: any) => {
    saveSettings(settings)
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
