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
      <!-- AI 配置 -->
      <section class="section">
        <h2>🤖 AI 配置</h2>

        <div class="form-item">
          <label>Base URL</label>
          <input
            v-model="settingsStore.settings.baseUrl"
            placeholder="/api/chat/completions"
            @blur="save('baseUrl')"
          />
          <span class="form-hint">API 端点地址，支持 OpenAI 兼容格式</span>
        </div>

        <div class="form-item">
          <label>API Key</label>
          <div class="input-group">
            <input
              v-model="settingsStore.settings.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="输入 API Key"
              @blur="save('apiKey')"
            />
            <button class="icon-btn" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item flex-1">
            <label>模型</label>
            <input
              v-model="settingsStore.settings.model"
              placeholder="mimo-v2.5"
              @blur="save('model')"
            />
          </div>
          <div class="form-item flex-1">
            <label>上下文长度</label>
            <select v-model="settingsStore.settings.contextLength" @change="save('contextLength')">
              <option :value="4096">4K</option>
              <option :value="8192">8K</option>
              <option :value="16384">16K</option>
              <option :value="32768">32K</option>
              <option :value="65536">64K</option>
              <option :value="131072">128K</option>
              <option :value="262144">256K</option>
              <option :value="524288">512K</option>
              <option :value="1048576">1M</option>
              <option :value="2097152">2M</option>
            </select>
          </div>
        </div>

        <div class="test-area">
          <button
            class="btn test-btn"
            :class="{ success: testStatus === 'success', error: testStatus === 'error' }"
            :disabled="testing"
            @click="runTest"
          >
            {{ testing ? '测试中...' : testStatus === 'success' ? '✓ 连接成功' : testStatus === 'error' ? '✕ 连接失败' : '测试连接' }}
          </button>
          <div v-if="testResult" class="test-result" :class="testStatus">
            {{ testResult }}
          </div>
        </div>
      </section>

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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings.js'
import { useCharacterStore } from '../stores/character.js'
import { useChatStore } from '../stores/chat.js'
import { useSessionsStore } from '../stores/sessions.js'
import { themeList } from '../utils/themes.js'
import { VOICE_PRESETS } from '../api/tts.js'
import { testConnection } from '../api/llm.js'
import { clearAllStorage } from '../utils/storage.js'
import { getCharacters, getMessages, getSettings, saveCharacters, saveMessages, saveSettings } from '../utils/db.js'

const router = useRouter()
const settingsStore = useSettingsStore()
const characterStore = useCharacterStore()
const chatStore = useChatStore()
const sessionsStore = useSessionsStore()

const theme = computed(() => settingsStore.settings.theme || 'dark')
const voicePresets = VOICE_PRESETS

const showApiKey = ref(false)
const testing = ref(false)
const testStatus = ref('') // '' | 'success' | 'error'
const testResult = ref('')

onMounted(() => settingsStore.init())

function goBack() { router.push('/') }

async function setTheme(value) {
  await settingsStore.updateSetting('theme', value)
}

async function save(key) {
  await settingsStore.updateSetting(key, settingsStore.settings[key])
}

async function runTest() {
  testing.value = true
  testStatus.value = ''
  testResult.value = ''

  try {
    const result = await testConnection()
    testStatus.value = 'success'
    testResult.value = `模型: ${result.model} | 回复: ${result.content.slice(0, 80)}`
  } catch (error) {
    testStatus.value = 'error'
    testResult.value = error.message.slice(0, 120)
  } finally {
    testing.value = false
  }
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

async function clearAll() {
  if (confirm('确定清空所有数据？')) {
    clearAllStorage()
    await sessionsStore.clearAll()
    await characterStore.init()
    await chatStore.init()
    await settingsStore.init()
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

/* 表单项 */
.form-item {
  margin-bottom: 14px;
}

.form-item label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-item input,
.form-item select {
  width: 100%;
  background: var(--surface-hover);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.form-item input:focus,
.form-item select:focus {
  border-color: var(--accent);
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  opacity: 0.7;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 { flex: 1; }

.input-group {
  display: flex;
  gap: 6px;
}

.input-group input { flex: 1; }

.icon-btn {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  width: 40px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  border-color: var(--accent);
}

/* 测试区域 */
.test-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.test-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.test-btn.success {
  background: #2d8a4e;
  color: white;
  border-color: transparent;
}

.test-btn.error {
  background: #e04848;
  color: white;
  border-color: transparent;
}

.test-result {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-all;
}

.test-result.success {
  background: rgba(45, 138, 78, 0.1);
  color: #2d8a4e;
  border: 1px solid rgba(45, 138, 78, 0.2);
}

.test-result.error {
  background: rgba(224, 72, 72, 0.1);
  color: #e04848;
  border: 1px solid rgba(224, 72, 72, 0.2);
}

/* 主题 */
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

/* 设置行 */
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
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

@media (max-width: 768px) {
  .nav-inner { padding: 10px 16px; }
  .content { padding: 16px; }
  .form-row { flex-direction: column; gap: 0; }
}
</style>
