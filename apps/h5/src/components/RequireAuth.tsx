import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useUser } from '@/contexts/UserContext'

export interface RequireAuthProps {
  children: ReactNode
}

/**
 * 路由守卫（H7 落地）
 * - 未登录跳 `/login?redirect=<currentPath>`
 * - 已登录直接渲染 children
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, loading } = useUser()
  const location = useLocation()

  // 启动期 loading 时不渲染（防止从 localStorage 恢复后跳转）
  useEffect(() => { /* no-op */ }, [loading])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        加载中…
      </div>
    )
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}