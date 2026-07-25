<template>
  <AppLayout>
    <TablePageLayout>
      <template #filters>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 sm:max-w-64">
            <input v-model="titleFilter" type="search" class="input" :placeholder="t('admin.faqs.searchPlaceholder')" />
          </div>
          <Select v-model="enabledFilter" :options="statusOptions" class="w-40" @change="handleFilterChange" />
          <div class="flex flex-1 items-center justify-end gap-2">
            <button class="btn btn-secondary" :disabled="loading" :title="t('common.refresh')" @click="load">
              <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
            </button>
            <button class="btn btn-primary" @click="openCreate">
              <Icon name="plus" size="md" class="mr-1" />
              {{ t('admin.faqs.create') }}
            </button>
          </div>
        </div>
      </template>

      <template #table>
        <DataTable :columns="columns" :data="items" :loading="loading">
          <template #cell-title="{ row }">
            <div class="max-w-xl">
              <div class="font-medium text-gray-900 dark:text-white">{{ row.title }}</div>
              <div class="mt-1 line-clamp-2 whitespace-pre-line text-sm text-gray-500 dark:text-dark-400">{{ row.answer }}</div>
            </div>
          </template>
          <template #cell-enabled="{ row }">
            <Toggle :model-value="row.enabled" :disabled="togglingIds.has(row.id)" @update:model-value="toggleEnabled(row, $event)" />
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700" :title="t('common.edit')" @click="openEdit(row)">
                <Icon name="edit" size="sm" />
              </button>
              <button class="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" :title="t('common.delete')" @click="askDelete(row)">
                <Icon name="trash" size="sm" />
              </button>
            </div>
          </template>
        </DataTable>
      </template>

      <template #pagination>
        <Pagination
          v-if="pagination.total > 0"
          :page="pagination.page"
          :total="pagination.total"
          :page-size="pagination.page_size"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </TablePageLayout>

    <BaseDialog :show="dialogOpen" :title="editing ? t('admin.faqs.edit') : t('admin.faqs.create')" @close="dialogOpen = false">
      <form id="faq-form" class="space-y-4" @submit.prevent="save">
        <div>
          <label class="input-label">{{ t('admin.faqs.titleField') }}</label>
          <input v-model="form.title" class="input" maxlength="200" required />
        </div>
        <div>
          <label class="input-label">{{ t('admin.faqs.answerField') }}</label>
          <textarea v-model="form.answer" class="input" rows="7" required></textarea>
          <p class="mt-1.5 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.faqs.answerMarkdownHint') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
            {{ t('admin.faqs.enabledField') }}
          </label>
          <div>
            <label class="input-label">{{ t('admin.faqs.sortOrderField') }}</label>
            <input v-model.number="form.sort_order" type="number" class="input" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button class="btn btn-secondary" type="button" @click="dialogOpen = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" type="submit" form="faq-form" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
        </div>
      </template>
    </BaseDialog>

    <ConfirmDialog :show="!!deleting" :title="t('admin.faqs.delete')" :message="t('admin.faqs.deleteConfirm')" danger @confirm="remove" @cancel="deleting = null" />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import { useAppStore } from '@/stores/app'
import type { FAQ } from '@/types'
import type { Column } from '@/components/common/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import DataTable from '@/components/common/DataTable.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import Pagination from '@/components/common/Pagination.vue'
import Select from '@/components/common/Select.vue'
import Toggle from '@/components/common/Toggle.vue'
import { getPersistedPageSize } from '@/composables/usePersistedPageSize'

const { t } = useI18n()
const appStore = useAppStore()
const items = ref<FAQ[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogOpen = ref(false)
const editing = ref<FAQ | null>(null)
const deleting = ref<FAQ | null>(null)
const titleFilter = ref('')
const enabledFilter = ref<'' | 'true' | 'false'>('')
const togglingIds = reactive(new Set<number>())
const pagination = reactive({ page: 1, page_size: getPersistedPageSize(), total: 0 })
const form = reactive({ title: '', answer: '', enabled: false, sort_order: 0 })
let searchTimer: ReturnType<typeof setTimeout> | undefined
const statusOptions = computed(() => [
  { value: '', label: t('admin.faqs.allStatuses') },
  { value: 'true', label: t('admin.faqs.enabledStatus') },
  { value: 'false', label: t('admin.faqs.disabledStatus') }
])
const columns = computed<Column[]>(() => [
  { key: 'title', label: t('admin.faqs.columns.title') },
  { key: 'enabled', label: t('admin.faqs.columns.enabled') },
  { key: 'sort_order', label: t('admin.faqs.columns.sortOrder') },
  { key: 'actions', label: t('admin.faqs.columns.actions') }
])

async function load() {
  loading.value = true
  try {
    const result = await adminAPI.faqs.list({
      page: pagination.page,
      page_size: pagination.page_size,
      title: titleFilter.value.trim() || undefined,
      enabled: enabledFilter.value === '' ? undefined : enabledFilter.value === 'true'
    })
    items.value = result.items
    pagination.total = result.total
  }
  catch (error: any) { appStore.showError(error.response?.data?.detail || t('admin.faqs.loadFailed')) }
  finally { loading.value = false }
}
function openCreate() {
  editing.value = null
  Object.assign(form, { title: '', answer: '', enabled: false, sort_order: 0 })
  dialogOpen.value = true
}
function handleFilterChange() {
  pagination.page = 1
  void load()
}
function handlePageChange(page: number) {
  pagination.page = page
  void load()
}
function handlePageSizeChange(pageSize: number) {
  pagination.page = 1
  pagination.page_size = pageSize
  void load()
}
async function toggleEnabled(item: FAQ, enabled: boolean) {
  if (togglingIds.has(item.id)) return
  togglingIds.add(item.id)
  try {
    await adminAPI.faqs.update(item.id, { enabled })
    item.enabled = enabled
    if (enabledFilter.value !== '') await load()
    appStore.showSuccess(t('admin.faqs.toggleSuccess'))
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || t('admin.faqs.toggleFailed'))
  } finally {
    togglingIds.delete(item.id)
  }
}
function openEdit(item: FAQ) {
  editing.value = item
  Object.assign(form, { title: item.title, answer: item.answer, enabled: item.enabled, sort_order: item.sort_order })
  dialogOpen.value = true
}
async function save() {
  saving.value = true
  try {
    if (editing.value) await adminAPI.faqs.update(editing.value.id, form)
    else await adminAPI.faqs.create(form)
    appStore.showSuccess(t('admin.faqs.saveSuccess'))
    dialogOpen.value = false
    await load()
  } catch (error: any) { appStore.showError(error.response?.data?.detail || t('admin.faqs.saveFailed')) }
  finally { saving.value = false }
}
function askDelete(item: FAQ) { deleting.value = item }
async function remove() {
  if (!deleting.value) return
  try {
    await adminAPI.faqs.delete(deleting.value.id)
    deleting.value = null
    appStore.showSuccess(t('admin.faqs.deleteSuccess'))
    if (items.value.length === 1 && pagination.page > 1) pagination.page--
    await load()
  } catch (error: any) { appStore.showError(error.response?.data?.detail || t('admin.faqs.deleteFailed')) }
}
watch(titleFilter, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(handleFilterChange, 300)
})
onMounted(load)
onUnmounted(() => clearTimeout(searchTimer))
</script>
