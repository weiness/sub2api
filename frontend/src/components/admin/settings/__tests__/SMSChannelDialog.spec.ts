import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SMSChannelDialog from '../SMSChannelDialog.vue'
import type { SMSChannelConfig } from '@/api/admin/settings'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'zh-CN' } }),
}))

function mountDialog(channel: SMSChannelConfig | null = null) {
  return mount(SMSChannelDialog, {
    props: { show: true, channel },
    global: {
      stubs: {
        BaseDialog: {
          props: ['show', 'title'],
          template: '<div v-if="show"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
        },
        Select: {
          props: ['modelValue', 'options', 'disabled'],
          emits: ['update:modelValue', 'change'],
          template: '<select :value="modelValue" :disabled="disabled"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
        Toggle: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input type="checkbox" :checked="modelValue" />',
        },
        Icon: true,
      },
    },
  })
}

describe('SMSChannelDialog', () => {
  it('先选择服务商，并按服务商展示新增表单和默认变量', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('添加短信渠道')
    expect(wrapper.text()).toContain('时巴克科技')
    expect(wrapper.find('select').element.value).toBe('spug')
    expect(wrapper.findAll('input[type="text"]').map((input) => input.element.value)).toEqual([
      '时巴克科技',
      '',
      'code',
      '{{code}}',
      'number',
      '{{ttl_minutes}}',
    ])
  })

  it('填写模板 ID 后保存为列表可用的渠道配置', async () => {
    const wrapper = mountDialog()
    const textInputs = wrapper.findAll('input[type="text"]')

    await textInputs[1].setValue('MsT6ngP4Shuke4pJipJs_Q')
    await wrapper.find('form').trigger('submit.prevent')

    const payload = wrapper.emitted('save')?.[0]?.[0] as SMSChannelConfig
    expect(payload).toMatchObject({
      provider: 'spug',
      name: '时巴克科技',
      enabled: false,
      template_id: 'MsT6ngP4Shuke4pJipJs_Q',
      variables: [
        { name: 'code', value: '{{code}}' },
        { name: 'number', value: '{{ttl_minutes}}' },
      ],
    })
    expect(payload.id).toMatch(/^spug-/)
  })

  it('编辑时回填渠道数据并锁定服务商', () => {
    const wrapper = mountDialog({
      id: 'sms-1',
      provider: 'spug',
      name: '主短信渠道',
      enabled: true,
      template_id: 'template-1',
      variables: [{ name: 'code', value: '{{code}}' }],
    })

    expect(wrapper.text()).toContain('编辑短信渠道')
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('input[type="text"]').map((input) => input.element.value)).toEqual([
      '主短信渠道',
      'template-1',
      'code',
      '{{code}}',
    ])
  })

  it('拒绝保留变量 to', async () => {
    const wrapper = mountDialog()
    const textInputs = wrapper.findAll('input[type="text"]')

    await textInputs[1].setValue('template-1')
    await textInputs[2].setValue('to')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('不能使用 to')
  })
})
