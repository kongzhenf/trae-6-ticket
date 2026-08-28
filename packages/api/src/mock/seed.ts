import type {
  Concert,
  ConcertStatus,
  TicketTier,
  ExportTask,
  Order,
  OrderStatus,
  User,
  Viewer,
} from '@trae/shared'
import type { MockDB } from './types'

/** 当前时间相对锚点：seed 全部基于 now 偏移，使「今日订单 / 今日销售」有真实数据 */
const NOW = new Date()
const dayMs = 24 * 60 * 60 * 1000
const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19)
const offset = (daysFromNow: number, hour = 19, minute = 30) => {
  const d = new Date(NOW.getTime() + daysFromNow * dayMs)
  d.setHours(hour, minute, 0, 0)
  return iso(d)
}

/** 30 场演出覆盖 10 个状态（每状态至少 2 条） */
const STATUS_POOL: ConcertStatus[] = [
  'draft', 'draft',
  'pending', 'pending',
  'published', 'published',
  'on_sale', 'on_sale', 'on_sale', 'on_sale',
  'off_sale', 'off_sale',
  'stopped', 'stopped',
  'sold_out', 'sold_out',
  'finished', 'finished',
  'offline', 'offline',
  'cancelled', 'cancelled',
]

const VENUES = [
  { name: '上海体育馆', city: '上海', address: '上海市徐汇区漕溪北路1111号', longitude: 121.43, latitude: 31.18 },
  { name: '北京工人体育场', city: '北京', address: '北京市朝阳区工人体育场北路', longitude: 116.45, latitude: 39.93 },
  { name: '广州体育馆', city: '广州', address: '广州市白云区白云大道南783号', longitude: 113.27, latitude: 23.16 },
  { name: '深圳湾体育中心', city: '深圳', address: '深圳市南山区滨海大道3001号', longitude: 113.95, latitude: 22.52 },
  { name: '杭州奥体中心', city: '杭州', address: '杭州市滨江区钱江一路1号', longitude: 120.21, latitude: 30.21 },
  { name: '成都凤凰山体育公园', city: '成都', address: '成都市金牛区北星大道', longitude: 104.08, latitude: 30.69 },
]

const ARTISTS = ['周杰伦', '林俊杰', '五月天', '陈奕迅', '薛之谦', '毛不易', '李荣浩', '邓紫棋', '蔡依林', 'TFBOYS', 'BLACKPINK', 'Taylor Swift', 'Coldplay', 'Ed Sheeran', 'Bruno Mars']

const PREFIX = ['2026 巡回演唱会', '跨年演唱会', '世界巡回', '粉丝见面会', 'Live Concert', '夏日音乐节', '回归演唱会', '出道周年', '全国巡演', '首场演唱会']

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildEvents(): { events: Concert[]; nextId: number } {
  const events: Concert[] = []
  for (let i = 0; i < 30; i++) {
    // STATUS_POOL 有 20 个，循环 30 次时取模复用，确保 30 条数据全部携带合法 status
    const status = STATUS_POOL[i % STATUS_POOL.length]
    const venue = rand(VENUES)
    const eventId = 10000 + i + 1
    const futureOffset = Math.floor(Math.random() * 60) + 7
    const pastOffset = -Math.floor(Math.random() * 30) - 1
    const isPast = status === 'finished' || status === 'cancelled' || status === 'offline'
    const startDayOffset = isPast ? pastOffset : futureOffset
    const saleDayOffset = isPast ? pastOffset - 10 : -7
    const created = NOW.getTime() - (60 - i) * dayMs
    events.push({
      id: String(eventId),
      eventName: `${rand(ARTISTS)} ${rand(PREFIX)} - ${venue.city}站`,
      subtitle: `${venue.city}站 / ${rand(['限时', '首场', '返场', '加场'])}`,
      coverUrl: `https://picsum.photos/seed/${eventId}/600/400`,
      bannerUrl: `https://picsum.photos/seed/banner-${eventId}/1200/400`,
      detailContent: `## 演出介绍\n\n本场演出由${rand(ARTISTS)}亲自领衔，融合经典与新作，带来震撼视听盛宴。\n\n## 节目亮点\n\n- 多首新歌首唱\n- 经典曲目大合唱\n- 神秘嘉宾助阵\n\n## 注意事项\n\n1. 实名购票，一证一票\n2. 演出前 60 分钟开始入场\n3. 禁止携带专业摄影设备`,
      startTime: offset(startDayOffset),
      endTime: offset(startDayOffset, 22, 0),
      venueName: venue.name,
      venueAddress: venue.address,
      longitude: venue.longitude,
      latitude: venue.latitude,
      saleStartTime: offset(saleDayOffset, 10, 0),
      saleEndTime: offset(startDayOffset - 1, 22, 0),
      orderTimeoutMinutes: 15,
      maxBuyQuantity: 4,
      showStock: true,
      refundEnabled: status !== 'cancelled',
      status,
      publishStatus: status === 'draft' || status === 'pending' ? 'draft' : 'published',
      creatorId: 'admin-1',
      createdAt: iso(new Date(created)),
      updatedAt: iso(new Date(created + i * 3600 * 1000)),
    })
  }
  return { events, nextId: 10030 + 1 }
}

