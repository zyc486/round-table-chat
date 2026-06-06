/**
 * IndexedDB 存储层 (Dexie.js)
 * 替代 localStorage，支持大数据量（头像、音频、聊天记录）
 */
import Dexie from 'dexie'

const db = new Dexie('RoundTableChat')

db.version(1).stores({
  characters: 'id, name, createdAt',
  messages: 'id, characterId, timestamp, [characterId+timestamp]',
  settings: 'key',
  audioCache: 'key, createdAt'
})

// ===== 角色 =====
export async function getCharacters() {
  return db.characters.toArray()
}

export async function saveCharacters(characters) {
  await db.transaction('rw', db.characters, async () => {
    await db.characters.clear()
    await db.characters.bulkPut(characters)
  })
}

export async function putCharacter(character) {
  await db.characters.put(character)
}

export async function deleteCharacterById(id) {
  await db.characters.delete(id)
}

// ===== 消息 =====
export async function getMessages() {
  return db.messages.orderBy('timestamp').toArray()
}

export async function saveMessages(messages) {
  await db.transaction('rw', db.messages, async () => {
    await db.messages.clear()
    await db.messages.bulkPut(messages)
  })
}

export async function putMessage(message) {
  await db.messages.put(message)
}

export async function getRecentMessages(count = 50) {
  return db.messages.orderBy('timestamp').reverse().limit(count).toArray()
    .then(msgs => msgs.reverse())
}

export async function getMessageCount() {
  return db.messages.count()
}

export async function clearMessages() {
  await db.messages.clear()
}

// ===== 设置 =====
export async function getSettings() {
  const all = await db.settings.toArray()
  const result = {}
  all.forEach(item => { result[item.key] = item.value })
  return result
}

export async function saveSetting(key, value) {
  await db.settings.put({ key, value })
}

export async function saveSettings(obj) {
  await db.settings.bulkPut(
    Object.entries(obj).map(([key, value]) => ({ key, value }))
  )
}

// ===== 音频缓存 =====
export async function getAudioCache(key) {
  const entry = await db.audioCache.get(key)
  return entry?.data || null
}

export async function putAudioCache(key, data) {
  await db.audioCache.put({ key, data, createdAt: Date.now() })
  // 限制缓存条数
  const count = await db.audioCache.count()
  if (count > 200) {
    const oldest = await db.audioCache.orderBy('createdAt').limit(count - 150).toArray()
    await db.audioCache.bulkDelete(oldest.map(e => e.key))
  }
}

// ===== 兼容层：api 对象（平滑迁移） =====
export const api = {
  async getCharacters() { return getCharacters() },
  async saveCharacters(chars) { return saveCharacters(chars) },
  async getMessages() { return getMessages() },
  async saveMessages(msgs) { return saveMessages(msgs) },
  async getSettings() {
    const s = await getSettings()
    return {
      mode: s.mode || 'round_robin',
      theme: s.theme || 'default',
      apiEndpoint: s.apiEndpoint || '',
      apiKey: s.apiKey || '',
      maxCharacters: s.maxCharacters || 8,
      autoScroll: s.autoScroll !== undefined ? s.autoScroll : true,
      replyDelay: s.replyDelay || 800,
      replyLength: s.replyLength || 100,
      voiceEnabled: s.voiceEnabled || false,
      defaultVoice: s.defaultVoice || '冰糖'
    }
  },
  async saveSettings(settings) { return saveSettings(settings) }
}

export default db
