<template>
  <AppLayout>
    <div class="mx-auto max-w-[1480px] space-y-5">
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-secondary shrink-0 px-3"
            :aria-expanded="filterOpen"
            @click="filterOpen = !filterOpen"
          >
            <Icon name="filter" size="sm" />
            <span class="hidden sm:inline">
              {{ filterOpen ? t('availableChannels.hideFilters') : t('availableChannels.showFilters') }}
            </span>
            <span
              v-if="activeFilterCount"
              class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] text-white"
            >
              {{ activeFilterCount }}
            </span>
            <Icon
              name="chevronDown"
              size="xs"
              class="transition-transform"
              :class="filterOpen ? 'rotate-180' : ''"
            />
          </button>

          <label class="relative min-w-0 flex-1 sm:max-w-md">
            <Icon
              name="search"
              size="sm"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('availableChannels.searchPlaceholder')"
              class="input h-full pl-9"
            />
          </label>

          <span class="ml-auto shrink-0 whitespace-nowrap text-sm text-gray-500 dark:text-dark-400">
            <b class="font-semibold text-gray-800 dark:text-gray-200">{{ filteredModels.length }}</b>
            {{ t('availableChannels.modelCount') }}
          </span>
        </div>

        <div
          class="grid transition-[grid-template-rows,opacity] duration-200"
          :class="filterOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
        >
          <div class="overflow-hidden">
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-900">
              <FilterRow
                v-model="providerFilter"
                :label="t('availableChannels.filters.provider')"
                :options="providerOptions"
              />
              <FilterRow
                v-model="modalityFilter"
                :label="t('availableChannels.filters.modality')"
                :options="modalityOptions"
              />
              <div v-if="activeFilterCount" class="mt-2 flex justify-end">
                <button
                  type="button"
                  class="text-xs text-gray-500 hover:text-primary-600 dark:text-dark-400 dark:hover:text-primary-400"
                  @click="resetFilters"
                >
                  {{ t('availableChannels.filters.reset') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="loading && models.length === 0" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div v-for="index in 8" :key="index" class="h-[108px] animate-pulse rounded-lg bg-gray-200/70 dark:bg-dark-800" />
      </div>

      <div v-else-if="filteredModels.length" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="model in filteredModels"
          :key="model.id"
          class="group relative rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-px hover:border-gray-300 hover:shadow-md dark:border-dark-700 dark:bg-dark-900 dark:hover:border-dark-600"
        >
          <button
            type="button"
            class="absolute inset-0 z-0 cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/40"
            :aria-label="t('availableChannels.openModelDetails', { model: model.id })"
            @click="selectedModel = model"
          />
          <div class="pointer-events-none relative z-10 flex h-11 items-center gap-4">
            <PlatformIcon :platform="model.platform" size="2xl" class="text-gray-800 dark:text-gray-100" />
            <div class="flex h-11 min-w-0 flex-1 flex-col justify-center">
              <div class="flex h-[22px] items-center justify-between gap-2">
                <h2 class="truncate text-base font-semibold leading-5 text-gray-900 dark:text-white" :title="model.id">
                  {{ model.id }}
                </h2>
                <button
                  type="button"
                  class="pointer-events-auto -mr-1 shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-gray-200"
                  :title="t('availableChannels.copyModelId')"
                  @pointerdown.stop
                  @click.stop="copyModelID(model.id)"
                >
                  <Icon name="copy" size="sm" />
                </button>
              </div>
              <div class="mt-1 flex h-[18px] items-center gap-1 overflow-hidden">
                <span v-for="modality in model.modalities" :key="modality" class="model-tag">
                  {{ modalityLabel(modality) }}
                </span>
              </div>
            </div>
          </div>
          <div class="pointer-events-none relative z-10 mt-4 flex min-h-4 items-center justify-start gap-1.5 overflow-hidden text-xs text-gray-500 dark:text-dark-400">
            <template v-for="(item, index) in modelSummaryItems(model)" :key="item.key">
              <span v-if="index" aria-hidden="true">·</span>
              <span class="flex min-w-0 shrink items-center whitespace-nowrap">
                {{ item.label }}
                <span class="ml-1 truncate font-mono">{{ item.value }}</span>
              </span>
            </template>
            <span v-if="modelSummaryItems(model).length === 0">{{ t('availableChannels.noPricing') }}</span>
          </div>
        </article>
      </div>

      <div v-else class="rounded-lg border border-dashed border-gray-300 py-20 text-center dark:border-dark-700">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('availableChannels.emptyModels') }}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('availableChannels.adjustFilters') }}</p>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="selectedModel" class="fixed inset-0 z-[100000010]" @keydown.esc="selectedModel = null">
          <button class="absolute inset-0 bg-gray-950/35 backdrop-blur-[1px] dark:bg-black/60" :aria-label="t('common.close')" @click="selectedModel = null" />
          <aside class="absolute inset-y-0 right-0 flex w-full max-w-[900px] flex-col bg-gray-50 shadow-2xl dark:bg-dark-950" role="dialog" aria-modal="true">
            <header class="flex h-[76px] shrink-0 items-center gap-4 border-b border-primary-100 bg-white px-6 shadow-sm dark:border-primary-900/40 dark:bg-dark-950">
              <PlatformIcon :platform="selectedModel.platform" size="xl" class="text-gray-900 dark:text-white" />
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <h2 class="min-w-0 truncate text-xl font-semibold text-gray-900 dark:text-white">
                  {{ selectedModel.id }}
                </h2>
                <button
                  type="button"
                  class="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:text-dark-400 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                  :title="t('availableChannels.copyModelId')"
                  @pointerdown.stop
                  @click.stop="copyModelID(selectedModel.id)"
                >
                  <Icon name="copy" size="sm" />
                </button>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" :title="t('common.close')" @click="selectedModel = null">
                <Icon name="x" size="md" />
              </button>
            </header>

            <div class="flex-1 overflow-y-auto bg-gray-50/80 dark:bg-dark-950">
              <section class="px-6 py-5">
                <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <div class="info-cell">
                    <p class="info-label">{{ t('availableChannels.details.inputOutput') }}</p>
                    <p
                      class="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs font-medium leading-5 text-gray-900 dark:text-white"
                      :title="modalityFlow(selectedModel)"
                    >
                      <span class="truncate">{{ selectedModel.modalities.map(modalityLabel).join(t('availableChannels.details.separator')) }}</span>
                      <Icon name="arrowRight" size="xs" class="shrink-0 text-gray-400" />
                      <span class="truncate">{{ selectedModel.outputModalities.map(modalityLabel).join(t('availableChannels.details.separator')) }}</span>
                    </p>
                  </div>
                  <div class="info-cell">
                    <p class="info-label">{{ t('availableChannels.details.priceOverview') }}</p>
                    <p class="mt-1.5 truncate whitespace-nowrap font-mono text-sm font-semibold leading-5 text-gray-900 dark:text-white">
                      {{ modelPriceOverview(selectedModel) }}
                    </p>
                  </div>
                  <div class="info-cell">
                    <p class="info-label">{{ t('availableChannels.details.toolCalling') }}</p>
                    <p
                      class="mt-1.5 truncate whitespace-nowrap text-xs font-medium leading-5 text-gray-900 dark:text-white"
                      :title="capabilitySummary(selectedModel.capabilities, 'tools')"
                    >
                      {{ capabilitySummary(selectedModel.capabilities, 'tools') }}
                    </p>
                  </div>
                  <div class="info-cell">
                    <p class="info-label">{{ t('availableChannels.details.features') }}</p>
                    <p
                      class="mt-1.5 truncate whitespace-nowrap text-xs font-medium leading-5 text-gray-900 dark:text-white"
                      :title="capabilitySummary(selectedModel.capabilities, 'features')"
                    >
                      {{ capabilitySummary(selectedModel.capabilities, 'features', 3) }}
                    </p>
                  </div>
                </div>
              </section>

              <section class="px-6 pb-6 pt-4">
                <h3 class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <span class="h-4 w-1 rounded-full bg-primary-500" aria-hidden="true" />
                  {{ t('availableChannels.details.channelPricing') }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('availableChannels.details.channelPricingHint') }}</p>
                <div class="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-900">
                  <article
                    v-for="route in selectedModel.routes"
                    :key="`${route.channelName}-${route.platform}`"
                    class="border-t border-gray-100 px-4 py-4 first:border-t-0 dark:border-dark-700"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2.5">
                        <PlatformIcon :platform="normalizedPlatform(route.platform)" size="md" class="shrink-0 text-gray-700 dark:text-gray-300" />
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ route.channelName }}</p>
                          <p v-if="route.channelDescription" class="mt-0.5 truncate text-[11px] text-gray-400 dark:text-dark-500">{{ route.channelDescription }}</p>
                        </div>
                      </div>
                      <span class="billing-mode-badge">{{ billingModeLabel(route.pricing?.billing_mode) }}</span>
                    </div>

                    <div v-if="routePricingItems(route.pricing).length" class="price-grid mt-3">
                      <div v-for="item in routePricingItems(route.pricing)" :key="item.key" class="min-w-0">
                        <p class="text-[11px] text-gray-500 dark:text-dark-400">{{ item.label }}</p>
                        <p class="mt-0.5 truncate font-mono text-xs font-medium text-gray-800 dark:text-gray-200">{{ item.value }}</p>
                      </div>
                    </div>
                    <p v-else class="mt-3 text-xs text-gray-500 dark:text-dark-400">{{ t('availableChannels.noPricing') }}</p>

                    <div v-if="route.pricing?.intervals?.length" class="mt-3 border-t border-gray-100 pt-3 dark:border-dark-700">
                      <p class="mb-2 text-[11px] font-medium text-gray-500 dark:text-dark-400">{{ t('availableChannels.pricing.intervals') }}</p>
                      <div class="space-y-2">
                        <div v-for="(interval, index) in route.pricing.intervals" :key="index" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span class="w-24 shrink-0 font-medium text-gray-700 dark:text-gray-300">{{ intervalLabel(interval) }}</span>
                          <span v-for="item in intervalPricingItems(interval, route.pricing.billing_mode)" :key="item.key" class="whitespace-nowrap text-gray-500 dark:text-dark-400">
                            {{ item.label }} <b class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ item.value }}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <p class="mt-3 flex items-center gap-1.5 text-[11px] leading-5 text-orange-600 dark:text-orange-400">
                  <Icon name="infoCircle" size="xs" class="shrink-0" />
                  <span class="min-w-0">
                    {{ selectedModel.displayPricing.input == null
                      ? t('availableChannels.details.billingNoteGeneric')
                      : t('availableChannels.details.billingNote', { price: formatPrice(selectedModel.displayPricing.input) }) }}
                  </span>
                </p>
              </section>

              <section v-if="imageGroupRows(selectedModel).length" class="px-6 pb-6">
                <h3 class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <span class="h-4 w-1 rounded-full bg-pink-500" aria-hidden="true" />
                  {{ t('availableChannels.details.groupImagePricing') }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('availableChannels.details.groupImagePricingHint') }}</p>
                <div class="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-900">
                  <div class="min-w-[620px]">
                    <div class="image-group-grid bg-pink-50/70 px-4 py-2.5 text-[11px] font-medium text-pink-800 dark:bg-pink-900/15 dark:text-pink-300">
                      <span>{{ t('availableChannels.details.group') }}</span>
                      <span>{{ t('availableChannels.details.rateMultiplier') }}</span>
                      <span>1K</span>
                      <span>2K</span>
                      <span>4K</span>
                    </div>
                    <div v-for="row in imageGroupRows(selectedModel)" :key="`${row.channelName}-${row.group.id}`" class="image-group-grid items-center border-t border-gray-100 px-4 py-3 text-xs dark:border-dark-700">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ row.group.name }}</p>
                        <p class="truncate text-[11px] text-gray-400 dark:text-dark-500">{{ row.channelName }}</p>
                      </div>
                      <span class="price-cell">{{ imageRateLabel(row.group) }}</span>
                      <span class="price-cell">{{ formatGroupImagePrice(row.group.image_price_1k) }}</span>
                      <span class="price-cell">{{ formatGroupImagePrice(row.group.image_price_2k) }}</span>
                      <span class="price-cell">{{ formatGroupImagePrice(row.group.image_price_4k) }}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import userChannelsAPI, { type UserAvailableChannel } from '@/api/channels'
