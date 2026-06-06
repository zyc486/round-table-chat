import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'https://token-plan-cn.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1')
      },
      '/xiaomi': {
        target: 'https://api.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xiaomi/, '/v1')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['naive-ui'],
          'vendor-md': ['markdown-it', 'highlight.js'],
          'vendor-db': ['dexie'],
          'vendor-utils': ['@vueuse/core']
        }
      }
    }
  }
})
