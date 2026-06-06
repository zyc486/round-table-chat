/**
 * 聊天 UI 状态 Store
 * 管理当前谁在说话、谁在思考、流式文本、高亮座位
 * 独立于数据层，避免消息数组变化触发 UI 状态重绘
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatUIStore = defineStore('chatUI', () => {
  const speakingCharacterId = ref(null)
  const thinkingCharacterId = ref(null)
  const speakingText = ref('')
  const streamingText = ref('')
  const isStreaming = ref(false)

  // 当前活跃角色（说话或思考）
  const activeCharacterId = computed(() => speakingCharacterId.value || thinkingCharacterId.value)

  function setThinking(id) {
    thinkingCharacterId.value = id
    speakingCharacterId.value = null
    speakingText.value = '思考中...'
    isStreaming.value = false
    streamingText.value = ''
  }

  function setSpeaking(id, text) {
    thinkingCharacterId.value = null
    speakingCharacterId.value = id
    speakingText.value = text
    isStreaming.value = false
  }

  function startStreaming(id) {
    thinkingCharacterId.value = null
    speakingCharacterId.value = id
    speakingText.value = ''
    isStreaming.value = true
    streamingText.value = ''
  }

  function updateStreamText(text) {
    streamingText.value = text
    speakingText.value = text
  }

  function stopStreaming() {
    isStreaming.value = false
  }

  function clearActive() {
    speakingCharacterId.value = null
    thinkingCharacterId.value = null
    speakingText.value = ''
    streamingText.value = ''
    isStreaming.value = false
  }

  return {
    speakingCharacterId,
    thinkingCharacterId,
    speakingText,
    streamingText,
    isStreaming,
    activeCharacterId,
    setThinking,
    setSpeaking,
    startStreaming,
    updateStreamText,
    stopStreaming,
    clearActive
  }
})
