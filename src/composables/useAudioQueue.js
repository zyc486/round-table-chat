/**
 * 音频队列管理 Composable
 * 专门管理 TTS 音频的缓存、播放、打断和并发
 * 支持按句切分提前合成，实现"一边看字，一边听声音"
 */
import { ref, shallowRef } from 'vue'
import { synthesizeSpeech, stopSpeech } from '../api/tts.js'

const queue = ref([])
const isPlaying = ref(false)
const currentAudio = shallowRef(null)

export function useAudioQueue() {
  /**
   * 按标点切句
   */
  function splitSentences(text) {
    // 按中文句号、问号、叹号、英文句号等切分
    const sentences = text.split(/(?<=[。！？.!?\n])/g)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // 合并过短的句子
    const merged = []
    let buffer = ''
    for (const s of sentences) {
      buffer += s
      if (buffer.length >= 8 || s.endsWith('。') || s.endsWith('！') || s.endsWith('？') || s.endsWith('!') || s.endsWith('?')) {
        merged.push(buffer)
        buffer = ''
      }
    }
    if (buffer) merged.push(buffer)
    return merged
  }

  /**
   * 将文本按句切分后加入队列
   */
  function enqueueSentences(text, voiceId, style) {
    const sentences = splitSentences(text)
    for (const sentence of sentences) {
      queue.value.push({ text: sentence, voiceId, style })
    }
    processQueue()
  }

  /**
   * 直接加入队列
   */
  function enqueue(text, voiceId, style) {
    queue.value.push({ text, voiceId, style })
    processQueue()
  }

  /**
   * 处理队列
   */
  async function processQueue() {
    if (isPlaying.value || queue.value.length === 0) return

    isPlaying.value = true

    while (queue.value.length > 0) {
      const item = queue.value.shift()
      try {
        currentAudio.value = await synthesizeSpeech(item.text, item.voiceId, item.style)
        // 等待播放完成
        await new Promise((resolve) => {
          if (currentAudio.value?.ended) {
            resolve()
          } else if (currentAudio.value) {
            currentAudio.value.onended = resolve
            currentAudio.value.onerror = resolve
          } else {
            resolve()
          }
        })
      } catch (error) {
        console.error('音频播放失败:', error)
      }
    }

    isPlaying.value = false
    currentAudio.value = null
  }

  /**
   * 打断并清空队列
   */
  function interrupt() {
    queue.value = []
    stopSpeech()
    isPlaying.value = false
    currentAudio.value = null
  }

  return {
    queue,
    isPlaying,
    enqueue,
    enqueueSentences,
    interrupt
  }
}
