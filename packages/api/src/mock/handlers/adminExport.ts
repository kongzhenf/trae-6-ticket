import type { MockRequestContext } from '../types'
import { MockError } from '../types'
import { getDB, persist } from '../store'
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  derivePaymentStatus,
  formatDate,
  type CreateExportPayload,
  type ExportTask,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
} from '@trae/shared'

/** H10 错误码 */
const CODE_TASK_NOT_FOUND = 400030
const CODE_TASK_NOT_READY = 400031
const CODE_EVENT_REQUIRED = 400032
const CODE_RANGE_INVALID = 400033
const CODE_RANGE_TOO_LARGE = 400034
const CODE_EVENT_NOT_FOUND = 400003

const LINK_TTL_DAYS = 7
const LINK_TTL_MS = LINK_TTL_DAYS * 24 * 60 * 60 * 1000
const PROCESSING_DELAY_MS = 2500
/** 失败注入：5% 概率可控（mock 演示用） */
const FAIL_INJECTION_RATE = 0.05

function fail(code: number, msg: string): never {
  throw new MockError(code, msg)
}

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "EXP202608270001" 风格 */
function makeTaskNo(seq: number): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  return `EXP${ymd}${String(seq).padStart(4, '0')}`
}

function nextExportTaskId(): { id: string; seq: number } {
  const db = getDB()
  db.counters.exportTaskId += 1
  persist()
  return { id: String(db.counters.exportTaskId), seq: db.counters.exportTaskId }
}

/** 自动把已完成但过期的任务标记为 expired */
function autoExpireIfNeeded(t: ExportTask): ExportTask {
  if (t.status === 'completed' && t.expireAt && Date.parse(t.expireAt.replace(' ', 'T') + 'Z') < Date.now()) {
    t.status = 'expired'
    t.payloadBase64 = undefined
    t.filename = undefined
    persist()
  }
  return t
}

/** 复用 adminOrder 列表过滤逻辑（仅取 eventId / orderStatus / createdAtRange） */
function filterOrdersForExport(
  eventId: string,
  orderStatuses: OrderStatus[] | undefined,
  createdAtRange: [string, string],
  paymentStatuses?: PaymentStatus[],
): Order[] {
  const db = getDB()
  let list = db.orders.filter(o => o.eventId === eventId)
  if (orderStatuses && orderStatuses.length > 0) {
    list = list.filter(o => orderStatuses.includes(o.status))
  }
  if (createdAtRange && createdAtRange[0]) list = list.filter(o => o.createdAt >= createdAtRange[0])
  if (createdAtRange && createdAtRange[1]) list = list.filter(o => o.createdAt <= createdAtRange[1])
  if (paymentStatuses && paymentStatuses.length > 0) {
    list = list.filter(o => paymentStatuses.includes(derivePaymentStatus(o)))
  }
  return list
}

/**
 * GET /admin/v1/exports
 * Query：eventId? status? page? pageSize?
 */
export const listTasks = (ctx: MockRequestContext) => {
  const db = getDB()
  const q = (ctx.params ?? {}) as Record<string, unknown>

  let list = [...db.exportTasks].map(autoExpireIfNeeded)

  // 懒生成：seed 或历史任务可能没有 payloadBase64（completed 但无 file）
  // 第一次 listTasks 调用时补齐，让 UI 立即可下载
  let needPersist = false
  for (const t of list) {
    if (t.status === 'completed' && !t.payloadBase64) {
      const orders = filterOrdersForExport(
        t.eventId,
        t.orderStatuses,
        t.filter?.createdAtRange ?? [t.createdAt, t.createdAt],
        t.paymentStatuses,
      )
      const csv = buildOrderCsv(orders, db)
      t.payloadBase64 = utf8ToBase64(csv)
      t.filename = makeFilename(t.eventName, t.taskNo)
      t.mime = 'application/vnd.ms-excel;charset=utf-8'
      t.orderCount = orders.length
      needPersist = true
    }
  }
  if (needPersist) persist()

  if (q.eventId) list = list.filter(t => t.eventId === String(q.eventId))
  if (q.status) {
    const arr = String(q.status).split(',').map(s => s.trim()).filter(Boolean)
    if (arr.length) list = list.filter(t => arr.includes(t.status))
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Math.min(200, Number(q.pageSize ?? 20)))
  const sliced = list.slice((page - 1) * pageSize, page * pageSize)
  return { list: sliced, total: list.length, page, pageSize }
}

