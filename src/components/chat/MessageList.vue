<template>
  <div class="message-list" ref="listRef">
    <div v-if="messages.length === 0" class="empty">
      <p>👋 欢迎</p>
      <p>发送消息开始聊天</p>
    </div>

    <div
      v-for="msg in visibleMessages"
      :key="msg.id"
      class="msg"
      :class="{ 'is-user': msg.isUser }"
    >
      <div class="avatar">
        <img v-if="getCharacter(msg.characterId)?.avatar" :src="getCharacter(msg.characterId).avatar" />
        <div v-else class="avatar-text" :class="{ user: msg.isUser }">
          {{ msg.isUser ? '我' : getCharacter(msg.characterId)?.name?.charAt(0) || '?' }}
        </div>
      </div>

      <div class="content">
        <div class="name">
          {{ msg.isUser ? '我' : getCharacter(msg.characterId)?.name }}
          <span v-if="showEmoji && !msg.isUser" class="emoji">{{ getEmoji(msg) }}</span>
        </div>

        <div v-if="msg.image" class="image">
          <img :src="msg.image" @click="previewImage(msg.image)" />
        </div>

        <div class="bubble-row">
          <!-- 流式打字机效果的最新消息 -->
          <div
            v-if="isLatestStreamMessage(msg)"
            class="bubble streaming"
            @click="copyMessage(msg.content)"
          >
            <span class="typewriter-text">{{ streamDisplayText }}<span class="cursor">|</span></span>
          </div>
          <!-- 普通消息：支持 Markdown -->
          <div
            v-else-if="msg.content && msg.content !== '[图片]'"
            class="bubble"
            @click="copyMessage(msg.content)"
            v-html="renderContent(msg.content)"
          ></div>

          <button
            v-if="!msg.isUser && msg.content"
            class="voice-btn"
            @click="$emit('play-voice', msg)"
            title="播放语音"
          >
            🔊
          </button>
        </div>

        <!-- 搜索来源 -->
        <div v-if="msg.annotations?.length" class="sources">
          <div class="sources-title">📚 参考来源</div>
          <div v-for="(source, i) in msg.annotations" :key="i" class="source-item">
            <a :href="source.url" target="_blank" rel="noopener">
              {{ source.title || source.url }}
            </a>
            <span v-if="source.site_name" class="source-site">{{ source.site_name }}</span>
          </div>
        </div>

        <div class="time">{{ formatTime(msg.timestamp) }}</div>
      </div>
    </div>

    <div v-if="showPreview" class="preview-overlay" @click.self="showPreview = false">
      <img :src="previewSrc" class="preview-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { getCharacterEmoji } from '../../utils/emojis.js'
import { renderMarkdown } from '../../utils/markdown.js'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  characters: { type: Array, default: () => [] },
  showEmoji: { type: Boolean, default: true },
  streamingMessageId: { type: String, default: null },
  streamDisplayText: { type: String, default: '' }
})

const emit = defineEmits(['play-voice'])

const listRef = ref(null)
const showPreview = ref(false)
const previewSrc = ref('')

// 虚拟滚动：当消息超过 200 条时只渲染最新的 200 条
const VIRTUAL_THRESHOLD = 200
const VIRTUAL_LIMIT = 200

const visibleMessages = computed(() => {
  if (props.messages.length <= VIRTUAL_THRESHOLD) {
    return props.messages
  }
  return props.messages.slice(-VIRTUAL_LIMIT)
})

function isLatestStreamMessage(msg) {
  return props.streamingMessageId && msg.id === props.streamingMessageId
}

function renderContent(content) {
  if (!content) return ''
  // 短文本直接返回（避免不必要的 Markdown 解析开销）
  if (content.length < 50 && !content.includes('```') && !content.includes('`')) {
    return escapeHtml(content)
  }
  return renderMarkdown(content)
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function getCharacter(id) {
  if (!id) return null
  return props.characters.find(c => c.id === id)
}

function getEmoji(msg) {
  const char = getCharacter(msg.characterId)
  return char ? getCharacterEmoji(char.name, msg.content) : '😐'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function previewImage(src) {
  previewSrc.value = src
  showPreview.value = true
}

async function copyMessage(content) {
  try {
    await navigator.clipboard.writeText(content)
    const el = document.createElement('div')
    el.textContent = '已复制'
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0071e3;color:white;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1500)
  } catch {}
}

watch(() => props.messages.length, async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
})

