import { describe, expect, it } from 'vitest'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import { aggregatePlazaModels } from '../modelPlazaModels'

function group(id: number, input: number, modalities: string[]): ModelPlazaGroup {
  return {
    id,
    name: `group-${id}`,
    description: '',
    platform: 'openai',
    subscription_type: 'standard',
    rate_multiplier: 1,
    peak_rate_enabled: false,
    peak_start: '',
    peak_end: '',
    peak_rate_multiplier: 1,
    is_exclusive: false,
    allow_image_generation: false,
    image_rate_independent: false,
    image_rate_multiplier: 1,
    image_price_1k: null,
    image_price_2k: null,
    image_price_4k: null,
    models: [{
      name: id === 1 ? 'gpt-5' : 'GPT-5',
      platform: 'openai',
      modalities,
      output_modalities: ['text'],
      capabilities: id === 1 ? ['function_calling'] : ['reasoning'],
      official_pricing: null,
      pricing: {
        billing_mode: 'token',
        input_price: input,
        output_price: 12e-6,
        cache_write_price: null,
        cache_read_price: null,
        image_input_price: null,
        image_output_price: null,
        per_request_price: null,
        intervals: [],
      },
    }],
  }
}

describe('aggregatePlazaModels', () => {
  it('按模型 ID 聚合分组路由、能力和最低价格', () => {
    const response: ModelPlazaResponse = { description: '', authenticated: true, models: [], groups: [group(1, 2e-6, ['text']), group(2, 1.8e-6, ['text', 'image'])] }
    const [model] = aggregatePlazaModels(response)
    expect(model.routes).toHaveLength(2)
    expect(model.modalities).toEqual(['text', 'image'])
    expect(model.capabilities).toEqual(['function_calling', 'reasoning'])
    expect(model.displayPricing.input).toBe(1.8e-6)
  })

  it('匿名模型目录无需分组路由也能展示', () => {
    const catalogGroup = group(1, 2e-6, ['text'])
    const response: ModelPlazaResponse = {
      description: '',
      authenticated: false,
      models: catalogGroup.models,
      groups: [],
    }
    const [model] = aggregatePlazaModels(response)
    expect(model.id).toBe('gpt-5')
    expect(model.routes).toEqual([])
    expect(model.displayPricing.input).toBe(2e-6)
  })
})
