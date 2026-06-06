import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, putCharacter, deleteCharacterById } from '../utils/db.js'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref([])
  const loading = ref(false)

  const characterCount = computed(() => characters.value.length)

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

  async function addCharacter(character) {
    const newCharacter = {
      id: `char_${Date.now()}`,
      ...character,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    characters.value.push(newCharacter)
    await putCharacter(newCharacter)
    return newCharacter
  }

  async function updateCharacter(id, updates) {
    const index = characters.value.findIndex(c => c.id === id)
    if (index !== -1) {
      characters.value[index] = {
        ...characters.value[index],
        ...updates,
        updatedAt: Date.now()
      }
      await putCharacter(characters.value[index])
      return characters.value[index]
    }
    return null
  }

  async function deleteCharacter(id) {
    characters.value = characters.value.filter(c => c.id !== id)
    await deleteCharacterById(id)
  }

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
