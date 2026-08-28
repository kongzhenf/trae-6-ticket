import type { MockRequestContext, MockHandler } from '../types'
import { MockError } from '../types'
import { getDB, nextId, persist } from '../store'
import type { Order, OrderItem, TicketTier, Viewer, ViewerInput } from '@trae/shared'
import { isPhone } from '@trae/shared'

/** 当前 mock 登录用户（H7 之前硬编码；H7 起 parseToken 解析，缺省回退） */
const MOCK_CURRENT_USER_ID = '40001'

/** 业务错误码（与 shared/constants/errorCode 对齐） */
const CODE_EVENT_OFFLINE = 400018 // 已下架
const CODE_NOT_ON_SALE = 400005   // 尚未开售
const CODE_OFF_SALE = 400006      // 已停止售票
const CODE_TIER_NOT_FOUND = 400007
const CODE_SOLD_OUT = 400008
const CODE_STOCK_LOW = 400009
const CODE_BUY_LIMIT = 400010
const CODE_IDEMPOTENT = 400011

/** 幂等窗口（毫秒）；5 秒 */
const IDEMPOTENT_WINDOW_MS = 5_000

/** H8 新 payload */
interface CreateOrderBody {
  concertId?: string
  /** 单选票档（H8 起替代 items[]） */
  ticketTierId?: string
  /** 数量 [1, min(tier.maxBuy, event.maxBuy, stock)] */
  quantity?: number
  /** 观演人数组（长度 === quantity） */
  viewers?: ViewerInput[]
  /** 联系手机号（订单通知用） */
  contactPhone?: string
  payMethod?: 'wechat' | 'alipay' | 'mock'
  idempotencyKey?: string
}

function fail(code: number, msg: string): never {
  throw new MockError(code, msg)
}

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/** 身份证 hash（mock）：末 6 位 + 'BD' */
function idCardHash(cipher: string): string {
  return `${cipher.slice(-6)}BD`
}

/** 校验单条 ViewerInput；throw MockError */
function validateViewer(v: Partial<ViewerInput> | undefined, idx: number): ViewerInput {
  if (!v) fail(400021, `第 ${idx + 1} 位观演人姓名不能为空`)
  if (!v?.name || !v.name.trim()) fail(400021, `第 ${idx + 1} 位观演人姓名不能为空`)
  if (!v?.idCardCipher || v.idCardCipher.length < 15) {
    fail(400022, `第 ${idx + 1} 位观演人身份证号长度不合法（≥15 位）`)
  }
  if (!v?.phone || !isPhone(v.phone)) {
    fail(400023, `第 ${idx + 1} 位观演人手机号格式不正确`)
  }
  return {
    name: v!.name!.trim(),
    idCardCipher: v!.idCardCipher!,
    phone: v!.phone!,
  }
}

/**
 * POST /api/v1/orders
 *
 * 校验顺序（按 plan-order-viewers H8）：
 *   1. 活动存在且在售（400003 / 400018 / 400005 / 400006）
 *   2. 销售时间窗口（400005）
 *   3. 单 tier + quantity ∈ [1, min(tier.maxBuyQuantity, event.maxBuyQuantity, availableStock)]（400007 / 400008 / 400009 / 400010）
 *   4. 移除"5 张硬上限"，改按 tier.maxBuyQuantity 走
 *   5. 观演人数组校验（400020 / 400021 / 400022 / 400023）
 *   6. 联系手机号校验（11 位）
 *   7. 价格服务端计算
 *   8. 幂等（同 buyer.idCardHash + 同 items hash，5 秒内返回旧订单）
 *   9. 观演人自动落库（按 userId + idCardHash 判重）
 *  10. expireTime = now + event.orderTimeoutMinutes
 *  11. 锁定库存
 *  12. 写入 OrderItem 快照
 *  13. 返回 Order（含 viewers[]）
 */
