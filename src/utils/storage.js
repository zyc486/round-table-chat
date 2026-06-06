/**
 * localStorage 兼容层
 * 新代码请直接使用 db.js (IndexedDB)
 * 此文件保留旧接口，内部委托给 IndexedDB
 */

export const STORAGE_KEYS = {
  CHARACTERS: 'rtc_characters',
  MESSAGES: 'rtc_messages',
  SETTINGS: 'rtc_settings'
}

// 兼容旧接口
export function getStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error(`读取存储失败: ${key}`, error)
    return defaultValue
  }
}

export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`写入存储失败: ${key}`, error)
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`删除存储失败: ${key}`, error)
  }
}

export function clearAllStorage() {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('清空存储失败:', error)
  }
}

// api 从 IndexedDB 导出
export { api } from './db.js'
