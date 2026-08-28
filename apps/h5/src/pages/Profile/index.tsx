import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Order, OrderStatus } from '@trae/shared'
import { H5_ROUTES, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import UserCard from './components/UserCard'
import OrderStats from './components/OrderStats'
import OrderList from './components/OrderList'
import { useMyOrders } from './hooks/useMyOrders'
import { useUser } from '@/contexts/UserContext'
import { useViewerCount } from './hooks/useViewerCount'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useUser()

  const {
    orders, total, loading, finished, error,
    status, setStatus, refresh, loadMore,
  } = useMyOrders()

  // H8：观众人数量
  const viewerCount = useViewerCount(user?.id)

  // 4 宫格统计（基于 mock 返回的真实 status 计数）
  const counts = useMemo(() => {
    const all = orders.length
    const byStatus = orders.reduce<Record<OrderStatus, number>>(
      (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
      { pending: 0, paid: 0, cancelled: 0, refunded: 0, finished: 0 },
    )
    return {
      all: total || all,
      pending: byStatus.pending,
      paid: byStatus.paid,
      cancelled: byStatus.cancelled,
      refunded: byStatus.refunded,
      finished: byStatus.finished,
    } as Record<'all' | OrderStatus, number>
  }, [orders, total])

  function onItemClick(o: Order) {
    navigate(H5_ROUTES.orderDetail(o.id))
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function onOpenViewers() {
    navigate(H5_ROUTES.profileViewers)
  }

  if (!user) {
    return (
      <PrdPanelHost pageKey="Profile">
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>未登录</div>
      </PrdPanelHost>
    )
  }

  return (
    <PrdPanelHost pageKey="Profile">
      <div
        data-testid="profile-root"
        style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 16 }}
      >
        <UserCard user={user} />
        <OrderStats counts={counts} active={status} onPick={setStatus} />
        <div style={{ marginTop: 8 }}>
          <OrderList
            orders={status ? orders.filter(o => status.includes(o.status)) : orders}
            loading={loading}
            finished={finished}
            error={error ? errorCodeMessage(0, error) : null}
            onLoadMore={loadMore}
            onItemClick={onItemClick}
          />
        </div>

        {/* H8 新增：观演人入口卡 */}
        <div style={{ padding: '16px 12px 0' }}>
          <button
            type="button"
            data-testid="profile-viewers-entry"
            onClick={onOpenViewers}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>观演人</span>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              共 {viewerCount} 位
              <span style={{ marginLeft: 6, color: '#94a3b8' }}>›</span>
            </span>
          </button>
        </div>

        <div style={{ padding: '16px 12px 0' }}>
          <button
            type="button"
            data-testid="profile-logout-btn"
            onClick={() => { void onLogout() }}
            style={{
              width: '100%',
              padding: '12px 0',
              background: '#fff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        </div>
        {/* 隐藏：保留 refresh 接口供将来手动刷新使用 */}
        <span hidden>{typeof refresh}</span>
      </div>
    </PrdPanelHost>
  )
}
