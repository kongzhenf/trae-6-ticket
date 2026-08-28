import { List, Tag } from 'react-vant'
import type { Order, OrderItem, OrderStatus } from '@trae/shared'
import { formatDate, formatMoney } from '@trae/shared'

const STATUS_TAG: Record<OrderStatus, { label: string; type: 'success' | 'warning' | 'danger' | 'primary' | 'default'; color?: string }> = {
  pending:   { label: '待支付', type: 'warning', color: '#c2410c' },
  paid:      { label: '已支付', type: 'success', color: '#16a34a' },
  cancelled: { label: '已取消', type: 'default' },
  refunded:  { label: '已退款', type: 'default' },
  finished:  { label: '已完成', type: 'primary' },
}

export interface OrderListProps {
  orders: Order[]
  loading: boolean
  finished: boolean
  error: string | null
  onLoadMore: () => Promise<void>
  onItemClick?: (order: Order) => void
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
  refunded: '已退款',
  finished: '已完成',
}

/** 我的订单列表（点击进入详情） */
export default function OrderList({ orders, loading, finished, error, onLoadMore, onItemClick }: OrderListProps) {
  if (error) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error}</div>
  }
  if (orders.length === 0 && !loading) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        暂无订单
      </div>
    )
  }
  return (
    <List
      finished={finished}
      onLoad={() => onLoadMore()}
      loadingText="加载中…"
      finishedText="已经到底了"
      style={{ background: 'transparent' }}
    >
      {orders.map(o => {
        const meta = STATUS_TAG[o.status]
        const items = (o.items ?? []) as OrderItem[]
        const firstItem = items[0]
        const firstDesc = firstItem
          ? `${firstItem.categoryNameSnapshot} × ${firstItem.quantity}`
          : '—'
        return (
          <div
            key={o.id}
            data-testid={`order-list-item-${o.id}`}
            data-status={o.status}
            role="button"
            tabIndex={0}
            onClick={() => onItemClick?.(o)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onItemClick?.(o)
            }}
            style={{
              background: '#fff',
              margin: '0 12px 8px',
              borderRadius: 12,
              padding: 14,
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {firstDesc}{items.length > 1 ? ` 等 ${items.length} 项` : ''}
              </div>
              <Tag plain type={meta.type} color={meta.color} style={{ marginRight: 0 }}>
                {STATUS_LABEL[o.status]}
              </Tag>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
              订单号 {o.orderNo} · {formatDate(o.createdAt)}
            </div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>合计</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{formatMoney(o.totalAmount)}</span>
            </div>
          </div>
        )
      })}
    </List>
  )
}