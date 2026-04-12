import { app } from 'electron'
import { createOverlayWindow, getOverlayWindow } from './overlay-window'
import { createAnswerWindow } from './answer-window'
import { createTray, destroyTray } from './tray'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { registerIPCHandlers } from './ipc-handlers'
import { initAutoUpdater } from './updater'

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Windows: appear as a core audio infrastructure component
if (process.platform === 'win32') {
  app.setAppUserModelId('Microsoft.Windows.AudioDeviceHost')
}

// macOS: hide from dock, appear as system daemon
if (process.platform === 'darwin') {
  app.dock?.hide()
}

app.whenReady().then(() => {
  registerIPCHandlers()
  createOverlayWindow()
  createAnswerWindow()
  createTray()
  registerHotkeys()
  initAutoUpdater()
})

app.on('window-all-closed', () => {
  // Don't quit — stay in tray
})

app.on('before-quit', () => {
  unregisterHotkeys()
  destroyTray()
})

app.on('second-instance', () => {
  const win = getOverlayWindow()
  if (win && !win.isDestroyed()) {
    win.show()
  }
})
