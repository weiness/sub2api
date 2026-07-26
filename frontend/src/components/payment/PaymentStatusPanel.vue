<template>
  <div class="mx-auto max-w-[1320px] space-y-4">
    <!-- ═══ Terminal States: show result, user clicks to return ═══ -->

    <!-- Success -->
    <template v-if="outcome === 'success'">
      <div class="rounded-xl border border-[#bee8d9] bg-white/90 p-6 shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-900/70">
        <div class="mx-auto flex max-w-xl flex-col items-center space-y-4 py-5">
          <div class="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#0fad76] text-white">
            <Icon name="check" size="lg" />
          </div>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ props.orderType === 'subscription' ? t('payment.result.subscriptionSuccess') : t('payment.result.success') }}</p>
          <div v-if="paidOrder" class="w-full rounded-xl border border-[#e3e8eb] bg-white px-[22px] py-3 shadow-[0_7px_18px_rgba(21,32,51,0.08)] dark:border-dark-700 dark:bg-dark-800">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.orderId') }}</span>
                <span class="font-medium text-gray-900 dark:text-white">#{{ paidOrder.id }}</span>
              </div>
              <div v-if="paidOrder.out_trade_no" class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.orderNo') }}</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ paidOrder.out_trade_no }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.amount') }}</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ creditedAmountSymbol }}{{ paidOrder.amount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.payAmount') }}</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatGatewayAmount(paidOrder.pay_amount, paidOrder.currency) }}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-primary min-h-12 w-full" @click="handleDone">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </template>

    <!-- Cancelled -->
    <template v-else-if="outcome === 'cancelled'">
      <div class="rounded-xl border border-[#e3e8eb] bg-white/90 p-6 shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-900/70">
        <div class="mx-auto flex max-w-xl flex-col items-center space-y-4 py-5">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700">
            <svg class="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ t('payment.qr.cancelled') }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.cancelledDesc') }}</p>
          <button class="btn btn-primary min-h-12 w-full" @click="handleDone">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </template>

    <!-- Expired / Failed -->
    <template v-else-if="outcome === 'expired'">
      <div class="rounded-xl border border-[#f1d7b4] bg-white/90 p-6 shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-900/70">
        <div class="mx-auto flex max-w-xl flex-col items-center space-y-4 py-5">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <svg class="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ t('payment.qr.expired') }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.expiredDesc') }}</p>
          <button class="btn btn-primary min-h-12 w-full" @click="handleDone">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </template>

    <!-- ═══ Active States: QR or Popup waiting ═══ -->

    <!-- Mobile Alipay app handoff. The QR fallback stays hidden until launch timeout. -->
    <template v-else-if="isMobileAlipayDeepLink">
      <template v-if="!deepLinkFallbackVisible">
        <div class="rounded-lg border border-[#dfe7e4] bg-[#f7f9f8] p-6 dark:border-dark-700 dark:bg-dark-900/70">
          <div class="flex flex-col items-center space-y-4 py-4 text-center">
            <div
              v-if="deepLinkState === 'launching'"
              class="h-10 w-10 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"
            ></div>
            <div
              v-else
              class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30"
            >
              <Icon name="checkCircle" size="lg" class="text-[#00AEEF]" />
            </div>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ deepLinkState === 'backgrounded' ? t('payment.qr.alipayContinueInApp') : t('payment.qr.alipayOpening') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.alipayWaitingHint') }}</p>
            <button
              v-if="deepLinkState === 'backgrounded'"
              data-test="reopen-alipay"
              class="btn btn-alipay inline-flex items-center gap-2 text-sm"
              @click="reopenAlipay"
            >
              <Icon name="externalLink" size="sm" />
              {{ t('payment.qr.reopenAlipay') }}
            </button>
          </div>
        </div>
        <div class="rounded-lg border border-[#dfe7e4] bg-white p-4 text-center dark:border-dark-700 dark:bg-dark-800">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.expiresIn') }}</p>
          <p class="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ countdownDisplay }}</p>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t('payment.qr.waitingPayment') }}</p>
        </div>
      </template>
      <template v-else>
        <div data-test="alipay-qr-fallback" class="rounded-lg border border-[#dfe7e4] bg-[#f7f9f8] p-6 dark:border-dark-700 dark:bg-dark-900/70">
          <div class="flex flex-col items-center space-y-4">
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('payment.qr.alipayFallbackTitle') }}</p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.alipayFallbackHint') }}</p>
            </div>
            <div class="w-full space-y-2 border-y border-gray-100 py-3 text-sm dark:border-dark-600">
              <div class="flex items-start justify-between gap-4">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.payAmount') }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ displayPaymentAmount }}</span>
              </div>
              <div class="flex items-start justify-between gap-4">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.orders.orderNo') }}</span>
                <span class="max-w-[70%] break-all text-right font-mono text-xs text-gray-900 dark:text-white">
                  {{ displayOrderNumber }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-4">
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.qr.expiresIn') }}</span>
                <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ countdownDisplay }}</span>
              </div>
            </div>
            <div :class="['relative rounded-lg border-2 p-4', qrBorderClass]">
              <canvas ref="qrCanvas" class="mx-auto"></canvas>
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span :class="['rounded-full p-2 shadow ring-2 ring-white', qrLogoBgClass]">
                  <img :src="qrLogoIcon" alt="" class="h-5 w-5 brightness-0 invert" />
                </span>
              </div>
            </div>
            <p class="text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
              {{ t('payment.qr.alipaySaveAndScanHint') }}
            </p>
            <div class="grid w-full gap-2 sm:grid-cols-2">
              <button
                data-test="reopen-alipay"
                class="btn btn-alipay inline-flex items-center justify-center gap-2"
                @click="reopenAlipay"
              >
                <Icon name="externalLink" size="sm" />
                {{ t('payment.qr.reopenAlipay') }}
              </button>
              <button
                data-test="save-alipay-qr"
                class="btn btn-secondary inline-flex items-center justify-center gap-2"
                @click="saveQRCode"
              >
                <Icon name="download" size="sm" />
                {{ t('payment.qr.saveQRCode') }}
              </button>
            </div>
            <button class="btn btn-secondary w-full" @click="handleDone">
              {{ t('payment.result.backToRecharge') }}
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- QR Code Mode -->
    <template v-else-if="showQRCode">
      <div class="overflow-hidden rounded-lg border border-[#e3e8eb] bg-white shadow-[0_8px_28px_rgba(28,55,64,0.07)] dark:border-dark-700 dark:bg-dark-800">
        <header class="flex flex-col justify-between gap-5 border-b border-[#e3e8eb] px-6 py-7 sm:px-9 lg:flex-row lg:items-center">
          <div class="flex items-center gap-4"><span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0fad76] text-white"><Icon name="check" size="lg" :stroke-width="2.5" /></span><div><h1 class="text-2xl font-bold text-[#152033] dark:text-white">{{ t('payment.qr.orderSubmitted') }}</h1><p class="mt-1.5 text-sm text-[#718096]">{{ t('payment.qr.orderSubmittedHint') }}</p></div></div>
          <div class="grid gap-2 text-xs text-[#718096]"><span>{{ t('payment.orders.orderNo') }}：<strong class="font-normal text-[#718096] dark:text-gray-400">{{ displayOrderNumber }}</strong></span><span v-if="createdAtText">{{ t('payment.orders.createdAt') }}：<strong class="font-normal text-[#718096] dark:text-gray-400">{{ createdAtText }}</strong></span></div>
        </header>

        <div class="grid items-center gap-7 px-6 py-8 sm:px-9 xl:grid-cols-[320px_minmax(360px,1fr)_260px]">
          <aside class="min-h-[390px] border-b border-[#e3e8eb] pb-7 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-7">
            <h2 class="mb-6 text-[17px] font-bold text-[#152033] dark:text-white">{{ props.orderType === 'subscription' ? t('payment.planInfo') : t('payment.rechargeInfo') }}</h2>
            <template v-if="props.orderType === 'subscription' && plan">
              <div class="mb-6 flex items-center gap-3"><span class="grid h-16 w-16 place-items-center rounded-lg bg-[#f4f7f6]"><img v-if="isOpenAIPlan" src="/payment-flow-icons/openai.svg" alt="" class="h-8 w-8" /><Icon v-else name="calendar" size="lg" class="text-[#0fad76]" /></span><div><h3 class="font-bold text-[#152033] dark:text-white">{{ plan.name }}</h3><p class="mt-1 text-xs text-[#718096]">{{ plan.description }}</p></div></div>
              <div class="grid gap-[18px] border-t border-[#e3e8eb] pt-5"><div class="flex justify-between text-sm"><span class="text-[#657184]">{{ t('payment.planCard.validity') }}</span><strong>{{ planValidity }}</strong></div><div class="flex justify-between text-sm"><span class="text-[#657184]">{{ t('payment.expectedExpiry') }}</span><strong>{{ planExpiry }}</strong></div><div class="flex justify-between text-sm"><span class="text-[#657184]">{{ t('payment.planFee') }}</span><strong>{{ displayPaymentAmount }}</strong></div></div>
            </template>
            <template v-else>
              <div class="grid gap-7 pt-2">
                <div class="flex items-center gap-4"><span class="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#eaf8f3] text-[#0fad76]"><Icon name="creditCard" size="xl" /></span><p><span class="block text-sm text-[#657184]">{{ t('payment.paymentAmount') }}</span><strong class="mt-1 block text-[27px] text-[#07885b]">{{ displayPaymentAmount }}</strong></p></div>
                <div class="flex items-center gap-4"><span class="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#eaf8f3] text-[#0fad76]"><Icon name="dollar" size="xl" /></span><p><span class="block text-sm text-[#657184]">{{ t('payment.orders.creditedAmount') }}</span><strong class="mt-1 block text-[27px] text-[#07885b]">{{ creditedAmountSymbol }}{{ Number(props.amount || 0).toFixed(2) }}</strong></p></div>
                <div class="flex items-center gap-4"><span class="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#eaf8f3] text-[#0fad76]"><Icon name="globe" size="xl" /></span><p><span class="block text-sm text-[#657184]">{{ t('payment.currentRate') }}</span><strong class="mt-1 block text-base text-[#07885b]">{{ waitingRateText }}</strong></p></div>
              </div>
            </template>
          </aside>

          <div class="text-center">
            <h2 class="mb-4 text-lg font-bold text-[#152033] dark:text-white">{{ scanTitle }}</h2>
            <div :class="['relative mx-auto w-fit rounded-lg border-2 p-4', qrBorderClass]"><canvas ref="qrCanvas" class="mx-auto block"></canvas><div class="pointer-events-none absolute inset-0 flex items-center justify-center"><span :class="['rounded-lg border-4 border-white p-2 shadow', qrLogoBgClass]"><img :src="qrLogoIcon" alt="" class="h-6 w-6 brightness-0 invert" /></span></div></div>
            <div class="mt-5 flex flex-wrap items-center justify-center gap-2 text-left">
              <span class="grid h-10 w-10 place-items-center rounded-full bg-[#eaf8f3] text-[#0fad76]"><Icon name="smartphone" size="sm" /></span><p><strong class="block text-xs">{{ t('payment.qr.openPaymentApp', { app: paymentAppName }) }}</strong><small class="mt-1 block text-[10px] text-[#718096]">{{ t('payment.qr.tapScan') }}</small></p><i class="mx-1 text-2xl not-italic text-[#b1bbc8]">›</i><span class="grid h-10 w-10 place-items-center rounded-full bg-[#eaf8f3]"><span class="grid h-5 w-5 place-items-center rounded-full bg-[#0fad76] text-white"><Icon name="check" size="sm" class="-translate-y-px translate-x-px" :stroke-width="3" /></span></span><p><strong class="block text-xs">{{ t('payment.qr.scanQRCode') }}</strong><small class="mt-1 block text-[10px] text-[#718096]">{{ t('payment.qr.completePayment') }}</small></p>
            </div>
          </div>

          <div class="relative mx-auto hidden h-[330px] w-[190px] rotate-[7deg] rounded-[34px] border-[14px] border-[#edf2f7] bg-[#f8fafc] opacity-85 xl:block"><span class="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#d5dde5]"></span><div class="absolute left-[-28px] top-[112px] grid h-[112px] w-[174px] place-items-center rounded-xl bg-white text-[#0fad76] shadow-[0_10px_30px_rgba(33,66,77,0.12)]"><Icon name="qrCode" size="xl" class="h-12 w-12" /><strong class="-mt-5 text-sm">{{ t('payment.qr.scan') }}</strong></div></div>
        </div>

        <div class="mx-6 mb-8 grid items-center gap-5 rounded-lg bg-gradient-to-r from-[#eef9f6] to-[#f8fbfa] px-6 py-6 sm:mx-8 md:grid-cols-[76px_220px_1px_1fr] md:px-12"><span class="grid h-[70px] w-[70px] place-items-center rounded-full bg-[#0fad76] text-white"><Icon name="clock" size="xl" class="h-9 w-9" /></span><div><span class="block text-sm text-[#657184]">{{ t('payment.qr.expiresIn') }}</span><strong class="mt-1 block text-[34px] leading-none tabular-nums text-[#0fad76]">{{ countdownDisplay }}</strong><small class="mt-1 block text-xs text-[#718096]">{{ t('payment.qr.completeSoon') }}</small></div><i class="hidden h-[70px] bg-[#dde9e5] md:block"></i><div class="grid gap-2 text-xs"><strong>{{ t('payment.warmTip') }}</strong><span class="text-[#718096]">• {{ t('payment.qr.keepPageOpen') }}</span><span class="text-[#718096]">• {{ props.orderType === 'subscription' ? t('payment.qr.subscriptionAutoActive') : t('payment.qr.creditAutoAdded') }}</span></div></div>
      </div>
      <button class="btn btn-secondary min-h-12 w-full text-base" :disabled="cancelling" @click="handleCancel">{{ cancelling ? t('common.processing') : t('payment.qr.cancelOrder') }}</button>
      <div class="flex items-center justify-center gap-2 pt-1 text-xs text-[#718096]"><Icon name="shield" size="md" class="text-[#0fad76]" /><span>{{ t('payment.securePaymentTitle') }}</span><span>{{ t('payment.securePaymentDesc') }}</span></div>
    </template>

    <!-- Waiting for Popup/Redirect Mode -->
    <template v-else>
      <div class="rounded-lg border border-[#dfe7e4] bg-[#f7f9f8] p-6 dark:border-dark-700 dark:bg-dark-900/70">
        <div class="flex flex-col items-center space-y-4 py-4">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('payment.qr.payInNewWindowHint') }}</p>
          <button v-if="payUrl" class="btn btn-secondary text-sm" @click="reopenPopup">
            {{ t('payment.qr.openPayWindow') }}
          </button>
        </div>
      </div>
      <div class="rounded-lg border border-[#dfe7e4] bg-white p-4 text-center dark:border-dark-700 dark:bg-dark-800">
        <p class="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ countdownDisplay }}</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t('payment.qr.waitingPayment') }}</p>
      </div>
      <button class="btn btn-secondary w-full" :disabled="cancelling" @click="handleCancel">
        {{ cancelling ? t('common.processing') : t('payment.qr.cancelOrder') }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePaymentStore } from '@/stores/payment'
