import axios from 'axios'

const DEFAULT_API_BASE = import.meta.env.DEV
  ? 'http://127.0.0.1:8081/'
  : 'https://appdormcheck.kikirepository.cn/'
const API_BASE = import.meta.env.VITE_API_BASE?.trim() || DEFAULT_API_BASE

const instance = axios.create({
  baseURL: API_BASE,
})

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('dormcheck_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default instance
