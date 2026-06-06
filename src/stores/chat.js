/**
 * 聊天 Store（兼容层）
 * 委托给 chatData + chatUI，保持旧接口不变
 */
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useChatDataStore } from './chatData.js'
import { useChatUIStore } from './chatUI.js'

export const useChatStore = defineStore('chat', () => {
  const dataStore = useChatDataStore()
  const uiStore = useChatUIStore()

  // 代理所有属性
  const messages = computed(() => dataStore.messages)
  const loading = computed(() => dataStore.loading)
  const currentMode = computed(() => dataStore.currentMode)
  const speakingCharacterId = computed(() => uiStore.speakingCharacterId)
  const thinkingCharacterId = computed(() => uiStore.thinkingCharacterId)
  const messageCount = computed(() => dataStore.messageCount)
  const lastMessage = computed(() => dataStore.lastMessage)

  return {
    messages,
    loading,
    currentMode,
    speakingCharacterId,
    thinkingCharacterId,
    messageCount,
    lastMessage,
    init: () => dataStore.init(),
    addUserMessage: (c, i) => dataStore.addUserMessage(c, i),
    addCharacterMessage: (id, c, a) => dataStore.addCharacterMessage(id, c, a),
    setSpeakingCharacter: (id) => id ? uiStore.setSpeaking(id, '') : uiStore.clearActive(),
    setThinkingCharacter: (id) => id ? uiStore.setThinking(id) : uiStore.clearActive(),
    setMode: (m) => dataStore.setMode(m),
    clearMessages: () => dataStore.clearMessages(),
    getRecentMessages: (n) => dataStore.getRecentMessages(n)
  }
})
