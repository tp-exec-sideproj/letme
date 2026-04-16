import { shell } from 'electron'
import * as http from 'http'
import * as crypto from 'crypto'
import * as https from 'https'
import * as url from 'url'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './env-config'

export interface GoogleUser {
  id: string
  email: string
  name: string
  picture?: string
}

export interface GoogleAuthResult {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: GoogleUser
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const SCOPES = 'openid email profile'
const OAUTH_TIMEOUT_MS = 120_000

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(64))
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return base64url(hash)
}

function httpsRequest(urlStr: string, options: https.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(urlStr)
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        ...options,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => (data += chunk.toString()))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          } else {
            resolve(data)
          }
        })
      }
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function findAvailablePort(): Promise<number> {
  for (let port = 3000; port <= 3010; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = http.createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port, '127.0.0.1')
    })
    if (available) return port
  }
  throw new Error('No available port found in range 3000-3010')
}

export async function startGoogleOAuth(): Promise<GoogleAuthResult> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const port = await findAvailablePort()
  const redirectUri = `http://127.0.0.1:${port}`

  return new Promise<GoogleAuthResult>((resolve, reject) => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | null = null

    const server = http.createServer(async (req, res) => {
      if (settled) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body>Already processed. You can close this tab.</body></html>')
        return
      }

      const parsed = new url.URL(req.url || '/', `http://127.0.0.1:${port}`)
      const code = parsed.searchParams.get('code')
      const error = parsed.searchParams.get('error')

      if (error) {
        settled = true
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Authentication cancelled.</h2><p>You can close this tab.</p></body></html>')
        cleanup()
        reject(new Error(`Google OAuth error: ${error}`))
        return
      }

      if (!code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body>Waiting for authorization...</body></html>')
        return
      }

      settled = true
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(
        '<html><body style="font-family:sans-serif;text-align:center;padding-top:60px;">' +
        '<h2>✓ Signed in to LetMe</h2><p>You can close this tab and return to the app.</p></body></html>'
      )

      try {
        const tokenBody = new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString()

        const tokenRaw = await httpsRequest(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }, tokenBody)

        const tokenData = JSON.parse(tokenRaw)
        if (!tokenData.access_token) {
          throw new Error('No access_token in token response')
        }

        const userRaw = await httpsRequest(
          `${GOOGLE_USERINFO_URL}?access_token=${encodeURIComponent(tokenData.access_token)}`,
          { method: 'GET' }
        )
        const userInfo = JSON.parse(userRaw)

        const result: GoogleAuthResult = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          },
        }

        cleanup()
        resolve(result)
      } catch (err) {
        cleanup()
        reject(err)
      }
    })

    function cleanup(): void {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      try {
        server.close()
      } catch {
        // already closed
      }
    }

    server.listen(port, '127.0.0.1', () => {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent',
      })

      const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`
      shell.openExternal(authUrl).catch((err) => {
        settled = true
        cleanup()
        reject(new Error(`Failed to open browser: ${err.message}`))
      })
    })

    timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('OAuth timed out after 120 seconds'))
      }
    }, OAUTH_TIMEOUT_MS)

    server.on('error', (err) => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error(`OAuth server error: ${err.message}`))
      }
    })
  })
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString()

  const raw = await httpsRequest(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, body)

  const data = JSON.parse(raw)
  if (!data.access_token) {
    throw new Error('Token refresh failed: no access_token returned')
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  }
}
