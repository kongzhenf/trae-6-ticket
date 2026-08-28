/**
 * 观演人（购票时与票一一对应；用户可在个人中心「观演人」中维护）
 * - 同一用户下，同一 idCardHash 视为同一观演人，重复添加时自动复用
 * - idCardCipher 是脱敏字符串（前4 + 10 个星 + 后4 = 18 位），C 端永不见完整身份证号
 * - idCardFull 是 18 位明文身份证号；仅在管理后台「导出中心」中透出（运营 / 财务对账用）
 */
export interface ViewerInput {
  /** 真实姓名，必填，trim 后非空 */
  name: string
  /** 身份证号脱敏字符串（长度 ≥ 15） */
  idCardCipher: string
  /** 手机号（11 位，1[3-9]xxxxxxxxx） */
  phone: string
  /** 18 位明文身份证号（仅 admin 导出使用；C 端不读不展示） */
  idCardFull?: string
}

export interface Viewer extends ViewerInput {
  /** 观演人 ID，形如 60001 */
  id: string
  /** 归属用户 ID（来自 mock-token-<userId>） */
  userId: string
  createdAt: string
  updatedAt: string
}
