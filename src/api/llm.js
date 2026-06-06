/**
 * LLM API 调用封装
 * 支持流式输出 (SSE) 和非流式
 */

import { buildCharacterPrompt, buildModeratorPrompt, formatChatHistory } from '../utils/prompt.js'

const API_ENDPOINT = '/api/chat/completions'
const API_KEY = 'tp-couiwpsntndobnzl7k9lj9bpci9w5s0mpobpa3jpxztllggz'
const MODEL = 'mimo-v2.5'

const WEB_SEARCH_ENDPOINT = '/xiaomi/chat/completions'
const WEB_SEARCH_KEY = 'sk-czpchdsb2z6ze72oxv97re74td8rrtrnu5fcyy99jav21yw5'

/**
 * 流式调用 LLM API
 * @returns {Promise<string>} 完整响应文本
 */
async function callLLMStream({ system, messages, maxTokens, temperature, webSearch = false, onChunk }) {
  const body = {
    model: MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ],
    max_completion_tokens: maxTokens || 131072,
    temperature: temperature || 0.8,
    stream: true
  }

  if (webSearch) {
    body.tools = [{ type: 'web_search', max_keyword: 3, limit: 3 }]
    body.tool_choice = 'auto'
  }

  const endpoint = webSearch ? WEB_SEARCH_ENDPOINT : API_ENDPOINT
  const key = webSearch ? WEB_SEARCH_KEY : API_KEY

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (errorText.includes('webSearchEnabled')) {
      throw new Error('联网搜索未开通，请在 MiMo 控制台开通「联网服务插件」')
    }
    throw new Error(`API 调用失败: ${response.status}`)
  }

  // 读取 SSE 流
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留不完整的行

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        if (delta?.content) {
          fullContent += delta.content
          if (onChunk) onChunk(delta.content)
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  return fullContent
}

/**
 * 非流式调用（兼容旧逻辑）
 */
async function callLLM({ system, messages, maxTokens, temperature, webSearch = false }) {
  const body = {
    model: MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ],
    max_completion_tokens: maxTokens || 131072,
    temperature: temperature || 0.8,
    stream: false
  }

  if (webSearch) {
    body.tools = [{ type: 'web_search', max_keyword: 3, limit: 3 }]
    body.tool_choice = 'auto'
  }

  const endpoint = webSearch ? WEB_SEARCH_ENDPOINT : API_ENDPOINT
  const key = webSearch ? WEB_SEARCH_KEY : API_KEY

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (errorText.includes('webSearchEnabled')) {
      throw new Error('联网搜索未开通，请在 MiMo 控制台开通「联网服务插件」')
    }
    throw new Error(`API 调用失败: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    annotations: data.choices?.[0]?.message?.annotations || []
  }
}

function buildMessageContent(text, image) {
  if (!image) return text
  return [
    { type: 'text', text: text || '请描述这张图片' },
    { type: 'image_url', image_url: { url: image } }
  ]
}

/**
 * 与角色对话（支持流式、图片和联网搜索）
 * @param {Function} onChunk - 流式回调，每收到一段文本调用一次
 */
export async function chatWithCharacter(
  character, chatHistory, userMessage, allCharacters, getCharacter,
  image = null, replyLength = 100, webSearch = false, onChunk = null
) {
  const systemPrompt = buildCharacterPrompt(character, allCharacters)
    + `\n\n回复字数限制：不超过 ${replyLength} 字`

  const formattedHistory = formatChatHistory(chatHistory.slice(-50), getCharacter)
  const userMsg = { role: 'user', content: buildMessageContent(userMessage, image) }
  const messages = [...formattedHistory, userMsg]

  if (onChunk) {
    // 流式模式
    const content = await callLLMStream({
      system: systemPrompt,
      messages,
      maxTokens: 200,
      temperature: 0.85,
      webSearch,
      onChunk
    })
    return { content, annotations: [] }
  } else {
    // 非流式模式
    return callLLM({
      system: systemPrompt,
      messages,
      maxTokens: 200,
      temperature: 0.85,
      webSearch
    })
  }
}

/**
 * 自由模式 - 判断哪些角色会回复（带容错）
 */
export async function getRespondingCharacters(userMessage, characters) {
  const prompt = buildModeratorPrompt(userMessage, characters)

  try {
    const result = await callLLM({
      system: prompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 100,
      temperature: 0.3
    })

    // 正则容错提取 JSON 数组
    const match = result.content.match(/\[[\s\S]*?\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {
        // JSON 解析失败，尝试提取 ID 字符串
        const idMatches = match[0].match(/"[^"]+"/g)
        if (idMatches) {
          return idMatches.map(s => s.replace(/"/g, ''))
        }
      }
    }

    // fallback: 随机抽取一位活跃度低的角色
    return characters.length > 0 ? [characters[Math.floor(Math.random() * characters.length)].id] : []
  } catch (error) {
    console.error('获取回复角色失败:', error)
    // fallback
    return characters.length > 0 ? [characters[0].id] : []
  }
}
