import { Tray, Menu, nativeImage, app } from 'electron'
import { toggleOverlay } from './overlay-window'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(): Tray {
  const iconPath = join(__dirname, '../../resources/icon.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('System Audio Helper')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide',
      click: () => toggleOverlay()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => toggleOverlay())

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
