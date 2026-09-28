import instance from './index'  // 你之前创建的 axios 实例

export interface BoundStudent {
  id: number
  userId: number
  stuId: string
  name: string // ✅ 加入学生姓名字段
  accountStatus?: 'valid' | 'invalid' | 'locked'
  authFailedAt?: string | null
  authFailureDays?: number
  authError?: string
  studentBanned?: boolean
  studentBanReason?: string
  studentBanExpiresAt?: string | null
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface BindStudentRequest {
  stu_id: string
  password: string
}

export interface BindStudentResponse {
  success: boolean
  message: string
}

export interface UnbindStudentRequest {
  stu_id: string
}

export interface UnbindStudentResponse {
  success: boolean
  message: string
}

export interface StudentPasswordResponse {
  stuId: string
  password: string
}

export interface Activity {
  id: number | string
  name: string
  collegeview?: string
  sigintaskview?: string
  foreachp_starttime?: string
  foreachp_endtime?: string
  designate_strattime?: string
  designate_endtime?: string
  foreachp_startday?: string
  foreachp_endday?: string
  sigintype?: number
  qrcodetype?: number
}

export interface Task {
  ActivityName: string
  ActivityCollege: string
  SignMode: string
  ActivityTimeRange: string
  ActivityStartDate: string
  ActivityEndDate: string
  SignType: number
  QRCodeType: number
  Name: string
  NotifyEmail: string
  ID: number
  UserID: number
  StuID: string
  ActivityID: string
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

// 新增任务时请求参数接口（字段和后端保持一致，新增学生姓名和活动名称）
export interface CreateTaskPayload {
  stu_id: string
  activity_id: string
  address: string
  longitude: number
  latitude: number
  sign_time?: string
  max_retry?: number
  notify_email?: string
  name: string           // 新增：学生姓名
  activity_name: string  // 新增：活动名称
  activity_college?: string
  sign_mode?: string
  activity_time_range?: string
  activity_start_date?: string
  activity_end_date?: string
  sign_type?: number
  qrcode_type?: number
}

export interface UpdateTaskPayload extends CreateTaskPayload {
  task_id: number
}

export interface ChangeInitialPasswordRequest {
  stu_id: string
  old_password: string
  new_password: string
  g: string
}

export const student = {
  // 查询绑定学生列表
  getBoundStudents: async (): Promise<ApiResponse<BoundStudent[]>> => {
    try {
      const resp = await instance.get('/student/list', { timeout: 30000 })
      const items = Array.isArray(resp.data?.data) ? resp.data.data : []
      const mappedData = items.map((item: any) => ({
        id: item.ID,
        userId: item.UserID,
        stuId: item.StuID,
        name: item.Name,
        accountStatus: item.account_status || 'valid',
        authFailedAt: item.auth_failed_at || null,
        authFailureDays: Number(item.auth_failure_days || 0),
        authError: item.auth_error || '',
        studentBanned: Boolean(item.student_banned),
        studentBanReason: item.student_ban_reason || '',
        studentBanExpiresAt: item.student_ban_expires_at || null,
      }))

      return {
        success: resp.data.success,
        message: resp.data.message,
        data: mappedData,
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取绑定学生列表失败')
    }
  },


  // 绑定学生账号
  bindStudentApi: async (_: string, data: BindStudentRequest): Promise<BindStudentResponse> => {
    try {
      const resp = await instance.post('/student/bind', data)
      return resp.data
    } catch (error: any) {
      // 抛出完整响应对象而非仅 message
      throw error.response?.data || { message: '绑定学生失败' }
    }
  },


  // 解绑学生账号
  unbindStudentApi: async (data: UnbindStudentRequest): Promise<UnbindStudentResponse> => {
    try {
      const resp = await instance.post('/student/unbind', data)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '解绑学生失败')
    }
  },

  // 查询某学生的活动列表
  getActivities: async (_: string, stu_id: string): Promise<ApiResponse<Activity[]>> => {
    try {
      const resp = await instance.get(`/student/activities?stu_id=${encodeURIComponent(stu_id)}`)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取活动失败')
    }
  },

  // 查询单个学生的当前已存储密码
  getStudentPassword: async (stuId: string): Promise<ApiResponse<StudentPasswordResponse>> => {
    try {
      const resp = await instance.get(`/student/password/${encodeURIComponent(stuId)}`)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取学生密码失败')
    }
  },


  // 查询签到任务列表
  getTasks: async (): Promise<ApiResponse<Task[]>> => {
    try {
      const resp = await instance.get('/student/tasks', { timeout: 30000 })
      return {
        ...resp.data,
        data: Array.isArray(resp.data?.data) ? resp.data.data : [],
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取任务列表失败')
    }
  },

  // 新增签到任务
  createTask: async (_: string, data: CreateTaskPayload): Promise<ApiResponse<any>> => {
    try {
      const resp = await instance.post('/student/task', data)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '添加任务失败')
    }
  },

  // 删除签到任务
  updateTask: async (data: UpdateTaskPayload): Promise<ApiResponse<Task>> => {
    try {
      const resp = await instance.post('/student/task/update', data)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '修改任务失败')
    }
  },

  // 在站内提交微学工初始密码修改
  changeInitialPassword: async (data: ChangeInitialPasswordRequest): Promise<ApiResponse<null>> => {
    try {
      const resp = await instance.post('/student/change-initial-password', data)
      return resp.data
    } catch (error: any) {
      throw error.response?.data || { message: '微学工密码修改失败' }
    }
  },

  deleteTask: async (task_id: number): Promise<ApiResponse<any>> => {
    try {
      const resp = await instance.post('/student/task/delete', { task_id })
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '删除任务失败')
    }
  },

  // 暂停/恢复签到任务
  toggleTask: async (task_id: number, enabled: boolean): Promise<ApiResponse<any>> => {
    try {
      const resp = await instance.post('/student/task/toggle', { task_id, enabled })
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '切换任务状态失败')
    }
  },

  runTaskNow: async (task_id: number): Promise<ApiResponse<Task>> => {
    try {
      const resp = await instance.post(`/student/task/${task_id}/run`)
      return resp.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '手动签到失败')
    }
  },

}