function buildTickets(events: Concert[]): { tickets: TicketTier[]; nextId: number } {
  const tickets: TicketTier[] = []
  let tid = 20000
  const categoryNames = ['VIP 内场', '内场 A 区', '看台一等', '看台二等', '学生票']
  for (const ev of events) {
    // 草稿 / 待开售 / 已下架 / 已取消 不分配票档（演示状态不健全）
    if (['draft', 'pending', 'offline', 'cancelled'].includes(ev.status)) continue
    const tierCount = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < tierCount; i++) {
      tid += 1
      const basePrice = [38000, 68000, 98000, 128000, 198000][i] // 380 / 680 / 980 / 1280 / 1980 元
      const total = 200 + Math.floor(Math.random() * 800)
      let sold = 0
      let available = total
      const locked = 0
      if (ev.status === 'on_sale') {
        sold = Math.floor(total * 0.3)
        available = total - sold
      } else if (ev.status === 'sold_out') {
        sold = total
        available = 0
      } else if (ev.status === 'finished') {
        sold = total
        available = 0
      } else if (ev.status === 'off_sale' || ev.status === 'stopped') {
        sold = Math.floor(total * 0.4)
        available = total - sold
      }
      const status: TicketTier['status'] = available === 0 ? 'sold_out' : (ev.status === 'off_sale' || ev.status === 'stopped' ? 'stopped' : 'available')
      tickets.push({
        id: String(tid),
        eventId: ev.id,
        categoryName: categoryNames[i] ?? `${i + 1}号票档`,
        price: basePrice,
        totalStock: total,
        availableStock: available,
        lockedStock: locked,
        soldStock: sold,
        maxBuyQuantity: 2 + (i === 0 ? 1 : 0),
        saleStartTime: ev.saleStartTime,
        saleEndTime: ev.saleEndTime,
        status,
        sort: i,
        description: i === 0 ? '最佳视角，限量供应' : '',
        createdAt: ev.createdAt,
        updatedAt: ev.updatedAt,
      })
    }
  }
  return { tickets, nextId: tid + 1 }
}

