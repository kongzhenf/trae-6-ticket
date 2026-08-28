import { Tag } from 'react-vant'
import type { ConcertListItem, ConcertStatus } from '@trae/shared'
import { formatDate } from '@trae/shared'
import { concertStatusMeta } from '@/utils/concertStatus'

export interface ConcertHeaderProps {
  concert: ConcertListItem
  /** 当前时间；用于文案决定是否提示「即将开售 / 售票中」 */
  now: Date
}

/** 状态映射到文案（票档页专用，区别详情页） */
function saleWindowText(status: ConcertStatus, saleStart: string, saleEnd: string, now: Date): {
  text: string
  color: string
} {
  const start = Date.parse(saleStart.replace(' ', 'T') + (saleStart.includes('T') ? '' : 'Z'))
  const end = Date.parse(saleEnd.replace(' ', 'T') + (saleEnd.includes('T') ? '' : 'Z'))
  const t = now.getTime()
  if (status === 'on_sale' || status === 'published') {
    if (!Number.isNaN(start) && t < start) return { text: `将于 ${formatDate(saleStart)} 开售`, color: '#1677ff' }
    if (!Number.isNaN(end) && t > end) return { text: '已结束销售', color: '#94a3b8' }
    return { text: '售票中', color: '#16a34a' }
  }
  if (status === 'pending' || status === 'draft') {
    return { text: `将于 ${formatDate(saleStart)} 开售`, color: '#1677ff' }
  }
  return { text: '本场暂不可购', color: '#dc2626' }
}

/**
 * 演出摘要卡（票档页顶部复用 H2 的元信息）
 * - 不再渲染海报（详情页已经看过）；只保留标题 / 副标题 / 时间 / 场馆 + 销售期
 */
export default function ConcertHeader({ concert, now }: ConcertHeaderProps) {
  const meta = concertStatusMeta(concert.status)
  const sale = saleWindowText(concert.status, concert.saleStartTime, concert.saleEndTime, now)

  return (
    <div
      data-testid="tier-concert-header"
      style={{
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {concert.eventName}
          </div>
          {concert.subtitle && (
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: '#64748b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {concert.subtitle}
            </div>
          )}
        </div>
        <Tag plain type={meta.tagType} color={meta.tagColor} style={{ flexShrink: 0 }}>
          {meta.label}
        </Tag>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
        <span>🗓 {formatDate(concert.startTime)}</span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span style={{ color: '#94a3b8' }}>{concert.venueName || '—'}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: sale.color, fontWeight: 500 }}>{sale.text}</div>
    </div>
  )
}