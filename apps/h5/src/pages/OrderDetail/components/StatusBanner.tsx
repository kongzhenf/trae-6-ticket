import { Tag } from 'react-vant'
import type { OrderStatus } from '@trae/shared'
import { orderStatusMeta } from '../utils/orderStatus'

export interface StatusBannerProps {
  status: OrderStatus
  /** 副文案（如「订单已失效」/「请尽快完成支付」） */
  hint?: string
}

/** 顶部状态横幅：彩色背景 + 状态名 + 提示 */
export default function StatusBanner({ status, hint }: StatusBannerProps) {
  const meta = orderStatusMeta(status)
  return (
    <div
      data-testid="order-status-banner"
      data-status={status}
      style={{
        background: meta.color,
        color: meta.textColor,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Tag
        plain
        color={meta.textColor}
        style={{ marginRight: 0, color: meta.textColor, background: 'transparent', borderColor: meta.textColor }}
      >
        {meta.label}
      </Tag>
      {hint && (
        <span style={{ fontSize: 13, color: meta.textColor, flex: 1, minWidth: 0 }}>
          {hint}
        </span>
      )}
    </div>
  )
}