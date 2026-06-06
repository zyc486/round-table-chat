import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/storage.js'

export const useCharacterStore = defineStore('character', () => {
  // 状态
  const characters = ref([])
  const loading = ref(false)

  // 计算属性
  const characterCount = computed(() => characters.value.length)

  // 初始化 - 从存储加载
  async function init() {
    loading.value = true
    try {
      characters.value = await api.getCharacters()
    } catch (error) {
      console.error('加载角色失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 保存到存储
  async function save() {
    await api.saveCharacters(characters.value)
  }

  // 添加角色
  async function addCharacter(character) {
    const newCharacter = {
      id: `char_${Date.now()}`,
      ...character,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    characters.value.push(newCharacter)
    await save()
    return newCharacter
  }

  // 更新角色
  async function updateCharacter(id, updates) {
    const index = characters.value.findIndex(c => c.id === id)
    if (index !== -1) {
      characters.value[index] = {
        ...characters.value[index],
        ...updates,
        updatedAt: Date.now()
      }
      await save()
      return characters.value[index]
    }
    return null
  }

  // 删除角色
  async function deleteCharacter(id) {
    characters.value = characters.value.filter(c => c.id !== id)
    await save()
  }

  // 根据 ID 获取角色
  function getCharacterById(id) {
    return characters.value.find(c => c.id === id) || null
  }

  return {
    characters,
    loading,
    characterCount,
    init,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacterById
  }
})