function buildOrders(events: Concert[], tickets: TicketTier[], users: User[], allViewers: Viewer[]): { orders: Order[]; nextId: number } {
  const orders: Order[] = []
  let oid = 30000
  const userIds = users.map(u => u.id)
  const viewersByUser = new Map<string, Viewer[]>()
  for (const v of allViewers) {
    const arr = viewersByUser.get(v.userId) ?? []
    arr.push(v)
    viewersByUser.set(v.userId, arr)
  }
  // 给 on_sale / sold_out / finished 演出生成订单
  const orderableEvents = events.filter(e => ['on_sale', 'sold_out', 'finished', 'off_sale'].includes(e.status))
  const target = 120
  while (orders.length < target) {
    const ev = rand(orderableEvents)
    const evTickets = tickets.filter(t => t.eventId === ev.id)
    if (evTickets.length === 0) continue
    const ticket = rand(evTickets)
    if (ticket.soldStock <= 0) continue
    // S-1：qty 均匀覆盖 1-3（plan-order-viewers H8-2：quantity 决定票数，每票对应一观演人）
    const qtyRoll = Math.random()
    const qty = qtyRoll < 0.4 ? 1 : qtyRoll < 0.8 ? 2 : 3
    // 上限按 tier.maxBuyQuantity / availableStock 取小
    const maxAllowed = Math.min(ticket.maxBuyQuantity, ticket.availableStock + ticket.soldStock, 3)
    const finalQty = Math.max(1, Math.min(qty, maxAllowed))
    const subtotal = ticket.price * finalQty
    // 大部分订单已完成支付
    const r = Math.random()
    let status: OrderStatus = 'paid'
    let paidAt: string | undefined
    let cancelledAt: string | undefined
    let refundedAt: string | undefined
    if (r < 0.05) { status = 'pending' }
    else if (r < 0.10) { status = 'cancelled'; cancelledAt = offset(-Math.random() * 20) }
    else if (r < 0.15) { status = 'refunded'; paidAt = offset(-Math.random() * 30); refundedAt = offset(-Math.random() * 5) }
    else { status = 'paid'; paidAt = offset(-Math.random() * 30) }
    // 把 1/4 订单的创建时间设为今日，让 Dashboard「今日订单」非零
    const isToday = orders.length % 4 === 0 && orders.length < 24
    const createdAt = isToday ? offset(-0, Math.floor(Math.random() * 23), Math.floor(Math.random() * 59)) : offset(-Math.random() * 60)
    oid += 1
    const orderId = String(oid)
    // H9 patch：补 viewers[] 与 contactPhone（从该 user 的 viewer 库随机取 1-finalQty 条）
    const userId = rand(userIds)
    const userViewers = viewersByUser.get(userId) ?? []
    const needViewers = Math.min(finalQty, userViewers.length || 1)
    const pickedViewers: Viewer[] = []
    for (let i = 0; i < needViewers; i++) {
      const idx = (orders.length + i) % Math.max(1, userViewers.length)
      pickedViewers.push(userViewers[idx]!)
    }
    // 若 user 没有 viewer 或不够，按 finalQty 补足；每位占位观演人有独立姓名（与「一票一观演人」语义对齐）
    const PLACEHOLDER_NAMES = ['王明', '李芳', '张伟', '陈静', '刘洋', '杨帆', '赵磊', '黄琳']
    while (pickedViewers.length < finalQty) {
      const idx = pickedViewers.length
      const tail4 = String(1000 + ((orders.length + idx) % 9000)).padStart(4, '0')
      const birth = (19800101 + (((orders.length + idx) * 13) % 10000)).toString().padStart(8, '0').slice(-8)
      const idCardFull = `110105${birth}${tail4}`
      pickedViewers.push({
        id: `seed-tmp-${orderId}-${idx}`,
        userId,
        name: PLACEHOLDER_NAMES[(orders.length + idx) % PLACEHOLDER_NAMES.length] ?? `观演人${idx + 1}`,
        idCardCipher: `${idCardFull.slice(0, 4)}**********${idCardFull.slice(-4)}`,
        idCardFull,
        phone: `139${String(80000000 + ((orders.length + idx) * 7) % 99999999).padStart(8, '0')}`,
        createdAt: createdAt,
        updatedAt: createdAt,
      })
    }
    const contactPhone = pickedViewers[0]?.phone ?? ''
    orders.push({
      id: orderId,
      orderNo: `CON${new Date(createdAt).getFullYear()}${String(new Date(createdAt).getMonth() + 1).padStart(2, '0')}${String(oid).padStart(8, '0')}`,
      userId,
      eventId: ev.id,
      // H4 起 Order 必带 items[]；S-1：单 OrderItem（单票档）quantity = finalQty（与 viewers.length === finalQty 一致）
      items: [{
        id: `${orderId}-1`,
        orderId,
        ticketTierId: ticket.id,
        categoryNameSnapshot: ticket.categoryName,
        unitPrice: ticket.price,
        quantity: finalQty,
        subtotal,
      }],
      viewers: pickedViewers,
      contactPhone,
      payMethod: 'mock',
      totalAmount: subtotal,
      discountAmount: 0,
      payAmount: subtotal,
      status,
      expireTime: offset(-0, 23, 59),
      paidAt,
      cancelledAt,
      refundedAt,
      createdAt,
      updatedAt: createdAt,
    })
  }
  return { orders, nextId: oid + 1 }
}

