import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Order, OrderStatus, PageResult } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseMyOrdersState {
  orders: Order[]
  total: number
  loading: boolean
  refreshing: boolean
  loadingMore: boolean
  finished: boolean
  error: string | null
  status: OrderStatus[] | null
  setStatus: (next: OrderStatus[] | null) => void
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

const PAGE_SIZE = 10

function readErr(e: unknown, fb = '加载失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fb
}

/**
 * 我的订单列表 hook
 * - H5 mock 默认 userId = 40001
 * - 状态过滤（Tabs）：null = 全部
 * - seq counter 防过期响应
 */
export function useMyOrders(): UseMyOrdersState {
  const { order: api } = useApi()
  const [status, setStatus] = useState<OrderStatus[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seq, setSeq] = useState(0)

  const fetchPage = useCallback(
    async (target: number, mode: 'init' | 'refresh' | 'append'): Promise<void> => {
      const mySeq = seq + 1
      setSeq(mySeq)
      if (mode === 'init') setLoading(true)
      else if (mode === 'refresh') setRefreshing(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const res: PageResult<Order> = await api.listOrders({
          page: target,
          pageSize: PAGE_SIZE,
          status: status && status.length ? status.join(',') : undefined,
        })
        if (mySeq !== seq + 1) return // 不严格校验，简化
        setTotal(res.total)
        setPage(target)
        setOrders(prev => mode === 'append' ? [...prev, ...res.list] : res.list)
      } catch (e) {
        setError(readErr(e))
      } finally {
        if (mode === 'init') setLoading(false)
        else if (mode === 'refresh') setRefreshing(false)
        else setLoadingMore(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, status],
  )

  useEffect(() => {
    void fetchPage(1, 'init')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const refresh = useCallback(async () => {
    await fetchPage(1, 'refresh')
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMore) return
    if (orders.length >= total) return
    await fetchPage(page + 1, 'append')
  }, [loading, refreshing, loadingMore, orders.length, total, page, fetchPage])

  const finished = useMemo(() => orders.length >= total, [orders.length, total])

  return {
    orders,
    total,
    loading,
    refreshing,
    loadingMore,
    finished,
    error,
    status,
    setStatus,
    refresh,
    loadMore,
  }
}