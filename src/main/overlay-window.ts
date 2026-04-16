import { BrowserWindow, screen, desktopCapturer } from 'electron'
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
      sandbox: true,
      webSecurity: true,
    }
  })

  // Prevent navigation — overlay should be static
  win.webContents.on('will-navigate', (event, url) => {
    const isDev = process.env.NODE_ENV === 'development'
    const isAllowed = isDev
      ? url.startsWith('http://localhost:')
      : url.startsWith('file://')
    if (!isAllowed) {
      event.preventDefault()
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

  // ── System audio (loopback) capture ────────────────────────────────────────
  // When the renderer calls getDisplayMedia({ audio: true }), intercept it and
  // return WASAPI loopback audio (what the user HEARS) instead of showing the
  // native screen-picker dialog. No microphone permission needed.
  win.webContents.session.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // video: first screen (renderer will immediately stop the video track)
      // audio: 'loopback' tells Electron to capture system audio via WASAPI on Windows
      callback({ video: sources[0], audio: 'loopback' })
    }).catch(() => {
      callback({})
    })
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
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
