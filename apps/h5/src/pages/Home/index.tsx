import { useEffect, useMemo, useRef } from 'react'
import { NavBar, Search, PullRefresh, List } from 'react-vant'
import PrdPanelHost from '@/components/PrdPanelHost'
import ErrorState from '@/components/ErrorState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import CategoryTabs, { type HomeCategory } from './components/CategoryTabs'
import ConcertCard from './components/ConcertCard'
import { useHomeFeed } from './hooks/useHomeFeed'

const CATEGORY_HINT: Record<HomeCategory, string> = {
  recommend: '为你推荐最近热门演出',
  upcoming: '即将开售，0 元预约提醒',
  on_sale: '正在售卖中',
}

/**
 * H5 首页
 * - NavBar（标题 + PRD 按钮已通过 PrdPanelHost 自动注入）
 * - 搜索栏（focus 唤起系统输入法；submit 触发关键词查询）
 * - 分类 Tabs（推荐 / 即将开售 / 售票中）
 * - 列表（react-vant List + 下拉刷新 + 上拉加载更多）
 */
export default function Home() {
  const feed = useHomeFeed()
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 触底加载更多（IntersectionObserver 兜底，react-vant List 也支持 onLoad）
  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        void feed.loadMore()
      }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [feed])

  const hint = useMemo(() => CATEGORY_HINT[feed.category], [feed.category])

  // 首次加载且列表为空：骨架；其他态：错误 / 空 / 列表
  const showInitial = feed.loading && feed.list.length === 0

  // react-vant 3.3.5 List 通过 finished 控制状态；不提供 loading prop
  // finished = 已加载完所有数据时为 true；onLoad 触发加载
  const isFinished = feed.list.length >= feed.total && feed.total > 0

  return (
    <PrdPanelHost pageKey="Home">
      <div className="app-page" style={{ background: '#f7f8fa', minHeight: '100vh' }}>
        <NavBar
          title="演唱会票务"
          style={{ background: '#fff' }}
          fixed
          placeholder
        />

        {/* 搜索栏 */}
        <div style={{ background: '#fff', padding: '0 12px 12px', position: 'sticky', top: 0, zIndex: 5 }}>
          <Search
            value={feed.keyword}
            onSearch={v => {
              feed.setKeyword(v ?? '')
              void feed.refresh()
            }}
            onCancel={() => feed.setKeyword('')}
            placeholder="搜索演出 / 艺人 / 场馆"
            shape="round"
            background="#f1f5f9"
            showAction
            actionText="搜索"
          />
        </div>

        {/* 分类 Tabs */}
        <CategoryTabs value={feed.category} onChange={feed.setCategory} />

        {/* 顶部提示条 */}
        <div
          style={{
            padding: '8px 16px',
            fontSize: 12,
            color: '#64748b',
            background: '#f7f8fa',
          }}
        >
          {hint}
          {feed.total > 0 && ` · 共 ${feed.total} 场`}
        </div>

        {showInitial ? (
          <LoadingSkeleton rows={4} topGap={false} />
        ) : feed.error ? (
          <ErrorState
            title="列表加载失败"
            description={feed.error}
            onRetry={() => void feed.refresh()}
          />
        ) : feed.list.length === 0 ? (
          <EmptyState
            description={
              feed.keyword
                ? `没有找到包含「${feed.keyword}」的演出`
                : '当前分类下暂无演出'
            }
          />
        ) : (
          <PullRefresh onRefresh={() => feed.refresh()}>
            <List
              finished={isFinished}
              onLoad={() => feed.loadMore()}
              loadingText={feed.loadingMore ? '加载中...' : ''}
              finishedText="已经到底了"
            >
              {feed.list.map(item => (
                <ConcertCard key={item.id} item={item} />
              ))}
              <div ref={sentinelRef} style={{ height: 1 }} />
            </List>
          </PullRefresh>
        )}
      </div>
    </PrdPanelHost>
  )
}
