import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { applyExcludeFromCapture } from './capture-protection'

let overlayWindow: BrowserWindow | null = null

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  const win = new BrowserWindow({
    width: 420,
    height: 680,
    x: screenWidth - 440,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    movable: true,
    focusable: true,
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

  win.setAlwaysOnTop(true, 'screen-saver', 1)

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.setContentProtection(true)
  }

  win.on('show', () => {
    if (process.platform === 'win32') {
      applyExcludeFromCapture(win)
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'))
  }

  overlayWindow = win

  win.on('closed', () => {
    overlayWindow = null
  })

  return win
}

export function toggleOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (overlayWindow.isVisible()) {
    overlayWindow.hide()
  } else {
    overlayWindow.show()
  }
}
