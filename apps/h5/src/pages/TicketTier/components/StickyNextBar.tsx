import { Button } from 'react-vant'
import { formatMoney } from '@trae/shared'

export interface StickyNextBarProps {
  /** 已选数量总和（按票档聚合） */
  totalCount: number
  /** 总价（分），由父组件按 tier.price × qty 聚合 */
  totalAmount: number
  /** 未选时禁用 */
  disabled: boolean
  onNext: () => void
}

/**
 * 吸底「下一步」状态机（H8 文案改）
 * - 未选 → 禁用 + 文案「请先选择票档」
 * - 已选 → 展示总价 + 「下一步：填写联系信息」（H8 起下一步是联系信息 + 观演人）
 * - 始终渲染以保持页面布局稳定
 */
export default function StickyNextBar({ totalCount, totalAmount, disabled, onNext }: StickyNextBarProps) {
  const hasItems = totalCount > 0
  return (
    <div
      data-testid="sticky-next-bar"
      data-count={totalCount}
      data-amount={totalAmount}
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -1px 6px rgba(15,23,42,0.04)',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {hasItems ? `已选 ${totalCount} 张` : '未选择任何票档'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
            {hasItems ? (
              <>
                {formatMoney(totalAmount)}
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>合计</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>—</span>
            )}
          </div>
        </div>
        <Button
          type="primary"
          round
          disabled={disabled || !hasItems}
          onClick={onNext}
          style={{ minWidth: 140, height: 40, fontSize: 14, fontWeight: 600 }}
        >
          下一步：填写联系信息
        </Button>
      </div>
    </div>
  )
}