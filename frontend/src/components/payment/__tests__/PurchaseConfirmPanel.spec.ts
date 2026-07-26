import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import PurchaseConfirmPanel from '../PurchaseConfirmPanel.vue'
import type { SubscriptionPlan } from '@/types/payment'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const plan: SubscriptionPlan = {
  id: 7,
  group_id: 3,
  name: 'Starter',
  description: 'Starter plan',
  price: 39,
  original_price: 50,
  validity_days: 30,
  validity_unit: 'day',
  rate_multiplier: 1,
  daily_limit_usd: 10,
  weekly_limit_usd: 50,
  monthly_limit_usd: 100,
  features: [],
  group_platform: 'openai',
  sort_order: 1,
  for_sale: true,
  recommended: false,
  group_name: 'OpenAI',
}

describe('PurchaseConfirmPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds renewal validity to the current subscription expiry', () => {
    const wrapper = mount(PurchaseConfirmPanel, {
      props: {
        orderType: 'subscription',
        accountName: 'admin@local.com',
        baseAmount: 39,
        creditedAmount: 39,
        feeAmount: 0,
        totalAmount: 39,
        currency: 'CNY',
        methods: [],
        selectedMethod: '',
        plan,
        renewalBaseExpiresAt: '2026-02-01T00:00:00Z',
        formatAmount: value => `¥${value.toFixed(2)}`,
      },
      global: { stubs: { Icon: true, PaymentMethodSelector: true } },
    })

    expect(wrapper.find('[data-test="subscription-info"]').text()).toMatch(/03.*03.*2026|2026.*03.*03/)
  })
})
