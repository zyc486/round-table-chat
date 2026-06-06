/**
 * Markdown 渲染工具
 * 使用 markdown-it + highlight.js
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs-code"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch {}
    }
    return `<pre class="hljs-code"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

/**
 * 渲染 Markdown 文本为 HTML
 */
export function renderMarkdown(text) {
  if (!text) return ''
  return md.render(text)
}

export default md
