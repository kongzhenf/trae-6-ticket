import { formatMoney } from '@trae/shared'
import type { OrderItem } from '@trae/shared'

export interface ItemsTableProps {
  items: OrderItem[]
}

/** 详情页票档明细表 */
export default function ItemsTable({ items }: ItemsTableProps) {
  if (!items || items.length === 0) return null
  return (
    <div
      data-testid="order-items-table"
      style={{
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
        票档明细
      </div>
      {items.map((it) => (
        <div
          key={it.id}
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
            <div style={{ color: '#0f172a', fontWeight: 500 }}>{it.categoryNameSnapshot}</div>
            <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
              {formatMoney(it.unitPrice)} × {it.quantity}
            </div>
          </div>
          <div style={{ fontWeight: 600, color: '#dc2626' }}>{formatMoney(it.subtotal)}</div>
        </div>
      ))}
    </div>
  )
}