/**
 * 模块级 token 缓存 + localStorage 持久化 + __peekToken 导出。
 * 独立成文件是为了避开 react-refresh 的"文件只能导出组件"规则。
 */
import type { User } from '@trae/shared'

export const TOKEN_KEY = 'concert_auth_v1'

export interface PersistRecord {
  token: string
  user: User
}

export function readStored(): PersistRecord | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as PersistRecord
    if (!obj?.token || !obj?.user) return null
    return obj
  } catch {
    return null
  }
}

export function writeStored(record: PersistRecord | null): void {
  if (!record) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(record))
}

let _cachedToken: string | null = null
export function setCachedToken(token: string | null): void {
  _cachedToken = token
}
export function getCachedToken(): string | null {
  return _cachedToken
}
/**
 * 给 axios interceptor 用的 getter；保持旧名 `__peekToken` 不破坏 main.tsx 引用。
 */
export function __peekToken(): string | null {
  return _cachedToken
}
