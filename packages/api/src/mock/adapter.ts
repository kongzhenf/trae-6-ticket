import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { matchHandler } from './router'
import { MockError } from './types'
import type { MockRequestContext } from './types'

function safeJsonParse(s: unknown): unknown {
  if (typeof s !== 'string') return s
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function buildUrl(config: InternalAxiosRequestConfig): string {
  // axios 1.x 在 dispatchRequest 阶段会把 baseURL 与 url 合并后写入 config.url，
  // 因此 adapter 阶段 config.url 已是完整路径，不应再拼 baseURL。
  // 但若调用方传入了绝对 URL（http(s)://...），axios 不会合并，此时也不会进 mock。
  let raw = config.url ?? ''
  // 兼容：如果 url 看起来是相对路径且不含 baseURL 前缀，而 baseURL 仍在，
  // 说明 axios 没合并（旧版本兼容）。手动拼一次避免漏匹配。
  if (config.baseURL && !raw.startsWith(config.baseURL) && !/^https?:\/\//i.test(raw)) {
    const base = config.baseURL.replace(/\/$/, '')
    raw = `${base}${raw.startsWith('/') ? '' : '/'}${raw}`
  }
  // 去掉 query string：mock router 的正则按 path-only 匹配。
  // axios 在不同环境（浏览器/node）对 config.url 是否含 query 处理不一致，
  // 这里统一剥离避免漏匹配。
  const qi = raw.indexOf('?')
  return qi >= 0 ? raw.slice(0, qi) : raw
}

function makeError(config: InternalAxiosRequestConfig, code: number, message: string): never {
  const err: any = new Error(message)
  err.config = config
  err.response = {
    data: { code, message, data: null },
    status: code >= 400 && code < 600 ? code : 400,
    statusText: 'Mock Error',
    headers: {},
    config,
  }
  err.isAxiosError = true
  throw err
}

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  // 1. 模拟 50–300ms 网络延迟，让 loading 可见
  await new Promise<void>(r => setTimeout(r, 50 + Math.random() * 250))

  const ctx: MockRequestContext = {
    method: (config.method ?? 'get').toUpperCase(),
    url: buildUrl(config),
    params: config.params,
    body: safeJsonParse(config.data),
    // 透传请求头给 handler（用于 Bearer token 解析等）
    // AxiosHeaders 提供 toJSON() 返回普通对象；普通对象直接 cast
    headers: (() => {
      const h = config.headers as { toJSON?: () => Record<string, string> } | Record<string, string> | undefined
      if (!h) return undefined
      if (typeof h.toJSON === 'function') return h.toJSON()
      return h as Record<string, string>
    })(),
  }

  let result: unknown
  try {
    result = await matchHandler(ctx)
  } catch (e: any) {
    if (e instanceof MockError) {
      makeError(config, e.code, e.message)
    }
    if (e?.isAxiosError) throw e
    // handler 内 throw 的非业务错误 → 系统异常 500001
    makeError(config, 500001, e?.message ?? '系统异常')
  }

  if (result === undefined || result === null) {
    // handler 未定义 → 资源不存在
    makeError(config, 404, `未匹配到 mock handler: ${ctx.method} ${ctx.url}`)
  }

  const response: AxiosResponse = {
    data: { code: 0, message: 'ok', data: result },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
  return response
}