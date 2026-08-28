import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { NavBar, Toast } from 'react-vant'
import type { PayMethod } from '@trae/shared'
import { H5_ROUTES, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import Placeholder from '@/components/Placeholder'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import { useConcertDetail } from '@/pages/ConcertDetail/hooks/useConcertDetail'
import { useApi } from '@/contexts/ApiContext'
import { useUser } from '@/contexts/UserContext'
import type { TicketTier } from '@trae/shared'
import ConcertSummary from './components/ConcertSummary'
import ItemsList from './components/ItemsList'
import ContactForm from './components/ContactForm'
import ViewersForm from './components/ViewersForm'
import PayMethodPicker from './components/PayMethodPicker'

import SubmitBar from './components/SubmitBar'
import { useContactDraftStore } from './stores/contactDraftStore'
import {
  parseSingleSelection,
  totalFromSingle,
  useCreateOrder,
} from './hooks/useCreateOrder'

export default function OrderCreate() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const concertId = params.get('event') ?? undefined
  // H8：新 query 格式 `tier=<id>&qty=<n>`（替代 `items=`）
  const { tierId, quantity } = useMemo(
    () => parseSingleSelection(params.get('tier'), params.get('qty')),
    [params],
  )

  // 详情 / 票档同时拉
  const { detail: concert, loading: detailLoading, error, notFound, refresh } = useConcertDetail(concertId)
  const { concert: api } = useApi()
  const { user } = useUser()
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const seqRef = useRef(0)
  useEffect(() => {
    if (!concertId) { setTiers([]); return }
    const mySeq = ++seqRef.current
    void api.listTickets(concertId).then((raw: unknown) => {
      if (mySeq !== seqRef.current) return
      setTiers(Array.isArray(raw) ? (raw as TicketTier[]) : [])
    }).catch(() => { if (mySeq === seqRef.current) setTiers([]) })
  }, [concertId, api])
  const loading = detailLoading
  const draft = useContactDraftStore(s => s.draft)
  const setDraft = useContactDraftStore(s => s.setDraft)
  const viewers = useContactDraftStore(s => s.viewers)

  // H8 起：user.phone 自动带入到 contactDraftStore.contactPhone（仅首次；用户编辑后不再覆盖）
  const userAutoFilledRef = useRef(false)
  useEffect(() => {
    if (userAutoFilledRef.current) return
    if (!user) return
    if (user.phone) setDraft({ contactPhone: user.phone })
    userAutoFilledRef.current = true
  }, [user, setDraft])

  const [payMethod, setPayMethod] = useState<PayMethod>('mock')
  const [contactValid, setContactValid] = useState(false)
  const [viewersValid, setViewersValid] = useState(false)
  const { submitting, order, errorCode, errorMessage, submit } = useCreateOrder()

  // 单档票（H8）
  const selectedTier = useMemo<TicketTier | undefined>(() => {
    if (!tierId) return undefined
    return tiers.find(t => t.id === tierId)
  }, [tierId, tiers])

  // 实时合计（前端兜底展示；提交后服务端重算）
  const { count, amount } = useMemo(() => totalFromSingle(selectedTier, quantity), [selectedTier, quantity])

  const eventBuyable = !!concert && (concert.status === 'on_sale' || concert.status === 'published')

  const onContactValidityChange = useCallback((v: boolean) => setContactValid(v), [])
  const onViewersValidityChange = useCallback((v: boolean) => setViewersValid(v), [])

  // 订单创建成功后跳详情
  useEffect(() => {
    if (!order) return
    Toast({ type: 'success', message: '下单成功' })
    const t = window.setTimeout(() => {
      navigate(H5_ROUTES.orderDetail(order.id), { replace: true })
    }, 800)
    return () => window.clearTimeout(t)
  }, [order, navigate])

  // 提交
  const onSubmit = useCallback(async () => {
    if (!concertId || !tierId || !eventBuyable) {
      Toast(errorCodeMessage(400018, '本场当前不可购买'))
      return
    }
    if (!contactValid) {
      Toast('请填写有效联系手机号')
      return
    }
    if (!viewersValid) {
      Toast('请完善所有观演人信息')
      return
    }
    if (quantity <= 0) {
      Toast('未选择任何票档')
      return
    }
    if (viewers.length !== quantity) {
      Toast('观演人数量与购票数量不一致')
      return
    }
    const payload = {
      concertId,
      ticketTierId: tierId,
      quantity,
      viewers,
      contactPhone: draft.contactPhone.trim(),
      payMethod,
    }
    const res = await submit(payload)
    if (res) {
      // effect 监听 + Toast + 跳转
    } else if (errorCode) {
      Toast(errorCodeMessage(errorCode, errorMessage ?? '提交失败'))
    }
  }, [concertId, tierId, eventBuyable, contactValid, viewersValid, quantity, viewers, draft, payMethod, submit, errorCode, errorMessage])

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate(H5_ROUTES.home, { replace: true })
  }

  return (
    <PrdPanelHost pageKey="OrderCreate">
      <div
        data-testid="order-create-root"
        data-concert-id={concertId ?? ''}
        data-tier-id={tierId ?? ''}
        data-quantity={quantity}
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <NavBar
          title="确认订单"
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
          <Placeholder title="活动不存在" description="活动已下架或链接失效" />
        ) : error ? (
          <ErrorState description={error} onRetry={() => { void refresh() }} />
        ) : !concert ? (
          <Placeholder title="订单" description="暂无数据" />
        ) : (
          <>
            <div style={{ flex: 1, paddingTop: 8, paddingBottom: 80 }}>
              <ConcertSummary concert={concert} />
              {selectedTier && quantity > 0 && (
                <ItemsList tier={selectedTier} quantity={quantity} />
              )}
              {(!selectedTier || quantity <= 0) && <EmptyState description="未选择任何票档" />}
              <ContactForm onValidityChange={onContactValidityChange} />
              {quantity > 0 && (
                <ViewersForm quantity={quantity} onValidityChange={onViewersValidityChange} />
              )}
              <PayMethodPicker value={payMethod} onChange={setPayMethod} />
              {!eventBuyable && (
                <div
                  data-testid="order-event-blocked"
                  style={{
                    margin: '0 12px 12px',
                    padding: 10,
                    borderRadius: 8,
                    background: '#fff7e6',
                    color: '#c2410c',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  本场当前状态不可购买
                </div>
              )}
            </div>
            <SubmitBar
              totalAmount={amount}
              submitting={submitting}
              disabled={!eventBuyable || count === 0 || !contactValid || !viewersValid}
              onSubmit={() => { void onSubmit() }}
            />
          </>
        )}
      </div>
    </PrdPanelHost>
  )
}