import type { UserAvailableGroup, UserPricingInterval, UserSupportedModelPricing } from '@/api/channels'
import { BILLING_MODE_IMAGE, BILLING_MODE_PER_REQUEST, type BillingMode } from '@/constants/channel'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import { aggregateAvailableModels, type AvailableModelCatalogItem } from '@/utils/availableModels'
import { useClipboard } from '@/composables/useClipboard'
import type { GroupPlatform } from '@/types'

interface FilterOption { value: string; label: string }

const { t } = useI18n()
const appStore = useAppStore()
const { copyToClipboard } = useClipboard()
const channels = ref<UserAvailableChannel[]>([])
const loading = ref(false)
const filterOpen = ref(false)
const searchQuery = ref('')
const providerFilter = ref('all')
const modalityFilter = ref('all')
const selectedModel = ref<AvailableModelCatalogItem | null>(null)

const models = computed(() => aggregateAvailableModels(channels.value))
const providerOptions = computed<FilterOption[]>(() => [
  { value: 'all', label: t('availableChannels.filters.all') },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
])
const modalityOptions = computed<FilterOption[]>(() => [
  { value: 'all', label: t('availableChannels.filters.all') },
  ...['text', 'image', 'audio', 'video', 'pdf'].map((value) => ({ value, label: modalityLabel(value) })),
])
const activeFilterCount = computed(() => [providerFilter.value, modalityFilter.value].filter((value) => value !== 'all').length)
const filteredModels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return models.value.filter((model) => {
    if (query && !model.id.toLowerCase().includes(query)) return false
    if (providerFilter.value !== 'all' && model.platform !== providerFilter.value) return false
    if (modalityFilter.value !== 'all' && !model.modalities.includes(modalityFilter.value)) return false
    return true
  })
})

