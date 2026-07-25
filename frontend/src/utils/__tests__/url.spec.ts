import { describe, expect, it } from 'vitest'
import { sanitizeRedirectPath } from '@/utils/url'

describe('sanitizeRedirectPath', () => {
  it.each([
    ['/purchase#subscription', '/purchase#subscription'],
    ['/dashboard?tab=usage', '/dashboard?tab=usage'],
    ['  /profile  ', '/profile'],
  ])('keeps safe same-origin paths', (input, expected) => {
    expect(sanitizeRedirectPath(input)).toBe(expected)
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    'javascript:alert(1)',
    '/dashboard\nSet-Cookie: bad=1',
  ])('rejects unsafe redirect %s', (input) => {
    expect(sanitizeRedirectPath(input)).toBe('/dashboard')
  })

  it('rejects non-string, repeated, and oversized query values', () => {
    expect(sanitizeRedirectPath(['/purchase', '/admin'])).toBe('/dashboard')
    expect(sanitizeRedirectPath(`/${'a'.repeat(2048)}`)).toBe('/dashboard')
  })

  it('supports an empty fallback when carrying an optional redirect', () => {
    expect(sanitizeRedirectPath('//evil.example/path', '')).toBe('')
    expect(sanitizeRedirectPath(undefined, '')).toBe('')
  })
})
