<template>
  <div class="pt-5">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <label class="text-[17px] font-bold text-gray-900 dark:text-white">
          {{ t('payment.selectPaymentAmount') }}
      </label>
      <span class="rounded-md bg-[#eaf8f3] px-2.5 py-1.5 text-[11px] font-semibold text-[#07885b] dark:bg-emerald-900/30 dark:text-emerald-300">
        {{ t('payment.currentRechargeRate', { currency: normalizedCurrency, usd: formattedMultiplier }) }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <button
        v-for="amt in filteredAmounts"
        :key="amt"
        type="button"
        :class="[
          'relative flex min-h-[100px] flex-col items-center justify-center rounded-lg border bg-white px-4 text-center shadow-[0_5px_18px_rgba(26,52,59,0.04)] outline-none transition-all focus:outline-none focus-visible:border-[#0fad76] focus-visible:bg-[#f7fcfa] dark:bg-dark-800 dark:focus-visible:border-[#2fd398] dark:focus-visible:bg-emerald-950/30',
          isPresetSelected(amt)
            ? 'border-2 border-[#0fad76] bg-[#f7fcfa] dark:border-[#2fd398] dark:bg-emerald-950/30'
            : 'border-[#dfe7e4] hover:-translate-y-0.5 hover:border-[#0fad76] hover:shadow-[0_7px_18px_rgba(15,173,118,0.09)] dark:border-dark-600',
        ]"
        @click="selectAmount(amt)"
      >
        <span v-if="amt === 100" class="absolute right-0 top-0 rounded-bl-lg rounded-tr-[7px] bg-[#0fad76] px-2.5 py-1.5 text-[10px] font-bold text-white">
          {{ t('payment.recommended') }}
        </span>
        <span
          v-if="isPresetSelected(amt)"
          data-testid="amount-selected-indicator"
          class="absolute left-3 top-3 grid h-[18px] w-[18px] place-items-center overflow-visible rounded-full bg-[#0fad76] text-white"
        >
          <Icon name="check" size="sm" class="translate-x-[2px] -translate-y-[2px]" :stroke-width="3.4" />
        </span>
        <strong class="w-full text-center text-[22px] font-extrabold text-gray-900 dark:text-white">{{ paymentCurrencySymbol }}{{ amt }}</strong>
        <span class="mt-2 w-full text-center text-xs font-semibold text-gray-500 dark:text-gray-400">${{ creditedFor(amt) }} {{ t('payment.creditUnit') }}</span>
        <span class="mt-1 min-h-4 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"></span>
      </button>

      <label
        :class="[
          'relative col-span-2 flex min-h-[100px] flex-col justify-center rounded-lg border bg-white px-6 shadow-[0_5px_18px_rgba(26,52,59,0.04)] transition-all md:col-span-1 xl:col-span-2 dark:bg-dark-800',
          isCustomSelected
            ? 'border-2 border-[#0fad76] bg-[#f7fcfa] dark:border-[#2fd398] dark:bg-emerald-950/30'
            : 'border-[#dfe7e4] focus-within:border-[#0fad76] dark:border-dark-600',
        ]"
        @click="activateCustom"
      >
        <span class="text-sm font-bold text-gray-900 dark:text-white">{{ t('payment.customPaymentAmount') }}</span>
        <span class="mt-2 flex items-center border-b border-gray-200 pb-2 dark:border-dark-600">
          <span class="mr-2 text-gray-400">{{ paymentCurrencySymbol }}</span>
          <input
            type="text"
            inputmode="decimal"
            :value="customText"
            :placeholder="placeholderText"
            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            @input="handleInput"
          />
        </span>
        <small class="mt-2 flex min-h-[15px] items-center gap-2 text-[10px] text-gray-400">
          <span :class="customBelowMinimum ? 'text-amber-600 dark:text-amber-400' : ''">
            {{ customBelowMinimum ? belowMinimumHint : minimumHint }}
          </span>
        </small>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { currencySymbol, normalizePaymentCurrency } from '@/components/payment/currency'
import Icon from '@/components/icons/Icon.vue'

const props = withDefaults(defineProps<{
  amounts?: number[]
  modelValue: number | null
  min?: number
  max?: number
  currency?: string
  rechargeMultiplier?: number
}>(), {
  amounts: () => [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
  min: 0,
  max: 0,
  currency: 'CNY',
  rechargeMultiplier: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const { t } = useI18n()

const customText = ref('')
const normalizedCurrency = computed(() => normalizePaymentCurrency(props.currency))
const paymentCurrencySymbol = computed(() => currencySymbol(normalizedCurrency.value))
const formattedMultiplier = computed(() => Number((props.rechargeMultiplier || 1).toPrecision(10)))

// 0 = no limit
const filteredAmounts = computed(() =>
  props.amounts.filter((a) => (props.min <= 0 || a >= props.min) && (props.max <= 0 || a <= props.max))
)
const selectionMode = ref<'preset' | 'custom'>('preset')
const isCustomSelected = computed(() => selectionMode.value === 'custom')
const minimumHint = computed(() => props.min > 0 ? t('payment.minimumRecharge', { amount: `${paymentCurrencySymbol.value}${props.min}` }) : '')
const belowMinimumHint = computed(() => t('payment.belowMinimum', { amount: `${paymentCurrencySymbol.value}${props.min}` }))
const customBelowMinimum = computed(() => {
  if (selectionMode.value !== 'custom' || props.min <= 0 || customText.value === '') return false
  const value = Number(customText.value)
  return Number.isFinite(value) && value > 0 && value < props.min
})

function creditedFor(amount: number): string {
  return Number((amount * (props.rechargeMultiplier || 1)).toFixed(2)).toString()
}

const placeholderText = computed(() => t('payment.enterAmount'))

const AMOUNT_PATTERN = /^\d*(\.\d{0,2})?$/

function selectAmount(amt: number) {
  selectionMode.value = 'preset'
  customText.value = ''
  emit('update:modelValue', amt)
}

function activateCustom() {
  if (selectionMode.value === 'custom') return
  selectionMode.value = 'custom'
  emit('update:modelValue', null)
}

function isPresetSelected(amt: number): boolean {
  return selectionMode.value === 'preset' && props.modelValue === amt
}

function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!AMOUNT_PATTERN.test(val)) return
  selectionMode.value = 'custom'
  customText.value = val
  if (val === '') {
    emit('update:modelValue', null)
    return
  }
  const num = parseFloat(val)
  if (!isNaN(num) && num > 0) {
    emit('update:modelValue', num)
  } else {
    emit('update:modelValue', null)
  }
}

watch(() => props.modelValue, (v) => {
  const customValue = customText.value === '' ? null : Number(customText.value)
  if (selectionMode.value === 'custom' && customValue === v) {
    return
  }
  if (v !== null && filteredAmounts.value.includes(v)) {
    selectionMode.value = 'preset'
    customText.value = ''
  } else if (v !== null && String(v) !== customText.value) {
    selectionMode.value = 'custom'
    customText.value = String(v)
  } else if (v === null) {
    customText.value = ''
  }
}, { immediate: true })
</script>
