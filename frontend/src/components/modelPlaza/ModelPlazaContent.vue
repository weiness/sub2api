<template>
  <div class="mx-auto max-w-[1480px] space-y-5">
    <header v-if="!embedded">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{{ t('modelPlaza.title') }}</h1>
      <p class="mt-1.5 text-sm text-gray-500 dark:text-dark-400">{{ t('modelPlaza.description') }}</p>
    </header>

    <div v-if="descriptionHtml" class="plaza-description border-b border-gray-200 pb-5 text-sm dark:border-dark-700" v-html="descriptionHtml" />

    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <button type="button" class="btn btn-secondary shrink-0 px-3" :aria-expanded="filterOpen" @click="filterOpen = !filterOpen">
          <Icon name="filter" size="sm" />
          <span class="hidden sm:inline">{{ filterOpen ? t('availableChannels.hideFilters') : t('availableChannels.showFilters') }}</span>
          <span v-if="activeFilterCount" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] text-white">{{ activeFilterCount }}</span>
          <Icon name="chevronDown" size="xs" :class="filterOpen ? 'rotate-180' : ''" />
        </button>
        <div class="relative min-w-0 flex-1">
          <Icon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="searchQuery" type="search" :placeholder="t('availableChannels.searchPlaceholder')" class="input h-10 w-full pl-9" />
        </div>
        <span class="hidden shrink-0 text-xs text-gray-500 dark:text-dark-400 sm:inline">
          <b class="font-semibold text-gray-800 dark:text-gray-200">{{ filteredModels.length }}</b>
          {{ t('availableChannels.modelCount') }}
        </span>
      </div>

      <Transition name="filter-panel">
        <div v-if="filterOpen" class="border-y border-gray-200 py-1 dark:border-dark-700">
          <FilterRow v-model="providerFilter" :label="t('availableChannels.filters.provider')" :options="providerOptions" />
          <FilterRow v-model="modalityFilter" :label="t('availableChannels.filters.modality')" :options="modalityOptions" />
          <div v-if="activeFilterCount" class="flex justify-end py-2">
            <button type="button" class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400" @click="resetFilters">{{ t('availableChannels.filters.reset') }}</button>
          </div>
        </div>
      </Transition>
    </section>

    <div v-if="loading" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="index in 8" :key="index" class="h-44 animate-pulse rounded-md border border-gray-200 bg-gray-100 dark:border-dark-700 dark:bg-dark-800" />
    </div>
    <div v-else-if="error" class="border-y border-red-200 py-10 text-center text-sm text-red-600 dark:border-red-500/30 dark:text-red-300">{{ t('modelPlaza.loadFailed') }}</div>
    <div v-else-if="filteredModels.length" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="model in filteredModels"
        :key="model.id"
        type="button"
        class="group flex h-44 min-w-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-dark-700 dark:bg-dark-900 dark:hover:border-primary-700"
        :aria-label="t('availableChannels.openModelDetails', { model: model.id })"
        @click="selectedModel = model"
      >
        <div class="flex min-w-0 items-start gap-3">
          <PlatformIcon :platform="model.platform" size="2xl" class="text-gray-800 dark:text-gray-100" />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-1.5">
              <h2 class="truncate text-base font-semibold leading-5 text-gray-900 dark:text-white" :title="model.id">{{ model.id }}</h2>
              <button type="button" class="btn-icon-sm shrink-0 opacity-0 group-hover:opacity-100" :title="t('availableChannels.copyModelId')" @click.stop="copyModelID(model.id)">
                <Icon name="copy" size="xs" />
              </button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
              <span v-for="modality in model.modalities" :key="modality" class="model-tag">{{ modalityLabel(modality) }}</span>
            </div>
          </div>
        </div>
        <div class="mt-auto border-t border-gray-100 pt-3 dark:border-dark-800">
          <div v-if="modelSummaryItems(model).length" class="flex flex-wrap gap-x-4 gap-y-1">
            <div v-for="item in modelSummaryItems(model)" :key="item.key" class="min-w-0">
              <p class="text-[10px] text-gray-400 dark:text-dark-500">{{ item.label }}</p>
              <p class="truncate font-mono text-xs font-medium text-gray-700 dark:text-gray-200">{{ item.value }}</p>
            </div>
          </div>
          <span v-else class="text-xs text-gray-400">{{ t('availableChannels.noPricing') }}</span>
        </div>
      </button>
    </div>
    <div v-else class="border-y border-dashed border-gray-300 py-12 text-center dark:border-dark-600">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('availableChannels.emptyModels') }}</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('availableChannels.adjustFilters') }}</p>
    </div>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="selectedModel" class="fixed inset-0 z-[100000010]">
          <button class="absolute inset-0 bg-gray-950/35 backdrop-blur-[1px] dark:bg-black/60" :aria-label="t('common.close')" @click="selectedModel = null" />
          <aside class="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-hidden bg-gray-50 shadow-2xl dark:bg-dark-950">
            <header class="flex items-start gap-3 border-b border-gray-200 bg-white px-6 py-5 dark:border-dark-700 dark:bg-dark-900">
              <PlatformIcon :platform="selectedModel.platform" size="xl" class="text-gray-900 dark:text-white" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h2 class="truncate text-lg font-semibold text-gray-900 dark:text-white">{{ selectedModel.id }}</h2>
                  <button type="button" class="btn-icon-sm" :title="t('availableChannels.copyModelId')" @click="copyModelID(selectedModel.id)"><Icon name="copy" size="xs" /></button>
                </div>
                <div class="mt-1 flex flex-wrap gap-1"><span v-for="modality in selectedModel.modalities" :key="modality" class="model-tag">{{ modalityLabel(modality) }}</span></div>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" :title="t('common.close')" @click="selectedModel = null"><Icon name="x" size="md" /></button>
            </header>

            <div class="flex-1 overflow-y-auto">
              <section class="grid gap-3 px-6 py-5 sm:grid-cols-3">
                <div class="info-cell"><p class="info-label">{{ t('availableChannels.details.inputOutput') }}</p><p class="mt-1 truncate text-sm text-gray-800 dark:text-gray-200">{{ modalityFlow(selectedModel) }}</p></div>
                <div class="info-cell"><p class="info-label">{{ t('availableChannels.details.priceOverview') }}</p><p class="mt-1 truncate font-mono text-sm text-gray-800 dark:text-gray-200">{{ modelPriceOverview(selectedModel) }}</p></div>
                <div class="info-cell"><p class="info-label">{{ t('availableChannels.details.features') }}</p><p class="mt-1 truncate text-sm text-gray-800 dark:text-gray-200">{{ capabilitySummary(selectedModel.capabilities) }}</p></div>
              </section>

              <section class="px-6 pb-6">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('availableChannels.details.channelPricing') }}</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('availableChannels.details.channelPricingHint') }}</p>
                <div class="mt-4 space-y-3">
                  <div v-for="route in selectedModel.routes" :key="route.group.id" class="rounded-md border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0"><p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ route.group.name }}</p><p v-if="route.group.description" class="mt-0.5 line-clamp-2 text-[11px] text-gray-400 dark:text-dark-500">{{ route.group.description }}</p></div>
                      <span class="billing-mode-badge">{{ billingModeLabel(route.pricing?.billing_mode) }}</span>
                    </div>
                    <div v-if="routePricingItems(route.pricing).length" class="price-grid mt-3">
                      <div v-for="item in routePricingItems(route.pricing)" :key="item.key"><p class="text-[10px] text-gray-400">{{ item.label }}</p><p class="price-cell mt-0.5 text-xs">{{ item.value }}</p></div>
                    </div>
                    <p v-else class="mt-3 text-xs text-gray-500 dark:text-dark-400">{{ t('availableChannels.noPricing') }}</p>
                  </div>
                </div>
              </section>

              <section v-if="imageGroupRows(selectedModel).length" class="px-6 pb-6">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('availableChannels.details.groupImagePricing') }}</h3>
                <div class="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900">
                  <div class="min-w-[560px]">
                    <div class="image-grid bg-pink-50/70 px-4 py-2.5 text-[11px] font-medium text-pink-800 dark:bg-pink-900/15 dark:text-pink-300"><span>{{ t('availableChannels.details.group') }}</span><span>{{ t('availableChannels.details.rateMultiplier') }}</span><span>1K</span><span>2K</span><span>4K</span></div>
                    <div v-for="group in imageGroupRows(selectedModel)" :key="group.id" class="image-grid border-t border-gray-100 px-4 py-3 text-xs dark:border-dark-700"><span class="truncate font-medium">{{ group.name }}</span><span class="price-cell">{{ imageRateLabel(group) }}</span><span class="price-cell">{{ formatGroupImagePrice(group.image_price_1k) }}</span><span class="price-cell">{{ formatGroupImagePrice(group.image_price_2k) }}</span><span class="price-cell">{{ formatGroupImagePrice(group.image_price_4k) }}</span></div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import { BILLING_MODE_IMAGE, BILLING_MODE_PER_REQUEST, type BillingMode } from '@/constants/channel'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import type { UserSupportedModelPricing } from '@/api/channels'
