import { describe, expect, it } from 'vitest'
import type { UserAvailableChannel, UserSupportedModelPricing } from '@/api/channels'
import { aggregateAvailableModels } from '../availableModels'

function pricing(input: number, output: number, cacheRead: number): UserSupportedModelPricing {
  return {
    billing_mode: 'token',
    input_price: input,
    output_price: output,
    cache_write_price: null,
    cache_read_price: cacheRead,
    image_input_price: null,
    image_output_price: null,
    per_request_price: null,
    intervals: [],
  }
}

describe('aggregateAvailableModels', () => {
  it('按模型 ID 聚合渠道并选择最低展示价格', () => {
    const channels: UserAvailableChannel[] = [
      {
        name: '渠道 A',
        description: '',
        platforms: [{
          platform: 'openai',
          groups: [],
          supported_models: [{
            name: 'gpt-5',
            platform: 'openai',
            modalities: ['text'],
            output_modalities: ['text'],
            capabilities: ['function_calling'],
            pricing: pricing(2e-6, 12e-6, 0.2e-6),
          }],
        }],
      },
      {
        name: '渠道 B',
        description: '',
        platforms: [{
          platform: 'openai',
          groups: [],
          supported_models: [{
            name: 'GPT-5',
            platform: 'openai',
            modalities: ['text', 'image'],
            output_modalities: ['text'],
            capabilities: ['function_calling', 'reasoning'],
            pricing: pricing(1.8e-6, 13e-6, 0.18e-6),
          }],
        }],
      },
    ]

    const [model] = aggregateAvailableModels(channels)

    expect(model.routes).toHaveLength(2)
    expect(model.modalities).toEqual(['text', 'image'])
    expect(model.outputModalities).toEqual(['text'])
    expect(model.capabilities).toEqual(['function_calling', 'reasoning'])
    expect(model.displayPricing).toEqual({ input: 1.8e-6, output: 12e-6, cacheWrite: null, cacheRead: 0.18e-6 })
  })

  it('按模型 ID 稳定排序并推断厂商', () => {
    const channels: UserAvailableChannel[] = [{
      name: '默认渠道',
      description: '',
      platforms: [{
        platform: 'antigravity',
        groups: [],
        supported_models: [
          { name: 'gemini-2.5-pro', platform: 'antigravity', modalities: [], output_modalities: [], capabilities: [], pricing: null },
          { name: 'claude-sonnet-4', platform: 'anthropic', modalities: ['text'], output_modalities: ['text'], capabilities: [], pricing: null },
        ],
      }],
    }]

    const models = aggregateAvailableModels(channels)

    expect(models.map((model) => model.id)).toEqual(['claude-sonnet-4', 'gemini-2.5-pro'])
    expect(models[1].platform).toBe('gemini')
    expect(models[1].modalities).toEqual(['text'])
  })
})