const FilterRow = defineComponent({
  props: {
    modelValue: { type: String, required: true },
    label: { type: String, required: true },
    options: { type: Array as PropType<FilterOption[]>, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex flex-col gap-2 border-b border-gray-100 py-2.5 last:border-0 sm:flex-row sm:items-center dark:border-dark-800' }, [
      h('span', { class: 'w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-dark-400' }, props.label),
      h('div', { class: 'flex flex-wrap gap-1.5' }, props.options.map((option) => h('button', {
        type: 'button',
        class: ['rounded-md px-2.5 py-1 text-xs transition-colors', props.modelValue === option.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-800'],
        onClick: () => emit('update:modelValue', option.value),
      }, option.label))),
    ])
  },
})

function modalityLabel(modality: string): string {
  const normalized = modality.trim().toLowerCase()
  return ['text', 'image', 'audio', 'video', 'pdf'].includes(normalized)
    ? t(`availableChannels.modalities.${normalized}`)
    : modality
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return '-'
  const scaled = value * 1_000_000
  return `$${scaled.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
}

function pricePerMillion(value: number | null | undefined): string {
  return value == null ? '-' : `${formatPrice(value)}/1M`
}

interface PriceDisplayItem {
  key: string
  label: string
  value: string
}

function formatFlatPrice(value: number | null | undefined, unit: string): string {
  if (value == null) return '-'
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}${unit}`
}