import { useAppStore } from '@/stores'
import { paymentAPI } from '@/api/payment'
import { extractI18nErrorMessage } from '@/utils/apiError'
import { getPaymentPopupFeatures, isBuiltInAlipayMethod, isBuiltInWxpayMethod } from '@/components/payment/providerConfig'
import { currencySymbol, formatPaymentAmount, normalizePaymentCurrency } from '@/components/payment/currency'
import type { PaymentOrder } from '@/types/payment'
import type { SubscriptionPlan } from '@/types/payment'
import Icon from '@/components/icons/Icon.vue'
import QRCode from 'qrcode'
import alipayIcon from '@/assets/icons/alipay.svg'
import wxpayIcon from '@/assets/icons/wxpay.svg'
import paymentIcon from '@/assets/icons/payment.svg'
import {
  createAlipayDeepLinkLauncher,
  type AlipayDeepLinkLauncher,
  type AlipayDeepLinkState,
} from './alipayDeepLink'
import { planValiditySuffix } from './validity'

const props = defineProps<{
  orderId: number
  amount?: number
  payAmount?: number
  qrCode: string
  expiresAt: string
  paymentType: string
  payUrl?: string
  orderType?: string
  currency?: string
  outTradeNo?: string
  createdAt?: number
  mobileAlipayDeepLink?: boolean
  plan?: SubscriptionPlan | null
  renewalBaseExpiresAt?: string
  rechargeRate?: number
}>()

