import { apiClient } from '../client'
import type { BasePaginationResponse, FAQ } from '@/types'

export interface FAQListParams {
  page?: number
  page_size?: number
  title?: string
  enabled?: boolean
}

export interface FAQPayload {
  title: string
  answer: string
  enabled: boolean
  sort_order: number
}

export async function list(params: FAQListParams = {}): Promise<BasePaginationResponse<FAQ>> {
  const { data } = await apiClient.get<BasePaginationResponse<FAQ>>('/admin/faqs', { params })
  return data
}

export async function create(payload: FAQPayload): Promise<FAQ> {
  const { data } = await apiClient.post<FAQ>('/admin/faqs', payload)
  return data
}

export async function update(id: number, payload: Partial<FAQPayload>): Promise<FAQ> {
  const { data } = await apiClient.put<FAQ>(`/admin/faqs/${id}`, payload)
  return data
}

export async function deleteFAQ(id: number): Promise<void> {
  await apiClient.delete(`/admin/faqs/${id}`)
}

export default { list, create, update, delete: deleteFAQ }
