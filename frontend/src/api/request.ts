import axios, { type AxiosRequestConfig } from 'axios'
import { VITE_API_URL } from '../config'
import { ApiError } from '../types/api'

const AUTH_ENDPOINTS: readonly string[] = ['/auth/login', '/auth/register']

const instance = axios.create({
  // In production (AWS), we MUST use the absolute API URL (ALB).
  // In development, we use '' so requests go through the vite.config.ts proxy, bypassing CORS.
  baseURL: import.meta.env.PROD ? VITE_API_URL : '',
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && config.url && !AUTH_ENDPOINTS.includes(config.url)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function redirectToLogin(): void {
  localStorage.removeItem('access_token')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

function handleError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response
    const detail = (data as { detail?: string })?.detail
    if (status === 401) {
      redirectToLogin()
      throw new ApiError('Session expired. Please login again.', 401)
    }
    if (status === 403) {
      throw new ApiError(detail ?? 'Access denied', 403)
    }
    throw new ApiError(detail ?? `Request failed (${status})`, status)
  }
  throw error
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.get<T>(url, config).then(r => r.data).catch(handleError),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.post<T>(url, data, config).then(r => r.data).catch(handleError),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.put<T>(url, data, config).then(r => r.data).catch(handleError),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<T>(url, config).then(r => r.data).catch(handleError),
}
