import { formatMoney } from '@trae/shared'
import type { TicketTier } from '@trae/shared'

export interface ItemsListProps {
  /** 单档票（H8 改） */
  tier?: TicketTier
  /** 数量（H8 改：单组） */
  quantity: number
}

/** 下单页票档明细（H8 改：单档 + 单数量） */
export default function ItemsList({ tier, quantity }: ItemsListProps) {
  if (!tier || quantity <= 0) return null
  const subtotal = tier.price * quantity

  return (
    <div
      data-testid="order-items-list"
      data-tier-id={tier.id}
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '0 12px 12px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
        票档明细
      </div>
      <div
        data-testid={`order-item-${tier.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: '1px solid #f1f5f9',
          fontSize: 13,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#0f172a', fontWeight: 500 }}>{tier.categoryName}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
            {formatMoney(tier.price)} × {quantity}
          </div>
        </div>
        <div style={{ fontWeight: 600, color: '#dc2626' }}>{formatMoney(subtotal)}</div>
      </div>
    </div>
  )
}
