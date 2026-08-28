import { Tag } from 'antd'
import type { ConcertStatus } from '@trae/shared'
import { EVENT_STATUS } from '@trae/shared'

/**
 * 演出状态 Tag
 * - 文案与颜色来自 EVENT_STATUS 常量（PRD §9.1）
 * - antd v6 的 Tag 不再支持 color='default'（白底无色），改为自定义样式
 * - 其他色值（cyan/blue/green/orange/red/gold/magenta/gray）仍由 antd preset 提供
 * - 对未识别的 status 走「未知」灰色 fallback，避免 ERROR 边界捕获
 */
export default function EventStatusTag({ status }: { status: ConcertStatus }) {
  const meta = EVENT_STATUS[status]
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