function buildUsers(): User[] {
  const users: User[] = []
  const REAL_NAMES = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十', '冯甲', '陈乙']
  for (let i = 0; i < 50; i++) {
    const id = String(40000 + i + 1)
    const name = REAL_NAMES[i % REAL_NAMES.length] + (i >= REAL_NAMES.length ? String(Math.floor(i / REAL_NAMES.length) + 1) : '')
    // 18 位身份证 mock；mask 字段（idCardCipher）按 §31 第 16 条仅保前4+****+后4
    const idCardFull = `110105${String(19900101 + i).padStart(8, '0')}${String(1000 + i).padStart(4, '0')}`
    const cipher = `${idCardFull.slice(0, 4)}**********${idCardFull.slice(-4)}`
    users.push({
      id,
      nickname: `用户${String(i + 1).padStart(3, '0')}`,
      phone: `138${String(10000000 + i).slice(-8)}`,
      role: 'user',
      realName: name,
      idCardCipher: cipher,
      // mock hash：按 §31 第 10 条「身份证后 6 位 + 'BD'」
      idCardHash: `${idCardFull.slice(-6)}BD`,
      realNameStatus: 'verified',
      createdAt: offset(-Math.random() * 180),
    })
  }
  return users
}

/**
 * H8 seed：每个 seed 用户随机生成 1-3 个观演人（避免「下单才存在」的单调感）
 * 身份证号仍按 seed user 的 cipher 风格（前4 + 10个星 + 后4 = 18 位脱敏字符串）
 */
function buildViewers(users: User[]): Viewer[] {
  const viewers: Viewer[] = []
  let oid = 60000
  const REAL_NAMES = ['观演人甲', '观演人乙', '观演人丙', '观演人丁']
  for (const u of users) {
    if (!u.realName || !u.idCardCipher) continue
    const count = 1 + Math.floor(Math.random() * 3) // 1-3
    const usedNames = new Set<string>([u.realName])
    // 用户身份证脱敏串前 14 位 = 110105(区域) + 8 位生日 = 明文前 14 位
    const base14 = u.idCardCipher.slice(0, 14)
    for (let i = 0; i < count; i++) {
      // 找一个未用的姓名
      let name = REAL_NAMES[i % REAL_NAMES.length]
      let guard = 0
      while (usedNames.has(name) && guard < 10) {
        name = `${REAL_NAMES[i % REAL_NAMES.length]}${i + 1}`
        guard += 1
      }
      usedNames.add(name)
      // 同 user 不同身份证：用 base + i 拼一个尾号
      const tail = String(1000 + i).padStart(4, '0')
      const idCardFull = base14 + tail
      const cipher = `${idCardFull.slice(0, 4)}**********${idCardFull.slice(-4)}`
      oid += 1
      const id = String(oid)
      const nowStr = offset(-30 + i, 10, 0)
      viewers.push({
        id,
        userId: u.id,
        name,
        idCardCipher: cipher,
        idCardFull,
        phone: `139${String(80000000 + Number(u.id.slice(-4)) * 100 + i).slice(-8)}`,
        createdAt: nowStr,
        updatedAt: nowStr,
      })
    }
  }
  return viewers
}

/** 默认数据库（每次 resetDB 都从这里 deep clone） */
export function buildDefaultDB(): MockDB {
  const { events, nextId: eventNextId } = buildEvents()
  const { tickets, nextId: ticketNextId } = buildTickets(events)
  const users = buildUsers()
  const viewers = buildViewers(users)
  // H9：buildOrders 现在需要 allViewers 来 patch viewers[] / contactPhone
  const { orders, nextId: orderNextId } = buildOrders(events, tickets, users, viewers)
  const exportTasks = buildExportTasks(events, orders)
  return {
    events,
    ticketTiers: tickets,
    stockAdjustments: [],
    orders,
    users,
    viewers,
    /** H10 新增：导出中心预置 5 条演示任务，覆盖 "一票一观演人" + 4 种状态 */
    exportTasks,
    counters: {
      eventId: eventNextId,
      ticketId: ticketNextId,
      orderId: orderNextId,
      userId: 40051,
      viewerId: viewers.length > 0 ? Number(viewers[viewers.length - 1]?.id ?? 60000) : 60000,
      adjustmentId: 50000,
      /** H10 新增 */
      exportTaskId: 80000 + exportTasks.length,
    },
  }
}

