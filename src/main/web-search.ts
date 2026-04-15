import { net } from 'electron'
import { BING_SEARCH_KEY } from './env-config'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * Search the web using DuckDuckGo Instant Answers API (no key required)
 * with optional fallback to Bing if BING_SEARCH_KEY is set in env.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const bingKey = BING_SEARCH_KEY

  if (bingKey) {
    try {
      return await bingSearch(query, bingKey)
    } catch (err) {
      console.warn('[WebSearch] Bing failed, falling back to DuckDuckGo:', err)
    }
  }

  return duckDuckGoSearch(query)
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=LetMe`
  const data = await fetchJSON(url)

  const results: SearchResult[] = []

  // Abstract (Wikipedia-style instant answer)
  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: data.AbstractText
    })
  }

  // Answer box (calculators, unit conversions, etc.)
  if (data.Answer) {
    results.push({
      title: 'Direct Answer',
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: data.Answer
    })
  }

  // Related topics
  if (Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, 4)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
          url: topic.FirstURL,
          snippet: topic.Text
        })
      }
    }
  }

  return results.slice(0, 5)
}

async function bingSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5&mkt=en-US`
  const data = await fetchJSON(url, { 'Ocp-Apim-Subscription-Key': apiKey })

  const webPages = data?.webPages?.value || []
  return webPages.map((page: any) => ({
    title: page.name || '',
    url: page.url || '',
    snippet: page.snippet || ''
  }))
}

function fetchJSON(url: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, method: 'GET' })

    Object.entries(headers).forEach(([key, value]) => {
      request.setHeader(key, value)
    })
    request.setHeader('User-Agent', 'Mozilla/5.0 (compatible; LetMe/1.0)')

    let body = ''
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString() })
      response.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (err) {
          reject(new Error(`Failed to parse response: ${body.slice(0, 200)}`))
        }
      })
      response.on('error', reject)
    })
    request.on('error', reject)
    request.end()
  })
}

/**
 * Format search results into a readable context string for the AI.
 */
export function formatSearchResults(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`
  }
  const lines = [`Search results for: "${query}"\n`]
  results.forEach((r, i) => {
    lines.push(`[${i + 1}] ${r.title}`)
    lines.push(`URL: ${r.url}`)
    lines.push(`${r.snippet}\n`)
  })
  return lines.join('\n')
}
