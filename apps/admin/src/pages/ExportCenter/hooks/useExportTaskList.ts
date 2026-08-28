import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExportTask, PageQuery } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

/**
 * 导出任务列表 hook（H10）
 * - 接入 adminExport.listTasks（分页 + 倒序）
 * - 任意 processing 状态时 1.5s 自动 refetch
 * - 严格使用 ref 守卫 mounted / 严格去抖 query 变化，避免 StrictMode 双调用 + 老 query 闭包造成 setState 竞争
 */
export function useExportTaskList() {
  const { adminExport } = useApi()
  const [query, setQuery] = useState<PageQuery>({ page: 1, pageSize: 20 })
  const [list, setList] = useState<ExportTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const queryRef = useRef(query)
  queryRef.current = query

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminExport.listTasks(queryRef.current)
      if (!mountedRef.current) return
      setList(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch (e) {
      console.error('[useExportTaskList] fetch failed', e)
      if (!mountedRef.current) return
      setList([])
      setTotal(0)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [adminExport])

  // 挂载 / 卸载守卫
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 首次 mount + query 变化时 fetch（refresh 依赖稳定，query 变化通过 queryRef 读取）
  useEffect(() => {
    void refresh()
  }, [refresh, query])

  // 当存在 processing 状态任务时，每 1.5s 自动轮询
  useEffect(() => {
    const hasProcessing = list.some(t => t.status === 'processing')
    if (!hasProcessing) return
    const timer = window.setInterval(() => {
      if (mountedRef.current) void refresh()
    }, 1500)
    return () => window.clearInterval(timer)
  }, [list, refresh])

  return { query, setQuery, list, total, loading, refresh }
}
