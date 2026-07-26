<template>
  <div class="mx-auto w-full max-w-[820px] pb-6">
    <header class="mb-3">
      <p class="text-xs text-[#667085] dark:text-gray-400">{{ t('payment.confirmOrderHint') }}</p>
    </header>

    <div class="mb-5 grid grid-cols-[auto_1fr_auto_1fr_auto] items-center">
      <div class="flex items-center gap-2 text-xs font-semibold text-[#07885b]"><span class="grid h-6 w-6 place-items-center rounded-full bg-[#0fad76] text-[10px] text-white"><Icon name="check" size="xs" :stroke-width="2.5" /></span><strong class="hidden sm:block">{{ orderType === 'balance' ? t('payment.selectAmountStep') : t('payment.selectPlanStep') }}</strong></div>
      <i class="h-px bg-[#dfe4e7]"></i>
      <div class="flex items-center gap-2 text-xs font-semibold text-[#07885b]"><span class="grid h-6 w-6 place-items-center rounded-full bg-[#0fad76] text-[10px] text-white">2</span><strong class="hidden sm:block">{{ t('payment.confirmOrder') }}</strong></div>
      <i class="h-px bg-[#dfe4e7]"></i>
      <div class="flex items-center gap-2 text-xs font-semibold text-[#98a2b3]"><span class="grid h-6 w-6 place-items-center rounded-full bg-[#cfd5dc] text-[10px] text-white">3</span><strong class="hidden sm:block">{{ t('payment.paymentResultStep') }}</strong></div>
    </div>

    <div>
      <section data-test="subscription-plan-info" class="rounded-t-lg border border-[#e3e8eb] bg-white p-[18px] shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-800">
        <h3 class="mb-3 text-[15px] font-bold text-[#152033] dark:text-white">{{ orderType === 'balance' ? t('payment.rechargeInfo') : t('payment.planInfo') }}</h3>

        <template v-if="orderType === 'balance'">
          <div class="grid items-center gap-4 sm:grid-cols-[105px_1fr]">
            <span class="grid h-[96px] w-[96px] place-items-center rounded-full bg-gradient-to-br from-[#dff6ef] to-[#f5fbf9]"><Icon name="wallet" size="xl" class="h-14 w-14 text-[#0fad76]" :stroke-width="1.8" /></span>
            <div>
              <div class="flex min-h-11 items-center justify-between border-b border-[#edf0f2]"><span class="text-xs text-[#718096]">{{ t('payment.paymentAmount') }}</span><strong class="text-base text-[#152033] dark:text-white">{{ formatAmount(baseAmount) }}</strong></div>
              <div class="flex min-h-11 items-center justify-between border-b border-[#edf0f2]"><span class="text-xs text-[#718096]">{{ t('payment.orders.creditedAmount') }}</span><strong class="text-base text-[#152033] dark:text-white">${{ creditedAmount.toFixed(2) }}</strong></div>
              <div class="flex min-h-11 items-center justify-between"><span class="text-xs text-[#718096]">{{ t('payment.currentRate') }}</span><strong class="text-sm text-[#344054] dark:text-gray-200">1 {{ normalizedCurrency }} = ${{ rechargeRate }} {{ t('payment.creditUnit') }}</strong></div>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-1 rounded-lg bg-[#eaf8f3] px-4 py-3 text-[11px] text-[#07885b] dark:bg-emerald-950/30 dark:text-emerald-300"><strong>{{ t('payment.warmTip') }}</strong><span>{{ t('payment.rechargeConfirmTip') }}</span></div>
        </template>

        <template v-else-if="plan">
          <div class="flex items-center gap-4">
            <span class="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#f4f7f6]">
              <img v-if="isOpenAIPlan" src="/payment-flow-icons/openai.svg" alt="" class="h-8 w-8" />
              <Icon v-else name="calendar" size="lg" class="text-[#0fad76]" />
            </span>
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><strong class="text-lg text-[#152033] dark:text-white">{{ plan.name }}</strong><span :class="['rounded px-2 py-1 text-[10px] font-semibold', platformClass]">{{ platformName }}</span></div><p v-if="plan.description" class="mt-1 text-xs text-[#718096]">{{ plan.description }}</p></div>
          </div>
          <div class="mt-3 grid grid-cols-2 sm:grid-cols-4">
            <div data-test="subscription-rate" class="border-[#e3e8eb] py-2 text-center sm:border-r"><InfoItem :label="t('payment.planCard.rate')" :value="`×${plan.rate_multiplier ?? 1}`" /></div>
            <div class="border-[#e3e8eb] py-2 text-center sm:border-r"><InfoItem :label="t('payment.planCard.dailyLimit')" :value="limitValue(plan.daily_limit_usd)" /></div>
            <div class="border-[#e3e8eb] py-2 text-center sm:border-r"><InfoItem :label="t('payment.planCard.weeklyLimit')" :value="limitValue(plan.weekly_limit_usd)" /></div>
            <div class="py-2 text-center"><InfoItem :label="t('payment.planCard.monthlyLimit')" :value="limitValue(plan.monthly_limit_usd)" /></div>
          </div>
          <div data-test="subscription-info" class="mt-3 border-t border-[#e3e8eb] pt-3">
            <h3 class="mb-2 text-[15px] font-bold text-[#152033] dark:text-white">{{ t('payment.subscriptionInfo') }}</h3>
            <div class="flex min-h-9 items-center justify-between text-xs"><span class="text-[#718096]">{{ t('payment.planCard.validity') }}</span><strong class="text-[#344054] dark:text-gray-300">{{ validityLabel }}</strong></div>
            <div class="flex min-h-9 items-center justify-between text-xs"><span class="text-[#718096]">{{ t('payment.expectedExpiry') }}</span><strong class="text-[#8b96a5]">{{ expectedExpiry }}</strong></div>
          </div>
        </template>
      </section>

      <section data-test="subscription-payment-method" class="-mt-px border border-[#e3e8eb] bg-white p-[18px] shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-800">
        <PaymentMethodSelector :methods="methods" :selected="selectedMethod" @select="emit('selectMethod', $event)" />
      </section>

      <section data-test="subscription-order-info" class="-mt-px border border-[#e3e8eb] bg-white p-[18px] shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-800">
        <h3 class="mb-2 text-[15px] font-bold text-[#152033] dark:text-white">{{ t('payment.orderInfo') }}</h3>
        <div class="flex min-h-9 items-center justify-between text-xs"><span class="text-[#718096]">{{ t('payment.orders.orderType') }}</span><strong class="text-[#344054] dark:text-gray-300">{{ orderType === 'balance' ? t('payment.orders.balanceOrder') : t('payment.orders.subscriptionOrder') }}</strong></div>
      </section>

      <section data-test="subscription-total-info" class="-mt-px rounded-b-lg border border-[#e3e8eb] bg-white px-[22px] py-3 shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-800">
        <div class="flex min-h-10 items-center justify-between text-xs"><strong class="text-[#344054] dark:text-gray-300">{{ orderType === 'balance' ? t('payment.paymentAmount') : `${t('payment.planFee')} (${validityLabel})` }}</strong><b class="text-lg text-[#152033] dark:text-white">{{ formatAmount(baseAmount) }}</b></div>
        <div v-if="feeAmount > 0" class="flex min-h-10 items-center justify-between border-t border-[#edf0f2] text-xs"><strong class="text-[#344054] dark:text-gray-300">{{ t('payment.fee') }}</strong><b>{{ formatAmount(feeAmount) }}</b></div>
        <div class="flex min-h-10 items-center justify-between border-t border-[#edf0f2] text-xs"><strong class="text-[#344054] dark:text-gray-300">{{ orderType === 'balance' ? t('payment.orders.creditedAmount') : t('payment.actualPay') }}</strong><b class="text-lg text-[#07885b] dark:text-emerald-400">{{ orderType === 'balance' ? `$${creditedAmount.toFixed(2)}` : formatAmount(totalAmount) }}</b></div>
      </section>

      <div data-test="subscription-actions" class="mt-4 grid items-center gap-4 sm:grid-cols-[170px_1fr]">
        <p class="flex items-center gap-2 text-[11px] text-[#718096] sm:pl-[22px]"><Icon name="shield" size="lg" class="shrink-0 text-[#0fad76]" /><span>{{ t('payment.securePaymentTitle') }}<small class="mt-0.5 block text-[10px]">{{ t('payment.securePaymentDesc') }}</small></span></p>
        <div class="flex gap-2">
          <button class="btn btn-purchase min-h-12 flex-[3] text-base font-bold" type="button" :disabled="disabled || submitting" @click="emit('confirm')">{{ submitting ? t('common.processing') : `${t('payment.createOrder')} ${formatAmount(totalAmount)}` }}</button>
          <button class="btn btn-secondary min-h-12 flex-1" type="button" @click="emit('cancel')">{{ t('payment.cancelPayment') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PaymentMethodSelector, { type PaymentMethodOption } from './PaymentMethodSelector.vue'
import type { SubscriptionPlan } from '@/types/payment'
import { platformBadgeLightClass, platformLabel } from '@/utils/platformColors'
import { normalizePaymentCurrency } from './currency'
import { planValiditySuffix } from './validity'

const props = defineProps<{ orderType: 'balance' | 'subscription'; accountName: string; baseAmount: number; creditedAmount: number; feeAmount: number; totalAmount: number; currency: string; methods: PaymentMethodOption[]; selectedMethod: string; plan?: SubscriptionPlan | null; renewalBaseExpiresAt?: string; submitting?: boolean; disabled?: boolean; formatAmount: (value: number) => string }>()
const emit = defineEmits<{ confirm: []; cancel: []; selectMethod: [method: string] }>()
const { t } = useI18n()
const platformClass = computed(() => platformBadgeLightClass(props.plan?.group_platform || ''))
const platformName = computed(() => platformLabel(props.plan?.group_platform || ''))
const isOpenAIPlan = computed(() => String(props.plan?.group_platform || '').toLowerCase() === 'openai')
const normalizedCurrency = computed(() => normalizePaymentCurrency(props.currency))
const rechargeRate = computed(() => props.baseAmount > 0 ? Number((props.creditedAmount / props.baseAmount).toFixed(4)) : 0)
const validityLabel = computed(() => props.plan ? planValiditySuffix(props.plan, t) : '')
const expectedExpiry = computed(() => {
  if (!props.plan) return '-'
  const unit = String(props.plan.validity_unit || 'day').replace(/s$/, '')
  const multiplier = unit === 'month' ? 30 : unit === 'week' ? 7 : 1
  const currentExpiry = Date.parse(props.renewalBaseExpiresAt || '')
  const startsAt = Number.isFinite(currentExpiry) && currentExpiry > Date.now() ? currentExpiry : Date.now()
  const date = new Date(startsAt + props.plan.validity_days * multiplier * 86400000)
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
})
function limitValue(value?: number | null) { return value == null ? t('payment.planCard.unlimited') : `$${value}` }
const InfoItem = defineComponent({ props: { label: { type: String, required: true }, value: { type: String, required: true } }, setup(p) { return () => h('div', [h('p', { class: 'text-[11px] text-[#718096]' }, p.label), h('p', { class: 'mt-1 text-base font-bold text-[#152033] dark:text-white' }, p.value)]) } })
</script>
