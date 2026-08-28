import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar } from 'react-vant'
import Placeholder from '@/components/Placeholder'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import PrdPanelHost from '@/components/PrdPanelHost'
import ConcertHeader from './components/ConcertHeader'
import RealNameHint from './components/RealNameHint'
import TicketTierCard from './components/TicketTierCard'
import StickyNextBar from './components/StickyNextBar'
import { useTicketTiers } from './hooks/useTicketTiers'
import { useTicketSelectionStore } from './stores/ticketSelectionStore'
import { H5_ROUTES } from '@trae/shared'
import type { TicketTier } from '@trae/shared'

export default function TicketTier() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { concert, tiers, loading, error, notFound, refresh } = useTicketTiers(id)

  // H8：单票档单选（tierId + qty 替代 items Record）
  const tierId = useTicketSelectionStore(s => s.tierId)
  const qty = useTicketSelectionStore(s => s.qty)
  const enter = useTicketSelectionStore(s => s.enter)
  const setSelection = useTicketSelectionStore(s => s.setSelection)
  const clear = useTicketSelectionStore(s => s.clear)

  // 进入页面：绑定 concertId（一致则保留选择；不一致则清空）
  useEffect(() => {
    if (id) enter(id)
  }, [id, enter])

  // 离开页面（H4 跳走 / 返回首页）清空，避免脏数据
  useEffect(() => {
    return () => {
      clear()
    }
  }, [clear])

  const eventMaxPerUser = concert?.maxBuyQuantity ?? 4

  // 活动整体不可购时禁用 Stepper
  const eventBuyable = !!concert && (concert.status === 'on_sale' || concert.status === 'published')

  // H8：合计仅来自「当前选中」的 tierId/qty 单组（无需多 tier 聚合）
  const { totalCount, totalAmount } = useMemo(() => {
    if (!tierId || qty <= 0) return { totalCount: 0, totalAmount: 0 }
    const t: TicketTier | undefined = tiers.find(x => x.id === tierId)
    if (!t) return { totalCount: 0, totalAmount: 0 }
    return { totalCount: qty, totalAmount: qty * t.price }
  }, [tierId, qty, tiers])

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate(H5_ROUTES.home, { replace: true })
  }

  function goNext() {
    if (!id || !tierId || qty <= 0) return
    navigate(`${H5_ROUTES.orderCreate}?event=${id}&tier=${tierId}&qty=${qty}`)
  }

  return (
    <PrdPanelHost pageKey="TicketTier">
      <div
        data-testid="ticket-tier-root"
        data-concert-id={id ?? ''}
        data-concert-status={concert?.status ?? ''}
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NavBar
          title="选择票档"
          onClickLeft={goBack}
          fixed
          placeholder
          safeAreaInsetTop={false}
        />

        {loading ? (
          <div style={{ paddingTop: 0 }}>
            <LoadingSkeleton rows={3} topGap={false} />
          </div>
        ) : notFound ? (
          <Placeholder title="演出不存在" description="活动已下架或链接失效" />
        ) : error ? (
          <ErrorState description={error} onRetry={() => { void refresh() }} />
        ) : !concert ? (
          <Placeholder title="演出详情" description="暂无数据" />
        ) : (
          <>
            <ConcertHeader concert={concert} now={new Date()} />
            <RealNameHint />
            {!eventBuyable && (
              <div
                data-testid="event-buyable-banner"
                style={{
                  margin: '8px 12px 0',
                  padding: 10,
                  borderRadius: 8,
                  background: '#fff7e6',
                  color: '#c2410c',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                本场当前状态不可购买，仅供浏览
              </div>
            )}
            <div style={{ flex: 1, paddingTop: 8, paddingBottom: 80 }}>
              {tiers.length === 0 ? (
                <EmptyState description="暂无票档" />
              ) : (
                tiers.map(t => (
                  <TicketTierCard
                    key={t.id}
                    tier={t}
                    eventMaxPerUser={eventMaxPerUser}
                    value={t.id === tierId ? qty : 0}
                    disabled={!eventBuyable}
                    onChange={nextQty => setSelection(t.id, nextQty)}
                  />
                ))
              )}
            </div>
            <StickyNextBar
              totalCount={totalCount}
              totalAmount={totalAmount}
              disabled={!eventBuyable}
              onNext={goNext}
            />
          </>
        )}
      </div>
    </PrdPanelHost>
  )
}