function billingModeLabel(mode: BillingMode | undefined): string {
  switch (mode) {
    case BILLING_MODE_IMAGE:
      return t('availableChannels.pricing.billingModeImage')
    case BILLING_MODE_PER_REQUEST:
      return t('availableChannels.pricing.billingModePerRequest')
    default:
      return t('availableChannels.pricing.billingModeToken')
  }
}

function routePricingItems(pricing: UserSupportedModelPricing | null): PriceDisplayItem[] {
  if (!pricing) return []
  const items: PriceDisplayItem[] = []
  const addToken = (key: string, labelKey: string, value: number | null) => {
    if (value != null) items.push({ key, label: t(labelKey), value: pricePerMillion(value) })
  }

  addToken('input', 'availableChannels.pricing.inputPrice', pricing.input_price)
  addToken('output', 'availableChannels.pricing.outputPrice', pricing.output_price)
  addToken('cacheWrite', 'availableChannels.pricing.cacheWritePrice', pricing.cache_write_price)
  addToken('cacheRead', 'availableChannels.pricing.cacheReadPrice', pricing.cache_read_price)
  addToken('imageInput', 'availableChannels.pricing.imageInputPrice', pricing.image_input_price)
  addToken('imageOutput', 'availableChannels.pricing.imageOutputPrice', pricing.image_output_price)

  if (pricing.per_request_price != null) {
    items.push({
      key: 'perRequest',
      label: t(pricing.billing_mode === BILLING_MODE_IMAGE
        ? 'availableChannels.pricing.perImagePrice'
        : 'availableChannels.pricing.perRequestPrice'),
      value: formatFlatPrice(
        pricing.per_request_price,
        t(pricing.billing_mode === BILLING_MODE_IMAGE
          ? 'availableChannels.pricing.unitPerImage'
          : 'availableChannels.pricing.unitPerRequestShort'),
      ),
    })
  }
  return items
}

