<template>
  <div v-if="shouldShow" class="group relative hidden sm:block">
    <button
      type="button"
      class="affiliate-invite-button relative isolate flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-900 md:min-w-[132px] md:px-2.5"
      :class="{ 'is-copied': copySucceeded }"
      :aria-label="currentButtonLabel"
      @click="copyInviteLink"
    >
      <Icon :name="copySucceeded ? 'check' : 'gift'" size="sm" class="relative shrink-0" :stroke-width="2" />
      <span class="relative hidden whitespace-nowrap md:inline">{{ currentButtonLabel }}</span>
    </button>

    <div
      class="pointer-events-none invisible absolute right-0 top-full z-50 w-80 pt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
    >
      <div role="tooltip" class="relative rounded-lg bg-gray-900 p-4 text-white shadow-xl ring-1 ring-white/10 dark:bg-gray-800">
        <div class="absolute -top-1.5 right-10 h-3 w-3 rotate-45 bg-gray-900 ring-1 ring-white/10 dark:bg-gray-800"></div>
        <div class="relative flex items-center gap-2 text-sm font-semibold text-white">
          <Icon name="trendingUp" size="sm" class="text-primary-300" :stroke-width="2" />
          <span>{{ t('affiliate.header.title') }}</span>
        </div>
        <p class="relative mt-2 text-sm leading-6 text-gray-300">
          {{ t('affiliate.header.description', { rate: `${formattedRate}%` }) }}
        </p>
        <div class="relative mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <span class="flex items-center gap-1.5 text-sm font-medium text-primary-300">
            <Icon name="copy" size="sm" />
            {{ t('affiliate.header.copyHint') }}
          </span>
          <router-link
            to="/affiliate"
            class="shrink-0 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            {{ t('affiliate.header.viewDetails') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import userAPI from '@/api/user'
import { useClipboard } from '@/composables/useClipboard'
import { useAppStore, useAuthStore } from '@/stores'
import type { UserAffiliateDetail } from '@/types'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const { copyToClipboard } = useClipboard()

const detail = ref<UserAffiliateDetail | null>(null)
const copySucceeded = ref(false)
let loadSequence = 0
let copiedResetTimer: number | undefined

const affiliateEnabled = computed(() => appStore.cachedPublicSettings?.affiliate_enabled === true)
const shouldLoad = computed(() => affiliateEnabled.value && Boolean(authStore.user))
const shouldShow = computed(() => shouldLoad.value && detail.value !== null)
const rebateRate = computed(() => detail.value?.effective_rebate_rate_percent ?? 0)
const formattedRate = computed(() => {
  const rounded = Math.round(rebateRate.value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString()
})
const buttonLabel = computed(() => t('affiliate.header.button', { rate: `${formattedRate.value}%` }))
const currentButtonLabel = computed(() => copySucceeded.value ? t('common.copied') : buttonLabel.value)
const inviteLink = computed(() => {
  if (!detail.value?.aff_code) return ''
  return `${window.location.origin}/register?aff=${encodeURIComponent(detail.value.aff_code)}`
})

async function loadAffiliateDetail(): Promise<void> {
  const sequence = ++loadSequence
  detail.value = null
  if (!shouldLoad.value) return

  try {
    const result = await userAPI.getAffiliateDetail()
    if (sequence === loadSequence && shouldLoad.value) {
      detail.value = result
    }
  } catch {
    // Header promotion is optional; the full affiliate page handles API errors explicitly.
  }
}

async function copyInviteLink(): Promise<void> {
  if (!inviteLink.value) return
  const success = await copyToClipboard(inviteLink.value, t('affiliate.linkCopied'))
  if (!success) return

  copySucceeded.value = true
  if (copiedResetTimer !== undefined) {
    window.clearTimeout(copiedResetTimer)
  }
  copiedResetTimer = window.setTimeout(() => {
    copySucceeded.value = false
  }, 2000)
}

watch(shouldLoad, () => {
  void loadAffiliateDetail()
}, { immediate: true })

onBeforeUnmount(() => {
  if (copiedResetTimer !== undefined) {
    window.clearTimeout(copiedResetTimer)
  }
})
</script>

<style scoped>
.affiliate-invite-button {
  color: #c2410c;
  background: linear-gradient(110deg, rgba(255, 247, 237, 0.84) 0%, rgba(255, 237, 213, 0.58) 100%);
  border-color: rgba(251, 146, 60, 0.48);
  backdrop-filter: blur(8px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 5px 14px -8px rgba(234, 88, 12, 0.38),
    0 0 14px rgba(249, 115, 22, 0.12);
  animation: affiliate-glow 4s ease-in-out infinite;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.affiliate-invite-button:hover {
  background: linear-gradient(110deg, rgba(255, 247, 237, 0.94) 0%, rgba(254, 215, 170, 0.7) 100%);
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.58) inset,
    0 7px 17px -8px rgba(234, 88, 12, 0.46),
    0 0 18px rgba(249, 115, 22, 0.18);
}

.affiliate-invite-button:active {
  transform: translateY(0) scale(0.98);
}

.affiliate-invite-button.is-copied,
.affiliate-invite-button.is-copied:hover {
  color: #059669;
  background: linear-gradient(110deg, rgba(236, 253, 245, 0.94) 0%, rgba(240, 253, 250, 0.82) 100%);
  border-color: rgba(52, 211, 153, 0.52);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.58) inset,
    0 5px 14px -8px rgba(5, 150, 105, 0.4),
    0 0 14px rgba(16, 185, 129, 0.13);
  animation: none;
}

@keyframes affiliate-glow {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
      0 5px 14px -8px rgba(234, 88, 12, 0.32),
      0 0 11px rgba(249, 115, 22, 0.09);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.56) inset,
      0 6px 16px -8px rgba(234, 88, 12, 0.4),
      0 0 16px rgba(249, 115, 22, 0.15);
  }
}

