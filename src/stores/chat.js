import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/storage.js'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref([])
  const loading = ref(false)
  const currentMode = ref('round_robin')
  const speakingCharacterId = ref(null)
  const thinkingCharacterId = ref(null)

  // 计算属性
  const messageCount = computed(() => messages.value.length)
  const lastMessage = computed(() => {
    return messages.value.length > 0
      ? messages.value[messages.value.length - 1]
      : null
  })

  // 初始化
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

  // 保存消息
  async function save() {
    await api.saveMessages(messages.value)
  }

  // 添加用户消息（支持图片）
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
    await save()
    return message
  }

  // 添加角色消息（支持搜索来源）
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
    await save()
    return message
  }

  // 设置当前发言角色
  function setSpeakingCharacter(id) {
    speakingCharacterId.value = id
  }

  // 设置当前思考角色
  function setThinkingCharacter(id) {
    thinkingCharacterId.value = id
  }

  // 切换模式
  function setMode(mode) {
    currentMode.value = mode
  }

  // 清空消息
  async function clearMessages() {
    messages.value = []
    await save()
  }

  // 获取最近 N 条消息
  function getRecentMessages(count = 20) {
    return messages.value.slice(-count)
  }

  return {
    messages,
    loading,
    currentMode,
    speakingCharacterId,
    thinkingCharacterId,
    messageCount,
    lastMessage,
    init,
    addUserMessage,
    addCharacterMessage,
    setSpeakingCharacter,
    setThinkingCharacter,
    setMode,
    clearMessages,
    getRecentMessages
  }
})
