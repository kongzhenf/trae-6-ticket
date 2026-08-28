import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Concert, TicketTier } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import {
  getDraftStore,
  type ConcertDraft,
  type DraftTicketItem,
} from '@/stores/concertDraftStore'

export interface UseConcertEditState {
  scopeId: string | null
  draft: ConcertDraft
  dirty: boolean
  currentStep: number

  /** 服务端最新拉到的原始数据（编辑模式下存在；新建为 null） */
  server: Concert | null
  /** 装载状态（仅编辑模式有效） */
  loading: boolean
  /** 保存 / 发布动作进行中 */
  saving: boolean
  publishing: boolean
  /** 最近一次错误 */
  error: string | null
  /** 编辑模式下当前服务器状态 */
  serverStatus: Concert['status'] | null

  /** 局部 patch（任意字段） */
  patch: (next: Partial<ConcertDraft>) => void
  setTickets: (items: DraftTicketItem[]) => void
  next: () => void
  prev: () => void
  goto: (step: number) => void

  /** 保存草稿：编辑 → updateEvent；新建 → createEvent */
  save: () => Promise<{ ok: boolean; id?: string; message?: string; code?: number | string }>
  /** 发布：先 save 再 publishEvent；编辑模式下要求当前状态可转移到 published */
  publish: () => Promise<{
    ok: boolean
    id?: string
    message?: string
    code?: number | string
  }>
  /** 主动清空当前 scope 的草稿 */
  clearDraft: () => void
}

const STEPS_TOTAL = 7

