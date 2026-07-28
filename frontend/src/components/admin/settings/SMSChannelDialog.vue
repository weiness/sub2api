<template>
  <BaseDialog
    :show="show"
    :title="channel ? localText('编辑短信渠道', 'Edit SMS channel') : localText('添加短信渠道', 'Add SMS channel')"
    width="wide"
    @close="emit('close')"
  >
    <form id="sms-channel-form" class="space-y-5" @submit.prevent="submit">
      <div>
        <label class="input-label">
          {{ localText('短信服务商', 'SMS provider') }}
          <span class="text-red-500">*</span>
        </label>
        <Select
          v-model="form.provider"
          :options="providerOptions"
          :disabled="Boolean(channel)"
          @change="applyProviderDefaults"
        />
      </div>

      <template v-if="form.provider === 'spug'">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="input-label">
              {{ localText('渠道名称', 'Channel name') }}
              <span class="text-red-500">*</span>
            </label>
            <input v-model.trim="form.name" type="text" class="input" required />
          </div>
          <div>
            <label class="input-label">
              {{ localText('模板 ID', 'Template ID') }}
              <span class="text-red-500">*</span>
            </label>
            <input v-model.trim="form.template_id" type="text" class="input font-mono" required />
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ localText('启用渠道', 'Enable channel') }}
            </div>
          </div>
          <Toggle v-model="form.enabled" />
        </div>

        <div class="space-y-3 border-t border-gray-100 pt-4 dark:border-dark-700">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ localText('模板变量', 'Template variables') }}
            </h4>
            <button type="button" class="btn btn-secondary btn-sm" @click="addVariable">
              <Icon name="plus" size="sm" />
              {{ localText('添加变量', 'Add variable') }}
            </button>
          </div>

          <div
            v-for="(variable, index) in form.variables"
            :key="index"
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-2"
          >
            <input
              v-model.trim="variable.name"
              type="text"
              class="input font-mono"
              :placeholder="localText('变量名', 'Variable')"
              required
            />
            <input
              v-model="variable.value"
              type="text"
              class="input font-mono"
              placeholder="{{code}}"
              required
            />
            <button
              type="button"
              class="btn btn-secondary px-3"
              :title="localText('删除变量', 'Remove variable')"
              @click="removeVariable(index)"
            >
              <Icon name="trash" size="sm" />
            </button>
          </div>
        </div>
      </template>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn btn-secondary" @click="emit('close')">
          {{ localText('取消', 'Cancel') }}
        </button>
        <button type="submit" form="sms-channel-form" class="btn btn-primary">
          {{ localText('保存', 'Save') }}
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Select from '@/components/common/Select.vue'
import Toggle from '@/components/common/Toggle.vue'
import Icon from '@/components/icons/Icon.vue'
import type { SMSChannelConfig } from '@/api/admin/settings'

const props = defineProps<{
  show: boolean
  channel: SMSChannelConfig | null
}>()

const emit = defineEmits<{
  close: []
  save: [channel: SMSChannelConfig]
}>()

const { locale } = useI18n()
const error = ref('')
const providerOptions = [{ value: 'spug', label: '时巴克科技' }]

const form = reactive<SMSChannelConfig>({
  id: '',
  name: '',
  provider: 'spug',
  enabled: false,
  template_id: '',
  variables: [],
})

function localText(zh: string, en: string): string {
  return String(locale.value).startsWith('zh') ? zh : en
}

function defaultVariables() {
  return [
    { name: 'code', value: '{{code}}' },
    { name: 'number', value: '{{ttl_minutes}}' },
  ]
}

function resetForm(): void {
  const source = props.channel
  form.id = source?.id || `spug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  form.provider = source?.provider || 'spug'
  form.name = source?.name || localText('时巴克科技', 'Spug SMS')
  form.enabled = source?.enabled ?? false
  form.template_id = source?.template_id || ''
  form.variables = source?.variables?.map((item) => ({ ...item })) || defaultVariables()
  error.value = ''
}

function applyProviderDefaults(): void {
  if (!props.channel && form.provider === 'spug') {
    form.name = localText('时巴克科技', 'Spug SMS')
    form.variables = defaultVariables()
  }
}

function addVariable(): void {
  form.variables.push({ name: '', value: '' })
}

function removeVariable(index: number): void {
  form.variables.splice(index, 1)
}

function submit(): void {
  error.value = ''
  if (!form.name.trim() || !form.template_id.trim()) {
    error.value = localText('请填写渠道名称和模板 ID', 'Enter a channel name and template ID')
    return
  }
  const seen = new Set<string>()
  for (const variable of form.variables) {
    const name = variable.name.trim()
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || name.toLowerCase() === 'to') {
      error.value = localText('模板变量名格式不正确，且不能使用 to', 'Invalid template variable name; to is reserved')
      return
    }
    if (seen.has(name.toLowerCase())) {
      error.value = localText('模板变量名不能重复', 'Template variable names must be unique')
      return
    }
    seen.add(name.toLowerCase())
  }
  emit('save', {
    id: form.id,
    provider: form.provider,
    name: form.name.trim(),
    enabled: form.enabled,
    template_id: form.template_id.trim(),
    variables: form.variables.map((item) => ({ name: item.name.trim(), value: item.value })),
  })
}

watch(
  () => props.show,
  (show) => {
    if (show) resetForm()
  },
  { immediate: true },
)
</script>
