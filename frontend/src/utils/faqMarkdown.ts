import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { sanitizeRedirectPath, sanitizeUrl } from '@/utils/url'

function sanitizeFAQLink(rawHref: string): string {
  const href = rawHref.trim()
  if (href.startsWith('/')) return sanitizeRedirectPath(href, '')
  return sanitizeUrl(href)
}

export function renderFAQMarkdown(content: string): string {
  if (!content) return ''

  const rendered = marked.parse(content, { breaks: true, gfm: true }) as string
  const sanitized = DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: ['p', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
  })

  const template = document.createElement('template')
  template.innerHTML = sanitized

  template.content.querySelectorAll('a').forEach((link) => {
    const safeHref = sanitizeFAQLink(link.getAttribute('href') || '')
    if (!safeHref) {
      link.replaceWith(document.createTextNode(link.textContent || ''))
      return
    }

    link.setAttribute('href', safeHref)
    if (!safeHref.startsWith('/')) {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return template.innerHTML
}
