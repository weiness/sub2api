import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppSidebar.vue')
const componentSource = readFileSync(componentPath, 'utf8')
const stylePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../style.css')
const styleSource = readFileSync(stylePath, 'utf8')
const adminNavSource = componentSource.slice(
  componentSource.indexOf('const adminNavItems = computed'),
  componentSource.indexOf('function toggleSidebar')
)

describe('AppSidebar custom SVG styles', () => {
  it('does not override uploaded SVG fill or stroke colors', () => {
    expect(componentSource).toContain('.sidebar-svg-icon {')
    expect(componentSource).toContain('color: currentColor;')
    expect(componentSource).toContain('display: block;')
    expect(componentSource).not.toContain('stroke: currentColor;')
    expect(componentSource).not.toContain('fill: none;')
  })
})

describe('AppSidebar scroll position persistence', () => {
  it('binds a template ref to the sidebar nav element', () => {
    expect(componentSource).toContain('ref="sidebarNavRef"')
    expect(componentSource).toContain('sidebar-nav')
  })

  it('declares sidebarNavRef in script setup', () => {
    expect(componentSource).toContain("const sidebarNavRef = ref<HTMLElement | null>(null)")
  })

  it('saves scroll position on beforeUnmount', () => {
    expect(componentSource).toContain('onBeforeUnmount')
    expect(componentSource).toContain('appStore.sidebarScrollTop')
    expect(componentSource).toContain('sidebarNavRef.value.scrollTop')
  })

  it('restores scroll position on mount', () => {
    expect(componentSource).toContain('onMounted')
    expect(componentSource).toContain('appStore.sidebarScrollTop')
    expect(componentSource).toContain('nextTick')
  })
})

describe('AppSidebar header styles', () => {
  it('routes both the logo and brand name to the home page', () => {
    expect(componentSource.match(/to="\/home"/g)).toHaveLength(2)
  })

  it('does not clip the version badge dropdown', () => {
    const sidebarHeaderBlockMatch = styleSource.match(/\.sidebar-header\s*\{[\s\S]*?\n {2}\}/)
    const sidebarBrandBlockMatch = componentSource.match(/\.sidebar-brand\s*\{[\s\S]*?\n\}/)

    expect(sidebarHeaderBlockMatch).not.toBeNull()
    expect(sidebarBrandBlockMatch).not.toBeNull()
    expect(sidebarHeaderBlockMatch?.[0]).not.toContain('@apply overflow-hidden;')
    expect(sidebarBrandBlockMatch?.[0]).not.toContain('overflow: hidden;')
  })
})

describe('AppSidebar operations management navigation', () => {
  it('groups announcements, FAQs, redeem codes, and promo codes under one parent', () => {
    const groupStart = adminNavSource.indexOf("path: '/admin/operations'")
    const groupEnd = adminNavSource.indexOf("path: '/admin/security-audit'", groupStart)
    const groupSource = adminNavSource.slice(groupStart, groupEnd)

    expect(groupStart).toBeGreaterThan(-1)
    expect(groupEnd).toBeGreaterThan(groupStart)
    expect(groupSource).toContain("label: t('nav.operationsManagement')")
    expect(groupSource).toContain('icon: OperationsIcon')
    expect(groupSource).toContain("label: t('nav.announcements'), icon: AnnouncementIcon")
    expect(groupSource).toContain('expandOnly: true')
    expect(groupSource).toMatch(
      /\/admin\/announcements[\s\S]*\/admin\/faqs[\s\S]*\/admin\/redeem[\s\S]*\/admin\/promo-codes/
    )
  })

  it('keeps code management entries hidden in simple mode', () => {
    const groupStart = adminNavSource.indexOf("path: '/admin/operations'")
    const groupEnd = adminNavSource.indexOf("path: '/admin/security-audit'", groupStart)
    const groupSource = adminNavSource.slice(groupStart, groupEnd)

    expect(groupSource).toMatch(/\/admin\/redeem[^\n]+hideInSimpleMode: true/)
    expect(groupSource).toMatch(/\/admin\/promo-codes[^\n]+hideInSimpleMode: true/)
    expect(componentSource).toContain('children: filterSimpleMode(item.children)')
  })

  it('places operations management directly below proxy management', () => {
    const proxyIndex = adminNavSource.indexOf("path: '/admin/proxies'")
    const operationsIndex = adminNavSource.indexOf("path: '/admin/operations'")

    expect(proxyIndex).toBeGreaterThan(-1)
    expect(operationsIndex).toBeGreaterThan(proxyIndex)
  })
})