import { aggregatePlazaModels, type PlazaModelCatalogItem } from '@/utils/modelPlazaModels'
import { useClipboard } from '@/composables/useClipboard'

const props = defineProps<{ response: ModelPlazaResponse | null; loading: boolean; error?: boolean; embedded?: boolean }>()
const { t } = useI18n()
const { copyToClipboard } = useClipboard()
const filterOpen = ref(false)
const searchQuery = ref('')
const providerFilter = ref('all')
const modalityFilter = ref('all')
const selectedModel = ref<PlazaModelCatalogItem | null>(null)
const models = computed(() => aggregatePlazaModels(props.response))
const descriptionHtml = computed(() => props.response?.description?.trim() ? DOMPurify.sanitize(marked.parse(props.response.description) as string) : '')

interface FilterOption { value: string; label: string }
const providerOptions = computed<FilterOption[]>(() => [{ value: 'all', label: t('availableChannels.filters.all') }, ...Array.from(new Set(models.value.map((model) => model.platform))).map((value) => ({ value, label: value === 'anthropic' ? 'Anthropic' : value === 'openai' ? 'OpenAI' : value === 'gemini' ? 'Gemini' : value }))])
const modalityOptions = computed<FilterOption[]>(() => [{ value: 'all', label: t('availableChannels.filters.all') }, ...['text', 'image', 'audio', 'video', 'pdf'].map((value) => ({ value, label: modalityLabel(value) }))])
const activeFilterCount = computed(() => [providerFilter.value, modalityFilter.value].filter((value) => value !== 'all').length)
const filteredModels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return models.value.filter((model) => (!query || model.id.toLowerCase().includes(query)) && (providerFilter.value === 'all' || model.platform === providerFilter.value) && (modalityFilter.value === 'all' || model.modalities.includes(modalityFilter.value)))
})

