import { useMemo } from 'react'

export type HomeCategory = 'recommend' | 'upcoming' | 'on_sale'

export interface CategoryTabsProps {
  value: HomeCategory
  onChange: (next: HomeCategory) => void
}

interface Item {
  key: HomeCategory
  label: string
}

const ITEMS: Item[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'upcoming', label: '即将开售' },
  { key: 'on_sale', label: '售票中' },
]

/**
 * 首页分类 Tabs（受控）
 * - 视觉上是一排胶囊；点击切换；激活态用 #1677ff 底色
 */
export default function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  const items = useMemo(() => ITEMS, [])
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        background: '#fff',
        borderBottom: '1px solid #f1f5f9',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      {items.map(it => {
        const active = it.key === value
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              background: active ? '#1677ff' : '#f1f5f9',
              color: active ? '#fff' : '#475569',
              fontWeight: active ? 600 : 400,
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
