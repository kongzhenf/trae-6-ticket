import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { ApiClientHooks } from './types/request'

export interface ApiClientConfig extends ApiClientHooks {
  baseURL: string
  timeout?: number
  /** 业务成功码，默认 0 */
  successCode?: number
}

/**
 * 创建 axios 实例；调用方注入 token 与错误处理逻辑，
 * 让 H5 与 Admin 共享底层 HTTP，业务提示各自实现。
 */
export function createApiClient(cfg: ApiClientConfig): AxiosInstance {
  const successCode = cfg.successCode ?? 0
  const instance = axios.create({
    baseURL: cfg.baseURL,
    timeout: cfg.timeout ?? 15000,
  })

  instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = cfg.getToken?.()
    if (token) {
      req.headers.set('Authorization', `Bearer ${token}`)
    }
    return req
  })

  instance.interceptors.response.use(
    (res) => {
      const body = res.data
      if (body && typeof body === 'object' && 'code' in body) {
        const code = (body as { code: number }).code
        if (code === successCode) {
          // 业务成功：把 data 字段上提一层，回填到 res.data 方便调用方 .data 直接拿业务数据
          res.data = (body as { data: unknown }).data
          return res
        }
        const message = (body as { message?: string }).message ?? '请求失败'
        if (code === 401) cfg.onUnauthorized?.()
        cfg.onError?.(message, code)
        return Promise.reject(new Error(message))
      }
      return res
    },
    (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? '网络错误'
      cfg.onNetworkError?.(message)
      return Promise.reject(err)
    },
  )

  return instance
}
