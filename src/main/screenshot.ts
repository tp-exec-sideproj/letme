import { getOverlayWindow } from './overlay-window'
import { applyExcludeFromCapture } from './capture-protection'

let screenshotDesktop: any = null

async function getScreenshotModule() {
  if (!screenshotDesktop) {
    screenshotDesktop = require('screenshot-desktop')
  }
  return screenshotDesktop!
}

export async function captureScreen(): Promise<string> {
  const win = getOverlayWindow()
  const wasVisible = win && !win.isDestroyed() && win.isVisible()

  try {
    if (wasVisible) {
      win!.hide()
      await new Promise((r) => setTimeout(r, 150))
    }

    const capture = await getScreenshotModule()
    const buf: Buffer = await (capture as any)({ format: 'png' })

    return buf.toString('base64')
  } finally {
    if (wasVisible && win && !win.isDestroyed()) {
      win.show()
      if (process.platform === 'win32') {
        applyExcludeFromCapture(win)
      }
    }
  }
}
