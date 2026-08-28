import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginPayload, LoginResult, User } from '@trae/shared'
import { useApi } from './ApiContext'
import { readStored, setCachedToken, writeStored } from './userToken'

export interface UserContextValue {
  user: User | null
  token: string | null
  /** 当前是否已登录（含已恢复本地 token） */
  isAuthenticated: boolean
  loading: boolean
  login: (payload: LoginPayload) => Promise<LoginResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const UserCtx = createContext<UserContextValue | null>(null)

/**
 * UserContext（H7 落地）
 * - 维护 user + token；写入 localStorage[concert_auth_v1]
 * - 通过 module-level cachedToken + axios getToken 回调把 token 注入到 request header。
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { user: api } = useApi()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 启动时尝试恢复
  useEffect(() => {
    const stored = readStored()
    if (stored) {
      setUser(stored.user)
      setToken(stored.token)
      setCachedToken(stored.token)
    }
    setLoading(false)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      const r = await api.login(payload)
      setUser(r.user)
      setToken(r.token)
      setCachedToken(r.token)
      writeStored({ token: r.token, user: r.user })
      return r
    },
    [api],
  )

  const logout = useCallback(async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
    setToken(null)
    setCachedToken(null)
    writeStored(null)
  }, [api])

  const refresh = useCallback(async () => {
    const t = readStored()?.token ?? null
    if (!t) return
    try {
      const me = await api.getCurrentUser()
      setUser(me)
      writeStored({ token: t, user: me })
    } catch {
      // token 失效 → 静默清空
      setUser(null)
      setToken(null)
      setCachedToken(null)
      writeStored(null)
    }
  }, [api])

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading,
      login,
      logout,
      refresh,
    }),
    [user, token, loading, login, logout, refresh],
  )

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

export function useUser(): UserContextValue {
  const v = useContext(UserCtx)
  if (!v) throw new Error('useUser must be used inside <UserProvider>')
  return v
}
