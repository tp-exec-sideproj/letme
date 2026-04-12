import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { applyExcludeFromCapture } from './capture-protection'

let answerWindow: BrowserWindow | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const AUTO_HIDE_MS = 45_000

export function getAnswerWindow(): BrowserWindow | null {
  return answerWindow
}

export function createAnswerWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  const winWidth = 500

  const win = new BrowserWindow({
    width: winWidth,
    height: 220,
    x: Math.round((screenWidth - winWidth) / 2),
    y: 18,
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
      sandbox: false
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

  win.on('closed', () => {
    answerWindow = null
  })

  return win
}

export function showAnswer(text: string, category: string): void {
  if (!answerWindow || answerWindow.isDestroyed()) return

  // Clear any pending auto-hide
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  // Dynamically resize height based on content length
  const lines = Math.min(Math.ceil(text.length / 60) + 4, 20)
  const height = Math.min(Math.max(lines * 18 + 60, 120), 400)
  answerWindow.setSize(500, height)

  // Re-center after resize
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize
  answerWindow.setPosition(Math.round((screenWidth - 500) / 2), 18)

  answerWindow.webContents.send('answer-update', { text, category })
  answerWindow.show()

  // Auto-hide after 45 seconds of inactivity
  hideTimer = setTimeout(() => {
    hideAnswerWindow()
  }, AUTO_HIDE_MS)
}

export function hideAnswerWindow(): void {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (answerWindow && !answerWindow.isDestroyed()) {
    answerWindow.hide()
  }
}