export const createOrder: MockHandler = (ctx: MockRequestContext): Order => {
  const body = (ctx.body ?? {}) as CreateOrderBody
  const concertId = body.concertId
  if (!concertId) fail(400003, '活动不存在')

  // 联系手机号校验（H8）
  const contactPhone = body.contactPhone?.trim() ?? ''
  if (!isPhone(contactPhone)) fail(400016, '请填写有效的联系手机号')

  const ticketTierId = body.ticketTierId
  if (!ticketTierId) fail(400007, '票档不存在')

  const quantity = Number(body.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) fail(400009, '数量必须为正整数')

  const viewersRaw = body.viewers
  if (!Array.isArray(viewersRaw)) fail(400020, '观演人数组缺失')
  if (viewersRaw.length !== quantity) fail(400020, '观演人数量与购票数量不一致')

  const payMethod = body.payMethod
  if (!payMethod) fail(400016, '请选择支付方式')

  const db = getDB()
  const event = db.events.find(e => e.id === concertId)
  if (!event) fail(400003, '活动不存在')
  // 状态校验
  if (event.status === 'offline' || event.status === 'cancelled') fail(CODE_EVENT_OFFLINE, '活动已下架')
  if (event.status === 'draft' || event.status === 'pending' || event.status === 'finished') {
    fail(CODE_NOT_ON_SALE, '尚未开售')
  }
  if (event.status === 'off_sale' || event.status === 'stopped') fail(CODE_OFF_SALE, '已停止售票')

  // 销售窗口校验
  const saleStart = Date.parse((event.saleStartTime as string).replace(' ', 'T') + 'Z')
  const saleEnd = Date.parse((event.saleEndTime as string).replace(' ', 'T') + 'Z')
  const now = Date.now()
  if (!Number.isNaN(saleStart) && now < saleStart) fail(CODE_NOT_ON_SALE, '尚未开售')
  if (!Number.isNaN(saleEnd) && now > saleEnd) fail(CODE_NOT_ON_SALE, '已结束销售')

  // 单 tier 校验
  const tier = db.ticketTiers.find(t => t.id === ticketTierId && t.eventId === concertId)
  if (!tier) fail(CODE_TIER_NOT_FOUND, '票档不存在')
  if (tier.status === 'hidden') fail(CODE_TIER_NOT_FOUND, '票档不存在')
  if (tier.status === 'sold_out' || tier.availableStock <= 0) fail(CODE_SOLD_OUT, '票档已售罄')

  // 上限：min(tier.maxBuy, event.maxBuy, availableStock)；移除「全场硬上限 5 张」
  const eventHardLimit = event.maxBuyQuantity
  const maxQty = Math.min(tier.maxBuyQuantity, eventHardLimit, tier.availableStock)
  if (quantity > maxQty) {
    if (quantity > tier.availableStock) fail(CODE_STOCK_LOW, '库存不足')
    if (quantity > tier.maxBuyQuantity) fail(CODE_BUY_LIMIT, '超出单票档限购')
    if (quantity > eventHardLimit) fail(CODE_BUY_LIMIT, `本场每人限购 ${eventHardLimit} 张`)
    fail(CODE_BUY_LIMIT, '超出限购')
  }

  // 观演人字段逐个校验
  const viewers: ViewerInput[] = viewersRaw.map((v, i) => validateViewer(v, i))

  // 幂等：同 viewers.idCardCipher 排序 + 同 ticketTierId + 同 quantity
  const idemFingerprint = viewers
    .map(v => idCardHash(v.idCardCipher))
    .sort()
    .join(',')
  const idemKey = `${concertId}|${ticketTierId}|${quantity}|${idemFingerprint}`
  const recent = db.orders.find(o =>
    o.eventId === concertId
    && o.items?.length === 1
    && o.items[0].ticketTierId === ticketTierId
    && o.items[0].quantity === quantity
    && o.viewers?.map(v => idCardHash(v.idCardCipher)).sort().join(',') === idemFingerprint
    && o.status === 'pending'
    && (Date.now() - Date.parse((o.createdAt as string).replace(' ', 'T') + 'Z')) < IDEMPOTENT_WINDOW_MS,
  )
  if (recent) fail(CODE_IDEMPOTENT, '请勿重复提交')

  // 价格服务端重算
  const nowStr = nowIso()
  const expireMs = event.orderTimeoutMinutes * 60 * 1000
  const expireStr = new Date(now + expireMs).toISOString().replace('T', ' ').slice(0, 19)

  // 锁定库存
  const tierLocked: TicketTier = tier
  tierLocked.availableStock -= quantity
  tierLocked.lockedStock += quantity
  tierLocked.updatedAt = nowStr

  // 观演人自动落库：同 userId + 同 idCardHash 已存在则复用，不重复添加
  const resolvedViewers: Viewer[] = []
  for (const v of viewers) {
    const hash = idCardHash(v.idCardCipher)
    let exists = db.viewers.find(x => x.userId === MOCK_CURRENT_USER_ID && idCardHash(x.idCardCipher) === hash)
    if (exists) {
      // 已有：可选择更新姓名 / 手机号（保留 cipher 不变以保持 hash 稳定）
      exists = {
        ...exists,
        name: v.name,
        phone: v.phone,
        updatedAt: nowStr,
      }
      const idx = db.viewers.findIndex(x => x.id === exists!.id)
      if (idx >= 0) db.viewers[idx] = exists!
      resolvedViewers.push(exists!)
    } else {
      const id = nextId('viewerId')
      const newViewer: Viewer = {
        id,
        userId: MOCK_CURRENT_USER_ID,
        name: v.name,
        idCardCipher: v.idCardCipher,
        phone: v.phone,
        createdAt: nowStr,
        updatedAt: nowStr,
      }
      db.viewers.unshift(newViewer)
      resolvedViewers.push(newViewer)
    }
  }

  // 创建 Order
  const orderId = nextId('orderId')
  const orderNo = `CON${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${orderId.padStart(8, '0')}`
  const orderItems: OrderItem[] = [{
    id: `oi-${orderId}-0`,
    orderId,
    ticketTierId: tierLocked.id,
    categoryNameSnapshot: tierLocked.categoryName,
    unitPrice: tierLocked.price,
    quantity,
    subtotal: tierLocked.price * quantity,
  }]
  const order: Order = {
    id: orderId,
    orderNo,
    userId: MOCK_CURRENT_USER_ID,
    eventId: concertId,
    items: orderItems,
    viewers: resolvedViewers,
    contactPhone,
    payMethod,
    idempotencyKey: idemKey,
    totalAmount: tierLocked.price * quantity,
    discountAmount: 0,
    payAmount: tierLocked.price * quantity,
    status: 'pending',
    expireTime: expireStr,
    createdAt: nowStr,
    updatedAt: nowStr,
  }
  db.orders.unshift(order)
  persist()
  return order
}

