<template>
  <div class="space-y-4">
    <!-- Quick Amount Buttons -->
    <div>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <label class="text-base font-semibold text-gray-900 dark:text-white">
          {{ t('payment.selectPaymentAmount') }}
        </label>
        <span class="rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {{ t('payment.currentRechargeRate', { currency: normalizedCurrency, usd: formattedMultiplier }) }}
        </span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="amt in filteredAmounts"
          :key="amt"
          type="button"
          :class="[
            'relative h-12 rounded-lg border px-4 text-center font-bold transition-colors',
            modelValue === amt
              ? 'border-[#0fad76] bg-[#ebfaf4] text-[#07885b] shadow-[inset_0_0_0_1px_rgba(15,173,118,0.08)] dark:border-[#2fd398] dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200 dark:hover:border-dark-500',
          ]"
          @click="selectAmount(amt)"
        >
          {{ paymentCurrencySymbol }}{{ amt }}
          <span
            v-if="modelValue === amt"
            data-testid="amount-selected-indicator"
            class="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0fad76] text-white"
          >
            <Icon name="check" size="xs" :stroke-width="3" />
          </span>
        </button>
      </div>
    </div>

    <!-- Custom Amount Input -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ t('payment.customPaymentAmount') }}
      </label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-500">
          {{ paymentCurrencySymbol }}
        </span>
        <input
          type="text"
          inputmode="decimal"
          :value="customText"
          :placeholder="placeholderText"
          class="input w-full py-3 pl-8 pr-4"
          @input="handleInput"
        />
      </div>
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

const placeholderText = computed(() => {
  if (props.min > 0 && props.max > 0) return `${props.min} - ${props.max}`
  if (props.min > 0) return `≥ ${props.min}`
  if (props.max > 0) return `≤ ${props.max}`
  return t('payment.enterAmount')
})

const AMOUNT_PATTERN = /^\d*(\.\d{0,2})?$/

function selectAmount(amt: number) {
  customText.value = String(amt)
  emit('update:modelValue', amt)
}

function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!AMOUNT_PATTERN.test(val)) return
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
  if (v !== null && String(v) !== customText.value) {
    customText.value = String(v)
  }
}, { immediate: true })
</script>
