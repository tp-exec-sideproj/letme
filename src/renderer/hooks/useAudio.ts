import { useState, useCallback, useEffect, useRef } from 'react'

interface UseAudioReturn {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  error: string | null
}

const TARGET_SAMPLE_RATE = 16000

/**
 * Linear interpolation resampler: converts Float32 audio from any sample rate
 * to TARGET_SAMPLE_RATE (16kHz) for Azure Speech SDK.
 */
function resample(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return input
  const ratio = inputRate / TARGET_SAMPLE_RATE
  const outputLength = Math.round(input.length / ratio)
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio
    const floor = Math.floor(srcIdx)
    const ceil = Math.min(floor + 1, input.length - 1)
    const t = srcIdx - floor
    output[i] = input[floor] * (1 - t) + input[ceil] * t
  }
  return output
}

function float32ToInt16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16.buffer
}

export function useAudio(): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // 1. Start speech recognizer (push stream at 16kHz/16-bit/mono)
      await window.api.startSpeech()

      // 2. Capture SYSTEM AUDIO via WASAPI loopback (what the user hears, not their mic).
      //    The main process intercepts this via setDisplayMediaRequestHandler → audio: 'loopback'
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true  // Electron requires video to be requested for loopback to activate
      })

      // Stop video tracks immediately — only audio needed
      displayStream.getVideoTracks().forEach(t => t.stop())

      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('No system audio track — ensure audio is playing and try again.')
      }

      streamRef.current = displayStream

      // 3. Let the AudioContext run at the system's native rate (usually 44100 or 48000).
      //    Forcing 16kHz here is ignored by Chromium if the hardware doesn't support it.
      //    We resample manually below instead.
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const nativeRate = ctx.sampleRate
      console.log(`[Audio] Native sample rate: ${nativeRate}Hz — will resample to ${TARGET_SAMPLE_RATE}Hz`)

      const source = ctx.createMediaStreamSource(new MediaStream(audioTracks))
      // 4096 samples at native rate — gives ~85ms at 48kHz
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const float32Native = e.inputBuffer.getChannelData(0)
        const float32Resampled = resample(float32Native, nativeRate)
        const pcm16 = float32ToInt16(float32Resampled)
        window.api.sendAudioChunk(pcm16)
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      setIsRecording(true)
    } catch (err: any) {
      try { await window.api.stopSpeech() } catch { /* ignore */ }
      setError(err.message || 'Failed to start system audio capture')
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }
    if (audioContextRef.current) {
      try { await audioContextRef.current.close() } catch { /* ignore */ }
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try { await window.api.stopSpeech() } catch { /* ignore */ }
    setIsRecording(false)
  }, [])

  useEffect(() => {
    const cleanup = window.api.onSpeechError((msg: string) => {
      setError(msg)
      setIsRecording(false)
    })
    return cleanup
  }, [])

  useEffect(() => {
    return () => {
      if (processorRef.current) processorRef.current.disconnect()
      if (audioContextRef.current) audioContextRef.current.close()
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { isRecording, startRecording, stopRecording, error }
}
