/**
 * 聊天编排器 Composable
 * 处理全员轮流、@指定、自由触发的复杂轮转逻辑
 */
import { ref } from 'vue'
import { useChatDataStore } from '../stores/chatData.js'
import { useChatUIStore } from '../stores/chatUI.js'
import { useCharacterStore } from '../stores/character.js'
import { useSettingsStore } from '../stores/settings.js'
import { chatWithCharacter, getRespondingCharacters } from '../api/llm.js'
import { useAudioQueue } from './useAudioQueue.js'

export function useChatOrchestrator() {
  const chatData = useChatDataStore()
  const chatUI = useChatUIStore()
  const characterStore = useCharacterStore()
  const settingsStore = useSettingsStore()
  const audioQueue = useAudioQueue()

  const isProcessing = ref(false)

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 通用角色回复流程（支持流式）
   */
  async function processCharacterReply(char, history, userMessage, image, webSearch, isStream = true) {
    chatUI.setThinking(char.id)
    await sleep(300)

    if (isStream) {
      // 流式模式：逐字显示
      chatUI.startStreaming(char.id)
      let fullContent = ''

      await chatWithCharacter(
        char, history, userMessage, characterStore.characters,
        characterStore.getCharacterById, image, settingsStore.settings.replyLength, webSearch,
        // onChunk 回调
        (chunk) => {
          fullContent += chunk
          chatUI.updateStreamText(fullContent)
        }
      )

      chatUI.stopStreaming()
      await chatData.addCharacterMessage(char.id, fullContent)

      // TTS 异步：按句切分提前合成
      if (settingsStore.settings.voiceEnabled) {
        const charVoice = characterStore.getCharacterById(char.id)?.voice
        if (charVoice?.enabled) {
          audioQueue.enqueueSentences(fullContent, charVoice.voiceId, charVoice.style)
        }
      }
    } else {
      // 非流式模式
      const result = await chatWithCharacter(
        char, history, userMessage, characterStore.characters,
        characterStore.getCharacterById, image, settingsStore.settings.replyLength, webSearch
      )

      chatUI.setSpeaking(char.id, result.content)
      await chatData.addCharacterMessage(char.id, result.content, result.annotations)

      // TTS
      if (settingsStore.settings.voiceEnabled) {
        const charVoice = characterStore.getCharacterById(char.id)?.voice
        if (charVoice?.enabled) {
          audioQueue.enqueueSentences(result.content, charVoice.voiceId, charVoice.style)
        }
      }
    }

    await sleep(settingsStore.settings.replyDelay || 800)
    chatUI.clearActive()
  }

  /**
   * 全员轮流模式
   */
  async function handleRoundRobin(userMessage, image, webSearch) {
    const history = chatData.getRecentMessages(50)
    for (const char of characterStore.characters) {
      await processCharacterReply(char, history, userMessage, image, webSearch)
    }
  }

  /**
   * @指定模式
   */
  async function handleMention(userMessage, image, webSearch) {
    const mentionMatch = userMessage.match(/@(\S+)/)
    if (!mentionMatch) {
      alert('请用 @名字 指定角色')
      return
    }

    const targetName = mentionMatch[1]
    const targetChar = characterStore.characters.find(
      c => c.name === targetName || c.name.includes(targetName)
    )

    if (!targetChar) {
      alert(`找不到角色: ${targetName}`)
      return
    }

    const history = chatData.getRecentMessages(50)
    await processCharacterReply(targetChar, history, userMessage, image, webSearch)
  }

  /**
   * 自由模式（带容错）
   */
  async function handleFree(userMessage, image, webSearch) {
    let respondingIds
    try {
      respondingIds = await getRespondingCharacters(userMessage, characterStore.characters)
    } catch (error) {
      console.error('自由模式主持人判断失败:', error)
      // fallback: 随机选 1-2 个角色
      const shuffled = [...characterStore.characters].sort(() => Math.random() - 0.5)
      respondingIds = shuffled.slice(0, Math.min(2, shuffled.length)).map(c => c.id)
    }

    if (!respondingIds || respondingIds.length === 0) {
      // fallback: 选第一个角色
      respondingIds = characterStore.characters.length > 0
        ? [characterStore.characters[0].id]
        : []
    }

    const history = chatData.getRecentMessages(50)
    for (const charId of respondingIds) {
      const char = characterStore.getCharacterById(charId)
      if (!char) continue
      await processCharacterReply(char, history, userMessage, image, webSearch)
    }
  }

  /**
   * 发送消息入口
   */
  async function send({ text, image, webSearch }) {
    if (isProcessing.value || (!text && !image)) return

    await chatData.addUserMessage(text || '[图片]', image)

    if (characterStore.characters.length === 0) {
      alert('请先添加角色')
      return
    }

    isProcessing.value = true

    try {
      const mode = chatData.currentMode
      const userMessage = text || '请描述一下这张图片'

      if (mode === 'round_robin') {
        await handleRoundRobin(userMessage, image, webSearch)
      } else if (mode === 'mention') {
        await handleMention(userMessage, image, webSearch)
      } else if (mode === 'free') {
        await handleFree(userMessage, image, webSearch)
      }
    } catch (error) {
      console.error('AI 回复失败:', error)
      alert('AI 回复失败: ' + error.message)
    } finally {
      isProcessing.value = false
      chatUI.clearActive()
    }
  }

  return {
    isProcessing,
    send
  }
}
