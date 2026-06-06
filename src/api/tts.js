/**
 * TTS 语音合成 API
 * 从设置读取 Base URL / API Key
 */

import { getAudioCache, putAudioCache, getSettings } from '../utils/db.js'

const DEFAULT_TTS_ENDPOINT = '/api/chat/completions'
const DEFAULT_TTS_KEY = 'tp-couiwpsntndobnzl7k9lj9bpci9w5s0mpobpa3jpxztllggz'

export const VOICE_PRESETS = [
  { id: '冰糖', name: '冰糖', gender: 'female', lang: '中文' },
  { id: '茉莉', name: '茉莉', gender: 'female', lang: '中文' },
  { id: '苏打', name: '苏打', gender: 'male', lang: '中文' },
  { id: '白桦', name: '白桦', gender: 'male', lang: '中文' },
  { id: 'Mia', name: 'Mia', gender: 'female', lang: '英文' },
  { id: 'Chloe', name: 'Chloe', gender: 'female', lang: '英文' },
  { id: 'Milo', name: 'Milo', gender: 'male', lang: '英文' },
  { id: 'Dean', name: 'Dean', gender: 'male', lang: '英文' }
]

async function getTTSConfig() {
  try {
    const s = await getSettings()
    return {
      endpoint: s.ttsBaseUrl || s.baseUrl || DEFAULT_TTS_ENDPOINT,
      key: s.ttsApiKey || s.apiKey || DEFAULT_TTS_KEY
    }
  } catch {
    return { endpoint: DEFAULT_TTS_ENDPOINT, key: DEFAULT_TTS_KEY }
  }
}

function resolveEndpoint(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { proxyUrl: '/llm-proxy', targetUrl: url }
  }
  return { proxyUrl: url, targetUrl: null }
}

export async function synthesizeSpeech(text, voice = '冰糖', style = '') {
  const cacheKey = `${voice}:${style}:${text}`

  const cached = await getAudioCache(cacheKey)
  if (cached) {
    return playAudio(cached)
  }

  const config = await getTTSConfig()
  const { proxyUrl, targetUrl } = resolveEndpoint(config.endpoint)

  const messages = []
  if (style) {
    messages.push({ role: 'user', content: style })
  }
  messages.push({ role: 'assistant', content: text })

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`
    }
    if (targetUrl) {
      headers['X-Target-URL'] = targetUrl
    }

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'mimo-v2.5-tts',
        messages,
        audio: { format: 'wav', voice }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('TTS 错误:', error)
      throw new Error(`TTS 调用失败: ${response.status}`)
    }

    const data = await response.json()
    const audioBase64 = data.choices?.[0]?.message?.audio?.data

    if (!audioBase64) {
      throw new Error('未返回音频数据')
    }

    const audioSrc = `data:audio/wav;base64,${audioBase64}`
    await putAudioCache(cacheKey, audioSrc)

    return playAudio(audioSrc)
  } catch (error) {
    console.error('TTS 失败:', error)
    throw error
  }
}

function playAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src)
    audio.onended = () => resolve(audio)
    audio.onerror = (e) => reject(e)
    audio.play().catch(reject)
  })
}

let currentAudio = null

export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

export async function playSpeech(text, voice, style) {
  stopSpeech()
  try {
    currentAudio = await synthesizeSpeech(text, voice, style)
  } catch (error) {
    console.error('播放失败:', error)
  }
}
