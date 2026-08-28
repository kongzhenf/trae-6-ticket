import { getStorageItem, setStorageItem, type Viewer } from '@trae/shared'
import { buildDefaultDB } from './seed'
import type { MockDB } from './types'

const STORAGE_KEY = 'concert_mock_db_v1'

/** 进程内缓存，避免每次都序列化/反序列化 */
let cache: MockDB | null = null

/** 深拷贝：用 JSON 序列化克隆（seed 全部 JSON-safe） */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
void deepClone

/** H8 兜底 + v1.2：旧 orders 可能没有 viewers / contactPhone / idCardFull
 * - 缺 viewers：按 sum(items.quantity) 补足
 * - viewers[i] 缺 idCardFull：从 cipher 解出（4+10 星+4 → 把星号段补 10 位）
 * - 缺 contactPhone：取 viewers[0].phone
 */
const PLACEHOLDER_VIEWER_NAMES = ['王明', '李芳', '张伟', '陈静', '刘洋', '杨帆', '赵磊', '黄琳']

function deriveIdCardFull(cipher: string | undefined): string | undefined {
  if (!cipher || cipher.length !== 18) return undefined
  // 身份证号格式：6 位地区码 + 8 位生日 + 3 位顺序码 + 1 位校验位 = 18 位
  // cipher 脱敏格式：4 位 + 10 个星 + 4 位 = 18 位
  // 星号段覆盖了 地区码末2位 + 生日8位 + 顺序码前4位 = 14 位
  // 这里用默认生日 19900101 补全（mock 数据场景够用）
  if (cipher.slice(4, 14) === '**********') {
    // 6 位地区码（地区码前 4 位 + '00' 兜底） + 8 位生日 + 4 位尾号 = 18 位
    return cipher.slice(0, 4) + '00' + '19900101' + cipher.slice(-4)
  }
  if (/^\d{18}$/.test(cipher)) return cipher
  return undefined
}

function ensureOrderViewers(db: MockDB): number {
  let fixed = 0
  for (const o of db.orders) {
    if (!o.items || o.items.length === 0) continue
    const needQty = o.items.reduce((s, i) => s + (i.quantity || 0), 0)
    const existing = Array.isArray(o.viewers) ? o.viewers.length : 0
    const owner = db.users.find(u => u.id === o.userId)
    const ownerViewers = db.viewers.filter(v => v.userId === o.userId)

    // 路径 1：viewers 已齐但缺 idCardFull 或 idCardFull 不是 18 位（v1.2 升级）— 原位补字段
    if (existing >= needQty) {
      if (!Array.isArray(o.viewers)) o.viewers = []
      let dirty = false
      for (const v of o.viewers) {
        // 长度不是 18 或缺失都视为无效
        if (!v.idCardFull || v.idCardFull.length !== 18) {
          v.idCardFull = deriveIdCardFull(v.idCardCipher)
          if (v.idCardFull) dirty = true
        }
      }
      if (dirty) fixed += 1
      if (!o.contactPhone && o.viewers[0]?.phone) {
        o.contactPhone = o.viewers[0].phone
        fixed += 1
      }
      continue
    }

    // 路径 2：viewers 不足，按 needQty 补齐；顺手把已有的补上 idCardFull
    const list: Viewer[] = []
    for (let i = 0; i < needQty; i++) {
      if (i < existing) {
        const orig = o.viewers![i]!
        // 长度不是 18 或缺失都视为无效，重算
        const idCardFull =
          orig.idCardFull && orig.idCardFull.length === 18
            ? orig.idCardFull
            : deriveIdCardFull(orig.idCardCipher) ?? ''
        list.push({ ...orig, idCardFull })
        continue
      }
      const base = ownerViewers[i - existing] ?? owner
      const idx = i - existing
      const fallbackName = PLACEHOLDER_VIEWER_NAMES[(Number(o.id) + idx) % PLACEHOLDER_VIEWER_NAMES.length]!
      const tail4 = String(1000 + ((Number(o.id) + idx) % 9000)).padStart(4, '0')
      const birth = (19800101 + (((Number(o.id) + idx) * 13) % 10000)).toString().padStart(8, '0').slice(-8)
      const idCardFull = base?.idCardFull ?? `110105${birth}${tail4}`
      const phone = base?.phone ?? `139${String(80000000 + ((Number(o.id) + idx) * 7) % 99999999).padStart(8, '0')}`
      list.push({
        id: `seed-fix-${o.id}-${idx}`,
        userId: o.userId,
        name: base?.name ?? fallbackName,
        idCardCipher: `${idCardFull.slice(0, 4)}**********${idCardFull.slice(-4)}`,
        idCardFull,
        phone,
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
      })
    }
    o.viewers = list
    if (!o.contactPhone) o.contactPhone = list[0]?.phone ?? ''
    fixed += 1
  }
  return fixed
}

