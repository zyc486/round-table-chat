/**
 * TTS 语音合成 API
 * 使用 MiMo-V2.5-TTS 模型
 */

// TTS API 配置（先尝试 Token Plan）
const TTS_ENDPOINT = '/api/chat/completions'
const TTS_KEY = 'tp-couiwpsntndobnzl7k9lj9bpci9w5s0mpobpa3jpxztllggz'

// 预置音色
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

// 音频缓存
const audioCache = new Map()

/**
 * 语音合成
 * @param {string} text - 要合成的文本
 * @param {string} voice - 音色 ID
 * @param {string} style - 风格描述（自然语言）
 * @returns {Promise<HTMLAudioElement>}
 */
export async function synthesizeSpeech(text, voice = '冰糖', style = '') {
  const cacheKey = `${voice}:${style}:${text}`

  // 检查缓存
  if (audioCache.has(cacheKey)) {
    return playAudio(audioCache.get(cacheKey))
  }

  const messages = []

  // 风格指令
  if (style) {
    messages.push({ role: 'user', content: style })
  }

  // 合成文本（必须在 assistant 消息中）
  messages.push({ role: 'assistant', content: text })

  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TTS_KEY}`
      },
      body: JSON.stringify({
        model: 'mimo-v2.5-tts',
        messages,
        audio: {
          format: 'wav',
          voice
        }
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

    // 缓存
    const audioSrc = `data:audio/wav;base64,${audioBase64}`
    audioCache.set(cacheKey, audioSrc)

    // 限制缓存大小
    if (audioCache.size > 100) {
      const firstKey = audioCache.keys().next().value
      audioCache.delete(firstKey)
    }

    return playAudio(audioSrc)
  } catch (error) {
    console.error('TTS 失败:', error)
    throw error
  }
}

/**
 * 播放音频
 */
function playAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src)
    audio.onended = () => resolve(audio)
    audio.onerror = (e) => reject(e)
    audio.play().catch(reject)
  })
}

/**
 * 停止当前播放
 */
let currentAudio = null
export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

/**
 * 播放语音（带停止功能）
 */
export async function playSpeech(text, voice, style) {
  stopSpeech()
  try {
    currentAudio = await synthesizeSpeech(text, voice, style)
  } catch (error) {
    console.error('播放失败:', error)
  }
}
