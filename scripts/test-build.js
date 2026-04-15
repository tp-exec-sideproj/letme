const fs = require('fs')
const https = require('https')

const bundle = fs.readFileSync('out/main/index.js', 'utf-8')

const checks = [
  { name: 'AI_ENDPOINT baked in', pattern: 'thepieza-makeme-openai.openai.azure.com' },
  { name: 'AI_KEY baked in', pattern: '3fd3e72060854208896ccc9515bc674a' },
  { name: 'AZURE_SPEECH_KEY baked in', pattern: '50286db199a941319f4dde19a4aa19f9' },
  { name: 'AZURE_SPEECH_REGION baked in', pattern: 'southeastasia' },
  { name: 'OR fallback in getSettings', pattern: 'defaults$2.aiKey' },
  { name: 'JPEG mime type correct', pattern: 'image/jpeg;base64' },
  { name: 'PNG mime type gone', pattern: 'image/png;base64', absent: true },
  { name: 'process.env.AI_KEY gone', pattern: 'process.env.AI_KEY', absent: true },
  { name: 'process.env.AI_ENDPOINT gone', pattern: 'process.env.AI_ENDPOINT', absent: true },
  { name: 'uint32 HWND type', pattern: '"uint32", "uint32"' },
]

let pass = 0, fail = 0
for (const c of checks) {
  const found = bundle.includes(c.pattern)
  const ok = c.absent ? !found : found
  console.log((ok ? '[PASS]' : '[FAIL]') + ' ' + c.name)
  ok ? pass++ : fail++
}

console.log('\nBundle checks: ' + pass + ' passed, ' + fail + ' failed')

// Live API test against Azure OpenAI
console.log('\nTesting Azure OpenAI endpoint...')
const endpoint = 'thepieza-makeme-openai.openai.azure.com'
const apiKey = '3fd3e72060854208896ccc9515bc674a'
const model = 'gpt-4o'
const apiVersion = '2024-08-01-preview'

const body = JSON.stringify({
  messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
  max_tokens: 5
})

const options = {
  hostname: endpoint,
  path: `/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
    'Content-Length': Buffer.byteLength(body)
  }
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => data += chunk)
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data)
        const reply = json.choices?.[0]?.message?.content || '(empty)'
        console.log('[PASS] Azure OpenAI responded: ' + reply.trim())
      } catch (e) {
        console.log('[FAIL] Could not parse response: ' + data.slice(0, 200))
      }
    } else {
      console.log('[FAIL] HTTP ' + res.statusCode + ': ' + data.slice(0, 300))
    }
  })
})
req.on('error', (e) => console.log('[FAIL] Network error: ' + e.message))
req.write(body)
req.end()
