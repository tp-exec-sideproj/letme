import { net } from 'electron'
import { readFileSync } from 'fs'
import { askAI } from './ai-client'

export interface KBBuildResult {
  source: string
  content: string
  summary: string
}

const EXTRACT_PROMPT = `You are a professional profile extractor. Given the content below (a resume, portfolio, or personal website), extract and organize key professional information into a structured knowledge base for use during job interviews and professional meetings.

Output a concise, well-structured profile covering:
- Name and current role/title
- Core skills and technologies (with proficiency context)
- Work experience (companies, roles, key achievements)
- Education and certifications
- Notable projects or portfolio highlights
- Soft skills and communication style indicators
- Talking points and strengths to highlight in interviews

Be specific, factual, and use the exact details from the source. Format clearly with sections. Keep it under 800 words.`

async function fetchURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    const chunks: Buffer[] = []

    request.on('response', (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode} fetching URL`))
        return
      }
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf-8')
        // Strip HTML tags, scripts, styles — keep readable text
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
          .slice(0, 12000)
        resolve(text)
      })
      response.on('error', reject)
    })

    request.on('error', reject)
    request.end()
  })
}

async function parsePDF(filePath: string): Promise<string> {
  // Use the Node.js-specific build — the default pdf-parse entry bundles pdf.js
  // which directly accesses window.screen and crashes in Electron main process
  const pdfParse = require('pdf-parse/node')
  const buf = readFileSync(filePath)
  const data = await pdfParse(buf)
  return (data.text as string).trim().slice(0, 12000)
}

function parseMarkdown(filePath: string): string {
  return readFileSync(filePath, 'utf-8').slice(0, 12000)
}

export async function buildKBFromFile(filePath: string): Promise<KBBuildResult> {
  const lower = filePath.toLowerCase()
  let rawText: string

  if (lower.endsWith('.pdf')) {
    rawText = await parsePDF(filePath)
  } else if (lower.endsWith('.md') || lower.endsWith('.txt')) {
    rawText = parseMarkdown(filePath)
  } else {
    throw new Error('Unsupported file type. Use PDF, MD, or TXT.')
  }

  if (!rawText.trim()) {
    throw new Error('Could not extract text from file.')
  }

  const summary = await extractProfile(rawText)
  const fileName = filePath.split(/[\\/]/).pop() || filePath

  return { source: fileName, content: rawText, summary }
}

export async function buildKBFromURL(url: string): Promise<KBBuildResult> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  const rawText = await fetchURL(url)

  if (!rawText.trim()) {
    throw new Error('Could not extract content from URL.')
  }

  const summary = await extractProfile(rawText)

  return { source: url, content: rawText, summary }
}

async function extractProfile(rawText: string): Promise<string> {
  const messages = [
    { role: 'system' as const, content: EXTRACT_PROMPT },
    { role: 'user' as const, content: rawText }
  ]
  return askAI(messages)
}
