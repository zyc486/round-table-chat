<template>
  <div class="characters" :class="theme">
    <header class="nav">
      <div class="nav-inner">
        <button class="back" @click="goBack">← 返回</button>
        <h1>角色管理</h1>
        <div class="actions">
          <button class="btn" @click="showPresets = true">预设</button>
          <button class="btn primary" @click="showAdd = true">新建</button>
        </div>
      </div>
    </header>

    <main class="list">
      <div v-if="characterStore.characters.length === 0" class="empty">
        <div class="empty-icon">🎭</div>
        <p>还没有角色</p>
        <button class="btn primary" @click="showPresets = true">添加预设角色</button>
      </div>

      <div v-for="char in characterStore.characters" :key="char.id" class="card">
        <div class="card-avatar" @click="toggleVoice(char)">
          <img v-if="char.avatar" :src="char.avatar" />
          <div v-else class="avatar-text">{{ char.name?.charAt(0) }}</div>
          <div class="voice-indicator" :class="{ active: char.voice?.enabled }">
            {{ char.voice?.enabled ? '🔊' : '🔇' }}
          </div>
        </div>
        <div class="card-info">
          <h3>{{ char.name }}</h3>
          <p>{{ char.description }}</p>
          <div v-if="char.voice?.enabled" class="voice-info">
            🔊 {{ char.voice.voiceId }} · {{ char.voice.style || '默认风格' }}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn small" @click="editCharacter(char)">编辑</button>
          <button class="btn small danger" @click="deleteCharacter(char)">删除</button>
        </div>
      </div>
    </main>

    <!-- 预设弹窗 -->
    <div v-if="showPresets" class="modal-overlay" @click.self="showPresets = false">
      <div class="modal">
        <div class="modal-header">
          <h3>预设角色</h3>
          <button class="close" @click="showPresets = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-for="preset in presetCharacters" :key="preset.name" class="preset-item">
            <div>
              <strong>{{ preset.name }}</strong>
              <p>{{ preset.description }}</p>
            </div>
            <button class="btn small" :disabled="isAdded(preset.name)" @click="addPreset(preset)">
              {{ isAdded(preset.name) ? '已添加' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editing ? '编辑角色' : '新建角色' }}</h3>
          <button class="close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form">
            <div class="form-item">
              <label>头像</label>
              <div class="avatar-upload" @click="triggerUpload">
                <img v-if="formData.avatar" :src="formData.avatar" />
                <div v-else class="upload-placeholder">📷</div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="handleAvatar" />
            </div>
            <div class="form-item">
              <label>名字 *</label>
              <input v-model="formData.name" placeholder="角色名字" />
            </div>
            <div class="form-item">
              <label>描述</label>
              <input v-model="formData.description" placeholder="一句话描述" />
            </div>
            <div class="form-item">
              <label>性格</label>
              <textarea v-model="formData.personality" placeholder="性格特点" rows="2"></textarea>
            </div>
            <div class="form-item">
              <label>说话风格</label>
              <textarea v-model="formData.speakingStyle" placeholder="说话方式" rows="2"></textarea>
            </div>

            <!-- 语音设置 -->
            <div class="form-section">
              <h4>🔊 语音设置</h4>
              <div class="form-item">
                <label>启用语音</label>
                <label class="switch">
                  <input type="checkbox" v-model="formData.voiceEnabled" />
                  <span class="slider"></span>
                </label>
              </div>
              <template v-if="formData.voiceEnabled">
                <div class="form-item">
                  <label>音色</label>
                  <select v-model="formData.voiceId">
                    <option v-for="v in voicePresets" :key="v.id" :value="v.id">
                      {{ v.name }} ({{ v.gender === 'female' ? '女' : '男' }})
                    </option>
                  </select>
                </div>
                <div class="form-item">
                  <label>语音风格</label>
                  <input v-model="formData.voiceStyle" placeholder="如：活泼热血，语速快" />
                </div>
                <button class="btn small" @click="testVoice">🔊 试听</button>
              </template>
            </div>

            <div class="form-actions">
              <button class="btn" @click="closeModal">取消</button>
              <button class="btn primary" @click="submitForm">{{ editing ? '保存' : '创建' }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/character.js'
import { useSettingsStore } from '../stores/settings.js'
import { presetCharacters } from '../utils/presets.js'
import { VOICE_PRESETS, synthesizeSpeech, stopSpeech } from '../api/tts.js'

const router = useRouter()
const characterStore = useCharacterStore()
const settingsStore = useSettingsStore()

const theme = computed(() => settingsStore.settings.theme || 'dark')
const voicePresets = VOICE_PRESETS

const showPresets = ref(false)
const showAdd = ref(false)
const editing = ref(null)
const fileInput = ref(null)

const formData = reactive({
  name: '',
  description: '',
  personality: '',
  speakingStyle: '',
  avatar: '',
  voiceEnabled: false,
  voiceId: '冰糖',
  voiceStyle: ''
})

onMounted(() => characterStore.init())

function goBack() { router.push('/') }

function editCharacter(char) {
  editing.value = char
  Object.assign(formData, {
    name: char.name,
    description: char.description,
    personality: char.personality,
    speakingStyle: char.speakingStyle,
    avatar: char.avatar,
    voiceEnabled: char.voice?.enabled || false,
    voiceId: char.voice?.voiceId || '冰糖',
    voiceStyle: char.voice?.style || ''
  })
  showAdd.value = true
}

function closeModal() {
  showAdd.value = false
  editing.value = null
  Object.assign(formData, {
    name: '', description: '', personality: '', speakingStyle: '', avatar: '',
    voiceEnabled: false, voiceId: '冰糖', voiceStyle: ''
  })
}

function triggerUpload() { fileInput.value?.click() }

function handleAvatar(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { formData.avatar = ev.target.result }
  reader.readAsDataURL(file)
}

async function submitForm() {
  if (!formData.name.trim()) {
    alert('请输入名字')
    return
  }

  const data = {
    name: formData.name,
    description: formData.description,
    personality: formData.personality,
    speakingStyle: formData.speakingStyle,
    avatar: formData.avatar,
    voice: {
      enabled: formData.voiceEnabled,
      voiceId: formData.voiceId,
      style: formData.voiceStyle
    }
  }

  if (editing.value) {
    await characterStore.updateCharacter(editing.value.id, data)
  } else {
    await characterStore.addCharacter(data)
  }
  closeModal()
}

async function deleteCharacter(char) {
  if (confirm(`确定删除"${char.name}"？`)) {
    await characterStore.deleteCharacter(char.id)
  }
}

function isAdded(name) {
  return characterStore.characters.some(c => c.name === name)
}

async function addPreset(preset) {
  await characterStore.addCharacter({
    ...preset,
    voice: { enabled: false, voiceId: '冰糖', style: '' }
  })
}

async function toggleVoice(char) {
  const enabled = !char.voice?.enabled
  await characterStore.updateCharacter(char.id, {
    voice: {
      ...char.voice,
      enabled
    }
  })
}

async function testVoice() {
  try {
    stopSpeech()
    await synthesizeSpeech(
      `你好，我是${formData.name || '测试'}，很高兴认识你！`,
      formData.voiceId,
      formData.voiceStyle
    )
  } catch (error) {
    alert('语音合成失败: ' + error.message)
  }
}
</script>

<style scoped>
.characters.dark {
  --bg: #1a1817; --surface: #252220; --surface-hover: #302b28;
  --text: #ede8e3; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(255,255,255,0.08);
}

.characters.light {
  --bg: #faf9f6; --surface: #ffffff; --surface-hover: #f5f0e8;
  --text: #1a1817; --text-secondary: #8a837b; --accent: #da7756;
  --border: rgba(0,0,0,0.08);
}

.characters {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
  max-width: 800px;
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
.btn.danger { background: #e04848; color: white; border-color: transparent; }
.btn.danger:hover { background: #c43c3c; }
.btn.small { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.list {
  flex: 1;
  padding: 24px 28px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
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

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.card:hover {
  border-color: rgba(218, 119, 86, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-avatar {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.card-avatar img, .avatar-text {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-text {
  background: linear-gradient(135deg, #da7756, #e8a87c);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.voice-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 12px;
  background: var(--surface);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.card-info { flex: 1; min-width: 0; }
.card-info h3 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.card-info p { font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.voice-info {
  font-size: 11px;
  color: var(--accent);
  margin-top: 4px;
}

.card-actions { display: flex; gap: 8px; }

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 24, 23, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease-out;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 440px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  animation: scaleIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 { font-size: 16px; font-weight: 600; }

.close {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 26px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close:hover {
  background: var(--accent);
  color: white;
  border-color: transparent;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
}

.preset-item strong { font-size: 14px; }
.preset-item p { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

/* 表单 */
.form { display: flex; flex-direction: column; gap: 16px; }

.form-item label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-item input, .form-item textarea, .form-item select {
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

.form-item input:focus, .form-item textarea:focus, .form-item select:focus {
  border-color: #da7756;
}

.form-item textarea { resize: vertical; }
.form-item select { cursor: pointer; }

.avatar-upload {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px dashed var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease;
}

.avatar-upload:hover { border-color: #da7756; }
.avatar-upload img { width: 100%; height: 100%; object-fit: cover; }
.upload-placeholder { font-size: 22px; opacity: 0.5; }

.form-section {
  background: var(--surface-hover);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border);
}

.form-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
