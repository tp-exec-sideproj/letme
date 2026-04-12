import { ipcMain, shell } from 'electron'
import { getOverlayWindow } from './overlay-window'
import { startSpeechRecognizer, stopSpeechRecognizer } from './speech'
import { askAI, askAIStream, analyzeScreenshot } from './ai-client'
import { captureScreen } from './screenshot'
import { saveNote, listNotes, loadNote, getNotesDir } from './notes'
import { getSettings, saveSettings } from './store'
import { reregisterHotkeys } from './hotkeys'
import { transcriptBuffer, addToTranscript } from './shared-state'
import { startScreenWatch, stopScreenWatch, isWatching } from './screen-watcher'
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
    const contextText = transcriptBuffer.length > 0
      ? `Recent meeting transcript:\n${transcriptBuffer.join('\n')}\n\n`
      : ''

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an AI meeting copilot. Help the user understand and participate in their meeting. Be concise and actionable. Reference the transcript context when relevant.'
      },
      {
        role: 'user' as const,
        content: contextText + prompt
      }
    ]

    const result = await askAI(messages, imageBase64)

    const settings = getSettings()
    if (settings.autoSaveNotes) {
      try {
        saveNote(result, 'AI Insight')
      } catch (err) {
        console.error('[IPC] Failed to auto-save note:', err)
      }
    }

    return result
  })

  ipcMain.handle('ask-ai-stream', async (event, prompt: string) => {
    const contextText = transcriptBuffer.length > 0
      ? `Recent meeting transcript:\n${transcriptBuffer.join('\n')}\n\n`
      : ''

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an AI meeting copilot. Help the user understand and participate in their meeting. Be concise and actionable.'
      },
      {
        role: 'user' as const,
        content: contextText + prompt
      }
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

    const settings = getSettings()
    if (settings.autoSaveNotes && fullResponse) {
      try {
        saveNote(fullResponse, 'AI Insight')
      } catch (err) {
        console.error('[IPC] Failed to auto-save note:', err)
      }
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

  // Screen Watch (continuous smart analysis)
  ipcMain.handle('start-screen-watch', async () => {
    startScreenWatch((event: WatchEvent) => {
      sendToRenderer('screen-watch-event', event)
    })
  })

  ipcMain.handle('stop-screen-watch', async () => {
    stopScreenWatch()
  })

  ipcMain.handle('get-screen-watch-status', async () => {
    return isWatching()
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
