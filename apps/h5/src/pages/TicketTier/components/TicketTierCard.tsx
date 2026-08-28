import { Stepper, Tag } from 'react-vant'
import type { TicketTier } from '@trae/shared'
import { formatMoney } from '@trae/shared'
import { ticketTierStatusMeta } from '../hooks/useTicketTiers'

export interface TicketTierCardProps {
  tier: TicketTier
  /** 活动级全场限购（来自 event.maxBuyQuantity；H8 起不再叠加 5 张硬上限） */
  eventMaxPerUser: number
  /** 当前已选数量（来自 store；>0 即选中） */
  value: number
  /** 是否禁用整张卡片（如活动整体不可购） */
  disabled: boolean
  /** Stepper 变化回调；新值已受业务约束（>=1 即代表选中本 tier） */
  onChange: (qty: number) => void
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * 单票档卡（H8 改：单选高亮 + 切换自动归零）
 * - 上限：min(tier.maxBuy, event.maxBuy, availableStock)；移除 Math.min(5, eventMaxPerUser)
 * - 已选中 tier（value > 0）显示高亮描边（#6366f1 / #eef2ff 背景）
 * - 未选中时 Stepper min=0；选中后 min 保持 0（用户可清零）
 *   - 但 H8 互斥：选 A 后切 B，A 由 store 内部 setSelection 自动归零
 */
export default function TicketTierCard({
  tier,
  eventMaxPerUser,
  value,
  disabled,
  onChange,
}: TicketTierCardProps) {
  const meta = ticketTierStatusMeta(tier.status)
  const perTierMax = tier.maxBuyQuantity
  // H8：移除 Math.min(5, ...)，按 tier.maxBuy / event.maxBuy / stock 算
  const eventMax = eventMaxPerUser
  const stockMax = Math.max(0, tier.availableStock)
  const maxQty = Math.min(perTierMax, eventMax, stockMax)
  const isTierSellable = tier.status === 'available' && stockMax > 0
  const selected = value > 0

  function handleChange(v: number | null) {
    if (!isTierSellable || disabled) return
    const next = clamp(v ?? 0, 0, maxQty)
    onChange(next)
  }

  return (
    <div
      data-testid={`tier-card-${tier.id}`}
      data-tier-status={tier.status}
      data-tier-selected={selected ? 'true' : 'false'}
      data-tier-max={maxQty}
      style={{
        background: selected ? '#eef2ff' : '#fff',
        borderRadius: 12,
        padding: 16,
        margin: '0 12px 12px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        border: selected ? '2px solid #6366f1' : '2px solid transparent',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tier.categoryName}
            </div>
            <Tag plain type={meta.tagType} style={{ marginRight: 0 }}>
              {meta.label}
            </Tag>
            {selected && (
              <Tag plain type="primary" style={{ marginRight: 0 }}>
                已选
              </Tag>
            )}
          </div>
          {tier.description && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {tier.description}
            </div>
          )}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: '#dc2626', fontSize: 16, fontWeight: 700 }}>
              {formatMoney(tier.price)}
            </span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span data-testid={`tier-stock-${tier.id}`}>
              剩余 {tier.availableStock}/{tier.totalStock}
            </span>
            <span style={{ color: '#94a3b8' }}>·</span>
            <span>每人限购 {maxQty} 张</span>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <Stepper
            value={value}
            min={0}
            max={maxQty}
            integer
            disabled={!isTierSellable || disabled}
            disablePlus={!isTierSellable || disabled || value >= maxQty}
            disableMinus={!isTierSellable || disabled || value <= 0}
            onChange={handleChange}
            inputWidth="32px"
            buttonSize="28px"
          />
        </div>
      </div>
    </div>
  )
}
