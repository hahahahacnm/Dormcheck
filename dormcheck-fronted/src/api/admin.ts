import instance from './index'

export interface AdminUser {
  id: number
  username: string
  email: string
  email_verified: boolean
  role: number
  banned: boolean
  ban_reason: string
  banned_at?: string | null
  ban_expires_at?: string | null
}

export interface AdminStudentBan {
  stu_id: string
  reason: string
  banned_at: string
  expires_at?: string | null
  banned_by: number
}

export interface AdminStudent {
  stu_id: string
  name: string
  password: string
  last_login: string
  account_status: string
  auth_failed_at?: string | null
  auth_error?: string
  student_banned: boolean
  student_ban_reason: string
  student_ban_expires_at?: string | null
  binding_count: number
  task_count: number
  bound_users: string[]
}

export interface AdminUserPage {
  users: AdminUser[]
  total: number
  page: number
  page_size: number
}

export interface ActivityTaskSummary {
  activity_id: string
  activity_name: string
  college: string
  sign_mode: string
  time_range: string
  start_date: string
  end_date: string
  sign_type: number
  qrcode_type: number
  task_count: number
  user_count: number
  running_count: number
  paused_count: number
  recent_fail_count: number
  identity_fail_count: number
}

export interface AdminTask {
  ID: number
  UserID: number
  bound_users: Array<{ id: number; username: string; email: string }>
  StuID: string
  Name: string
  ActivityID: string
  ActivityName: string
  ActivityCollege: string
  SignMode: string
  ActivityTimeRange: string
  ActivityStartDate: string
  ActivityEndDate: string
  SignType: number
  QRCodeType: number
  Address: string
  Longitude: number
  Latitude: number
  SignTime: string
  Enabled: boolean
  ExecStatus: string
  RetryCount: number
  MaxRetry: number
  LastError: string
  ExecutedAt: string
  LastManualAt?: string | null
  LastManualStatus?: string
  LastManualError?: string
  ActivityState?: string
  ActivityIssue?: string
  ActivityCheckedAt?: string | null
  ActivityAutoPaused?: boolean
  ActivityOverride?: boolean
  StudentBanned?: boolean
  StudentBanReason?: string
  StudentBanExpiresAt?: string | null
  ExecutionBlockedReason?: string
}

export async function getAdminActivityTasks() {
  const response = await instance.get<{ activities: ActivityTaskSummary[] | null }>('/admin/tasks', { timeout: 30000 })
  return Array.isArray(response.data?.activities) ? response.data.activities : []
}

export async function getAdminTasksForActivity(activityId: string) {
  const response = await instance.get<{ tasks: AdminTask[] | null }>(`/admin/tasks/${encodeURIComponent(activityId)}`, { timeout: 30000 })
  return Array.isArray(response.data?.tasks) ? response.data.tasks : []
}

export async function getAdminTaskList(params: { q?: string; activity_id?: string; status?: string; page?: number; page_size?: number }) {
  const response = await instance.get<{ tasks: AdminTask[] | null; total: number; page: number; page_size: number }>('/admin/tasks/list', { params, timeout: 30000 })
  return { ...response.data, tasks: Array.isArray(response.data?.tasks) ? response.data.tasks : [] }
}

export async function runAdminTask(taskId: number) {
  const response = await instance.post<{ message: string; task: AdminTask }>(`/admin/tasks/${taskId}/run`)
  return response.data.task
}

export async function toggleAdminTask(taskId: number, enabled: boolean) {
  try {
    const response = await instance.post<{ message: string; task: AdminTask }>(
      `/admin/tasks/${taskId}/toggle`,
      { enabled },
    )
    return response.data.task
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.response?.data?.error || '更新任务状态失败')
  }
}

export async function updateAdminTask(taskId: number, data: {
  address: string; longitude: number; latitude: number; notify_email?: string
}) {
  const response = await instance.put<{ message: string; task: AdminTask }>(`/admin/tasks/${taskId}`, data)
  return response.data
}

export async function deleteAdminTask(taskId: number) {
  const response = await instance.delete<{ message: string }>(`/admin/tasks/${taskId}`)
  return response.data
}

export async function getAdminUsers(params: { q?: string; page?: number; page_size?: number }) {
  const response = await instance.get<AdminUserPage>('/admin/users', { params })
  return response.data
}

export async function setAdminUserRole(userId: number, role: number) {
  const response = await instance.patch<{ message: string; user: AdminUser }>(
    `/admin/users/${userId}/role`,
    { role },
  )
  return response.data
}

export async function banAdminUser(userId: number, durationDays: number, reason: string) {
  const response = await instance.put<{ message: string; user: AdminUser }>(`/admin/users/${userId}/ban`, {
    duration_days: durationDays,
    reason,
  })
  return response.data
}

export async function unbanAdminUser(userId: number) {
  const response = await instance.delete<{ message: string }>(`/admin/users/${userId}/ban`)
  return response.data
}

export async function getAdminStudentBans(params: { q?: string; page?: number; page_size?: number } = {}) {
  const response = await instance.get<{ bans: AdminStudentBan[]; total: number; page: number; page_size: number }>(
    '/admin/students/bans', { params },
  )
  return response.data
}

export async function getAdminStudents(params: { q?: string; page?: number; page_size?: number } = {}) {
  const response = await instance.get<{ students: AdminStudent[]; total: number; page: number; page_size: number }>('/admin/students', { params })
  return response.data
}

export async function updateAdminStudentCredentials(stuId: string, password: string) {
  const response = await instance.put<{ message: string; name: string }>(
    `/admin/students/${encodeURIComponent(stuId)}/credentials`, { password },
  )
  return response.data
}

export async function banStudentAccount(stuId: string, durationDays: number, reason: string) {
  const response = await instance.put<{ message: string; ban: AdminStudentBan }>(
    `/admin/students/${encodeURIComponent(stuId)}/ban`,
    { duration_days: durationDays, reason },
  )
  return response.data
}

export async function unbanStudentAccount(stuId: string) {
  const response = await instance.delete<{ message: string }>(`/admin/students/${encodeURIComponent(stuId)}/ban`)
  return response.data
}
