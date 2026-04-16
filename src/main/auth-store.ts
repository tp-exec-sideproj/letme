import { app, safeStorage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface AuthSession {
  userId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const SESSION_FILE = path.join(app.getPath('userData'), 'letme-session.json')
const ENC_PREFIX = 'enc:'

function encrypt(value: string): string {
  if (!value) return value
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    return ENC_PREFIX + encrypted.toString('base64')
  }
  return value
}

function decrypt(value: string): string {
  if (!value) return value
  if (value.startsWith(ENC_PREFIX) && safeStorage.isEncryptionAvailable()) {
    const buf = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
    return safeStorage.decryptString(buf)
  }
  return value
}

export function saveSession(session: AuthSession): void {
  const data = {
    userId: session.userId,
    email: session.email,
    name: session.name,
    picture: session.picture,
    accessToken: encrypt(session.accessToken),
    refreshToken: encrypt(session.refreshToken),
    expiresAt: session.expiresAt,
  }
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function loadSession(): AuthSession | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
    return {
      userId: raw.userId,
      email: raw.email,
      name: raw.name,
      picture: raw.picture,
      accessToken: decrypt(raw.accessToken),
      refreshToken: decrypt(raw.refreshToken),
      expiresAt: raw.expiresAt,
    }
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE)
    }
  } catch {
    // ignore
  }
}

const EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

export function isTokenExpired(session: AuthSession): boolean {
  return session.expiresAt < Date.now() + EXPIRY_BUFFER_MS
}