/**
 * 预置 5 条导出任务，覆盖 "一票一观演人" 演示场景：
 *  1) 任务 A：场次 X 的近 30 天已支付订单，状态 completed（多张票 + 多观演人；可下载）
 *  2) 任务 B：场次 Y 的近 7 天全部订单，状态 completed
 *  3) 任务 C：场次 Z 跨 60 天，状态 processing（演示 1.5s 自动轮询）
 *  4) 任务 D：场次 W，状态 failed（演示失败态 UI）
 *  5) 任务 E：场次 V，状态 expired（演示 7 天过期）
 *
 * payloadBase64 故意留空；adminExport.listTasks 会在首次 list 时懒生成（详见 handler）。
 */
function buildExportTasks(events: Concert[], orders: Order[]): ExportTask[] {
  const onSale = events.find(e => e.status === 'on_sale')
  const finished = events.find(e => e.status === 'finished')
  const published = events.find(e => e.status === 'published')
  const offSale = events.find(e => e.status === 'off_sale')
  const soldOut = events.find(e => e.status === 'sold_out')
  if (!onSale || !finished || !published || !offSale || !soldOut) return []

  const now = new Date()
  const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19)
  const daysAgo = (n: number) => {
    const d = new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
    return iso(d)
  }
  const daysAhead = (n: number) => {
    const d = new Date(now.getTime() + n * 24 * 60 * 60 * 1000)
    return iso(d)
  }
  const orderCountForEvent = (eventId: string) =>
    orders.filter(o => o.eventId === eventId).length

  return [
    {
      id: '80001',
      taskNo: `EXP${daysAgo(0).slice(0, 10).replace(/-/g, '')}0001`,
      type: 'order',
      eventId: onSale.id,
      eventName: onSale.eventName,
      filter: {
        eventId: onSale.id,
        orderStatus: ['paid'],
        createdAtRange: [daysAgo(30), daysAgo(0)],
      },
      orderCount: orderCountForEvent(onSale.id),
      orderStatuses: ['paid'],
      paymentStatuses: [],
      createdBy: 'admin-1',
      createdAt: daysAgo(0),
      status: 'completed',
      expireAt: daysAhead(7),
    },
    {
      id: '80002',
      taskNo: `EXP${daysAgo(1).slice(0, 10).replace(/-/g, '')}0002`,
      type: 'order',
      eventId: finished.id,
      eventName: finished.eventName,
      filter: {
        eventId: finished.id,
        orderStatus: [],
        createdAtRange: [daysAgo(7), daysAgo(0)],
      },
      orderCount: orderCountForEvent(finished.id),
      orderStatuses: [],
      paymentStatuses: [],
      createdBy: 'admin-1',
      createdAt: daysAgo(1),
      status: 'completed',
      expireAt: daysAhead(6),
    },
    {
      id: '80003',
      taskNo: `EXP${daysAgo(0).slice(0, 10).replace(/-/g, '')}0003`,
      type: 'order',
      eventId: published.id,
      eventName: published.eventName,
      filter: {
        eventId: published.id,
        orderStatus: [],
        createdAtRange: [daysAgo(60), daysAgo(0)],
      },
      orderCount: 0,
      orderStatuses: [],
      paymentStatuses: [],
      createdBy: 'admin-1',
      createdAt: daysAgo(0),
      status: 'processing',
      expireAt: daysAhead(7),
    },
    {
      id: '80004',
      taskNo: `EXP${daysAgo(2).slice(0, 10).replace(/-/g, '')}0004`,
      type: 'order',
      eventId: offSale.id,
      eventName: offSale.eventName,
      filter: {
        eventId: offSale.id,
        orderStatus: [],
        createdAtRange: [daysAgo(30), daysAgo(0)],
      },
      orderCount: 0,
      orderStatuses: [],
      paymentStatuses: [],
      createdBy: 'admin-1',
      createdAt: daysAgo(2),
      status: 'failed',
      errorMessage: 'mock 注入失败：请联系开发查看',
      expireAt: daysAhead(7),
    },
    {
      id: '80005',
      taskNo: `EXP${daysAgo(8).slice(0, 10).replace(/-/g, '')}0005`,
      type: 'order',
      eventId: soldOut.id,
      eventName: soldOut.eventName,
      filter: {
        eventId: soldOut.id,
        orderStatus: [],
        createdAtRange: [daysAgo(60), daysAgo(30)],
      },
      orderCount: orderCountForEvent(soldOut.id),
      orderStatuses: [],
      paymentStatuses: [],
      createdBy: 'admin-1',
      createdAt: daysAgo(8),
      status: 'completed',
      expireAt: daysAgo(1), // 已过期
    },
  ]
}