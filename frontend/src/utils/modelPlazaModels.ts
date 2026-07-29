import type { ModelPlazaGroup, ModelPlazaResponse, PlazaModel } from '@/api/modelPlaza'
import type { UserSupportedModelPricing } from '@/api/channels'
import type { GroupPlatform } from '@/types'

export interface PlazaModelRoute {
  group: ModelPlazaGroup
  pricing: UserSupportedModelPricing | null
}

export interface PlazaModelCatalogItem {
  id: string
  platform: GroupPlatform
  modalities: string[]
  outputModalities: string[]
  capabilities: string[]
  routes: PlazaModelRoute[]
  displayPricing: {
    input: number | null
    output: number | null
    cacheWrite: number | null
    cacheRead: number | null
    imageInput: number | null
    imageOutput: number | null
    perRequest: number | null
  }
}

function inferPlatform(modelID: string, platform: string): GroupPlatform {
  const id = modelID.toLowerCase()
  if (id.startsWith('claude-')) return 'anthropic'
  if (id.startsWith('gemini-')) return 'gemini'
  if (/^(gpt-|o\d|text-embedding-|tts-|dall-e)/.test(id)) return 'openai'
  if (platform === 'antigravity' && id.startsWith('gemini')) return 'gemini'
  if (['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'composite'].includes(platform)) {
    return platform as GroupPlatform
  }
  return 'composite'
}

function minimum(values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => value != null)
  return available.length ? Math.min(...available) : null
}

function addModel(
  models: Map<string, PlazaModelCatalogItem>,
  group: ModelPlazaGroup,
  model: PlazaModel,
) {
  const key = model.name.toLowerCase()
  const existing = models.get(key)
  const route: PlazaModelRoute = { group, pricing: model.pricing }
  if (existing) {
    existing.routes.push(route)
    existing.modalities = Array.from(new Set([...existing.modalities, ...(model.modalities || [])]))
    existing.outputModalities = Array.from(new Set([...existing.outputModalities, ...(model.output_modalities || [])]))
    existing.capabilities = Array.from(new Set([...existing.capabilities, ...(model.capabilities || [])]))
    return
  }
  models.set(key, {
    id: model.name,
    platform: inferPlatform(model.name, model.platform || group.platform),
    modalities: model.modalities?.length ? [...model.modalities] : ['text'],
    outputModalities: model.output_modalities?.length ? [...model.output_modalities] : ['text'],
    capabilities: [...(model.capabilities || [])],
    routes: [route],
    displayPricing: {
      input: null,
      output: null,
      cacheWrite: null,
      cacheRead: null,
      imageInput: null,
      imageOutput: null,
      perRequest: null,
    },
  })
}

export function aggregatePlazaModels(response: ModelPlazaResponse | null): PlazaModelCatalogItem[] {
  const models = new Map<string, PlazaModelCatalogItem>()
  for (const group of response?.groups ?? []) {
    for (const model of group.models) addModel(models, group, model)
  }
  return Array.from(models.values())
    .map((model) => ({
      ...model,
      displayPricing: {
        input: minimum(model.routes.map((route) => route.pricing?.input_price)),
        output: minimum(model.routes.map((route) => route.pricing?.output_price)),
        cacheWrite: minimum(model.routes.map((route) => route.pricing?.cache_write_price)),
        cacheRead: minimum(model.routes.map((route) => route.pricing?.cache_read_price)),
        imageInput: minimum(model.routes.map((route) => route.pricing?.image_input_price)),
        imageOutput: minimum(model.routes.map((route) => route.pricing?.image_output_price)),
        perRequest: minimum(model.routes.map((route) => route.pricing?.per_request_price)),
      },
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
}
