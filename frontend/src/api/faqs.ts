import { apiClient } from './client'
import type { FAQ } from '@/types'

export async function listPublicFAQs(): Promise<FAQ[]> {
  const { data } = await apiClient.get<FAQ[]>('/faqs')
  return data
}
