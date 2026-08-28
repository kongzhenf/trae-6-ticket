export interface ApiClientHooks {
  /** 获取当前 token（如未登录返回 null） */
  getToken?: () => string | null | undefined
  /** 401 未授权回调（一般用于跳转登录） */
  onUnauthorized?: () => void
  /** 业务错误（code !== 0）回调 */
  onError?: (message: string, code?: number) => void
  /** 网络/HTTP 错误回调 */
  onNetworkError?: (message: string) => void
}
