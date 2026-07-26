import type {
  UserAvailableChannel,
  UserAvailableGroup,
  UserSupportedModelPricing,
} from '@/api/channels'
import type { GroupPlatform } from '@/types'

export interface AvailableModelRoute {
  channelName: string
  channelDescription: string
  platform: string
  pricing: UserSupportedModelPricing | null
  groups: UserAvailableGroup[]
}

export interface AvailableModelCatalogItem {
  id: string
  platform: GroupPlatform
  modalities: string[]
  outputModalities: string[]
  capabilities: string[]
  routes: AvailableModelRoute[]
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

export function aggregateAvailableModels(channels: UserAvailableChannel[]): AvailableModelCatalogItem[] {
  const models = new Map<string, AvailableModelCatalogItem>()

  for (const channel of channels) {
    for (const section of channel.platforms) {
      for (const model of section.supported_models) {
        const key = model.name.toLowerCase()
        const existing = models.get(key)
        const route: AvailableModelRoute = {
          channelName: channel.name,
          channelDescription: channel.description,
          platform: model.platform || section.platform,
          pricing: model.pricing,
          groups: section.groups,
        }

        if (existing) {
          existing.routes.push(route)
          existing.modalities = Array.from(new Set([...existing.modalities, ...(model.modalities || [])]))
          existing.outputModalities = Array.from(new Set([...existing.outputModalities, ...(model.output_modalities || [])]))
          existing.capabilities = Array.from(new Set([...existing.capabilities, ...(model.capabilities || [])]))
          continue
        }

        models.set(key, {
          id: model.name,
          platform: inferPlatform(model.name, model.platform || section.platform),
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
    }
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
