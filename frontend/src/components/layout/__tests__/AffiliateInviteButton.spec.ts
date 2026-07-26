import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AffiliateInviteButton from '../AffiliateInviteButton.vue'

const { appStore, authStore, copyToClipboard, getAffiliateDetail } = vi.hoisted(() => ({
  appStore: {
    cachedPublicSettings: { affiliate_enabled: true } as { affiliate_enabled: boolean },
  },
  authStore: {
    user: { id: 1, email: 'inviter@example.com' } as { id: number, email: string } | null,
  },
  copyToClipboard: vi.fn(),
  getAffiliateDetail: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useAppStore: () => appStore,
  useAuthStore: () => authStore,
}))

vi.mock('@/api/user', () => ({
  default: { getAffiliateDetail },
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({ copyToClipboard }),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, string>) => `${key}${params?.rate ? `:${params.rate}` : ''}`,
    }),
  }
})

function mountButton() {
  return mount(AffiliateInviteButton, {
    global: {
      stubs: {
        Icon: true,
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
}

describe('AffiliateInviteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appStore.cachedPublicSettings.affiliate_enabled = true
    authStore.user = { id: 1, email: 'inviter@example.com' }
    copyToClipboard.mockResolvedValue(true)
    getAffiliateDetail.mockResolvedValue({
      user_id: 1,
      aff_code: 'INVITE/CODE',
      aff_count: 0,
      aff_quota: 0,
      aff_frozen_quota: 0,
      aff_history_quota: 0,
      effective_rebate_rate_percent: 7.5,
      invitees: [],
    })
  })

  it('loads and displays the effective configured rebate rate', async () => {
    const wrapper = mountButton()
    await flushPromises()

    expect(getAffiliateDetail).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('affiliate.header.button:7.5%')
    expect(wrapper.text()).toContain('affiliate.header.description:7.5%')
  })

  it('copies the current user invite link from the header button', async () => {
    const wrapper = mountButton()
    await flushPromises()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(copyToClipboard).toHaveBeenCalledWith(
      `${window.location.origin}/register?aff=INVITE%2FCODE`,
      'affiliate.linkCopied',
    )
    expect(wrapper.get('button').classes()).toContain('is-copied')
    expect(wrapper.get('button').text()).toContain('common.copied')
  })

  it('uses the system dark tooltip surface', async () => {
    const wrapper = mountButton()
    await flushPromises()

    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.classes()).toEqual(expect.arrayContaining([
      'bg-gray-900',
      'text-white',
      'shadow-xl',
      'ring-white/10',
    ]))
  })

  it('does not request or display affiliate promotion when disabled', async () => {
    appStore.cachedPublicSettings.affiliate_enabled = false
    const wrapper = mountButton()
    await flushPromises()

    expect(getAffiliateDetail).not.toHaveBeenCalled()
    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
