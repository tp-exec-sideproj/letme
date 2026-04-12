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
      ['int', 'uint32']
    )
    const buf = win.getNativeWindowHandle()
    const hwnd =
      buf.byteLength === 8
        ? Number(buf.readBigUInt64LE())
        : buf.readUInt32LE()
    const result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
    lib.unload()
    return result
  } catch (err) {
    console.error('[CaptureProtection] Failed to apply WDA_EXCLUDEFROMCAPTURE:', err)
    return false
  }
}
