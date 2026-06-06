<template>
  <div class="settings" :class="theme">
    <header class="nav">
      <div class="nav-inner">
        <button class="back" @click="goBack">← 返回</button>
        <h1>设置</h1>
        <div></div>
      </div>
    </header>

    <main class="content">
      <!-- 主题 -->
      <section class="section">
        <h2>外观</h2>
        <div class="theme-options">
          <div
            v-for="t in themeList"
            :key="t.value"
            class="theme-card"
            :class="{ active: settingsStore.settings.theme === t.value }"
            @click="setTheme(t.value)"
          >
            <div class="theme-preview" :class="t.value"></div>
            <span>{{ t.name }}</span>
          </div>
        </div>
      </section>

      <!-- 聊天 -->
      <section class="section">
        <h2>聊天</h2>
        <div class="setting-row">
          <div>
            <div class="setting-label">默认模式</div>
            <div class="setting-desc">新对话使用的聊天模式</div>
          </div>
          <select v-model="settingsStore.settings.mode" @change="save('mode')">
            <option value="round_robin">全员轮流</option>
            <option value="mention">@指定</option>
            <option value="free">自由触发</option>
          </select>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">回复延迟</div>
            <div class="setting-desc">角色回复间隔: {{ settingsStore.settings.replyDelay }}ms</div>
          </div>
          <input type="range" v-model="settingsStore.settings.replyDelay" min="200" max="3000" step="100" @change="save('replyDelay')" />
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">回复字数</div>
            <div class="setting-desc">AI 回复最大字数</div>
          </div>
          <select v-model="settingsStore.settings.replyLength" @change="save('replyLength')">
            <option :value="50">简短 (50字)</option>
            <option :value="100">适中 (100字)</option>
            <option :value="200">详细 (200字)</option>
            <option :value="500">超长 (500字)</option>
          </select>
        </div>
      </section>

      <!-- 语音 -->
      <section class="section">
        <h2>🔊 语音</h2>
        <div class="setting-row">
          <div>
            <div class="setting-label">全局语音</div>
            <div class="setting-desc">开启后，启用语音的角色会自动播放回复</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="settingsStore.settings.voiceEnabled" @change="save('voiceEnabled')" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">默认音色</div>
            <div class="setting-desc">新角色的默认音色</div>
          </div>
          <select v-model="settingsStore.settings.defaultVoice" @change="save('defaultVoice')">
            <option v-for="v in voicePresets" :key="v.id" :value="v.id">
              {{ v.name }} ({{ v.gender === 'female' ? '女' : '男' }})
            </option>
          </select>
        </div>
      </section>

      <!-- 数据 -->
      <section class="section">
        <h2>数据</h2>
        <div class="setting-row">
          <div>
            <div class="setting-label">导出数据</div>
            <div class="setting-desc">备份角色和聊天记录</div>
          </div>
          <button class="btn" @click="exportData">导出</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">导入数据</div>
            <div class="setting-desc">从文件恢复</div>
          </div>
          <button class="btn" @click="importData">导入</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">清空数据</div>
            <div class="setting-desc">删除所有角色和记录</div>
          </div>
          <button class="btn danger" @click="clearAll">清空</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings.js'
import { useCharacterStore } from '../stores/character.js'
import { useChatStore } from '../stores/chat.js'
import { themeList } from '../utils/themes.js'
import { VOICE_PRESETS } from '../api/tts.js'
import { clearAllStorage } from '../utils/storage.js'
import { getCharacters, getMessages, getSettings, saveCharacters, saveMessages, saveSettings } from '../utils/db.js'

const router = useRouter()
const settingsStore = useSettingsStore()
const characterStore = useCharacterStore()
const chatStore = useChatStore()

const theme = computed(() => settingsStore.settings.theme || 'dark')
const voicePresets = VOICE_PRESETS

onMounted(() => settingsStore.init())

function goBack() { router.push('/') }

async function setTheme(value) {
  await settingsStore.updateSetting('theme', value)
}

async function save(key) {
  await settingsStore.updateSetting(key, settingsStore.settings[key])
}

async function exportData() {
  const data = {
    version: '2.0.0',
    characters: await getCharacters(),
    messages: await getMessages(),
    settings: await getSettings()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `圆桌聊天_备份.json`
  a.click()
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (data.characters) await saveCharacters(data.characters)
      if (data.messages) await saveMessages(data.messages)
      if (data.settings) await saveSettings(data.settings)
      await characterStore.init()
      await chatStore.init()
      await settingsStore.init()
      alert('导入成功')
    } catch (e) {
      alert('导入失败')
    }
  }
  input.click()
}

function clearAll() {
  if (confirm('确定清空所有数据？')) {
    clearAllStorage()
    characterStore.init()
    chatStore.init()
    settingsStore.init()
  }
}
</script>

<style scoped>
.settings.dark {
  --bg: #1a1817; --surface: #252220; --surface-hover: #302b28;
  --text: #ede8e3; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(255,255,255,0.08);
}

.settings.light {
  --bg: #faf9f6; --surface: #ffffff; --surface-hover: #f5f0e8;
  --text: #1a1817; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(0,0,0,0.08);
}

.settings {
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
  max-width: 600px;
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

.content {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 28px;
}

.section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 14px;
}

.section h2 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.theme-options {
  display: flex;
  gap: 12px;
}

.theme-card {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  border: 2px solid var(--border);
  transition: all 0.2s ease;
}

.theme-card:hover { border-color: var(--text-secondary); }
.theme-card.active { border-color: var(--accent); background: rgba(218, 119, 86, 0.05); }

.theme-preview {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.theme-preview.dark { background: #1a1817; border: 1px solid rgba(255,255,255,0.08); }
.theme-preview.light { background: #faf9f6; border: 1px solid rgba(0,0,0,0.08); }

.theme-card span { font-size: 13px; font-weight: 500; }

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child { border-bottom: none; }

.setting-label { font-size: 14px; font-weight: 500; }
.setting-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.setting-row select, .setting-row input[type="range"] {
  background: var(--surface-hover);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.setting-row select:focus, .setting-row input[type="range"]:focus {
  border-color: var(--accent);
}

.setting-row select { cursor: pointer; }
.setting-row input[type="range"] { width: 120px; accent-color: var(--accent); }

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
.btn.danger { background: #e04848; color: white; border-color: transparent; }
.btn.danger:hover { background: #c43c3c; }

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  transition: 0.3s ease;
}

.slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

input:checked + .slider { background: #da7756; }
input:checked + .slider::before { transform: translateX(20px); }
</style>
