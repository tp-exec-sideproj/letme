import { globalShortcut, app } from 'electron'
import { getOverlayWindow, toggleOverlay } from './overlay-window'
import { getSettings } from './store'

type HotkeyCallback = (action: string) => void

let hotkeyCallback: HotkeyCallback | null = null

export function setHotkeyCallback(cb: HotkeyCallback): void {
  hotkeyCallback = cb
}

export function registerHotkeys(): void {
  const settings = getSettings()

  const registrations: Array<{ key: string; action: string }> = [
    { key: settings.hotkeyToggle, action: 'toggle' },
    { key: settings.hotkeyAskAI, action: 'ask-ai' },
    { key: settings.hotkeyScreenshot, action: 'capture-screenshot' },
    { key: settings.hotkeySaveNote, action: 'save-note' },
    { key: settings.hotkeyQuit, action: 'quit' }
  ]

  for (const { key, action } of registrations) {
    try {
      globalShortcut.register(key, () => {
        if (action === 'toggle') {
          toggleOverlay()
          return
        }

        if (action === 'quit') {
          app.quit()
          return
        }

        const win = getOverlayWindow()
        if (win && !win.isDestroyed()) {
          win.webContents.send('hotkey-action', action)
        }

        if (hotkeyCallback) {
          hotkeyCallback(action)
        }
      })
    } catch (err) {
      console.warn(`[Hotkeys] Failed to register ${key}:`, err)
    }
  }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}

export function reregisterHotkeys(): void {
  unregisterHotkeys()
  registerHotkeys()
}
