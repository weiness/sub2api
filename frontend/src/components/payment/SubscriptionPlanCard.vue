<template>
  <div
    data-test="subscription-plan-card"
    class="group relative flex min-h-[336px] flex-col rounded-lg border border-[#e3e8eb] bg-white p-[22px] shadow-[0_5px_18px_rgba(26,52,59,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0fad76] hover:bg-[#f7fcfa] hover:shadow-[0_18px_38px_rgba(15,118,110,0.12)] dark:border-dark-600 dark:bg-dark-800 dark:hover:border-[#2fd398] dark:hover:bg-emerald-950/20"
  >
    <div class="flex min-w-0 items-start gap-2">
      <h3 class="min-w-0 text-lg font-bold leading-5 text-gray-900 dark:text-white">{{ plan.name }}</h3>
      <span :class="['shrink-0 rounded px-2 py-1 text-[11px] font-semibold leading-none', badgeLightClass]">{{ pLabel }}</span>
      <span data-test="plan-sold-count" :data-sold-count="plan.sold_count || 0" class="ml-auto shrink-0 whitespace-nowrap text-[11px] font-normal leading-4 text-orange-600 dark:text-orange-400">
        {{ t('payment.planCard.soldCount', { count: plan.sold_count || 0 }) }}
      </span>
    </div>

    <p v-if="plan.description" data-test="plan-description" :class="['mb-5 mt-2 min-h-8 text-xs leading-4 text-[#6f7a8b] line-clamp-2 dark:text-dark-400', plan.recommended ? 'pr-14' : '']">
      {{ plan.description }}
    </p>
    <div v-else class="mb-5 mt-2 min-h-8" />

    <div :class="['flex min-w-0 items-end gap-1', plan.recommended ? 'pr-12' : '']">
      <span class="pb-1 text-sm text-gray-500 dark:text-gray-400">{{ displayCurrencySymbol }}</span>
      <span data-test="plan-price" :class="['font-extrabold leading-none tabular-nums', priceSizeClass, textClass]">{{ displayPriceText }}</span>
      <span class="pb-1 text-xs text-gray-500 dark:text-gray-400">{{ displayCurrency }}</span>
      <span data-test="plan-validity" class="whitespace-nowrap pb-1 text-xs text-gray-400 dark:text-dark-500">/ {{ validitySuffix }}</span>
      <span v-if="plan.recommended" data-test="recommended-badge" class="subscription-recommend-badge">{{ t('payment.recommended') }}</span>
    </div>

    <div v-if="plan.original_price" class="mt-2 flex min-h-6 items-center gap-2 text-xs">
      <span class="text-gray-400 line-through dark:text-dark-500">{{ displayCurrencySymbol }}{{ displayOriginalPriceText }}{{ displayCurrency }}</span>
      <span v-if="discountPercent" data-test="plan-discount" :data-discount-percent="discountPercent" class="rounded bg-orange-50 px-1.5 py-0.5 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
        {{ t('payment.planCard.savePercent', { percent: discountPercent }) }}
      </span>
    </div>
    <div v-else class="mt-2 min-h-6" />

    <div class="mt-3 space-y-2 border-t border-gray-100 pt-3 text-[11px] dark:border-dark-700">
      <div v-if="plan.daily_limit_usd != null" class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-gray-400 dark:text-dark-500"><Icon name="calendarGrid" size="sm" class="text-emerald-500" />{{ t('payment.planCard.dailyLimit') }}</span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.daily_limit_usd }}</span>
      </div>
      <div v-if="plan.weekly_limit_usd != null" class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-gray-400 dark:text-dark-500"><Icon name="calendarGrid" size="sm" class="text-blue-500" />{{ t('payment.planCard.weeklyLimit') }}</span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.weekly_limit_usd }}</span>
      </div>
      <div v-if="plan.monthly_limit_usd != null" class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-gray-400 dark:text-dark-500"><Icon name="calendarGrid" size="sm" class="text-orange-500" />{{ t('payment.planCard.monthlyLimit') }}</span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">${{ plan.monthly_limit_usd }}</span>
      </div>
      <div v-if="plan.daily_limit_usd == null && plan.weekly_limit_usd == null && plan.monthly_limit_usd == null" class="flex items-center justify-between">
        <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.quota') }}</span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">{{ t('payment.planCard.unlimited') }}</span>
      </div>
      <div v-if="modelScopeLabels.length" class="flex items-center justify-between gap-3">
        <span class="text-gray-400 dark:text-dark-500">{{ t('payment.planCard.models') }}</span>
        <div class="flex flex-wrap justify-end gap-1"><span v-for="scope in modelScopeLabels" :key="scope" class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-dark-600 dark:text-gray-300">{{ scope }}</span></div>
      </div>
    </div>

    <div v-if="plan.features.length" class="mt-3 space-y-1.5">
      <div v-for="feature in plan.features.slice(0, 2)" :key="feature" class="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
        <Icon name="check" size="xs" class="mt-0.5 shrink-0 text-emerald-500" :stroke-width="2.5" />{{ feature }}
      </div>
    </div>
    <div class="flex-1" />
    <button type="button" :class="['mt-4 min-h-[38px] w-full rounded-md px-4 py-2 text-sm font-bold transition-all active:scale-[0.98]', btnClass]" @click="emit('select', plan)">
      {{ isRenewal ? t('payment.renewNow') : t('payment.subscribeNow') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SubscriptionPlan } from '@/types/payment'
import type { UserSubscription } from '@/types'
import Icon from '@/components/icons/Icon.vue'
import { planValiditySuffix } from './validity'
import { currencySymbol } from './currency'
import { normalizeSubscriptionMultiplier, subscriptionDisplayPrice } from './subscriptionPricing'
import { platformBadgeLightClass, platformTextClass, platformButtonClass, platformLabel } from '@/utils/platformColors'

const props = defineProps<{ plan: SubscriptionPlan; activeSubscriptions?: UserSubscription[]; subscriptionMultiplier?: number }>()
const emit = defineEmits<{ select: [plan: SubscriptionPlan] }>()
const { t } = useI18n()
const platform = computed(() => props.plan.group_platform || '')
const isRenewal = computed(() => props.activeSubscriptions?.some(s => s.group_id === props.plan.group_id && s.status === 'active') ?? false)
const badgeLightClass = computed(() => platformBadgeLightClass(platform.value))
const textClass = computed(() => platformTextClass(platform.value))
const btnClass = computed(() => platformButtonClass(platform.value))
const pLabel = computed(() => platformLabel(platform.value))
const discountPercent = computed(() => !props.plan.original_price || props.plan.original_price <= props.plan.price ? 0 : Math.round((1 - props.plan.price / props.plan.original_price) * 100))
const multiplier = computed(() => normalizeSubscriptionMultiplier(props.subscriptionMultiplier))
const displayCurrency = computed(() => multiplier.value > 0 ? 'CNY' : props.plan.currency || 'USD')
const displayCurrencySymbol = computed(() => currencySymbol(displayCurrency.value))
const displayPrice = computed(() => subscriptionDisplayPrice(props.plan.price, multiplier.value))
const displayOriginalPrice = computed(() => subscriptionDisplayPrice(props.plan.original_price || 0, multiplier.value))
const displayPriceText = computed(() => multiplier.value > 0 ? displayPrice.value.toFixed(2) : String(displayPrice.value))
const displayOriginalPriceText = computed(() => multiplier.value > 0 ? displayOriginalPrice.value.toFixed(2) : String(displayOriginalPrice.value))
const validitySuffix = computed(() => planValiditySuffix(props.plan, t))
const modelScopeLabels = computed(() => platform.value !== 'antigravity' ? [] : (props.plan.supported_model_scopes || []).map(s => ({ claude: 'Claude', gemini_text: 'Gemini', gemini_image: 'Imagen' })[s] || s))
const priceSizeClass = computed(() => displayPriceText.value.replace('.', '').length >= 5 ? 'text-[26px]' : 'text-[30px]')
</script>

<style scoped>
.subscription-recommend-badge {
  position: absolute;
  z-index: 2;
  top: 50px;
  right: -12px;
  display: grid;
  width: 74px;
  height: 68px;
  place-items: center;
  clip-path: polygon(50% 0, 60% 15%, 76% 5%, 80% 23%, 98% 20%, 90% 39%, 100% 51%, 84% 62%, 94% 81%, 74% 77%, 67% 98%, 53% 83%, 40% 100%, 32% 81%, 12% 91%, 16% 69%, 0 60%, 14% 47%, 2% 30%, 23% 29%, 25% 8%, 41% 19%);
  color: #fff8da;
  background: #f05a24;
  transform: rotate(6deg);
  font-size: 15px;
  font-weight: 900;
  text-shadow: 1px 1px #a9180c;
}
</style>
