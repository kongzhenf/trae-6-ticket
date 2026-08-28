import type { OrderStatus } from '@trae/shared'

export interface OrderStatsProps {
  /** 全部 / 各状态计数（首页 4 宫格用） */
  counts: Record<'all' | OrderStatus, number>
  onPick?: (status: OrderStatus[] | null) => void
  /** 当前激活的状态过滤；null = 全部 */
  active: OrderStatus[] | null
}

interface Cell {
  key: 'all' | OrderStatus
  label: string
}

const CELLS: Cell[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'finished', label: '已完成' },
]

/** 4 宫格订单统计 + 点击切换 Tabs */
export default function OrderStats({ counts, onPick, active }: OrderStatsProps) {
  function isActive(key: Cell['key']): boolean {
    if (key === 'all') return active === null
    return active !== null && active.length === 1 && active[0] === key
  }
  function pick(key: Cell['key']) {
    if (key === 'all') onPick?.(null)
    else onPick?.([key as OrderStatus])
  }
  return (
    <div
      data-testid="profile-order-stats"
      style={{
        background: '#fff',
        margin: '12px 12px 0',
        borderRadius: 12,
        padding: '14px 0',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {CELLS.map(c => {
          const sel = isActive(c.key)
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pick(c.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: sel ? '#1677ff' : '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {counts[c.key] ?? 0}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: sel ? '#1677ff' : '#94a3b8' }}>{c.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}