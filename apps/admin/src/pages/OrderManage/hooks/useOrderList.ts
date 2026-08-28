import { useCallback, useEffect, useState } from 'react'
import type { AdminOrderQuery, OrderAdminView } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

/**
 * 订单列表数据 hook（H9）
 * - 接入 adminOrder.listOrders（mock 10 项筛选 + 分页）
 * - query 变化自动 refetch
 * - 提供 setQuery / refresh / reset
 */
export function useOrderList() {
  const { adminOrder } = useApi()
  const [query, setQuery] = useState<AdminOrderQuery>({ page: 1, pageSize: 20 })
  const [list, setList] = useState<OrderAdminView[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminOrder.listOrders(query)
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      console.error('[useOrderList] fetch failed', e)
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [adminOrder, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function reset() {
    setQuery({ page: 1, pageSize: 20 })
  }

  return { query, setQuery, list, total, loading, refresh, reset }
}