function intervalLabel(interval: UserPricingInterval): string {
  if (interval.tier_label) return interval.tier_label
  const max = interval.max_tokens == null ? '∞' : interval.max_tokens.toLocaleString()
  return `${interval.min_tokens.toLocaleString()}–${max}`
}

function intervalPricingItems(interval: UserPricingInterval, mode: BillingMode): PriceDisplayItem[] {
  return routePricingItems({
    billing_mode: mode,
    input_price: interval.input_price,
    output_price: interval.output_price,
    cache_write_price: interval.cache_write_price,
    cache_read_price: interval.cache_read_price,
    image_input_price: null,
    image_output_price: null,
    per_request_price: interval.per_request_price,
    intervals: [],
  })
}

function modelSummaryItems(model: AvailableModelCatalogItem): PriceDisplayItem[] {
  const imageMode = model.routes.some((route) => route.pricing?.billing_mode === BILLING_MODE_IMAGE)
  const candidates = imageMode
    ? [
        { key: 'perRequest', label: t('availableChannels.pricing.perImagePrice'), value: model.displayPricing.perRequest, flat: true },
        { key: 'imageOutput', label: t('availableChannels.pricing.imageOutputPrice'), value: model.displayPricing.imageOutput, flat: false },
      ]
    : [
        { key: 'input', label: t('availableChannels.pricing.inputPrice'), value: model.displayPricing.input, flat: false },
        { key: 'output', label: t('availableChannels.pricing.outputPrice'), value: model.displayPricing.output, flat: false },
        { key: 'perRequest', label: t('availableChannels.pricing.perRequestPrice'), value: model.displayPricing.perRequest, flat: true },
      ]

  return candidates
    .filter((item): item is typeof item & { value: number } => item.value != null)
    .slice(0, 2)
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: item.flat
        ? formatFlatPrice(item.value, t(imageMode ? 'availableChannels.pricing.unitPerImage' : 'availableChannels.pricing.unitPerRequestShort'))
        : pricePerMillion(item.value),
    }))
}

