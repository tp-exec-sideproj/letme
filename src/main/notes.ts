import { app } from 'electron'
import { join, resolve, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs'

const NOTES_DIR = join(app.getPath('userData'), 'notes')

function ensureNotesDir(): void {
  if (!existsSync(NOTES_DIR)) {
    mkdirSync(NOTES_DIR, { recursive: true })
  }
}

function getTodayFilename(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}.md`
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function saveNote(content: string, tag?: string): void {
  ensureNotesDir()
  const filename = getTodayFilename()
  const filepath = join(NOTES_DIR, filename)

  const header = tag ? `### [${getTimestamp()}] ${tag}` : `### [${getTimestamp()}]`
  const entry = `\n${header}\n\n${content.trim()}\n\n---\n`

  if (existsSync(filepath)) {
    const existing = readFileSync(filepath, 'utf-8')
    writeFileSync(filepath, existing + entry, 'utf-8')
  } else {
    const title = `# Meeting Notes — ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n`
    writeFileSync(filepath, title + entry, 'utf-8')
  }
}

export function listNotes(): string[] {
  ensureNotesDir()
  return readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse()
}

export function loadNote(filename: string): string {
  ensureNotesDir()
  // Sanitize: only allow the basename to prevent path traversal
  const safe = basename(filename)
  const filepath = resolve(NOTES_DIR, safe)
  if (!filepath.startsWith(resolve(NOTES_DIR))) {
    throw new Error('Invalid note filename')
  }
  if (!existsSync(filepath)) {
    throw new Error(`Note file not found: ${safe}`)
  }
  return readFileSync(filepath, 'utf-8')
}

export function getNotesDir(): string {
  ensureNotesDir()
  return NOTES_DIR
}
