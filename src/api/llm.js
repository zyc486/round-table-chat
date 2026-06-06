/**
 * LLM API 调用封装
 * 支持流式输出 (SSE) 和非流式
 * 从设置读取 Base URL / Model / API Key
 */

import { buildCharacterPrompt, buildModeratorPrompt, formatChatHistory } from '../utils/prompt.js'
import { getSettings } from '../utils/db.js'

// 默认配置（兜底用）
const DEFAULT_CONFIG = {
  baseUrl: '/api/chat/completions',
  apiKey: 'tp-couiwpsntndobnzl7k9lj9bpci9w5s0mpobpa3jpxztllggz',
  model: 'mimo-v2.5',
  contextLength: 1048576
}

// 联网搜索配置（保留）
const WEB_SEARCH_ENDPOINT = '/xiaomi/chat/completions'
const WEB_SEARCH_KEY = 'sk-czpchdsb2z6ze72oxv97re74td8rrtrnu5fcyy99jav21yw5'

/**
 * 解析 API 端点
 * 外部 URL (http/https) 通过 Vite 代理转发，避免 CORS
 * 相对路径直接使用
 */
function resolveEndpoint(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { proxyUrl: '/llm-proxy', targetUrl: url }
  }
  return { proxyUrl: url, targetUrl: null }
}

/**
 * 从设置读取 AI 配置
 */
async function getAIConfig() {
  try {
    const s = await getSettings()
    return {
      baseUrl: s.baseUrl || DEFAULT_CONFIG.baseUrl,
      apiKey: s.apiKey || DEFAULT_CONFIG.apiKey,
      model: s.model || DEFAULT_CONFIG.model,
      contextLength: s.contextLength || DEFAULT_CONFIG.contextLength
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

/**
 * 测试 AI 连接
 */
export async function testConnection() {
  const config = await getAIConfig()
  const { proxyUrl, targetUrl } = resolveEndpoint(config.baseUrl)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`
  }
  if (targetUrl) {
    headers['X-Target-URL'] = targetUrl
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: '你好，请回复"连接成功"' }],
      max_completion_tokens: 50,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  return { success: true, content, model: config.model }
}

/**
 * 流式调用 LLM API
 */
async function callLLMStream({ system, messages, maxTokens, temperature, webSearch = false, onChunk }) {
  const config = await getAIConfig()

  const body = {
    model: config.model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ],
    max_completion_tokens: maxTokens || Math.min(config.contextLength, 131072),
    temperature: temperature || 0.8,
    stream: true
  }

  if (webSearch) {
    body.tools = [{ type: 'web_search', max_keyword: 3, limit: 3 }]
    body.tool_choice = 'auto'
  }

  const rawEndpoint = webSearch ? WEB_SEARCH_ENDPOINT : config.baseUrl
  const key = webSearch ? WEB_SEARCH_KEY : config.apiKey
  const { proxyUrl, targetUrl } = resolveEndpoint(rawEndpoint)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  }
  if (targetUrl) {
    headers['X-Target-URL'] = targetUrl
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (errorText.includes('webSearchEnabled')) {
      throw new Error('联网搜索未开通，请在 MiMo 控制台开通「联网服务插件」')
    }
    throw new Error(`API 调用失败: ${response.status} - ${errorText.slice(0, 100)}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

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
 * 非流式调用
 */
async function callLLM({ system, messages, maxTokens, temperature, webSearch = false }) {
  const config = await getAIConfig()

  const body = {
    model: config.model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages
    ],
    max_completion_tokens: maxTokens || Math.min(config.contextLength, 131072),
    temperature: temperature || 0.8,
    stream: false
  }

  if (webSearch) {
    body.tools = [{ type: 'web_search', max_keyword: 3, limit: 3 }]
    body.tool_choice = 'auto'
  }

  const rawEndpoint = webSearch ? WEB_SEARCH_ENDPOINT : config.baseUrl
  const key = webSearch ? WEB_SEARCH_KEY : config.apiKey
  const { proxyUrl, targetUrl } = resolveEndpoint(rawEndpoint)

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  }
  if (targetUrl) {
    headers['X-Target-URL'] = targetUrl
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (errorText.includes('webSearchEnabled')) {
      throw new Error('联网搜索未开通，请在 MiMo 控制台开通「联网服务插件」')
    }
    throw new Error(`API 调用失败: ${response.status} - ${errorText.slice(0, 100)}`)
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

    const match = result.content.match(/\[[\s\S]*?\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {
        const idMatches = match[0].match(/"[^"]+"/g)
        if (idMatches) {
          return idMatches.map(s => s.replace(/"/g, ''))
        }
      }
    }

    return characters.length > 0 ? [characters[Math.floor(Math.random() * characters.length)].id] : []
  } catch (error) {
    console.error('获取回复角色失败:', error)
    return characters.length > 0 ? [characters[0].id] : []
  }
}
