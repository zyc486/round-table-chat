<template>
  <div class="history" :class="theme">
    <header class="nav">
      <div class="nav-inner">
        <button class="back" @click="goBack">← 返回</button>
        <h1>历史记录</h1>
        <div class="actions">
          <button class="btn primary" @click="createNew">新对话</button>
        </div>
      </div>
    </header>

    <main class="list">
      <div v-if="sessionsStore.sessions.length === 0" class="empty">
        <div class="empty-icon">📜</div>
        <p>还没有对话记录</p>
        <button class="btn primary" @click="createNew">开始第一次对话</button>
      </div>

      <div
        v-for="session in sessionsStore.sessions"
        :key="session.id"
        class="session-card"
        :class="{ active: session.id === sessionsStore.currentSessionId }"
        @click="restoreSession(session)"
      >
        <div class="session-header">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-time">{{ formatTime(session.createdAt) }}</div>
        </div>

        <div class="session-preview">{{ session.lastMessage || '暂无消息' }}</div>

        <div class="session-meta">
          <div class="session-characters">
            <template v-if="getSessionCharacters(session).length > 0">
              <span
                v-for="char in getSessionCharacters(session).slice(0, 4)"
                :key="char.id"
                class="char-tag"
              >{{ char.name }}</span>
              <span v-if="getSessionCharacters(session).length > 4" class="char-more">
                +{{ getSessionCharacters(session).length - 4 }}
              </span>
            </template>
            <span v-else class="char-empty">暂无角色参与</span>
          </div>
          <div class="session-count">{{ session.messageCount || 0 }} 条消息</div>
        </div>

        <button class="delete-btn" @click.stop="deleteSession(session)" title="删除">
          🗑️
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionsStore } from '../stores/sessions.js'
import { useChatDataStore } from '../stores/chatData.js'
import { useCharacterStore } from '../stores/character.js'
import { useSettingsStore } from '../stores/settings.js'

const router = useRouter()
const sessionsStore = useSessionsStore()
const chatData = useChatDataStore()
const characterStore = useCharacterStore()
const settingsStore = useSettingsStore()

const theme = computed(() => settingsStore.settings.theme || 'dark')

onMounted(async () => {
  await characterStore.init()
  await sessionsStore.init()
})

function goBack() { router.push('/') }

async function createNew() {
  await sessionsStore.createSession()
  await chatData.init()
  router.push('/')
}

async function restoreSession(session) {
  await sessionsStore.switchSession(session.id)
  await chatData.loadSession(session.id)
  router.push('/')
}

async function deleteSession(session) {
  if (confirm(`确定删除「${session.title}」？`)) {
    await sessionsStore.removeSession(session.id)
    // 如果删的是当前会话，刷新聊天数据
    if (sessionsStore.currentSessionId) {
      await chatData.loadSession(sessionsStore.currentSessionId)
    }
  }
}

function getSessionCharacters(session) {
  if (!session.characterIds || session.characterIds.length === 0) return []
  return session.characterIds
    .map(id => characterStore.getCharacterById(id))
    .filter(Boolean)
}

function formatTime(timestamp) {
  const d = new Date(timestamp)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  if (isToday) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.history.dark {
  --bg: #1a1817; --surface: #252220; --surface-hover: #302b28;
  --text: #ede8e3; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(255,255,255,0.08);
}

.history.light {
  --bg: #faf9f6; --surface: #ffffff; --surface-hover: #f5f0e8;
  --text: #1a1817; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(0,0,0,0.08);
}

.history {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.nav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 700px;
  margin: 0 auto;
  padding: 14px 28px;
}

.nav-inner h1 { font-size: 17px; font-weight: 600; }

.back {
  background: none;
  border: 1px solid var(--border);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.back:hover {
  background: rgba(218, 119, 86, 0.08);
}

.actions { display: flex; gap: 8px; }

.btn {
  background: var(--surface-hover);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.btn:hover { border-color: var(--text-secondary); }
.btn.primary {
  background: linear-gradient(135deg, #da7756, #c4643f);
  color: white;
  border-color: transparent;
}
.btn.primary:hover { background: linear-gradient(135deg, #e08a6a, #da7756); }

.list {
  flex: 1;
  padding: 24px 28px;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.empty-icon { font-size: 40px; opacity: 0.6; }

.session-card {
  position: relative;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-card:hover {
  border-color: rgba(218, 119, 86, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.session-card.active {
  border-color: var(--accent);
  background: rgba(218, 119, 86, 0.04);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.session-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.session-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.session-preview {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-characters {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.char-tag {
  background: var(--surface-hover);
  color: var(--accent);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.char-more {
  font-size: 11px;
  color: var(--text-secondary);
}

.char-empty {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.session-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.delete-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s ease;
  padding: 4px;
  border-radius: 6px;
}

.session-card:hover .delete-btn { opacity: 0.5; }
.delete-btn:hover { opacity: 1 !important; background: rgba(224, 72, 72, 0.1); }

@media (max-width: 768px) {
  .nav-inner { padding: 10px 16px; }
  .list { padding: 16px; }
}
</style>
