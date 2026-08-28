import { useNavigate } from 'react-router-dom'
import { Tag } from 'react-vant'
import type { ConcertListItem } from '@trae/shared'
import { formatDate, formatMoney, H5_ROUTES } from '@trae/shared'
import { concertStatusMeta } from '@/utils/concertStatus'

export interface ConcertCardProps {
  item: ConcertListItem
}

/**
 * 首页单卡：左海报 + 右元信息
 * - 状态 Tag 由 EVENT_STATUS 决定文案 + 颜色
 * - 票价区间优先展示 priceRange；无票档时显示「暂无票档」
 */
export default function ConcertCard({ item }: ConcertCardProps) {
  const navigate = useNavigate()
  const statusMeta = concertStatusMeta(item.status)

  function gotoDetail() {
    navigate(H5_ROUTES.concertDetail(item.id))
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={gotoDetail}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && gotoDetail()}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 12,
        margin: '8px 12px',
        display: 'flex',
        gap: 12,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {item.coverUrl ? (
        <img
          src={item.coverUrl}
          alt={item.eventName}
          loading="lazy"
          style={{
            width: 96,
            height: 120,
            borderRadius: 8,
            objectFit: 'cover',
            flex: '0 0 96px',
            background: '#f1f5f9',
          }}
        />
      ) : (
        <div
          style={{
            width: 96,
            height: 120,
            borderRadius: 8,
            background: 'linear-gradient(135deg,#e0e7ff,#fce7f3)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            flex: '0 0 96px',
          }}
        >
          海报
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.eventName}
        </div>
        {item.subtitle && (
          <div
            style={{
              fontSize: 12,
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.subtitle}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#64748b' }}>
          �� {item.venueName || '—'}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          �� {formatDate(item.startTime)}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            {item.priceRange ? (
              <>
                {formatMoney(item.priceRange[0])}
                {item.priceRange[0] !== item.priceRange[1] && (
                  <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                    {' '}~ {formatMoney(item.priceRange[1])}
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>起</span>
              </>
            ) : (
              <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>暂无票档</span>
            )}
          </div>
          <Tag
            plain
            type={statusMeta.tagType}
            color={statusMeta.tagColor}
            style={{ marginRight: 0 }}
          >
            {statusMeta.label}
          </Tag>
        </div>
      </div>
    </div>
  )
}
