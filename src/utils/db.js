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

db.version(2).stores({
  characters: 'id, name, createdAt',
  messages: 'id, characterId, sessionId, timestamp, [characterId+timestamp]',
  settings: 'key',
  audioCache: 'key, createdAt',
  sessions: 'id, createdAt'
}).upgrade(async (tx) => {
  // 给现有消息补充 sessionId
  const msgs = await tx.table('messages').toArray()
  if (msgs.length > 0) {
    const session = {
      id: 'session_legacy',
      title: '历史对话',
      createdAt: msgs[0].timestamp || Date.now(),
      characterIds: [],
      messageCount: msgs.length,
      lastMessage: msgs[msgs.length - 1]?.content?.slice(0, 50) || ''
    }
    await tx.table('sessions').put(session)
    for (const msg of msgs) {
      msg.sessionId = 'session_legacy'
      await tx.table('messages').put(msg)
    }
  }
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

export async function getMessagesBySession(sessionId) {
  return db.messages.where('sessionId').equals(sessionId).sortBy('timestamp')
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

// ===== 会话 (Sessions) =====
export async function getSessions() {
  return db.sessions.orderBy('createdAt').reverse().toArray()
}

export async function putSession(session) {
  await db.sessions.put(session)
}

export async function deleteSession(id) {
  await db.transaction('rw', db.sessions, db.messages, async () => {
    await db.sessions.delete(id)
    await db.messages.where('sessionId').equals(id).delete()
  })
}

export async function deleteAllSessions() {
  await db.transaction('rw', db.sessions, db.messages, async () => {
    await db.sessions.clear()
    await db.messages.clear()
  })
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
  const count = await db.audioCache.count()
  if (count > 200) {
    const oldest = await db.audioCache.orderBy('createdAt').limit(count - 150).toArray()
    await db.audioCache.bulkDelete(oldest.map(e => e.key))
  }
}

// ===== 兼容层 =====
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
      defaultVoice: s.defaultVoice || '冰糖',
      // AI 配置
      baseUrl: s.baseUrl || '/api/chat/completions',
      model: s.model || 'mimo-v2.5',
      contextLength: s.contextLength || 1048576
    }
  },
  async saveSettings(settings) { return saveSettings(settings) }
}

export default db
