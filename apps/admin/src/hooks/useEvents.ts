import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Concert, PageResult } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import type { ListEventsQuery } from '@trae/api'

/** 列表筛选查询条件（不含分页参数） */
export interface EventsFilter {
  keyword?: string
  /** 逗号分隔字符串，传给 mock 端 */
  status?: string
  /** [from, to] ISO 字符串数组 */
  startTimeRange?: [string, string]
}

export interface UseEventsState {
  /** 列表数据 */
  list: Concert[]
  /** 总条数 */
  total: number
  /** 当前页 */
  page: number
  /** 每页条数 */
  pageSize: number
  /** 当前筛选条件（持久在 hook 内部） */
  filter: EventsFilter
  /** 列表首屏 loading */
  loading: boolean
  /** 切页/筛选时 loading（区别于首屏骨架） */
  refreshing: boolean
  /** 当前正在变更的演出 ID（按钮 loading 用） */
  actionLoadingId: string | null
  /** 列表错误 */
  error: string | null
  /** 修改筛选条件并回到第 1 页 */
  setFilter: (next: EventsFilter) => void
  /** 重置筛选条件 */
  resetFilter: () => void
  /** 切页 */
  setPage: (page: number) => void
  /** 切 pageSize（保持当前页不变） */
  setPageSize: (size: number) => void
  /** 手动 reload（保留筛选与分页） */
  reload: () => Promise<void>
  /** 状态变更方法；返回成功 / 失败的语义化结果 */
  publish: (id: string) => Promise<ActionResult>
  offline: (id: string) => Promise<ActionResult>
  stopSale: (id: string) => Promise<ActionResult>
  resumeSale: (id: string) => Promise<ActionResult>
  remove: (id: string) => Promise<ActionResult>
}

export interface ActionResult {
  ok: boolean
  /** 成功时的提示文案 */
  message?: string
  /** 失败时的错误码或文本 */
  code?: number | string
}

const EMPTY_PAGE: PageResult<Concert> = { list: [], total: 0, page: 1, pageSize: 10 }

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

function readErrorCode(e: unknown): number | null {
  const err = e as AxiosLikeError
  return err?.response?.data?.code ?? null
}

function readErrorMessage(e: unknown, fallback = '操作失败'): string {
  const err = e as AxiosLikeError
  return err?.response?.data?.message ?? err?.message ?? fallback
}

/**
 * 演出列表 hook
 *
 * - 内部维护筛选 + 分页状态
 * - 修改筛选时自动回到第 1 页
 * - 列表变更方法（publish/offline/.../remove）完成后自动 reload 一次
 * - 同一时间仅允许一个变更操作（actionLoadingId 单值）
 */
export function useEvents(initialPageSize = 10): UseEventsState {
  const { adminEvent } = useApi()
  const [filter, setFilterState] = useState<EventsFilter>({})
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [data, setData] = useState<PageResult<Concert>>(EMPTY_PAGE)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  /** 把内部 filter 翻译为 API 入参 */
  const buildQuery = useCallback(
    (f: EventsFilter, p: number, ps: number): ListEventsQuery => {
      const q: ListEventsQuery = { page: p, pageSize: ps }
      if (f.keyword?.trim()) q.keyword = f.keyword.trim()
      if (f.status && f.status.trim()) q.status = f.status.trim()
      if (f.startTimeRange && (f.startTimeRange[0] || f.startTimeRange[1])) {
        q.startTimeRange = [f.startTimeRange[0] ?? '', f.startTimeRange[1] ?? '']
      }
      return q
    },
    [],
  )

  const load = useCallback(
    async (mode: 'init' | 'refresh') => {
      if (mode === 'init') setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const res = await adminEvent.listEvents(buildQuery(filter, page, pageSize))
        setData(res)
      } catch (e) {
        setError(readErrorMessage(e, '加载演出列表失败'))
      } finally {
        if (mode === 'init') setLoading(false)
        else setRefreshing(false)
      }
    },
    [adminEvent, buildQuery, filter, page, pageSize],
  )

  useEffect(() => {
    void load('init')
  }, [load])

  const setFilter = useCallback((next: EventsFilter) => {
    setFilterState(next)
    setPageState(1)
  }, [])

  const resetFilter = useCallback(() => {
    setFilterState({})
    setPageState(1)
  }, [])

  const setPage = useCallback((p: number) => {
    setPageState(p)
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    // pageSize 变化时回第 1 页（更符合直觉）
    setPageState(1)
  }, [])

  const reload = useCallback(() => load('refresh'), [load])

  /** 通用 action 包装：设置 loading → 调 API → reload → 返回结果 */
  const wrapAction = useCallback(
    async (
      id: string,
      fn: () => Promise<unknown>,
      successMsg: string,
    ): Promise<ActionResult> => {
      if (actionLoadingId) {
        return { ok: false, code: 'BUSY', message: '上一操作未完成' }
      }
      setActionLoadingId(id)
      try {
        await fn()
        await load('refresh')
        return { ok: true, message: successMsg }
      } catch (e) {
        return {
          ok: false,
          code: readErrorCode(e) ?? 'UNKNOWN',
          message: readErrorMessage(e),
        }
      } finally {
        setActionLoadingId(null)
      }
    },
    [actionLoadingId, load],
  )

  const publish = useCallback(
    (id: string) => wrapAction(id, () => adminEvent.publishEvent(id), '发布成功'),
    [adminEvent, wrapAction],
  )
  const offline = useCallback(
    (id: string) => wrapAction(id, () => adminEvent.offlineEvent(id), '下架成功'),
    [adminEvent, wrapAction],
  )
  const stopSale = useCallback(
    (id: string) => wrapAction(id, () => adminEvent.stopSale(id), '已暂停销售'),
    [adminEvent, wrapAction],
  )
  const resumeSale = useCallback(
    (id: string) => wrapAction(id, () => adminEvent.resumeSale(id), '已恢复销售'),
    [adminEvent, wrapAction],
  )
  const remove = useCallback(
    (id: string) => wrapAction(id, () => adminEvent.deleteEvent(id), '删除成功'),
    [adminEvent, wrapAction],
  )

  return useMemo(
    () => ({
      list: data.list,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      filter,
      loading,
      refreshing,
      actionLoadingId,
      error,
      setFilter,
      resetFilter,
      setPage,
      setPageSize,
      reload,
      publish,
      offline,
      stopSale,
      resumeSale,
      remove,
    }),
    [
      data.list,
      data.total,
      data.page,
      data.pageSize,
      filter,
      loading,
      refreshing,
      actionLoadingId,
      error,
      setFilter,
      resetFilter,
      setPage,
      setPageSize,
      reload,
      publish,
      offline,
      stopSale,
      resumeSale,
      remove,
    ],
  )
}
