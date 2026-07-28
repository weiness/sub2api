<template>
  <section class="card border border-gray-100 bg-white/90 p-6 dark:border-dark-700 dark:bg-dark-900/50">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ localText('手机号', 'Phone number') }}
        </h3>
        <p v-if="user?.phone" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ maskedPhone }}
        </p>
      </div>
      <span v-if="user?.phone" class="badge badge-success">
        {{ localText('已绑定', 'Bound') }}
      </span>
    </div>

    <div v-if="!user?.phone" class="mt-5 space-y-4">
      <div class="flex">
        <span class="flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm dark:border-dark-500 dark:bg-dark-700">+86</span>
        <input
          v-model="phone"
          type="tel"
          inputmode="numeric"
          maxlength="11"
          class="input rounded-l-none"
          placeholder="13800138000"
          @input="phone = phone.replace(/\D/g, '').slice(0, 11)"
        />
      </div>

      <TurnstileWidget
        v-if="turnstileEnabled && turnstileSiteKey"
        ref="turnstileRef"
        :site-key="turnstileSiteKey"
        @verify="turnstileToken = $event"
        @expire="turnstileToken = ''"
        @error="turnstileToken = ''"
      />

      <div class="flex gap-3">
        <input
          v-model="code"
          type="text"
          inputmode="numeric"
          maxlength="6"
          class="input min-w-0 flex-1"
          :placeholder="localText('短信验证码', 'SMS code')"
        />
        <button
          type="button"
          class="btn btn-secondary whitespace-nowrap"
          :disabled="sending || countdown > 0 || !validPhone || (turnstileEnabled && !turnstileToken)"
          @click="requestCode"
        >
          {{ countdown > 0 ? `${countdown}s` : localText('获取验证码', 'Send code') }}
        </button>
      </div>

      <button type="button" class="btn btn-primary" :disabled="binding || !validPhone || code.length !== 6" @click="submitBinding">
        {{ binding ? localText('绑定中', 'Binding') : localText('绑定手机号', 'Bind phone') }}
      </button>
    </div>
  </section>

  <GraphicalCaptchaModal
    :open="captchaOpen"
    action="phone_binding"
    :target="phone"
    @close="captchaOpen = false"
    @verified="onCaptchaVerified"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { User } from '@/types'
import { userAPI } from '@/api/user'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import GraphicalCaptchaModal from '@/components/GraphicalCaptchaModal.vue'

const props = defineProps<{
  user: User | null
  botProtectionEnabled: boolean
  botProtectionProvider: 'turnstile' | 'graphical'
  turnstileSiteKey: string
}>()

const { locale } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const phone = ref('')
const code = ref('')
const sending = ref(false)
const binding = ref(false)
const countdown = ref(0)
const turnstileToken = ref('')
const captchaProof = ref('')
const captchaOpen = ref(false)
const turnstileRef = ref<InstanceType<typeof TurnstileWidget> | null>(null)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const validPhone = computed(() => /^1[3-9]\d{9}$/.test(phone.value))
const turnstileEnabled = computed(() => props.botProtectionEnabled && props.botProtectionProvider === 'turnstile')
const graphicalEnabled = computed(() => props.botProtectionEnabled && props.botProtectionProvider === 'graphical')
const maskedPhone = computed(() => {
  const value = props.user?.phone || ''
  return value.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2')
})

function localText(zh: string, en: string): string {
  return String(locale?.value || 'zh').startsWith('zh') ? zh : en
}

function startCountdown(seconds: number): void {
  countdown.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function requestCode(): Promise<void> {
  if (!validPhone.value) return
  if (graphicalEnabled.value && !captchaProof.value) {
    captchaOpen.value = true
    return
  }
  sending.value = true
  try {
    const result = await userAPI.sendPhoneBindingCode({
      phone: `+86${phone.value}`,
      turnstile_token: turnstileEnabled.value ? turnstileToken.value : undefined,
      captcha_proof: graphicalEnabled.value ? captchaProof.value : undefined,
    })
    startCountdown(result.countdown || 60)
    appStore.showSuccess(localText('验证码已发送', 'Verification code sent'))
    captchaProof.value = ''
  } catch (error: any) {
    appStore.showError(error?.response?.data?.message || error?.message || localText('发送失败', 'Failed to send'))
  } finally {
    captchaProof.value = ''
    sending.value = false
    if (turnstileRef.value) {
      turnstileRef.value.reset()
      turnstileToken.value = ''
    }
  }
}

function onCaptchaVerified(proof: string): void {
  captchaProof.value = proof
  captchaOpen.value = false
  void requestCode()
}

async function submitBinding(): Promise<void> {
  binding.value = true
  try {
    await userAPI.bindPhone(`+86${phone.value}`, code.value)
    await authStore.refreshUser()
    appStore.showSuccess(localText('手机号绑定成功', 'Phone number bound'))
  } catch (error: any) {
    appStore.showError(error?.response?.data?.message || error?.message || localText('绑定失败', 'Failed to bind'))
  } finally {
    binding.value = false
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
