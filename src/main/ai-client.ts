import { getSettings } from './store'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

function getClient() {
  const settings = getSettings()
  const endpoint = settings.azureAiEndpoint
  const key = settings.azureAiKey

  if (!endpoint || !key) {
    throw new Error('Azure AI credentials not configured. Please set them in Settings.')
  }

  const ModelClient = require('@azure-rest/ai-inference').default
  const { AzureKeyCredential } = require('@azure/core-auth')
  const { isUnexpected } = require('@azure-rest/ai-inference')

  const client = ModelClient(endpoint, new AzureKeyCredential(key))
  return { client, isUnexpected }
}

function getModel(): string {
  const settings = getSettings()
  return settings.azureAiModel || 'claude-sonnet-4-5'
}

export async function askClaude(
  messages: ChatMessage[],
  imageBase64?: string
): Promise<string> {
  const { client, isUnexpected } = getClient()

  const processedMessages = messages.map((msg) => {
    if (msg.role === 'user' && imageBase64 && msg === messages[messages.length - 1]) {
      return {
        role: msg.role,
        content: [
          { type: 'text', text: typeof msg.content === 'string' ? msg.content : '' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${imageBase64}` }
          }
        ]
      }
    }
    return msg
  })

  const response = await client.path('/chat/completions').post({
    body: {
      messages: processedMessages,
      model: getModel(),
      max_tokens: 2048,
      stream: false
    }
  })

  if (isUnexpected(response)) {
    throw new Error(`Azure AI error: ${JSON.stringify(response.body)}`)
  }

  return response.body.choices[0].message.content as string
}

export async function askClaudeStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const { client, isUnexpected } = getClient()

  const response = await client.path('/chat/completions').post({
    body: {
      messages,
      model: getModel(),
      max_tokens: 2048,
      stream: true
    }
  })

  if (isUnexpected(response)) {
    throw new Error(`Azure AI error: ${JSON.stringify(response.body)}`)
  }

  let fullText = ''

  const body = response.body as AsyncIterable<any>
  for await (const event of body) {
    const raw = typeof event === 'string' ? event : event?.data
    if (!raw || raw === '[DONE]') continue

    try {
      const data = typeof raw === 'object' ? raw : JSON.parse(raw)
      const delta = data.choices?.[0]?.delta?.content
      if (delta) {
        fullText += delta
        onChunk(delta)
      }
    } catch {
      // skip malformed events
    }
  }

  return fullText
}

export async function analyzeScreenshot(imageBase64: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are analyzing a meeting screen. Describe what\'s shown: any graphs, charts, presentations, code, or key information. Extract key data points and insights. Be concise.'
    },
    {
      role: 'user',
      content: 'Analyze this screenshot from my current meeting:'
    }
  ]

  return askClaude(messages, imageBase64)
}
