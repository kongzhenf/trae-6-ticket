import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Tag } from 'react-vant'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ConcertListItem, ConcertStatus } from '@trae/shared'
import { formatDate, H5_ROUTES } from '@trae/shared'
import Placeholder from '@/components/Placeholder'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import PrdPanelHost from '@/components/PrdPanelHost'
import { useConcertDetail } from './hooks/useConcertDetail'
import PosterSwipe from './components/PosterSwipe'
import PricePreview from './components/PricePreview'
import NoticeCollapse from './components/NoticeCollapse'
import StickyBuyBar from './components/StickyBuyBar'
import NotFound from './components/NotFound'
import { concertStatusMeta } from '@/utils/concertStatus'

/** 销售期文案（基于 ISO 时间） */
function formatSaleWindow(startISO: string, endISO: string): string {
  return `${formatDate(startISO)} ~ ${formatDate(endISO)}`
}

/** Header 区：标题 + 副标题 + 状态 Tag */
function Header({ detail }: { detail: ConcertListItem }) {
  const meta = concertStatusMeta(detail.status)
  return (
    <div style={{ padding: '12px 16px 0', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <h1
          data-testid="detail-title"
          style={{
            flex: 1,
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {detail.eventName}
        </h1>
        <Tag plain type={meta.tagType} color={meta.tagColor} style={{ flexShrink: 0 }}>
          {meta.label}
        </Tag>
      </div>
      {detail.subtitle && (
        <div
          data-testid="detail-subtitle"
          style={{
            marginTop: 6,
            fontSize: 13,
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {detail.subtitle}
        </div>
      )}
    </div>
  )
}

/** 元信息卡：场馆 + 销售期 + 开演时间 */
function MetaCard({ detail }: { detail: ConcertListItem }) {
  const items = [
    {
      key: 'venue',
      label: '场馆',
      value: [detail.venueName, detail.venueNameCity].filter(Boolean).join(' / ') || '—',
      sub: detail.venueAddress,
    },
    {
      key: 'sale',
      label: '销售期',
      value: formatSaleWindow(detail.saleStartTime, detail.saleEndTime),
    },
    {
      key: 'start',
      label: '开演',
      value: formatDate(detail.startTime),
    },
  ] as const
  return (
    <div
      style={{
        margin: '12px 12px 0',
        padding: '4px 0',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.key}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '10px 14px',
            borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              flex: '0 0 56px',
              fontSize: 12,
              color: '#94a3b8',
              paddingTop: 2,
            }}
          >
            {it.label}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{it.value}</div>
            {'sub' in it && it.sub && (
              <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>{it.sub}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** 详情 markdown 区 */
function DetailBody({ content }: { content?: string }) {
  if (!content) return null
  return (
    <div
      style={{
        margin: '12px 12px 0',
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>演出详情</div>
      <div
        data-testid="detail-markdown"
        className="markdown-body"
        style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default function ConcertDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { detail, loading, notFound, error, refresh } = useConcertDetail(id)

  const hasTickets = useMemo(() => !!detail && detail.ticketCount > 0, [detail])
  const status: ConcertStatus = detail?.status ?? 'draft'

  function goTickets() {
    if (!detail) return
    navigate(H5_ROUTES.ticketTier(detail.id))
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <PrdPanelHost pageKey="ConcertDetail">
      <div
        data-testid="concert-detail-root"
        data-concert-id={id ?? ''}
        data-concert-status={detail?.status ?? ''}
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NavBar
          title="演出详情"
          onClickLeft={goBack}
          fixed
          placeholder
          safeAreaInsetTop={false}
        />

        {loading ? (
          <div style={{ paddingTop: 0 }}>
            <LoadingSkeleton rows={2} topGap={false} />
          </div>
        ) : notFound ? (
          <NotFound concertId={id} />
        ) : error ? (
          <ErrorState
            description={error}
            onRetry={() => { void refresh() }}
          />
        ) : !detail ? (
          <Placeholder title="演出详情" description="暂无数据" />
        ) : (
          <>
            <PosterSwipe
              posters={[detail.coverUrl, detail.bannerUrl].filter(Boolean) as string[]}
              fallbackTitle={detail.eventName}
            />
            <div style={{ flex: 1, paddingBottom: 80 }}>
              <Header detail={detail} />
              <MetaCard detail={detail} />
              <PricePreview priceRange={detail.priceRange} ticketCount={detail.ticketCount} />
              <DetailBody content={detail.detailContent} />
              <NoticeCollapse
                notice={(detail as unknown as { notice?: string }).notice}
                refundPolicy={(detail as unknown as { refundPolicy?: string }).refundPolicy}
              />
              <div
                style={{
                  margin: '12px 12px 16px',
                  padding: 12,
                  fontSize: 12,
                  color: '#94a3b8',
                  textAlign: 'center',
                }}
              >
                订单金额 <span style={{ color: '#0f172a', fontWeight: 600 }}>{detail.ticketCount}</span> 档票面可选
              </div>
            </div>
            <StickyBuyBar status={status} hasTickets={hasTickets} onBuy={goTickets} />
          </>
        )}
      </div>
    </PrdPanelHost>
  )
}