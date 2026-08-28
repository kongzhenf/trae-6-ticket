import type { AxiosInstance } from 'axios'
import type { AdminOrderListResult, AdminOrderQuery, Order, OrderAdminView } from '@trae/shared'

/**
 * H9：管理后台订单 API
 * - 路径前缀 /admin/v1/orders（与 PRD §8 后台订单 API 对齐）
 * - listOrders / getOrderDetail / refundOrder
 * - 与 C 端 /api/v1/orders 并存，C 端调用方零改动
 */
export const adminOrderApi = (client: AxiosInstance) => ({
  /** 列表（10 项筛选 + 分页） */
  listOrders: (query: AdminOrderQuery): Promise<AdminOrderListResult> =>
    client
      .get('/admin/v1/orders', { params: query })
      .then((r) => r.data as AdminOrderListResult),

  /** 详情（含 handler join 的 eventName / ticketTierSummary / viewerCount / userMobile） */
  getOrderDetail: (id: string): Promise<OrderAdminView> =>
    client.get(`/admin/v1/orders/${id}`).then((r) => r.data as OrderAdminView),

  /**
   * 退款（mock 已实装，UI 本期仅占位）
   * - body: { reason: string }，长度 ≥ 4
   * - 状态机：仅 paid/finished 可退；其余 400025
   */
  refundOrder: (id: string, reason: string): Promise<Order> =>
    client
      .post(`/admin/v1/orders/${id}/refund`, { reason })
      .then((r) => r.data as Order),
})
