import type { SpeechRecognizer, PushAudioInputStream as PushAudioInputStreamType } from 'microsoft-cognitiveservices-speech-sdk'
import { getSettings } from './store'

let recognizer: SpeechRecognizer | null = null
let pushStream: PushAudioInputStreamType | null = null

type TranscriptCallback = (text: string, isFinal: boolean) => void
type ErrorCallback = (message: string) => void

// Languages supported: English (US) + Filipino (Tagalog)
const SUPPORTED_LANGUAGES = ['en-US', 'fil-PH']

export function startSpeechRecognizer(
  onText: TranscriptCallback,
  onError?: ErrorCallback
): boolean {
  const settings = getSettings()
  const speechKey = settings.azureSpeechKey
  const speechRegion = settings.azureSpeechRegion

  if (!speechKey || !speechRegion) {
    console.warn('[Speech] No Azure Speech credentials configured')
    return false
  }

  try {
    const sdk = require('microsoft-cognitiveservices-speech-sdk') as typeof import('microsoft-cognitiveservices-speech-sdk')

    // PushAudioInputStream receives 16kHz/16-bit/mono PCM from the renderer
    pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    )

    const config = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion)
    // Do NOT set speechRecognitionLanguage — auto-detect handles it
    config.setProperty('SpeechServiceConnection_LanguageIdMode', 'Continuous')

    // Auto-detect between English and Filipino — handles code-switching mid-sentence
    const autoDetect = sdk.AutoDetectSourceLanguageConfig.fromLanguages(SUPPORTED_LANGUAGES)

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

    // Use the static factory that wires up auto language detection
    recognizer = sdk.SpeechRecognizer.FromConfig(config, autoDetect, audioConfig)

    recognizer.recognizing = (_sender, event) => {
      if (event.result.text) {
        onText(event.result.text, false)
      }
    }

    recognizer.recognized = (_sender, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech && event.result.text) {
        onText(event.result.text, true)
      }
    }

    recognizer.canceled = (_sender, event) => {
      const msg = event.errorDetails || 'Speech recognition was canceled'
      console.warn('[Speech] Canceled:', msg)
      if (onError) onError(msg)
    }

    recognizer.sessionStopped = () => {
      if (onError) onError('Audio session ended unexpectedly')
    }

    recognizer.startContinuousRecognitionAsync(
      () => console.log('[Speech] Started — languages:', SUPPORTED_LANGUAGES.join(', ')),
      (err) => {
        console.error('[Speech] Failed to start:', err)
        if (onError) onError(String(err))
      }
    )

    return true
  } catch (err) {
    console.error('[Speech] Failed to initialize recognizer:', err)
    return false
  }
}

/**
 * Called from the main process IPC handler when the renderer sends a PCM audio chunk.
 * The chunk must be 16 kHz / 16-bit / mono PCM (little-endian, signed).
 */
export function pushAudioChunk(buffer: Buffer): void {
  if (pushStream) {
    pushStream.write(buffer)
  }
}

export function stopSpeechRecognizer(): void {
  if (recognizer) {
    if (pushStream) {
      try { pushStream.close() } catch { /* ignore */ }
      pushStream = null
    }
    recognizer.stopContinuousRecognitionAsync(
      () => {
        recognizer?.close()
        recognizer = null
        console.log('[Speech] Stopped recognition')
      },
      (err) => {
        console.error('[Speech] Failed to stop:', err)
        recognizer = null
      }
    )
  }
}

export function isSpeechActive(): boolean {
  return recognizer !== null
}
