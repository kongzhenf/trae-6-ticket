/**
 * 类型安全的 localStorage 封装
 * SSR / 非浏览器环境下静默失败
 *
 * 注意：在 node 端（mock e2e 测试脚本）若通过 global.localStorage 注入，
 * 此处也会读到，方便离屏验证 mock handler。
 */
function ls(): Storage | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') return window.localStorage
  const g = globalThis as unknown as { localStorage?: Storage }
  if (g?.localStorage) return g.localStorage
  return null
}

export function getStorageItem<T>(key: string, fallback: T): T {
  const s = ls()
  if (!s) return fallback
  try {
    const raw = s.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  const s = ls()
  if (!s) return
  try {
    s.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded 等异常静默忽略
  }
}

export function removeStorageItem(key: string): void {
  const s = ls()
  if (!s) return
  s.removeItem(key)
}
