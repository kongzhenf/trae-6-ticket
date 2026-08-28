import type { MockHandler, MockRequestContext } from '../types'
import { MockError } from '../types'
import { getDB, nextId, persist } from '../store'
import { isPhone } from '@trae/shared'
import type { Viewer, ViewerInput } from '@trae/shared'

/** 从 Authorization 头取 userId（无 / 错 → null） */
function getUserIdFromAuth(ctx: MockRequestContext): string | null {
  const hdrs = (ctx.headers ?? {}) as Record<string, string | undefined>
  for (const k of Object.keys(hdrs)) {
    if (k.toLowerCase() !== 'authorization') continue
    const v = hdrs[k]
    if (typeof v !== 'string') continue
    const m = v.match(/^Bearer\s+mock-token-(\d+)$/)
    if (m) return m[1]
  }
  return null
}

/** 身份证 hash（mock）：末 6 位 + 'BD' */
function idCardHash(cipher: string): string {
  return `${cipher.slice(-6)}BD`
}

/** 校验 ViewerInput；不通过 throw MockError */
function validateViewerInput(input: Partial<ViewerInput>, partial = false): ViewerInput {
  if (!partial || input.name !== undefined) {
    if (!input.name || !input.name.trim()) throw new MockError(400021, '观演人姓名不能为空')
  }
  if (!partial || input.idCardCipher !== undefined) {
    if (!input.idCardCipher || input.idCardCipher.length < 15) {
      throw new MockError(400022, '观演人身份证号长度不合法（≥15 位）')
    }
  }
  if (!partial || input.phone !== undefined) {
    if (!input.phone || !isPhone(input.phone)) {
      throw new MockError(400023, '观演人手机号格式不正确')
    }
  }
  return {
    name: input.name?.trim() ?? '',
    idCardCipher: input.idCardCipher ?? '',
    phone: input.phone ?? '',
  }
}

/** 取 url path 中的最后一段 id */
function extractId(url: string, prefix: string): string | null {
  const idx = url.indexOf(prefix)
  if (idx < 0) return null
  const rest = url.slice(idx + prefix.length)
  const m = rest.match(/^([^/?]+)/)
  return m ? m[1] : null
}

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * GET /api/v1/viewers?userId=<id>
 * - 若有 Authorization 头且 query 没传 userId → 默认当前登录 userId
 * - 按 updatedAt 倒序
 */
export const listViewers: MockHandler = (ctx: MockRequestContext): Viewer[] => {
  const params = (ctx.params ?? {}) as Record<string, unknown>
  let userId = (params.userId as string | undefined) ?? ''
  if (!userId) userId = getUserIdFromAuth(ctx) ?? ''
  if (!userId) throw new MockError(400002, '缺少 userId')

  const db = getDB()
  return db.viewers
    .filter(v => v.userId === userId)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * GET /api/v1/viewers/:id
 */
export const getViewer: MockHandler = (ctx: MockRequestContext): Viewer => {
  const id = extractId(ctx.url, '/api/v1/viewers/')
  if (!id) throw new MockError(400012, '观演人不存在')
  const db = getDB()
  const v = db.viewers.find(x => x.id === id)
  if (!v) throw new MockError(400012, '观演人不存在')
  return v
}

/**
 * POST /api/v1/viewers  Body: ViewerInput
 * - 校验三字段
 * - 同 user + 同 idCardHash 已存在 → 400024
 * - 写入 db.viewers，返回新建的 Viewer
 *
 * 注：admin 端调本接口时强制要求 userId 字段；C 端可不传 userId（自动从 auth 解析）。
 */
export const createViewer: MockHandler = (ctx: MockRequestContext): Viewer => {
  const body = (ctx.body ?? {}) as ViewerInput & { userId?: string }
  const valid = validateViewerInput(body)

  // 归属用户：C 端从 auth 解析；admin 端必须传 body.userId
  const userId = body.userId ?? getUserIdFromAuth(ctx) ?? ''
  if (!userId) throw new MockError(400002, '缺少 userId（admin 调用请传 body.userId）')

  const db = getDB()
  if (!db.users.find(u => u.id === userId)) {
    throw new MockError(400002, `用户 ${userId} 不存在`)
  }

  const hash = idCardHash(valid.idCardCipher)
  const dup = db.viewers.find(v => v.userId === userId && idCardHash(v.idCardCipher) === hash)
  if (dup) {
    throw new MockError(400024, '该用户已存在相同身份证号的观演人')
  }

  const id = nextId('viewerId')
  const nowStr = nowIso()
  const viewer: Viewer = {
    id,
    userId,
    name: valid.name,
    idCardCipher: valid.idCardCipher,
    phone: valid.phone,
    createdAt: nowStr,
    updatedAt: nowStr,
  }
  db.viewers.unshift(viewer)
  persist()
  return viewer
}

/**
 * PUT /api/v1/viewers/:id  Body: Partial<ViewerInput>
 * - 部分字段更新；只校验传入的字段
 * - 改 idCardCipher 时重新判重
 */
export const updateViewer: MockHandler = (ctx: MockRequestContext): Viewer => {
  const id = extractId(ctx.url, '/api/v1/viewers/')
  if (!id) throw new MockError(400012, '观演人不存在')
  const body = (ctx.body ?? {}) as Partial<ViewerInput>
  validateViewerInput(body, true)

  const db = getDB()
  const v = db.viewers.find(x => x.id === id)
  if (!v) throw new MockError(400012, '观演人不存在')

  if (body.name !== undefined) v.name = body.name.trim()
  if (body.phone !== undefined) v.phone = body.phone
  if (body.idCardCipher !== undefined) {
    const newHash = idCardHash(body.idCardCipher)
    const dup = db.viewers.find(
      x => x.id !== id && x.userId === v.userId && idCardHash(x.idCardCipher) === newHash,
    )
    if (dup) throw new MockError(400024, '该用户已存在相同身份证号的观演人')
    v.idCardCipher = body.idCardCipher
  }
  v.updatedAt = nowIso()
  persist()
  return v
}

/**
 * DELETE /api/v1/viewers/:id
 */
export const deleteViewer: MockHandler = (ctx: MockRequestContext): { ok: true } => {
  const id = extractId(ctx.url, '/api/v1/viewers/')
  if (!id) throw new MockError(400012, '观演人不存在')
  const db = getDB()
  const idx = db.viewers.findIndex(x => x.id === id)
  if (idx < 0) throw new MockError(400012, '观演人不存在')
  db.viewers.splice(idx, 1)
  persist()
  return { ok: true }
}

/**
 * POST /api/v1/viewers/batch  Body: { ids: string[] }
 * - 过滤掉不存在的 id；返回命中的 Viewer[]
 */
export const batchGetViewers: MockHandler = (ctx: MockRequestContext): Viewer[] => {
  const body = (ctx.body ?? {}) as { ids?: string[] }
  const ids = Array.isArray(body.ids) ? body.ids : []
  const db = getDB()
  return db.viewers.filter(v => ids.includes(v.id))
}
