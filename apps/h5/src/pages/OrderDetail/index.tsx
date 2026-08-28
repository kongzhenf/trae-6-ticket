import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Dialog, NavBar, Toast } from 'react-vant'
import type { Order, OrderItem } from '@trae/shared'
import { H5_ROUTES, formatMoney, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import Placeholder from '@/components/Placeholder'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import StatusBanner from './components/StatusBanner'
import CountdownText from './components/CountdownText'
import ItemsTable from './components/ItemsTable'
import PayInfo from './components/PayInfo'
import EntryCodeBox from './components/EntryCodeBox'
import ViewersCard from './components/ViewersCard'
import ActionBar from './components/ActionBar'
import MockPayDialog from './components/MockPayDialog'
import { useOrderDetail } from './hooks/useOrderDetail'
import { resolveActions } from './utils/orderStatus'
import { useApi } from '@/contexts/ApiContext'
import { payOrder } from '@/utils/mockPaySdk'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { order, loading, error, notFound, expired, refresh } = useOrderDetail(id)
  const apis = useApi()
  const api = apis.order
  const client = apis.client

  // Concert 简略信息
  const [concertName, setConcertName] = useState<string>('')
  const [concertStart, setConcertStart] = useState<string>('')
  const [concertVenue, setConcertVenue] = useState<string>('')

  useEffect(() => {
    if (!order) { setConcertName(''); setConcertStart(''); setConcertVenue(''); return }
    let cancelled = false
    void client.get(`/concerts/${order.eventId}`)
      .then((res: { data: { eventName?: string; startTime?: string; venueName?: string } | null }) => {
        if (cancelled) return
        const body = res.data
        setConcertName(body?.eventName ?? '')
        setConcertStart(body?.startTime ?? '')
        setConcertVenue(body?.venueName ?? '')
      })
      .catch(() => { /* 静默失败 */ })
    return () => { cancelled = true }
  }, [order, api, client])

  const actions = useMemo(() => resolveActions(order?.status ?? 'pending', expired), [order?.status, expired])

  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const onPrimary = useCallback(
    (kind: 'pay' | 'viewCode' | 'reorder') => {
      if (!order) return
      if (kind === 'pay') {
        setPayDialogOpen(true)
        return
      }
      if (kind === 'viewCode') {
        Toast({ type: 'success', message: '入场码见页面顶部卡片' })
        return
      }
      if (kind === 'reorder') {
        navigate(H5_ROUTES.ticketTier(order.eventId))
        return
      }
    },
    [order, navigate],
  )

  const handlePay = useCallback(
    async (o: Order) => {
      await payOrder(
        { orderId: o.id, method: o.payMethod ?? 'mock', amount: o.totalAmount },
        { pay: api.pay },
      )
    },
    [api.pay],
  )

  const onCancel = useCallback(async () => {
    if (!order) return
    try {
      const confirmed = await Dialog.confirm({
        title: '取消订单',
        message: '确认要取消该订单吗？取消后将释放锁定的票档。',
        confirmButtonText: '确认取消',
        cancelButtonText: '再想想',
      }).catch(() => false)
      if (!confirmed) return
      await api.cancelOrder(order.id)
      Toast({ type: 'success', message: '订单已取消' })
      await refresh()
    } catch (e) {
      const er = e as { response?: { data?: { code?: number; message?: string } } }
      Toast(errorCodeMessage(er?.response?.data?.code ?? 0, er?.response?.data?.message ?? '取消失败'))
    }
  }, [order, api, refresh])

  const onRefund = useCallback(() => {
    Dialog.alert({
      title: '申请退款',
      message: '退款功能即将上线，请后已留任 H6 阶段。',
      confirmButtonText: '知道了',
    }).catch(() => undefined)
  }, [])

  const onSecondary = useCallback(
    (kind: 'cancel' | 'refund') => {
      if (kind === 'cancel') void onCancel()
      else if (kind === 'refund') onRefund()
    },
    [onCancel, onRefund],
  )

  const hint = useMemo(() => {
    if (!order) return ''
    if (order.status === 'pending') return expired ? '订单已失效，请重新下单' : '请尽快完成支付'
    if (order.status === 'paid') return '演出当天请出示入场码'
    if (order.status === 'cancelled') return '订单已关闭'
    if (order.status === 'refunded') return '退款已处理'
    if (order.status === 'finished') return '演出已结束，欢迎再次光临'
    return ''
  }, [order, expired])

  const entryCode = order?.entryCode ?? (order ? `MOCK-${order.orderNo.slice(-8)}` : '')
  const showEntryCode = order?.status === 'paid'

  return (
    <PrdPanelHost pageKey="OrderDetail">
      <div
        data-testid="order-detail-root"
        data-order-id={id ?? ''}
        data-order-status={order?.status ?? ''}
        data-expired={expired ? 'true' : 'false'}
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NavBar
          title="订单详情"
          onClickLeft={() => {
            if (window.history.length > 1) navigate(-1)
            else navigate(H5_ROUTES.home, { replace: true })
          }}
          fixed
          placeholder
          safeAreaInsetTop={false}
        />

        {loading ? (
          <div style={{ paddingTop: 0 }}>
            <LoadingSkeleton rows={3} topGap={false} />
          </div>
        ) : notFound ? (
          <Placeholder title="订单不存在" description="活动已下架或链接失效" />
        ) : error ? (
          <ErrorState description={error} onRetry={() => { void refresh() }} />
        ) : !order ? (
          <EmptyState description="订单不存在" />
        ) : (
          <>
            <StatusBanner status={order.status} hint={hint} />
            {order.status === 'pending' && !expired && (
              <div style={{ padding: '8px 12px 0' }}>
                <CountdownText expireTime={order.expireTime} onFinish={() => { void refresh() }} />
              </div>
            )}
            <EntryCodeBox code={entryCode} visible={showEntryCode} />
            <div style={{ padding: '12px 12px 0' }}>
              <ConcertBlock name={concertName} start={concertStart} venue={concertVenue} total={order.totalAmount} />
            </div>
            <div style={{ padding: '12px 12px 0' }}>
              <ItemsTable items={(order.items ?? []) as OrderItem[]} />
            </div>
            <ViewersCard viewers={order.viewers ?? []} />
            <PayInfo order={order} />
            <div style={{ height: 80 }} />
            <ActionBar actions={actions} onPrimary={onPrimary} onSecondary={onSecondary} />
            <MockPayDialog
              order={order}
              visible={payDialogOpen}
              onPay={handlePay}
              onPaid={() => { void refresh() }}
              onClose={() => setPayDialogOpen(false)}
            />
          </>
        )}
      </div>
    </PrdPanelHost>
  )
}

/** 演出信息卡（内联，因为只在本页用） */
function ConcertBlock({ name, start, venue, total }: { name: string; start: string; venue: string; total: number }) {
  return (
    <div
      data-testid="order-detail-concert"
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{name || '演出'}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
        {start ? new Date(start.replace(' ', 'T') + 'Z').toLocaleString('zh-CN') : '—'}
      </div>
      <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>{venue || '—'}</div>
      <div style={{ marginTop: 12, fontSize: 13, color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
        <span>合计</span>
        <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatMoney(total)}</span>
      </div>
    </div>
  )
}

/** 旧 BuyerCard（H8 起删除，由 ViewersCard 替代；保留注释以备历史代码参考） */
// BuyerCard 已删除 — H8 改为 viewers[]；身份证全部走 maskIdCard 统一规则