import { maskIdCard, maskPhone } from '@trae/shared'
import type { Viewer } from '@trae/shared'

export interface ViewersCardProps {
  viewers: Viewer[]
}

/**
 * 观演人列表（H8 改造：替换原 BuyerCard）
 * - 每张票对应一行
 * - 身份证全部走 maskIdCard（`前4位****后4位`），C 端永不见完整号
 * - 空态：— 无观演人信息 —（兼容旧 seed 数据）
 */
export default function ViewersCard({ viewers }: ViewersCardProps) {
  return (
    <div
      data-testid="order-viewers-card"
      data-count={viewers.length}
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '12px 12px 0',
        padding: 16,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
        观演人 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>共 {viewers.length} 位</span>
      </div>
      {viewers.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
          — 无观演人信息 —
        </div>
      ) : (
        viewers.map((v, i) => (
          <div
            key={v.id ?? i}
            data-testid={`order-viewer-${i}`}
            data-viewer-id={v.id ?? ''}
            style={{
              paddingTop: i === 0 ? 0 : 10,
              marginTop: i === 0 ? 0 : 10,
              borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{v.name || `第 ${i + 1} 位`}</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>第 {i + 1} 位</span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
              <span>身份证</span>
              <span style={{ color: '#0f172a' }}>{maskIdCard(v.idCardCipher) || '—'}</span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
              <span>手机号</span>
              <span style={{ color: '#0f172a' }}>{v.phone ? maskPhone(v.phone) : '—'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