/**
 * POST /admin/v1/exports
 * body: CreateExportPayload
 * - 立即返回 processing 状态的任务
 * - setTimeout(2.5s) 后写 completed / failed
 */
export const createTask = (ctx: MockRequestContext): ExportTask => {
  const body = (ctx.body ?? {}) as CreateExportPayload
  const db = getDB()

  // 校验 eventId
  if (!body.eventId) fail(CODE_EVENT_REQUIRED, '请先选择一个演出')
  const event = db.events.find(e => e.id === body.eventId)
  if (!event) fail(CODE_EVENT_NOT_FOUND, '活动不存在')

  // 校验时间区间
  const range = body.filter?.createdAtRange
  if (!range || !Array.isArray(range) || range.length !== 2) {
    fail(CODE_RANGE_INVALID, '时间区间不合法')
  }
  const [start, end] = range
  if (Date.parse(start.replace(' ', 'T') + 'Z') > Date.parse(end.replace(' ', 'T') + 'Z')) {
    fail(CODE_RANGE_INVALID, '时间区间不合法：结束时间不能早于开始时间')
  }
  const span = Date.parse(end.replace(' ', 'T') + 'Z') - Date.parse(start.replace(' ', 'T') + 'Z')
  if (span > 92 * 24 * 60 * 60 * 1000) {
    fail(CODE_RANGE_TOO_LARGE, '导出时间区间超过 92 天上限，请缩小范围')
  }

  const { id, seq } = nextExportTaskId()
  const now = nowIso()
  const task: ExportTask = {
    id,
    taskNo: makeTaskNo(seq % 10000),
    type: body.type ?? 'order',
    eventId: body.eventId,
    eventName: event.eventName,
    filter: {
      eventId: body.eventId,
      orderStatus: body.orderStatuses,
      paymentStatus: body.paymentStatuses,
      createdAtRange: [start, end],
    },
    orderCount: 0,
    orderStatuses: body.orderStatuses ?? [],
    paymentStatuses: body.paymentStatuses ?? [],
    createdBy: 'admin-1',
    createdAt: now,
    status: 'processing',
    expireAt: new Date(Date.now() + LINK_TTL_MS).toISOString().replace('T', ' ').slice(0, 19),
  }
  db.exportTasks.push(task)
  persist()

  // 异步生成（mock 端用 setTimeout 模拟）
  setTimeout(() => {
    try {
      const current = db.exportTasks.find(t => t.id === id)
      if (!current) return
      // 5% 失败注入
      if (Math.random() < FAIL_INJECTION_RATE) {
        current.status = 'failed'
        current.errorMessage = '数据生成失败（mock 注入，请重试）'
        persist()
        return
      }
      const orders = filterOrdersForExport(
        body.eventId,
        body.orderStatuses,
        [start, end],
        body.paymentStatuses,
      )
      const csv = buildOrderCsv(orders, db)
      const base64 = utf8ToBase64(csv)
      current.orderCount = orders.length
      current.status = 'completed'
      current.payloadBase64 = base64
      current.filename = makeFilename(event.eventName, current.taskNo)
      current.mime = 'application/vnd.ms-excel;charset=utf-8'
      persist()
    } catch (e) {
      const current = db.exportTasks.find(t => t.id === id)
      if (current) {
        current.status = 'failed'
        current.errorMessage = (e as Error)?.message ?? '生成失败'
        persist()
      }
    }
  }, PROCESSING_DELAY_MS)

  return task
}

/** GET /admin/v1/exports/:id */
export const getTask = (ctx: MockRequestContext): ExportTask => {
  const m = ctx.url.match(/^\/admin\/v1\/exports\/([^/]+)$/)
  const id = m?.[1]
  if (!id) fail(CODE_TASK_NOT_FOUND, '导出任务不存在')
  const db = getDB()
  const t = db.exportTasks.find(x => x.id === id)
  if (!t) fail(CODE_TASK_NOT_FOUND, '导出任务不存在')
  return autoExpireIfNeeded(t)
}