function modelPriceOverview(model: AvailableModelCatalogItem): string {
  const items = modelSummaryItems(model)
  return items.length ? items.map((item) => item.value).join(' / ') : t('availableChannels.noPricing')
}

interface ImageGroupRow {
  channelName: string
  group: UserAvailableGroup
}

function imageGroupRows(model: AvailableModelCatalogItem): ImageGroupRow[] {
  const imageCapable = model.outputModalities.includes('image') ||
    model.routes.some((route) => route.pricing?.billing_mode === BILLING_MODE_IMAGE)
  if (!imageCapable) return []

  const seen = new Set<string>()
  const rows: ImageGroupRow[] = []
  for (const route of model.routes) {
    for (const group of route.groups) {
      const key = `${route.channelName}:${group.id}`
      if (!group.allow_image_generation || seen.has(key)) continue
      seen.add(key)
      rows.push({ channelName: route.channelName, group })
    }
  }
  return rows
}

function formatGroupImagePrice(value: number | null): string {
  return value == null
    ? t('availableChannels.pricing.modelDefault')
    : formatFlatPrice(value, t('availableChannels.pricing.unitPerImage'))
}

function imageRateLabel(group: UserAvailableGroup): string {
  const rate = group.image_rate_independent ? group.image_rate_multiplier : group.rate_multiplier
  return `${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}×`
}

function capabilityLabel(capability: string): string {
  return t(`availableChannels.capabilities.${capability}`)
}

function modalityFlow(model: AvailableModelCatalogItem): string {
  const separator = t('availableChannels.details.separator')
  return `${model.modalities.map(modalityLabel).join(separator)} → ${model.outputModalities.map(modalityLabel).join(separator)}`
}

function capabilitySummary(capabilities: string[], group: 'tools' | 'features', limit = Number.POSITIVE_INFINITY): string {
  const allToolKeys = new Set(['function_calling', 'parallel_function_calling', 'web_search', 'code_execution', 'computer_use', 'file_search', 'url_context'])
  const visibleToolKeys = new Set(['function_calling', 'web_search'])
  const selected = capabilities.filter((capability) => group === 'tools' ? visibleToolKeys.has(capability) : !allToolKeys.has(capability))
  return selected.length
    ? selected.slice(0, limit).map(capabilityLabel).join(t('availableChannels.details.separator'))
    : t('availableChannels.details.notAvailable')
}

function normalizedPlatform(platform: string): GroupPlatform {
  return ['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'composite'].includes(platform)
    ? platform as GroupPlatform
    : 'composite'
}

async function copyModelID(modelID: string) {
  await copyToClipboard(modelID, t('availableChannels.modelIdCopied'))
}

function resetFilters() {
  providerFilter.value = 'all'
  modalityFilter.value = 'all'
}

async function loadChannels() {
  loading.value = true
  try {
    channels.value = await userChannelsAPI.getAvailable()
  } catch (err: unknown) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
  } finally {
    loading.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') selectedModel.value = null
}

watch(selectedModel, (model) => {
  document.body.style.overflow = model ? 'hidden' : ''
})

onMounted(() => {
  loadChannels()
  document.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.model-tag {
  @apply shrink-0 rounded-sm bg-gray-100 px-1.5 py-px text-[10px] leading-4 text-gray-500 dark:bg-dark-800 dark:text-dark-300;
}

.info-cell {
  @apply h-[64px] min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-dark-700 dark:bg-dark-900;
}

.info-label {
  @apply text-xs font-medium text-gray-500 dark:text-dark-400;
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px 16px;
}

.image-group-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(90px, 0.7fr) repeat(3, minmax(95px, 0.75fr));
  gap: 12px;
}

.billing-mode-badge {
  @apply shrink-0 rounded-sm bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300;
}

.price-cell {
  @apply font-mono text-gray-700 dark:text-gray-300;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 180ms ease;
}

.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 180ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(100%);
}
</style>
