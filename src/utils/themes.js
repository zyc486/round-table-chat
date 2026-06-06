/**
 * Claude 风格主题配置
 * 温暖奶油色系 + 橙棕强调色
 */

export const themes = {
  dark: {
    name: '深色',
    bg: '#1a1817',
    surface: '#252220',
    surfaceHover: '#302b28',
    text: '#ede8e3',
    textSecondary: '#8a837b',
    accent: '#da7756',
    accentHover: '#e08a6a',
    border: 'rgba(255, 255, 255, 0.08)',
    cardBg: '#252220',
    tableColor: '#3d3632'
  },
  light: {
    name: '浅色',
    bg: '#faf9f6',
    surface: '#ffffff',
    surfaceHover: '#f5f0e8',
    text: '#1a1817',
    textSecondary: '#8a837b',
    accent: '#da7756',
    accentHover: '#c4643f',
    border: 'rgba(0, 0, 0, 0.08)',
    cardBg: '#ffffff',
    tableColor: '#e8ddd0'
  }
}

export const themeList = Object.entries(themes).map(([key, value]) => ({
  value: key,
  ...value
}))
