import OpenAI, { AzureOpenAI } from 'openai'
import { getSettings } from './store'
import { searchWeb, formatSearchResults } from './web-search'

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam

const WEB_SEARCH_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the web for current, factual, or up-to-date information. Use this when you need to look up facts, recent events, specific details, or any information you are not certain about.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query — be specific and concise'
        }
      },
      required: ['query']
    }
  }
}

function getClient(): OpenAI {
  const settings = getSettings()
  if (!settings.aiEndpoint || !settings.aiKey) {
    throw new Error('AI credentials not configured. Please set them in Settings.')
  }

  if (settings.aiEndpoint.includes('.openai.azure.com')) {
    return new AzureOpenAI({
      endpoint: settings.aiEndpoint,
      apiKey: settings.aiKey,
      apiVersion: '2024-08-01-preview',
      deployment: settings.aiModel || 'gpt-4o'
    })
  }

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
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      }
    }
    return msg
  })
}

/**
 * Ask AI with optional web search tool calling.
 * The AI will automatically call web_search if it needs current information.
 */
export async function askAI(
  messages: ChatMessage[],
  imageBase64?: string,
  useWebSearch = true
): Promise<string> {
  const client = getClient()
  const finalMessages = imageBase64
    ? buildMessagesWithImage(messages, imageBase64)
    : messages

  // First call — may include tool use
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: finalMessages,
    max_tokens: 4096,
    ...(useWebSearch && !imageBase64 ? { tools: [WEB_SEARCH_TOOL], tool_choice: 'auto' } : {}),
    // When image is included with web search, still allow tool calls
    ...(useWebSearch && imageBase64 ? { tools: [WEB_SEARCH_TOOL], tool_choice: 'auto' } : {})
  })

  const choice = response.choices[0]

  // Handle tool call (web search)
  if (choice?.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0]
    if (toolCall.function.name === 'web_search') {
      let query = ''
      try {
        const args = JSON.parse(toolCall.function.arguments)
        query = args.query || ''
      } catch { /* use empty query */ }

      let searchContext = ''
      if (query) {
        try {
          const results = await searchWeb(query)
          searchContext = formatSearchResults(query, results)
        } catch (err) {
          searchContext = `Search failed for "${query}"`
          console.error('[AI] Web search error:', err)
        }
      }

      // Second call with search results
      const followupMessages: ChatMessage[] = [
        ...finalMessages,
        { role: 'assistant' as const, content: null, tool_calls: choice.message.tool_calls } as any,
        {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: searchContext
        }
      ]

      const followup = await client.chat.completions.create({
        model: getModel(),
        messages: followupMessages,
        max_tokens: 4096
      })

      return followup.choices[0]?.message?.content || ''
    }
  }

  return choice?.message?.content || ''
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

/**
 * Fast streaming answer — no web search, minimal tokens, optimized for real-time response.
 * Used for auto-answering live transcript questions in the center overlay.
 */
export async function fastAnswerStream(
  question: string,
  systemPrompt: string,
  history: ChatMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const client = getClient()

  const stream = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: question }
    ],
    max_tokens: 700,
    stream: true,
    temperature: 0.3
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
  return askAI(messages, imageBase64, false)
}

export type { ChatMessage }
