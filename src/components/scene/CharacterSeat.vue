<template>
  <div
    class="seat"
    :class="{
      'is-speaking': isSpeaking,
      'is-thinking': isThinking,
      'is-user': isUser,
      'is-streaming': isStreaming
    }"
    @click="$emit('click')"
    ref="seatRef"
  >
    <div class="avatar-wrap">
      <div class="avatar-ring">
        <img v-if="character.avatar" :src="character.avatar" class="avatar" />
        <div v-else class="avatar-text" :class="{ user: isUser }">
          {{ isUser ? '😊' : character.name?.charAt(0) || '?' }}
        </div>
      </div>
      <div v-if="isThinking" class="thinking">
        <span></span><span></span><span></span>
      </div>
      <div v-if="isSpeaking" class="speaking-ring"></div>
    </div>

    <div class="name" :class="{ user: isUser }">{{ character.name }}</div>

    <!-- 气泡：流式打字机效果 -->
    <transition name="bubble">
      <div v-if="shouldShowBubble" class="bubble">
        <div class="bubble-content">
          <span v-if="isStreaming" class="typewriter-text">
            {{ truncatedBubbleText }}<span class="cursor">|</span>
          </span>
          <span v-else>{{ truncatedBubbleText }}</span>
        </div>
      </div>
    </transition>

    <!-- 思考气泡 -->
    <transition name="bubble">
      <div v-if="isThinking" class="bubble">
        <div class="bubble-content thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { analyzeEmotion } from '../../utils/emojis.js'
import { emitParticles, injectParticleStyles } from '../../utils/particles.js'

const props = defineProps({
  character: { type: Object, required: true },
  isSpeaking: { type: Boolean, default: false },
  isThinking: { type: Boolean, default: false },
  isStreaming: { type: Boolean, default: false },
  isUser: { type: Boolean, default: false },
  speakingText: { type: String, default: '' }
})

defineEmits(['click'])

const seatRef = ref(null)

const shouldShowBubble = computed(() => {
  return props.isSpeaking && props.speakingText && props.speakingText !== '思考中...'
})

const truncatedBubbleText = computed(() => {
  const text = props.speakingText || ''
  return text.length > 60 ? text.slice(0, 60) + '...' : text
})

// 情绪粒子效果
injectParticleStyles()

let lastEmotion = ''
let particleTimer = null

import { watch } from 'vue'

watch(() => props.speakingText, (newText) => {
  if (!newText || !props.isSpeaking) return
  const emotion = analyzeEmotion(newText)
  if (emotion !== lastEmotion && emotion !== 'default') {
    lastEmotion = emotion
    clearTimeout(particleTimer)
    particleTimer = setTimeout(() => {
      emitParticles(seatRef.value, emotion, 5)
    }, 200)
  }
})

function truncate(text, len) {
  return text?.length > len ? text.slice(0, len) + '...' : text
}
</script>

<style scoped>
.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.3s ease;
  position: relative;
}

.seat:hover { transform: scale(1.06); }
.seat.is-speaking { animation: bounce 0.5s ease-in-out; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 待机呼吸动画 */
.avatar-wrap {
  position: relative;
  width: 52px;
  height: 52px;
  animation: idleBreathe 3s ease-in-out infinite;
}

.seat.is-speaking .avatar-wrap,
.seat.is-thinking .avatar-wrap {
  animation: none;
}

@keyframes idleBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.03); }
}

.avatar-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 2px;
  background: rgba(218, 119, 86, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.is-speaking .avatar-ring {
  background: linear-gradient(135deg, #da7756, #e8a87c);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(218, 119, 86, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(218, 119, 86, 0); }
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-text {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #da7756, #e8a87c);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.avatar-text.user {
  background: linear-gradient(135deg, #8b7355, #b8a088);
  font-size: 20px;
}

.thinking {
  position: absolute;
  top: -12px;
  right: -8px;
  display: flex;
  gap: 2px;
  animation: float 1s infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.thinking span {
  width: 4px;
  height: 4px;
  background: #da7756;
  border-radius: 50%;
  animation: dot 1.2s infinite;
}

.thinking span:nth-child(2) { animation-delay: 0.2s; }
.thinking span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.speaking-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #da7756;
  animation: ring 1.5s infinite;
}

@keyframes ring {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.5; }
}

.name {
  background: rgba(26, 24, 23, 0.7);
  color: #ede8e3;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.name.user {
  background: linear-gradient(135deg, #8b7355, #b8a088);
}

.bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  min-width: 100px;
  max-width: 200px;
}

.bubble-enter-active { animation: bubbleIn 0.3s ease-out; }
.bubble-leave-active { animation: bubbleIn 0.2s ease-in reverse; }

@keyframes bubbleIn {
  from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

.bubble-content {
  background: var(--surface, #252220);
  color: var(--text, #ede8e3);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  word-break: break-word;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.bubble-content::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--surface, #252220);
}

/* 打字机光标 */
.cursor {
  animation: blink 0.6s infinite;
  color: var(--accent, #da7756);
  font-weight: 300;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.thinking-dots {
  padding: 8px 16px;
  display: flex;
  gap: 4px;
  justify-content: center;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: #da7756;
  border-radius: 50%;
  animation: dot 1.2s infinite;
}
</style>