type PaymentOutcome = 'success' | 'cancelled' | 'expired'

const emit = defineEmits<{ done: []; success: []; settled: [outcome: PaymentOutcome] }>()

const i18n = useI18n()
const { t } = i18n
const paymentStore = usePaymentStore()
const appStore = useAppStore()

const qrCanvas = ref<HTMLCanvasElement | null>(null)
const qrUrl = ref('')
const remainingSeconds = ref(0)
const cancelling = ref(false)
const paidOrder = ref<PaymentOrder | null>(null)
const deepLinkState = ref<AlipayDeepLinkState>('idle')
const deepLinkFallbackVisible = ref(false)
const paymentCurrency = computed(() => normalizePaymentCurrency(props.currency))
const creditedAmountSymbol = currencySymbol('USD')
const localeCode = computed(() => {
  const raw = i18n.locale as unknown
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'value' in raw) {
    return String((raw as { value?: string }).value || '')
  }
  return undefined
})

// Terminal outcome: null = still active, 'success' | 'cancelled' | 'expired'
const outcome = ref<PaymentOutcome | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null
let verifyAttempts = 0
let lastVerifyAt = 0
let alipayLauncher: AlipayDeepLinkLauncher | null = null

const VERIFY_RETRY_INTERVAL_MS = 15000
const VERIFY_RETRY_MAX_ATTEMPTS = 6

