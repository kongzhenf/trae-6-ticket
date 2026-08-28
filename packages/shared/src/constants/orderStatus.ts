import type { OrderStatus } from '../types/order'

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已支付', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
  refunded: { label: '已退款', color: 'blue' },
  finished: { label: '已完成', color: 'purple' },
}

/** H8 兼容别名（admin OrderManage 使用 ORDER_STATUS_META） */
export const ORDER_STATUS_META = ORDER_STATUS

export const ORDER_STATUS_LIST: OrderStatus[] = [
  'pending',
  'paid',
  'cancelled',
  'refunded',
  'finished',
]
