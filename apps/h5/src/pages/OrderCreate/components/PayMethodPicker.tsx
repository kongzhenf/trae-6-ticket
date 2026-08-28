import { Cell, Radio } from 'react-vant'
import type { PayMethod } from '@trae/shared'

export interface PayMethodPickerProps {
  value: PayMethod
  onChange: (next: PayMethod) => void
}

const OPTIONS: Array<{ value: PayMethod; label: string; hint: string }> = [
  { value: 'wechat', label: '微信支付', hint: '推荐' },
  { value: 'alipay', label: '支付宝', hint: '' },
  { value: 'mock',   label: '模拟支付', hint: 'H6 走 mock 通道' },
]

/**
 * 支付方式选择
 * - 微信 / 支付宝 / 模拟支付 三选一
 * - 内部用 Radio.Group + Cell
 */
export default function PayMethodPicker({ value, onChange }: PayMethodPickerProps) {
  return (
    <div
      data-testid="pay-method-picker"
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '0 12px 12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
        支付方式
      </div>
      <Radio.Group value={value} onChange={onChange}>
        <Cell.Group inset={false}>
          {OPTIONS.map(opt => (
            <Cell
              key={opt.value}
              clickable
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{opt.label}</span>
                  {opt.hint && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{opt.hint}</span>
                  )}
                </span>
              }
              rightIcon={null}
              isLink={false}
            >
              <Radio name={opt.value} />
            </Cell>
          ))}
        </Cell.Group>
      </Radio.Group>
    </div>
  )
}