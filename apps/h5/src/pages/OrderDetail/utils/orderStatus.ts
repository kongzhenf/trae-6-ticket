import type { OrderStatus } from '@trae/shared'

/** 状态文案 + 颜色映射（与 plan-phase3-h5-purchase §H5 C05 状态表对齐） */
export interface OrderStatusMeta {
  label: string
  /** 主色（用于横幅背景 / Tag） */
  color: string
  /** 文字色 */
  textColor: string
}

const META: Record<OrderStatus, OrderStatusMeta> = {
  pending:   { label: '待支付', color: '#fff7e6', textColor: '#c2410c' },
  paid:      { label: '已支付', color: '#e6f7ee', textColor: '#16a34a' },
  cancelled: { label: '已取消', color: '#f1f5f9', textColor: '#64748b' },
  refunded:  { label: '已退款', color: '#f1f5f9', textColor: '#64748b' },
  finished:  { label: '已完成', color: '#f1f5f9', textColor: '#64748b' },
}

export function orderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return META[status] ?? { label: '未知', color: '#f1f5f9', textColor: '#94a3b8' }
}

/** 操作可见性（plan §H5 C05 状态表） */
export interface OrderActions {
  /** 主操作（满宽 CTA） */
  primary?: { label: string; kind: 'pay' | 'viewCode' | 'reorder' }
  /** 次操作（次要按钮，可省略） */
  secondary?: { label: string; kind: 'cancel' | 'refund' }
  /** 「立即支付」按钮是否 disabled（H5 倒计时归零时用） */
  payDisabled: boolean
}

export function resolveActions(
  status: OrderStatus,
  expired: boolean,
): OrderActions {
  if (status === 'pending') {
    if (expired) {
      return { primary: { label: '重新下单', kind: 'reorder' }, payDisabled: true }
    }
    return {
      primary: { label: '立即支付', kind: 'pay' },
      secondary: { label: '取消订单', kind: 'cancel' },
      payDisabled: false,
    }
  }
  if (status === 'paid') {
    return {
      primary: { label: '查看入场码', kind: 'viewCode' },
      secondary: { label: '申请退款', kind: 'refund' },
      payDisabled: false,
    }
  }
  // cancelled / refunded / finished
  return { payDisabled: false }
}