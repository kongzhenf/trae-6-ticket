import { useEffect, useState, useCallback } from 'react'
import type { DashboardOverview, DashboardTopConcert } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseDashboardState {
  overview: DashboardOverview | null
  topConcerts: DashboardTopConcert[]
  loading: boolean
  refreshing: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Dashboard 顶部 8 个指标 + 热门演出 TOP 10 数据 hook
 *
 * 首次进入 loading=true 触发完整骨架；用户点刷新按钮走 refreshing=true。
 * 接口异常通过 App.useApp().message 抛出，error 状态保留最后一次失败原因。
 */
export function useDashboard(): UseDashboardState {
  const { adminDashboard } = useApi()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [topConcerts, setTopConcerts] = useState<DashboardTopConcert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'init' | 'refresh') => {
      if (mode === 'init') setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const [ov, top] = await Promise.all([
          adminDashboard.overview(),
          adminDashboard.topConcerts(),
        ])
        setOverview(ov)
        setTopConcerts(top)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载失败'
        setError(msg)
      } finally {
        if (mode === 'init') setLoading(false)
        else setRefreshing(false)
      }
    },
    [adminDashboard],
  )

  useEffect(() => {
    void load('init')
  }, [load])

  return {
    overview,
    topConcerts,
    loading,
    refreshing,
    error,
    reload: () => load('refresh'),
  }
}
