import { desktopCapturer, nativeImage, screen } from 'electron'
import { getOverlayWindow } from './overlay-window'
import { applyExcludeFromCapture } from './capture-protection'

export async function captureScreen(): Promise<string> {
  const win = getOverlayWindow()
  const wasVisible = win && !win.isDestroyed() && win.isVisible()

  try {
    if (wasVisible) {
      win!.hide()
      await new Promise((r) => setTimeout(r, 150))
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    if (sources.length === 0) {
      throw new Error('No screen sources available')
    }

    const thumbnail = sources[0].thumbnail
    return thumbnail.toJPEG(90).toString('base64')
  } finally {
    if (wasVisible && win && !win.isDestroyed()) {
      win.show()
      if (process.platform === 'win32') {
        applyExcludeFromCapture(win)
      }
    }
  }
}
