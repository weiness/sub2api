import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import AmountInput from '../AmountInput.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'payment.currentRechargeRate') {
        return `Current rate: 1 ${params?.currency} = $${params?.usd} credit`
      }
      return key
    },
  }),
}))

describe('AmountInput', () => {
  it('keeps a matching custom amount in the custom field', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: null,
        amounts: [10, 20, 50],
        currency: 'CNY',
        rechargeMultiplier: 10,
      },
    })

    expect(wrapper.text()).toContain('Current rate: 1 CNY = $10 credit')
    expect(wrapper.text()).toContain('¥10')

    const input = wrapper.get('input')
    await input.setValue('20')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([20])

    await wrapper.setProps({ modelValue: 20 })
    const matchingButton = wrapper.findAll('button').find(button => button.text().includes('¥20'))
    expect(matchingButton?.find('[data-testid="amount-selected-indicator"]').exists()).toBe(false)
    expect(wrapper.get('input').element.value).toBe('20')
    expect(wrapper.findAll('[data-testid="amount-selected-indicator"]')).toHaveLength(0)
  })

  it('clears the custom field when a preset amount is selected', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: 37,
        amounts: [10, 20, 50],
        currency: 'CNY',
      },
    })

    expect(wrapper.get('input').element.value).toBe('37')

    const preset = wrapper.findAll('button').find(button => button.text().includes('¥20'))
    await preset?.trigger('click')
    await wrapper.setProps({ modelValue: 20 })

    expect(wrapper.get('input').element.value).toBe('')
  })

  it('clears the preset selection as soon as the custom area is clicked', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: 10,
        amounts: [10, 20, 50],
        currency: 'CNY',
      },
    })

    expect(wrapper.findAll('[data-testid="amount-selected-indicator"]')).toHaveLength(1)

    await wrapper.findAll('label').at(-1)?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    expect(wrapper.findAll('[data-testid="amount-selected-indicator"]')).toHaveLength(0)
  })

  it('keeps the minimum warning inside the custom amount card', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: null,
        amounts: [10, 20, 50],
        min: 10,
        currency: 'CNY',
      },
    })

    expect(wrapper.get('input').attributes('placeholder')).toBe('payment.enterAmount')
    expect(wrapper.text()).toContain('payment.minimumRecharge')
    await wrapper.get('input').setValue('1')

    expect(wrapper.text()).toContain('payment.belowMinimum')
    expect(wrapper.text()).not.toContain('payment.minimumRecharge')
  })
})
