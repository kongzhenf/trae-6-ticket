import type { LoginPayload, LoginResult, User } from '@trae/shared'
import type { MockHandler, MockRequestContext } from '../types'
import { MockError } from '../types'
import { getDB, persist } from '../store'

/** 当前 mock 登录用户（H7 之前硬编码） */
export const MOCK_CURRENT_USER_ID = '40001'

/** token 格式：mock-token-<userId> */
const TOKEN_RE = /^mock-token-(\d+)$/

interface AuthHeader { authorization?: string }

/** 提取 token 中的 userId（无 / 错 → null） */
function parseToken(header: string | undefined): string | null {
  if (!header) return null
  const m = header.match(/^Bearer\s+(\S+)$/)
  if (!m) return null
  const t = m[1]
  const idMatch = t.match(TOKEN_RE)
  return idMatch ? idMatch[1] : null
}

/** mock 账号 → userId（与 seed user id 一致；H7 固定支持 user1/123456） */
function accountToUserId(account: string): string | null {
  // mock: 接受任何 'user<N>' 形式（user1 → 40001）
  const m = account.trim().match(/^user(\d+)$/i)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  // seed user id = 40000 + n
  return String(40000 + n)
}

/**
 * POST /api/v1/auth/login
 * - 账号密码校验：mock 固定接受 user<N>/123456
 * - 返回 { token: 'mock-token-<userId>', user }
 * - 短信登录：若 payload.code === '1234'（mock 验证码）且 account 形如 user<N>，直接成功
 */
export const login: MockHandler = (ctx: MockRequestContext): LoginResult => {
  const body = (ctx.body ?? {}) as Partial<LoginPayload> & { code?: string }
  const account = body.account ?? ''
  const password = body.password ?? ''
  const code = body.code ?? ''

  const userId = accountToUserId(account)
  if (!userId) {
    throw new MockError(400001, '账号格式应为 user<N>（如 user1）')
  }
  const db = getDB()
  const user = db.users.find(u => u.id === userId)
  if (!user) {
    throw new MockError(400001, '账号不存在')
  }
  // 校验密码 或 验证码
  const pwdOk = password === '123456'
  const smsOk = code === '1234'
  if (!pwdOk && !smsOk) {
    throw new MockError(400001, '密码错误（mock 默认 123456）或验证码错误（mock 默认 1234）')
  }
  const token = `mock-token-${userId}`
  return { token, user: user as User }
}

/**
 * GET /api/v1/auth/me
 * - 从 Authorization: Bearer <token> 取 userId
 * - token 缺失 / 错误 → 401
 * - 命中 → 返回 user
 */
export const getCurrentUser: MockHandler = (ctx: MockRequestContext): User => {
  const hdrs = (ctx as MockRequestContext & { headers?: AuthHeader }).headers ?? {}
  const userId = parseToken(hdrs.authorization)
  if (!userId) {
    throw new MockError(401, '未登录')
  }
  const db = getDB()
  const user = db.users.find(u => u.id === userId)
  if (!user) {
    throw new MockError(401, 'token 无效')
  }
  return user as User
}

/**
 * POST /api/v1/auth/logout
 * - mock 阶段无服务端清理；前端清 token 即可
 */
export const logout: MockHandler = (): { ok: true } => {
  // 可在此处记录 logout 时间戳，简化只返回 ok
  persist()
  return { ok: true }
}