/** 草稿转服务端可接收的 payload（缺字段兜底） */
function draftToPayload(d: ConcertDraft, saleStart: string, saleEnd: string) {
  return {
    eventName: d.eventName,
    subtitle: d.subtitle || undefined,
    coverUrl: d.coverUrl || undefined,
    bannerUrl: d.bannerUrl || undefined,
    startTime: d.startTime,
    endTime: d.endTime || undefined,
    venueName: d.venueName,
    venueAddress: d.venueAddress || undefined,
    longitude: d.longitude,
    latitude: d.latitude,
    saleStartTime: saleStart,
    saleEndTime: saleEnd,
    orderTimeoutMinutes: d.orderTimeoutMinutes,
    maxBuyQuantity: d.maxBuyQuantity,
    refundEnabled: d.refundEnabled,
    showStock: d.showStock,
    detailContent: d.detailContent || undefined,
  }
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
 * 演出编辑 hook
 * - scopeId = 'new' 表示新建
 * - 编辑模式下首次进入时拉取服务端数据，**只有当 store.draft 为初始值时**才覆盖（保留用户已编辑内容）
 * - 保存草稿：createEvent（new）/ updateEvent（编辑）
 * - 发布：先 save 再 publishEvent
 */
export function useConcertEdit(rawId: string | undefined): UseConcertEditState {
  const { adminEvent } = useApi()
  const scopeId = rawId ?? 'new'

  // 每个 scopeId 一个 store
  const store = useMemo(() => getDraftStore(scopeId), [scopeId])

  // 通过订阅获取实时状态
  const [draft, setDraft] = useState<ConcertDraft>(store.getState().draft)
  const [dirty, setDirty] = useState<boolean>(store.getState().dirty)
  const [currentStep, setCurrentStep] = useState<number>(store.getState().currentStep)
  const [server, setServer] = useState<Concert | null>(null)
  const [loading, setLoading] = useState<boolean>(scopeId !== 'new')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = store.subscribe(state => {
      setDraft(state.draft)
      setDirty(state.dirty)
      setCurrentStep(state.currentStep)
    })
    return unsub
  }, [store])

  // DEV-only：把 store API 挂到 window，方便 Playwright 测试与开发调试
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as any).__draftStore = store
    }
  }, [store])

  // 编辑模式下拉取服务端数据
  useEffect(() => {
    let cancelled = false
    if (scopeId === 'new') {
      setLoading(false)
      setServer(null)
      return
    }
    setLoading(true)
    setError(null)
    adminEvent
      .getEvent(scopeId)
      .then(ev => {
        if (cancelled) return
        setServer(ev)
        // 如果 store 中 draft 全部字段都为空（首次进入 / 重置过），用服务端数据填充
        const cur = store.getState().draft
        const isBlank = !cur.eventName && !cur.venueName && !cur.startTime
        if (isBlank) {
          store.getState().patch({
            eventName: ev.eventName,
            subtitle: ev.subtitle ?? '',
            coverUrl: ev.coverUrl ?? '',
            bannerUrl: ev.bannerUrl ?? '',
            startTime: ev.startTime,
            endTime: ev.endTime ?? '',
            venueName: ev.venueName,
            venueAddress: ev.venueAddress ?? '',
            longitude: ev.longitude,
            latitude: ev.latitude,
            detailContent: ev.detailContent ?? '',
            saleStartTime: ev.saleStartTime,
            saleEndTime: ev.saleEndTime,
            orderTimeoutMinutes: ev.orderTimeoutMinutes,
            maxBuyQuantity: ev.maxBuyQuantity,
            refundEnabled: ev.refundEnabled,
            showStock: ev.showStock,
          })
        }
      })
      .catch(e => {
        if (!cancelled) setError(readErrMsg(e, '加载演出失败'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId])

  const patch = useCallback(
    (next: Partial<ConcertDraft>) => {
      store.getState().patch(next)
    },
    [store],
  )
  const setTickets = useCallback(
    (items: DraftTicketItem[]) => {
      store.getState().setTickets(items)
    },
    [store],
  )
  const next = useCallback(() => {
    const s = Math.min(STEPS_TOTAL - 1, store.getState().currentStep + 1)
    store.getState().setStep(s)
  }, [store])
  const prev = useCallback(() => {
    const s = Math.max(0, store.getState().currentStep - 1)
    store.getState().setStep(s)
  }, [store])
  const goto = useCallback(
    (s: number) => {
      const c = Math.max(0, Math.min(STEPS_TOTAL - 1, s))
      store.getState().setStep(c)
    },
    [store],
  )
  const clearDraft = useCallback(() => {
    store.getState().reset()
  }, [store])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const d = store.getState().draft
      const payload = draftToPayload(d, d.saleStartTime, d.saleEndTime)
      let res: Concert
      if (scopeId === 'new') {
        res = await adminEvent.createEvent(payload as Omit<Concert, 'id' | 'status' | 'createdAt' | 'updatedAt'>)
        store.getState().setScope(res.id)
      } else {
        res = await adminEvent.updateEvent(scopeId, payload)
      }
      setServer(res)
      store.getState().markClean()
      // 把服务端最新字段回填（status / createdAt 等）
      const isBlank = !store.getState().draft.eventName
      if (isBlank) {
        // 罕见情况：用户在保存前清空了 draft 但保留了保存动作
        store.getState().patch({
          eventName: res.eventName,
          subtitle: res.subtitle ?? '',
          venueName: res.venueName,
        })
      }
      return { ok: true, id: res.id, message: '保存成功' }
    } catch (e) {
      const code = readErrCode(e)
      const message = readErrMsg(e, '保存失败')
      setError(message)
      return { ok: false, code, message }
    } finally {
      setSaving(false)
    }
  }, [adminEvent, scopeId, store])

  const publish = useCallback(async () => {
    setPublishing(true)
    setError(null)
    try {
      // 先保存
      const saved = await save()
      if (!saved.ok) {
        return saved
      }
      const id = saved.id!
      await adminEvent.publishEvent(id)
      // 重新拉取最新状态
      const ev = await adminEvent.getEvent(id)
      setServer(ev)
      return { ok: true, id, message: '发布成功' }
    } catch (e) {
      const code = readErrCode(e)
      const message = readErrMsg(e, '发布失败')
      setError(message)
      return { ok: false, code, message }
    } finally {
      setPublishing(false)
    }
  }, [adminEvent, save])

  return {
    scopeId,
    draft,
    dirty,
    currentStep,
    server,
    loading,
    saving,
    publishing,
    error,
    serverStatus: server?.status ?? null,
    patch,
    setTickets,
    next,
    prev,
    goto,
    save,
    publish,
    clearDraft,
  }
}

/** Step5 票档草稿转 TicketTier（用于发布后端落库） */
export function draftTicketsToPayload(items: DraftTicketItem[]): Omit<TicketTier, 'id' | 'eventId' | 'availableStock' | 'lockedStock' | 'soldStock' | 'createdAt' | 'updatedAt' | 'status'>[] {
  return items.map(it => ({
    categoryName: it.categoryName,
    price: Math.round(it.price * 100),
    totalStock: it.totalStock,
    maxBuyQuantity: it.maxBuyQuantity,
    saleStartTime: it.saleStartTime,
    saleEndTime: it.saleEndTime,
    sort: it.sort,
    description: it.description,
  }))
}

/** 总票档库存 */
export function sumTotalStock(items: DraftTicketItem[]): number {
  return items.reduce((s, it) => s + (Number(it.totalStock) || 0), 0)
}
