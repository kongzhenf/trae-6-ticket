import type { PageQuery, PageResult } from './common'
import type { Viewer } from './viewer'

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'finished'

export type PayMethod = 'wechat' | 'alipay' | 'mock'

/** 订单明细（H4 落地：c4 后端快照必存） */
export interface OrderItem {
  id: string
  orderId: string
  ticketTierId: string
  /** PRD §5.5 必须保存：票档名称快照 */
  categoryNameSnapshot: string
  unitPrice: number // 分
  quantity: number
  subtotal: number // 分
}

/**
 * 订单（H8 起：单票档 + 观演人数组）
 * - items 仍按 items[] 存（H4 落地字段保留）
 * - viewers 与票数一一对应：sum(items.quantity) === viewers.length
 * - contactPhone 用于订单通知（C 端下单页的「联系信息」独立字段）
 */
export interface Order {
  id: string
  orderNo: string
  userId: string
  eventId: string
  /** 幂等键：5 秒窗口去重（H6 完整；H4 预热字段） */
  idempotencyKey?: string
  /** 订单明细（H4 新增；admin 端暂不消费因此标可选） */
  items?: OrderItem[]
  /**
   * 观演人列表（H8 新增；每张票对应一人）
   * 旧数据兼容：mock seed 中历史订单可能为空数组，由详情页兼容展示「—」
   */
  viewers?: Viewer[]
  /** 联系手机号（H8 新增；订单通知用，与观演人手机号独立） */
  contactPhone?: string
  /** 支付方式（H4 新增） */
  payMethod?: PayMethod
  /** 入场码占位（H6 完整；H4 预热字段） */
  entryCode?: string
  totalAmount: number // 分
  discountAmount: number // 分
  payAmount: number // 分
  status: OrderStatus
  expireTime: string
  paidAt?: string
  cancelledAt?: string
  refundedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 管理后台订单查询参数（H9 落地）
 * - 对齐 B05 PRD §4.5 的 10 项查询条件
 * - 数组字段在 axios query 中以 `,` 分隔
 */
export interface AdminOrderQuery extends PageQuery {
  orderNo?: string
  eventId?: string
  ticketTierId?: string
  /** 精确匹配 contactPhone / viewers[].phone */
  userMobile?: string
  /** 模糊匹配 viewers[].name */
  viewerName?: string
  /** 精确匹配 viewers[].idCardCipher */
  viewerIdCard?: string
  orderStatus?: OrderStatus | OrderStatus[]
  /** 多选用 `,` 分隔 */
  paymentStatus?: string
  /** [start, end] ISO 字符串 */
  createdAtRange?: [string, string]
  paidAtRange?: [string, string]
}

/**
 * 管理后台订单行展示形态（H9）
 * - 基础信息 = Order
 * - handler 在 mock 层 join 出来：eventName / ticketTierSummary / viewerCount / userMobile
 * - 前端按需展示，不再二次 join
 */
export interface OrderAdminView extends Order {
  eventName: string
  /** 如 "VIP × 2"；多票档用 " / " 连接 */
  ticketTierSummary: string
  viewerCount: number
  /** 优先 contactPhone → viewers[0].phone → user.mobile */
  userMobile?: string
}

/** 列表响应类型别名 */
export type AdminOrderListResult = PageResult<OrderAdminView>
