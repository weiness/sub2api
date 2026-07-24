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
  it('uses the payment currency and highlights a matching custom amount', async () => {
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
    expect(matchingButton?.classes()).toContain('border-[#0fad76]')
    expect(matchingButton?.find('[data-testid="amount-selected-indicator"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="amount-selected-indicator"]')).toHaveLength(1)
  })
})
