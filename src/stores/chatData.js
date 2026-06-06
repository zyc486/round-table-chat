/**
 * 聊天数据 Store
 * 管理消息的增删查，与会话关联
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, putMessage, getMessagesBySession, clearMessages as dbClearMessages } from '../utils/db.js'
import { useSessionsStore } from './sessions.js'

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
      const sessionsStore = useSessionsStore()
      if (sessionsStore.currentSessionId) {
        messages.value = await getMessagesBySession(sessionsStore.currentSessionId)
      } else {
        messages.value = await api.getMessages()
      }
      const settings = await api.getSettings()
      currentMode.value = settings.mode || 'round_robin'
    } catch (error) {
      console.error('加载聊天记录失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换会话时重新加载消息
   */
  async function loadSession(sessionId) {
    loading.value = true
    try {
      messages.value = await getMessagesBySession(sessionId)
    } catch (error) {
      console.error('加载会话消息失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function addUserMessage(content, image = null) {
    const sessionsStore = useSessionsStore()
    const message = {
      id: `msg_${Date.now()}`,
      characterId: null,
      sessionId: sessionsStore.currentSessionId,
      content,
      image,
      annotations: [],
      timestamp: Date.now(),
      mode: currentMode.value,
      isUser: true
    }
    messages.value.push(message)
    await putMessage(message)

    // 更新会话信息
    if (sessionsStore.currentSessionId) {
      await sessionsStore.updateSession(sessionsStore.currentSessionId, {
        messageCount: messages.value.length,
        lastMessage: content.slice(0, 50)
      })
    }

    return message
  }

  async function addCharacterMessage(characterId, content, annotations = []) {
    const sessionsStore = useSessionsStore()
    const message = {
      id: `msg_${Date.now()}_${characterId}`,
      characterId,
      sessionId: sessionsStore.currentSessionId,
      content,
      image: null,
      annotations,
      timestamp: Date.now(),
      mode: currentMode.value,
      isUser: false
    }
    messages.value.push(message)
    await putMessage(message)

    // 更新会话的角色列表
    if (sessionsStore.currentSessionId) {
      const session = sessionsStore.currentSession
      if (session && !session.characterIds.includes(characterId)) {
        await sessionsStore.updateSession(sessionsStore.currentSessionId, {
          characterIds: [...session.characterIds, characterId],
          messageCount: messages.value.length,
          lastMessage: content.slice(0, 50)
        })
      } else {
        await sessionsStore.updateSession(sessionsStore.currentSessionId, {
          messageCount: messages.value.length,
          lastMessage: content.slice(0, 50)
        })
      }
    }

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
    loadSession,
    addUserMessage,
    addCharacterMessage,
    setMode,
    clearMessages,
    getRecentMessages
  }
})
