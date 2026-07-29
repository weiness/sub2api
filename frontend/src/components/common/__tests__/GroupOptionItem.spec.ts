import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import GroupOptionItem from '../GroupOptionItem.vue'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  }
})

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ cachedPublicSettings: null }),
}))

describe('GroupOptionItem description layout', () => {
  it('applies multiline and overflow-safe text styles', () => {
    const description = 'First section\nvery-long-unbroken-description-value-that-must-not-overflow'
    const wrapper = mount(GroupOptionItem, {
      props: {
        name: 'Example group',
        platform: 'openai',
        description,
      },
      global: {
        stubs: {
          GroupBadge: true,
        },
      },
    })

    const descriptionElement = wrapper
      .findAll('span')
      .find((element) => element.text() === description)

    expect(descriptionElement).toBeDefined()
    expect(descriptionElement?.classes()).toContain('whitespace-pre-line')
    expect(descriptionElement?.classes()).toContain('[overflow-wrap:anywhere]')
    expect(descriptionElement?.classes()).toContain('line-clamp-3')
    expect(wrapper.find('[title]').attributes('title')).toBe(description)
  })

  it('hides peak-rate details behind an icon placed before the base rate', async () => {
    const wrapper = mount(GroupOptionItem, {
      props: {
        name: 'Peak group',
        platform: 'openai',
        rateMultiplier: 1,
        peakRateEnabled: true,
        peakStart: '14:00',
        peakEnd: '17:00',
        peakRateMultiplier: 1.5,
        compactPeakRate: true,
      },
      global: {
        stubs: {
          GroupBadge: true,
          Teleport: true,
        },
      },
    })

    const indicator = wrapper.find('[data-test="peak-rate-indicator"]')
    const ratePill = wrapper.findAll('span').find((element) => element.text().includes('1x'))

    expect(indicator.exists()).toBe(true)
    expect(ratePill?.text()).toContain('1x')
    expect(ratePill?.text()).not.toContain('14:00')
    expect(ratePill?.element.contains(indicator.element)).toBe(false)
    expect(indicator.element.compareDocumentPosition(ratePill!.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await indicator.trigger('mouseenter')
    expect(wrapper.find('[role="tooltip"]').text()).toContain('common.peakRateTooltip')
  })
})
