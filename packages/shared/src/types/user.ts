export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  nickname: string
  avatar?: string
  phone?: string
  role: UserRole
  /** PRD §5.1 用户实名信息 */
  realName?: string
  idCardCipher?: string // 加密身份证（mock 里就是脱敏字符串）
  idCardHash?: string
  realNameStatus?: 'unverified' | 'verified'
  createdAt: string
}

export interface UserProfile extends User {
  email?: string
}

export interface LoginPayload {
  account: string
  password?: string
  /** 短信验证码登录（mock 固定 1234） */
  code?: string
}

export interface LoginResult {
  token: string
  user: User
}