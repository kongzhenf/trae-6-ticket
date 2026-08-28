/** 格式化金额（分 → 元） */
export function formatMoney(cents: number, prefix = '¥'): string {
  return `${prefix}${(cents / 100).toFixed(2)}`
}

/** 格式化日期 */
export function formatDate(input: string | Date | number, pattern = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return pattern
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

/** 手机号脱敏 */
export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/**
 * 身份证号脱敏（H8 起统一规则）
 * - mock 中 cipher 是脱敏字符串（18 位：前4 + 10 个星 + 后4），统一展示为「前4位****后4位」
 * - 真实生产从 cipher 解密后也走此规则；C 端永不见完整身份证号
 */
export function maskIdCard(cipher?: string): string {
  if (!cipher) return ''
  if (cipher.length < 8) return cipher
  if (cipher.length >= 8) {
    return `${cipher.slice(0, 4)}****${cipher.slice(-4)}`
  }
  return cipher
}
