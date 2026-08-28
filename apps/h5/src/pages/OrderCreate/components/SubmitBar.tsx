import { Button } from 'react-vant'
import { formatMoney } from '@trae/shared'

export interface SubmitBarProps {
  /** 合计金额（分） */
  totalAmount: number
  /** 提交中（防重） */
  submitting: boolean
  /** 表单未通过 / 活动不可购时禁用 */
  disabled: boolean
  onSubmit: () => void
}

/**
 * 吸底「提交订单」
 * - 文案：提交中显示「提交中…」并 disabled
 * - 价格实时同步父组件传入的 totalAmount（H3 已聚合，但 H4 mock handler 服务端重算，）
 */
export default function SubmitBar({ totalAmount, submitting, disabled, onSubmit }: SubmitBarProps) {
  return (
    <div
      data-testid="order-submit-bar"
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>合计</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
          {formatMoney(totalAmount)}
        </div>
      </div>
      <Button
        type="primary"
        round
        disabled={disabled || submitting}
        loading={submitting}
        onClick={onSubmit}
        style={{ minWidth: 140, height: 40, fontSize: 14, fontWeight: 600 }}
      >
        {submitting ? '提交中…' : '提交订单'}
      </Button>
    </div>
  )
}