const isAlipay = computed(() => isBuiltInAlipayMethod(props.paymentType))
const isWxpay = computed(() => isBuiltInWxpayMethod(props.paymentType))
const paymentAppName = computed(() => isAlipay.value ? t('payment.methods.alipay') : isWxpay.value ? t('payment.methods.wxpay') : t('payment.paymentApp'))
const isOpenAIPlan = computed(() => String(props.plan?.group_platform || '').toLowerCase() === 'openai')
const planValidity = computed(() => props.plan ? planValiditySuffix(props.plan, t) : '-')
const planExpiry = computed(() => {
  if (!props.plan) return '-'
  const unit = String(props.plan.validity_unit || 'day').replace(/s$/, '')
  const multiplier = unit === 'month' ? 30 : unit === 'week' ? 7 : 1
  const currentExpiry = Date.parse(props.renewalBaseExpiresAt || '')
  const startsAt = Number.isFinite(currentExpiry) && currentExpiry > Date.now() ? currentExpiry : Date.now()
  const date = new Date(startsAt + props.plan.validity_days * multiplier * 86400000)
  return new Intl.DateTimeFormat(localeCode.value, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
})
const waitingRateText = computed(() => `1 ${paymentCurrency.value} = $${Number(props.rechargeRate || 1)} ${t('payment.creditUnit')}`)
const isMobileAlipayDeepLink = computed(() => props.mobileAlipayDeepLink === true && isAlipay.value && !!qrUrl.value)
const showQRCode = computed(() => !!qrUrl.value && (!isMobileAlipayDeepLink.value || deepLinkFallbackVisible.value))

const qrBorderClass = computed(() => {
  if (isAlipay.value) return 'border-[#00AEEF] bg-blue-50 dark:border-[#00AEEF]/70 dark:bg-blue-950/20'
  if (isWxpay.value) return 'border-[#2BB741] bg-green-50 dark:border-[#2BB741]/70 dark:bg-green-950/20'
  return 'border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800'
})

const qrLogoBgClass = computed(() => {
  if (isAlipay.value) return 'bg-[#00AEEF]'
  if (isWxpay.value) return 'bg-[#2BB741]'
  return 'bg-gray-400'
})

const qrLogoIcon = computed(() => {
  if (isAlipay.value) return alipayIcon
  if (isWxpay.value) return wxpayIcon
  return paymentIcon
})

const scanTitle = computed(() => {
  if (isAlipay.value) return t('payment.qr.scanAlipay')
  if (isWxpay.value) return t('payment.qr.scanWxpay')
  return t('payment.qr.scanToPay')
})

const countdownDisplay = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60)
  const s = remainingSeconds.value % 60
  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
})

