import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, saveSetting } from '../utils/db.js'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    mode: 'round_robin',
    theme: 'default',
    apiEndpoint: '',
    apiKey: '',
    maxCharacters: 8,
    autoScroll: true,
    replyDelay: 800,
    replyLength: 100,
    voiceEnabled: false,
    defaultVoice: '冰糖',
    // AI 配置
    baseUrl: '/api/chat/completions',
    model: 'mimo-v2.5',
    contextLength: 1048576,
    // TTS 配置
    ttsBaseUrl: '/api/chat/completions',
    ttsApiKey: ''
  })
  const loading = ref(false)

  async function init() {
    loading.value = true
    try {
      const saved = await api.getSettings()
      if (saved) {
        settings.value = { ...settings.value, ...saved }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function save() {
    await api.saveSettings(settings.value)
  }

  async function updateSetting(key, value) {
    settings.value[key] = value
    await saveSetting(key, value)
  }

  async function updateSettings(updates) {
    settings.value = { ...settings.value, ...updates }
    await api.saveSettings(settings.value)
  }

  return {
    settings,
    loading,
    init,
    updateSetting,
    updateSettings
  }
})
