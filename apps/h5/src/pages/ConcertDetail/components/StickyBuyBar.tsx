import type { ConcertStatus } from '@trae/shared'
import { Button } from 'react-vant'

export interface StickyBuyBarProps {
  status: ConcertStatus
  /** 是否存在可见票档（用于 sold_out 二次确认 / on_sale 禁用兜底） */
  hasTickets: boolean
  onBuy: () => void
}

interface BuyCtaState {
  label: string
  disabled: boolean
  /** 真实可购买的状态（仅供上层日志 / 测试断言用） */
  buyable: boolean
}

/**
 * 状态机 → 底部 CTA 文案 / 禁用态
 * - 与 plan-phase3-h5-purchase.md §H2 StickyBuyBar 表格严格对齐
 * - 所有非 buyable 状态都禁用按钮，避免误购
 * - 「draft / published / on_sale」三种文案区分：H2 阶段 published 仍允许 H5 入口（mock 暂不分发）
 */
function resolveCta(status: ConcertStatus, hasTickets: boolean): BuyCtaState {
  switch (status) {
    case 'on_sale':
    case 'published':
      return hasTickets
        ? { label: '立即购票', disabled: false, buyable: true }
        : { label: '暂无票档', disabled: true, buyable: false }
    case 'pending':
    case 'draft':
      return { label: '即将开售', disabled: true, buyable: false }
    case 'sold_out':
      return { label: '已售罄', disabled: true, buyable: false }
    case 'off_sale':
    case 'stopped':
      return { label: '暂停售票', disabled: true, buyable: false }
    case 'finished':
      return { label: '演出已结束', disabled: true, buyable: false }
    case 'offline':
    case 'cancelled':
    default:
      return { label: '活动不可购买', disabled: true, buyable: false }
  }
}

/**
 * 吸底「立即购票」状态机组件
 * - 始终渲染以保持布局稳定，避免页面高度跳动
 * - 仅当 buyable=true 时调用 onBuy；否则点击仅做日志，无副作用
 */
export default function StickyBuyBar({ status, hasTickets, onBuy }: StickyBuyBarProps) {
  const cta = resolveCta(status, hasTickets)
  return (
    <div
      data-testid="sticky-buy-bar"
      data-buyable={cta.buyable ? 'true' : 'false'}
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -1px 6px rgba(15,23,42,0.04)',
        zIndex: 20,
      }}
    >
      <Button
        block
        round
        type="primary"
        disabled={cta.disabled}
        onClick={() => {
          if (!cta.buyable) return
          onBuy()
        }}
        style={{ height: 44, fontSize: 15, fontWeight: 600 }}
      >
        {cta.label}
      </Button>
    </div>
  )
}