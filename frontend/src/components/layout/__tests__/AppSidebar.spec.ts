import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppSidebar.vue')
const componentSource = readFileSync(componentPath, 'utf8')
const headerPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppHeader.vue')
const headerSource = readFileSync(headerPath, 'utf8')
const stylePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../style.css')
const styleSource = readFileSync(stylePath, 'utf8')
const adminNavSource = componentSource.slice(
  componentSource.indexOf('const adminNavItems = computed'),
  componentSource.indexOf('function toggleSidebar')
)
const selfNavSource = componentSource.slice(
  componentSource.indexOf('function buildSelfNavItems'),
  componentSource.indexOf('function finalizeNav')
)

describe('AppSidebar model plaza navigation', () => {
  it('places model plaza first in the personal menu and uses the grid icon', () => {
    const modelPlazaIndex = selfNavSource.indexOf("path: '/model-plaza'")
    const keysIndex = selfNavSource.indexOf("path: '/keys'")

    expect(modelPlazaIndex).toBeGreaterThan(-1)
    expect(keysIndex).toBeGreaterThan(modelPlazaIndex)
    expect(selfNavSource).toContain('icon: ModelPlazaIcon')
    expect(selfNavSource).toContain('featureFlag: flagModelPlaza')
  })

  it('does not keep a duplicate model plaza entry in the header', () => {
    expect(headerSource).not.toContain('Model Plaza Entry')
    expect(headerSource).not.toContain('modelPlazaEnabled')
  })
})

describe('AppSidebar channel status navigation', () => {
  it('uses the dedicated user-facing flag while keeping the admin monitor flag separate', () => {
    expect(componentSource).toContain('const flagChannelStatus = makeSidebarFlag(FeatureFlags.channelStatus)')
    expect(selfNavSource).toMatch(/path: '\/monitor'[^\n]+featureFlag: flagChannelStatus/)
    expect(componentSource).toContain('const flagChannelMonitor = makeSidebarFlag(FeatureFlags.channelMonitor)')
  })
})

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
