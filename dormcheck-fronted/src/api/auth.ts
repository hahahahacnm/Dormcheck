// src/api/auth.ts
import instance from './index'  // 你的统一 axios 实例

// 登录请求参数和返回类型定义
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  try {
    const resp = await instance.post('/auth/login', data)
    return resp.data as LoginResponse
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    throw new Error('登录请求失败')
  }
}

// 注册请求参数和响应类型定义
export interface RegisterRequest {
  username: string
  password: string
  email: string
  code: string
}

export interface RegisterResponse {
  message: string
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    const resp = await instance.post('/auth/register', data)
    return resp.data as RegisterResponse
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    throw new Error('注册请求失败')
  }
}

// 发送邮箱验证码
export async function sendVerificationCode(email: string): Promise<{ message: string }> {
  try {
    const resp = await instance.post('/auth/send-code', { email })
    return resp.data
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    throw new Error('验证码发送失败')
  }
}

// 获取当前登录用户信息
export interface UserInfo {
  id: number
  username: string
  role: number
  email: string   // 新增email字段
  banned?: boolean
  ban_reason?: string
  banned_at?: string | null
  ban_expires_at?: string | null
}

export async function getCurrentUser(_t: string): Promise<UserInfo> {
  try {
    const resp = await instance.get('/auth/me')
    return resp.data as UserInfo
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    throw new Error('获取用户信息失败')
  }
}

// 注销
export async function logoutApi(_value: string): Promise<{ message: string }> {
  const resp = await instance.post('/auth/logout')
  return resp.data
}
