import { useState } from 'react'
import { Dialog, Toast } from 'react-vant'
import type { Order, PayMethod } from '@trae/shared'
import { formatMoney, errorCodeMessage } from '@trae/shared'

export interface MockPayDialogProps {
  order: Order
  visible: boolean
  /** 父组件传入的支付函数（依赖 axios 客户端，避免 hook 耦合） */
  onPay: (order: Order) => Promise<void>
  onPaid: () => void
  onClose: () => void
}

const PAY_LABEL: Record<PayMethod, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  mock: '模拟支付',
}

/**
 * 模拟支付弹窗（H6 落地）
 * - 点击「立即支付」→ 1500ms loading → 调父级 onPay(order)
 * - 成功：Toast + 关闭弹窗 + onPaid 回调（父级刷新详情）
 * - 失败：Toast 显示错误码；不关闭弹窗（用户可重试）
 */
export default function MockPayDialog({ order, visible, onPay, onPaid, onClose }: MockPayDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const method: PayMethod = order.payMethod ?? 'mock'

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onPay(order)
      Toast({ type: 'success', message: '支付成功' })
      onPaid()
      onClose()
    } catch (e) {
      const er = e as { response?: { data?: { code?: number; message?: string } } }
      Toast(errorCodeMessage(er?.response?.data?.code ?? 0, er?.response?.data?.message ?? '支付失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      visible={visible}
      title="模拟支付"
      showCancelButton
      cancelButtonText="取消"
      confirmButtonText={submitting ? '支付中…' : '立即支付'}
      onCancel={onClose}
      onConfirm={() => { void handleConfirm() }}
      closeOnClickOverlay={!submitting}
      confirmProps={{ loading: submitting, disabled: submitting }}
    >
      <div style={{ padding: '8px 4px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{PAY_LABEL[method]}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{formatMoney(order.totalAmount)}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>订单号 {order.orderNo}</div>
      </div>
    </Dialog>
  )
}