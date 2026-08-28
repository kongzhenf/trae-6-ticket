import type { OrderStatus } from './order'

/**
 * 支付状态（H9 拆分：与 OrderStatus 解耦）
 * - unpaid：未支付
 * - paying：支付中
 * - paid：已支付
 * - partial_refund：部分退款（本期不启用，预留）
 * - refunding：退款中
 * - refunded：已退款
 * - failed：支付失败（含订单超时）
 */
export type PaymentStatus =
  | 'unpaid'
  | 'paying'
  | 'paid'
  | 'partial_refund'
  | 'refunding'
  | 'refunded'
  | 'failed'

export interface PaymentStatusMeta {
  label: string
  color: 'default' | 'processing' | 'success' | 'warning' | 'error'
}

export interface PaymentStatusTransition {
  from: OrderStatus
  to: PaymentStatus
}
