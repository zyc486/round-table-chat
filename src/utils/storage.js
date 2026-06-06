/**
 * localStorage 工具函数
 * 预留接口，方便后续切换为后端 API
 */

const STORAGE_KEYS = {
  CHARACTERS: 'rtc_characters',
  MESSAGES: 'rtc_messages',
  SETTINGS: 'rtc_settings'
}

/**
 * 获取存储数据
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export function getStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error(`读取存储失败: ${key}`, error)
    return defaultValue
  }
}

/**
 * 设置存储数据
 * @param {string} key - 存储键名
 * @param {*} value - 存储值
 */
export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`写入存储失败: ${key}`, error)
  }
}

/**
 * 删除存储数据
 * @param {string} key - 存储键名
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`删除存储失败: ${key}`, error)
  }
}

/**
 * 清空所有应用存储
 */
export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeStorage(key)
  })
}

// 导出存储键名常量
export { STORAGE_KEYS }

// ===== 以下为预留的后端 API 接口 =====

/**
 * 后端 API 接口 (预留)
 * 后续添加后端时，只需修改这些函数的实现
 */
export const api = {
  // 角色相关
  async getCharacters() {
    return getStorage(STORAGE_KEYS.CHARACTERS, [])
  },

  async saveCharacters(characters) {
    setStorage(STORAGE_KEYS.CHARACTERS, characters)
  },

  // 消息相关
  async getMessages() {
    return getStorage(STORAGE_KEYS.MESSAGES, [])
  },

  async saveMessages(messages) {
    setStorage(STORAGE_KEYS.MESSAGES, messages)
  },

  // 设置相关
  async getSettings() {
    return getStorage(STORAGE_KEYS.SETTINGS, {
      mode: 'round_robin',
      theme: 'default',
      apiEndpoint: '',
      apiKey: '',
      maxCharacters: 8,
      autoScroll: true
    })
  },

  async saveSettings(settings) {
    setStorage(STORAGE_KEYS.SETTINGS, settings)
  }
}
