import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterView from '@/views/auth/RegisterView.vue'

const { getPublicSettingsMock } = vi.hoisted(() => ({
  getPublicSettingsMock: vi.fn()
}))

const publicSettings = {
  registration_enabled: true,
  registration_verification_enabled: false,
  registration_verification_type: 'email',
  email_verify_enabled: false,
  promo_code_enabled: false,
  invitation_code_enabled: false,
  affiliate_enabled: true,
  turnstile_enabled: true,
  turnstile_site_key: 'site-key',
  bot_protection_enabled: true,
  bot_protection_provider: 'turnstile',
  graphical_captcha_type: 'slide',
  site_name: 'Sub2API',
  registration_email_suffix_whitelist: [],
  linuxdo_oauth_enabled: false,
  wechat_oauth_enabled: false,
  oidc_oauth_enabled: false,
  github_oauth_enabled: false,
  google_oauth_enabled: false
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} })
}))

vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key
    }
  }),
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en' }
  })
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({ register: vi.fn() }),
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn()
  })
}))

vi.mock('@/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/auth')>('@/api/auth')
  return {
    ...actual,
    getPublicSettings: (...args: unknown[]) => getPublicSettingsMock(...args)
  }
})

function mountRegister() {
  return mount(RegisterView, {
    global: {
      stubs: {
        AuthLayout: { template: '<div><slot /><slot name="footer" /></div>' },
        Icon: true,
        TurnstileWidget: { template: '<div data-testid="turnstile-widget" />' },
        LoginAgreementPrompt: true,
        EmailOAuthButtons: true,
        LinuxDoOAuthSection: true,
        WechatOAuthSection: true,
        OidcOAuthSection: true,
        RouterLink: true,
        transition: false
      }
    }
  })
}

describe('RegisterView invitation layout', () => {
  beforeEach(() => {
    getPublicSettingsMock.mockReset()
    getPublicSettingsMock.mockResolvedValue(publicSettings)
  })

  it('collapses the optional affiliate invitation field until requested', async () => {
    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.find('[data-testid="affiliate-invitation-field"]').exists()).toBe(false)
    await wrapper.get('[data-testid="affiliate-invitation-toggle"]').trigger('click')

    const invitationField = wrapper.get('[data-testid="affiliate-invitation-field"]')
    const turnstile = wrapper.get('[data-testid="registration-turnstile"]')

    expect(invitationField.get('input').attributes('id')).toBe('affiliate_code')
    expect(invitationField.text()).toContain('common.optional')
    expect(
      invitationField.element.compareDocumentPosition(turnstile.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('uses the mandatory invitation field without duplicating the affiliate field', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      invitation_code_enabled: true
    })

    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.find('[data-testid="affiliate-invitation-field"]').exists()).toBe(false)
    expect(wrapper.get('#invitation_code').exists()).toBe(true)
  })

  it('places phone verification after the account password in SMS mode', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      registration_verification_enabled: true,
      registration_verification_type: 'sms',
      turnstile_enabled: false,
      bot_protection_enabled: false
    })

    const wrapper = mountRegister()
    await flushPromises()

    const email = wrapper.get('#email').element
    const password = wrapper.get('#password').element
    const phone = wrapper.get('#phone').element
    const smsCode = wrapper.get('#sms_code').element

    expect(wrapper.get('#phone').attributes('required')).toBeDefined()
    expect(wrapper.get('#sms_code').attributes('required')).toBeDefined()
    expect(email.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(password.compareDocumentPosition(phone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(phone.compareDocumentPosition(smsCode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps phone fields out of the form in email verification mode', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      registration_verification_enabled: true,
      registration_verification_type: 'email'
    })

    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.get('#email').attributes('required')).toBeDefined()
    expect(wrapper.get('#password').attributes('required')).toBeDefined()
    expect(wrapper.find('#phone').exists()).toBe(false)
    expect(wrapper.find('#sms_code').exists()).toBe(false)
  })
})
