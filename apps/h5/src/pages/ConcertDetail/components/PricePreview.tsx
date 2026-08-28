import { formatMoney } from '@trae/shared'

export interface PricePreviewProps {
  priceRange: [number, number] | null
  ticketCount: number
}

/**
 * 票价预览卡
 * - priceRange 由 mock 聚合，非前端计算
 * - ticketCount 用于文案「共 N 档票面」；为 0 时展示「暂无票档」+ 中性态
 */
export default function PricePreview({ priceRange, ticketCount }: PricePreviewProps) {
  const hasPrice = !!priceRange && ticketCount > 0
  return (
    <div
      style={{
        margin: '12px 12px 0',
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>票价</div>
      {hasPrice ? (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span style={{ fontSize: 22, color: '#dc2626', fontWeight: 700 }}>
              {formatMoney(priceRange![0])}
            </span>
            {priceRange![0] !== priceRange![1] && (
              <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 6 }}>
                ~ {formatMoney(priceRange![1])}
              </span>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>起</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>共 {ticketCount} 档票面</div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#94a3b8' }}>暂无票档</div>
      )}
    </div>
  )
}