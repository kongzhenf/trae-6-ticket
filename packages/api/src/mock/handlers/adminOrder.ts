import type { MockRequestContext } from '../types'
import { MockError } from '../types'
import { getDB, persist } from '../store'
import type { Order, OrderAdminView, OrderItem, OrderStatus, PaymentStatus, User, Viewer } from '@trae/shared'

/**
 * H9 业务错误码
 * 400025：订单已退款或已取消，无法再次退款
 * 400026：退款原因至少 4 个字
 */
const CODE_REFUND_NOT_ALLOWED = 400025
const CODE_REFUND_REASON_TOO_SHORT = 400026
const CODE_ORDER_NOT_FOUND = 400012

function fail(code: number, msg: string): never {
  throw new MockError(code, msg)
}

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/** 拼接票档摘要："VIP 内场 × 2 / 看台一等 × 1" */
function buildTicketTierSummary(items: OrderItem[] | undefined): string {
  if (!items || items.length === 0) return '—'
  return items
    .map(i => `${i.categoryNameSnapshot} × ${i.quantity}`)
    .join(' / ')
}

/** 解析 userMobile：contactPhone → viewers[0].phone → user.mobile */
function deriveUserMobile(order: Order, user: User | undefined, viewers: Viewer[] | undefined): string {
  if (order.contactPhone && order.contactPhone.trim()) return order.contactPhone
  if (viewers && viewers.length > 0 && viewers[0]?.phone) return viewers[0].phone
  if (user?.phone) return user.phone
  return ''
}

/** 派生支付状态（与 shared/constants/paymentStatus 对齐；不导入以避免循环） */
function derivePaymentStatus(o: Order): PaymentStatus {
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

function toAdminView(order: Order, db: ReturnType<typeof getDB>): OrderAdminView {
  const event = db.events.find(e => e.id === order.eventId)
  const user = db.users.find(u => u.id === order.userId)
  return {
    ...order,
    eventName: event?.eventName ?? '— 已删除活动 —',
    ticketTierSummary: buildTicketTierSummary(order.items),
    viewerCount: order.viewers?.length ?? 0,
    userMobile: deriveUserMobile(order, user, order.viewers),
  }
}

/**
 * GET /admin/v1/orders
 * Query（AdminOrderQuery，axios 序列化后多选用 `,`）：
 *   - orderNo, eventId, ticketTierId
 *   - userMobile, viewerName, viewerIdCard
 *   - orderStatus (string | OrderStatus[]，多选用 ',' 分隔)
 *   - paymentStatus (PaymentStatus[]，多选用 ',' 分隔)
 *   - createdAtRange, paidAtRange：'YYYY-MM-DD HH:mm:ss,YYYY-MM-DD HH:mm:ss'
 *   - page, pageSize, keyword
 */
export const listOrders = (ctx: MockRequestContext) => {
  const db = getDB()
  const q = (ctx.params ?? {}) as Record<string, unknown>

  let list = [...db.orders]

  // 订单号（精确）
  if (q.orderNo) {
    const no = String(q.orderNo).toLowerCase()
    list = list.filter(o => o.orderNo.toLowerCase().includes(no))
  }
  // 活动
  if (q.eventId) list = list.filter(o => o.eventId === String(q.eventId))
  // 票档（在 items 中任一匹配）
  if (q.ticketTierId) {
    const tid = String(q.ticketTierId)
    list = list.filter(o => o.items?.some(i => i.ticketTierId === tid))
  }
  // 手机号（contactPhone / viewers[].phone / user.mobile 任一）
  if (q.userMobile) {
    const m = String(q.userMobile)
    list = list.filter(o => {
      if (o.contactPhone === m) return true
      if (o.viewers?.some(v => v.phone === m)) return true
      const u = db.users.find(x => x.id === o.userId)
      if (u?.phone === m) return true
      return false
    })
  }
  // 姓名（viewer 模糊）
  if (q.viewerName) {
    const nm = String(q.viewerName).toLowerCase()
    list = list.filter(o => o.viewers?.some(v => v.name.toLowerCase().includes(nm)))
  }
  // 身份证（精确）
  if (q.viewerIdCard) {
    const c = String(q.viewerIdCard)
    list = list.filter(o => o.viewers?.some(v => v.idCardCipher === c))
  }
  // 订单状态（多选）
  if (q.orderStatus) {
    const arr = String(q.orderStatus).split(',').map(s => s.trim()).filter(Boolean) as OrderStatus[]
    if (arr.length) list = list.filter(o => arr.includes(o.status))
  }
  // 支付状态（多选）
  if (q.paymentStatus) {
    const arr = String(q.paymentStatus).split(',').map(s => s.trim()).filter(Boolean) as PaymentStatus[]
    if (arr.length) {
      list = list.filter(o => arr.includes(derivePaymentStatus(o)))
    }
  }
  // 创建时间
  if (q.createdAtRange) {
    const [s, e] = String(q.createdAtRange).split(',').map(x => x.trim())
    if (s) list = list.filter(o => o.createdAt >= s)
    if (e) list = list.filter(o => o.createdAt <= e)
  }
  // 支付时间
  if (q.paidAtRange) {
    const [s, e] = String(q.paidAtRange).split(',').map(x => x.trim())
    list = list.filter(o => {
      if (!o.paidAt) return false
      if (s && o.paidAt < s) return false
      if (e && o.paidAt > e) return false
      return true
    })
  }
  // 关键字（活动名 / 订单号 / 观演人姓名 模糊）
  if (q.keyword) {
    const kw = String(q.keyword).toLowerCase()
    list = list.filter(o => {
      if (o.orderNo.toLowerCase().includes(kw)) return true
      const ev = db.events.find(e => e.id === o.eventId)
      if (ev?.eventName.toLowerCase().includes(kw)) return true
      if (o.viewers?.some(v => v.name.toLowerCase().includes(kw))) return true
      return false
    })
  }

  // 排序：按 createdAt 倒序
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Math.min(200, Number(q.pageSize ?? 20)))
  const sliced = list.slice((page - 1) * pageSize, page * pageSize).map(o => toAdminView(o, db))

  return {
    list: sliced,
    total: list.length,
    page,
    pageSize,
  }
}

