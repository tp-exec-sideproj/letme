import { BrowserWindow } from 'electron'

const WDA_EXCLUDEFROMCAPTURE = 0x00000011

export function applyExcludeFromCapture(win: BrowserWindow): boolean {
  if (win.isDestroyed() || process.platform !== 'win32') return false

  try {
    const koffi = require('koffi')
    const lib = koffi.load('user32.dll')
    const SetWindowDisplayAffinity = lib.func(
      'SetWindowDisplayAffinity',
      'bool',
      ['uint32', 'uint32']
    )
    const buf = win.getNativeWindowHandle()
    // HWNDs are 32-bit values even on 64-bit Windows
    const hwnd = buf.readUInt32LE(0)
    const result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
    lib.unload()
    return result
  } catch (err) {
    console.error('[CaptureProtection] Failed to apply WDA_EXCLUDEFROMCAPTURE:', err)
    return false
  }
}
