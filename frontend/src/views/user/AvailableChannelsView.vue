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
          <div class="pointer-events-none relative z-10 mt-4 flex items-center justify-start gap-1.5 text-xs text-gray-500 dark:text-dark-400">
            <span class="flex shrink-0 items-center whitespace-nowrap">
              {{ t('availableChannels.pricing.inputPrice') }}
              <PriceValue :value="model.displayPricing.input" />
            </span>
            <span aria-hidden="true">·</span>
            <span class="flex shrink-0 items-center whitespace-nowrap">
              {{ t('availableChannels.pricing.outputPrice') }}
              <PriceValue :value="model.displayPricing.output" />
            </span>
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
                    <p class="info-label">{{ t('availableChannels.details.inputOutputPrice') }}</p>
                    <p class="mt-1.5 whitespace-nowrap font-mono text-sm font-semibold leading-5 text-gray-900 dark:text-white">
                      {{ formatPrice(selectedModel.displayPricing.input) }}/{{ formatPrice(selectedModel.displayPricing.output) }}
                      <span class="font-sans text-xs font-normal text-gray-500 dark:text-dark-400">per 1M</span>
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
                <div class="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-900">
                  <div class="min-w-[700px]">
                    <div class="channel-grid bg-primary-50/70 px-4 py-2.5 text-[11px] font-medium text-primary-800 dark:bg-primary-900/15 dark:text-primary-300">
                      <span>{{ t('availableChannels.details.channel') }}</span>
                      <span>{{ t('availableChannels.pricing.inputPrice') }}/1M</span>
                      <span>{{ t('availableChannels.pricing.outputPrice') }}/1M</span>
                      <span>{{ t('availableChannels.pricing.cacheWritePrice') }}/1M</span>
                      <span>{{ t('availableChannels.pricing.cacheReadPrice') }}/1M</span>
                    </div>
                    <div
                      v-for="route in selectedModel.routes"
                      :key="`${route.channelName}-${route.platform}`"
                      class="channel-grid items-center border-t border-gray-100 px-4 py-3.5 text-xs transition-colors hover:bg-primary-50/40 dark:border-dark-700 dark:hover:bg-primary-900/10"
                    >
                      <div class="flex min-w-0 items-center gap-2.5">
                        <PlatformIcon :platform="normalizedPlatform(route.platform)" size="md" class="text-gray-700 dark:text-gray-300" />
                        <div class="min-w-0">
                          <p class="truncate font-medium text-gray-900 dark:text-gray-100">{{ route.channelName }}</p>
                          <p v-if="route.channelDescription" class="mt-0.5 truncate text-[11px] text-gray-400 dark:text-dark-500">{{ route.channelDescription }}</p>
                        </div>
                      </div>
                      <span class="price-cell">{{ formatPrice(route.pricing?.input_price) }}</span>
                      <span class="price-cell">{{ formatPrice(route.pricing?.output_price) }}</span>
                      <span class="price-cell">{{ formatPrice(route.pricing?.cache_write_price) }}</span>
                      <span class="price-cell">{{ formatPrice(route.pricing?.cache_read_price) }}</span>
                    </div>
                  </div>
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

const PriceValue = defineComponent({
  props: { value: { type: Number as PropType<number | null>, default: null } },
  setup(props) {
    return () => h('span', { class: 'ml-1 shrink-0 font-mono' }, pricePerMillion(props.value))
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

.channel-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.45fr) repeat(4, minmax(92px, 0.75fr));
  gap: 12px;
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
