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
    },
    // 动态代理：用户自定义 API URL 通过此中间件转发
    configure: (server) => {
      server.middlewares.use('/llm-proxy', async (req, res) => {
        const targetUrl = req.headers['x-target-url']
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing X-Target-URL header' }))
          return
        }

        // 收集请求体
        const chunks = []
        for await (const chunk of req) {
          chunks.push(chunk)
        }
        const body = Buffer.concat(chunks)

        try {
          // 构建转发 headers
          const forwardHeaders = {
            'Content-Type': req.headers['content-type'] || 'application/json'
          }
          if (req.headers['authorization']) {
            forwardHeaders['Authorization'] = req.headers['authorization']
          }

          const response = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: body.length > 0 ? body : undefined
          })

          // 透传响应头
          const responseHeaders = {
            'Content-Type': response.headers.get('content-type') || 'application/json'
          }

          res.writeHead(response.status, responseHeaders)

          // 流式转发响应
          const reader = response.body.getReader()
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                res.end()
                break
              }
              res.write(value)
            }
          }
          await pump()
        } catch (error) {
          console.error('代理请求失败:', error.message)
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `Proxy error: ${error.message}` }))
        }
      })
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