watch(() => props.streamDisplayText, async () => {
  await nextTick()
  if (listRef.value) {
    const isNearBottom = listRef.value.scrollHeight - listRef.value.scrollTop - listRef.value.clientHeight < 100
    if (isNearBottom) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  }
})
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  min-height: 0;
  scroll-behavior: smooth;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #8a837b);
  gap: 6px;
  font-size: 14px;
}

.empty p:first-child {
  font-size: 16px;
  font-weight: 500;
  color: var(--text, #1a1817);
}

.msg {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  animation: msgFadeIn 0.3s ease-out;
}

.msg.is-user { flex-direction: row-reverse; }

@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.avatar img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(218, 119, 86, 0.2);
}

.avatar-text {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #da7756 0%, #e8a87c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.avatar-text.user {
  background: linear-gradient(135deg, #8b7355 0%, #b8a088 100%);
}

.content {
  max-width: 75%;
  min-width: 0;
}

.is-user .content { text-align: right; }

.name {
  font-size: 12px;
  color: var(--text-secondary, #8a837b);
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.is-user .name { justify-content: flex-end; }
.emoji { font-size: 13px; }

.image { margin-bottom: 6px; }

.image img {
  max-width: 180px;
  max-height: 180px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.is-user .bubble-row {
  justify-content: flex-end;
}

.bubble {
  display: inline-block;
  background: var(--surface-hover, #f5f0e8);
  padding: 9px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.55;
  cursor: pointer;
  word-break: break-word;
  transition: opacity 0.2s ease;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
  max-width: 100%;
  overflow-wrap: break-word;
}

.bubble:hover { opacity: 0.85; }

.is-user .bubble {
  background: linear-gradient(135deg, #da7756, #c4643f);
  color: white;
  border-color: transparent;
}

/* 流式消息样式 */
.bubble.streaming {
  border-color: rgba(218, 119, 86, 0.3);
  box-shadow: 0 0 0 1px rgba(218, 119, 86, 0.1);
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

/* Markdown 渲染样式 */
.bubble :deep(h1),
.bubble :deep(h2),
.bubble :deep(h3) {
  margin: 8px 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.bubble :deep(p) {
  margin: 4px 0;
}

.bubble :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.is-user .bubble :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.bubble :deep(pre) {
  margin: 6px 0;
  border-radius: 8px;
  overflow-x: auto;
}

.bubble :deep(pre.hljs-code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px 10px;
}

.is-user .bubble :deep(pre.hljs-code) {
  background: rgba(255, 255, 255, 0.15);
}

.bubble :deep(ul),
.bubble :deep(ol) {
  margin: 4px 0;
  padding-left: 18px;
}

.bubble :deep(blockquote) {
  border-left: 3px solid var(--accent, #da7756);
  margin: 4px 0;
  padding: 2px 8px;
  opacity: 0.85;
}

.bubble :deep(a) {
  color: var(--accent, #da7756);
  text-decoration: underline;
}

.voice-btn {
  background: var(--surface-hover, #f5f0e8);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.voice-btn:hover {
  opacity: 1;
  background: var(--accent, #da7756);
  border-color: transparent;
}

.time {
  font-size: 10px;
  color: var(--text-secondary, #8a837b);
  margin-top: 3px;
}

/* 搜索来源 */
.sources {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(218, 119, 86, 0.06);
  border-radius: 10px;
  border-left: 3px solid #da7756;
}

.sources-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #8a837b);
  margin-bottom: 6px;
}

.source-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.source-item:last-child { margin-bottom: 0; }

.source-item a {
  color: #da7756;
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s ease;
}

.source-item a:hover {
  color: #c4643f;
  text-decoration: underline;
}

.source-site {
  color: var(--text-secondary, #8a837b);
  margin-left: 6px;
  font-size: 11px;
}

/* 图片预览 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 24, 23, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.preview-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
}
</style>
