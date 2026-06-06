/**
 * 表情系统
 */

// 角色表情映射
export const characterEmojis = {
  '鸣人': {
    happy: '😄',
    angry: '😠',
    thinking: '🤔',
    surprised: '😲',
    sad: '😢',
    default: '😊'
  },
  '佐助': {
    happy: '😏',
    angry: '😤',
    thinking: '🤔',
    surprised: '😮',
    sad: '😞',
    default: '😑'
  },
  '路飞': {
    happy: '😁',
    angry: '😡',
    thinking: '🤔',
    surprised: '😲',
    sad: '😢',
    default: '😆'
  },
  '柯南': {
    happy: '😊',
    angry: '😠',
    thinking: '🧐',
    surprised: '😮',
    sad: '😞',
    default: '😏'
  },
  '哆啦A梦': {
    happy: '😊',
    angry: '😤',
    thinking: '🤔',
    surprised: '😲',
    sad: '😢',
    default: '😄'
  },
  '初音未来': {
    happy: '😊',
    angry: '😤',
    thinking: '🤔',
    surprised: '😲',
    sad: '😢',
    default: '🥰'
  }
}

// 通用表情
export const defaultEmojis = {
  happy: '😊',
  angry: '😠',
  thinking: '🤔',
  surprised: '😲',
  sad: '😢',
  default: '😐'
}

/**
 * 根据消息内容分析情绪
 * @param {string} content - 消息内容
 * @returns {string} 情绪类型
 */
export function analyzeEmotion(content) {
  const happyWords = ['哈哈', '开心', '太好了', '棒', '喜欢', '爱', '笑', '高兴', '赞']
  const angryWords = ['哼', '可恶', '讨厌', '生气', '烦', '滚', '闭嘴']
  const thinkingWords = ['嗯', '让我想想', '这个', '也许', '可能', '大概']
  const surprisedWords = ['什么', '真的吗', '不会吧', '天啊', '哇', '居然']
  const sadWords = ['唉', '难过', '伤心', '可惜', '遗憾', '对不起']

  if (happyWords.some(w => content.includes(w))) return 'happy'
  if (angryWords.some(w => content.includes(w))) return 'angry'
  if (thinkingWords.some(w => content.includes(w))) return 'thinking'
  if (surprisedWords.some(w => content.includes(w))) return 'surprised'
  if (sadWords.some(w => content.includes(w))) return 'sad'

  return 'default'
}

/**
 * 获取角色表情
 * @param {string} characterName - 角色名字
 * @param {string} content - 消息内容
 * @returns {string} 表情 emoji
 */
export function getCharacterEmoji(characterName, content) {
  const emotion = analyzeEmotion(content)
  const emojis = characterEmojis[characterName] || defaultEmojis
  return emojis[emotion] || emojis.default
}
