<template>
  <div class="home" :class="currentThemeValue">
    <!-- 顶部导航 -->
    <header class="nav">
      <div class="nav-inner">
        <h1 class="logo">🎭 圆桌聊天</h1>
        <div class="nav-actions">
          <button class="nav-btn" @click="clearChat">清空</button>
          <button class="nav-btn" @click="goToCharacters">角色</button>
          <button class="nav-btn" @click="goToSettings">设置</button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main">
      <!-- 左侧：圆桌 -->
      <div class="scene">
        <RoundTable
          :characters="characterStore.characters"
          :speaking-id="chatStore.speakingCharacterId"
          :thinking-id="chatStore.thinkingCharacterId"
          :speaking-text="speakingText"
          :theme="currentTheme"
          @click-character="handleCharacterClick"
        />
      </div>

      <!-- 右侧：聊天 -->
      <div class="chat">
        <div class="chat-header">
          <span>对话</span>
          <button class="text-btn" @click="clearChat">清空</button>
        </div>
        <MessageList
          :messages="chatStore.messages"
          :characters="characterStore.characters"
          :show-emoji="true"
          @play-voice="handlePlayVoice"
        />
        <ChatBar
          :mode="chatStore.currentMode"
          :characters="characterStore.characters"
          :loading="isProcessing"
          @send="handleSend"
          @mode-change="handleModeChange"
        />
      </div>
    </main>

    <!-- 角色详情弹窗 -->
    <div v-if="showCharacterDetail" class="modal-overlay" @click.self="showCharacterDetail = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ selectedCharacter?.name }}</h3>
          <button class="close-btn" @click="showCharacterDetail = false">✕</button>
        </div>
        <div class="modal-body" v-if="selectedCharacter">
          <div class="detail-avatar">
            <img v-if="selectedCharacter.avatar" :src="selectedCharacter.avatar" />
            <div v-else class="avatar-placeholder">{{ selectedCharacter.name?.charAt(0) }}</div>
          </div>
          <div class="detail-info">
            <p><label>描述</label>{{ selectedCharacter.description }}</p>
            <p><label>性格</label>{{ selectedCharacter.personality }}</p>
            <p><label>说话风格</label>{{ selectedCharacter.speakingStyle }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/character.js'
import { useChatStore } from '../stores/chat.js'
import { useSettingsStore } from '../stores/settings.js'
import { chatWithCharacter, getRespondingCharacters } from '../api/llm.js'
import { playSpeech, stopSpeech } from '../api/tts.js'
import { themes } from '../utils/themes.js'
import RoundTable from '../components/scene/RoundTable.vue'
import MessageList from '../components/chat/MessageList.vue'
import ChatBar from '../components/chat/ChatBar.vue'

const router = useRouter()
const characterStore = useCharacterStore()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const isProcessing = ref(false)
const speakingText = ref('')
const showCharacterDetail = ref(false)
const selectedCharacter = ref(null)

const currentThemeValue = computed(() => settingsStore.settings.theme || 'dark')
const currentTheme = computed(() => themes[currentThemeValue.value] || themes.dark)

onMounted(async () => {
  await characterStore.init()
  await chatStore.init()
  await settingsStore.init()
})

function goToCharacters() { router.push('/characters') }
function goToSettings() { router.push('/settings') }

function clearChat() {
  if (confirm('确定清空所有聊天记录？')) {
    chatStore.clearMessages()
  }
}

function handleCharacterClick(character) {
  selectedCharacter.value = character
  showCharacterDetail.value = true
}

async function handleSend({ text, image, webSearch }) {
  if (isProcessing.value || (!text && !image)) return

  await chatStore.addUserMessage(text || '[图片]', image)

  if (characterStore.characters.length === 0) {
    alert('请先添加角色')
    return
  }

  isProcessing.value = true

  try {
    const mode = chatStore.currentMode
    const userMessage = text || '请描述一下这张图片'

    if (mode === 'round_robin') {
      await handleRoundRobin(userMessage, image, webSearch)
    } else if (mode === 'mention') {
      await handleMention(userMessage, image, webSearch)
    } else if (mode === 'free') {
      await handleFree(userMessage, image, webSearch)
    }
  } catch (error) {
    console.error('AI 回复失败:', error)
    alert('AI 回复失败: ' + error.message)
  } finally {
    isProcessing.value = false
    chatStore.setThinkingCharacter(null)
    chatStore.setSpeakingCharacter(null)
    speakingText.value = ''
  }
}

async function handleRoundRobin(userMessage, image, webSearch) {
  const history = chatStore.getRecentMessages(50)
  for (const char of characterStore.characters) {
    chatStore.setThinkingCharacter(char.id)
    speakingText.value = '思考中...'
    await sleep(500)

    const result = await chatWithCharacter(
      char, history, userMessage, characterStore.characters,
      characterStore.getCharacterById, image, settingsStore.settings.replyLength, webSearch
    )

    chatStore.setThinkingCharacter(null)
    chatStore.setSpeakingCharacter(char.id)
    speakingText.value = result.content

    // 保存消息（包含搜索来源）
    await chatStore.addCharacterMessage(char.id, result.content, result.annotations)

    // 自动播放语音
    await autoPlayVoice(char.id, result.content)

    await sleep(settingsStore.settings.replyDelay || 800)
    chatStore.setSpeakingCharacter(null)
    speakingText.value = ''
  }
}

async function handleMention(userMessage, image, webSearch) {
  const mentionMatch = userMessage.match(/@(\S+)/)
  if (!mentionMatch) {
    alert('请用 @名字 指定角色')
    return
  }

  const targetName = mentionMatch[1]
  const targetChar = characterStore.characters.find(
    c => c.name === targetName || c.name.includes(targetName)
  )

  if (!targetChar) {
    alert(`找不到角色: ${targetName}`)
    return
  }

  chatStore.setThinkingCharacter(targetChar.id)
  speakingText.value = '思考中...'
  await sleep(500)

  const history = chatStore.getRecentMessages(50)
  const result = await chatWithCharacter(
    targetChar, history, userMessage, characterStore.characters,
    characterStore.getCharacterById, image, settingsStore.settings.replyLength, webSearch
  )

  chatStore.setThinkingCharacter(null)
  chatStore.setSpeakingCharacter(targetChar.id)
  speakingText.value = result.content
  await chatStore.addCharacterMessage(targetChar.id, result.content, result.annotations)

  // 自动播放语音
  await autoPlayVoice(targetChar.id, result.content)

  await sleep(settingsStore.settings.replyDelay || 800)
  chatStore.setSpeakingCharacter(null)
  speakingText.value = ''
}

async function handleFree(userMessage, image, webSearch) {
  const history = chatStore.getRecentMessages(50)
  const respondingIds = await getRespondingCharacters(userMessage, characterStore.characters)

  for (const charId of respondingIds) {
    const char = characterStore.getCharacterById(charId)
    if (!char) continue

    chatStore.setThinkingCharacter(char.id)
    speakingText.value = '思考中...'
    await sleep(500)

    const result = await chatWithCharacter(
      char, history, userMessage, characterStore.characters,
      characterStore.getCharacterById, image, settingsStore.settings.replyLength, webSearch
    )

    chatStore.setThinkingCharacter(null)
    chatStore.setSpeakingCharacter(char.id)
    speakingText.value = result.content
    await chatStore.addCharacterMessage(char.id, result.content, result.annotations)

    // 自动播放语音
    await autoPlayVoice(char.id, result.content)

    await sleep(settingsStore.settings.replyDelay || 800)
    chatStore.setSpeakingCharacter(null)
    speakingText.value = ''
  }
}

function handleModeChange(mode) { chatStore.setMode(mode) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

// 播放语音
async function handlePlayVoice(msg) {
  const char = characterStore.getCharacterById(msg.characterId)
  if (!char?.voice?.enabled) {
    alert('该角色未开启语音，请在角色管理中设置')
    return
  }
  try {
    await playSpeech(msg.content, char.voice.voiceId, char.voice.style)
  } catch (error) {
    console.error('语音播放失败:', error)
    alert('语音播放失败: ' + error.message)
  }
}

// 自动播放语音（如果开启了）
async function autoPlayVoice(characterId, text) {
  if (!settingsStore.settings.voiceEnabled) return

  const char = characterStore.getCharacterById(characterId)
  if (!char?.voice?.enabled) return

  try {
    await playSpeech(text, char.voice.voiceId, char.voice.style)
  } catch (error) {
    console.error('自动播放语音失败:', error)
  }
}
</script>

<style scoped>
/* 深色主题 */
.home.dark {
  --bg: #1a1817;
  --surface: #252220;
  --surface-hover: #302b28;
  --text: #ede8e3;
  --text-secondary: #8a837b;
  --accent: #da7756;
  --accent-hover: #e08a6a;
  --border: rgba(255, 255, 255, 0.08);
  --card-bg: #252220;
}

/* 浅色主题 */
.home.light {
  --bg: #faf9f6;
  --surface: #ffffff;
  --surface-hover: #f5f0e8;
  --text: #1a1817;
  --text-secondary: #8a837b;
  --accent: #da7756;
  --accent-hover: #c4643f;
  --border: rgba(0, 0, 0, 0.08);
  --card-bg: #ffffff;
}

.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  transition: background 0.4s ease, color 0.4s ease;
}

/* 导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 28px;
}

.logo {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text);
}

.nav-actions {
  display: flex;
  gap: 6px;
}

.nav-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--text-secondary);
}

/* 主内容 */
.main {
  flex: 1;
  display: flex;
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-height: 0;
}

.scene {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.chat {
  width: 420px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  min-height: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.text-btn:hover {
  background: rgba(218, 119, 86, 0.1);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 24, 23, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 400px;
  max-width: 90vw;
  overflow: hidden;
  animation: scaleIn 0.25s ease-out;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  background: var(--surface-hover);
  border: none;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--accent);
  color: white;
}

.modal-body {
  padding: 22px;
}

.detail-avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
}

.detail-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}

.detail-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #da7756 0%, #e8a87c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 26px;
  font-weight: 600;
}

.detail-info p {
  margin-bottom: 14px;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text);
}

.detail-info label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 响应式 */
@media (max-width: 768px) {
  .main {
    flex-direction: column;
  }

  .scene {
    flex: none;
    height: 40vh;
    padding: 16px;
  }

  .chat {
    width: 100%;
    flex: 1;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}
</style>
