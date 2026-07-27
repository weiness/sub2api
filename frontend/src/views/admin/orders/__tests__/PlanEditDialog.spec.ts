import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

import PlanEditDialog from '../PlanEditDialog.vue'
import type { AdminGroup } from '@/types'
import type { SubscriptionPlan } from '@/types/payment'
import { adminPaymentAPI } from '@/api/admin/payment'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'payment.admin.subscriptionBillingPreview') return `preview ${params?.paid} ${params?.billing}`
      if (key === 'payment.admin.subscriptionBillingPreviewWithFee') return `fee ${params?.feeRate} ${params?.total}`
      return key
    },
  }),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}))

vi.mock('@/api/admin/payment', () => ({
  adminPaymentAPI: {
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
  },
}))

const BaseDialogStub = defineComponent({
  name: 'BaseDialog',
  props: {
    show: Boolean,
    title: String,
    width: String,
  },
  template: '<div v-if="show"><slot /><slot name="footer" /></div>',
})

const SelectStub = defineComponent({
  name: 'SelectStub',
  props: {
    modelValue: [String, Number],
    options: {
      type: Array,
      default: () => [],
    },
    placeholder: String,
  },
  emits: ['update:modelValue'],
  setup(_props, { emit }) {
    const onChange = (event: Event) => {
      const value = (event.target as HTMLSelectElement).value
      emit('update:modelValue', value === '' ? null : Number(value))
    }
    return { onChange }
  },
  template: `
    <select
      :value="modelValue ?? ''"
      @change="onChange"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :data-platform="option.platform"
      >
        {{ option.label }}
      </option>
    </select>
  `,
})

const groupFixture = (overrides: Partial<AdminGroup>): AdminGroup => ({
  id: 1,
  name: 'OpenAI',
  description: null,
  platform: 'openai',
  rate_multiplier: 1,
  rpm_limit: 0,
  is_exclusive: false,
  status: 'active',
  subscription_type: 'subscription',
  daily_limit_usd: null,
  weekly_limit_usd: null,
  monthly_limit_usd: null,
  allow_image_generation: false,
  image_rate_independent: false,
  image_rate_multiplier: 1,
  image_price_1k: null,
  image_price_2k: null,
  image_price_4k: null,
  peak_rate_enabled: false,
  peak_start: '',
  peak_end: '',
  peak_rate_multiplier: 1,
  claude_code_only: false,
  fallback_group_id: null,
  fallback_group_id_on_invalid_request: null,
  allow_messages_dispatch: false,
  require_oauth_only: false,
  require_privacy_set: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  model_routing: null,
  model_routing_enabled: false,
  mcp_xml_inject: false,
  sort_order: 0,
  ...overrides,
})

function mountDialog({
  groups = [],
  paymentConfig = null,
  plan = null,
}: {
  groups?: AdminGroup[]
  paymentConfig?: Record<string, unknown> | null
  plan?: SubscriptionPlan | null
} = {}) {
  return mount(PlanEditDialog, {
    props: {
      show: true,
      plan,
      groups,
      paymentConfig,
    },
    global: {
      stubs: {
        BaseDialog: BaseDialogStub,
        Select: SelectStub,
        Icon: true,
        GroupBadge: true,
      },
    },
  })
}

