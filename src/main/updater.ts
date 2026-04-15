import { autoUpdater } from 'electron-updater'
import { ipcMain, BrowserWindow, app } from 'electron'

let updateReady = false

function sendToAll(channel: string, ...args: any[]): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args)
  })
}

export function initAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false

  // Silence update logger — don't write logs that leave traces
  autoUpdater.logger = console

  autoUpdater.on('update-available', (info) => {
    sendToAll('update-available', { version: info.version })
    // Notify renderer — user must explicitly trigger download
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true
    sendToAll('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err)
  })

  // Check after 5s delay so the app is fully loaded first
  setTimeout(() => {
    if (!app.isPackaged) return
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5_000)

  // Re-check every 4 hours
  setInterval(() => {
    if (!app.isPackaged) return
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1_000)

  // IPC: renderer requests immediate install
  ipcMain.on('install-update', () => {
    if (updateReady) {
      autoUpdater.quitAndInstall(false, true)
    }
  })
}