/**
 * 把 localStorage 读出的旧数据补齐到完整 schema（H8 兼容）：
 * - 旧 ls 数据可能没有 `users` / `viewers` / `tickets` / `events` 等字段
 * - 与 buildDefaultDB() 浅合并：缺哪个字段补哪个；保留用户已经写入的数据
 * - 这样新增 mock handler 在旧数据下不会因为 `undefined.find` 而抛错
 */
function mergeWithDefault(stored: Partial<MockDB> | null): MockDB {
  const base = buildDefaultDB()
  if (!stored) return base
  return {
    events: Array.isArray(stored.events) ? stored.events : base.events,
    ticketTiers: Array.isArray(stored.ticketTiers) ? stored.ticketTiers : base.ticketTiers,
    stockAdjustments: Array.isArray(stored.stockAdjustments) ? stored.stockAdjustments : base.stockAdjustments,
    orders: Array.isArray(stored.orders) ? stored.orders : base.orders,
    users: Array.isArray(stored.users) ? stored.users : base.users,
    viewers: Array.isArray(stored.viewers) ? stored.viewers : base.viewers,
    /** H10 新增：兼容旧数据 */
    exportTasks: Array.isArray(stored.exportTasks) ? stored.exportTasks : base.exportTasks,
    counters: { ...base.counters, ...(stored.counters ?? {}) },
  }
}

/**
 * 启动时调用一次：把已过期的 pending → cancelled 并归库存
 * - 防止历史脏数据被误认为「待支付」
 * - mock 本地无后台 cron，因此只在首次构建 DB 后跑一次
 */
export function expireOrders(): number {
  const db = getDB()
  const now = Date.now()
  let count = 0
  for (const order of db.orders) {
    if (order.status !== 'pending') continue
    const t = Date.parse((order.expireTime as string).replace(' ', 'T') + 'Z')
    if (Number.isNaN(t) || t > now) continue
    // 归库存
    if (order.items) {
      for (const item of order.items) {
        const tier = db.ticketTiers.find(x => x.id === item.ticketTierId)
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
    count += 1
  }
  if (count > 0) persist()
  return count
}

/** 取当前 DB（首次调用会初始化） */
export function getDB(): MockDB {
  if (cache) return cache
  const stored = getStorageItem<Partial<MockDB> | null>(STORAGE_KEY, null)
  if (stored && stored.events && Array.isArray(stored.events) && stored.events.length > 0) {
    cache = mergeWithDefault(stored)
    // H8 兜底：旧数据可能没有 viewers/contactPhone，自动补足
    const fixed = ensureOrderViewers(cache)
    // 启动时同步清理过期 pending（一次性）
    expireOrders()
    if (fixed > 0) persist()
    return cache
  }
  cache = buildDefaultDB()
  expireOrders()
  persist()
  return cache
}

/** 写回 localStorage */
export function persist(): void {
  if (cache) setStorageItem(STORAGE_KEY, cache)
}

/** 重置为 seed */
export function resetDB(): void {
  cache = buildDefaultDB()
  persist()
}

/** 重新从 localStorage 加载（dev / 测试用，让外部修改 localStorage 后生效） */
export function reloadDB(): void {
  const stored = getStorageItem<Partial<MockDB> | null>(STORAGE_KEY, null)
  if (stored && stored.events && Array.isArray(stored.events) && stored.events.length > 0) {
    cache = mergeWithDefault(stored)
    const fixed = ensureOrderViewers(cache)
    expireOrders()
    if (fixed > 0) persist()
  } else {
    cache = buildDefaultDB()
    expireOrders()
    persist()
  }
}

/** 强制替换（外部直接覆盖 DB 时使用，谨慎） */
export function setDB(db: MockDB): void {
  cache = db
  persist()
}

/** 调试用：当前 DB 的统计信息 */
export function dbStats(): { events: number; tickets: number; orders: number; users: number; viewers: number; adjustments: number } {
  const db = getDB()
  return {
    events: db.events.length,
    tickets: db.ticketTiers.length,
    orders: db.orders.length,
    users: db.users.length,
    viewers: db.viewers?.length ?? 0,
    adjustments: db.stockAdjustments.length,
  }
}

/** 全局自增 ID（跨标签页用 Math.max 防止冲突） */
export function nextId(kind: 'eventId' | 'ticketId' | 'orderId' | 'userId' | 'viewerId' | 'adjustmentId'): string {
  const db = getDB()
  db.counters[kind] += 1
  // 同步取 localStorage 中的最大值，防止多 tab 冲突
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const localMax = parsed?.counters?.[kind] ?? 0
      if (localMax > db.counters[kind]) db.counters[kind] = localMax + 1
    }
  } catch { /* ignore */ }
  persist()
  return String(db.counters[kind])
}
