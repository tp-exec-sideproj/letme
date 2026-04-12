import OpenAI, { AzureOpenAI } from 'openai'
import { getSettings } from './store'

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam

function getClient(): OpenAI {
  const settings = getSettings()
  if (!settings.aiEndpoint || !settings.aiKey) {
    throw new Error('AI credentials not configured. Please set them in Settings.')
  }

  // Azure OpenAI endpoint — use AzureOpenAI client
  if (settings.aiEndpoint.includes('.openai.azure.com')) {
    return new AzureOpenAI({
      endpoint: settings.aiEndpoint,
      apiKey: settings.aiKey,
      apiVersion: '2024-08-01-preview',
      deployment: settings.aiModel || 'gpt-4o'
    })
  }

  // Any other OpenAI-compatible endpoint
  return new OpenAI({
    apiKey: settings.aiKey,
    baseURL: settings.aiEndpoint,
    dangerouslyAllowBrowser: false
  })
}

function getModel(): string {
  return getSettings().aiModel || 'gpt-4o'
}

function buildMessagesWithImage(
  messages: ChatMessage[],
  imageBase64: string
): ChatMessage[] {
  return messages.map((msg, i) => {
    if (i === messages.length - 1 && msg.role === 'user') {
      const textContent = typeof msg.content === 'string' ? msg.content : ''
      return {
        role: 'user',
        content: [
          { type: 'text' as const, text: textContent },
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${imageBase64}` }
          }
        ]
      }
    }
    return msg
  })
}

export async function askAI(
  messages: ChatMessage[],
  imageBase64?: string
): Promise<string> {
  const client = getClient()
  const finalMessages = imageBase64
    ? buildMessagesWithImage(messages, imageBase64)
    : messages

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: finalMessages,
    max_tokens: 2048
  })

  return response.choices[0]?.message?.content || ''
}

export async function askAIStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const client = getClient()

  const stream = await client.chat.completions.create({
    model: getModel(),
    messages,
    max_tokens: 2048,
    stream: true
  })

  let fullText = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      fullText += delta
      onChunk(delta)
    }
  }

  return fullText
}

export async function analyzeScreenshot(imageBase64: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        "You are analyzing a meeting screen. Describe what's shown: any graphs, charts, presentations, code, or key information. Extract key data points and insights. Be concise and structured."
    },
    {
      role: 'user',
      content: 'Analyze this screenshot from my current meeting:'
    }
  ]
  return askAI(messages, imageBase64)
}

export type { ChatMessage }
