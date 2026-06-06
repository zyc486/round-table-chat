/**
 * 会话历史 Store
 * 管理聊天会话的创建、切换、删除
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSessions, putSession, deleteSession, deleteAllSessions, getMessagesBySession } from '../utils/db.js'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref([])
  const currentSessionId = ref(null)
  const loading = ref(false)

  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value) || null
  )

  const sessionCount = computed(() => sessions.value.length)

  async function init() {
    loading.value = true
    try {
      sessions.value = await getSessions()
      // 如果没有会话，创建一个默认的
      if (sessions.value.length === 0) {
        await createSession()
      } else if (!currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id
      }
    } catch (error) {
      console.error('加载会话失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function createSession(title = '') {
    const now = Date.now()
    const session = {
      id: `session_${now}`,
      title: title || `对话 ${new Date(now).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      createdAt: now,
      characterIds: [],
      messageCount: 0,
      lastMessage: ''
    }
    await putSession(session)
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    return session
  }

  async function switchSession(sessionId) {
    currentSessionId.value = sessionId
  }

  async function updateSession(id, updates) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      sessions.value[idx] = { ...sessions.value[idx], ...updates }
      await putSession(sessions.value[idx])
    }
  }

  async function removeSession(id) {
    await deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    // 如果删的是当前会话，切换到最近的
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null
    }
  }

  async function clearAll() {
    await deleteAllSessions()
    sessions.value = []
    currentSessionId.value = null
  }

  async function getSessionMessages(sessionId) {
    return getMessagesBySession(sessionId)
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    sessionCount,
    loading,
    init,
    createSession,
    switchSession,
    updateSession,
    removeSession,
    clearAll,
    getSessionMessages
  }
})
