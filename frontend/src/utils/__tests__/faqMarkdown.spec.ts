import { describe, expect, it } from 'vitest'
import { renderFAQMarkdown } from '@/utils/faqMarkdown'

describe('renderFAQMarkdown', () => {
  it('renders external Markdown links with safe new-window attributes', () => {
    const html = renderFAQMarkdown('查看 [帮助文档](https://docs.example.com)')

    expect(html).toContain('href="https://docs.example.com/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('keeps safe internal links in the current window', () => {
    const html = renderFAQMarkdown('查看 [可用渠道](/available-channels)')

    expect(html).toContain('href="/available-channels"')
    expect(html).not.toContain('target=')
  })

  it('downgrades dangerous links to plain text', () => {
    const html = renderFAQMarkdown('[危险链接](javascript:alert(1))')

    expect(html).toContain('危险链接')
    expect(html).not.toContain('<a')
    expect(html).not.toContain('javascript:')
  })

  it('removes raw HTML and unsupported Markdown formatting', () => {
    const html = renderFAQMarkdown('<img src=x onerror=alert(1)> **正常文本** <script>alert(1)</script>')

    expect(html).toContain('正常文本')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<strong')
    expect(html).not.toContain('<script')
  })
})
