import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { applyExcludeFromCapture } from './capture-protection'

let answerWindow: BrowserWindow | null = null

const WIN_WIDTH = 540
const WIN_HEIGHT = 640

export function getAnswerWindow(): BrowserWindow | null {
  return answerWindow
}

export function createAnswerWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  const win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x: screenWidth - WIN_WIDTH - 10,
    y: Math.round((screenHeight - WIN_HEIGHT) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    movable: true,
    focusable: false,
    resizable: false,
    show: false,
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver', 2)

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.setContentProtection(true)
  }

  win.on('show', () => {
    if (process.platform === 'win32') {
      applyExcludeFromCapture(win)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173/?overlay=answer')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: { overlay: 'answer' } })
  }

  answerWindow = win
  win.on('closed', () => { answerWindow = null })

  return win
}

function ensureVisible(): void {
  if (!answerWindow || answerWindow.isDestroyed()) return
  if (!answerWindow.isVisible()) answerWindow.show()
}

/**
 * Start a new Q&A block for a detected question.
 * Opens the window immediately so user sees it before the first token.
 */
export function startNewBlock(question: string): void {
  if (!answerWindow || answerWindow.isDestroyed()) return
  answerWindow.webContents.send('answer-new-block', question)
  ensureVisible()
}

/**
 * Stream a chunk into the current (last) block.
 */
export function updateAnswerChunk(chunk: string): void {
  if (!answerWindow || answerWindow.isDestroyed()) return
  answerWindow.webContents.send('answer-chunk', chunk)
}

/**
 * Finalize the current block with the complete answer text.
 */
export function finalizeBlock(text: string): void {
  if (!answerWindow || answerWindow.isDestroyed()) return
  answerWindow.webContents.send('answer-finalize', text)
}

/**
 * Show a single quiz answer block (replaces the whole session view).
 */
export function showAnswer(text: string, category: string): void {
  if (!answerWindow || answerWindow.isDestroyed()) return
  answerWindow.webContents.send('answer-update', { text, category })
  ensureVisible()
}

export function hideAnswerWindow(): void {
  if (answerWindow && !answerWindow.isDestroyed()) {
    answerWindow.hide()
  }
}

// Legacy alias kept so existing quiz code compiles
export function beginAnswer(): void {
  /* no-op — replaced by startNewBlock */
}
