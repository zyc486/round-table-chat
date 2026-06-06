/**
 * 流式输出 Composable
 * 处理 SSE 流式渲染、打字机效果
 */
import { ref, watch } from 'vue'

export function useStreaming() {
  const displayText = ref('')
  const isStreaming = ref(false)
  const targetText = ref('')
  let streamTimer = null

  /**
   * 开始流式显示
   */
  function startStream() {
    displayText.value = ''
    targetText.value = ''
    isStreaming.value = true
  }

  /**
   * 追加流式文本（来自 SSE chunk）
   */
  function appendChunk(chunk) {
    targetText.value += chunk
    // 打字机效果：逐字追加
    scheduleTypewriter()
  }

  /**
   * 打字机调度
   */
  function scheduleTypewriter() {
    if (streamTimer) return

    streamTimer = requestAnimationFrame(function tick() {
      if (displayText.value.length < targetText.value.length) {
        // 每帧显示 1-3 个字符
        const gap = targetText.value.length - displayText.value.length
        const charsToAdd = gap > 10 ? 3 : gap > 5 ? 2 : 1
        displayText.value = targetText.value.slice(0, displayText.value.length + charsToAdd)

        if (displayText.value.length < targetText.value.length) {
          streamTimer = requestAnimationFrame(tick)
        } else {
          streamTimer = null
        }
      } else {
        streamTimer = null
      }
    })
  }

  /**
   * 流式结束
   */
  function endStream() {
    isStreaming.value = false
    // 确保最终文本完整显示
    displayText.value = targetText.value
    if (streamTimer) {
      cancelAnimationFrame(streamTimer)
      streamTimer = null
    }
  }

  /**
   * 直接设置文本（非流式）
   */
  function setText(text) {
    displayText.value = text
    targetText.value = text
    isStreaming.value = false
  }

  return {
    displayText,
    isStreaming,
    startStream,
    appendChunk,
    endStream,
    setText
  }
}