/** 占位：H6 之前 orders GET 暂不消费 */
export const listOrders: MockHandler = (ctx: MockRequestContext): { list: Order[]; total: number; page: number; pageSize: number } => {
  const db = getDB()
  const params = (ctx.params ?? {}) as Record<string, unknown>
  const userId = (params.userId as string | undefined) ?? MOCK_CURRENT_USER_ID
  const rawStatus = (params.status as string | undefined)?.split(',').map(s => s.trim()).filter(Boolean)
  let list = db.orders.filter(o => o.userId === userId)
  if (rawStatus && rawStatus.length) list = list.filter(o => rawStatus.includes(o.status))
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = Math.max(1, Math.min(50, Number(params.pageSize ?? 10)))
  const sorted = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const sliced = sorted.slice((page - 1) * pageSize, page * pageSize)
  return { list: sliced, total: sorted.length, page, pageSize }
}

/** 占位：H6 之前 GET /:id 暂返回第一条（H4 内部用不到，预留 H5） */
export const getOrderDetail = (ctx: MockRequestContext): Order => {
  const id = (ctx.url.match(/\/api\/v1\/orders\/([^/?]+)/) ?? [])[1]
  const db = getDB()
  const o = db.orders.find(x => x.id === id)
  if (!o) throw new MockError(400012, '订单不存在')
  return o
}

/**
 * POST /api/v1/orders/:id/cancel
 * - 仅 pending 可取消 → 400013
 * - 已过期 pending 允许直接取消（H6 §11）
 * - 归库存：lockedStock -= qty, availableStock += qty
 * - cancelledAt = now
 */
export const cancelOrder: MockHandler = (ctx: MockRequestContext): Order => {
  const id = (ctx.url.match(/\/api\/v1\/orders\/([^/]+)\/cancel/) ?? [])[1]
  const db = getDB()
  const order = db.orders.find(o => o.id === id)
  if (!order) throw new MockError(400012, '订单不存在')
  if (order.status !== 'pending') throw new MockError(400013, '订单已失效')

  // 归库存（仅当仍有 lockedStock）
  if (order.items) {
    for (const item of order.items) {
      const tier = db.ticketTiers.find(t => t.id === item.ticketTierId)
      if (!tier) continue
      tier.lockedStock = Math.max(0, tier.lockedStock - item.quantity)
      tier.availableStock = Math.min(tier.totalStock, tier.availableStock + item.quantity)
      tier.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19)
    }
  }
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)
  order.status = 'cancelled'
  order.cancelledAt = nowStr
  order.updatedAt = nowStr
  persist()
  return order
}

/**
 * POST /api/v1/orders/:id/pay
 *
 * - 仅 pending 可支付 → 400013
 * - 已 paid 再次 pay → 200 OK 返回原订单（PRD §31 第 5 条幂等）
 * - setTimeout 模拟通道耗时（1500ms）由前端 mockPaySdk 控制，不在后端阻塞
 * - 成功：status=paid, paidAt=now, entryCode='MOCK-' + orderNo.slice(-8)
 *         归 lockedStock -= qty, soldStock += qty；availableStock 不变
 * - 价格快照不变（PRD §31 第 7 条）
 */
export const payOrder: MockHandler = (ctx: MockRequestContext): Order => {
  const id = (ctx.url.match(/\/api\/v1\/orders\/([^/]+)\/pay/) ?? [])[1]
  const db = getDB()
  const order = db.orders.find(o => o.id === id)
  if (!order) throw new MockError(400012, '订单不存在')

  // 幂等：已 paid 直接返回原订单
  if (order.status === 'paid') return order
  if (order.status !== 'pending') throw new MockError(400013, '订单已失效')

  // 检查是否过期（plan §H6 §11）
  const expireTs = Date.parse((order.expireTime as string).replace(' ', 'T') + 'Z')
  if (!Number.isNaN(expireTs) && Date.now() > expireTs) {
    throw new MockError(400013, '订单已失效')
  }

  // 归库：lockedStock → soldStock
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)
  if (order.items) {
    for (const item of order.items) {
      const tier = db.ticketTiers.find(t => t.id === item.ticketTierId)
      if (!tier) continue
      tier.lockedStock = Math.max(0, tier.lockedStock - item.quantity)
      tier.soldStock = (tier.soldStock ?? 0) + item.quantity
      tier.updatedAt = nowStr
    }
  }

  order.status = 'paid'
  order.paidAt = nowStr
  order.entryCode = `MOCK-${order.orderNo.slice(-8)}`
  order.updatedAt = nowStr
  persist()
  return order
}
