import { app } from 'electron'
import { createOverlayWindow } from './overlay-window'
import { createAnswerWindow } from './answer-window'
import { createTray, destroyTray } from './tray'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { registerIPCHandlers } from './ipc-handlers'

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Stealth: rename process identity
app.setAppUserModelId('com.system.audiohelper')

// macOS: hide from dock
if (process.platform === 'darwin') {
  app.dock?.hide()
}

app.whenReady().then(() => {
  registerIPCHandlers()
  createOverlayWindow()
  createAnswerWindow()
  createTray()
  registerHotkeys()
})

app.on('window-all-closed', () => {
  // Don't quit — stay in tray
})

app.on('before-quit', () => {
  unregisterHotkeys()
  destroyTray()
})

app.on('second-instance', () => {
  const { getOverlayWindow } = require('./overlay-window')
  const win = getOverlayWindow()
  if (win && !win.isDestroyed()) {
    win.show()
  }
})