/** GET /admin/v1/exports/:id/download */
export const downloadTask = (ctx: MockRequestContext) => {
  const m = ctx.url.match(/^\/admin\/v1\/exports\/([^/]+)\/download$/)
  const id = m?.[1]
  if (!id) fail(CODE_TASK_NOT_FOUND, '导出任务不存在')
  const db = getDB()
  const t = db.exportTasks.find(x => x.id === id)
  if (!t) fail(CODE_TASK_NOT_FOUND, '导出任务不存在')

  // 过期检查（在状态前先做，覆盖已完成但过期的）
  if (t.expireAt && Date.parse(t.expireAt.replace(' ', 'T') + 'Z') < Date.now()) {
    if (t.status === 'completed') {
      t.status = 'expired'
      t.payloadBase64 = undefined
      t.filename = undefined
      persist()
    }
  }
  if (t.status !== 'completed' || !t.payloadBase64 || !t.filename) {
    fail(CODE_TASK_NOT_READY, '导出任务未完成 / 已失败 / 已过期，无法下载')
  }
  return {
    base64: t.payloadBase64,
    filename: t.filename,
    mime: t.mime ?? 'application/vnd.ms-excel;charset=utf-8',
  }
}

// ====== CSV 拼装（RFC 4180 简化版）======

const HEADERS = [
  '演出名称',
  '演出时间',
  '场馆',
  '订单号',
  '用户ID',
  '联系手机号',
  '观演人姓名',
  '观演人身份证号',
  '观演人手机号',
  '票档',
  '单价(元)',
  '数量',
  '订单金额(元)',
  '支付状态',
  '订单状态',
  '下单时间',
  '支付时间',
] as const

function csvEscape(v: string): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildOrderCsv(orders: Order[], db: ReturnType<typeof getDB>): string {
  const lines: string[] = []
  lines.push(HEADERS.map(csvEscape).join(','))
  for (const o of orders) {
    const event = db.events.find(e => e.id === o.eventId)
    const item: OrderItem | undefined = o.items?.[0]
    const tier = item ? db.ticketTiers.find(t => t.id === item.ticketTierId) : undefined
    const ps = derivePaymentStatus(o)
    const rowCommon = [
      event?.eventName ?? '',
      event?.startTime ? formatDate(event.startTime) : '',
      event?.venueName ?? '',
      o.orderNo,
      o.userId,
      o.contactPhone ?? '',
      '', // 观演人姓名（行级覆盖）
      '', // 观演人身份证号（行级覆盖）
      '', // 观演人手机号（行级覆盖）
      item?.categoryNameSnapshot ?? tier?.categoryName ?? '',
      item ? (item.unitPrice / 100).toFixed(2) : '',
      String(item?.quantity ?? 0),
      (o.payAmount / 100).toFixed(2),
      PAYMENT_STATUS[ps].label,
      ORDER_STATUS_META[o.status].label,
      formatDate(o.createdAt),
      o.paidAt ? formatDate(o.paidAt) : '',
    ]
    const viewers = o.viewers ?? []
    if (viewers.length === 0) {
      // 兼容旧数据：无人观演人，输出一行（姓名/身份证/手机号为空）
      lines.push(rowCommon.map(csvEscape).join(','))
    } else {
      for (const v of viewers) {
        const row = [...rowCommon]
        row[6] = v.name
        // v1.2：身份证号导出明文（运营 / 财务对账用；prd 顶部红字提示）
        row[7] = v.idCardFull ?? v.idCardCipher
        row[8] = v.phone
        lines.push(row.map(csvEscape).join(','))
      }
    }
  }
  return lines.join('\r\n')
}

function makeFilename(eventName: string, taskNo: string): string {
  // 去除文件名禁用字符
  const safe = eventName.replace(/[\\/:*?"<>|]/g, '_')
  return `订单导出_${safe}_${taskNo}.xls`
}

/** UTF-8 → base64（浏览器端） */
function utf8ToBase64(s: string): string {
  // 1) UTF-8 BOM
  const withBom = '\ufeff' + s
  const bytes = new TextEncoder().encode(withBom)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
