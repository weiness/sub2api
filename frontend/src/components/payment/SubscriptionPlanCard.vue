<template>
  <div
    data-test="subscription-plan-card"
    :class="[
      'group relative flex min-h-[410px] flex-col overflow-visible rounded-lg border bg-white shadow-[0_8px_24px_rgba(15,118,110,0.06)] transition-all duration-200 dark:bg-dark-800',
      'hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(15,118,110,0.12)] hover:ring-2 hover:ring-[#0fad76]/20 dark:hover:shadow-black/30 dark:hover:ring-[#2fd398]/25',
      borderClass,
    ]"
  >
    <div :class="['h-1 rounded-t-lg', accentClass]" />

    <div v-if="plan.recommended" data-test="recommended-badge" class="subscription-recommend-badge">
      <span>{{ t('payment.recommended') }}</span>
    </div>

    <div class="flex flex-1 flex-col overflow-hidden rounded-b-lg p-6">
      <div :class="['flex min-w-0 items-center gap-2', plan.recommended ? 'pr-[76px]' : '']">
        <h3 class="min-w-0 truncate text-[21px] font-bold text-gray-900 dark:text-white">{{ plan.name }}</h3>
        <span :class="['shrink-0 rounded-md px-2 py-[5px] text-[11px] font-semibold leading-none', badgeLightClass]">
          {{ pLabel }}
        </span>
      </div>

      <div class="mt-2.5 min-h-5">
        <p v-if="plan.description" data-test="plan-description" class="text-sm leading-relaxed text-gray-500 line-clamp-2 dark:text-dark-400">
          {{ plan.description }}
        </p>
      </div>

      <div class="mt-5 flex items-baseline gap-[5px]">
        <span class="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400">{{ planCurrencySymbol }}</span>
        <span data-test="plan-price" :class="['min-w-0 font-extrabold leading-none tabular-nums', priceSizeClass, textClass]">{{ plan.price }}</span>
        <span class="shrink-0 text-[13px] font-semibold text-gray-500 dark:text-gray-400">{{ plan.currency || 'USD' }}</span>
        <span data-test="plan-validity" class="ml-auto shrink-0 whitespace-nowrap pl-1 text-[13px] text-gray-400 dark:text-dark-500">/ {{ validitySuffix }}</span>
      </div>
      <div v-if="plan.original_price" class="mt-2 text-[13px] text-gray-400 line-through dark:text-dark-500">
        {{ planCurrencySymbol }}{{ plan.original_price }}<template v-if="plan.currency"> {{ plan.currency }}</template>
      </div>

      <div class="mb-4 mt-6 space-y-1 border-y border-gray-100 py-2.5 text-[13px] dark:border-dark-700">
        <div class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.rate') }}</span>
          <span class="flex items-center font-semibold text-gray-700 dark:text-gray-300">
            {{ rateDisplay }}
            <HelpTooltip v-if="hasPeakRate" width-class="w-auto max-w-xs">
              <template #trigger>
                <Icon name="clock" size="sm" class="cursor-help text-amber-500 dark:text-amber-400" />
              </template>
              <div class="whitespace-nowrap">
                <p class="font-semibold text-white">{{ t('payment.planCard.peakRate') }}</p>
                <p class="mt-1 text-gray-200">{{ peakRateDisplay }}</p>
              </div>
            </HelpTooltip>
          </span>
        </div>
        <div v-if="plan.daily_limit_usd != null" class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.dailyLimit') }}</span>
          <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.daily_limit_usd }}</span>
        </div>
        <div v-if="plan.weekly_limit_usd != null" class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.weeklyLimit') }}</span>
          <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.weekly_limit_usd }}</span>
        </div>
        <div v-if="plan.monthly_limit_usd != null" class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.monthlyLimit') }}</span>
          <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.monthly_limit_usd }}</span>
        </div>
        <div v-if="plan.daily_limit_usd == null && plan.weekly_limit_usd == null && plan.monthly_limit_usd == null" class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.quota') }}</span>
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{ t('payment.planCard.unlimited') }}</span>
        </div>
        <div v-if="modelScopeLabels.length > 0" class="flex min-h-6 items-center justify-between">
          <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.models') }}</span>
          <div class="flex flex-wrap justify-end gap-1">
            <span v-for="scope in modelScopeLabels" :key="scope"
              class="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-600 dark:text-gray-300">
              {{ scope }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="plan.features.length > 0" class="mb-4 space-y-1.5">
        <div v-for="feature in plan.features.slice(0, 3)" :key="feature" class="flex items-start gap-1.5">
          <svg :class="['mt-0.5 h-3.5 w-3.5 flex-shrink-0', iconClass]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span class="text-xs text-gray-600 dark:text-gray-300">{{ feature }}</span>
        </div>
      </div>

      <div class="flex-1" />

      <button
        type="button"
        :class="['min-h-12 w-full rounded-lg px-4 py-3 text-sm font-[750] transition-all active:scale-[0.98]', btnClass]"
        @click="emit('select', plan)"
      >
        {{ isRenewal ? t('payment.renewNow') : t('payment.subscribeNow') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SubscriptionPlan } from '@/types/payment'
import type { UserSubscription } from '@/types'
import { useAppStore } from '@/stores/app'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import Icon from '@/components/icons/Icon.vue'
import { hasPeakRate as groupHasPeakRate, formatPeakRateWindow, serverTimezoneLabel } from '@/utils/peak-rate'
import { planValiditySuffix } from './validity'
import { currencySymbol } from '@/components/payment/currency'
import {
  platformAccentBarClass,
  platformBadgeLightClass,
  platformBorderClass,
  platformTextClass,
  platformIconClass,
  platformButtonClass,
  platformLabel,
} from '@/utils/platformColors'

const props = defineProps<{ plan: SubscriptionPlan; activeSubscriptions?: UserSubscription[] }>()
const emit = defineEmits<{ select: [plan: SubscriptionPlan] }>()
const { t } = useI18n()

const platform = computed(() => props.plan.group_platform || '')
const isRenewal = computed(() =>
  props.activeSubscriptions?.some(s => s.group_id === props.plan.group_id && s.status === 'active') ?? false
)

// Derived color classes from central config
const accentClass = computed(() => platformAccentBarClass(platform.value))
const borderClass = computed(() => platformBorderClass(platform.value))
const badgeLightClass = computed(() => platformBadgeLightClass(platform.value))
const textClass = computed(() => platformTextClass(platform.value))
const iconClass = computed(() => platformIconClass(platform.value))
const btnClass = computed(() => platformButtonClass(platform.value))
const pLabel = computed(() => platformLabel(platform.value))

const rateDisplay = computed(() => {
  const rate = props.plan.rate_multiplier ?? 1
  return `×${Number(rate.toPrecision(10))}`
})

const appStore = useAppStore()
const planCurrencySymbol = computed(() => currencySymbol(props.plan.currency || 'USD'))

const hasPeakRate = computed(() => groupHasPeakRate(props.plan))

const peakRateDisplay = computed(() => {
  return formatPeakRateWindow(props.plan, serverTimezoneLabel(appStore.cachedPublicSettings?.server_utc_offset))
})

const MODEL_SCOPE_LABELS: Record<string, string> = {
  claude: 'Claude',
  gemini_text: 'Gemini',
  gemini_image: 'Imagen',
}

const modelScopeLabels = computed(() => {
  if (platform.value !== 'antigravity') return []
  const scopes = props.plan.supported_model_scopes
  if (!scopes || scopes.length === 0) return []
  return scopes.map(s => MODEL_SCOPE_LABELS[s] || s)
})

const validitySuffix = computed(() => planValiditySuffix(props.plan, t))

const priceSizeClass = computed(() => {
  const length = String(props.plan.price).replace('.', '').length
  if (length >= 6) return 'text-[30px]'
  if (length >= 5) return 'text-[33px]'
  if (length >= 4) return 'text-[36px]'
  return 'text-[42px]'
})
</script>

<style scoped>
.subscription-recommend-badge {
  position: absolute;
  z-index: 4;
  top: -20px;
  right: -10px;
  display: grid;
  width: 100px;
  height: 92px;
  place-items: center;
  transform: rotate(7deg);
  filter: drop-shadow(0 6px 6px rgb(150 35 10 / 30%));
  pointer-events: none;
}

.subscription-recommend-badge::before,
.subscription-recommend-badge::after {
  position: absolute;
  inset: 0;
  content: '';
  clip-path: polygon(50% 0, 59% 16%, 74% 5%, 78% 23%, 96% 18%, 89% 38%, 100% 50%, 84% 61%, 95% 79%, 75% 76%, 70% 97%, 55% 82%, 43% 100%, 34% 81%, 14% 92%, 17% 69%, 0 61%, 15% 47%, 2% 31%, 24% 30%, 25% 8%, 42% 20%);
}

.subscription-recommend-badge::before {
  background: #ef321f;
}

.subscription-recommend-badge::after {
  inset: 6px;
  background: linear-gradient(145deg, #ffd84a 5%, #ff8a16 48%, #ff4d1f 100%);
}

.subscription-recommend-badge span {
  position: relative;
  z-index: 1;
  transform: skew(-8deg) rotate(-5deg);
  color: #fff8d7;
  font-family: 'Arial Black', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 29px;
  font-style: italic;
  font-weight: 1000;
  letter-spacing: 0;
  -webkit-text-stroke: 2px #a9180c;
  text-shadow: 2px 2px 0 #b51b0f, 3px 4px 0 #8f1209;
}
</style>
