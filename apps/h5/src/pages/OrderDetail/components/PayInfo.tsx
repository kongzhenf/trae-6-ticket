import { formatDate, maskPhone } from '@trae/shared'
import type { Order, PayMethod } from '@trae/shared'

const PAY_LABEL: Record<PayMethod, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  mock: '模拟支付',
}

export interface PayInfoProps {
  order: Order
}

/** 支付信息：订单号 / 联系方式 / 支付方式 / 支付时间 / 取消时间 */
export default function PayInfo({ order }: PayInfoProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: '订单号', value: order.orderNo },
    { label: '创建时间', value: formatDate(order.createdAt) },
  ]
  // H8：联系手机号（订单通知用）
  if (order.contactPhone) rows.push({ label: '联系手机号', value: maskPhone(order.contactPhone) })
  if (order.payMethod) rows.push({ label: '支付方式', value: PAY_LABEL[order.payMethod] ?? order.payMethod })
  if (order.paidAt) rows.push({ label: '支付时间', value: formatDate(order.paidAt) })
  if (order.cancelledAt) rows.push({ label: '取消时间', value: formatDate(order.cancelledAt) })
  if (order.refundedAt) rows.push({ label: '退款时间', value: formatDate(order.refundedAt) })

  return (
    <div
      data-testid="order-pay-info"
      style={{
        background: '#fff',
        borderRadius: 12,
        margin: '12px 12px 0',
        padding: 16,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>订单信息</div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
          <span style={{ color: '#94a3b8' }}>{r.label}</span>
          <span style={{ color: '#0f172a', fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}