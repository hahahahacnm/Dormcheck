import instance from './index' // 你的统一 axios 实例

export interface UserInfo {
  id: number
  username: string
  role: number
}

/**
 * 使用 token 调用 /auth/me 获取用户信息
 * token 在请求拦截器里自动加了，无需手动写
 */
export async function getUserInfo(): Promise<UserInfo> {
  const resp = await instance.get('/auth/me')
  return resp.data
}
