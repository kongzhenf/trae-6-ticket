import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Order } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseOrderDetailState {
  order: Order | null
  loading: boolean
  error: string | null
  notFound: boolean
  /** 倒计时是否已归零（仅 pending 状态判定） */
  expired: boolean
  refresh: () => Promise<void>
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

const CODE_NOT_FOUND = 400012

function readErr(e: unknown, fb = '加载失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fb
}

function isExpired(order: Order | null, now: number): boolean {
  if (!order || order.status !== 'pending') return false
  const t = Date.parse((order.expireTime as string).replace(' ', 'T') + 'Z')
  if (Number.isNaN(t)) return false
  return t <= now
}

/**
 * 订单详情 hook
 * - 拉取订单详情；维护 expired 状态（基于 order.expireTime 与本地时钟）
 * - AbortController 防过期响应
 * - H6 之前「立即支付」会变成 disabled（H5 只消费 mock cancelOrder）
 */
export function useOrderDetail(orderId: string | undefined): UseOrderDetailState {
  const { order: api } = useApi()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())
  const seqRef = useRef(0)

  const fetchOnce = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!orderId) {
        setOrder(null)
        setLoading(false)
        return
      }
      const mySeq = ++seqRef.current
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const res = await api.getOrderDetail(orderId)
        if (mySeq !== seqRef.current || signal?.aborted) return
        setOrder(res)
      } catch (e) {
        if (mySeq !== seqRef.current || signal?.aborted) return
        const er = e as AxiosLikeError
        if (er?.response?.data?.code === CODE_NOT_FOUND) setNotFound(true)
        else setError(readErr(e))
      } finally {
        if (mySeq === seqRef.current && !signal?.aborted) setLoading(false)
      }
    },
    [api, orderId],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    void fetchOnce(ctrl.signal)
    return () => ctrl.abort()
  }, [fetchOnce])

  // 1 秒心跳驱动 expired 重新计算（H5 详情倒计时刷新由 CountdownBadge 内部驱动）
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const expired = useMemo(() => isExpired(order, now), [order, now])

  const refresh = useCallback(async (): Promise<void> => {
    await fetchOnce()
  }, [fetchOnce])

  return useMemo(
    () => ({ order, loading, error, notFound, expired, refresh }),
    [order, loading, error, notFound, expired, refresh],
  )
}