:global(.dark) .affiliate-invite-button {
  color: #fdba74;
  background: linear-gradient(110deg, rgba(154, 52, 18, 0.2) 0%, rgba(180, 83, 9, 0.13) 100%);
  border-color: rgba(251, 146, 60, 0.34);
  box-shadow:
    0 0 0 1px rgba(253, 186, 116, 0.06) inset,
    0 5px 14px -8px rgba(249, 115, 22, 0.4),
    0 0 14px rgba(249, 115, 22, 0.11);
  animation-name: affiliate-glow-dark;
}

:global(.dark) .affiliate-invite-button:hover {
  background: linear-gradient(110deg, rgba(154, 52, 18, 0.28) 0%, rgba(180, 83, 9, 0.2) 100%);
  box-shadow:
    0 0 0 1px rgba(253, 186, 116, 0.09) inset,
    0 7px 17px -8px rgba(249, 115, 22, 0.48),
    0 0 18px rgba(249, 115, 22, 0.16);
}

:global(.dark) .affiliate-invite-button.is-copied,
:global(.dark) .affiliate-invite-button.is-copied:hover {
  color: #6ee7b7;
  background: linear-gradient(110deg, rgba(6, 95, 70, 0.3) 0%, rgba(15, 118, 110, 0.2) 100%);
  border-color: rgba(52, 211, 153, 0.4);
  box-shadow:
    0 0 0 1px rgba(110, 231, 183, 0.07) inset,
    0 5px 14px -8px rgba(16, 185, 129, 0.42),
    0 0 14px rgba(16, 185, 129, 0.12);
  animation: none;
}

@keyframes affiliate-glow-dark {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(253, 186, 116, 0.06) inset,
      0 5px 14px -8px rgba(249, 115, 22, 0.34),
      0 0 11px rgba(249, 115, 22, 0.08);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(253, 186, 116, 0.08) inset,
      0 6px 16px -8px rgba(249, 115, 22, 0.42),
      0 0 16px rgba(249, 115, 22, 0.14);
  }
}

@media (prefers-reduced-motion: reduce) {
  .affiliate-invite-button {
    animation: none;
  }

  .affiliate-invite-button:hover,
  .affiliate-invite-button:active {
    transform: none;
  }
}
</style>
