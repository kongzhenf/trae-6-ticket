import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConcertListItem } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

export interface UseConcertDetailState {
  detail: ConcertListItem | null
  loading: boolean
  notFound: boolean
  error: string | null
  refresh: () => Promise<void>
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}

/** mock 业务码：活动不存在（与 packages/api/src/mock/handlers/concert.ts 对齐） */
const CODE_CONCERT_NOT_FOUND = 400003

function readErr(e: unknown, fb = '加载失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fb
}

/**
 * 演出详情 hook
 * - 监听 id 变化自动重拉
 * - 400003 业务码映射为 notFound（用于渲染 NotFound 组件）
 * - 不在此处处理路由跳转，由上层 useEffect / 按钮回调自行决定
 */
export function useConcertDetail(id: string | undefined): UseConcertDetailState {
  const { concert } = useApi()
  const [detail, setDetail] = useState<ConcertListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!id) {
        setDetail(null)
        setNotFound(true)
        setError(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setNotFound(false)
      setError(null)
      try {
        const res = await concert.getConcertDetail(id)
        if (signal?.aborted) return
        setDetail(res)
      } catch (e) {
        if (signal?.aborted) return
        const er = e as AxiosLikeError
        const code = er?.response?.data?.code
        if (code === CODE_CONCERT_NOT_FOUND) {
          setNotFound(true)
          setDetail(null)
        } else {
          setError(readErr(e))
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [concert, id],
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
    () => ({ detail, loading, notFound, error, refresh }),
    [detail, loading, notFound, error, refresh],
  )
}