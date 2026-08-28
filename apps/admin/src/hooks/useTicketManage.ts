import { useCallback, useEffect, useState } from 'react'
import type { Concert, StockAdjustment, TicketTier } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseTicketManageState {
  event: Concert | null
  tickets: TicketTier[]
  /** 当前正在变更的 ticket id（按钮 loading 用） */
  actionLoadingId: string | null
  loading: boolean
  refreshing: boolean
  error: string | null

  reload: () => Promise<void>
  /** 拉取某票档的库存调整日志（mock 端直接读 store，无单独接口） */
  loadStockAdjustments: (ticketId: string) => Promise<StockAdjustment[]>

  create: (
    payload: Parameters<ReturnType<typeof useApi>['adminTicket']['createTicket']>[1],
  ) => Promise<ActionResult>
  update: (id: string, payload: Partial<TicketTier>) => Promise<ActionResult>
  enable: (id: string) => Promise<ActionResult>
  disable: (id: string) => Promise<ActionResult>
  adjustStock: (id: string, delta: number, reason: string) => Promise<ActionResult>
}

export interface ActionResult {
  ok: boolean
  message?: string
  code?: number | string
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}
function readErrCode(e: unknown): number | undefined {
  return (e as AxiosLikeError)?.response?.data?.code ?? undefined
}
function readErrMsg(e: unknown, fallback = '操作失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fallback
}

/**
 * 票档管理 hook
 * - 装载活动详情 + 该活动下全部票档
 * - CRUD + 启用/停售 + 库存调整（写日志）
 * - 单一 actionLoadingId 防并发
 */
export function useTicketManage(eventId: string | undefined): UseTicketManageState {
  const { adminTicket, adminEvent } = useApi()
  const [event, setEvent] = useState<Concert | null>(null)
  const [tickets, setTickets] = useState<TicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (mode: 'init' | 'refresh') => {
      if (!eventId) return
      if (mode === 'init') setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const [ev, ts] = await Promise.all([
          adminEvent.getEvent(eventId),
          adminTicket.listTickets(eventId),
        ])
        setEvent(ev)
        setTickets(ts)
      } catch (e) {
        setError(readErrMsg(e, '加载票档失败'))
      } finally {
        if (mode === 'init') setLoading(false)
        else setRefreshing(false)
      }
    },
    [adminEvent, adminTicket, eventId],
  )

  useEffect(() => {
    void load('init')
  }, [load])

  const reload = useCallback(() => load('refresh'), [load])

  /** 库存调整日志：直接通过 useApi().adminTicket.listStockAdjustments */
  const loadStockAdjustments = useCallback(
    async (ticketId: string) => {
      try {
        return await adminTicket.listStockAdjustments(ticketId)
      } catch {
        return []
      }
    },
    [adminTicket],
  )

  /** 通用 action 包装 */
  const wrap = useCallback(
    async (
      id: string,
      fn: () => Promise<unknown>,
      successMsg: string,
    ): Promise<ActionResult> => {
      if (actionLoadingId) return { ok: false, code: 'BUSY', message: '上一操作未完成' }
      setActionLoadingId(id)
      try {
        await fn()
        await load('refresh')
        return { ok: true, message: successMsg }
      } catch (e) {
        return {
          ok: false,
          code: readErrCode(e),
          message: readErrMsg(e),
        }
      } finally {
        setActionLoadingId(null)
      }
    },
    [actionLoadingId, load],
  )

  const create = useCallback(
    (payload: Parameters<typeof adminTicket.createTicket>[1]) =>
      wrap('new', () => adminTicket.createTicket(eventId!, payload), '新增票档成功'),
    [adminTicket, eventId, wrap],
  )
  const update = useCallback(
    (id: string, payload: Partial<TicketTier>) =>
      wrap(id, () => adminTicket.updateTicket(id, payload), '保存成功'),
    [adminTicket, wrap],
  )
  const enable = useCallback(
    (id: string) => wrap(id, () => adminTicket.enableTicket(id), '已启用'),
    [adminTicket, wrap],
  )
  const disable = useCallback(
    (id: string) => wrap(id, () => adminTicket.disableTicket(id), '已停售'),
    [adminTicket, wrap],
  )
  const adjustStock = useCallback(
    (id: string, delta: number, reason: string) =>
      wrap(id, () => adminTicket.adjustStock(id, { delta, reason }), '库存调整成功'),
    [adminTicket, wrap],
  )

  return {
    event,
    tickets,
    actionLoadingId,
    loading,
    refreshing,
    error,
    reload,
    loadStockAdjustments,
    create,
    update,
    enable,
    disable,
    adjustStock,
  }
}
