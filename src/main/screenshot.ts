import { desktopCapturer, screen } from 'electron'

export async function captureScreen(): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  })

  if (sources.length === 0) {
    throw new Error('No screen sources available')
  }

  return sources[0].thumbnail.toJPEG(90).toString('base64')
}
