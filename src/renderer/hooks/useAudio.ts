import { useState, useCallback, useEffect, useRef } from 'react'

interface UseAudioReturn {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  error: string | null
}

export function useAudio(): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Start speech recognition on main process
      await window.api.startSpeech()

      // Also capture audio in renderer for backup / visual feedback
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000
        }
      })

      streamRef.current = stream
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          // Audio data available — main process handles transcription via Speech SDK
        }
      }

      recorder.start(5000)
      recorderRef.current = recorder
      setIsRecording(true)
    } catch (err: any) {
      setError(err.message || 'Failed to start recording')
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(async () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
        recorderRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      await window.api.stopSpeech()
      setIsRecording(false)
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { isRecording, startRecording, stopRecording, error }
}