const FilterRow = defineComponent({
  props: { modelValue: { type: String, required: true }, label: { type: String, required: true }, options: { type: Array as PropType<FilterOption[]>, required: true } },
  emits: ['update:modelValue'],
  setup(rowProps, { emit }) {
    return () => h('div', { class: 'flex flex-col gap-2 border-b border-gray-100 py-2.5 last:border-0 sm:flex-row sm:items-center dark:border-dark-800' }, [
      h('span', { class: 'w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-dark-400' }, rowProps.label),
      h('div', { class: 'flex flex-wrap gap-1.5' }, rowProps.options.map((option) => h('button', { type: 'button', class: ['rounded-md px-2.5 py-1 text-xs transition-colors', rowProps.modelValue === option.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-800'], onClick: () => emit('update:modelValue', option.value) }, option.label))),
    ])
  },
})

function modalityLabel(value: string) { return ['text', 'image', 'audio', 'video', 'pdf'].includes(value) ? t(`availableChannels.modalities.${value}`) : value }
function formatPrice(value: number | null | undefined) { return value == null ? '-' : `$${(value * 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 })}/1M` }
function formatFlatPrice(value: number | null | undefined, unit: string) { return value == null ? '-' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}${unit}` }
function billingModeLabel(mode: BillingMode | undefined) { return t(mode === BILLING_MODE_IMAGE ? 'availableChannels.pricing.billingModeImage' : mode === BILLING_MODE_PER_REQUEST ? 'availableChannels.pricing.billingModePerRequest' : 'availableChannels.pricing.billingModeToken') }
interface PriceItem { key: string; label: string; value: string }
function routePricingItems(pricing: UserSupportedModelPricing | null): PriceItem[] {
  if (!pricing) return []
  const items: PriceItem[] = []
  const add = (key: string, label: string, value: number | null) => { if (value != null) items.push({ key, label: t(label), value: formatPrice(value) }) }
  add('input', 'availableChannels.pricing.inputPrice', pricing.input_price)
  add('output', 'availableChannels.pricing.outputPrice', pricing.output_price)
  add('cacheWrite', 'availableChannels.pricing.cacheWritePrice', pricing.cache_write_price)
  add('cacheRead', 'availableChannels.pricing.cacheReadPrice', pricing.cache_read_price)
  add('imageInput', 'availableChannels.pricing.imageInputPrice', pricing.image_input_price)
  add('imageOutput', 'availableChannels.pricing.imageOutputPrice', pricing.image_output_price)
  if (pricing.per_request_price != null) items.push({ key: 'perRequest', label: t(pricing.billing_mode === BILLING_MODE_IMAGE ? 'availableChannels.pricing.perImagePrice' : 'availableChannels.pricing.perRequestPrice'), value: formatFlatPrice(pricing.per_request_price, t(pricing.billing_mode === BILLING_MODE_IMAGE ? 'availableChannels.pricing.unitPerImage' : 'availableChannels.pricing.unitPerRequestShort')) })
  return items
}
function modelSummaryItems(model: PlazaModelCatalogItem) {
  const image = model.routes.some((route) => route.pricing?.billing_mode === BILLING_MODE_IMAGE)
  const values = image ? [['perRequest', 'availableChannels.pricing.perImagePrice', model.displayPricing.perRequest, true], ['imageOutput', 'availableChannels.pricing.imageOutputPrice', model.displayPricing.imageOutput, false]] as const : [['input', 'availableChannels.pricing.inputPrice', model.displayPricing.input, false], ['output', 'availableChannels.pricing.outputPrice', model.displayPricing.output, false]] as const
  return values.filter((item) => item[2] != null).map(([key, label, value, flat]) => ({ key, label: t(label), value: flat ? formatFlatPrice(value, t(image ? 'availableChannels.pricing.unitPerImage' : 'availableChannels.pricing.unitPerRequestShort')) : formatPrice(value) }))
}
function modelPriceOverview(model: PlazaModelCatalogItem) { const items = modelSummaryItems(model); return items.length ? items.map((item) => item.value).join(' / ') : t('availableChannels.noPricing') }
function modalityFlow(model: PlazaModelCatalogItem) { return `${model.modalities.map(modalityLabel).join('、')} → ${model.outputModalities.map(modalityLabel).join('、')}` }
function capabilitySummary(values: string[]) { return values.length ? values.slice(0, 4).map((value) => t(`availableChannels.capabilities.${value}`)).join('、') : t('availableChannels.details.notAvailable') }
function imageGroupRows(model: PlazaModelCatalogItem): ModelPlazaGroup[] { return model.routes.map((route) => route.group).filter((group, index, all) => group.allow_image_generation && all.findIndex((item) => item.id === group.id) === index) }
function imageRateLabel(group: ModelPlazaGroup) { return `${(group.image_rate_independent ? group.image_rate_multiplier : (group.user_rate_multiplier ?? group.rate_multiplier)).toLocaleString(undefined, { maximumFractionDigits: 4 })}×` }
function formatGroupImagePrice(value: number | null) { return value == null ? t('availableChannels.pricing.modelDefault') : formatFlatPrice(value, t('availableChannels.pricing.unitPerImage')) }
function resetFilters() { providerFilter.value = 'all'; modalityFilter.value = 'all' }
async function copyModelID(id: string) { await copyToClipboard(id, t('availableChannels.modelIdCopied')) }
function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') selectedModel.value = null }
watch(selectedModel, (model) => { document.body.style.overflow = model ? 'hidden' : '' })
onMounted(() => document.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => { document.body.style.overflow = ''; document.removeEventListener('keydown', closeOnEscape) })
</script>

<style scoped>
.model-tag { @apply shrink-0 rounded-sm bg-gray-100 px-1.5 py-px text-[10px] leading-4 text-gray-500 dark:bg-dark-800 dark:text-dark-300; }
.info-cell { @apply h-16 min-w-0 overflow-hidden border-b border-gray-200 px-1 py-2.5 dark:border-dark-700; }
.info-label { @apply text-xs font-medium text-gray-500 dark:text-dark-400; }
.price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px 16px; }
.image-grid { display: grid; grid-template-columns: minmax(150px, 1.3fr) minmax(80px, .7fr) repeat(3, minmax(80px, .7fr)); gap: 12px; }
.billing-mode-badge { @apply shrink-0 rounded-sm bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300; }
.price-cell { @apply font-mono text-gray-700 dark:text-gray-300; }
.plaza-description { line-height: 1.7; overflow-wrap: anywhere; }
.plaza-description :deep(a) { @apply text-primary-600 underline dark:text-primary-300; }
.plaza-description :deep(ul) { @apply list-disc pl-5; }
.drawer-enter-active, .drawer-leave-active { transition: opacity 180ms ease; }
.drawer-enter-active aside, .drawer-leave-active aside { transition: transform 180ms ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from aside, .drawer-leave-to aside { transform: translateX(100%); }
.filter-panel-enter-active, .filter-panel-leave-active { transition: opacity 150ms ease; }
.filter-panel-enter-from, .filter-panel-leave-to { opacity: 0; }
</style>
