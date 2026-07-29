import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../ModelPlazaContent.vue')
const source = readFileSync(componentPath, 'utf8')

describe('ModelPlazaContent group price comparison', () => {
  it('renders group prices as one comparison table', () => {
    expect(source).toContain('class="group-price-grid')
    expect(source).toContain("comparisonPrice(route.pricing, 'input_price')")
    expect(source).toContain("comparisonPrice(route.pricing, 'output_price')")
    expect(source).toContain("comparisonPrice(route.pricing, 'cache_write_price')")
    expect(source).toContain("comparisonPrice(route.pricing, 'cache_read_price')")
    expect(source).not.toContain('class="mt-4 space-y-3"')
  })

  it('shows the effective group multiplier beside the group name', () => {
    expect(source).toContain('class="rate-badge"')
    expect(source).toContain('group.user_rate_multiplier ?? group.rate_multiplier')
  })

  it('only shows image group pricing for image-capable models', () => {
    expect(source).toContain("model.outputModalities.includes('image')")
    expect(source).toContain('route.pricing?.billing_mode === BILLING_MODE_IMAGE')
    expect(source).toContain('if (!imageCapable) return []')
  })

  it('keeps model cards compact', () => {
    expect(source).toContain('class="model-card group relative overflow-hidden rounded-lg border')
    expect(source).toContain('class="pointer-events-none relative z-10 mt-4')
    expect(source).not.toContain('class="group flex h-44')
  })

  it('adds restrained platform and pricing accents', () => {
    expect(source).toContain('platformTone(model.platform)')
    expect(source).toContain('class="platform-icon-shell"')
    expect(source).toContain('bg-emerald-50/70')
    expect(source).toContain('.info-cell:nth-child(4)')
  })

  it('replaces anonymous group rows with a login prompt', () => {
    expect(source).toContain("props.response?.authenticated === true")
    expect(source).toContain('v-if="groupPricingVisible"')
    expect(source).toContain("t('modelPlaza.loginForGroupRates')")
    expect(source).toContain("redirect: '/model-plaza'")
  })
})