describe('PlanEditDialog', () => {
  it('shows the paid CNY amount and stored billing price using the configured multiplier', async () => {
    const wrapper = mountDialog({
      paymentConfig: {
        subscription_cny_to_usd_multiplier: 10,
        recharge_fee_rate: 2,
      },
    })

    await wrapper.find('[data-test="plan-price-input"]').setValue('10')

    expect(wrapper.text()).toContain('preview')
    expect(wrapper.text()).toContain('¥10.00')
    expect(wrapper.text()).toContain('$100.00')
    expect(wrapper.text()).toContain('fee 2')
    expect(wrapper.text()).toContain('¥10.20')
  })

  it('hides the preview when the subscription rate is not configured', async () => {
    const wrapper = mountDialog({
      paymentConfig: {
        subscription_cny_to_usd_multiplier: 0,
        recharge_fee_rate: 2.5,
      },
    })

    await wrapper.find('[data-test="plan-price-input"]').setValue('9.99')

    expect(wrapper.text()).not.toContain('preview')
    expect(wrapper.text()).not.toContain('¥71.43')
  })

  it('converts CNY inputs to billing prices when creating a plan', async () => {
    vi.mocked(adminPaymentAPI.createPlan).mockResolvedValue({} as never)
    const wrapper = mountDialog({
      groups: [groupFixture({})],
      paymentConfig: { subscription_cny_to_usd_multiplier: 10, recharge_fee_rate: 0 },
    })

    await wrapper.find('select').setValue('1')
    await wrapper.find('input[type="text"]').setValue('Pro')
    await wrapper.find('textarea').setValue('Plan')
    await wrapper.find('[data-test="plan-price-input"]').setValue('10')
    await wrapper.find('[data-test="plan-original-price-input"]').setValue('20')
    await wrapper.find('[data-test="plan-base-sold-count-input"]').setValue('4')
    await wrapper.find('form').trigger('submit')

    expect(adminPaymentAPI.createPlan).toHaveBeenCalledWith(expect.objectContaining({ price: 100, original_price: 200, base_sold_count: 4 }))
  })

  it('divides stored prices for editing and does not multiply them twice on save', async () => {
    vi.mocked(adminPaymentAPI.updatePlan).mockResolvedValue({} as never)
    const plan = {
      id: 9, group_id: 1, name: 'Pro', description: 'Plan', price: 100, original_price: 200,
      currency: 'USD', validity_days: 30, validity_unit: 'days', features: [], for_sale: true,
      recommended: false, sort_order: 0, base_sold_count: 12, amount: 0, rate_multiplier: 1, is_active: true,
    } as SubscriptionPlan
    const wrapper = mountDialog({
      plan,
      groups: [groupFixture({})],
      paymentConfig: { subscription_cny_to_usd_multiplier: 10, recharge_fee_rate: 0 },
    })

    expect((wrapper.find('[data-test="plan-price-input"]').element as HTMLInputElement).value).toBe('10')
    expect((wrapper.find('[data-test="plan-original-price-input"]').element as HTMLInputElement).value).toBe('20')
    expect((wrapper.find('[data-test="plan-base-sold-count-input"]').element as HTMLInputElement).value).toBe('12')
    await wrapper.find('form').trigger('submit')

    expect(adminPaymentAPI.updatePlan).toHaveBeenCalledWith(9, expect.objectContaining({ price: 100, original_price: 200, base_sold_count: 12 }))
  })

  it('defaults an empty base sold count to zero', async () => {
    vi.mocked(adminPaymentAPI.createPlan).mockResolvedValue({} as never)
    const wrapper = mountDialog({ groups: [groupFixture({})] })

    await wrapper.find('select').setValue('1')
    await wrapper.find('input[type="text"]').setValue('Pro')
    await wrapper.find('textarea').setValue('Plan')
    await wrapper.find('[data-test="plan-price-input"]').setValue('10')
    await wrapper.find('[data-test="plan-base-sold-count-input"]').setValue('')
    await wrapper.find('form').trigger('submit')

    expect(adminPaymentAPI.createPlan).toHaveBeenCalledWith(expect.objectContaining({ base_sold_count: 0 }))
  })

  it('allows composite subscription groups for payment plans', () => {
    const wrapper = mountDialog({
      groups: [
        groupFixture({
          id: 10,
          name: 'OpenAI + Claude + Gemini + Grok',
          platform: 'composite',
          rate_multiplier: 1.2,
          subscription_type: 'subscription',
        }),
        groupFixture({
          id: 11,
          name: 'Standard OpenAI',
          platform: 'openai',
          subscription_type: 'standard',
        }),
      ],
    })

    const options = wrapper.findAll('option').map(option => option.text())

    expect(options).toContain('OpenAI + Claude + Gemini + Grok — composite (1.2x)')
    expect(options).not.toContain('Standard OpenAI — openai (1x)')
  })
})
