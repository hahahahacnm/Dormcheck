import api from './index'

export type UpdateKind = 'update' | 'announcement'

export interface PlatformUpdate {
  id: number
  kind: UpdateKind
  title: string
  body: string
  event_date: string
  pinned: boolean
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type UpdatePayload = Pick<PlatformUpdate, 'kind' | 'title' | 'body' | 'event_date' | 'pinned' | 'published'>

export interface UpdatePage {
  posts: PlatformUpdate[]
  total: number
  page: number
  page_size: number
}

export async function listUpdates(page = 1, kind = '') {
  const { data } = await api.get<UpdatePage>('/updates', { params: { page, page_size: 10, kind } })
  return data
}

export async function listAdminUpdates(page = 1) {
  const { data } = await api.get<UpdatePage>('/admin/updates/', { params: { page, page_size: 10 } })
  return data
}

export async function createUpdate(payload: UpdatePayload) {
  const { data } = await api.post<PlatformUpdate>('/admin/updates/', payload)
  return data
}

export async function saveUpdate(id: number, payload: UpdatePayload) {
  const { data } = await api.put<PlatformUpdate>(`/admin/updates/${id}`, payload)
  return data
}

export async function deleteUpdate(id: number) {
  await api.delete(`/admin/updates/${id}`)
}
