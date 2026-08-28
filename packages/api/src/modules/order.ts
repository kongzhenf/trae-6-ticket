import type { AxiosInstance } from 'axios'
import type { Order, PayMethod, PageQuery, PageResult, ViewerInput } from '@trae/shared'

/**
 * H8 新 payload：
 * - 单票档 + 多张（ticketTierId + quantity 替代 items[]）
 * - viewers 与票一一对应（length === quantity）
 * - contactPhone 是「联系信息」独立字段，与 viewer's phone 分离
 */
export interface CreateOrderPayload {
  concertId: string
  /** 单选票档 ID */
  ticketTierId: string
  /** 数量 [1, min(tier.maxBuy, event.maxBuy, availableStock)] */
  quantity: number
  /** 观演人数组（length === quantity） */
  viewers: ViewerInput[]
  /** 联系手机号（订单通知用） */
  contactPhone: string
  /** 支付方式 */
  payMethod: PayMethod
  /** 可选：幂等键 */
  idempotencyKey?: string
}

export const orderApi = (client: AxiosInstance) => ({
  createOrder: (payload: CreateOrderPayload): Promise<Order> =>
    client.post('/orders', payload).then((r) => r.data as unknown as Order),
  getOrderDetail: (id: string): Promise<Order> =>
    client.get(`/orders/${id}`).then((r) => r.data as unknown as Order),
  listOrders: (query?: PageQuery): Promise<PageResult<Order>> =>
    client
      .get('/orders', { params: query })
      .then((r) => r.data as PageResult<Order>),
  cancelOrder: (id: string): Promise<Order> =>
    client.post(`/orders/${id}/cancel`).then((r) => r.data as unknown as Order),
  pay: (id: string): Promise<Order> =>
    client.post(`/orders/${id}/pay`).then((r) => r.data as unknown as Order),
})
