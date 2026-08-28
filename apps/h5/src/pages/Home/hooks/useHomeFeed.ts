import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConcertListItem, ConcertStatus, PageResult } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import type { HomeCategory } from '../components/CategoryTabs'

const PAGE_SIZE = 20

/** 状态参数：
 * - 推荐：on_sale + pending（最近一周开演）
 * - 即将开售：pending
 * - 售票中：on_sale
 */
function statusOfCategory(category: HomeCategory): ConcertStatus[] {
  if (category === 'upcoming') return ['pending']
  if (category === 'on_sale') return ['on_sale']
  return ['on_sale', 'sold_out', 'pending']
}

export interface UseHomeFeedState {
  list: ConcertListItem[]
  total: number
  loading: boolean
  refreshing: boolean
  loadingMore: boolean
  error: string | null
  keyword: string
  category: HomeCategory
  setKeyword: (next: string) => void
  setCategory: (next: HomeCategory) => void
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

interface AxiosLikeError {
  response?: { data?: { code?: number; message?: string } }
  message?: string
}
function readErr(e: unknown, fb = '加载失败'): string {
  const er = e as AxiosLikeError
  return er?.response?.data?.message ?? er?.message ?? fb
}

/**
 * 首页 feed hook
 * - 防抖 300ms 后再请求（H1 简化：输入即查，未做防抖；保留接口便于 H2 加）
 * - 分页：首屏 1 页，下拉加载更多
 */
export function useHomeFeed(): UseHomeFeedState {
  const { concert } = useApi()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<HomeCategory>('recommend')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PageResult<ConcertListItem>>({
    list: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 简易请求序号，防止过期响应覆盖最新结果
  const seqRef = useRef(0)

  const fetchPage = useCallback(
    async (target: number, mode: 'init' | 'refresh' | 'append'): Promise<void> => {
      const mySeq = ++seqRef.current
      if (mode === 'init') setLoading(true)
      else if (mode === 'refresh') setRefreshing(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const res = await concert.listConcerts({
          page: target,
          pageSize: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
          status: statusOfCategory(category).join(','),
        })
        if (mySeq !== seqRef.current) return
        setData(prev =>
          mode === 'append'
            ? { ...res, list: [...prev.list, ...res.list] }
            : res,
        )
        setPage(target)
      } catch (e) {
        if (mySeq !== seqRef.current) return
        setError(readErr(e))
      } finally {
        if (mode === 'init') setLoading(false)
        else if (mode === 'refresh') setRefreshing(false)
        else setLoadingMore(false)
      }
    },
    [concert, keyword, category],
  )

  // 关键词 / 分类 / 初始 → 重置 + 第一页
  useEffect(() => {
    void fetchPage(1, 'init')
  }, [fetchPage])

  const refresh = useCallback((): Promise<void> => fetchPage(1, 'refresh'), [fetchPage])

  const loadMore = useCallback(async (): Promise<void> => {
    if (loading || refreshing || loadingMore) return
    if (data.list.length >= data.total) return
    await fetchPage(page + 1, 'append')
  }, [data.list.length, data.total, fetchPage, loading, loadingMore, page, refreshing])

  return useMemo(
    () => ({
      list: data.list,
      total: data.total,
      loading,
      refreshing,
      loadingMore,
      error,
      keyword,
      category,
      setKeyword,
      setCategory,
      refresh,
      loadMore,
    }),
    [data.list, data.total, loading, refreshing, loadingMore, error, keyword, category, refresh, loadMore],
  )
}
