/**
 * LLM API 调用封装
 * 使用 MiMo 模型（支持联网搜索）
 */

import { buildCharacterPrompt, buildModeratorPrompt, formatChatHistory } from '../utils/prompt.js'

// MiMo API 配置（使用 Vite 代理）
const API_ENDPOINT = '/api/chat/completions'
const API_KEY = 'tp-couiwpsntndobnzl7k9lj9bpci9w5s0mpobpa3jpxztllggz'
const MODEL = 'mimo-v2.5'

// 联网搜索用的单独配置
const WEB_SEARCH_ENDPOINT = '/xiaomi/chat/completions'
const WEB_SEARCH_KEY = 'sk-czpchdsb2z6ze72oxv97re74td8rrtrnu5fcyy99jav21yw5'

/**
 * 调用 LLM API
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

  // 联网搜索
  if (webSearch) {
    body.tools = [
      {
        type: 'web_search',
        max_keyword: 3,
        limit: 3
      }
    ]
    body.tool_choice = 'auto'
  }

  // 联网搜索用不同的端点和 Key
  const endpoint = webSearch ? WEB_SEARCH_ENDPOINT : API_ENDPOINT
  const key = webSearch ? WEB_SEARCH_KEY : API_KEY

  console.log('调用 API:', endpoint)
  console.log('模型:', MODEL)
  console.log('联网搜索:', webSearch)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    })

    console.log('响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API 错误:', errorText)

      // 联网搜索未开通提示
      if (errorText.includes('webSearchEnabled')) {
        throw new Error('联网搜索未开通，请在 MiMo 控制台开通「联网服务插件」')
      }

      throw new Error(`API 调用失败: ${response.status}`)
    }

    const data = await response.json()
    console.log('API 响应成功')

    return {
      content: data.choices?.[0]?.message?.content || '',
      annotations: data.choices?.[0]?.message?.annotations || []
    }
  } catch (error) {
    console.error('LLM 调用失败:', error)
    throw error
  }
}

/**
 * 构建多模态消息内容
 */
function buildMessageContent(text, image) {
  if (!image) {
    return text
  }

  return [
    { type: 'text', text: text || '请描述这张图片' },
    { type: 'image_url', image_url: { url: image } }
  ]
}

/**
 * 与角色对话（支持图片和联网搜索）
 */
export async function chatWithCharacter(character, chatHistory, userMessage, allCharacters, getCharacter, image = null, replyLength = 100, webSearch = false) {
  const systemPrompt = buildCharacterPrompt(character, allCharacters) + `\n\n回复字数限制：不超过 ${replyLength} 字`

  const formattedHistory = formatChatHistory(chatHistory.slice(-50), getCharacter)

  const userMsg = {
    role: 'user',
    content: buildMessageContent(userMessage, image)
  }

  const messages = [
    ...formattedHistory,
    userMsg
  ]

  const result = await callLLM({
    system: systemPrompt,
    messages,
    maxTokens: 200,
    temperature: 0.85,
    webSearch
  })

  return result
}

/**
 * 自由模式 - 判断哪些角色会回复
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

    const match = result.content.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }
    return []
  } catch (error) {
    console.error('获取回复角色失败:', error)
    return characters.length > 0 ? [characters[0].id] : []
  }
}
