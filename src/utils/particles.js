/**
 * CSS 粒子动效系统
 * 根据情绪类型在头像周围爆发对应粒子
 */

const PARTICLE_EMOJIS = {
  happy: ['🎉', '✨', '🌟', '💫', '🎊', '🌸'],
  angry: ['🔥', '💢', '💥', '⚡', '🌋'],
  surprised: ['❗', '❓', '💥', '⚡', '✨'],
  sad: ['💧', '🌧️', '😢', '🍃'],
  thinking: ['💭', '❓', '💡', '🔍'],
  default: ['✨', '💬', '💭']
}

/**
 * 在指定元素周围创建粒子爆发效果
 * @param {HTMLElement} element - 目标元素
 * @param {string} emotion - 情绪类型
 * @param {number} count - 粒子数量
 */
export function emitParticles(element, emotion = 'default', count = 6) {
  if (!element) return

  const emojis = PARTICLE_EMOJIS[emotion] || PARTICLE_EMOJIS.default
  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div')
    particle.className = 'emotion-particle'
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)]

    // 随机方向和距离
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const distance = 40 + Math.random() * 60
    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * distance

    particle.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY}px;
      font-size: ${14 + Math.random() * 10}px;
      pointer-events: none;
      z-index: 10000;
      animation: particleBurst 0.8s ease-out forwards;
      --tx: ${tx}px;
      --ty: ${ty}px;
    `

    document.body.appendChild(particle)
    setTimeout(() => particle.remove(), 900)
  }
}

// 注入粒子动画 CSS（仅一次）
let styleInjected = false
export function injectParticleStyles() {
  if (styleInjected) return
  styleInjected = true

  const style = document.createElement('style')
  style.textContent = `
    @keyframes particleBurst {
      0% {
        transform: translate(0, 0) scale(1) rotate(0deg);
        opacity: 1;
      }
      60% {
        opacity: 1;
      }
      100% {
        transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(180deg);
        opacity: 0;
      }
    }

    .emotion-particle {
      will-change: transform, opacity;
    }
  `
  document.head.appendChild(style)
}
