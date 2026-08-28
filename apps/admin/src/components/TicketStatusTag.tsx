import { Tag } from 'antd'
import type { TicketTierStatus } from '@trae/shared'
import { TICKET_STATUS } from '@trae/shared'

/**
 * 票档状态 Tag
 * - 文案与颜色来自 TICKET_STATUS 常量（PRD §8）
 * - 对未识别 status 走 fallback 避免 ERROR 边界捕获
 */
export default function TicketStatusTag({ status }: { status: TicketTierStatus | string }) {
  const meta = TICKET_STATUS[status as TicketTierStatus]
  if (!meta) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0 8px',
          fontSize: 12,
          lineHeight: '20px',
          borderRadius: 4,
          backgroundColor: '#f1f5f9',
          color: '#94a3b8',
          border: '1px dashed #cbd5e1',
        }}
      >
        未知（{String(status ?? 'null')}）
      </span>
    )
  }
  if (meta.color === 'default') {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0 8px',
          fontSize: 12,
          lineHeight: '20px',
          borderRadius: 4,
          backgroundColor: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0',
        }}
      >
        {meta.label}
      </span>
    )
  }
  return (
    <Tag color={meta.color} variant="filled" style={{ marginInlineEnd: 0 }}>
      {meta.label}
    </Tag>
  )
}