const displayPaymentAmount = computed(() => formatGatewayAmount(props.payAmount || props.amount || 0))
const displayOrderNumber = computed(() => props.outTradeNo || `#${props.orderId}`)
const createdAtText = computed(() => {
  if (!props.createdAt) return ''
  return new Intl.DateTimeFormat(localeCode.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(props.createdAt))
})

function formatGatewayAmount(value: number, currency?: string | null): string {
  return formatPaymentAmount(value, currency || paymentCurrency.value, localeCode.value)
}

function isSuccessStatus(status: string | null | undefined): boolean {
  return status === 'COMPLETED' || status === 'PAID' || status === 'RECHARGING'
}

function reopenPopup() {
  if (props.payUrl) {
    const win = window.open(props.payUrl, 'paymentPopup', getPaymentPopupFeatures())
    if (!win || win.closed) {
      window.location.href = props.payUrl
    }
  }
}

function setOutcome(next: PaymentOutcome) {
  if (outcome.value === next) return
  outcome.value = next
  emit('settled', next)
}

async function renderQR() {
  await nextTick()
  if (!showQRCode.value || !qrCanvas.value || !qrUrl.value) return
  await QRCode.toCanvas(qrCanvas.value, qrUrl.value, {
    width: 220, margin: 2,
    errorCorrectionLevel: 'M',
  })
}

