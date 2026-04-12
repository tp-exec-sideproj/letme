import type { SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk'
import { getSettings } from './store'

let recognizer: SpeechRecognizer | null = null

type TranscriptCallback = (text: string, isFinal: boolean) => void

export function startSpeechRecognizer(onText: TranscriptCallback): boolean {
  const settings = getSettings()
  const speechKey = settings.azureSpeechKey
  const speechRegion = settings.azureSpeechRegion

  if (!speechKey || !speechRegion) {
    console.warn('[Speech] No Azure Speech credentials configured')
    return false
  }

  try {
    const sdk = require('microsoft-cognitiveservices-speech-sdk') as typeof import('microsoft-cognitiveservices-speech-sdk')

    const config = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion)
    config.speechRecognitionLanguage = 'en-US'

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput()
    recognizer = new sdk.SpeechRecognizer(config, audioConfig)

    recognizer.recognizing = (_sender, event) => {
      if (event.result.text) {
        onText(event.result.text, false)
      }
    }

    recognizer.recognized = (_sender, event) => {
      if (event.result.text) {
        onText(event.result.text, true)
      }
    }

    recognizer.canceled = (_sender, event) => {
      console.warn('[Speech] Recognition canceled:', event.errorDetails)
    }

    recognizer.startContinuousRecognitionAsync(
      () => console.log('[Speech] Started continuous recognition'),
      (err) => console.error('[Speech] Failed to start:', err)
    )

    return true
  } catch (err) {
    console.error('[Speech] Failed to initialize recognizer:', err)
    return false
  }
}

export function stopSpeechRecognizer(): void {
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        recognizer?.close()
        recognizer = null
        console.log('[Speech] Stopped recognition')
      },
      (err) => console.error('[Speech] Failed to stop:', err)
    )
  }
}

export function isSpeechActive(): boolean {
  return recognizer !== null
}
