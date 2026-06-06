/**
 * 聊天数据 Store
 * 纯管理历史记录数组、持久化
 * 与 UI 状态分离，避免数据更新引起不必要的视图重绘
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, putMessage, clearMessages as dbClearMessages } from '../utils/db.js'

export const useChatDataStore = defineStore('chatData', () => {
  const messages = ref([])
  const loading = ref(false)
  const currentMode = ref('round_robin')

  const messageCount = computed(() => messages.value.length)
  const lastMessage = computed(() => {
    return messages.value.length > 0
      ? messages.value[messages.value.length - 1]
      : null
  })

  async function init() {
    loading.value = true
    try {
      messages.value = await api.getMessages()
      const settings = await api.getSettings()
      currentMode.value = settings.mode || 'round_robin'
    } catch (error) {
      console.error('加载聊天记录失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function addUserMessage(content, image = null) {
    const message = {
      id: `msg_${Date.now()}`,
      characterId: null,
      content,
      image,
      annotations: [],
      timestamp: Date.now(),
      mode: currentMode.value,
      isUser: true
    }
    messages.value.push(message)
    await putMessage(message)
    return message
  }

  async function addCharacterMessage(characterId, content, annotations = []) {
    const message = {
      id: `msg_${Date.now()}_${characterId}`,
      characterId,
      content,
      image: null,
      annotations,
      timestamp: Date.now(),
      mode: currentMode.value,
      isUser: false
    }
    messages.value.push(message)
    await putMessage(message)
    return message
  }

  function setMode(mode) {
    currentMode.value = mode
  }

  async function clearMessages() {
    messages.value = []
    await dbClearMessages()
  }

  function getRecentMessages(count = 20) {
    return messages.value.slice(-count)
  }

  return {
    messages,
    loading,
    currentMode,
    messageCount,
    lastMessage,
    init,
    addUserMessage,
    addCharacterMessage,
    setMode,
    clearMessages,
    getRecentMessages
  }
})
