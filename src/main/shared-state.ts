// Shared transcript buffer accessible by ipc-handlers and screen-watcher
export const transcriptBuffer: string[] = []
export const MAX_TRANSCRIPT_ITEMS = 20

export function addToTranscript(text: string): void {
  transcriptBuffer.push(text)
  if (transcriptBuffer.length > MAX_TRANSCRIPT_ITEMS) {
    transcriptBuffer.shift()
  }
}
