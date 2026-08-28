import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConcertListItem, TicketTier, TicketTierStatus } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseTicketTiersState {
  concert: ConcertListItem | null
  tiers: TicketTier[]
  loading: boolean
  error: string | null
  notFound: boolean
  refresh: () => Promise<void>
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

const CODE_CONCERT_NOT_FOUND = 400003

function readErr(e: unknown, fb = '加载失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fb
}

/**
 * 拉取单场演出详情 + 票档列表
 * - 并行请求，错误信息分别处理（详情 404 → notFound；票档空 → 当空态处理）
 * - AbortController 避免过期响应覆盖
 */
export function useTicketTiers(concertId: string | undefined): UseTicketTiersState {
  const { concert: api } = useApi()
  const [concert, setConcert] = useState<ConcertListItem | null>(null)
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const seqRef = useRef(0)

  const fetchOnce = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!concertId) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const mySeq = ++seqRef.current
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const [detail, tierList] = await Promise.all([
          api.getConcertDetail(concertId),
          api.listTickets(concertId) as Promise<unknown>,
        ])
        if (mySeq !== seqRef.current || signal?.aborted) return
        setConcert(detail)
        setTiers(Array.isArray(tierList) ? (tierList as TicketTier[]) : [])
      } catch (e) {
        if (mySeq !== seqRef.current || signal?.aborted) return
        const er = e as AxiosLikeError
        if (er?.response?.data?.code === CODE_CONCERT_NOT_FOUND) {
          setNotFound(true)
        } else {
          setError(readErr(e))
        }
      } finally {
        if (mySeq === seqRef.current && !signal?.aborted) setLoading(false)
      }
    },
    [api, concertId],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    void fetchOnce(ctrl.signal)
    return () => ctrl.abort()
  }, [fetchOnce])

  const refresh = useCallback(async (): Promise<void> => {
    await fetchOnce()
  }, [fetchOnce])

  return useMemo(
    () => ({ concert, tiers, loading, error, notFound, refresh }),
    [concert, tiers, loading, error, notFound, refresh],
  )
}

/** 票档状态映射：供 TicketTierCard 复用 */
export function ticketTierStatusMeta(status: TicketTierStatus): {
  label: string
  tagType: 'success' | 'warning' | 'danger' | 'default'
} {
  switch (status) {
    case 'available':
      return { label: '在售', tagType: 'success' }
    case 'sold_out':
      return { label: '售罄', tagType: 'danger' }
    case 'stopped':
      return { label: '已暂停', tagType: 'warning' }
    case 'hidden':
    default:
      return { label: '不可售', tagType: 'default' }
  }
}