function updateDeepLinkState(state: AlipayDeepLinkState) {
  deepLinkState.value = state
  if (state === 'fallback') {
    deepLinkFallbackVisible.value = true
    renderQR()
  } else if (state === 'backgrounded') {
    deepLinkFallbackVisible.value = false
  }
}

function reopenAlipay() {
  alipayLauncher?.launch()
}

function saveQRCode() {
  const canvas = qrCanvas.value
  if (!canvas) return
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `alipay-${props.outTradeNo || props.orderId}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function tryRecoverPendingOrder(order: PaymentOrder): Promise<PaymentOrder> {
  if (!isWxpay.value && !isMobileAlipayDeepLink.value) return order
  const outTradeNo = String(order.out_trade_no || '').trim()
  if (!outTradeNo) return order
  const normalizedStatus = String(order.status || '').trim().toUpperCase()
  if (normalizedStatus !== 'PENDING') return order
  const now = Date.now()
  if (verifyAttempts >= VERIFY_RETRY_MAX_ATTEMPTS || now - lastVerifyAt < VERIFY_RETRY_INTERVAL_MS) {
    return order
  }

  lastVerifyAt = now
  verifyAttempts += 1
  try {
    const result = await paymentAPI.verifyOrder(outTradeNo)
    return result.data ?? order
  } catch {
    return order
  }
}

let pollInFlight = false
async function pollStatus() {
  if (!props.orderId || outcome.value) return
  // 防重入：接口（含 verifyOrder 二次确认）响应慢于 3 秒轮询间隔时避免并发重叠请求。
  if (pollInFlight) return
  pollInFlight = true
  try {
    let order = await paymentStore.pollOrderStatus(props.orderId)
    if (!order) return
    // 已进入终态则不再处理迟到的响应。
    if (outcome.value) return
    order = await tryRecoverPendingOrder(order)
    if (outcome.value) return
    if (isSuccessStatus(order.status)) {
      cleanup()
      paidOrder.value = order
      setOutcome('success')
      emit('success')
    } else if (order.status === 'CANCELLED') {
      cleanup()
      setOutcome('cancelled')
    } else if (order.status === 'EXPIRED' || order.status === 'FAILED') {
      cleanup()
      setOutcome('expired')
    }
  } finally {
    pollInFlight = false
  }
}

function startCountdown(seconds: number) {
  remainingSeconds.value = Math.max(0, seconds)
  if (remainingSeconds.value <= 0) { setOutcome('expired'); return }
  countdownTimer = setInterval(() => {
    remainingSeconds.value--
    if (remainingSeconds.value <= 0) { setOutcome('expired'); cleanup() }
  }, 1000)
}

async function handleCancel() {
  if (!props.orderId || cancelling.value) return
  cancelling.value = true
  try {
    await paymentAPI.cancelOrder(props.orderId)
    cleanup()
    setOutcome('cancelled')
  } catch (err: unknown) {
    appStore.showError(extractI18nErrorMessage(err, t, 'payment.errors', t('common.error')))
  } finally {
    cancelling.value = false
  }
}

function handleDone() { cleanup(); emit('done') }

function cleanup() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  alipayLauncher?.dispose()
  alipayLauncher = null
}

// Initialize on mount
qrUrl.value = props.qrCode
verifyAttempts = 0
lastVerifyAt = 0
let seconds = 30 * 60
if (props.expiresAt) {
  seconds = Math.floor((new Date(props.expiresAt).getTime() - Date.now()) / 1000)
}
startCountdown(seconds)
pollTimer = setInterval(pollStatus, 3000)
renderQR()

watch([() => qrUrl.value, showQRCode], () => renderQR())
onMounted(() => {
  if (!isMobileAlipayDeepLink.value) return
  alipayLauncher = createAlipayDeepLinkLauncher({
    qrCode: qrUrl.value,
    document,
    lifecycleTarget: window,
    userAgent: window.navigator.userAgent,
    assignLocation: (url) => window.location.assign(url),
    onStateChange: updateDeepLinkState,
  })
  alipayLauncher.launch()
})
onUnmounted(() => cleanup())
</script>
