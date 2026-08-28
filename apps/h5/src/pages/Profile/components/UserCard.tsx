import { Tag } from 'react-vant'
import type { User } from '@trae/shared'

export interface UserCardProps {
  user: User
}

/** 个人中心顶部用户卡（mock 硬编码当前用户 = user[0]） */
export default function UserCard({ user }: UserCardProps) {
  const verified = user.realNameStatus === 'verified'
  return (
    <div
      data-testid="profile-user-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        background: 'linear-gradient(135deg,#1e293b,#334155)',
        color: '#fff',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          flex: '0 0 48px',
        }}
      >
        {user.nickname?.slice(-1) ?? 'U'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{user.nickname ?? '匿名用户'}</div>
        {user.phone && (
          <div style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>{maskPhone(user.phone)}</div>
        )}
        <div style={{ marginTop: 6 }}>
          <Tag
            plain
            color={verified ? '#16a34a' : '#94a3b8'}
            style={{ marginRight: 0, background: 'transparent', borderColor: verified ? '#16a34a' : '#94a3b8', color: verified ? '#16a34a' : '#cbd5e1' }}
          >
            {verified ? '已实名' : '未实名'}
          </Tag>
        </div>
      </div>
    </div>
  )
}

function maskPhone(p: string): string {
  if (p.length < 7) return p
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}