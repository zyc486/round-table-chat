<template>
  <div class="round-table-wrapper">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="floating-emoji" v-for="i in 6" :key="i" :style="getFloatingStyle(i)">
        {{ ['✨', '💬', '🎭', '💭', '☕', '🍵'][i-1] }}
      </div>
    </div>

    <!-- 圆桌 -->
    <div class="table">
      <div class="table-surface" :style="{ background: tableGradient }">
        <div class="table-pattern"></div>
        <div class="table-center">
          <span class="table-emoji">☕</span>
          <span class="table-text">圆桌聊天</span>
        </div>
      </div>
      <div class="table-shadow"></div>
    </div>

    <!-- 用户座位 -->
    <div class="seat user-seat">
      <CharacterSeat
        :character="userCharacter"
        :is-speaking="false"
        :is-user="true"
      />
    </div>

    <!-- 角色座位 -->
    <div
      v-for="(char, index) in characters"
      :key="char.id"
      class="seat"
      :style="getSeatStyle(index, characters.length)"
      :class="{ 'is-active': speakingId === char.id || thinkingId === char.id }"
    >
      <CharacterSeat
        :character="char"
        :is-speaking="speakingId === char.id"
        :is-thinking="thinkingId === char.id"
        :speaking-text="speakingId === char.id ? speakingText : ''"
        @click="$emit('click-character', char)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CharacterSeat from './CharacterSeat.vue'

const props = defineProps({
  characters: {
    type: Array,
    default: () => []
  },
  speakingId: {
    type: String,
    default: null
  },
  thinkingId: {
    type: String,
    default: null
  },
  speakingText: {
    type: String,
    default: ''
  },
  theme: {
    type: Object,
    default: () => ({ tableColor: '#8B7355' })
  }
})

const emit = defineEmits(['click-character'])

const userCharacter = computed(() => ({
  id: 'user',
  name: '我',
  avatar: null
}))

const tableGradient = computed(() => {
  const color = props.theme.tableColor || '#8B7355'
  return `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, 20)} 50%, ${color} 100%)`
})

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + percent)
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent)
  const b = Math.min(255, (num & 0x0000FF) + percent)
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

function getSeatStyle(index, total) {
  if (total === 0) return {}

  if (total === 1) {
    const angle = -90
    const radius = 38
    const rad = (angle * Math.PI) / 180
    const x = 50 + radius * Math.cos(rad)
    const y = 50 + radius * Math.sin(rad)
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)'
    }
  }

  const startAngle = -120
  const angleStep = 240 / total
  const angle = startAngle + angleStep * index

  const radius = 38
  const rad = (angle * Math.PI) / 180
  const x = 50 + radius * Math.cos(rad)
  const y = 50 + radius * Math.sin(rad)

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  }
}

function getFloatingStyle(index) {
  const positions = [
    { left: '10%', top: '20%' },
    { right: '10%', top: '15%' },
    { left: '5%', bottom: '30%' },
    { right: '5%', bottom: '25%' },
    { left: '15%', top: '50%' },
    { right: '15%', top: '45%' }
  ]
  return {
    ...positions[index - 1],
    animationDelay: `${index * 0.5}s`
  }
}
</script>

<style scoped>
.round-table-wrapper {
  position: relative;
  width: 100%;
  max-width: 440px;
  aspect-ratio: 1;
  margin: 0 auto;
}

.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floating-emoji {
  position: absolute;
  font-size: 18px;
  opacity: 0.15;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(8deg); }
}

.table {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 42%;
  height: 42%;
}

.table-surface {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: background 0.5s ease;
}

.table-pattern {
  position: absolute;
  inset: 12%;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.table-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 1;
}

.table-emoji {
  font-size: 20px;
  opacity: 0.6;
}

.table-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.table-shadow {
  position: absolute;
  bottom: -6px;
  left: 12%;
  right: 12%;
  height: 12px;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.15) 0%, transparent 70%);
}

.seat {
  position: absolute;
  z-index: 10;
  transition: transform 0.3s ease, z-index 0s;
}

.seat.is-active {
  z-index: 20;
}

.user-seat {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}
</style>
