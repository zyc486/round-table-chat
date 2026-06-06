/**
 * Prompt 模板工具
 */

/**
 * 构建角色系统 Prompt
 * @param {Object} character - 角色信息
 * @param {Array} allCharacters - 所有角色列表
 * @returns {string}
 */
export function buildCharacterPrompt(character, allCharacters = []) {
  const otherCharacters = allCharacters.filter(c => c.id !== character.id)

  let prompt = `你正在参加一个圆桌聊天，你现在扮演的角色是【${character.name}】。

## 角色设定
- 名字: ${character.name}
- 简介: ${character.description || '无'}
- 性格: ${character.personality || '无'}
- 说话风格: ${character.speakingStyle || '无'}

## 聊天规则
1. 严格按角色设定回复，保持角色一致性
2. 回复简洁自然，像真实聊天
3. 可以使用角色的口头禅或标志性台词
4. 适当回应其他人说的话，保持对话连贯性`

  if (otherCharacters.length > 0) {
    prompt += `\n\n## 聊天室成员
- 用户 (我): 发起对话的人
${otherCharacters.map(c => `- ${c.name}: ${c.description || '无'}`).join('\n')}`
  }

  return prompt
}

/**
 * 构建自由模式的主持人 Prompt
 * @param {string} userMessage - 用户消息
 * @param {Array} characters - 角色列表
 * @returns {string}
 */
export function buildModeratorPrompt(userMessage, characters) {
  return `你是一个聊天室主持人。用户说了一句话，你需要判断哪些角色会想回复。

用户说: "${userMessage}"

可选角色:
${characters.map(c => `- ${c.id}: ${c.name} (${c.description})`).join('\n')}

请返回一个 JSON 数组，包含会想回复的角色 ID，例如: ["char_001", "char_002"]
只返回 1-3 个最可能回复的角色。
只返回 JSON，不要其他内容。`
}

/**
 * 格式化聊天历史为消息数组
 * @param {Array} messages - 消息列表
 * @param {Function} getCharacter - 获取角色信息的函数
 * @returns {Array}
 */
export function formatChatHistory(messages, getCharacter) {
  return messages.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.isUser
      ? msg.content
      : `${getCharacter(msg.characterId)?.name || '未知'}: ${msg.content}`
  }))
}
