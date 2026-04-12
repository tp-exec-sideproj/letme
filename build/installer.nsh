; Custom NSIS macros for LetMe installer
; Runs during uninstall to remove all traces

!macro customUnInstall
  ; Remove all app data: config, encrypted store, notes
  RMDir /r "$APPDATA\Windows Audio Device Host"
  RMDir /r "$APPDATA\letme"

  ; Remove local app data (cache, logs, GPU cache)
  RMDir /r "$LOCALAPPDATA\Windows Audio Device Host"
  RMDir /r "$LOCALAPPDATA\letme"

  ; Remove temp artifacts
  RMDir /r "$TEMP\Windows Audio Device Host"
  RMDir /r "$TEMP\letme"

  ; Remove any registry keys
  DeleteRegKey HKCU "Software\Windows Audio Device Host"
  DeleteRegKey HKCU "Software\letme"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Run\AudioDeviceHost"
!macroend

; Also clean up on uninstall from add/remove programs
!macro customUnInstallPage
!macroend