/** GET /admin/v1/orders/:id */
export const getOrderDetail = (ctx: MockRequestContext): OrderAdminView => {
  const m = ctx.url.match(/^\/admin\/v1\/orders\/([^/]+)$/)
  const id = m?.[1]
  if (!id) fail(CODE_ORDER_NOT_FOUND, '订单不存在')
  const db = getDB()
  const order = db.orders.find(o => o.id === id)
  if (!order) fail(CODE_ORDER_NOT_FOUND, '订单不存在')
  return toAdminView(order, db)
}

/**
 * POST /admin/v1/orders/:id/refund
 * body: { reason: string }
 *
 * 状态机：
 *   paid / finished → refunded（写 refundedAt + reason，不归库）
 *   pending / cancelled / refunded → 400025
 * reason 长度 ≥ 4，否则 400026
 */
export const refundOrder = (ctx: MockRequestContext): Order => {
  const m = ctx.url.match(/^\/admin\/v1\/orders\/([^/]+)\/refund$/)
  const id = m?.[1]
  if (!id) fail(CODE_ORDER_NOT_FOUND, '订单不存在')

  const body = (ctx.body ?? {}) as { reason?: string }
  const reason = (body.reason ?? '').trim()
  if (reason.length < 4) fail(CODE_REFUND_REASON_TOO_SHORT, '退款原因至少 4 个字')

  const db = getDB()
  const order = db.orders.find(o => o.id === id)
  if (!order) fail(CODE_ORDER_NOT_FOUND, '订单不存在')

  if (order.status === 'pending' || order.status === 'cancelled' || order.status === 'refunded') {
    fail(CODE_REFUND_NOT_ALLOWED, '订单已退款或已取消，无法再次退款')
  }
  // paid / finished 可退
  const nowStr = nowIso()
  order.status = 'refunded'
  order.refundedAt = nowStr
  order.updatedAt = nowStr
  // 把退款原因写入 idempotencyKey 后的某个字段？为简单起见用 console.info；Phase 7 接 audit
  // 记录到 console（占位）
  console.info('[admin refund]', order.orderNo, reason)
  persist()
  return order
}
