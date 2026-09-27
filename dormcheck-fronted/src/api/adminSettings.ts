import instance from './index'

export interface AdminSettingsSnapshot {
  values: Record<string, string>
  secrets: Record<string, string>
}

export interface AdminSettingsUpdate {
  values: Record<string, string>
  secrets: Record<string, string>
  clear_secrets: string[]
}

export async function getAdminSettings() {
  const response = await instance.get<AdminSettingsSnapshot>('/admin/settings', { timeout: 15000 })
  return response.data
}

export async function updateAdminSettings(payload: AdminSettingsUpdate) {
  const response = await instance.put<{ message: string; settings: AdminSettingsSnapshot }>(
    '/admin/settings',
    payload,
  )
  return response.data
}
