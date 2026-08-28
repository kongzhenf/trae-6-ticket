import type { Order } from '../types/order'
import type { PaymentStatus, PaymentStatusMeta } from '../types/payment'

/** 支付状态展示元数据（PRD §B05 + H9） */
export const PAYMENT_STATUS: Record<PaymentStatus, PaymentStatusMeta> = {
  unpaid: { label: '未支付', color: 'default' },
  paying: { label: '支付中', color: 'processing' },
  paid: { label: '已支付', color: 'success' },
  partial_refund: { label: '部分退款', color: 'warning' },
  refunding: { label: '退款中', color: 'processing' },
  refunded: { label: '已退款', color: 'warning' },
  failed: { label: '支付失败', color: 'error' },
}

export const PAYMENT_STATUS_LIST: PaymentStatus[] = [
  'unpaid',
  'paying',
  'paid',
  'partial_refund',
  'refunding',
  'refunded',
  'failed',
]

/**
 * 派生支付状态（H9 工具函数）
 * - 订单状态 → 默认支付状态映射
 * - 与 mock handler 中的 derivePaymentStatus 保持一致
 */
export function derivePaymentStatus(
  o: Pick<Order, 'status' | 'paidAt' | 'refundedAt' | 'expireTime'>,
): PaymentStatus {
  if (o.status === 'refunded') return 'refunded'
  if (o.status === 'paid') return 'paid'
  if (o.status === 'finished') return 'paid'
  if (o.status === 'cancelled') return 'unpaid'
  if (o.status === 'pending') {
    if (o.paidAt) return 'paying'
    const ts = Date.parse((o.expireTime as string).replace(' ', 'T') + 'Z')
    if (!Number.isNaN(ts) && Date.now() > ts) return 'failed'
    return 'unpaid'
  }
  return 'unpaid'
}
