<template>
  <div class="chat-bar">
    <div v-if="imagePreview" class="preview">
      <img :src="imagePreview" />
      <button class="remove" @click="removeImage">✕</button>
    </div>

    <div class="input-row">
      <select class="mode-select" v-model="currentMode" @change="handleModeChange">
        <option value="round_robin">全员轮流</option>
        <option value="mention">@指定</option>
        <option value="free">自由触发</option>
      </select>

      <input
        class="input"
        v-model="message"
        :placeholder="placeholder"
        :disabled="loading"
        @keydown.enter="handleSend"
      />

      <label class="upload-btn" title="发送图片">
        🖼️
        <input type="file" accept="image/*" @change="handleFileChange" hidden />
      </label>

      <button
        class="search-btn"
        :class="{ active: webSearch }"
        @click="webSearch = !webSearch"
        title="联网搜索"
      >
        🌐
      </button>

      <button
        class="send-btn"
        :disabled="(!message.trim() && !imageData) || loading"
        @click="handleSend"
      >
        {{ loading ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'round_robin' },
  characters: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'mode-change'])

const message = ref('')
const currentMode = ref(props.mode)
const imageData = ref(null)
const imagePreview = ref(null)
const webSearch = ref(false)

const placeholder = computed(() => {
  if (props.loading) return '等待回复...'
  if (imageData.value) return '添加文字（可选）...'
  if (webSearch.value) return '输入问题，联网搜索...'
  if (currentMode.value === 'mention') return '用 @名字 指定角色...'
  return '输入消息...'
})

watch(() => props.mode, (val) => currentMode.value = val)

function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    imageData.value = ev.target.result
    imagePreview.value = ev.target.result
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  imageData.value = null
  imagePreview.value = null
}

function handleSend() {
  if ((!message.value.trim() && !imageData.value) || props.loading) return
  emit('send', {
    text: message.value.trim(),
    image: imageData.value,
    webSearch: webSearch.value
  })
  message.value = ''
  removeImage()
}

function handleModeChange() {
  emit('mode-change', currentMode.value)
}
</script>

<style scoped>
.chat-bar {
  padding: 14px 18px;
  border-top: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  background: var(--surface, #ffffff);
}

.preview {
  position: relative;
  display: inline-block;
  margin-bottom: 10px;
}

.preview img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
}

.remove {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #da7756;
  color: white;
  border: 2px solid var(--surface, #ffffff);
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mode-select {
  background: var(--surface-hover, #f5f0e8);
  color: var(--text, #1a1817);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.mode-select:focus {
  border-color: #da7756;
}

.mode-select option {
  background: var(--surface, #ffffff);
  color: var(--text, #1a1817);
}

.input {
  flex: 1;
  background: var(--surface-hover, #f5f0e8);
  color: var(--text, #1a1817);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.input:focus {
  border-color: #da7756;
  background: var(--surface, #ffffff);
}

.input::placeholder {
  color: var(--text-secondary, #8a837b);
}

.upload-btn, .search-btn {
  background: var(--surface-hover, #f5f0e8);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn:hover, .search-btn:hover {
  border-color: #da7756;
  background: rgba(218, 119, 86, 0.08);
}

.search-btn.active {
  background: linear-gradient(135deg, #da7756, #c4643f);
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(218, 119, 86, 0.2);
}

.send-btn {
  background: linear-gradient(135deg, #da7756, #c4643f);
  color: white;
  border: none;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e08a6a, #da7756);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(218, 119, 86, 0.3);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
