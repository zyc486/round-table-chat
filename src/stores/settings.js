import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../utils/storage.js'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
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
    defaultVoice: '冰糖'
  })
  const loading = ref(false)

  // 初始化
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

  // 保存设置
  async function save() {
    await api.saveSettings(settings.value)
  }

  // 更新单个设置
  async function updateSetting(key, value) {
    settings.value[key] = value
    await save()
  }

  // 更新多个设置
  async function updateSettings(updates) {
    settings.value = { ...settings.value, ...updates }
    await save()
  }

  return {
    settings,
    loading,
    init,
    updateSetting,
    updateSettings
  }
})
