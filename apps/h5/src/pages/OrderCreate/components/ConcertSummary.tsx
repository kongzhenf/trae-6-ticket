import type { ConcertListItem } from '@trae/shared'
import { formatDate } from '@trae/shared'

export interface ConcertSummaryProps {
  concert: ConcertListItem
}

/** 下单页顶部演出摘要（与 H2 详情摘要同风格，去掉海报） */
export default function ConcertSummary({ concert }: ConcertSummaryProps) {
  return (
    <div
      data-testid="order-concert-summary"
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        background: '#fff',
        borderRadius: 12,
        margin: '0 12px 12px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {concert.coverUrl ? (
        <img
          src={concert.coverUrl}
          alt={concert.eventName}
          style={{
            width: 64,
            height: 80,
            borderRadius: 6,
            objectFit: 'cover',
            flex: '0 0 64px',
            background: '#f1f5f9',
          }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 80,
            borderRadius: 6,
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#94a3b8',
            flex: '0 0 64px',
          }}
        >
          海报
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0f172a',
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
        <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
          🗓 {formatDate(concert.startTime)}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
          {concert.venueName || '—'}
        </div>
      </div>
    </div>
  )
}